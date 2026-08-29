import { UserIntentType } from '../intent/intentEngine';
import { ProviderTaskType, AIProvider } from '../ai/aiProvider';
import { providerRegistry, ProviderConfig } from '../ai/providerRegistry';
import { aiCircuitRegistry } from '../ai/circuitBreaker';
import { logger } from '../logger';

export type AIAgentRole =
  | 'Intent_Agent'
  | 'Application_Analyst'
  | 'Context_Agent'
  | 'Impact_Agent'
  | 'Planner'
  | 'Frontend_UI_Agent'
  | 'Backend_Logic_Agent'
  | 'Data_Agent'
  | 'Security_Agent'
  | 'Validator'
  | 'Repair_Agent';

export interface OrchestrationMetrics {
  agentsInvoked: AIAgentRole[];
  totalDurationMs: number;
  estimatedTokens: number;
  estimatedCostUsd: number;
  success: boolean;
  error?: string;
  providerUsed?: string;
  modelUsed?: string;
  fellBack?: boolean;
}

export interface ProviderRoutingDecision {
  selectedProvider: AIProvider;
  fallbackProvider: AIProvider;
  config: ProviderConfig;
  rationale: string;
}

export class AIOrchestratorService {
  /**
   * Calculates the exact minimal subset of specialized agents to invoke based on request intent & context
   */
  public routeAgents(intent: UserIntentType, options?: { hasError?: boolean; isNewProject?: boolean }): AIAgentRole[] {
    // 1. Repair / Preview Bug Fix
    if (intent === 'PREVIEW_FIX' || intent === 'FIX_BUG' || options?.hasError) {
      return ['Intent_Agent', 'Context_Agent', 'Application_Analyst', 'Repair_Agent', 'Validator'];
    }

    // 2. Pure Explanations / Questions
    if (intent === 'EXPLAIN' || intent === 'QUESTION') {
      return ['Intent_Agent', 'Context_Agent', 'Application_Analyst'];
    }

    // 3. Destructive Deletion
    if (intent === 'DELETE') {
      return ['Intent_Agent', 'Application_Analyst', 'Impact_Agent', 'Security_Agent'];
    }

    // 4. Refactoring
    if (intent === 'REFACTOR') {
      return ['Intent_Agent', 'Application_Analyst', 'Impact_Agent', 'Frontend_UI_Agent', 'Validator'];
    }

    // 5. Create Feature / Full Application Generation
    if (intent === 'CREATE_FEATURE') {
      return ['Intent_Agent', 'Context_Agent', 'Application_Analyst', 'Planner', 'Frontend_UI_Agent', 'Backend_Logic_Agent', 'Security_Agent', 'Validator'];
    }

    // 6. Incremental Modification (Default)
    return ['Intent_Agent', 'Context_Agent', 'Application_Analyst', 'Impact_Agent', 'Frontend_UI_Agent', 'Validator'];
  }

  /**
   * Selects the optimal AI provider based on task type, availability, circuit breaker state, and cost/latency constraints
   */
  public selectProviderForTask(
    taskType: ProviderTaskType,
    options?: { preferredProviderId?: string; costSensitive?: boolean; lowLatency?: boolean }
  ): ProviderRoutingDecision {
    const { primary, fallback } = providerRegistry.getCandidateProviders(taskType, options?.preferredProviderId);
    const config = providerRegistry.getConfig(primary.id)!;

    let rationale = `Provider [${primary.id}] sélectionné (Priorité: ${config.priority}, Circuit: ${aiCircuitRegistry.getBreaker(primary.id).getState()})`;
    if (options?.preferredProviderId === primary.id) {
      rationale = `Préférence explicite utilisateur/configuration : [${primary.id}]`;
    }

    return {
      selectedProvider: primary,
      fallbackProvider: fallback,
      config,
      rationale,
    };
  }

  /**
   * Executes an AI operation via the centralized provider registry with circuit-breaker fallback & telemetry
   */
  public async executeTask<T>(
    taskType: ProviderTaskType,
    fn: (provider: AIProvider, config: ProviderConfig) => Promise<T>,
    options?: { preferredProviderId?: string; estimatedTokens?: number }
  ): Promise<{ result: T; usedProvider: string; fellBack: boolean; durationMs: number }> {
    return providerRegistry.executeWithRouting(taskType, fn, options);
  }

  /**
   * Tracks telemetry of agent orchestration execution
   */
  public computeMetrics(
    agents: AIAgentRole[],
    durationMs: number,
    totalTokens: number,
    success: boolean,
    error?: string,
    providerInfo?: { provider: string; model?: string; fellBack?: boolean }
  ): OrchestrationMetrics {
    // Blended cost estimate
    const estimatedCostUsd = Number(((totalTokens / 1_000_000) * 0.25).toFixed(6));

    return {
      agentsInvoked: agents,
      totalDurationMs: durationMs,
      estimatedTokens: totalTokens,
      estimatedCostUsd,
      success,
      error,
      providerUsed: providerInfo?.provider || 'gemini',
      modelUsed: providerInfo?.model || 'gemini-3.7-flash',
      fellBack: providerInfo?.fellBack || false,
    };
  }
}

export const aiOrchestratorService = new AIOrchestratorService();
