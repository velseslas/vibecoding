import { RiskLevel, UserIntentType } from '../intent/intentEngine';
import { logger } from '../logger';

export type AutonomyAction =
  | 'AUTONOMOUS_EXECUTION'
  | 'PROPOSE_PLAN'
  | 'REQUIRE_CONFIRMATION'
  | 'REQUIRE_CONFIRMATION_WITH_SNAPSHOT'
  | 'BLOCK_DESTRUCTIVE';

export interface AutonomyEvaluation {
  action: AutonomyAction;
  autonomyScore: number; // 0.0 to 1.0 (higher means more autonomous)
  impactFactor: number; // 0.0 (low) to 1.0 (critical)
  uncertaintyFactor: number; // 0.0 (high confidence) to 1.0 (high ambiguity)
  reversibilityFactor: number; // 1.0 (easy rollback) to 0.0 (irreversible)
  sensitivityFactor: number; // 0.0 (standard UI) to 1.0 (auth, billing, security)
  requiresExplicitConfirmation: boolean;
  requiresPreExecutionSnapshot: boolean;
  rationale: string;
}

export class AutonomyEngine {
  /**
   * Evaluates autonomy grade based on the formula:
   * RiskScore = Impact × (1 + Uncertainty) × (1 - Reversibility) × (1 + Sensitivity)
   */
  public evaluateAutonomy(params: {
    riskLevel: RiskLevel;
    confidence: number;
    intent: UserIntentType;
    prompt: string;
    hasBlockingAssumptions?: boolean;
    hasContradictions?: boolean;
  }): AutonomyEvaluation {
    const lower = params.prompt.toLowerCase();

    // 1. Map impact
    let impactFactor = 0.1;
    if (params.riskLevel === 'MEDIUM') impactFactor = 0.4;
    if (params.riskLevel === 'HIGH') impactFactor = 0.75;
    if (params.riskLevel === 'CRITICAL') impactFactor = 1.0;

    // 2. Uncertainty
    const uncertaintyFactor = Math.max(0, Math.min(1, 1 - params.confidence));

    // 3. Reversibility (UI tweaks are 100% reversible via rollback snapshot; auth deletion or external migration is less reversible)
    let reversibilityFactor = 0.95;
    if (params.riskLevel === 'HIGH') reversibilityFactor = 0.6;
    if (params.riskLevel === 'CRITICAL' || params.intent === 'DELETE') reversibilityFactor = 0.2;

    // 4. Sensitivity (Security, billing, database)
    let sensitivityFactor = 0.1;
    if (lower.includes('paiement') || lower.includes('stripe') || lower.includes('facturation')) sensitivityFactor = 0.8;
    if (lower.includes('auth') || lower.includes('password') || lower.includes('token') || lower.includes('security')) sensitivityFactor = 0.95;

    // Compute composite Risk Metric
    const compositeRisk = (impactFactor * 0.4) + (uncertaintyFactor * 0.25) + ((1 - reversibilityFactor) * 0.2) + (sensitivityFactor * 0.15);
    const autonomyScore = Math.max(0, Math.min(1, 1 - compositeRisk));

    // Decision gating
    if (params.riskLevel === 'CRITICAL' || params.intent === 'DELETE' || compositeRisk >= 0.75) {
      return {
        action: 'REQUIRE_CONFIRMATION_WITH_SNAPSHOT',
        autonomyScore,
        impactFactor,
        uncertaintyFactor,
        reversibilityFactor,
        sensitivityFactor,
        requiresExplicitConfirmation: true,
        requiresPreExecutionSnapshot: true,
        rationale: 'Opération à criticité élevée : Confirmation explicite et snapshot de sécurité requis.',
      };
    }

    if (params.riskLevel === 'HIGH' || params.hasContradictions || compositeRisk >= 0.5) {
      return {
        action: 'REQUIRE_CONFIRMATION',
        autonomyScore,
        impactFactor,
        uncertaintyFactor,
        reversibilityFactor,
        sensitivityFactor,
        requiresExplicitConfirmation: true,
        requiresPreExecutionSnapshot: false,
        rationale: 'Opération à impact élevé ou présentant un conflit : Validation préalable requise.',
      };
    }

    if (params.riskLevel === 'MEDIUM' || compositeRisk >= 0.3) {
      return {
        action: 'PROPOSE_PLAN',
        autonomyScore,
        impactFactor,
        uncertaintyFactor,
        reversibilityFactor,
        sensitivityFactor,
        requiresExplicitConfirmation: false,
        requiresPreExecutionSnapshot: false,
        rationale: 'Opération modérée : Plan d\'exécution visible généré automatiquement.',
      };
    }

    return {
      action: 'AUTONOMOUS_EXECUTION',
      autonomyScore,
      impactFactor,
      uncertaintyFactor,
      reversibilityFactor,
      sensitivityFactor,
      requiresExplicitConfirmation: false,
      requiresPreExecutionSnapshot: false,
      rationale: 'Opération incrémentale sûre : Exécution autonome instantanée autorisée.',
    };
  }
}

export const autonomyEngine = new AutonomyEngine();
