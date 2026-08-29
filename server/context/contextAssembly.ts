import { appUnderstandingService, AppUnderstandingResult } from '../analysis/appUnderstanding';
import { appDnaService } from '../analysis/appDna';
import { projectMemoryService } from '../memory/projectMemory';
import { UserIntentType } from '../intent/intentEngine';
import { logger } from '../logger';

export interface AssembledContext {
  projectId: string;
  userPrompt: string;
  intent: UserIntentType;
  understanding: AppUnderstandingResult;
  dnaGuidelines: string;
  projectMemorySummary: string;
  relevantFiles: Array<{ name: string; content: string }>;
  tokenEstimate: number;
}

export class ContextAssemblyService {
  /**
   * Selectively compiles relevant files, DNA rules & project memory within a strict token budget
   */
  public assembleContext(
    projectId: string,
    prompt: string,
    intent: UserIntentType,
    files: Array<{ name: string; content?: string }>,
    rawHtml?: string
  ): AssembledContext {
    // 1. Analyze Application Architecture
    const understanding = appUnderstandingService.analyzeProject(files, rawHtml);

    // 2. Fetch Project DNA and Memory
    const dna = appDnaService.getOrCreateDna(projectId);
    const dnaGuidelines = appDnaService.formatDnaForPrompt(dna);
    const projectMemorySummary = projectMemoryService.formatContextForPrompt(projectId);

    // 3. Selective file filtering (only include relevant files)
    const relevantFiles: Array<{ name: string; content: string }> = [];

    // Always include index.html (or main view)
    const mainHtml = rawHtml || files.find((f) => f.name.endsWith('.html'))?.content || '';
    relevantFiles.push({
      name: 'index.html',
      content: mainHtml.length > 50000 ? mainHtml.substring(0, 50000) + '\n<!-- content truncated for context budget -->' : mainHtml,
    });

    // If JavaScript / CSS specific, include those
    for (const f of files) {
      if (f.name !== 'index.html' && (f.name.endsWith('.js') || f.name.endsWith('.css'))) {
        relevantFiles.push({
          name: f.name,
          content: f.content || '',
        });
      }
    }

    const totalChars =
      prompt.length +
      dnaGuidelines.length +
      projectMemorySummary.length +
      relevantFiles.reduce((acc, f) => acc + f.content.length, 0);

    const tokenEstimate = Math.round(totalChars / 4);

    return {
      projectId,
      userPrompt: prompt,
      intent,
      understanding,
      dnaGuidelines,
      projectMemorySummary,
      relevantFiles,
      tokenEstimate,
    };
  }
}

export const contextAssemblyService = new ContextAssemblyService();
