import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { dbAdapter } from './database';
import { logger } from '../logger';

export interface MigrationReport {
  timestamp: string;
  sourceFile: string;
  projectsFound: number;
  projectsMigrated: number;
  versionsCreated: number;
  errors: string[];
  status: 'success' | 'partial' | 'skipped';
}

export class LegacyMigrationRunner {
  private legacyFilePath: string;

  constructor(filename = '.projects_data.json') {
    this.legacyFilePath = path.join(process.cwd(), filename);
  }

  public runMigration(): MigrationReport {
    const report: MigrationReport = {
      timestamp: new Date().toISOString(),
      sourceFile: this.legacyFilePath,
      projectsFound: 0,
      projectsMigrated: 0,
      versionsCreated: 0,
      errors: [],
      status: 'skipped',
    };

    if (!fs.existsSync(this.legacyFilePath)) {
      logger.info('Migration', 'No legacy projects data file found to migrate');
      return report;
    }

    try {
      const raw = fs.readFileSync(this.legacyFilePath, 'utf-8');
      const legacyProjects: any[] = JSON.parse(raw);

      if (!Array.isArray(legacyProjects) || legacyProjects.length === 0) {
        logger.info('Migration', 'Legacy projects file is empty or invalid array format');
        return report;
      }

      report.projectsFound = legacyProjects.length;

      for (const p of legacyProjects) {
        try {
          if (!p.id) continue;

          // Check if project already exists in database
          const existing = dbAdapter.getProjectById(p.id);
          if (!existing) {
            // Migrate project and initial version
            dbAdapter.saveProject(
              {
                id: p.id,
                userId: p.userId || 'usr_admin_001',
                title: p.title || 'Projet sans titre',
                description: p.description || '',
                vibe: p.vibe || 'modern-saas',
                createdAt: p.createdAt || Date.now(),
              },
              {
                summary: 'Version importée de la migration initiale',
                source: 'system',
                htmlSnapshot: p.html || '',
                filesSnapshot: Array.isArray(p.files) ? p.files : [],
                componentsSnapshot: Array.isArray(p.components) ? p.components : [],
                suggestedPrompts: Array.isArray(p.suggestedPrompts) ? p.suggestedPrompts : [],
              }
            );

            report.projectsMigrated += 1;
            report.versionsCreated += 1;
          }
        } catch (itemErr: any) {
          report.errors.push(`Failed to migrate project ${p.id}: ${itemErr.message}`);
        }
      }

      report.status = report.errors.length === 0 ? 'success' : 'partial';
      logger.info('Migration', 'Legacy database migration finished', {
        migrated: report.projectsMigrated,
        found: report.projectsFound,
      });

      return report;
    } catch (err: any) {
      report.status = 'partial';
      report.errors.push(`Critical migration error: ${err.message}`);
      logger.error('Migration', 'Migration failed', err);
      return report;
    }
  }
}

export const migrationRunner = new LegacyMigrationRunner();
// Run on startup
migrationRunner.runMigration();
