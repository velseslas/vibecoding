import { logger } from '../logger';

export interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
}

export class DistributedRedisClient {
  private cache: Map<string, CacheEntry> = new Map();
  private subscribers: Map<string, ((message: string) => void)[]> = new Map();
  private isConnected = true;
  private totalOperations = 0;
  private totalErrors = 0;

  constructor() {
    // Garbage collect expired keys periodically
    setInterval(() => this.cleanupExpired(), 30000);
  }

  public simulateDisconnect() {
    this.isConnected = false;
    logger.warn('Redis', 'Simulated Redis disconnection activated');
  }

  public simulateReconnect() {
    this.isConnected = true;
    logger.info('Redis', 'Simulated Redis reconnection completed');
  }

  private cleanupExpired() {
    if (!this.isConnected) return;
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt > 0 && entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  public async get<T = any>(key: string): Promise<T | null> {
    this.totalOperations++;
    if (!this.isConnected) {
      this.totalErrors++;
      throw new Error('Redis connection error: client is currently disconnected');
    }
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt > 0 && entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  public async set<T = any>(key: string, value: T, ttlSeconds = 0): Promise<boolean> {
    this.totalOperations++;
    if (!this.isConnected) {
      this.totalErrors++;
      throw new Error('Redis connection error: client is currently disconnected');
    }
    const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0;
    this.cache.set(key, { value, expiresAt });
    return true;
  }

  public async del(key: string): Promise<boolean> {
    this.totalOperations++;
    if (!this.isConnected) {
      this.totalErrors++;
      throw new Error('Redis connection error: client is currently disconnected');
    }
    return this.cache.delete(key);
  }

  public async incr(key: string, ttlSeconds = 60): Promise<number> {
    this.totalOperations++;
    if (!this.isConnected) {
      this.totalErrors++;
      throw new Error('Redis connection error: client is currently disconnected');
    }
    const current = (await this.get<number>(key).catch(() => 0)) || 0;
    const next = current + 1;
    await this.set(key, next, ttlSeconds);
    return next;
  }

  // Pub/Sub
  public subscribe(channel: string, callback: (message: string) => void) {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, []);
    }
    this.subscribers.get(channel)!.push(callback);
  }

  public publish(channel: string, message: string): number {
    this.totalOperations++;
    if (!this.isConnected) {
      this.totalErrors++;
      throw new Error('Redis connection error: client is currently disconnected');
    }
    const list = this.subscribers.get(channel) || [];
    list.forEach((cb) => {
      try {
        cb(message);
      } catch (err) {
        logger.error('Redis', 'PubSub callback execution failed', err);
      }
    });
    return list.length;
  }

  public getHealth() {
    return {
      status: this.isConnected ? 'connected' : 'disconnected',
      mode: 'cluster-distributed-memory-adapter',
      activeKeys: this.cache.size,
      activeChannels: this.subscribers.size,
      totalOperations: this.totalOperations,
      totalErrors: this.totalErrors,
    };
  }
}

export const redisClient = new DistributedRedisClient();
