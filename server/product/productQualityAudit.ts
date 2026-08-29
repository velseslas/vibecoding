import { ProductBlueprint } from './productBlueprint';
import { logger } from '../logger';

export interface ProductAuditDimension {
  name: string;
  score: number; // 0-100
  weight: number;
  status: 'OPTIMAL' | 'ACCEPTABLE' | 'DEFECTIVE';
  evidence: string;
}

export interface ProductQualityIssue {
  id: string;
  category: 'FIDELITY' | 'FUNCTIONAL' | 'JOURNEY' | 'INTERACTION' | 'ANTI_GENERIC' | 'RESPONSIVE' | 'UI_STATE';
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  recommendation?: string;
}

export interface RealProductScoreBreakdown {
  promptFidelity: number; // 0-15
  productCompleteness: number; // 0-15
  uxQuality: number; // 0-15
  interactionQuality: number; // 0-15
  visualQuality: number; // 0-15
  responsiveQuality: number; // 0-10
  designConsistency: number; // 0-5
  stateCompleteness: number; // 0-5
  technicalQuality: number; // 0-5
  totalScore: number; // 0-100
}

export interface AntiSlopChecks {
  zeroGenericBoilerplate: boolean;
  noMismatchedMetrics: boolean;
  noLoremIpsum: boolean;
  properColorThemes: boolean;
  noFakeStatsGrids: boolean;
}

export interface ProductQualityReport {
  overallScore: number; // 0-100
  overallProductScore: number; // 0-100
  realProductScore: number; // 0-100
  realProductScoreBreakdown: RealProductScoreBreakdown;
  passed: boolean;
  status: 'PASSED' | 'WARNING' | 'REPAIR_REQUIRED';
  promptFidelityScore: number;
  functionalCompletenessScore: number;
  userJourneyScore: number;
  uxQualityScore: number;
  interactionQualityScore: number;
  antiGenericDensityScore: number;
  responsiveScore: number;
  uiStatesScore: number;
  rubricScores: Record<string, number>;
  antiSlopChecks: AntiSlopChecks;
  dimensions: ProductAuditDimension[];
  criticalMissingInteractions: string[];
  recommendations: string[];
  issues: ProductQualityIssue[];
  blockingIssues: ProductQualityIssue[];
  auditedAt: number;
}

