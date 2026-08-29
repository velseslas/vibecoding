import crypto from 'crypto';
import { designHarmonyAuditService, DesignHarmonyReport } from '../audit/designHarmonyAudit';
import { appDnaService } from '../analysis/appDna';
import { visualCaptureEngine, STANDARD_VIEWPORTS, VisualCaptureResult, ComputedDomNode, BoundingBox } from './visualCapture';
import { logger } from '../logger';

export type VisualIssueCategory =
  | 'OVERFLOW'
  | 'OVERLAP'
  | 'ALIGNMENT'
  | 'SPACING'
  | 'HIERARCHY'
  | 'CONTRAST'
  | 'RESPONSIVE'
  | 'VISIBILITY'
  | 'CONSISTENCY'
  | 'ACCESSIBILITY'
  | 'DESIGN_HARMONY';

export type VisualIssueSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface VisualIssue {
  id: string;
  category: VisualIssueCategory;
  severity: VisualIssueSeverity;
  description: string;
  evidence?: {
    viewport?: 'desktop' | 'mobile' | 'tablet';
    selector?: string;
    screenshotReference?: string;
    boundingBox?: BoundingBox;
    computedStyles?: Record<string, any>;
  };
  recommendation?: string;
}

export interface ViewportVisualAudit {
  viewport: 'desktop' | 'mobile';
  width: number;
  height: number;
  score: number;
  issues: VisualIssue[];
  capture: VisualCaptureResult;
  layoutMetrics: {
    totalElements: number;
    overflowCount: number;
    overlapCount: number;
    alignmentAnomalyCount: number;
    maxHorizontalSpan: number;
  };
}

export interface VisualAuditReport {
  overallScore: number;
  status: 'PASSED' | 'WARNING' | 'REPAIR_REQUIRED' | 'FAILED';
  desktop: ViewportVisualAudit;
  mobile: ViewportVisualAudit;
  designHarmony: DesignHarmonyReport;
  dnaCompliance: {
    passed: boolean;
    violations: string[];
  };
  visionAnalysis?: {
    analyzed: boolean;
    findings: string[];
    aestheticScore?: number;
  };
  issues: VisualIssue[];
  blockingIssues: VisualIssue[];
  metadata: {
    projectId: string;
    versionId?: string;
    changesetId?: string;
    timestamp: string;
  };
}

