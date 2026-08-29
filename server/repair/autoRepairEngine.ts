import { NormalizedErrorForAI } from '../preview/previewLifecycle';
import { qualityEngine, QualityReport } from '../quality/qualityEngine';
import { errorFingerprintService } from '../learning/errorFingerprint';
import { repairStrategyMemory } from '../learning/repairStrategyMemory';
import { bugIntelligenceEngine } from '../learning/bugIntelligenceEngine';
import { logger } from '../logger';

export interface RepairAttemptLog {
  attemptNumber: number;
  initialError: string;
  diagnostic: string;
  modifiedFiles: string[];
  appliedFix: string;
  qualityBefore: number;
  qualityAfter: number;
  success: boolean;
  timestamp: number;
}

export interface AutoRepairResult {
  repairedHtml: string;
  attempts: RepairAttemptLog[];
  attemptCount: number;
  finalQuality: QualityReport;
  success: boolean;
  abortedReason?: string;
}

export class AutoRepairEngine {
  private maxAttempts = 3;

  /**
   * Runs an iterative targeted repair loop to fix compile/runtime errors with bounded retry count
   */
  public autoRepairCode(
    rawHtml: string,
    initialErrors: NormalizedErrorForAI[],
    projectId?: string
  ): AutoRepairResult {
    let currentHtml = rawHtml;
    const attempts: RepairAttemptLog[] = [];
    let currentQuality = qualityEngine.evaluateQuality(currentHtml, initialErrors);

    logger.info('AutoRepair', `Starting auto-repair with ${initialErrors.length} error(s), initial quality: ${currentQuality.overallScore}`);

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      if (currentQuality.passed && initialErrors.length === 0) {
        break;
      }

      const rawError: any = initialErrors[0] || {};
      const activeError: NormalizedErrorForAI = {
        category: rawError.category || 'syntax',
        errorMessage: rawError.errorMessage || rawError.message || currentQuality.issues[0]?.message || 'Erreur de qualité globale',
        sourceFile: rawError.sourceFile || 'index.html',
        suggestedFix: rawError.suggestedFix || 'Corriger les balises et les dépendances manquantes.',
        severity: rawError.severity || 'error',
      };

      const fpResult = errorFingerprintService.generateFingerprint(activeError);

      const qualityBefore = currentQuality.overallScore;
      let fixDescription = '';
      let targetAction = 'GENERIC_REPAIR';
      let repaired = currentHtml;

      // 1. Repair Missing Lucide Dependency (Error Class 1 & 6)
      if (
        activeError.category === 'missing_dependency' ||
        (currentHtml.includes('data-lucide') && !currentHtml.includes('lucide@latest')) ||
        activeError.errorMessage?.includes('Lucide')
      ) {
        targetAction = 'INJECT_LUCIDE_CDN';
        fixDescription = 'Injection de la balise CDN Lucide Icons et de lucide.createIcons()';
        if (repaired.includes('</head>') && !repaired.includes('lucide@latest')) {
          repaired = repaired.replace('</head>', '  <script src="https://unpkg.com/lucide@latest"></script>\n</head>');
        }
        if (repaired.includes('</body>') && !repaired.includes('lucide.createIcons')) {
          repaired = repaired.replace('</body>', '  <script>if (window.lucide) lucide.createIcons();</script>\n</body>');
        }
      }

      // 2. Repair Missing Tailwind CDN (Error Class 6)
      if (!repaired.includes('cdn.tailwindcss.com')) {
        targetAction = 'INJECT_TAILWIND_CDN';
        fixDescription += (fixDescription ? ' + ' : '') + 'Ajout du script CDN Tailwind CSS v3';
        if (repaired.includes('<head>')) {
          repaired = repaired.replace('<head>', '<head>\n  <script src="https://cdn.tailwindcss.com"></script>');
        }
      }

      // 3. Repair Syntax / Unclosed HTML Tags (Error Class 9 & 2)
      const openDivs = (repaired.match(/<div/g) || []).length;
      const closeDivs = (repaired.match(/<\/div>/g) || []).length;
      if (openDivs > closeDivs) {
        targetAction = 'EQUILIBRATE_SYNTAX_BRACKETS';
        fixDescription += (fixDescription ? ' + ' : '') + `Fermeture de ${openDivs - closeDivs} balise(s) </div> manquante(s)`;
        const missingClosings = '</div>'.repeat(openDivs - closeDivs);
        if (repaired.includes('</body>')) {
          repaired = repaired.replace('</body>', `${missingClosings}\n</body>`);
        }
      }

      // 4. Repair Undefined Variables / ReferenceErrors (Error Class 3)
      if (activeError.category === 'runtime' && (activeError.errorMessage?.includes('is not defined') || activeError.errorMessage?.includes('ReferenceError'))) {
        targetAction = 'DECLARE_SAFE_GLOBAL_FALLBACK';
        const varMatch = activeError.errorMessage.match(/([a-zA-Z0-9_$]+)\s+is not defined/);
        const missingVar = varMatch ? varMatch[1] : 'runtimeFallbackVar';
        fixDescription += (fixDescription ? ' + ' : '') + `Définition de sécurité pour la variable globale "${missingVar}"`;
        if (repaired.includes('<head>')) {
          repaired = repaired.replace('<head>', `<head>\n  <script>window.${missingVar} = window.${missingVar} || {};</script>`);
        }
      }

      // 5. Repair Broken / Non-Existent Scripts / Bad Path (Error Class 7)
      if (repaired.includes('<script src="/scripts/app.js">') || repaired.includes('<script src="./app.js">')) {
        targetAction = 'RESOLVE_LOCAL_SCRIPT_PATH';
        fixDescription += (fixDescription ? ' + ' : '') + 'Correction du chemin de script local non résolu';
        repaired = repaired.replace(/<script src="[^"]*app\.js"><\/script>/g, '<script>// Script inline sécurisé pour le preview</script>');
      }

      // 6. Repair JS Bracket Asymmetry / Syntax Error (Error Class 4)
      const scriptMatches = repaired.match(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi) || [];
      for (const s of scriptMatches) {
        const jsOnly = s.replace(/<script[\s\S]*?>/i, '').replace(/<\/script>/i, '');
        const openB = (jsOnly.match(/{/g) || []).length;
        const closeB = (jsOnly.match(/}/g) || []).length;
        if (openB > closeB) {
          targetAction = 'EQUILIBRATE_SYNTAX_BRACKETS';
          const patchedJs = jsOnly + '\n' + '}'.repeat(openB - closeB);
          repaired = repaired.replace(jsOnly, patchedJs);
          fixDescription += (fixDescription ? ' + ' : '') + 'Équilibrage des accolades JavaScript';
        }
      }

      // 6.5. Repair Unexpected identifier caused by unescaped single quotes/contractions in JS string literals
      if (
        activeError.errorMessage?.includes('Unexpected identifier') ||
        activeError.errorMessage?.includes('SyntaxError') ||
        activeError.category === 'syntax' ||
        activeError.category === 'runtime'
      ) {
        const beforeFix = repaired;
        repaired = repaired.replace(
          /'([^'\n\r]*[a-zA-ZÀ-ÿ])'([a-zA-ZÀ-ÿ][^'\n\r]*)'/g,
          '"$1\'$2"'
        );
        if (repaired !== beforeFix) {
          targetAction = 'SANITIZE_STRING_LITERAL_QUOTES';
          fixDescription += (fixDescription ? ' + ' : '') + 'Sécurisation des apostrophes dans les littéraux JavaScript';
        }
      }

      // 7. Repair Runtime Null Event Listeners (Error Class 5 & 10)
      if (activeError.category === 'runtime' && (activeError.errorMessage.includes('Cannot read properties of null') || activeError.errorMessage.includes('addEventListener of null'))) {
        targetAction = 'GUARD_OPTIONAL_CHAINING';
        fixDescription += (fixDescription ? ' + ' : '') + 'Sécurisation des écouteurs d\'événements avec vérification d\'existence DOM';
        repaired = repaired.replace(
          /document\.getElementById\('([^']+)'\)\.addEventListener/g,
          'document.getElementById(\'$1\')?.addEventListener'
        );
      }

      // 8. Repair Invalid Attributes / Props Error (Error Class 8)
      if (activeError.category === 'dom' || activeError.errorMessage.includes('attribute')) {
        targetAction = 'NORMALIZE_DOM_ATTRIBUTES';
        fixDescription += (fixDescription ? ' + ' : '') + 'Normalisation des attributs DOM';
        repaired = repaired.replace(/data-lucide=([a-zA-Z0-9_-]+)(?=[ >])/g, 'data-lucide="$1"');
      }

      // Re-evaluate quality after targeted fix
      currentHtml = repaired;
      currentQuality = qualityEngine.evaluateQuality(currentHtml);
      const isFixed = currentQuality.overallScore > qualityBefore || currentQuality.passed;

      // Update Repair Strategy Memory
      repairStrategyMemory.recordStrategyOutcome(
        fpResult.normalizedPattern,
        targetAction,
        fpResult.category,
        isFixed,
        attempt,
        projectId
      );

      attempts.push({
        attemptNumber: attempt,
        initialError: activeError.errorMessage,
        diagnostic: activeError.suggestedFix,
        modifiedFiles: ['index.html'],
        appliedFix: fixDescription || 'Réparation automatique des balises et dépendances',
        qualityBefore,
        qualityAfter: currentQuality.overallScore,
        success: isFixed,
        timestamp: Date.now(),
      });

      if (currentQuality.passed) {
        logger.info('AutoRepair', `Auto-repair succeeded at attempt #${attempt} with score ${currentQuality.overallScore}`);
        return {
          repairedHtml: currentHtml,
          attempts,
          attemptCount: attempts.length,
          finalQuality: currentQuality,
          success: true,
        };
      }
    }

    const finalSuccess = currentQuality.passed;
    return {
      repairedHtml: currentHtml,
      attempts,
      attemptCount: attempts.length,
      finalQuality: currentQuality,
      success: finalSuccess,
      abortedReason: finalSuccess ? undefined : `Nombre maximum de tentatives (${this.maxAttempts}) atteint sans résolution complète.`,
    };
  }
}

export const autoRepairEngine = new AutoRepairEngine();
