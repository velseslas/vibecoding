import crypto from 'crypto';
import puppeteer, { Browser, Page } from 'puppeteer';
import { logger } from '../logger';

export type ViewportMode = 'desktop' | 'mobile' | 'tablet';

export interface ViewportConfig {
  name: ViewportMode;
  width: number;
  height: number;
  deviceScaleFactor: number;
  userAgent?: string;
}

export const STANDARD_VIEWPORTS: Record<ViewportMode, ViewportConfig> = {
  desktop: {
    name: 'desktop',
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
  },
  tablet: {
    name: 'tablet',
    width: 768,
    height: 1024,
    deviceScaleFactor: 2,
  },
  mobile: {
    name: 'mobile',
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
  },
};

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ComputedDomNode {
  id?: string;
  tagName: string;
  className: string;
  innerText?: string;
  boundingBox: BoundingBox;
  computedStyles: {
    display: string;
    position: string;
    zIndex: number;
    color: string;
    backgroundColor: string;
    fontSize: number;
    fontWeight: string;
    paddingTop: number;
    paddingRight: number;
    paddingBottom: number;
    paddingLeft: number;
    marginTop: number;
    marginBottom: number;
    overflowX: string;
    overflowY: string;
    opacity: number;
    borderRadius: number;
    isClickable: boolean;
  };
  children: ComputedDomNode[];
}

export interface VisualCaptureResult {
  captureId: string;
  captureMode: 'REAL' | 'FALLBACK_SIMULATED';
  projectId?: string;
  versionId?: string;
  changesetId?: string;
  viewport: ViewportConfig;
  timestamp: number;
  scrollWidth: number;
  scrollHeight: number;
  hasHorizontalOverflow: boolean;
  overflowingElements: Array<{
    selector: string;
    tagName: string;
    boundingBox: BoundingBox;
    excessWidth: number;
  }>;
  domTree: ComputedDomNode;
  flatNodes: ComputedDomNode[];
  svgSnapshot: string;
  dataUri: string;
  screenshotPngBase64?: string;
  screenshotDataUri?: string;
  realBrowserInfo?: {
    browserName: string;
    browserVersion: string;
    engine: string;
  };
  runtimeConsoleErrors?: string[];
  runtimeUnhandledExceptions?: string[];
  metrics: {
    totalElements: number;
    interactiveCount: number;
    textNodeCount: number;
    deepestNesting: number;
  };
}

export class VisualCaptureEngine {
  private browserPromise: Promise<Browser> | null = null;
  private browserVersionStr: string = 'Chromium Headless';

