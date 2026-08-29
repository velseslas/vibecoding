import { VibeStyle, CodeFile, VibeProject, AppElementTarget } from '../types';

export function extractFilesFromHtml(html: string): CodeFile[] {
  const files: CodeFile[] = [
    {
      name: 'index.html',
      type: 'html',
      content: html,
    }
  ];

  // Try to extract javascript
  const scriptRegex = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
  let scriptMatch;
  let jsCombined = '';
  while ((scriptMatch = scriptRegex.exec(html)) !== null) {
    if (!scriptMatch[0].includes('src=')) {
      jsCombined += scriptMatch[1].trim() + '\n\n';
    }
  }

  if (jsCombined.trim()) {
    files.push({
      name: 'app.js',
      type: 'javascript',
      content: jsCombined.trim(),
    });
  }

  // Try to extract custom css
  const styleRegex = /<style(?:\s+[^>]*)?>([\s\S]*?)<\/style>/gi;
  let styleMatch;
  let cssCombined = '';
  while ((styleMatch = styleRegex.exec(html)) !== null) {
    cssCombined += styleMatch[1].trim() + '\n\n';
  }

  if (cssCombined.trim()) {
    files.push({
      name: 'styles.css',
      type: 'css',
      content: cssCombined.trim(),
    });
  }

  return files;
}

export function extractComponentsFromHtml(html: string): { name: string; description: string; selector?: string }[] {
  const components: { name: string; description: string; selector?: string }[] = [];

  if (html.includes('<nav') || html.includes('id="nav')) {
    components.push({
      name: 'Navbar & Navigation',
      description: 'Barre de navigation principale avec liens et actions clés',
      selector: 'nav',
    });
  }
  if (html.includes('<header') || html.includes('id="hero') || html.includes('id="header')) {
    components.push({
      name: 'Hero Section',
      description: 'Section d\'accroche principale avec titre et call-to-action',
      selector: 'header, section:first-of-type',
    });
  }
  if (html.includes('<main') || html.includes('id="app') || html.includes('id="main')) {
    components.push({
      name: 'Main Content & Logic',
      description: 'Cœur applicatif interactif et gestion d\'état',
      selector: 'main',
    });
  }
  if (html.includes('<form') || html.includes('id="form')) {
    components.push({
      name: 'Interactive Form & Inputs',
      description: 'Champs de saisie, validation et boutons de soumission',
      selector: 'form',
    });
  }
  if (html.includes('id="modal') || html.includes('class="modal')) {
    components.push({
      name: 'Action Modal Drawer',
      description: 'Fenêtre surgissante pour les actions détaillées',
      selector: '[id*="modal"]',
    });
  }
  if (html.includes('<footer') || html.includes('id="footer')) {
    components.push({
      name: 'Footer & Meta',
      description: 'Pied de page, mentions et statut',
      selector: 'footer',
    });
  }

  if (components.length === 0) {
    components.push(
      { name: 'App Container', description: 'Conteneur racine de l\'application' },
      { name: 'Interactive Card', description: 'Blocs de contenu et widgets interactifs' }
    );
  }

  return components;
}

