import crypto from 'crypto';
import { EventEmitter } from 'events';
import { dbAdapter } from '../db/database';
import { DbJobRecord } from '../db/schema';
import { logger } from '../logger';
import { config } from '../config';

export type JobType = 'generate_app' | 'iterate_app' | 'export_zip' | 'deploy_app' | 'analyze_code';

export interface JobDefinition<TPayload = any, TResult = any> {
  id: string;
  type: JobType;
  userId?: string;
  projectId?: string;
  priority: number; // 1-10
  payload: TPayload;
  handler?: (job: DbJobRecord) => Promise<TResult>;
}

export class DistributedJobQueue extends EventEmitter {
  private queue: DbJobRecord[] = [];
  private activeWorkers = 0;
  private maxConcurrency: number;
  private handlers: Map<JobType, (job: DbJobRecord) => Promise<any>> = new Map();
  private isRunning = true;
  private watchdogInterval: NodeJS.Timeout | null = null;
  private cancellationTokens: Set<string> = new Set();

  constructor(concurrency = config.workerConcurrency) {
    super();
    this.maxConcurrency = concurrency;
    this.initCrashRecovery();
    this.startWatchdog();
  }

  private initCrashRecovery() {
    // Restore jobs from database that were pending or processing before crash
    const allDbJobs = dbAdapter.getAllJobs();
    const interrupted = allDbJobs.filter((j) => j.status === 'processing' || j.status === 'pending');

    for (const job of interrupted) {
      if (job.status === 'processing') {
        logger.warn('JobQueue', `Crash recovery: Re-queuing interrupted job ${job.id}`);
        job.status = 'pending';
        job.retryCount += 1;
        dbAdapter.saveJob(job);
      }
      this.queue.push(job);
    }

    this.sortQueue();
    this.processNext();
  }

  private startWatchdog() {
    this.watchdogInterval = setInterval(() => {
      const now = Date.now();
      const allJobs = dbAdapter.getAllJobs();
      for (const job of allJobs) {
        if (job.status === 'processing' && job.startedAt && now - job.startedAt > config.jobTimeoutMs) {
          logger.error('JobQueue', `Job ${job.id} timed out after ${config.jobTimeoutMs}ms (Zombie watchdog)`, undefined, { jobId: job.id });
          this.failJob(job, new Error(`Execution timed out after ${config.jobTimeoutMs / 1000}s`));
        }
      }
    }, 15000);
  }

  public registerHandler<TPayload = any, TResult = any>(
    type: JobType,
    handler: (job: DbJobRecord) => Promise<TResult>
  ) {
    this.handlers.set(type, handler);
  }

