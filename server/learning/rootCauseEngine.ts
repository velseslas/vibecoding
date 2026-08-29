import { NormalizedErrorForAI } from '../preview/previewLifecycle';
import { RootCauseDiagnostic, IncidentCategory } from './bugIntelligenceTypes';

export class RootCauseEngine {
  /**
   * Performs systematic causal diagnosis on an incident
   */
  public diagnoseRootCause(
    category: IncidentCategory,
    error: NormalizedErrorForAI | { message: string; category?: string; file?: string },
    context?: { prompt?: string; htmlSnippet?: string }
  ): RootCauseDiagnostic {
    const msg = ((error as any).errorMessage || (error as any).message || '').toLowerCase();
    const html = context?.htmlSnippet || '';

    // 1. Missing Lucide Icon Library / Script
    if (
      msg.includes('lucide') ||
      (html.includes('data-lucide') && !html.includes('lucide@latest'))
    ) {
      return {
        observedError: (error as any).errorMessage || msg,
        probableCause: 'Script CDN Lucide Icons absent ou non chargé avant l\'appel à createIcons()',
        contributingFactors: [
          'Utilisation d\'icônes avec attribut data-lucide sans dépendance chargée',
          'Absence de script d\'initialisation au DOMContentLoaded',
        ],
        candidateStrategy: 'INJECT_LUCIDE_CDN_AND_INIT',
        confidence: 0.96,
        status: 'CONFIRMED',
        evidence: [
          'Balises <i data-lucide="..."> détectées dans le DOM',
          'Script unpkg.com/lucide@latest non présent dans le <head>',
        ],
        source: 'PATTERN_MATCH',
      };
    }

    // 2. Missing Tailwind CSS Framework
    if (msg.includes('tailwind') || (html.includes('class="') && !html.includes('cdn.tailwindcss.com'))) {
      return {
        observedError: (error as any).errorMessage || msg,
        probableCause: 'Script CDN Tailwind CSS non importé dans le document HTML',
        contributingFactors: [
          'Classes utilitaires Tailwind présentes sans moteur JIT runtime',
        ],
        candidateStrategy: 'INJECT_TAILWIND_CDN',
        confidence: 0.94,
        status: 'CONFIRMED',
        evidence: ['Document HTML ne contient pas le script cdn.tailwindcss.com'],
        source: 'PATTERN_MATCH',
      };
    }

    // 3. Null Reference DOM Listener
    if (msg.includes('cannot read properties of null') || msg.includes('addeventlistener of null')) {
      const match = ((error as any).errorMessage || msg).match(/getElementById\(['"]([^'"]+)['"]\)/i);
      const targetId = match ? match[1] : 'cible inconnue';

      return {
        observedError: (error as any).errorMessage || msg,
        probableCause: `Tentative d'attachement d'événement sur un élément inexistant dans le DOM (ID: "${targetId}")`,
        contributingFactors: [
          'Élément non rendu ou supprimé lors d\'une mutation précédente',
          'Script exécuté avant le parsing complet du DOM',
        ],
        candidateStrategy: 'GUARD_OPTIONAL_CHAINING_OR_RESTORE_DOM_ELEMENT',
        confidence: 0.88,
        status: 'PROBABLE',
        evidence: [
          `ID cible "${targetId}" référencé dans le JavaScript`,
          'Null reference runtime interceptée par le Sandbox Bridge',
        ],
        source: 'HEURISTIC',
      };
    }

    // 4. Bracket Asymmetry / Syntax Error
    if (msg.includes('syntaxerror') || msg.includes('unexpected token') || msg.includes('unclosed')) {
      return {
        observedError: (error as any).errorMessage || msg,
        probableCause: 'Déséquilibre d\'accolades, parenthèses ou guillemets non fermés dans un script inline',
        contributingFactors: [
          'Concaténation de code non équilibrée',
          'Caractères d\'échappement tronqués',
        ],
        candidateStrategy: 'BALANCE_BRACKETS_AND_VALIDATE_SYNTAX',
        confidence: 0.85,
        status: 'PROBABLE',
        evidence: ['Erreur de compilation/parsing JS interceptée'],
        source: 'HEURISTIC',
      };
    }

    // 5. Undefined Global Variable Reference
    if (msg.includes('is not defined') || msg.includes('referenceerror')) {
      const varMatch = ((error as any).errorMessage || msg).match(/([a-zA-Z0-9_$]+)\s+is not defined/i);
      const varName = varMatch ? varMatch[1] : 'variable';

      return {
        observedError: (error as any).errorMessage || msg,
        probableCause: `Variable globale "${varName}" référencée sans déclaration préalable`,
        contributingFactors: ['Appel asynchrone avant initialisation de l\'état'],
        candidateStrategy: 'DECLARE_SAFE_GLOBAL_FALLBACK',
        confidence: 0.82,
        status: 'PROBABLE',
        evidence: [`Nom de symbole non résolu: "${varName}"`],
        source: 'HEURISTIC',
      };
    }

    // 6. Ambiguous / Generic Fallback
    return {
      observedError: (error as any).errorMessage || msg || 'Erreur non spécifiée',
      probableCause: 'Défaillance potentielle de compatibilité ou condition limite non anticipée',
      contributingFactors: ['Contexte d\'exécution complexe ou logs incomplets'],
      candidateStrategy: 'GENERIC_QUALITY_REPAIR',
      confidence: 0.45,
      status: 'HYPOTHESIS',
      evidence: ['Aucun pattern haute certitude reconnu dans le registre heuristique'],
      source: 'AI',
    };
  }
}

export const rootCauseEngine = new RootCauseEngine();
