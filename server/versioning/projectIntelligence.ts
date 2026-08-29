import crypto from 'crypto';
import { dbAdapter } from '../db/database';
import { DbProjectVersion } from '../db/schema';
import { validatedArtifactEngine, Changeset, ValidatedArtifact, VerificationResult } from '../artifacts/validatedArtifact';
import { logger } from '../logger';

export interface SemanticDiff {
  file: string;
  type: 'added' | 'modified' | 'deleted' | 'unchanged';
  linesChanged: number;
}

export interface RollbackResult {
  version: DbProjectVersion;
  sourceVersion: DbProjectVersion;
  activeVersionBeforeRollback?: DbProjectVersion;
  reversionChangeset: Changeset;
  reversionArtifact: ValidatedArtifact;
  verification: VerificationResult;
}

export class ProjectIntelligenceService {
  public computeFileDiffs(prevFiles: any[], newFiles: any[]): SemanticDiff[] {
    const diffs: SemanticDiff[] = [];
    const prevMap = new Map(prevFiles.map((f) => [f.name, f.content]));
    const newMap = new Map(newFiles.map((f) => [f.name, f.content]));

    for (const [name, content] of newMap.entries()) {
      if (!prevMap.has(name)) {
        diffs.push({ file: name, type: 'added', linesChanged: (content || '').split('\n').length });
      } else if (prevMap.get(name) !== content) {
        diffs.push({ file: name, type: 'modified', linesChanged: 10 });
      } else {
        diffs.push({ file: name, type: 'unchanged', linesChanged: 0 });
      }
    }

    for (const name of prevMap.keys()) {
      if (!newMap.has(name)) {
        diffs.push({ file: name, type: 'deleted', linesChanged: 0 });
      }
    }

    return diffs;
  }

  public createRevision(
    projectId: string,
    data: {
      summary: string;
      source: 'user' | 'ai' | 'system';
      userIntent?: string;
      aiPrompt?: string;
      html: string;
      files: any[];
      components?: any[];
      suggestedPrompts?: string[];
      authorId?: string;
    }
  ): DbProjectVersion {
    let project = dbAdapter.getProjectById(projectId);
    if (!project) {
      const saved = dbAdapter.saveProject(
        {
          id: projectId,
          userId: data.authorId || 'usr_admin_001',
          title: 'Nouveau Projet Vibecoding',
          description: data.summary,
          vibe: 'Modern',
        },
        {
          summary: data.summary,
          source: data.source,
          userIntent: data.userIntent,
          aiPrompt: data.aiPrompt,
          htmlSnapshot: data.html,
          filesSnapshot: data.files,
          componentsSnapshot: data.components,
          suggestedPrompts: data.suggestedPrompts,
        }
      );
      logger.info('ProjectIntelligence', `Initialized new project ${projectId} with version #1`);
      return saved.currentVersion!;
    }

    const saved = dbAdapter.saveProject(
      { id: projectId },
      {
        summary: data.summary,
        source: data.source,
        userIntent: data.userIntent,
        aiPrompt: data.aiPrompt,
        htmlSnapshot: data.html,
        filesSnapshot: data.files,
        componentsSnapshot: data.components,
        suggestedPrompts: data.suggestedPrompts,
      }
    );

    logger.info('ProjectIntelligence', `Created version #${saved.currentVersion?.versionNumber} on project ${projectId}`);
    return saved.currentVersion!;
  }

  public getHistory(projectId: string): DbProjectVersion[] {
    return dbAdapter.getProjectVersions(projectId);
  }

  public rollback(
    projectId: string,
    versionId: string,
    authorId = 'usr_admin_001',
    reason: 'USER_ROLLBACK' | 'SYSTEM_RESTORE' = 'USER_ROLLBACK'
  ): RollbackResult | null {
    const history = this.getHistory(projectId);
    const activeVersion = history[0];
    const sourceVersion = history.find((v) => v.id === versionId);

    if (!sourceVersion) {
      logger.error('ProjectIntelligence', `Target version ${versionId} not found for rollback on project ${projectId}`);
      return null;
    }

    const restoredVersion = dbAdapter.rollbackToVersion(projectId, versionId, authorId);
    if (!restoredVersion) return null;

    // Create formal Reversion Changeset & Validated Artifact
    const restoredFiles = restoredVersion.filesSnapshot || [{ name: 'index.html', content: restoredVersion.htmlSnapshot }];
    const reversionArtifactResult = validatedArtifactEngine.createReversionChangeset({
      projectId,
      sourceVersionId: sourceVersion.id,
      sourceVersionNumber: sourceVersion.versionNumber,
      activeVersionBeforeRollbackId: activeVersion?.id,
      activeVersionBeforeRollbackNumber: activeVersion?.versionNumber,
      newVersionId: restoredVersion.id,
      newVersionNumber: restoredVersion.versionNumber,
      restoredHtml: restoredVersion.htmlSnapshot,
      restoredFiles,
      reason,
      actor: authorId,
      rationale: `Restauration de la version #${sourceVersion.versionNumber} vers la nouvelle version #${restoredVersion.versionNumber}`,
    });

    return {
      version: restoredVersion,
      sourceVersion,
      activeVersionBeforeRollback: activeVersion,
      reversionChangeset: reversionArtifactResult.reversionChangeset,
      reversionArtifact: reversionArtifactResult.reversionArtifact,
      verification: reversionArtifactResult.verification,
    };
  }
}

export const projectIntelligence = new ProjectIntelligenceService();

