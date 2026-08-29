import crypto from 'crypto';
import { BenchmarkTestCase, IntelligenceIncident, BenchmarkCaseStatus } from './bugIntelligenceTypes';
import { logger } from '../logger';

export class BenchmarkEvolutionRegistry {
  private testCases: Map<string, BenchmarkTestCase> = new Map();

  constructor() {
    this.seedInitialBenchmarkCases();
  }

  private seedInitialBenchmarkCases(): void {
    const defaultCases: BenchmarkTestCase[] = [
      {
        id: 'bench_lucide_missing',
        name: 'Auto-Injection CDN Lucide Icons',
        description: 'Vérifie que les balises data-lucide entraînent automatiquement l\'injection du CDN et de createIcons().',
        category: 'DEPENDENCY',
        fingerprint: 'fp_dependency_missing_dependency::lucide_icons',
        initialPrompt: 'Créer un bouton avec une icône Lucide',
        reproductionCode: '<!DOCTYPE html><html><body><i data-lucide="sparkles"></i></body></html>',
        expectedFixVerification: (html: string) =>
          html.includes('lucide@latest') && html.includes('lucide.createIcons'),
        status: 'PROMOTED',
        provenance: {
          originIncidentId: 'inc_seed_001',
          originProjectId: 'demo-saas-1',
          createdAt: Date.now() - 86400000 * 10,
          validatedAt: Date.now() - 86400000 * 9,
          promotedAt: Date.now() - 86400000 * 8,
          author: 'System Benchmark Seed',
        },
        reproducible: true,
        runsCount: 14,
        passCount: 14,
      },
      {
        id: 'bench_dom_null_guard',
        name: 'Sécurisation Écouteur DOM Null',
        description: 'Vérifie que les sélecteurs getElementById orphelins sont sécurisés avec chaînage optionnel.',
        category: 'RUNTIME',
        fingerprint: 'fp_runtime_dom_null_reference::btn_missing',
        initialPrompt: 'Attacher un écouteur sur un bouton conditionnel',
        reproductionCode: '<!DOCTYPE html><html><body><script>document.getElementById("missing-btn").addEventListener("click", () => {});</script></body></html>',
        expectedFixVerification: (html: string) =>
          html.includes('?.addEventListener') || html.includes('if (document.getElementById'),
        status: 'PROMOTED',
        provenance: {
          originIncidentId: 'inc_seed_002',
          originProjectId: 'demo-saas-1',
          createdAt: Date.now() - 86400000 * 7,
          validatedAt: Date.now() - 86400000 * 6,
          promotedAt: Date.now() - 86400000 * 5,
          author: 'System Benchmark Seed',
        },
        reproducible: true,
        runsCount: 14,
        passCount: 14,
      },
    ];

    for (const tc of defaultCases) {
      this.testCases.set(tc.id, tc);
    }
  }

  /**
   * Registers a reproducible incident as a candidate benchmark case
   */
  public registerCandidateFromIncident(
    incident: IntelligenceIncident,
    reproductionCode: string,
    verificationFn: (html: string) => boolean
  ): BenchmarkTestCase {
    const testId = 'bench_cand_' + crypto.randomBytes(4).toString('hex');
    const now = Date.now();

    const candidate: BenchmarkTestCase = {
      id: testId,
      name: `Candidat Benchmark [${incident.category}] ${incident.fingerprint.substring(0, 20)}`,
      description: `Test généré automatiquement à partir de l'incident ${incident.id} (${incident.normalizedError.errorMessage.substring(0, 40)}...)`,
      category: incident.category,
      fingerprint: incident.fingerprint,
      initialPrompt: incident.contextSnapshot.prompt || 'Action utilisateur',
      reproductionCode,
      expectedFixVerification: verificationFn,
      status: 'CANDIDATE',
      provenance: {
        originIncidentId: incident.id,
        originProjectId: incident.projectId,
        createdAt: now,
        author: 'Continuous Learning Engine',
      },
      reproducible: true,
      runsCount: 0,
      passCount: 0,
    };

    this.testCases.set(testId, candidate);
    logger.info('BenchmarkRegistry', `Created candidate benchmark case: ${testId}`);

    return candidate;
  }

  /**
   * Validates and promotes a candidate test case to the official benchmark
   */
  public promoteTestCase(testId: string, author = 'Validator / AI Governance'): BenchmarkTestCase | null {
    const tc = this.testCases.get(testId);
    if (!tc) return null;

    tc.status = 'PROMOTED';
    tc.provenance.validatedAt = Date.now();
    tc.provenance.promotedAt = Date.now();
    tc.provenance.author = author;

    logger.info('BenchmarkRegistry', `Promoted benchmark test case: ${testId}`);
    return tc;
  }

  public getTestCase(id: string): BenchmarkTestCase | undefined {
    return this.testCases.get(id);
  }

  public getActiveBenchmarkCases(): BenchmarkTestCase[] {
    return Array.from(this.testCases.values()).filter(
      (tc) => tc.status === 'PROMOTED' || tc.status === 'VALIDATED'
    );
  }

  public getAllTestCases(): BenchmarkTestCase[] {
    return Array.from(this.testCases.values());
  }

  public recordRun(testId: string, passed: boolean): void {
    const tc = this.testCases.get(testId);
    if (tc) {
      tc.runsCount++;
      if (passed) tc.passCount++;
    }
  }
}

export const benchmarkEvolutionRegistry = new BenchmarkEvolutionRegistry();
