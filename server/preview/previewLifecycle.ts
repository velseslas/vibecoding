import crypto from 'crypto';
import { dbAdapter } from '../db/database';
import { DbPreviewSession, DbPreviewError, PreviewLifecycleStatus } from '../db/schema';
import { logger } from '../logger';

export interface CreatePreviewOptions {
  projectId: string;
  versionId?: string;
  userId?: string;
  htmlContent: string;
}

export interface NormalizedErrorForAI {
  category: 'syntax' | 'runtime' | 'missing_dependency' | 'network' | 'dom';
  errorMessage: string;
  sourceFile: string;
  lineNumber?: number;
  columnNumber?: number;
  suggestedFix: string;
  severity: 'warning' | 'error' | 'fatal';
}

export class PreviewLifecycleService {
  private activeSessions: Map<string, DbPreviewSession> = new Map();

  /**
   * Initializes a traceable Preview Session with lifecycle state CREATED -> BUILDING -> READY
   */
  public createPreviewSession(options: CreatePreviewOptions): {
    previewId: string;
    session: DbPreviewSession;
    safeHtml: string;
  } {
    const previewId = 'prev_' + crypto.randomBytes(6).toString('hex');
    const now = Date.now();

    const session: DbPreviewSession = {
      id: previewId,
      projectId: options.projectId,
      versionId: options.versionId,
      userId: options.userId || 'usr_admin_001',
      status: 'CREATED',
      createdAt: now,
      updatedAt: now,
      durationMs: 0,
      errors: [],
      logs: [{ level: 'info', message: 'Preview session initialized', timestamp: now }],
      metrics: {
        loadTimeMs: 0,
        memoryMb: 0,
        domNodes: 0,
      },
    };

    // Transition: BUILDING
    this.transitionState(session, 'BUILDING', 'Preparing isolated DOM and injecting runtime bridge');

    // Build isolated HTML with CSP and Bridge
    const safeHtml = this.buildIsolatedHtml(options.htmlContent, previewId);

    // Transition: READY
    this.transitionState(session, 'READY', 'Isolated Preview bundle ready for runtime mounting');

    this.activeSessions.set(previewId, session);
    dbAdapter.savePreviewSession(session);

    return { previewId, session, safeHtml };
  }

  /**
   * Transition state machine with audit logs
   */
  public transitionState(session: DbPreviewSession, newStatus: PreviewLifecycleStatus, logMessage?: string): void {
    const validTransitions: Record<PreviewLifecycleStatus, PreviewLifecycleStatus[]> = {
      CREATED: ['BUILDING', 'ERROR', 'STOPPED'],
      BUILDING: ['READY', 'ERROR', 'STOPPED'],
      READY: ['RUNNING', 'ERROR', 'STOPPED', 'EXPIRED'],
      RUNNING: ['ERROR', 'CRASHED', 'STOPPED', 'EXPIRED'],
      ERROR: ['BUILDING', 'STOPPED', 'EXPIRED'],
      CRASHED: ['BUILDING', 'STOPPED', 'EXPIRED'],
      STOPPED: ['BUILDING', 'EXPIRED'],
      EXPIRED: [],
    };

    const allowed = validTransitions[session.status] || [];
    if (!allowed.includes(newStatus)) {
      logger.warn('PreviewLifecycle', `Invalid state transition from ${session.status} to ${newStatus} on preview ${session.id}`);
    }

    session.status = newStatus;
    session.updatedAt = Date.now();
    session.durationMs = session.updatedAt - session.createdAt;

    if (logMessage) {
      session.logs.push({ level: 'info', message: `[${newStatus}] ${logMessage}`, timestamp: Date.now() });
    }

    this.activeSessions.set(session.id, session);
    dbAdapter.savePreviewSession(session);
  }

  /**
   * Captures runtime errors from browser postMessage telemetry bridge
   */
  public recordRuntimeError(
    previewId: string,
    error: {
      type: 'build' | 'runtime' | 'network' | 'dependency' | 'console';
      message: string;
      stack?: string;
      file?: string;
      line?: number;
      column?: number;
    }
  ): { session?: DbPreviewSession; normalized: NormalizedErrorForAI } {
    let session = this.activeSessions.get(previewId) || dbAdapter.getPreviewSession(previewId);

    const errorRecord: DbPreviewError = {
      ...error,
      timestamp: Date.now(),
    };

    if (session) {
      session.errors.push(errorRecord);
      this.transitionState(session, 'ERROR', `Runtime Error: ${error.message}`);
    }

    const normalized = this.normalizeErrorForAI(errorRecord);
    logger.warn('PreviewLifecycle', `Captured runtime error on preview ${previewId}`, normalized);

    return { session, normalized };
  }

