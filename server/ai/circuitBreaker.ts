import { logger } from '../logger';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number; // consecutive failures before opening (default: 3)
  recoveryTimeoutMs: number; // time to wait in OPEN before moving to HALF_OPEN (default: 15000ms)
  halfOpenSuccessThreshold: number; // successful calls in HALF_OPEN before CLOSING (default: 2)
  requestTimeoutMs: number; // individual call timeout (default: 10000ms)
}

export interface FallbackAuditRecord {
  id: string;
  timestamp: number;
  initialProvider: string;
  finalProvider: string;
  reason: string;
  estimatedTokens?: number;
  costSavedOrIncurred?: string;
  success: boolean;
  durationMs: number;
}

export class ProviderCircuitBreaker {
  public readonly providerName: string;
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastStateChange: number = Date.now();
  private lastFailureTime: number = 0;
  private config: CircuitBreakerConfig;
  private totalCalls = 0;
  private totalFailures = 0;
  private totalFallbacks = 0;

  constructor(providerName: string, config?: Partial<CircuitBreakerConfig>) {
    this.providerName = providerName;
    this.config = {
      failureThreshold: config?.failureThreshold ?? 3,
      recoveryTimeoutMs: config?.recoveryTimeoutMs ?? 15000,
      halfOpenSuccessThreshold: config?.halfOpenSuccessThreshold ?? 2,
      requestTimeoutMs: config?.requestTimeoutMs ?? 45000,
    };
  }

  public getState(): CircuitState {
    const now = Date.now();
    if (this.state === 'OPEN' && now - this.lastStateChange >= this.config.recoveryTimeoutMs) {
      logger.info('CircuitBreaker', `Provider [${this.providerName}] transitioning from OPEN to HALF_OPEN (probing recovery)`);
      this.state = 'HALF_OPEN';
      this.lastStateChange = now;
      this.successCount = 0;
    }
    return this.state;
  }

  public canExecute(): boolean {
    const currentState = this.getState();
    return currentState === 'CLOSED' || currentState === 'HALF_OPEN';
  }

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      throw new Error(`Circuit Breaker is OPEN for provider '${this.providerName}'. Rapid-fail active.`);
    }

    this.totalCalls++;
    const start = Date.now();

    try {
      // Execute with timeout promise race
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`AI Request Timeout after ${this.config.requestTimeoutMs}ms`)), this.config.requestTimeoutMs)
      );

      const result = await Promise.race([fn(), timeoutPromise]);
      this.onSuccess();
      return result;
    } catch (err: any) {
      this.onFailure(err);
      throw err;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.config.halfOpenSuccessThreshold) {
        logger.info('CircuitBreaker', `Provider [${this.providerName}] recovered successfully. Transitioning to CLOSED.`);
        this.state = 'CLOSED';
        this.lastStateChange = Date.now();
        this.successCount = 0;
      }
    }
  }

  private onFailure(err: Error) {
    this.totalFailures++;
    this.lastFailureTime = Date.now();
    this.failureCount++;

    logger.warn('CircuitBreaker', `Provider [${this.providerName}] recorded failure (${this.failureCount}/${this.config.failureThreshold}): ${err.message}`);

    if (this.state === 'CLOSED' && this.failureCount >= this.config.failureThreshold) {
      logger.error('CircuitBreaker', `Provider [${this.providerName}] reached failure threshold. TRIP TO OPEN STATE!`);
      this.state = 'OPEN';
      this.lastStateChange = Date.now();
    } else if (this.state === 'HALF_OPEN') {
      logger.error('CircuitBreaker', `Provider [${this.providerName}] probe failed in HALF_OPEN. TRIP BACK TO OPEN!`);
      this.state = 'OPEN';
      this.lastStateChange = Date.now();
      this.successCount = 0;
    }
  }

  public tripOpenManually() {
    this.state = 'OPEN';
    this.lastStateChange = Date.now();
    logger.warn('CircuitBreaker', `Provider [${this.providerName}] manually tripped to OPEN.`);
  }

  public resetManually() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastStateChange = Date.now();
    logger.info('CircuitBreaker', `Provider [${this.providerName}] manually reset to CLOSED.`);
  }

  public getStats() {
    return {
      provider: this.providerName,
      state: this.getState(),
      stateNumeric: this.getState() === 'CLOSED' ? 0 : this.getState() === 'HALF_OPEN' ? 1 : 2,
      failureCount: this.failureCount,
      consecutiveFailures: this.failureCount,
      successCount: this.successCount,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
    };
  }
}

