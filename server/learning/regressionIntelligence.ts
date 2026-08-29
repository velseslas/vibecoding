import { UserIntentType, RiskLevel } from '../intent/intentEngine';
import { ApplicationGraph } from '../analysis/appMap';
import { IntelligenceIncident, RegressionWarning, IncidentSeverity } from './bugIntelligenceTypes';
import { logger } from '../logger';

export class RegressionIntelligenceService {
  private historicalIncidents: IntelligenceIncident[] = [];

  public registerHistoricalIncident(incident: IntelligenceIncident): void {
    this.historicalIncidents.push(incident);
  }

  /**
   * Evaluates if a proposed modification risks re-introducing a past regression
   */
  public evaluateRegressionRisk(
    projectId: string,
    intent: UserIntentType,
    prompt: string,
    graph: ApplicationGraph,
    existingHtml: string
  ): {
    hasRegressionRisk: boolean;
    warnings: RegressionWarning[];
    recommendedExtraPlanSteps: string[];
    riskAdjustment?: RiskLevel;
  } {
    const lower = prompt.toLowerCase();
    const warnings: RegressionWarning[] = [];
    const recommendedExtraPlanSteps: string[] = [];

    // Filter project & global historical incidents
    const relevantIncidents = this.historicalIncidents.filter(
      (i) => i.projectId === projectId || i.recurrenceCount > 1
    );

    // 1. Check for Recurring Icon / Lucide Regressions
    const hasLucidePastIncident = relevantIncidents.some(
      (i) => i.fingerprint.includes('lucide') || i.category === 'DEPENDENCY'
    );
    if (hasLucidePastIncident && (lower.includes('icône') || lower.includes('icone') || lower.includes('icon') || lower.includes('lucide'))) {
      warnings.push({
        fingerprint: 'fp_dependency_lucide',
        description: 'Risque de régression historique sur le chargement du CDN Lucide Icons ou l\'appel à createIcons().',
        severity: 'MEDIUM',
        previousIncidentId: relevantIncidents.find((i) => i.fingerprint.includes('lucide'))?.id || 'inc_hist_01',
        recommendedSafeguards: [
          'Vérifier la présence explicite du script https://unpkg.com/lucide@latest',
          'Conserver l\'appel lucide.createIcons() dans un écouteur DOMContentLoaded',
        ],
        requiredExtraPlanSteps: ['Vérification de la conformité du bundle d\'icônes Lucide'],
      });
      recommendedExtraPlanSteps.push('🛡️ Vérification de non-régression sur le CDN d\'icônes');
    }

    // 2. Check for Critical Component Deletion Regressions
    const hasDeletionPastIncident = relevantIncidents.some(
      (i) => i.category === 'ROLLBACK' || i.severity === 'CRITICAL'
    );
    if ((hasDeletionPastIncident || lower.includes('supprime') || lower.includes('delete')) && (lower.includes('auth') || lower.includes('base') || lower.includes('tout'))) {
      warnings.push({
        fingerprint: 'fp_critical_deletion',
        description: 'Opération destructrice à fort risque de régression sur les fonctionnalités critiques.',
        severity: 'CRITICAL',
        previousIncidentId: 'inc_hist_critical_02',
        recommendedSafeguards: [
          'Prendre un snapshot de sécurité pré-exécution obligatoire',
          'Vérifier la présence des composants protégés avant confirmation',
        ],
        requiredExtraPlanSteps: ['Snapshot Pré-Exécution et Point de Restauration'],
      });
      recommendedExtraPlanSteps.push('📸 Capture du Snapshot de Sécurité Pré-Exécution');
    }

    // 3. Check for DOM Null Selector Regressions
    const hasNullDomIncident = relevantIncidents.some((i) => i.fingerprint.includes('dom_null'));
    if (hasNullDomIncident && (lower.includes('bouton') || lower.includes('formulaire') || lower.includes('click') || lower.includes('modal'))) {
      warnings.push({
        fingerprint: 'fp_runtime_dom_null',
        description: 'Risque de régression sur les écouteurs d\'événements DOM orphelins (null pointer).',
        severity: 'MEDIUM',
        previousIncidentId: 'inc_hist_dom_03',
        recommendedSafeguards: [
          'Utiliser le chaînage optionnel element?.addEventListener()',
          'Tester l\'existence de l\'élément cible avant l\'exécution',
        ],
        requiredExtraPlanSteps: ['Vérification d\'intégrité des sélecteurs DOM'],
      });
      recommendedExtraPlanSteps.push('🔍 Audit statique de l\'existence des sélecteurs DOM');
    }

    const hasRegressionRisk = warnings.length > 0;
    let riskAdjustment: RiskLevel | undefined = undefined;
    if (warnings.some((w) => w.severity === 'CRITICAL')) {
      riskAdjustment = 'CRITICAL';
    } else if (warnings.some((w) => w.severity === 'HIGH')) {
      riskAdjustment = 'HIGH';
    }

    if (hasRegressionRisk) {
      logger.warn(
        'RegressionIntelligence',
        `Detected ${warnings.length} regression risk(s) for prompt "${prompt.substring(0, 30)}"`
      );
    }

    return {
      hasRegressionRisk,
      warnings,
      recommendedExtraPlanSteps,
      riskAdjustment,
    };
  }
}

export const regressionIntelligenceService = new RegressionIntelligenceService();
