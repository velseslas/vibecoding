import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

export interface TelemetryMetrics {
  uptimeSeconds: number;
  totalRequests: number;
  totalGenerations: number;
  totalIterations: number;
  totalTokensProcessed: number;
  activeStreams: number;
  errorsCount: number;
  latencies: {
    avgMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
  };
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
  status: 'healthy' | 'degraded' | 'unhealthy';
}

export class ProductionTelemetryService {
  private startTime = Date.now();
  private totalRequests = 0;
  private totalGenerations = 0;
  private totalIterations = 0;
  private totalTokens = 0;
  private activeStreams = 0;
  private errorsCount = 0;
  private latencySamples: number[] = [];

  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const requestId = (req.headers['x-request-id'] as string) || 'req_' + crypto.randomBytes(8).toString('hex');
      (req as any).requestId = requestId;
      res.setHeader('X-Request-Id', requestId);

      const start = Date.now();
      this.totalRequests += 1;

      res.on('finish', () => {
        const duration = Date.now() - start;
        this.recordLatency(duration);

        if (res.statusCode >= 500) {
          this.errorsCount += 1;
          logger.error('HTTP', `${req.method} ${req.path} ${res.statusCode} in ${duration}ms`, undefined, undefined, { requestId });
        } else if (res.statusCode >= 400) {
          logger.warn('HTTP', `${req.method} ${req.path} ${res.statusCode} in ${duration}ms`, undefined, { requestId });
        }
      });

      next();
    };
  }

  public recordGeneration(durationMs: number, tokens: number) {
    this.totalGenerations += 1;
    this.totalTokens += tokens;
    this.recordLatency(durationMs);
  }

  public recordIteration(durationMs: number, tokens: number) {
    this.totalIterations += 1;
    this.totalTokens += tokens;
    this.recordLatency(durationMs);
  }

  public recordError() {
    this.errorsCount += 1;
  }

  public incrementStream() {
    this.activeStreams += 1;
  }

  public decrementStream() {
    this.activeStreams = Math.max(0, this.activeStreams - 1);
  }

  private recordLatency(durationMs: number) {
    this.latencySamples.push(durationMs);
    if (this.latencySamples.length > 200) {
      this.latencySamples.shift();
    }
  }

  private calculatePercentiles(): { avgMs: number; p50Ms: number; p95Ms: number; p99Ms: number } {
    if (this.latencySamples.length === 0) {
      return { avgMs: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0 };
    }

    const sorted = [...this.latencySamples].sort((a, b) => a - b);
    const avg = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;

    return { avgMs: avg, p50Ms: p50, p95Ms: p95, p99Ms: p99 };
  }

  public getMetrics(): TelemetryMetrics {
    const mem = process.memoryUsage();
    const lat = this.calculatePercentiles();
    return {
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      totalRequests: this.totalRequests,
      totalGenerations: this.totalGenerations,
      totalIterations: this.totalIterations,
      totalTokensProcessed: this.totalTokens,
      activeStreams: this.activeStreams,
      errorsCount: this.errorsCount,
      latencies: lat,
      memory: {
        rssMb: Math.round(mem.rss / (1024 * 1024)),
        heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
        heapTotalMb: Math.round(mem.heapTotal / (1024 * 1024)),
      },
      status: this.errorsCount > 50 ? 'degraded' : 'healthy',
    };
  }
}

export const telemetry = new ProductionTelemetryService();
