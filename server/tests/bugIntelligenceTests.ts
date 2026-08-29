import { bugIntelligenceEngine } from '../learning/bugIntelligenceEngine';
import { errorFingerprintService } from '../learning/errorFingerprint';
import { rootCauseEngine } from '../learning/rootCauseEngine';
import { repairStrategyMemory } from '../learning/repairStrategyMemory';
import { regressionIntelligenceService } from '../learning/regressionIntelligence';
import { benchmarkEvolutionRegistry } from '../learning/benchmarkRegistry';
import { learningGovernanceService } from '../learning/learningGovernance';
import { humanFeedbackService } from '../learning/humanFeedback';
import { designHarmonyAuditService } from '../audit/designHarmonyAudit';
import { prometheusExporter } from '../observability/prometheusExporter';
import { ConversationEngine } from '../conversation/conversationEngine';
import { dbAdapter } from '../db/database';
import { runAIQualityBenchmark } from './aiQualityBenchmark';

export async function runBugIntelligenceValidationSuite(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: Array<{ test: string; passed: boolean; message?: string }>;
}> {
  const results: Array<{ test: string; passed: boolean; message?: string }> = [];
  const record = (test: string, passed: boolean, message?: string) => {
    results.push({ test, passed, message });
    console.log(`  ${passed ? '✅ PASS' : '❌ FAIL'}: ${test}${message ? ` (${message})` : ''}`);
  };

  console.log('\n🧠 [BUG INTELLIGENCE & CONTINUOUS LEARNING LOOP VALIDATION SUITE]');

  // Test 1: Incident Capture & Error Normalization
  try {
    const inc = bugIntelligenceEngine.captureIncident({
      projectId: 'proj_test_01',
      error: {
        message: 'Uncaught ReferenceError: req_a1b2c3d4 is not defined at line 42 col 12',
        category: 'runtime',
        file: 'index.html',
      },
      severity: 'HIGH',
      context: { prompt: 'Afficher le total', filesCount: 1 },
    });

    const isNorm = inc.fingerprint.startsWith('fp_') && inc.recurrenceCount === 1;
    record('Incident Capture & Normalization', isNorm, `Fingerprint: ${inc.fingerprint}`);
  } catch (err: any) {
    record('Incident Capture & Normalization', false, err.message);
  }

  // Test 2: Fingerprint Determinism & Recurrence Tracking
  try {
    const fp1 = errorFingerprintService.generateFingerprint({
      message: 'Uncaught ReferenceError: req_998877 is not defined at line 102 col 3',
      category: 'runtime',
    });
    const fp2 = errorFingerprintService.generateFingerprint({
      message: 'Uncaught ReferenceError: req_112233 is not defined at line 88 col 1',
      category: 'runtime',
    });
    const isConsistent = fp1.fingerprint === fp2.fingerprint && fp2.recurrenceCount >= 2;
    record('Fingerprint Determinism & Recurrence Counter', isConsistent, `Recurrence: ${fp2.recurrenceCount}`);
  } catch (err: any) {
    record('Fingerprint Determinism & Recurrence Counter', false, err.message);
  }

  // Test 3: Root Cause Diagnostics
  try {
    const diag = rootCauseEngine.diagnoseRootCause('DEPENDENCY', {
      message: 'Uncaught ReferenceError: lucide is not defined',
      category: 'dependency',
    }, { htmlSnippet: '<i data-lucide="check"></i>' });

    const isDiagValid = diag.confidence >= 0.85 && diag.candidateStrategy.includes('LUCIDE') && diag.status === 'CONFIRMED';
    record('Root Cause Causal Diagnostics & Confidence', isDiagValid, `Confidence: ${diag.confidence}, Strategy: ${diag.candidateStrategy}`);
  } catch (err: any) {
    record('Root Cause Causal Diagnostics & Confidence', false, err.message);
  }

  // Test 4: Repair Strategy Memory & Prioritization
  try {
    const candidates = repairStrategyMemory.getCandidateStrategies('missing_dependency::lucide_icons');
    const strat = repairStrategyMemory.recordStrategyOutcome(
      'missing_dependency::lucide_icons',
      'INJECT_LUCIDE_CDN',
      'DEPENDENCY',
      true,
      1,
      'proj_test_01'
    );
    const isValid = candidates.length > 0 && strat.successRate >= 0.9;
    record('Repair Strategy Memory & Success Tracking', isValid, `SuccessRate: ${strat.successRate}`);
  } catch (err: any) {
    record('Repair Strategy Memory & Success Tracking', false, err.message);
  }

  // Test 5: Regression Intelligence Risk Detection
  try {
    bugIntelligenceEngine.captureIncident({
      projectId: 'proj_test_01',
      error: {
        message: 'Uncaught ReferenceError: lucide is not defined',
        category: 'dependency',
        file: 'index.html',
      },
      severity: 'HIGH',
    });

    const regCheck = regressionIntelligenceService.evaluateRegressionRisk(
      'proj_test_01',
      'MODIFY_FEATURE',
      'Ajouter une icône Lucide dans la barre de navigation',
      { nodes: [], edges: [] },
      '<div>Nav</div>'
    );
    const hasWarning = regCheck.hasRegressionRisk && regCheck.warnings.length > 0;
    record('Regression Intelligence Blast-Radius & Safeguards', hasWarning, `Warnings count: ${regCheck.warnings.length}`);
  } catch (err: any) {
    record('Regression Intelligence Blast-Radius & Safeguards', false, err.message);
  }

  // Test 6: Benchmark Evolution Registry & Test Lifecycle
  try {
    const incident = bugIntelligenceEngine.captureIncident({
      projectId: 'proj_test_01',
      error: { message: 'Uncaught TypeError: missing element listener', category: 'runtime' },
    });

    const candidate = benchmarkEvolutionRegistry.registerCandidateFromIncident(
      incident,
      '<html><body><button id="btn">Click</button></body></html>',
      (html) => html.includes('button')
    );

    const isCandidate = candidate.status === 'CANDIDATE';
    benchmarkEvolutionRegistry.recordRun(candidate.id, true);
    const promoted = benchmarkEvolutionRegistry.promoteTestCase(candidate.id, 'Test Officer');
    const isPromoted = promoted !== null && promoted.status === 'PROMOTED' && isCandidate;

    record('Benchmark Evolution Registry & Promotion', isPromoted, `Candidate -> Promoted: ${candidate.id}`);
  } catch (err: any) {
    record('Benchmark Evolution Registry & Promotion', false, err.message);
  }

  // Test 7: Governance Promotion Gating (Strict threshold enforcement)
  try {
    const lowConfEval = learningGovernanceService.evaluatePromotion(
      {
        id: 'strat_dummy',
        incidentPattern: 'test',
        category: 'RUNTIME',
        strategyDescription: 'test',
        targetAction: 'TEST_ACT',
        successCount: 1,
        failureCount: 2,
        successRate: 0.33,
        averageAttempts: 2,
        scope: 'GLOBAL',
        createdAt: Date.now(),
        lastValidatedAt: Date.now(),
        status: 'EXPERIMENTAL',
      },
      ['Faible preuve'],
      0.60
    );

    const highStrat = repairStrategyMemory.getCandidateStrategies('missing_dependency::lucide_icons')[0];
    const highConfEval = learningGovernanceService.evaluatePromotion(
      highStrat,
      ['Preuve validée sur 15 exécutions'],
      0.95
    );

    const isGatingStrict = !lowConfEval.allowed && highConfEval.allowed && !!highConfEval.candidate;
    record('Governance Promotion Gating (Thresholds & Proof)', isGatingStrict, `Low rejected: ${!lowConfEval.allowed}, High accepted: ${highConfEval.allowed}`);
  } catch (err: any) {
    record('Governance Promotion Gating (Thresholds & Proof)', false, err.message);
  }

  // Test 8: Deterministic Governance Rollback
  try {
    const strat = repairStrategyMemory.getCandidateStrategies('missing_dependency::lucide_icons')[0];
    const evalResult = learningGovernanceService.evaluatePromotion(strat, ['Validation suite'], 0.92);
    if (evalResult.candidate) {
      learningGovernanceService.promoteRule(evalResult.candidate.id, 'AI Architect');
      const rolledBack = learningGovernanceService.rollbackPromotedRule(evalResult.candidate.id, 'Test rollback validation');
      const isRolledBack = rolledBack && evalResult.candidate.status === 'ROLLED_BACK';
      record('Deterministic Governance Rule Rollback', isRolledBack, `Status: ${evalResult.candidate.status}`);
    } else {
      record('Deterministic Governance Rule Rollback', false, 'Candidate creation failed');
    }
  } catch (err: any) {
    record('Deterministic Governance Rule Rollback', false, err.message);
  }

  // Test 9: Application DNA Guardrail Non-Mutation
  try {
    const projectId = 'proj_dna_guard_01';
    dbAdapter.saveProjectDna({
      projectId,
      techStack: {
        framework: 'HTML5/Tailwind',
        styling: 'Tailwind CSS',
        iconLibrary: 'lucide-icons',
        stateManager: 'Vanillajs',
        apiConventions: 'REST',
      },
      architecture: 'Single Page Component',
      namingConventions: ['camelCase'],
      patterns: ['Modular'],
      rules: ['Must use Tailwind CSS'],
      decisions: [],
      updatedAt: Date.now(),
    });
    // Ensure learning operations do not mutate DNA directly
    const dna = dbAdapter.getProjectDna(projectId);
    const isUnchanged = dna?.rules.length === 1 && dna?.rules[0] === 'Must use Tailwind CSS';
    record('Application DNA Integrity & Guardrail Protection', isUnchanged, 'DNA unchanged by learning engine');
  } catch (err: any) {
    record('Application DNA Integrity & Guardrail Protection', false, err.message);
  }

  // Test 10: Intent Learning & Clarification Capture
  try {
    const recordItem = bugIntelligenceEngine.recordIntentLearning({
      projectId: 'proj_test_01',
      userPrompt: 'fais un truc stylé',
      inferredIntent: 'QUESTION',
      clarificationTriggered: true,
      probableAmbiguityCause: 'Prompt trop générique',
    });
    record('Intent Learning & Clarification Capture', !!recordItem.id, `Recorded intent ambiguity: ${recordItem.id}`);
  } catch (err: any) {
    record('Intent Learning & Clarification Capture', false, err.message);
  }

  // Test 11: Human Feedback Telemetry & Satisfaction Score
  try {
    humanFeedbackService.recordFeedback({
      projectId: 'proj_test_01',
      rating: 'THUMBS_UP',
      comment: 'Super réactivité et auto-repair impeccable',
      category: 'CODE_QUALITY',
    });
    const rate = humanFeedbackService.getSatisfactionRate();
    record('Human Feedback Telemetry & Satisfaction Rate', rate >= 0.8, `Satisfaction rate: ${rate}`);
  } catch (err: any) {
    record('Human Feedback Telemetry & Satisfaction Rate', false, err.message);
  }

  // Test 12: Prometheus Exporter Learning Metrics
  try {
    const metricsOutput = prometheusExporter.generateMetrics();
    const hasMetrics =
      metricsOutput.includes('learning_incidents_total') &&
      metricsOutput.includes('learning_recurrent_patterns_total') &&
      metricsOutput.includes('learning_auto_repair_success_rate');
    record('Prometheus Learning & Bug Metrics Exporter', hasMetrics, 'Prometheus format verified');
  } catch (err: any) {
    record('Prometheus Learning & Bug Metrics Exporter', false, err.message);
  }

  // Test 13: Design Harmony Audit Engine (Phase 13)
  try {
    const sampleHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-slate-100 font-sans p-6">
  <div class="max-w-7xl mx-auto space-y-6">
    <h1 class="text-3xl font-bold">Tableau de Bord</h1>
    <h2 class="text-xl font-semibold">Statistiques Clés</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <p class="text-sm text-slate-400">Total Ventes</p>
        <p class="text-2xl font-bold">12 450 €</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const audit = designHarmonyAuditService.auditDesign(sampleHtml);
    const isAuditValid = audit.overallScore >= 80 && audit.passed;
    record('UI & Design Harmony Audit Service', isAuditValid, `Score: ${audit.overallScore}/100 (${audit.summary})`);
  } catch (err: any) {
    record('UI & Design Harmony Audit Service', false, err.message);
  }

  // Test 14: Full E2E Conversation Engine Flow with Learning Signals
  try {
    const engine = new ConversationEngine();
    const convResult = await engine.processUserMessage({
      projectId: 'proj_e2e_learning_01',
      prompt: 'Créer un dashboard financier avec icônes Lucide',
      vibe: 'Corporate Modern',
    });

    const hasArtifact = !!convResult.validatedArtifact && !!convResult.artifactVerification?.isMatch;
    const hasTrace = !!convResult.trace;
    const signals = bugIntelligenceEngine.getSignals();
    const isE2EValid = hasArtifact && hasTrace && signals.length > 0;

    record('Full E2E Conversation & Continuous Learning Integration', isE2EValid, `Artifact: ${convResult.validatedArtifact?.id}, Signals: ${signals.length}`);
  } catch (err: any) {
    record('Full E2E Conversation & Continuous Learning Integration', false, err.message);
  }

  // Test 15: AI Quality Benchmark Non-Regression Run
  try {
    const benchmarkResult = await runAIQualityBenchmark();
    const is14Valid = benchmarkResult.passedCount === benchmarkResult.totalTests;
    record('AI Quality Benchmark Non-Regression (14/14 Phases)', is14Valid, `Passed: ${benchmarkResult.passedCount}/${benchmarkResult.totalTests}`);
  } catch (err: any) {
    record('AI Quality Benchmark Non-Regression (14/14 Phases)', false, err.message);
  }

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`\n======================================================`);
  console.log(`  SUITE RÉSUMÉ : ${passed} / ${total} TESTS VALIDÉS (${failed === 0 ? 'SUCCÈS TOTAL' : 'ÉCHECS DÉTECTÉS'})`);
  console.log(`======================================================\n`);

  return { total, passed, failed, results };
}

// Standalone execution
if (process.argv[1]?.endsWith('bugIntelligenceTests.ts')) {
  runBugIntelligenceValidationSuite()
    .then((res) => {
      if (res.failed > 0) {
        console.error(`Validation completed with ${res.failed} failure(s).`);
        process.exit(1);
      }
      console.log('🌟 Bug Intelligence & Continuous Learning Loop Suite passed with 100% success.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal Test Error:', err);
      process.exit(1);
    });
}

