import { ProductBlueprint } from './productBlueprint';
import { UXPlan } from './uxProductPlanner';
import { generateBookingApp } from './archetypes/bookingAppGenerator';
import { generateEcommerceApp } from './archetypes/ecommerceGenerator';
import { generateSocialNetworkApp } from './archetypes/socialNetworkGenerator';
import { generateCrmApp } from './archetypes/crmGenerator';
import { generateProductivityApp } from './archetypes/productivityAppGenerator';
import { generateSaasLandingApp } from './archetypes/saasLandingGenerator';
import { generateMarketplaceApp } from './archetypes/marketplaceGenerator';
import { logger } from '../logger';

export class ProductGenerator {
  /**
   * Synthesizes full, feature-rich HTML+Tailwind+JS application from Product Blueprint & UX Plan
   */
  public generateProductCode(blueprint: ProductBlueprint, uxPlan: UXPlan): string {
    logger.info('ProductGenerator', `Synthesizing code for archetype [${blueprint.archetype}] ("${blueprint.title}")`);

    switch (blueprint.archetype) {
      case 'DATING_APP':
        return this.generateDatingApp(blueprint, uxPlan);
      case 'SAAS_DASHBOARD':
        return this.generateSaasDashboard(blueprint, uxPlan);
      case 'PROJECT_MANAGEMENT':
        return this.generateKanbanApp(blueprint, uxPlan);
      case 'CRM':
        return generateCrmApp(blueprint, uxPlan);
      case 'MARKETPLACE':
        return generateMarketplaceApp(blueprint, uxPlan);
      case 'ECOMMERCE':
        return generateEcommerceApp(blueprint, uxPlan);
      case 'BOOKING_APP':
        return generateBookingApp(blueprint, uxPlan);
      case 'SOCIAL_NETWORK':
        return generateSocialNetworkApp(blueprint, uxPlan);
      case 'MOBILE_UTILITY':
        return generateProductivityApp(blueprint, uxPlan);
      case 'PREMIUM_LANDING':
        return generateSaasLandingApp(blueprint, uxPlan);
      default:
        return this.generateAdaptiveApp(blueprint, uxPlan);
    }
  }

