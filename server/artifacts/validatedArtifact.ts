import crypto from 'crypto';
import { logger } from '../logger';

export type ArtifactProvenance = 'USER_VALIDATED' | 'AI_GENERATED' | 'SYSTEM_AUTONOMOUS' | 'SYSTEM_REPAIR' | 'SYSTEM_REVERSION';
export type ChangesetStatus = 'pending' | 'approved' | 'rejected' | 'applied' | 'superseded';

export interface RepairDetails {
  parentChangesetId: string;
  repairAttempts: number;
  appliedFixes: string[];
  issuesDetected: string[];
  repairedAt: number;
}

export interface ReversionDetails {
  reversionId: string;
  sourceVersionId: string;
  sourceVersionNumber: number;
  activeVersionBeforeRollbackId?: string;
  activeVersionBeforeRollbackNumber?: number;
  newVersionId: string;
  newVersionNumber: number;
  reason: 'USER_ROLLBACK' | 'SYSTEM_RESTORE';
  sourceSnapshotHash: string;
  revertedAt: number;
}

export interface DecisionProvenance {
  type: 'explicit' | 'implicit';
  actor: string;
  decisionId: string;
  changesetId: string;
  autonomyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'AUTONOMOUS';
  rationale: string;
  timestamp: number;
}

export interface ChangesetFile {
  name: string;
  content: string;
  oldContent?: string;
  patch?: string;
}

export interface Changeset {
  id: string;
  decisionId: string;
  planId?: string;
  projectId: string;
  versionNumber: number;
  summary: string;
  diff: string;
  files: ChangesetFile[];
  payload: {
    html: string;
    files: Array<{ name: string; content: string }>;
  };
  sha256Hash: string;
  signature: string;
  status: ChangesetStatus;
  provenance: DecisionProvenance;
  createdAt: number;
  updatedAt: number;
  approvedAt?: number;
  approvedBy?: string;
  appliedAt?: number;
  rejectionReason?: string;
  supersededBy?: string;
  parentChangesetId?: string;
  repairDetails?: RepairDetails;
  reversionDetails?: ReversionDetails;
}

export interface ValidatedArtifact {
  id: string;
  projectId: string;
  versionNumber: number;
  planId?: string;
  title: string;
  provenance: ArtifactProvenance;
  timestamp: number;
  payload: {
    html: string;
    files: Array<{ name: string; content: string }>;
  };
  sha256Hash: string;
  signature: string;
  isValidated: boolean;
  validatedAt?: number;
  validatedBy?: string;
}

export interface VerificationResult {
  isMatch: boolean;
  expectedHash: string;
  actualHash: string;
  artifactId: string;
  error?: string;
}

export class ValidatedArtifactEngine {
  private artifacts: Map<string, ValidatedArtifact> = new Map();
  private changesets: Map<string, Changeset> = new Map();

