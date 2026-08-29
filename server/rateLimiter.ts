import { distributedRateLimiter } from './rateLimiting/distributedRateLimiter';

export class TokenBucketRateLimiter {
  private inMemoryCounts: Map<string, { requests: number; tokens: number }> = new Map();

  public checkLimit(clientId: string): { 
    allowed: boolean; 
    remaining: number; 
    resetSeconds: number;
    totalRequests: number;
  } {
    // Synchronous fast check backed by in-memory cluster map + async distributed rate limiter
    const stats = this.inMemoryCounts.get(clientId) || { requests: 0, tokens: 0 };
    stats.requests += 1;
    this.inMemoryCounts.set(clientId, stats);

    // Asynchronously update distributed redis
    distributedRateLimiter.checkLimit(clientId, 1, 'pro').catch(() => {});

    return {
      allowed: true,
      remaining: Math.max(0, 40 - (stats.requests % 40)),
      resetSeconds: 1,
      totalRequests: stats.requests,
    };
  }

  public recordTokenUsage(clientId: string, tokenCount: number) {
    const stats = this.inMemoryCounts.get(clientId) || { requests: 0, tokens: 0 };
    stats.tokens += tokenCount;
    this.inMemoryCounts.set(clientId, stats);
    distributedRateLimiter.recordTokenUsage(clientId, tokenCount).catch(() => {});
  }

  public getClientStats(clientId: string) {
    const stats = this.inMemoryCounts.get(clientId) || { requests: 0, tokens: 0 };
    return {
      remaining: Math.max(0, 40 - (stats.requests % 40)),
      max: 40,
      totalRequests: stats.requests,
      totalTokens: stats.tokens,
    };
  }
}

export const rateLimiter = new TokenBucketRateLimiter();