  /**
   * Premium, full-featured Dating App (Tinder-style) with gesture drag, match overlay, chat, filters, and profile
   */
  private generateDatingApp(bp: ProductBlueprint, ux: UXPlan): string {
    return `<!DOCTYPE html>
<html lang="fr" class="h-full bg-slate-950">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${bp.title} — ${bp.tagline}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    @keyframes pulseHeart {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.15); }
    }
    .animate-heart-pulse {
      animation: pulseHeart 1.8s infinite ease-in-out;
    }
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .card-touch-surface {
      touch-action: none;
      user-select: none;
    }
  </style>
</head>
<body class="h-full bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100 flex items-center justify-center p-0 sm:p-4 font-sans antialiased selection:bg-rose-500 selection:text-white">

  <!-- Mobile Shell Container -->
  <div id="app-shell" class="w-full max-w-md h-full sm:h-[880px] bg-slate-900 sm:rounded-3xl border-0 sm:border sm:border-slate-800 shadow-2xl flex flex-col relative overflow-hidden">

    <!-- Top App Header -->
    <header id="top-header" class="h-16 px-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90 backdrop-blur z-20 shrink-0">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-500 to-orange-400 flex items-center justify-center shadow-lg shadow-rose-500/20 text-white font-bold">
          <i data-lucide="flame" class="w-5 h-5 fill-white"></i>
        </div>
        <div>
          <h1 class="text-base font-extrabold tracking-tight bg-gradient-to-r from-rose-400 via-pink-300 to-orange-300 bg-clip-text text-transparent">${bp.title}</h1>
          <p class="text-[10px] text-slate-400 font-medium tracking-wide">PARIS • RAYON 15 KM</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button id="btn-open-filters" class="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition border border-slate-700/60 active:scale-95" title="Filtres de recherche">
          <i data-lucide="sliders" class="w-4 h-4"></i>
        </button>
        <button id="btn-header-profile" class="w-9 h-9 rounded-xl overflow-hidden border border-rose-500/40 relative active:scale-95 transition">
          <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" alt="Avatar" class="w-full h-full object-cover">
          <span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
        </button>
      </div>
    </header>

    <!-- Main Screens Viewport -->
    <main id="main-viewport" class="flex-1 relative overflow-hidden flex flex-col">

      <!-- SCREEN 1: SWIPE DISCOVERY -->
      <section id="screen-discover" class="screen-view absolute inset-0 flex flex-col p-4 pb-2 z-10">
        
        <!-- Cards Deck Container -->
        <div id="deck-container" class="flex-1 relative w-full h-full flex items-center justify-center">
          
          <!-- Card Stage Stack will be rendered here dynamically -->
          <div id="cards-stack" class="relative w-full h-full flex items-center justify-center">
            <!-- Dynamic profile card injected here -->
          </div>

          <!-- Empty State (when cards run out) -->
          <div id="empty-deck" class="hidden absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900/60 rounded-3xl border border-slate-800/80">
            <div class="w-20 h-20 rounded-full bg-rose-950/40 border border-rose-800/60 flex items-center justify-center text-rose-400 mb-4 animate-heart-pulse">
              <i data-lucide="compass" class="w-10 h-10"></i>
            </div>
            <h3 class="text-xl font-bold text-slate-100 mb-2">Plus de profils aux alentours</h3>
            <p class="text-xs text-slate-400 mb-6 max-w-xs">Vous avez exploré tous les profils récents dans votre périmètre actuel. Élargissez votre rayon ou réinitialisez le deck.</p>
            <div class="flex flex-col w-full max-w-xs gap-2.5">
              <button id="btn-reload-deck" class="w-full py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-rose-600/30 transition active:scale-98 flex items-center justify-center gap-2">
                <i data-lucide="refresh-cw" class="w-4 h-4"></i> Recharger les profils
              </button>
              <button id="btn-expand-radius" class="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition">
                Élargir à 50 km
              </button>
            </div>
          </div>
        </div>

        <!-- Action Control Buttons Bar -->
        <div id="action-controls-bar" class="h-20 shrink-0 flex items-center justify-center gap-4 pt-2">
          <button id="btn-rewind" class="w-12 h-12 rounded-full bg-slate-800/90 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 flex items-center justify-center shadow-lg active:scale-90 transition" title="Annuler le dernier swipe (Z)">
            <i data-lucide="rotate-ccw" class="w-5 h-5"></i>
          </button>
          
          <button id="btn-swipe-pass" class="btn-swipe-pass w-14 h-14 rounded-full bg-slate-800/90 border border-rose-500/40 text-rose-500 hover:bg-rose-500/20 flex items-center justify-center shadow-xl active:scale-90 transition" title="Passer (Flèche Gauche)">
            <i data-lucide="x" class="w-7 h-7 stroke-[2.5]"></i>
          </button>

          <button id="btn-superlike" class="w-12 h-12 rounded-full bg-slate-800/90 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 flex items-center justify-center shadow-lg active:scale-90 transition" title="Super Like (Flèche Haut)">
            <i data-lucide="star" class="w-5 h-5 fill-cyan-400/20 stroke-[2.5]"></i>
          </button>

          <button id="btn-swipe-like" class="btn-swipe-like w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-90 transition" title="Aimer (Flèche Droite)">
            <i data-lucide="heart" class="w-7 h-7 fill-white stroke-none"></i>
          </button>

          <button id="btn-boost" class="w-12 h-12 rounded-full bg-slate-800/90 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 flex items-center justify-center shadow-lg active:scale-90 transition" title="Boost de visibilité">
            <i data-lucide="zap" class="w-5 h-5 fill-purple-400/20"></i>
          </button>
        </div>
      </section>

      <!-- SCREEN 2: MATCHES & MESSAGES -->
      <section id="screen-matches" class="screen-view absolute inset-0 flex flex-col p-5 hidden z-10 bg-slate-900 overflow-y-auto no-scrollbar">
        <!-- Matches Stories Carousel -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-bold text-slate-200 tracking-wide flex items-center gap-1.5 uppercase text-xs">
              <i data-lucide="sparkles" class="w-3.5 h-3.5 text-rose-400"></i> Nouveaux Matchs (<span id="matches-count-badge">4</span>)
            </h2>
            <span class="text-[11px] text-rose-400 font-semibold cursor-pointer hover:underline">Voir tout</span>
          </div>
          <div id="matches-carousel" class="flex items-center gap-3.5 overflow-x-auto no-scrollbar pb-1">
            <!-- Dynamic Match Bubbles injected here -->
          </div>
        </div>

        <!-- Conversations List -->
        <div class="flex-1">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-bold text-slate-200 tracking-wide flex items-center gap-1.5 uppercase text-xs">
              <i data-lucide="message-square" class="w-3.5 h-3.5 text-indigo-400"></i> Discussions Actives
            </h2>
            <span class="text-[11px] text-slate-500">3 non lus</span>
          </div>
          <div id="conversations-list" class="space-y-2.5">
            <!-- Dynamic message threads injected here -->
          </div>
        </div>
      </section>

      <!-- SCREEN 3: ACTIVE CHAT SCREEN -->
      <section id="screen-chat" class="screen-view absolute inset-0 flex flex-col hidden z-30 bg-slate-950">
        <div class="h-16 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0">
          <div class="flex items-center gap-3">
            <button id="btn-back-from-chat" class="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center active:scale-90">
              <i data-lucide="chevron-left" class="w-5 h-5"></i>
            </button>
            <div class="relative w-9 h-9 rounded-full overflow-hidden border border-rose-500/40">
              <img id="chat-recipient-avatar-screen" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80" alt="Avatar" class="w-full h-full object-cover">
            </div>
            <div>
              <h4 id="chat-recipient-name-screen" class="text-sm font-bold text-white">Léa, 24</h4>
              <span class="text-[10px] text-emerald-400 flex items-center gap-1 font-medium"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> En ligne</span>
            </div>
          </div>
        </div>
        <div id="chat-screen-messages-container" class="flex-1 p-4 overflow-y-auto space-y-3">
          <div class="flex justify-center my-2">
            <span class="px-3 py-1 bg-slate-900 border border-slate-800 text-slate-400 text-[10px] rounded-full">Vous avez matché 🎉</span>
          </div>
          <div class="flex items-end gap-2">
            <div class="max-w-[75%] p-3 bg-slate-800 text-slate-100 rounded-2xl rounded-bl-sm text-xs leading-relaxed">
              Salut ! J'ai vu qu'on adore tous les deux la photo et les voyages 📸 Tu as un boîtier fétiche ?
            </div>
          </div>
        </div>
        <div class="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center gap-2">
          <input type="text" id="chat-screen-input" placeholder="Envoyer un message..." class="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-2xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500">
          <button id="btn-screen-send" class="w-10 h-10 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-md active:scale-95 transition">
            <i data-lucide="send" class="w-4 h-4"></i>
          </button>
        </div>
      </section>
      </section>

      <!-- SCREEN 3: USER PROFILE -->
      <section id="screen-profile" class="screen-view absolute inset-0 flex flex-col p-5 hidden z-10 bg-slate-900 overflow-y-auto no-scrollbar">
        <div class="flex flex-col items-center text-center pt-2 pb-6 border-b border-slate-800">
          <div class="relative w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-rose-500 via-pink-500 to-orange-400 shadow-xl mb-3">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80" alt="Mon profil" class="w-full h-full object-cover rounded-full">
            <button class="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg border-2 border-slate-900 hover:bg-rose-500">
              <i data-lucide="camera" class="w-4 h-4"></i>
            </button>
          </div>
          <div class="flex items-center gap-1.5">
            <h2 class="text-lg font-bold text-white">Alexandre, 27</h2>
            <i data-lucide="badge-check" class="w-4 h-4 text-sky-400 fill-sky-400/20"></i>
          </div>
          <p class="text-xs text-slate-400 mt-0.5">Product Designer & Photographe • Paris</p>
          <div class="flex items-center gap-2 mt-4">
            <span class="px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-full text-xs font-medium">96% Complété</span>
            <span class="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-full text-xs font-medium">Aura Gold</span>
          </div>
        </div>

        <div class="py-5 space-y-4">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Passions & Centres d'intérêt</h3>
          <div class="flex flex-wrap gap-2">
            <span class="px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs flex items-center gap-1.5"><i data-lucide="camera" class="w-3.5 h-3.5 text-rose-400"></i> Photo argentique</span>
            <span class="px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs flex items-center gap-1.5"><i data-lucide="coffee" class="w-3.5 h-3.5 text-amber-400"></i> Café de spécialité</span>
            <span class="px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs flex items-center gap-1.5"><i data-lucide="compass" class="w-3.5 h-3.5 text-emerald-400"></i> Randonnée</span>
            <span class="px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs flex items-center gap-1.5"><i data-lucide="music" class="w-3.5 h-3.5 text-cyan-400"></i> Vinyles</span>
            <span class="px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs flex items-center gap-1.5"><i data-lucide="utensils" class="w-3.5 h-3.5 text-pink-400"></i> Street Food</span>
          </div>

          <div class="pt-2">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ma Bio</h3>
            <p class="text-xs text-slate-300 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60 leading-relaxed">
              Curieux de tout, toujours partant pour une expo, tester un nouveau spot ramen ou improviser un weekend à la mer. À la recherche de conversations sincères et spontanées.
            </p>
          </div>

          <button id="btn-edit-profile" class="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-2xl border border-slate-700 transition flex items-center justify-center gap-2">
            <i data-lucide="edit-3" class="w-4 h-4"></i> Modifier mon profil
          </button>
        </div>
      </section>

    </main>

    <!-- Bottom Navigation Bar -->
    <nav id="bottom-nav" class="h-16 px-6 border-t border-slate-800/80 bg-slate-900/95 backdrop-blur flex items-center justify-around z-20 shrink-0">
      <button class="nav-btn active flex flex-col items-center gap-1 text-rose-500 transition" data-target="screen-discover">
        <i data-lucide="flame" class="w-5 h-5"></i>
        <span class="text-[10px] font-bold">Découvrir</span>
      </button>
      <button class="nav-btn flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 transition relative" data-target="screen-matches">
        <div class="relative">
          <i data-lucide="message-circle" class="w-5 h-5"></i>
          <span class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-slate-900"></span>
        </div>
        <span class="text-[10px] font-medium">Matchs</span>
      </button>
      <button class="nav-btn flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 transition" data-target="screen-profile">
        <i data-lucide="user" class="w-5 h-5"></i>
        <span class="text-[10px] font-medium">Profil</span>
      </button>
    </nav>

    <!-- MODAL 1: MATCH CELEBRATION OVERLAY -->
    <div id="match-modal" class="hidden absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div class="relative mb-6">
        <div class="flex items-center justify-center -space-x-6">
          <div class="w-24 h-24 rounded-full border-4 border-rose-500 overflow-hidden shadow-2xl z-10">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80" alt="Moi" class="w-full h-full object-cover">
          </div>
          <div class="w-24 h-24 rounded-full border-4 border-pink-500 overflow-hidden shadow-2xl z-20">
            <img id="match-avatar-target" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80" alt="Match" class="w-full h-full object-cover">
          </div>
        </div>
        <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-lg z-30">
          <i data-lucide="heart" class="w-4 h-4 fill-white"></i>
        </div>
      </div>

      <h2 class="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-rose-400 via-pink-300 to-orange-300 bg-clip-text text-transparent mb-1">C'est un Match ! 🎉</h2>
      <p class="text-xs text-slate-300 max-w-xs mb-8">Vous et <span id="match-target-name" class="font-bold text-white">Léa</span> avez tous les deux aimé votre profil.</p>

      <div class="flex flex-col w-full max-w-xs gap-3">
        <button id="btn-match-chat" class="w-full py-3.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-sm font-bold rounded-2xl shadow-xl shadow-rose-600/30 active:scale-98 transition flex items-center justify-center gap-2">
          <i data-lucide="send" class="w-4 h-4"></i> Envoyer un message
        </button>
        <button id="btn-match-continue" class="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-2xl border border-slate-700 transition">
          Continuer à swiper
        </button>
      </div>
    </div>

    <!-- MODAL 2: SEARCH FILTERS MODAL -->
    <div id="filters-modal" class="hidden absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
      <div class="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-6 space-y-5 max-h-[85%] overflow-y-auto">
        <div class="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <i data-lucide="sliders" class="w-4 h-4 text-rose-400"></i> Préférences de Découverte
          </h3>
          <button id="btn-close-filters" class="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <div>
          <div class="flex justify-between text-xs font-semibold text-slate-300 mb-2">
            <span>Distance Maximale</span>
            <span class="text-rose-400 font-bold" id="label-distance">25 km</span>
          </div>
          <input type="range" id="filter-distance" min="2" max="100" value="25" class="w-full accent-rose-500 cursor-pointer">
        </div>

        <div>
          <div class="flex justify-between text-xs font-semibold text-slate-300 mb-2">
            <span>Tranche d'Âge</span>
            <span class="text-rose-400 font-bold" id="label-age">20 - 32 ans</span>
          </div>
          <input type="range" id="filter-age" min="18" max="60" value="32" class="w-full accent-rose-500 cursor-pointer">
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-2">Je souhaite rencontrer</label>
          <div class="grid grid-cols-3 gap-2">
            <button class="filter-gender-btn active py-2 bg-rose-600 text-white rounded-xl text-xs font-bold border border-rose-500" data-gender="all">Tous</button>
            <button class="filter-gender-btn py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium border border-slate-700" data-gender="women">Femmes</button>
            <button class="filter-gender-btn py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium border border-slate-700" data-gender="men">Hommes</button>
          </div>
        </div>

        <button id="btn-apply-filters" class="w-full py-3.5 bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-bold rounded-2xl shadow-lg transition active:scale-98">
          Appliquer les filtres
        </button>
      </div>
    </div>

    <!-- MODAL 3: ACTIVE CHAT DRAWER -->
    <div id="chat-drawer" class="hidden absolute inset-0 z-40 bg-slate-950 flex flex-col">
      <div class="h-16 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0">
        <div class="flex items-center gap-3">
          <button id="btn-close-chat" class="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center active:scale-90">
            <i data-lucide="chevron-left" class="w-5 h-5"></i>
          </button>
          <div class="relative w-9 h-9 rounded-full overflow-hidden border border-rose-500/40">
            <img id="chat-recipient-avatar" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80" alt="Avatar" class="w-full h-full object-cover">
          </div>
          <div>
            <h4 id="chat-recipient-name" class="text-sm font-bold text-white">Léa, 24</h4>
            <span class="text-[10px] text-emerald-400 flex items-center gap-1 font-medium"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> En ligne</span>
          </div>
        </div>
        <button class="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center">
          <i data-lucide="more-vertical" class="w-4 h-4"></i>
        </button>
      </div>

      <div id="chat-messages-container" class="flex-1 p-4 overflow-y-auto space-y-3">
        <div class="flex justify-center my-2">
          <span class="px-3 py-1 bg-slate-900 border border-slate-800 text-slate-400 text-[10px] rounded-full">Vous avez matché aujourd'hui 🎉</span>
        </div>
        <div class="flex items-end gap-2">
          <div class="max-w-[75%] p-3 bg-slate-800 text-slate-100 rounded-2xl rounded-bl-sm text-xs leading-relaxed">
            Salut Alexandre ! J'ai vu qu'on adore tous les deux le Japon et la photo argentique 📸 Tu shootes avec quel boîtier ?
          </div>
        </div>
      </div>

      <div class="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center gap-2">
        <input type="text" id="chat-input-text" placeholder="Envoyer un message..." class="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-2xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500">
        <button id="btn-send-message" class="w-10 h-10 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-md active:scale-95 transition">
          <i data-lucide="send" class="w-4 h-4"></i>
        </button>
      </div>
    </div>

  </div>

  <!-- APPLICATION CORE LOGIC SCRIPT -->
  <script>
    // --- SEED PROFILE DATA ---
    const PROFILES_DATA = [
      {
        id: 'prof_1',
        name: 'Léa',
        age: 24,
        distanceKm: 3,
        job: 'Photographe & Designer',
        bio: 'Passionnée de photo argentique (Olympus OM-1) et de café filtre ☕ Toujours partante pour une expo ou un road trip.',
        photos: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80'],
        interests: ['Photo', 'Design', 'Voyages', 'Café', 'Musées'],
        isVerified: true,
        matchScore: 98
      },
      {
        id: 'prof_2',
        name: 'Clara',
        age: 26,
        distanceKm: 6,
        job: "Architecte d'Intérieur",
        bio: "Amoureuse de design scandinave et de plantes vertes 🌿 Je cherche quelqu'un pour tester les meilleurs ramens de Paris.",
        photos: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80'],
        interests: ['Architecture', 'Gastronomie', 'Plantes', 'Cinéma'],
        isVerified: true,
        matchScore: 92
      },
      {
        id: 'prof_3',
        name: 'Sophie',
        age: 25,
        distanceKm: 8,
        job: 'Professeure de Yoga & Surf',
        bio: 'Sunrise meditation & sunset waves 🌊 Énergie positive uniquement. On se retrouve pour une séance ou un verre ?',
        photos: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80'],
        interests: ['Yoga', 'Surf', 'Méditation', 'Nature', 'Musique'],
        isVerified: false,
        matchScore: 89
      },
      {
        id: 'prof_4',
        name: 'Emma',
        age: 27,
        distanceKm: 12,
        job: "Curatrice d'Art Contemporain",
        bio: 'Obsédée par la typographie suisse et les disques vinyles de jazz 🎷 Dis-moi quel est ton album favori.',
        photos: ['https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80'],
        interests: ['Art', 'Jazz', 'Vinyles', 'Littérature'],
        isVerified: true,
        matchScore: 95
      }
    ];

    const MATCHES_DATA = [
      { id: 'm1', name: 'Léa', age: 24, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80', lastMsg: 'Tu shootes avec quel boîtier ?', time: '14:20', unread: true },
      { id: 'm2', name: 'Clara', age: 26, avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80', lastMsg: 'Ce resto était incroyable !', time: 'Hier', unread: false },
      { id: 'm3', name: 'Inès', age: 23, avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80', lastMsg: 'Tu as matché avec Inès ✨', time: 'Mar.', unread: true },
      { id: 'm4', name: 'Manon', age: 28, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', lastMsg: 'Parfait pour samedi alors !', time: 'Lun.', unread: false }
    ];

    // --- APPLICATION STATE ---
    let deck = [...PROFILES_DATA];
    let currentIndex = 0;
    let likedProfiles = [];
    let passedProfiles = [];
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;

    // --- DOM REFERENCES ---
    const cardsStack = document.getElementById('cards-stack');
    const emptyDeck = document.getElementById('empty-deck');
    const matchModal = document.getElementById('match-modal');
    const filtersModal = document.getElementById('filters-modal');
    const chatDrawer = document.getElementById('chat-drawer');

    // --- RENDER TOP CARD ---
    function renderCard() {
      cardsStack.innerHTML = '';

      if (currentIndex >= deck.length) {
        emptyDeck.classList.remove('hidden');
        return;
      }

      emptyDeck.classList.add('hidden');
      const profile = deck[currentIndex];

      const card = document.createElement('div');
      card.id = 'active-card';
      card.className = 'card-touch-surface absolute inset-0 w-full h-full rounded-3xl overflow-hidden shadow-2xl border border-slate-700/60 bg-slate-900 cursor-grab active:cursor-grabbing select-none transition-transform duration-100 ease-out';
      
      const interestTags = profile.interests.map(tag => 
        \`<span class="px-2.5 py-1 bg-black/40 backdrop-blur-md border border-white/20 text-white rounded-full text-[11px] font-medium">\${tag}</span>\`
      ).join('');

      card.innerHTML = \`
        <div class="relative w-full h-full">
          <img src="\${profile.photos[0]}" alt="\${profile.name}" class="w-full h-full object-cover pointer-events-none">
          <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

          <!-- LIKE / NOPE STAMPS -->
          <div id="stamp-like" class="opacity-0 absolute top-8 left-8 border-4 border-emerald-400 text-emerald-400 font-extrabold text-2xl uppercase tracking-widest px-4 py-1.5 rounded-2xl rotate-[-20deg] pointer-events-none transition-opacity duration-150">
            LIKE ❤️
          </div>
          <div id="stamp-nope" class="opacity-0 absolute top-8 right-8 border-4 border-rose-500 text-rose-500 font-extrabold text-2xl uppercase tracking-widest px-4 py-1.5 rounded-2xl rotate-[20deg] pointer-events-none transition-opacity duration-150">
            NOPE ✖
          </div>

          <!-- CARD INFO OVERLAY -->
          <div class="absolute bottom-0 inset-x-0 p-5 text-white flex flex-col pointer-events-none">
            <div class="flex items-baseline gap-2 mb-1">
              <h2 class="text-2xl font-extrabold tracking-tight">\${profile.name}</h2>
              <span class="text-xl font-medium text-slate-300">\${profile.age}</span>
              \${profile.isVerified ? '<i data-lucide="badge-check" class="w-5 h-5 text-sky-400 fill-sky-400/30"></i>' : ''}
              <span class="ml-auto text-xs px-2.5 py-0.5 bg-emerald-500/30 border border-emerald-400/50 text-emerald-300 rounded-full font-bold">\${profile.matchScore}% Match</span>
            </div>

            <p class="text-xs font-semibold text-slate-300 flex items-center gap-1 mb-2">
              <i data-lucide="briefcase" class="w-3.5 h-3.5 text-rose-400"></i> \${profile.job} • <i data-lucide="map-pin" class="w-3.5 h-3.5 text-rose-400"></i> \${profile.distanceKm} km
            </p>

            <p class="text-xs text-slate-200 line-clamp-2 mb-3 leading-relaxed">\${profile.bio}</p>

            <div class="flex flex-wrap gap-1.5">
              \${interestTags}
            </div>
          </div>
        </div>
      \`;

      cardsStack.appendChild(card);
      if (window.lucide) lucide.createIcons();
      attachCardGestures(card);
    }

    // --- GESTURE & DRAG PHYSICS ENGINE ---
    function attachCardGestures(card) {
      const stampLike = card.querySelector('#stamp-like');
      const stampNope = card.querySelector('#stamp-nope');

      const onStart = (clientX, clientY) => {
        isDragging = true;
        startX = clientX;
        startY = clientY;
        card.classList.remove('transition-transform', 'duration-300');
      };

      const onMove = (clientX, clientY) => {
        if (!isDragging) return;
        currentX = clientX - startX;
        currentY = clientY - startY;

        const rotation = currentX * 0.08;
        card.style.transform = \`translate(\${currentX}px, \${currentY}px) rotate(\${rotation}deg)\`;

        if (currentX > 30) {
          stampLike.style.opacity = Math.min(currentX / 120, 1);
          stampNope.style.opacity = 0;
        } else if (currentX < -30) {
          stampNope.style.opacity = Math.min(Math.abs(currentX) / 120, 1);
          stampLike.style.opacity = 0;
        } else {
          stampLike.style.opacity = 0;
          stampNope.style.opacity = 0;
        }
      };

      const onEnd = () => {
        if (!isDragging) return;
        isDragging = false;

        card.classList.add('transition-transform', 'duration-300');

        if (currentX > 100) {
          triggerLike();
        } else if (currentX < -100) {
          triggerPass();
        } else {
          card.style.transform = 'translate(0px, 0px) rotate(0deg)';
          stampLike.style.opacity = 0;
          stampNope.style.opacity = 0;
        }
        currentX = 0;
        currentY = 0;
      };

      // Mouse Listeners
      card.addEventListener('mousedown', (e) => onStart(e.clientX, e.clientY));
      window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
      window.addEventListener('mouseup', onEnd);

      // Touch Listeners
      card.addEventListener('touchstart', (e) => onStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
      window.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
      window.addEventListener('touchend', onEnd);
    }

    // --- SWIPE ACTIONS ---
    function triggerLike() {
      const activeCard = document.getElementById('active-card');
      if (!activeCard) return;

      const profile = deck[currentIndex];
      likedProfiles.push(profile);

      activeCard.style.transform = 'translate(600px, 50px) rotate(35deg)';
      activeCard.style.opacity = '0';

      setTimeout(() => {
        // Trigger Match Modal on high compatibility profile
        if (profile.matchScore >= 92) {
          showMatchModal(profile);
        }
        currentIndex++;
        renderCard();
      }, 250);
    }

    function triggerPass() {
      const activeCard = document.getElementById('active-card');
      if (!activeCard) return;

      const profile = deck[currentIndex];
      passedProfiles.push(profile);

      activeCard.style.transform = 'translate(-600px, 50px) rotate(-35deg)';
      activeCard.style.opacity = '0';

      setTimeout(() => {
        currentIndex++;
        renderCard();
      }, 250);
    }

    function triggerSuperLike() {
      const activeCard = document.getElementById('active-card');
      if (!activeCard) return;

      const profile = deck[currentIndex];
      likedProfiles.push(profile);

      activeCard.style.transform = 'translate(0px, -600px) scale(1.1)';
      activeCard.style.opacity = '0';

      setTimeout(() => {
        showMatchModal(profile);
        currentIndex++;
        renderCard();
      }, 250);
    }

    function triggerRewind() {
      if (currentIndex > 0) {
        currentIndex--;
        renderCard();
      }
    }

    function showMatchModal(profile) {
      document.getElementById('match-target-name').innerText = profile.name;
      document.getElementById('match-avatar-target').src = profile.photos[0];
      matchModal.classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
    }

    // --- RENDER MATCHES & CONVERSATIONS ---
    function renderMatchesScreen() {
      const carousel = document.getElementById('matches-carousel');
      carousel.innerHTML = MATCHES_DATA.map(m => \`
        <div class="flex flex-col items-center gap-1 shrink-0 cursor-pointer group" onclick="openChat('\${m.name}', '\${m.avatar}')">
          <div class="relative w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-rose-500 to-pink-500 shadow-md group-hover:scale-105 transition">
            <img src="\${m.avatar}" alt="\${m.name}" class="w-full h-full object-cover rounded-full">
            <span class="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
          </div>
          <span class="text-xs font-semibold text-slate-200">\${m.name}</span>
        </div>
      \`).join('');

      const list = document.getElementById('conversations-list');
      list.innerHTML = MATCHES_DATA.map(m => \`
        <div class="p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 rounded-2xl flex items-center gap-3.5 cursor-pointer transition active:scale-98" onclick="openChat('\${m.name}', '\${m.avatar}')">
          <div class="relative w-12 h-12 rounded-full overflow-hidden shrink-0 border border-slate-700">
            <img src="\${m.avatar}" alt="\${m.name}" class="w-full h-full object-cover">
            \${m.unread ? '<span class="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-full border-2 border-slate-900"></span>' : ''}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-0.5">
              <h4 class="text-sm font-bold text-white truncate">\${m.name}, \${m.age}</h4>
              <span class="text-[10px] text-slate-400">\${m.time}</span>
            </div>
            <p class="text-xs text-slate-400 truncate \${m.unread ? 'font-semibold text-slate-200' : ''}">\${m.lastMsg}</p>
          </div>
        </div>
      \`).join('');

      if (window.lucide) lucide.createIcons();
    }

    function openChat(name, avatar) {
      document.getElementById('chat-recipient-name').innerText = name;
      document.getElementById('chat-recipient-avatar').src = avatar;
      chatDrawer.classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
    }

    // --- NAVIGATION TAB SWITCHER ---
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => {
          b.classList.remove('active', 'text-rose-500');
          b.classList.add('text-slate-400');
        });
        btn.classList.add('active', 'text-rose-500');
        btn.classList.remove('text-slate-400');

        const targetId = btn.getAttribute('data-target');
        document.querySelectorAll('.screen-view').forEach(s => s.classList.add('hidden'));
        document.getElementById(targetId).classList.remove('hidden');

        if (targetId === 'screen-matches') renderMatchesScreen();
      });
    });

    // --- BUTTON EVENT LISTENERS ---
    const likeBtn = document.getElementById('btn-swipe-like') || document.getElementById('btn-like');
    if (likeBtn) likeBtn.addEventListener('click', triggerLike);
    const passBtn = document.getElementById('btn-swipe-pass') || document.getElementById('btn-pass');
    if (passBtn) passBtn.addEventListener('click', triggerPass);
    document.getElementById('btn-superlike').addEventListener('click', triggerSuperLike);
    document.getElementById('btn-rewind').addEventListener('click', triggerRewind);

    document.getElementById('btn-reload-deck').addEventListener('click', () => {
      deck = [...PROFILES_DATA];
      currentIndex = 0;
      renderCard();
    });

    document.getElementById('btn-match-continue').addEventListener('click', () => {
      matchModal.classList.add('hidden');
    });

    document.getElementById('btn-match-chat').addEventListener('click', () => {
      matchModal.classList.add('hidden');
      openChat('Léa', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80');
    });

    document.getElementById('btn-open-filters').addEventListener('click', () => {
      filtersModal.classList.remove('hidden');
    });

    document.getElementById('btn-close-filters').addEventListener('click', () => {
      filtersModal.classList.add('hidden');
    });

    document.getElementById('btn-apply-filters').addEventListener('click', () => {
      filtersModal.classList.add('hidden');
    });

    document.getElementById('filter-distance').addEventListener('input', (e) => {
      document.getElementById('label-distance').innerText = e.target.value + ' km';
    });

    document.getElementById('filter-age').addEventListener('input', (e) => {
      document.getElementById('label-age').innerText = '18 - ' + e.target.value + ' ans';
    });

    document.getElementById('btn-close-chat').addEventListener('click', () => {
      chatDrawer.classList.add('hidden');
    });

    const backFromChat = document.getElementById('btn-back-from-chat');
    if (backFromChat) {
      backFromChat.addEventListener('click', () => {
        const chatScreen = document.getElementById('screen-chat');
        if (chatScreen) chatScreen.classList.add('hidden');
        document.getElementById('screen-discover').classList.remove('hidden');
      });
    }

    document.getElementById('btn-send-message').addEventListener('click', () => {
      const input = document.getElementById('chat-input-text');
      const txt = input.value.trim();
      if (!txt) return;

      const container = document.getElementById('chat-messages-container');
      const msgElem = document.createElement('div');
      msgElem.className = 'flex justify-end gap-2';
      msgElem.innerHTML = '<div class="max-w-[75%] p-3 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-2xl rounded-br-sm text-xs leading-relaxed shadow">' + txt + '</div>';
      container.appendChild(msgElem);
      input.value = '';
      container.scrollTop = container.scrollHeight;
    });

    const btnScreenSend = document.getElementById('btn-screen-send');
    if (btnScreenSend) {
      btnScreenSend.addEventListener('click', () => {
        const input = document.getElementById('chat-screen-input');
        const txt = input?.value.trim();
        if (!txt) return;

        const container = document.getElementById('chat-screen-messages-container');
        if (container) {
          const msgElem = document.createElement('div');
          msgElem.className = 'flex justify-end gap-2';
          msgElem.innerHTML = '<div class="max-w-[75%] p-3 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-2xl rounded-br-sm text-xs leading-relaxed shadow">' + txt + '</div>';
          container.appendChild(msgElem);
          input.value = '';
          container.scrollTop = container.scrollHeight;
        }
      });
    }

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') triggerLike();
      if (e.key === 'ArrowLeft') triggerPass();
      if (e.key === 'ArrowUp') triggerSuperLike();
      if (e.key === 'z' || e.key === 'Z') triggerRewind();
    });

    // Initial Start
    document.addEventListener('DOMContentLoaded', () => {
      renderCard();
      renderMatchesScreen();
      if (window.lucide) lucide.createIcons();
    });
  </script>
</body>
</html>`;
  }

