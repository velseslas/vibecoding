import { logger } from '../logger';

export type UserIntentType =
  | 'CREATE_FEATURE'
  | 'MODIFY_FEATURE'
  | 'FIX_BUG'
  | 'REFACTOR'
  | 'DELETE'
  | 'RESTORE'
  | 'ANALYZE'
  | 'EXPLAIN'
  | 'COMPARE'
  | 'PREVIEW_FIX'
  | 'AUDIT'
  | 'QUESTION';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface IntentEntities {
  featureName?: string;
  targetFiles?: string[];
  components?: string[];
  uiElements?: string[];
  actions?: string[];
  stylingKeywords?: string[];
  resolvedPronounTarget?: string;
  isContradictory?: boolean;
  missingReferencedSymbols?: string[];
}

export interface IntentAnalysisResult {
  intent: UserIntentType;
  confidence: number;
  entities: IntentEntities;
  requiresClarification: boolean;
  clarificationQuestion?: string;
  targetElement?: string;
  riskLevel: RiskLevel;
  recommendedNextAction: string;
  analysisSource: 'heuristic' | 'contextual' | 'ai';
}

export class IntentEngine {
  /**
   * Primary intent detection combining multi-layered heuristics, conversational context & structural awareness
   */
  public analyzeIntent(
    prompt: string,
    context?: {
      hasExistingCode?: boolean;
      existingFiles?: string[];
      existingCode?: string;
      hasPreviewError?: boolean;
      lastErrorMessage?: string;
      recentIntents?: UserIntentType[];
      recentTargetElement?: string;
      elementTarget?: {
        selector?: string;
        tagName?: string;
        id?: string;
        className?: string;
        innerText?: string;
      };
    }
  ): IntentAnalysisResult {
    const raw = (prompt || '').trim();
    const cleanLower = raw.toLowerCase().replace(/[.?!,;:]+$/, '').trim();
    const lower = cleanLower;

    // 1. Bug in Preview Trigger
    if (context?.hasPreviewError || lower.includes('erreur preview') || lower.includes('ne marche pas') || lower.includes('ecran blanc') || lower.includes('crash')) {
      return {
        intent: 'PREVIEW_FIX',
        confidence: 0.95,
        entities: {
          actions: ['repair', 'fix_runtime_error'],
          targetFiles: context?.existingFiles || ['index.html'],
        },
        requiresClarification: false,
        riskLevel: 'LOW',
        recommendedNextAction: 'Diagnostiquer la cause racine de l\'erreur de preview et appliquer un correctif cerné.',
        analysisSource: 'contextual',
      };
    }

    // 2. Contradiction Detection (e.g. "supprime X mais garde ses fonctionnalites")
    const hasContradiction =
      (lower.includes('supprime') || lower.includes('retire') || lower.includes('delete')) &&
      (lower.includes('mais garde') || lower.includes('mais conserve') || lower.includes('tout en gardant') || lower.includes('sans perdre'));

    if (hasContradiction) {
      return {
        intent: 'REFACTOR',
        confidence: 0.88,
        entities: {
          actions: ['migrate_ui', 'preserve_features'],
          isContradictory: true,
        },
        requiresClarification: false,
        riskLevel: 'MEDIUM',
        recommendedNextAction: 'Déplacer les fonctionnalités de la barre latérale vers le menu supérieur avant de supprimer le conteneur visuel.',
        analysisSource: 'heuristic',
      };
    }

    // 3. Non-existent symbol / Hallucination Detection (e.g. "utilise la fonction X existante")
    const funcMatch = lower.match(/fonction\s+([a-zA-Z0-9_]+)\s+existante/);
    if (funcMatch && funcMatch[1]) {
      const referencedFunc = funcMatch[1];
      const code = context?.existingCode || '';
      const symbolExists = code.includes(referencedFunc);
      if (!symbolExists) {
        return {
          intent: 'QUESTION',
          confidence: 0.82,
          entities: {
            missingReferencedSymbols: [referencedFunc],
          },
          requiresClarification: true,
          clarificationQuestion: `La fonction "${referencedFunc}" n'existe pas dans le projet actuel. Souhaitez-vous que je la crée ou préférez-vous utiliser une alternative ?`,
          riskLevel: 'LOW',
          recommendedNextAction: 'Alerter sur le symbole manquant et proposer son implémentation.',
          analysisSource: 'heuristic',
        };
      }
    }

    // 4. Ambiguity / Insufficient Request Detection
    const isVaguePrompt =
      lower.length < 5 ||
      lower === 'change' ||
      lower === 'change ça' ||
      lower === 'ameliore' ||
      lower === 'améliore' ||
      lower.includes('améliore mon dashboard') ||
      lower.includes('ameliore mon dashboard') ||
      lower.includes('plus moderne') ||
      lower === 'fais quelque chose' ||
      lower === 'truc';

    if (isVaguePrompt) {
      const clarifyMsg = lower.includes('dashboard')
        ? 'Souhaitez-vous ajouter de nouveaux graphiques de métriques, moderniser la palette de couleurs, ou intégrer des filtres de données ?'
        : lower.includes('moderne')
        ? 'Souhaitez-vous appliquer un thème sombre épuré, ajouter des micro-animations ou réorganiser la typographie ?'
        : 'Pouvez-vous préciser quelle fonctionnalité ou section vous souhaitez ajouter ou modifier ?';

      return {
        intent: 'QUESTION',
        confidence: 0.4,
        entities: {},
        requiresClarification: true,
        clarificationQuestion: clarifyMsg,
        riskLevel: 'LOW',
        recommendedNextAction: 'Demander une clarification avant de générer.',
        analysisSource: 'heuristic',
      };
    }

    // 5. Pronoun & Reference Resolution (e.g. "fais-le plus petit", "change le bouton", "rends-le rouge")
    const isPronounRef =
      lower.includes('fais-le') ||
      lower.includes('rends-le') ||
      lower.includes('passe-le') ||
      lower.includes('mets-le') ||
      lower.includes('agrandis-le') ||
      lower.includes('change-le') ||
      lower.includes('modifie-le');

    let resolvedPronounTarget: string | undefined;
    if (context?.elementTarget?.selector || context?.elementTarget?.id || context?.elementTarget?.tagName) {
      resolvedPronounTarget =
        context.elementTarget.selector ||
        (context.elementTarget.id ? `#${context.elementTarget.id}` : context.elementTarget.tagName);
    } else if (isPronounRef) {
      resolvedPronounTarget = context?.recentTargetElement || 'button';
      if (resolvedPronounTarget.includes('button')) {
        resolvedPronounTarget = 'button';
      }
    }

    // 6. Destructive / Critical Deletion
    if (lower.includes('supprime l\'auth') || lower.includes('supprimer l\'authentification') || lower.includes('delete database') || lower.includes('supprime tout')) {
      return {
        intent: 'DELETE',
        confidence: 0.98,
        entities: {
          featureName: 'Authentication / Core Data',
          actions: ['delete', 'remove_security'],
        },
        requiresClarification: false,
        riskLevel: 'CRITICAL',
        recommendedNextAction: 'Générer une analyse d\'impact critique et exiger une confirmation explicite.',
        analysisSource: 'heuristic',
      };
    }

    // 7. Questions & Explanations
    if (
      lower.startsWith('comment ') ||
      lower.startsWith('pourquoi ') ||
      lower.startsWith('explique ') ||
      lower.includes('pourquoi tu as') ||
      lower.includes('pourquoi avoir') ||
      lower.startsWith('qu\'est-ce que') ||
      (lower.endsWith('?') && !lower.includes('peux-tu ajouter') && !lower.includes('peux-tu modifier'))
    ) {
      const isExplanation = lower.includes('explique') || lower.includes('pourquoi');
      return {
        intent: isExplanation ? 'EXPLAIN' : 'QUESTION',
        confidence: 0.92,
        entities: {},
        requiresClarification: false,
        riskLevel: 'LOW',
        recommendedNextAction: 'Fournir une explication claire et bienveillante sans jargon technique.',
        analysisSource: 'heuristic',
      };
    }

    // 7b. Design & Quality Audit Requests (Application, Page, Preflight)
    if (
      lower.includes('audit') ||
      lower.includes('audite') ||
      lower.includes('vérifie la qualité') ||
      lower.includes('verifie la qualite') ||
      lower.includes('harmonie du design') ||
      lower.includes('avant publication') ||
      lower.includes('prêt à publier') ||
      lower.includes('pret a publier')
    ) {
      const isPreflight = lower.includes('publication') || lower.includes('publier') || lower.includes('preflight');
      const isPageAudit = lower.includes('cette page') || lower.includes('vue actuelle');
      return {
        intent: 'AUDIT',
        confidence: 0.95,
        entities: {
          actions: [isPreflight ? 'audit_preflight' : isPageAudit ? 'audit_page' : 'audit_application'],
        },
        requiresClarification: false,
        riskLevel: 'LOW',
        recommendedNextAction: isPreflight
          ? 'Lancer l\'audit pré-publication complet.'
          : isPageAudit
          ? 'Lancer l\'audit de conformité de la page avec le Design DNA.'
          : 'Lancer l\'audit global de design, responsive et accessibilité.',
        analysisSource: 'heuristic',
      };
    }

    // 8. Restore / Rollback
    const isExplicitRollback =
      (lower.includes('annule') ||
        lower.includes('rollback') ||
        lower.includes('reviens a la version') ||
        lower.includes('reviens à la version') ||
        lower.includes('remets comme avant') ||
        lower.includes('remettre comme avant') ||
        lower.includes('première version') ||
        lower.includes('premiere version') ||
        lower.includes('version précédente') ||
        lower.includes('version precedente') ||
        lower.includes('restaure')) &&
      !lower.includes('apres') &&
      !lower.includes('après') &&
      !lower.includes('ajoute') &&
      !lower.includes('modifie') &&
      !lower.includes('crée');

    if (isExplicitRollback) {
      return {
        intent: 'RESTORE',
        confidence: 0.94,
        entities: {
          actions: ['rollback_version'],
        },
        requiresClarification: false,
        riskLevel: 'MEDIUM',
        recommendedNextAction: 'Vérifier l\'historique des versions et restaurer la snapshot sélectionnée.',
        analysisSource: 'heuristic',
      };
    }

    // 9. Bug Fix
    if (lower.includes('corrige') || lower.includes('fix') || lower.includes('bug') || lower.includes('probleme') || lower.includes('marche pas')) {
      return {
        intent: 'FIX_BUG',
        confidence: 0.91,
        entities: {
          actions: ['patch_bug'],
        },
        requiresClarification: false,
        riskLevel: 'LOW',
        recommendedNextAction: 'Identifier l\'élément défaillant et corriger le comportement inattendu.',
        analysisSource: 'heuristic',
      };
    }

    // 10. Refactoring
    if (lower.includes('refactorise') || lower.includes('nettoie le code') || lower.includes('restructure') || lower.includes('optimise')) {
      return {
        intent: 'REFACTOR',
        confidence: 0.88,
        entities: {
          actions: ['clean_code', 'optimize_performance'],
        },
        requiresClarification: false,
        riskLevel: 'MEDIUM',
        recommendedNextAction: 'Améliorer la lisibilité et l\'architecture sans altérer les fonctionnalités.',
        analysisSource: 'heuristic',
      };
    }

    // 11. Modify Feature (also triggered when direct manipulation element is targeted or pronoun is referenced)
    const hasTargetElement = !!(context?.elementTarget?.selector || context?.elementTarget?.id || context?.elementTarget?.tagName);
    if (
      hasTargetElement ||
      (context?.hasExistingCode &&
        (lower.includes('ajoute') ||
          lower.includes('integre') ||
          lower.includes('intègre') ||
          lower.includes('modifie') ||
          lower.includes('change') ||
          lower.includes('bouton') ||
          lower.includes('couleur') ||
          isPronounRef ||
          lower.includes('filtre') ||
          lower.includes('catégorie') ||
          lower.includes('categorie') ||
          lower.includes('liste') ||
          lower.includes('paiement') ||
          lower.includes('stripe')))
    ) {
      const riskLevel: RiskLevel = lower.includes('paiement') || lower.includes('stripe') || lower.includes('api') || lower.includes('database') ? 'HIGH' : 'LOW';
      const entities = this.extractEntities(raw);
      if (resolvedPronounTarget) {
        entities.resolvedPronounTarget = resolvedPronounTarget;
      }
      return {
        intent: 'MODIFY_FEATURE',
        confidence: 0.89,
        targetElement: resolvedPronounTarget,
        entities,
        requiresClarification: false,
        riskLevel,
        recommendedNextAction: 'Préparer le plan de modification incrémentale sur l\'existant.',
        analysisSource: 'heuristic',
      };
    }

    // 12. Create Feature / New Application
    const createRisk: RiskLevel = lower.includes('paiement') || lower.includes('stripe') || lower.includes('api') || lower.includes('database') ? 'HIGH' : 'LOW';
    return {
      intent: 'CREATE_FEATURE',
      confidence: 0.85,
      entities: this.extractEntities(raw),
      requiresClarification: false,
      riskLevel: createRisk,
      recommendedNextAction: 'Échafauder la nouvelle fonctionnalité avec son architecture et son interface.',
      analysisSource: 'heuristic',
    };
  }

  private extractEntities(prompt: string): IntentEntities {
    const entities: IntentEntities = {
      uiElements: [],
      stylingKeywords: [],
      actions: [],
    };

    const lower = prompt.toLowerCase();
    if (lower.includes('bouton')) entities.uiElements?.push('button');
    if (lower.includes('formulaire') || lower.includes('input')) entities.uiElements?.push('form');
    if (lower.includes('modal') || lower.includes('popin')) entities.uiElements?.push('modal');
    if (lower.includes('tableau') || lower.includes('table')) entities.uiElements?.push('table');
    if (lower.includes('graphique') || lower.includes('chart')) entities.uiElements?.push('chart');

    if (lower.includes('sombre') || lower.includes('dark')) entities.stylingKeywords?.push('dark_mode');
    if (lower.includes('tailwind')) entities.stylingKeywords?.push('tailwind');
    if (lower.includes('animation')) entities.stylingKeywords?.push('animations');

    return entities;
  }
}

export const intentEngine = new IntentEngine();
