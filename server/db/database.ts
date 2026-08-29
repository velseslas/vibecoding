import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  DbUser, 
  DbProject, 
  DbProjectFile, 
  DbProjectVersion, 
  DbJobRecord, 
  DbInvoice, 
  DbIdempotencyRecord, 
  DbSecurityLog,
  DbPreviewSession,
  DbConversation,
  DbProjectDna,
  DbProjectLearningMetrics
} from './schema';
import { logger } from '../logger';

export interface DatabaseState {
  users: Record<string, DbUser>;
  projects: Record<string, DbProject>;
  projectFiles: Record<string, DbProjectFile>;
  projectVersions: Record<string, DbProjectVersion>;
  jobs: Record<string, DbJobRecord>;
  invoices: Record<string, DbInvoice>;
  idempotency: Record<string, DbIdempotencyRecord>;
  securityLogs: Record<string, DbSecurityLog>;
  previews: Record<string, DbPreviewSession>;
  conversations: Record<string, DbConversation>;
  dna: Record<string, DbProjectDna>;
  learningMetrics: Record<string, DbProjectLearningMetrics>;
}

export class DatabaseAdapter {
  private state: DatabaseState = {
    users: {},
    projects: {},
    projectFiles: {},
    projectVersions: {},
    jobs: {},
    invoices: {},
    idempotency: {},
    securityLogs: {},
    previews: {},
    conversations: {},
    dna: {},
    learningMetrics: {},
  };

  private storageFile: string;
  private isPersisting = false;
  private hasPendingWrite = false;
  private pendingResolvers: Array<() => void> = [];

  constructor(storageFilename = '.enterprise_db.json') {
    this.storageFile = path.join(process.cwd(), storageFilename);
    this.init();
  }

  private sanitizeJson(jsonStr: string): string {
    let inString = false;
    let isEscaped = false;
    let result = '';

    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];
      const code = jsonStr.charCodeAt(i);

