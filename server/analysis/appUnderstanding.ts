import crypto from 'crypto';
import { logger } from '../logger';

export interface ComponentMetadata {
  name: string;
  type: 'ui' | 'container' | 'layout' | 'form' | 'chart';
  props?: string[];
  dependencies: string[];
}

export interface ApiEndpointMetadata {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  isProtected: boolean;
  description?: string;
}

export interface DataModelMetadata {
  name: string;
  fields: string[];
  persistence: 'local_storage' | 'in_memory' | 'database' | 'none';
}

export interface AppUnderstandingResult {
  versionHash: string;
  framework: string;
  styling: string;
  iconLibrary: string;
  files: Array<{ name: string; type: string; lines: number }>;
  components: ComponentMetadata[];
  routes: string[];
  apiEndpoints: ApiEndpointMetadata[];
  dataModels: DataModelMetadata[];
  stateManagement: 'local_state' | 'context' | 'local_storage' | 'zustand' | 'none';
  authType: 'none' | 'token' | 'session' | 'oauth';
  externalIntegrations: string[];
  envVarsUsed: string[];
  analyzedAt: number;
}

export class AppUnderstandingService {
  private cache: Map<string, AppUnderstandingResult> = new Map();

  /**
   * Analyzes an application structure and its source code incrementally
   */
  public analyzeProject(files: Array<{ name: string; type?: string; content?: string }>, rawHtml?: string): AppUnderstandingResult {
    const combinedContent = files.map((f) => f.content || '').join('\n') + '\n' + (rawHtml || '');
    const versionHash = crypto.createHash('sha256').update(combinedContent).digest('hex').substring(0, 16);

    if (this.cache.has(versionHash)) {
      return this.cache.get(versionHash)!;
    }

    const htmlContent = rawHtml || files.find((f) => f.name.endsWith('.html'))?.content || '';
    const jsContent = files.filter((f) => f.name.endsWith('.js') || f.name.endsWith('.ts')).map((f) => f.content || '').join('\n');

    // 1. Framework & Libraries detection
    const isTailwind = htmlContent.includes('cdn.tailwindcss.com') || combinedContent.includes('tailwindcss');
    const isLucide = htmlContent.includes('lucide') || combinedContent.includes('lucide');
    const isChartJs = combinedContent.includes('chart.js') || combinedContent.includes('Chart(');

    // 2. Components discovery (HTML sections with ID or JS component functions)
    const components: ComponentMetadata[] = [];
    const idRegex = /id="([a-zA-Z0-9_-]+)"/g;
    let match;
    while ((match = idRegex.exec(htmlContent)) !== null) {
      const id = match[1];
      if (id !== 'root' && id !== 'vibecode-preview-bridge') {
        components.push({
          name: this.formatComponentName(id),
          type: id.includes('header') || id.includes('nav') ? 'layout' : id.includes('form') ? 'form' : id.includes('chart') ? 'chart' : 'ui',
          dependencies: [],
        });
      }
    }

    // 3. Routes / Views
    const routes: string[] = [];
    if (htmlContent.includes('#/')) {
      const routeRegex = /href="#\/([a-zA-Z0-9_-]+)"/g;
      while ((match = routeRegex.exec(htmlContent)) !== null) {
        routes.push(`/${match[1]}`);
      }
    } else {
      routes.push('/');
    }

    // 4. API Endpoints
    const apiEndpoints: ApiEndpointMetadata[] = [];
    const fetchRegex = /fetch\(['"`](\/api\/[a-zA-Z0-9_\-\/]+)['"`]/g;
    while ((match = fetchRegex.exec(jsContent + htmlContent)) !== null) {
      apiEndpoints.push({
        path: match[1],
        method: 'POST',
        isProtected: false,
      });
    }

    // 5. Data Models & State
    const dataModels: DataModelMetadata[] = [];
    const hasLocalStorage = combinedContent.includes('localStorage');
    if (hasLocalStorage) {
      const lsRegex = /localStorage\.(?:getItem|setItem)\(['"`]([a-zA-Z0-9_-]+)['"`]/g;
      while ((match = lsRegex.exec(combinedContent)) !== null) {
        dataModels.push({
          name: match[1],
          fields: ['json_payload'],
          persistence: 'local_storage',
        });
      }
    }

    // 6. External Integrations
    const externalIntegrations: string[] = [];
    if (isTailwind) externalIntegrations.push('Tailwind CSS CDN');
    if (isLucide) externalIntegrations.push('Lucide Icons');
    if (isChartJs) externalIntegrations.push('Chart.js');
    if (combinedContent.includes('stripe')) externalIntegrations.push('Stripe Payments');

    const result: AppUnderstandingResult = {
      versionHash,
      framework: 'HTML5 Vanilla + Alpine/Modern JS',
      styling: isTailwind ? 'Tailwind CSS v3 (Utility First)' : 'Custom CSS',
      iconLibrary: isLucide ? 'Lucide Icons' : 'Native SVG/Unicode',
      files: files.map((f) => ({
        name: f.name,
        type: f.type || 'text',
        lines: (f.content || '').split('\n').length,
      })),
      components: components.slice(0, 15),
      routes: Array.from(new Set(routes)),
      apiEndpoints,
      dataModels,
      stateManagement: hasLocalStorage ? 'local_storage' : 'local_state',
      authType: combinedContent.includes('auth') || combinedContent.includes('login') ? 'token' : 'none',
      externalIntegrations,
      envVarsUsed: [],
      analyzedAt: Date.now(),
    };

    this.cache.set(versionHash, result);
    return result;
  }

  private formatComponentName(id: string): string {
    return id
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
  }
}

export const appUnderstandingService = new AppUnderstandingService();
