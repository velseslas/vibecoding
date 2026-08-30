/**
 * Security Headers Middleware
 * Implements production-grade security headers and CORS
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';

/**
 * Get allowed origins from environment
 * Default: only localhost in dev, specific domains in prod
 */
function getAllowedOrigins(): string[] {
  const env = process.env.ALLOWED_ORIGINS;
  if (env) {
    return env.split(',').map(o => o.trim());
  }

  // Development defaults
  if (process.env.NODE_ENV !== 'production') {
    return [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ];
  }

  // Production - no defaults, must be explicitly configured
  throw new Error(
    'ALLOWED_ORIGINS environment variable not set. ' +
    'Please configure allowed origins for production (comma-separated list)'
  );
}

/**
 * Production-grade CORS configuration
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const allowedOrigins = getAllowedOrigins();
  const origin = req.get('origin');

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type,Authorization,X-Requested-With,X-Idempotency-Key'
    );
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
}

/**
 * Enhanced Helmet configuration for production
 */
export function helmetMiddleware() {
  return helmet({
    // Content Security Policy - STRICT
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Only if needed for your app
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", process.env.ALLOWED_ORIGINS || 'http://localhost:3000'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    // Prevent framing (clickjacking protection)
    frameguard: { action: 'deny' },
    // HTTPS only
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    // Prevent MIME type sniffing
    noSniff: true,
    // Disable XSS filter (modern browsers handle it better)
    xssFilter: false,
    // Referrer policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // Cross-Origin-Embedder-Policy
    crossOriginEmbedderPolicy: true,
    // Permissions Policy (formerly Feature Policy)
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
      usb: [],
      magnetometer: [],
      gyroscope: [],
      accelerometer: [],
      payment: [],
    },
  });
}

/**
 * Request validation middleware
 * Ensures no suspicious patterns in requests
 */
export function requestValidationMiddleware(req: Request, res: Response, next: NextFunction) {
  // Reject requests with extremely large payloads
  if (req.body && JSON.stringify(req.body).length > 50 * 1024 * 1024) {
    return res.status(413).json({
      success: false,
      error: 'Payload too large',
    });
  }

  // Check for common injection patterns in query/params
  const checkString = (str: string): boolean => {
    const injectionPatterns = [
      /[\x00-\x1F]/g, // Control characters
      /script/i,
      /javascript:/i,
      /onerror=/i,
      /onclick=/i,
    ];
    return injectionPatterns.some(pattern => pattern.test(str));
  };

  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string' && checkString(value)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameter',
      });
    }
  }

  next();
}

/**
 * Security middleware stack
 */
export function setupSecurityMiddleware(app: any) {
  app.use(helmetMiddleware());
  app.use(corsMiddleware);
  app.use(requestValidationMiddleware);
}
