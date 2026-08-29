import { NormalizedErrorForAI } from '../preview/previewLifecycle';
import { UserIntentType, RiskLevel } from '../intent/intentEngine';

export type IncidentCategory =
  | 'INTENT'
  | 'CONTEXT'
  | 'ASSUMPTION'
  | 'PLAN'
  | 'EXECUTION'
  | 'CODE'
  | 'BUILD'
  | 'TYPE'
  | 'DEPENDENCY'
  | 'RUNTIME'
  | 'PREVIEW'
  | 'QUALITY'
  | 'AUTO_REPAIR'
  | 'ROLLBACK'
  | 'SECURITY'
  | 'UNKNOWN';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RootCauseStatus = 'HYPOTHESIS' | 'PROBABLE' | 'CONFIRMED';

export interface RootCauseDiagnostic {
  observedError: string;
  probableCause: string;
  contributingFactors: string[];
  candidateStrategy: string;
  confidence: number; // 0.0 to 1.0
  status: RootCauseStatus;
  evidence: string[];
  source: 'HEURISTIC' | 'AI' | 'PATTERN_MATCH' | 'USER_FEEDBACK';
}

export interface IntelligenceIncident {
  id: string;
  timestamp: number;
  projectId: string;
  conversationId?: string;
  executionId?: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  normalizedError: NormalizedErrorForAI;
  fingerprint: string;
  contextSnapshot: {
    prompt?: string;
    intent?: UserIntentType;
    filesCount?: number;
    htmlSnippet?: string;
    riskLevel?: RiskLevel;
    activeDecisionsCount?: number;
  };
  rootCause?: RootCauseDiagnostic;
  attemptedStrategies: string[];
  successfulStrategy?: string;
  resolved: boolean;
  resolutionConfidence: number;
  recurrenceCount: number;
}

export interface RepairStrategy {
  id: string;
  incidentPattern: string; // Error fingerprint or normalized pattern
  category: IncidentCategory;
  strategyDescription: string;
  targetAction: string; // e.g. "INJECT_LUCIDE_CDN", "WRAP_NULL_GUARD", "EQUILIBRATE_BRACKETS"
  successCount: number;
  failureCount: number;
  successRate: number;
  averageAttempts: number;
  scope: 'PROJECT' | 'GLOBAL';
  projectId?: string;
  lastValidatedAt: number;
  createdAt: number;
  status: 'ACTIVE' | 'EXPERIMENTAL' | 'DEPRECATED';
}

export type LearningSignalType =
  | 'AUTO_REPAIR_SUCCESS'
  | 'AUTO_REPAIR_FAILED'
  | 'ROLLBACK_TRIGGERED'
  | 'AI_OUTPUT_CORRECTED_BY_USER'
  | 'USER_MODIFIED_AFTER_GEN'
  | 'PLAN_REJECTED'
  | 'CLARIFICATION_TRIGGERED'
  | 'DECISION_SUPERSEDED'
  | 'RUNTIME_ERROR'
  | 'PREVIEW_FAILED'
  | 'BUILD_FAILED'
  | 'REGRESSION_DETECTED'
  | 'EXPLICIT_USER_CONFIRMATION'
  | 'HUMAN_FEEDBACK';

export interface LearningSignal {
  id: string;
  type: LearningSignalType;
  projectId: string;
  conversationId?: string;
  versionId?: string;
  previewId?: string;
  payload: Record<string, any>;
  timestamp: number;
}

export type BenchmarkCaseStatus = 'CANDIDATE' | 'VALIDATED' | 'REJECTED' | 'PROMOTED';

export interface BenchmarkTestCase {
  id: string;
  name: string;
  description: string;
  category: IncidentCategory;
  fingerprint: string;
  initialPrompt: string;
  reproductionCode: string;
  expectedFixVerification: (html: string) => boolean;
  status: BenchmarkCaseStatus;
  provenance: {
    originIncidentId: string;
    originProjectId: string;
    createdAt: number;
    validatedAt?: number;
    promotedAt?: number;
    author: string;
  };
  reproducible: boolean;
  runsCount: number;
  passCount: number;
}

export interface RegressionWarning {
  fingerprint: string;
  description: string;
  severity: IncidentSeverity;
  previousIncidentId: string;
  recommendedSafeguards: string[];
  requiredExtraPlanSteps: string[];
}

export interface IntentLearningRecord {
  id: string;
  projectId: string;
  userPrompt: string;
  expectedIntent?: UserIntentType;
  inferredIntent: UserIntentType;
  clarificationTriggered: boolean;
  userCorrection?: string;
  probableAmbiguityCause: string;
  timestamp: number;
}

export interface HumanFeedback {
  id: string;
  projectId: string;
  conversationId?: string;
  versionId?: string;
  previewId?: string;
  rating: 'THUMBS_UP' | 'THUMBS_DOWN' | 'HELPFUL' | 'UNHELPFUL';
  comment?: string;
  category?: 'CODE_QUALITY' | 'DESIGN' | 'BUG_FIX' | 'INTENT_UNDERSTANDING';
  timestamp: number;
}

export interface GovernancePromotionCandidate {
  id: string;
  strategyId: string;
  proposedRuleName: string;
  evidence: string[];
  confidence: number;
  status: 'PROPOSED' | 'VALIDATED' | 'REJECTED' | 'PROMOTED' | 'ROLLED_BACK';
  rollbackSnapshot?: Record<string, any>;
  promotedAt?: number;
  promotedBy?: string;
  rolledBackAt?: number;
  rolledBackReason?: string;
}