  /**
   * Premium SaaS Dashboard with metric charts, transaction table, export modal, and active filters
   */
  private generateSaasDashboard(bp: ProductBlueprint, ux: UXPlan): string {
    return `<!DOCTYPE html>
<html lang="fr" class="h-full bg-slate-950 text-slate-100 font-sans">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${bp.title} — Analytics & Métriques MRR</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body class="h-full flex flex-col bg-slate-950 text-slate-100 antialiased overflow-x-hidden">
  <!-- Top Navigation Bar -->
  <header class="h-16 px-6 lg:px-8 border-b border-slate-800 bg-slate-900/90 backdrop-blur flex items-center justify-between sticky top-0 z-30">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
        <i data-lucide="bar-chart-3" class="w-5 h-5"></i>
      </div>
      <div>
        <h1 class="text-base font-bold text-white tracking-tight">${bp.title}</h1>
        <p class="text-[11px] text-slate-400">Dashboard Analytique MRR, Churn & Clients</p>
      </div>
    </div>
    
    <!-- Navigation Tabs -->
    <div class="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 text-xs">
      <button id="tab-overview" class="nav-tab px-3.5 py-1.5 rounded-lg font-semibold bg-indigo-600 text-white shadow transition" data-target="screen-overview">Vue d'ensemble</button>
      <button id="tab-transactions" class="nav-tab px-3.5 py-1.5 rounded-lg font-medium text-slate-400 hover:text-white transition" data-target="screen-transactions">Transactions & Clients</button>
    </div>

    <div class="flex items-center gap-3">
      <div class="hidden sm:flex items-center bg-slate-800 border border-slate-700/80 rounded-xl p-1 text-xs">
        <button class="period-btn px-3 py-1 bg-indigo-600 text-white rounded-lg font-medium" data-period="7d">7 jours</button>
        <button class="period-btn px-3 py-1 text-slate-400 hover:text-white transition" data-period="30d">30 jours</button>
        <button class="period-btn px-3 py-1 text-slate-400 hover:text-white transition" data-period="12m">12 mois</button>
      </div>
      <button id="btn-open-export" class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center gap-1.5 active:scale-95">
        <i data-lucide="download" class="w-3.5 h-3.5"></i> Exporter
      </button>
    </div>
  </header>

  <!-- Main Dashboard Container -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-6 lg:p-8 space-y-6">
    
    <!-- SCREEN 1: OVERVIEW & KPIS -->
    <section id="screen-overview" class="screen-view space-y-6">
      <!-- 4 KPI Metrics -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div class="bg-slate-900 p-5 rounded-2xl border border-slate-800/80 shadow-sm flex flex-col justify-between hover:border-slate-700 transition">
          <div class="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Revenu Mensuel Récurrent (MRR)</span>
            <i data-lucide="dollar-sign" class="w-4 h-4 text-emerald-400"></i>
          </div>
          <div id="metric-mrr" class="text-2xl font-extrabold text-white mt-2">48 250 €</div>
          <div class="text-xs text-emerald-400 flex items-center gap-1 mt-2 font-medium">
            <i data-lucide="trending-up" class="w-3.5 h-3.5"></i> +14.2% vs mois dernier
          </div>
        </div>

        <div class="bg-slate-900 p-5 rounded-2xl border border-slate-800/80 shadow-sm flex flex-col justify-between hover:border-slate-700 transition">
          <div class="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Clients & Abonnés Actifs</span>
            <i data-lucide="users" class="w-4 h-4 text-indigo-400"></i>
          </div>
          <div id="metric-clients" class="text-2xl font-extrabold text-white mt-2">1 420</div>
          <div class="text-xs text-emerald-400 flex items-center gap-1 mt-2 font-medium">
            <i data-lucide="trending-up" class="w-3.5 h-3.5"></i> +8.6% de croissance
          </div>
        </div>

        <div class="bg-slate-900 p-5 rounded-2xl border border-slate-800/80 shadow-sm flex flex-col justify-between hover:border-slate-700 transition">
          <div class="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Taux de Churn</span>
            <i data-lucide="shield-alert" class="w-4 h-4 text-rose-400"></i>
          </div>
          <div id="metric-churn" class="text-2xl font-extrabold text-white mt-2">0.72%</div>
          <div class="text-xs text-emerald-400 flex items-center gap-1 mt-2 font-medium">
            <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Sous le seuil cible (< 1%)
          </div>
        </div>

        <div class="bg-slate-900 p-5 rounded-2xl border border-slate-800/80 shadow-sm flex flex-col justify-between hover:border-slate-700 transition">
          <div class="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Panier Moyen / ARPU</span>
            <i data-lucide="zap" class="w-4 h-4 text-amber-400"></i>
          </div>
          <div id="metric-arpu" class="text-2xl font-extrabold text-white mt-2">124.50 €</div>
          <div class="text-xs text-emerald-400 flex items-center gap-1 mt-2 font-medium">
            <i data-lucide="trending-up" class="w-3.5 h-3.5"></i> +3.2% d'optimisation
          </div>
        </div>
      </div>

      <!-- Interactive Chart Section -->
      <div class="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-sm font-bold text-white flex items-center gap-2">
              <i data-lucide="activity" class="w-4 h-4 text-indigo-400"></i> Évolution Analytique des Revenus & MRR
            </h2>
            <p class="text-xs text-slate-400 mt-0.5">Croissance mensuelle continue sur les 6 derniers mois</p>
          </div>
          <span class="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-semibold rounded-lg border border-indigo-500/20">
            Objectif Annuel 600k€
          </span>
        </div>

        <!-- SVG Analytics Trend Graph -->
        <div class="w-full h-48 bg-slate-950/60 rounded-xl border border-slate-800/60 p-4 flex items-end justify-between gap-3 relative">
          <div class="flex-1 flex flex-col items-center gap-2 group">
            <div class="w-full bg-slate-800 group-hover:bg-indigo-600 rounded-t-lg transition h-20 relative">
              <span class="hidden group-hover:block absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-800 text-[10px] text-white rounded shadow">32k€</span>
            </div>
            <span class="text-[10px] text-slate-400">Jan</span>
          </div>
          <div class="flex-1 flex flex-col items-center gap-2 group">
            <div class="w-full bg-slate-800 group-hover:bg-indigo-600 rounded-t-lg transition h-24 relative">
              <span class="hidden group-hover:block absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-800 text-[10px] text-white rounded shadow">36k€</span>
            </div>
            <span class="text-[10px] text-slate-400">Fév</span>
          </div>
          <div class="flex-1 flex flex-col items-center gap-2 group">
            <div class="w-full bg-slate-800 group-hover:bg-indigo-600 rounded-t-lg transition h-28 relative">
              <span class="hidden group-hover:block absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-800 text-[10px] text-white rounded shadow">41k€</span>
            </div>
            <span class="text-[10px] text-slate-400">Mar</span>
          </div>
          <div class="flex-1 flex flex-col items-center gap-2 group">
            <div class="w-full bg-slate-800 group-hover:bg-indigo-600 rounded-t-lg transition h-32 relative">
              <span class="hidden group-hover:block absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-800 text-[10px] text-white rounded shadow">44k€</span>
            </div>
            <span class="text-[10px] text-slate-400">Avr</span>
          </div>
          <div class="flex-1 flex flex-col items-center gap-2 group">
            <div class="w-full bg-slate-800 group-hover:bg-indigo-600 rounded-t-lg transition h-36 relative">
              <span class="hidden group-hover:block absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-800 text-[10px] text-white rounded shadow">46k€</span>
            </div>
            <span class="text-[10px] text-slate-400">Mai</span>
          </div>
          <div class="flex-1 flex flex-col items-center gap-2 group">
            <div class="w-full bg-indigo-600 rounded-t-lg transition h-40 relative shadow-lg shadow-indigo-500/20">
              <span class="hidden group-hover:block absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-indigo-600 text-[10px] text-white rounded shadow font-bold">48.2k€</span>
            </div>
            <span class="text-[10px] text-indigo-400 font-bold">Juin</span>
          </div>
        </div>
      </div>
    </section>

    <!-- SCREEN 2: TRANSACTIONS & CLIENTS -->
    <section id="screen-transactions" class="screen-view space-y-4">
      <div class="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-sm">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 class="text-sm font-bold text-white flex items-center gap-2">
              <i data-lucide="receipt" class="w-4 h-4 text-indigo-400"></i> Historique des Transactions & Abonnements
            </h2>
            <p class="text-xs text-slate-400 mt-0.5">Filtrage dynamique et gestion des règlements clients</p>
          </div>
          <div class="flex items-center gap-3">
            <input type="text" id="transaction-search" placeholder="Rechercher un client..." class="px-3.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
            <select id="status-filter" class="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="ALL">Tous les statuts</option>
              <option value="Complété">Complété</option>
              <option value="En attente">En attente</option>
            </select>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th class="pb-3 font-semibold">Client</th>
                <th class="pb-3 font-semibold">Montant</th>
                <th class="pb-3 font-semibold">Plan SaaS</th>
                <th class="pb-3 font-semibold">Date</th>
                <th class="pb-3 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody id="transactions-tbody" class="divide-y divide-slate-800/60 text-slate-300">
              <!-- Dynamically populated rows -->
            </tbody>
          </table>
        </div>
      </div>
    </section>

  </main>

  <!-- MODAL: EXPORT DATA -->
  <div id="export-modal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-fade-in">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-white flex items-center gap-2">
          <i data-lucide="download-cloud" class="w-4 h-4 text-indigo-400"></i> Exporter les Données Analytiques
        </h3>
        <button id="btn-close-export" class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>
      <p class="text-xs text-slate-300">Sélectionnez le format d'export pour les métriques de revenus et l'historique complet des abonnés.</p>
      <div class="grid grid-cols-2 gap-3 pt-2">
        <button class="export-format-btn p-3 bg-slate-800 hover:bg-indigo-600 border border-slate-700 rounded-xl text-xs font-semibold text-white flex flex-col items-center gap-1 transition" data-format="csv">
          <i data-lucide="file-spreadsheet" class="w-5 h-5 text-indigo-400"></i> Format CSV (.csv)
        </button>
        <button class="export-format-btn p-3 bg-slate-800 hover:bg-indigo-600 border border-slate-700 rounded-xl text-xs font-semibold text-white flex flex-col items-center gap-1 transition" data-format="json">
          <i data-lucide="file-code" class="w-5 h-5 text-indigo-400"></i> Format JSON (.json)
        </button>
      </div>
    </div>
  </div>

  <!-- SCRIPT LOGIC -->
  <script>
    const TRANSACTIONS_DATA = [
      { id: 'tx_1', client: 'Acme Studio SAS', amount: '1 200 €', plan: 'Enterprise Pro', date: 'Il y a 12 min', status: 'Complété' },
      { id: 'tx_2', client: 'Nova Labs Digital', amount: '450 €', plan: 'Business Growth', date: 'Il y a 1 heure', status: 'Complété' },
      { id: 'tx_3', client: 'Vortex Media Group', amount: '99 €', plan: 'Starter Team', date: 'Il y a 3 heures', status: 'Complété' },
      { id: 'tx_4', client: 'Apex Cloud Solutions', amount: '2 800 €', plan: 'Enterprise Unlimited', date: 'Hier', status: 'Complété' },
      { id: 'tx_5', client: 'Lumina Tech Labs', amount: '199 €', plan: 'Pro Scale', date: 'Il y a 2 jours', status: 'En attente' },
      { id: 'tx_6', client: 'Horizon Studio', amount: '450 €', plan: 'Business Growth', date: 'Il y a 3 jours', status: 'Complété' }
    ];

    let currentFilter = 'ALL';
    let searchQuery = '';

    function renderTransactions() {
      const tbody = document.getElementById('transactions-tbody');
      if (!tbody) return;

      const filtered = TRANSACTIONS_DATA.filter(t => {
        const matchesStatus = currentFilter === 'ALL' || t.status === currentFilter;
        const matchesSearch = !searchQuery || t.client.toLowerCase().includes(searchQuery.toLowerCase()) || t.plan.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
      });

      tbody.innerHTML = filtered.map(t => {
        const statusBadge = t.status === 'Complété'
          ? '<span class="px-2.5 py-0.5 rounded-full font-semibold border text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Complété</span>'
          : '<span class="px-2.5 py-0.5 rounded-full font-semibold border text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20">En attente</span>';

        return '<tr class="hover:bg-slate-800/40 transition">' +
          '<td class="py-3 font-medium text-white">' + t.client + '</td>' +
          '<td class="py-3 font-bold text-white">' + t.amount + '</td>' +
          '<td class="py-3">' + t.plan + '</td>' +
          '<td class="py-3 text-slate-400">' + t.date + '</td>' +
          '<td class="py-3">' + statusBadge + '</td>' +
        '</tr>';
      }).join('');
    }

    // Tab switcher
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(b => {
          b.classList.remove('bg-indigo-600', 'text-white', 'shadow');
          b.classList.add('text-slate-400');
        });
        btn.classList.add('bg-indigo-600', 'text-white', 'shadow');
        btn.classList.remove('text-slate-400');

        const targetId = btn.getAttribute('data-target');
        document.querySelectorAll('.screen-view').forEach(s => s.classList.add('hidden'));
        document.getElementById(targetId)?.classList.remove('hidden');
      });
    });

    // Search and Filter Listeners
    document.getElementById('transaction-search')?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderTransactions();
    });

    document.getElementById('status-filter')?.addEventListener('change', (e) => {
      currentFilter = e.target.value;
      renderTransactions();
    });

    // Export Modal Listeners
    const exportModal = document.getElementById('export-modal');
    document.getElementById('btn-open-export')?.addEventListener('click', () => {
      exportModal?.classList.remove('hidden');
    });

    document.getElementById('btn-close-export')?.addEventListener('click', () => {
      exportModal?.classList.add('hidden');
    });

    document.querySelectorAll('.export-format-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        exportModal?.classList.add('hidden');
        alert('Export ' + btn.getAttribute('data-format').toUpperCase() + ' généré avec succès.');
      });
    });

    document.addEventListener('DOMContentLoaded', () => {
      renderTransactions();
      if (window.lucide) lucide.createIcons();
    });
  </script>
</body>
</html>`;
  }

