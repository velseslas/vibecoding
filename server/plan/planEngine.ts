import crypto from 'crypto';
import { UserIntentType, RiskLevel } from '../intent/intentEngine';
import { logger } from '../logger';

export type PlanStepStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
export type PlanStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUPERSEDED'
  | 'READY'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PAUSED';

export interface PlanStep {
  id: string;
  order: number;
  label: string;
  description: string;
  status: PlanStepStatus;
  targetFile?: string;
  agentResponsible: string;
  durationMs?: number;
  error?: string;
}

export interface ExecutionPlan {
  id: string;
  decisionId: string;
  projectId: string;
  title: string;
  intent: UserIntentType;
  riskLevel: RiskLevel;
  requiresConfirmation: boolean;
  steps: PlanStep[];
  status: PlanStatus;
  createdAt: number;
  updatedAt: number;
  approvedAt?: number;
  approvedBy?: string;
  rejectionReason?: string;
  supersededBy?: string;
}

export class PlanEngine {
  private plans: Map<string, ExecutionPlan> = new Map();

  /**
   * Generates a step-by-step verifiable execution plan
   */
  public createPlan(
    projectId: string,
    intent: UserIntentType,
    prompt: string,
    riskLevel: RiskLevel,
    requiresConfirmation: boolean,
    decisionId?: string
  ): ExecutionPlan {
    const planId = 'plan_' + crypto.randomBytes(5).toString('hex');
    const stableDecisionId = decisionId || 'dec_' + crypto.randomBytes(6).toString('hex');
    const steps: PlanStep[] = [];

    // Step 1: Context & Understanding
    steps.push({
      id: 'step_1_analysis',
      order: 1,
      label: '🧠 Analyse du Contexte & Identité Projet',
      description: 'Extraction des composants existants, conventions de style et dépendances.',
      status: 'PENDING',
      agentResponsible: 'Context Agent / Application Analyst',
    });

    // Step 2: Generation or Patching
    if (intent === 'CREATE_FEATURE') {
      steps.push({
        id: 'step_2_generate',
        order: 2,
        label: '🎨 Échafaudage UI & Design System',
        description: 'Génération du HTML sémantique, des classes Tailwind et des icônes Lucide.',
        status: 'PENDING',
        targetFile: 'index.html',
        agentResponsible: 'Frontend UI Agent',
      });
      steps.push({
        id: 'step_3_logic',
        order: 3,
        label: '⚡ Implémentation de la Logique & Événements',
        description: 'Écriture du code JavaScript réactif et persistance LocalStorage.',
        status: 'PENDING',
        targetFile: 'index.html',
        agentResponsible: 'Backend & Logic Agent',
      });
    } else if (intent === 'FIX_BUG' || intent === 'PREVIEW_FIX') {
      steps.push({
        id: 'step_2_patch',
        order: 2,
        label: '🛠️ Application du Correctif Ciblé',
        description: 'Isolation du bug et correction sans altération des fonctionnalités existantes.',
        status: 'PENDING',
        targetFile: 'index.html',
        agentResponsible: 'Repair Agent',
      });
    } else {
      steps.push({
        id: 'step_2_iterate',
        order: 2,
        label: '🔄 Modification Incrémentale des Composants',
        description: `Application de la modification demandée : "${prompt.substring(0, 40)}..."`,
        status: 'PENDING',
        targetFile: 'index.html',
        agentResponsible: 'Frontend UI Agent',
      });
    }

    // Step: Static & Runtime Validation
    steps.push({
      id: `step_${steps.length + 1}_validation`,
      order: steps.length + 1,
      label: '🛡️ Contrôle Qualité, Sécurité & Sandbox CSP',
      description: 'Vérification syntaxique, conformité WAF et neutralisation des failles XSS.',
      status: 'PENDING',
      agentResponsible: 'Quality & Security Validator',
    });

    // Step: Preview Assembly & Versioning
    steps.push({
      id: `step_${steps.length + 1}_preview`,
      order: steps.length + 1,
      label: '🚀 Montage du Preview & Création de Version',
      description: 'Enregistrement de la révision dans l\'historique et synchronisation du runtime.',
      status: 'PENDING',
      agentResponsible: 'Preview Orchestrator',
    });

    const initialStatus: PlanStatus = requiresConfirmation ? 'PENDING_APPROVAL' : 'READY';

    const plan: ExecutionPlan = {
      id: planId,
      decisionId: stableDecisionId,
      projectId,
      title: `Plan d'exécution : ${intent}`,
      intent,
      riskLevel,
      requiresConfirmation,
      steps,
      status: initialStatus,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.plans.set(planId, plan);
    logger.info('PlanEngine', `Created execution plan ${planId} [Decision: ${stableDecisionId}] (Status: ${initialStatus})`);
    return plan;
  }

  /**
   * Retrieves a plan by ID
   */
  public getPlan(planId: string): ExecutionPlan | undefined {
    return this.plans.get(planId);
  }

  /**
   * Approves a plan explicitly
   */
  public approvePlan(planId: string, actor: string = 'user'): ExecutionPlan {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} introuvable.`);
    }
    if (plan.status === 'SUPERSEDED') {
      throw new Error(`Impossible d'approuver le plan obsolète ${planId}.`);
    }

    plan.status = 'APPROVED';
    plan.approvedAt = Date.now();
    plan.approvedBy = actor;
    plan.updatedAt = Date.now();
    logger.info('PlanEngine', `Plan ${planId} APPROVED by ${actor}`);
    return plan;
  }

  /**
   * Rejects a plan
   */
  public rejectPlan(planId: string, reason: string = 'Refus utilisateur'): ExecutionPlan {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} introuvable.`);
    }

    plan.status = 'REJECTED';
    plan.rejectionReason = reason;
    plan.updatedAt = Date.now();
    logger.info('PlanEngine', `Plan ${planId} REJECTED (Reason: ${reason})`);
    return plan;
  }

  /**
   * Marks a plan as superseded by a new plan
   */
  public supersedePlan(planId: string, newPlanId: string): ExecutionPlan {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} introuvable.`);
    }

    plan.status = 'SUPERSEDED';
    plan.supersededBy = newPlanId;
    plan.updatedAt = Date.now();
    logger.info('PlanEngine', `Plan ${planId} SUPERSEDED by ${newPlanId}`);
    return plan;
  }

  /**
   * Updates progress of a specific step in the plan
   */
  public updateStepStatus(
    plan: ExecutionPlan,
    stepId: string,
    status: PlanStepStatus,
    durationMs?: number,
    error?: string
  ): void {
    const step = plan.steps.find((s) => s.id === stepId);
    if (step) {
      step.status = status;
      step.durationMs = durationMs;
      step.error = error;
      plan.updatedAt = Date.now();
      logger.info('PlanEngine', `Step ${step.label} status changed to ${status}`);
    }
  }
}

export const planEngine = new PlanEngine();
