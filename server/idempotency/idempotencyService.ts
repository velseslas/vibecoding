import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { dbAdapter } from '../db/database';
import { logger } from '../logger';
import { prometheusExporter } from '../observability/prometheusExporter';

export class IdempotencyService {
  private ttlSeconds = 86400; // 24 hours

  public computeHash(body: any): string {
    const raw = typeof body === 'string' ? body : JSON.stringify(body || {});
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  public getRecord(key: string) {
    return dbAdapter.getIdempotencyRecord(key);
  }

  public saveRecord(key: string, requestPath: string, requestHash: string, responseStatus: number, responseBody: any, userId?: string) {
    dbAdapter.setIdempotencyRecord({
      key,
      userId,
      requestPath,
      requestHash,
      responseStatus,
      responseBody: typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody),
      createdAt: Date.now(),
      expiresAt: Date.now() + this.ttlSeconds * 1000,
    });
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Only protect state-changing methods (POST, PUT, DELETE, PATCH)
      if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
        return next();
      }

      const idempotencyKey = (req.headers['x-idempotency-key'] as string) || (req.body?.idempotencyKey as string);

      if (!idempotencyKey) {
        return next();
      }

      const requestHash = this.computeHash(req.body);
      const existing = this.getRecord(idempotencyKey);

      if (existing) {
        if (existing.requestHash !== requestHash) {
          prometheusExporter.recordIdempotencyConflict();
          return res.status(409).json({
            success: false,
            error: 'Idempotency conflict: payload differs from original request for this key',
          });
        }

        // Return cached original response
        prometheusExporter.recordIdempotencyHit();
        logger.info('Idempotency', `Replaying cached response for key ${idempotencyKey}`);
        res.setHeader('X-Idempotent-Replay', 'true');
        res.setHeader('X-Idempotency-Key', idempotencyKey);
        
        try {
          const parsed = JSON.parse(existing.responseBody);
          return res.status(existing.responseStatus).json(parsed);
        } catch {
          return res.status(existing.responseStatus).send(existing.responseBody);
        }
      }

      // Intercept res.json / res.send to store response on completion
      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);

      res.json = (body: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          this.saveRecord(idempotencyKey, req.path, requestHash, res.statusCode, body, (req as any).user?.id);
        }
        res.setHeader('X-Idempotency-Key', idempotencyKey);
        return originalJson(body);
      };

      res.send = (body: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          this.saveRecord(idempotencyKey, req.path, requestHash, res.statusCode, body, (req as any).user?.id);
        }
        res.setHeader('X-Idempotency-Key', idempotencyKey);
        return originalSend(body);
      };

      next();
    };
  }
}

export const idempotencyService = new IdempotencyService();