      if (inString) {
        if (isEscaped) {
          result += char;
          isEscaped = false;
        } else if (char === '\\') {
          result += char;
          isEscaped = true;
        } else if (char === '"') {
          result += char;
          inString = false;
        } else if (code < 32) {
          if (char === '\n') {
            result += '\\n';
          } else if (char === '\r') {
            result += '\\r';
          } else if (char === '\t') {
            result += '\\t';
          } else if (char === '\b') {
            result += '\\b';
          } else if (char === '\f') {
            result += '\\f';
          } else {
            result += `\\u${code.toString(16).padStart(4, '0')}`;
          }
        } else {
          result += char;
        }
      } else {
        if (char === '"') {
          inString = true;
        }
        result += char;
      }
    }

    return result;
  }

  private robustParseJson(raw: string): any {
    try {
      return JSON.parse(raw);
    } catch {
      const sanitized = this.sanitizeJson(raw);
      return JSON.parse(sanitized);
    }
  }

  private init() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, 'utf-8');
        const parsed = this.robustParseJson(raw);
        this.state = {
          users: parsed.users || {},
          projects: parsed.projects || {},
          projectFiles: parsed.projectFiles || {},
          projectVersions: parsed.projectVersions || {},
          jobs: parsed.jobs || {},
          invoices: parsed.invoices || {},
          idempotency: parsed.idempotency || {},
          securityLogs: parsed.securityLogs || {},
          previews: parsed.previews || {},
          conversations: parsed.conversations || {},
          dna: parsed.dna || {},
          learningMetrics: parsed.learningMetrics || {},
        };
        logger.info('Database', `Successfully mounted database with ${Object.keys(this.state.projects).length} projects`);
      } else {
        this.seedInitialData();
      }
    } catch (err: any) {
      logger.warn('Database', 'Unable to parse database file on disk, preserving backup and initializing seed data', {
        error: err.message,
      });
      try {
        if (fs.existsSync(this.storageFile)) {
          const backupPath = `${this.storageFile}.bak.${Date.now()}`;
          fs.copyFileSync(this.storageFile, backupPath);
        }
      } catch (backupErr) {
        // ignore backup error
      }
      this.seedInitialData();
    }
  }

  private seedInitialData() {
    const adminUser: DbUser = {
      id: 'usr_admin_001',
      uid: 'usr_admin_001',
      email: 'noubaschool@gmail.com',
      name: 'Creator Studio Pro',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: 'admin',
      plan: 'pro',
      tokenBalance: 500000,
      createdAt: Date.now() - 30 * 86400000,
      updatedAt: Date.now(),
    };
    this.state.users[adminUser.id] = adminUser;

    const demoProject: DbProject = {
      id: 'demo-saas-1',
      userId: adminUser.id,
      title: 'Analytics Dashboard Pro',
      description: 'Tableau de bord SaaS avec graphiques et métriques en temps réel',
      vibe: 'modern-saas',
      isDeleted: false,
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now(),
    };
    this.state.projects[demoProject.id] = demoProject;

    const initialVersion: DbProjectVersion = {
      id: 'ver_init_demo_1',
      projectId: demoProject.id,
      branch: 'main',
      versionNumber: 1,
      summary: 'Version initiale générée par le studio',
      authorId: adminUser.id,
      source: 'system',
      userIntent: 'Initial SaaS template dashboard',
      htmlSnapshot: '',
      filesSnapshot: [
        { name: 'index.html', type: 'html', content: '' },
        { name: 'app.js', type: 'javascript', content: '' }
      ],
      componentsSnapshot: [
        { name: 'MetricCards', description: 'Affichage des KPI clés' },
        { name: 'RevenueChart', description: 'Graphique de revenus interactif' }
      ],
      suggestedPrompts: ['Ajouter un filtre par date', 'Exporter les données en CSV'],
      createdAt: demoProject.createdAt,
    };
    this.state.projectVersions[initialVersion.id] = initialVersion;
    demoProject.currentVersionId = initialVersion.id;

    this.persist();
  }

  public persist(): Promise<void> {
    return new Promise((resolve) => {
      this.pendingResolvers.push(resolve);

      if (this.isPersisting) {
        this.hasPendingWrite = true;
        return;
      }

      this.flushToDisk();
    });
  }

  private flushToDisk(): void {
    if (process.env.NODE_ENV === 'test' || process.env.VIBE_TEST_FAST === 'true') {
      const currentResolvers = this.pendingResolvers;
      this.pendingResolvers = [];
      currentResolvers.forEach((res) => res());
      return;
    }

    this.isPersisting = true;
    this.hasPendingWrite = false;

    try {
      const tmpFile = `${this.storageFile}.tmp.${Date.now()}`;
      const raw = JSON.stringify(this.state);
      fs.writeFileSync(tmpFile, raw, 'utf-8');
      fs.renameSync(tmpFile, this.storageFile); // Atomic replace
    } catch (err) {
      logger.error('Database', 'Atomic persistence write failed', err);
    } finally {
      this.isPersisting = false;
      const currentResolvers = this.pendingResolvers;
      this.pendingResolvers = [];
      currentResolvers.forEach((res) => res());

      if (this.hasPendingWrite) {
        this.flushToDisk();
      }
    }
  }

  // --- Transactions ---
  public async transaction<T>(fn: (tx: DatabaseAdapter) => Promise<T>): Promise<T> {
    // Clone state snapshot for rollback isolation
    const backup = JSON.parse(JSON.stringify(this.state));
    try {
      const result = await fn(this);
      await this.persist();
      return result;
    } catch (err) {
      logger.warn('Database', 'Transaction failed, rolling back changes', { error: String(err) });
      this.state = backup;
      throw err;
    }
  }

  // --- Users Repository ---
  public getUserById(id: string): DbUser | undefined {
    return this.state.users[id];
  }

  public getUserByEmail(email: string): DbUser | undefined {
    return Object.values(this.state.users).find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public upsertUser(user: Partial<DbUser> & { id: string; email: string }): DbUser {
    const existing = this.state.users[user.id] || this.getUserByEmail(user.email);
    const updated: DbUser = {
      id: user.id || existing?.id || 'usr_' + crypto.randomBytes(4).toString('hex'),
      uid: user.uid || existing?.uid || user.id,
      email: user.email,
      name: user.name || existing?.name || user.email.split('@')[0],
      avatar: user.avatar || existing?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.email)}`,
      role: user.role || existing?.role || 'creator',
      plan: user.plan || existing?.plan || 'pro',
      tokenBalance: user.tokenBalance !== undefined ? user.tokenBalance : (existing?.tokenBalance ?? 100000),
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    this.state.users[updated.id] = updated;
    this.persist();
    return updated;
  }

  public updateUserTokens(userId: string, deltaTokens: number): DbUser | null {
    const user = this.state.users[userId];
    if (!user) return null;
    user.tokenBalance = Math.max(0, user.tokenBalance + deltaTokens);
    user.updatedAt = Date.now();
    this.persist();
    return user;
  }

  // --- Projects Repository ---
  public getProjects(userId?: string): (DbProject & { currentVersion?: DbProjectVersion })[] {
    const list = Object.values(this.state.projects)
      .filter((p) => !p.isDeleted)
      .filter((p) => !userId || p.userId === userId || p.userId === 'usr_admin_001')
      .sort((a, b) => b.updatedAt - a.updatedAt);

    return list.map((p) => ({
      ...p,
      currentVersion: p.currentVersionId ? this.state.projectVersions[p.currentVersionId] : undefined,
    }));
  }

  public getProjectById(id: string): (DbProject & { currentVersion?: DbProjectVersion }) | undefined {
    const p = this.state.projects[id];
    if (!p || p.isDeleted) return undefined;
    return {
      ...p,
      currentVersion: p.currentVersionId ? this.state.projectVersions[p.currentVersionId] : undefined,
    };
  }

  public saveProject(project: Partial<DbProject> & { id: string }, versionData?: Partial<DbProjectVersion>): DbProject & { currentVersion?: DbProjectVersion } {
    const existing = this.state.projects[project.id];
    const now = Date.now();

    const updatedProject: DbProject = {
      id: project.id,
      userId: project.userId || existing?.userId || 'usr_admin_001',
      title: project.title || existing?.title || 'Sans titre',
      description: project.description || existing?.description || '',
      vibe: project.vibe || existing?.vibe || 'modern-saas',
      currentVersionId: existing?.currentVersionId,
      isDeleted: false,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    if (versionData) {
      const existingVersions = Object.values(this.state.projectVersions).filter((v) => v.projectId === project.id);
      const nextVersionNum = existingVersions.length + 1;
      const versionId = 'ver_' + crypto.randomBytes(5).toString('hex') + `_v${nextVersionNum}`;

      const newVersion: DbProjectVersion = {
        id: versionId,
        projectId: project.id,
        branch: versionData.branch || 'main',
        versionNumber: nextVersionNum,
        summary: versionData.summary || `Révision #${nextVersionNum}`,
        authorId: updatedProject.userId,
        source: versionData.source || 'user',
        userIntent: versionData.userIntent,
        aiPrompt: versionData.aiPrompt,
        htmlSnapshot: versionData.htmlSnapshot || '',
        filesSnapshot: versionData.filesSnapshot || [],
        componentsSnapshot: versionData.componentsSnapshot || [],
        suggestedPrompts: versionData.suggestedPrompts || [],
        createdAt: now,
      };

      this.state.projectVersions[versionId] = newVersion;
      updatedProject.currentVersionId = versionId;
    }

    this.state.projects[project.id] = updatedProject;
    this.persist();

    return {
      ...updatedProject,
      currentVersion: updatedProject.currentVersionId ? this.state.projectVersions[updatedProject.currentVersionId] : undefined,
    };
  }

  public softDeleteProject(id: string): boolean {
    const p = this.state.projects[id];
    if (!p) return false;
    p.isDeleted = true;
    p.updatedAt = Date.now();
    this.persist();
    return true;
  }

  public getProjectVersions(projectId: string): DbProjectVersion[] {
    return Object.values(this.state.projectVersions)
      .filter((v) => v.projectId === projectId)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }

  public rollbackToVersion(projectId: string, versionId: string, authorId = 'usr_admin_001'): DbProjectVersion | null {
    const project = this.state.projects[projectId];
    const targetVersion = this.state.projectVersions[versionId];
    if (!project || !targetVersion) return null;

    const existingVersions = Object.values(this.state.projectVersions).filter((v) => v.projectId === projectId);
    const nextVersionNum = existingVersions.length + 1;
    const restoredVersionId = 'ver_' + crypto.randomBytes(5).toString('hex') + `_v${nextVersionNum}`;

    const rollbackVersion: DbProjectVersion = {
      id: restoredVersionId,
      projectId,
      branch: targetVersion.branch,
      versionNumber: nextVersionNum,
      summary: `Restauration de la version #${targetVersion.versionNumber}`,
      authorId,
      source: 'system',
      userIntent: `Rollback to version ${targetVersion.versionNumber}`,
      htmlSnapshot: targetVersion.htmlSnapshot,
      filesSnapshot: targetVersion.filesSnapshot,
      componentsSnapshot: targetVersion.componentsSnapshot,
      suggestedPrompts: targetVersion.suggestedPrompts,
      createdAt: Date.now(),
    };

    this.state.projectVersions[restoredVersionId] = rollbackVersion;
    project.currentVersionId = restoredVersionId;
    project.updatedAt = Date.now();
    this.persist();

    return rollbackVersion;
  }

  public createProjectVersion(
    projectId: string,
    authorId: string,
    files: any[],
    html: string,
    summary = 'Nouvelle version'
  ): DbProjectVersion {
    const existingVersions = Object.values(this.state.projectVersions).filter((v) => v.projectId === projectId);
    const nextVersionNum = existingVersions.length + 1;
    const versionId = 'ver_' + crypto.randomBytes(5).toString('hex') + `_v${nextVersionNum}`;

    const newVersion: DbProjectVersion = {
      id: versionId,
      projectId,
      branch: 'main',
      versionNumber: nextVersionNum,
      summary,
      authorId,
      source: 'user',
      htmlSnapshot: html,
      filesSnapshot: files,
      componentsSnapshot: [],
      suggestedPrompts: [],
      createdAt: Date.now(),
    };

    this.state.projectVersions[versionId] = newVersion;
    const p = this.state.projects[projectId];
    if (p) {
      p.currentVersionId = versionId;
      p.updatedAt = Date.now();
    }
    this.persist();
    return newVersion;
  }

  public rollbackProjectVersion(projectId: string, versionId: string): any {
    const rb = this.rollbackToVersion(projectId, versionId);
    if (!rb) return null;
    return this.getProjectById(projectId);
  }

  // --- Idempotency Repository ---
  public getIdempotencyRecord(key: string): DbIdempotencyRecord | undefined {
    const record = this.state.idempotency[key];
    if (!record) return undefined;
    if (record.expiresAt < Date.now()) {
      delete this.state.idempotency[key];
      return undefined;
    }
    return record;
  }

  public setIdempotencyRecord(record: DbIdempotencyRecord) {
    this.state.idempotency[record.key] = record;
    this.persist();
  }

  // --- Jobs Repository ---
  public saveJob(job: DbJobRecord) {
    this.state.jobs[job.id] = job;
    this.persist();
  }

  public getJob(id: string): DbJobRecord | undefined {
    return this.state.jobs[id];
  }

  public getAllJobs(): DbJobRecord[] {
    return Object.values(this.state.jobs).sort((a, b) => b.createdAt - a.createdAt);
  }

  // --- Invoices & Billing ---
  public saveInvoice(invoice: DbInvoice) {
    this.state.invoices[invoice.id] = invoice;
    this.persist();
  }

  public getInvoices(userId: string): DbInvoice[] {
    return Object.values(this.state.invoices)
      .filter((inv) => inv.userId === userId || inv.userId === 'usr_admin_001')
      .sort((a, b) => b.date - a.date);
  }

  // --- Security Audit Logs ---
  public logSecurityIncident(log: DbSecurityLog) {
    this.state.securityLogs[log.id] = log;
    this.persist();
  }

  public getSecurityLogs(limit = 50): DbSecurityLog[] {
    return Object.values(this.state.securityLogs)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  // --- Previews Repository ---
  public savePreviewSession(session: DbPreviewSession): DbPreviewSession {
    this.state.previews[session.id] = session;
    this.persist();
    return session;
  }

  public getPreviewSession(id: string): DbPreviewSession | undefined {
    return this.state.previews[id];
  }

  public getProjectPreviews(projectId: string): DbPreviewSession[] {
    return Object.values(this.state.previews)
      .filter((p) => p.projectId === projectId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  // --- Conversations Repository ---
  public saveConversation(conversation: DbConversation): DbConversation {
    this.state.conversations[conversation.id] = conversation;
    this.persist();
    return conversation;
  }

  public getConversation(id: string): DbConversation | undefined {
    return this.state.conversations[id];
  }

  public getProjectConversations(projectId: string): DbConversation[] {
    return Object.values(this.state.conversations)
      .filter((c) => c.projectId === projectId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // --- Project DNA Repository ---
  public saveProjectDna(dna: DbProjectDna): DbProjectDna {
    this.state.dna[dna.projectId] = dna;
    this.persist();
    return dna;
  }

  public getProjectDna(projectId: string): DbProjectDna | undefined {
    return this.state.dna[projectId];
  }

  // --- Learning & Quality Metrics Repository ---
  public saveProjectLearningMetrics(metrics: DbProjectLearningMetrics): DbProjectLearningMetrics {
    this.state.learningMetrics[metrics.projectId] = metrics;
    this.persist();
    return metrics;
  }

  public getProjectLearningMetrics(projectId: string): DbProjectLearningMetrics | undefined {
    return this.state.learningMetrics[projectId];
  }

  private isConnected = true;

  public simulateDisconnect() {
    this.isConnected = false;
    logger.warn('Database', 'Simulated Database outage triggered');
  }

  public simulateReconnect() {
    this.isConnected = true;
    logger.info('Database', 'Simulated Database restored');
  }

  public getDatabaseHealth() {
    return {
      status: this.isConnected ? 'healthy' : 'unhealthy',
      totalUsers: Object.keys(this.state.users).length,
      totalProjects: Object.values(this.state.projects).filter((p) => !p.isDeleted).length,
      totalVersions: Object.keys(this.state.projectVersions).length,
      totalJobs: Object.keys(this.state.jobs).length,
      totalInvoices: Object.keys(this.state.invoices).length,
      storageFile: this.storageFile,
    };
  }
}

export const dbAdapter = new DatabaseAdapter();
