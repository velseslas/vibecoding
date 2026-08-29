import { conversationEngine } from '../conversation/conversationEngine';
import { intentEngine } from '../intent/intentEngine';
import { previewLifecycleService } from '../preview/previewLifecycle';
import { appUnderstandingService } from '../analysis/appUnderstanding';
import { appDnaService } from '../analysis/appDna';
import { appMapService } from '../analysis/appMap';
import { impactIntelligenceService } from '../impact/impactIntelligence';
import { assumptionEngine } from '../assumptions/assumptionEngine';
import { planEngine } from '../plan/planEngine';
import { qualityEngine } from '../quality/qualityEngine';
import { autoRepairEngine } from '../repair/autoRepairEngine';
import { projectIntelligence } from '../versioning/projectIntelligence';
import { projectMemoryService } from '../memory/projectMemory';
import { qualityMetricsTracker } from '../learning/qualityMetrics';
import { dbAdapter } from '../db/database';
import { logger } from '../logger';

async function runE2ETests() {
  console.log('\n===============================================================');
  console.log('🧪 SUITE DE TESTS END-TO-END DE LA CHAÎNE VIBECODING COMPLÈTE');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} - ${detail || 'Échec de l\'assertion'}`);
    }
  }

  const testProjectId = 'e2e-project-' + Date.now();

  // -------------------------------------------------------------
  // TEST A : NOUVELLE FONCTIONNALITÉ (Pipeline Complet de bout en bout)
  // -------------------------------------------------------------
  console.log('--- 🚀 TEST A : Création d\'une nouvelle fonctionnalité complète ---');
  try {
    const resultA = await conversationEngine.processUserMessage({
      projectId: testProjectId,
      userId: 'usr_admin_001',
      prompt: 'Crée une application de gestion de budget avec graphiques et alertes',
      vibe: 'Modern Finance',
    });

    assert(resultA.intent.intent === 'CREATE_FEATURE', 'A.1 Détection d\'intention CREATE_FEATURE', `Obtenu: ${resultA.intent.intent}`);
    assert(resultA.compassState === 'COMPLETED', 'A.2 Compass atteint l\'état COMPLETED', `Obtenu: ${resultA.compassState}`);
    assert(resultA.plan !== undefined && resultA.plan.steps.length >= 4, 'A.3 Plan généré avec >= 4 étapes vérifiables');
    assert(resultA.understanding.components.length > 0, 'A.4 Application Understanding a extrait des composants');
    assert(resultA.quality !== undefined && resultA.quality.overallScore >= 70, `A.5 Score Qualité >= 70 (Score: ${resultA.quality?.overallScore}/100)`);
    assert(resultA.previewId !== undefined && resultA.previewHtml !== undefined, 'A.6 Session Preview créée avec HTML sandboxé');
    assert(resultA.versionId !== undefined, 'A.7 Version snapshot persistée en base de données');

    const memory = projectMemoryService.getProjectMemory(testProjectId);
    assert(memory.activeDecisions.length > 0, 'A.8 Décision architecturale enregistrée dans la mémoire');
  } catch (err: any) {
    assert(false, 'TEST A execution', err.message);
  }

  // -------------------------------------------------------------
  // TEST B : BUG DE PREVIEW & RECAPTURE D'ERREUR
  // -------------------------------------------------------------
  console.log('\n--- 🐞 TEST B : Bug de Preview, capture et diagnostic ---');
  try {
    const previewSession = previewLifecycleService.createPreviewSession({
      projectId: testProjectId,
      htmlContent: '<!DOCTYPE html><html><body><h1>Test</h1></body></html>',
    });

    const errorCapture = previewLifecycleService.recordRuntimeError(previewSession.previewId, {
      type: 'runtime',
      message: 'lucide is not defined',
      file: 'index.html',
      line: 42,
    });

    assert(errorCapture.session?.status === 'ERROR', 'B.1 Transition de la session Preview à l\'état ERROR');
    assert(errorCapture.normalized.category === 'missing_dependency', 'B.2 Normalisation de l\'erreur en missing_dependency');
    assert(errorCapture.normalized.suggestedFix.includes('lucide@latest'), 'B.3 Diagnostic IA fournit la correction du CDN Lucide');
  } catch (err: any) {
    assert(false, 'TEST B execution', err.message);
  }

  // -------------------------------------------------------------
  // TEST C : DEMANDE AMBIGUË & CLARIFICATION SÉCURISÉE
  // -------------------------------------------------------------
  console.log('\n--- ❓ TEST C : Demande ambiguë & Déclenchement de clarification ---');
  try {
    const resultC = await conversationEngine.processUserMessage({
      projectId: testProjectId,
      userId: 'usr_admin_001',
      prompt: 'change', // prompt volontairement vague
    });

    assert(resultC.compassState === 'CLARIFYING', 'C.1 Compass passe à l\'état CLARIFYING sans génération aveugle');
    assert(resultC.requiresUserConfirmation === true, 'C.2 Flag requiresUserConfirmation activé');
    assert(resultC.confirmationQuestion !== undefined && resultC.confirmationQuestion.length > 10, 'C.3 Question de clarification pertinente posée');
  } catch (err: any) {
    assert(false, 'TEST C execution', err.message);
  }

  // -------------------------------------------------------------
  // TEST D : MODIFICATION CRITIQUE & CONFIRMATION OBLIGATOIRE
  // -------------------------------------------------------------
  console.log('\n--- ⚠️ TEST D : Modification Critique & Barrière de Confirmation ---');
  try {
    const resultD = await conversationEngine.processUserMessage({
      projectId: testProjectId,
      userId: 'usr_admin_001',
      prompt: 'Supprime l\'authentification et la base de données',
      confirmedByUser: false,
    });

    assert(resultD.compassState === 'WAITING_CONFIRMATION', 'D.1 Compass bascule en WAITING_CONFIRMATION pour opération critique');
    assert(resultD.impact.riskLevel === 'CRITICAL', 'D.2 Niveau de risque classé CRITICAL');
    assert(resultD.impact.requiresExplicitConfirmation === true, 'D.3 Exigence de confirmation explicite verrouillée');
    assert(resultD.impact.potentialBreakingChanges.length > 0, 'D.4 Liste des breaking changes explicitée');
  } catch (err: any) {
    assert(false, 'TEST D execution', err.message);
  }

  // -------------------------------------------------------------
  // TEST E : ROLLBACK ET RESTAURATION D'ÉTAT
  // -------------------------------------------------------------
  console.log('\n--- ⏪ TEST E : Rollback Atomique vers Version Antérieure ---');
  try {
    const historyBefore = projectIntelligence.getHistory(testProjectId);
    const initialVersionId = historyBefore[historyBefore.length - 1]?.id;

    const restored = projectIntelligence.rollback(testProjectId, initialVersionId);
    assert(restored !== null, 'E.1 Rollback exécuté avec succès');
    assert(restored?.version?.userIntent?.includes('Rollback') || restored?.reversionChangeset !== undefined, 'E.2 Version restaurée enregistrée comme nouvelle révision de rollback');

    const historyAfter = projectIntelligence.getHistory(testProjectId);
    assert(historyAfter.length > historyBefore.length, 'E.3 Historique linéaire préservé sans écrasement destructif');
  } catch (err: any) {
    assert(false, 'TEST E execution', err.message);
  }

  // -------------------------------------------------------------
  // TEST F : AUTO REPAIR & RÉPARATION BORNÉE
  // -------------------------------------------------------------
  console.log('\n--- 🔧 TEST F : Auto Repair Loop & Validation de Qualité ---');
  try {
    const brokenHtml = `<!DOCTYPE html><html><head></head><body><div id="root"><div><i data-lucide="activity"></i><h1>Titre</h1></body></html>`;
    
    const repairResult = autoRepairEngine.autoRepairCode(brokenHtml, [
      {
        category: 'missing_dependency',
        errorMessage: 'lucide is not defined',
        sourceFile: 'index.html',
        suggestedFix: 'Injecter le CDN Lucide et lucide.createIcons()',
        severity: 'error',
      }
    ]);

    assert(repairResult.success === true, 'F.1 Auto Repair résout les erreurs avec succès');
    assert(repairResult.repairedHtml.includes('lucide@latest'), 'F.2 CDN Lucide injecté dans le HTML réparé');
    assert(repairResult.repairedHtml.includes('cdn.tailwindcss.com'), 'F.3 CDN Tailwind injecté');
    assert(repairResult.finalQuality.overallScore >= repairResult.attempts[0].qualityBefore, 'F.4 Score de qualité amélioré après réparation');
    assert(repairResult.attempts.length <= 3, 'F.5 Nombre de tentatives strictement borné à <= 3');
  } catch (err: any) {
    assert(false, 'TEST F execution', err.message);
  }

  console.log('\n===============================================================');
  console.log(`📊 RÉSULTAT FINAL DES TESTS E2E : ${passedTests} / ${totalTests} RÉUSSIS`);
  console.log('===============================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runE2ETests().catch((err) => {
  console.error('Fatal test runner failure', err);
  process.exit(1);
});
