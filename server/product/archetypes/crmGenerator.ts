import { ProductBlueprint } from '../productBlueprint';
import { UXPlan } from '../uxProductPlanner';

export function generateCrmApp(bp: ProductBlueprint, ux: UXPlan): string {
  return `<!DOCTYPE html>
<html lang="fr" class="h-full bg-slate-950 text-slate-100 font-sans">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${bp.title} — Pipeline Ventes CRM</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  </style>
</head>
<body class="h-full flex flex-col bg-slate-950 text-slate-100">
  <!-- Header -->
  <header class="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-20">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold shadow-md">
        <i data-lucide="target" class="w-5 h-5"></i>
      </div>
      <div>
        <h1 class="text-sm font-bold text-white tracking-tight">${bp.title}</h1>
        <p class="text-[11px] text-slate-400">Pipeline commercial & gestion des opportunités</p>
      </div>
    </div>
    
    <div class="flex items-center gap-3">
      <div class="text-right hidden sm:block">
        <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Valeur Pipeline Active</span>
        <span id="pipeline-total-val" class="text-sm font-extrabold text-emerald-400">184 500 €</span>
      </div>
      <button id="btn-open-deal-modal" class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition">
        <i data-lucide="plus" class="w-4 h-4"></i>
        <span>Nouveau Deal</span>
      </button>
    </div>
  </header>

  <!-- Metrics Bar -->
  <div class="bg-slate-900 border-b border-slate-800 px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
    <div>
      <span class="text-[10px] text-slate-400 block font-semibold uppercase">Deals en cours</span>
      <span id="metric-active-deals" class="text-sm font-black text-white">8 opportunités</span>
    </div>
    <div>
      <span class="text-[10px] text-slate-400 block font-semibold uppercase">Taux de closing</span>
      <span class="text-sm font-black text-emerald-400">68.4 %</span>
    </div>
    <div>
      <span class="text-[10px] text-slate-400 block font-semibold uppercase">Cycle moyen de vente</span>
      <span class="text-sm font-black text-white">18 jours</span>
    </div>
    <div>
      <span class="text-[10px] text-slate-400 block font-semibold uppercase">Revenu clôturé ce mois</span>
      <span class="text-sm font-black text-blue-400">72 000 €</span>
    </div>
  </div>

  <!-- Pipeline Kanban Board -->
  <main class="flex-1 p-6 overflow-x-auto">
    <div class="grid grid-cols-4 gap-4 min-w-[900px] h-full items-start" id="kanban-pipeline">
      
      <!-- Column 1: Nouveau Lead -->
      <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3">
        <div class="flex items-center justify-between pb-2 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
            <h3 class="text-xs font-bold text-white">Nouveau Lead</h3>
          </div>
          <span class="text-[11px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">2</span>
        </div>
        <div class="space-y-3" data-stage="lead">
          <div class="deal-card p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-sm transition space-y-2 cursor-pointer" data-id="1" data-amount="15000">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">Inbound Web</span>
              <span class="text-xs font-black text-emerald-400">15 000 €</span>
            </div>
            <h4 class="text-xs font-bold text-white">Acme Corp — Déploiement SaaS</h4>
            <p class="text-[10px] text-slate-400">Contact : Jean Dupont (CTO)</p>
            <div class="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px]">
              <span class="text-slate-500">Relance: J+2</span>
              <button class="btn-move-deal text-blue-400 font-bold hover:underline">Avancer →</button>
            </div>
          </div>
          <div class="deal-card p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-sm transition space-y-2 cursor-pointer" data-id="2" data-amount="8500">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">Partenaire</span>
              <span class="text-xs font-black text-emerald-400">8 500 €</span>
            </div>
            <h4 class="text-xs font-bold text-white">Nova Dynamics — Intégration API</h4>
            <p class="text-[10px] text-slate-400">Contact : Sarah Connor</p>
            <div class="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px]">
              <span class="text-slate-500">Relance: Aujourd'hui</span>
              <button class="btn-move-deal text-blue-400 font-bold hover:underline">Avancer →</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Column 2: Démo Réalisée -->
      <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3">
        <div class="flex items-center justify-between pb-2 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <h3 class="text-xs font-bold text-white">Démo Réalisée</h3>
          </div>
          <span class="text-[11px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">2</span>
        </div>
        <div class="space-y-3" data-stage="demo">
          <div class="deal-card p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-sm transition space-y-2 cursor-pointer" data-id="3" data-amount="34000">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">Priorité Haute</span>
              <span class="text-xs font-black text-emerald-400">34 000 €</span>
            </div>
            <h4 class="text-xs font-bold text-white">Starlight Inc — Migration Cloud</h4>
            <p class="text-[10px] text-slate-400">Contact : Marc Valette</p>
            <div class="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px]">
              <span class="text-emerald-400">Démo positive</span>
              <button class="btn-move-deal text-blue-400 font-bold hover:underline">Avancer →</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Column 3: Négociation Contrat -->
      <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3">
        <div class="flex items-center justify-between pb-2 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <h3 class="text-xs font-bold text-white">Négociation Contrat</h3>
          </div>
          <span class="text-[11px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">1</span>
        </div>
        <div class="space-y-3" data-stage="nego">
          <div class="deal-card p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-sm transition space-y-2 cursor-pointer" data-id="4" data-amount="55000">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">Grand Compte</span>
              <span class="text-xs font-black text-emerald-400">55 000 €</span>
            </div>
            <h4 class="text-xs font-bold text-white">Global Retailers — Licences Entreprise</h4>
            <p class="text-[10px] text-slate-400">Contact : Hélène Mercier</p>
            <div class="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px]">
              <span class="text-amber-400">Attente signature</span>
              <button class="btn-move-deal text-emerald-400 font-bold hover:underline">Clôturer (Gagné) ✓</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Column 4: Clôturé Gagné -->
      <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3">
        <div class="flex items-center justify-between pb-2 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h3 class="text-xs font-bold text-white">Clôturé Gagné</h3>
          </div>
          <span class="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">1</span>
        </div>
        <div class="space-y-3" data-stage="won">
          <div class="deal-card p-3 rounded-xl bg-slate-900 border border-emerald-500/40 shadow-sm transition space-y-2" data-id="5" data-amount="72000">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">Signé 🎉</span>
              <span class="text-xs font-black text-emerald-400">72 000 €</span>
            </div>
            <h4 class="text-xs font-bold text-white">Fintech Pro — Contrat Annuel</h4>
            <p class="text-[10px] text-slate-400">Validé par David R.</p>
          </div>
        </div>
      </div>

    </div>
  </main>

  <!-- Create Deal Modal -->
  <div id="modal-deal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
    <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
      <button id="btn-close-deal-modal" class="absolute top-4 right-4 text-slate-400 hover:text-white">
        <i data-lucide="x" class="w-5 h-5"></i>
      </button>
      <h3 class="text-sm font-bold text-white mb-4">Ajouter une opportunité</h3>
      <div class="space-y-3 text-xs">
        <div>
          <label class="block text-slate-400 mb-1">Nom de l'entreprise / Projet</label>
          <input type="text" id="input-deal-name" placeholder="ex: Solaria Tech" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500">
        </div>
        <div>
          <label class="block text-slate-400 mb-1">Montant estimé (€)</label>
          <input type="number" id="input-deal-amount" placeholder="ex: 25000" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500">
        </div>
        <div>
          <label class="block text-slate-400 mb-1">Nom du contact</label>
          <input type="text" id="input-deal-contact" placeholder="ex: Claire V." class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500">
        </div>
      </div>
      <div class="mt-6 flex justify-end gap-2">
        <button id="btn-submit-deal" class="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition">
          Créer l'opportunité
        </button>
      </div>
    </div>
  </div>

  <script>
    const btnOpenDeal = document.getElementById('btn-open-deal-modal');
    const modalDeal = document.getElementById('modal-deal');
    const btnCloseDeal = document.getElementById('btn-close-deal-modal');
    const btnSubmitDeal = document.getElementById('btn-submit-deal');
    const inputName = document.getElementById('input-deal-name');
    const inputAmount = document.getElementById('input-deal-amount');
    const inputContact = document.getElementById('input-deal-contact');

    btnOpenDeal.addEventListener('click', () => modalDeal.classList.remove('hidden'));
    btnCloseDeal.addEventListener('click', () => modalDeal.classList.add('hidden'));

    btnSubmitDeal.addEventListener('click', () => {
      const name = inputName.value.trim();
      const amount = inputAmount.value.trim();
      const contact = inputContact.value.trim() || 'Contact direct';
      if (name && amount) {
        alert('Nouvelle opportunité ' + name + ' (' + amount + ' €) créée !');
        modalDeal.classList.add('hidden');
        inputName.value = '';
        inputAmount.value = '';
      }
    });

    document.querySelectorAll('.btn-move-deal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        alert("Deal avancé vers l'étape suivante du pipeline !");
      });
    });

    document.addEventListener('DOMContentLoaded', () => {
      if (window.lucide) lucide.createIcons();
    });
  </script>
</body>
</html>`;
}
