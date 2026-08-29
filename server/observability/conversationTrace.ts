import crypto from 'crypto';
import { UserIntentType, RiskLevel } from '../intent/intentEngine';
import { ContextSourceType } from '../context/contextBroker';
import { logger } from '../logger';

export type ExecutionResultType =
  | 'SUCCESS'
  | 'FAILURE'
  | 'REPAIRED'
  | 'ROLLED_BACK'
  | 'CLARIFICATION'
  | 'WAITING_CONFIRMATION';

export interface ConversationTrace {
  requestId: string;
  conversationId: string;
  projectId: string;
  intent: UserIntentType;
  confidence: number;
  contextSources: ContextSourceType[];
  assumptionsDetected: string[];
  impactLevel: RiskLevel;
  planId?: string;
  decision?: string;
  artifactId?: string;
  artifactHash?: string;
  executionResult: ExecutionResultType;
  qualityScore: number;
  repairAttempts: number;
  durationMs: number;
  estimatedTokens: number;
  estimatedCostEur: number;
  timestamp: number;
  provider?: string;
  model?: string;
  fellBack?: boolean;
}

export class ConversationTraceService {
  private traces: ConversationTrace[] = [];

  public recordTrace(data: Omit<ConversationTrace, 'requestId' | 'timestamp' | 'estimatedCostEur'>): ConversationTrace {
    const requestId = 'req_' + crypto.randomBytes(6).toString('hex');
    // Compute estimated cost: €0.000002 per token
    const estimatedCostEur = Number((data.estimatedTokens * 0.000002).toFixed(6));

    const trace: ConversationTrace = {
      requestId,
      ...data,
      estimatedCostEur,
      timestamp: Date.now(),
    };

    this.traces.push(trace);
    if (this.traces.length > 500) {
      this.traces.shift();
    }

    logger.info(
      'ConversationTrace',
      `[${trace.intent}] Trace ${requestId} recorded: ${trace.executionResult} | Score: ${trace.qualityScore}/100 | Duration: ${trace.durationMs}ms | Tokens: ${trace.estimatedTokens}`
    );

    return trace;
  }

  public getProjectTraces(projectId: string): ConversationTrace[] {
    return this.traces.filter((t) => t.projectId === projectId);
  }

  public getAllTraces(): ConversationTrace[] {
    return [...this.traces];
  }

  public getRecentTrace(): ConversationTrace | undefined {
    return this.traces[this.traces.length - 1];
  }
}

export const conversationTraceService = new ConversationTraceService();
