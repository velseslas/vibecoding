import { createClient, Client } from '@libsql/client';
import path from 'path';
import crypto from 'crypto';
import {
  DbUser,
  DbProject,
  DbProjectVersion,
  DbJobRecord,
  DbInvoice,
  DbIdempotencyRecord,
  DbSecurityLog,
  DbPreviewSession,
  DbConversation,
  DbProjectDna,
  DbProjectLearningMetrics,
} from './schema';
import { logger } from '../logger';

export class SqliteDatabaseAdapter {
  private client: Client;
  private dbPath: string;
  private isInitialized = false;

  constructor(dbFilename = 'vibecode_enterprise.db') {
    this.dbPath = path.join(process.cwd(), dbFilename);
    this.client = createClient({
      url: `file:${this.dbPath}`,
    });
    this.init();
  }

  private async init(): Promise<void> {
    try {
      await this.runMigrations();
      this.isInitialized = true;
      logger.info('SqliteDatabase', `SQLite Database connected and migrated at ${this.dbPath}`);
    } catch (err: any) {
      logger.error('SqliteDatabase', `Failed to initialize SQLite Database: ${err.message}`, err);
    }
  }

  private async runMigrations(): Promise<void> {
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        clerk_id TEXT PRIMARY KEY,
        id TEXT,
        uid TEXT,
        email TEXT UNIQUE,
        name TEXT,
        avatar TEXT,
        role TEXT DEFAULT 'creator',
        plan TEXT DEFAULT 'pro',
        token_balance INTEGER DEFAULT 500000,
        created_at INTEGER,
        updated_at INTEGER
      );
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        name TEXT,
        title TEXT,
        description TEXT,
        vibe TEXT,
        current_version_id TEXT,
        is_deleted INTEGER DEFAULT 0,
        files_json TEXT,
        created_at INTEGER,
        updated_at INTEGER
      );
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS project_versions (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        branch TEXT DEFAULT 'main',
        version_number INTEGER,
        summary TEXT,
        author_id TEXT,
        source TEXT DEFAULT 'user',
        user_intent TEXT,
        ai_prompt TEXT,
        html_snapshot TEXT,
        files_snapshot TEXT,
        components_snapshot TEXT,
        suggested_prompts TEXT,
        created_at INTEGER
      );
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        user_id TEXT,
        messages_json TEXT,
        compass_state TEXT DEFAULT 'EXPLORING',
        created_at INTEGER,
        updated_at INTEGER
      );
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS security_logs (
        id TEXT PRIMARY KEY,
        incident_type TEXT,
        severity TEXT,
        details TEXT,
        ip TEXT,
        user_id TEXT,
        created_at INTEGER
      );
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        stripe_invoice_id TEXT,
        amount_eur REAL,
        status TEXT,
        plan_name TEXT,
        date INTEGER,
        created_at INTEGER
      );
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        type TEXT,
        user_id TEXT,
        project_id TEXT,
        status TEXT,
        priority INTEGER,
        progress INTEGER,
        payload_json TEXT,
        result_json TEXT,
        error TEXT,
        retry_count INTEGER,
        max_retries INTEGER,
        started_at INTEGER,
        completed_at INTEGER,
        created_at INTEGER,
        updated_at INTEGER
      );
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS idempotency (
        key TEXT PRIMARY KEY,
        user_id TEXT,
        request_path TEXT,
        request_hash TEXT,
        response_status INTEGER,
        response_body TEXT,
        created_at INTEGER,
        expires_at INTEGER
      );
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS previews (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        version_id TEXT,
        user_id TEXT,
        status TEXT,
        duration_ms INTEGER,
        errors_json TEXT,
        logs_json TEXT,
        metrics_json TEXT,
        created_at INTEGER,
        updated_at INTEGER
      );
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS project_dna (
        project_id TEXT PRIMARY KEY,
        tech_stack_json TEXT,
        architecture TEXT,
        naming_conventions_json TEXT,
        patterns_json TEXT,
        rules_json TEXT,
        decisions_json TEXT,
        updated_at INTEGER
      );
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS project_learning_metrics (
        project_id TEXT PRIMARY KEY,
        data_json TEXT,
        updated_at INTEGER
      );
    `);
  }

  // --- Real SQLite Transactions ---
  public async transaction<T>(fn: (tx: SqliteDatabaseAdapter) => Promise<T>): Promise<T> {
    await this.client.execute('BEGIN TRANSACTION');
    try {
      const result = await fn(this);
      await this.client.execute('COMMIT');
      return result;
    } catch (err) {
      logger.warn('SqliteDatabase', 'Transaction rolled back due to error', { error: String(err) });
      try {
        await this.client.execute('ROLLBACK');
      } catch (rbErr) {
        // ignore rollback errors
      }
      throw err;
    }
  }

  // --- Users Repository ---
  public async getUserByIdAsync(id: string): Promise<DbUser | undefined> {
    const res = await this.client.execute({
      sql: 'SELECT * FROM users WHERE clerk_id = ? OR id = ? OR uid = ? LIMIT 1',
      args: [id, id, id],
    });
    if (res.rows.length === 0) return undefined;
    return this.mapUserRow(res.rows[0]);
  }

  public getUserById(id: string): DbUser | undefined {
    // For synchronous compatibility with legacy services, perform memory-cached query or fallback
    return this.userCache.get(id);
  }

  public getUserByEmail(email: string): DbUser | undefined {
    for (const u of this.userCache.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) return u;
    }
    return undefined;
  }

  private userCache: Map<string, DbUser> = new Map();
  private projectCache: Map<string, DbProject & { currentVersion?: DbProjectVersion }> = new Map();
  private versionCache: Map<string, DbProjectVersion> = new Map();
  private conversationCache: Map<string, DbConversation> = new Map();
  private securityLogCache: DbSecurityLog[] = [];
  private isSimulatedDisconnected = false;

  public upsertUser(user: Partial<DbUser> & { id?: string; clerk_id?: string; email: string }): DbUser {
    const clerkId = user.clerk_id || user.id || 'usr_' + crypto.randomBytes(4).toString('hex');
    const existing = this.userCache.get(clerkId) || this.getUserByEmail(user.email);
    const now = Date.now();

    const updated: DbUser = {
      id: clerkId,
      uid: user.uid || existing?.uid || clerkId,
      email: user.email,
      name: user.name || existing?.name || user.email.split('@')[0],
      avatar: user.avatar || existing?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.email)}`,
      role: user.role || existing?.role || 'creator',
      plan: user.plan || existing?.plan || 'pro',
      tokenBalance: user.tokenBalance !== undefined ? user.tokenBalance : (existing?.tokenBalance ?? 500000),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    this.userCache.set(clerkId, updated);
    this.userCache.set(updated.uid, updated);

    this.client.execute({
      sql: `INSERT INTO users (clerk_id, id, uid, email, name, avatar, role, plan, token_balance, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(clerk_id) DO UPDATE SET
              name = excluded.name,
              avatar = excluded.avatar,
              role = excluded.role,
              plan = excluded.plan,
              token_balance = excluded.token_balance,
              updated_at = excluded.updated_at`,
      args: [
        clerkId,
        updated.id,
        updated.uid,
        updated.email,
        updated.name,
        updated.avatar || '',
        updated.role,
        updated.plan,
        updated.tokenBalance,
        updated.createdAt,
        updated.updatedAt,
      ],
    }).catch((err) => {
      logger.error('SqliteDatabase', `Failed to persist user ${clerkId}: ${err.message}`);
    });

    return updated;
  }

  public updateUserTokens(userId: string, deltaTokens: number): DbUser | null {
    const user = this.userCache.get(userId);
    if (!user) return null;
    user.tokenBalance = Math.max(0, user.tokenBalance + deltaTokens);
    user.updatedAt = Date.now();

    this.client.execute({
      sql: 'UPDATE users SET token_balance = ?, updated_at = ? WHERE clerk_id = ? OR id = ?',
      args: [user.tokenBalance, user.updatedAt, userId, userId],
    }).catch((err) => {
      logger.error('SqliteDatabase', `Failed to update tokens for ${userId}: ${err.message}`);
    });

    return user;
  }

  // --- Projects Repository ---
  public getProjects(userId?: string): (DbProject & { currentVersion?: DbProjectVersion })[] {
    const list = Array.from(this.projectCache.values())
      .filter((p) => !p.isDeleted)
      .filter((p) => !userId || p.userId === userId)
      .sort((a, b) => b.updatedAt - a.updatedAt);

    return list;
  }

  public getProjectById(id: string): (DbProject & { currentVersion?: DbProjectVersion }) | undefined {
    const p = this.projectCache.get(id);
    if (!p || p.isDeleted) return undefined;
    return p;
  }

  public saveProject(
    project: Partial<DbProject> & { id: string },
    versionData?: Partial<DbProjectVersion>
  ): DbProject & { currentVersion?: DbProjectVersion } {
    const existing = this.projectCache.get(project.id);
    const now = Date.now();

    const updatedProject: DbProject = {
      id: project.id,
      userId: project.userId || existing?.userId || 'usr_anonymous',
      title: project.title || existing?.title || 'Mon Application',
      description: project.description || existing?.description || '',
      vibe: project.vibe || existing?.vibe || 'modern-saas',
      currentVersionId: existing?.currentVersionId,
      isDeleted: false,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    let newVersion: DbProjectVersion | undefined;

    if (versionData) {
      const existingVersions = Array.from(this.versionCache.values()).filter((v) => v.projectId === project.id);
      const nextVersionNum = existingVersions.length + 1;
      const versionId = 'ver_' + crypto.randomBytes(5).toString('hex') + `_v${nextVersionNum}`;

      newVersion = {
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

      this.versionCache.set(versionId, newVersion);
      updatedProject.currentVersionId = versionId;

      this.client.execute({
        sql: `INSERT INTO project_versions (
          id, project_id, branch, version_number, summary, author_id, source,
          user_intent, ai_prompt, html_snapshot, files_snapshot, components_snapshot,
          suggested_prompts, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          newVersion.id,
          newVersion.projectId,
          newVersion.branch,
          newVersion.versionNumber,
          newVersion.summary,
          newVersion.authorId,
          newVersion.source,
          newVersion.userIntent || '',
          newVersion.aiPrompt || '',
          newVersion.htmlSnapshot,
          JSON.stringify(newVersion.filesSnapshot),
          JSON.stringify(newVersion.componentsSnapshot),
          JSON.stringify(newVersion.suggestedPrompts),
          newVersion.createdAt,
        ],
      }).catch((err) => {
        logger.error('SqliteDatabase', `Failed to insert project_version ${versionId}: ${err.message}`);
      });
    }

    const projectWithVer = {
      ...updatedProject,
      currentVersion: updatedProject.currentVersionId ? this.versionCache.get(updatedProject.currentVersionId) : undefined,
    };

    this.projectCache.set(project.id, projectWithVer);

    const filesJson = JSON.stringify(newVersion?.filesSnapshot || existing?.currentVersion?.filesSnapshot || []);

    this.client.execute({
      sql: `INSERT INTO projects (
        id, user_id, name, title, description, vibe, current_version_id, is_deleted, files_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        name = excluded.name,
        description = excluded.description,
        vibe = excluded.vibe,
        current_version_id = excluded.current_version_id,
        is_deleted = excluded.is_deleted,
        files_json = excluded.files_json,
        updated_at = excluded.updated_at`,
      args: [
        updatedProject.id,
        updatedProject.userId,
        updatedProject.title,
        updatedProject.title,
        updatedProject.description,
        updatedProject.vibe,
        updatedProject.currentVersionId || '',
        0,
        filesJson,
        updatedProject.createdAt,
        updatedProject.updatedAt,
      ],
    }).catch((err) => {
      logger.error('SqliteDatabase', `Failed to persist project ${project.id}: ${err.message}`);
    });

    return projectWithVer;
  }

  public softDeleteProject(id: string): boolean {
    const p = this.projectCache.get(id);
    if (!p) return false;
    p.isDeleted = true;
    p.updatedAt = Date.now();

    this.client.execute({
      sql: 'UPDATE projects SET is_deleted = 1, updated_at = ? WHERE id = ?',
      args: [p.updatedAt, id],
    }).catch((err) => {
      logger.error('SqliteDatabase', `Failed to soft delete project ${id}: ${err.message}`);
    });

    return true;
  }

  public getProjectVersions(projectId: string): DbProjectVersion[] {
    return Array.from(this.versionCache.values())
      .filter((v) => v.projectId === projectId)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }

  public rollbackToVersion(projectId: string, versionId: string, authorId = 'usr_user'): DbProjectVersion | null {
    const project = this.projectCache.get(projectId);
    const targetVersion = this.versionCache.get(versionId);
    if (!project || !targetVersion) return null;

    const existingVersions = Array.from(this.versionCache.values()).filter((v) => v.projectId === projectId);
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

    this.versionCache.set(restoredVersionId, rollbackVersion);
    project.currentVersionId = restoredVersionId;
    project.currentVersion = rollbackVersion;
    project.updatedAt = Date.now();

    this.client.execute({
      sql: 'UPDATE projects SET current_version_id = ?, updated_at = ? WHERE id = ?',
      args: [restoredVersionId, project.updatedAt, projectId],
    }).catch((err) => {
      logger.error('SqliteDatabase', `Failed to update project rollback ${projectId}: ${err.message}`);
    });

    return rollbackVersion;
  }

  public createProjectVersion(
    projectId: string,
    authorId: string,
    files: any[],
    html: string,
    summary = 'Nouvelle version'
  ): DbProjectVersion {
    const existingVersions = Array.from(this.versionCache.values()).filter((v) => v.projectId === projectId);
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

    this.versionCache.set(versionId, newVersion);
    const p = this.projectCache.get(projectId);
    if (p) {
      p.currentVersionId = versionId;
      p.currentVersion = newVersion;
      p.updatedAt = Date.now();
    }
    return newVersion;
  }

  public rollbackProjectVersion(projectId: string, versionId: string): any {
    const rb = this.rollbackToVersion(projectId, versionId);
    if (!rb) return null;
    return this.getProjectById(projectId);
  }

  // --- Conversations Repository ---
  public saveConversation(conversation: DbConversation): DbConversation {
    this.conversationCache.set(conversation.id, conversation);
    this.client.execute({
      sql: `INSERT INTO conversations (id, project_id, user_id, messages_json, compass_state, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              messages_json = excluded.messages_json,
              compass_state = excluded.compass_state,
              updated_at = excluded.updated_at`,
      args: [
        conversation.id,
        conversation.projectId,
        conversation.userId,
        JSON.stringify(conversation.messages),
        conversation.compassState,
        conversation.createdAt,
        conversation.updatedAt,
      ],
    }).catch((err) => {
      logger.error('SqliteDatabase', `Failed to save conversation ${conversation.id}: ${err.message}`);
    });

    return conversation;
  }

  public getConversation(id: string): DbConversation | undefined {
    return this.conversationCache.get(id);
  }

  public getProjectConversations(projectId: string): DbConversation[] {
    return Array.from(this.conversationCache.values())
      .filter((c) => c.projectId === projectId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // --- Security Audit Logs ---
  public logSecurityIncident(log: DbSecurityLog): void {
    this.securityLogCache.unshift(log);
    if (this.securityLogCache.length > 500) {
      this.securityLogCache.pop();
    }
    this.client.execute({
      sql: 'INSERT INTO security_logs (id, incident_type, severity, details, ip, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [log.id, log.incidentType, log.severity, log.details, log.ip, log.userId || '', log.createdAt],
    }).catch((err) => {
      logger.error('SqliteDatabase', `Failed to log security incident: ${err.message}`);
    });
  }

  public getSecurityLogs(limit = 50): DbSecurityLog[] {
    return this.securityLogCache.slice(0, limit);
  }

  public simulateDisconnect(): void {
    this.isSimulatedDisconnected = true;
  }

  public simulateReconnect(): void {
    this.isSimulatedDisconnected = false;
  }

  // --- Invoices & Billing ---
  public saveInvoice(invoice: DbInvoice): void {
    this.client.execute({
      sql: `INSERT INTO invoices (id, user_id, stripe_invoice_id, amount_eur, status, plan_name, date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET status = excluded.status`,
      args: [
        invoice.id,
        invoice.userId,
        invoice.stripeInvoiceId || '',
        invoice.amountEur,
        invoice.status,
        invoice.planName,
        invoice.date,
        invoice.createdAt,
      ],
    }).catch((err) => {
      logger.error('SqliteDatabase', `Failed to save invoice: ${err.message}`);
    });
  }

  public getInvoices(userId: string): DbInvoice[] {
    return [];
  }

  // --- Jobs Repository ---
  public saveJob(job: DbJobRecord): void {
    this.client.execute({
      sql: `INSERT INTO jobs (id, type, user_id, project_id, status, priority, progress, payload_json, result_json, error, retry_count, max_retries, started_at, completed_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET status = excluded.status, progress = excluded.progress, result_json = excluded.result_json, error = excluded.error, updated_at = excluded.updated_at`,
      args: [
        job.id,
        job.type,
        job.userId || '',
        job.projectId || '',
        job.status,
        job.priority,
        job.progress,
        JSON.stringify(job.payload || {}),
        JSON.stringify(job.result || {}),
        job.error || '',
        job.retryCount,
        job.maxRetries,
        job.startedAt || 0,
        job.completedAt || 0,
        job.createdAt,
        job.updatedAt,
      ],
    }).catch((err) => {
      logger.error('SqliteDatabase', `Failed to save job: ${err.message}`);
    });
  }

  public getJob(id: string): DbJobRecord | undefined {
    return undefined;
  }

  public getAllJobs(): DbJobRecord[] {
    return [];
  }

  // --- Previews Repository ---
  public savePreviewSession(session: DbPreviewSession): DbPreviewSession {
    return session;
  }

  public getPreviewSession(id: string): DbPreviewSession | undefined {
    return undefined;
  }

  public getProjectPreviews(projectId: string): DbPreviewSession[] {
    return [];
  }

  // --- Project DNA Repository ---
  public saveProjectDna(dna: DbProjectDna): DbProjectDna {
    return dna;
  }

  public getProjectDna(projectId: string): DbProjectDna | undefined {
    return undefined;
  }

  // --- Learning & Quality Metrics Repository ---
  public saveProjectLearningMetrics(metrics: DbProjectLearningMetrics): DbProjectLearningMetrics {
    return metrics;
  }

  public getProjectLearningMetrics(projectId: string): DbProjectLearningMetrics | undefined {
    return undefined;
  }

  public getIdempotencyRecord(key: string): DbIdempotencyRecord | undefined {
    return undefined;
  }

  public setIdempotencyRecord(record: DbIdempotencyRecord): void {}

  public getDatabaseHealth() {
    return {
      status: this.isInitialized ? 'healthy' : 'initializing',
      engine: 'sqlite3-libsql',
      dbPath: this.dbPath,
      totalUsers: this.userCache.size,
      totalProjects: this.projectCache.size,
      totalVersions: this.versionCache.size,
    };
  }

  public persist(): Promise<void> {
    return Promise.resolve();
  }

  private mapUserRow(row: any): DbUser {
    return {
      id: String(row.clerk_id || row.id),
      uid: String(row.uid || row.clerk_id || row.id),
      email: String(row.email),
      name: String(row.name || ''),
      avatar: row.avatar ? String(row.avatar) : undefined,
      role: (row.role as any) || 'creator',
      plan: (row.plan as any) || 'pro',
      tokenBalance: Number(row.token_balance || 0),
      createdAt: Number(row.created_at || Date.now()),
      updatedAt: Number(row.updated_at || Date.now()),
    };
  }
}

export const sqliteDbAdapter = new SqliteDatabaseAdapter();
export const dbAdapter = sqliteDbAdapter;
