import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from './logger';

/**
 * Rate Limiter for Generation API (costly token generation)
 * 3 requests per minute per IP
 */
export const generationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const resetTime = (req as any).rateLimit?.resetTime;
    const retryAfterSeconds = resetTime
      ? Math.max(1, Math.ceil((new Date(resetTime).getTime() - Date.now()) / 1000))
      : 60;

    logger.warn('RateLimiter', `Generation rate limit exceeded for IP: ${req.ip}`);

    res.status(429).json({
      error: `Trop de requêtes. Attendez ${retryAfterSeconds} secondes.`,
      message: `Trop de requêtes. Attendez ${retryAfterSeconds} secondes avant de relancer une génération d'application.`,
      retryAfterSeconds,
    });
  },
});

/**
 * Rate Limiter for Conversation/Chat API
 * 10 requests per minute per IP
 */
export const conversationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const resetTime = (req as any).rateLimit?.resetTime;
    const retryAfterSeconds = resetTime
      ? Math.max(1, Math.ceil((new Date(resetTime).getTime() - Date.now()) / 1000))
      : 60;

    logger.warn('RateLimiter', `Conversation rate limit exceeded for IP: ${req.ip}`);

    res.status(429).json({
      error: `Trop de requêtes. Attendez ${retryAfterSeconds} secondes.`,
      message: `Trop de requêtes. Attendez ${retryAfterSeconds} secondes avant d'envoyer un nouveau message.`,
      retryAfterSeconds,
    });
  },
});

/**
 * General API Rate Limiter
 * 60 requests per minute per IP
 */
export const apiGeneralRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const resetTime = (req as any).rateLimit?.resetTime;
    const retryAfterSeconds = resetTime
      ? Math.max(1, Math.ceil((new Date(resetTime).getTime() - Date.now()) / 1000))
      : 60;

    res.status(429).json({
      error: `Trop de requêtes. Attendez ${retryAfterSeconds} secondes.`,
      retryAfterSeconds,
    });
  },
});

/**
 * Token Tracking & Usage Manager
 */
export class TokenUsageTracker {
  private inMemoryCounts: Map<string, { requests: number; tokens: number; lastRequest: number }> = new Map();

  public recordTokenUsage(clientId: string, tokenCount: number) {
    const stats = this.inMemoryCounts.get(clientId) || { requests: 0, tokens: 0, lastRequest: Date.now() };
    stats.tokens += tokenCount;
    stats.requests += 1;
    stats.lastRequest = Date.now();
    this.inMemoryCounts.set(clientId, stats);
  }

  public getClientStats(clientId: string) {
    const stats = this.inMemoryCounts.get(clientId) || { requests: 0, tokens: 0, lastRequest: Date.now() };
    return {
      remaining: Math.max(0, 10 - (stats.requests % 10)),
      max: 10,
      totalRequests: stats.requests,
      totalTokens: stats.tokens,
    };
  }

  public checkLimit(clientId: string) {
    const stats = this.inMemoryCounts.get(clientId) || { requests: 0, tokens: 0, lastRequest: Date.now() };
    return {
      allowed: true,
      remaining: Math.max(0, 10 - (stats.requests % 10)),
      resetSeconds: 60,
      totalRequests: stats.requests,
    };
  }
}

export const rateLimiter = new TokenUsageTracker();
