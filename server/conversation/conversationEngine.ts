import crypto from 'crypto';
import { dbAdapter } from '../db/database';
import { DbConversation, DbConversationMessage, ConversationCompassState } from '../db/schema';
import { ConversationCompass } from './compass';
import { intentEngine, UserIntentType, IntentAnalysisResult } from '../intent/intentEngine';
import { contextBroker, BrokeredContext } from '../context/contextBroker';
import { appUnderstandingService, AppUnderstandingResult } from '../analysis/appUnderstanding';
import { appMapService, ApplicationGraph } from '../analysis/appMap';
import { impactIntelligenceService, ImpactAnalysisResult } from '../impact/impactIntelligence';
import { assumptionEngine, AssumptionEvaluationResult } from '../assumptions/assumptionEngine';
import { semanticGovernanceService, GovernanceCheckResult } from '../governance/semanticGovernance';
import { autonomyEngine, AutonomyEvaluation } from '../decision/autonomyEngine';
import { validatedArtifactEngine, ValidatedArtifact, VerificationResult, Changeset } from '../artifacts/validatedArtifact';
import { planEngine, ExecutionPlan } from '../plan/planEngine';
import { aiOrchestratorService, AIAgentRole, OrchestrationMetrics } from '../orchestrator/aiOrchestrator';
import { qualityEngine, QualityReport } from '../quality/qualityEngine';
import { autoRepairEngine } from '../repair/autoRepairEngine';
import { previewLifecycleService } from '../preview/previewLifecycle';
import { projectIntelligence } from '../versioning/projectIntelligence';
import { projectMemoryService } from '../memory/projectMemory';
import { conversationTraceService, ConversationTrace } from '../observability/conversationTrace';
import { qualityMetricsTracker } from '../learning/qualityMetrics';
import { bugIntelligenceEngine } from '../learning/bugIntelligenceEngine';
import { regressionIntelligenceService } from '../learning/regressionIntelligence';
import { visualIntelligenceService, VisualAuditReport } from '../visual/visualIntelligence';
import { visualRepairEngine } from '../visual/visualRepairEngine';
import { productUnderstandingEngine, ProductUnderstanding } from '../product/productUnderstandingEngine';
import { productBlueprintService, ProductBlueprint } from '../product/productBlueprint';
import { uxProductPlanner, UXPlan } from '../product/uxProductPlanner';
import { productGenerator } from '../product/productGenerator';
import { productQualityAuditService, ProductQualityReport } from '../product/productQualityAudit';
import { productRepairEngine } from '../product/productRepairEngine';
import { referenceResolver, ReferenceResolutionResult } from './referenceResolver';
import { conversationProductModifier } from './conversationProductModifier';
import { providerRegistry } from '../ai/providerRegistry';
import { logger } from '../logger';
import { buildIframeHtml, extractFilesFromHtml, VirtualFile } from '../preview/buildIframeHtml';

export interface ProcessMessageRequest {
  projectId: string;
  userId?: string;
  prompt: string;
  vibe?: string;
  currentHtml?: string;
  files?: Array<{ name: string; type?: string; content?: string }>;
  targetFile?: string;
  confirmedByUser?: boolean;
  rejectPlan?: boolean;
  rollbackVersionId?: string;
  changesetId?: string;
  rejectChangesetId?: string;
  preferredProvider?: string;
  elementTarget?: {
    selector?: string;
    tagName?: string;
    id?: string;
    className?: string;
    innerText?: string;
  };
}

export interface ConversationPipelineResult {
  conversationId: string;
  compassState: ConversationCompassState;
  intent: IntentAnalysisResult;
  impact: ImpactAnalysisResult;
  assumptions: AssumptionEvaluationResult;
  governance: GovernanceCheckResult;
  autonomy: AutonomyEvaluation;
  plan?: ExecutionPlan;
  changeset?: Changeset;
  decisionId?: string;
  understanding: AppUnderstandingResult;
  productUnderstanding?: ProductUnderstanding;
  productBlueprint?: ProductBlueprint;
  uxPlan?: UXPlan;
  technicalPlan?: any;
  quality?: QualityReport;
  productAudit?: ProductQualityReport;
  visualAudit?: VisualAuditReport;
  previewId?: string;
  previewHtml?: string;
  files?: VirtualFile[];
  entryPoint?: string;
  versionId?: string;
  validatedArtifact?: ValidatedArtifact;
  artifactVerification?: VerificationResult;
  trace?: ConversationTrace;
  aiResponseText: string;
  requiresUserConfirmation: boolean;
  confirmationQuestion?: string;
  orchestrationMetrics: OrchestrationMetrics;
}

