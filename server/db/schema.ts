export interface DbUser {
  id: string;
  uid: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'creator' | 'pro';
  plan: 'free' | 'pro' | 'enterprise';
  tokenBalance: number;
  createdAt: number;
  updatedAt: number;
}

export interface DbProject {
  id: string;
  userId: string;
  title: string;
  description: string;
  vibe: string;
  currentVersionId?: string;
  isDeleted: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DbProjectFile {
  id: string;
  projectId: string;
  versionId: string;
  path: string;
  content: string;
  language: string;
  hash: string;
  createdAt: number;
  updatedAt: number;
}

export interface DbProjectVersion {
  id: string;
  projectId: string;
  branch: string;
  versionNumber: number;
  summary: string;
  authorId: string;
  source: 'user' | 'ai' | 'system';
  userIntent?: string;
  aiPrompt?: string;
  htmlSnapshot: string;
  filesSnapshot: any[];
  componentsSnapshot: any[];
  suggestedPrompts: string[];
  createdAt: number;
}

export interface DbJobRecord {
  id: string;
  type: string;
  userId?: string;
  projectId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';
  priority: number;
  progress: number;
  payload: any;
  result?: any;
  error?: string;
  retryCount: number;
  maxRetries: number;
  startedAt?: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface DbInvoice {
  id: string;
  userId: string;
  stripeInvoiceId?: string;
  amountEur: number;
  status: 'paid' | 'pending' | 'failed';
  planName: string;
  date: number;
  createdAt: number;
}

export interface DbIdempotencyRecord {
  key: string;
  userId?: string;
  requestPath: string;
  requestHash: string;
  responseStatus: number;
  responseBody: string;
  createdAt: number;
  expiresAt: number;
}

export interface DbSecurityLog {
  id: string;
  incidentType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  ip: string;
  userId?: string;
  createdAt: number;
}

export type PreviewLifecycleStatus =
  | 'CREATED'
  | 'BUILDING'
  | 'READY'
  | 'RUNNING'
  | 'ERROR'
  | 'CRASHED'
  | 'STOPPED'
  | 'EXPIRED';

export interface DbPreviewError {
  type: 'build' | 'runtime' | 'network' | 'dependency' | 'console';
  message: string;
  stack?: string;
  file?: string;
  line?: number;
  column?: number;
  timestamp: number;
}

export interface DbPreviewSession {
  id: string;
  projectId: string;
  versionId?: string;
  userId: string;
  status: PreviewLifecycleStatus;
  createdAt: number;
  updatedAt: number;
  durationMs: number;
  errors: DbPreviewError[];
  logs: Array<{ level: 'info' | 'warn' | 'error'; message: string; timestamp: number }>;
  metrics: {
    loadTimeMs: number;
    memoryMb: number;
    domNodes: number;
    fps?: number;
  };
}

export type ConversationCompassState =
  | 'EXPLORING'
  | 'UNDERSTANDING'
  | 'CLARIFYING'
  | 'PLANNING'
  | 'WAITING_CONFIRMATION'
  | 'EXECUTING'
  | 'VALIDATING'
  | 'REPAIRING'
  | 'COMPLETED'
  | 'FAILED'
  | 'ERROR'
  | 'ROLLED_BACK';

export interface DbConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    intent?: string;
    compassState?: ConversationCompassState;
    tokens?: number;
    planId?: string;
    decisionId?: string;
  };
}

export interface DbConversation {
  id: string;
  projectId: string;
  userId: string;
  compassState: ConversationCompassState;
  messages: DbConversationMessage[];
  currentIntent?: any;
  currentPlan?: any;
  createdAt: number;
  updatedAt: number;
}

export interface DbProjectDna {
  projectId: string;
  techStack: {
    framework: string;
    styling: string;
    iconLibrary: string;
    stateManager: string;
    apiConventions: string;
  };
  architecture: string;
  namingConventions: string[];
  patterns: string[];
  rules: string[];
  decisions: Array<{
    id: string;
    decision: string;
    rationale: string;
    category: string;
    timestamp: number;
  }>;
  updatedAt: number;
}

export interface DbProjectLearningMetrics {
  projectId: string;
  intentAccuracy: number;
  clarificationRate: number;
  planSuccessRate: number;
  modificationSuccessRate: number;
  buildSuccessRate: number;
  previewSuccessRate: number;
  autoRepairSuccessRate: number;
  userRejectionRate: number;
  rollbackRate: number;
  totalInteractions: number;
  successfulGenerations: number;
  updatedAt: number;
}

