import { logger } from '../logger';

export type AssumptionSource = 'USER' | 'APPLICATION' | 'INFERENCE' | 'DEFAULT';
export type AssumptionResolution = 'ASSUME' | 'ASK_USER' | 'BLOCK';

export interface Assumption {
  id: string;
  statement: string;
  source: AssumptionSource;
  confidence: number; // 0.0 to 1.0
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  reversibility: 'HIGH' | 'MEDIUM' | 'LOW';
  resolution: AssumptionResolution;
  requiresConfirmation: boolean;
}

export interface AssumptionEvaluationResult {
  assumptions: Assumption[];
  hasBlockingAssumptions: boolean;
  clarificationNeeded?: string;
}

export class AssumptionEngine {
  /**
   * Identifies implicit assumptions in user requests and determines whether to assume, ask user, or block
   */
  public evaluateAssumptions(
    prompt: string,
    context?: {
      hasExistingCode?: boolean;
      existingTheme?: string;
    }
  ): AssumptionEvaluationResult {
    const raw = (prompt || '').trim();
    const lower = raw.toLowerCase();
    const assumptions: Assumption[] = [];

    // 1. Extreme Ambiguity
    if (lower.length < 10 && !lower.includes('bouton') && !lower.includes('dark')) {
      assumptions.push({
        id: 'asm_vague_prompt',
        statement: 'L\'utilisateur souhaite une application générique sans détails précis',
        source: 'INFERENCE',
        confidence: 0.3,
        impact: 'HIGH',
        reversibility: 'HIGH',
        resolution: 'ASK_USER',
        requiresConfirmation: true,
      });

      return {
        assumptions,
        hasBlockingAssumptions: true,
        clarificationNeeded: 'Votre demande est très concise. Pouvez-vous préciser ce que vous souhaitez améliorer ou créer ?',
      };
    }

    // 2. Theme / Styling Assumptions
    if (!lower.includes('clair') && !lower.includes('sombre') && !lower.includes('dark') && !lower.includes('light')) {
      assumptions.push({
        id: 'asm_theme_default',
        statement: 'Thème moderne avec support du contraste dynamique par défaut',
        source: 'DEFAULT',
        confidence: 0.85,
        impact: 'LOW',
        reversibility: 'HIGH',
        resolution: 'ASSUME',
        requiresConfirmation: false,
      });
    }

    // 3. Storage Assumptions
    if (!lower.includes('base de donnees') && !lower.includes('serveur') && !lower.includes('api')) {
      assumptions.push({
        id: 'asm_storage_local',
        statement: 'Persistance locale immédiate via LocalStorage pour une réactivité optimale',
        source: 'DEFAULT',
        confidence: 0.9,
        impact: 'LOW',
        reversibility: 'HIGH',
        resolution: 'ASSUME',
        requiresConfirmation: false,
      });
    }

    // 4. Contradictory Request Assumptions (UI Migration)
    if (
      (lower.includes('supprime') || lower.includes('retire')) &&
      (lower.includes('mais garde') || lower.includes('mais conserve') || lower.includes('tout en gardant') || lower.includes('sans perdre'))
    ) {
      assumptions.push({
        id: 'asm_contradictory_ui',
        statement: 'Déplacement des actions et contrôles de la sidebar vers le bandeau supérieur pour préserver leur accessibilité après retrait visuel de la barre latérale.',
        source: 'INFERENCE',
        confidence: 0.88,
        impact: 'MEDIUM',
        reversibility: 'MEDIUM',
        resolution: 'ASSUME',
        requiresConfirmation: false,
      });
    }

    // 5. Critical Architecture Inferences (Payment, Multi-Tenant)
    if (lower.includes('paiement') && !lower.includes('stripe')) {
      assumptions.push({
        id: 'asm_payment_provider',
        statement: 'Intégration via passerelle Stripe Checkout sécurisée',
        source: 'INFERENCE',
        confidence: 0.75,
        impact: 'MEDIUM',
        reversibility: 'MEDIUM',
        resolution: 'ASSUME',
        requiresConfirmation: false,
      });
    }

    // 6. High Risk / Multi-manager assumption
    if (lower.includes('plusieurs responsables') && !lower.includes('permission')) {
      assumptions.push({
        id: 'asm_multi_managers',
        statement: 'Les responsables partagent les mêmes droits d\'administration sur le chantier/projet',
        source: 'INFERENCE',
        confidence: 0.7,
        impact: 'MEDIUM',
        reversibility: 'HIGH',
        resolution: 'ASSUME',
        requiresConfirmation: false,
      });
    }

    const blocking = assumptions.some((a) => a.resolution === 'BLOCK' || (a.resolution === 'ASK_USER' && a.confidence < 0.6 && a.impact === 'HIGH'));

    return {
      assumptions,
      hasBlockingAssumptions: blocking,
      clarificationNeeded: blocking ? assumptions.find((a) => a.requiresConfirmation)?.statement : undefined,
    };
  }
}

export const assumptionEngine = new AssumptionEngine();