  /**
   * Computes deterministic SHA-256 hash of payload contents
   */
  public computeHash(payload: { html: string; files: Array<{ name: string; content: string }> }): string {
    const serialized = JSON.stringify({
      html: payload.html,
      files: payload.files.map((f) => ({ name: f.name, content: f.content })),
    });
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Generates a unique, immutable changeset with cryptographic integrity hash
   */
  public generateChangeset(params: {
    projectId: string;
    decisionId?: string;
    planId?: string;
    versionNumber: number;
    summary: string;
    diff?: string;
    html: string;
    files?: ChangesetFile[];
    actor?: string;
    autonomyLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'AUTONOMOUS';
    rationale?: string;
    isAutoApproved?: boolean;
  }): Changeset {
    const changesetId = 'chg_' + crypto.randomBytes(6).toString('hex');
    const decisionId = params.decisionId || 'dec_' + crypto.randomBytes(6).toString('hex');
    const payloadFiles = params.files
      ? params.files.map((f) => ({ name: f.name, content: f.content }))
      : [{ name: 'index.html', content: params.html }];
    const payload = { html: params.html, files: payloadFiles };

    const sha256Hash = this.computeHash(payload);
    const signature = crypto.createHmac('sha256', 'vibecode_artifact_secret_v1').update(sha256Hash).digest('hex');

    const status: ChangesetStatus = params.isAutoApproved ? 'approved' : 'pending';
    const provenanceType: 'explicit' | 'implicit' = params.isAutoApproved ? 'implicit' : 'explicit';

    const changeset: Changeset = {
      id: changesetId,
      decisionId,
      planId: params.planId,
      projectId: params.projectId,
      versionNumber: params.versionNumber,
      summary: params.summary,
      diff: params.diff || `+ Modification de ${payloadFiles.length} fichier(s)`,
      files: params.files || [{ name: 'index.html', content: params.html }],
      payload,
      sha256Hash,
      signature,
      status,
      provenance: {
        type: provenanceType,
        actor: params.actor || (params.isAutoApproved ? 'system_autonomous_engine' : 'user'),
        decisionId,
        changesetId,
        autonomyLevel: params.autonomyLevel || (params.isAutoApproved ? 'AUTONOMOUS' : 'LOW'),
        rationale: params.rationale || (params.isAutoApproved ? 'Approbation implicite par moteur d\'autonomie' : 'En attente de validation utilisateur'),
        timestamp: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.changesets.set(changesetId, changeset);

    // Also register backward-compatible ValidatedArtifact
    const artifact: ValidatedArtifact = {
      id: changesetId,
      projectId: params.projectId,
      versionNumber: params.versionNumber,
      planId: params.planId,
      title: params.summary,
      provenance: params.isAutoApproved ? 'SYSTEM_AUTONOMOUS' : 'USER_VALIDATED',
      timestamp: Date.now(),
      payload,
      sha256Hash,
      signature,
      isValidated: !!params.isAutoApproved,
      validatedAt: params.isAutoApproved ? Date.now() : undefined,
      validatedBy: params.actor || (params.isAutoApproved ? 'system' : undefined),
    };
    this.artifacts.set(changesetId, artifact);

    logger.info('ValidatedArtifact', `Generated changeset ${changesetId} (Status: ${status}, Hash: ${sha256Hash.substring(0, 12)}...)`);
    return changeset;
  }

  /**
   * Approves a changeset explicitly by an actor
   */
  public approveChangeset(changesetId: string, actor: string = 'user', rationale?: string): Changeset {
    const changeset = this.changesets.get(changesetId);
    if (!changeset) {
      throw new Error(`Changeset ${changesetId} introuvable.`);
    }

    if (changeset.status === 'superseded') {
      throw new Error(`Impossible d'approuver le changeset obsolète ${changesetId}. Une nouvelle révision a déjà été produite.`);
    }

    changeset.status = 'approved';
    changeset.approvedBy = actor;
    changeset.approvedAt = Date.now();
    changeset.provenance = {
      ...changeset.provenance,
      type: 'explicit',
      actor,
      rationale: rationale || 'Approbation explicite confirmée par l\'utilisateur',
      timestamp: Date.now(),
    };
    changeset.updatedAt = Date.now();

    // Sync corresponding artifact
    const artifact = this.artifacts.get(changesetId);
    if (artifact) {
      artifact.isValidated = true;
      artifact.validatedAt = Date.now();
      artifact.validatedBy = actor;
      artifact.provenance = 'USER_VALIDATED';
    }

    logger.info('ValidatedArtifact', `Changeset ${changesetId} APPROVED explicitly by ${actor}`);
    return changeset;
  }

  /**
   * Rejects a changeset with reason
   */
  public rejectChangeset(changesetId: string, actor: string = 'user', reason: string = 'Refus utilisateur'): Changeset {
    const changeset = this.changesets.get(changesetId);
    if (!changeset) {
      throw new Error(`Changeset ${changesetId} introuvable.`);
    }

    changeset.status = 'rejected';
    changeset.rejectionReason = reason;
    changeset.provenance = {
      ...changeset.provenance,
      type: 'explicit',
      actor,
      rationale: `Rejet : ${reason}`,
      timestamp: Date.now(),
    };
    changeset.updatedAt = Date.now();

    logger.info('ValidatedArtifact', `Changeset ${changesetId} REJECTED by ${actor} (Reason: ${reason})`);
    return changeset;
  }

  /**
   * Marks a changeset as superseded when a modification or regeneration is requested
   */
  public supersedeChangeset(changesetId: string, supersededById?: string, reason?: string): Changeset {
    const changeset = this.changesets.get(changesetId);
    if (!changeset) {
      throw new Error(`Changeset ${changesetId} introuvable.`);
    }

    changeset.status = 'superseded';
    changeset.supersededBy = supersededById;
    changeset.updatedAt = Date.now();

    logger.info('ValidatedArtifact', `Changeset ${changesetId} SUPERSEDED by ${supersededById || 'new_version'} (Reason: ${reason || 'Regeneration'})`);
    return changeset;
  }

  /**
   * Requests modification or regeneration: marks old changeset as superseded and generates a new one
   */
  public modifyOrRegenerateChangeset(
    oldChangesetId: string,
    newParams: {
      summary: string;
      html: string;
      files?: ChangesetFile[];
      diff?: string;
      rationale?: string;
    },
    actor: string = 'user'
  ): { oldChangeset: Changeset; newChangeset: Changeset } {
    const oldChangeset = this.changesets.get(oldChangesetId);
    if (!oldChangeset) {
      throw new Error(`Changeset source ${oldChangesetId} introuvable pour régénération.`);
    }

    // Generate new changeset requiring fresh validation
    const newChangeset = this.generateChangeset({
      projectId: oldChangeset.projectId,
      decisionId: oldChangeset.decisionId,
      planId: oldChangeset.planId,
      versionNumber: oldChangeset.versionNumber + 1,
      summary: newParams.summary,
      diff: newParams.diff || `+ Régénération/Modification depuis ${oldChangesetId}`,
      html: newParams.html,
      files: newParams.files,
      actor,
      autonomyLevel: 'LOW',
      rationale: newParams.rationale || `Régénération demandée suite à modification de ${oldChangesetId}`,
      isAutoApproved: false,
    });

    // Mark previous changeset as superseded
    this.supersedeChangeset(oldChangesetId, newChangeset.id, 'Régénération demandée');

    return { oldChangeset, newChangeset };
  }

  /**
   * Exact Application Gate:
   * STRICT GUARANTEE:
   * 1. Changeset MUST exist and be in 'approved' state.
   * 2. If 'rejected' or 'superseded', execution is hard-blocked.
   * 3. Verifies SHA-256 payload integrity hash.
   * 4. NEVER calls AI model or regenerates content.
   * 5. Returns the EXACT validated payload verbatim.
   */
  public applyChangeset(changesetId: string): {
    success: boolean;
    changeset: Changeset;
    appliedPayload: { html: string; files: Array<{ name: string; content: string }> };
  } {
    const changeset = this.changesets.get(changesetId);
    if (!changeset) {
      throw new Error(`CRITICAL INTEGRITY FAILURE: Changeset ${changesetId} introuvable.`);
    }

    if (changeset.status === 'rejected') {
      throw new Error(`CRITICAL INTEGRITY FAILURE: Impossible d'appliquer le changeset ${changesetId} car il a été explicitement REJETÉ.`);
    }

    if (changeset.status === 'superseded') {
      throw new Error(`CRITICAL INTEGRITY FAILURE: Impossible d'appliquer le changeset ${changesetId} car il est OBSOLÈTE (remplacé par ${changeset.supersededBy}).`);
    }

    if (changeset.status !== 'approved' && changeset.status !== 'applied') {
      throw new Error(`CRITICAL INTEGRITY FAILURE: Le changeset ${changesetId} n'a pas encore été approuvé (Statut actuel: ${changeset.status}).`);
    }

    // Cryptographic re-verification
    const computedHash = this.computeHash(changeset.payload);
    if (computedHash !== changeset.sha256Hash) {
      throw new Error(`CRITICAL INTEGRITY FAILURE: Altération détectée ! Le hash calculé (${computedHash}) ne correspond pas au hash validé (${changeset.sha256Hash}).`);
    }

    changeset.status = 'applied';
    changeset.appliedAt = Date.now();
    changeset.updatedAt = Date.now();

    logger.info('ValidatedArtifact', `EXACT APPLICATION of Changeset ${changesetId} (Hash: ${changeset.sha256Hash.substring(0, 12)}..., Provenance: ${changeset.provenance.type})`);

    return {
      success: true,
      changeset,
      appliedPayload: changeset.payload,
    };
  }

  /**
   * Retrieves a changeset by ID
   */
  public getChangeset(changesetId: string): Changeset | undefined {
    return this.changesets.get(changesetId);
  }

  /**
   * Retrieves all changesets for a project
   */
  public getChangesetsByProject(projectId: string): Changeset[] {
    return Array.from(this.changesets.values()).filter((c) => c.projectId === projectId);
  }

  public getProjectChangesets(projectId: string): Changeset[] {
    return this.getChangesetsByProject(projectId);
  }

  /**
   * Legacy & Backward Compatible: Creates an immutable artifact snapshot prior to application
   */
  public createArtifact(params: {
    projectId: string;
    versionNumber: number;
    planId?: string;
    title: string;
    provenance: ArtifactProvenance;
    html: string;
    files?: Array<{ name: string; content: string }>;
    validatedBy?: string;
  }): ValidatedArtifact {
    const artifactId = 'art_' + crypto.randomBytes(6).toString('hex');
    const files = params.files || [{ name: 'index.html', content: params.html }];
    const payload = { html: params.html, files };

    const sha256Hash = this.computeHash(payload);
    const signature = crypto.createHmac('sha256', 'vibecode_artifact_secret_v1').update(sha256Hash).digest('hex');

    const artifact: ValidatedArtifact = {
      id: artifactId,
      projectId: params.projectId,
      versionNumber: params.versionNumber,
      planId: params.planId,
      title: params.title,
      provenance: params.provenance,
      timestamp: Date.now(),
      payload,
      sha256Hash,
      signature,
      isValidated: true,
      validatedAt: Date.now(),
      validatedBy: params.validatedBy || 'usr_admin_001',
    };

    this.artifacts.set(artifactId, artifact);
    logger.info('ValidatedArtifact', `Created immutable validated artifact ${artifactId} (Hash: ${sha256Hash.substring(0, 12)}...)`);
    return artifact;
  }

  /**
   * Retrieves an artifact by ID
   */
  public getArtifact(artifactId: string): ValidatedArtifact | undefined {
    return this.artifacts.get(artifactId);
  }

  /**
   * Cryptographically verifies that the code to be applied matches the validated artifact verbatim
   */
  public verifyIntegrity(
    artifactId: string,
    codeToApply: { html: string; files?: Array<{ name: string; content: string }> }
  ): VerificationResult {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) {
      return {
        isMatch: false,
        expectedHash: 'UNKNOWN',
        actualHash: 'UNKNOWN',
        artifactId,
        error: `Artefact ${artifactId} introuvable dans le registre immuable.`,
      };
    }

    const files = codeToApply.files || [{ name: 'index.html', content: codeToApply.html }];
    const actualHash = this.computeHash({ html: codeToApply.html, files });
    const isMatch = actualHash === artifact.sha256Hash;

    if (!isMatch) {
      logger.error('ValidatedArtifact', `Integrity check MISMATCH for ${artifactId}! Expected: ${artifact.sha256Hash} vs Actual: ${actualHash}`);
    } else {
      logger.info('ValidatedArtifact', `Integrity check MATCH for ${artifactId}.`);
    }

    return {
      isMatch,
      expectedHash: artifact.sha256Hash,
      actualHash,
      artifactId,
      error: isMatch ? undefined : 'Violation d\'intégrité cryptographique : Le code à appliquer ne correspond pas à l\'artefact validé.',
    };
  }

  /**
   * Creates a formal repair changeset and validated artifact when auto-repair modifies code post-application.
   * Ensures cryptographic continuity: Parent Changeset -> Superseded by Repair Changeset -> Repaired Artifact Verified.
   */
  public createRepairChangeset(params: {
    parentChangesetId: string;
    repairedHtml: string;
    repairedFiles?: Array<{ name: string; content: string }>;
    repairAttempts: number;
    appliedFixes: string[];
    issuesDetected: string[];
    actor?: string;
    rationale?: string;
  }): {
    repairChangeset: Changeset;
    repairArtifact: ValidatedArtifact;
    verification: VerificationResult;
  } {
    const parentChangeset = this.changesets.get(params.parentChangesetId);
    if (!parentChangeset) {
      throw new Error(`Changeset parent ${params.parentChangesetId} introuvable pour la création du patch de réparation.`);
    }

    const payloadFiles = params.repairedFiles || [{ name: 'index.html', content: params.repairedHtml }];
    const payload = { html: params.repairedHtml, files: payloadFiles };
    const sha256Hash = this.computeHash(payload);
    const signature = crypto.createHmac('sha256', 'vibecode_artifact_secret_v1').update(sha256Hash).digest('hex');

    const repairChangesetId = 'chg_rep_' + crypto.randomBytes(6).toString('hex');
    const fixesSummary = params.appliedFixes.length > 0 ? params.appliedFixes.join(', ') : 'Correction conformité';

    const repairChangeset: Changeset = {
      id: repairChangesetId,
      decisionId: parentChangeset.decisionId,
      planId: parentChangeset.planId,
      projectId: parentChangeset.projectId,
      versionNumber: parentChangeset.versionNumber,
      summary: `[Auto-Repair Patch] ${fixesSummary}`,
      diff: `+ Patch auto-repair appliqué suite à ${params.repairAttempts} tentative(s) : ${fixesSummary}`,
      files: payloadFiles.map((f) => ({ name: f.name, content: f.content, oldContent: parentChangeset.payload.html })),
      payload,
      sha256Hash,
      signature,
      status: 'applied',
      parentChangesetId: parentChangeset.id,
      repairDetails: {
        parentChangesetId: parentChangeset.id,
        repairAttempts: params.repairAttempts,
        appliedFixes: params.appliedFixes,
        issuesDetected: params.issuesDetected,
        repairedAt: Date.now(),
      },
      provenance: {
        type: 'implicit',
        actor: params.actor || 'system_auto_repair_engine',
        decisionId: parentChangeset.decisionId,
        changesetId: repairChangesetId,
        autonomyLevel: 'AUTONOMOUS',
        rationale: params.rationale || `Patch de réparation automatique post-contrôle qualité (${fixesSummary})`,
        timestamp: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      approvedAt: Date.now(),
      approvedBy: params.actor || 'system_auto_repair_engine',
      appliedAt: Date.now(),
    };

    // Mark the parent changeset as superseded by this repair changeset
    this.supersedeChangeset(params.parentChangesetId, repairChangesetId, `Code corrigé par patch auto-repair (${fixesSummary})`);

    // Store repair changeset
    this.changesets.set(repairChangesetId, repairChangeset);

    // Register corresponding ValidatedArtifact
    const repairArtifact: ValidatedArtifact = {
      id: repairChangesetId,
      projectId: parentChangeset.projectId,
      versionNumber: parentChangeset.versionNumber,
      planId: parentChangeset.planId,
      title: repairChangeset.summary,
      provenance: 'SYSTEM_REPAIR',
      timestamp: Date.now(),
      payload,
      sha256Hash,
      signature,
      isValidated: true,
      validatedAt: Date.now(),
      validatedBy: params.actor || 'system_auto_repair_engine',
    };
    this.artifacts.set(repairChangesetId, repairArtifact);

    const verification = this.verifyIntegrity(repairChangesetId, {
      html: params.repairedHtml,
      files: payloadFiles,
    });

    logger.info(
      'ValidatedArtifact',
      `Auto-Repair Changeset ${repairChangesetId} created (Parent: ${params.parentChangesetId}, Hash: ${sha256Hash.substring(0, 12)}...)`
    );

    return {
      repairChangeset,
      repairArtifact,
      verification,
    };
  }

  /**
   * Creates a formal reversion changeset and validated artifact when a rollback occurs.
   * Ensures deterministic cryptographic tracking: Active Version -> Source Version -> New Reversion Version with Reversion Artifact.
   */
  public createReversionChangeset(params: {
    projectId: string;
    sourceVersionId: string;
    sourceVersionNumber: number;
    activeVersionBeforeRollbackId?: string;
    activeVersionBeforeRollbackNumber?: number;
    newVersionId: string;
    newVersionNumber: number;
    restoredHtml: string;
    restoredFiles?: Array<{ name: string; content: string }>;
    reason?: 'USER_ROLLBACK' | 'SYSTEM_RESTORE';
    actor?: string;
    rationale?: string;
  }): {
    reversionChangeset: Changeset;
    reversionArtifact: ValidatedArtifact;
    verification: VerificationResult;
  } {
    const payloadFiles = params.restoredFiles || [{ name: 'index.html', content: params.restoredHtml }];
    const payload = { html: params.restoredHtml, files: payloadFiles };
    const sha256Hash = this.computeHash(payload);
    const signature = crypto.createHmac('sha256', 'vibecode_artifact_secret_v1').update(sha256Hash).digest('hex');

    const reversionChangesetId = 'chg_rev_' + crypto.randomBytes(6).toString('hex');
    const decisionId = 'dec_rev_' + crypto.randomBytes(6).toString('hex');
    const reasonType = params.reason || 'USER_ROLLBACK';
    const summary = `[Rollback] Restauration exacte de la version #${params.sourceVersionNumber}`;

    const reversionChangeset: Changeset = {
      id: reversionChangesetId,
      decisionId,
      projectId: params.projectId,
      versionNumber: params.newVersionNumber,
      summary,
      diff: `+ Restauration intégrale depuis le snapshot de la version #${params.sourceVersionNumber} (Source ID: ${params.sourceVersionId})`,
      files: payloadFiles.map((f) => ({ name: f.name, content: f.content })),
      payload,
      sha256Hash,
      signature,
      status: 'applied',
      reversionDetails: {
        reversionId: reversionChangesetId,
        sourceVersionId: params.sourceVersionId,
        sourceVersionNumber: params.sourceVersionNumber,
        activeVersionBeforeRollbackId: params.activeVersionBeforeRollbackId,
        activeVersionBeforeRollbackNumber: params.activeVersionBeforeRollbackNumber,
        newVersionId: params.newVersionId,
        newVersionNumber: params.newVersionNumber,
        reason: reasonType,
        sourceSnapshotHash: sha256Hash,
        revertedAt: Date.now(),
      },
      provenance: {
        type: 'explicit',
        actor: params.actor || 'system_reversion_engine',
        decisionId,
        changesetId: reversionChangesetId,
        autonomyLevel: 'AUTONOMOUS',
        rationale: params.rationale || `Restauration déterministe vers la version #${params.sourceVersionNumber}`,
        timestamp: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      approvedAt: Date.now(),
      approvedBy: params.actor || 'system_reversion_engine',
      appliedAt: Date.now(),
    };

    // Store reversion changeset
    this.changesets.set(reversionChangesetId, reversionChangeset);

    // Register corresponding ValidatedArtifact
    const reversionArtifact: ValidatedArtifact = {
      id: reversionChangesetId,
      projectId: params.projectId,
      versionNumber: params.newVersionNumber,
      title: summary,
      provenance: 'SYSTEM_REVERSION',
      timestamp: Date.now(),
      payload,
      sha256Hash,
      signature,
      isValidated: true,
      validatedAt: Date.now(),
      validatedBy: params.actor || 'system_reversion_engine',
    };
    this.artifacts.set(reversionChangesetId, reversionArtifact);

    const verification = this.verifyIntegrity(reversionChangesetId, {
      html: params.restoredHtml,
      files: payloadFiles,
    });

    logger.info(
      'ValidatedArtifact',
      `Reversion Changeset ${reversionChangesetId} created (Source: v#${params.sourceVersionNumber}, New: v#${params.newVersionNumber}, Hash: ${sha256Hash.substring(0, 12)}...)`
    );

    return {
      reversionChangeset,
      reversionArtifact,
      verification,
    };
  }
}

export const validatedArtifactEngine = new ValidatedArtifactEngine();
