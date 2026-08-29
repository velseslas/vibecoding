import { DbConversationMessage } from '../db/schema';
import { logger } from '../logger';

export interface ElementTargetContext {
  selector?: string;
  tagName?: string;
  id?: string;
  className?: string;
  innerText?: string;
  boundingClientRect?: { x: number; y: number; width: number; height: number };
  page?: string;
  viewport?: 'mobile' | 'tablet' | 'desktop';
  probableComponent?: string;
  visualRole?: 'primary_button' | 'card' | 'input' | 'header' | 'navigation' | 'modal' | 'list_item' | 'filter';
}

export interface ReferenceResolutionResult {
  hasReference: boolean;
  referenceType: 'ANAPHORA_PRONOUN' | 'DEICTIC_DEMONSTRATIVE' | 'TARGET_CORRECTION' | 'SPATIAL_DIRECTION' | 'STYLE_TRANSFER' | 'HISTORIC_RESTORE' | 'DIRECT_MANIPULATION' | 'NONE';
  rawTargetMention?: string;
  resolvedTargetSelector?: string;
  resolvedTargetDescription: string;
  actionScope: 'SINGLE_ELEMENT' | 'CONTAINER' | 'PAGE' | 'ENTIRE_APP';
  confidence: number;
  preservedFeatures: string[];
  spatialAdjustment?: 'LEFT' | 'RIGHT' | 'TOP' | 'BOTTOM' | 'CENTER';
  isCorrection: boolean;
  correctionContext?: {
    rejectedTarget?: string;
    actualTarget?: string;
  };
}

