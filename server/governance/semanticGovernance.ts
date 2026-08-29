import { dbAdapter } from '../db/database';
import { appDnaService } from '../analysis/appDna';
import { logger } from '../logger';

export type DecisionLifecycleStatus =
  | 'ACTIVE'
  | 'SUPERSEDED'
  | 'MODIFIED'
  | 'EXPERIMENTAL'
  | 'ARCHIVED'
  | 'REVOKED';

export type DecisionSourceType = 'USER' | 'AI' | 'SYSTEM';
export type DecisionExplicitness = 'EXPLICIT' | 'IMPLICIT';

export interface ProvenanceDecision {
  id: string;
  projectId: string;
  topic: string;
  decision: string;
  rationale: string;
  source: string; // e.g. "Utilisateur (Prompt)", "AI Orchestrator"
  sourceType: DecisionSourceType;
  explicitOrImplicit: DecisionExplicitness;
  evidence?: string;
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: DecisionLifecycleStatus;
  supersededById?: string;
  supersedesId?: string;
  timestamp: number;
}

export type GovernanceRelationType =
  | 'CONTRADICTION'
  | 'SUPERSEDING'
  | 'EXCEPTION'
  | 'DUPLICATION'
  | 'COMPATIBLE';

export interface GovernanceConflict {
  conflictingDecisionId: string;
  previousDecisionText: string;
  newDemandText: string;
  relationType: GovernanceRelationType;
  description: string;
  requiresUserConfirmation: boolean;
  proposedResolution: 'SUPERSEDE_OLD' | 'REJECT_NEW' | 'MERGE_AS_EXCEPTION';
}

export interface GovernanceCheckResult {
  passed: boolean;
  conflicts: GovernanceConflict[];
  hasContradictions: boolean;
  compatibleWithRules: boolean;
  dnaViolations: string[];
  governanceReport: string;
}

export class SemanticGovernanceService {
  /**
   * Evaluates if a new prompt or proposed change contradicts existing decisions or DNA rules
   */
  public checkGovernance(projectId: string, prompt: string, currentDecisions: ProvenanceDecision[]): GovernanceCheckResult {
    const lower = prompt.toLowerCase();
    const conflicts: GovernanceConflict[] = [];
    const dnaViolations: string[] = [];

    const dna = appDnaService.getOrCreateDna(projectId);

    // 1. Check against active decisions
    for (const dec of currentDecisions.filter((d) => d.status === 'ACTIVE')) {
      const decLower = dec.decision.toLowerCase();

      // Case: Single manager vs Multiple managers
      if (
        (decLower.includes('un seul responsable') || decLower.includes('un responsable principal') || decLower.includes('responsable unique')) &&
        (lower.includes('plusieurs responsables') || lower.includes('responsables multiples') || lower.includes('multiples responsables'))
      ) {
        conflicts.push({
          conflictingDecisionId: dec.id,
          previousDecisionText: dec.decision,
          newDemandText: prompt,
          relationType: 'CONTRADICTION',
          description: `La demande entre en contradiction directe avec la décision antérieure [${dec.topic}] : "${dec.decision}".`,
          requiresUserConfirmation: true,
          proposedResolution: 'SUPERSEDE_OLD',
        });
      }

      // Case: Dark mode vs Forced light mode
      if (
        (decLower.includes('thème sombre obligatoire') || decLower.includes('dark mode')) &&
        (lower.includes('passe tout en clair') || lower.includes('force le mode clair sans sombre'))
      ) {
        conflicts.push({
          conflictingDecisionId: dec.id,
          previousDecisionText: dec.decision,
          newDemandText: prompt,
          relationType: 'SUPERSEDING',
          description: `Remplacement de la charte graphique : Passage du thème sombre au thème clair.`,
          requiresUserConfirmation: false,
          proposedResolution: 'SUPERSEDE_OLD',
        });
      }

      // Case: Local storage vs Remote database
      if (
        (decLower.includes('localstorage') || decLower.includes('persistance locale')) &&
        (lower.includes('base de données postgresql') || lower.includes('cloud sql') || lower.includes('serveur distant'))
      ) {
        conflicts.push({
          conflictingDecisionId: dec.id,
          previousDecisionText: dec.decision,
          newDemandText: prompt,
          relationType: 'SUPERSEDING',
          description: `Évolution architecturale : Migration d'un stockage local vers une base de données relationnelle.`,
          requiresUserConfirmation: true,
          proposedResolution: 'SUPERSEDE_OLD',
        });
      }
    }

    // 2. Check against DNA strict rules
    for (const rule of dna.rules) {
      const ruleLower = rule.toLowerCase();
      if (ruleLower.includes('tailwind') && (lower.includes('retire tailwind') || lower.includes('sans tailwind') || lower.includes('bootstrap'))) {
        dnaViolations.push(`Règle DNA violée : ${rule}`);
      }
      if (ruleLower.includes('jamais exposer de clés api') && (lower.includes('hardcode la clé api') || lower.includes('clé api dans le script html'))) {
        dnaViolations.push(`Règle de Sécurité DNA violée : ${rule}`);
      }
    }

    const hasContradictions = conflicts.some((c) => c.relationType === 'CONTRADICTION');
    const passed = conflicts.length === 0 && dnaViolations.length === 0;

    let governanceReport = 'Gouvernance sémantique conforme : aucune contradiction détectée.';
    if (!passed) {
      governanceReport = `Alerte Gouvernance : ${conflicts.length} conflit(s) et ${dnaViolations.length} violation(s) détectés.`;
    }

    logger.info('SemanticGovernance', `Project ${projectId} governance check: ${passed ? 'PASSED' : 'CONFLICTS_FOUND'}`);

    return {
      passed,
      conflicts,
      hasContradictions,
      compatibleWithRules: dnaViolations.length === 0,
      dnaViolations,
      governanceReport,
    };
  }

  /**
   * Applies an explicit superseding transition on a decision in memory
   */
  public supersedeDecision(
    existingDecisions: ProvenanceDecision[],
    oldDecisionId: string,
    newDecision: ProvenanceDecision
  ): ProvenanceDecision[] {
    return existingDecisions.map((d) => {
      if (d.id === oldDecisionId) {
        return {
          ...d,
          status: 'SUPERSEDED' as DecisionLifecycleStatus,
          supersededById: newDecision.id,
        };
      }
      return d;
    }).concat({
      ...newDecision,
      status: 'ACTIVE' as DecisionLifecycleStatus,
      supersedesId: oldDecisionId,
    });
  }
}

export const semanticGovernanceService = new SemanticGovernanceService();