export class VisualIntelligenceService {
  /**
   * Performs a comprehensive Visual Runtime Audit on rendered HTML across Desktop & Mobile viewports
   */
  public async auditVisualRuntime(
    html: string,
    options: {
      projectId: string;
      versionId?: string;
      changesetId?: string;
    }
  ): Promise<VisualAuditReport> {
    const projectId = options.projectId;
    const now = new Date().toISOString();

    if (!html || html.length < 30) {
      const emptyIssue: VisualIssue = {
        id: 'vis_err_empty',
        category: 'VISIBILITY',
        severity: 'CRITICAL',
        description: 'Document HTML vide ou inexploitable pour le rendu visuel.',
        recommendation: 'Générer un template HTML5 complet.',
      };

      const emptyCapture = await visualCaptureEngine.captureRender(html || '<div></div>', STANDARD_VIEWPORTS.desktop, options);

      return {
        overallScore: 0,
        status: 'FAILED',
        desktop: {
          viewport: 'desktop',
          width: 1280,
          height: 800,
          score: 0,
          issues: [emptyIssue],
          capture: emptyCapture,
          layoutMetrics: { totalElements: 0, overflowCount: 0, overlapCount: 0, alignmentAnomalyCount: 0, maxHorizontalSpan: 0 },
        },
        mobile: {
          viewport: 'mobile',
          width: 375,
          height: 667,
          score: 0,
          issues: [emptyIssue],
          capture: await visualCaptureEngine.captureRender(html || '<div></div>', STANDARD_VIEWPORTS.mobile, options),
          layoutMetrics: { totalElements: 0, overflowCount: 0, overlapCount: 0, alignmentAnomalyCount: 0, maxHorizontalSpan: 0 },
        },
        designHarmony: designHarmonyAuditService.auditDesign(html || ''),
        dnaCompliance: { passed: false, violations: ['HTML Payload vide'] },
        issues: [emptyIssue],
        blockingIssues: [emptyIssue],
        metadata: {
          projectId,
          versionId: options.versionId,
          changesetId: options.changesetId,
          timestamp: now,
        },
      };
    }

    // 1. Capture Real Renderings across Desktop & Mobile via Chromium Engine
    const desktopCapture = await visualCaptureEngine.captureRender(html, STANDARD_VIEWPORTS.desktop, options);
    const mobileCapture = await visualCaptureEngine.captureRender(html, STANDARD_VIEWPORTS.mobile, options);

    // 2. Viewport-specific Visual & Geometric Audits
    const desktopAudit = this.auditViewport(desktopCapture, 'desktop', html);
    const mobileAudit = this.auditViewport(mobileCapture, 'mobile', html);

    // 3. Static Design Harmony Integration
    const designHarmonyReport = designHarmonyAuditService.auditDesign(html);
    const harmonyIssues: VisualIssue[] = designHarmonyReport.issues.map((di, idx) => ({
      id: `vis_dh_${idx + 1}`,
      category: di.category === 'SPACING'
        ? 'SPACING'
        : di.category === 'TYPOGRAPHY'
        ? 'HIERARCHY'
        : di.category === 'COLOR'
        ? 'CONTRAST'
        : di.category === 'ACCESSIBILITY'
        ? 'ACCESSIBILITY'
        : di.category === 'RESPONSIVENESS'
        ? 'RESPONSIVE'
        : 'DESIGN_HARMONY',
      severity: di.severity === 'ERROR' ? 'ERROR' : di.severity === 'WARNING' ? 'WARNING' : 'INFO',
      description: `[Design Harmony] ${di.description}`,
      recommendation: di.suggestedFix,
      evidence: { selector: di.elementSelector },
    }));

    // 4. Application DNA Compliance Check
    const dnaViolations: string[] = [];
    const dna = appDnaService.getOrCreateDna(projectId);

    // Verify DNA rules against rendered code
    if (dna.rules.some((r) => r.includes('Tailwind')) && !html.includes('tailwindcss') && !html.includes('tailwind')) {
      dnaViolations.push('Règle DNA violée : Intégration Tailwind CSS requise.');
    }
    if (dna.rules.some((r) => r.includes('Lucide')) && html.includes('data-lucide') && !html.includes('lucide.createIcons')) {
      dnaViolations.push('Règle DNA violée : Initialisation lucide.createIcons() manquante après rendu.');
    }
    if (dna.rules.some((r) => r.includes('WCAG AA')) && designHarmonyReport.colorScore < 70) {
      dnaViolations.push('Règle DNA violée : Contraste de couleur insuffisant pour satisfaire WCAG AA.');
    }

    const dnaIssues: VisualIssue[] = dnaViolations.map((v, idx) => ({
      id: `vis_dna_${idx + 1}`,
      category: 'CONSISTENCY',
      severity: 'WARNING',
      description: `[DNA Compliance] ${v}`,
      recommendation: 'Aligner le code avec les standards du projet définis dans l\'Application DNA.',
    }));

    // 5. Aggregate All Issues
    const allIssues: VisualIssue[] = [
      ...desktopAudit.issues,
      ...mobileAudit.issues,
      ...harmonyIssues,
      ...dnaIssues,
    ];

    // Filter deduplicated issues
    const uniqueIssuesMap = new Map<string, VisualIssue>();
    for (const issue of allIssues) {
      const key = `${issue.category}_${issue.description}`;
      if (!uniqueIssuesMap.has(key)) {
        uniqueIssuesMap.set(key, issue);
      }
    }
    const mergedIssues = Array.from(uniqueIssuesMap.values());

    const blockingIssues = mergedIssues.filter(
      (i) => i.severity === 'CRITICAL' || i.severity === 'ERROR'
    );

    // Compute Balanced Overall Score
    const overallScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          desktopAudit.score * 0.35 +
          mobileAudit.score * 0.35 +
          designHarmonyReport.overallScore * 0.2 +
          (dnaViolations.length === 0 ? 100 : 60) * 0.1
        )
      )
    );

    let status: VisualAuditReport['status'] = 'PASSED';
    if (overallScore < 60 || blockingIssues.length > 0) {
      status = 'REPAIR_REQUIRED';
    } else if (overallScore < 80 || mergedIssues.some((i) => i.severity === 'WARNING')) {
      status = 'WARNING';
    }

    logger.info(
      'VisualIntelligence',
      `Audit completed for ${projectId} (Status: ${status}, Score: ${overallScore}/100, Issues: ${mergedIssues.length}, Blocking: ${blockingIssues.length})`
    );

    return {
      overallScore,
      status,
      desktop: desktopAudit,
      mobile: mobileAudit,
      designHarmony: designHarmonyReport,
      dnaCompliance: {
        passed: dnaViolations.length === 0,
        violations: dnaViolations,
      },
      issues: mergedIssues,
      blockingIssues,
      metadata: {
        projectId,
        versionId: options.versionId,
        changesetId: options.changesetId,
        timestamp: now,
      },
    };
  }

  /**
   * Performs deep geometric and layout analysis for a specific viewport
   */
  private auditViewport(
    capture: VisualCaptureResult,
    viewportType: 'desktop' | 'mobile',
    rawHtml: string
  ): ViewportVisualAudit {
    const issues: VisualIssue[] = [];
    const { flatNodes, viewport, hasHorizontalOverflow, overflowingElements } = capture;
    let vpScore = 100;

    let overlapCount = 0;
    let alignmentAnomalyCount = 0;

    // A. OVERFLOW & CLIPPING DETECTION
    if (hasHorizontalOverflow || overflowingElements.length > 0) {
      vpScore -= viewportType === 'mobile' ? 30 : 20;
      for (const ov of overflowingElements.slice(0, 3)) {
        issues.push({
          id: `vis_ov_${viewportType}_${crypto.randomBytes(3).toString('hex')}`,
          category: 'OVERFLOW',
          severity: viewportType === 'mobile' ? 'ERROR' : 'WARNING',
          description: `Contenu dépassant horizontalement la viewport de ${ov.excessWidth}px (${ov.tagName}${ov.selector ? ` ${ov.selector}` : ''}).`,
          evidence: {
            viewport: viewportType,
            selector: ov.selector,
            boundingBox: ov.boundingBox,
          },
          recommendation: 'Remplacer les largeurs fixes en pixels par w-full, max-w-* ou ajouter overflow-x-hidden.',
        });
      }
    }

    // B. OVERLAP DETECTION
    const nonRootNodes = flatNodes.filter(
      (n) => n.tagName !== 'body' && n.tagName !== 'html' && n.computedStyles.display !== 'none' && n.computedStyles.opacity > 0
    );

    let foundOverlap = false;
    for (let i = 0; i < nonRootNodes.length; i++) {
      for (let j = i + 1; j < nonRootNodes.length; j++) {
        const a = nonRootNodes[i];
        const b = nonRootNodes[j];

        if (
          a.computedStyles.position === 'absolute' &&
          b.computedStyles.position === 'absolute'
        ) {
          const intersects = this.checkIntersection(a.boundingBox, b.boundingBox);
          if (intersects) {
            foundOverlap = true;
            overlapCount++;
            vpScore -= 15;
            issues.push({
              id: `vis_ol_${viewportType}_${i}_${j}`,
              category: 'OVERLAP',
              severity: 'ERROR',
              description: `Collision et chevauchement accidentel entre ${a.tagName} et ${b.tagName} à la position (x:${a.boundingBox.x}, y:${a.boundingBox.y}).`,
              evidence: {
                viewport: viewportType,
                selector: a.id ? `#${a.id}` : a.tagName,
                boundingBox: a.boundingBox,
              },
              recommendation: 'Ajuster les positions ou utiliser flex/grid pour éviter la superposition incontrôlée.',
            });
            break;
          }
        }
      }
      if (foundOverlap) break;
    }

    if (!foundOverlap && rawHtml.includes('absolute') && (rawHtml.match(/absolute/g) || []).length >= 2 && rawHtml.includes('top-0 left-0')) {
      overlapCount++;
      vpScore -= 15;
      issues.push({
        id: `vis_ol_${viewportType}_pattern`,
        category: 'OVERLAP',
        severity: 'ERROR',
        description: 'Collision et chevauchement accidentel entre plusieurs éléments positionnés en absolute aux mêmes coordonnées.',
        evidence: { viewport: viewportType },
        recommendation: 'Ajuster les positions ou utiliser flex/grid pour éviter la superposition incontrôlée.',
      });
    }

    // C. RESPONSIVE BREAKAGE DETECTION (Mobile specific)
    if (viewportType === 'mobile') {
      // 1. Mobile touch target size check (< 44px)
      const smallTouchTargets = nonRootNodes.filter(
        (n) => n.computedStyles.isClickable && (n.boundingBox.width < 40 || n.boundingBox.height < 36)
      );

      if (smallTouchTargets.length > 0) {
        vpScore -= 10;
        const first = smallTouchTargets[0];
        issues.push({
          id: `vis_touch_${viewportType}`,
          category: 'RESPONSIVE',
          severity: 'WARNING',
          description: `Zone tactile trop petite sur mobile (${first.boundingBox.width}x${first.boundingBox.height}px) pour ${first.tagName}.`,
          evidence: {
            viewport: 'mobile',
            selector: first.id ? `#${first.id}` : first.tagName,
            boundingBox: first.boundingBox,
          },
          recommendation: 'Appliquer des paddings confortables (py-2.5 px-4) pour garantir une cible minimale de 44x44px.',
        });
      }

      // 2. Fixed unadapted desktop grid columns on mobile
      if (rawHtml.includes('grid-cols-3') && !rawHtml.includes('grid-cols-1') && !rawHtml.includes('md:grid-cols-3')) {
        vpScore -= 20;
        issues.push({
          id: `vis_grid_mobile`,
          category: 'RESPONSIVE',
          severity: 'ERROR',
          description: 'Grille 3 colonnes fixe non adaptée sur écran mobile étroit (375px).',
          evidence: {
            viewport: 'mobile',
          },
          recommendation: 'Utiliser grid-cols-1 md:grid-cols-3 pour empiler verticalement les cartes sur mobile.',
        });
      }
    }

    // D. ALIGNMENT & SPACING ANOMALIES
    const cards = nonRootNodes.filter((n) => n.className.includes('card') || n.className.includes('rounded-2xl'));
    if (cards.length >= 2) {
      const lefts = cards.map((c) => c.boundingBox.x);
      const isMisaligned = lefts.some((l, idx) => idx > 0 && Math.abs(l - lefts[0]) > 8 && Math.abs(l - lefts[0]) < 100);
      if (isMisaligned) {
        alignmentAnomalyCount++;
        vpScore -= 10;
        issues.push({
          id: `vis_align_${viewportType}`,
          category: 'ALIGNMENT',
          severity: 'WARNING',
          description: 'Désalignement latéral irrégulier entre blocs de contenu équivalents.',
          evidence: { viewport: viewportType },
          recommendation: 'Envelopper les cartes dans un conteneur grid ou flex avec marges unifiées.',
        });
      }
    }

    // E. CONTRAST & READABILITY CHECK
    const hasZeroContrastCode = /text-white\s+bg-white|text-black\s+bg-black|text-slate-900\s+bg-slate-900/.test(rawHtml);
    const lowContrastNodes = nonRootNodes.filter((n) => {
      const { color, backgroundColor } = n.computedStyles;
      if (!color || !backgroundColor) return false;
      if (backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') return false;

      // Extract RGB values
      const parseColor = (str: string): [number, number, number] | null => {
        const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
        if (m) return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
        if (str.startsWith('#')) {
          const hex = str.slice(1);
          if (hex.length === 3) return [parseInt(hex[0]+hex[0], 16), parseInt(hex[1]+hex[1], 16), parseInt(hex[2]+hex[2], 16)];
          if (hex.length === 6) return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
        }
        return null;
      };

      const c = parseColor(color);
      const bg = parseColor(backgroundColor);
      if (c && bg) {
        const diff = Math.abs(c[0] - bg[0]) + Math.abs(c[1] - bg[1]) + Math.abs(c[2] - bg[2]);
        if (diff < 15) return true; // Near identical RGB
      }

      if (color === '#ffffff' && backgroundColor === '#ffffff') return true;
      if (color === '#0f172a' && backgroundColor === '#0f172a') return true;
      return false;
    });

    if (lowContrastNodes.length > 0 || hasZeroContrastCode) {
      vpScore -= 15;
      issues.push({
        id: `vis_contrast_${viewportType}`,
        category: 'CONTRAST',
        severity: 'ERROR',
        description: 'Texte confondu avec l\'arrière-plan (contraste quasi nul).',
        evidence: {
          viewport: viewportType,
          selector: lowContrastNodes[0]?.tagName,
          boundingBox: lowContrastNodes[0]?.boundingBox,
        },
        recommendation: 'Ajuster les classes text-* et bg-* pour respecter le contraste minimum WCAG AA.',
      });
    }

    // F. VISUAL HIERARCHY CHECK
    const hasHeadings = /<h[1-6]/i.test(rawHtml) || nonRootNodes.some((n) => n.tagName.startsWith('h'));
    const isMultiBlock = (rawHtml.match(/<p|<div|<section|<article|<card/gi) || []).length >= 4 || nonRootNodes.length > 3;

    if (!hasHeadings && isMultiBlock) {
      vpScore -= 10;
      issues.push({
        id: `vis_hier_missing_${viewportType}`,
        category: 'HIERARCHY',
        severity: 'WARNING',
        description: 'Aucun titre principal (H1/H2) détecté pour structurer la vue.',
        evidence: { viewport: viewportType },
        recommendation: 'Ajouter un titre de section H1 clair et contrasté.',
      });
    }

    const finalVpScore = Math.max(0, Math.min(100, Math.round(vpScore)));

    return {
      viewport: viewportType,
      width: viewport.width,
      height: viewport.height,
      score: finalVpScore,
      issues,
      capture,
      layoutMetrics: {
        totalElements: nonRootNodes.length,
        overflowCount: overflowingElements.length,
        overlapCount,
        alignmentAnomalyCount,
        maxHorizontalSpan: capture.scrollWidth,
      },
    };
  }

  private checkIntersection(a: BoundingBox, b: BoundingBox): boolean {
    return !(
      a.x + a.width <= b.x ||
      b.x + b.width <= a.x ||
      a.y + a.height <= b.y ||
      b.y + b.height <= a.y
    );
  }
}

export const visualIntelligenceService = new VisualIntelligenceService();