export class ReferenceResolver {
  /**
   * Resolves pronouns, demonstratives, spatial references and conversational targets
   */
  public resolveReferences(
    userPrompt: string,
    history: DbConversationMessage[],
    elementTarget?: ElementTargetContext,
    currentHtml?: string
  ): ReferenceResolutionResult {
    const raw = (userPrompt || '').trim();
    const lower = raw.toLowerCase();

    // 1. Direct Target Correction ("Non, pas celui-là", "Je parle du bouton en haut", "Non, l'autre")
    const isCorrection =
      lower.includes('non, pas') ||
      lower.includes('non pas') ||
      lower.includes('pas celui-là') ||
      lower.includes('pas celui la') ||
      lower.includes('je parle de') ||
      lower.includes('je parle du') ||
      lower.includes('l\'autre') ||
      lower.includes('non, l\'autre');

    if (isCorrection) {
      let actualTarget = 'primary_action';
      let selector = 'button';
      if (lower.includes('en haut') || lower.includes('header') || lower.includes('haut')) {
        actualTarget = 'En-tête supérieur / Bouton de navigation';
        selector = '#main-header button, header button';
      } else if (lower.includes('carte') || lower.includes('card')) {
        actualTarget = 'Carte de profil / Conteneur principal';
        selector = '.profile-card, #dating-card-deck, .card';
      } else if (lower.includes('filtre')) {
        actualTarget = 'Bouton ou tiroir de filtres';
        selector = '#btn-filters, #filter-drawer';
      }

      return {
        hasReference: true,
        referenceType: 'TARGET_CORRECTION',
        rawTargetMention: raw,
        resolvedTargetSelector: selector,
        resolvedTargetDescription: actualTarget,
        actionScope: 'SINGLE_ELEMENT',
        confidence: 0.95,
        preservedFeatures: ['Toutes les autres sections et fonctionnalités actives'],
        isCorrection: true,
        correctionContext: {
          rejectedTarget: 'Élément précédemment inspecté',
          actualTarget,
        },
      };
    }

    // 2. Direct Manipulation from Preview Canvas
    if (elementTarget && (elementTarget.selector || elementTarget.id || elementTarget.tagName)) {
      const selector = elementTarget.selector || (elementTarget.id ? `#${elementTarget.id}` : elementTarget.tagName);
      const desc = elementTarget.innerText
        ? `Élément "${elementTarget.innerText.substring(0, 30)}"`
        : elementTarget.probableComponent || `<${elementTarget.tagName || 'element'}>`;

      return {
        hasReference: true,
        referenceType: 'DIRECT_MANIPULATION',
        rawTargetMention: 'Sélection interactive PreviewCanvas',
        resolvedTargetSelector: selector,
        resolvedTargetDescription: desc,
        actionScope: 'SINGLE_ELEMENT',
        confidence: 0.99,
        preservedFeatures: ['Reste de l\'application'],
        isCorrection: false,
      };
    }

    // 3. Pronouns & Demonstratives ("Fais-le plus petit", "Rends-la plus premium", "Change celui-là")
    const isPronoun =
      lower.includes('fais-le') ||
      lower.includes('fais-la') ||
      lower.includes('rends-le') ||
      lower.includes('rends-la') ||
      lower.includes('passe-le') ||
      lower.includes('passe-la') ||
      lower.includes('mets-le') ||
      lower.includes('mets-la') ||
      lower.includes('change-le') ||
      lower.includes('change celui-là') ||
      lower.includes('change celui la') ||
      lower.includes('supprime cette partie') ||
      lower.includes('supprime ce') ||
      lower.includes('supprime cette');

    if (isPronoun) {
      // Find last active subject in recent conversation messages
      const recentAssistantOrUserMsgs = history.slice(-4);
      let lastSubjectDesc = 'Bouton / Élément actif';
      let selector = 'button';
      let scope: 'SINGLE_ELEMENT' | 'CONTAINER' | 'PAGE' | 'ENTIRE_APP' = 'SINGLE_ELEMENT';

      if (lower.includes('fais-la') || lower.includes('rends-la') || lower.includes('application') || lower.includes('l\'app')) {
        lastSubjectDesc = 'Application dans son ensemble';
        selector = 'body';
        scope = 'ENTIRE_APP';
      } else if (lower.includes('carte') || lower.includes('card')) {
        lastSubjectDesc = 'Carte active';
        selector = '.card, [data-card], #dating-card-deck';
        scope = 'CONTAINER';
      } else if (lower.includes('bouton') || lower.includes('plus petit') || lower.includes('plus grand') || lower.includes('discret')) {
        lastSubjectDesc = 'Bouton d\'action';
        selector = 'button';
        scope = 'SINGLE_ELEMENT';
      } else if (lower.includes('supprime cette partie') || lower.includes('supprime cette section')) {
        lastSubjectDesc = 'Section ciblée';
        selector = 'section, aside, #app-sidebar';
        scope = 'CONTAINER';
      }

      return {
        hasReference: true,
        referenceType: 'ANAPHORA_PRONOUN',
        rawTargetMention: raw,
        resolvedTargetSelector: selector,
        resolvedTargetDescription: lastSubjectDesc,
        actionScope: scope,
        confidence: 0.92,
        preservedFeatures: ['Fonctionnalités existantes', 'Interactions réactives', 'Persistance locale'],
        isCorrection: false,
      };
    }

    // 4. Spatial Directions ("Mets-le à gauche", "Place en bas", "Aligne au centre")
    if (lower.includes('à gauche') || lower.includes('a gauche')) {
      return {
        hasReference: true,
        referenceType: 'SPATIAL_DIRECTION',
        rawTargetMention: 'à gauche',
        resolvedTargetSelector: 'button, .btn, header .flex',
        resolvedTargetDescription: 'Alignement à gauche',
        actionScope: 'SINGLE_ELEMENT',
        confidence: 0.9,
        spatialAdjustment: 'LEFT',
        preservedFeatures: ['Contenu et état fonctionnel'],
        isCorrection: false,
      };
    }

    if (lower.includes('à droite') || lower.includes('a droite')) {
      return {
        hasReference: true,
        referenceType: 'SPATIAL_DIRECTION',
        rawTargetMention: 'à droite',
        resolvedTargetSelector: 'button, .btn, header .flex',
        resolvedTargetDescription: 'Alignement à droite',
        actionScope: 'SINGLE_ELEMENT',
        confidence: 0.9,
        spatialAdjustment: 'RIGHT',
        preservedFeatures: ['Contenu et état fonctionnel'],
        isCorrection: false,
      };
    }

    // 5. Historic Restore / Anaphora to past versions ("Comme avant", "Remets comme avant", "Je préfère la première version")
    const isHistoryRef =
      lower.includes('comme avant') ||
      lower.includes('remets comme avant') ||
      lower.includes('reviens à la version') ||
      lower.includes('reviens a la version') ||
      lower.includes('première version') ||
      lower.includes('premiere version') ||
      lower.includes('version précédente') ||
      lower.includes('annule la dernière');

    if (isHistoryRef) {
      return {
        hasReference: true,
        referenceType: 'HISTORIC_RESTORE',
        rawTargetMention: raw,
        resolvedTargetSelector: 'ALL',
        resolvedTargetDescription: 'Restauration vers la version antérieure archivée',
        actionScope: 'ENTIRE_APP',
        confidence: 0.97,
        preservedFeatures: ['Historique complet et traçabilité'],
        isCorrection: false,
      };
    }

    // 6. Style Transfer ("Fais pareil ici", "Dans le même style")
    if (lower.includes('fais pareil') || lower.includes('dans le même style') || lower.includes('même style')) {
      return {
        hasReference: true,
        referenceType: 'STYLE_TRANSFER',
        rawTargetMention: raw,
        resolvedTargetSelector: '.card, section, button',
        resolvedTargetDescription: 'Harmonisation stylistique selon le Design DNA actif',
        actionScope: 'CONTAINER',
        confidence: 0.88,
        preservedFeatures: ['Structure logique', 'Données'],
        isCorrection: false,
      };
    }

    return {
      hasReference: false,
      referenceType: 'NONE',
      resolvedTargetDescription: 'Instruction globale ou nouvelle fonctionnalité',
      actionScope: 'ENTIRE_APP',
      confidence: 1.0,
      preservedFeatures: ['Fonctionnalités existantes'],
      isCorrection: false,
    };
  }
}

export const referenceResolver = new ReferenceResolver();
