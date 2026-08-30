import {
  CodeFile,
  VisualAuditReport,
  QualityReport,
  ExecutionPlan,
  ConversationCompassState
} from '../types';

export interface SendConversationMessageParams {
  projectId: string;
  prompt: string;
  vibe?: string;
  currentHtml?: string;
  files?: Array<{ name: string; type?: string; content?: string }>;
  targetFile?: string;
  confirmedByUser?: boolean;
  rejectPlan?: boolean;
  rollbackVersionId?: string;
  elementTarget?: any;
  preferredProvider?: string;
}

export interface ConversationApiResponse {
  success: boolean;
  plan?: ExecutionPlan;
  understanding?: any;
  quality?: QualityReport;
  visualAudit?: VisualAuditReport;
  previewId?: string;
  previewHtml?: string;
  files?: CodeFile[];
  entryPoint?: string;
  versionId?: string;
  aiResponseText: string;
  requiresUserConfirmation: boolean;
  confirmationQuestion?: string;
  compassState?: ConversationCompassState;
  impact?: any;
  technicalPlan?: any;
  orchestrationMetrics?: any;
  error?: string;
  retryAfterSeconds?: number;
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

// Global Auth Token Provider for API requests
let tokenGetter: (() => Promise<string | null> | string | null) | null = null;

export function setAuthTokenGetter(getter: () => Promise<string | null> | string | null) {
  tokenGetter = getter;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (tokenGetter) {
    try {
      const token = await tokenGetter();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch {}
  } else {
    // Fallback: check localStorage for saved Clerk / auth token
    const localToken = localStorage.getItem('clerk_user_token') || localStorage.getItem('vibe_auth_token');
    if (localToken) {
      headers['Authorization'] = `Bearer ${localToken}`;
    }
  }

  return headers;
}

/**
 * Handle API responses and format clear errors for 400 (Validation), 401 (Auth), 429 (Rate limit)
 */
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errData: any = {};
    try {
      errData = await res.json();
    } catch {
      errData = { error: `Erreur serveur (${res.status})` };
    }

    if (res.status === 401) {
      throw new Error(errData.error || 'Authentification requise. Veuillez vous connecter avec Clerk pour continuer.');
    }

    if (res.status === 429) {
      const retrySec = errData.retryAfterSeconds || 60;
      throw new Error(errData.error || `Trop de requêtes. Attendez ${retrySec} secondes avant de réessayer.`);
    }

    if (res.status === 400) {
      const detailsMsg = Array.isArray(errData.details)
        ? errData.details.map((d: any) => `${d.field ? d.field + ': ' : ''}${d.message}`).join(', ')
        : '';
      throw new Error(detailsMsg ? `Erreur de validation : ${detailsMsg}` : (errData.error || errData.message || 'Données invalides'));
    }

    throw new Error(errData.error || errData.message || `Erreur requête (${res.status})`);
  }

  return await res.json();
}

/**
 * Product API Client - Connects the frontend directly to the unified backend engines
 */
export const productApi = {
  /**
   * Main Conversational Engine Gateway
   */
  async sendMessage(params: SendConversationMessageParams): Promise<ConversationApiResponse> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/conversation/message', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    return await handleResponse<ConversationApiResponse>(res);
  },

  /**
   * Generation Endpoint (Token intensive)
   */
  async generateApp(params: { prompt: string; vibe?: string }) {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/generate-app', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    return await handleResponse<any>(res);
  },

  /**
   * Preview Session Engine
   */
  async createPreview(projectId: string, htmlContent: string, versionId?: string) {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/preview/create', {
      method: 'POST',
      headers,
      body: JSON.stringify({ projectId, htmlContent, versionId }),
    });
    return await handleResponse<any>(res);
  },

  /**
   * Report Runtime Error from Preview
   */
  async reportPreviewError(previewId: string, error: string) {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/preview/error', {
      method: 'POST',
      headers,
      body: JSON.stringify({ previewId, error }),
    });
    return await handleResponse<any>(res);
  },

  /**
   * Versioning & Rollback
   */
  async getVersions(projectId: string): Promise<VersionsApiResponse> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/projects/${projectId}/versions`, { headers });
    return await handleResponse<VersionsApiResponse>(res);
  },

  async rollback(projectId: string, versionId: string): Promise<RollbackApiResponse> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/projects/${projectId}/rollback`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ versionId }),
    });
    return await handleResponse<RollbackApiResponse>(res);
  },

  /**
   * Prompt Enhancement
   */
  async enhancePrompt(prompt: string, vibe?: string): Promise<string> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/enhance-prompt', {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt, vibe }),
    });
    const data = await handleResponse<any>(res);
    return data.enhancedPrompt || prompt;
  },

  /**
   * Visual Intelligence Audit
   */
  async auditVisual(projectId: string, html: string, versionId?: string, changesetId?: string): Promise<{ success: boolean; report: VisualAuditReport }> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/visual/audit', {
      method: 'POST',
      headers,
      body: JSON.stringify({ projectId, html, versionId, changesetId }),
    });
    return await handleResponse<{ success: boolean; report: VisualAuditReport }>(res);
  },

  /**
   * Visual Real Capture (Desktop / Mobile)
   */
  async captureRender(html: string, viewport: 'desktop' | 'mobile' = 'desktop', projectId?: string) {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/visual/capture', {
      method: 'POST',
      headers,
      body: JSON.stringify({ html, viewport, projectId }),
    });
    return await handleResponse<any>(res);
  },

  /**
   * AI Providers Management & Health
   */
  async getAIProviders() {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/ai/providers', { headers });
    return await handleResponse<any>(res);
  },

  async updateAIProviderConfig(providerId: string, updates: Record<string, any>) {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/ai/providers/${providerId}/config`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    return await handleResponse<any>(res);
  },

  async testAIProviderConnection(providerId: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/ai/providers/${providerId}/test`, {
      method: 'POST',
      headers,
    });
    return await handleResponse<any>(res);
  },

  async getAIProviderObservability() {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/ai/observability/providers', { headers });
    return await handleResponse<any>(res);
  }
};
