import { ProductBlueprint } from '../productBlueprint';
import { UXPlan } from '../uxProductPlanner';

export function generateSaasLandingApp(bp: ProductBlueprint, ux: UXPlan): string {
  return `<!DOCTYPE html>
<html lang="fr" class="h-full bg-slate-950 text-slate-100 font-sans">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${bp.title} — Plateforme Cloud IA</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  </style>
</head>
<body class="h-full flex flex-col bg-slate-950 text-slate-100">
  
  <!-- Navigation Bar -->
  <header class="h-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur sticky top-0 z-30 px-6 sm:px-12 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/20">
        <i data-lucide="layers" class="w-5 h-5"></i>
      </div>
      <span class="text-base font-black text-white tracking-tight">${bp.title}</span>
    </div>

    <nav class="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
      <a href="#features" class="hover:text-white transition">Fonctionnalités</a>
      <a href="#pricing" class="hover:text-white transition">Tarifs</a>
      <a href="#faq" class="hover:text-white transition">FAQ</a>
    </nav>

    <div class="flex items-center gap-3">
      <button class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition">Connexion</button>
      <button class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition">
        Démarrer l'essai gratuit
      </button>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="py-16 sm:py-24 px-6 text-center max-w-4xl mx-auto space-y-6">
    <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold">
      <span class="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
      <span>Nouvelle version 3.0 disponible</span>
    </div>
    
    <h1 class="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
      Déployez vos modèles IA et serveurs en <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">quelques millisecondes</span>.
    </h1>

    <p class="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
      L'infrastructure cloud souveraine, scalable à l'infini avec observabilité temps réel, isolation matérielle et zéro latence de cold-start.
    </p>

    <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
      <button class="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2">
        <span>Commencer gratuitement (14 jours)</span>
        <i data-lucide="arrow-right" class="w-4 h-4"></i>
      </button>
      <button class="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition">
        Consulter la documentation API
      </button>
    </div>

    <!-- Software Mockup -->
    <div class="mt-12 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl p-4 sm:p-6 text-left">
      <div class="flex items-center justify-between pb-4 border-b border-slate-800">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-rose-500"></span>
          <span class="w-3 h-3 rounded-full bg-amber-500"></span>
          <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span class="text-xs text-slate-400 ml-2 font-mono">cluster-prod-eu-west-1 • 99.999% Uptime</span>
        </div>
        <span class="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md">Live (48 Pods)</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        <div class="p-4 rounded-xl bg-slate-950 border border-slate-800">
          <span class="text-[10px] text-slate-500 block font-bold uppercase">Requêtes / sec</span>
          <span class="text-xl font-black text-white">48 290 req/s</span>
        </div>
        <div class="p-4 rounded-xl bg-slate-950 border border-slate-800">
          <span class="text-[10px] text-slate-500 block font-bold uppercase">Latence P99</span>
          <span class="text-xl font-black text-emerald-400">1.8 ms</span>
        </div>
        <div class="p-4 rounded-xl bg-slate-950 border border-slate-800">
          <span class="text-[10px] text-slate-500 block font-bold uppercase">Économie Cloud</span>
          <span class="text-xl font-black text-indigo-400">-64%</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Interactive Features Section -->
  <section id="features" class="py-16 px-6 max-w-5xl mx-auto">
    <div class="text-center space-y-2 mb-10">
      <h2 class="text-2xl font-black text-white">Conçu pour les ingénieurs exigeants</h2>
      <p class="text-xs text-slate-400">Trois piliers fondamentaux pour votre succès à grande échelle.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div class="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
          <i data-lucide="cpu" class="w-5 h-5"></i>
        </div>
        <h3 class="text-sm font-bold text-white">Moteur Inférence Haute Vitesse</h3>
        <p class="text-xs text-slate-400 leading-relaxed">Accélération matérielle NVidia H100 avec routage prédictif de charge.</p>
      </div>
      <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div class="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold">
          <i data-lucide="shield-check" class="w-5 h-5"></i>
        </div>
        <h3 class="text-sm font-bold text-white">Conformité & Sécurité RGPD</h3>
        <p class="text-xs text-slate-400 leading-relaxed">Données hébergées à 100% en Europe dans des datacenters certifiés ISO 27001.</p>
      </div>
      <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div class="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
          <i data-lucide="git-branch" class="w-5 h-5"></i>
        </div>
        <h3 class="text-sm font-bold text-white">CI/CD & Déploiements Instantanés</h3>
        <p class="text-xs text-slate-400 leading-relaxed">Branchez votre dépôt GitHub et déployez automatiquement à chaque git push.</p>
      </div>
    </div>
  </section>

  <!-- Pricing Table with Monthly/Annual Toggle -->
  <section id="pricing" class="py-16 px-6 max-w-4xl mx-auto bg-slate-900/50 rounded-3xl border border-slate-800">
    <div class="text-center space-y-2 mb-8">
      <h2 class="text-2xl font-black text-white">Des tarifs simples et transparents</h2>
      <p class="text-xs text-slate-400">Choisissez l'offre dimensionnée pour vos ambitions.</p>
      
      <!-- Billing Toggle -->
      <div class="inline-flex items-center gap-3 p-1.5 rounded-xl bg-slate-950 border border-slate-800 mt-4">
        <button id="btn-billing-monthly" class="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow">Mensuel</button>
        <button id="btn-billing-annual" class="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition flex items-center gap-1.5">
          <span>Annuel</span>
          <span class="text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">-20%</span>
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      <!-- Starter Plan -->
      <div class="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-5">
        <div>
          <h3 class="text-sm font-bold text-white">Offre Developer</h3>
          <p class="text-xs text-slate-400 mt-1">Parfait pour prototyper et tester vos applications.</p>
        </div>
        <div>
          <span id="price-starter" class="text-3xl font-black text-white">29 €</span>
          <span class="text-xs text-slate-500">/ mois</span>
        </div>
        <ul class="space-y-2 text-xs text-slate-300">
          <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> Jusqu'à 500 000 requêtes</li>
          <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> 4 coeurs CPU vCPU & 8 Go RAM</li>
          <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> Support par email sous 24h</li>
        </ul>
        <button class="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition">
          Choisir Developer
        </button>
      </div>

      <!-- Enterprise Plan -->
      <div class="p-6 rounded-2xl bg-slate-950 border-2 border-indigo-500 space-y-5 relative">
        <span class="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-600 text-white shadow">Recommandé</span>
        <div>
          <h3 class="text-sm font-bold text-white">Offre Scale & Pro</h3>
          <p class="text-xs text-slate-400 mt-1">Pour les applications de production à fort trafic.</p>
        </div>
        <div>
          <span id="price-scale" class="text-3xl font-black text-white">119 €</span>
          <span class="text-xs text-slate-500">/ mois</span>
        </div>
        <ul class="space-y-2 text-xs text-slate-300">
          <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> Requêtes illimitées & Auto-scaling</li>
          <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> GPU H100 dédié & Priorité réseau</li>
          <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> SLA 99.99% & Support dédié 24/7</li>
        </ul>
        <button class="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition">
          Démarrer en Scale Pro
        </button>
      </div>

    </div>
  </section>

  <!-- FAQ Accordion -->
  <section id="faq" class="py-16 px-6 max-w-3xl mx-auto space-y-6">
    <h2 class="text-xl font-black text-white text-center">Questions Fréquentes</h2>
    <div class="space-y-3">
      <div class="faq-item p-4 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
        <div class="flex justify-between items-center">
          <h4 class="text-xs font-bold text-white">Comment fonctionne la période d'essai de 14 jours ?</h4>
          <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 transition transform"></i>
        </div>
        <p class="text-xs text-slate-400 mt-2 hidden faq-answer">Vous bénéficiez d'un accès complet à toutes les fonctionnalités sans avoir à renseigner votre carte bancaire.</p>
      </div>
      <div class="faq-item p-4 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
        <div class="flex justify-between items-center">
          <h4 class="text-xs font-bold text-white">Puis-je changer d'offre à tout moment ?</h4>
          <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 transition transform"></i>
        </div>
        <p class="text-xs text-slate-400 mt-2 hidden faq-answer">Oui, vous pouvez upgrader ou rétrograder votre plan en 1 clic depuis votre espace administrateur avec prorata au millième de seconde.</p>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="mt-auto border-t border-slate-800 bg-slate-950 py-8 px-6 text-center text-xs text-slate-500">
    <p>© 2026 ${bp.title}. Tous droits réservés. Hébergé en Europe avec garantie de souveraineté numérique.</p>
  </footer>

  <script>
    const btnMonthly = document.getElementById('btn-billing-monthly');
    const btnAnnual = document.getElementById('btn-billing-annual');
    const priceStarter = document.getElementById('price-starter');
    const priceScale = document.getElementById('price-scale');

    btnMonthly.addEventListener('click', () => {
      btnMonthly.className = 'px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow';
      btnAnnual.className = 'px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition flex items-center gap-1.5';
      priceStarter.textContent = '29 €';
      priceScale.textContent = '119 €';
    });

    btnAnnual.addEventListener('click', () => {
      btnAnnual.className = 'px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow flex items-center gap-1.5';
      btnMonthly.className = 'px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition';
      priceStarter.textContent = '23 €';
      priceScale.textContent = '95 €';
    });

    document.querySelectorAll('.faq-item').forEach(item => {
      item.addEventListener('click', () => {
        const ans = item.querySelector('.faq-answer');
        const icon = item.querySelector('svg') || item.querySelector('i');
        if (ans.classList.contains('hidden')) {
          ans.classList.remove('hidden');
          if (icon) icon.style.transform = 'rotate(180deg)';
        } else {
          ans.classList.add('hidden');
          if (icon) icon.style.transform = 'rotate(0deg)';
        }
      });
    });

    document.addEventListener('DOMContentLoaded', () => {
      if (window.lucide) lucide.createIcons();
    });
  </script>
</body>
</html>`;
}
