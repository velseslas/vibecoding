import { hardenedSecurityShield } from '../security/hardenedSecurityShield';
import { logger } from '../logger';

export interface QualityReport {
  syntaxScore: number;
  typeScore: number;
  buildScore: number;
  runtimeScore: number;
  architectureScore: number;
  consistencyScore: number;
  maintainabilityScore: number;
  scopeDisciplineScore: number;
  securityScore: number;
  testScore: number;
  overallScore: number;
  passed: boolean;
  issues: Array<{ severity: 'info' | 'warning' | 'error'; message: string; rule: string }>;
  evidence: {
    htmlTagsBalanced: boolean;
    hasTailwindCdn: boolean;
    hasLucideIcons: boolean;
    hasParentBreakoutAttempts: boolean;
    hasInlineJsErrors: boolean;
    totalDomElements: number;
  };
}

export class QualityEngine {
  /**
   * Performs evidence-based static & runtime quality verification
   */
  public evaluateQuality(htmlContent: string, runtimeErrors: any[] = []): QualityReport {
    const issues: QualityReport['issues'] = [];
    const html = htmlContent || '';

    // 1. Static Syntax & Tag Balancing Check
    let syntaxScore = 100;
    const openDivs = (html.match(/<div/g) || []).length;
    const closeDivs = (html.match(/<\/div>/g) || []).length;
    const tagsBalanced = Math.abs(openDivs - closeDivs) <= 1;

    if (!tagsBalanced) {
      syntaxScore -= 20;
      issues.push({
        severity: 'warning',
        message: `Déséquilibre de balises HTML détecté (<div: ${openDivs}, </div: ${closeDivs})`,
        rule: 'HTML_TAG_BALANCE',
      });
    }

    if (!html.includes('<!DOCTYPE html>') && !html.includes('<html')) {
      syntaxScore -= 15;
      issues.push({
        severity: 'warning',
        message: 'Document HTML incomplet (DOCTYPE ou balise html manquante)',
        rule: 'HTML_DOCTYPE_STANDARD',
      });
    }

    // 2. Type & Script Parsing Verification
    let typeScore = 100;
    let hasInlineJsErrors = false;
    const scriptMatches = html.match(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi) || [];
    for (const s of scriptMatches) {
      const jsOnly = s.replace(/<script[\s\S]*?>/i, '').replace(/<\/script>/i, '');
      if (jsOnly.includes('const ') || jsOnly.includes('let ') || jsOnly.includes('function')) {
        // Test balanced brackets in JS
        const openBraces = (jsOnly.match(/{/g) || []).length;
        const closeBraces = (jsOnly.match(/}/g) || []).length;
        if (openBraces !== closeBraces) {
          typeScore -= 30;
          hasInlineJsErrors = true;
          issues.push({
            severity: 'error',
            message: `Accolades JavaScript asymétriques ({: ${openBraces}, }: ${closeBraces})`,
            rule: 'JS_SYNTAX_BALANCE',
          });
        }
      }
    }

    // 3. Build & CDN Integration
    let buildScore = 100;
    const hasTailwind = html.includes('cdn.tailwindcss.com');
    const hasLucide = html.includes('lucide');

    if (!hasTailwind) {
      buildScore -= 25;
      issues.push({
        severity: 'warning',
        message: 'Tailwind CSS CDN manquant dans le header',
        rule: 'REQUIRED_CSS_FRAMEWORK',
      });
    }

    if (!hasLucide && html.includes('data-lucide')) {
      buildScore -= 20;
      issues.push({
        severity: 'error',
        message: 'Attributs data-lucide présents mais script Lucide CDN non inclus',
        rule: 'DEPENDENCY_MISSING',
      });
    }

    // 4. Runtime & Error Telemetry Check
    let runtimeScore = 100;
    if (runtimeErrors.length > 0) {
      const fatalErrors = runtimeErrors.filter((e) => e.severity === 'fatal' || e.type === 'runtime').length;
      runtimeScore = Math.max(0, 100 - (fatalErrors * 35));
      issues.push({
        severity: 'error',
        message: `${runtimeErrors.length} erreur(s) runtime capturée(s) par le pont de preview`,
        rule: 'RUNTIME_EXECUTION_STABILITY',
      });
    }

    // 5. Security & Isolation Verification
    let securityScore = 100;
    const hasParentBreakout = html.includes('top.location') || html.includes('parent.location');
    if (hasParentBreakout) {
      securityScore -= 40;
      issues.push({
        severity: 'error',
        message: 'Tentative de détournement de la fenêtre parente détectée',
        rule: 'SECURITY_PARENT_HIJACK',
      });
    }

    const hasSecretPattern = /AIzaSy[A-Za-z0-9_-]{33}|sk_live_[0-9a-zA-Z]{24}/.test(html);
    if (hasSecretPattern) {
      securityScore -= 50;
      issues.push({
        severity: 'error',
        message: 'Fuite potentielle de clé API / secret détectée dans le code frontend',
        rule: 'SECURITY_SECRET_LEAKAGE',
      });
    }

    // 6. Architecture & DOM Richness
    let architectureScore = 100;
    const domCount = (html.match(/<[a-z0-9-]+/gi) || []).length;
    if (domCount < 4) {
      architectureScore = 20;
      issues.push({
        severity: 'error',
        message: 'Fragment HTML incomplet ou cassé (< 4 éléments DOM)',
        rule: 'ARCHITECTURE_INCOMPLETE',
      });
    } else if (domCount < 8) {
      architectureScore -= 30;
      issues.push({
        severity: 'warning',
        message: 'Application trop succincte ou placeholder incomplet (< 8 éléments DOM)',
        rule: 'ARCHITECTURE_COMPLETENESS',
      });
    }

    // 7. Consistency, Maintainability & Scope Discipline
    let consistencyScore = 100;
    if (!hasTailwind && html.includes('class="')) {
      consistencyScore -= 20;
    }
    if (html.includes('style="')) {
      consistencyScore -= 10; // Discourage unmaintainable inline styles
    }

    let maintainabilityScore = 100;
    if (html.length > 60000) {
      maintainabilityScore -= 25;
      issues.push({
        severity: 'warning',
        message: 'Fichier HTML monolithique (> 60KB), suggérer extraction modulaire',
        rule: 'MAINTAINABILITY_SIZE',
      });
    }

    let scopeDisciplineScore = 100;
    if (hasSecretPattern || hasParentBreakout) {
      scopeDisciplineScore -= 40;
    }

    // 8. Test Score
    const testScore = Math.round((syntaxScore + typeScore + buildScore + securityScore + maintainabilityScore) / 5);

    // Weighted Overall Score
    const overallScore = Math.round(
      syntaxScore * 0.15 +
      typeScore * 0.15 +
      buildScore * 0.15 +
      runtimeScore * 0.15 +
      securityScore * 0.15 +
      architectureScore * 0.1 +
      maintainabilityScore * 0.05 +
      consistencyScore * 0.05 +
      scopeDisciplineScore * 0.05
    );

    return {
      syntaxScore,
      typeScore,
      buildScore,
      runtimeScore,
      architectureScore,
      consistencyScore,
      maintainabilityScore,
      scopeDisciplineScore,
      securityScore,
      testScore,
      overallScore,
      passed: overallScore >= 70 && securityScore >= 70 && !hasInlineJsErrors && runtimeScore >= 60,
      issues,
      evidence: {
        htmlTagsBalanced: tagsBalanced,
        hasTailwindCdn: hasTailwind,
        hasLucideIcons: hasLucide,
        hasParentBreakoutAttempts: hasParentBreakout,
        hasInlineJsErrors,
        totalDomElements: domCount,
      },
    };
  }
}

export const qualityEngine = new QualityEngine();