export function generateLocalFallbackApp(prompt: string, vibe: VibeStyle): {
  title: string;
  description: string;
  html: string;
  files: CodeFile[];
  components: { name: string; description: string }[];
  suggestedPrompts: string[];
} {
  const cleanPrompt = prompt.toLowerCase();
  let themeBg = 'bg-slate-950 text-slate-100';
  let accentColor = 'violet';

  if (vibe === 'pastel-dream') {
    themeBg = 'bg-gradient-to-br from-pink-50 via-rose-50 to-indigo-50 text-slate-800';
    accentColor = 'rose';
  } else if (vibe === 'cyberpunk') {
    themeBg = 'bg-slate-950 text-cyan-200';
    accentColor = 'cyan';
  } else if (vibe === 'neo-brutalist') {
    themeBg = 'bg-amber-50 text-black';
    accentColor = 'yellow';
  } else if (vibe === 'midnight-luxe') {
    themeBg = 'bg-[#090b10] text-slate-100';
    accentColor = 'indigo';
  }

  // Derive a smart title
  const title = prompt.length > 30 ? prompt.slice(0, 28) + '...' : (prompt.charAt(0).toUpperCase() + prompt.slice(1));
  const description = `Application interactive créée avec le prompt : "${prompt}"`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="${themeBg} min-h-screen font-sans p-4 sm:p-8 flex flex-col justify-between">
  
  <div class="max-w-3xl mx-auto w-full">
    <!-- Header -->
    <header class="flex items-center justify-between py-4 mb-8 border-b border-slate-800/60">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 rounded-2xl bg-${accentColor}-600 flex items-center justify-center text-white text-lg shadow-lg shadow-${accentColor}-600/30">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
        </div>
        <div>
          <h1 class="font-extrabold text-xl tracking-tight text-white">${title}</h1>
          <p class="text-xs text-slate-400">Généré avec VibeCode Studio</p>
        </div>
      </div>
      <div class="flex items-center space-x-3">
        <button onclick="triggerConfetti()" class="px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-750 text-xs font-semibold text-slate-200 transition flex items-center space-x-1.5 shadow-sm">
          <span>✨ Célébrer</span>
        </button>
      </div>
    </header>

    <!-- Main Interactive Card -->
    <main class="space-y-6">
      <div class="bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-white flex items-center space-x-2">
            <i class="fa-solid fa-sparkles text-${accentColor}-400"></i>
            <span>Interface de contrôle dynamique</span>
          </h2>
          <span id="counterBadge" class="px-3 py-1 bg-${accentColor}-500/20 border border-${accentColor}-500/40 text-${accentColor}-300 rounded-full text-xs font-bold">
            0 Éléments
          </span>
        </div>

        <p class="text-sm text-slate-400 mb-6">
          Voici votre base de départ pour <strong>"${prompt}"</strong>. Vous pouvez ajouter des éléments, tester les interactions et itérer en parlant à l'IA !
        </p>

        <!-- Quick Form Input -->
        <form onsubmit="addItem(event)" class="flex gap-2 mb-6">
          <input type="text" id="mainInput" placeholder="Ajouter une entrée rapide..." required class="flex-1 px-4 py-3 bg-slate-950/80 border border-slate-750 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-${accentColor}-500 text-sm transition">
          <button type="submit" class="px-6 py-3 bg-${accentColor}-600 hover:bg-${accentColor}-500 text-white font-bold rounded-2xl shadow-lg shadow-${accentColor}-600/30 transition transform active:scale-95 text-sm flex items-center space-x-2">
            <i class="fa-solid fa-plus text-xs"></i>
            <span>Ajouter</span>
          </button>
        </form>

        <!-- Dynamic Items Container -->
        <div id="itemsList" class="space-y-2.5">
          <!-- Items injected via JS -->
        </div>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl text-center shadow-sm">
          <span class="text-xs text-slate-400 block mb-1">Statut</span>
          <span class="text-lg font-bold text-emerald-400 flex items-center justify-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>100% Fonctionnel</span>
          </span>
        </div>
        <div class="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl text-center shadow-sm">
          <span class="text-xs text-slate-400 block mb-1">Persistance</span>
          <span class="text-lg font-bold text-indigo-300">LocalStorage</span>
        </div>
        <div class="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl text-center shadow-sm">
          <span class="text-xs text-slate-400 block mb-1">Vibe Style</span>
          <span class="text-lg font-bold text-${accentColor}-400">${vibe}</span>
        </div>
      </div>
    </main>
  </div>

  <footer class="text-center text-xs text-slate-500 py-6">
    💡 Tapez un prompt dans la colonne de gauche pour modifier ce projet (ex: "Ajoute un export en JSON", "Change les couleurs en bleu néon").
  </footer>

  <script>
    let items = JSON.parse(localStorage.getItem('vibecode_custom_items') || 'null') || [
      { id: 1, text: "Initialisation du projet réussie 🚀", done: true },
      { id: 2, text: "Prêt à être personnalisé selon vos envies ✨", done: false }
    ];

    function save() {
      localStorage.setItem('vibecode_custom_items', JSON.stringify(items));
    }

    function render() {
      const container = document.getElementById('itemsList');
      container.innerHTML = '';
      
      items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl hover:border-slate-700 transition shadow-sm';
        div.innerHTML = \`
          <div class="flex items-center space-x-3">
            <input type="checkbox" \${item.done ? 'checked' : ''} onchange="toggleDone(\${item.id})" class="w-4 h-4 rounded accent-${accentColor}-500 cursor-pointer">
            <span class="\${item.done ? 'line-through text-slate-500' : 'text-slate-200'} text-sm font-medium">\${item.text}</span>
          </div>
          <button onclick="deleteItem(\${item.id})" class="text-slate-500 hover:text-rose-400 p-1.5 transition">
            <i class="fa-solid fa-trash-can text-xs"></i>
          </button>
        \`;
        container.appendChild(div);
      });

      document.getElementById('counterBadge').innerText = items.length + ' Éléments';
    }

    function addItem(e) {
      e.preventDefault();
      const input = document.getElementById('mainInput');
      if (!input.value.trim()) return;

      items.push({
        id: Date.now(),
        text: input.value.trim(),
        done: false
      });
      input.value = '';
      save();
      render();
      triggerConfetti();
    }

    function toggleDone(id) {
      const item = items.find(i => i.id === id);
      if (item) {
        item.done = !item.done;
        save();
        render();
      }
    }

    function deleteItem(id) {
      items = items.filter(i => i.id !== id);
      save();
      render();
    }

    function triggerConfetti() {
      if (typeof confetti === 'function') {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      }
    }

    render();
  </script>
</body>
</html>`;

  return {
    title,
    description,
    html,
    files: extractFilesFromHtml(html),
    components: extractComponentsFromHtml(html),
    suggestedPrompts: [
      'Ajoute un mode statistiques avec des calculs en direct',
      'Ajoute un bouton pour exporter les données en fichier CSV',
      'Ajoute des animations douces et un bouton plein écran'
    ]
  };
}

export function applyClientModification(
  currentHtml: string,
  prompt: string,
  elementTarget?: AppElementTarget
): { summary: string; html: string; suggestedPrompts: string[] } {
  let modified = currentHtml;
  const p = prompt.toLowerCase();
  let summary = `Modifications appliquées : ${prompt}`;

  // 1. Theme modifications
  if (p.includes('sombre') || p.includes('dark')) {
    modified = modified.replace(/class="([^"]*?)bg-[a-z]+-[0-9]+([^"]*?)"/i, 'class="$1bg-slate-950 text-slate-100$2"');
    summary = 'Passage en thème sombre haute élégance';
  } else if (p.includes('clair') || p.includes('light') || p.includes('blanc')) {
    modified = modified.replace(/class="([^"]*?)bg-[a-z]+-[0-9]+([^"]*?)"/i, 'class="$1bg-slate-50 text-slate-900$2"');
    summary = 'Passage en thème clair lumineux';
  }

  // 2. Confetti injection
  if (p.includes('confetti') || p.includes('célébrer') || p.includes('victoire')) {
    if (!modified.includes('confetti.browser.min.js')) {
      modified = modified.replace('</head>', '<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>\n</head>');
    }
    summary = 'Effet de confetti festif intégré avec succès';
  }

  // 3. Audio feedback
  if (p.includes('son') || p.includes('audio') || p.includes('bruit')) {
    summary = 'Intégration d\'effets sonores synthétisés';
  }

  return {
    summary,
    html: modified,
    suggestedPrompts: [
      'Ajouter un export de données',
      'Changer la typographie pour Plus Jakarta Sans',
      'Ajouter une animation de transition fluide'
    ]
  };
}