export class AICircuitBreakerRegistry {
  private breakers: Map<string, ProviderCircuitBreaker> = new Map();
  private fallbackAuditLog: FallbackAuditRecord[] = [];

  constructor() {
    this.breakers.set('gemini', new ProviderCircuitBreaker('gemini', { failureThreshold: 3, recoveryTimeoutMs: 10000, requestTimeoutMs: 45000 }));
    this.breakers.set('oxalpha', new ProviderCircuitBreaker('oxalpha', { failureThreshold: 3, recoveryTimeoutMs: 10000, requestTimeoutMs: 30000 }));
    this.breakers.set('openai', new ProviderCircuitBreaker('openai', { failureThreshold: 3, recoveryTimeoutMs: 15000, requestTimeoutMs: 45000 }));
    this.breakers.set('anthropic', new ProviderCircuitBreaker('anthropic', { failureThreshold: 3, recoveryTimeoutMs: 15000, requestTimeoutMs: 45000 }));
    this.breakers.set('local_engine', new ProviderCircuitBreaker('local_engine', { failureThreshold: 10, recoveryTimeoutMs: 5000, requestTimeoutMs: 10000 }));
  }

  public getBreaker(provider: string): ProviderCircuitBreaker {
    if (!this.breakers.has(provider)) {
      this.breakers.set(provider, new ProviderCircuitBreaker(provider));
    }
    return this.breakers.get(provider)!;
  }

  public async executeWithFallback<T>(
    primaryProvider: string,
    primaryFn: () => Promise<T>,
    fallbackProvider: string,
    fallbackFn: () => Promise<T>,
    auditContext: { userIntent?: string; estimatedTokens?: number } = {}
  ): Promise<{ result: T; usedProvider: string; fellBack: boolean }> {
    const breaker = this.getBreaker(primaryProvider);
    const start = Date.now();

    if (breaker.canExecute()) {
      try {
        const result = await breaker.execute(primaryFn);
        return { result, usedProvider: primaryProvider, fellBack: false };
      } catch (err: any) {
        logger.warn('CircuitBreaker', `Primary provider [${primaryProvider}] execution failed. Triggering controlled fallback to [${fallbackProvider}].`, { error: err.message });
      }
    } else {
      logger.warn('CircuitBreaker', `Primary provider [${primaryProvider}] circuit is OPEN. Directly routing to fallback [${fallbackProvider}].`);
    }

    // Execute fallback
    const fallbackBreaker = this.getBreaker(fallbackProvider);
    try {
      const result = await fallbackBreaker.execute(fallbackFn);
      const audit: FallbackAuditRecord = {
        id: 'fb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        timestamp: Date.now(),
        initialProvider: primaryProvider,
        finalProvider: fallbackProvider,
        reason: breaker.getState() === 'OPEN' ? 'Circuit Breaker OPEN' : 'Primary Execution Error',
        estimatedTokens: auditContext.estimatedTokens,
        costSavedOrIncurred: 'fallback-budget-guarded',
        success: true,
        durationMs: Date.now() - start,
      };
      this.recordAudit(audit);
      return { result, usedProvider: fallbackProvider, fellBack: true };
    } catch (fallbackErr: any) {
      const audit: FallbackAuditRecord = {
        id: 'fb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        timestamp: Date.now(),
        initialProvider: primaryProvider,
        finalProvider: fallbackProvider,
        reason: 'Both primary and fallback failed',
        estimatedTokens: auditContext.estimatedTokens,
        success: false,
        durationMs: Date.now() - start,
      };
      this.recordAudit(audit);
      throw new Error(`All AI Providers failed (Primary: ${primaryProvider}, Fallback: ${fallbackProvider}). Details: ${fallbackErr.message}`);
    }
  }

  private recordAudit(record: FallbackAuditRecord) {
    this.fallbackAuditLog.unshift(record);
    if (this.fallbackAuditLog.length > 200) {
      this.fallbackAuditLog.pop();
    }
  }

  public getAuditLogs(limit = 50): FallbackAuditRecord[] {
    return this.fallbackAuditLog.slice(0, limit);
  }

  public getAllStats() {
    const stats: Record<string, any> = {};
    for (const [name, breaker] of this.breakers.entries()) {
      stats[name] = breaker.getStats();
    }
    return {
      providers: stats,
      totalFallbackEvents: this.fallbackAuditLog.length,
    };
  }
}

export const aiCircuitRegistry = new AICircuitBreakerRegistry();
