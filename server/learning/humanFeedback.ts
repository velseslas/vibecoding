import crypto from 'crypto';
import { HumanFeedback } from './bugIntelligenceTypes';
import { logger } from '../logger';

export class HumanFeedbackService {
  private feedbackList: HumanFeedback[] = [];

  public recordFeedback(feedback: Omit<HumanFeedback, 'id' | 'timestamp'>): HumanFeedback {
    const record: HumanFeedback = {
      id: 'fb_' + crypto.randomBytes(5).toString('hex'),
      ...feedback,
      timestamp: Date.now(),
    };

    this.feedbackList.push(record);
    logger.info(
      'HumanFeedback',
      `Feedback recorded [${record.rating}] for project ${record.projectId} (${record.category || 'GENERAL'})`
    );

    return record;
  }

  public getProjectFeedback(projectId: string): HumanFeedback[] {
    return this.feedbackList.filter((f) => f.projectId === projectId);
  }

  public getAllFeedback(): HumanFeedback[] {
    return [...this.feedbackList];
  }

  public getSatisfactionRate(): number {
    if (this.feedbackList.length === 0) return 1.0;
    const positive = this.feedbackList.filter(
      (f) => f.rating === 'THUMBS_UP' || f.rating === 'HELPFUL'
    ).length;
    return Number((positive / this.feedbackList.length).toFixed(3));
  }
}

export const humanFeedbackService = new HumanFeedbackService();
