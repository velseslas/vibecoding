/**
 * Authentication Middleware - Production Grade
 * CRITICAL: Never bypass auth in production environments
 */

import { Request, Response, NextFunction } from 'express';
import { authStore } from '../authStore';
import { structuredLogger } from '../logging/structuredLogger';

/**
 * Require authentication - MUST HAVE valid token
 * CRITICAL: Always enforced in production
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const isProduction = process.env.NODE_ENV === 'production';
  const clerkEnabled = process.env.CLERK_ENABLED === 'true';

  // PRODUCTION ENFORCEMENT: Auth is ALWAYS required
  if (isProduction && !clerkEnabled) {
    structuredLogger.error('AUTH_BYPASS_ATTEMPT', 
      new Error('CRITICAL: CLERK_ENABLED=false in production environment')
    );
    return res.status(500).json({
      success: false,
      error: 'Server misconfiguration: Authentication is required',
      code: 'AUTH_MISCONFIGURED',
    });
  }

  const token = 
    req.headers.authorization?.replace('Bearer ', '').trim() ||
    (req.headers['x-clerk-auth-token'] as string);

  if (!token) {
    structuredLogger.warn('AUTH_MISSING_TOKEN', { path: req.path });
    return res.status(401).json({
      success: false,
      error: 'Authentication token required',
      code: 'MISSING_TOKEN',
    });
  }

  try {
    const user = await authStore.getUserByToken(token);
    
    if (!user) {
      structuredLogger.warn('AUTH_INVALID_TOKEN', { path: req.path });
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired authentication token',
        code: 'INVALID_TOKEN',
      });
    }

    // Attach user to request
    (req as any).user = user;
    structuredLogger.setContext({ userId: user.uid });

    next();
  } catch (error: any) {
    structuredLogger.error('AUTH_ERROR', error, { path: req.path });
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_ERROR',
    });
  }
}

/**
 * Optional authentication - Valid token will be attached if present
 * But request proceeds without it
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token = 
    req.headers.authorization?.replace('Bearer ', '').trim() ||
    (req.headers['x-clerk-auth-token'] as string);

  if (token) {
    try {
      const user = await authStore.getUserByToken(token);
      if (user) {
        (req as any).user = user;
        structuredLogger.setContext({ userId: user.uid });
      }
    } catch (error) {
      // Silently ignore invalid tokens for optional auth
      // User will remain unauthenticated
    }
  }

  next();
}

/**
 * Validate user has required tier/plan
 */
export function requirePlan(...plans: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!plans.includes(user.plan)) {
      structuredLogger.warn('AUTH_PLAN_INSUFFICIENT', {
        userId: user.uid,
        requiredPlan: plans.join('|'),
        userPlan: user.plan,
      });

      return res.status(403).json({
        success: false,
        error: `This feature requires one of these plans: ${plans.join(', ')}`,
        requiredPlan: plans,
        userPlan: user.plan,
      });
    }

    next();
  };
}

/**
 * Rate limit by user ID (not IP)
 */
export function rateLimitByUser(maxRequests: number, windowMs: number) {
  const userLimits: Map<string, { count: number; resetTime: number }> = new Map();

  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    const identifier = user?.uid || 'anonymous';

    const now = Date.now();
    const userLimit = userLimits.get(identifier);

    if (!userLimit || now > userLimit.resetTime) {
      // Reset window
      userLimits.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    userLimit.count++;

    if (userLimit.count > maxRequests) {
      const resetIn = Math.ceil((userLimit.resetTime - now) / 1000);
      structuredLogger.warn('RATE_LIMIT_EXCEEDED', {
        userId: identifier,
        limit: maxRequests,
        windowSeconds: Math.ceil(windowMs / 1000),
      });

      return res.status(429).json({
        success: false,
        error: `Rate limit exceeded. Try again in ${resetIn} seconds`,
        retryAfter: resetIn,
        limit: maxRequests,
        window: windowMs,
      });
    }

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - userLimit.count);
    res.setHeader('X-RateLimit-Reset', userLimit.resetTime);

    next();
  };
}
