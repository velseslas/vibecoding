import { ProductBlueprint } from '../productBlueprint';
import { UXPlan } from '../uxProductPlanner';

export function generateEcommerceApp(bp: ProductBlueprint, ux: UXPlan): string {
  return `<!DOCTYPE html>
<html lang="fr" class="h-full bg-slate-950 text-slate-100 font-sans">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${bp.title} — Boutique</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  </style>
</head>
<body class="h-full flex flex-col bg-slate-950 text-slate-100">
  <!-- Top Promo Banner -->
  <div class="bg-gradient-to-r from-amber-600 to-rose-600 text-white text-[11px] font-bold text-center py-1.5 px-4 tracking-wide flex items-center justify-center gap-2">
    <span>✨ LIVRAISON OFFERTE DÈS 150 € D'ACHAT • CODE: LUXE20 POUR -20%</span>
  </div>

  <!-- Header -->
  <header class="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-30">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-extrabold shadow-md">
        <i data-lucide="gem" class="w-5 h-5"></i>
      </div>
      <div>
        <h1 class="text-sm font-bold text-white tracking-tight">${bp.title}</h1>
        <p class="text-[11px] text-slate-400">Haute Horlogerie & Maroquinerie d'Exception</p>
      </div>
    </div>
    
    <div class="flex items-center gap-4">
      <div class="relative hidden sm:block">
        <input type="text" id="store-search-input" placeholder="Rechercher une pièce..." class="bg-slate-800 border border-slate-700 rounded-xl px-3 pl-8 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 w-48 transition">
        <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5"></i>
      </div>
      <button id="btn-open-cart" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 transition">
        <i data-lucide="shopping-bag" class="w-4 h-4"></i>
        <span>Panier</span>
        <span id="cart-badge" class="w-5 h-5 rounded-full bg-slate-950 text-amber-400 text-[10px] flex items-center justify-center font-black">1</span>
      </button>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="relative bg-slate-900 border-b border-slate-800 overflow-hidden">
    <div class="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
      <div>
        <span class="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">Nouvelle Édition Limitée</span>
        <h2 class="text-2xl sm:text-3xl font-black text-white leading-tight">Chronomètre Apex Céramique Noire</h2>
        <p class="text-xs text-slate-400 mt-2 leading-relaxed">Mouvement automatique manufacture, réserve de marche de 72 heures, verre saphir inrayable et bracelet alligator cousu main.</p>
        <div class="flex items-center gap-4 mt-6">
          <button class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition">Commander la pièce exclusive</button>
          <span class="text-lg font-black text-white">1 450 €</span>
        </div>
      </div>
      <div class="h-56 sm:h-64 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 relative">
        <img src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80" class="w-full h-full object-cover">
        <div class="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-amber-300 font-semibold">
          Numéroté 04/50
        </div>
      </div>
    </div>
  </section>

  <!-- Category & Filter Bar -->
  <div class="bg-slate-950 border-b border-slate-800 px-6 py-3 sticky top-16 z-20 backdrop-blur bg-slate-950/90 flex items-center justify-between">
    <div class="flex items-center gap-2 overflow-x-auto no-scrollbar">
      <button class="cat-pill px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 shadow" data-cat="all">Toutes les pièces</button>
      <button class="cat-pill px-3 py-1 rounded-lg text-xs font-semibold bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700 transition" data-cat="horlogerie">Horlogerie</button>
      <button class="cat-pill px-3 py-1 rounded-lg text-xs font-semibold bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700 transition" data-cat="maroquinerie">Maroquinerie</button>
      <button class="cat-pill px-3 py-1 rounded-lg text-xs font-semibold bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700 transition" data-cat="accessoires">Accessoires</button>
    </div>
    <span class="text-xs text-slate-400 hidden sm:inline"><span id="product-count-label">4</span> pièces disponibles</span>
  </div>

  <!-- Product Catalog Grid -->
  <main class="flex-1 max-w-6xl w-full mx-auto p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    
    <!-- Item 1 -->
    <div class="product-item bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition group" data-cat="horlogerie" data-name="Chronomètre Royal" data-price="890">
      <div>
        <div class="w-full h-48 rounded-xl overflow-hidden mb-3 bg-slate-950 relative">
          <img src="https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=400&q=80" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
          <span class="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-500 text-slate-950">Best Seller</span>
        </div>
        <h3 class="font-bold text-xs text-white">Chronomètre Royal Titane</h3>
        <p class="text-[11px] text-slate-400 mt-0.5">Boîtier titane grade 5 & cadran soleillé</p>
      </div>
      <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <div>
          <span class="text-xs font-black text-amber-400">890 €</span>
        </div>
        <button class="btn-add-to-cart px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Ajouter
        </button>
      </div>
    </div>

    <!-- Item 2 -->
    <div class="product-item bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition group" data-cat="maroquinerie" data-name="Porte-Documents Cuir" data-price="420">
      <div>
        <div class="w-full h-48 rounded-xl overflow-hidden mb-3 bg-slate-950 relative">
          <img src="https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=400&q=80" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
          <span class="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500 text-slate-950">Nouveau</span>
        </div>
        <h3 class="font-bold text-xs text-white">Porte-Documents Grand Duc</h3>
        <p class="text-[11px] text-slate-400 mt-0.5">Cuir pleine fleur tanné végétal en Toscane</p>
      </div>
      <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <div>
          <span class="text-xs font-black text-amber-400">420 €</span>
        </div>
        <button class="btn-add-to-cart px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Ajouter
        </button>
      </div>
    </div>

    <!-- Item 3 -->
    <div class="product-item bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition group" data-cat="accessoires" data-name="Boutons de Manchette Or" data-price="290">
      <div>
        <div class="w-full h-48 rounded-xl overflow-hidden mb-3 bg-slate-950 relative">
          <img src="https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=400&q=80" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
        </div>
        <h3 class="font-bold text-xs text-white">Boutons de Manchette Onyx</h3>
        <p class="text-[11px] text-slate-400 mt-0.5">Or 18 carats et onyx noir serti à la main</p>
      </div>
      <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <div>
          <span class="text-xs font-black text-amber-400">290 €</span>
        </div>
        <button class="btn-add-to-cart px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Ajouter
        </button>
      </div>
    </div>

    <!-- Item 4 -->
    <div class="product-item bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition group" data-cat="maroquinerie" data-name="Portefeuille Minimaliste" data-price="180">
      <div>
        <div class="w-full h-48 rounded-xl overflow-hidden mb-3 bg-slate-950 relative">
          <img src="https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=400&q=80" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
        </div>
        <h3 class="font-bold text-xs text-white">Portefeuille Galuchat Ébène</h3>
        <p class="text-[11px] text-slate-400 mt-0.5">Texture grainée artisanale & protection RFID</p>
      </div>
      <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <div>
          <span class="text-xs font-black text-amber-400">180 €</span>
        </div>
        <button class="btn-add-to-cart px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Ajouter
        </button>
      </div>
    </div>

  </main>

  <!-- Cart Drawer -->
  <div id="cart-drawer" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end hidden">
    <div class="max-w-md w-full h-full bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between shadow-2xl">
      <div>
        <div class="flex items-center justify-between pb-4 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <i data-lucide="shopping-bag" class="w-5 h-5 text-amber-400"></i>
            <h2 class="text-sm font-bold text-white">Votre Panier de Sélection</h2>
          </div>
          <button id="btn-close-cart" class="text-slate-400 hover:text-white">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <!-- Free shipping bar -->
        <div class="my-4 p-3 rounded-xl bg-slate-950 border border-slate-800">
          <div class="flex justify-between text-[11px] mb-1.5">
            <span class="text-slate-300 font-medium">Livraison offerte</span>
            <span class="text-amber-400 font-bold">Atteinte ! 🎉</span>
          </div>
          <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full bg-amber-500 rounded-full w-full"></div>
          </div>
        </div>

        <!-- Cart items list -->
        <div id="cart-items-list" class="space-y-3 mt-4">
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <img src="https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=100&q=80" class="w-12 h-12 rounded-lg object-cover">
              <div>
                <h4 class="text-xs font-bold text-white">Chronomètre Royal Titane</h4>
                <span class="text-[11px] text-amber-400 font-black">890 €</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold text-slate-300">Qté: 1</span>
              <button class="text-rose-400 hover:text-rose-300 text-xs font-bold p-1">✕</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Cart Footer & Checkout -->
      <div class="pt-4 border-t border-slate-800 space-y-3">
        <!-- Promo code input -->
        <div class="flex gap-2">
          <input type="text" id="promo-input" placeholder="Code promo (ex: LUXE20)" class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500">
          <button id="btn-apply-promo" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition">Appliquer</button>
        </div>
        <div class="space-y-1.5 text-xs">
          <div class="flex justify-between text-slate-400">
            <span>Sous-total</span>
            <span id="cart-subtotal" class="font-semibold text-white">890 €</span>
          </div>
          <div class="flex justify-between text-slate-400">
            <span>Livraison Express Sécurisée</span>
            <span class="font-semibold text-emerald-400">Gratuite</span>
          </div>
          <div class="flex justify-between text-sm font-black text-white pt-2 border-t border-slate-800">
            <span>Total TTC</span>
            <span id="cart-total" class="text-amber-400">890 €</span>
          </div>
        </div>
        <button id="btn-checkout" class="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition">
          Finaliser la commande sécurisée
        </button>
      </div>
    </div>
  </div>

  <script>
    let cart = [{ name: 'Chronomètre Royal Titane', price: 890, qty: 1 }];
    let discount = 0;

    const btnOpenCart = document.getElementById('btn-open-cart');
    const btnCloseCart = document.getElementById('btn-close-cart');
    const cartDrawer = document.getElementById('cart-drawer');
    const btnApplyPromo = document.getElementById('btn-apply-promo');
    const promoInput = document.getElementById('promo-input');
    const cartTotal = document.getElementById('cart-total');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartBadge = document.getElementById('cart-badge');
    const catPills = document.querySelectorAll('.cat-pill');
    const productItems = document.querySelectorAll('.product-item');
    const btnAddCartList = document.querySelectorAll('.btn-add-to-cart');

    btnOpenCart.addEventListener('click', () => cartDrawer.classList.remove('hidden'));
    btnCloseCart.addEventListener('click', () => cartDrawer.classList.add('hidden'));

    catPills.forEach(pill => {
      pill.addEventListener('click', () => {
        catPills.forEach(p => {
          p.classList.remove('bg-amber-500', 'text-slate-950');
          p.classList.add('bg-slate-900', 'text-slate-300');
        });
        pill.classList.remove('bg-slate-900', 'text-slate-300');
        pill.classList.add('bg-amber-500', 'text-slate-950');
        const cat = pill.dataset.cat;
        let count = 0;
        productItems.forEach(item => {
          if (cat === 'all' || item.dataset.cat === cat) {
            item.classList.remove('hidden');
            count++;
          } else {
            item.classList.add('hidden');
          }
        });
        document.getElementById('product-count-label').textContent = count;
      });
    });

    btnAddCartList.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        const itemEl = btn.closest('.product-item');
        const name = itemEl.dataset.name;
        const price = parseInt(itemEl.dataset.price);
        cart.push({ name, price, qty: 1 });
        updateCart();
        cartDrawer.classList.remove('hidden');
      });
    });

    btnApplyPromo.addEventListener('click', () => {
      if (promoInput.value.trim().toUpperCase() === 'LUXE20') {
        discount = 0.20;
        alert('Code promo LUXE20 appliqué (-20%) !');
        updateCart();
      } else {
        alert('Code promo invalide');
      }
    });

    function updateCart() {
      const sub = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);
      const total = sub * (1 - discount);
      cartSubtotal.textContent = sub + ' €';
      cartTotal.textContent = Math.round(total) + ' €';
      cartBadge.textContent = cart.length;
    }

    document.getElementById('btn-checkout').addEventListener('click', () => {
      alert('Paiement sécurisé initié pour ' + cartTotal.textContent);
    });

    document.addEventListener('DOMContentLoaded', () => {
      if (window.lucide) lucide.createIcons();
    });
  </script>
</body>
</html>`;
}
