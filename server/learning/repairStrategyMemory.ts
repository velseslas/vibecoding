import crypto from 'crypto';
import { RepairStrategy, IncidentCategory } from './bugIntelligenceTypes';
import { logger } from '../logger';

export class RepairStrategyMemory {
  private strategies: Map<string, RepairStrategy> = new Map();

  constructor() {
    this.seedDefaultStrategies();
  }

  private seedDefaultStrategies(): void {
    const defaults: Array<Omit<RepairStrategy, 'id' | 'createdAt' | 'lastValidatedAt'>> = [
      {
        incidentPattern: 'missing_dependency::lucide_icons',
        category: 'DEPENDENCY',
        strategyDescription: 'Injection de script CDN unpkg.com/lucide@latest et invocation de lucide.createIcons()',
        targetAction: 'INJECT_LUCIDE_CDN',
        successCount: 15,
        failureCount: 0,
        successRate: 1.0,
        averageAttempts: 1,
        scope: 'GLOBAL',
        status: 'ACTIVE',
      },
      {
        incidentPattern: 'missing_dependency::tailwindcss_cdn',
        category: 'DEPENDENCY',
        strategyDescription: 'Injection de script CDN cdn.tailwindcss.com dans le <head>',
        targetAction: 'INJECT_TAILWIND_CDN',
        successCount: 12,
        failureCount: 0,
        successRate: 1.0,
        averageAttempts: 1,
        scope: 'GLOBAL',
        status: 'ACTIVE',
      },
      {
        incidentPattern: 'dom_null_reference::element',
        category: 'RUNTIME',
        strategyDescription: 'Sécurisation des sélecteurs DOM avec optional chaining et vérification if (elem)',
        targetAction: 'GUARD_OPTIONAL_CHAINING',
        successCount: 18,
        failureCount: 1,
        successRate: 0.947,
        averageAttempts: 1.1,
        scope: 'GLOBAL',
        status: 'ACTIVE',
      },
      {
        incidentPattern: 'syntax_error::token_or_bracket_mismatch',
        category: 'CODE',
        strategyDescription: 'Équilibrage automatique des balises HTML et des accolades JavaScript',
        targetAction: 'EQUILIBRATE_SYNTAX_BRACKETS',
        successCount: 22,
        failureCount: 2,
        successRate: 0.916,
        averageAttempts: 1.2,
        scope: 'GLOBAL',
        status: 'ACTIVE',
      },
      {
        incidentPattern: 'reference_error::undefined_global_var',
        category: 'RUNTIME',
        strategyDescription: 'Déclaration d\'un objet de repli global window[var] = window[var] || {}',
        targetAction: 'DECLARE_SAFE_GLOBAL_FALLBACK',
        successCount: 9,
        failureCount: 1,
        successRate: 0.9,
        averageAttempts: 1.0,
        scope: 'GLOBAL',
        status: 'ACTIVE',
      },
    ];

    for (const def of defaults) {
      const id = 'strat_' + crypto.randomBytes(5).toString('hex');
      this.strategies.set(id, {
        id,
        ...def,
        createdAt: Date.now() - 86400000 * 5,
        lastValidatedAt: Date.now(),
      });
    }
  }

  /**
   * Retrieves prioritized candidate strategies for an error pattern
   */
  public getCandidateStrategies(
    pattern: string,
    category?: IncidentCategory,
    projectId?: string
  ): RepairStrategy[] {
    const list = Array.from(this.strategies.values()).filter((s) => s.status === 'ACTIVE');

    const matched = list.filter((s) => {
      if (s.scope === 'PROJECT' && s.projectId !== projectId) return false;
      if (s.incidentPattern === pattern) return true;
      if (pattern.includes(s.incidentPattern) || s.incidentPattern.includes(pattern)) return true;
      if (category && s.category === category) return true;
      return false;
    });

    // Sort by success rate desc, then by total success count desc
    return matched.sort((a, b) => {
      if (b.successRate !== a.successRate) return b.successRate - a.successRate;
      return b.successCount - a.successCount;
    });
  }

  /**
   * Records the outcome of a repair attempt
   */
  public recordStrategyOutcome(
    pattern: string,
    action: string,
    category: IncidentCategory,
    success: boolean,
    attemptsCount: number,
    projectId?: string
  ): RepairStrategy {
    let strategy = Array.from(this.strategies.values()).find(
      (s) => s.incidentPattern === pattern && s.targetAction === action
    );

    const now = Date.now();

    if (!strategy) {
      const id = 'strat_' + crypto.randomBytes(5).toString('hex');
      strategy = {
        id,
        incidentPattern: pattern,
        category,
        strategyDescription: `Stratégie automatique pour le pattern: ${pattern}`,
        targetAction: action,
        successCount: success ? 1 : 0,
        failureCount: success ? 0 : 1,
        successRate: success ? 1.0 : 0.0,
        averageAttempts: attemptsCount,
        scope: projectId ? 'PROJECT' : 'GLOBAL',
        projectId,
        lastValidatedAt: now,
        createdAt: now,
        status: success ? 'ACTIVE' : 'EXPERIMENTAL',
      };
      this.strategies.set(id, strategy);
    } else {
      if (success) {
        strategy.successCount++;
        strategy.lastValidatedAt = now;
      } else {
        strategy.failureCount++;
      }
      const total = strategy.successCount + strategy.failureCount;
      strategy.successRate = Number((strategy.successCount / total).toFixed(3));
      strategy.averageAttempts = Number(
        ((strategy.averageAttempts * (total - 1) + attemptsCount) / total).toFixed(2)
      );
      if (strategy.failureCount > 5 && strategy.successRate < 0.3) {
        strategy.status = 'DEPRECATED';
      }
    }

    logger.info(
      'RepairStrategyMemory',
      `Strategy [${strategy.targetAction}] for pattern [${pattern}]: SuccessRate=${strategy.successRate} (${strategy.successCount}/${strategy.successCount + strategy.failureCount})`
    );

    return strategy;
  }

  public getStrategyById(id: string): RepairStrategy | undefined {
    return this.strategies.get(id);
  }

  public getAllStrategies(): RepairStrategy[] {
    return Array.from(this.strategies.values());
  }
}

export const repairStrategyMemory = new RepairStrategyMemory();