  /**
   * Normalizes arbitrary browser/compiler errors into structured AI-actionable diagnoses
   */
  public normalizeErrorForAI(err: DbPreviewError): NormalizedErrorForAI {
    const msg = err.message || '';
    
    // 1. Missing CDN / Lucide / Tailwind dependency
    if (msg.includes('lucide is not defined') || msg.includes('createIcons is not a function')) {
      return {
        category: 'missing_dependency',
        errorMessage: 'Bibliothèque d\'icônes Lucide non initialisée ou script CDN manquant',
        sourceFile: err.file || 'index.html',
        lineNumber: err.line,
        suggestedFix: 'Ajouter <script src="https://unpkg.com/lucide@latest"></script> et appeler lucide.createIcons() au chargement du DOM.',
        severity: 'error',
      };
    }

    // 2. Syntax errors
    if (msg.includes('Unexpected token') || msg.includes('SyntaxError') || msg.includes('Uncaught SyntaxError')) {
      return {
        category: 'syntax',
        errorMessage: `Erreur de syntaxe JavaScript dans le script inline: ${msg}`,
        sourceFile: err.file || 'index.html',
        lineNumber: err.line,
        columnNumber: err.column,
        suggestedFix: 'Vérifier la fermeture des accolades, parenthèses ou guillemets non échappés.',
        severity: 'fatal',
      };
    }

    // 3. Null reference / DOM element missing
    if (msg.includes('Cannot read properties of null') || msg.includes('null is not an object')) {
      return {
        category: 'dom',
        errorMessage: `Accès à un élément DOM inexistant: ${msg}`,
        sourceFile: err.file || 'index.html',
        lineNumber: err.line,
        suggestedFix: 'S\'assurer que document.getElementById() ou querySelector() cible un élément présent dans le HTML avant d\'attacher un écouteur d\'événement.',
        severity: 'error',
      };
    }

    // 4. Network / CORS failure
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('CORS')) {
      return {
        category: 'network',
        errorMessage: `Échec de requête réseau ou blocage CORS: ${msg}`,
        sourceFile: err.file || 'app.js',
        suggestedFix: 'Utiliser des données simulées locales ou un mock LocalStorage plutôt qu\'une API externe bloquée par la CSP.',
        severity: 'warning',
      };
    }

    // Default runtime category
    return {
      category: 'runtime',
      errorMessage: msg,
      sourceFile: err.file || 'index.html',
      lineNumber: err.line,
      columnNumber: err.column,
      suggestedFix: 'Analyser la pile d\'exécution et sécuriser les appels conditionnels.',
      severity: 'error',
    };
  }

  /**
   * Injects runtime error telemetry postMessage bridge + CSP into raw HTML
   */
  private buildIsolatedHtml(rawHtml: string, previewId: string): string {
    let html = rawHtml || '<!DOCTYPE html><html><body><div id="root">App</div></body></html>';

    // 1. Strict Content Security Policy
    const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https://cdn.tailwindcss.com https://unpkg.com https://cdn.jsdelivr.net https://fonts.googleapis.com https://fonts.gstatic.com https://images.unsplash.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com;">`;

    // 2. Client Telemetry & Anti-Hijack Bridge
    const bridgeScript = `
<script id="vibecode-preview-bridge">
(function() {
  const PREVIEW_ID = "${previewId}";
  
  // Neutralize parent breakout attempts
  try {
    Object.defineProperty(window, 'top', { get: () => window });
    Object.defineProperty(window, 'parent', { get: () => window });
  } catch(e) {}

  // Global Error Handler
  window.addEventListener('error', function(event) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'VIBECODE_PREVIEW_ERROR',
        previewId: PREVIEW_ID,
        error: {
          type: 'runtime',
          message: event.message || 'Unknown runtime error',
          file: event.filename || 'inline',
          line: event.lineno,
          column: event.colno,
          stack: event.error ? event.error.stack : null
        }
      }, '*');
    }
  });

  // Unhandled Promise Rejection Handler
  window.addEventListener('unhandledrejection', function(event) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'VIBECODE_PREVIEW_ERROR',
        previewId: PREVIEW_ID,
        error: {
          type: 'runtime',
          message: 'Unhandled Promise Rejection: ' + (event.reason ? (event.reason.message || event.reason) : 'unknown'),
          stack: event.reason && event.reason.stack ? event.reason.stack : null
        }
      }, '*');
    }
  });

  // Performance Telemetry on DOM ready
  window.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'VIBECODE_PREVIEW_METRICS',
          previewId: PREVIEW_ID,
          metrics: {
            loadTimeMs: Math.round(performance.now()),
            domNodes: document.querySelectorAll('*').length
          }
        }, '*');
      }
    }, 200);
  });
})();
</script>
`;

    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>\n  ${cspMeta}\n  ${bridgeScript}`);
    } else {
      html = `<!DOCTYPE html>\n<html>\n<head>\n  ${cspMeta}\n  ${bridgeScript}\n</head>\n<body>${html}</body>\n</html>`;
    }

    return html;
  }

  public getSession(previewId: string): DbPreviewSession | undefined {
    return this.activeSessions.get(previewId) || dbAdapter.getPreviewSession(previewId);
  }
}

export const previewLifecycleService = new PreviewLifecycleService();
