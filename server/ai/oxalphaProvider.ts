import { AIProvider, AIProviderRequest, AIProviderResponse, AIStructuredRequest, AIStructuredResponse, ProviderMetadata, ProviderConnectionTestResult, TokenUsage } from './aiProvider';
import { logger } from '../logger';

export interface OxAlphaConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  timeoutMs?: number;
  costPer1kInputTokens?: number;
  costPer1kOutputTokens?: number;
}

export class OxAlphaProvider implements AIProvider {
  public readonly id = 'oxalpha';
  public readonly name = 'OxAlpha AI';
  private defaultModel: string;
  private baseUrl: string;
  private timeoutMs: number;
  private costPer1kInputTokens: number;
  private costPer1kOutputTokens: number;

  constructor(config?: OxAlphaConfig) {
    this.defaultModel = config?.defaultModel || process.env.OXALPHA_MODEL || 'oxalpha-coder-v1';
    this.baseUrl = (config?.baseUrl || process.env.OXALPHA_BASE_URL || 'https://api.oxalpha.ai/v1').replace(/\/+$/, '');
    this.timeoutMs = config?.timeoutMs || 15000;
    this.costPer1kInputTokens = config?.costPer1kInputTokens ?? 0.00012; // ~ €0.12 / 1M tokens
    this.costPer1kOutputTokens = config?.costPer1kOutputTokens ?? 0.00045; // ~ €0.45 / 1M tokens
  }

  private getApiKey(): string | null {
    const key = process.env.OXALPHA_API_KEY;
    if (!key || key === 'MY_OXALPHA_API_KEY' || key.trim() === '') {
      return null;
    }
    return key.trim();
  }

  public isAvailable(): boolean {
    const key = this.getApiKey();
    return !!key && key.length > 0;
  }

  public getMetadata(): ProviderMetadata {
    return {
      id: this.id,
      name: this.name,
      type: 'cloud',
      models: ['oxalpha-coder-v1', 'oxalpha-pro-1', 'oxalpha-fast-1'],
      defaultModel: this.defaultModel,
      isAvailable: this.isAvailable(),
      costPer1kInputTokens: this.costPer1kInputTokens,
      costPer1kOutputTokens: this.costPer1kOutputTokens,
      supportsStreaming: true,
      supportsStructuredOutput: true,
    };
  }

  public estimateCost(usage: TokenUsage): number {
    const cost = (usage.promptTokens / 1000) * this.costPer1kInputTokens + (usage.completionTokens / 1000) * this.costPer1kOutputTokens;
    return Number(cost.toFixed(6));
  }

  /**
   * Generates text via OxAlpha OpenAI-compatible API
   */
  public async generateText(request: AIProviderRequest): Promise<AIProviderResponse> {
    const startTime = Date.now();
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('OXALPHA_API_KEY is not configured or unavailable in server environment.');
    }

    const model = request.metadata?.model || this.defaultModel;
    const messages: Array<{ role: string; content: string }> = [];

    if (request.systemInstruction) {
      messages.push({ role: 'system', content: request.systemInstruction });
    }
    messages.push({ role: 'user', content: request.prompt });

    const payload = {
      model,
      messages,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens,
      stop: request.stopSequences,
    };

    const timeout = request.timeoutMs || this.timeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'X-Client-Agent': 'VibeCode-OxAlphaProvider/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`OxAlpha API returned HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      }

      const json: any = await response.json();
      const choice = json.choices?.[0];
      const text = choice?.message?.content?.trim() || '';

      const usage: TokenUsage = {
        promptTokens: json.usage?.prompt_tokens ?? Math.round(request.prompt.length / 4),
        completionTokens: json.usage?.completion_tokens ?? Math.round(text.length / 4),
        totalTokens: json.usage?.total_tokens ?? (Math.round(request.prompt.length / 4) + Math.round(text.length / 4)),
      };

