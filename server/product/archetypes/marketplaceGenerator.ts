import { ProductBlueprint } from '../productBlueprint';
import { UXPlan } from '../uxProductPlanner';

export function generateMarketplaceApp(bp: ProductBlueprint, ux: UXPlan): string {
  return `<!DOCTYPE html>
<html lang="fr" class="h-full bg-slate-950 text-slate-100 font-sans">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${bp.title} — Place de Marché</title>
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
      <div class="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-extrabold shadow-md">
        <i data-lucide="store" class="w-5 h-5"></i>
      </div>
      <div>
        <h1 class="text-sm font-bold text-white tracking-tight">${bp.title}</h1>
        <p class="text-[11px] text-slate-400">Place de marché des créateurs & artisans d'exception</p>
      </div>
    </div>
    
    <div class="flex items-center gap-3">
      <div class="relative hidden sm:block">
        <input type="text" id="market-search" placeholder="Rechercher un artisan ou objet..." class="bg-slate-800 border border-slate-700 rounded-xl px-3 pl-8 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-56">
        <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5"></i>
      </div>
      <button id="btn-open-cart" class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition">
        <i data-lucide="shopping-cart" class="w-4 h-4"></i>
        <span>Panier</span>
        <span id="market-cart-badge" class="w-5 h-5 rounded-full bg-slate-950 text-emerald-400 text-[10px] flex items-center justify-center font-black">1</span>
      </button>
    </div>
  </header>

  <!-- Category & Price Filter Bar -->
  <div class="bg-slate-900 border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
    <div class="flex items-center gap-2 overflow-x-auto no-scrollbar">
      <button class="cat-pill px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow" data-cat="all">Tout explorer</button>
      <button class="cat-pill px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600 transition" data-cat="audio">Audio & Studio</button>
      <button class="cat-pill px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600 transition" data-cat="ceramique">Céramique & Déco</button>
      <button class="cat-pill px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600 transition" data-cat="bois">Ébénisterie</button>
    </div>
    <div class="flex items-center gap-3 text-xs">
      <span class="text-slate-400">Prix max : <strong id="price-filter-val" class="text-emerald-400 font-bold">500 €</strong></span>
      <input type="range" id="price-slider" min="50" max="500" value="500" class="w-28 accent-emerald-500">
    </div>
  </div>

  <!-- Marketplace Grid -->
  <main class="flex-1 max-w-6xl w-full mx-auto p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
    
    <!-- Product 1 -->
    <div class="market-card bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition" data-cat="audio" data-price="280" data-name="Enceinte Bois Massif & Cuivre">
      <div>
        <div class="w-full h-44 rounded-xl overflow-hidden mb-3 bg-slate-950">
          <img src="https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=400&q=80" class="w-full h-full object-cover">
        </div>
        <div class="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold mb-1">
          <i data-lucide="award" class="w-3.5 h-3.5"></i> Artisan d'Art • Atelier Valmy
        </div>
        <h3 class="font-bold text-xs text-white">Enceinte Acoustique Noyer Massif</h3>
        <p class="text-[11px] text-slate-400 mt-1">Conception artisanale, filtrage audiophile et finitions cire d'abeille naturelle.</p>
      </div>
      <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <div>
          <span class="text-sm font-black text-emerald-400">280 €</span>
          <span class="text-[10px] text-slate-500 block">Stock : 2 pièces</span>
        </div>
        <button class="btn-add-market px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Ajouter
        </button>
      </div>
    </div>

    <!-- Product 2 -->
    <div class="market-card bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition" data-cat="ceramique" data-price="95" data-name="Vase Grès Chamotté">
      <div>
        <div class="w-full h-44 rounded-xl overflow-hidden mb-3 bg-slate-950">
          <img src="https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=400&q=80" class="w-full h-full object-cover">
        </div>
        <div class="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold mb-1">
          <i data-lucide="award" class="w-3.5 h-3.5"></i> Céramiste • Studio Terre
        </div>
        <h3 class="font-bold text-xs text-white">Vase Sculptural en Grès Chamotté</h3>
        <p class="text-[11px] text-slate-400 mt-1">Façonné au tour de potier, émail minéral mat et cuisson grand feu à 1280°C.</p>
      </div>
      <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <div>
          <span class="text-sm font-black text-emerald-400">95 €</span>
          <span class="text-[10px] text-slate-500 block">Pièce Unique</span>
        </div>
        <button class="btn-add-market px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Ajouter
        </button>
      </div>
    </div>

    <!-- Product 3 -->
    <div class="market-card bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition" data-cat="bois" data-price="190" data-name="Planche de Découpe Chêne des Vosges">
      <div>
        <div class="w-full h-44 rounded-xl overflow-hidden mb-3 bg-slate-950">
          <img src="https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=400&q=80" class="w-full h-full object-cover">
        </div>
        <div class="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold mb-1">
          <i data-lucide="award" class="w-3.5 h-3.5"></i> Ébéniste • Atelier Bois
        </div>
        <h3 class="font-bold text-xs text-white">Planche Bout de Bois en Chêne Centenaire</h3>
        <p class="text-[11px] text-slate-400 mt-1">Assemblage haute précision en bois de bout, résistant aux lames les plus acérées.</p>
      </div>
      <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <div>
          <span class="text-sm font-black text-emerald-400">190 €</span>
          <span class="text-[10px] text-slate-500 block">Stock : 4 pièces</span>
        </div>
        <button class="btn-add-market px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Ajouter
        </button>
      </div>
    </div>

  </main>

  <!-- Cart Drawer -->
  <div id="market-cart-drawer" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end hidden">
    <div class="max-w-md w-full h-full bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between shadow-2xl">
      <div>
        <div class="flex items-center justify-between pb-4 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <i data-lucide="shopping-bag" class="w-5 h-5 text-emerald-400"></i>
            <h2 class="text-sm font-bold text-white">Panier d'Artisanat</h2>
          </div>
          <button id="btn-close-market-cart" class="text-slate-400 hover:text-white">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>
        <div id="market-items-list" class="space-y-3 mt-4">
          <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <h4 class="text-xs font-bold text-white">Enceinte Acoustique Noyer Massif</h4>
              <span class="text-[11px] text-emerald-400 font-bold">280 €</span>
            </div>
            <span class="text-xs text-slate-400">x1</span>
          </div>
        </div>
      </div>
      <div class="pt-4 border-t border-slate-800 space-y-3">
        <div class="flex justify-between text-sm font-black text-white">
          <span>Total de la commande</span>
          <span id="market-total-amount" class="text-emerald-400">280 €</span>
        </div>
        <button id="btn-market-checkout" class="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow transition">
          Commander auprès des créateurs
        </button>
      </div>
    </div>
  </div>

  <script>
    let cartItems = [{ name: 'Enceinte Acoustique Noyer Massif', price: 280 }];
    const btnOpenCart = document.getElementById('btn-open-cart');
    const btnCloseCart = document.getElementById('btn-close-market-cart');
    const cartDrawer = document.getElementById('market-cart-drawer');
    const catPills = document.querySelectorAll('.cat-pill');
    const cards = document.querySelectorAll('.market-card');
    const priceSlider = document.getElementById('price-slider');
    const priceFilterVal = document.getElementById('price-filter-val');
    const badge = document.getElementById('market-cart-badge');
    const totalAmount = document.getElementById('market-total-amount');

    btnOpenCart.addEventListener('click', () => cartDrawer.classList.remove('hidden'));
    btnCloseCart.addEventListener('click', () => cartDrawer.classList.add('hidden'));

    catPills.forEach(pill => {
      pill.addEventListener('click', () => {
        catPills.forEach(p => {
          p.className = 'cat-pill px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600 transition';
        });
        pill.className = 'cat-pill px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow';
        const cat = pill.dataset.cat;
        filterCards(cat, parseInt(priceSlider.value));
      });
    });

    priceSlider.addEventListener('input', () => {
      priceFilterVal.textContent = priceSlider.value + ' €';
      const activeCat = document.querySelector('.cat-pill.bg-emerald-600').dataset.cat;
      filterCards(activeCat, parseInt(priceSlider.value));
    });

    function filterCards(cat, maxPrice) {
      cards.forEach(c => {
        const cCat = c.dataset.cat;
        const cPrice = parseInt(c.dataset.price);
        if ((cat === 'all' || cCat === cat) && cPrice <= maxPrice) {
          c.classList.remove('hidden');
        } else {
          c.classList.add('hidden');
        }
      });
    }

    document.querySelectorAll('.btn-add-market').forEach(btn => {
      btn.addEventListener('click', () => {
        const parent = btn.closest('.market-card');
        const name = parent.dataset.name;
        const price = parseInt(parent.dataset.price);
        cartItems.push({ name, price });
        badge.textContent = cartItems.length;
        const sum = cartItems.reduce((a, b) => a + b.price, 0);
        totalAmount.textContent = sum + ' €';
        cartDrawer.classList.remove('hidden');
      });
    });

    document.getElementById('btn-market-checkout').addEventListener('click', () => {
      alert('Paiement direct artisan sécurisé validé ! Merci de soutenir la création indépendante. ✨');
    });

    document.addEventListener('DOMContentLoaded', () => {
      if (window.lucide) lucide.createIcons();
    });
  </script>
</body>
</html>`;
}
