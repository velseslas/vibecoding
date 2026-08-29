import { AIProvider, ProviderTaskType, ProviderConnectionTestResult } from './aiProvider';
import { geminiProvider } from './geminiProvider';
import { oxalphaProvider } from './oxalphaProvider';
import { localSynthesizerProvider } from './localSynthesizerProvider';
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

export class ProviderRegistry {
  private providers: Map<string, AIProvider> = new Map();
  private configs: Map<string, ProviderConfig> = new Map();

  constructor() {
    // 1. Register Gemini
    this.registerProvider(geminiProvider, {
      provider: 'gemini',
      model: 'gemini-3.7-flash',
      enabled: true,
      priority: 1,
      timeout: 45000,
      maxTokens: 8192,
      temperature: 0.2,
    });

    // 2. Register OxAlpha
    this.registerProvider(oxalphaProvider, {
      provider: 'oxalpha',
      model: process.env.OXALPHA_MODEL || 'oxalpha-coder-v1',
      enabled: true,
      priority: 2,
      timeout: 30000,
      maxTokens: 8192,
      temperature: 0.2,
    });

    // 3. Register Local Fallback Synthesizer
    this.registerProvider(localSynthesizerProvider, {
      provider: 'local_engine',
      model: 'local-synthesizer-v1',
      enabled: true,
      priority: 99,
      timeout: 5000,
      maxTokens: 4096,
      temperature: 0.1,
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

  public getActiveProviders(): AIProvider[] {
    return Array.from(this.providers.values()).filter((p) => {
      const cfg = this.configs.get(p.id);
      return cfg?.enabled && p.isAvailable();
    });
  }

  public getProvidersForTask(taskType?: ProviderTaskType): AIProvider[] {
    const candidates = this.getCandidateProviders(taskType);
    return [candidates.primary, candidates.fallback];
  }

  /**
   * Selects primary and secondary providers based on availability, priority, circuit breaker state, and task
   */
  public getCandidateProviders(taskType?: ProviderTaskType, preferredId?: string): { primary: AIProvider; fallback: AIProvider } {
    const allProviders = Array.from(this.providers.values());

    // If explicit preference requested and valid
    if (preferredId && this.providers.has(preferredId)) {
      const pref = this.providers.get(preferredId)!;
      const prefCfg = this.configs.get(preferredId);

      if (prefCfg?.enabled) {
        const otherAvailable = allProviders.find(
          (p) => p.id !== preferredId && this.configs.get(p.id)?.enabled && p.isAvailable() && aiCircuitRegistry.getBreaker(p.id).canExecute()
        ) || localSynthesizerProvider;

        return { primary: pref, fallback: otherAvailable };
      }
    }

    // Sort by priority (ascending: 1 is highest priority)
    const sorted = allProviders
      .filter((p) => this.configs.get(p.id)?.enabled && p.isAvailable())
      .sort((a, b) => {
        const cfgA = this.configs.get(a.id)?.priority ?? 100;
        const cfgB = this.configs.get(b.id)?.priority ?? 100;
        return cfgA - cfgB;
      });

    // Check circuit breaker status
    const healthyCandidates = sorted.filter((p) => aiCircuitRegistry.getBreaker(p.id).canExecute());

    const primary = healthyCandidates[0] || sorted[0] || localSynthesizerProvider;
    const fallback = healthyCandidates.find((p) => p.id !== primary.id) ||
      sorted.find((p) => p.id !== primary.id) ||
      localSynthesizerProvider;

    return { primary, fallback };
  }

  /**
   * Executes AI task through centralized circuit breaker with automated fallback
   */
  public async executeWithRouting<T>(
    taskType: ProviderTaskType,
    fn: (provider: AIProvider, config: ProviderConfig) => Promise<T>,
    options?: { preferredProviderId?: string; estimatedTokens?: number }
  ): Promise<{ result: T; usedProvider: string; fellBack: boolean; durationMs: number }> {
    const start = Date.now();
    const { primary, fallback } = this.getCandidateProviders(taskType, options?.preferredProviderId);
    const primaryCfg = this.configs.get(primary.id)!;
    const fallbackCfg = this.configs.get(fallback.id)!;

    try {
      const res = await aiCircuitRegistry.executeWithFallback(
        primary.id,
        () => fn(primary, primaryCfg),
        fallback.id,
        () => fn(fallback, fallbackCfg),
        { estimatedTokens: options?.estimatedTokens }
      );

      return {
        result: res.result,
        usedProvider: res.usedProvider,
        fellBack: res.fellBack,
        durationMs: Date.now() - start,
      };
    } catch (err: any) {
      logger.warn('ProviderRegistry', `Primary [${primary.id}] & fallback [${fallback.id}] failed: ${err.message}. Routing to local engine safety net.`);
      const localProvider = localSynthesizerProvider;
      const localCfg = this.configs.get(localProvider.id) || {
        provider: localProvider.id,
        model: 'local-synthesizer-v1',
        enabled: true,
        priority: 99,
        timeout: 5000,
        maxTokens: 4096,
        temperature: 0.1,
      };

      const result = await fn(localProvider, localCfg);

      return {
        result,
        usedProvider: localProvider.id,
        fellBack: true,
        durationMs: Date.now() - start,
      };
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
