/**
 * Request Tracking Middleware
 * Adds correlation IDs and request context for end-to-end tracing
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { structuredLogger } from '../logging/structuredLogger';

/**
 * Generate or extract correlation ID
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const correlationId = 
    req.get('x-correlation-id') || 
    req.get('x-request-id') || 
    uuidv4();

  (req as any).correlationId = correlationId;
  (req as any).requestId = uuidv4();
  (req as any).startTime = Date.now();

  // Add to response headers
  res.setHeader('X-Correlation-ID', correlationId);
  res.setHeader('X-Request-ID', (req as any).requestId);

  // Set in logger context
  structuredLogger.setContext({
    correlationId,
    requestId: (req as any).requestId,
  });

  // Log request
  structuredLogger.info('REQUEST_START', {
    method: req.method,
    path: req.path,
    userId: (req as any).user?.uid,
  });

  // Capture response end
  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = Date.now() - (req as any).startTime;

    structuredLogger.logRequest(
      req.method,
      req.path,
      res.statusCode,
      duration,
      {
        userId: (req as any).user?.uid,
        contentLength: data?.length || 0,
      }
    );

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Error tracking middleware
 */
export function errorTrackingMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const duration = Date.now() - (req as any).startTime;

  structuredLogger.logApiError(
    req.method,
    req.path,
    err,
    {
      userId: (req as any).user?.uid,
      durationMs: duration,
      statusCode: res.statusCode,
    }
  );

  // Send error response
  res.status(res.statusCode || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error'
      : err.message,
    requestId: (req as any).requestId,
    correlationId: (req as any).correlationId,
  });
}
