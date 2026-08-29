export interface AlertRule {
  id: string;
  name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  metric: string;
  condition: string;
  threshold: number | string;
  duration: string;
  description: string;
  actionRequired: string;
}

export const ALERT_RULES_DEFINITIONS: AlertRule[] = [
  // --- CRITICAL ALERTS ---
  {
    id: 'ALERT_CRIT_01',
    name: 'DatabaseUnavailable',
    severity: 'CRITICAL',
    metric: 'database_errors_total',
    condition: '> 0 (connectivity == 0)',
    threshold: 0,
    duration: '10s',
    description: 'PostgreSQL / Storage Adapter is completely unresponsive or failing health checks.',
    actionRequired: 'Trigger immediate DB reconnect & fail-closed on credit-deducting operations.',
  },
  {
    id: 'ALERT_CRIT_02',
    name: 'RedisUnavailable',
    severity: 'CRITICAL',
    metric: 'redis_errors_total',
    condition: 'status == disconnected',
    threshold: 1,
    duration: '15s',
    description: 'Distributed Redis cluster node is unreachable.',
    actionRequired: 'Verify cluster connectivity; engage memory lock fallback and alert on-call.',
  },
  {
    id: 'ALERT_CRIT_03',
    name: 'QueueUnavailable',
    severity: 'CRITICAL',
    metric: 'jobs_processing / maxConcurrency',
    condition: 'workers == 0 && jobs_pending > 50',
    threshold: 50,
    duration: '30s',
    description: 'Worker pool has halted while jobs are piling up in queue.',
    actionRequired: 'Restart queue worker supervisor & trigger zombie watchdog cycle.',
  },
  {
    id: 'ALERT_CRIT_04',
    name: 'CriticalErrorRate',
    severity: 'CRITICAL',
    metric: 'http_errors_total / http_requests_total',
    condition: '> 5% of total requests',
    threshold: 0.05,
    duration: '1m',
    description: 'HTTP 5xx error rate exceeds 5% in a 1-minute sliding window.',
    actionRequired: 'Inspect error logs for fatal exceptions or broken third-party dependencies.',
  },
  {
    id: 'ALERT_CRIT_05',
    name: 'DLQGrowth',
    severity: 'CRITICAL',
    metric: 'jobs_dead_letter',
    condition: 'increase(jobs_dead_letter[5m]) > 5',
    threshold: 5,
    duration: '5m',
    description: 'Dead Letter Queue received multiple unrecoverable jobs exceeding max backoff retries.',
    actionRequired: 'Inspect DLQ payloads and payload validation schemas.',
  },

  // --- HIGH ALERTS ---
  {
    id: 'ALERT_HIGH_01',
    name: 'HighP99Latency',
    severity: 'HIGH',
    metric: 'http_request_duration_seconds{quantile="0.99"}',
    condition: '> 3.5s',
    threshold: 3.5,
    duration: '2m',
    description: '99th percentile HTTP response latency exceeds 3.5 seconds.',
    actionRequired: 'Check for slow downstream AI model streaming or event loop starvation.',
  },
  {
    id: 'ALERT_HIGH_02',
    name: 'WorkersSaturated',
    severity: 'HIGH',
    metric: 'jobs_processing / maxConcurrency',
    condition: '>= 95%',
    threshold: 0.95,
    duration: '3m',
    description: 'Worker concurrency pool is running at >95% capacity for sustained period.',
    actionRequired: 'Scale out worker instance replica count.',
  },
  {
    id: 'ALERT_HIGH_03',
    name: 'CircuitBreakerOpen',
    severity: 'HIGH',
    metric: 'ai_circuit_state{provider}',
    condition: '== 2 (OPEN)',
    threshold: 2,
    duration: '10s',
    description: 'Primary AI provider circuit breaker has tripped OPEN due to consecutive failures.',
    actionRequired: 'Verify external provider status page and monitor automated local/fallback provider traffic.',
  },
  {
    id: 'ALERT_HIGH_04',
    name: 'HighMemoryUsage',
    severity: 'HIGH',
    metric: 'node_memory_heap_used_bytes / node_memory_heap_total_bytes',
    condition: '> 85%',
    threshold: 0.85,
    duration: '3m',
    description: 'Node.js V8 heap memory usage exceeds 85%.',
    actionRequired: 'Check for unbounded cache growth or uncollected event listeners.',
  },

  // --- MEDIUM ALERTS ---
  {
    id: 'ALERT_MED_01',
    name: 'AbnormalRetries',
    severity: 'MEDIUM',
    metric: 'job_retry_count_rate',
    condition: '> 10 retries / min',
    threshold: 10,
    duration: '5m',
    description: 'Job queue is triggering an elevated number of retry cycles.',
    actionRequired: 'Check for transient network glitches or flaky downstream APIs.',
  },
  {
    id: 'ALERT_MED_02',
    name: 'QueueGrowth',
    severity: 'MEDIUM',
    metric: 'jobs_pending',
    condition: '> 25',
    threshold: 25,
    duration: '3m',
    description: 'Queue backlog is increasing above normal baseline.',
    actionRequired: 'Monitor processing throughput and queue drain speed.',
  },
  {
    id: 'ALERT_MED_03',
    name: 'HighAIErrors',
    severity: 'MEDIUM',
    metric: 'ai_failures_total / ai_requests_total',
    condition: '> 10%',
    threshold: 0.1,
    duration: '5m',
    description: 'AI model generation failure rate is elevated.',
    actionRequired: 'Check token budget limits, model quotas, and prompt length anomalies.',
  },
];
