const fs = require('fs');
const path = require('path');

console.log('🔥 VIBECODE STUDIO — GENERATION CORE 2.0 PATCH');
console.log('=================================================\n');

const root = process.cwd();

// ─── 1. PATCH OXALPHA PROVIDER ───
const oxalphaPath = path.join(root, 'server', 'ai', 'oxalphaProvider.ts');
if (fs.existsSync(oxalphaPath)) {
  let content = fs.readFileSync(oxalphaPath, 'utf8');

  // Modèle réel
  content = content.replace(
    /this\.defaultModel = config\?\.defaultModel \|\| process\.env\.OXALPHA_MODEL \|\| 'oxalpha-coder-v1';/,
    "this.defaultModel = config?.defaultModel || process.env.OXALPHA_MODEL || 'z-ai/glm-5.3-flash';"
  );

  // URL OpenRouter
  content = content.replace(
    /this\.baseUrl = \(config\?\.baseUrl \|\| process\.env\.OXALPHA_BASE_URL \|\| 'https:\/\/api\.oxalpha\.ai\/v1'\)\.replace\(\/\\\/\+\$\/\, ''\);/,
    "this.baseUrl = (config?.baseUrl || process.env.OXALPHA_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\\/+$/, '');"
  );

  // Timeout 90s
  content = content.replace(
    /this\.timeoutMs = config\?\.timeoutMs \|\| 15000;/,
    'this.timeoutMs = config?.timeoutMs || 90000;'
  );

  // Headers OpenRouter
  content = content.replace(
    /'X-Client-Agent': 'VibeCode-OxAlphaProvider\/1\.0',/g,
    "'X-Client-Agent': 'VibeCode-OxAlphaProvider/2.0',\n          'HTTP-Referer': 'https://vibecode.studio',\n          'X-Title': 'VibeCode Studio',"
  );

  // Nom du provider
  content = content.replace(
    /public readonly name = 'OxAlpha AI';/,
    "public readonly name = 'OxAlpha AI (GLM-5.3-Flash)';"
  );

  // Metadata models
  content = content.replace(
    /models: \['oxalpha-coder-v1', 'oxalpha-pro-1', 'oxalpha-fast-1'\],/,
    "models: ['z-ai/glm-5.3-flash'],"
  );

  // Test connection timeout
  content = content.replace(
    /const timeoutMs = 6000;/,
    'const timeoutMs = 10000;'
  );

  fs.writeFileSync(oxalphaPath, content);
  console.log('✅ server/ai/oxalphaProvider.ts patché');
} else {
  console.log('❌ server/ai/oxalphaProvider.ts non trouvé');
}

// ─── 2. PATCH PROVIDER REGISTRY ───
const registryPath = path.join(root, 'server', 'ai', 'providerRegistry.ts');
if (fs.existsSync(registryPath)) {
  let content = fs.readFileSync(registryPath, 'utf8');

  // OxAlpha maxTokens 32768
  content = content.replace(
    /maxTokens: 8192,\s*\n\s*temperature: 0\.2,\s*\n\s*fallbackTo: 'gemini',/,
    'maxTokens: 32768,\n      temperature: 0.2,\n      fallbackTo: \'gemini\','
  );

  // OxAlpha timeout 90000
  content = content.replace(
    /timeoutMs: 45000,\s*\n\s*maxTokens: 32768,/,
    'timeoutMs: 90000,\n      maxTokens: 32768,'
  );

  fs.writeFileSync(registryPath, content);
  console.log('✅ server/ai/providerRegistry.ts patché');
} else {
  console.log('❌ server/ai/providerRegistry.ts non trouvé');
}

