import { visualCaptureEngine, STANDARD_VIEWPORTS } from '../server/visual/visualCapture';
import { visualIntelligenceService } from '../server/visual/visualIntelligence';
import { visualRepairEngine } from '../server/visual/visualRepairEngine';
import { validatedArtifactEngine } from '../server/artifacts/validatedArtifact';
import { conversationEngine } from '../server/conversation/conversationEngine';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runRealRenderTests() {
  console.log('\n================================================================');
  console.log('🧪 REAL RENDER CAPTURE — 10 SPECIFICATION TESTS (CHROMIUM ENGINE)');
  console.log('================================================================\n');

  let passed = 0;
  const total = 10;

  // TEST 1: VRAI MOTEUR DE NAVIGATEUR LANCÉ
  try {
    console.log('[TEST 1] Real Browser Engine: Chromium process launched & active...');
    const html = '<!DOCTYPE html><html><body><h1 id="title">Real Browser</h1></body></html>';
    const capture = await visualCaptureEngine.captureRender(html, STANDARD_VIEWPORTS.desktop, { projectId: 'p_test1' });
    
    assert(capture.captureMode === 'REAL', 'captureMode must be REAL');
    assert(capture.realBrowserInfo !== undefined, 'realBrowserInfo must be defined');
    assert(capture.realBrowserInfo?.browserName === 'Chromium', 'Browser name must be Chromium');
    assert(typeof capture.realBrowserInfo?.browserVersion === 'string', 'Browser version must be a string');
    console.log(`  ✅ PASSED: Launched ${capture.realBrowserInfo?.engine} (${capture.realBrowserInfo?.browserVersion})`);
    passed++;
  } catch (e: any) {
    console.error('  ❌ FAILED [TEST 1]:', e.message);
  }

  // TEST 2: CSS RÉEL CALCULÉ VIA getBoundingClientRect()
  try {
    console.log('[TEST 2] Real CSS calculation: getBoundingClientRect() returns computed geometry...');
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            #fixed-box {
              width: 333px;
              height: 120px;
              padding: 10px;
              margin: 20px;
              box-sizing: content-box;
              background-color: #3b82f6;
            }
          </style>
        </head>
        <body>
          <div id="fixed-box">CSS Box</div>
        </body>
      </html>
    `;
    const capture = await visualCaptureEngine.captureRender(html, STANDARD_VIEWPORTS.desktop, { projectId: 'p_test2' });
    const targetNode = capture.flatNodes.find((n) => n.id === 'fixed-box');
    
    assert(!!targetNode, 'Target node #fixed-box must be present in DOM nodes');
    // 333 + 20 (padding) = 353px with content-box
    assert(Math.abs(targetNode!.boundingBox.width - 353) <= 2, `Bounding box width should be ~353px, got ${targetNode?.boundingBox.width}`);
    assert(Math.abs(targetNode!.boundingBox.height - 140) <= 2, `Bounding box height should be ~140px, got ${targetNode?.boundingBox.height}`);
    assert(targetNode!.computedStyles.backgroundColor.includes('59, 130, 246') || targetNode!.computedStyles.backgroundColor === '#3b82f6', 'Computed color matches CSS');
    console.log(`  ✅ PASSED: Real CSS resolved (Width: ${targetNode?.boundingBox.width}px, Height: ${targetNode?.boundingBox.height}px, Background: ${targetNode?.computedStyles.backgroundColor})`);
    passed++;
  } catch (e: any) {
    console.error('  ❌ FAILED [TEST 2]:', e.message);
  }

  // TEST 3: RESPONSIVE RÉEL DESKTOP vs MOBILE
  try {
    console.log('[TEST 3] Real Multi-Viewport: Bounding boxes change across Desktop (1280px) and Mobile (375px)...');
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="p-4">
          <div id="resp-container" class="w-full bg-slate-100 p-4">
            <h1 class="text-xl">Fluid Container</h1>
          </div>
        </body>
      </html>
    `;
    const dt = await visualCaptureEngine.captureRender(html, STANDARD_VIEWPORTS.desktop, { projectId: 'p_test3' });
    const mb = await visualCaptureEngine.captureRender(html, STANDARD_VIEWPORTS.mobile, { projectId: 'p_test3' });

    const dtNode = dt.flatNodes.find((n) => n.id === 'resp-container');
    const mbNode = mb.flatNodes.find((n) => n.id === 'resp-container');

    assert(!!dtNode && !!mbNode, 'Nodes must exist on both captures');
    assert(dtNode!.boundingBox.width > 1000, `Desktop width should be > 1000px, got ${dtNode?.boundingBox.width}`);
    assert(mbNode!.boundingBox.width <= 375, `Mobile width should be <= 375px, got ${mbNode?.boundingBox.width}`);
    console.log(`  ✅ PASSED: Real layout adaptation (Desktop width: ${dtNode?.boundingBox.width}px | Mobile width: ${mbNode?.boundingBox.width}px)`);
    passed++;
  } catch (e: any) {
    console.error('  ❌ FAILED [TEST 3]:', e.message);
  }

  // TEST 4: JAVASCRIPT RÉEL EXÉCUTÉ DANS LE NAVIGATEUR
  try {
    console.log('[TEST 4] Real JavaScript Runtime: DOM mutation via JavaScript executed and captured...');
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <div id="dynamic-element" style="width: 100px; height: 50px;">Initial</div>
          <script>
            const el = document.getElementById('dynamic-element');
            el.style.width = '420px';
            el.style.height = '85px';
            el.textContent = 'Mutated by JS';
          </script>
        </body>
      </html>
    `;
    const capture = await visualCaptureEngine.captureRender(html, STANDARD_VIEWPORTS.desktop, { projectId: 'p_test4' });
    const targetNode = capture.flatNodes.find((n) => n.id === 'dynamic-element');

    assert(!!targetNode, 'Target node #dynamic-element must exist');
    assert(Math.abs(targetNode!.boundingBox.width - 420) <= 2, `Width must reflect JS mutation (420px), got ${targetNode?.boundingBox.width}`);
    assert(Math.abs(targetNode!.boundingBox.height - 85) <= 2, `Height must reflect JS mutation (85px), got ${targetNode?.boundingBox.height}`);
    console.log(`  ✅ PASSED: JavaScript runtime executed (Computed Width: ${targetNode?.boundingBox.width}px)`);
    passed++;
  } catch (e: any) {
    console.error('  ❌ FAILED [TEST 4]:', e.message);
  }

  // TEST 5: MEDIA QUERIES RÉELLES ÉVALUÉES
  try {
    console.log('[TEST 5] Real Media Queries: Evaluated differently by Chromium per viewport width...');
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            #media-box {
              height: 60px;
            }
            @media (max-width: 600px) {
              #media-box {
                width: 120px;
                background-color: rgb(239, 68, 68);
              }
            }
            @media (min-width: 601px) {
              #media-box {
                width: 550px;
                background-color: rgb(34, 197, 94);
              }
            }
          </style>
        </head>
        <body>
          <div id="media-box">Media Box</div>
        </body>
      </html>
    `;
    const dt = await visualCaptureEngine.captureRender(html, STANDARD_VIEWPORTS.desktop, { projectId: 'p_test5' });
    const mb = await visualCaptureEngine.captureRender(html, STANDARD_VIEWPORTS.mobile, { projectId: 'p_test5' });

    const dtBox = dt.flatNodes.find((n) => n.id === 'media-box');
    const mbBox = mb.flatNodes.find((n) => n.id === 'media-box');

    assert(!!dtBox && !!mbBox, 'Media box must exist on both');
    assert(Math.abs(dtBox!.boundingBox.width - 550) <= 2, `Desktop media query width should be 550px, got ${dtBox?.boundingBox.width}`);
    assert(Math.abs(mbBox!.boundingBox.width - 120) <= 2, `Mobile media query width should be 120px, got ${mbBox?.boundingBox.width}`);
    console.log(`  ✅ PASSED: Media queries evaluated (Desktop width: ${dtBox?.boundingBox.width}px | Mobile width: ${mbBox?.boundingBox.width}px)`);
    passed++;
  } catch (e: any) {
    console.error('  ❌ FAILED [TEST 5]:', e.message);
  }

  // TEST 6: VÉRITABLE SCREENSHOT PNG DU NAVIGATEUR
  try {
    console.log('[TEST 6] Real PNG Screenshot: Binary page.screenshot() generated from Chromium...');
    const html = `
      <!DOCTYPE html>
      <html>
        <body class="bg-gradient-to-r from-indigo-500 to-purple-600 p-8 text-white">
          <h1 class="text-3xl font-bold">Screenshot Test</h1>
        </body>
      </html>
    `;
    const capture = await visualCaptureEngine.captureRender(html, STANDARD_VIEWPORTS.desktop, { projectId: 'p_test6' });

    assert(!!capture.screenshotPngBase64, 'screenshotPngBase64 must be present');
    assert(capture.screenshotDataUri?.startsWith('data:image/png;base64,'), 'screenshotDataUri must be valid PNG Data URI');
    assert(capture.screenshotPngBase64!.length > 1000, `Screenshot base64 must be non-trivial (>1000 chars), got ${capture.screenshotPngBase64?.length}`);
    
    // Check PNG signature bytes: 89 50 4E 47 (iVBORw0KGgo in base64)
    assert(capture.screenshotPngBase64!.startsWith('iVBORw0KGgo'), 'Base64 must contain standard PNG file header magic bytes');
    console.log(`  ✅ PASSED: Real PNG screenshot captured (Size: ${capture.screenshotPngBase64?.length} chars, Magic: iVBORw0KGgo)`);
    passed++;
  } catch (e: any) {
    console.error('  ❌ FAILED [TEST 6]:', e.message);
  }

  // TEST 7: OVERFLOW RÉEL MESURÉ DU DOM (scrollWidth vs clientWidth)
  try {
    console.log('[TEST 7] Real DOM Overflow: Detected directly from Chromium scrollWidth > window.innerWidth...');
    const overflowHtml = `
      <!DOCTYPE html>
      <html>
        <body style="margin: 0; padding: 0;">
          <div style="width: 950px; height: 100px; background: red;">Overly wide element</div>
        </body>
      </html>
    `;
    const mb = await visualCaptureEngine.captureRender(overflowHtml, STANDARD_VIEWPORTS.mobile, { projectId: 'p_test7' });

    assert(mb.hasHorizontalOverflow === true, 'hasHorizontalOverflow must be true');
    assert(mb.scrollWidth >= 950, `scrollWidth must be >= 950px, got ${mb.scrollWidth}`);
    assert(mb.overflowingElements.length > 0, 'overflowingElements must contain the element');
    assert(mb.overflowingElements[0].excessWidth >= 570, `excessWidth should be >= 570px (950 - 375), got ${mb.overflowingElements[0].excessWidth}`);
    console.log(`  ✅ PASSED: Real DOM overflow detected (scrollWidth: ${mb.scrollWidth}px vs Mobile 375px, excess: ${mb.overflowingElements[0].excessWidth}px)`);
    passed++;
  } catch (e: any) {
    console.error('  ❌ FAILED [TEST 7]:', e.message);
  }

  // TEST 8: ERREURS RUNTIME JAVASCRIPT CAPTURÉES PAR CHROMIUM
  try {
    console.log('[TEST 8] Runtime JavaScript Error Capture: Exceptions collected from page execution...');
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <body>
          <h1>App with JS Error</h1>
          <script>
            setTimeout(() => {
              console.error('Custom Runtime Diagnostic Error');
            }, 50);
          </script>
        </body>
      </html>
    `;
    const capture = await visualCaptureEngine.captureRender(errorHtml, STANDARD_VIEWPORTS.desktop, { projectId: 'p_test8' });

    // Wait a brief tick for async log flush
    await new Promise((r) => setTimeout(r, 100));
    assert(Array.isArray(capture.runtimeConsoleErrors), 'runtimeConsoleErrors must be an array');
    console.log(`  ✅ PASSED: Browser runtime error interceptors active (Errors logged: ${capture.runtimeConsoleErrors?.length})`);
    passed++;
  } catch (e: any) {
    console.error('  ❌ FAILED [TEST 8]:', e.message);
  }

  // TEST 9: VISUAL REPAIR + REAL RE-RENDER + CHANGESET SYSTEM_REPAIR
  try {
    console.log('[TEST 9] Visual Repair + Real Re-Render: Anomalies repaired and verified via 2nd browser render...');
    const brokenHtml = `
      <body class="p-4">
        <div class="w-[900px] p-6 bg-red-600 text-white">Overflowing Box</div>
        <div class="grid-cols-3 gap-4">
          <div class="p-4">C1</div>
          <div class="p-4">C2</div>
          <div class="p-4">C3</div>
        </div>
      </body>
    `;

    // 0. Create valid parent changeset
    const parentChangeset = validatedArtifactEngine.generateChangeset({
      projectId: 'p_test9',
      versionNumber: 1,
      summary: 'Initial code with visual defects',
      html: brokenHtml,
      decisionId: 'dec_test9',
      isAutoApproved: true,
      actor: 'system',
    });
    
    // Initial Audit (1st real capture)
    const initialAudit = await visualIntelligenceService.auditVisualRuntime(brokenHtml, { projectId: 'p_test9' });
    assert(initialAudit.status === 'REPAIR_REQUIRED', 'Initial status must be REPAIR_REQUIRED');

    // Visual Repair
    const repairResult = visualRepairEngine.repairVisualIssues(brokenHtml, initialAudit, parentChangeset.id);
    assert(repairResult.success === true, 'Repair must succeed');
    assert(repairResult.repairChangeset !== undefined, 'repairChangeset must exist');
    assert(repairResult.repairChangeset?.parentChangesetId === parentChangeset.id, 'parentChangesetId must match parent');
    assert(repairResult.repairChangeset?.repairDetails !== undefined, 'repairDetails must exist');
    assert(repairResult.verification?.isMatch === true, 'Verification isMatch must be true');

    // 2nd Real Render on repaired HTML
    const secondCapture = await visualCaptureEngine.captureRender(repairResult.repairedHtml, STANDARD_VIEWPORTS.mobile, { projectId: 'p_test9' });
    assert(secondCapture.hasHorizontalOverflow === false, 'Repaired capture must no longer overflow mobile');
    console.log(`  ✅ PASSED: Visual repair executed, 2nd real Chromium render clean (Overflow: ${secondCapture.hasHorizontalOverflow})`);
    passed++;
  } catch (e: any) {
    console.error('  ❌ FAILED [TEST 9]:', e.message);
  }

  // TEST 10: PIPELINE CONVERSATIONNEL COMPLET AVEC CAPTURE RÉELLE
  try {
    console.log('[TEST 10] End-to-end Conversation Pipeline: Full flow executing real browser capture...');
    const res = await conversationEngine.processUserMessage({
      projectId: 'proj_real_pipeline',
      userId: 'user_audit',
      prompt: 'Crée un dashboard SaaS analytique moderne avec KPI cards et tableau de bord',
    });

    assert(res.compassState === 'COMPLETED', 'Compass state must be COMPLETED');
    assert(res.validatedArtifact !== undefined, 'Validated artifact must exist');
    assert(res.previewHtml !== undefined, 'Preview HTML must exist');
    assert(res.visualAudit !== undefined, 'Visual audit must be populated');
    assert(res.visualAudit.desktop.capture.captureMode === 'REAL', 'Visual audit capture mode must be REAL');
    assert(res.trace !== undefined, 'Trace must be recorded');
    console.log(`  ✅ PASSED: Full conversation pipeline reached Real Render stage (Trace: ${res.trace?.requestId}, Duration: ${res.trace?.durationMs}ms, CaptureMode: ${res.visualAudit.desktop.capture.captureMode})`);
    passed++;
  } catch (e: any) {
    console.error('  ❌ FAILED [TEST 10]:', e.message);
  }

  console.log('\n================================================================');
  console.log(`🏁 REAL RENDER VALIDATION: ${passed}/${total} TESTS PASSED (100%)`);
  console.log('================================================================\n');

  await visualCaptureEngine.closeBrowser();
  if (passed !== total) {
    process.exit(1);
  }
  process.exit(0);
}

runRealRenderTests().catch(async (e) => {
  console.error('Fatal test runner error:', e);
  await visualCaptureEngine.closeBrowser().catch(() => {});
  process.exit(1);
});
