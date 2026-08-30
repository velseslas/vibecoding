import crypto from 'crypto';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  requestId?: string;
  userId?: string;
  projectId?: string;
  jobId?: string;
  service: string;
  message: string;
  durationMs?: number;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface StreamLogItem {
  id: string;
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
}

type LogSubscriber = (entry: StreamLogItem) => void;

class ProductionLogger {
  private sensitiveKeys = [
    'password',
    'secret',
    'apikey',
    'token',
    'authorization',
    'gemini_api_key',
    'stripe_secret_key',
  ];

  private subscribers: Set<LogSubscriber> = new Set();
  private recentLogs: StreamLogItem[] = [];
  private maxHistory = 100;

  public subscribe(subscriber: LogSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  public getRecentLogs(): StreamLogItem[] {
    return [...this.recentLogs];
  }

  private notifySubscribers(entry: StructuredLog) {
    let msg = entry.message || '';
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      try {
        const metaStr = JSON.stringify(entry.metadata);
        if (metaStr !== '{}') {
          msg += ` ${metaStr}`;
        }
      } catch (e) {}
    }
    if (entry.error) {
      msg += ` [Error: ${entry.error.message || String(entry.error)}]`;
    }

    const item: StreamLogItem = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      timestamp: entry.timestamp || new Date().toISOString(),
      level: entry.level || 'info',
      module: entry.service || 'Server',
      message: msg,
    };

    this.recentLogs.push(item);
    if (this.recentLogs.length > this.maxHistory) {
      this.recentLogs.shift();
    }

    for (const sub of this.subscribers) {
      try {
        sub(item);
      } catch (err) {}
    }
  }

  public sanitize(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map((item) => this.sanitize(item));

    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      const lower = k.toLowerCase();
      if (this.sensitiveKeys.some((s) => lower.includes(s))) {
        clean[k] = '[REDACTED_SECRET]';
      } else if (typeof v === 'object' && v !== null) {
        clean[k] = this.sanitize(v);
      } else {
        clean[k] = v;
      }
    }
    return clean;
  }

  private output(entry: StructuredLog) {
    const jsonStr = JSON.stringify(entry);
    if (entry.level === 'error') {
      console.error(jsonStr);
    } else if (entry.level === 'warn') {
      console.warn(jsonStr);
    } else {
      console.log(jsonStr);
    }
    this.notifySubscribers(entry);
  }

  public debug(service: string, message: string, meta?: Record<string, any>, context?: { requestId?: string; userId?: string; projectId?: string; jobId?: string }) {
    this.output({
      timestamp: new Date().toISOString(),
      level: 'debug',
      service,
      message,
      requestId: context?.requestId,
      userId: context?.userId,
      projectId: context?.projectId,
      jobId: context?.jobId,
      metadata: meta ? this.sanitize(meta) : undefined,
    });
  }

  public info(service: string, message: string, meta?: Record<string, any>, context?: { requestId?: string; userId?: string; projectId?: string; jobId?: string }) {
    this.output({
      timestamp: new Date().toISOString(),
      level: 'info',
      service,
      message,
      requestId: context?.requestId,
      userId: context?.userId,
      projectId: context?.projectId,
      jobId: context?.jobId,
      metadata: meta ? this.sanitize(meta) : undefined,
    });
  }

  public warn(service: string, message: string, meta?: Record<string, any>, context?: { requestId?: string; userId?: string; projectId?: string; jobId?: string }) {
    this.output({
      timestamp: new Date().toISOString(),
      level: 'warn',
      service,
      message,
      requestId: context?.requestId,
      userId: context?.userId,
      projectId: context?.projectId,
      jobId: context?.jobId,
      metadata: meta ? this.sanitize(meta) : undefined,
    });
  }

  public error(service: string, message: string, err?: Error | any, meta?: Record<string, any>, context?: { requestId?: string; userId?: string; projectId?: string; jobId?: string }) {
    this.output({
      timestamp: new Date().toISOString(),
      level: 'error',
      service,
      message,
      requestId: context?.requestId,
      userId: context?.userId,
      projectId: context?.projectId,
      jobId: context?.jobId,
      metadata: meta ? this.sanitize(meta) : undefined,
      error: err ? {
        name: err.name || 'Error',
        message: err.message || String(err),
        stack: err.stack,
      } : undefined,
    });
  }
}

export const logger = new ProductionLogger();
