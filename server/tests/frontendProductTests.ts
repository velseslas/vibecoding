import { conversationEngine } from '../conversation/conversationEngine';
import { previewLifecycleService } from '../preview/previewLifecycle';
import { projectIntelligence } from '../versioning/projectIntelligence';
import { dbAdapter } from '../db/database';
import { autoRepairEngine } from '../repair/autoRepairEngine';

async function runFrontendProductE2ETests() {
  console.log('===============================================================');
  console.log('🧪 SUITE DE TESTS END-TO-END — EXPÉRIENCE PRODUIT VIBECODING');
  console.log('===============================================================');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName} - ${detail || 'Assertion failed'}`);
    }
  }

  const projectId = `prod-e2e-${Date.now()}`;
  let currentHtml = `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body class="bg-slate-900 text-white min-h-screen p-8">
  <div id="root">
    <h1 class="text-2xl font-bold">Mon Application Vibecoding</h1>
    <p class="text-slate-400">Prêt pour les modifications</p>
  </div>
</body>
</html>`;

  // --- TEST A: Conversation simple -> modification -> Preview ---
  console.log("\n--- 🚀 TEST A : Conversation simple → modification → Preview ---");
  const resA = await conversationEngine.processUserMessage({
    projectId,
    prompt: "Ajoute une page de gestion des tâches avec une liste et des boutons de suppression",
    currentHtml,
  });

  assert(resA.compassState === 'COMPLETED', 'A.1 Compass termine avec l\'état COMPLETED');
  assert(!!resA.plan && resA.plan.steps.length >= 3, 'A.2 Plan d\'exécution généré avec étapes concrètes');
  assert(!!resA.previewHtml && resA.previewHtml.includes('<!DOCTYPE html>'), 'A.3 Aperçu HTML valide généré');
  assert(!!resA.versionId, 'A.4 Identifiant de version snapshot persisté');
  if (resA.previewHtml) currentHtml = resA.previewHtml;

  // --- TEST B: Clarification -> réponse utilisateur -> exécution ---
  console.log("\n--- ❓ TEST B : Clarification → réponse utilisateur → exécution ---");
  const resB1 = await conversationEngine.processUserMessage({
    projectId,
    prompt: "change ça", // Ambiguous prompt
    currentHtml,
  });

  assert(resB1.compassState === 'CLARIFYING', 'B.1 Détection d\'ambiguïté menant à l\'état CLARIFYING');
  assert(resB1.requiresUserConfirmation === true, 'B.2 Demande de clarification sans exécution aveugle');
  assert(!!resB1.aiResponseText && resB1.aiResponseText.length > 5, 'B.3 Question de clarification naturelle posée');

  // User responds with clarified prompt
  const resB2 = await conversationEngine.processUserMessage({
    projectId,
    prompt: "Passe le fond de la liste de tâches en violet nuit avec des badges de priorité",
    currentHtml,
  });
  assert(resB2.compassState === 'COMPLETED', 'B.4 Reprise fluide et exécution après clarification');

  // --- TEST C: Modification HIGH -> confirmation -> exécution ---
  console.log("\n--- ⚠️ TEST C : Modification HIGH → évaluation d'impact → confirmation ---");
  const resC1 = await conversationEngine.processUserMessage({
    projectId,
    prompt: "Intègre le module de paiement Stripe et la facturation par abonnement",
    currentHtml,
    confirmedByUser: false,
  });
  assert(resC1.impact.riskLevel === 'HIGH', 'C.1 Risque d\'impact classé HIGH pour module de facturation Stripe');
  assert(resC1.compassState === 'WAITING_CONFIRMATION', 'C.2 Bascule en attente de validation');

  const resC2 = await conversationEngine.processUserMessage({
    projectId,
    prompt: "Intègre le module de paiement Stripe et la facturation par abonnement",
    currentHtml,
    confirmedByUser: true,
  });
  assert(resC2.compassState === 'COMPLETED', 'C.3 Exécution validée après confirmation');

  // --- TEST D: Modification CRITICAL -> confirmation obligatoire ---
  console.log("\n--- 🛑 TEST D : Modification CRITICAL → confirmation obligatoire ---");
  const resD1 = await conversationEngine.processUserMessage({
    projectId,
    prompt: "Supprime l'auth et supprime tout le système d'utilisateurs",
    currentHtml,
    confirmedByUser: false,
  });

  assert(resD1.compassState === 'WAITING_CONFIRMATION', 'D.1 Action critique bloquée en attente de confirmation');
  assert(resD1.requiresUserConfirmation === true, 'D.2 Exigence de confirmation explicite verrouillée');
  assert(resD1.impact.riskLevel === 'CRITICAL', 'D.3 Risque évalué comme CRITICAL');

  // User confirms explicitly
  const resD2 = await conversationEngine.processUserMessage({
    projectId,
    prompt: "Supprime l'auth et supprime tout le système d'utilisateurs",
    currentHtml,
    confirmedByUser: true,
  });
  assert(resD2.compassState === 'COMPLETED', 'D.4 Déblocage et exécution après confirmation explicite de l\'utilisateur');

  // --- TEST E: Erreur Preview -> Capture -> Auto Repair -> Preview restauré ---
  console.log("\n--- 🔧 TEST E : Erreur Preview → Auto Repair → Preview restauré ---");
  const brokenHtml = `<!DOCTYPE html><html><head></head><body><h1>Broken</h1><div data-lucide="check"></div></body></html>`;
  const previewSession = previewLifecycleService.createPreviewSession({
    projectId,
    htmlContent: brokenHtml,
  });

  const errReport = previewLifecycleService.recordRuntimeError(
    previewSession.previewId,
    {
      type: 'runtime',
      message: 'Bibliothèque d\'icônes Lucide non initialisée',
      line: 1,
    }
  );
  assert(errReport.session?.status === 'ERROR', 'E.1 Capture de l\'erreur dans la session Preview');
  assert(errReport.normalized.suggestedFix !== undefined, 'E.2 Diagnostic intelligent avec proposition de correction');

  const repairResult = autoRepairEngine.autoRepairCode(brokenHtml, [
    errReport.normalized
  ]);
  assert(repairResult.repairedHtml.includes('unpkg.com/lucide'), 'E.3 Injection automatique de la dépendance manquante');
  assert(repairResult.finalQuality.overallScore >= 90, 'E.4 Qualité restaurée à >= 90/100 après auto-réparation');

  // --- TEST F: Historique -> Rollback -> Preview actualisé ---
  console.log("\n--- ⏪ TEST F : Historique → Rollback → Preview actualisé ---");
  const history = projectIntelligence.getHistory(projectId);
  assert(history.length >= 2, 'F.1 Historique multi-versions enregistré en base');

  const initialVersion = history[history.length - 1]; // First initial version
  const rollbackResult = projectIntelligence.rollback(projectId, initialVersion.id);
  assert(!!rollbackResult, 'F.2 Rollback atomique exécuté');
  assert(rollbackResult?.version?.userIntent?.includes('Rollback') || rollbackResult?.version?.summary?.includes('Restauration'), 'F.3 Version de rollback enregistrée comme nouvelle révision linéaire');

  // --- TEST G: Conversation multi-tours -> contexte conservé ---
  console.log("\n--- 💬 TEST G : Conversation multi-tours → contexte conservé ---");
  const convList = dbAdapter.getProjectConversations(projectId);
  assert(convList.length > 0, 'G.1 Conversation persistée en base de données');
  assert(convList[0].messages.length >= 4, 'G.2 Historique des échanges multi-tours conservé intégralement');

  console.log('\n===============================================================');
  console.log(`📊 RÉSULTATS DES TESTS PRODUIT E2E : ${passed} / ${total} RÉUSSIS`);
  console.log('===============================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runFrontendProductE2ETests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
