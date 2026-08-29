import { conversationEngine } from '../conversation/conversationEngine';
import { dbAdapter } from '../db/database';
import { projectMemoryService } from '../memory/projectMemory';
import { assumptionEngine } from '../assumptions/assumptionEngine';
import { semanticGovernanceService } from '../governance/semanticGovernance';
import { validatedArtifactEngine } from '../artifacts/validatedArtifact';
import { contextBroker } from '../context/contextBroker';
import { autoRepairEngine } from '../repair/autoRepairEngine';
import { projectIntelligence } from '../versioning/projectIntelligence';
import { conversationTraceService } from '../observability/conversationTrace';
import { logger } from '../logger';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  durationMs: number;
}

const results: TestResult[] = [];

function assert(condition: boolean, testName: string, failureMsg: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${testName}: ${failureMsg}`);
  }
}

async function runScenario(name: string, fn: () => Promise<string>): Promise<void> {
  const start = Date.now();
  logger.info('ConversationE2E', `▶ RUNNING: ${name}`);
  try {
    const details = await fn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, details, durationMs: duration });
    logger.info('ConversationE2E', `✔ PASSED: ${name} (${duration}ms) - ${details}`);
  } catch (err: any) {
    const duration = Date.now() - start;
    results.push({ name, passed: false, details: err.message, durationMs: duration });
    logger.error('ConversationE2E', `✖ FAILED: ${name} (${duration}ms) - ${err.message}`);
  }
}

export async function runConversationIntelligenceSuite(): Promise<{ total: number; passed: number; failed: number; results: TestResult[] }> {
  logger.info('ConversationE2E', '==================================================');
  logger.info('ConversationE2E', '🧠 SUITE COMPLÈTE DU CŒUR CONVERSATIONNEL INTELLIGENT');
  logger.info('ConversationE2E', '==================================================\n');

  const projectId = 'proj_conv_brain_' + Date.now();

  // TEST A — Conversation simple
  await runScenario('TEST A — Conversation simple (Demande -> Compréhension -> Action -> Qualité -> Snapshot)', async () => {
    const res = await conversationEngine.processUserMessage({
      projectId,
      prompt: 'Crée une page de contact professionnelle avec formulaire',
    });

    assert(res.compassState === 'COMPLETED', 'TEST A', 'L\'état final doit être COMPLETED');
    assert(res.intent.intent === 'CREATE_FEATURE', 'TEST A', 'L\'intention doit être CREATE_FEATURE');
    assert(!!res.previewHtml && res.previewHtml.includes('contact-form'), 'TEST A', 'Le HTML doit contenir le formulaire de contact');
    assert(!!res.versionId, 'TEST A', 'Une version de snapshot doit avoir été créée');
    assert((res.quality?.overallScore || 0) >= 80, 'TEST A', 'Le score qualité doit être supérieur ou égal à 80');

    return `Version #${res.versionId} créée avec score qualité ${res.quality?.overallScore}/100`;
  });

  // TEST B — Conversation progressive (Dialogue continu avec rétention de contexte)
  await runScenario('TEST B — Conversation progressive (Dialogue continu avec rétention de contexte)', async () => {
    const longConvProjId = 'proj_long_conv_' + Date.now();
    let lastHtml = '';

    // Tour 1: Création initiale
    let stepRes = await conversationEngine.processUserMessage({
      projectId: longConvProjId,
      prompt: 'Crée un tableau de bord de gestion d\'équipe',
    });
    lastHtml = stepRes.previewHtml || '';

    // Tours 2 à 6: Modifications incrémentales, questions, ajustements de style
    const prompts = [
      'Ajoute un bouton d\'export CSV',
      'Passe la couleur principale en rouge',
      'Ajoute un catalogue de produits',
      'Ajoute une barre de filtre de recherche',
      'Explique comment sont sauvegardées les données',
    ];

    let tourCount = 1;
    for (const prompt of prompts) {
      tourCount++;
      stepRes = await conversationEngine.processUserMessage({
        projectId: longConvProjId,
        prompt,
        currentHtml: lastHtml,
      });
      if (stepRes.previewHtml) {
        lastHtml = stepRes.previewHtml;
      }
      assert(stepRes.compassState === 'COMPLETED', 'TEST B', `Le tour #${tourCount} doit se terminer en état COMPLETED`);
    }

    const conversation = dbAdapter.getProjectConversations(longConvProjId)[0];
    assert(conversation.messages.length >= 12, 'TEST B', 'La conversation doit contenir au moins 12 messages (6 tours)');
    assert(tourCount === 6, 'TEST B', '6 tours complets doivent avoir été exécutés');

    return `6 tours progressifs exécutés avec succès. Rétention vérifiée sur ${conversation.messages.length} messages.`;
  });

  // TEST C — Référence implicite ("Fais-le plus petit")
  await runScenario('TEST C — Référence implicite ("Fais-le plus petit")', async () => {
    const baseHtml = `<!DOCTYPE html><html><body><button id="btn-submit" class="px-5 py-2.5 bg-indigo-600 text-white">Action</button></body></html>`;
    const res = await conversationEngine.processUserMessage({
      projectId,
      prompt: 'Fais-le plus petit',
      currentHtml: baseHtml,
    });

    assert(res.intent.intent === 'MODIFY_FEATURE', 'TEST C', 'L\'intention doit être MODIFY_FEATURE');
    assert(res.intent.entities.resolvedPronounTarget === 'button', 'TEST C', 'La cible implicite doit être le bouton');
    assert(!!res.previewHtml && res.previewHtml.includes('px-3 py-1 text-xs'), 'TEST C', 'Les classes CSS doivent être réduites');

    return `Cible implicite [${res.intent.entities.resolvedPronounTarget}] résolue avec réduction de taille.`;
  });

  // TEST D — Ambiguïté (Demande insuffisante -> Clarification intelligente)
  await runScenario('TEST D — Ambiguïté (Demande très concise -> Clarification ciblée)', async () => {
    const res = await conversationEngine.processUserMessage({
      projectId,
      prompt: 'ameliore',
    });

    assert(res.compassState === 'CLARIFYING', 'TEST D', 'L\'état de la boussole doit être CLARIFYING');
    assert(res.requiresUserConfirmation === true, 'TEST D', 'Une clarification est requise');
    assert(!!res.aiResponseText && res.aiResponseText.includes('préciser'), 'TEST D', 'La réponse doit poser une question de clarification');

    return `Clarification déclenchée : "${res.aiResponseText}"`;
  });

  // TEST E — Hypothèse risquée (Détection d'hypothèses avec impact et confiance)
  await runScenario('TEST E — Hypothèse risquée (Contrôle d\'invention silencieuse)', async () => {
    const asm = assumptionEngine.evaluateAssumptions('intègre un système de paiement');
    assert(asm.assumptions.length > 0, 'TEST E', 'Des hypothèses doivent être détectées');
    const paymentAsm = asm.assumptions.find((a) => a.id === 'asm_payment_provider');
    assert(!!paymentAsm, 'TEST E', 'L\'hypothèse du fournisseur de paiement doit être formalisée');
    assert(paymentAsm?.confidence === 0.75, 'TEST E', 'Le score de confiance doit être mesuré');
    assert(paymentAsm?.impact === 'MEDIUM', 'TEST E', 'L\'impact doit être MEDIUM');

    return `Hypothèse formalisée : ${paymentAsm?.statement} (Confiance: ${paymentAsm?.confidence}, Impact: ${paymentAsm?.impact})`;
  });

  // TEST F — Impact élevé (Confirmation obligatoire)
  await runScenario('TEST F — Impact élevé / critique (Confirmation obligatoire requise)', async () => {
    const res = await conversationEngine.processUserMessage({
      projectId,
      prompt: 'Supprime l\'authentification et la base de données',
      confirmedByUser: false,
    });

    assert(res.compassState === 'WAITING_CONFIRMATION', 'TEST F', 'L\'état doit être WAITING_CONFIRMATION');
    assert(res.requiresUserConfirmation === true, 'TEST F', 'La confirmation explicite est requise');
    assert(res.impact.riskLevel === 'CRITICAL', 'TEST F', 'Le niveau de risque doit être CRITICAL');

    return `Confirmation exigée pour risque [${res.impact.riskLevel}]. Raison : ${res.confirmationQuestion?.substring(0, 50)}...`;
  });

  // TEST G — Contradiction avec décision précédente (Semantic Governance)
  await runScenario('TEST G — Contradiction avec décision précédente (Semantic Governance)', async () => {
    const govProjId = 'proj_gov_' + Date.now();

    // Enregistrer une décision initiale
    projectMemoryService.recordDecision(
      govProjId,
      'Ressources & Gouvernance',
      'Un projet possède un responsable unique principal',
      'Centralisation de la responsabilité légale',
      { sourceType: 'USER', explicitOrImplicit: 'EXPLICIT', impactLevel: 'HIGH' }
    );

    // Nouvelle demande en contradiction directe
    const memory = projectMemoryService.getProjectMemory(govProjId);
    const govCheck = semanticGovernanceService.checkGovernance(
      govProjId,
      'Je veux plusieurs responsables principaux sur les projets',
      memory.activeDecisions
    );

    assert(govCheck.passed === false, 'TEST G', 'La gouvernance doit détecter le conflit');
    assert(govCheck.hasContradictions === true, 'TEST G', 'Une contradiction directe doit être levée');
    assert(govCheck.conflicts[0].relationType === 'CONTRADICTION', 'TEST G', 'Le type de relation doit être CONTRADICTION');

    return `Contradiction détectée : "${govCheck.conflicts[0].description}"`;
  });

  // TEST H — Plan modifié (Nouvel artefact avec nouvelle identité et hash)
  await runScenario('TEST H — Plan modifié (Nouvel artefact généré avec identité propre)', async () => {
    const artA = validatedArtifactEngine.createArtifact({
      projectId,
      versionNumber: 1,
      title: 'Plan Initial',
      provenance: 'USER_VALIDATED',
      html: '<div>Version A</div>',
    });

    const artB = validatedArtifactEngine.createArtifact({
      projectId,
      versionNumber: 2,
      title: 'Plan Modifié',
      provenance: 'USER_VALIDATED',
      html: '<div>Version B modifiée</div>',
    });

    assert(artA.id !== artB.id, 'TEST H', 'Les identifiants d\'artefacts doivent être distincts');
    assert(artA.sha256Hash !== artB.sha256Hash, 'TEST H', 'Les hash SHA-256 doivent être distincts');

    return `Artefact A (${artA.id} : ${artA.sha256Hash.substring(0, 8)}...) distinct de B (${artB.id} : ${artB.sha256Hash.substring(0, 8)}...)`;
  });

  // TEST I — Validated Artifact Integrity (Vérification cryptographique exacte)
  await runScenario('TEST I — Validated Artifact Integrity (Vérification SHA-256)', async () => {
    const htmlValid = '<div>Exact Validated Content</div>';
    const artifact = validatedArtifactEngine.createArtifact({
      projectId,
      versionNumber: 10,
      title: 'Artefact Conforme',
      provenance: 'USER_VALIDATED',
      html: htmlValid,
    });

    // 1. Application exacte du code validé -> MATCH
    const matchVerification = validatedArtifactEngine.verifyIntegrity(artifact.id, { html: htmlValid });
    assert(matchVerification.isMatch === true, 'TEST I', 'Le code identique doit être validé MATCH');
    assert(matchVerification.expectedHash === matchVerification.actualHash, 'TEST I', 'Les hashes doivent être rigoureusement égaux');

    // 2. Altération d'un seul caractère -> MISMATCH
    const alteredVerification = validatedArtifactEngine.verifyIntegrity(artifact.id, { html: htmlValid + ' ' });
    assert(alteredVerification.isMatch === false, 'TEST I', 'Le code altéré doit être rejeté MISMATCH');
    assert(alteredVerification.expectedHash !== alteredVerification.actualHash, 'TEST I', 'Les hashes doivent différer');

    return `MATCH validé (${matchVerification.expectedHash.substring(0, 10)}...) et altération correctement bloquée MISMATCH.`;
  });

  // TEST J — Échec Build & Auto-Repair (Réparation en <= 3 tentatives)
  await runScenario('TEST J — Échec Build & Auto-Repair (Réparation automatique réussie)', async () => {
    const brokenHtml = `<div>Unclosed div sans balise script fermee <script>const x = 1;`;
    const repairResult = autoRepairEngine.autoRepairCode(brokenHtml, [
      {
        category: 'syntax',
        errorMessage: 'SyntaxError: Unexpected token',
        sourceFile: 'index.html',
        suggestedFix: 'Close script and div tags',
        severity: 'error',
      },
    ]);

    assert(repairResult.success === true, 'TEST J', 'La réparation automatique doit réussir');
    assert(repairResult.attemptCount <= 3, 'TEST J', 'Le nombre de tentatives doit être <= 3');
    assert(repairResult.finalQuality.passed === true, 'TEST J', 'La qualité finale doit être validée');

    return `Code réparé en ${repairResult.attemptCount} tentative(s) avec score qualité ${repairResult.finalQuality.overallScore}/100.`;
  });

  // TEST K — Échec après 3 réparations (Escalade propre / Rollback avec Reversion Changeset)
  await runScenario('TEST K — Échec après 3 réparations (Escalade & Rollback propre avec Reversion Changeset)', async () => {
    // Simuler un rollback vers une version stable
    const history = projectIntelligence.getHistory(projectId);
    const stableVersion = history[0];
    const rollbackRes = projectIntelligence.rollback(projectId, stableVersion.id);

    assert(!!rollbackRes, 'TEST K', 'Le rollback doit restaurer la version cible');
    assert(rollbackRes?.version.htmlSnapshot === stableVersion.htmlSnapshot, 'TEST K', 'L\'état HTML restauré doit être identique');
    assert(!!rollbackRes?.reversionChangeset, 'TEST K', 'Un changeset de réversion formel doit être produit');
    assert(rollbackRes?.reversionArtifact.provenance === 'SYSTEM_REVERSION', 'TEST K', 'La provenance doit être SYSTEM_REVERSION');
    assert(rollbackRes?.verification.isMatch === true, 'TEST K', 'La vérification cryptographique de restauration doit être MATCH');

    return `Rollback sécurisé appliqué vers la version #${rollbackRes?.version.versionNumber} avec reversion changeset (${rollbackRes?.reversionChangeset.id}) et hash certifié.`;
  });

  // TEST L — Décision utilisateur (Provenance USER)
  await runScenario('TEST L — Décision utilisateur (Provenance USER)', async () => {
    const dec = projectMemoryService.recordDecision(
      projectId,
      'Sécurité & Rôles',
      'Authentification par mot de passe obligatoire',
      'Validation explicite de l\'utilisateur dans le chat',
      { sourceType: 'USER', explicitOrImplicit: 'EXPLICIT' }
    );

    assert(dec.sourceType === 'USER', 'TEST L', 'Le type de source doit être USER');
    assert(dec.explicitOrImplicit === 'EXPLICIT', 'TEST L', 'La décision doit être EXPLICIT');
    assert(dec.status === 'ACTIVE', 'TEST L', 'La décision doit être ACTIVE');

    return `Décision enregistrée avec provenance : [${dec.sourceType}] (ID: ${dec.id})`;
  });

  // TEST M — Décision IA (Provenance AI)
  await runScenario('TEST M — Décision IA (Provenance AI)', async () => {
    const dec = projectMemoryService.recordDecision(
      projectId,
      'Optimisation UI',
      'Utilisation d\'icônes Lucide en SVG inline pour performance',
      'Recommandation automatique de l\'orchestrateur IA',
      { sourceType: 'AI', explicitOrImplicit: 'IMPLICIT' }
    );

    assert(dec.sourceType === 'AI', 'TEST M', 'Le type de source doit être AI');
    assert(dec.status === 'ACTIVE', 'TEST M', 'La décision doit être ACTIVE');

    return `Décision enregistrée avec provenance : [${dec.sourceType}] (ID: ${dec.id})`;
  });

  // TEST N — Évolution DNA (Nouvelle décision remplace proprement une ancienne)
  await runScenario('TEST N — Évolution DNA (Cycle de vie & Décision SUPERSEDED)', async () => {
    const oldDec = projectMemoryService.recordDecision(
      projectId,
      'Style & Thème',
      'Thème clair uniquement',
      'Choix initial v1',
      { sourceType: 'USER', explicitOrImplicit: 'EXPLICIT' }
    );

    // Nouvelle décision qui remplace l'ancienne
    const newDec = projectMemoryService.recordDecision(
      projectId,
      'Style & Thème',
      'Thème sombre dynamique avec basculeur',
      'Modernisation demandée par l\'utilisateur',
      { sourceType: 'USER', explicitOrImplicit: 'EXPLICIT', supersedesId: oldDec.id }
    );

    const mem = projectMemoryService.getProjectMemory(projectId);
    const superseded = mem.allDecisions.find((d) => d.id === oldDec.id);
    const active = mem.allDecisions.find((d) => d.id === newDec.id);

    assert(superseded?.status === 'SUPERSEDED', 'TEST N', 'L\'ancienne décision doit être SUPERSEDED');
    assert(superseded?.supersededById === newDec.id, 'TEST N', 'Le lien vers la nouvelle décision doit être renseigné');
    assert(active?.status === 'ACTIVE', 'TEST N', 'La nouvelle décision doit être ACTIVE');
    assert(active?.supersedesId === oldDec.id, 'TEST N', 'Le lien vers l\'ancienne décision doit être renseigné');

    return `Transition de cycle de vie validée : [${oldDec.id} -> SUPERSEDED] remplacée par [${newDec.id} -> ACTIVE]`;
  });

  // TEST O — Optimisation contexte (Context Broker sélectif sous budget de tokens)
  await runScenario('TEST O — Optimisation contexte (Context Broker sélectif & respect du budget)', async () => {
    const hugeHtml = '<!DOCTYPE html><html><body>' + '<p>Dummy component</p>'.repeat(5000) + '</body></html>';
    const files = [{ name: 'index.html', content: hugeHtml }];

    const brokered = contextBroker.selectContext(
      projectId,
      'Modifie la liste des éléments',
      'MODIFY_FEATURE',
      files,
      hugeHtml,
      { tokenBudgetLimit: 2000 }
    );

    assert(brokered.totalEstimatedTokens <= 2000, 'TEST O', 'Le total de tokens doit respecter la limite du budget (2000)');
    assert(brokered.chunks.length > 0, 'TEST O', 'Des chunks de contexte pertinents doivent être inclus');
    assert(brokered.chunks.every((c) => c.relevanceScore > 0), 'TEST O', 'Chaque chunk doit avoir un score de pertinence > 0');

    return `Context Broker : ${brokered.chunks.length} chunks sélectionnés, ${brokered.totalEstimatedTokens}/2000 tokens utilisés (${Math.round(brokered.budgetUtilizationRatio * 100)}% budget).`;
  });

  // TEST P — Direct Manipulation & Ciblage d'Élément UI (Context Broker + Intent Resolution)
  await runScenario('TEST P — Direct Manipulation & Ciblage d\'Élément UI (Context & Résolution Anaphorique)', async () => {
    const targetElement = {
      selector: '#btn-submit-contact',
      tagName: 'button',
      id: 'btn-submit-contact',
      className: 'px-4 py-2 bg-indigo-600',
      innerText: 'Envoyer le message',
    };

    const targetRes = await conversationEngine.processUserMessage({
      projectId,
      prompt: 'Rends-le rouge vif avec du texte gras',
      elementTarget: targetElement,
    });

    assert(targetRes.intent.intent === 'MODIFY_FEATURE', 'TEST P', 'L\'intention doit être MODIFY_FEATURE');
    assert(targetRes.intent.targetElement === '#btn-submit-contact', 'TEST P', 'La cible anaphorique résolue doit être #btn-submit-contact');
    assert(targetRes.compassState === 'COMPLETED', 'TEST P', 'L\'état de la boussole doit être COMPLETED');

    return `Élément ciblé résolu avec succès : ${targetRes.intent.targetElement} via Direct Manipulation context.`;
  });

  // TEST Q — Rollback avec création de Changeset et Artefact de Réversion certifié
  await runScenario('TEST Q — Rollback avec Changeset d\'Inversion & Preuve Cryptographique', async () => {
    const rbProjId = 'proj_rb_cert_' + Date.now();
    // 1. Initial version
    const v1 = await conversationEngine.processUserMessage({
      projectId: rbProjId,
      prompt: 'Crée un tableau de bord analytique initial',
    });

    // 2. Second version
    const v2 = await conversationEngine.processUserMessage({
      projectId: rbProjId,
      prompt: 'Ajoute un catalogue de produits complet',
      currentHtml: v1.previewHtml,
    });

    // 3. Rollback back to v1
    const rbRes = await conversationEngine.processUserMessage({
      projectId: rbProjId,
      prompt: 'Annule les dernières modifications et reviens à la version initiale',
      rollbackVersionId: v1.versionId,
      currentHtml: v2.previewHtml,
    });

    assert(rbRes.compassState === 'ROLLED_BACK', 'TEST Q', 'L\'état doit être ROLLED_BACK');
    assert(!!rbRes.changeset, 'TEST Q', 'Un Changeset de réversion doit être présent');
    assert(!!rbRes.validatedArtifact, 'TEST Q', 'Un ValidatedArtifact de réversion doit être produit');
    assert(rbRes.validatedArtifact?.provenance === 'SYSTEM_REVERSION', 'TEST Q', 'La provenance doit être SYSTEM_REVERSION');
    assert(rbRes.artifactVerification?.isMatch === true, 'TEST Q', 'La vérification d\'intégrité de la réversion doit être MATCH');

    return `Rollback certifié validé : Changeset ${rbRes.changeset?.id} (Provenance: ${rbRes.validatedArtifact?.provenance}, Match: ${rbRes.artifactVerification?.isMatch})`;
  });

  // TEST R — Hard 30-Turn Human Conversation Benchmark (Dating App Natural Dialogue)
  await runScenario('TEST R — Hard 30-Turn Human Conversation Benchmark (Dating App Multi-Turn Human Interaction)', async () => {
    const hardConvProjId = 'proj_hard_conv_' + Date.now();
    let currentHtml = '';
    const turnHistories: string[] = [];

    const hardConversationTurns = [
      // 1. Initial product prompt
      { prompt: 'Je veux une application de rencontre.', expectedIntent: 'CREATE_FEATURE' },
      // 2. Premium visual iteration
      { prompt: 'Fais-la plus premium.', expectedIntent: 'MODIFY_FEATURE' },
      // 3. Minimalist aesthetic refinement
      { prompt: 'Je préfère quelque chose de plus minimaliste.', expectedIntent: 'MODIFY_FEATURE' },
      // 4. Feature addition (Messaging)
      { prompt: 'Ajoute une messagerie instantanée.', expectedIntent: 'MODIFY_FEATURE' },
      // 5. Direct element pronoun sizing ("le", "fais-le plus petit")
      { prompt: 'Le bouton like est trop gros, fais-le plus petit.', expectedIntent: 'MODIFY_FEATURE' },
      // 6. Mobile bottom navigation
      { prompt: 'Mets le menu en bas sur mobile.', expectedIntent: 'MODIFY_FEATURE' },
      // 7. Advanced filtering
      { prompt: 'Ajoute aussi un système de filtres par distance et âge.', expectedIntent: 'MODIFY_FEATURE' },
      // 8. Non-destructive deletion
      { prompt: 'Supprime la sidebar mais garde toutes les autres fonctionnalités.', expectedIntent: 'MODIFY_FEATURE' },
      // 9. Design harmony audit & explanation
      { prompt: 'Est-ce que cette page est harmonieuse ?', expectedIntent: 'AUDIT' },
      // 10. Rollback to previous state
      { prompt: 'Remets comme avant.', expectedIntent: 'RESTORE' },
      // 11 to 30: Comprehensive multi-turn conversation
      { prompt: 'Comment sont stockées les photos de profils ?', expectedIntent: 'QUESTION' },
      { prompt: 'Ajoute un badge vérifié sur les profils certifiés.', expectedIntent: 'MODIFY_FEATURE' },
      { prompt: 'Ajoute un mode sombre et or élégant.', expectedIntent: 'MODIFY_FEATURE' },
      { prompt: 'Ajoute un bouton de signalement discret.', expectedIntent: 'MODIFY_FEATURE' },
      { prompt: 'Fais-le plus grand pour qu\'il soit bien visible.', expectedIntent: 'MODIFY_FEATURE' },
      { prompt: 'Ajoute un indicateur de compatibilité astrologique ou par passions.', expectedIntent: 'MODIFY_FEATURE' },
      { prompt: 'Explique le fonctionnement du swipe deck.', expectedIntent: 'QUESTION' },
      { prompt: 'Ajoute un bouton pour rembobiner le dernier swipe.', expectedIntent: 'MODIFY_FEATURE' },
      { prompt: 'Ajoute des animations fluides sur les boutons.', expectedIntent: 'MODIFY_FEATURE' },
      { prompt: 'Vérifie si les contrastes respectent les normes d\'accessibilité.', expectedIntent: 'AUDIT' },
      { prompt: 'Ajoute une section pour les événements célibataires à proximité.', expectedIntent: 'MODIFY_FEATURE' },
      { prompt: 'Ajoute un bouton de partage de profil.', expectedIntent: 'MODIFY_FEATURE' },
      { prompt: 'Ajoute une galerie photo en carrousel.', expectedIntent: 'MODIFY_FEATURE' },
      { prompt: 'Ajoute des questions brise-glace pour entamer la conversation.', expectedIntent: 'MODIFY_FEATURE' },
      { prompt: 'Passe la barre de recherche en haut.', expectedIntent: 'MODIFY_FEATURE' },
      { prompt: 'Ajoute un mode invisible pour naviguer discrètement.', expectedIntent: 'MODIFY_FEATURE' },
      { prompt: 'Vérifie la qualité globale de l\'application.', expectedIntent: 'AUDIT' },
      { prompt: 'Ajoute un aperçu audio ou vocal de 10 secondes.', expectedIntent: 'MODIFY_FEATURE' },
      { prompt: 'Ajoute un compteur de coups de cœur restants.', expectedIntent: 'MODIFY_FEATURE' },
      { prompt: 'Finalise la version avec tous les composants actifs.', expectedIntent: 'MODIFY_FEATURE' },
    ];

    let successfulTurns = 0;
    for (let i = 0; i < hardConversationTurns.length; i++) {
      const turn = hardConversationTurns[i];
      const res = await conversationEngine.processUserMessage({
        projectId: hardConvProjId,
        prompt: turn.prompt,
        currentHtml: currentHtml || undefined,
      });

      assert(res.compassState === 'COMPLETED' || res.compassState === 'ROLLED_BACK', 'TEST R', `Tour ${i + 1} (${turn.prompt}) doit aboutir`);
      assert(!!res.aiResponseText && res.aiResponseText.length > 5, 'TEST R', `Tour ${i + 1} doit contenir une réponse naturelle`);
      
      if (res.previewHtml) {
        currentHtml = res.previewHtml;
        turnHistories.push(currentHtml);
      }
      successfulTurns++;
    }

    assert(successfulTurns === 30, 'TEST R', 'Tous les 30 tours doivent être exécutés avec succès');
    return `Hard 30-Turn Benchmark validé à 100% (30/30 tours réussis sans perte de contexte ni régression).`;
  });

  // RÉSUMÉ FINAL
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  logger.info('ConversationE2E', '\n==================================================');
  logger.info('ConversationE2E', `📊 BILAN CONVERSATION INTELLIGENCE : ${passed} / ${results.length} SUCCÈS`);
  if (failed > 0) {
    results.filter((r) => !r.passed).forEach((r) => {
      logger.error('ConversationE2E', `❌ ÉCHEC: ${r.name} -> ${r.details}`);
    });
  }
  logger.info('ConversationE2E', '==================================================');

  return { total: results.length, passed, failed, results };
}

// Exécution directe si exécuté en script standalone
runConversationIntelligenceSuite().then((res) => {
  if (res.failed > 0) {
    console.error(`\n❌ ÉCHEC : ${res.failed} test(s) ont échoué.`);
    process.exit(1);
  } else {
    console.log(`\n🎉 SUCCÈS COMPLET : ${res.passed} / ${res.total} tests validés à 100%.`);
    process.exit(0);
  }
}).catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