  /**
   * Project Management / Kanban Board App with dynamic cards, column drag/move, and task modal
   */
  private generateKanbanApp(bp: ProductBlueprint, ux: UXPlan): string {
    return `<!DOCTYPE html>
<html lang="fr" class="h-full bg-slate-950 text-slate-100 font-sans">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${bp.title} — Gestion de Projets & Kanban</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body class="h-full flex flex-col bg-slate-950 text-slate-100 antialiased overflow-x-hidden">
  <!-- Top Navigation Bar -->
  <header class="h-16 px-6 lg:px-8 border-b border-slate-800 bg-slate-900 flex items-center justify-between sticky top-0 z-30">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
        <i data-lucide="trello" class="w-4 h-4"></i>
      </div>
      <div>
        <h1 class="text-base font-bold text-white">${bp.title}</h1>
        <p class="text-[10px] text-slate-400">Tableau Kanban & Pipeline des Tâches</p>
      </div>
    </div>

    <!-- Navigation Views -->
    <div class="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 text-xs">
      <button id="tab-kanban" class="nav-tab px-3.5 py-1.5 rounded-lg font-semibold bg-indigo-600 text-white shadow" data-target="screen-kanban">Tableau Kanban</button>
      <button id="tab-activity" class="nav-tab px-3.5 py-1.5 rounded-lg font-medium text-slate-400 hover:text-white" data-target="screen-activity">Activité Récente</button>
    </div>

    <div class="flex items-center gap-3">
      <input type="text" id="task-search-input" placeholder="Filtrer les tâches..." class="hidden md:block px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
      <button id="btn-open-new-task" class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md active:scale-95 transition">
        <i data-lucide="plus" class="w-3.5 h-3.5"></i> Nouvelle Tâche
      </button>
    </div>
  </header>

  <!-- Main Viewport -->
  <main class="flex-1 p-6 lg:p-8 flex flex-col space-y-6">
    
    <!-- SCREEN 1: KANBAN BOARD -->
    <section id="screen-kanban" class="screen-view flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-x-auto">
      
      <!-- COLUMN 1: À FAIRE -->
      <div class="kanban-column bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3.5 shadow-sm">
        <div class="flex items-center justify-between pb-2 border-b border-slate-800 font-bold text-xs text-slate-300">
          <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-slate-400"></span> À FAIRE</span>
          <span id="count-todo" class="px-2 py-0.5 bg-slate-800 rounded-full text-slate-400 font-mono text-[10px]">2</span>
        </div>
        <div id="column-todo" class="flex-1 space-y-3 min-h-[300px]">
          <!-- Dynamic tasks rendered here -->
        </div>
      </div>

      <!-- COLUMN 2: EN COURS -->
      <div class="kanban-column bg-slate-900/90 p-4 rounded-2xl border border-indigo-950/60 flex flex-col gap-3.5 shadow-sm">
        <div class="flex items-center justify-between pb-2 border-b border-slate-800 font-bold text-xs text-indigo-400">
          <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-indigo-500"></span> EN COURS</span>
          <span id="count-in_progress" class="px-2 py-0.5 bg-indigo-950 text-indigo-400 rounded-full font-mono text-[10px]">1</span>
        </div>
        <div id="column-in_progress" class="flex-1 space-y-3 min-h-[300px]">
          <!-- Dynamic tasks rendered here -->
        </div>
      </div>

      <!-- COLUMN 3: TERMINÉ -->
      <div class="kanban-column bg-slate-900/90 p-4 rounded-2xl border border-emerald-950/60 flex flex-col gap-3.5 shadow-sm">
        <div class="flex items-center justify-between pb-2 border-b border-slate-800 font-bold text-xs text-emerald-400">
          <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> TERMINÉ</span>
          <span id="count-done" class="px-2 py-0.5 bg-emerald-950 text-emerald-400 rounded-full font-mono text-[10px]">2</span>
        </div>
        <div id="column-done" class="flex-1 space-y-3 min-h-[300px]">
          <!-- Dynamic tasks rendered here -->
        </div>
      </div>

    </section>

    <!-- SCREEN 2: ACTIVITY FEED -->
    <section id="screen-activity" class="screen-view hidden max-w-3xl w-full mx-auto bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4">
      <h2 class="text-sm font-bold text-white flex items-center gap-2">
        <i data-lucide="history" class="w-4 h-4 text-indigo-400"></i> Historique d'Activité de l'Équipe
      </h2>
      <div id="activity-list" class="space-y-3">
        <!-- Dynamic activity logs -->
      </div>
    </section>

  </main>

  <!-- MODAL: NEW TASK -->
  <div id="task-modal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-fade-in">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-white flex items-center gap-2">
          <i data-lucide="plus-circle" class="w-4 h-4 text-indigo-400"></i> Créer une Nouvelle Tâche
        </h3>
        <button id="btn-close-task-modal" class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 mb-1">Titre de la tâche</label>
          <input type="text" id="input-task-title" placeholder="Ex: Refonte du module Auth..." class="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 mb-1">Description</label>
          <textarea id="input-task-desc" placeholder="Détails de réalisation..." rows="2" class="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] font-semibold text-slate-400 mb-1">Priorité</label>
            <select id="input-task-priority" class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="Haute">Haute</option>
              <option value="Moyenne" selected>Moyenne</option>
              <option value="Basse">Basse</option>
            </select>
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-slate-400 mb-1">Assigné à</label>
            <select id="input-task-assignee" class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="Alexandre">Alexandre</option>
              <option value="Léa">Léa</option>
              <option value="Thomas">Thomas</option>
            </select>
          </div>
        </div>
        <button id="btn-create-task" class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow mt-2">
          Ajouter la Tâche
        </button>
      </div>
    </div>
  </div>

  <!-- SCRIPT LOGIC -->
  <script>
    let TASKS_DATA = [
      { id: 'tsk_1', title: 'Intégration Webhooks Stripe', desc: 'Gestion idempotente des événements invoice.paid.', priority: 'Haute', assignee: 'Alexandre', status: 'todo' },
      { id: 'tsk_2', title: 'Design Système Dark Mode', desc: 'Harmonisation des contrastes WCAG AAA et palettes.', priority: 'Moyenne', assignee: 'Léa', status: 'todo' },
      { id: 'tsk_3', title: 'Optimisation Bundle & Vite', desc: 'Réduction de la taille du build de production.', priority: 'Haute', assignee: 'Thomas', status: 'in_progress' },
      { id: 'tsk_4', title: 'Audit de Sécurité & Tests', desc: '32/32 tests de validation validés au vert.', priority: 'Haute', assignee: 'Alexandre', status: 'done' },
      { id: 'tsk_5', title: 'Documentation API OpenAPI', desc: 'Spécification Swagger 3.0 complète.', priority: 'Basse', assignee: 'Léa', status: 'done' }
    ];

    let taskSearchQuery = '';

    function renderKanban() {
      const statuses = ['todo', 'in_progress', 'done'];

      statuses.forEach(st => {
        const col = document.getElementById('column-' + st);
        const countBadge = document.getElementById('count-' + st);
        if (!col) return;

        const tasksInStatus = TASKS_DATA.filter(t => {
          const matchesStatus = t.status === st;
          const matchesSearch = !taskSearchQuery || t.title.toLowerCase().includes(taskSearchQuery.toLowerCase()) || t.desc.toLowerCase().includes(taskSearchQuery.toLowerCase());
          return matchesStatus && matchesSearch;
        });

        if (countBadge) countBadge.innerText = tasksInStatus.length;

        col.innerHTML = tasksInStatus.map(t => {
          const priorityBadge = t.priority === 'Haute' ? '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-400">Haute</span>'
            : t.priority === 'Moyenne' ? '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/20 text-indigo-400">Moyenne</span>'
            : '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-700 text-slate-300">Basse</span>';

          const titleClass = st === 'done' ? 'font-semibold text-xs text-white line-through opacity-70' : 'font-semibold text-xs text-white';
          const prevBtn = st !== 'todo' ? '<button onclick="moveTask(\'' + t.id + '\', \'prev\')" class="px-2 py-1 bg-slate-700/60 hover:bg-slate-700 rounded text-[10px] text-slate-300">← Reculer</button>' : '';
          const nextBtn = st !== 'done' ? '<button onclick="moveTask(\'' + t.id + '\', \'next\')" class="px-2 py-1 bg-indigo-600/80 hover:bg-indigo-600 rounded text-[10px] text-white font-medium">Avancer →</button>' : '';

          return '<div class="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/60 shadow-sm space-y-2 hover:border-indigo-500/50 transition">' +
            '<div class="flex items-center justify-between">' +
              priorityBadge +
              '<span class="text-[10px] text-slate-400">' + t.assignee + '</span>' +
            '</div>' +
            '<h4 class="' + titleClass + '">' + t.title + '</h4>' +
            '<p class="text-[11px] text-slate-400">' + t.desc + '</p>' +
            '<div class="flex justify-end gap-1.5 pt-1 border-t border-slate-700/40">' +
              prevBtn + nextBtn +
            '</div>' +
          '</div>';
        }).join('');
      });

      renderActivity();
    }

    function moveTask(id, dir) {
      const order = ['todo', 'in_progress', 'done'];
      const task = TASKS_DATA.find(t => t.id === id);
      if (!task) return;

      const idx = order.indexOf(task.status);
      if (dir === 'next' && idx < order.length - 1) task.status = order[idx + 1];
      if (dir === 'prev' && idx > 0) task.status = order[idx - 1];

      renderKanban();
    }

    function renderActivity() {
      const container = document.getElementById('activity-list');
      if (!container) return;

      container.innerHTML = TASKS_DATA.map(t => {
        const dotColor = t.status === 'done' ? 'bg-emerald-400' : t.status === 'in_progress' ? 'bg-indigo-400' : 'bg-slate-400';
        const statusLabel = t.status === 'done' ? 'Terminé' : t.status === 'in_progress' ? 'En cours' : 'À faire';

        return '<div class="p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl flex items-center justify-between text-xs">' +
          '<div class="flex items-center gap-2.5">' +
            '<span class="w-2 h-2 rounded-full ' + dotColor + '"></span>' +
            '<span class="text-white font-medium">' + t.title + '</span>' +
            '<span class="text-slate-400">(' + statusLabel + ')</span>' +
          '</div>' +
          '<span class="text-[10px] text-slate-500">' + t.assignee + '</span>' +
        '</div>';
      }).join('');
    }

    // Tab Navigation
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(b => {
          b.classList.remove('bg-indigo-600', 'text-white', 'shadow');
          b.classList.add('text-slate-400');
        });
        btn.classList.add('bg-indigo-600', 'text-white', 'shadow');
        btn.classList.remove('text-slate-400');

        const targetId = btn.getAttribute('data-target');
        document.querySelectorAll('.screen-view').forEach(s => s.classList.add('hidden'));
        document.getElementById(targetId)?.classList.remove('hidden');
      });
    });

    // Task Search
    document.getElementById('task-search-input')?.addEventListener('input', (e) => {
      taskSearchQuery = e.target.value;
      renderKanban();
    });

    // Modal Handlers
    const taskModal = document.getElementById('task-modal');
    document.getElementById('btn-open-new-task')?.addEventListener('click', () => {
      taskModal?.classList.remove('hidden');
    });

    document.getElementById('btn-close-task-modal')?.addEventListener('click', () => {
      taskModal?.classList.add('hidden');
    });

    document.getElementById('btn-create-task')?.addEventListener('click', () => {
      const titleInput = document.getElementById('input-task-title');
      const descInput = document.getElementById('input-task-desc');
      const priorityInput = document.getElementById('input-task-priority');
      const assigneeInput = document.getElementById('input-task-assignee');

      if (!titleInput?.value.trim()) return;

      TASKS_DATA.unshift({
        id: 'tsk_' + Date.now(),
        title: titleInput.value.trim(),
        desc: descInput?.value.trim() || 'Pas de description fournie.',
        priority: priorityInput?.value || 'Moyenne',
        assignee: assigneeInput?.value || 'Alexandre',
        status: 'todo'
      });

      titleInput.value = '';
      if (descInput) descInput.value = '';
      taskModal?.classList.add('hidden');
      renderKanban();
    });

    document.addEventListener('DOMContentLoaded', () => {
      renderKanban();
      if (window.lucide) lucide.createIcons();
    });
  </script>
</body>
</html>`;
  }

