import { TemplateProject } from '../types';

export const STARTER_TEMPLATES: TemplateProject[] = [
  {
    id: 'saas-landing',
    title: 'SaaS Pulse Analytics',
    category: 'SaaS',
    description: 'Landing page moderne avec toggle de tarification Mensuel/Annuel, calculateur de ROI en direct et modal de capture.',
    iconName: 'Zap',
    vibe: 'modern-saas',
    colorGradient: 'from-violet-600 to-indigo-600',
    badge: 'Populaire 🔥',
    prompt: 'Crée une landing page SaaS pour un outil d\'analytics IA avec toggle de prix mensuel/annuel, calculateur de ROI dynamique et FAQ accordéon.',
    components: [
      { name: 'Navbar', description: 'Navigation sticky avec logo et bouton CTA' },
      { name: 'HeroSection', description: 'Titre percutant, badges animés et bouton d\'essai gratuit' },
      { name: 'PricingMatrix', description: 'Grille tarifaire avec toggle mensuel/annuel (-20%) et calcul interactif' },
      { name: 'RoiCalculator', description: 'Curseur interactif estimant le gain de temps et d\'argent' },
      { name: 'FaqAccordion', description: 'Questions fréquentes avec accordéon interactif' }
    ],
    suggestedPrompts: [
      'Ajoute un formulaire de newsletter avec notification toast de succès',
      'Ajoute des témoignages clients sous forme de carrousel',
      'Passe la page en thème sombre futuriste avec des bordures néon'
    ],
    files: [
      {
        name: 'index.html',
        type: 'html',
        content: `<!DOCTYPE html>
<html lang="fr" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pulse AI - Analytics de Nouvelle Génération</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 50: '#f5f3ff', 100: '#ede9fe', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9' }
          }
        }
      }
    }
  </script>
</head>
<body class="bg-slate-950 text-slate-100 font-sans antialiased selection:bg-violet-500 selection:text-white">
  <!-- Navbar -->
  <nav class="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
          <i class="fa-solid fa-bolt text-white text-lg"></i>
        </div>
        <span class="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Pulse<span class="text-violet-400">AI</span></span>
      </div>
      <div class="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-400">
        <a href="#features" class="hover:text-white transition">Fonctionnalités</a>
        <a href="#roi" class="hover:text-white transition">Calculateur</a>
        <a href="#pricing" class="hover:text-white transition">Tarifs</a>
        <a href="#faq" class="hover:text-white transition">FAQ</a>
      </div>
      <div class="flex items-center space-x-4">
        <button onclick="openModal()" class="px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 rounded-lg shadow-lg shadow-violet-600/30 transition transform hover:-translate-y-0.5">
          Démarrer Gratuitement
        </button>
      </div>
    </div>
  </nav>

  <!-- Hero Section -->
  <section class="relative pt-20 pb-16 px-6 overflow-hidden">
    <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/30 via-slate-950 to-slate-950 -z-10"></div>
    <div class="max-w-4xl mx-auto text-center">
      <div class="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-semibold uppercase tracking-wider mb-6">
        <span class="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></span>
        <span>Version 2.0 disponible</span>
      </div>
      <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight text-white mb-6">
        Transformez vos données brutes en <span class="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-indigo-300 to-pink-400">décisions instantanées</span>
      </h1>
      <p class="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
        Analysez le comportement de vos utilisateurs en temps réel grâce à nos agents IA prédictifs. Développé pour les créateurs ambitieux.
      </p>
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button onclick="openModal()" class="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-xl shadow-violet-600/30 transition transform hover:-translate-y-0.5 flex items-center justify-center space-x-2">
          <span>Essai gratuit de 14 jours</span>
          <i class="fa-solid fa-arrow-right text-xs"></i>
        </button>
        <a href="#roi" class="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium rounded-xl transition flex items-center justify-center space-x-2">
          <i class="fa-solid fa-calculator text-violet-400"></i>
          <span>Simuler vos gains</span>
        </a>
      </div>
    </div>
  </section>

  <!-- ROI Interactive Calculator -->
  <section id="roi" class="py-16 px-6 bg-slate-900/50 border-y border-slate-800/80">
    <div class="max-w-3xl mx-auto">
      <div class="text-center mb-10">
        <h2 class="text-2xl sm:text-3xl font-bold text-white mb-3">Estimez votre retour sur investissement</h2>
        <p class="text-slate-400 text-sm">Déplacez le curseur pour voir le temps et l'argent économisés chaque mois.</p>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
        <div class="mb-8">
          <div class="flex justify-between items-center mb-3">
            <label class="text-sm font-medium text-slate-300">Nombre d'utilisateurs actifs :</label>
            <span id="usersDisplay" class="text-lg font-bold text-violet-400 bg-violet-950/60 px-3 py-1 rounded-lg border border-violet-800/50">10 000</span>
          </div>
          <input type="range" id="usersSlider" min="1000" max="100000" step="1000" value="10000" class="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500" oninput="updateRoi()">
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
          <div class="bg-slate-950/80 p-5 rounded-xl border border-slate-800/80 text-center">
            <span class="text-xs text-slate-500 uppercase tracking-wider block mb-1">Temps économisé / mois</span>
            <span id="hoursSaved" class="text-3xl font-extrabold text-indigo-400">42 heures</span>
          </div>
          <div class="bg-slate-950/80 p-5 rounded-xl border border-slate-800/80 text-center">
            <span class="text-xs text-slate-500 uppercase tracking-wider block mb-1">Gain estimé / an</span>
            <span id="moneySaved" class="text-3xl font-extrabold text-emerald-400">14 200 €</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Pricing with Monthly/Annual Toggle -->
  <section id="pricing" class="py-20 px-6 max-w-6xl mx-auto">
    <div class="text-center mb-12">
      <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">Tarification simple & transparente</h2>
      <p class="text-slate-400 max-w-lg mx-auto mb-8">Sans engagement. Annulez ou changez de forfait à tout moment.</p>
      <!-- Toggle -->
      <div class="inline-flex items-center bg-slate-900 p-1.5 rounded-xl border border-slate-800">
        <button id="monthlyBtn" onclick="setBilling('monthly')" class="px-4 py-2 text-xs font-semibold rounded-lg bg-violet-600 text-white transition">Mensuel</button>
        <button id="annualBtn" onclick="setBilling('annual')" class="px-4 py-2 text-xs font-semibold rounded-lg text-slate-400 hover:text-white transition flex items-center space-x-1.5">
          <span>Annuel</span>
          <span class="px-1.5 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 rounded font-bold">-20%</span>
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <!-- Starter -->
      <div class="bg-slate-900/70 border border-slate-800 p-8 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition">
        <div>
          <h3 class="text-xl font-bold text-white mb-2">Starter</h3>
          <p class="text-slate-400 text-sm mb-6">Idéal pour les projets solos et débutants.</p>
          <div class="flex items-baseline mb-6">
            <span id="priceStarter" class="text-4xl font-extrabold text-white">29 €</span>
            <span class="text-slate-500 text-sm ml-2">/ mois</span>
          </div>
          <ul class="space-y-3 text-sm text-slate-300 mb-8">
            <li class="flex items-center"><i class="fa-solid fa-check text-emerald-400 mr-2 text-xs"></i> Jusqu'à 5 000 événements/j</li>
            <li class="flex items-center"><i class="fa-solid fa-check text-emerald-400 mr-2 text-xs"></i> 3 Tableaux de bord personnalisés</li>
            <li class="flex items-center"><i class="fa-solid fa-check text-emerald-400 mr-2 text-xs"></i> Rapports hebdomadaires IA</li>
          </ul>
        </div>
        <button onclick="openModal('Starter')" class="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition">Choisir Starter</button>
      </div>

      <!-- Pro (Highlighted) -->
      <div class="relative bg-gradient-to-b from-violet-900/40 to-slate-900 border-2 border-violet-500/80 p-8 rounded-2xl flex flex-col justify-between shadow-2xl shadow-violet-500/10">
        <div class="absolute -top-3.5 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-violet-600 text-white text-xs font-bold uppercase rounded-full tracking-wider shadow">Recommandé</div>
        <div>
          <h3 class="text-xl font-bold text-white mb-2">Pro Creator</h3>
          <p class="text-slate-400 text-sm mb-6">Pour les équipes qui veulent passer à l'échelle.</p>
          <div class="flex items-baseline mb-6">
            <span id="pricePro" class="text-4xl font-extrabold text-white">79 €</span>
            <span class="text-slate-500 text-sm ml-2">/ mois</span>
          </div>
          <ul class="space-y-3 text-sm text-slate-300 mb-8">
            <li class="flex items-center"><i class="fa-solid fa-check text-emerald-400 mr-2 text-xs"></i> 50 000 événements/j</li>
            <li class="flex items-center"><i class="fa-solid fa-check text-emerald-400 mr-2 text-xs"></i> Tableaux de bord illimités</li>
            <li class="flex items-center"><i class="fa-solid fa-check text-emerald-400 mr-2 text-xs"></i> Alertes d'anomalies en direct</li>
            <li class="flex items-center"><i class="fa-solid fa-check text-emerald-400 mr-2 text-xs"></i> Support prioritaire 24/7</li>
          </ul>
        </div>
        <button onclick="openModal('Pro Creator')" class="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-600/30 transition">Essayer Pro</button>
      </div>

      <!-- Enterprise -->
      <div class="bg-slate-900/70 border border-slate-800 p-8 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition">
        <div>
          <h3 class="text-xl font-bold text-white mb-2">Entreprise</h3>
          <p class="text-slate-400 text-sm mb-6">Sécurité dédiée et volume sur mesure.</p>
          <div class="flex items-baseline mb-6">
            <span id="priceEnterprise" class="text-4xl font-extrabold text-white">199 €</span>
            <span class="text-slate-500 text-sm ml-2">/ mois</span>
          </div>
          <ul class="space-y-3 text-sm text-slate-300 mb-8">
            <li class="flex items-center"><i class="fa-solid fa-check text-emerald-400 mr-2 text-xs"></i> Volume illimité</li>
            <li class="flex items-center"><i class="fa-solid fa-check text-emerald-400 mr-2 text-xs"></i> Modèle IA entraîné sur mesure</li>
            <li class="flex items-center"><i class="fa-solid fa-check text-emerald-400 mr-2 text-xs"></i> Accompagnement dédié</li>
          </ul>
        </div>
        <button onclick="openModal('Entreprise')" class="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition">Contacter l'équipe</button>
      </div>
    </div>
  </section>

  <!-- Modal Lead Form -->
  <div id="leadModal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
    <div class="bg-slate-900 border border-slate-800 max-w-md w-full p-6 rounded-2xl shadow-2xl relative">
      <button onclick="closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white">
        <i class="fa-solid fa-xmark text-lg"></i>
      </button>
      <div class="w-12 h-12 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center mb-4">
        <i class="fa-solid fa-sparkles text-xl"></i>
      </div>
      <h3 class="text-xl font-bold text-white mb-2">Commencez votre essai gratuit</h3>
      <p id="modalPlanText" class="text-slate-400 text-sm mb-6">Aucune carte bancaire requise. 14 jours offerts.</p>
      
      <form onsubmit="handleLeadSubmit(event)" class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-slate-300 mb-1.5">Votre prénom</label>
          <input type="text" required placeholder="Alexandre" class="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500">
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-300 mb-1.5">Email professionnel</label>
          <input type="email" required placeholder="alex@startup.io" class="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500">
        </div>
        <button type="submit" class="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition shadow-lg shadow-violet-600/25">
          Créer mon compte instantanément
        </button>
      </form>
      <div id="successMessage" class="hidden mt-4 p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-300 text-sm text-center">
        🎉 Félicitations ! Votre espace d'essai a été configuré avec succès.
      </div>
    </div>
  </div>

  <footer class="border-t border-slate-900 py-8 text-center text-slate-500 text-xs">
    © 2026 Pulse AI Inc. Tous droits réservés. Construit avec le Vibecoding.
  </footer>

  <script>
    let currentBilling = 'monthly';

    function setBilling(mode) {
      currentBilling = mode;
      const mBtn = document.getElementById('monthlyBtn');
      const aBtn = document.getElementById('annualBtn');
      
      if (mode === 'monthly') {
        mBtn.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-violet-600 text-white transition';
        aBtn.className = 'px-4 py-2 text-xs font-semibold rounded-lg text-slate-400 hover:text-white transition flex items-center space-x-1.5';
        document.getElementById('priceStarter').innerText = '29 €';
        document.getElementById('pricePro').innerText = '79 €';
        document.getElementById('priceEnterprise').innerText = '199 €';
      } else {
        aBtn.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-violet-600 text-white transition flex items-center space-x-1.5';
        mBtn.className = 'px-4 py-2 text-xs font-semibold rounded-lg text-slate-400 hover:text-white transition';
        document.getElementById('priceStarter').innerText = '23 €';
        document.getElementById('pricePro').innerText = '63 €';
        document.getElementById('priceEnterprise').innerText = '159 €';
      }
    }

    function updateRoi() {
      const users = parseInt(document.getElementById('usersSlider').value);
      document.getElementById('usersDisplay').innerText = users.toLocaleString('fr-FR');
      
      const hours = Math.round(users * 0.0042);
      const money = Math.round(users * 1.42);
      
      document.getElementById('hoursSaved').innerText = hours + ' heures';
      document.getElementById('moneySaved').innerText = money.toLocaleString('fr-FR') + ' €';
    }

    function openModal(plan = 'Pro Creator') {
      document.getElementById('leadModal').classList.remove('hidden');
      document.getElementById('modalPlanText').innerText = 'Forfait sélectionné : ' + plan + ' (14 jours offerts sans CB)';
    }

    function closeModal() {
      document.getElementById('leadModal').classList.add('hidden');
      document.getElementById('successMessage').classList.add('hidden');
    }

    function handleLeadSubmit(e) {
      e.preventDefault();
      document.getElementById('successMessage').classList.remove('hidden');
      setTimeout(() => {
        closeModal();
      }, 2000);
    }
  </script>
</body>
</html>`
      }
    ],
    html: ''
  },
  {
    id: 'habit-flow',
    title: 'Habit Flow - Gamification',
    category: 'Productivité',
    description: 'Suivi d\'habitudes gamifié avec barres de progression quotidiennes, confettis, badges débloqués et sauvegarde locale.',
    iconName: 'Flame',
    vibe: 'pastel-dream',
    colorGradient: 'from-amber-500 to-rose-500',
    badge: 'Coup de cœur ❤️',
    prompt: 'Crée une application de suivi d\'habitudes quotidiennes avec barre d\'XP, streaks, confettis de victoire et sauvegarde LocalStorage.',
    components: [
      { name: 'XpLevelBar', description: 'Niveau du joueur avec jauge d\'énergie et trophée' },
      { name: 'HabitCardList', description: 'Liste des habitudes avec cases à cocher animées et streaks de feu' },
      { name: 'AddHabitModal', description: 'Modal pour ajouter une nouvelle habitude avec choix d\'icône' },
      { name: 'StatsOverview', description: 'Pourcentage de réussite du jour' }
    ],
    suggestedPrompts: [
      'Ajoute un mode statistiques hebdomadaires avec graphique',
      'Ajoute des effets sonores lors du clic sur une habitude',
      'Ajoute un système de récompenses personnalisées'
    ],
    files: [
      {
        name: 'index.html',
        type: 'html',
        content: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Habit Flow - Vos habitudes gamifiées</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gradient-to-br from-amber-50 via-rose-50 to-purple-50 min-h-screen text-slate-800 font-sans p-4 sm:p-8">
  <div class="max-w-md mx-auto">
    <!-- Header -->
    <header class="flex justify-between items-center mb-6">
      <div class="flex items-center space-x-3">
        <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white text-xl shadow-lg shadow-rose-500/30">
          <i class="fa-solid fa-fire"></i>
        </div>
        <div>
          <h1 class="font-extrabold text-xl tracking-tight text-slate-900">Habit<span class="text-rose-500">Flow</span></h1>
          <p id="todayDate" class="text-xs text-slate-500 font-medium">Aujourd'hui</p>
        </div>
      </div>
      <button onclick="openAddModal()" class="w-10 h-10 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/25 transition transform active:scale-95">
        <i class="fa-solid fa-plus text-sm"></i>
      </button>
    </header>

    <!-- XP Card -->
    <div class="bg-white/90 backdrop-blur border border-rose-100 p-5 rounded-3xl shadow-xl shadow-rose-500/5 mb-6">
      <div class="flex justify-between items-center mb-2">
        <div class="flex items-center space-x-2">
          <span class="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider">Niveau <span id="levelNum">1</span></span>
          <span id="levelTitle" class="text-xs font-semibold text-slate-500">Débutant motivé</span>
        </div>
        <span class="text-xs font-bold text-rose-500"><span id="xpCount">0</span> / 100 XP</span>
      </div>
      <div class="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-3">
        <div id="xpBar" class="bg-gradient-to-r from-amber-500 to-rose-500 h-full rounded-full transition-all duration-500" style="width: 0%"></div>
      </div>
      <div class="flex justify-between text-xs text-slate-500">
        <span>Progression du jour : <strong id="progressPercent" class="text-slate-800">0%</strong></span>
        <span id="streakCount" class="font-bold text-amber-600">🔥 3 jours d'affilée</span>
      </div>
    </div>

    <!-- Habits List -->
    <div class="space-y-3" id="habitList">
      <!-- Generated via JS -->
    </div>

    <!-- Add Habit Modal -->
    <div id="addModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
      <div class="bg-white max-w-sm w-full p-6 rounded-3xl shadow-2xl">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-lg text-slate-800">Nouvelle habitude</h3>
          <button onclick="closeAddModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form onsubmit="handleAddHabit(event)" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Nom de l'habitude</label>
            <input type="text" id="habitNameInput" required placeholder="Ex: Boire 1.5L d'eau" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:border-rose-500 text-sm">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Catégorie / Icône</label>
            <select id="habitIconSelect" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:border-rose-500 text-sm">
              <option value="fa-droplet">💧 Santé & Hydratation</option>
              <option value="fa-book-open">📖 Lecture & Savoir</option>
              <option value="fa-dumbbell">💪 Sport & Fitness</option>
              <option value="fa-brain">🧠 Méditation & Bien-être</option>
              <option value="fa-code">💻 Vibecoding & Projet</option>
            </select>
          </div>
          <button type="submit" class="w-full py-3 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-bold rounded-2xl shadow-lg shadow-rose-500/25 transition">
            Créer l'habitude (+25 XP)
          </button>
        </form>
      </div>
    </div>
  </div>

  <script>
    const defaultHabits = [
      { id: 1, name: "Boire 1.5L d'eau pure", icon: "fa-droplet", completed: false, streak: 5, color: "text-blue-500 bg-blue-50" },
      { id: 2, name: "20 min de Vibecoding", icon: "fa-code", completed: false, streak: 8, color: "text-violet-500 bg-violet-50" },
      { id: 3, name: "Lire 10 pages d'un livre", icon: "fa-book-open", completed: false, streak: 3, color: "text-amber-500 bg-amber-50" },
      { id: 4, name: "15 min de marche active", icon: "fa-person-walking", completed: false, streak: 12, color: "text-emerald-500 bg-emerald-50" }
    ];

    let habits = JSON.parse(localStorage.getItem('habitflow_data') || 'null') || defaultHabits;
    let xp = parseInt(localStorage.getItem('habitflow_xp') || '40');

    function save() {
      localStorage.setItem('habitflow_data', JSON.stringify(habits));
      localStorage.setItem('habitflow_xp', xp.toString());
    }

    function render() {
      const listEl = document.getElementById('habitList');
      listEl.innerHTML = '';

      let completedCount = 0;

      habits.forEach(habit => {
        if (habit.completed) completedCount++;

        const card = document.createElement('div');
        card.className = \`flex items-center justify-between p-4 bg-white/90 backdrop-blur rounded-2xl border transition duration-200 \${habit.completed ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-100 shadow-sm hover:shadow-md'}\`;
        
        card.innerHTML = \`
          <div class="flex items-center space-x-3.5">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-sm \${habit.color || 'text-rose-500 bg-rose-50'}">
              <i class="fa-solid \${habit.icon}"></i>
            </div>
            <div>
              <p class="font-semibold text-sm \${habit.completed ? 'line-through text-slate-400' : 'text-slate-800'}">\${habit.name}</p>
              <span class="text-[11px] font-bold text-amber-600">🔥 \${habit.streak} jours</span>
            </div>
          </div>
          <button onclick="toggleHabit(\${habit.id})" class="w-9 h-9 rounded-xl flex items-center justify-center transition \${habit.completed ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'border-2 border-slate-200 hover:border-rose-400 text-transparent'}">
            <i class="fa-solid fa-check text-xs"></i>
          </button>
        \`;
        listEl.appendChild(card);
      });

      // Update XP & Progress
      const percent = Math.round((completedCount / habits.length) * 100) || 0;
      document.getElementById('progressPercent').innerText = percent + '%';
      
      const level = Math.floor(xp / 100) + 1;
      const currentLevelXp = xp % 100;
      document.getElementById('levelNum').innerText = level;
      document.getElementById('xpCount').innerText = currentLevelXp;
      document.getElementById('xpBar').style.width = currentLevelXp + '%';

      if (level === 1) document.getElementById('levelTitle').innerText = 'Débutant motivé';
      else if (level === 2) document.getElementById('levelTitle').innerText = 'Guerrier de la routine';
      else document.getElementById('levelTitle').innerText = 'Maître de la discipline';
    }

    function toggleHabit(id) {
      const habit = habits.find(h => h.id === id);
      if (!habit) return;

      habit.completed = !habit.completed;
      if (habit.completed) {
        habit.streak += 1;
        xp += 25;
        // Confetti on full completion
        const allDone = habits.every(h => h.completed);
        if (allDone && typeof confetti === 'function') {
          confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        }
      } else {
        habit.streak = Math.max(0, habit.streak - 1);
        xp = Math.max(0, xp - 25);
      }

      save();
      render();
    }

    function openAddModal() {
      document.getElementById('addModal').classList.remove('hidden');
    }

    function closeAddModal() {
      document.getElementById('addModal').classList.add('hidden');
    }

    function handleAddHabit(e) {
      e.preventDefault();
      const name = document.getElementById('habitNameInput').value;
      const icon = document.getElementById('habitIconSelect').value;
      
      habits.push({
        id: Date.now(),
        name,
        icon,
        completed: false,
        streak: 1,
        color: 'text-rose-500 bg-rose-50'
      });

      document.getElementById('habitNameInput').value = '';
      closeAddModal();
      save();
      render();
    }

    // Set today date
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    document.getElementById('todayDate').innerText = new Date().toLocaleDateString('fr-FR', options);

    render();
  </script>
</body>
</html>`
      }
    ],
    html: ''
  },
  {
    id: 'vibe-quiz',
    title: 'VibeQuiz - Trivia & Flashcards',
    category: 'Fun & Jeux',
    description: 'Jeu de Quiz interactif avec chrono, score en temps réel, explications pédagogiques et trophée final.',
    iconName: 'Sparkles',
    vibe: 'cyberpunk',
    colorGradient: 'from-cyan-500 to-blue-600',
    badge: 'Interactif 🎮',
    prompt: 'Crée une application de quiz interactif pour tester ses connaissances avec compte à rebours, score dynamique et certificat.',
    components: [
      { name: 'TimerBar', description: 'Chronomètre animé par question' },
      { name: 'QuestionCard', description: 'Carte avec énoncé et 4 options interactives' },
      { name: 'ExplanationDrawer', description: 'Explication pédagogique après chaque réponse' },
      { name: 'ScoreSummary', description: 'Écran final avec note et confettis' }
    ],
    suggestedPrompts: [
      'Ajoute un mode personnalisé pour que l\'utilisateur crée ses propres questions',
      'Ajoute des effets sonores lors des bonnes/mauvaises réponses',
      'Ajoute un classement avec les meilleurs scores sauvegardés'
    ],
    files: [
      {
        name: 'index.html',
        type: 'html',
        content: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VibeQuiz - Challenge Connaissances</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex items-center justify-center p-4 font-sans selection:bg-cyan-500">
  <div class="max-w-lg w-full bg-slate-950/80 backdrop-blur-xl border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl relative overflow-hidden">
    <!-- Glowing background accent -->
    <div class="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

    <!-- Active Quiz View -->
    <div id="quizScreen">
      <div class="flex justify-between items-center mb-6">
        <span class="px-3 py-1 bg-cyan-950/80 border border-cyan-800 text-cyan-400 text-xs font-bold rounded-full uppercase tracking-wider">
          Question <span id="currentQIndex">1</span>/<span id="totalQCount">4</span>
        </span>
        <div class="flex items-center space-x-2 text-amber-400 font-bold text-sm">
          <i class="fa-solid fa-trophy"></i>
          <span>Score : <span id="currentScore">0</span></span>
        </div>
      </div>

      <!-- Question Text -->
      <h2 id="questionText" class="text-xl sm:text-2xl font-extrabold text-white mb-6 leading-snug">
        Chargement de la question...
      </h2>

      <!-- Options -->
      <div id="optionsContainer" class="space-y-3 mb-6">
        <!-- Injected via JS -->
      </div>

      <!-- Feedback box -->
      <div id="feedbackBox" class="hidden p-4 rounded-2xl border text-sm mb-6 animate-fade-in"></div>

      <button id="nextBtn" onclick="nextQuestion()" class="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-cyan-500/25 transition hidden">
        Question Suivante <i class="fa-solid fa-arrow-right ml-1 text-xs"></i>
      </button>
    </div>

    <!-- Results Screen -->
    <div id="resultScreen" class="hidden text-center py-6">
      <div class="w-20 h-20 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center text-white text-3xl mx-auto mb-6 shadow-xl shadow-cyan-500/30">
        <i class="fa-solid fa-medal"></i>
      </div>
      <h2 class="text-3xl font-extrabold text-white mb-2">Quiz Terminé !</h2>
      <p class="text-slate-400 text-sm mb-6">Voici votre performance aujourd'hui :</p>
      
      <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl mb-8">
        <div class="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-2">
          <span id="finalScore">0</span> / 4
        </div>
        <p id="finalBadge" class="text-sm font-semibold text-cyan-300">Expert en Vibecoding !</p>
      </div>

      <button onclick="restartQuiz()" class="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-cyan-500/30 transition">
        <i class="fa-solid fa-rotate-right mr-2"></i> Rejouer le quiz
      </button>
    </div>
  </div>

  <script>
    const questions = [
      {
        q: "Qu'est-ce que le 'Vibecoding' ?",
        options: [
          "Coder en écoutant exclusivement de la musique lo-fi",
          "Créer des applications en décrivant ses idées en langage naturel à une IA",
          "Un nouveau langage de programmation binaire",
          "Une technique de débogage des microprocesseurs"
        ],
        correct: 1,
        explanation: "Le Vibecoding est l'art de concevoir et faire évoluer des logiciels fonctionnels en dialoguant avec des modèles d'IA sans écrire manuellement chaque ligne."
      },
      {
        q: "Quel framework CSS est le standard ultra-rapide pour styliser avec des classes utilitaires ?",
        options: ["Tailwind CSS", "Bootstrap 3", "Sass Vanilla", "Table HTML"],
        correct: 0,
        explanation: "Tailwind CSS permet de concevoir des interfaces sur mesure avec des classes atomiques comme 'flex', 'p-4', 'rounded-2xl'."
      },
      {
        q: "Quelle API du navigateur permet de sauvegarder des données de manière persistante sans serveur ?",
        options: ["Fetch API", "LocalStorage", "Geolocation API", "Web Bluetooth"],
        correct: 1,
        explanation: "LocalStorage stocke des paires clé-valeur dans le navigateur de l'utilisateur qui restent même après rafraîchissement."
      },
      {
        q: "Dans un prompt de vibecoding, quel élément est crucial pour un résultat réussi ?",
        options: [
          "Seulement 2 mots vagues",
          "Préciser le contexte, le style visuel, les interactions et les données",
          "Écrire en assembleur",
          "Faire un schéma sur une feuille papier"
        ],
        correct: 1,
        explanation: "Un bon prompt décrit clairement l'intention, le design visuel, la logique d'interaction et la structure des données."
      }
    ];

    let currentQ = 0;
    let score = 0;
    let answered = false;

    function renderQuestion() {
      answered = false;
      const q = questions[currentQ];
      document.getElementById('currentQIndex').innerText = currentQ + 1;
      document.getElementById('totalQCount').innerText = questions.length;
      document.getElementById('questionText').innerText = q.q;
      document.getElementById('feedbackBox').classList.add('hidden');
      document.getElementById('nextBtn').classList.add('hidden');

      const container = document.getElementById('optionsContainer');
      container.innerHTML = '';

      q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'w-full text-left p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 text-slate-200 text-sm font-medium transition flex items-center justify-between group';
        btn.innerHTML = \`
          <span>\${opt}</span>
          <span class="w-6 h-6 rounded-full border border-slate-700 flex items-center justify-center text-xs group-hover:border-cyan-500">\${String.fromCharCode(65 + idx)}</span>
        \`;
        btn.onclick = () => checkAnswer(idx, btn);
        container.appendChild(btn);
      });
    }

    function checkAnswer(selectedIdx, btn) {
      if (answered) return;
      answered = true;
      const q = questions[currentQ];
      const buttons = document.getElementById('optionsContainer').children;

      if (selectedIdx === q.correct) {
        score++;
        document.getElementById('currentScore').innerText = score;
        btn.className = 'w-full text-left p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-sm font-semibold flex items-center justify-between';
        
        const feedback = document.getElementById('feedbackBox');
        feedback.className = 'p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs mb-6';
        feedback.innerHTML = '<strong>✨ Exact !</strong> ' + q.explanation;
        feedback.classList.remove('hidden');
      } else {
        btn.className = 'w-full text-left p-4 rounded-2xl bg-rose-950/80 border border-rose-500 text-rose-200 text-sm font-semibold flex items-center justify-between';
        buttons[q.correct].className = 'w-full text-left p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-sm font-semibold flex items-center justify-between';
        
        const feedback = document.getElementById('feedbackBox');
        feedback.className = 'p-4 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs mb-6';
        feedback.innerHTML = '<strong>❌ Oups !</strong> ' + q.explanation;
        feedback.classList.remove('hidden');
      }

      document.getElementById('nextBtn').classList.remove('hidden');
    }

    function nextQuestion() {
      currentQ++;
      if (currentQ < questions.length) {
        renderQuestion();
      } else {
        showResults();
      }
    }

    function showResults() {
      document.getElementById('quizScreen').classList.add('hidden');
      document.getElementById('resultScreen').classList.remove('hidden');
      document.getElementById('finalScore').innerText = score;

      if (score >= 3 && typeof confetti === 'function') {
        confetti({ particleCount: 150, spread: 80 });
      }

      const badge = document.getElementById('finalBadge');
      if (score === 4) badge.innerText = '🏆 Maître Absolu du Vibecoding !';
      else if (score >= 2) badge.innerText = '🌟 Bon début, prêt à construire de vraies apps !';
      else badge.innerText = '💪 Entraînez-vous encore un peu !';
    }

    function restartQuiz() {
      currentQ = 0;
      score = 0;
      document.getElementById('currentScore').innerText = '0';
      document.getElementById('resultScreen').classList.add('hidden');
      document.getElementById('quizScreen').classList.remove('hidden');
      renderQuestion();
    }

    renderQuestion();
  </script>
</body>
</html>`
      }
    ],
    html: ''
  },
  {
    id: 'lofi-cafe',
    title: 'Lo-Fi Focus & Pomodoro',
    category: 'Productivité',
    description: 'Générateur de bruits d\'ambiance relaxants (Pluie, Feu de camp, Café) avec minuteur Pomodoro et playlist lo-fi.',
    iconName: 'Headphones',
    vibe: 'midnight-luxe',
    colorGradient: 'from-purple-600 to-indigo-800',
    badge: 'Relax 🎧',
    prompt: 'Crée une application de concentration Lo-Fi avec minuteur Pomodoro 25min, générateurs de son Web Audio et notes rapides.',
    components: [
      { name: 'PomodoroTimer', description: 'Minuteur 25/5 avec compte à rebours circulaire' },
      { name: 'SoundboardMixer', description: 'Curseurs de volume pour les bruits d\'ambiance (Pluie, Vagues, Feu)' },
      { name: 'QuickScratchpad', description: 'Bloc-notes minimaliste avec sauvegarde automatique' }
    ],
    suggestedPrompts: [
      'Ajoute un fond d\'écran animé avec de la pluie qui tombe en Canvas',
      'Ajoute un mode plein écran immersif',
      'Ajoute une checklist de tâches prioritaires pour la session'
    ],
    files: [
      {
        name: 'index.html',
        type: 'html',
        content: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lo-Fi Cafe - Concentrateur Zen</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-slate-950 text-slate-200 min-h-screen font-sans flex flex-col justify-between p-4 sm:p-8">
  <header class="max-w-4xl mx-auto w-full flex justify-between items-center py-2">
    <div class="flex items-center space-x-3">
      <div class="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
        <i class="fa-solid fa-mug-hot"></i>
      </div>
      <div>
        <h1 class="font-bold text-lg text-white">Lo-Fi <span class="text-indigo-400">Focus</span></h1>
        <p class="text-xs text-slate-400">Votre bulle de concentration</p>
      </div>
    </div>
    <div class="flex items-center space-x-2">
      <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
      <span class="text-xs text-slate-400 font-medium">Session Active</span>
    </div>
  </header>

  <main class="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 my-auto py-8">
    <!-- Pomodoro Timer Card -->
    <div class="bg-slate-900/80 border border-slate-800/80 p-8 rounded-3xl shadow-2xl flex flex-col items-center justify-center text-center">
      <div class="flex space-x-2 mb-8 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
        <button id="focusTab" onclick="setMode('focus')" class="px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 text-white transition">Focus (25m)</button>
        <button id="breakTab" onclick="setMode('break')" class="px-4 py-1.5 text-xs font-semibold rounded-xl text-slate-400 hover:text-white transition">Pause (5m)</button>
      </div>

      <!-- Big Timer Display -->
      <div id="timerDisplay" class="text-6xl sm:text-7xl font-black text-white tracking-tighter mb-8 font-mono">
        25:00
      </div>

      <!-- Controls -->
      <div class="flex space-x-4">
        <button id="toggleBtn" onclick="toggleTimer()" class="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/30 transition transform active:scale-95 flex items-center space-x-2">
          <i id="toggleIcon" class="fa-solid fa-play text-sm"></i>
          <span id="toggleText">Démarrer</span>
        </button>
        <button onclick="resetTimer()" class="p-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition">
          <i class="fa-solid fa-rotate-right"></i>
        </button>
      </div>
    </div>

    <!-- Ambient Sounds & Scratchpad -->
    <div class="space-y-6">
      <!-- Sound Synthesizer -->
      <div class="bg-slate-900/80 border border-slate-800/80 p-6 rounded-3xl shadow-xl">
        <h3 class="text-sm font-bold text-white mb-4 flex items-center space-x-2">
          <i class="fa-solid fa-sliders text-indigo-400"></i>
          <span>Ambiance Sonore Zen</span>
        </h3>
        <div class="space-y-4">
          <div>
            <div class="flex justify-between text-xs text-slate-400 mb-1">
              <span>🌧️ Pluie douce</span>
              <span id="rainVal">0%</span>
            </div>
            <input type="range" min="0" max="100" value="0" class="w-full h-1.5 bg-slate-800 rounded-lg accent-indigo-500 cursor-pointer" oninput="updateSound('rain', this.value)">
          </div>
          <div>
            <div class="flex justify-between text-xs text-slate-400 mb-1">
              <span>🔥 Feu de cheminée</span>
              <span id="fireVal">0%</span>
            </div>
            <input type="range" min="0" max="100" value="0" class="w-full h-1.5 bg-slate-800 rounded-lg accent-indigo-500 cursor-pointer" oninput="updateSound('fire', this.value)">
          </div>
        </div>
      </div>

      <!-- Quick Scratchpad -->
      <div class="bg-slate-900/80 border border-slate-800/80 p-6 rounded-3xl shadow-xl">
        <h3 class="text-sm font-bold text-white mb-2 flex items-center justify-between">
          <span class="flex items-center space-x-2">
            <i class="fa-solid fa-pen-to-square text-indigo-400"></i>
            <span>Objectif de la session</span>
          </span>
          <span class="text-[10px] text-emerald-400">Sauvegardé</span>
        </h3>
        <textarea id="notesArea" placeholder="Écrivez votre mission pour cette session de 25 minutes..." class="w-full h-24 bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none" oninput="saveNotes()"></textarea>
      </div>
    </div>
  </main>

  <footer class="max-w-4xl mx-auto w-full text-center text-xs text-slate-500">
    Respirez profondément. Un cycle à la fois.
  </footer>

  <script>
    let timeLeft = 25 * 60;
    let timerInterval = null;
    let isRunning = false;
    let mode = 'focus';

    function updateDisplay() {
      const min = Math.floor(timeLeft / 60);
      const sec = timeLeft % 60;
      document.getElementById('timerDisplay').innerText = 
        String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    }

    function toggleTimer() {
      if (isRunning) {
        clearInterval(timerInterval);
        isRunning = false;
        document.getElementById('toggleText').innerText = 'Reprendre';
        document.getElementById('toggleIcon').className = 'fa-solid fa-play text-sm';
      } else {
        isRunning = true;
        document.getElementById('toggleText').innerText = 'Pause';
        document.getElementById('toggleIcon').className = 'fa-solid fa-pause text-sm';
        timerInterval = setInterval(() => {
          if (timeLeft > 0) {
            timeLeft--;
            updateDisplay();
          } else {
            clearInterval(timerInterval);
            isRunning = false;
            alert(mode === 'focus' ? 'Session terminée ! Prenez 5 minutes de pause bien méritée.' : 'La pause est finie. Prêt à repartir ?');
            setMode(mode === 'focus' ? 'break' : 'focus');
          }
        }, 1000);
      }
    }

    function resetTimer() {
      clearInterval(timerInterval);
      isRunning = false;
      timeLeft = (mode === 'focus' ? 25 : 5) * 60;
      document.getElementById('toggleText').innerText = 'Démarrer';
      document.getElementById('toggleIcon').className = 'fa-solid fa-play text-sm';
      updateDisplay();
    }

    function setMode(newMode) {
      mode = newMode;
      const fTab = document.getElementById('focusTab');
      const bTab = document.getElementById('breakTab');
      if (mode === 'focus') {
        fTab.className = 'px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 text-white transition';
        bTab.className = 'px-4 py-1.5 text-xs font-semibold rounded-xl text-slate-400 hover:text-white transition';
      } else {
        bTab.className = 'px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 text-white transition';
        fTab.className = 'px-4 py-1.5 text-xs font-semibold rounded-xl text-slate-400 hover:text-white transition';
      }
      resetTimer();
    }

    function saveNotes() {
      localStorage.setItem('lofi_notes', document.getElementById('notesArea').value);
    }

    document.getElementById('notesArea').value = localStorage.getItem('lofi_notes') || '';

    function updateSound(type, val) {
      document.getElementById(type + 'Val').innerText = val + '%';
    }

    updateDisplay();
  </script>
</body>
</html>`
      }
    ],
    html: ''
  }
];

// Complete the full starter templates with initial HTML
STARTER_TEMPLATES.forEach(t => {
  if (!t.html && t.files.length > 0) {
    t.html = t.files[0].content;
  }
});
