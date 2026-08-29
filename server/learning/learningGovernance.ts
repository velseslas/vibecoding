import crypto from 'crypto';
import { GovernancePromotionCandidate, RepairStrategy } from './bugIntelligenceTypes';
import { dbAdapter } from '../db/database';
import { repairStrategyMemory } from './repairStrategyMemory';
import { logger } from '../logger';

export class LearningGovernanceService {
  private candidates: Map<string, GovernancePromotionCandidate> = new Map();

  /**
   * Evaluates whether a candidate repair strategy qualifies for promotion
   */
  public evaluatePromotion(
    strategy: RepairStrategy,
    evidence: string[],
    confidence: number
  ): {
    allowed: boolean;
    reason: string;
    candidate?: GovernancePromotionCandidate;
  } {
    // 1. Gating rule: Confidence threshold
    if (confidence < 0.85) {
      return {
        allowed: false,
        reason: `Promotion refusée : Le niveau de confiance (${confidence}) est inférieur au seuil requis de 0.85.`,
      };
    }

    // 2. Gating rule: Minimum validation count
    if (strategy.successCount < 3) {
      return {
        allowed: false,
        reason: `Promotion refusée : La stratégie n'a été validée avec succès que ${strategy.successCount} fois (minimum requis: 3).`,
      };
    }

    // 3. Gating rule: Success rate minimum
    if (strategy.successRate < 0.8) {
      return {
        allowed: false,
        reason: `Promotion refusée : Le taux de succès (${strategy.successRate}) est inférieur à 0.80.`,
      };
    }

    const candidateId = 'cand_' + crypto.randomBytes(4).toString('hex');
    const candidate: GovernancePromotionCandidate = {
      id: candidateId,
      strategyId: strategy.id,
      proposedRuleName: `Règle de Réparation : ${strategy.targetAction}`,
      evidence,
      confidence,
      status: 'PROPOSED',
      rollbackSnapshot: {
        previousStatus: strategy.status,
        previousSuccessCount: strategy.successCount,
        previousFailureCount: strategy.failureCount,
      },
    };

    this.candidates.set(candidateId, candidate);
    return {
      allowed: true,
      reason: 'Critères de gouvernance validés pour la promotion.',
      candidate,
    };
  }

  /**
   * Promotes a candidate strategy to permanent active rule with rollback preservation
   */
  public promoteRule(
    candidateId: string,
    promotedBy = 'Governance Officer / AI Architect'
  ): { success: boolean; candidate?: GovernancePromotionCandidate; error?: string } {
    const candidate = this.candidates.get(candidateId);
    if (!candidate) {
      return { success: false, error: 'Candidat de promotion introuvable.' };
    }

    if (candidate.status === 'REJECTED') {
      return { success: false, error: 'Ce candidat a été explicitement rejeté.' };
    }

    const strategy = repairStrategyMemory.getStrategyById(candidate.strategyId);
    if (!strategy) {
      return { success: false, error: 'Stratégie sous-jacente introuvable.' };
    }

    strategy.status = 'ACTIVE';
    candidate.status = 'PROMOTED';
    candidate.promotedAt = Date.now();
    candidate.promotedBy = promotedBy;

    logger.info(
      'LearningGovernance',
      `Promoted rule ${candidate.proposedRuleName} (Candidate ${candidateId}) by ${promotedBy}`
    );

    return { success: true, candidate };
  }

  /**
   * Executes deterministic rollback on a previously promoted rule
   */
  public rollbackPromotedRule(
    candidateId: string,
    reason = 'Régression observée ou demande explicite'
  ): boolean {
    const candidate = this.candidates.get(candidateId);
    if (!candidate || candidate.status !== 'PROMOTED') return false;

    const strategy = repairStrategyMemory.getStrategyById(candidate.strategyId);
    if (strategy && candidate.rollbackSnapshot) {
      strategy.status = candidate.rollbackSnapshot.previousStatus || 'EXPERIMENTAL';
    }

    candidate.status = 'ROLLED_BACK';
    candidate.rolledBackAt = Date.now();
    candidate.rolledBackReason = reason;

    logger.warn(
      'LearningGovernance',
      `Rolled back promoted rule ${candidate.proposedRuleName} (${candidateId}): ${reason}`
    );

    return true;
  }

  /**
   * Guardrail: Verifies that Application DNA has NOT been modified by the learning system
   */
  public verifyDnaIntegrity(projectId: string, originalDnaHash: string): boolean {
    const currentDna = dbAdapter.getProjectDna(projectId);
    if (!currentDna) return true;
    const currentHash = crypto.createHash('sha256').update(JSON.stringify(currentDna.rules)).digest('hex');
    return currentHash === originalDnaHash;
  }

  public getCandidate(id: string): GovernancePromotionCandidate | undefined {
    return this.candidates.get(id);
  }

  public getAllCandidates(): GovernancePromotionCandidate[] {
    return Array.from(this.candidates.values());
  }
}

export const learningGovernanceService = new LearningGovernanceService();
