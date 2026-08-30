import { AIProvider, ProviderTaskType, ProviderConnectionTestResult } from './aiProvider';
import { oxalphaProvider } from './oxalphaProvider';
import { aiCircuitRegistry } from './circuitBreaker';
import { logger } from '../logger';

export interface ProviderConfig {
  provider: string;
  model: string;
  enabled: boolean;
  priority: number;
  timeout: number;
  maxTokens: number;
  temperature: number;
}

export interface TaskStrategy {
  taskType: ProviderTaskType;
  maxTokens: number;
  timeout: number;
  priority: number;
  provider: string;
}

export class ProviderRegistry {
  private providers: Map<string, AIProvider> = new Map();
  private configs: Map<string, ProviderConfig> = new Map();
  private taskStrategies: Map<ProviderTaskType, TaskStrategy> = new Map([
    [
      'CODE_PLANNING',
      {
        taskType: 'CODE_PLANNING',
        maxTokens: 8192,
        timeout: 30000,
        priority: 1,
        provider: 'oxalpha',
      },
    ],
    [
      'CODE_GENERATION',
      {
        taskType: 'CODE_GENERATION',
        maxTokens: 32768,
        timeout: 90000,
        priority: 1,
        provider: 'oxalpha',
      },
    ],
  ]);

  constructor() {
    // 1. Register OxAlpha exclusively (Priority 1)
    this.registerProvider(oxalphaProvider, {
      provider: 'oxalpha',
      model: process.env.OXALPHA_MODEL || 'z-ai/glm-5.3-flash',
      enabled: true,
      priority: 1,
      timeout: 90000,
      maxTokens: 32768,
      temperature: 0.2,
    });
  }

  public registerProvider(provider: AIProvider, config: ProviderConfig): void {
    this.providers.set(provider.id, provider);
    this.configs.set(provider.id, config);
    logger.info('ProviderRegistry', `Registered AI Provider: [${provider.id}] (${provider.name}) - Enabled: ${config.enabled}`);
  }

  public getProvider(id: string): AIProvider | undefined {
    return this.providers.get(id);
  }

  public getConfig(id: string): ProviderConfig | undefined {
    return this.configs.get(id);
  }

  public updateConfig(id: string, updates: Partial<ProviderConfig>): ProviderConfig {
    const existing = this.configs.get(id);
    if (!existing) {
      throw new Error(`Provider [${id}] not registered.`);
    }
    const updated = { ...existing, ...updates };
    this.configs.set(id, updated);
    logger.info('ProviderRegistry', `Updated config for provider [${id}]: enabled=${updated.enabled}, priority=${updated.priority}`);
    return updated;
  }

  public getAllConfigs(): ProviderConfig[] {
    return Array.from(this.configs.values());
  }

  public getTaskStrategy(taskType: ProviderTaskType): TaskStrategy {
    return (
      this.taskStrategies.get(taskType) || {
        taskType,
        maxTokens: 32768,
        timeout: 90000,
        priority: 1,
        provider: 'oxalpha',
      }
    );
  }

  public setTaskStrategy(taskType: ProviderTaskType, strategy: Partial<TaskStrategy>): void {
    const existing = this.getTaskStrategy(taskType);
    this.taskStrategies.set(taskType, { ...existing, ...strategy });
  }

  public getActiveProviders(): AIProvider[] {
    return Array.from(this.providers.values()).filter((p) => {
      const cfg = this.configs.get(p.id);
      return cfg?.enabled && p.isAvailable();
    });
  }

  public getProvidersForTask(taskType?: ProviderTaskType): AIProvider[] {
    return [oxalphaProvider];
  }

  /**
   * Selects primary provider (OxAlpha)
   */
  public getCandidateProviders(taskType?: ProviderTaskType, preferredId?: string): { primary: AIProvider; fallback: AIProvider } {
    return { primary: oxalphaProvider, fallback: oxalphaProvider };
  }

