import { dbAdapter } from './db/database';
import { projectIntelligence } from './versioning/projectIntelligence';
import { logger } from './logger';

export interface ProjectData {
  id: string;
  title: string;
  description: string;
  vibe: string;
  html: string;
  files: Array<{ name: string; type: string; content: string }>;
  components: Array<{ name: string; description: string }>;
  suggestedPrompts: string[];
  createdAt: number;
  updatedAt: number;
  history?: Array<{
    id: string;
    version: number;
    summary: string;
    date: number;
  }>;
}

class EnterpriseProjectStore {
  public getAll(userId?: string): ProjectData[] {
    const list = dbAdapter.getProjects(userId);
    return list.map((p) => this.toProjectData(p));
  }

  public getById(id: string): ProjectData | undefined {
    const p = dbAdapter.getProjectById(id);
    if (!p) return undefined;
    return this.toProjectData(p);
  }

  public saveProject(data: Partial<ProjectData> & { id?: string }): ProjectData {
    const projectId = data.id || 'proj_' + Math.random().toString(36).substring(2, 9);
    const existing = dbAdapter.getProjectById(projectId);

    const saved = dbAdapter.saveProject(
      {
        id: projectId,
        title: data.title || existing?.title || 'Mon Application',
        description: data.description || existing?.description || '',
        vibe: data.vibe || existing?.vibe || 'modern-saas',
        createdAt: existing?.createdAt || Date.now(),
      },
      {
        summary: existing ? 'Mise à jour des fichiers & composants' : 'Création initiale du projet',
        source: 'user',
        htmlSnapshot: data.html || existing?.currentVersion?.htmlSnapshot || '',
        filesSnapshot: data.files || existing?.currentVersion?.filesSnapshot || [],
        componentsSnapshot: data.components || existing?.currentVersion?.componentsSnapshot || [],
        suggestedPrompts: data.suggestedPrompts || existing?.currentVersion?.suggestedPrompts || [],
      }
    );

    return this.toProjectData(saved);
  }

  public forkProject(id: string, newTitle?: string): ProjectData | null {
    const source = dbAdapter.getProjectById(id);
    if (!source) return null;

    const newId = 'proj_' + Math.random().toString(36).substring(2, 9);
    const saved = dbAdapter.saveProject(
      {
        id: newId,
        title: newTitle || `${source.title} (Copie)`,
        description: source.description,
        vibe: source.vibe,
        createdAt: Date.now(),
      },
      {
        summary: `Cloné depuis ${source.title}`,
        source: 'system',
        htmlSnapshot: source.currentVersion?.htmlSnapshot || '',
        filesSnapshot: source.currentVersion?.filesSnapshot || [],
        componentsSnapshot: source.currentVersion?.componentsSnapshot || [],
        suggestedPrompts: source.currentVersion?.suggestedPrompts || [],
      }
    );

    logger.info('ProjectStore', `Forked project ${id} to ${newId}`);
    return this.toProjectData(saved);
  }

  public deleteProject(id: string): boolean {
    return dbAdapter.softDeleteProject(id);
  }

  private toProjectData(p: any): ProjectData {
    const ver = p.currentVersion;
    const versions = dbAdapter.getProjectVersions(p.id);

    return {
      id: p.id,
      title: p.title,
      description: p.description,
      vibe: p.vibe,
      html: ver?.htmlSnapshot || '',
      files: ver?.filesSnapshot || [
        { name: 'index.html', type: 'html', content: ver?.htmlSnapshot || '' },
      ],
      components: ver?.componentsSnapshot || [],
      suggestedPrompts: ver?.suggestedPrompts || [],
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      history: versions.map((v) => ({
        id: v.id,
        version: v.versionNumber,
        summary: v.summary,
        date: v.createdAt,
      })),
    };
  }
}

export const projectStore = new EnterpriseProjectStore();
