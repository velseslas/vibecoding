import { 
  ConversationCompassState, 
  ExecutionPlan, 
  ImpactDetails, 
  QualityReport, 
  VisualAuditReport,
  VibeProject, 
  CodeFile,
  AppIteration
} from '../types';

export interface SendConversationMessageParams {
  projectId: string;
  prompt: string;
  vibe?: string;
  currentHtml?: string;
  files?: Array<{ name: string; content?: string }>;
  confirmedByUser?: boolean;
  rejectPlan?: boolean;
  rollbackVersionId?: string;
  changesetId?: string;
  rejectChangesetId?: string;
  elementTarget?: {
    selector?: string;
    tagName?: string;
    id?: string;
    className?: string;
    innerText?: string;
  };
}

export interface ConversationApiResponse {
  success: boolean;
  conversationId?: string;
  compassState: ConversationCompassState;
  intent?: any;
  impact?: ImpactDetails;
  assumptions?: any;
  plan?: ExecutionPlan;
  understanding?: any;
  quality?: QualityReport;
  visualAudit?: VisualAuditReport;
  previewId?: string;
  previewHtml?: string;
  versionId?: string;
  aiResponseText: string;
  requiresUserConfirmation: boolean;
  confirmationQuestion?: string;
  orchestrationMetrics?: any;
  error?: string;
}

export interface RollbackApiResponse {
  success: boolean;
  version?: {
    id: string;
    versionNumber: number;
    htmlSnapshot: string;
    summary: string;
    createdAt: number;
  };
  error?: string;
}

export interface VersionsApiResponse {
  success: boolean;
  versions: Array<{
    id: string;
    versionNumber: number;
    summary: string;
    source: string;
    userIntent?: string;
    htmlSnapshot: string;
    createdAt: number;
  }>;
}

/**
 * Product API Client - Connects the frontend directly to the unified backend engines
 */
export const productApi = {
  /**
   * Main Conversational Engine Gateway
   */
  async sendMessage(params: SendConversationMessageParams): Promise<ConversationApiResponse> {
    const res = await fetch('/api/conversation/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Erreur serveur (${res.status})`);
    }

    return await res.json();
  },

  /**
   * Preview Session Engine
   */
  async createPreview(projectId: string, htmlContent: string, versionId?: string) {
    const res = await fetch('/api/preview/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, htmlContent, versionId }),
    });
    return await res.json();
  },

  /**
   * Report Runtime Error from Preview
   */
  async reportPreviewError(previewId: string, error: string) {
    const res = await fetch('/api/preview/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ previewId, error }),
    });
    return await res.json();
  },

  /**
   * Versioning & Rollback
   */
  async getVersions(projectId: string): Promise<VersionsApiResponse> {
    const res = await fetch(`/api/projects/${projectId}/versions`);
    return await res.json();
  },

  async rollback(projectId: string, versionId: string): Promise<RollbackApiResponse> {
    const res = await fetch(`/api/projects/${projectId}/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionId }),
    });
    return await res.json();
  },

  /**
   * Prompt Enhancement
   */
  async enhancePrompt(prompt: string, vibe?: string): Promise<string> {
    const res = await fetch('/api/enhance-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, vibe }),
    });
    const data = await res.json();
    return data.enhancedPrompt || prompt;
  },

  /**
   * Visual Intelligence Audit
   */
  async auditVisual(projectId: string, html: string, versionId?: string, changesetId?: string): Promise<{ success: boolean; report: VisualAuditReport }> {
    const res = await fetch('/api/visual/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, html, versionId, changesetId }),
    });
    return await res.json();
  },

  /**
   * Visual Real Capture (Desktop / Mobile)
   */
  async captureRender(html: string, viewport: 'desktop' | 'mobile' = 'desktop', projectId?: string) {
    const res = await fetch('/api/visual/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, viewport, projectId }),
    });
    return await res.json();
  },

  /**
   * AI Providers Management & Health
   */
  async getAIProviders() {
    const res = await fetch('/api/ai/providers');
    return await res.json();
  },

  async updateAIProviderConfig(providerId: string, updates: Record<string, any>) {
    const res = await fetch(`/api/ai/providers/${providerId}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return await res.json();
  },

  async testAIProviderConnection(providerId: string) {
    const res = await fetch(`/api/ai/providers/${providerId}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  },

  async getAIProviderObservability() {
    const res = await fetch('/api/ai/observability/providers');
    return await res.json();
  }
};