export class ProductQualityAuditService {
  /**
   * Evaluates if the generated artifact meets true Product & UX depth standards
   */
  public auditProductQuality(html: string, blueprint: ProductBlueprint, prompt: string): ProductQualityReport {
    const rawHtml = html || '';
    const rawLower = rawHtml.toLowerCase();
    const promptLower = (prompt || '').toLowerCase();

    const missingInteractions: string[] = [];
    const recommendations: string[] = [];
    const issues: ProductQualityIssue[] = [];

    // 1. Prompt & Archetype Fidelity
    let promptFidelity = 100;
    if (blueprint.archetype === 'DATING_APP') {
      if (!rawLower.includes('swipe') && !rawLower.includes('like') && !rawLower.includes('match')) {
        promptFidelity -= 40;
        missingInteractions.push('Interaction de swipe et like absente pour une app de rencontre');
        issues.push({
          id: 'issue_fidelity_dating',
          category: 'FIDELITY',
          severity: 'CRITICAL',
          message: 'Interaction de swipe et like absente pour une app de rencontre',
          recommendation: 'Ajouter les boutons de swipe like/pass et gestes tactiles',
        });
      }
    } else if (blueprint.archetype === 'SOCIAL_NETWORK') {
      if (!rawLower.includes('post') && !rawLower.includes('feed') && !rawLower.includes('publi') && !rawLower.includes('comment')) {
        promptFidelity -= 40;
        missingInteractions.push('Fil d\'actualité et zone de publication absents pour un réseau social');
        issues.push({
          id: 'issue_fidelity_social',
          category: 'FIDELITY',
          severity: 'CRITICAL',
          message: 'Fil d\'actualité ou zone de publication manquant sur un réseau social',
          recommendation: 'Ajouter les cartes de publications, barre de stories et modale de nouveau post',
        });
      }
    } else if (blueprint.archetype === 'PROJECT_MANAGEMENT') {
      if (!rawLower.includes('task') && !rawLower.includes('tâche') && !rawLower.includes('projet') && !rawLower.includes('chantier') && !rawLower.includes('kanban')) {
        promptFidelity -= 40;
        missingInteractions.push('Tableau de gestion de tâches ou chantiers absent');
        issues.push({
          id: 'issue_fidelity_project',
          category: 'FIDELITY',
          severity: 'CRITICAL',
          message: 'Gestionnaire de tâches / chantiers manquant',
        });
      }
    }

    // 2. Functional Completeness (Checking features in HTML)
    let functionalCompleteness = 100;
    let foundFeatures = 0;
    blueprint.features.forEach((feat) => {
      const featWords = feat.name.toLowerCase().split(' ').filter((w) => w.length > 3);
      const isPresent = featWords.some((w) => rawLower.includes(w));
      if (isPresent) foundFeatures++;
    });
    const featureRatio = blueprint.features.length > 0 ? foundFeatures / blueprint.features.length : 1;
    functionalCompleteness = Math.min(100, Math.round(featureRatio * 100));

    if (functionalCompleteness < 70) {
      issues.push({
        id: 'issue_feat_completeness',
        category: 'FUNCTIONAL',
        severity: 'WARNING',
        message: `Couverture fonctionnelle partielle (${foundFeatures}/${blueprint.features.length} fonctionnalités détectées)`,
      });
    }

    // 3. User Journey & Screen Completeness
    let userJourney = 100;
    let foundScreens = 0;
    blueprint.screens.forEach((screen) => {
      if (rawHtml.includes(screen.id) || rawLower.includes(screen.name.toLowerCase())) {
        foundScreens++;
      }
    });
    const screenRatio = blueprint.screens.length > 0 ? foundScreens / blueprint.screens.length : 1;
    userJourney = Math.min(100, Math.round(screenRatio * 100));

    // 4. Interaction Depth & Script Logic
    let interactionQuality = 100;
    const hasScript = rawHtml.includes('<script') && (rawHtml.includes('addEventListener') || rawHtml.includes('function '));
    const hasModals = rawHtml.includes('modal') || rawHtml.includes('drawer') || rawHtml.includes('dialog');
    const hasDynamicData = rawHtml.includes('const ') || rawHtml.includes('let ');

    if (!hasScript) {
      interactionQuality -= 50;
      missingInteractions.push('Aucun gestionnaire d\'événement JavaScript interactif détecté');
      issues.push({
        id: 'issue_missing_script',
        category: 'INTERACTION',
        severity: 'CRITICAL',
        message: 'Aucun gestionnaire d\'événement JavaScript interactif détecté',
      });
    }
    if (!hasModals && (blueprint.archetype === 'DATING_APP' || blueprint.archetype === 'SAAS_DASHBOARD')) {
      interactionQuality -= 20;
      missingInteractions.push('Modale de rétroaction (Match, Filtres ou Détails) manquante');
    }
    if (!hasDynamicData) {
      interactionQuality -= 20;
      missingInteractions.push('Absence de modèle de données dynamique avec seed data');
    }

    // 5. Anti-Generic Density (Penalizing generic placeholders disconnected from domain)
    let antiGenericDensity = 100;
    const hasGenericStats128 = rawHtml.includes('128') && (rawHtml.includes('Éléments Traités') || rawHtml.includes('Elements Traités'));
    const hasLoremIpsum = rawHtml.includes('Lorem ipsum') || rawHtml.includes('lorem ipsum');

    if (blueprint.archetype === 'DATING_APP' && (rawHtml.includes('Éléments Traités') || hasGenericStats128)) {
      antiGenericDensity -= 50;
      recommendations.push('Supprimer les métriques génériques de serveur sur l\'application de rencontre.');
      issues.push({
        id: 'issue_generic_dating_metrics',
        category: 'ANTI_GENERIC',
        severity: 'CRITICAL',
        message: 'Métriques génériques de serveur détectées sur l\'application de rencontre (AI Slop)',
      });
    }
    if (hasLoremIpsum) {
      antiGenericDensity -= 25;
      recommendations.push('Remplacer les faux textes génériques par du contenu réel ancré dans le domaine.');
      issues.push({
        id: 'issue_lorem_ipsum',
        category: 'ANTI_GENERIC',
        severity: 'WARNING',
        message: 'Texte d\'espace réservé générique Lorem Ipsum détecté',
      });
    }

    // Anti-slop checks summary
    const antiSlopChecks: AntiSlopChecks = {
      zeroGenericBoilerplate: antiGenericDensity >= 80,
      noMismatchedMetrics: !hasGenericStats128,
      noLoremIpsum: !hasLoremIpsum,
      properColorThemes: true,
      noFakeStatsGrids: !hasGenericStats128,
    };

    // 6. Responsive Fitness
    let responsive = 100;
    if (blueprint.responsiveStrategy === 'mobile_first') {
      if (!rawHtml.includes('max-w-md') && !rawHtml.includes('max-w-sm') && !rawHtml.includes('max-w-lg')) {
        responsive -= 20;
        recommendations.push('Encapsuler l\'application mobile-first dans un container centré de type smartphone.');
      }
    }

    // 7. UI States Handled (Empty, Active, Loading)
    let uiStates = 100;
    if (blueprint.archetype === 'DATING_APP' && !rawHtml.includes('empty-deck') && !rawHtml.includes('empty')) {
      uiStates -= 20;
      missingInteractions.push('État de fin de deck ("Plus de profils") manquant');
    }

    // UX Quality
    const uxQuality = Math.round((interactionQuality + responsive + promptFidelity) / 3);

    // Weighted Overall Product Score
    const overallProductScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          promptFidelity * 0.25 +
            functionalCompleteness * 0.2 +
            interactionQuality * 0.2 +
            antiGenericDensity * 0.15 +
            userJourney * 0.1 +
            responsive * 0.1
        )
      )
    );

    const overallScore = overallProductScore;
    const status: ProductQualityReport['status'] =
      overallProductScore >= 85 ? 'PASSED' : overallProductScore >= 70 ? 'WARNING' : 'REPAIR_REQUIRED';

    const blockingIssues = issues.filter((i) => i.severity === 'CRITICAL' || i.severity === 'ERROR');

    // If status is REPAIR_REQUIRED and no explicit blocking issue, create one from criticalMissingInteractions or low score
    if (status === 'REPAIR_REQUIRED' && blockingIssues.length === 0) {
      const msg = criticalMissingInteractionsText(missingInteractions, overallProductScore);
      const fallbackBlocking: ProductQualityIssue = {
        id: 'issue_blocking_overall',
        category: 'INTERACTION',
        severity: 'CRITICAL',
        message: msg,
      };
      issues.push(fallbackBlocking);
      blockingIssues.push(fallbackBlocking);
    }

    const passed = status === 'PASSED';

    const dimensions: ProductAuditDimension[] = [
      {
        name: 'Fidélité au Prompt & Pattern',
        score: promptFidelity,
        weight: 0.25,
        status: promptFidelity >= 85 ? 'OPTIMAL' : 'DEFECTIVE',
        evidence: `Score de fidélité ${promptFidelity}/100 sur l'archétype [${blueprint.archetype}]`,
      },
      {
        name: 'Complétude Fonctionnelle',
        score: functionalCompleteness,
        weight: 0.2,
        status: functionalCompleteness >= 80 ? 'OPTIMAL' : 'ACCEPTABLE',
        evidence: `${foundFeatures}/${blueprint.features.length} fonctionnalités clés identifiées dans le DOM`,
      },
      {
        name: 'Profondeur d\'Interaction',
        score: interactionQuality,
        weight: 0.2,
        status: interactionQuality >= 80 ? 'OPTIMAL' : 'DEFECTIVE',
        evidence: `Présence de scripts interactifs réactifs et de modales contextuelles`,
      },
      {
        name: 'Densité Anti-Générique',
        score: antiGenericDensity,
        weight: 0.15,
        status: antiGenericDensity >= 80 ? 'OPTIMAL' : 'DEFECTIVE',
        evidence: `Composants adaptés au domaine métier sans placeholders factices`,
      },
      {
        name: 'Cohérence du Parcours Utilisateur',
        score: userJourney,
        weight: 0.1,
        status: userJourney >= 80 ? 'OPTIMAL' : 'ACCEPTABLE',
        evidence: `${foundScreens}/${blueprint.screens.length} écrans/sections de parcours disponibles`,
      },
      {
        name: 'Adaptabilité Responsive',
        score: responsive,
        weight: 0.1,
        status: responsive >= 80 ? 'OPTIMAL' : 'ACCEPTABLE',
        evidence: `Stratégie de container [${blueprint.responsiveStrategy}] appliquée`,
      },
    ];

    const rubricScores = {
      promptFidelity,
      functionalCompleteness,
      interactionQuality,
      antiGenericDensity,
      userJourney,
      responsive,
      uxQuality,
    };

    // Calculate Real Product Score on 100-point rubric
    const promptFidPt = Number(((promptFidelity / 100) * 15).toFixed(1));
    const prodCompPt = Number(((functionalCompleteness / 100) * 15).toFixed(1));
    const uxQualPt = Number(((uxQuality / 100) * 15).toFixed(1));
    const interQualPt = Number(((interactionQuality / 100) * 15).toFixed(1));
    const visualQualPt = Number(((antiGenericDensity / 100) * 15).toFixed(1));
    const respQualPt = Number(((responsive / 100) * 10).toFixed(1));
    const designConsPt = Number(((userJourney / 100) * 5).toFixed(1));
    const stateCompPt = Number(((uiStates / 100) * 5).toFixed(1));
    const techQualPt = rawHtml.includes('<script') && rawHtml.includes('<!DOCTYPE html>') ? 5.0 : 3.0;

    const totalRealScore = Math.min(
      100,
      Math.round(
        promptFidPt +
          prodCompPt +
          uxQualPt +
          interQualPt +
          visualQualPt +
          respQualPt +
          designConsPt +
          stateCompPt +
          techQualPt
      )
    );

    const realProductScoreBreakdown: RealProductScoreBreakdown = {
      promptFidelity: promptFidPt,
      productCompleteness: prodCompPt,
      uxQuality: uxQualPt,
      interactionQuality: interQualPt,
      visualQuality: visualQualPt,
      responsiveQuality: respQualPt,
      designConsistency: designConsPt,
      stateCompleteness: stateCompPt,
      technicalQuality: techQualPt,
      totalScore: totalRealScore,
    };

    const report: ProductQualityReport = {
      overallScore,
      overallProductScore,
      realProductScore: totalRealScore,
      realProductScoreBreakdown,
      passed,
      status,
      promptFidelityScore: promptFidelity,
      functionalCompletenessScore: functionalCompleteness,
      userJourneyScore: userJourney,
      uxQualityScore: uxQuality,
      interactionQualityScore: interactionQuality,
      antiGenericDensityScore: antiGenericDensity,
      responsiveScore: responsive,
      uiStatesScore: uiStates,
      rubricScores,
      antiSlopChecks,
      dimensions,
      criticalMissingInteractions: missingInteractions,
      recommendations,
      issues,
      blockingIssues,
      auditedAt: Date.now(),
    };

    logger.info(
      'ProductQualityAudit',
      `Audit completed for [${blueprint.title}] -> Overall Product Score: ${overallProductScore}/100 (${status})`
    );

    return report;
  }
}

function criticalMissingInteractionsText(missing: string[], score: number): string {
  if (missing.length > 0) {
    return missing.join('; ');
  }
  return `Score produit insuffisant (${score}/100) nécessitant une régénération structurelle`;
}

export const productQualityAuditService = new ProductQualityAuditService();
