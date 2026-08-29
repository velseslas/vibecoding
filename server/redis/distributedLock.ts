import crypto from 'crypto';
import { redisClient } from './redisClient';
import { logger } from '../logger';

export interface LockHandle {
  resource: string;
  token: string;
  fencingToken: number; // Monotonically increasing fencing sequence
  acquiredAt: number;
  ttlMs: number;
  heartbeatTimer?: NodeJS.Timeout;
}

export interface AcquireLockOptions {
  ttlMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  failClosedOnDisconnect?: boolean; // When true, fails immediately if Redis is unreachable (e.g. for billing/credit ops)
}

export class DistributedLockService {
  private globalFencingCounter = 1000;

  public async acquireLock(
    resource: string,
    ttlMs = 10000,
    options: AcquireLockOptions = {}
  ): Promise<LockHandle | null> {
    const maxRetries = options.maxRetries ?? 5;
    const retryDelayMs = options.retryDelayMs ?? 200;
    const failClosed = options.failClosedOnDisconnect ?? false;

    // Check Redis connectivity health
    const health = redisClient.getHealth();
    if (health.status !== 'connected') {
      if (failClosed) {
        logger.error('Lock', `Fail-closed triggered: Redis disconnected while requesting critical lock on [${resource}]`);
        return null;
      }
      logger.warn('Lock', `Redis health is degraded during lock acquisition on [${resource}]`);
    }

    const token = 'lock_tok_' + crypto.randomBytes(16).toString('hex');
    const key = `lock:${resource}`;
    this.globalFencingCounter += 1;
    const fencingToken = this.globalFencingCounter;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const existing = await redisClient.get<string>(key);
        if (!existing) {
          // Acquire atomic lock with TTL
          await redisClient.set(key, token, Math.ceil(ttlMs / 1000));
          return {
            resource,
            token,
            fencingToken,
            acquiredAt: Date.now(),
            ttlMs,
          };
        }
      } catch (err: any) {
        if (failClosed) {
          logger.error('Lock', `Fail-closed triggered on error during lock on [${resource}]`, err);
          return null;
        }
      }
      // Exponential backoff jitter before retry
      const delay = retryDelayMs * Math.pow(1.2, attempt) + Math.random() * 50;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    logger.warn('Lock', `Failed to acquire distributed lock on resource ${resource} after ${maxRetries} attempts`);
    return null;
  }

  public async releaseLock(lock: LockHandle): Promise<boolean> {
    if (lock.heartbeatTimer) {
      clearInterval(lock.heartbeatTimer);
    }
    const key = `lock:${lock.resource}`;
    try {
      const currentToken = await redisClient.get<string>(key);
      if (currentToken === lock.token) {
        await redisClient.del(key);
        return true;
      }
    } catch (err) {
      logger.error('Lock', `Error releasing lock for ${lock.resource}`, err);
    }
    // Token mismatch or lock already expired
    return false;
  }

  public async renewLock(lock: LockHandle, extensionMs = 10000): Promise<boolean> {
    const key = `lock:${lock.resource}`;
    try {
      const currentToken = await redisClient.get<string>(key);
      if (currentToken === lock.token) {
        await redisClient.set(key, lock.token, Math.ceil(extensionMs / 1000));
        lock.ttlMs = extensionMs;
        lock.acquiredAt = Date.now();
        return true;
      }
    } catch (err) {
      logger.error('Lock', `Error renewing lock for ${lock.resource}`, err);
    }
    return false;
  }

  public startHeartbeat(lock: LockHandle, intervalMs = 3000, extensionMs = 10000): void {
    if (lock.heartbeatTimer) {
      clearInterval(lock.heartbeatTimer);
    }
    lock.heartbeatTimer = setInterval(async () => {
      const renewed = await this.renewLock(lock, extensionMs);
      if (!renewed) {
        logger.warn('Lock', `Heartbeat failed to renew lock on resource [${lock.resource}]`);
        if (lock.heartbeatTimer) clearInterval(lock.heartbeatTimer);
      }
    }, intervalMs);
  }

  public async withLock<T>(
    resource: string,
    ttlMs: number,
    fn: (lock: LockHandle) => Promise<T>,
    options: AcquireLockOptions = {}
  ): Promise<T> {
    const lock = await this.acquireLock(resource, ttlMs, options);
    if (!lock) {
      throw new Error(`Ressource occupée (${resource}). Verrou distribué indisponible.`);
    }

    // Auto heartbeat for long-running locks > 5000ms
    if (ttlMs >= 5000) {
      this.startHeartbeat(lock, Math.floor(ttlMs / 2), ttlMs);
    }

    try {
      return await fn(lock);
    } finally {
      await this.releaseLock(lock);
    }
  }
}

export const distributedLock = new DistributedLockService();