      return {
        text,
        rawResponse: json,
        usage,
        durationMs: Date.now() - startTime,
        model,
        provider: this.id,
        finishReason: choice?.finish_reason || 'stop',
        estimatedCostEur: this.estimateCost(usage),
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      logger.error('OxAlphaProvider', `OxAlpha generation failed: ${this.sanitizeMessage(err.message)}`);
      throw this.sanitizeError(err);
    }
  }

  /**
   * Generates structured output via OxAlpha
   */
  public async generateStructured<T>(request: AIStructuredRequest<T>): Promise<AIStructuredResponse<T>> {
    const startTime = Date.now();
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('OXALPHA_API_KEY is not configured or unavailable in server environment.');
    }

    const model = request.metadata?.model || this.defaultModel;
    const messages: Array<{ role: string; content: string }> = [];

    const systemPrompt = (request.systemInstruction ? request.systemInstruction + '\n\n' : '') +
      'IMPORTANT: You MUST respond ONLY with a strictly valid JSON object matching the requested schema. Do NOT include markdown code blocks, backticks, or any conversational preamble.';

    messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: request.prompt });

    const payload: Record<string, any> = {
      model,
      messages,
      temperature: request.temperature ?? 0.1,
      max_tokens: request.maxTokens,
      response_format: { type: 'json_object' },
    };

    const timeout = request.timeoutMs || this.timeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'X-Client-Agent': 'VibeCode-OxAlphaProvider/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`OxAlpha API returned HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      }

      const json: any = await response.json();
      const choice = json.choices?.[0];
      const text = choice?.message?.content?.trim() || '';

      let parsedData: any;
      try {
        parsedData = JSON.parse(text);
      } catch {
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedData = JSON.parse(cleaned);
      }

      if (request.validator && !request.validator(parsedData)) {
        throw new Error('OxAlpha response failed schema validation.');
      }

      const usage: TokenUsage = {
        promptTokens: json.usage?.prompt_tokens ?? Math.round(request.prompt.length / 4),
        completionTokens: json.usage?.completion_tokens ?? Math.round(text.length / 4),
        totalTokens: json.usage?.total_tokens ?? (Math.round(request.prompt.length / 4) + Math.round(text.length / 4)),
      };

      return {
        data: parsedData as T,
        rawText: text,
        usage,
        durationMs: Date.now() - startTime,
        model,
        provider: this.id,
        estimatedCostEur: this.estimateCost(usage),
        validated: true,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      logger.error('OxAlphaProvider', `Structured generation error: ${this.sanitizeMessage(err.message)}`);
      throw this.sanitizeError(err);
    }
  }

  /**
   * Generates stream response via SSE
   */
  public async streamGenerate(
    request: AIProviderRequest,
    onChunk: (chunk: string) => void
  ): Promise<AIProviderResponse> {
    const startTime = Date.now();
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('OXALPHA_API_KEY is not configured or unavailable.');
    }

    const model = request.metadata?.model || this.defaultModel;
    const messages: Array<{ role: string; content: string }> = [];

    if (request.systemInstruction) {
      messages.push({ role: 'system', content: request.systemInstruction });
    }
    messages.push({ role: 'user', content: request.prompt });

    const payload = {
      model,
      messages,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens,
      stream: true,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), request.timeoutMs || this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'X-Client-Agent': 'VibeCode-OxAlphaProvider/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok || !response.body) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`OxAlpha Stream returned HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const delta = data.choices?.[0]?.delta?.content || '';
              if (delta) {
                fullText += delta;
                onChunk(delta);
              }
            } catch {
              // Ignore partial chunk parse error
            }
          }
        }
      }

      const promptTokens = Math.round(request.prompt.length / 4);
      const completionTokens = Math.round(fullText.length / 4);
      const usage: TokenUsage = {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      };

      return {
        text: fullText,
        usage,
        durationMs: Date.now() - startTime,
        model,
        provider: this.id,
        estimatedCostEur: this.estimateCost(usage),
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      logger.error('OxAlphaProvider', `OxAlpha stream failed: ${this.sanitizeMessage(err.message)}`);
      throw this.sanitizeError(err);
    }
  }

  /**
   * Performs server-side connectivity test without exposing secrets
   */
  public async testConnection(): Promise<ProviderConnectionTestResult> {
    const startTime = Date.now();
    const apiKey = this.getApiKey();

    if (!apiKey) {
      return {
        success: false,
        status: 'UNAVAILABLE',
        statusLabel: 'Fournisseur indisponible',
        message: 'Clé API OXALPHA_API_KEY non configurée dans l\'environnement serveur.',
        latencyMs: 0,
        provider: this.id,
        model: this.defaultModel,
        timestamp: Date.now(),
      };
    }

    const controller = new AbortController();
    const timeoutMs = 6000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'X-Client-Agent': 'VibeCode-OxAlphaProvider/1.0',
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5,
          temperature: 0.0,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          status: 'INVALID_AUTH',
          statusLabel: 'Authentification invalide',
          message: 'La clé API a été rejetée par le service OxAlpha (code HTTP 401/403).',
          latencyMs,
          provider: this.id,
          model: this.defaultModel,
          timestamp: Date.now(),
        };
      }

      if (response.status === 429) {
        return {
          success: false,
          status: 'QUOTA_EXCEEDED',
          statusLabel: 'Quota dépassé',
          message: 'Limite de débit ou quota dépassé auprès de l\'API OxAlpha (code HTTP 429).',
          latencyMs,
          provider: this.id,
          model: this.defaultModel,
          timestamp: Date.now(),
        };
      }

      if (!response.ok) {
        return {
          success: false,
          status: 'PROVIDER_ERROR',
          statusLabel: 'Erreur fournisseur',
          message: `Le service OxAlpha a retourné une erreur HTTP ${response.status}.`,
          latencyMs,
          provider: this.id,
          model: this.defaultModel,
          timestamp: Date.now(),
        };
      }

      return {
        success: true,
        status: 'SUCCESS',
        statusLabel: 'Connexion réussie',
        message: `Connexion établie avec succès avec OxAlpha (${this.defaultModel}) en ${latencyMs}ms.`,
        latencyMs,
        provider: this.id,
        model: this.defaultModel,
        timestamp: Date.now(),
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;
      if (err.name === 'AbortError' || err.message?.includes('aborted') || err.message?.includes('timeout')) {
        return {
          success: false,
          status: 'TIMEOUT',
          statusLabel: 'Timeout',
          message: `Délai d'attente dépassé lors du test de connexion OxAlpha (${timeoutMs}ms).`,
          latencyMs,
          provider: this.id,
          model: this.defaultModel,
          timestamp: Date.now(),
        };
      }

      return {
        success: false,
        status: 'PROVIDER_ERROR',
        statusLabel: 'Erreur fournisseur',
        message: `Erreur réseau lors de la tentative de connexion : ${this.sanitizeMessage(err.message || 'Hôte injoignable')}`,
        latencyMs,
        provider: this.id,
        model: this.defaultModel,
        timestamp: Date.now(),
      };
    }
  }

  public sanitizeMessage(msg: string): string {
    let cleaned = msg;
    const key = process.env.OXALPHA_API_KEY;
    if (key && key.length > 3) {
      cleaned = cleaned.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[REDACTED_API_KEY]');
    }
    // Mask any generic sk-ox- pattern or authorization tokens
    cleaned = cleaned.replace(/sk-ox-[a-zA-Z0-9_-]{6,}/g, '[REDACTED_API_KEY]');
    cleaned = cleaned.replace(/(Bearer\s+)[a-zA-Z0-9_\-\.]{8,}/gi, '$1[REDACTED_API_KEY]');
    return cleaned;
  }

  public sanitizeError(err: any): Error {
    return new Error(this.sanitizeMessage(err?.message || 'OxAlpha execution error'));
  }
}

export const oxalphaProvider = new OxAlphaProvider();
export const oxAlphaProvider = oxalphaProvider;
