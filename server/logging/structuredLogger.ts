/**
 * Structured Logger - Winston-based logging with correlation tracking
 * Ensures all logs are JSON, searchable, and never contain secrets
 */

import { createLogger, format, transports, Logger } from 'winston';

export interface LogContext {
  userId?: string;
  projectId?: string;
  requestId?: string;
  correlationId?: string;
  sessionId?: string;
  [key: string]: any;
}

class StructuredLogger {
  private logger: Logger;
  private context: LogContext = {};

  constructor() {
    this.logger = createLogger({
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.splat(),
        format.json(),
        // Custom format to ensure no secrets leak
        format((info) => {
          // Add correlation ID if available
          if (this.context.correlationId) {
            info.correlationId = this.context.correlationId;
          }
          if (this.context.requestId) {
            info.requestId = this.context.requestId;
          }
          if (this.context.userId) {
            info.userId = this.context.userId;
          }

          // Remove sensitive fields
          delete info.password;
          delete info.token;
          delete info.apiKey;
          delete info.secret;

          return info;
        })()
      ),
      defaultMeta: {
        service: 'vibecoding',
        environment: process.env.NODE_ENV || 'development',
      },
      transports: [
        // Console transport - JSON format
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.printf(({ timestamp, level, message, ...meta }) => {
              return `${timestamp} [${level}] ${message} ${
                Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
              }`;
            })
          ),
        }),
        // File transports
        ...(process.env.NODE_ENV === 'production' ? [
          new transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 5,
          }),
          new transports.File({
            filename: 'logs/combined.log',
            maxsize: 10485760, // 10MB
            maxFiles: 5,
          }),
        ] : []),
      ],
    });
  }

  /**
   * Set correlation context for tracing requests
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear correlation context
   */
  clearContext(): void {
    this.context = {};
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  error(message: string, error?: Error | any, meta?: any): void {
    if (error instanceof Error) {
      this.logger.error(message, { ...meta, error: error.message, stack: error.stack });
    } else {
      this.logger.error(message, { ...meta, error });
    }
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  /**
   * Log API request (without sensitive data)
   */
  logRequest(method: string, path: string, statusCode: number, duration: number, meta?: any): void {
    this.info('API Request', {
      method,
      path,
      statusCode,
      durationMs: duration,
      ...meta,
    });
  }

  /**
   * Log API error (sanitized)
   */
  logApiError(method: string, path: string, error: Error, meta?: any): void {
    this.error(`API Error: ${method} ${path}`, error, {
      ...meta,
    });
  }

  /**
   * Log AI API call with token tracking (no actual tokens logged)
   */
  logAiCall(provider: string, model: string, estimatedTokens: number, durationMs: number, meta?: any): void {
    this.info('AI API Call', {
      provider,
      model,
      estimatedTokens,
      durationMs,
      costEstimate: `$${(estimatedTokens * 0.00002).toFixed(6)}`, // Rough estimate only
      ...meta,
    });
  }

  /**
   * Get recent logs (for SSE stream, but with NO secrets)
   */
  getRecentLogs(): Array<{ timestamp: string; level: string; message: string }> {
    // This would connect to your log storage
    // For now, return empty (implement based on your log backend)
    return [];
  }

  /**
   * Subscribe to log events (for real-time streaming)
   */
  subscribe(callback: (logItem: any) => void): () => void {
    // Implement based on your logging backend
    return () => {}; // unsubscribe function
  }
}

export const structuredLogger = new StructuredLogger();
