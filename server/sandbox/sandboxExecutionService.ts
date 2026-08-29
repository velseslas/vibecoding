import { logger } from '../logger';

export interface SandboxOptions {
  timeoutMs?: number;
  maxHtmlBytes?: number;
  allowExternalCdn?: boolean;
}

export class SandboxExecutionService {
  private defaultMaxBytes = 5 * 1024 * 1024; // 5 MB max

  public prepareSafeIframeHtml(rawHtml: string, options: SandboxOptions = {}): { safeHtml: string; sizeBytes: number; warnings: string[] } {
    const warnings: string[] = [];
    let html = rawHtml || '<!DOCTYPE html><html><body><div id="root">App</div></body></html>';

    const sizeBytes = Buffer.byteLength(html, 'utf-8');
    if (sizeBytes > (options.maxHtmlBytes || this.defaultMaxBytes)) {
      warnings.push(`HTML payload size (${Math.round(sizeBytes / 1024)} KB) exceeds optimal threshold`);
    }

    // Ensure strict client sandbox security header & meta tag
    if (!html.includes('<meta http-equiv="Content-Security-Policy"')) {
      const cspMeta = `\n  <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https://cdn.tailwindcss.com https://unpkg.com https://fonts.googleapis.com https://fonts.gstatic.com https://images.unsplash.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com;">`;
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${cspMeta}`);
      } else {
        html = `<head>${cspMeta}</head>\n${html}`;
      }
    }

    // Prevent malicious iframe breakout attempts
    if (html.includes('top.location') || html.includes('parent.location')) {
      html = html.replace(/top\.location/g, '/* blocked */ null');
      html = html.replace(/parent\.location/g, '/* blocked */ null');
      warnings.push('Tentatives de redirection de la fenêtre parente neutralisées');
    }

    return {
      safeHtml: html,
      sizeBytes,
      warnings,
    };
  }

  public getHealth() {
    return {
      status: 'active',
      isolationLevel: 'iframe-csp-sandbox',
      maxPayloadMb: 5,
    };
  }
}

export const sandboxService = new SandboxExecutionService();
