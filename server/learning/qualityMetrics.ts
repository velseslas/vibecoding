import { dbAdapter } from '../db/database';
import { DbProjectLearningMetrics } from '../db/schema';
import { logger } from '../logger';

export interface QualityEvent {
  projectId: string;
  type:
    | 'INTENT_CORRECT'
    | 'CLARIFICATION_TRIGGERED'
    | 'PLAN_SUCCESS'
    | 'MODIFICATION_SUCCESS'
    | 'BUILD_SUCCESS'
    | 'BUILD_FAILED'
    | 'PREVIEW_SUCCESS'
    | 'PREVIEW_FAILED'
    | 'AUTO_REPAIR_SUCCESS'
    | 'USER_REJECTED'
    | 'ROLLBACK_TRIGGERED';
}

export class QualityMetricsTracker {
  /**
   * Retrieves or initializes metrics for a project
   */
  public getMetrics(projectId: string): DbProjectLearningMetrics {
    const existing = dbAdapter.getProjectLearningMetrics(projectId);
    if (existing) return existing;

    const initial: DbProjectLearningMetrics = {
      projectId,
      intentAccuracy: 0.95,
      clarificationRate: 0.08,
      planSuccessRate: 0.98,
      modificationSuccessRate: 0.94,
      buildSuccessRate: 0.99,
      previewSuccessRate: 0.97,
      autoRepairSuccessRate: 0.92,
      userRejectionRate: 0.02,
      rollbackRate: 0.01,
      totalInteractions: 1,
      successfulGenerations: 1,
      updatedAt: Date.now(),
    };

    dbAdapter.saveProjectLearningMetrics(initial);
    return initial;
  }

  /**
   * Records a concrete event and adjusts project learning scores
   */
  public recordEvent(event: QualityEvent): DbProjectLearningMetrics {
    const metrics = this.getMetrics(event.projectId);
    metrics.totalInteractions++;

    switch (event.type) {
      case 'INTENT_CORRECT':
        metrics.intentAccuracy = Number(Math.min(1, metrics.intentAccuracy * 0.98 + 0.02).toFixed(3));
        break;
      case 'CLARIFICATION_TRIGGERED':
        metrics.clarificationRate = Number((metrics.clarificationRate * 0.9 + 0.1).toFixed(3));
        break;
      case 'PLAN_SUCCESS':
        metrics.planSuccessRate = Number(Math.min(1, metrics.planSuccessRate * 0.98 + 0.02).toFixed(3));
        break;
      case 'MODIFICATION_SUCCESS':
      case 'BUILD_SUCCESS':
        metrics.successfulGenerations++;
        metrics.buildSuccessRate = Number(Math.min(1, metrics.buildSuccessRate * 0.98 + 0.02).toFixed(3));
        metrics.modificationSuccessRate = Number(Math.min(1, metrics.modificationSuccessRate * 0.98 + 0.02).toFixed(3));
        break;
      case 'BUILD_FAILED':
        metrics.buildSuccessRate = Number(Math.max(0.5, metrics.buildSuccessRate * 0.95).toFixed(3));
        break;
      case 'PREVIEW_SUCCESS':
        metrics.previewSuccessRate = Number(Math.min(1, metrics.previewSuccessRate * 0.98 + 0.02).toFixed(3));
        break;
      case 'PREVIEW_FAILED':
        metrics.previewSuccessRate = Number(Math.max(0.5, metrics.previewSuccessRate * 0.95).toFixed(3));
        break;
      case 'AUTO_REPAIR_SUCCESS':
        metrics.autoRepairSuccessRate = Number(Math.min(1, metrics.autoRepairSuccessRate * 0.95 + 0.05).toFixed(3));
        break;
      case 'USER_REJECTED':
        metrics.userRejectionRate = Number((metrics.userRejectionRate * 0.9 + 0.1).toFixed(3));
        break;
      case 'ROLLBACK_TRIGGERED':
        metrics.rollbackRate = Number((metrics.rollbackRate * 0.9 + 0.1).toFixed(3));
        break;
    }

    metrics.updatedAt = Date.now();
    dbAdapter.saveProjectLearningMetrics(metrics);
    return metrics;
  }
}

export const qualityMetricsTracker = new QualityMetricsTracker();
