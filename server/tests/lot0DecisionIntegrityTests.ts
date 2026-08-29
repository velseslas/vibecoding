import { validatedArtifactEngine } from '../artifacts/validatedArtifact';
import { planEngine } from '../plan/planEngine';
import { conversationEngine } from '../conversation/conversationEngine';
import crypto from 'crypto';

export async function runLot0DecisionIntegrityTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n=====================================================');
  console.log('🛡️ LOT 0 — SUITE DE TESTS DÉCISION INTEGRITY');
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

  const projectId = 'test_proj_integrity_' + crypto.randomBytes(3).toString('hex');
  const userId = 'usr_tester_integrity';

  // -------------------------------------------------------------------------
  // TEST 1 — IDENTITÉ DE L'ARTEFACT APPLIQUÉ
  // SHA256(applied_code) === SHA256(validated_artifact)
  // -------------------------------------------------------------------------
  console.log('📋 Test 1 — Identité cryptographique de l\'artefact appliqué');
  const sampleHtmlA = '<!DOCTYPE html><html><head><title>Test 1</title></head><body><main class="p-6"><h1>Artefact A</h1></main></body></html>';
  const expectedHashA = validatedArtifactEngine.computeHash({
    html: sampleHtmlA,
    files: [{ name: 'index.html', content: sampleHtmlA }],
  });

  const changeset1 = validatedArtifactEngine.generateChangeset({
    projectId,
    decisionId: 'dec_test_1',
    planId: 'plan_test_1',
    versionNumber: 1,
    summary: 'Création initiale du composant A',
    diff: '+ HTML composant A',
    html: sampleHtmlA,
    files: [{ name: 'index.html', content: sampleHtmlA }],
    actor: userId,
    autonomyLevel: 'AUTONOMOUS',
    rationale: 'Création initiale test',
    isAutoApproved: true,
  });

  assert(changeset1.sha256Hash === expectedHashA, 'Le hash du changeset correspond exactement au hash calculé du payload');

  const applyResult1 = validatedArtifactEngine.applyChangeset(changeset1.id);
  const actualAppliedHash1 = validatedArtifactEngine.computeHash(applyResult1.appliedPayload);

  assert(actualAppliedHash1 === changeset1.sha256Hash, 'Hash(code appliqué) === Hash(artefact validé) — Identité parfaite');
  assert(applyResult1.changeset.status === 'applied', 'Le statut du changeset passe à "applied" après application');
  assert(typeof applyResult1.changeset.appliedAt === 'number', 'Horodatage d\'application enregistré');

  // -------------------------------------------------------------------------
  // TEST 2 — REFUS D'APPLICATION SUR ARTEFACT NON VALIDÉ (PENDING / REJECTED)
  // -------------------------------------------------------------------------
  console.log('\n📋 Test 2 — Refus d\'application sur changeset non validé');
  const sampleHtmlPending = '<!DOCTYPE html><html><body><h1>Non validé</h1></body></html>';
  const changesetPending = validatedArtifactEngine.generateChangeset({
    projectId,
    decisionId: 'dec_test_2',
    planId: 'plan_test_2',
    versionNumber: 2,
    summary: 'Modification nécessitant validation',
    diff: '+ HTML en attente',
    html: sampleHtmlPending,
    files: [{ name: 'index.html', content: sampleHtmlPending }],
    actor: userId,
    autonomyLevel: 'HIGH',
    rationale: 'Opération à fort impact nécessitant validation explicite',
    isAutoApproved: false, // -> 'pending'
  });

  assert(changesetPending.status === 'pending', 'Le changeset à haut risque est créé avec le statut "pending"');

  let applyPendingFailed = false;
  try {
    validatedArtifactEngine.applyChangeset(changesetPending.id);
  } catch (err: any) {
    applyPendingFailed = true;
    assert(err.message.includes('n\'a pas encore été approuvé'), 'Blocage strict de l\'application : changeset non approuvé');
  }
  assert(applyPendingFailed, 'Échec garanti lors de la tentative d\'application d\'un changeset pending');

  // Rejet explicite
  validatedArtifactEngine.rejectChangeset(changesetPending.id, userId, 'Refusé par la gouvernance');
  const rejectedCs = validatedArtifactEngine.getChangeset(changesetPending.id);
  assert(rejectedCs?.status === 'rejected', 'Le statut passe à "rejected" après rejet');
  assert(rejectedCs?.rejectionReason === 'Refusé par la gouvernance', 'Raison du rejet enregistrée');

  let applyRejectedFailed = false;
  try {
    validatedArtifactEngine.applyChangeset(changesetPending.id);
  } catch (err: any) {
    applyRejectedFailed = true;
    assert(err.message.includes('REJETÉ'), 'Blocage strict de l\'application : changeset rejeté');
  }
  assert(applyRejectedFailed, 'Échec garanti lors de la tentative d\'application d\'un changeset rejected');

  // -------------------------------------------------------------------------
  // TEST 3 — RÉGÉNÉRATION = NOUVEL ARTEFACT (SUPERSEDING)
  // -------------------------------------------------------------------------
  console.log('\n📋 Test 3 — Régénération = Nouvel artefact B (Superseding d\'artefact A)');
  const sampleHtmlA2 = '<!DOCTYPE html><html><body><h1>Version Initiale A</h1></body></html>';
  const changesetA = validatedArtifactEngine.generateChangeset({
    projectId,
    decisionId: 'dec_test_3',
    planId: 'plan_test_3',
    versionNumber: 3,
    summary: 'Proposition A avant régénération',
    diff: '+ Proposition A',
    html: sampleHtmlA2,
    files: [{ name: 'index.html', content: sampleHtmlA2 }],
    actor: userId,
    autonomyLevel: 'MEDIUM',
    rationale: 'Proposition',
    isAutoApproved: false,
  });

  const sampleHtmlB = '<!DOCTYPE html><html><body><h1>Version Régénérée B avec nouveaux styles</h1></body></html>';
  const { oldChangeset: supersededA, newChangeset: changesetB } = validatedArtifactEngine.modifyOrRegenerateChangeset(
    changesetA.id,
    {
      summary: 'Proposition B régénérée suite à nouveau prompt',
      diff: '+ Proposition B régénérée',
      html: sampleHtmlB,
      files: [{ name: 'index.html', content: sampleHtmlB }],
      rationale: 'Régénération suite à feedback',
    },
    userId
  );

  const reloadedA = validatedArtifactEngine.getChangeset(changesetA.id);
  assert(reloadedA?.status === 'superseded', 'L\'ancien changeset A est marqué "superseded" (obsolète)');
  assert(reloadedA?.supersededBy === changesetB.id, 'Lien de filiation : A.supersededBy === B.id');
  assert(changesetB.status === 'pending', 'Le nouvel artefact B a son propre statut "pending"');
  assert(changesetB.id !== changesetA.id, 'Artefact B a un identifiant distinct de A');
  assert(changesetB.sha256Hash !== changesetA.sha256Hash, 'Artefact B a un hash cryptographique distinct de A');

  // Tenter d'appliquer le changeset obsolète A doit échouer
  let applySupersededFailed = false;
  try {
    validatedArtifactEngine.applyChangeset(changesetA.id);
  } catch (err: any) {
    applySupersededFailed = true;
    assert(err.message.includes('OBSOLÈTE'), 'Refus strict d\'application sur changeset superseded');
  }
  assert(applySupersededFailed, 'Échec garanti pour l\'application d\'un artefact superseded');

  // Approbation et application de B
  validatedArtifactEngine.approveChangeset(changesetB.id, userId);
  const applyB = validatedArtifactEngine.applyChangeset(changesetB.id);
  assert(applyB.changeset.status === 'applied', 'Artefact B approuvé appliqué avec succès');
  assert(applyB.appliedPayload.html === sampleHtmlB, 'Le code appliqué est exactement le payload de B');

  // -------------------------------------------------------------------------
  // TEST 4 — TRAÇABILITÉ DE LA PROVENANCE (EXPLICITE / IMPLICITE)
  // -------------------------------------------------------------------------
  console.log('\n📋 Test 4 — Traçabilité de la provenance (Explicite vs Implicite)');
  // 4.1 Implicite (autonome)
  const csImplicit = validatedArtifactEngine.generateChangeset({
    projectId,
    decisionId: 'dec_test_4_imp',
    planId: 'plan_test_4_imp',
    versionNumber: 4,
    summary: 'Opération autonome sans confirmation requise',
    diff: '+ Fix typo',
    html: '<div>Typo fixed</div>',
    files: [{ name: 'index.html', content: '<div>Typo fixed</div>' }],
    actor: 'ai_orchestrator',
    autonomyLevel: 'AUTONOMOUS',
    rationale: 'Faible risque, autonome',
    isAutoApproved: true,
  });
  assert(csImplicit.provenance.type === 'implicit', 'Provenance "implicit" pour une exécution autonome');
  assert(csImplicit.status === 'approved', 'Changeset autonome pré-approuvé');

  // 4.2 Explicite (validé par l'utilisateur)
  const csExplicit = validatedArtifactEngine.generateChangeset({
    projectId,
    decisionId: 'dec_test_4_exp',
    planId: 'plan_test_4_exp',
    versionNumber: 5,
    summary: 'Refonte majeure du schéma de données',
    diff: '+ Refactor schema',
    html: '<div>New schema UI</div>',
    files: [{ name: 'index.html', content: '<div>New schema UI</div>' }],
    actor: userId,
    autonomyLevel: 'HIGH',
    rationale: 'Haut risque, demande validation explicite',
    isAutoApproved: false,
  });
  assert(csExplicit.provenance.type === 'explicit', 'Provenance "explicit" configurée');
  assert(csExplicit.status === 'pending', 'Changeset explicite initialisé en "pending"');

  const approvedExplicit = validatedArtifactEngine.approveChangeset(csExplicit.id, userId);
  assert(approvedExplicit.status === 'approved', 'Changeset validé par l\'utilisateur passe en "approved"');
  assert(approvedExplicit.approvedBy === userId, 'Identifiant de l\'utilisateur validateur tracé avec exactitude');

  // -------------------------------------------------------------------------
  // TEST 5 — NON-RÉGÉNÉRATION À L'APPLICATION (APPLICATION PURE & EXACTE)
  // -------------------------------------------------------------------------
  console.log('\n📋 Test 5 — Non-régénération à l\'application (Exact Payload Application)');
  const exactUniqueString = `UNIQUE_TOKEN_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const exactPayloadHtml = `<!DOCTYPE html><html><body><div id="content">${exactUniqueString}</div></body></html>`;

  const csForExactApply = validatedArtifactEngine.generateChangeset({
    projectId,
    decisionId: 'dec_test_5',
    planId: 'plan_test_5',
    versionNumber: 6,
    summary: 'Test payload exact',
    diff: `+ ${exactUniqueString}`,
    html: exactPayloadHtml,
    files: [{ name: 'index.html', content: exactPayloadHtml }],
    actor: userId,
    autonomyLevel: 'AUTONOMOUS',
    rationale: 'Vérification non-altération',
    isAutoApproved: true,
  });

  const applyRes5 = validatedArtifactEngine.applyChangeset(csForExactApply.id);
  assert(applyRes5.appliedPayload.html.includes(exactUniqueString), 'Le payload appliqué contient la signature exacte sans altération');
  assert(applyRes5.appliedPayload.html === exactPayloadHtml, 'Identité stricte caractère par caractère du code appliqué');

  // -------------------------------------------------------------------------
  // TEST 6 — INTÉGRITÉ DE BOUT EN BOUT VIA CONVERSATION ENGINE
  // -------------------------------------------------------------------------
  console.log('\n📋 Test 6 — Intégrité de bout en bout via conversationEngine');
  const pipelineResult = await conversationEngine.processUserMessage({
    projectId,
    userId,
    prompt: 'Ajouter un tableau de bord analytique avec graphiques de performance',
    vibe: 'Modern SaaS',
    confirmedByUser: true,
  });

  assert(pipelineResult.compassState === 'COMPLETED', 'Pipeline conversationnel exécuté avec succès jusqu\'à COMPLETED');
  assert(!!pipelineResult.changeset, 'Un Changeset formel a été produit par le pipeline');
  assert(pipelineResult.changeset?.status === 'applied', 'Le Changeset généré a été appliqué');
  assert(!!pipelineResult.changeset?.decisionId, 'Le Changeset est rattaché à un decisionId traçable');
  assert(!!pipelineResult.plan, 'Un plan d\'exécution vérifiable a été associé');
  assert(pipelineResult.artifactVerification?.isMatch === true, 'La vérification cryptographique de l\'artefact est validée');

  // Test de rejet via l'API conversationnelle
  const pendingPipelineResult = await conversationEngine.processUserMessage({
    projectId,
    userId,
    prompt: 'Annuler et rejeter le plan en cours',
    rejectPlan: true,
  });
  assert(pendingPipelineResult.compassState === 'EXPLORING', 'Le refus utilisateur ramène le compas à l\'état EXPLORING');
  assert(pendingPipelineResult.requiresUserConfirmation === false, 'Aucune confirmation restante après annulation');

  console.log('\n=====================================================');
  console.log(`📊 BILAN DU LOT 0 : ${passed} TESTS RÉUSSIS, ${failed} ÉCHECS`);
  console.log('=====================================================\n');

  return { passed, failed };
}

// Auto-run when executed directly as entrypoint
if (process.argv[1]?.includes('lot0DecisionIntegrityTests')) {
  runLot0DecisionIntegrityTests()
    .then((result) => {
      if (result.failed > 0) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal error running Lot 0 tests:', err);
      process.exit(1);
    });
}
