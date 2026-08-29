export interface DesignIssue {
  category: 'SPACING' | 'TYPOGRAPHY' | 'COLOR' | 'ACCESSIBILITY' | 'RESPONSIVENESS' | 'SEMANTICS';
  severity: 'INFO' | 'WARNING' | 'ERROR';
  description: string;
  elementSelector?: string;
  suggestedFix: string;
}

export interface DesignHarmonyReport {
  overallScore: number; // 0 to 100
  passed: boolean;
  spacingScore: number;
  typographyScore: number;
  colorScore: number;
  accessibilityScore: number;
  responsivenessScore: number;
  issues: DesignIssue[];
  summary: string;
}

export class DesignHarmonyAuditService {
  /**
   * Evaluates the visual design harmony, spacing, typography, and accessibility of generated HTML
   */
  public auditDesign(html: string): DesignHarmonyReport {
    const issues: DesignIssue[] = [];
    let spacingScore = 100;
    let typographyScore = 100;
    let colorScore = 100;
    let accessibilityScore = 100;
    let responsivenessScore = 100;

    if (!html || html.length < 50) {
      return {
        overallScore: 0,
        passed: false,
        spacingScore: 0,
        typographyScore: 0,
        colorScore: 0,
        accessibilityScore: 0,
        responsivenessScore: 0,
        issues: [
          {
            category: 'SEMANTICS',
            severity: 'ERROR',
            description: 'Contenu HTML vide ou tronqué.',
            suggestedFix: 'Générer un template complet avec structure HTML5.',
          },
        ],
        summary: 'Audit échoué : aucun document HTML exploitable.',
      };
    }

    // 1. Spacing Audit
    const hasArbitrarySpacing = /p-\[\d+px\]|m-\[\d+px\]|gap-\[\d+px\]/.test(html);
    if (hasArbitrarySpacing) {
      spacingScore -= 15;
      issues.push({
        category: 'SPACING',
        severity: 'WARNING',
        description: 'Utilisation d\'espacements arbitraires en pixels (ex: p-[17px]) au lieu de l\'échelle standard Tailwind.',
        suggestedFix: 'Remplacer les valeurs arbitraires par les paliers de l\'échelle Tailwind (p-4, p-6, gap-4).',
      });
    }

    // Outer container padding check
    if (!html.includes('p-4') && !html.includes('p-6') && !html.includes('p-8') && !html.includes('px-6')) {
      spacingScore -= 10;
      issues.push({
        category: 'SPACING',
        severity: 'WARNING',
        description: 'Padding de conteneur externe insuffisant (< 16px).',
        suggestedFix: 'Ajouter au conteneur principal une classe de padding généreuse comme p-6 ou px-6 py-4.',
      });
    }

    // 2. Typography Audit
    const hasH1 = /<h1[\s>]/i.test(html);
    const hasH2 = /<h2[\s>]/i.test(html);
    const hasH3 = /<h3[\s>]/i.test(html);

    if (hasH3 && !hasH2 && hasH1) {
      typographyScore -= 15;
      issues.push({
        category: 'TYPOGRAPHY',
        severity: 'WARNING',
        description: 'Saut hiérarchique direct de H1 à H3 sans balise H2 intermédiaire.',
        suggestedFix: 'Restructurer les titres en respectant l\'ordre sémantique H1 -> H2 -> H3.',
      });
    }

    if (!html.includes('font-sans') && !html.includes('font-serif') && !html.includes('font-mono')) {
      typographyScore -= 5;
      issues.push({
        category: 'TYPOGRAPHY',
        severity: 'INFO',
        description: 'Famille de police non explicitée sur le body.',
        suggestedFix: 'Ajouter font-sans sur la balise <body> pour assurer une lisibilité optimale.',
      });
    }

    // 3. Color & Contrast Harmony
    const hasPureBlackBg = /bg-black\b|bg-#000000/.test(html);
    const hasPureWhiteOnBlack = hasPureBlackBg && /text-white\b/.test(html);
    if (hasPureWhiteOnBlack) {
      colorScore -= 10;
      issues.push({
        category: 'COLOR',
        severity: 'INFO',
        description: 'Contraste ultra-dur Noir pur (#000) et Blanc pur (#FFF).',
        suggestedFix: 'Utiliser des nuances neutres enrichies (bg-slate-900 / text-slate-100) pour un rendu visuel plus sophistiqué.',
      });
    }

    // Check for banned gradient slop text
    if (/bg-gradient-to-r.*bg-clip-text.*text-transparent/i.test(html)) {
      colorScore -= 10;
      issues.push({
        category: 'COLOR',
        severity: 'WARNING',
        description: 'Dégradé de texte générique détecté.',
        suggestedFix: 'Préférer une couleur typographique solide à fort contraste avec nuance d\'accentuation.',
      });
    }

    // 4. Accessibility Audit
    const inputMatches = html.match(/<input[\s\S]*?>/gi) || [];
    for (const input of inputMatches) {
      const hasPlaceholder = /placeholder=/i.test(input);
      const hasAriaLabel = /aria-label=/i.test(input);
      const hasId = /id=/i.test(input);

      if (!hasPlaceholder && !hasAriaLabel && !hasId) {
        accessibilityScore -= 10;
        issues.push({
          category: 'ACCESSIBILITY',
          severity: 'WARNING',
          description: 'Champ de saisie <input> sans identifiant, placeholder ni aria-label.',
          suggestedFix: 'Ajouter un id, placeholder ou aria-label sur tous les champs interactifs.',
        });
        break;
      }
    }

    // Button touch target minimum check
    const buttonMatches = html.match(/<button[\s\S]*?>/gi) || [];
    for (const btn of buttonMatches) {
      if (btn.includes('p-0') || (btn.includes('text-[8px]') && !btn.includes('py-'))) {
        accessibilityScore -= 5;
        issues.push({
          category: 'ACCESSIBILITY',
          severity: 'INFO',
          description: 'Bouton avec cible de clic potentiellement trop petite sur mobile.',
          suggestedFix: 'S\'assurer d\'une zone de clic minimale de 44px (py-2 px-4).',
        });
        break;
      }
    }

    // 5. Responsiveness Audit
    if (!html.includes('viewport')) {
      responsivenessScore -= 25;
      issues.push({
        category: 'RESPONSIVENESS',
        severity: 'ERROR',
        description: 'Balise <meta name="viewport"> absente du <head>.',
        suggestedFix: 'Ajouter <meta name="viewport" content="width=device-width, initial-scale=1.0">.',
      });
    }

    if (!html.includes('md:') && !html.includes('sm:') && !html.includes('lg:')) {
      responsivenessScore -= 10;
      issues.push({
        category: 'RESPONSIVENESS',
        severity: 'INFO',
        description: 'Absence de modificateurs responsifs Tailwind (sm:, md:, lg:) pour l\'adaptation multi-écrans.',
        suggestedFix: 'Ajouter des grilles fluides comme grid-cols-1 md:grid-cols-3 et max-w-7xl mx-auto.',
      });
    }

    // Compute overall score
    const overallScore = Math.max(
      0,
      Math.round(
        spacingScore * 0.25 +
        typographyScore * 0.2 +
        colorScore * 0.2 +
        accessibilityScore * 0.2 +
        responsivenessScore * 0.15
      )
    );

    const passed = overallScore >= 80 && !issues.some((i) => i.severity === 'ERROR');

    const summary = passed
      ? `Audit Harmonie & Design conforme (Score: ${overallScore}/100) — Spacing: ${spacingScore}%, Typography: ${typographyScore}%, Color: ${colorScore}%, Accessibility: ${accessibilityScore}%, Responsiveness: ${responsivenessScore}%.`
      : `Audit Harmonie & Design requiert des ajustements (Score: ${overallScore}/100) — ${issues.length} observation(s) relevée(s).`;

    return {
      overallScore,
      passed,
      spacingScore,
      typographyScore,
      colorScore,
      accessibilityScore,
      responsivenessScore,
      issues,
      summary,
    };
  }
}

export const designHarmonyAuditService = new DesignHarmonyAuditService();
