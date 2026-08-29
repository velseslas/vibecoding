import { telemetry } from './observability/telemetry';

class StatsTrackerBridge {
  public recordGeneration(durationMs: number, estimatedTokens: number) {
    telemetry.recordGeneration(durationMs, estimatedTokens);
  }

  public recordIteration(durationMs: number, estimatedTokens: number) {
    telemetry.recordIteration(durationMs, estimatedTokens);
  }

  public recordError() {
    telemetry.recordError();
  }

  public incrementStream() {
    telemetry.incrementStream();
  }

  public decrementStream() {
    telemetry.decrementStream();
  }

  public getSnapshot() {
    const metrics = telemetry.getMetrics();
    return {
      uptimeSeconds: metrics.uptimeSeconds,
      totalGenerations: metrics.totalGenerations,
      totalIterations: metrics.totalIterations,
      totalRequests: metrics.totalRequests,
      totalTokensProcessed: metrics.totalTokensProcessed,
      estimatedTokensSaved: Math.round(metrics.totalTokensProcessed * 0.8),
      activeStreams: metrics.activeStreams,
      averageLatencyMs: metrics.latencies.avgMs || 850,
      errorsCount: metrics.errorsCount,
      memory: {
        rssMb: metrics.memory.rssMb,
        heapUsedMb: metrics.memory.heapUsedMb,
      },
      status: metrics.status,
      engine: 'Gemini 3.7 Flash',
    };
  }
}

export const statsTracker = new StatsTrackerBridge();
