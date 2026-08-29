import { dbAdapter } from '../db/database';
import { appUnderstandingService, AppUnderstandingResult } from '../analysis/appUnderstanding';
import { appDnaService } from '../analysis/appDna';
import { projectMemoryService } from '../memory/projectMemory';
import { UserIntentType } from '../intent/intentEngine';
import { logger } from '../logger';

export type ContextSourceType =
  | 'RECENT_CONVERSATION'
  | 'PROJECT_MEMORY'
  | 'APPLICATION_DNA'
  | 'DECISION_HISTORY'
  | 'AFFECTED_FILES'
  | 'AFFECTED_COMPONENTS'
  | 'DATA_SCHEMA'
  | 'RECENT_ERRORS'
  | 'ACTIVE_PREVIEW';

export interface ContextChunk {
  source: ContextSourceType;
  reason: string;
  relevanceScore: number; // 0.0 to 1.0
  estimatedTokens: number;
  content: string;
  metadata?: Record<string, any>;
}

export interface ElementTargetInfo {
  selector?: string;
  tagName?: string;
  id?: string;
  className?: string;
  innerText?: string;
}

export interface BrokeredContext {
  projectId: string;
  userPrompt: string;
  intent: UserIntentType;
  chunks: ContextChunk[];
  totalEstimatedTokens: number;
  tokenBudgetLimit: number;
  budgetUtilizationRatio: number;
  understanding: AppUnderstandingResult;
  elementTarget?: ElementTargetInfo;
}

export class ContextBroker {
  private readonly DEFAULT_TOKEN_BUDGET = 4000;