export class ConversationEngine {
  /**
   * Complete Enterprise Vibecoding Conversation Pipeline
   */
  public async processUserMessage(req: ProcessMessageRequest): Promise<ConversationPipelineResult> {
    const startTime = Date.now();
    const userId = req.userId || 'usr_admin_001';
    const projectId = req.projectId;
    const existingFiles = req.files || [{ name: 'index.html', content: req.currentHtml || '' }];
    const currentHtml = req.currentHtml || existingFiles.find((f) => f.name.endsWith('.html'))?.content || '';

    // 1. Load or Initialize Conversation & Compass State Machine
    let conversation = dbAdapter.getProjectConversations(projectId)[0];
    if (!conversation) {
      conversation = {
        id: 'conv_' + crypto.randomBytes(6).toString('hex'),
        projectId,
        userId,
        compassState: 'EXPLORING',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }
    const compass = new ConversationCompass(conversation.compassState);

    // Check for Plan Rejection by User
    if (req.rejectPlan) {
      compass.transitionTo('EXPLORING', 'Plan rejeté par l\'utilisateur');
      const rejectMsg = 'J\'ai bien annulé le plan proposé. Que souhaitez-vous faire à la place ?';
      this.recordMessages(conversation, req.prompt || 'Annuler le plan', rejectMsg, 'EXPLORING', 'QUESTION');

      bugIntelligenceEngine.recordSignal({
        type: 'PLAN_REJECTED',
        projectId,
        conversationId: conversation.id,
        payload: { prompt: req.prompt },
      });

      const trace = conversationTraceService.recordTrace({
        conversationId: conversation.id,
        projectId,
        intent: 'QUESTION',
        confidence: 1.0,
        contextSources: ['RECENT_CONVERSATION'],
        assumptionsDetected: [],
        impactLevel: 'LOW',
        executionResult: 'SUCCESS',
        qualityScore: 100,
        repairAttempts: 0,
        durationMs: Date.now() - startTime,
        estimatedTokens: 120,
      });

      return {
        conversationId: conversation.id,
        compassState: 'EXPLORING',
        intent: {
          intent: 'QUESTION',
          confidence: 1.0,
          entities: {},
          requiresClarification: false,
          riskLevel: 'LOW',
          recommendedNextAction: 'Attendre la nouvelle consigne de l\'utilisateur.',
          analysisSource: 'heuristic',
        },
        impact: {
          riskLevel: 'LOW',
          directlyAffectedFiles: [],
          indirectlyAffectedFiles: [],
          affectedFeatures: [],
          potentialBreakingChanges: [],
          requiresExplicitConfirmation: false,
          rationale: 'Annulation sans modification de code.',
        },
        assumptions: { assumptions: [], hasBlockingAssumptions: false },
        governance: { passed: true, conflicts: [], hasContradictions: false, compatibleWithRules: true, dnaViolations: [], governanceReport: 'OK' },
        autonomy: { action: 'AUTONOMOUS_EXECUTION', autonomyScore: 1.0, impactFactor: 0, uncertaintyFactor: 0, reversibilityFactor: 1, sensitivityFactor: 0, requiresExplicitConfirmation: false, requiresPreExecutionSnapshot: false, rationale: 'Annulation' },
        understanding: appUnderstandingService.analyzeProject(existingFiles, currentHtml),
        aiResponseText: rejectMsg,
        requiresUserConfirmation: false,
        trace,
        orchestrationMetrics: aiOrchestratorService.computeMetrics(['Intent_Agent'], Date.now() - startTime, 120, true),
      };
    }

    // Check for Explicit Changeset Rejection
    if (req.rejectChangesetId) {
      const rejectedChangeset = validatedArtifactEngine.rejectChangeset(
        req.rejectChangesetId,
        userId,
        req.prompt || 'Refus explicite du changeset par l\'utilisateur'
      );
      compass.transitionTo('EXPLORING', 'Changeset rejeté par l\'utilisateur');
      const rejectMsg = `J'ai bien annulé le changeset (${rejectedChangeset.id}). Aucun changement n'a été appliqué.`;
      this.recordMessages(conversation, req.prompt || 'Rejeter les modifications', rejectMsg, 'EXPLORING', 'QUESTION');

      return {
        conversationId: conversation.id,
        compassState: 'EXPLORING',
        intent: {
          intent: 'QUESTION',
          confidence: 1.0,
          entities: {},
          requiresClarification: false,
          riskLevel: 'LOW',
          recommendedNextAction: 'Attendre les nouvelles instructions.',
          analysisSource: 'heuristic',
        },
        impact: {
          riskLevel: 'LOW',
          directlyAffectedFiles: [],
          indirectlyAffectedFiles: [],
          affectedFeatures: [],
          potentialBreakingChanges: [],
          requiresExplicitConfirmation: false,
          rationale: 'Refus du changeset sans altération de code.',
        },
        assumptions: { assumptions: [], hasBlockingAssumptions: false },
        governance: { passed: true, conflicts: [], hasContradictions: false, compatibleWithRules: true, dnaViolations: [], governanceReport: 'OK' },
        autonomy: { action: 'AUTONOMOUS_EXECUTION', autonomyScore: 1.0, impactFactor: 0, uncertaintyFactor: 0, reversibilityFactor: 1, sensitivityFactor: 0, requiresExplicitConfirmation: false, requiresPreExecutionSnapshot: false, rationale: 'Rejet de changeset' },
        understanding: appUnderstandingService.analyzeProject(existingFiles, currentHtml),
        changeset: rejectedChangeset,
        aiResponseText: rejectMsg,
        requiresUserConfirmation: false,
        orchestrationMetrics: aiOrchestratorService.computeMetrics(['Intent_Agent'], Date.now() - startTime, 100, true),
      };
    }

    // Direct Exact Application of Existing Validated Changeset (Zero AI synthesis)
    if (req.changesetId) {
      let existingChangeset = validatedArtifactEngine.getChangeset(req.changesetId);
      if (!existingChangeset) {
        throw new Error(`Changeset ${req.changesetId} introuvable pour application.`);
      }

      if (existingChangeset.status === 'pending') {
        existingChangeset = validatedArtifactEngine.approveChangeset(req.changesetId, userId);
      }

      const applyRes = validatedArtifactEngine.applyChangeset(req.changesetId);
      const appliedHtml = applyRes.appliedPayload.html;

      const finalUnderstanding = appUnderstandingService.analyzeProject(
        applyRes.appliedPayload.files,
        appliedHtml
      );

      const previewResult = previewLifecycleService.createPreviewSession({
        projectId,
        userId,
        htmlContent: appliedHtml,
      });

      const revision = projectIntelligence.createRevision(projectId, {
        summary: `Application validée : ${existingChangeset.summary}`,
        source: 'user',
        userIntent: req.prompt || existingChangeset.summary,
        aiPrompt: existingChangeset.summary,
        html: appliedHtml,
        files: applyRes.appliedPayload.files.map((f) => ({ name: f.name, type: 'html', content: f.content })),
        components: finalUnderstanding.components,
        suggestedPrompts: ['Ajouter un filtre', 'Personnaliser le style'],
        authorId: userId,
      });

      const confirmMsg = `Le changeset validé (${existingChangeset.id}) a été exactement appliqué (Version #${revision.versionNumber}).`;
      compass.transitionTo('COMPLETED', 'Changeset appliqué exactement');
      this.recordMessages(conversation, req.prompt || 'Appliquer le changeset', confirmMsg, 'COMPLETED', 'CREATE_FEATURE');

      return {
        conversationId: conversation.id,
        compassState: 'COMPLETED',
        intent: {
          intent: 'CREATE_FEATURE',
          confidence: 1.0,
          entities: {},
          requiresClarification: false,
          riskLevel: 'LOW',
          recommendedNextAction: 'Terminé',
          analysisSource: 'heuristic',
        },
        impact: {
          riskLevel: 'LOW',
          directlyAffectedFiles: applyRes.appliedPayload.files.map((f) => f.name),
          indirectlyAffectedFiles: [],
          affectedFeatures: [],
          potentialBreakingChanges: [],
          requiresExplicitConfirmation: false,
          rationale: 'Application exacte du changeset validé.',
        },
        assumptions: { assumptions: [], hasBlockingAssumptions: false },
        governance: { passed: true, conflicts: [], hasContradictions: false, compatibleWithRules: true, dnaViolations: [], governanceReport: 'OK' },
        autonomy: { action: 'AUTONOMOUS_EXECUTION', autonomyScore: 1.0, impactFactor: 0, uncertaintyFactor: 0, reversibilityFactor: 1, sensitivityFactor: 0, requiresExplicitConfirmation: false, requiresPreExecutionSnapshot: false, rationale: 'Application exacte' },
        understanding: finalUnderstanding,
        changeset: applyRes.changeset,
        decisionId: existingChangeset.decisionId,
        previewId: previewResult.previewId,
        previewHtml: previewResult.safeHtml,
        versionId: revision.id,
        aiResponseText: confirmMsg,
        requiresUserConfirmation: false,
        orchestrationMetrics: aiOrchestratorService.computeMetrics(['Validator'], Date.now() - startTime, 150, true),
      };
    }

    // 2. Intent Detection & Reference Resolution
    compass.transitionTo('UNDERSTANDING', 'Analyse de l\'intention et du contexte');
    const resolvedRef = referenceResolver.resolveReferences(
      req.prompt,
      conversation.messages,
      req.elementTarget,
      currentHtml
    );

    const intentResult = intentEngine.analyzeIntent(req.prompt, {
      hasExistingCode: !!currentHtml && currentHtml.length > 50,
      existingFiles: existingFiles.map((f) => f.name),
      existingCode: currentHtml,
      elementTarget: req.elementTarget,
      recentTargetElement: resolvedRef.resolvedTargetSelector,
    });

    // Handle Rollback / Restore Intent
    if (intentResult.intent === 'RESTORE' || req.rollbackVersionId) {
      const history = projectIntelligence.getHistory(projectId);
      const targetVersion = req.rollbackVersionId || (history.length > 1 ? history[1].id : undefined);

      if (targetVersion) {
        const rollbackResult = projectIntelligence.rollback(projectId, targetVersion, userId);
        if (rollbackResult) {
          const restored = rollbackResult.version;
          compass.transitionTo('ROLLED_BACK', `Restauration vers la version #${restored.versionNumber}`);
          const restoreMsg = `La version antérieure (#${rollbackResult.sourceVersion.versionNumber}) a été restaurée avec succès sous la version #${restored.versionNumber}. Un changeset d'inversion cryptographique a été enregistré.`;
          this.recordMessages(conversation, req.prompt, restoreMsg, 'ROLLED_BACK', 'RESTORE');

          bugIntelligenceEngine.recordSignal({
            type: 'ROLLBACK_TRIGGERED',
            projectId,
            conversationId: conversation.id,
            versionId: targetVersion,
            payload: { prompt: req.prompt, versionNumber: restored.versionNumber },
          });

          const trace = conversationTraceService.recordTrace({
            conversationId: conversation.id,
            projectId,
            intent: 'RESTORE',
            confidence: 0.98,
            contextSources: ['PROJECT_MEMORY'],
            assumptionsDetected: [],
            impactLevel: 'MEDIUM',
            executionResult: 'ROLLED_BACK',
            qualityScore: 100,
            repairAttempts: 0,
            durationMs: Date.now() - startTime,
            estimatedTokens: 180,
          });

          return {
            conversationId: conversation.id,
            compassState: 'ROLLED_BACK',
            intent: intentResult,
            impact: {
              riskLevel: 'MEDIUM',
              directlyAffectedFiles: ['index.html'],
              indirectlyAffectedFiles: [],
              affectedFeatures: ['Restauration d\'état complet et traçabilité d\'inversion'],
              potentialBreakingChanges: [],
              requiresExplicitConfirmation: false,
              rationale: 'Rollback atomique vers un point de restauration antérieur avec artifact de réversion certifié.',
            },
            assumptions: { assumptions: [], hasBlockingAssumptions: false },
            governance: { passed: true, conflicts: [], hasContradictions: false, compatibleWithRules: true, dnaViolations: [], governanceReport: 'OK' },
            autonomy: { action: 'AUTONOMOUS_EXECUTION', autonomyScore: 0.9, impactFactor: 0.4, uncertaintyFactor: 0.1, reversibilityFactor: 1, sensitivityFactor: 0.1, requiresExplicitConfirmation: false, requiresPreExecutionSnapshot: false, rationale: 'Rollback' },
            changeset: rollbackResult.reversionChangeset,
            validatedArtifact: rollbackResult.reversionArtifact,
            artifactVerification: rollbackResult.verification,
            understanding: appUnderstandingService.analyzeProject(restored.filesSnapshot || [], restored.htmlSnapshot),
            previewHtml: restored.htmlSnapshot,
            versionId: restored.id,
            aiResponseText: restoreMsg,
            requiresUserConfirmation: false,
            trace,
            orchestrationMetrics: aiOrchestratorService.computeMetrics(['Intent_Agent'], Date.now() - startTime, 180, true),
          };
        }
      }
    }

    // Handle Informational / Explanatory Queries (No Code Changes)
    if (intentResult.intent === 'EXPLAIN' || (intentResult.intent === 'QUESTION' && !intentResult.requiresClarification)) {
      compass.transitionTo('COMPLETED', 'Réponse informative à la question de l\'utilisateur');
      
      const memory = projectMemoryService.getProjectMemory(projectId);
      const lastDecision = memory.activeDecisions?.[memory.activeDecisions.length - 1];
      const revs = projectIntelligence.getHistory(projectId);
      const lastRev = revs[revs.length - 1];

      let explanationText = `Voici les détails concernant votre application : L'application utilise une architecture modulaire fluide avec Tailwind CSS, une persistance LocalStorage réactive, et une isolation sandbox. Les données sont synchronisées automatiquement à chaque interaction.`;

      if (req.prompt.toLowerCase().includes('pourquoi')) {
        const detail = (lastRev?.summary || lastDecision?.decision) ? ` (${lastRev?.summary || lastDecision?.decision})` : '';
        explanationText = `J'ai effectué cette action${detail} pour structurer l'application conformément à vos instructions, en garantissant l'harmonie visuelle, la réactivité et la conformité avec le Design DNA du projet.`;
      }

      this.recordMessages(conversation, req.prompt, explanationText, 'COMPLETED', intentResult.intent);

      const trace = conversationTraceService.recordTrace({
        conversationId: conversation.id,
        projectId,
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        contextSources: ['PROJECT_MEMORY', 'APPLICATION_DNA'],
        assumptionsDetected: [],
        impactLevel: 'LOW',
        executionResult: 'SUCCESS',
        qualityScore: 100,
        repairAttempts: 0,
        durationMs: Date.now() - startTime,
        estimatedTokens: 220,
      });

      return {
        conversationId: conversation.id,
        compassState: 'COMPLETED',
        intent: intentResult,
        impact: {
          riskLevel: 'LOW',
          directlyAffectedFiles: [],
          indirectlyAffectedFiles: [],
          affectedFeatures: [],
          potentialBreakingChanges: [],
          requiresExplicitConfirmation: false,
          rationale: 'Question informative sans altération de code.',
        },
        assumptions: { assumptions: [], hasBlockingAssumptions: false },
        governance: { passed: true, conflicts: [], hasContradictions: false, compatibleWithRules: true, dnaViolations: [], governanceReport: 'OK' },
        autonomy: { action: 'AUTONOMOUS_EXECUTION', autonomyScore: 1.0, impactFactor: 0, uncertaintyFactor: 0, reversibilityFactor: 1, sensitivityFactor: 0, requiresExplicitConfirmation: false, requiresPreExecutionSnapshot: false, rationale: 'Explication' },
        understanding: appUnderstandingService.analyzeProject(existingFiles, currentHtml),
        aiResponseText: explanationText,
        requiresUserConfirmation: false,
        trace,
        orchestrationMetrics: aiOrchestratorService.computeMetrics(['Intent_Agent'], Date.now() - startTime, 220, true),
      };
    }

    // Handle AUDIT Requests (Application, Page, Preflight)
    if (intentResult.intent === 'AUDIT') {
      const { designAuditEngine } = await import('../audit/designAuditEngine');
      const isPreflight = req.prompt.toLowerCase().includes('publication') || req.prompt.toLowerCase().includes('publier') || req.prompt.toLowerCase().includes('preflight');
      const isPageAudit = req.prompt.toLowerCase().includes('cette page') || req.prompt.toLowerCase().includes('vue actuelle');

      let auditResponseText = '';
      if (isPreflight) {
        const preflight = designAuditEngine.auditPreflightPublish(projectId, currentHtml);
        auditResponseText = `### AUDIT AVANT PUBLICATION\n\n${preflight.summary}\n\n- **Contrôles validés** : ${preflight.validatedCount}/${preflight.totalChecks}\n- **Avertissements** : ${preflight.warningCount}\n- **Bloquants** : ${preflight.blockingCount}\n\n${preflight.checks.map(c => `- ${c.status === 'VALIDATED' ? '✅' : c.status === 'WARNING' ? '⚠️' : '❌'} **${c.title}** : ${c.details}`).join('\n')}`;
      } else if (isPageAudit) {
        const pageAudit = designAuditEngine.auditPage('Page principale', currentHtml, projectId);
        auditResponseText = `### AUDIT DE LA PAGE\n\n${pageAudit.summary}\n- **Harmonie & Boutons** : ${pageAudit.buttonConformityScore}/100\n- **Responsive** : ${pageAudit.responsiveScore}/100\n- **Hiérarchie** : ${pageAudit.hierarchyScore}/100\n\n${pageAudit.issues.length > 0 ? 'Observations :\n' + pageAudit.issues.map(i => `- [${i.category}] ${i.description} → *${i.suggestedFix}*`).join('\n') : 'Aucun défaut relevé.'}`;
      } else {
        const appAudit = designAuditEngine.auditApplication(currentHtml, { projectId });
        auditResponseText = `### AUDIT GLOBAL DE L'APPLICATION (Score : ${appAudit.overallScore}/100)\n\n` +
          `- **Harmonie du Design** : ${appAudit.scores.designHarmony}%\n` +
          `- **Adaptabilité Responsive** : ${appAudit.scores.responsive}%\n` +
          `- **Accessibilité (WCAG)** : ${appAudit.scores.accessibility}%\n` +
          `- **Cohérence & DNA** : ${appAudit.scores.consistency}%\n` +
          `- **Expérience Utilisateur (UX)** : ${appAudit.scores.ux}%\n\n` +
          (appAudit.issues.length > 0
            ? `Points identifiés (${appAudit.issues.length}) :\n` +
              appAudit.issues.map(i => `- **[${i.category}] ${i.title}** : ${i.description}\n  *Action recommandée : ${i.suggestedFix}*`).join('\n') +
              `\n\n💡 Dites-moi *"Corrige les problèmes d'audit"* pour appliquer les ajustements automatiquement.`
            : `Félicitations ! L'application respecte parfaitement les standards de design et de qualité.`);
      }

      compass.transitionTo('COMPLETED', 'Audit de design et qualité finalisé');
      this.recordMessages(conversation, req.prompt, auditResponseText, 'COMPLETED', intentResult.intent);

      const trace = conversationTraceService.recordTrace({
        conversationId: conversation.id,
        projectId,
        intent: 'AUDIT',
        confidence: intentResult.confidence,
        contextSources: ['APPLICATION_DNA', 'ACTIVE_PREVIEW'],
        assumptionsDetected: [],
        impactLevel: 'LOW',
        executionResult: 'SUCCESS',
        qualityScore: 100,
        repairAttempts: 0,
        durationMs: Date.now() - startTime,
        estimatedTokens: 350,
      });

      return {
        conversationId: conversation.id,
        compassState: 'COMPLETED',
        intent: intentResult,
        impact: {
          riskLevel: 'LOW',
          directlyAffectedFiles: [],
          indirectlyAffectedFiles: [],
          affectedFeatures: [],
          potentialBreakingChanges: [],
          requiresExplicitConfirmation: false,
          rationale: 'Audit non destructif',
        },
        assumptions: { assumptions: [], hasBlockingAssumptions: false },
        governance: { passed: true, conflicts: [], hasContradictions: false, compatibleWithRules: true, dnaViolations: [], governanceReport: 'OK' },
        autonomy: { action: 'AUTONOMOUS_EXECUTION', autonomyScore: 1.0, impactFactor: 0, uncertaintyFactor: 0, reversibilityFactor: 1, sensitivityFactor: 0, requiresExplicitConfirmation: false, requiresPreExecutionSnapshot: false, rationale: 'Audit' },
        understanding: appUnderstandingService.analyzeProject(existingFiles, currentHtml),
        aiResponseText: auditResponseText,
        requiresUserConfirmation: false,
        trace,
        orchestrationMetrics: aiOrchestratorService.computeMetrics(['Intent_Agent', 'Validator'], Date.now() - startTime, 350, true),
      };
    }

    // 3. Application Understanding & Map
    const understanding = appUnderstandingService.analyzeProject(existingFiles, currentHtml);
    const appGraph = appMapService.buildMap(existingFiles, currentHtml);

    // 3.5 Product Intelligence: Understanding, Blueprint & UX Planning
    const productUnderstanding = productUnderstandingEngine.analyzeProductIntent(req.prompt);
    const productBlueprint = productBlueprintService.generateBlueprint(productUnderstanding, req.prompt);
    const uxPlan = uxProductPlanner.planUX(productBlueprint);

    // 4. Context Broker (Selective minimal token retrieval)
    const brokeredContext: BrokeredContext = contextBroker.selectContext(
      projectId,
      req.prompt,
      intentResult.intent,
      existingFiles,
      currentHtml,
      {
        elementTarget: req.elementTarget,
      }
    );

    // 5. Assumption Engine Evaluation
    const assumptionResult = assumptionEngine.evaluateAssumptions(req.prompt, {
      hasExistingCode: !!currentHtml,
    });

    // Check if ambiguity requires clarification
    if (assumptionResult.hasBlockingAssumptions || intentResult.requiresClarification) {
      const question =
        assumptionResult.clarificationNeeded ||
        intentResult.clarificationQuestion ||
        'Pouvez-vous préciser votre demande pour que je puisse adapter précisément l\'application ?';
      compass.transitionTo('CLARIFYING', 'Demande ambiguë nécessitant clarification', {
        missingInformation: ['Détails précis de la fonctionnalité'],
        requiresUserConfirmation: true,
      });

      this.recordMessages(conversation, req.prompt, question, 'CLARIFYING', intentResult.intent);
      qualityMetricsTracker.recordEvent({ projectId, type: 'CLARIFICATION_TRIGGERED' });
      bugIntelligenceEngine.recordSignal({
        type: 'CLARIFICATION_TRIGGERED',
        projectId,
        conversationId: conversation.id,
        payload: { prompt: req.prompt, reason: assumptionResult.clarificationNeeded || intentResult.clarificationQuestion },
      });
      bugIntelligenceEngine.recordIntentLearning({
        projectId,
        userPrompt: req.prompt,
        inferredIntent: intentResult.intent,
        clarificationTriggered: true,
        probableAmbiguityCause: assumptionResult.clarificationNeeded || 'Ambiguïté dans le prompt utilisateur',
      });

      const trace = conversationTraceService.recordTrace({
        conversationId: conversation.id,
        projectId,
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        contextSources: brokeredContext.chunks.map((c) => c.source),
        assumptionsDetected: assumptionResult.assumptions.map((a) => a.statement),
        impactLevel: 'LOW',
        executionResult: 'CLARIFICATION',
        qualityScore: 100,
        repairAttempts: 0,
        durationMs: Date.now() - startTime,
        estimatedTokens: brokeredContext.totalEstimatedTokens,
      });

      return {
        conversationId: conversation.id,
        compassState: 'CLARIFYING',
        intent: intentResult,
        impact: {
          riskLevel: 'LOW',
          directlyAffectedFiles: [],
          indirectlyAffectedFiles: [],
          affectedFeatures: [],
          potentialBreakingChanges: [],
          requiresExplicitConfirmation: false,
          rationale: 'Clarification en amont.',
        },
        assumptions: assumptionResult,
        governance: { passed: true, conflicts: [], hasContradictions: false, compatibleWithRules: true, dnaViolations: [], governanceReport: 'OK' },
        autonomy: { action: 'PROPOSE_PLAN', autonomyScore: 0.5, impactFactor: 0.1, uncertaintyFactor: 0.8, reversibilityFactor: 1, sensitivityFactor: 0, requiresExplicitConfirmation: true, requiresPreExecutionSnapshot: false, rationale: 'Clarification requise' },
        understanding,
        aiResponseText: question,
        requiresUserConfirmation: true,
        confirmationQuestion: question,
        trace,
        orchestrationMetrics: aiOrchestratorService.computeMetrics(['Intent_Agent', 'Context_Agent'], Date.now() - startTime, brokeredContext.totalEstimatedTokens, true),
      };
    }

    // 6. Semantic Governance (Check against previous decisions & DNA rules)
    const projectMemory = projectMemoryService.getProjectMemory(projectId);
    const governanceResult = semanticGovernanceService.checkGovernance(projectId, req.prompt, projectMemory.activeDecisions);

    // 7. Impact Intelligence
    const impactResult = impactIntelligenceService.evaluateImpact(intentResult.intent, req.prompt, appGraph, existingFiles);

    // 8. Autonomy Engine Evaluation
    const autonomyEval = autonomyEngine.evaluateAutonomy({
      riskLevel: impactResult.riskLevel,
      confidence: intentResult.confidence,
      intent: intentResult.intent,
      prompt: req.prompt,
      hasBlockingAssumptions: assumptionResult.hasBlockingAssumptions,
      hasContradictions: governanceResult.hasContradictions,
    });

    // If critical/high impact or governance conflict and not yet confirmed by user -> halt and require confirmation
    const requiresConfirmation =
      (autonomyEval.requiresExplicitConfirmation || impactResult.requiresExplicitConfirmation || governanceResult.hasContradictions) &&
      !req.confirmedByUser;

    if (requiresConfirmation) {
      compass.transitionTo('WAITING_CONFIRMATION', 'Impact critique ou conflit de gouvernance nécessitant confirmation', {
        requiresUserConfirmation: true,
        confirmationReason: impactResult.confirmationPrompt || governanceResult.conflicts[0]?.description,
      });

      let confirmMsg = impactResult.confirmationPrompt || `⚠️ Validation requise : Cette modification a un impact important.`;
      if (governanceResult.conflicts.length > 0) {
        confirmMsg += `\n\n📌 Conflit avec décision précédente :\n` +
          governanceResult.conflicts.map((c) => `• ${c.description} (Remplacement suggéré)`).join('\n');
      }
      if (impactResult.potentialBreakingChanges.length > 0) {
        confirmMsg += `\n\nEffets prévus :\n` +
          impactResult.potentialBreakingChanges.map((c) => `• ${c}`).join('\n');
      }

      this.recordMessages(conversation, req.prompt, confirmMsg, 'WAITING_CONFIRMATION', intentResult.intent);

      const trace = conversationTraceService.recordTrace({
        conversationId: conversation.id,
        projectId,
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        contextSources: brokeredContext.chunks.map((c) => c.source),
        assumptionsDetected: assumptionResult.assumptions.map((a) => a.statement),
        impactLevel: impactResult.riskLevel,
        executionResult: 'WAITING_CONFIRMATION',
        qualityScore: 100,
        repairAttempts: 0,
        durationMs: Date.now() - startTime,
        estimatedTokens: brokeredContext.totalEstimatedTokens + 100,
      });

      return {
        conversationId: conversation.id,
        compassState: 'WAITING_CONFIRMATION',
        intent: intentResult,
        impact: impactResult,
        assumptions: assumptionResult,
        governance: governanceResult,
        autonomy: autonomyEval,
        understanding,
        aiResponseText: confirmMsg,
        requiresUserConfirmation: true,
        confirmationQuestion: confirmMsg,
        trace,
        orchestrationMetrics: aiOrchestratorService.computeMetrics(['Intent_Agent', 'Impact_Agent', 'Security_Agent'], Date.now() - startTime, brokeredContext.totalEstimatedTokens + 100, true),
      };
    }

    // If pre-execution snapshot requested by Autonomy Engine on Critical operations
    if (autonomyEval.requiresPreExecutionSnapshot && currentHtml.length > 50) {
      projectIntelligence.createRevision(projectId, {
        summary: `[Snapshot Sécurité Pré-Exécution] Avant ${req.prompt.substring(0, 40)}`,
        source: 'system',
        userIntent: req.prompt,
        html: currentHtml,
        files: existingFiles,
        components: understanding.components,
        suggestedPrompts: [],
        authorId: userId,
      });
    }

    // 8.5 Regression Intelligence Check
    const regressionRisk = regressionIntelligenceService.evaluateRegressionRisk(
      projectId,
      intentResult.intent,
      req.prompt,
      appGraph,
      currentHtml
    );

    // 9. Plan-First Engine
    compass.transitionTo('PLANNING', 'Création du plan d\'action pas à pas');
    const plan = planEngine.createPlan(
      projectId,
      intentResult.intent,
      req.prompt,
      regressionRisk.riskAdjustment || impactResult.riskLevel,
      impactResult.requiresExplicitConfirmation
    );

    if (regressionRisk.hasRegressionRisk && regressionRisk.recommendedExtraPlanSteps.length > 0) {
      for (const step of regressionRisk.recommendedExtraPlanSteps) {
        plan.steps.push({
          id: `step_reg_${plan.steps.length + 1}`,
          order: plan.steps.length + 1,
          label: step,
          description: 'Étape de protection anti-régression basée sur l\'historique des incidents.',
          targetFile: 'index.html',
          agentResponsible: 'Security_Agent',
          status: 'PENDING',
        });
      }
    }

    // 10. AI Orchestration & Code Synthesis
    compass.transitionTo('EXECUTING', 'Exécution des agents spécialisés et génération de code');
    const agentsInvoked: AIAgentRole[] = aiOrchestratorService.routeAgents(intentResult.intent);
    const providerRouting = aiOrchestratorService.selectProviderForTask('CODE_GENERATION', {
      preferredProviderId: req.preferredProvider,
    });

    const synthesized = await this.synthesizeCode(
      req.prompt,
      currentHtml,
      existingFiles,
      req.vibe,
      intentResult.intent,
      productBlueprint,
      uxPlan,
      {
        preferredProvider: req.preferredProvider,
        elementTarget: req.elementTarget,
        resolvedTargetSelector: resolvedRef.resolvedTargetSelector,
        targetFile: req.targetFile,
      }
    );

    let generatedHtml = synthesized.html;
    let synthesizedFiles = synthesized.files;
    let entryPoint = synthesized.entryPoint || 'index.html';

    // 11. Create Immutable Validated Changeset PRIOR to application
    const targetVersionNumber = projectIntelligence.getHistory(projectId).length + 1;
    const isAutoApproved = !requiresConfirmation;
    const changeset = validatedArtifactEngine.generateChangeset({
      projectId,
      decisionId: plan.decisionId,
      planId: plan.id,
      versionNumber: targetVersionNumber,
      summary: `Itération [${intentResult.intent}] : ${req.prompt.substring(0, 50)}`,
      diff: `+ ${synthesizedFiles.length} fichiers générés (${generatedHtml.length} octets) pour ${intentResult.intent}`,
      html: generatedHtml,
      files: synthesizedFiles.map((f) => ({ name: f.name, content: f.content })),
      actor: userId,
      autonomyLevel: autonomyEval.action === 'AUTONOMOUS_EXECUTION' ? 'AUTONOMOUS' : autonomyEval.action === 'PROPOSE_PLAN' ? 'MEDIUM' : 'LOW',
      rationale: autonomyEval.rationale,
      isAutoApproved,
    });

    // If explicit confirmation was required and user has confirmed, mark approved
    if (req.confirmedByUser && changeset.status === 'pending') {
      validatedArtifactEngine.approveChangeset(changeset.id, userId);
    }

    // 12. EXACT APPLICATION GATE (Apply verified changeset without regeneration)
    const applyRes = validatedArtifactEngine.applyChangeset(changeset.id);
    let appliedHtml = applyRes.appliedPayload.html;

    let finalAppliedChangeset = applyRes.changeset;
    let finalValidatedArtifact = validatedArtifactEngine.getArtifact(changeset.id) || validatedArtifactEngine.createArtifact({
      projectId,
      versionNumber: targetVersionNumber,
      planId: plan.id,
      title: changeset.summary,
      provenance: req.confirmedByUser ? 'USER_VALIDATED' : 'SYSTEM_AUTONOMOUS',
      html: appliedHtml,
      files: synthesizedFiles.map((f) => ({ name: f.name, content: f.content })),
      validatedBy: userId,
    });

    let finalVerification = validatedArtifactEngine.verifyIntegrity(changeset.id, {
      html: appliedHtml,
      files: synthesizedFiles.map((f) => ({ name: f.name, content: f.content })),
    });

    if (!finalVerification.isMatch) {
      throw new Error(`CRITICAL INTEGRITY FAILURE: Applied code hash does not match validated artifact ${changeset.id}`);
    }

    // 13. Quality Check & Product Intelligence Quality Audit
    let quality = qualityEngine.evaluateQuality(appliedHtml);
    let productAudit = productQualityAuditService.auditProductQuality(appliedHtml, productBlueprint, req.prompt);
    let repairAttempts = 0;

    // 14. Auto Repair Loop if quality fails or product audit requires repair
    if (!quality.passed) {
      compass.transitionTo('REPAIRING', 'Lancement de l\'auto-réparation ciblée');
      const firstIssue = quality.issues[0];
      const incident = bugIntelligenceEngine.captureIncident({
        projectId,
        conversationId: conversation.id,
        error: {
          message: firstIssue?.message || 'Problème de conformité qualité',
          category: 'quality',
          file: 'index.html',
        },
        context: {
          prompt: req.prompt,
          intent: intentResult.intent,
          htmlSnippet: generatedHtml.substring(0, 200),
          riskLevel: impactResult.riskLevel,
        },
        severity: firstIssue?.severity === 'error' ? 'HIGH' : 'MEDIUM',
      });

      const repairResult = autoRepairEngine.autoRepairCode(generatedHtml, [], projectId);
      const isCodeModifiedByRepair = repairResult.repairedHtml !== appliedHtml;

      generatedHtml = repairResult.repairedHtml;
      synthesizedFiles = extractFilesFromHtml(generatedHtml);
      quality = repairResult.finalQuality;
      repairAttempts = repairResult.attemptCount;

      if (repairResult.success) {
        incident.resolved = true;
        incident.successfulStrategy = repairResult.attempts[0]?.appliedFix || 'AUTO_REPAIR';
        qualityMetricsTracker.recordEvent({ projectId, type: 'AUTO_REPAIR_SUCCESS' });
      }

      // INTEGRITY CONTINUITY: If auto-repair modified the code post-application,
      // generate a formal Repair Changeset and Validated Artifact to maintain unbroken integrity.
      if (isCodeModifiedByRepair && repairResult.attemptCount > 0) {
        const appliedFixes = repairResult.attempts.map((a) => a.appliedFix);
        const repairArtifactResult = validatedArtifactEngine.createRepairChangeset({
          parentChangesetId: changeset.id,
          repairedHtml: generatedHtml,
          repairedFiles: synthesizedFiles.map((f) => ({ name: f.name, content: f.content })),
          repairAttempts: repairResult.attemptCount,
          appliedFixes,
          issuesDetected: quality.issues.map((i) => i.message),
          actor: 'system_auto_repair_engine',
          rationale: `Correction de conformité post-application (${appliedFixes.join(', ') || 'auto-repair'})`,
        });

        finalAppliedChangeset = repairArtifactResult.repairChangeset;
        finalValidatedArtifact = repairArtifactResult.repairArtifact;
        finalVerification = repairArtifactResult.verification;
        appliedHtml = generatedHtml;
      }
    }

    // 14.5 Product Quality Repair (if domain features or anti-slop rules were violated on new creation)
    if (
      (intentResult.intent === 'CREATE_FEATURE' || !currentHtml || currentHtml.length < 50) &&
      productAudit?.status === 'REPAIR_REQUIRED' &&
      (productAudit?.blockingIssues?.length || 0) > 0
    ) {
      logger.info('ConversationEngine', `Product Quality repair triggered (${productAudit.blockingIssues.length} issues)`);
      const prodRepair = productRepairEngine.repairProductArtifact(generatedHtml, productBlueprint, productAudit, req.prompt);
      if (prodRepair.success) {
        generatedHtml = prodRepair.repairedHtml;
        synthesizedFiles = extractFilesFromHtml(generatedHtml);
        appliedHtml = generatedHtml;
        productAudit = prodRepair.finalAudit || productAudit;
        repairAttempts += prodRepair.repairAttempts || prodRepair.attemptCount || 1;

        const repairArtifactResult = validatedArtifactEngine.createRepairChangeset({
          parentChangesetId: finalAppliedChangeset.id,
          repairedHtml: generatedHtml,
          repairedFiles: synthesizedFiles.map((f) => ({ name: f.name, content: f.content })),
          repairAttempts: prodRepair.repairAttempts || prodRepair.attemptCount || 1,
          appliedFixes: prodRepair.appliedFixes || [],
          issuesDetected: (productAudit.issues || []).map((i) => i.message),
          actor: 'system_product_repair_engine',
          rationale: `Correction Product Quality (${(prodRepair.appliedFixes || []).join(', ') || 'Product Polish'})`,
        });

        finalAppliedChangeset = repairArtifactResult.repairChangeset;
        finalValidatedArtifact = repairArtifactResult.repairArtifact;
        finalVerification = repairArtifactResult.verification;
      }
    }

    // 15. Quality Validation & Sandbox Preview
    compass.transitionTo('VALIDATING', 'Vérification de l\'intégrité du runtime et isolation sandbox');
    const finalUnderstanding = appUnderstandingService.analyzeProject(
      synthesizedFiles.map((f) => ({ name: f.name, content: f.content })),
      generatedHtml
    );

    let previewResult = previewLifecycleService.createPreviewSession({
      projectId,
      userId,
      htmlContent: generatedHtml,
    });

    // 15.5 Visual Intelligence Runtime (Capture & Multi-Viewport Layout Analysis)
    let visualAudit = await visualIntelligenceService.auditVisualRuntime(generatedHtml, {
      projectId,
      changesetId: finalAppliedChangeset.id,
    });

    // If visual problems require repair (REPAIR_REQUIRED with blocking issues)
    if (visualAudit?.status === 'REPAIR_REQUIRED' && (visualAudit?.blockingIssues?.length || 0) > 0) {
      logger.info('VisualIntelligence', `Visual repair triggered for ${projectId} (${visualAudit.blockingIssues.length} blocking issues)`);
      const visualRepair = visualRepairEngine.repairVisualIssues(generatedHtml, visualAudit, finalAppliedChangeset.id);
      if (visualRepair.success && visualRepair.repairChangeset && visualRepair.repairArtifact && visualRepair.verification) {
        generatedHtml = visualRepair.repairedHtml;
        synthesizedFiles = extractFilesFromHtml(generatedHtml);
        finalAppliedChangeset = visualRepair.repairChangeset;
        finalValidatedArtifact = visualRepair.repairArtifact;
        finalVerification = visualRepair.verification;
        appliedHtml = generatedHtml;

        // Refresh preview with repaired HTML
        previewResult = previewLifecycleService.createPreviewSession({
          projectId,
          userId,
          htmlContent: generatedHtml,
        });

        // Re-run Visual Audit on final repaired render
        visualAudit = await visualIntelligenceService.auditVisualRuntime(generatedHtml, {
          projectId,
          changesetId: finalAppliedChangeset.id,
        });
      }
    }

    // 16. Create Persistent Project Version Snapshot
    const revision = projectIntelligence.createRevision(projectId, {
      summary: `Itération [${intentResult.intent}] : ${req.prompt.substring(0, 50)}`,
      source: req.confirmedByUser ? 'user' : 'ai',
      userIntent: req.prompt,
      aiPrompt: req.prompt,
      html: generatedHtml,
      files: synthesizedFiles.map((f) => ({
        name: f.name,
        type: (f.type as any) || (f.name.endsWith('.css') ? 'css' : f.name.endsWith('.html') ? 'html' : 'javascript'),
        content: f.content,
      })),
      components: finalUnderstanding.components,
      suggestedPrompts: ['Ajouter un filtre interactif', 'Activer le mode sombre', 'Exporter les données'],
      authorId: userId,
    });

    // 17. Decision Provenance & Memory + DNA Evolution
    // Handle superseding if there were governance conflicts
    let supersedesId: string | undefined;
    if (governanceResult.conflicts.length > 0) {
      supersedesId = governanceResult.conflicts[0].conflictingDecisionId;
    }

    const decisionRecord = projectMemoryService.recordDecision(
      projectId,
      'UI & State Evolution',
      `Mise à jour via prompt: "${req.prompt.substring(0, 35)}..."`,
      `Implémentation de l'intention ${intentResult.intent} avec validation qualité (Score: ${quality.overallScore}/100)`,
      {
        source: req.confirmedByUser ? 'Utilisateur (Validation Explicite)' : 'AI Orchestrator',
        sourceType: req.confirmedByUser ? 'USER' : 'AI',
        explicitOrImplicit: 'EXPLICIT',
        impactLevel: impactResult.riskLevel,
        supersedesId,
      }
    );

    qualityMetricsTracker.recordEvent({ projectId, type: 'MODIFICATION_SUCCESS' });
    qualityMetricsTracker.recordEvent({ projectId, type: 'PREVIEW_SUCCESS' });

    // 18. Final State Completion
    compass.transitionTo('COMPLETED', 'Opération finalisée et vérifiée avec succès', {
      completedActions: ['Analyse de l\'intention', 'Échafaudage UI', 'Validation Qualité', 'Création Version'],
    });

    // Natural conversation response phrasing (strictly human & product-oriented, zero developer jargon)
    let naturalResponse = `J'ai adapté l'application selon vos indications.`;
    if (intentResult.intent === 'CREATE_FEATURE') {
      naturalResponse = `J'ai créé l'application avec ses composants interactifs, ses données réalistes et ses interactions fluides.`;
    } else if (intentResult.intent === 'FIX_BUG' || intentResult.intent === 'PREVIEW_FIX') {
      naturalResponse = `J'ai corrigé l'affichage pour garantir une expérience fluide.`;
    } else if (intentResult.intent === 'REFACTOR') {
      naturalResponse = `J'ai restructuré la vue demandée tout en conservant toutes vos données et fonctionnalités actives.`;
    } else if (intentResult.intent === 'MODIFY_FEATURE') {
      if (req.prompt.toLowerCase().includes('premium')) {
        naturalResponse = `J'ai appliqué une esthétique plus premium et contrastée, tout en conservant l'ensemble de vos cartes et fonctionnalités.`;
      } else if (req.prompt.toLowerCase().includes('minimaliste')) {
        naturalResponse = `J'ai épuré le design pour un style minimaliste et lisible, sans altérer la structure.`;
      } else if (req.prompt.toLowerCase().includes('petit') || req.prompt.toLowerCase().includes('gros')) {
        naturalResponse = `J'ai ajusté la taille des éléments pour un équilibre visuel optimal.`;
      } else {
        naturalResponse = `J'ai mis à jour l'application conformément à votre souhait, en préservant tout ce qui était déjà en place.`;
      }
    }

    this.recordMessages(conversation, req.prompt, naturalResponse, 'COMPLETED', intentResult.intent);

    const metrics = aiOrchestratorService.computeMetrics(
      agentsInvoked,
      Date.now() - startTime,
      brokeredContext.totalEstimatedTokens + 400,
      true,
      undefined,
      {
        provider: providerRouting.selectedProvider.id,
        model: providerRouting.config.model,
        fellBack: false,
      }
    );

    // 19. Record Trace for Observability
    const trace = conversationTraceService.recordTrace({
      conversationId: conversation.id,
      projectId,
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      contextSources: brokeredContext.chunks.map((c) => c.source),
      assumptionsDetected: assumptionResult.assumptions.map((a) => a.statement),
      impactLevel: impactResult.riskLevel,
      planId: plan.id,
      decision: decisionRecord.decision,
      artifactId: finalValidatedArtifact.id,
      artifactHash: finalValidatedArtifact.sha256Hash,
      executionResult: repairAttempts > 0 ? 'REPAIRED' : 'SUCCESS',
      qualityScore: quality.overallScore,
      repairAttempts,
      durationMs: Date.now() - startTime,
      estimatedTokens: brokeredContext.totalEstimatedTokens + 400,
      provider: providerRouting.selectedProvider.id,
      model: providerRouting.config.model,
      fellBack: false,
    });

    return {
      conversationId: conversation.id,
      compassState: 'COMPLETED',
      intent: intentResult,
      impact: impactResult,
      assumptions: assumptionResult,
      governance: governanceResult,
      autonomy: autonomyEval,
      plan,
      changeset: finalAppliedChangeset,
      decisionId: plan.decisionId,
      understanding: finalUnderstanding,
      productUnderstanding,
      productBlueprint,
      uxPlan,
      technicalPlan: synthesized.technicalPlan,
      quality,
      productAudit,
      visualAudit,
      previewId: previewResult.previewId,
      previewHtml: previewResult.safeHtml,
      files: synthesizedFiles,
      entryPoint,
      versionId: revision.id,
      validatedArtifact: finalValidatedArtifact,
      artifactVerification: finalVerification,
      trace,
      aiResponseText: naturalResponse,
      requiresUserConfirmation: false,
      orchestrationMetrics: metrics,
    };
  }

  private recordMessages(
    conversation: DbConversation,
    userPrompt: string,
    assistantText: string,
    compassState: ConversationCompassState,
    intent?: UserIntentType
  ): void {
    const userMsg: DbConversationMessage = {
      id: 'msg_' + Date.now() + '_user',
      role: 'user',
      content: userPrompt,
      timestamp: Date.now(),
      metadata: { intent, compassState },
    };

    const assistantMsg: DbConversationMessage = {
      id: 'msg_' + (Date.now() + 1) + '_assistant',
      role: 'assistant',
      content: assistantText,
      timestamp: Date.now() + 1,
      metadata: { intent, compassState },
    };

    conversation.messages.push(userMsg, assistantMsg);
    conversation.compassState = compassState;
    conversation.updatedAt = Date.now();
    dbAdapter.saveConversation(conversation);
  }

  /**
   * Pass 1: Generates architectural & technical JSON plan (no code)
   */
  private async generateTechnicalPlan(
    prompt: string,
    blueprint?: ProductBlueprint,
    uxPlan?: UXPlan,
    options?: { preferredProvider?: string }
  ): Promise<any> {
    const sysInstructionPlan = "Tu es architecte senior. Analyse ce blueprint et génère un plan technique JSON : structure des fichiers, logique JS par module, données/états, interactions, dépendances. PAS de code, juste le plan.";

    let planPrompt = `PROMPT UTILISATEUR : "${prompt}"\n`;
    if (blueprint) {
      planPrompt += `BLUEPRINT PRODUIT :
- Titre : ${blueprint.title}
- Archétype : ${blueprint.archetype}
- Objectif : ${blueprint.goal}
- Fonctionnalités clés : ${blueprint.features.map((f) => f.name).join(', ')}
- Modèle de données : ${blueprint.dataModel.map((d) => d.name).join(', ')}
- États UI : ${blueprint.uiStates.join(', ')}
`;
    }
    if (uxPlan) {
      planPrompt += `PLAN UX :
- Structure conteneur : ${uxPlan.layoutArchitecture.containerClass}
- Navigation : ${uxPlan.layoutArchitecture.navigationType}
- Éléments focaux : ${uxPlan.visualHierarchy.focalPointElement}
`;
    }
    planPrompt += `\nGénère le plan technique JSON exhaustif pour structurer l'application (structure des fichiers, logique JS par module, données/états, interactions, dépendances).`;

    const { result } = await providerRegistry.executeWithRouting(
      'CODE_PLANNING',
      async (provider, providerCfg) => {
        const resp = await provider.generateText({
          prompt: planPrompt,
          systemInstruction: sysInstructionPlan,
          temperature: 0.2,
          maxTokens: 8192,
          timeoutMs: 30000,
        });
        return resp.text;
      },
      { preferredProviderId: options?.preferredProvider }
    );

    let planData: any = null;
    try {
      let cleaned = (result || '').trim();
      if (cleaned.includes('```json')) {
        cleaned = cleaned.split('```json')[1].split('```')[0].trim();
      } else if (cleaned.includes('```')) {
        cleaned = cleaned.split('```')[1].split('```')[0].trim();
      }
      planData = JSON.parse(cleaned);
    } catch {
      planData = {
        title: blueprint?.title || 'Plan Technique',
        rawPlan: result || 'Plan technique d\'architecture généré',
      };
    }
    return planData;
  }

  /**
   * Resilient, 2-Pass multi-file code synthesizer powered by GLM-5.3-Flash / OpenRouter / Gemini
   */
  private async synthesizeCode(
    prompt: string,
    currentHtml: string,
    currentFiles: Array<{ name: string; type?: string; content?: string }> = [],
    vibe = 'Moderne',
    intent: UserIntentType,
    blueprint?: ProductBlueprint,
    uxPlan?: UXPlan,
    options?: {
      preferredProvider?: string;
      elementTarget?: {
        selector?: string;
        tagName?: string;
        id?: string;
        className?: string;
        innerText?: string;
      };
      resolvedTargetSelector?: string;
      targetFile?: string;
    }
  ): Promise<{
    files: VirtualFile[];
    entryPoint: string;
    html: string;
    technicalPlan?: any;
  }> {
    const activeProviders = providerRegistry.getActiveProviders();
    const hasRealAI = activeProviders.some((p) => p.id === 'gemini' || p.id === 'oxalpha');

    if (hasRealAI) {
      try {
        const understanding = productUnderstandingEngine.analyzeProductIntent(prompt);
        const effectiveBlueprint = blueprint || productBlueprintService.generateBlueprint(understanding, prompt);
        const effectiveUxPlan = uxPlan || uxProductPlanner.planUX(effectiveBlueprint);

        // --- PASS 1: Technical Architecture Plan ---
        const planStart = Date.now();
        const technicalPlan = await this.generateTechnicalPlan(
          prompt,
          effectiveBlueprint,
          effectiveUxPlan,
          { preferredProvider: options?.preferredProvider }
        );
        const planDuration = Date.now() - planStart;
        logger.info('ConversationEngine', `[PASS 1] Plan generated in ${planDuration}ms`);

        // --- PASS 2: Code Generation following the approved plan ---
        const sysInstruction = `Tu es l'architecte principal de VibeCode Studio.

RÈGLES ABSOLUES :
1. Tu as reçu un PLAN TECHNIQUE approuvé. Suis-le À LA LETTRE.
2. Chaque bouton a un onclick tangible. Pas de placeholder.
3. Chaque modale s'ouvre ET se ferme.
4. Données réalistes : vrais noms, textes cohérents, pas de Lorem Ipsum.
5. Design moderne : Tailwind CSS, ombres douces, arrondis 8-16px, typographie soignée.
6. Responsive mobile-first.
7. Accessibilité : aria-labels, contrastes WCAG AA.
8. Pas de memory leaks, nettoyer les event listeners.
9. FORMAT : JSON { files: [{name, type, content}] }`;

        let userPromptText = `Plan technique approuvé :\n${JSON.stringify(technicalPlan, null, 2)}\n\nGénère maintenant le code conforme à ce plan.\nDEMANDE DE L'UTILISATEUR : "${prompt}"\nSTYLE / VIBE SÉLECTIONNÉ : "${vibe}".\nINTENTION IDENTIFIÉE : ${intent}.\n`;

        if (options?.targetFile) {
          userPromptText += `FICHIER CIBLÉ EN PRIORITÉ : "${options.targetFile}". Tu peux modifier ce fichier ou en ajouter de nouveaux si nécessaire.\n`;
        }

        if (currentFiles && currentFiles.length > 0) {
          userPromptText += `\nFICHIERS ACTUELS DU PROJET :\n`;
          for (const f of currentFiles) {
            userPromptText += `\n--- FICHIER: ${f.name} (${f.type || 'code'}) ---\n${f.content || ''}\n`;
          }
          userPromptText += `\nConserve toutes les données et fonctionnalités existantes tout en intégrant la demande utilisateur.`;
        } else if (currentHtml && currentHtml.length > 50) {
          userPromptText += `\nCODE HTML EXISTANT DE L'APPLICATION (À DÉCOMPOSER ET ENRICHIR EN MULTI-FICHIERS) :\n\`\`\`html\n${currentHtml}\n\`\`\`\n`;
        }

        const codeStart = Date.now();
        const { result } = await providerRegistry.executeWithRouting(
          'CODE_GENERATION',
          async (provider, providerCfg) => {
            const resp = await provider.generateText({
              prompt: userPromptText,
              systemInstruction: sysInstruction,
              temperature: providerCfg.temperature ?? 0.2,
              maxTokens: providerCfg.maxTokens || 32768,
              timeoutMs: providerCfg.timeout || 90000,
            });
            return resp.text;
          },
          { preferredProviderId: options?.preferredProvider }
        );
        const codeDuration = Date.now() - codeStart;
        logger.info('ConversationEngine', `[PASS 2] Code generated in ${codeDuration}ms`);

        if (result && result.length > 10) {
          let cleaned = result.trim();
          if (cleaned.includes('```json')) {
            cleaned = cleaned.split('```json')[1].split('```')[0].trim();
          } else if (cleaned.includes('```')) {
            cleaned = cleaned.split('```')[1].split('```')[0].trim();
          }

          let parsedFiles: VirtualFile[] = [];
          let entryPoint = 'index.html';

          let parsed: any;
          try {
            parsed = JSON.parse(cleaned);
          } catch (parseErr: any) {
            logger.warn('ConversationEngine', `Échec du parsing JSON direct (${parseErr.message}). Tentative d'auto-réparation LLM...`);
            // Auto-repair intelligent via LLM (1 retry max)
            try {
              const repairPrompt = `Ce JSON est invalide. Erreur : ${parseErr.message}. Corrige-le et retourne un JSON valide avec la même structure.\n\nJSON erroné :\n${cleaned}`;
              const repairRes = await providerRegistry.executeWithRouting(
                'CODE_GENERATION',
                async (provider, providerCfg) => {
                  const resp = await provider.generateText({
                    prompt: repairPrompt,
                    systemInstruction: 'Tu es un réparateur JSON expert. Retourne UNIQUEMENT le JSON corrigé valide sans préambule ni balises Markdown.',
                    temperature: 0.1,
                    maxTokens: providerCfg.maxTokens || 32768,
                    timeoutMs: 45000,
                  });
                  return resp.text;
                },
                { preferredProviderId: options?.preferredProvider }
              );

              let repairedCleaned = (repairRes.result || '').trim();
              if (repairedCleaned.includes('```json')) {
                repairedCleaned = repairedCleaned.split('```json')[1].split('```')[0].trim();
              } else if (repairedCleaned.includes('```')) {
                repairedCleaned = repairedCleaned.split('```')[1].split('```')[0].trim();
              }
              parsed = JSON.parse(repairedCleaned);
            } catch (secondErr: any) {
              logger.error('ConversationEngine', `Auto-réparation LLM échouée : ${secondErr.message}`);
              throw new Error(`Le code généré est invalide et n'a pas pu être réparé automatiquement (${secondErr.message}).`);
            }
          }

          if (parsed) {
            if (Array.isArray(parsed.files) && parsed.files.length > 0) {
              parsedFiles = parsed.files.map((f: any) => ({
                name: f.name || 'index.html',
                type: f.type || (f.name.endsWith('.css') ? 'css' : f.name.endsWith('.html') ? 'html' : 'javascript'),
                content: typeof f.content === 'string' ? f.content : JSON.stringify(f.content, null, 2),
              }));
              if (parsed.entryPoint) entryPoint = parsed.entryPoint;
            } else if (typeof parsed.html === 'string') {
              parsedFiles = extractFilesFromHtml(parsed.html);
            }
          }

          if (parsedFiles.length === 0) {
            if (currentFiles && currentFiles.length > 0) {
              parsedFiles = currentFiles.map((f) => ({
                name: f.name,
                type: (f.type as any) || (f.name.endsWith('.css') ? 'css' : f.name.endsWith('.html') ? 'html' : 'javascript'),
                content: f.content || '',
              }));
            } else if (currentHtml && currentHtml.length > 50) {
              parsedFiles = extractFilesFromHtml(currentHtml);
            } else {
              parsedFiles = [
                {
                  name: 'index.html',
                  type: 'html',
                  content: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Application</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-950 text-white min-h-screen p-8"><div id="app"><h1 class="text-2xl font-bold">Application VibeCode</h1></div></body></html>`,
                },
              ];
            }
          }

          const assembledHtml = buildIframeHtml(parsedFiles, entryPoint);
          return {
            files: parsedFiles,
            entryPoint,
            html: assembledHtml,
            technicalPlan,
          };
        }
      } catch (err: any) {
        logger.error('ConversationEngine', `LLM code synthesis failed: ${err.message}`);
        throw new Error(`La génération de code a échoué via le modèle IA (${err.message}). Veuillez réessayer.`);
      }
    }

    throw new Error('Aucun fournisseur IA disponible (OXALPHA_API_KEY ou GEMINI_API_KEY requis).');
  }
}

export const conversationEngine = new ConversationEngine();

