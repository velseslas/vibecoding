export type VibeStyle = 'modern-saas' | 'cyberpunk' | 'pastel-dream' | 'midnight-luxe' | 'neo-brutalist' | 'retro-synth';

export type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export type WorkspaceTab = 'preview' | 'code' | 'structure' | 'console' | 'history';

export type ConversationCompassState =
  | 'IDLE'
  | 'EXPLORING'
  | 'UNDERSTANDING'
  | 'CLARIFYING'
  | 'PLANNING'
  | 'WAITING_CONFIRMATION'
  | 'EXECUTING'
  | 'VALIDATING'
  | 'REPAIRING'
  | 'COMPLETED'
  | 'FAILED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CodeFile {
  name: string;
  type: 'html' | 'javascript' | 'css' | 'json';
  content: string;
}

export interface AppElementTarget {
  selector?: string;
  tagName?: string;
  id?: string;
  className?: string;
  innerText?: string;
}

export interface PlanStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  isValidationStep?: boolean;
}

export interface ExecutionPlan {
  id: string;
  goal: string;
  riskLevel: RiskLevel;
  steps: PlanStep[];
  requiresUserConfirmation: boolean;
}

export interface ImpactDetails {
  riskLevel: RiskLevel;
  directlyAffectedFiles: string[];
  indirectlyAffectedFiles: string[];
  affectedFeatures: string[];
  potentialBreakingChanges: string[];
  requiresExplicitConfirmation: boolean;
  confirmationPrompt?: string;
  rationale: string;
}

export interface QualityIssue {
  type: 'ERROR' | 'WARNING' | 'INFO';
  category: string;
  message: string;
  file?: string;
}

export interface QualityReport {
  overallScore: number;
  syntaxValid: boolean;
  securityPassed: boolean;
  responsivenessPassed: boolean;
  issues: QualityIssue[];
  passed: boolean;
}

export interface VisualIssue {
  id: string;
  category: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  description: string;
  evidence?: {
    viewport?: string;
    selector?: string;
    boundingBox?: { x: number; y: number; width: number; height: number };
  };
  recommendation?: string;
}

export interface VisualAuditReport {
  overallScore: number;
  status: 'PASSED' | 'WARNING' | 'REPAIR_REQUIRED' | 'FAILED';
  desktop: {
    score: number;
    issues: VisualIssue[];
    width: number;
    height: number;
  };
  mobile: {
    score: number;
    issues: VisualIssue[];
    width: number;
    height: number;
  };
  issues: VisualIssue[];
  blockingIssues: VisualIssue[];
  metadata: {
    projectId: string;
    versionId?: string;
    changesetId?: string;
    timestamp: string;
  };
}

export interface AppIteration {
  id: string;
  timestamp: number;
  prompt: string;
  summary: string;
  html: string;
  files: CodeFile[];
  versionNumber?: number;
  elementTarget?: AppElementTarget;
  riskLevel?: RiskLevel;
  qualityScore?: number;
}

export interface VibeProject {
  id: string;
  title: string;
  description: string;
  vibe: VibeStyle;
  html: string;
  files: CodeFile[];
  components: { name: string; description: string; selector?: string }[];
  suggestedPrompts: string[];
  iterations: AppIteration[];
  currentVersionId?: string;
  createdAt: number;
  updatedAt: number;
  isFavorite?: boolean;
}

export interface GenerationStep {
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  timestamp: number;
  compassState?: ConversationCompassState;
  plan?: ExecutionPlan;
  impact?: ImpactDetails;
  quality?: QualityReport;
  visualAudit?: VisualAuditReport;
  requiresConfirmation?: boolean;
  confirmationQuestion?: string;
  clarificationQuestion?: string;
  steps?: GenerationStep[];
  suggestedPrompts?: string[];
  elementTarget?: AppElementTarget;
  versionId?: string;
  previewId?: string;
  rawChanges?: {
    filesModified: number;
    componentsAdded: number;
    summary: string;
  };
  error?: string;
}

export interface TemplateProject {
  id: string;
  title: string;
  category: 'SaaS' | 'Productivité' | 'E-commerce' | 'Fun & Jeux' | 'Finance' | 'Créatif';
  description: string;
  iconName: string;
  vibe: VibeStyle;
  colorGradient: string;
  badge: string;
  prompt: string;
  html: string;
  files: CodeFile[];
  components: { name: string; description: string }[];
  suggestedPrompts: string[];
}

export interface PreviewSession {
  previewId: string;
  projectId: string;
  versionId?: string;
  state: 'INITIALIZING' | 'READY' | 'UPDATING' | 'ERROR' | 'TERMINATED';
  safeHtml: string;
  createdAt: number;
  lastError?: {
    category: string;
    errorMessage: string;
    suggestedFix?: string;
  };
}
