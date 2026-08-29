import { redisClient } from '../redis/redisClient';
import { logger } from '../logger';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
  totalRequests: number;
  plan: string;
}

export class DistributedRateLimiter {
  private defaultMaxTokens = 40;
  private defaultRefillRatePerSec = 1;

  public async checkLimit(
    identifier: string,
    cost = 1,
    plan: 'free' | 'pro' | 'enterprise' = 'pro'
  ): Promise<RateLimitResult> {
    const maxTokens = plan === 'enterprise' ? 200 : plan === 'pro' ? 60 : 20;
    const refillRate = plan === 'enterprise' ? 5 : plan === 'pro' ? 1.5 : 0.5;

    const key = `ratelimit:${identifier}`;
    const now = Date.now();

    interface StoredBucket {
      tokens: number;
      lastRefill: number;
      totalRequests: number;
    }

    let bucket = await redisClient.get<StoredBucket>(key);
    if (!bucket) {
      bucket = {
        tokens: maxTokens,
        lastRefill: now,
        totalRequests: 0,
      };
    }

    // Refill logic
    const elapsedSec = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsedSec * refillRate);
    bucket.lastRefill = now;

    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      bucket.totalRequests += 1;
      await redisClient.set(key, bucket, 3600); // 1 hour TTL
      const resetSeconds = Math.ceil((maxTokens - bucket.tokens) / refillRate);

      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetSeconds,
        totalRequests: bucket.totalRequests,
        plan,
      };
    } else {
      const resetSeconds = Math.ceil((cost - bucket.tokens) / refillRate);
      await redisClient.set(key, bucket, 3600);

      logger.warn('RateLimiter', `Throttling identifier ${identifier}`, { remaining: bucket.tokens, resetSeconds });

      return {
        allowed: false,
        remaining: 0,
        resetSeconds: Math.max(1, resetSeconds),
        totalRequests: bucket.totalRequests,
        plan,
      };
    }
  }

  public async recordTokenUsage(identifier: string, tokens: number) {
    const usageKey = `usage:tokens:${identifier}`;
    await redisClient.incr(usageKey, 86400 * 30);
  }
}

export const distributedRateLimiter = new DistributedRateLimiter();
