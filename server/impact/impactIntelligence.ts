import { ApplicationGraph, appMapService } from '../analysis/appMap';
import { UserIntentType, RiskLevel } from '../intent/intentEngine';
import { logger } from '../logger';

export interface ImpactAnalysisResult {
  riskLevel: RiskLevel;
  directlyAffectedFiles: string[];
  indirectlyAffectedFiles: string[];
  affectedFeatures: string[];
  potentialBreakingChanges: string[];
  requiresExplicitConfirmation: boolean;
  confirmationPrompt?: string;
  rationale: string;
}

export class ImpactIntelligenceService {
  /**
   * Evaluates the risk and blast radius of a requested change before executing
   */
  public evaluateImpact(
    intent: UserIntentType,
    prompt: string,
    graph: ApplicationGraph,
    existingFiles: Array<{ name: string; content?: string }>
  ): ImpactAnalysisResult {
    const lower = prompt.toLowerCase();
    const directlyAffectedFiles: string[] = [];
    const indirectlyAffectedFiles: string[] = [];
    const affectedFeatures: string[] = [];
    const potentialBreakingChanges: string[] = [];

    // 1. Critical Deletions (Auth, Database, Security)
    if (intent === 'DELETE' || lower.includes('supprime l\'auth') || lower.includes('delete database') || lower.includes('supprime tout')) {
      return {
        riskLevel: 'CRITICAL',
        directlyAffectedFiles: existingFiles.map((f) => f.name),
        indirectlyAffectedFiles: [],
        affectedFeatures: ['Authentification Utilisateur', 'Sécurité des sessions', 'Intégrité des données'],
        potentialBreakingChanges: [
          'Suppression irrémédiable de la couche de vérification des utilisateurs',
          'Rupture des flux de connexion et d\'accès aux données protégées',
        ],
        requiresExplicitConfirmation: true,
        confirmationPrompt: '⚠️ ACTION CRITIQUE : Cette opération va supprimer des briques fondamentales de sécurité (Authentification / Données). Êtes-vous certain de vouloir poursuivre ?',
        rationale: 'Modification destructrice de composants système critiques.',
      };
    }

    // 2. High Risk: Billing, Database Schema, Core Routing
    if (lower.includes('paiement') || lower.includes('stripe') || lower.includes('abonnement') || lower.includes('restructure l\'api')) {
      return {
        riskLevel: 'HIGH',
        directlyAffectedFiles: ['server.ts', 'index.html'],
        indirectlyAffectedFiles: appMapService.getImpactedFiles(graph, 'index.html'),
        affectedFeatures: ['Module de Facturation', 'Gestion des Tiers Stripe'],
        potentialBreakingChanges: [
          'Impact sur la validation des webhooks et le crédit des tokens utilisateurs',
        ],
        requiresExplicitConfirmation: true,
        confirmationPrompt: '⚠️ Risque Élevé : La modification du module financier requiert votre validation avant application.',
        rationale: 'Impact direct sur la logique monétaire et transactionnelle.',
      };
    }

    // 3. Medium Risk: Refactor / Structural Changes
    if (intent === 'REFACTOR' || intent === 'RESTORE' || lower.includes('refactorise') || lower.includes('restructure')) {
      const mainFile = 'index.html';
      const impacted = appMapService.getImpactedFiles(graph, mainFile);

      return {
        riskLevel: 'MEDIUM',
        directlyAffectedFiles: [mainFile],
        indirectlyAffectedFiles: impacted.filter((f) => f !== mainFile),
        affectedFeatures: ['Structure globale des composants', 'Gestion des événements'],
        potentialBreakingChanges: [
          'Possible désynchronisation temporaire des sélecteurs DOM',
        ],
        requiresExplicitConfirmation: false,
        rationale: 'Refactorisation touchant plusieurs modules interconnectés.',
      };
    }

    // 4. Low Risk: Visual tweaks, adding buttons, styling, micro bug fix
    directlyAffectedFiles.push('index.html');
    return {
      riskLevel: 'LOW',
      directlyAffectedFiles,
      indirectlyAffectedFiles: [],
      affectedFeatures: ['Interface utilisateur & interactions locales'],
      potentialBreakingChanges: [],
      requiresExplicitConfirmation: false,
      rationale: 'Modification incrémentale à faible rayon d\'impact.',
    };
  }
}

export const impactIntelligenceService = new ImpactIntelligenceService();
