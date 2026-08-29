import { VisualAuditReport, VisualIssue } from './visualIntelligence';
import { validatedArtifactEngine, ValidatedArtifact, Changeset, VerificationResult } from '../artifacts/validatedArtifact';
import { logger } from '../logger';

export interface VisualRepairResult {
  repairedHtml: string;
  success: boolean;
  appliedFixes: string[];
  repairChangeset?: Changeset;
  repairArtifact?: ValidatedArtifact;
  verification?: VerificationResult;
}

export class VisualRepairEngine {
  /**
   * Attempts targeted visual corrections on HTML to resolve blocking visual/layout issues
   */
  public repairVisualIssues(
    html: string,
    report: VisualAuditReport,
    parentChangesetId: string
  ): VisualRepairResult {
    let repaired = html;
    const appliedFixes: string[] = [];

    const blockingOrWarningIssues = report.issues.filter(
      (i) => i.severity === 'CRITICAL' || i.severity === 'ERROR' || i.severity === 'WARNING'
    );

    for (const issue of blockingOrWarningIssues) {
      // 1. Fix Horizontal Overflow
      if (issue.category === 'OVERFLOW') {
        if (/w-\[\d+px\]/.test(repaired)) {
          repaired = repaired.replace(/w-\[(\d+)px\]/g, (match, px) => {
            const num = parseInt(px, 10);
            return num > 400 ? 'w-full max-w-4xl' : match;
          });
          appliedFixes.push('Remplacement des largeurs fixes en pixels par w-full max-w-4xl');
        }
        if (!repaired.includes('overflow-x-hidden') && repaired.includes('<body')) {
          repaired = repaired.replace('<body', '<body class="overflow-x-hidden"');
          appliedFixes.push('Ajout de overflow-x-hidden sur la balise <body>');
        }
      }

      // 2. Fix Responsive Grid Breakdown
      if (issue.category === 'RESPONSIVE') {
        if (repaired.includes('grid-cols-3') && !repaired.includes('md:grid-cols-3')) {
          repaired = repaired.replace(/\bgrid-cols-3\b/g, 'grid-cols-1 md:grid-cols-3');
          appliedFixes.push('Conversion de la grille 3 colonnes en responsive mobile (grid-cols-1 md:grid-cols-3)');
        }
        if (repaired.includes('grid-cols-4') && !repaired.includes('md:grid-cols-4')) {
          repaired = repaired.replace(/\bgrid-cols-4\b/g, 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4');
          appliedFixes.push('Adaptation responsive de la grille 4 colonnes');
        }
        // Small touch targets fix
        if (repaired.includes('<button') && (repaired.includes('p-0') || repaired.includes('text-[9px]'))) {
          repaired = repaired.replace(/<button([^>]*)class="([^"]*)\bp-0\b([^"]*)"/g, '<button$1class="$2py-2.5 px-4$3"');
          appliedFixes.push('Agrandissement des zones de clic tactiles (<button>) à 44px');
        }
      }

      // 3. Fix Layout Overlap
      if (issue.category === 'OVERLAP') {
        if (repaired.includes('absolute top-0 left-0') && (repaired.match(/absolute top-0 left-0/g) || []).length > 1) {
          let count = 0;
          repaired = repaired.replace(/absolute top-0 left-0/g, () => {
            count++;
            return count === 1 ? 'relative' : 'relative mt-4';
          });
          appliedFixes.push('Remplacement de la superposition absolue par un flux relatif étagé');
        }
      }

      // 4. Fix High/Low Contrast
      if (issue.category === 'CONTRAST') {
        if (repaired.includes('text-white bg-white')) {
          repaired = repaired.replace(/text-white bg-white/g, 'text-slate-900 bg-white');
          appliedFixes.push('Correction du texte blanc invisible sur fond blanc');
        }
        if (repaired.includes('text-slate-900 bg-slate-900') || repaired.includes('text-black bg-black')) {
          repaired = repaired.replace(/text-slate-900 bg-slate-900/g, 'text-slate-100 bg-slate-900');
          repaired = repaired.replace(/text-black bg-black/g, 'text-white bg-black');
          appliedFixes.push('Correction du texte sombre invisible sur fond sombre');
        }
      }

      // 5. Fix Hierarchy
      if (issue.category === 'HIERARCHY' && !repaired.includes('<h1') && !repaired.includes('<h2')) {
        if (repaired.includes('<main>')) {
          repaired = repaired.replace('<main>', '<main>\n  <h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-6">Application Dashboard</h1>');
          appliedFixes.push('Insertion d\'un titre H1 structurant dans le conteneur principal');
        }
      }
    }

    const isModified = repaired !== html && appliedFixes.length > 0;

    let repairChangeset: Changeset | undefined;
    let repairArtifact: ValidatedArtifact | undefined;
    let verification: VerificationResult | undefined;

    if (isModified) {
      const artifactResult = validatedArtifactEngine.createRepairChangeset({
        parentChangesetId,
        repairedHtml: repaired,
        repairedFiles: [{ name: 'index.html', content: repaired }],
        repairAttempts: 1,
        appliedFixes,
        issuesDetected: blockingOrWarningIssues.map((i) => i.description),
        actor: 'system_visual_intelligence_repair',
        rationale: `Réparation visuelle ciblée : ${appliedFixes.join(' | ')}`,
      });

      repairChangeset = artifactResult.repairChangeset;
      repairArtifact = artifactResult.repairArtifact;
      verification = artifactResult.verification;

      logger.info(
        'VisualRepair',
        `Applied visual repair changeset ${repairChangeset.id} with ${appliedFixes.length} fix(es)`
      );
    }

    return {
      repairedHtml: repaired,
      success: isModified,
      appliedFixes,
      repairChangeset,
      repairArtifact,
      verification,
    };
  }
}

export const visualRepairEngine = new VisualRepairEngine();
