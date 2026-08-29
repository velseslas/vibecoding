import crypto from 'crypto';
import { NormalizedErrorForAI } from '../preview/previewLifecycle';
import { IncidentCategory } from './bugIntelligenceTypes';

export interface FingerprintResult {
  fingerprint: string;
  normalizedPattern: string;
  category: IncidentCategory;
  isRecurring: boolean;
  recurrenceCount: number;
}

export class ErrorFingerprintService {
  private fingerprintCounts: Map<string, number> = new Map();

  /**
   * Generates a stable, semantic fingerprint from an arbitrary error message and category
   */
  public generateFingerprint(
    error: NormalizedErrorForAI | { message: string; category?: string; file?: string }
  ): FingerprintResult {
    const rawMsg = (error as any).errorMessage || (error as any).message || '';
    const rawCat = (error as any).category || 'runtime';
    const sourceFile = (error as any).sourceFile || (error as any).file || 'index.html';

    const normalized = this.normalizeErrorMessage(rawMsg, rawCat);
    const category = this.mapCategory(rawCat, normalized);

    // Build deterministic logical signature
    const signature = `${category}::${normalized}`;
    const hash = crypto.createHash('sha256').update(signature).digest('hex').substring(0, 16);
    const fingerprint = `fp_${category.toLowerCase()}_${hash}`;

    const currentCount = (this.fingerprintCounts.get(fingerprint) || 0) + 1;
    this.fingerprintCounts.set(fingerprint, currentCount);

    return {
      fingerprint,
      normalizedPattern: normalized,
      category,
      isRecurring: currentCount > 1,
      recurrenceCount: currentCount,
    };
  }

  /**
   * Cleans variable artifacts (line numbers, UUIDs, volatile timestamps, file paths)
   */
  public normalizeErrorMessage(rawMessage: string, category: string): string {
    let msg = rawMessage.trim().toLowerCase();

    // 1. Strip dynamic IDs (e.g., req_12345, prev_abc, dec_xyz, uuid)
    msg = msg.replace(/\b(req|prev|conv|dec|ver|usr|plan)_[a-f0-9]{4,16}\b/gi, '<ID>');
    msg = msg.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>');

    // 2. Strip line & column numbers (e.g., :12:34, line 42, col 10)
    msg = msg.replace(/:\d+:\d+/g, ':<LINE>:<COL>');
    msg = msg.replace(/\b(line|ln)\s+\d+\b/gi, 'line <LINE>');
    msg = msg.replace(/\b(column|col)\s+\d+\b/gi, 'col <COL>');

    // 3. Normalize Lucide / Missing Icon dependencies
    if (
      msg.includes('lucide is not defined') ||
      msg.includes('createicons is not a function') ||
      msg.includes('cannot find module lucide-react') ||
      msg.includes('module lucide-react could not be resolved') ||
      msg.includes('lucide@latest')
    ) {
      return 'missing_dependency::lucide_icons';
    }

    // 4. Normalize Tailwind CSS missing
    if (msg.includes('tailwind') && (msg.includes('not defined') || msg.includes('missing') || msg.includes('cannot resolve'))) {
      return 'missing_dependency::tailwindcss_cdn';
    }

    // 5. Normalize Null Reference & DOM Listener Errors
    if (
      msg.includes('cannot read properties of null') ||
      msg.includes('null is not an object') ||
      msg.includes('addeventlistener of null') ||
      msg.includes('getelementbyid(...) is null')
    ) {
      // Extract target identifier if any
      const match = rawMessage.match(/getElementById\(['"]([^'"]+)['"]\)/i) || rawMessage.match(/querySelector\(['"]([^'"]+)['"]\)/i);
      const target = match ? match[1] : 'element';
      return `dom_null_reference::${target}`;
    }

    // 6. Normalize Syntax & Bracket Balance Errors
    if (
      msg.includes('unexpected token') ||
      msg.includes('syntaxerror') ||
      msg.includes('uncaught syntaxerror') ||
      msg.includes('missing closing bracket') ||
      msg.includes('unclosed')
    ) {
      return 'syntax_error::token_or_bracket_mismatch';
    }

    // 7. Normalize Global Variable Undefined Reference
    if (msg.includes('is not defined') || msg.includes('referenceerror')) {
      const varMatch = msg.match(/([a-zA-Z0-9_<>$]+)\s+is not defined/i);
      const varName = varMatch ? varMatch[1] : 'var';
      return `reference_error::undefined_global_${varName}`;
    }

    // 8. Normalize Network / CORS / Fetch Failures
    if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('cors')) {
      return 'network_failure::blocked_or_cors';
    }

    // Default: clean whitespace and punctuation
    return msg.replace(/\s+/g, ' ').replace(/[^\w\s:-]/g, '');
  }

  private mapCategory(rawCat: string, normalized: string): IncidentCategory {
    if (normalized.startsWith('missing_dependency')) return 'DEPENDENCY';
    if (normalized.startsWith('syntax_error')) return 'CODE';
    if (normalized.startsWith('dom_null_reference')) return 'RUNTIME';
    if (normalized.startsWith('reference_error')) return 'RUNTIME';
    if (normalized.startsWith('network_failure')) return 'RUNTIME';

    switch (rawCat.toLowerCase()) {
      case 'syntax':
        return 'CODE';
      case 'build':
        return 'BUILD';
      case 'type':
        return 'TYPE';
      case 'missing_dependency':
      case 'dependency':
        return 'DEPENDENCY';
      case 'dom':
      case 'runtime':
        return 'RUNTIME';
      case 'preview':
        return 'PREVIEW';
      case 'quality':
        return 'QUALITY';
      case 'security':
        return 'SECURITY';
      default:
        return 'UNKNOWN';
    }
  }

  public getRecurrenceCount(fingerprint: string): number {
    return this.fingerprintCounts.get(fingerprint) || 0;
  }

  public resetRecurrence(): void {
    this.fingerprintCounts.clear();
  }
}

export const errorFingerprintService = new ErrorFingerprintService();
