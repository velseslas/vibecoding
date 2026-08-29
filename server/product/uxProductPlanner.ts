import { ProductBlueprint } from './productBlueprint';
import { logger } from '../logger';

export interface VisualHierarchySpec {
  focalPointElement: string;
  secondaryElements: string[];
  contrastRatio: string;
  spacingRhythm: string;
  typographyScale: string;
}

export interface StateMachineSpec {
  initialState: string;
  states: Array<{
    name: string;
    description: string;
    transitions: Array<{ on: string; to: string }>;
  }>;
}

export interface UXPlan {
  blueprintId: string;
  archetype: string;
  title: string;
  focalPoint: { elementId: string; description?: string };
  userFlows: Array<{ id: string; name: string; steps: string[] }>;
  layoutArchitecture: {
    containerClass: string;
    headerConfig: string;
    stageStructure: string;
    navigationType: string;
  };
  visualHierarchy: VisualHierarchySpec;
  stateMachine: StateMachineSpec;
  microInteractions: Array<{
    name: string;
    trigger: string;
    cssClassTransitions: string;
    audioOrHapticCue?: string;
  }>;
  executionSteps: Array<{
    phase: string;
    description: string;
    targetComponent: string;
  }>;
}

export class UXProductPlanner {
  /**
   * Translates a Product Blueprint into an actionable UX Plan for synthesis
   */
  public planUX(blueprint: ProductBlueprint): UXPlan {
    const isMobileFirst = blueprint.responsiveStrategy === 'mobile_first';

    const visualHierarchy: VisualHierarchySpec = {
      focalPointElement: isMobileFirst ? '#swipe-card-stage' : '#main-content-stage',
      secondaryElements: ['#action-buttons-bar', '#navigation-bar', '#header-bar'],
      contrastRatio: 'WCAG AAA (12.4:1 contrast for cards against backdrop)',
      spacingRhythm: '4px / 8px / 16px / 24px / 32px standard harmonic scale',
      typographyScale: 'Plus Jakarta Sans / Inter display pairing with clear step hierarchy',
    };

    const stateMachine: StateMachineSpec = this.buildStateMachine(blueprint);

    const uxPlan: UXPlan = {
      blueprintId: blueprint.id,
      archetype: blueprint.archetype,
      title: blueprint.title,
      focalPoint: {
        elementId: isMobileFirst ? 'cards-stack' : 'main-stage',
        description: 'Élément focal principal du produit',
      },
      userFlows: [
        {
          id: 'flow_primary_action',
          name: 'Action Principale Utilisateur',
          steps: ['Chargement du composant', 'Action utilisateur réactive', 'Mise à jour d\'état en temps réel'],
        },
        {
          id: 'flow_secondary_navigation',
          name: 'Navigation et Détails',
          steps: ['Changement de vue', 'Affichage des données contextuelles', 'Rétroaction visuelle'],
        },
      ],
      layoutArchitecture: {
        containerClass: isMobileFirst
          ? 'max-w-md w-full mx-auto h-full flex flex-col bg-slate-950 text-white rounded-none sm:rounded-3xl shadow-2xl overflow-hidden relative border-0 sm:border sm:border-slate-800'
          : 'max-w-7xl w-full mx-auto p-6 flex flex-col gap-6',
        headerConfig: 'Glassmorphism top bar with brand badge, filter icon and active profile avatar',
        stageStructure: isMobileFirst ? 'flex-1 relative overflow-hidden flex flex-col' : 'grid grid-cols-1 md:grid-cols-3 gap-6',
        navigationType: blueprint.navigation.type,
      },
      visualHierarchy,
      stateMachine,
      microInteractions: [
        {
          name: 'Card Drag & Rotate',
          trigger: 'Pointer move during drag',
          cssClassTransitions: 'transform transition-none rotate-[var(--rotation)] translate-x-[var(--drag-x)]',
        },
        {
          name: 'Stamp Reveal',
          trigger: 'Drag past threshold (30px)',
          cssClassTransitions: 'opacity-100 scale-110 transition-all duration-150',
        },
        {
          name: 'Match Celebration Popup',
          trigger: 'Like action on compatible profile',
          cssClassTransitions: 'animate-bounce scale-100 opacity-100 backdrop-blur-md',
        },
      ],
      executionSteps: [
        {
          phase: '1. Scaffolding Structure',
          description: 'Créer le cadre d\'application avec header immersif, viewport réactif et conteneur multi-écrans.',
          targetComponent: 'AppShell',
        },
        {
          phase: '2. Dynamic State & Data Seeding',
          description: 'Injecter les données de profils/métriques complètes avec photos, tags, bios et états réactifs.',
          targetComponent: 'StateStore',
        },
        {
          phase: '3. Interactive Card Physics & Gesture Engine',
          description: 'Implémenter le drag interactif, la rotation avec transform CSS et les boutons d\'action rapides.',
          targetComponent: 'CardDeckStage',
        },
        {
          phase: '4. Modals & Overlay Screens',
          description: 'Ajouter la célébration de Match, la fenêtre de discussion en direct et les filtres de recherche.',
          targetComponent: 'Overlays',
        },
        {
          phase: '5. Navigation & Screen Switching',
          description: 'Connecter les onglets de la barre de navigation inférieure avec synchronisation visuelle immédiate.',
          targetComponent: 'BottomNav',
        },
      ],
    };

    logger.info('UXProductPlanner', `Created UX Plan for [${blueprint.title}] with ${uxPlan.executionSteps.length} execution phases`);
    return uxPlan;
  }

