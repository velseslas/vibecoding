import { designAuditEngine } from '../server/audit/designAuditEngine';
import { productObservabilityService } from '../server/observability/productObservability';
import { conversationEngine } from '../server/conversation/conversationEngine';
import { intentEngine } from '../server/intent/intentEngine';
import { conversationTraceService } from '../server/observability/conversationTrace';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('\n========================================================================');
  console.log('🧪 RUNNING DESIGN AUDIT & OBSERVABILITY TEST SUITE (11 TESTS)');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    total++;
    try {
      console.log(`[TEST ${total}] ${name}...`);
      await fn();
      console.log(`  ✅ PASSED: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAILED: ${name}`);
      console.error(`     Reason: ${err.message}`);
    }
  }

  const sampleGoodHtml = `<!DOCTYPE html>
<html lang="fr" class="h-full">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Validée</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body class="h-full bg-slate-50 text-slate-900 font-sans p-6">
  <div class="max-w-5xl mx-auto space-y-6">
    <header class="flex items-center justify-between border-b border-slate-200 pb-4">
      <h1 class="text-2xl font-bold text-slate-900">Tableau de Bord</h1>
      <button id="btn-action" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm transition">
        Nouvelle Action
      </button>
    </header>
    <main class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <h2 class="text-lg font-bold text-slate-800 mb-2">Statistiques</h2>
        <p class="text-sm text-slate-600">Données en temps réel</p>
      </div>
      <div class="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <h2 class="text-lg font-bold text-slate-800 mb-2">Activité</h2>
        <p class="text-sm text-slate-600">Historique des opérations</p>
      </div>
      <div class="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <h2 class="text-lg font-bold text-slate-800 mb-2">Paramètres</h2>
        <input type="text" id="filter-input" placeholder="Filtrer..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
      </div>
    </main>
  </div>
  <script>lucide.createIcons();</script>
</body>
</html>`;

  const sampleDegradedHtml = `<html>
<head><title>App Sans Viewport</title></head>
<body class="bg-black text-white p-[17px] m-[33px]">
  <div style="width: 1200px;">
    <h1>Titre</h1>
    <h3>Saut direct vers H3</h3>
    <input type="text">
    <button class="p-0 text-[8px]">X</button>
  </div>
</body>
</html>`;

  await test('1. Application Audit detects high compliance on modern structured HTML', () => {
    const report = designAuditEngine.auditApplication(sampleGoodHtml, { projectId: 'test_audit_good' });
    assert(report.overallScore >= 80, `Expected score >= 80, got ${report.overallScore}`);
    assert(report.passed === true, 'Expected report.passed to be true');
    assert(report.scores.responsive >= 85, `Expected responsive >= 85, got ${report.scores.responsive}`);
    assert(report.scores.accessibility >= 85, `Expected accessibility >= 85, got ${report.scores.accessibility}`);
    assert(report.metrics.totalButtons > 0, 'Expected buttons > 0');
  });

  await test('2. Application Audit identifies issues on non-responsive and degraded HTML', () => {
    const report = designAuditEngine.auditApplication(sampleDegradedHtml, { projectId: 'test_audit_bad' });
    assert(report.overallScore < 80, `Expected overall score < 80, got ${report.overallScore}`);
    assert(report.passed === false, 'Expected report.passed to be false');
    assert(report.issues.length >= 3, `Expected at least 3 issues, got ${report.issues.length}`);
    assert(report.issues.some((i) => i.category === 'RESPONSIVE'), 'Expected responsive issue');
    assert(report.issues.some((i) => i.category === 'ACCESSIBILITY'), 'Expected accessibility issue');
    assert(report.canAutoRepair === true, 'Expected canAutoRepair to be true');
  });

  await test('3. Page Audit verifies conformity against Application DNA', () => {
    const pageReport = designAuditEngine.auditPage('Vue Détail', sampleGoodHtml, 'test_audit_page');
    assert(pageReport.overallScore >= 80, `Expected page overall score >= 80, got ${pageReport.overallScore}`);
    assert(pageReport.buttonConformityScore === 100, 'Expected button conformity 100');
    assert(pageReport.hierarchyScore === 100, 'Expected hierarchy score 100');
  });

  await test('4. Preflight Publish Audit validates all checks on production-ready markup', () => {
    const preflight = designAuditEngine.auditPreflightPublish('test_audit_preflight', sampleGoodHtml);
    assert(preflight.canPublish === true, 'Expected canPublish to be true');
    assert(preflight.blockingCount === 0, `Expected 0 blocking checks, got ${preflight.blockingCount}`);
    assert(preflight.checks.find((c) => c.key === 'build_compilation')?.status === 'VALIDATED', 'Build check validated');
    assert(preflight.checks.find((c) => c.key === 'security_waf')?.status === 'VALIDATED', 'Security WAF check validated');
    assert(preflight.checks.find((c) => c.key === 'responsive_meta')?.status === 'VALIDATED', 'Responsive meta check validated');
  });

  await test('5. Preflight Publish Audit blocks publication on critical errors', () => {
    const brokenHtml = `<html><head></head><body><h1>Bad</h1><script>const x = 1;</body></html>`;
    const preflight = designAuditEngine.auditPreflightPublish('test_audit_broken', brokenHtml);
    assert(preflight.canPublish === false, 'Expected canPublish to be false');
    assert(preflight.blockingCount >= 1, 'Expected blocking count >= 1');
    assert(preflight.summary.includes('Publication bloquée'), 'Expected blocking summary message');
  });

  await test('6. Product Observability Service computes consolidated product metrics', () => {
    conversationTraceService.recordTrace({
      conversationId: 'conv_test_obs',
      projectId: 'proj_obs_1',
      intent: 'CREATE_FEATURE',
      confidence: 0.95,
      contextSources: ['APPLICATION_DNA', 'PROJECT_MEMORY'],
      assumptionsDetected: [],
      impactLevel: 'LOW',
      executionResult: 'SUCCESS',
      qualityScore: 95,
      repairAttempts: 0,
      durationMs: 420,
      estimatedTokens: 1100,
    });

    const metrics = productObservabilityService.computeMetrics('proj_obs_1');
    assert(metrics.intentAccuracy > 0.8, `Expected intentAccuracy > 0.8, got ${metrics.intentAccuracy}`);
    assert(metrics.planSuccessRate > 0.8, `Expected planSuccessRate > 0.8, got ${metrics.planSuccessRate}`);
    assert(metrics.generationSuccessRate > 0.8, `Expected generationSuccessRate > 0.8, got ${metrics.generationSuccessRate}`);
    assert(metrics.previewSuccessRate > 0.8, `Expected previewSuccessRate > 0.8, got ${metrics.previewSuccessRate}`);
    assert(metrics.averageLatencyMs > 0, `Expected averageLatencyMs > 0, got ${metrics.averageLatencyMs}`);
    assert(metrics.tokensPerRequest > 0, `Expected tokensPerRequest > 0, got ${metrics.tokensPerRequest}`);
    assert(metrics.costPerRequestEur > 0, `Expected costPerRequestEur > 0, got ${metrics.costPerRequestEur}`);
  });

  await test('7. Natural Language: Intent Engine recognizes AUDIT requests', () => {
    const r1 = intentEngine.analyzeIntent("Fais un audit de l'application");
    assert(r1.intent === 'AUDIT', `Expected AUDIT, got ${r1.intent}`);

    const r2 = intentEngine.analyzeIntent("Audite cette page");
    assert(r2.intent === 'AUDIT', `Expected AUDIT, got ${r2.intent}`);

    const r3 = intentEngine.analyzeIntent("Audit avant publication");
    assert(r3.intent === 'AUDIT', `Expected AUDIT, got ${r3.intent}`);
  });

  await test('8. Natural Language: Intent Engine recognizes Rollback / Restore expressions', () => {
    const r1 = intentEngine.analyzeIntent("Finalement remets comme avant");
    assert(r1.intent === 'RESTORE', `Expected RESTORE, got ${r1.intent}`);

    const r2 = intentEngine.analyzeIntent("Je préfère la première version");
    assert(r2.intent === 'RESTORE', `Expected RESTORE, got ${r2.intent}`);
  });

  await test('9. Natural Language: Intent Engine recognizes Explanations', () => {
    const r = intentEngine.analyzeIntent("Pourquoi tu as fait ça ?");
    assert(r.intent === 'EXPLAIN', `Expected EXPLAIN, got ${r.intent}`);
  });

  await test('10. Full Conversation Flow: User asks for an Audit', async () => {
    const result = await conversationEngine.processUserMessage({
      projectId: 'proj_e2e_audit',
      userId: 'usr_test',
      prompt: "Fais un audit complet de l'application",
      currentHtml: sampleGoodHtml,
    });

    assert(result.compassState === 'COMPLETED', `Expected COMPLETED, got ${result.compassState}`);
    assert(result.intent.intent === 'AUDIT', `Expected AUDIT, got ${result.intent.intent}`);
    assert(result.aiResponseText.includes('AUDIT GLOBAL'), 'Expected AUDIT GLOBAL in response');
    assert(result.aiResponseText.includes('Harmonie du Design'), 'Expected Harmonie du Design in response');
  });

  await test('11. Full Conversation Flow: User asks why a change was made', async () => {
    const result = await conversationEngine.processUserMessage({
      projectId: 'proj_e2e_explain',
      userId: 'usr_test',
      prompt: "Pourquoi tu as fait ça ?",
      currentHtml: sampleGoodHtml,
    });

    assert(result.compassState === 'COMPLETED', `Expected COMPLETED, got ${result.compassState}`);
    assert(result.intent.intent === 'EXPLAIN', `Expected EXPLAIN, got ${result.intent.intent}`);
    assert(result.aiResponseText.includes("J'ai"), 'Expected explanation starting with intention');
  });

  console.log(`\n========================================================================`);
  console.log(`🏁 FINISHED: ${passed}/${total} tests passed.`);
  console.log(`========================================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