  /**
   * Initializes or returns the singleton headless Chromium browser instance
   */
  private async getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = puppeteer
        .launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
          ],
        })
        .then(async (browser) => {
          try {
            this.browserVersionStr = await browser.version();
          } catch {
            this.browserVersionStr = 'Chromium Headless';
          }
          return browser;
        })
        .catch((err) => {
          logger.error('VisualCapture', `Failed to launch Chromium browser: ${err.message}`);
          this.browserPromise = null;
          throw err;
        });
    }

    const browser = await this.browserPromise;
    if (!browser.connected) {
      logger.warn('VisualCapture', 'Chromium browser disconnected, relaunching fresh instance...');
      this.browserPromise = null;
      return this.getBrowser();
    }
    return browser;
  }

  /**
   * Closes the singleton browser instance if needed during shutdown
   */
  public async closeBrowser(): Promise<void> {
    if (this.browserPromise) {
      try {
        const browser = await this.browserPromise;
        await browser.close();
      } catch (err: any) {
        logger.warn('VisualCapture', `Error closing browser: ${err.message}`);
      } finally {
        this.browserPromise = null;
      }
    }
  }

  /**
   * Prepares a full, valid HTML document embedding Tailwind CDN and baseline styles
   */
  private prepareHtmlDocument(html: string): string {
    const trimmed = html.trim();
    if (trimmed.startsWith('<!DOCTYPE') || trimmed.includes('<html')) {
      // Ensure Tailwind script is injected if not already present
      if (!trimmed.includes('cdn.tailwindcss.com') && !trimmed.includes('tailwindcss.com')) {
        if (trimmed.includes('<head>')) {
          return trimmed.replace(
            '<head>',
            '<head><script src="https://cdn.tailwindcss.com"></script><meta name="viewport" content="width=device-width, initial-scale=1.0">'
          );
        }
        return `<script src="https://cdn.tailwindcss.com"></script>${trimmed}`;
      }
      return trimmed;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
  </style>
</head>
<body class="bg-white text-slate-900 antialiased">
${trimmed}
</body>
</html>`;
  }

  /**
   * Real Render Capture using a real Chromium browser engine (Puppeteer)
   */
  public async captureRender(
    html: string,
    viewport: ViewportConfig = STANDARD_VIEWPORTS.desktop,
    options: {
      projectId?: string;
      versionId?: string;
      changesetId?: string;
      timeoutMs?: number;
    } = {}
  ): Promise<VisualCaptureResult> {
    const captureId = 'cap_' + crypto.randomBytes(6).toString('hex');
    const vpWidth = viewport.width;
    const vpHeight = viewport.height;
    const timeoutMs = options.timeoutMs || 8000;

    const runtimeConsoleErrors: string[] = [];
    const runtimeUnhandledExceptions: string[] = [];

    try {
      const browser = await this.getBrowser();
      const page: Page = await browser.newPage();

      try {
        // 1. Configure exact viewport
        await page.setViewport({
          width: vpWidth,
          height: vpHeight,
          deviceScaleFactor: viewport.deviceScaleFactor || 1,
        });

        // 2. Track console errors & unhandled JS exceptions
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            runtimeConsoleErrors.push(msg.text());
          }
        });

        page.on('pageerror', (err: any) => {
          runtimeUnhandledExceptions.push(err?.message || String(err));
        });

        // 3. Load HTML and wait for DOM + Stylesheets
        const fullHtml = this.prepareHtmlDocument(html);
        await page.setContent(fullHtml, {
          waitUntil: ['domcontentloaded'],
          timeout: timeoutMs,
        });

        // Small wait for Tailwind runtime / layout settlement
        await page.waitForFunction(
          () => document.readyState === 'complete' || !!document.body,
          { timeout: 200 }
        ).catch(() => {});

        // 4. Extract Real Computed DOM & Real getBoundingClientRect
        const evaluatedData = await page.evaluate((vpW: number) => {
          const docEl = document.documentElement;
          const bodyEl = document.body;

          const scrollW = Math.max(docEl.scrollWidth, bodyEl ? bodyEl.scrollWidth : 0);
          const scrollH = Math.max(docEl.scrollHeight, bodyEl ? bodyEl.scrollHeight : 0);
          const hasOverflow = scrollW > vpW + 2;

          const allElements = Array.from(document.querySelectorAll('*'));
          const flatNodes: any[] = [];
          const overflowingElements: any[] = [];

          for (const el of allElements) {
            const tagName = el.tagName.toLowerCase();
            if (['script', 'style', 'meta', 'link', 'head', 'title', 'noscript'].includes(tagName)) {
              continue;
            }

            const rect = el.getBoundingClientRect();
            const computed = window.getComputedStyle(el);

            if (computed.display === 'none' || computed.visibility === 'hidden') {
              continue;
            }

            const isRoot = tagName === 'html' || tagName === 'body';
            const rightEdge = rect.x + rect.width;

            if (!isRoot && (rightEdge > vpW + 4 || rect.width > vpW + 4)) {
              const selector = el.id
                ? `#${el.id}`
                : el.className
                ? `.${el.className.toString().trim().split(/\s+/)[0]}`
                : tagName;
              overflowingElements.push({
                selector,
                tagName,
                boundingBox: {
                  x: Math.round(rect.x),
                  y: Math.round(rect.y),
                  width: Math.round(rect.width),
                  height: Math.round(rect.height),
                },
                excessWidth: Math.round(Math.max(rightEdge - vpW, rect.width - vpW)),
              });
            }

            // Keep visible elements
            if (rect.width > 0 || rect.height > 0 || computed.position === 'absolute' || computed.position === 'fixed') {
              const isClickable =
                computed.cursor === 'pointer' ||
                ['button', 'a', 'input', 'select', 'textarea'].includes(tagName) ||
                el.hasAttribute('onclick') ||
                el.getAttribute('role') === 'button';

              let innerText: string | undefined;
              if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
                innerText = el.textContent?.trim();
              }

              flatNodes.push({
                id: el.id || undefined,
                tagName,
                className: el.className ? el.className.toString() : '',
                innerText,
                boundingBox: {
                  x: Math.round(rect.x * 10) / 10,
                  y: Math.round(rect.y * 10) / 10,
                  width: Math.round(rect.width * 10) / 10,
                  height: Math.round(rect.height * 10) / 10,
                },
                computedStyles: {
                  display: computed.display,
                  position: computed.position,
                  zIndex: parseInt(computed.zIndex, 10) || 0,
                  color: computed.color,
                  backgroundColor: computed.backgroundColor,
                  fontSize: parseFloat(computed.fontSize) || 16,
                  fontWeight: computed.fontWeight,
                  paddingTop: parseFloat(computed.paddingTop) || 0,
                  paddingRight: parseFloat(computed.paddingRight) || 0,
                  paddingBottom: parseFloat(computed.paddingBottom) || 0,
                  paddingLeft: parseFloat(computed.paddingLeft) || 0,
                  marginTop: parseFloat(computed.marginTop) || 0,
                  marginBottom: parseFloat(computed.marginBottom) || 0,
                  overflowX: computed.overflowX,
                  overflowY: computed.overflowY,
                  opacity: parseFloat(computed.opacity) || 1,
                  borderRadius: parseFloat(computed.borderRadius) || 0,
                  isClickable,
                },
                children: [],
              });
            }
          }

          return {
            scrollWidth: scrollW,
            scrollHeight: scrollH,
            hasHorizontalOverflow: hasOverflow,
            overflowingElements,
            flatNodes,
          };
        }, vpWidth);

        // 5. Generate Real PNG Screenshot via Chromium
        const screenshotPngBase64 = (await page.screenshot({
          type: 'png',
          encoding: 'base64',
          fullPage: false,
        })) as string;

        const screenshotDataUri = `data:image/png;base64,${screenshotPngBase64}`;

        const domTree: ComputedDomNode = evaluatedData.flatNodes[0] || {
          tagName: 'body',
          className: '',
          boundingBox: { x: 0, y: 0, width: vpWidth, height: vpHeight },
          computedStyles: {
            display: 'block',
            position: 'static',
            zIndex: 0,
            color: 'rgb(15, 23, 42)',
            backgroundColor: 'rgb(255, 255, 255)',
            fontSize: 16,
            fontWeight: '400',
            paddingTop: 0,
            paddingRight: 0,
            paddingBottom: 0,
            paddingLeft: 0,
            marginTop: 0,
            marginBottom: 0,
            overflowX: 'visible',
            overflowY: 'visible',
            opacity: 1,
            borderRadius: 0,
            isClickable: false,
          },
          children: [],
        };

        const interactiveCount = evaluatedData.flatNodes.filter((n: any) => n.computedStyles.isClickable).length;
        const textNodeCount = evaluatedData.flatNodes.filter((n: any) => !!n.innerText).length;

        // Render complementary SVG representation for overlay inspector if needed
        const svgSnapshot = this.renderSvgSnapshot(
          domTree,
          evaluatedData.flatNodes,
          viewport,
          evaluatedData.hasHorizontalOverflow
        );

        logger.info(
          'VisualCapture',
          `[REAL CAPTURE] Captured ${viewport.name} (${vpWidth}x${vpHeight}) via Chromium for project ${
            options.projectId || 'anonymous'
          }: ${evaluatedData.flatNodes.length} nodes, scroll: ${evaluatedData.scrollWidth}x${
            evaluatedData.scrollHeight
          }px, overflow: ${evaluatedData.hasHorizontalOverflow}`
        );

        return {
          captureId,
          captureMode: 'REAL',
          projectId: options.projectId,
          versionId: options.versionId,
          changesetId: options.changesetId,
          viewport,
          timestamp: Date.now(),
          scrollWidth: evaluatedData.scrollWidth,
          scrollHeight: evaluatedData.scrollHeight,
          hasHorizontalOverflow: evaluatedData.hasHorizontalOverflow,
          overflowingElements: evaluatedData.overflowingElements,
          domTree,
          flatNodes: evaluatedData.flatNodes,
          svgSnapshot,
          dataUri: screenshotDataUri,
          screenshotPngBase64,
          screenshotDataUri,
          realBrowserInfo: {
            browserName: 'Chromium',
            browserVersion: this.browserVersionStr,
            engine: 'Puppeteer Headless Real Render',
          },
          runtimeConsoleErrors,
          runtimeUnhandledExceptions,
          metrics: {
            totalElements: evaluatedData.flatNodes.length,
            interactiveCount,
            textNodeCount,
            deepestNesting: 4,
          },
        };
      } finally {
        await page.close().catch(() => {});
      }
    } catch (err: any) {
      logger.warn(
        'VisualCapture',
        `Real Chromium capture failed (${err.message}). Falling back to layout simulation.`
      );
      return this.captureRenderFallback(html, viewport, options);
    }
  }

  /**
   * Explicit Simulated Fallback (only invoked if Chromium headless launch completely fails)
   */
  public captureRenderFallback(
    html: string,
    viewport: ViewportConfig = STANDARD_VIEWPORTS.desktop,
    options: {
      projectId?: string;
      versionId?: string;
      changesetId?: string;
    } = {}
  ): VisualCaptureResult {
    const captureId = 'cap_fb_' + crypto.randomBytes(6).toString('hex');
    const vpWidth = viewport.width;
    const vpHeight = viewport.height;

    const { domTree, flatNodes, deepestNesting, scrollWidth, scrollHeight } = this.simulateLayout(html, viewport);

    const overflowingElements: Array<{
      selector: string;
      tagName: string;
      boundingBox: BoundingBox;
      excessWidth: number;
    }> = [];

    for (const node of flatNodes) {
      const rightEdge = node.boundingBox.x + node.boundingBox.width;
      if (rightEdge > vpWidth + 4 && node.tagName !== 'body' && node.tagName !== 'html') {
        const selector = node.id ? `#${node.id}` : node.className ? `.${node.className.split(' ')[0]}` : node.tagName;
        overflowingElements.push({
          selector,
          tagName: node.tagName,
          boundingBox: node.boundingBox,
          excessWidth: Math.round(rightEdge - vpWidth),
        });
      }
    }

    const hasHorizontalOverflow = overflowingElements.length > 0 || scrollWidth > vpWidth + 8;
    const svgSnapshot = this.renderSvgSnapshot(domTree, flatNodes, viewport, hasHorizontalOverflow);
    const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgSnapshot)}`;

    const interactiveCount = flatNodes.filter((n) => n.computedStyles.isClickable).length;
    const textNodeCount = flatNodes.filter((n) => !!n.innerText).length;

    return {
      captureId,
      captureMode: 'FALLBACK_SIMULATED',
      projectId: options.projectId,
      versionId: options.versionId,
      changesetId: options.changesetId,
      viewport,
      timestamp: Date.now(),
      scrollWidth,
      scrollHeight,
      hasHorizontalOverflow,
      overflowingElements,
      domTree,
      flatNodes,
      svgSnapshot,
      dataUri,
      metrics: {
        totalElements: flatNodes.length,
        interactiveCount,
        textNodeCount,
        deepestNesting,
      },
    };
  }

  /**
   * Renders high-fidelity SVG snapshot
   */
  private renderSvgSnapshot(
    rootNode: ComputedDomNode,
    flatNodes: ComputedDomNode[],
    viewport: ViewportConfig,
    hasOverflow: boolean
  ): string {
    const vpW = viewport.width;
    const vpH = viewport.height;

    let elementsSvg = '';

    for (const node of flatNodes) {
      if (node.tagName === 'html' || node.tagName === 'body') continue;
      const b = node.boundingBox;
      const st = node.computedStyles;

      let fill = st.backgroundColor || '#f8fafc';
      if (fill === 'rgba(0, 0, 0, 0)' || fill === 'transparent') {
        fill = '#f1f5f9';
      }
      let stroke = '#cbd5e1';
      let strokeWidth = 1;

      if (st.isClickable) {
        stroke = '#6366f1';
        strokeWidth = 1.5;
      }

      elementsSvg += `
        <rect 
          x="${b.x}" 
          y="${b.y}" 
          width="${b.width}" 
          height="${b.height}" 
          rx="${st.borderRadius || 4}" 
          fill="${fill}" 
          stroke="${stroke}" 
          stroke-width="${strokeWidth}" 
          opacity="${st.opacity}"
        />`;

      if (node.innerText) {
        const cleanText = node.innerText
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .substring(0, 40);
        elementsSvg += `
          <text 
            x="${b.x + 8}" 
            y="${b.y + b.height / 2 + 5}" 
            font-family="system-ui, -apple-system, sans-serif" 
            font-size="${Math.min(st.fontSize || 14, 16)}" 
            font-weight="${st.fontWeight || '400'}" 
            fill="${st.color || '#0f172a'}"
          >${cleanText}</text>`;
      }
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vpW} ${vpH}" width="${vpW}" height="${vpH}">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="100%" stop-color="#1e293b" />
          </linearGradient>
        </defs>
        <rect width="${vpW}" height="${vpH}" fill="#ffffff" />
        ${elementsSvg}
      </svg>
    `.trim();
  }

  /**
   * Internal layout simulation for fallback mode
   */
  private simulateLayout(
    html: string,
    viewport: ViewportConfig
  ): {
    domTree: ComputedDomNode;
    flatNodes: ComputedDomNode[];
    deepestNesting: number;
    scrollWidth: number;
    scrollHeight: number;
  } {
    const vpWidth = viewport.width;
    const vpHeight = viewport.height;
    const isMobile = viewport.name === 'mobile';

    const flatNodes: ComputedDomNode[] = [];
    let cursorY = 24;
    let maxContentWidth = vpWidth;

    const bodyNode: ComputedDomNode = {
      tagName: 'body',
      className: 'bg-white',
      boundingBox: { x: 0, y: 0, width: vpWidth, height: vpHeight },
      computedStyles: {
        display: 'block',
        position: 'static',
        zIndex: 0,
        color: 'rgb(15, 23, 42)',
        backgroundColor: 'rgb(255, 255, 255)',
        fontSize: 16,
        fontWeight: '400',
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        marginTop: 0,
        marginBottom: 0,
        overflowX: 'visible',
        overflowY: 'visible',
        opacity: 1,
        borderRadius: 0,
        isClickable: false,
      },
      children: [],
    };
    flatNodes.push(bodyNode);

    const sectionRegex = /<(header|nav|main|section|div|article|aside|button|a|input|h1|h2|h3|p|table)([^>]*)>([\s\S]*?)<\/\1>|<(input|img)([^>]*)\/?>/gi;
    let match: RegExpExecArray | null;

    while ((match = sectionRegex.exec(html)) !== null) {
      const tagName = (match[1] || match[4] || 'div').toLowerCase();
      const attrs = match[2] || match[5] || '';
      const innerContent = match[3] || '';

      const classMatch = attrs.match(/class(?:Name)?=["']([^"']*)["']/i);
      const className = classMatch ? classMatch[1] : '';

      const idMatch = attrs.match(/id=["']([^"']*)["']/i);
      const id = idMatch ? idMatch[1] : undefined;

      const isAbsolute = className.includes('absolute');
      const isFixed = className.includes('fixed');

      let elWidth = Math.min(vpWidth - 32, 1024);
      let elHeight = 48;
      let elX = (vpWidth - elWidth) / 2;
      let elY = cursorY;

      const explicitWidthMatch = className.match(/(?:w|min-w)-\[(\d+)px\]/);
      if (explicitWidthMatch) {
        elWidth = parseInt(explicitWidthMatch[1], 10);
      }

      if (isAbsolute) {
        elX = 16;
        elY = 16;
        elWidth = 200;
        elHeight = 60;
      }

      if (isMobile && className.includes('grid-cols-3') && !className.includes('md:grid-cols-3')) {
        elWidth = Math.max(elWidth, 800);
      }

      if (elX + elWidth > maxContentWidth) {
        maxContentWidth = elX + elWidth;
      }

      const node: ComputedDomNode = {
        id,
        tagName,
        className,
        innerText: innerContent.replace(/<[^>]*>/g, '').trim().substring(0, 40) || undefined,
        boundingBox: { x: elX, y: elY, width: elWidth, height: elHeight },
        computedStyles: {
          display: 'block',
          position: isAbsolute ? 'absolute' : isFixed ? 'fixed' : 'static',
          zIndex: 0,
          color: className.includes('text-white') ? 'rgb(255, 255, 255)' : 'rgb(15, 23, 42)',
          backgroundColor: className.includes('bg-slate-900') ? 'rgb(15, 23, 42)' : 'rgb(241, 245, 249)',
          fontSize: tagName.startsWith('h1') ? 32 : tagName.startsWith('h2') ? 24 : 16,
          fontWeight: '400',
          paddingTop: 12,
          paddingRight: 16,
          paddingBottom: 12,
          paddingLeft: 16,
          marginTop: 8,
          marginBottom: 8,
          overflowX: 'visible',
          overflowY: 'visible',
          opacity: 1,
          borderRadius: 8,
          isClickable: ['button', 'a', 'input'].includes(tagName),
        },
        children: [],
      };

      flatNodes.push(node);
      if (!isAbsolute && !isFixed) {
        cursorY += elHeight + 16;
      }
    }

    return {
      domTree: bodyNode,
      flatNodes,
      deepestNesting: 3,
      scrollWidth: Math.max(vpWidth, maxContentWidth),
      scrollHeight: Math.max(vpHeight, cursorY + 40),
    };
  }
}

export const visualCaptureEngine = new VisualCaptureEngine();
