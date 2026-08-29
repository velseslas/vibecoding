import { dbAdapter } from '../db/database';
import { DbProjectDna } from '../db/schema';
import {
  ProvenanceDecision,
  DecisionLifecycleStatus,
  DecisionSourceType,
  DecisionExplicitness,
} from '../governance/semanticGovernance';
import { logger } from '../logger';

export interface CompactProjectMemory {
  projectId: string;
  userId: string;
  dnaSummary: string;
  activeDecisions: ProvenanceDecision[];
  allDecisions: ProvenanceDecision[];
  recentSummary: string;
  totalVersionsCount: number;
  lastUpdated: number;
}

export class ProjectMemoryService {
  private provenanceStore: Map<string, ProvenanceDecision[]> = new Map();

  /**
   * Builds an isolated, selective memory view for a project and user
   */
  public getProjectMemory(projectId: string, userId = 'usr_admin_001'): CompactProjectMemory {
    const project = dbAdapter.getProjectById(projectId);
    const dna = dbAdapter.getProjectDna(projectId);
    const versions = dbAdapter.getProjectVersions(projectId);

    const storedDecisions = this.provenanceStore.get(projectId) || [];

    // Also reconcile with DNA decisions if any
    const allDecisions: ProvenanceDecision[] = [...storedDecisions];
    if (dna && dna.decisions) {
      for (const d of dna.decisions) {
        if (!allDecisions.some((existing) => existing.id === d.id)) {
          allDecisions.push({
            id: d.id,
            projectId,
            topic: d.category,
            decision: d.decision,
            rationale: d.rationale,
            source: 'Application DNA Initial',
            sourceType: 'SYSTEM',
            explicitOrImplicit: 'EXPLICIT',
            impactLevel: 'MEDIUM',
            status: 'ACTIVE',
            timestamp: d.timestamp,
          });
        }
      }
    }

    const activeDecisions = allDecisions.filter((d) => d.status === 'ACTIVE');

    const dnaSummary = dna
      ? `Stack: ${dna.techStack.framework} | Styling: ${dna.techStack.styling} | Rules: ${dna.rules.length}`
      : 'DNA standard Vanilla Tailwind';

    return {
      projectId,
      userId,
      dnaSummary,
      activeDecisions,
      allDecisions,
      recentSummary: project?.description || 'Application web interactive',
      totalVersionsCount: versions.length,
      lastUpdated: project?.updatedAt || Date.now(),
    };
  }

  /**
   * Adds a structured decision to project memory with full provenance metadata
   */
  public recordDecision(
    projectId: string,
    topic: string,
    decisionText: string,
    rationale: string,
    options?: {
      source?: string;
      sourceType?: DecisionSourceType;
      explicitOrImplicit?: DecisionExplicitness;
      impactLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      supersedesId?: string;
    }
  ): ProvenanceDecision {
    let dna = dbAdapter.getProjectDna(projectId);
    if (!dna) {
      dna = {
        projectId,
        techStack: {
          framework: 'Modern Vanilla',
          styling: 'Tailwind CSS',
          iconLibrary: 'Lucide Icons',
          stateManager: 'LocalStorage',
          apiConventions: 'RESTful',
        },
        architecture: 'SPA',
        namingConventions: ['camelCase'],
        patterns: ['Single File Component'],
        rules: ['Tailwind CSS obligatoire'],
        decisions: [],
        updatedAt: Date.now(),
      };
    }

    const decId = 'dec_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 5);

    const newDecision: ProvenanceDecision = {
      id: decId,
      projectId,
      topic,
      decision: decisionText,
      rationale,
      source: options?.source || (options?.sourceType === 'USER' ? 'Utilisateur (Prompt Direct)' : 'AI Orchestrator'),
      sourceType: options?.sourceType || 'AI',
      explicitOrImplicit: options?.explicitOrImplicit || 'EXPLICIT',
      impactLevel: options?.impactLevel || 'LOW',
      status: 'ACTIVE',
      supersedesId: options?.supersedesId,
      timestamp: Date.now(),
    };

    let list = this.provenanceStore.get(projectId) || [];

    // If supersedes an old decision, mark old as SUPERSEDED
    if (options?.supersedesId) {
      list = list.map((d) => {
        if (d.id === options.supersedesId) {
          return {
            ...d,
            status: 'SUPERSEDED' as DecisionLifecycleStatus,
            supersededById: decId,
          };
        }
        return d;
      });
    }

    list.push(newDecision);
    this.provenanceStore.set(projectId, list);

    // Synchronize into DNA
    dna.decisions.push({
      id: decId,
      decision: decisionText,
      rationale,
      category: topic,
      timestamp: Date.now(),
    });
    dna.updatedAt = Date.now();
    dbAdapter.saveProjectDna(dna);

    logger.info(
      'ProjectMemory',
      `Saved [${newDecision.sourceType}] decision for ${projectId}: [${topic}] ${decisionText} (Status: ACTIVE)`
    );

    return newDecision;
  }

  /**
   * Explicitly updates the lifecycle status of a decision (e.g. SUPERSEDED, ARCHIVED, REVOKED)
   */
  public updateDecisionStatus(
    projectId: string,
    decisionId: string,
    status: DecisionLifecycleStatus,
    supersededById?: string
  ): boolean {
    const list = this.provenanceStore.get(projectId) || [];
    let updated = false;

    const newList = list.map((d) => {
      if (d.id === decisionId) {
        updated = true;
        return {
          ...d,
          status,
          supersededById: supersededById || d.supersededById,
        };
      }
      return d;
    });

    if (updated) {
      this.provenanceStore.set(projectId, newList);
      logger.info('ProjectMemory', `Updated decision ${decisionId} status to ${status}`);
    }

    return updated;
  }

  /**
   * Formats selective context for LLM prompt injection (only active decisions)
   */
  public formatContextForPrompt(projectId: string): string {
    const memory = this.getProjectMemory(projectId);
    if (memory.activeDecisions.length === 0) {
      return `### MÉMOIRE DU PROJET\n- Statut : Nouveau projet (${memory.dnaSummary})`;
    }

    const decisionList = memory.activeDecisions
      .map((d) => `- [${d.topic}] (${d.sourceType}) ${d.decision} (Raison: ${d.rationale})`)
      .join('\n');

    return `### MÉMOIRE DU PROJET & DÉCISIONS ARCHITECTURALES ACTIVES\n${decisionList}`;
  }
}

export const projectMemoryService = new ProjectMemoryService();