// ─── 3. PATCH CONVERSATION ENGINE (synthesizeCode) ───
const enginePath = path.join(root, 'server', 'conversation', 'conversationEngine.ts');
if (fs.existsSync(enginePath)) {
  let content = fs.readFileSync(enginePath, 'utf8');

  // On cherche la fonction synthesizeCode et on la remplace
  const startMarker = '  private async synthesizeCode(';
  const endMarker = '    return {';

  const startIdx = content.indexOf(startMarker);
  if (startIdx !== -1) {
    // Trouver la fin de la fonction (le return final avec les accolades fermantes)
    // On cherche le pattern de fin : "};" après le return
    let braceCount = 0;
    let endIdx = startIdx;
    let foundFirstBrace = false;

    for (let i = startIdx; i < content.length; i++) {
      if (content[i] === '{') {
        braceCount++;
        foundFirstBrace = true;
      } else if (content[i] === '}') {
        braceCount--;
        if (foundFirstBrace && braceCount === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }

    const newFunction = `  private async synthesizeCode(
    projectId: string,
    prompt: string,
    vibe: string,
    intent: string,
    blueprint: any,
    uxPlan: any,
    existingHtml: string,
    files: any[],
    userId: string
  ): Promise<{ html: string; files: any[]; provider: string; model: string; tokensUsed: number }> {
    const startTime = Date.now();
    logger.info('ConversationEngine', \`[synthesizeCode] Starting code generation for project [\${projectId}]\`);

    // SYSTEM PROMPT OPTIMISÉ POUR GLM-5.3-FLASH (REASONING MODEL)
    const sysInstruction = \`Tu es l'architecte principal de VibeCode Studio. Tu génères des applications web complètes, interactives et magnifiques en un seul fichier HTML autonome.

RÈGLES FONDAMENTALES :
1. ANALYSE D'ABORD : Lis attentivement le blueprint et le plan UX fournis. Réfléchis à l'architecture UI la plus adaptée AVANT de coder.
2. APPLICATION COMPLÈTE : Génère une vraie application riche, pas un squelette. Tous les boutons doivent fonctionner. Toutes les modales doivent s'ouvrir/se fermer.
3. STYLISME : Tailwind CSS v3 via CDN. Typographie soignée (Inter ou Plus Jakarta Sans via Google Fonts). Couleurs harmonieuses, contrastes WCAG.
4. ICÔNES : Lucide Icons via CDN. Appelle lucide.createIcons() au chargement.
5. INTERACTIVITÉ : JavaScript natif réactif. Gestion d'état locale. Tous les clics produisent un effet.
6. DONNÉES : Utilise des données réalistes et ancrées dans le domaine. PAS de "Lorem Ipsum".
7. FORMAT : Renvoie UNIQUEMENT le code HTML complet (<!DOCTYPE html>... </html>) ou un JSON {"html": "..."}. Aucun texte hors du code.

TU AS 32768 TOKENS DE SORTIE. UTILISE-LES POUR CRÉER UNE APPLICATION RICHE ET COMPLÈTE.\`;

    // ASSEMBLAGE DU USER PROMPT
    let userPromptText = \`DEMANDE UTILISATEUR : "\${prompt}"\\nSTYLE : "\${vibe}"\\nINTENTION : \${intent}\\n\\n\`;

    if (blueprint) {
      userPromptText += \`=== BLUEPRINT PRODUIT ===\\n\`;
      userPromptText += \`Titre: \${blueprint.title}\\n\`;
      userPromptText += \`Tagline: \${blueprint.tagline}\\n\`;
      userPromptText += \`Objectif: \${blueprint.goal}\\n\`;
      userPromptText += \`Cible: \${blueprint.targetAudience?.join(', ')}\\n\`;
      if (blueprint.screens?.length) {
        userPromptText += \`Écrans (\${blueprint.screens.length}): \${blueprint.screens.map((s: any) => s.name).join(', ')}\\n\`;
      }
      if (blueprint.features?.length) {
        userPromptText += \`Features clés: \${blueprint.features.slice(0, 8).map((f: any) => f.name).join(', ')}\\n\`;
      }
      userPromptText += \"\\n\";
    }

    if (uxPlan) {
      userPromptText += \`=== PLAN UX ===\\n\`;
      if (uxPlan.layoutArchitecture) {
        userPromptText += \`Architecture: \${uxPlan.layoutArchitecture.containerClass || 'adaptive'}\\n\`;
        userPromptText += \`Navigation: \${uxPlan.layoutArchitecture.navigationType || 'header'}\\n\`;
      }
      if (uxPlan.visualHierarchy) {
        userPromptText += \`Typographie: \${uxPlan.visualHierarchy.typographyScale || 'moderne'}\\n\`;
      }
      userPromptText += \"\\n\";
    }

    if (existingHtml && existingHtml.length > 100) {
      userPromptText += \`=== CODE EXISTANT (à modifier/améliorer) ===\\n\${existingHtml.substring(0, 4000)}\\n\\n\`;
    }

    userPromptText += \`INSTRUCTION FINALE : Génère l'application HTML complète maintenant.\`;

    // APPEL AU PROVIDER — PAS DE FALLBACK LOCAL
    let result: string;
    let usedProvider: string;
    let usedModel: string;
    let tokensUsed: number;

    try {
      const routingResult = await providerRegistry.executeWithRouting(
        'CODE_GENERATION',
        async (provider, strategy) => {
          logger.info('ConversationEngine', \`Using provider [\${provider.id}] model [\${strategy.model}] maxTokens [\${strategy.maxTokens}]\`);
          const resp = await provider.generateText({
            prompt: userPromptText,
            systemInstruction: sysInstruction,
            temperature: strategy.temperature,
            maxTokens: strategy.maxTokens,
            timeoutMs: strategy.timeoutMs,
            metadata: { model: strategy.model },
          });
          return resp;
        }
      );

      result = routingResult.result.text;
      usedProvider = routingResult.provider;
      usedModel = routingResult.model;
      tokensUsed = routingResult.result.usage?.totalTokens || 0;

      logger.info('ConversationEngine', \`LLM generation succeeded via [\${usedProvider}/\${usedModel}] in \${Date.now() - startTime}ms, \${tokensUsed} tokens\`);
    } catch (err: any) {
      logger.error('ConversationEngine', \`LLM generation failed: \${err.message}\`);
      throw new Error(\`La génération de code a échoué (\${err.message}). Veuillez réessayer.\`);
    }

    // EXTRACTION DU HTML
    let extractedHtml = result.trim();

    if (extractedHtml.includes('\\`\\`\\`html')) {
      extractedHtml = extractedHtml.split('\\`\\`\\`html')[1].split('\\`\\`\\`')[0].trim();
    } else if (extractedHtml.includes('\\`\\`\\`')) {
      extractedHtml = extractedHtml.split('\\`\\`\\`')[1].split('\\`\\`\\`')[0].trim();
    }

    if (extractedHtml.startsWith('{')) {
      try {
        const parsed = JSON.parse(extractedHtml);
        if (parsed.html) extractedHtml = parsed.html;
      } catch {
        // Pas du JSON valide
      }
    }

    // VALIDATION MINIMALE
    if (!extractedHtml.includes('<!DOCTYPE html>') && !extractedHtml.includes('<html')) {
      logger.warn('ConversationEngine', 'Extracted content does not appear to be valid HTML');
      throw new Error("Le modèle n'a pas retourné de HTML valide. Veuillez réessayer.");
    }

    // PAS DE MUTATIONS REGEX — On garde le HTML tel quel
    const finalHtml = extractedHtml;

    logger.info('ConversationEngine', \`[synthesizeCode] Completed. Provider: \${usedProvider}, Model: \${usedModel}, Tokens: \${tokensUsed}, HTML length: \${finalHtml.length} chars\`);

    return {
      html: finalHtml,
      files: files || [],
      provider: usedProvider,
      model: usedModel,
      tokensUsed,
    };
  }`;

    const before = content.substring(0, startIdx);
    const after = content.substring(endIdx);
    content = before + newFunction + after;

    fs.writeFileSync(enginePath, content);
    console.log('✅ server/conversation/conversationEngine.ts patché (synthesizeCode v2.0)');
  } else {
    console.log('⚠️ synthesizeCode() non trouvé dans conversationEngine.ts');
  }
} else {
  console.log('❌ server/conversation/conversationEngine.ts non trouvé');
}

// ─── 4. PATCH SERVER.TS (maxTokens) ───
const serverPath = path.join(root, 'server.ts');
if (fs.existsSync(serverPath)) {
  let content = fs.readFileSync(serverPath, 'utf8');

  // Remplace toutes les occurrences de maxTokens: 8192 par maxTokens: 32768
  // Mais seulement dans les appels API directs (pas dans le providerRegistry)
  const original = content;
  content = content.replace(/maxTokens: 8192,/g, 'maxTokens: 32768,');

  if (content !== original) {
    fs.writeFileSync(serverPath, content);
    console.log('✅ server.ts patché (maxTokens: 8192 → 32768)');
  } else {
    console.log('ℹ️ server.ts déjà à jour ou pas de maxTokens: 8192 trouvé');
  }
} else {
  console.log('❌ server.ts non trouvé');
}

console.log('\n🔥 PATCH TERMINÉ !');
console.log('Relance : npm run dev');
console.log('Teste avec : "Crée-moi un clone de Facebook"');
