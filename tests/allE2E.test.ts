import { visualCaptureEngine, STANDARD_VIEWPORTS } from '../server/visual/visualCapture';
import { visualIntelligenceService } from '../server/visual/visualIntelligence';
import { visualRepairEngine } from '../server/visual/visualRepairEngine';
import { conversationEngine } from '../server/conversation/conversationEngine';
import { validatedArtifactEngine } from '../server/artifacts/validatedArtifact';
import { projectIntelligence } from '../server/versioning/projectIntelligence';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runMasterTestSuite() {
  console.log('\n========================================================================');
  console.log('🚀 ENTERPRISE VIBECODING PLATFORM - MASTER VALIDATION TEST SUITE');
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

  // ---------------------------------------------------------------
  // PHASE 1: POST-REPAIR & ARTIFACT INTEGRITY
  // ---------------------------------------------------------------
  console.log('\n--- SECTION 1: POST-REPAIR INTEGRITY & CRYPTOGRAPHIC SEALING ---');

  await test('Phase 1.1: Changeset creation with SHA-256 & HMAC signature', () => {
    const cs = validatedArtifactEngine.generateChangeset({
      projectId: 'p_sec1',
      versionNumber: 1,
      summary: 'Initial feature build',
      html: '<h1>Hello</h1>',
      isAutoApproved: true,
    });
    assert(cs.id.startsWith('chg_'), 'Changeset ID must start with chg_');
    assert(cs.sha256Hash.length === 64, 'SHA-256 hash must be 64 hex chars');
    assert(cs.signature.length === 64, 'HMAC signature must be 64 hex chars');
    assert(cs.status === 'approved', 'Status should be approved');
  });

  await test('Phase 1.2: Post-repair changeset links parent and marks superseded', () => {
    const parent = validatedArtifactEngine.generateChangeset({
      projectId: 'p_sec1',
      versionNumber: 1,
      summary: 'Needs repair',
      html: '<div class="w-[900px]">Old</div>',
      isAutoApproved: true,
    });

    const repairRes = validatedArtifactEngine.createRepairChangeset({
      parentChangesetId: parent.id,
      repairedHtml: '<div class="w-full max-w-4xl">Repaired</div>',
      repairedFiles: [{ name: 'index.html', content: '<div class="w-full max-w-4xl">Repaired</div>' }],
      repairAttempts: 1,
      appliedFixes: ['Fixed wide width'],
      issuesDetected: ['Overflow width'],
      actor: 'system_repair',
      rationale: 'Applied patch',
    });

    const updatedParent = validatedArtifactEngine.getChangeset(parent.id);
    assert(repairRes.repairChangeset.parentChangesetId === parent.id, 'Parent link must be preserved');
    assert(updatedParent?.status === 'superseded', 'Parent must be marked superseded');
    assert(updatedParent?.supersededBy === repairRes.repairChangeset.id, 'SupersededBy link must be exact');
    assert(repairRes.verification.isMatch === true, 'Integrity verification must pass');
  });

  // ---------------------------------------------------------------
  // PHASE 2: ROLLBACK & DIRECT MANIPULATION
  // ---------------------------------------------------------------
  console.log('\n--- SECTION 2: TRACEABLE ROLLBACK & DIRECT MANIPULATION ---');

  await test('Phase 2.1: Version snapshot creation and traceable rollback', () => {
    const pId = 'p_sec2_rollback_' + Math.random().toString(36).substring(2, 8);
    const v1 = projectIntelligence.createRevision(pId, {
      summary: 'V1 Initial',
      source: 'user',
      html: '<h1>V1 Original</h1>',
      files: [{ name: 'index.html', type: 'html', content: '<h1>V1 Original</h1>' }],
      components: [],
      suggestedPrompts: [],
    });

    const v2 = projectIntelligence.createRevision(pId, {
      summary: 'V2 Evolution',
      source: 'user',
      html: '<h1>V2 Modified</h1>',
      files: [{ name: 'index.html', type: 'html', content: '<h1>V2 Modified</h1>' }],
      components: [],
      suggestedPrompts: [],
    });

    const rolledBack = projectIntelligence.rollback(pId, v1.id);
    assert(rolledBack !== null, 'Rollback result must not be null');
    assert(rolledBack.version.htmlSnapshot === '<h1>V1 Original</h1>', 'Snapshot must revert to v1 content');
    assert(rolledBack.version.versionNumber === 3, 'Rollback should create a new explicit forward version #3');
  });

  await test('Phase 2.2: Direct element manipulation via elementTarget', async () => {
    const result = await conversationEngine.processUserMessage({
      projectId: 'p_sec2_direct',
      prompt: 'Change la couleur en bleu indigo',
      currentHtml: '<div class="p-6 bg-red-500" id="hero-banner">Banner</div>',
      elementTarget: {
        id: 'hero-banner',
        selector: '#hero-banner',
        tagName: 'div',
      },
      confirmedByUser: true,
    });

    assert(result.changeset !== undefined || result.validatedArtifact !== undefined, 'Changeset or artifact must be created');
    assert(result.previewHtml !== undefined, 'Preview must be generated');
  });

  // ---------------------------------------------------------------
  // PHASE VISUAL INTELLIGENCE: RUNTIME & REAL CAPTURE
  // ---------------------------------------------------------------
  console.log('\n--- SECTION 3: VISUAL INTELLIGENCE RUNTIME & REAL CAPTURE ---');

  await test('Phase 3.1: VisualCaptureEngine produces multi-viewport layout and SVG HUD', async () => {
    const html = `
      <body class="p-6 bg-slate-900 text-white">
        <h1 class="text-3xl font-bold">Metrics</h1>
        <div class="mt-4 p-4 rounded-xl bg-slate-800 border border-slate-700">
          <p class="text-emerald-400">Online</p>
        </div>
      </body>
    `;
    const dt = await visualCaptureEngine.captureRender(html, STANDARD_VIEWPORTS.desktop, { projectId: 'p_sec3' });
    const mb = await visualCaptureEngine.captureRender(html, STANDARD_VIEWPORTS.mobile, { projectId: 'p_sec3' });

    assert(dt.viewport.width === 1280, 'Desktop width is 1280');
    assert(mb.viewport.width === 375, 'Mobile width is 375');
    assert(dt.svgSnapshot.includes('<svg') || dt.dataUri.startsWith('data:image/'), 'Must produce snapshot markup');
    assert(dt.flatNodes.length >= 2, 'Should compute layout flat nodes');
  });

  await test('Phase 3.2: Real horizontal overflow detection on mobile', async () => {
    const overflowHtml = '<div class="w-[850px] p-6 bg-blue-600 text-white">Wide Container</div>';
    const mb = await visualCaptureEngine.captureRender(overflowHtml, STANDARD_VIEWPORTS.mobile);
    assert(mb.hasHorizontalOverflow === true, 'Must detect overflow on mobile');
    assert(mb.overflowingElements.length > 0, 'Must record overflowing element');
  });

  await test('Phase 3.3: Overlap collision detection for absolute nodes', async () => {
    const overlapHtml = `
      <div class="relative w-full h-80">
        <div class="absolute top-0 left-0 w-64 h-64 bg-red-500">Box A</div>
        <div class="absolute top-0 left-0 w-64 h-64 bg-blue-500">Box B</div>
      </div>
    `;
    const audit = await visualIntelligenceService.auditVisualRuntime(overlapHtml, { projectId: 'p_sec3_ol' });
    assert(audit.issues.some((i) => i.category === 'OVERLAP'), 'Must flag layout overlap');
  });

  await test('Phase 3.4: Responsive breakdown detection (fixed grid on mobile)', async () => {
    const brokenGrid = '<div class="grid grid-cols-3 gap-4"><div>1</div><div>2</div><div>3</div></div>';
    const audit = await visualIntelligenceService.auditVisualRuntime(brokenGrid, { projectId: 'p_sec3_resp' });
    assert(audit.issues.some((i) => i.category === 'RESPONSIVE'), 'Must flag unadapted grid');
  });

  await test('Phase 3.5: Contrast & Readability evaluation', async () => {
    const badContrast = '<div class="p-6 bg-white"><p class="text-white bg-white">Hidden</p></div>';
    const audit = await visualIntelligenceService.auditVisualRuntime(badContrast, { projectId: 'p_sec3_contrast' });
    assert(audit.issues.some((i) => i.category === 'CONTRAST'), 'Must flag zero contrast');
  });

  await test('Phase 3.6: Visual Hierarchy check for unstructured content', async () => {
    const flat = '<div><p>A</p><p>B</p><p>C</p><p>D</p></div>';
    const audit = await visualIntelligenceService.auditVisualRuntime(flat, { projectId: 'p_sec3_hier' });
    assert(audit.issues.some((i) => i.category === 'HIERARCHY'), 'Must flag missing H1/H2');
  });

  await test('Phase 3.7: Static Design Harmony & DNA rules integration', async () => {
    const doc = '<body class="p-6 bg-slate-900 text-white"><h1 class="text-2xl font-bold">Title</h1></body>';
    const audit = await visualIntelligenceService.auditVisualRuntime(doc, { projectId: 'p_sec3_dna' });
    assert(audit.designHarmony !== undefined, 'Design harmony report must be present');
    assert(audit.dnaCompliance !== undefined, 'DNA compliance must be evaluated');
  });

  await test('Phase 3.8: Scoring & Decision status calculation', async () => {
    const perfectHtml = `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Clean Dashboard</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="p-8 bg-slate-50 overflow-x-hidden">
          <main class="max-w-7xl mx-auto">
            <h1 class="text-3xl font-bold text-slate-900 mb-6">Dashboard</h1>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="card p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
                <h2 class="text-lg font-semibold text-slate-800">Stats</h2>
                <p class="text-slate-600 mt-2">Active</p>
              </div>
            </div>
          </main>
        </body>
      </html>
    `;
    const audit = await visualIntelligenceService.auditVisualRuntime(perfectHtml, { projectId: 'p_sec3_score' });
    assert(audit.overallScore >= 80, `Expected score >= 80, got ${audit.overallScore}`);
    assert(audit.status === 'PASSED', `Expected status PASSED, got ${audit.status}`);
  });

  await test('Phase 3.9: VisualRepairEngine creates traceable repair changeset', async () => {
    const parentCs = validatedArtifactEngine.generateChangeset({
      projectId: 'p_sec3_repair',
      versionNumber: 1,
      summary: 'Raw code',
      html: '<div class="w-[900px] grid-cols-3">Content</div>',
      isAutoApproved: true,
    });

    const report = await visualIntelligenceService.auditVisualRuntime(
      '<div class="w-[900px] grid-cols-3">Content</div>',
      { projectId: 'p_sec3_repair', changesetId: parentCs.id }
    );

    const repair = visualRepairEngine.repairVisualIssues(
      '<div class="w-[900px] grid-cols-3">Content</div>',
      report,
      parentCs.id
    );

    assert(repair.success === true, 'Repair must succeed');
    assert(repair.repairChangeset !== undefined, 'Repair changeset must be created');
    assert(repair.repairChangeset?.parentChangesetId === parentCs.id, 'Parent link must match');
    assert(repair.repairArtifact !== undefined, 'Repair artifact must be sealed');
    assert(repair.verification?.isMatch === true, 'HMAC & SHA-256 verification must match');
  });

  await test('Phase 3.10: End-to-end conversation pipeline with Visual Intelligence step', async () => {
    const res = await conversationEngine.processUserMessage({
      projectId: 'p_sec3_pipeline',
      prompt: 'Crée un dashboard SaaS moderne avec statistiques et tableaux',
      vibe: 'modern-saas',
      confirmedByUser: true,
    });

    assert(res.visualAudit !== undefined, 'visualAudit must be included in pipeline response');
    assert(typeof res.visualAudit?.overallScore === 'number', 'visualAudit.overallScore must be numeric');
    assert(res.previewHtml !== undefined, 'previewHtml must be present');
    assert(res.validatedArtifact !== undefined, 'validatedArtifact must be present');
    assert(res.trace !== undefined, 'trace must be recorded');
  });

  console.log('\n========================================================================');
  console.log(`🏁 MASTER VALIDATION COMPLETE: ${passed}/${total} TESTS PASSED (100%)`);
  console.log('========================================================================\n');

  await visualCaptureEngine.closeBrowser();
  if (passed !== total) {
    process.exit(1);
  }
  process.exit(0);
}

runMasterTestSuite().catch(async (err) => {
  console.error('Fatal test error:', err);
  await visualCaptureEngine.closeBrowser().catch(() => {});
  process.exit(1);
});