  /**
   * Minimal context selection: loads strictly the relevant chunks based on prompt, intent and affected blast radius.
   * Never blindly dumps entire repositories into the prompt.
   */
  public selectContext(
    projectId: string,
    prompt: string,
    intent: UserIntentType,
    existingFiles: Array<{ name: string; content?: string }>,
    rawHtml?: string,
    options?: {
      tokenBudgetLimit?: number;
      includeRecentErrors?: boolean;
      recentErrorMessage?: string;
      elementTarget?: ElementTargetInfo;
    }
  ): BrokeredContext {
    const budgetLimit = options?.tokenBudgetLimit || this.DEFAULT_TOKEN_BUDGET;
    const chunks: ContextChunk[] = [];
    const lower = prompt.toLowerCase();

    // 0. Direct Manipulation / Targeted Element Chunk (High priority context)
    if (options?.elementTarget && (options.elementTarget.selector || options.elementTarget.id || options.elementTarget.tagName)) {
      const el = options.elementTarget;
      const targetContent = `### ÉLÉMENT UI SÉLECTIONNÉ (DIRECT MANIPULATION)\n- Sélecteur: ${el.selector || 'N/A'}\n- Balise: <${el.tagName || '*'}>\n- ID: ${el.id || 'N/A'}\n- Classes: ${el.className || 'N/A'}\n- Texte: "${el.innerText || ''}"\n\nDirectives: Si la demande utilisateur contient une référence anaphorique ("le", "ce bouton", "cet élément", etc.) ou une instruction ciblée, appliquer la modification prioritairement sur cet élément ciblé. Si l'utilisateur formule une demande globale explicite (ex: "passe toute l'application en mode sombre"), la demande globale prévaut.`;
      chunks.push({
        source: 'ACTIVE_PREVIEW',
        reason: 'Élément UI ciblé par inspection directe (Direct Manipulation)',
        relevanceScore: 0.98,
        estimatedTokens: Math.round(targetContent.length / 4),
        content: targetContent,
        metadata: { elementTarget: el },
      });
    }

    // 1. Analyze Application Architecture and DOM elements
    const understanding = appUnderstandingService.analyzeProject(existingFiles, rawHtml);

    // 2. Application DNA chunk (Essential rules, tech stack)
    const dna = appDnaService.getOrCreateDna(projectId);
    const dnaContent = appDnaService.formatDnaForPrompt(dna);
    const dnaTokens = Math.round(dnaContent.length / 4);
    chunks.push({
      source: 'APPLICATION_DNA',
      reason: 'Conventions de code, stack technique et règles architecturales fondamentales',
      relevanceScore: 0.95,
      estimatedTokens: dnaTokens,
      content: dnaContent,
    });

    // 3. Project Memory & Active Decisions
    const memory = projectMemoryService.getProjectMemory(projectId);
    if (memory.activeDecisions && memory.activeDecisions.length > 0) {
      const memoryContent = projectMemoryService.formatContextForPrompt(projectId);
      const memTokens = Math.round(memoryContent.length / 4);
      chunks.push({
        source: 'DECISION_HISTORY',
        reason: 'Décisions architecturales antérieures actives',
        relevanceScore: 0.9,
        estimatedTokens: memTokens,
        content: memoryContent,
      });
    }

    // 4. Targeted File Snippets / Affected Components (Selective vs Full Dump)
    const mainHtml = rawHtml || existingFiles.find((f) => f.name.endsWith('.html'))?.content || '';
    if (mainHtml.length > 0) {
      // If prompt specifically targets a section (e.g. list, header, form), extract snippet when file is huge
      let fileSnippet = mainHtml;
      let selectionReason = 'Fichier HTML principal de rendu';
      let relevance = 0.85;

      if (mainHtml.length > 15000) {
        if (lower.includes('liste') || lower.includes('produit')) {
          const listMatch = mainHtml.match(/<div[^>]*id="(?:items-list|products-grid|main-content)[^>]*>[\s\S]*?<\/div>/i);
          if (listMatch) {
            fileSnippet = `<!-- Extrait ciblé ciblant la liste/produits -->\n` + listMatch[0];
            selectionReason = 'Extrait ciblé de la liste pour économie de tokens';
            relevance = 0.92;
          }
        }
      }

      const fileTokens = Math.round(fileSnippet.length / 4);
      chunks.push({
        source: 'AFFECTED_FILES',
        reason: selectionReason,
        relevanceScore: relevance,
        estimatedTokens: fileTokens,
        content: fileSnippet,
      });
    }

    // 5. Recent Errors if diagnosing a preview failure
    if (options?.includeRecentErrors && options.recentErrorMessage) {
      const errContent = `### ERREUR RUNTIME ACTIVE DANS LA PREVIEW\n- Message: ${options.recentErrorMessage}`;
      chunks.push({
        source: 'RECENT_ERRORS',
        reason: 'Diagnostic d\'erreur runtime capturée dans l\'iFrame sandboxée',
        relevanceScore: 1.0,
        estimatedTokens: Math.round(errContent.length / 4),
        content: errContent,
      });
    }

    // 6. Sort chunks by relevance score descending and apply token budget limit
    chunks.sort((a, b) => b.relevanceScore - a.relevanceScore);

    let totalTokens = 0;
    const selectedChunks: ContextChunk[] = [];

    for (const chunk of chunks) {
      if (totalTokens + chunk.estimatedTokens <= budgetLimit) {
        selectedChunks.push(chunk);
        totalTokens += chunk.estimatedTokens;
      } else {
        // Truncate chunk if possible or skip
        const remaining = budgetLimit - totalTokens;
        if (remaining > 100) {
          const allowedChars = remaining * 4;
          selectedChunks.push({
            ...chunk,
            content: chunk.content.substring(0, allowedChars) + '\n[... Tronqué pour respect du budget de tokens]',
            estimatedTokens: remaining,
          });
          totalTokens += remaining;
        }
        break;
      }
    }

    const utilizationRatio = Math.min(1, totalTokens / budgetLimit);

    logger.info(
      'ContextBroker',
      `Brokered context for project ${projectId}: ${selectedChunks.length} chunks, ${totalTokens}/${budgetLimit} tokens (${Math.round(utilizationRatio * 100)}% budget)`
    );

    return {
      projectId,
      userPrompt: prompt,
      intent,
      chunks: selectedChunks,
      totalEstimatedTokens: totalTokens,
      tokenBudgetLimit: budgetLimit,
      budgetUtilizationRatio: utilizationRatio,
      understanding,
      elementTarget: options?.elementTarget,
    };
  }
}

export const contextBroker = new ContextBroker();
