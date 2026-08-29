import { visualCaptureEngine, STANDARD_VIEWPORTS } from '../server/visual/visualCapture';
import { visualIntelligenceService } from '../server/visual/visualIntelligence';
import { visualRepairEngine } from '../server/visual/visualRepairEngine';
import { conversationEngine } from '../server/conversation/conversationEngine';
import { validatedArtifactEngine } from '../server/artifacts/validatedArtifact';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runVisualTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING VISUAL INTELLIGENCE RUNTIME TESTS (11 TESTS)');
  console.log('======================================================\n');

  let passed = 0;

  // TEST 1
  try {
    console.log('Test 1: VisualCaptureEngine captures Desktop & Mobile SVG and box models...');
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Test</title></head>
        <body class="p-8 bg-slate-50">
          <h1 class="text-3xl font-bold text-slate-900">Dashboard</h1>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div class="card p-6 bg-white rounded-2xl shadow-sm">Card 1</div>
            <div class="card p-6 bg-white rounded-2xl shadow-sm">Card 2</div>
          </div>
        </body>
      </html>
    `;
    const dtCapture = await visualCaptureEngine.captureRender(html, STANDARD_VIEWPORTS.desktop, { projectId: 'test-p1' });
    const mbCapture = await visualCaptureEngine.captureRender(html, STANDARD_VIEWPORTS.mobile, { projectId: 'test-p1' });

    assert(dtCapture.viewport.width === 1280, 'Desktop width should be 1280');
    assert(mbCapture.viewport.width === 375, 'Mobile width should be 375');
    assert(dtCapture.svgSnapshot.startsWith('<svg') || dtCapture.dataUri.startsWith('data:image/'), 'Snapshot should be valid');
    assert(dtCapture.flatNodes.length >= 2, 'Should compute multiple flat layout nodes');
    console.log('  ✅ TEST 1 PASSED: Multi-viewport real DOM capture valid.');
    passed++;
  } catch (e: any) {
    console.error('  ❌ TEST 1 FAILED:', e.message);
  }

  // TEST 2
  try {
    console.log('Test 2: Overflow Detection catches fixed width elements exceeding viewport...');
    const overflowHtml = `
      <div class="w-[800px] p-6 bg-blue-500 text-white">
        Large Box that overflows mobile
      </div>
    `;
    const mbCapture = await visualCaptureEngine.captureRender(overflowHtml, STANDARD_VIEWPORTS.mobile);
    assert(mbCapture.hasHorizontalOverflow === true, 'Should detect horizontal overflow on mobile');
    assert(mbCapture.overflowingElements.length > 0, 'Should list overflowing elements');
    assert(mbCapture.overflowingElements[0].excessWidth > 400, 'Excess width should be > 400px');
    console.log('  ✅ TEST 2 PASSED: Horizontal overflow properly detected.');
    passed++;
  } catch (e: any) {
    console.error('  ❌ TEST 2 FAILED:', e.message);
  }

  // TEST 3
  try {
    console.log('Test 3: Overlap Detection catches absolute positioned collisions...');
    const overlapHtml = `
      <div class="relative w-full h-96">
        <div class="absolute top-0 left-0 w-64 h-64 bg-red-500 z-10">Element A</div>
        <div class="absolute top-0 left-0 w-64 h-64 bg-blue-500 z-10">Element B</div>
      </div>
    `;
    const audit = await visualIntelligenceService.auditVisualRuntime(overlapHtml, { projectId: 'test-p3' });
    const overlapIssue = audit.issues.find((i) => i.category === 'OVERLAP');
    assert(!!overlapIssue, 'Should flag OVERLAP issue');
    console.log('  ✅ TEST 3 PASSED: Layout overlap detected with coordinate evidence.');
    passed++;
  } catch (e: any) {
    console.error('  ❌ TEST 3 FAILED:', e.message);
  }

  // TEST 4
  try {
    console.log('Test 4: Responsive Check flags fixed multi-column grid on mobile...');
    const brokenGridHtml = `
      <div class="grid grid-cols-3 gap-4">
        <div>Col 1</div>
        <div>Col 2</div>
        <div>Col 3</div>
      </div>
    `;
    const audit = await visualIntelligenceService.auditVisualRuntime(brokenGridHtml, { projectId: 'test-p4' });
    const respIssue = audit.issues.find((i) => i.category === 'RESPONSIVE');
    assert(!!respIssue, 'Should flag RESPONSIVE issue for unadapted grid');
    console.log('  ✅ TEST 4 PASSED: Responsive breakdown accurately identified.');
    passed++;
  } catch (e: any) {
    console.error('  ❌ TEST 4 FAILED:', e.message);
  }

  // TEST 5
  try {
    console.log('Test 5: Contrast Check detects invisible same-color text...');
    const invisibleTextHtml = `
      <div class="p-8 bg-white">
        <p class="text-white bg-white">This text is invisible!</p>
      </div>
    `;
    const audit = await visualIntelligenceService.auditVisualRuntime(invisibleTextHtml, { projectId: 'test-p5' });
    const contrastIssue = audit.issues.find((i) => i.category === 'CONTRAST');
    assert(!!contrastIssue, 'Should flag CONTRAST issue');
    console.log('  ✅ TEST 5 PASSED: Low/zero contrast text detected.');
    passed++;
  } catch (e: any) {
    console.error('  ❌ TEST 5 FAILED:', e.message);
  }

  // TEST 6
  try {
    console.log('Test 6: Visual Hierarchy Check detects missing structure...');
    const unstructuredHtml = `
      <div class="p-8">
        <div>Just a div</div>
        <div>Another div</div>
        <div>Third div</div>
        <div>Fourth div</div>
      </div>
    `;
    const audit = await visualIntelligenceService.auditVisualRuntime(unstructuredHtml, { projectId: 'test-p6' });
    const hierIssue = audit.issues.find((i) => i.category === 'HIERARCHY');
    assert(!!hierIssue, 'Should flag HIERARCHY issue');
    console.log('  ✅ TEST 6 PASSED: Missing heading structure flagged.');
    passed++;
  } catch (e: any) {
    console.error('  ❌ TEST 6 FAILED:', e.message);
  }

  // TEST 7
  try {
    console.log('Test 7: Static Design Harmony & DNA rules integration...');
    const harmonyHtml = `
      <body class="p-8 bg-slate-900 text-white">
        <h1 class="text-2xl font-bold">Analytics</h1>
        <p class="text-slate-400 mt-2">Metrics overview</p>
      </body>
    `;
    const audit = await visualIntelligenceService.auditVisualRuntime(harmonyHtml, { projectId: 'test-p7' });
    assert(typeof audit.designHarmony.overallScore === 'number', 'Design Harmony score should be computed');
    assert(audit.dnaCompliance !== undefined, 'DNA compliance must be evaluated');
    console.log('  ✅ TEST 7 PASSED: Static Design Harmony and DNA integrated.');
    passed++;
  } catch (e: any) {
    console.error('  ❌ TEST 7 FAILED:', e.message);
  }

  // TEST 8
  try {
    console.log('Test 8: Decision Engine computes overall score & status...');
    const cleanHtml = `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Clean App</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="p-8 bg-slate-50 overflow-x-hidden">
          <main class="max-w-7xl mx-auto">
            <h1 class="text-3xl font-bold text-slate-900 mb-6">Clean Dashboard</h1>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="card p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
                <h2 class="text-lg font-semibold text-slate-800">Stats</h2>
                <p class="text-slate-600 mt-2">Active users: 1,420</p>
              </div>
            </div>
          </main>
        </body>
      </html>
    `;
    const audit = await visualIntelligenceService.auditVisualRuntime(cleanHtml, { projectId: 'test-p8' });
    assert(audit.overallScore >= 75, `Score should be >= 75, got ${audit.overallScore}`);
    assert(audit.status === 'PASSED' || audit.status === 'WARNING', `Status should be clean, got ${audit.status}`);
    console.log(`  ✅ TEST 8 PASSED: Status calculated properly (${audit.status}, ${audit.overallScore}/100).`);
    passed++;
  } catch (e: any) {
    console.error('  ❌ TEST 8 FAILED:', e.message);
  }

  // TEST 9
  try {
    console.log('Test 9: VisualRepairEngine creates certified SYSTEM_REPAIR Changeset...');
    const parentChangeset = validatedArtifactEngine.generateChangeset({
      projectId: 'test-p9',
      versionNumber: 1,
      summary: 'Create card layout',
      html: '<div class="w-[900px] grid-cols-3">Broken</div>',
      isAutoApproved: true,
    });

    const brokenReport = await visualIntelligenceService.auditVisualRuntime(
      '<div class="w-[900px] grid-cols-3">Broken</div>',
      { projectId: 'test-p9', changesetId: parentChangeset.id }
    );

    const repairResult = visualRepairEngine.repairVisualIssues(
      '<div class="w-[900px] grid-cols-3">Broken</div>',
      brokenReport,
      parentChangeset.id
    );

    assert(repairResult.success === true, 'Visual repair should succeed');
    assert(repairResult.appliedFixes.length > 0, 'Applied fixes should be populated');
    assert(repairResult.repairChangeset !== undefined, 'Repair Changeset must exist');
    assert(repairResult.repairChangeset?.provenance.actor === 'system_visual_intelligence_repair', 'Actor must be system_visual_intelligence_repair');
    assert(repairResult.repairChangeset?.parentChangesetId === parentChangeset.id, 'Parent changeset ID must match');
    assert(repairResult.repairArtifact !== undefined, 'Repair Validated Artifact must be sealed');
    assert(repairResult.verification?.isMatch === true, 'Cryptographic verification must pass');
    console.log('  ✅ TEST 9 PASSED: Visual repair generated cryptographic SYSTEM_REPAIR changeset.');
    passed++;
  } catch (e: any) {
    console.error('  ❌ TEST 9 FAILED:', e.message);
  }

  // TEST 10
  try {
    console.log('Test 10: Full Conversation Engine execution with Visual Intelligence runtime...');
    const result = await conversationEngine.processUserMessage({
      projectId: 'proj_vis_e2e',
      prompt: 'Crée un dashboard de monitoring moderne avec des graphiques et cartes',
      vibe: 'modern-saas',
      confirmedByUser: true,
    });

    assert(result.visualAudit !== undefined, 'Pipeline result must contain visualAudit');
    assert(typeof result.visualAudit?.overallScore === 'number', 'Visual score must be a number');
    assert(result.visualAudit?.desktop !== undefined, 'Desktop audit must exist');
    assert(result.visualAudit?.mobile !== undefined, 'Mobile audit must exist');
    assert(result.validatedArtifact !== undefined, 'Validated Artifact must be present');
    console.log(`  ✅ TEST 10 PASSED: Conversation pipeline executed visual runtime (Score: ${result.visualAudit?.overallScore}).`);
    passed++;
  } catch (e: any) {
    console.error('  ❌ TEST 10 FAILED:', e.message);
  }

  // TEST 11
  try {
    console.log('Test 11: Real SVG snapshot generation with CSS styling...');
    const richHtml = `
      <body class="p-6 bg-slate-900 text-white">
        <h1 class="text-2xl font-bold">Server Metrics</h1>
        <div class="mt-4 p-4 rounded-xl bg-slate-800 border border-slate-700">
          <p class="text-emerald-400 font-mono">CPU: 24% | Memory: 3.2GB</p>
        </div>
      </body>
    `;
    const capture = await visualCaptureEngine.captureRender(richHtml, STANDARD_VIEWPORTS.desktop);
    assert(capture.svgSnapshot.includes('<svg') || capture.dataUri.startsWith('data:image/'), 'Snapshot must be generated');
    assert(capture.scrollWidth > 0, 'Scroll width must be > 0');
    assert(capture.scrollHeight > 0, 'Scroll height must be > 0');
    assert(capture.captureMode === 'REAL', 'Capture mode must be REAL browser');
    console.log('  ✅ TEST 11 PASSED: Real browser snapshot produced successfully.');
    passed++;
  } catch (e: any) {
    console.error('  ❌ TEST 11 FAILED:', e.message);
  }

  console.log(`\n🎉 RESULTS: ${passed}/11 TESTS PASSED SUCCESSFULLY!`);
  await visualCaptureEngine.closeBrowser();
  if (passed !== 11) {
    process.exit(1);
  }
  process.exit(0);
}

runVisualTests().catch(async (e) => {
  console.error('Fatal test runner error:', e);
  await visualCaptureEngine.closeBrowser().catch(() => {});
  process.exit(1);
});
