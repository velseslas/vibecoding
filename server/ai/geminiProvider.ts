import { GoogleGenAI } from '@google/genai';
import { AIProvider, AIProviderRequest, AIProviderResponse, AIStructuredRequest, AIStructuredResponse, ProviderMetadata, ProviderConnectionTestResult, TokenUsage } from './aiProvider';
import { logger } from '../logger';

export class GeminiProvider implements AIProvider {
  public readonly id = 'gemini';
  public readonly name = 'Google Gemini';
  private aiClient: GoogleGenAI | null = null;
  private defaultModel = 'gemini-3.7-flash';

  private getClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
      return null;
    }
    if (!this.aiClient) {
      this.aiClient = new GoogleGenAI({ apiKey });
    }
    return this.aiClient;
  }

  public isAvailable(): boolean {
    const apiKey = process.env.GEMINI_API_KEY;
    return !!apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 0;
  }

  public getMetadata(): ProviderMetadata {
    return {
      id: this.id,
      name: this.name,
      type: 'cloud',
      models: ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'],
      defaultModel: this.defaultModel,
      isAvailable: this.isAvailable(),
      costPer1kInputTokens: 0.00015,
      costPer1kOutputTokens: 0.0006,
      supportsStreaming: true,
      supportsStructuredOutput: true,
    };
  }

  public estimateCost(usage: TokenUsage): number {
    const costEur = (usage.promptTokens / 1000) * 0.00015 + (usage.completionTokens / 1000) * 0.0006;
    return Number(costEur.toFixed(6));
  }

  private async executeWithModelFallback<T>(
    requestedModel: string | undefined,
    action: (modelName: string) => Promise<T>
  ): Promise<{ result: T; usedModel: string }> {
    const primaryModel = requestedModel || this.defaultModel;
    const fallbackModels = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'].filter((m) => m !== primaryModel);
    const candidateModels = [primaryModel, ...fallbackModels];

    let lastError: any = null;

    for (const model of candidateModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const result = await action(model);
          return { result, usedModel: model };
        } catch (err: any) {
          lastError = err;
          const msg = err?.message || String(err);
          const isQuotaError =
            msg.includes('429') ||
            msg.includes('RESOURCE_EXHAUSTED') ||
            msg.includes('Quota exceeded') ||
            msg.includes('rate-limits');

          const isNotFound =
            msg.includes('404') ||
            msg.includes('NOT_FOUND') ||
            msg.includes('no longer available') ||
            msg.includes('is no longer available') ||
            msg.includes('is not found');

          const isTransient =
            isQuotaError ||
            isNotFound ||
            msg.includes('503') ||
            msg.includes('UNAVAILABLE') ||
            msg.includes('high demand') ||
            msg.includes('500') ||
            msg.includes('overloaded') ||
            msg.includes('fetch failed') ||
            msg.includes('ETIMEDOUT');

          if ((isQuotaError || isNotFound) && model !== candidateModels[candidateModels.length - 1]) {
            logger.warn('GeminiProvider', `Model [${model}] ${isNotFound ? 'no longer available (404)' : 'quota/rate-limit reached'}. Switching immediately to fallback model...`);
            break; // Skip attempt 2 for this model, move to next candidate model immediately
          }

          if (isTransient && attempt < 2) {
            logger.warn('GeminiProvider', `Transient error on model [${model}] (attempt ${attempt}/2): ${msg}. Retrying in ${attempt * 600}ms...`);
            await new Promise((res) => setTimeout(res, attempt * 600));
            continue;
          }

          if (isTransient && model !== candidateModels[candidateModels.length - 1]) {
            logger.warn('GeminiProvider', `Model [${model}] failed with transient error (${msg}). Falling back to next candidate model...`);
            break;
          }

          throw err;
        }
      }
    }

    throw lastError;
  }

  public async generateText(request: AIProviderRequest): Promise<AIProviderResponse> {
    const startTime = Date.now();
    const client = this.getClient();
    if (!client) {
      throw new Error('GEMINI_API_KEY is not configured or unavailable.');
    }

    try {
      const { result: response, usedModel } = await this.executeWithModelFallback(
        request.metadata?.model,
        (modelName) =>
          client.models.generateContent({
            model: modelName,
            contents: request.prompt,
            config: {
              systemInstruction: request.systemInstruction,
              temperature: request.temperature,
              maxOutputTokens: request.maxTokens,
              stopSequences: request.stopSequences,
            },
          })
      );

      const text = response.text?.trim() || '';
      const promptTokens = Math.round((request.prompt.length + (request.systemInstruction?.length || 0)) / 4);
      const completionTokens = Math.round(text.length / 4);
      const usage: TokenUsage = {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      };

      return {
        text,
        rawResponse: response,
        usage,
        durationMs: Date.now() - startTime,
        model: usedModel,
        provider: this.id,
        estimatedCostEur: this.estimateCost(usage),
      };
    } catch (err: any) {
      logger.error('GeminiProvider', `Text generation error: ${err.message}`);
      throw this.sanitizeError(err);
    }
  }

  public async generateStructured<T>(request: AIStructuredRequest<T>): Promise<AIStructuredResponse<T>> {
    const startTime = Date.now();
    const client = this.getClient();
    if (!client) {
      throw new Error('GEMINI_API_KEY is not configured or unavailable.');
    }

    try {
      const { result: response, usedModel } = await this.executeWithModelFallback(
        request.metadata?.model,
        (modelName) =>
          client.models.generateContent({
            model: modelName,
            contents: request.prompt,
            config: {
              systemInstruction: request.systemInstruction,
              temperature: request.temperature ?? 0.2,
              maxOutputTokens: request.maxTokens,
              responseMimeType: 'application/json',
            },
          })
      );

      const text = response.text?.trim() || '';
      let parsedData: any;
      try {
        parsedData = JSON.parse(text);
      } catch {
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedData = JSON.parse(cleaned);
      }

      if (request.validator && !request.validator(parsedData)) {
        throw new Error('Gemini response failed structural schema validation.');
      }

      const promptTokens = Math.round((request.prompt.length + (request.systemInstruction?.length || 0)) / 4);
      const completionTokens = Math.round(text.length / 4);
      const usage: TokenUsage = {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      };

      return {
        data: parsedData as T,
        rawText: text,
        usage,
        durationMs: Date.now() - startTime,
        model: usedModel,
        provider: this.id,
        estimatedCostEur: this.estimateCost(usage),
        validated: true,
      };
    } catch (err: any) {
      logger.error('GeminiProvider', `Structured generation error: ${err.message}`);
      throw this.sanitizeError(err);
    }
  }

  public async streamGenerate(
    request: AIProviderRequest,
    onChunk: (chunk: string) => void
  ): Promise<AIProviderResponse> {
    const startTime = Date.now();
    const client = this.getClient();
    if (!client) {
      throw new Error('GEMINI_API_KEY is not configured or unavailable.');
    }

    const model = request.metadata?.model || this.defaultModel;
    try {
      const stream = await client.models.generateContentStream({
        model,
        contents: request.prompt,
        config: {
          systemInstruction: request.systemInstruction,
          temperature: request.temperature,
          maxOutputTokens: request.maxTokens,
        },
      });

      let fullText = '';
      for await (const chunk of stream) {
        const chunkText = chunk.text || '';
        if (chunkText) {
          fullText += chunkText;
          onChunk(chunkText);
        }
      }

      const promptTokens = Math.round((request.prompt.length + (request.systemInstruction?.length || 0)) / 4);
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
      logger.error('GeminiProvider', `Stream error: ${err.message}`);
      throw this.sanitizeError(err);
    }
  }

  /**
   * Performs server-side connectivity test for Google Gemini
   */
  public async testConnection(): Promise<ProviderConnectionTestResult> {
    const startTime = Date.now();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!this.isAvailable()) {
      return {
        success: false,
        status: 'UNAVAILABLE',
        statusLabel: 'Fournisseur indisponible',
        message: 'Clé API GEMINI_API_KEY non configurée dans l\'environnement serveur.',
        latencyMs: 0,
        provider: this.id,
        model: this.defaultModel,
        timestamp: Date.now(),
      };
    }

    try {
      const client = this.getClient();
      if (!client) {
        throw new Error('Impossible d\'instancier le client Google Gemini.');
      }

      const response = await client.models.generateContent({
        model: this.defaultModel,
        contents: 'ping',
        config: {
          maxOutputTokens: 5,
          temperature: 0.0,
        },
      });

      const latencyMs = Date.now() - startTime;
      return {
        success: true,
        status: 'SUCCESS',
        statusLabel: 'Connexion réussie',
        message: `Connexion établie avec succès avec Google Gemini (${this.defaultModel}) en ${latencyMs}ms.`,
        latencyMs,
        provider: this.id,
        model: this.defaultModel,
        timestamp: Date.now(),
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const msg = err?.message || '';

      if (msg.includes('API_KEY_INVALID') || msg.includes('403') || msg.includes('401')) {
        return {
          success: false,
          status: 'INVALID_AUTH',
          statusLabel: 'Authentification invalide',
          message: 'Clé API Google Gemini non valide ou révoquée.',
          latencyMs,
          provider: this.id,
          model: this.defaultModel,
          timestamp: Date.now(),
        };
      }

      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        return {
          success: false,
          status: 'QUOTA_EXCEEDED',
          statusLabel: 'Quota dépassé',
          message: 'Quota Google Gemini dépassé ou limitation de débit active.',
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
        message: 'Erreur lors de la communication avec Google Gemini API.',
        latencyMs,
        provider: this.id,
        model: this.defaultModel,
        timestamp: Date.now(),
      };
    }
  }

  private sanitizeError(err: any): Error {
    const key = process.env.GEMINI_API_KEY;
    let msg = err?.message || 'Gemini Provider execution failed';
    if (key && key.length > 5) {
      msg = msg.replace(new RegExp(key, 'g'), '[REDACTED_API_KEY]');
    }
    return new Error(msg);
  }
}

export const geminiProvider = new GeminiProvider();