  /**
   * Executes AI task directly with OxAlpha. If OxAlpha fails, throws immediately with no fallback.
   */
  public async executeWithRouting<T>(
    taskType: ProviderTaskType,
    fn: (provider: AIProvider, config: ProviderConfig) => Promise<T>,
    options?: { preferredProviderId?: string; estimatedTokens?: number }
  ): Promise<{ result: T; usedProvider: string; fellBack: boolean; durationMs: number }> {
    const start = Date.now();
    const primary = oxalphaProvider;
    const primaryCfg = this.configs.get('oxalpha') || {
      provider: 'oxalpha',
      model: process.env.OXALPHA_MODEL || 'z-ai/glm-5.3-flash',
      enabled: true,
      priority: 1,
      timeout: 90000,
      maxTokens: 32768,
      temperature: 0.2,
    };

    logger.info('ProviderRegistry', `Génération démarrée via [oxalpha] (Modèle: ${primaryCfg.model})`);

    try {
      const result = await fn(primary, primaryCfg);
      const durationMs = Date.now() - start;
      logger.info('ProviderRegistry', `Génération réussie via [oxalpha] en ${durationMs}ms`);

      return {
        result,
        usedProvider: 'oxalpha',
        fellBack: false,
        durationMs,
      };
    } catch (err: any) {
      logger.error('ProviderRegistry', `OxAlpha generation failed: ${err.message}`);
      throw new Error(`Le provider OxAlpha est indisponible ou a échoué: ${err.message}`);
    }
  }

  /**
   * Executes connection test for a specific provider safely on the server
   */
  public async testProviderConnection(providerId: string): Promise<ProviderConnectionTestResult> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return {
        success: false,
        status: 'UNAVAILABLE',
        statusLabel: 'Fournisseur indisponible',
        message: `Fournisseur [${providerId}] introuvable ou non enregistré.`,
        latencyMs: 0,
        provider: providerId,
        timestamp: Date.now(),
      };
    }

    if (typeof provider.testConnection === 'function') {
      return await provider.testConnection();
    }

    // Default fallback connectivity check
    const isAvail = provider.isAvailable();
    return {
      success: isAvail,
      status: isAvail ? 'SUCCESS' : 'UNAVAILABLE',
      statusLabel: isAvail ? 'Connexion réussie' : 'Fournisseur indisponible',
      message: isAvail ? `Fournisseur ${provider.name} disponible.` : `Clé API non configurée pour ${provider.name}.`,
      latencyMs: 10,
      provider: providerId,
      timestamp: Date.now(),
    };
  }

  /**
   * Safe status summary for observability (no secrets exposed)
   */
  public getStatusSummary() {
    return Array.from(this.providers.values()).map((p) => {
      const cfg = this.configs.get(p.id)!;
      const meta = p.getMetadata();
      const breaker = aiCircuitRegistry.getBreaker(p.id);
      const stats = breaker.getStats();

      const roles: Record<string, string> = {
        gemini: 'Raisonnement Multimodal & Compréhension Complexe',
        oxalpha: 'Génération de Code Production-Grade & Refactoring',
        local_engine: 'Synthétiseur Local Ultra-Rapide (Secours)',
      };

      const fallbackMap: Record<string, string> = {
        oxalpha: 'gemini (puis local_engine)',
        gemini: 'oxalpha (puis local_engine)',
        local_engine: 'aucun (moteur autonome)',
      };

      const totalCalls = stats.totalCalls || 0;
      const totalFailures = stats.totalFailures || 0;
      const successRate = totalCalls > 0 ? Number(((totalCalls - totalFailures) / totalCalls).toFixed(3)) : 1.0;

      return {
        id: p.id,
        name: p.name,
        type: meta.type,
        model: cfg.model,
        availableModels: meta.models,
        enabled: cfg.enabled,
        priority: cfg.priority,
        temperature: cfg.temperature,
        maxTokens: cfg.maxTokens,
        timeout: cfg.timeout,
        configured: p.isAvailable(),
        isConfigured: p.isAvailable(),
        statusLabel: p.isAvailable() ? 'Configurée' : 'Non configurée',
        maskedKey: p.isAvailable() ? '••••••••••••' : 'Non configurée',
        circuitState: breaker.getState(),
        role: roles[p.id] || 'Modèle IA Polyvalent',
        fallback: fallbackMap[p.id] || 'local_engine',
        costPer1kInput: meta.costPer1kInputTokens,
        costPer1kOutput: meta.costPer1kOutputTokens,
        costEstimatedLabel: `~€${(meta.costPer1kInputTokens * 1000).toFixed(2)}/1M in · ~€${(meta.costPer1kOutputTokens * 1000).toFixed(2)}/1M out`,
        totalCalls,
        totalFailures,
        successRate,
        lastUsedTimestamp: stats.lastStateChange || Date.now(),
      };
    });
  }
}

export const providerRegistry = new ProviderRegistry();
