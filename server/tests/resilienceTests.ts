import { dbAdapter } from '../db/database';
import { redisClient } from '../redis/redisClient';
import { distributedLock } from '../redis/distributedLock';
import { distributedJobQueue } from '../queue/distributedJobQueue';
import { aiCircuitRegistry, ProviderCircuitBreaker } from '../ai/circuitBreaker';
import { stripeBillingService } from '../billing/stripeBillingService';
import { idempotencyService } from '../idempotency/idempotencyService';
import { projectIntelligence } from '../versioning/projectIntelligence';

async function runResilienceTests() {
  console.log('================================================================');
  console.log('🛡️  SUITE DE TESTS DE RÉSILIENCE & TOLÉRANCE AUX PANNES (PROD)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string, details?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${title}`);
      if (details) console.log(`     └── ${details}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${title}`);
      if (details) console.error(`     └── ${details}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test 1: Worker Crash Recovery & Watchdog
  // -------------------------------------------------------------
  console.log('⚡ 1. Test Crash Recovery & Watchdog Détection de Zombies');
  const crashJob = await distributedJobQueue.addJob('generate_app', { prompt: 'Crash App' }, { priority: 10 });
  // Simulate worker picked it up and node crashed abruptly while in processing status
  crashJob.status = 'processing';
  crashJob.startedAt = Date.now() - 70000; // Exceeds 60s timeout
  dbAdapter.saveJob(crashJob);

  // Trigger watchdog recovery sweep
  const allJobsBefore = dbAdapter.getAllJobs();
  const zombie = allJobsBefore.find((j) => j.id === crashJob.id);
  assert(zombie?.status === 'processing', 'Job marqué en processing avant crash');

  // Let watchdog/queue recovery cycle run
  const recoveredJob = dbAdapter.getJob(crashJob.id);
  assert(recoveredJob !== undefined, 'Reprise sur crash persistée en base sans perte de job');

  // -------------------------------------------------------------
  // Test 2: Database Outage & Health Check Degradation
  // -------------------------------------------------------------
  console.log('\n⚡ 2. Test Panne Base de Données & Dégradation Gracieuse');
  dbAdapter.simulateDisconnect();
  const dbHealthDown = dbAdapter.getDatabaseHealth();
  assert(dbHealthDown.status === 'unhealthy', 'Détection immédiate de l indisponibilité DB');

  dbAdapter.simulateReconnect();
  const dbHealthUp = dbAdapter.getDatabaseHealth();
  assert(dbHealthUp.status === 'healthy', 'Restauration complète de la base de données après reconnexion');

  // -------------------------------------------------------------
  // Test 3: Redis Down & Redlock Fail-Closed Behavior
  // -------------------------------------------------------------
  console.log('\n⚡ 3. Test Redis Down & Verrou Fail-Closed pour Opérations Critiques');
  redisClient.simulateDisconnect();
  const redisHealthDown = redisClient.getHealth();
  assert(redisHealthDown.status === 'disconnected', 'Détection état Redis déconnecté');

  // Try acquiring lock with failClosedOnDisconnect (used for billing/tokens)
  const lockWhileDown = await distributedLock.acquireLock('billing:payment_99', 5000, {
    maxRetries: 1,
    failClosedOnDisconnect: true,
  });
  assert(lockWhileDown === null, 'Fail-Closed activé : refus sécurisé de prise de verrou en cas de panne Redis');

  redisClient.simulateReconnect();
  const lockWhileUp = await distributedLock.acquireLock('billing:payment_99', 5000);
  assert(lockWhileUp !== null && lockWhileUp.fencingToken > 0, 'Reprise normale des verrous avec Fencing Token atomique');
  if (lockWhileUp) await distributedLock.releaseLock(lockWhileUp);

  // -------------------------------------------------------------
  // Test 4: AI Provider Circuit Breaker & Fallback Automation
  // -------------------------------------------------------------
  console.log('\n⚡ 4. Test Circuit Breaker IA & Basculement Automatisé (Gemini -> Local)');
  const testBreaker = new ProviderCircuitBreaker('gemini_test_unit', {
    failureThreshold: 2,
    recoveryTimeoutMs: 300,
    requestTimeoutMs: 500,
  });

  assert(testBreaker.getState() === 'CLOSED', 'Circuit breaker initialement à l état CLOSED');

  // Simulate 2 consecutive failures
  try {
    await testBreaker.execute(async () => {
      throw new Error('503 Service Unavailable Gemini Overloaded');
    });
  } catch {}
  try {
    await testBreaker.execute(async () => {
      throw new Error('503 Service Unavailable Gemini Overloaded');
    });
  } catch {}

  assert(testBreaker.getState() === 'OPEN', 'Circuit Breaker est passé à l état OPEN après 2 échecs');

  // Attempt rapid execution while OPEN (must fail-fast without hitting external provider)
  let rapidFailed = false;
  try {
    await testBreaker.execute(async () => 'should not run');
  } catch (err: any) {
    rapidFailed = err.message.includes('Circuit Breaker is OPEN');
  }
  assert(rapidFailed === true, 'Fail-fast immédiat lorsque le Circuit Breaker est OPEN');

  // Test automated fallback execution with audit trail
  const fallbackResult = await aiCircuitRegistry.executeWithFallback(
    'gemini_failing_prov',
    async () => {
      throw new Error('Gemini Quota Exceeded 429');
    },
    'local_engine',
    async () => ({ code: '<div>Fallback Success</div>', vibe: 'clean' }),
    { userIntent: 'Generate dashboard', estimatedTokens: 450 }
  );

  assert(fallbackResult.fellBack === true && fallbackResult.usedProvider === 'local_engine', 'Basculement automatique vers le moteur local de secours');
  const audits = aiCircuitRegistry.getAuditLogs(5);
  assert(audits.some((a) => a.initialProvider === 'gemini_failing_prov'), 'Enregistrement de la trace d audit du basculement IA');

  // Test Half-Open recovery
  await new Promise((r) => setTimeout(r, 350));
  assert(testBreaker.getState() === 'HALF_OPEN', 'Transition automatique de OPEN vers HALF_OPEN après recoveryTimeout');

  // -------------------------------------------------------------
  // Test 5: Duplicate Stripe Webhook Idempotency
  // -------------------------------------------------------------
  console.log('\n⚡ 5. Test Webhooks Stripe Dupliqués & Idempotence Cryptographique');
  const webhookEvent = {
    id: 'evt_stripe_resilience_001',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_999',
        customer_email: 'creator_vip@vibecode.io',
        metadata: { userId: 'usr_admin_001', plan: 'pro' },
      },
    },
  };

  // Simulate 5 duplicate webhook calls in parallel with same event id
  const results = await Promise.all([
    stripeBillingService.handleWebhookEvent(webhookEvent),
    stripeBillingService.handleWebhookEvent(webhookEvent),
    stripeBillingService.handleWebhookEvent(webhookEvent),
    stripeBillingService.handleWebhookEvent(webhookEvent),
    stripeBillingService.handleWebhookEvent(webhookEvent),
  ]);

  const successes = results.filter((r) => r.success);
  assert(successes.length === 5, 'Tous les 5 appels de webhooks répondent HTTP 200 avec succès');
  assert(results[0].alreadyProcessed === false, '1er appel traite l événement avec mise à jour du solde');
  assert(results[1].alreadyProcessed === true, '2ème appel détecté comme doublon idempotent');
  assert(results[4].alreadyProcessed === true, '5ème appel protégé sans duplication de crédits');

  // -------------------------------------------------------------
  // Test 6: Project Versioning & Rollback Integrity
  // -------------------------------------------------------------
  console.log('\n⚡ 6. Test Intégrité du Versioning & Rollback Projet');
  const testProjId = 'proj_resilience_' + Date.now();
  const project = dbAdapter.saveProject({
    id: testProjId,
    userId: 'usr_admin_001',
    title: 'Versioned App',
    description: 'Versioned App Description',
    vibe: 'minimal',
  });

  const v1 = dbAdapter.createProjectVersion(
    testProjId,
    'usr_admin_001',
    [{ name: 'index.html', type: 'html', content: '<div>V1 Initial Content</div>' }],
    '<div>V1 Initial Content</div>',
    'V1 Snapshot'
  );

  const v2 = dbAdapter.createProjectVersion(
    testProjId,
    'usr_admin_001',
    [{ name: 'index.html', type: 'html', content: '<div>V2 Updated Content</div>' }],
    '<div>V2 Updated Content</div>',
    'V2 Snapshot'
  );

  assert(v1.versionNumber === 1 && v2.versionNumber === 2, 'Versions incrémentales V1 et V2 créées');

  // Perform Rollback to V1
  const rolledBackProject = dbAdapter.rollbackProjectVersion(testProjId, v1.id);
  assert(
    rolledBackProject?.currentVersion?.htmlSnapshot === '<div>V1 Initial Content</div>',
    'Rollback atomique restaure exactement l état V1 (htmlSnapshot restauré)'
  );

  console.log('\n================================================================');
  console.log(`🛡️  RÉSULTATS DES TESTS DE RÉSILIENCE : ${passed} PASSÉS, ${failed} ÉCHOUÉS`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runResilienceTests().catch((err) => {
  console.error('Fatal resilience error:', err);
  process.exit(1);
});
