import { productUnderstandingEngine } from '../product/productUnderstandingEngine';
import { productBlueprintService } from '../product/productBlueprint';
import { uxProductPlanner } from '../product/uxProductPlanner';
import { productGenerator } from '../product/productGenerator';
import { productQualityAuditService } from '../product/productQualityAudit';
import { productRepairEngine } from '../product/productRepairEngine';
import { conversationEngine } from '../conversation/conversationEngine';
import { productObservabilityService } from '../observability/productObservability';

export interface ProductBenchmarkResult {
  testId: string;
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  score?: number;
  details?: Record<string, any>;
}

export interface ProductSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  results: ProductBenchmarkResult[];
}

export async function runProductIntelligenceBenchmarks(): Promise<ProductSuiteSummary> {
  console.log('\n================================================================');
  console.log('🚀 PASSE 1 : PRODUCT INTELLIGENCE & ANTI-GENERIC QUALITY BENCHMARK');
  console.log('================================================================\n');

  const results: ProductBenchmarkResult[] = [];

  function record(name: string, category: string, passed: boolean, durationMs: number, score?: number, details?: Record<string, any>) {
    const testId = `PROD-${results.length + 1}`;
    results.push({ testId, name, category, passed, durationMs, score, details });
    const icon = passed ? '✅' : '❌';
    const scoreStr = score !== undefined ? ` [Score: ${score}/100]` : '';
    console.log(`  ${icon} [${category}] ${name}${scoreStr} (${durationMs}ms)`);
    if (!passed && details?.error) {
      console.warn(`     ↳ Erreur : ${details.error}`);
    }
  }

  // ==========================================================================
  // 1. UNDERSTANDING & ARCHETYPE DETECTION BENCHMARK
  // ==========================================================================
  const t1 = Date.now();
  try {
    const prompt = 'Crée-moi une application de rencontre style Tinder';
    const understanding = productUnderstandingEngine.analyzeProductIntent(prompt);
    const passed =
      understanding.archetype === 'DATING_APP' &&
      understanding.confidence >= 0.9 &&
      understanding.inferredFeatures.some((f) => f.id === 'card_swipe') &&
      understanding.inferredFeatures.some((f) => f.id === 'match_modal') &&
      understanding.designDirection.visualStyle.includes('Moderne');

    record(
      'Tinder Dating App Intent & Feature Extraction',
      'Understanding',
      passed,
      Date.now() - t1,
      Math.round(understanding.confidence * 100),
      { understanding }
    );
  } catch (err: any) {
    record('Tinder Dating App Intent & Feature Extraction', 'Understanding', false, Date.now() - t1, 0, { error: err.message });
  }

  // Multi-Archetype Detection
  const t2 = Date.now();
  try {
    const saas = productUnderstandingEngine.analyzeProductIntent('Dashboard SaaS avec métriques MRR et churn');
    const kanban = productUnderstandingEngine.analyzeProductIntent('Application de gestion de projet style Trello avec colonnes Kanban');
    const ecom = productUnderstandingEngine.analyzeProductIntent('Boutique marketplace e-commerce artisanale avec panier');

    const passed =
      saas.archetype === 'SAAS_DASHBOARD' &&
      kanban.archetype === 'PROJECT_MANAGEMENT' &&
      ecom.archetype === 'MARKETPLACE';

    record('Multi-Archetype Classification (SaaS, Kanban, E-Commerce)', 'Understanding', passed, Date.now() - t2, 100, {
      saasArchetype: saas.archetype,
      kanbanArchetype: kanban.archetype,
      ecomArchetype: ecom.archetype,
    });
  } catch (err: any) {
    record('Multi-Archetype Classification (SaaS, Kanban, E-Commerce)', 'Understanding', false, Date.now() - t2, 0, { error: err.message });
  }

  // ==========================================================================
  // 2. PRODUCT BLUEPRINT & UX PLANNING BENCHMARK
  // ==========================================================================
  const t3 = Date.now();
  try {
    const prompt = 'Crée-moi une application de rencontre style Tinder';
    const understanding = productUnderstandingEngine.analyzeProductIntent(prompt);
    const blueprint = productBlueprintService.generateBlueprint(understanding, prompt);
    const uxPlan = uxProductPlanner.planUX(blueprint);

    const passed =
      blueprint.archetype === 'DATING_APP' &&
      blueprint.screens.length >= 3 &&
      blueprint.screens.some((s) => s.id === 'screen-discover') &&
      blueprint.screens.some((s) => s.id === 'screen-matches') &&
      blueprint.screens.some((s) => s.id === 'screen-chat') &&
      uxPlan.focalPoint.elementId === 'cards-stack' &&
      uxPlan.userFlows.length >= 2;

    record('Dating App Product Blueprint & UX Plan Generation', 'Blueprint', passed, Date.now() - t3, 98, {
      screensCount: blueprint.screens.length,
      focalPoint: uxPlan.focalPoint,
    });
  } catch (err: any) {
    record('Dating App Product Blueprint & UX Plan Generation', 'Blueprint', false, Date.now() - t3, 0, { error: err.message });
  }

  // ==========================================================================
  // 3. CODE SYNTHESIS & ANTI-GENERIC QUALITY AUDIT (TINDER BENCHMARK)
  // ==========================================================================
  const t4 = Date.now();
  try {
    const prompt = 'Crée-moi une application de rencontre style Tinder';
    const understanding = productUnderstandingEngine.analyzeProductIntent(prompt);
    const blueprint = productBlueprintService.generateBlueprint(understanding, prompt);
    const uxPlan = uxProductPlanner.planUX(blueprint);
    const html = productGenerator.generateProductCode(blueprint, uxPlan);

    // Audit generated code with Product Quality Audit Service
    const audit = productQualityAuditService.auditProductQuality(html, blueprint, prompt);

    const hasCardStack = html.includes('id="cards-stack"') || html.includes('deck-container');
    const hasSwipeButtons = html.includes('btn-swipe-like') && html.includes('btn-swipe-pass');
    const hasMatchModal = html.includes('id="match-modal"');
    const hasChatScreen = html.includes('id="screen-chat"');
    const hasBottomNav = html.includes('id="bottom-nav"');
    const noGenericClichés = !html.includes('128') && !html.includes('Éléments Traités');

    const passed =
      audit.passed &&
      audit.overallScore >= 90 &&
      hasCardStack &&
      hasSwipeButtons &&
      hasMatchModal &&
      hasChatScreen &&
      hasBottomNav &&
      noGenericClichés;

    record('Tinder-Style App Code Generation & Anti-Generic Quality Audit', 'Synthesis', passed, Date.now() - t4, audit.overallScore, {
      auditScore: audit.overallScore,
      rubricScores: audit.rubricScores,
      hasSwipeButtons,
      hasMatchModal,
      noGenericClichés,
    });
  } catch (err: any) {
    record('Tinder-Style App Code Generation & Anti-Generic Quality Audit', 'Synthesis', false, Date.now() - t4, 0, { error: err.message });
  }

  // ==========================================================================
  // 4. FULL CONVERSATION PIPELINE E2E EXECUTION (TINDER BENCHMARK)
  // ==========================================================================
  const t5 = Date.now();
  const testProjectId = 'proj_tinder_benchmark_' + Date.now();
  try {
    const pipelineRes = await conversationEngine.processUserMessage({
      projectId: testProjectId,
      userId: 'usr_product_tester',
      prompt: 'Crée-moi une application de rencontre style Tinder',
      vibe: 'Moderne & Dynamique',
    });

    const hasProductBlueprint = !!pipelineRes.productBlueprint;
    const hasUxPlan = !!pipelineRes.uxPlan;
    const hasProductAudit = !!pipelineRes.productAudit;
    const isCompleted = pipelineRes.compassState === 'COMPLETED';
    const auditScore = pipelineRes.productAudit?.overallScore || 0;
    const isAntiGeneric = auditScore >= 90;

    const passed = isCompleted && hasProductBlueprint && hasUxPlan && hasProductAudit && isAntiGeneric;

    record('End-to-End Pipeline Tinder App Creation & Product Intelligence Integration', 'Pipeline', passed, Date.now() - t5, auditScore, {
      compassState: pipelineRes.compassState,
      archetype: pipelineRes.productBlueprint?.archetype,
      auditScore,
      versionId: pipelineRes.versionId,
    });
  } catch (err: any) {
    record('End-to-End Pipeline Tinder App Creation & Product Intelligence Integration', 'Pipeline', false, Date.now() - t5, 0, { error: err.message });
  }

  // ==========================================================================
  // 5. SAAS DASHBOARD ARCHETYPE PIPELINE BENCHMARK
  // ==========================================================================
  const t6 = Date.now();
  try {
    const saasProjectId = 'proj_saas_benchmark_' + Date.now();
    const saasRes = await conversationEngine.processUserMessage({
      projectId: saasProjectId,
      userId: 'usr_product_tester',
      prompt: 'Crée un dashboard SaaS analytique avec métriques MRR, churn, table de clients et graphiques',
    });

    const isCompleted = saasRes.compassState === 'COMPLETED';
    const archetype = saasRes.productBlueprint?.archetype;
    const auditScore = saasRes.productAudit?.overallScore || 0;
    const hasMetrics = (saasRes.previewHtml || '').includes('MRR') || (saasRes.previewHtml || '').includes('Revenus');

    const passed = isCompleted && archetype === 'SAAS_DASHBOARD' && auditScore >= 85;

    record('End-to-End Pipeline SaaS Analytics Dashboard Creation', 'Pipeline', passed, Date.now() - t6, auditScore, {
      archetype,
      auditScore,
      hasMetrics,
    });
  } catch (err: any) {
    record('End-to-End Pipeline SaaS Analytics Dashboard Creation', 'Pipeline', false, Date.now() - t6, 0, { error: err.message });
  }

  // ==========================================================================
  // 6. KANBAN / PROJECT MANAGEMENT PIPELINE BENCHMARK
  // ==========================================================================
  const t7 = Date.now();
  try {
    const kanbanProjectId = 'proj_kanban_benchmark_' + Date.now();
    const kanbanRes = await conversationEngine.processUserMessage({
      projectId: kanbanProjectId,
      userId: 'usr_product_tester',
      prompt: 'Crée une application de gestion de tâches et projets style Kanban Trello avec colonnes et drag and drop',
    });

    const isCompleted = kanbanRes.compassState === 'COMPLETED';
    const archetype = kanbanRes.productBlueprint?.archetype;
    const auditScore = kanbanRes.productAudit?.overallScore || 0;
    const hasColumns = (kanbanRes.previewHtml || '').includes('kanban-column') || (kanbanRes.previewHtml || '').includes('À faire');

    const passed = isCompleted && (archetype === 'PROJECT_MANAGEMENT' || archetype === 'CRM') && auditScore >= 85;

    record('End-to-End Pipeline Kanban Project Manager Creation', 'Pipeline', passed, Date.now() - t7, auditScore, {
      archetype,
      auditScore,
      hasColumns,
    });
  } catch (err: any) {
    record('End-to-End Pipeline Kanban Project Manager Creation', 'Pipeline', false, Date.now() - t7, 0, { error: err.message });
  }

  // ==========================================================================
  // 7. ANTI-GENERIC QUALITY GATE ENFORCEMENT & REJECTION OF AI SLOP
  // ==========================================================================
  const t8 = Date.now();
  try {
    // Intentionally pass a generic "AI Slop" card template for a Tinder prompt
    const fakeSlopHtml = `<!DOCTYPE html><html><head><title>App</title><script src="https://cdn.tailwindcss.com"></script></head>
    <body class="p-6 bg-slate-50">
      <h1>Application de rencontre</h1>
      <div class="grid grid-cols-3 gap-4">
        <div class="card p-4 bg-white">128 Éléments Traités</div>
        <div class="card p-4 bg-white">99.8% Taux de Fiabilité</div>
        <div class="card p-4 bg-white">12ms Temps de Réponse</div>
      </div>
    </body></html>`;

    const datingBlueprint = productBlueprintService.generateBlueprint(
      productUnderstandingEngine.analyzeProductIntent('Tinder app'),
      'Tinder app'
    );

    const slopAudit = productQualityAuditService.auditProductQuality(fakeSlopHtml, datingBlueprint, 'Tinder app');
    const correctlyFlagged =
      slopAudit.passed === false &&
      slopAudit.status === 'REPAIR_REQUIRED' &&
      slopAudit.antiSlopChecks.zeroGenericBoilerplate === false &&
      slopAudit.overallScore < 70;

    record('Anti-Generic Quality Gate Detection & Slop Rejection', 'QualityGate', correctlyFlagged, Date.now() - t8, slopAudit.overallScore, {
      slopScore: slopAudit.overallScore,
      blockingIssues: slopAudit.blockingIssues,
    });
  } catch (err: any) {
    record('Anti-Generic Quality Gate Detection & Slop Rejection', 'QualityGate', false, Date.now() - t8, 0, { error: err.message });
  }

  // ==========================================================================
  // 8. PRODUCT AUTO-REPAIR & RESTORATION ENGINE
  // ==========================================================================
  const t9 = Date.now();
  try {
    const datingBlueprint = productBlueprintService.generateBlueprint(
      productUnderstandingEngine.analyzeProductIntent('Tinder app'),
      'Tinder app'
    );
    const brokenHtml = `<!DOCTYPE html><html><head><title>Tinder App</title><script src="https://cdn.tailwindcss.com"></script></head>
    <body class="bg-slate-900 text-white">
      <div id="deck-container"></div>
    </body></html>`;

    const initialAudit = productQualityAuditService.auditProductQuality(brokenHtml, datingBlueprint, 'Tinder app');
    const repairResult = productRepairEngine.repairProductArtifact(brokenHtml, datingBlueprint, initialAudit);

    const passed =
      repairResult.success &&
      repairResult.finalQualityScore >= 90 &&
      repairResult.appliedFixes.length > 0;

    record('Product Auto-Repair & Domain Reconstruction Engine', 'AutoRepair', passed, Date.now() - t9, repairResult.finalQualityScore, {
      appliedFixes: repairResult.appliedFixes,
      finalScore: repairResult.finalQualityScore,
    });
  } catch (err: any) {
    record('Product Auto-Repair & Domain Reconstruction Engine', 'AutoRepair', false, Date.now() - t9, 0, { error: err.message });
  }

  // ==========================================================================
  // 9. OBSERVABILITY & TELEMETRY PRODUCT METRICS
  // ==========================================================================
  const t10 = Date.now();
  try {
    const metrics = productObservabilityService.computeMetrics(testProjectId);
    const passed =
      metrics.productUnderstandingScore >= 90 &&
      metrics.uxQualityScore >= 90 &&
      metrics.blueprintCompletenessScore >= 90 &&
      metrics.totalRequests > 0;

    record('Product Observability Telemetry Metrics Integration', 'Observability', passed, Date.now() - t10, 100, { metrics });
  } catch (err: any) {
    record('Product Observability Telemetry Metrics Integration', 'Observability', false, Date.now() - t10, 0, { error: err.message });
  }

  // Summary
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  console.log('\n================================================================');
  console.log(`📊 RÉSULTATS BENCHMARKS PRODUCT INTELLIGENCE : ${passedCount}/${results.length} RÉUSSIS`);
  console.log('================================================================\n');

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    results,
  };
}
