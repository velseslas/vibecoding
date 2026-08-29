import { distributedJobQueue, JobType } from './queue/distributedJobQueue';
import { DbJobRecord } from './db/schema';

export interface QueuedJob {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';
  progress: number;
  priority: number;
  payload: any;
  result?: any;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

class JobQueueBridge {
  public getStats() {
    return distributedJobQueue.getStats();
  }

  public getJob(id: string): QueuedJob | undefined {
    const job = distributedJobQueue.getJob(id);
    if (!job) return undefined;
    return this.toJob(job);
  }

  public async addJob(type: JobType, payload: any, priority = 5): Promise<QueuedJob> {
    const record = await distributedJobQueue.addJob(type, payload, { priority });
    return this.toJob(record);
  }

  private toJob(r: DbJobRecord): QueuedJob {
    return {
      id: r.id,
      type: r.type,
      status: r.status,
      progress: r.progress,
      priority: r.priority,
      payload: r.payload,
      result: r.result,
      error: r.error,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }
}

export const jobQueue = new JobQueueBridge();