  private buildStateMachine(blueprint: ProductBlueprint): StateMachineSpec {
    if (blueprint.archetype === 'DATING_APP') {
      return {
        initialState: 'DECK_ACTIVE',
        states: [
          {
            name: 'DECK_ACTIVE',
            description: 'L\'utilisateur navigue sur le deck de swipe de profils.',
            transitions: [
              { on: 'CARD_DRAG', to: 'CARD_DRAGGING' },
              { on: 'LIKE', to: 'EVALUATING_MATCH' },
              { on: 'PASS', to: 'ADVANCING_DECK' },
              { on: 'DECK_EXHAUSTED', to: 'DECK_EMPTY' },
              { on: 'NAV_MATCHES', to: 'SCREEN_MATCHES' },
              { on: 'NAV_PROFILE', to: 'SCREEN_PROFILE' },
              { on: 'OPEN_FILTERS', to: 'MODAL_FILTERS_OPEN' },
            ],
          },
          {
            name: 'MATCH_CELEBRATION',
            description: 'Un match mutuel est détecté, affichage de la modale de félicitations.',
            transitions: [
              { on: 'CLOSE_MATCH', to: 'DECK_ACTIVE' },
              { on: 'START_CHAT', to: 'SCREEN_CHAT_OPEN' },
            ],
          },
          {
            name: 'SCREEN_MATCHES',
            description: 'Affichage des matchs récents et conversations.',
            transitions: [
              { on: 'OPEN_CONVERSATION', to: 'SCREEN_CHAT_OPEN' },
              { on: 'NAV_DISCOVER', to: 'DECK_ACTIVE' },
            ],
          },
          {
            name: 'SCREEN_PROFILE',
            description: 'Affichage du profil personnel et des préférences.',
            transitions: [{ on: 'NAV_DISCOVER', to: 'DECK_ACTIVE' }],
          },
        ],
      };
    }

    return {
      initialState: 'INITIAL_LOADED',
      states: [
        {
          name: 'INITIAL_LOADED',
          description: 'Application chargée et prête pour interaction.',
          transitions: [
            { on: 'INTERACTION', to: 'ACTIVE_INTERACTION' },
            { on: 'OPEN_MODAL', to: 'MODAL_OPEN' },
          ],
        },
      ],
    };
  }
}

export const uxProductPlanner = new UXProductPlanner();
