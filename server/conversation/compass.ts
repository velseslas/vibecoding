import { ConversationCompassState } from '../db/schema';

export interface CompassContext {
  userGoal: string;
  missingInformation: string[];
  assumptionsMade: string[];
  inProgressAction?: string;
  completedActions: string[];
  failedActions: string[];
  nextRecommendedAction: string;
  requiresUserConfirmation: boolean;
  confirmationReason?: string;
}

export interface CompassStateTransition {
  previousState: ConversationCompassState;
  newState: ConversationCompassState;
  reason: string;
  timestamp: number;
}

export class ConversationCompass {
  private state: ConversationCompassState = 'EXPLORING';
  private context: CompassContext = {
    userGoal: '',
    missingInformation: [],
    assumptionsMade: [],
    completedActions: [],
    failedActions: [],
    nextRecommendedAction: 'Analyser la demande initiale de l\'utilisateur',
    requiresUserConfirmation: false,
  };
  private history: CompassStateTransition[] = [];

  constructor(initialState: ConversationCompassState = 'EXPLORING') {
    this.state = initialState;
  }

  public getState(): ConversationCompassState {
    return this.state;
  }

  public getContext(): CompassContext {
    return { ...this.context };
  }

  public getHistory(): CompassStateTransition[] {
    return [...this.history];
  }

  public transitionTo(newState: ConversationCompassState, reason: string, contextUpdates?: Partial<CompassContext>): void {
    const prev = this.state;
    this.state = newState;
    this.history.push({
      previousState: prev,
      newState,
      reason,
      timestamp: Date.now(),
    });

    if (contextUpdates) {
      this.context = {
        ...this.context,
        ...contextUpdates,
      };
    }
  }

  /**
   * Determine optimal state based on analysis result
   */
  public evaluateNextState(params: {
    hasAmbiguity: boolean;
    isHighRisk: boolean;
    isExecutionComplete: boolean;
    hasValidationError: boolean;
    hasPlan: boolean;
  }): { nextState: ConversationCompassState; reason: string; nextAction: string } {
    if (params.hasAmbiguity) {
      return {
        nextState: 'CLARIFYING',
        reason: 'Des informations clés sont manquantes ou ambiguës.',
        nextAction: 'Poser une question de clarification ciblée à l\'utilisateur.',
      };
    }

    if (params.isHighRisk) {
      return {
        nextState: 'WAITING_CONFIRMATION',
        reason: 'Modification à impact critique détectée.',
        nextAction: 'Présenter le plan d\'impact et attendre la confirmation explicite de l\'utilisateur.',
      };
    }

    if (params.hasValidationError) {
      return {
        nextState: 'REPAIRING',
        reason: 'Erreur de validation ou de preview détectée.',
        nextAction: 'Lancer une réparation ciblée du code généré.',
      };
    }

    if (params.isExecutionComplete) {
      return {
        nextState: 'COMPLETED',
        reason: 'Toutes les étapes du plan ont été exécutées et validées.',
        nextAction: 'Mettre à jour la mémoire du projet et afficher l\'aperçu.',
      };
    }

    if (params.hasPlan) {
      return {
        nextState: 'EXECUTING',
        reason: 'Le plan est prêt et sans risque bloquant.',
        nextAction: 'Générer et assembler les modifications de code.',
      };
    }

    return {
      nextState: 'PLANNING',
      reason: 'Compréhension du projet et de l\'intention terminée.',
      nextAction: 'Construire le plan d\'action pas à pas.',
    };
  }
}
