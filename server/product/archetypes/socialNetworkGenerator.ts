import { ProductBlueprint } from '../productBlueprint';
import { UXPlan } from '../uxProductPlanner';

export function generateSocialNetworkApp(bp: ProductBlueprint, ux: UXPlan): string {
  return `<!DOCTYPE html>
<html lang="fr" class="h-full bg-slate-950 text-slate-100 font-sans">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${bp.title} — Réseau Social</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  </style>
</head>
<body class="h-full flex flex-col bg-slate-950 text-slate-100">
  <!-- Header -->
  <header class="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-30">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center text-white font-extrabold shadow-md">
        <i data-lucide="sparkles" class="w-5 h-5"></i>
      </div>
      <div>
        <h1 class="text-sm font-bold text-white tracking-tight">${bp.title}</h1>
        <p class="text-[11px] text-slate-400">Le hub des créateurs et innovateurs</p>
      </div>
    </div>
    
    <div class="flex items-center gap-3">
      <button id="btn-open-create-post" class="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-pink-500/20 transition">
        <i data-lucide="plus-circle" class="w-4 h-4"></i>
        <span>Nouveau Post</span>
      </button>
      <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" class="w-8 h-8 rounded-full object-cover ring-2 ring-purple-500">
    </div>
  </header>

  <div class="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
    
    <!-- Feed Column -->
    <main class="md:col-span-2 space-y-6">
      
      <!-- Stories Carousel -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-x-auto no-scrollbar flex items-center gap-4">
        <div class="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0">
          <div class="w-14 h-14 rounded-full bg-slate-800 border-2 border-dashed border-purple-500 flex items-center justify-center text-purple-400">
            <i data-lucide="plus" class="w-5 h-5"></i>
          </div>
          <span class="text-[10px] text-slate-400 font-semibold">Votre Story</span>
        </div>
        <div class="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0">
          <div class="w-14 h-14 rounded-full ring-2 ring-pink-500 ring-offset-2 ring-offset-slate-900 overflow-hidden">
            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80" class="w-full h-full object-cover">
          </div>
          <span class="text-[10px] text-slate-300 font-semibold">Alexandre</span>
        </div>
        <div class="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0">
          <div class="w-14 h-14 rounded-full ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-900 overflow-hidden">
            <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80" class="w-full h-full object-cover">
          </div>
          <span class="text-[10px] text-slate-300 font-semibold">Camille</span>
        </div>
        <div class="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0">
          <div class="w-14 h-14 rounded-full ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900 overflow-hidden">
            <img src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=120&q=80" class="w-full h-full object-cover">
          </div>
          <span class="text-[10px] text-slate-300 font-semibold">Julien</span>
        </div>
      </div>

      <!-- Feed Post 1 -->
      <article class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div class="p-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=100&q=80" class="w-10 h-10 rounded-full object-cover">
            <div>
              <div class="flex items-center gap-1.5">
                <h3 class="text-xs font-bold text-white">Camille Laurent</h3>
                <span class="w-3.5 h-3.5 rounded-full bg-sky-500 text-white flex items-center justify-center text-[8px]">✓</span>
              </div>
              <p class="text-[10px] text-slate-400">Designer UI/UX • Il y a 2h</p>
            </div>
          </div>
          <button class="btn-follow px-3 py-1 rounded-lg border border-purple-500/50 bg-purple-500/10 text-purple-300 text-[11px] font-bold hover:bg-purple-500 hover:text-white transition">Suivre</button>
        </div>
        
        <p class="px-4 text-xs text-slate-200 leading-relaxed">
          Nouveau projet d'application mobile finalisé avec un système de design sombre et une typographie sur-mesure. Qu'en pensez-vous ? ✨🚀
        </p>

        <div class="mt-3 w-full h-64 bg-slate-950 overflow-hidden">
          <img src="https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&w=800&q=80" class="w-full h-full object-cover">
        </div>

        <div class="p-4 flex items-center justify-between border-t border-slate-800/80">
          <div class="flex items-center gap-4">
            <button class="btn-like flex items-center gap-1.5 text-xs text-slate-400 hover:text-pink-500 transition">
              <i data-lucide="heart" class="w-4 h-4"></i>
              <span class="like-counter font-bold">142</span>
            </button>
            <button class="btn-open-comments flex items-center gap-1.5 text-xs text-slate-400 hover:text-purple-400 transition">
              <i data-lucide="message-circle" class="w-4 h-4"></i>
              <span class="font-bold">28</span>
            </button>
            <button class="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition">
              <i data-lucide="share-2" class="w-4 h-4"></i>
            </button>
          </div>
          <button class="text-slate-400 hover:text-white">
            <i data-lucide="bookmark" class="w-4 h-4"></i>
          </button>
        </div>
      </article>

      <!-- Feed Post 2 -->
      <article class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div class="p-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" class="w-10 h-10 rounded-full object-cover">
            <div>
              <h3 class="text-xs font-bold text-white">Alexandre Dumas</h3>
              <p class="text-[10px] text-slate-400">Fondateur Tech • Il y a 4h</p>
            </div>
          </div>
          <button class="btn-follow px-3 py-1 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 text-[11px] font-bold hover:bg-slate-700 transition">Abonné</button>
        </div>
        
        <p class="px-4 text-xs text-slate-200 leading-relaxed">
          La clé pour créer un produit mémorable : la vitesse d'exécution et le respect absolu de l'intention utilisateur. Jamais de compromis sur la qualité. 💡
        </p>

        <div class="p-4 mt-2 flex items-center justify-between border-t border-slate-800/80">
          <div class="flex items-center gap-4">
            <button class="btn-like flex items-center gap-1.5 text-xs text-slate-400 hover:text-pink-500 transition">
              <i data-lucide="heart" class="w-4 h-4"></i>
              <span class="like-counter font-bold">89</span>
            </button>
            <button class="btn-open-comments flex items-center gap-1.5 text-xs text-slate-400 hover:text-purple-400 transition">
              <i data-lucide="message-circle" class="w-4 h-4"></i>
              <span class="font-bold">14</span>
            </button>
          </div>
        </div>
      </article>

    </main>

    <!-- Sidebar Column -->
    <aside class="space-y-6 hidden md:block">
      <!-- Trends Card -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h3 class="text-xs font-bold text-white mb-3 flex items-center gap-1.5">
          <i data-lucide="trending-up" class="w-4 h-4 text-pink-500"></i>
          <span>Tendances du Moment</span>
        </h3>
        <div class="space-y-2.5 text-xs">
          <div class="flex justify-between items-center">
            <span class="font-semibold text-purple-300">#ProductDesign</span>
            <span class="text-[10px] text-slate-400">14.2k posts</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="font-semibold text-purple-300">#ArtificialIntelligence</span>
            <span class="text-[10px] text-slate-400">32.8k posts</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="font-semibold text-purple-300">#NextGenWeb</span>
            <span class="text-[10px] text-slate-400">9.1k posts</span>
          </div>
        </div>
      </div>
    </aside>

  </div>

  <!-- Create Post Modal -->
  <div id="modal-create-post" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
    <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl relative">
      <button id="btn-close-post-modal" class="absolute top-4 right-4 text-slate-400 hover:text-white">
        <i data-lucide="x" class="w-5 h-5"></i>
      </button>
      <h3 class="text-sm font-bold text-white mb-3">Créer une publication</h3>
      <textarea id="post-content-input" placeholder="Partagez vos réflexions avec la communauté..." class="w-full h-28 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"></textarea>
      <div class="mt-4 flex justify-between items-center">
        <div class="flex gap-2 text-slate-400">
          <button class="p-2 rounded-lg bg-slate-800 hover:text-white"><i data-lucide="image" class="w-4 h-4"></i></button>
          <button class="p-2 rounded-lg bg-slate-800 hover:text-white"><i data-lucide="smile" class="w-4 h-4"></i></button>
        </div>
        <button id="btn-submit-post" class="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow transition">
          Publier
        </button>
      </div>
    </div>
  </div>

  <script>
    const btnCreate = document.getElementById('btn-open-create-post');
    const modalCreate = document.getElementById('modal-create-post');
    const btnClosePostModal = document.getElementById('btn-close-post-modal');
    const btnSubmitPost = document.getElementById('btn-submit-post');
    const postInput = document.getElementById('post-content-input');
    const likeButtons = document.querySelectorAll('.btn-like');
    const followButtons = document.querySelectorAll('.btn-follow');

    btnCreate.addEventListener('click', () => modalCreate.classList.remove('hidden'));
    btnClosePostModal.addEventListener('click', () => modalCreate.classList.add('hidden'));

    btnSubmitPost.addEventListener('click', () => {
      if (postInput.value.trim().length > 0) {
        alert('Publication en ligne ! 🎉');
        postInput.value = '';
        modalCreate.classList.add('hidden');
      }
    });

    likeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const counter = btn.querySelector('.like-counter');
        const icon = btn.querySelector('svg') || btn.querySelector('i');
        let count = parseInt(counter.textContent);
        if (btn.classList.contains('text-pink-500')) {
          btn.classList.remove('text-pink-500');
          btn.classList.add('text-slate-400');
          counter.textContent = count - 1;
        } else {
          btn.classList.remove('text-slate-400');
          btn.classList.add('text-pink-500');
          counter.textContent = count + 1;
        }
      });
    });

    followButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.textContent === 'Suivre') {
          btn.textContent = 'Abonné';
          btn.classList.remove('bg-purple-500/10', 'text-purple-300', 'border-purple-500/50');
          btn.classList.add('bg-slate-800', 'text-slate-300', 'border-slate-700');
        } else {
          btn.textContent = 'Suivre';
          btn.classList.remove('bg-slate-800', 'text-slate-300', 'border-slate-700');
          btn.classList.add('bg-purple-500/10', 'text-purple-300', 'border-purple-500/50');
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