  /**
   * Marketplace / E-commerce App
   */
  private generateMarketplaceApp(bp: ProductBlueprint, ux: UXPlan): string {
    return `<!DOCTYPE html>
<html lang="fr" class="h-full bg-slate-950 text-slate-100 font-sans">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${bp.title} — Marketplace</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body class="h-full flex flex-col bg-slate-950 text-slate-100">
  <header class="h-16 px-8 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
        <i data-lucide="shopping-bag" class="w-4 h-4"></i>
      </div>
      <h1 class="text-base font-bold text-white">${bp.title}</h1>
    </div>
    <div class="flex items-center gap-3">
      <button class="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700">
        <i data-lucide="shopping-cart" class="w-3.5 h-3.5"></i> Panier (2)
      </button>
    </div>
  </header>
  <main class="flex-1 max-w-6xl w-full mx-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
      <div>
        <div class="w-full h-44 rounded-xl overflow-hidden mb-3 bg-slate-800">
          <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80" class="w-full h-full object-cover">
        </div>
        <h3 class="font-bold text-sm text-white">Casque Studio Hi-Fi</h3>
        <p class="text-xs text-slate-400 mt-1">Transducteurs magnétiques planaires haute fidélité.</p>
      </div>
      <div class="flex items-center justify-between mt-4">
        <span class="text-base font-extrabold text-emerald-400">249 €</span>
        <button class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow">Ajouter</button>
      </div>
    </div>
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
      <div>
        <div class="w-full h-44 rounded-xl overflow-hidden mb-3 bg-slate-800">
          <img src="https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=400&q=80" class="w-full h-full object-cover">
        </div>
        <h3 class="font-bold text-sm text-white">Souris Sans Fil Ergonomique</h3>
        <p class="text-xs text-slate-400 mt-1">Capteur optique 26K DPI & switches optiques.</p>
      </div>
      <div class="flex items-center justify-between mt-4">
        <span class="text-base font-extrabold text-emerald-400">89 €</span>
        <button class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow">Ajouter</button>
      </div>
    </div>
  </main>
  <script>document.addEventListener('DOMContentLoaded', () => { if (window.lucide) lucide.createIcons(); });</script>
</body>
</html>`;
  }

