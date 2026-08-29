import { dbAdapter } from '../db/database';
import { DbProjectDna } from '../db/schema';
import { logger } from '../logger';

export class AppDnaService {
  /**
   * Retrieves or builds the initial DNA for a given project
   */
  public getOrCreateDna(projectId: string, autoInferredStack?: Partial<DbProjectDna['techStack']>): DbProjectDna {
    const existing = dbAdapter.getProjectDna(projectId);
    if (existing) return existing;

    const initialDna: DbProjectDna = {
      projectId,
      techStack: {
        framework: autoInferredStack?.framework || 'Modern Vanilla Web Component Architecture',
        styling: autoInferredStack?.styling || 'Tailwind CSS v3',
        iconLibrary: autoInferredStack?.iconLibrary || 'Lucide Icons',
        stateManager: autoInferredStack?.stateManager || 'Reactive LocalStorage State',
        apiConventions: autoInferredStack?.apiConventions || 'RESTful JSON / Server Routes',
      },
      architecture: 'Single Page Application with isolated sandbox DOM execution',
      namingConventions: [
        'camelCase pour les fonctions et variables JavaScript',
        'kebab-case pour les identifiants DOM et classes',
        'PascalCase pour les composants logiques',
      ],
      patterns: [
        'Single Responsibility UI Modules',
        'Optimistic UI Updates with LocalStorage Sync',
        'Event Delegation on Dynamic Lists',
      ],
      rules: [
        'Toujours inclure Tailwind CSS via CDN',
        'Initialiser lucide.createIcons() après chaque rendu dynamique',
        'Ne jamais exposer de clés API ou tokens secrets dans le HTML frontend',
        'Garantir un contraste WCAG AA sur tous les thèmes clair/sombre',
      ],
      decisions: [
        {
          id: 'dec_init_1',
          decision: 'Architecture autonome exécutable dans un iFrame sandboxé',
          rationale: 'Permet un preview temps réel instantané sans compilation lourde côté serveur',
          category: 'Architecture',
          timestamp: Date.now(),
        },
      ],
      updatedAt: Date.now(),
    };

    dbAdapter.saveProjectDna(initialDna);
    return initialDna;
  }

  /**
   * Records a technical decision and updates the DNA
   */
  public recordDecision(
    projectId: string,
    decision: {
      decision: string;
      rationale: string;
      category: string;
    }
  ): DbProjectDna {
    const dna = this.getOrCreateDna(projectId);
    const newDecision = {
      id: 'dec_' + Date.now().toString(36),
      decision: decision.decision,
      rationale: decision.rationale,
      category: decision.category,
      timestamp: Date.now(),
    };

    dna.decisions.push(newDecision);
    dna.updatedAt = Date.now();

    dbAdapter.saveProjectDna(dna);
    logger.info('AppDna', `Recorded new technical decision for project ${projectId}: ${decision.decision}`);
    return dna;
  }

  /**
   * Generates formatted guidelines string to inject into AI Prompts
   */
  public formatDnaForPrompt(dna: DbProjectDna): string {
    return `### IDENTITÉ TECHNIQUE DU PROJET (APPLICATION DNA)
- **Stack** : ${dna.techStack.framework} | ${dna.techStack.styling} | ${dna.techStack.iconLibrary}
- **Gestion d'état** : ${dna.techStack.stateManager}
- **Règles obligatoires** :
${dna.rules.map((r) => `  * ${r}`).join('\n')}
- **Décisions d'architecture clés** :
${dna.decisions.map((d) => `  * [${d.category}] ${d.decision} (Raison: ${d.rationale})`).join('\n')}`;
  }
}

export const appDnaService = new AppDnaService();
