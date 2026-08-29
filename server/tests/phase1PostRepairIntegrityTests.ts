import crypto from 'crypto';
import { validatedArtifactEngine } from '../artifacts/validatedArtifact';
import { autoRepairEngine } from '../repair/autoRepairEngine';
import { qualityEngine } from '../quality/qualityEngine';
import { conversationEngine } from '../conversation/conversationEngine';
import { dbAdapter } from '../db/database';

export async function runPhase1PostRepairIntegrityTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n=====================================================');
  console.log('🛡️ PHASE 1 — TESTS D\'INTÉGRITÉ POST-REPAIR');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string, details?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${title} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  const projectId = 'test_proj_repair_' + crypto.randomBytes(3).toString('hex');
  const userId = 'usr_repair_tester';

  // -------------------------------------------------------------------------
  // TEST 1 — POST-REPAIR INTEGRITY (CODE MODIFIÉ PAR AUTO-REPAIR)
  // -------------------------------------------------------------------------
  console.log('📋 Test 1 — Intégrité après auto-réparation (Création de Repair Changeset & Validated Artifact)');

  // 1.1 Code initial avec défaut (divs multiples non fermées, script asymétrique et sans CDN)
  const flawedHtml = `<!DOCTYPE html><html><head><title>Flawed</title></head><body><div class="p-6"><div><div><span>Contenu non fermé</span><script>function broken() { const x = 1;</script></body></html>`;
  
  const initialChangeset = validatedArtifactEngine.generateChangeset({
    projectId,
    decisionId: 'dec_test_repair_1',
    planId: 'plan_test_repair_1',
    versionNumber: 1,
    summary: 'Composant initial avec erreurs de balisage',
    diff: '+ Flawed HTML',
    html: flawedHtml,
    actor: userId,
    autonomyLevel: 'AUTONOMOUS',
    rationale: 'Création initiale',
    isAutoApproved: true,
  });

  assert(initialChangeset.status === 'approved', 'Changeset initial pré-approuvé');
  const applyRes = validatedArtifactEngine.applyChangeset(initialChangeset.id);
  assert(applyRes.appliedPayload.html === flawedHtml, 'Application exacte du payload initial');

  // 1.2 Détection qualité & Auto-repair
  const initialQuality = qualityEngine.evaluateQuality(flawedHtml);
  assert(!initialQuality.passed, 'Quality Engine détecte les anomalies initiales');

  const repairResult = autoRepairEngine.autoRepairCode(flawedHtml, [
    {
      category: 'syntax',
      errorMessage: 'SyntaxError: Unexpected token',
      sourceFile: 'index.html',
      suggestedFix: 'Close script and div tags',
      severity: 'error',
    },
  ], projectId);
  assert(repairResult.success, 'AutoRepairEngine répare le code avec succès');
  assert(repairResult.repairedHtml !== flawedHtml, 'Le code réparé diffère bien du code initial');
  assert(repairResult.attemptCount > 0, 'Au moins une tentative de réparation a été effectuée');

  // 1.3 Création du Repair Changeset & Validated Artifact via ValidatedArtifactEngine
  const repairArtifactResult = validatedArtifactEngine.createRepairChangeset({
    parentChangesetId: initialChangeset.id,
    repairedHtml: repairResult.repairedHtml,
    repairedFiles: [{ name: 'index.html', content: repairResult.repairedHtml }],
    repairAttempts: repairResult.attemptCount,
    appliedFixes: repairResult.attempts.map((a) => a.appliedFix),
    issuesDetected: initialQuality.issues.map((i) => i.message),
    actor: 'system_auto_repair_engine',
    rationale: 'Correction automatique de conformité',
  });

  // 1.4 Vérifications d'intégrité
  const reloadedInitial = validatedArtifactEngine.getChangeset(initialChangeset.id);
  assert(reloadedInitial?.status === 'superseded', 'Le Changeset initial est maintenant marqué "superseded" (obsolète)');
  assert(reloadedInitial?.supersededBy === repairArtifactResult.repairChangeset.id, 'Le Changeset initial pointe vers le repair changeset');

  const repairChangeset = repairArtifactResult.repairChangeset;
  assert(repairChangeset.status === 'applied', 'Le Repair Changeset est en statut "applied"');
  assert(repairChangeset.parentChangesetId === initialChangeset.id, 'Le Repair Changeset conserve la référence parent');
  assert(repairChangeset.repairDetails?.repairAttempts === repairResult.attemptCount, 'Détails des tentatives de réparation conservés');
  assert(repairChangeset.repairDetails?.appliedFixes.length > 0, 'Liste des correctifs appliqués enregistrée');

  const repairArtifact = repairArtifactResult.repairArtifact;
  assert(repairArtifact.provenance === 'SYSTEM_REPAIR', 'La provenance de l\'artefact de réparation est "SYSTEM_REPAIR"');
  assert(repairArtifact.isValidated === true, 'L\'artefact de réparation est validé');

  const computedRepairedHash = validatedArtifactEngine.computeHash({
    html: repairResult.repairedHtml,
    files: [{ name: 'index.html', content: repairResult.repairedHtml }],
  });
  assert(repairArtifact.sha256Hash === computedRepairedHash, 'Hash SHA-256 de l\'artefact correspond au code réparé');
  assert(repairArtifactResult.verification.isMatch === true, 'La vérification cryptographique est MATCH');

  // -------------------------------------------------------------------------
  // TEST 2 — NO-REPAIR INTEGRITY (CODE PARFAIT SANS RÉPARATION)
  // -------------------------------------------------------------------------
  console.log('\n📋 Test 2 — Intégrité sans réparation (Changeset original conservé tel quel)');

  const cleanHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Clean</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen">
  <header class="p-6 bg-white border-b border-slate-200">
    <div class="flex items-center gap-3">
      <i data-lucide="check-circle" class="w-6 h-6 text-emerald-600"></i>
      <h1 class="text-xl font-bold">Composant Parfait</h1>
    </div>
  </header>
  <main class="p-6">
    <div class="p-4 bg-white rounded-xl shadow-sm border border-slate-200">
      <p class="text-slate-600">Tout est parfaitement conforme.</p>
    </div>
  </main>
  <script>
    if (window.lucide) {
      window.lucide.createIcons();
    }
  </script>