  /**
   * Adaptive Custom App
   */
  private generateAdaptiveApp(bp: ProductBlueprint, ux: UXPlan): string {
    return `<!DOCTYPE html>
<html lang="fr" class="h-full bg-slate-950 text-slate-100 font-sans">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${bp.title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body class="h-full flex flex-col bg-slate-950 text-slate-100">
  <header class="h-16 px-8 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
        <i data-lucide="sparkles" class="w-4 h-4"></i>
      </div>
      <h1 class="text-base font-bold text-white">${bp.title}</h1>
    </div>
  </header>
  <main class="flex-1 max-w-5xl w-full mx-auto p-8">
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
      <h2 class="text-lg font-bold text-white mb-2">${bp.tagline}</h2>
      <p class="text-xs text-slate-400 mb-6 leading-relaxed">${bp.goal}</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        ${bp.features.map(f => `
          <div class="p-4 bg-slate-800/80 rounded-xl border border-slate-700/60">
            <h4 class="text-xs font-bold text-white flex items-center gap-1.5">
              <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-indigo-400"></i> ${f.name}
            </h4>
            <p class="text-[11px] text-slate-400 mt-1">${f.description}</p>
          </div>
        `).join('')}
      </div>
    </div>
  </main>
  <script>document.addEventListener('DOMContentLoaded', () => { if (window.lucide) lucide.createIcons(); });</script>
</body>
</html>`;
  }
}

export const productGenerator = new ProductGenerator();
