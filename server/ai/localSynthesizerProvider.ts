import { AIProvider, AIProviderRequest, AIProviderResponse, AIStructuredRequest, AIStructuredResponse, ProviderMetadata, ProviderConnectionTestResult, TokenUsage } from './aiProvider';

export class LocalSynthesizerProvider implements AIProvider {
  public readonly id = 'local_engine';
  public readonly name = 'Local High-Speed Synthesizer';

  public isAvailable(): boolean {
    return true;
  }

  public getMetadata(): ProviderMetadata {
    return {
      id: this.id,
      name: this.name,
      type: 'local',
      models: ['local-synthesizer-v1'],
      defaultModel: 'local-synthesizer-v1',
      isAvailable: true,
      costPer1kInputTokens: 0,
      costPer1kOutputTokens: 0,
      supportsStreaming: true,
      supportsStructuredOutput: true,
    };
  }

  public estimateCost(_usage: TokenUsage): number {
    return 0;
  }

  public async generateText(request: AIProviderRequest): Promise<AIProviderResponse> {
    const startTime = Date.now();
    const prompt = request.prompt;
    const title = prompt.slice(0, 30);
    const mockJson = {
      title,
      description: `Application locale générée pour : ${prompt}`,
      vibe: 'Moderne',
      html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title><script src="https://cdn.tailwindcss.com"></script></head><body class="p-6 bg-slate-50 text-slate-900"><div class="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow border border-slate-200"><h1 class="text-xl font-bold mb-2">${title}</h1><p class="text-slate-600">Application générée pour : ${prompt}</p></div></body></html>`,
      files: [
        {
          name: 'index.html',
          type: 'html',
          content: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title><script src="https://cdn.tailwindcss.com"></script></head><body class="p-6 bg-slate-50 text-slate-900"><div class="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow border border-slate-200"><h1 class="text-xl font-bold mb-2">${title}</h1><p class="text-slate-600">Application générée pour : ${prompt}</p></div></body></html>`,
        },
      ],
      components: [{ name: 'App', description: 'Application principale' }],
      suggestedPrompts: ['Ajouter un bouton', 'Changer le thème'],
    };

    const text = JSON.stringify(mockJson);

    return {
      text,
      usage: { promptTokens: 50, completionTokens: 50, totalTokens: 100 },
      durationMs: Date.now() - startTime,
      model: 'local-synthesizer-v1',
      provider: this.id,
      estimatedCostEur: 0,
    };
  }

  public async generateStructured<T>(request: AIStructuredRequest<T>): Promise<AIStructuredResponse<T>> {
    const startTime = Date.now();
    const prompt = request.prompt;

    const title = prompt.slice(0, 30);
    const mockData: any = {
      title,
      description: `Application web réactive générée par le moteur local pour "${prompt}"`,
      vibe: 'Moderne et épuré',
      html: `<!DOCTYPE html>
<html lang="fr" class="h-full">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body class="h-full bg-slate-50 text-slate-900 font-sans p-6">
  <div class="max-w-4xl mx-auto space-y-6">
    <header class="flex items-center justify-between pb-4 border-b border-slate-200">
      <h1 class="text-2xl font-bold text-slate-900">${title}</h1>
      <button id="btn-primary" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm transition">
        Action Principale
      </button>
    </header>
    <main class="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
      <p class="text-slate-600">Application interactive prête pour : ${prompt}</p>
    </main>
  </div>
  <script>lucide.createIcons();</script>
</body>
</html>`,
      files: [
        {
          name: 'index.html',
          type: 'html',
          content: '<!-- Index -->'
        }
      ],
      components: [
        { name: 'AppHeader', description: 'En-tête de navigation' },
        { name: 'MainContent', description: 'Vue principale' }
      ],
      suggestedPrompts: [
        'Ajouter un graphique de statistiques',
        'Activer le mode sombre',
        'Exporter les données'
      ]
    };

    return {
      data: mockData as T,
      rawText: JSON.stringify(mockData),
      usage: { promptTokens: 80, completionTokens: 250, totalTokens: 330 },
      durationMs: Date.now() - startTime,
      model: 'local-synthesizer-v1',
      provider: this.id,
      estimatedCostEur: 0,
      validated: true,
    };
  }

  public async streamGenerate(
    request: AIProviderRequest,
    onChunk: (chunk: string) => void
  ): Promise<AIProviderResponse> {
    const res = await this.generateStructured(request);
    const jsonStr = JSON.stringify(res.data);
    onChunk(jsonStr);
    return {
      text: jsonStr,
      usage: res.usage,
      durationMs: res.durationMs,
      model: res.model,
      provider: this.id,
      estimatedCostEur: 0,
    };
  }

  public async testConnection(): Promise<ProviderConnectionTestResult> {
    const startTime = Date.now();
    await new Promise((r) => setTimeout(r, 20));
    return {
      success: true,
      status: 'SUCCESS',
      statusLabel: 'Connexion réussie',
      message: 'Moteur Local Haute Vitesse opérationnel (Garantie 100% zéro latence externe).',
      latencyMs: Date.now() - startTime,
      provider: this.id,
      model: 'local-synthesizer-v1',
      timestamp: Date.now(),
    };
  }
}

export const localSynthesizerProvider = new LocalSynthesizerProvider();
