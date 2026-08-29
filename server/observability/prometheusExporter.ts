import { telemetry } from './telemetry';
import { distributedJobQueue } from '../queue/distributedJobQueue';
import { aiCircuitRegistry } from '../ai/circuitBreaker';
import { redisClient } from '../redis/redisClient';
import { dbAdapter } from '../db/database';
import { bugIntelligenceEngine } from '../learning/bugIntelligenceEngine';

export class PrometheusExporter {
  private idempotencyHits = 0;
  private idempotencyConflicts = 0;

  public recordIdempotencyHit() {
    this.idempotencyHits++;
  }

  public recordIdempotencyConflict() {
    this.idempotencyConflicts++;
  }

  public generateMetrics(): string {
    const mem = process.memoryUsage();
    const tele = telemetry.getMetrics();
    const queueStats = distributedJobQueue.getStats();
    const aiStats = aiCircuitRegistry.getAllStats();
    const redisHealth = redisClient.getHealth();
    const dbHealth = dbAdapter.getDatabaseHealth();
    const learningMetrics = bugIntelligenceEngine.getMetrics();

    const lines: string[] = [];

    lines.push('# HELP http_requests_total Total number of HTTP requests processed');
    lines.push('# TYPE http_requests_total counter');
    lines.push(`http_requests_total ${tele.totalRequests}`);

    lines.push('# HELP http_errors_total Total number of HTTP 5xx or unhandled errors');
    lines.push('# TYPE http_errors_total counter');
    lines.push(`http_errors_total ${tele.errorsCount}`);

    lines.push('# HELP http_request_duration_seconds HTTP request latency quantiles in seconds');
    lines.push('# TYPE http_request_duration_seconds summary');
    lines.push(`http_request_duration_seconds{quantile="0.5"} ${(tele.latencies.p50Ms / 1000).toFixed(4)}`);
    lines.push(`http_request_duration_seconds{quantile="0.95"} ${(tele.latencies.p95Ms / 1000).toFixed(4)}`);
    lines.push(`http_request_duration_seconds{quantile="0.99"} ${(tele.latencies.p99Ms / 1000).toFixed(4)}`);

    lines.push('# HELP jobs_total Total background jobs processed');
    lines.push('# TYPE jobs_total gauge');
    lines.push(`jobs_total ${queueStats.completedCount + queueStats.failedCount + queueStats.pendingCount}`);

    lines.push('# HELP jobs_processing Number of jobs actively processing');
    lines.push('# TYPE jobs_processing gauge');
    lines.push(`jobs_processing ${queueStats.processingCount}`);

    lines.push('# HELP jobs_pending Number of jobs queued pending execution');
    lines.push('# TYPE jobs_pending gauge');
    lines.push(`jobs_pending ${queueStats.pendingCount}`);

    lines.push('# HELP jobs_failed Number of failed jobs');
    lines.push('# TYPE jobs_failed counter');
    lines.push(`jobs_failed ${queueStats.failedCount}`);

    lines.push('# HELP jobs_dead_letter Number of permanently failed jobs in DLQ');
    lines.push('# TYPE jobs_dead_letter gauge');
    lines.push(`jobs_dead_letter ${queueStats.dlqCount}`);

    lines.push('# HELP ai_circuit_state AI Circuit Breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)');
    lines.push('# TYPE ai_circuit_state gauge');
    for (const [provider, stats] of Object.entries(aiStats.providers as Record<string, any>)) {
      lines.push(`ai_circuit_state{provider="${provider}"} ${stats.stateNumeric}`);
      lines.push(`ai_requests_total{provider="${provider}"} ${stats.totalCalls}`);
      lines.push(`ai_failures_total{provider="${provider}"} ${stats.totalFailures}`);
    }

    lines.push('# HELP ai_fallback_events_total Total times AI requests fell back to alternate engine');
    lines.push('# TYPE ai_fallback_events_total counter');
    lines.push(`ai_fallback_events_total ${aiStats.totalFallbackEvents}`);

    // Learning & Bug Intelligence Prometheus Metrics
    lines.push('# HELP learning_incidents_total Total error and quality incidents captured');
    lines.push('# TYPE learning_incidents_total counter');
    lines.push(`learning_incidents_total ${learningMetrics.totalIncidents}`);

    lines.push('# HELP learning_recurrent_patterns_total Recurring error patterns identified');
    lines.push('# TYPE learning_recurrent_patterns_total gauge');
    lines.push(`learning_recurrent_patterns_total ${learningMetrics.recurringCount}`);

    lines.push('# HELP learning_auto_repair_success_rate Auto repair success rate');
    lines.push('# TYPE learning_auto_repair_success_rate gauge');
    lines.push(`learning_auto_repair_success_rate ${learningMetrics.autoRepairSuccessRate}`);

    lines.push('# HELP learning_promoted_rules_total Total governance-promoted repair rules');
    lines.push('# TYPE learning_promoted_rules_total gauge');
    lines.push(`learning_promoted_rules_total ${learningMetrics.promotedRulesCount}`);

    lines.push('# HELP redis_errors_total Total Redis operational errors');
    lines.push('# TYPE redis_errors_total counter');
    lines.push(`redis_errors_total ${redisHealth.totalErrors || 0}`);

    lines.push('# HELP database_errors_total Total Database errors');
    lines.push('# TYPE database_errors_total counter');
    lines.push(`database_errors_total ${dbHealth.status === 'healthy' ? 0 : 1}`);

    lines.push('# HELP idempotency_hits_total Total cached idempotent replays');
    lines.push('# TYPE idempotency_hits_total counter');
    lines.push(`idempotency_hits_total ${this.idempotencyHits}`);

    lines.push('# HELP idempotency_conflicts_total Total idempotent payload conflicts (409)');
    lines.push('# TYPE idempotency_conflicts_total counter');
    lines.push(`idempotency_conflicts_total ${this.idempotencyConflicts}`);

    lines.push('# HELP node_memory_rss_bytes Resident Set Size memory');
    lines.push('# TYPE node_memory_rss_bytes gauge');
    lines.push(`node_memory_rss_bytes ${mem.rss}`);

    lines.push('# HELP node_memory_heap_used_bytes V8 Heap Used memory');
    lines.push('# TYPE node_memory_heap_used_bytes gauge');
    lines.push(`node_memory_heap_used_bytes ${mem.heapUsed}`);

    lines.push('# HELP node_memory_heap_total_bytes V8 Heap Total memory');
    lines.push('# TYPE node_memory_heap_total_bytes gauge');
    lines.push(`node_memory_heap_total_bytes ${mem.heapTotal}`);

    return lines.join('\n') + '\n';
  }
}

export const prometheusExporter = new PrometheusExporter();