</body>
</html>`;

  const cleanChangeset = validatedArtifactEngine.generateChangeset({
    projectId,
    decisionId: 'dec_test_clean_2',
    planId: 'plan_test_clean_2',
    versionNumber: 2,
    summary: 'Composant propre sans défaut',
    diff: '+ Clean HTML',
    html: cleanHtml,
    actor: userId,
    autonomyLevel: 'AUTONOMOUS',
    rationale: 'Création propre',
    isAutoApproved: true,
  });

  const applyCleanRes = validatedArtifactEngine.applyChangeset(cleanChangeset.id);
  const cleanQuality = qualityEngine.evaluateQuality(applyCleanRes.appliedPayload.html);
  assert(cleanQuality.passed === true, 'Le code propre passe Quality Engine sans échec');

  // Vérifier qu'aucun repair changeset n'est généré et que le statut reste applied
  const currentCleanCs = validatedArtifactEngine.getChangeset(cleanChangeset.id);
  assert(currentCleanCs?.status === 'applied', 'Le changeset initial reste "applied" sans être superseded');
  assert(!currentCleanCs?.parentChangesetId, 'Aucun parentChangesetId (ce n\'est pas un patch)');

  // -------------------------------------------------------------------------
  // TEST 3 — INTÉGRATION COMPLÈTE VIA CONVERSATION ENGINE (PIPELINE UNIQUE)
  // -------------------------------------------------------------------------
  console.log('\n📋 Test 3 — Pipeline conversationnel complet avec auto-réparation intégrée');

  const convResult = await conversationEngine.processUserMessage({
    projectId,
    userId,
    prompt: 'Créer une calculatrice avec icônes et styles Tailwind',
    vibe: 'Modern',
    confirmedByUser: true,
  });

  assert(convResult.compassState === 'COMPLETED', 'Conversation terminée avec statut COMPLETED');
  assert(!!convResult.changeset, 'Changeset retourné dans le résultat');
  assert(!!convResult.validatedArtifact, 'ValidatedArtifact retourné dans le résultat');
  assert(convResult.artifactVerification?.isMatch === true, 'ArtifactVerification est valide (MATCH)');
  assert(convResult.changeset?.sha256Hash === convResult.validatedArtifact?.sha256Hash, 'Hash du Changeset === Hash de l\'Artefact Validé');

  console.log('\n=====================================================');
  console.log(`📊 BILAN PHASE 1 : ${passed} TESTS RÉUSSIS, ${failed} ÉCHECS`);
  console.log('=====================================================\n');

  return { passed, failed };
}

// Auto-run if direct execution
if (process.argv[1]?.includes('phase1PostRepairIntegrityTests')) {
  runPhase1PostRepairIntegrityTests()
    .then((result) => {
      if (result.failed > 0) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal error running Phase 1 tests:', err);
      process.exit(1);
    });
}
