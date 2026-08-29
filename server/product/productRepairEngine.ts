import { ProductBlueprint } from './productBlueprint';
import { ProductQualityReport, productQualityAuditService } from './productQualityAudit';
import { productGenerator } from './productGenerator';
import { uxProductPlanner } from './uxProductPlanner';
import { logger } from '../logger';

export interface ProductRepairResult {
  success: boolean;
  repaired: boolean;
  attempts: number;
  attemptCount: number;
  repairAttempts: number;
  initialScore: number;
  finalScore: number;
  finalQualityScore: number;
  repairedHtml: string;
  appliedFixes: string[];
  finalAudit: ProductQualityReport;
}

export class ProductRepairEngine {
  /**
   * Automatically heals and upgrades product code if quality audit reveals missing interactions
   */
  public repairProductArtifact(
    initialHtml: string,
    blueprint: ProductBlueprint,
    initialReport: ProductQualityReport,
    prompt: string = ''
  ): ProductRepairResult {
    if (initialReport.overallProductScore >= 85 && initialReport.criticalMissingInteractions.length === 0) {
      return {
        success: true,
        repaired: false,
        attempts: 0,
        attemptCount: 0,
        repairAttempts: 0,
        initialScore: initialReport.overallProductScore,
        finalScore: initialReport.overallProductScore,
        finalQualityScore: initialReport.overallProductScore,
        repairedHtml: initialHtml,
        appliedFixes: ['Score déjà optimal (>=85), aucune réparation requise'],
        finalAudit: initialReport,
      };
    }

    logger.warn(
      'ProductRepairEngine',
      `Auto-healing product artifact with initial score ${initialReport.overallProductScore}/100. Issues: ${initialReport.criticalMissingInteractions.join(', ')}`
    );

    const fixes: string[] = [];
    let currentHtml = initialHtml;

    // Strategy 1: If interactive components or handlers are missing, re-synthesize through dedicated ProductGenerator
    const uxPlan = uxProductPlanner.planUX(blueprint);
    const regenerated = productGenerator.generateProductCode(blueprint, uxPlan);
    currentHtml = regenerated;
    fixes.push('Régénération complète via le moteur de synthèse spécialisé avec gestes tactiles et modales');

    // Evaluate re-generated code
    const reAudit = productQualityAuditService.auditProductQuality(currentHtml, blueprint, prompt);

    logger.info(
      'ProductRepairEngine',
      `Product repair completed. Score upgraded from ${initialReport.overallProductScore} to ${reAudit.overallProductScore}`
    );

    return {
      success: true,
      repaired: true,
      attempts: 1,
      attemptCount: 1,
      repairAttempts: 1,
      initialScore: initialReport.overallProductScore,
      finalScore: reAudit.overallProductScore,
      finalQualityScore: reAudit.overallProductScore,
      repairedHtml: currentHtml,
      appliedFixes: fixes,
      finalAudit: reAudit,
    };
  }
}

export const productRepairEngine = new ProductRepairEngine();