  public async addJob<TPayload = any, TResult = any>(
    type: JobType,
    payload: TPayload,
    options: {
      userId?: string;
      projectId?: string;
      priority?: number;
      maxRetries?: number;
    } = {}
  ): Promise<DbJobRecord> {
    const jobId = 'job_' + crypto.randomBytes(6).toString('hex');
    const jobRecord: DbJobRecord = {
      id: jobId,
      type,
      userId: options.userId || 'usr_admin_001',
      projectId: options.projectId,
      status: 'pending',
      priority: options.priority || 5,
      progress: 0,
      payload,
      retryCount: 0,
      maxRetries: options.maxRetries ?? 2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    dbAdapter.saveJob(jobRecord);
    this.queue.push(jobRecord);
    this.sortQueue();

    logger.info('JobQueue', `Job added to queue: ${jobId} [${type}] (Priority: ${jobRecord.priority})`, undefined, { jobId });
    this.emit('job:added', jobRecord);

    setImmediate(() => this.processNext());
    return jobRecord;
  }

  public cancelJob(jobId: string): boolean {
    this.cancellationTokens.add(jobId);
    const job = dbAdapter.getJob(jobId);
    if (!job) return false;

    if (job.status === 'pending') {
      this.queue = this.queue.filter((j) => j.id !== jobId);
      job.status = 'failed';
      job.error = 'Job cancelled by user';
      job.completedAt = Date.now();
      dbAdapter.saveJob(job);
      return true;
    }

    return true;
  }

  private sortQueue() {
    this.queue.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.createdAt - b.createdAt;
    });
  }

  private async processNext() {
    if (!this.isRunning || this.activeWorkers >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    if (!job) return;

    if (this.cancellationTokens.has(job.id)) {
      this.cancellationTokens.delete(job.id);
      logger.info('JobQueue', `Skipping cancelled job ${job.id}`);
      return this.processNext();
    }

    this.activeWorkers += 1;
    job.status = 'processing';
    job.startedAt = Date.now();
    job.updatedAt = Date.now();
    dbAdapter.saveJob(job);
    this.emit('job:processing', job);

    const handler = this.handlers.get(job.type as JobType);

    if (!handler) {
      logger.error('JobQueue', `No worker handler registered for job type ${job.type}`, undefined, { jobId: job.id });
      this.failJob(job, new Error(`Handler introuvable pour le type ${job.type}`));
      this.activeWorkers -= 1;
      return this.processNext();
    }

    try {
      logger.info('JobQueue', `Worker executing job ${job.id} [${job.type}]`, undefined, { jobId: job.id });
      const result = await handler(job);

      if (this.cancellationTokens.has(job.id)) {
        this.cancellationTokens.delete(job.id);
        job.status = 'failed';
        job.error = 'Job cancelled during execution';
      } else {
        job.status = 'completed';
        job.progress = 100;
        job.result = result;
        job.completedAt = Date.now();
        job.updatedAt = Date.now();
      }

      dbAdapter.saveJob(job);
      this.emit('job:completed', job);
      logger.info('JobQueue', `Job ${job.id} completed successfully in ${Date.now() - (job.startedAt || 0)}ms`, undefined, { jobId: job.id });
    } catch (err: any) {
      await this.handleJobFailure(job, err);
    } finally {
      this.activeWorkers = Math.max(0, this.activeWorkers - 1);
      setImmediate(() => this.processNext());
    }
  }

  private async handleJobFailure(job: DbJobRecord, err: Error) {
    logger.warn('JobQueue', `Job ${job.id} failed attempt ${job.retryCount + 1}/${job.maxRetries + 1}: ${err.message}`, undefined, { jobId: job.id });

    if (job.retryCount < job.maxRetries) {
      job.retryCount += 1;
      job.status = 'pending';
      job.error = err.message;
      job.updatedAt = Date.now();
      dbAdapter.saveJob(job);

      // Exponential backoff with jitter
      const backoffMs = Math.pow(2, job.retryCount) * 1000 + Math.random() * 500;
      setTimeout(() => {
        this.queue.push(job);
        this.sortQueue();
        this.processNext();
      }, backoffMs);
    } else {
      this.failJob(job, err);
    }
  }

  private failJob(job: DbJobRecord, err: Error) {
    job.status = 'dead_letter'; // Sent to Dead Letter Queue (DLQ)
    job.error = err.message;
    job.completedAt = Date.now();
    job.updatedAt = Date.now();
    dbAdapter.saveJob(job);
    this.emit('job:failed', job);
    logger.error('JobQueue', `Job ${job.id} permanently failed and moved to Dead Letter Queue (DLQ)`, err, undefined, { jobId: job.id });
  }

  public getStats() {
    const all = dbAdapter.getAllJobs();
    return {
      activeWorkers: this.activeWorkers,
      maxConcurrency: this.maxConcurrency,
      pendingCount: this.queue.length,
      processingCount: this.activeWorkers,
      completedCount: all.filter((j) => j.status === 'completed').length,
      failedCount: all.filter((j) => j.status === 'failed' || j.status === 'dead_letter').length,
      dlqCount: all.filter((j) => j.status === 'dead_letter').length,
    };
  }

  public getJob(id: string): DbJobRecord | undefined {
    return dbAdapter.getJob(id);
  }
}

export const distributedJobQueue = new DistributedJobQueue();
