import { ProductBlueprint } from '../productBlueprint';
import { UXPlan } from '../uxProductPlanner';

export function generateBookingApp(bp: ProductBlueprint, ux: UXPlan): string {
  return `<!DOCTYPE html>
<html lang="fr" class="h-full bg-slate-950 text-slate-100 font-sans">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${bp.title} — Réservation</title>
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
      <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
        <i data-lucide="calendar-check" class="w-5 h-5"></i>
      </div>
      <div>
        <h1 class="text-sm font-bold text-white tracking-tight">${bp.title}</h1>
        <p class="text-[11px] text-slate-400">Prise de rendez-vous en ligne immédiate</p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <button id="btn-tab-book" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white shadow">Réserver</button>
      <button id="btn-tab-my-bookings" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition">
        Mes RDV (<span id="my-bookings-count">1</span>)
      </button>
    </div>
  </header>

  <!-- Main Container -->
  <main class="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
    
    <!-- View: Booking Flow -->
    <section id="view-booking" class="flex flex-col gap-6">
      <!-- Step 1: Practitioner Selection -->
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center">1</span>
            <h2 class="text-sm font-bold text-white">Sélectionnez votre praticien ou expert</h2>
          </div>
          <span class="text-xs text-slate-400">3 experts disponibles</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5" id="practitioners-grid">
          <div class="practitioner-card cursor-pointer p-4 rounded-xl border border-indigo-500 bg-indigo-950/30 transition hover:border-indigo-400 flex items-center gap-3" data-id="1" data-name="Dr. Sophie Martin" data-role="Consultante Stratégie" data-price="120 €">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" class="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-500">
            <div>
              <h3 class="text-xs font-bold text-white">Dr. Sophie Martin</h3>
              <p class="text-[11px] text-indigo-300">Consultante Stratégie</p>
              <div class="flex items-center gap-1 mt-1 text-[10px] text-amber-400">
                <i data-lucide="star" class="w-3 h-3 fill-amber-400"></i> 4.9 (128 avis)
              </div>
            </div>
          </div>
          <div class="practitioner-card cursor-pointer p-4 rounded-xl border border-slate-800 bg-slate-800/40 transition hover:border-slate-700 flex items-center gap-3" data-id="2" data-name="Thomas Leroy" data-role="Coach Produit & UX" data-price="95 €">
            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80" class="w-12 h-12 rounded-full object-cover">
            <div>
              <h3 class="text-xs font-bold text-white">Thomas Leroy</h3>
              <p class="text-[11px] text-slate-400">Coach Produit & UX</p>
              <div class="flex items-center gap-1 mt-1 text-[10px] text-amber-400">
                <i data-lucide="star" class="w-3 h-3 fill-amber-400"></i> 4.8 (94 avis)
              </div>
            </div>
          </div>
          <div class="practitioner-card cursor-pointer p-4 rounded-xl border border-slate-800 bg-slate-800/40 transition hover:border-slate-700 flex items-center gap-3" data-id="3" data-name="Éléonore Blanc" data-role="Architecte Cloud" data-price="140 €">
            <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80" class="w-12 h-12 rounded-full object-cover">
            <div>
              <h3 class="text-xs font-bold text-white">Éléonore Blanc</h3>
              <p class="text-[11px] text-slate-400">Architecte Cloud</p>
              <div class="flex items-center gap-1 mt-1 text-[10px] text-amber-400">
                <i data-lucide="star" class="w-3 h-3 fill-amber-400"></i> 5.0 (62 avis)
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2: Date & Slot Picker -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Date Selector -->
        <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div class="flex items-center gap-2 mb-4">
            <span class="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center">2</span>
            <h2 class="text-sm font-bold text-white">Choisissez une date</h2>
          </div>
          <div class="grid grid-cols-5 gap-2" id="calendar-days">
            <button class="cal-day-btn p-3 rounded-xl border border-indigo-500 bg-indigo-950/40 text-center transition" data-date="Lun 15 Sept">
              <span class="block text-[10px] text-slate-400 uppercase font-bold">Lun</span>
              <span class="block text-sm font-black text-white mt-0.5">15</span>
              <span class="block text-[9px] text-emerald-400 font-semibold mt-1">4 créneaux</span>
            </button>
            <button class="cal-day-btn p-3 rounded-xl border border-slate-800 bg-slate-800/40 text-center hover:border-slate-700 transition" data-date="Mar 16 Sept">
              <span class="block text-[10px] text-slate-400 uppercase font-bold">Mar</span>
              <span class="block text-sm font-black text-white mt-0.5">16</span>
              <span class="block text-[9px] text-emerald-400 font-semibold mt-1">6 créneaux</span>
            </button>
            <button class="cal-day-btn p-3 rounded-xl border border-slate-800 bg-slate-800/40 text-center hover:border-slate-700 transition" data-date="Mer 17 Sept">
              <span class="block text-[10px] text-slate-400 uppercase font-bold">Mer</span>
              <span class="block text-sm font-black text-white mt-0.5">17</span>
              <span class="block text-[9px] text-emerald-400 font-semibold mt-1">2 créneaux</span>
            </button>
            <button class="cal-day-btn p-3 rounded-xl border border-slate-800 bg-slate-800/40 text-center hover:border-slate-700 transition" data-date="Jeu 18 Sept">
              <span class="block text-[10px] text-slate-400 uppercase font-bold">Jeu</span>
              <span class="block text-sm font-black text-white mt-0.5">18</span>
              <span class="block text-[9px] text-emerald-400 font-semibold mt-1">5 créneaux</span>
            </button>
            <button class="cal-day-btn p-3 rounded-xl border border-slate-800 bg-slate-800/40 text-center hover:border-slate-700 transition" data-date="Ven 19 Sept">
              <span class="block text-[10px] text-slate-400 uppercase font-bold">Ven</span>
              <span class="block text-sm font-black text-white mt-0.5">19</span>
              <span class="block text-[9px] text-emerald-400 font-semibold mt-1">3 créneaux</span>
            </button>
          </div>
        </div>

        <!-- Slots Selector -->
        <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center">3</span>
                <h2 class="text-sm font-bold text-white">Sélectionnez l'horaire</h2>
              </div>
              <span id="selected-date-label" class="text-xs text-indigo-300 font-medium">Lun 15 Sept</span>
            </div>
            
            <div class="space-y-3">
              <div>
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Matin</span>
                <div class="grid grid-cols-3 gap-2">
                  <button class="slot-btn py-2 rounded-lg border border-indigo-500 bg-indigo-950/60 text-white text-xs font-bold transition" data-time="09:30">09:30</button>
                  <button class="slot-btn py-2 rounded-lg border border-slate-800 bg-slate-800/40 text-slate-300 text-xs font-semibold hover:border-slate-700 transition" data-time="10:45">10:45</button>
                  <button class="slot-btn py-2 rounded-lg border border-slate-800 bg-slate-800/40 text-slate-300 text-xs font-semibold hover:border-slate-700 transition" data-time="11:30">11:30</button>
                </div>
              </div>
              <div>
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Après-midi</span>
                <div class="grid grid-cols-3 gap-2">
                  <button class="slot-btn py-2 rounded-lg border border-slate-800 bg-slate-800/40 text-slate-300 text-xs font-semibold hover:border-slate-700 transition" data-time="14:00">14:00</button>
                  <button class="slot-btn py-2 rounded-lg border border-slate-800 bg-slate-800/40 text-slate-300 text-xs font-semibold hover:border-slate-700 transition" data-time="15:30">15:30</button>
                  <button class="slot-btn py-2 rounded-lg border border-slate-800 bg-slate-800/40 text-slate-300 text-xs font-semibold hover:border-slate-700 transition" data-time="17:00">17:00</button>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span class="text-[11px] text-slate-400 block">Total de la séance</span>
              <span id="booking-price-tag" class="text-sm font-extrabold text-white">120 €</span>
            </div>
            <button id="btn-proceed-booking" class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5">
              <span>Confirmer la séance</span>
              <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- View: My Bookings -->
    <section id="view-my-bookings" class="hidden flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-bold text-white">Vos rendez-vous confirmés</h2>
        <button id="btn-back-to-booking" class="text-xs text-indigo-400 hover:underline flex items-center gap-1">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Nouveau rendez-vous
        </button>
      </div>
      <div id="bookings-list" class="space-y-3">
        <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
              <i data-lucide="calendar" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="text-xs font-bold text-white">Consultation Stratégie avec Dr. Sophie Martin</h3>
              <p class="text-[11px] text-slate-400 mt-0.5">Vendredi 12 Septembre à 14:00 • 45 min • Visioconférence</p>
              <span class="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Confirmé</span>
            </div>
          </div>
          <button class="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-rose-400 text-xs font-semibold transition">
            Annuler
          </button>
        </div>
      </div>
    </section>

  </main>

  <!-- Confirmation Modal -->
  <div id="modal-confirmation" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
    <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
      <button id="btn-close-modal" class="absolute top-4 right-4 text-slate-400 hover:text-white">
        <i data-lucide="x" class="w-5 h-5"></i>
      </button>
      <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
        <i data-lucide="check-circle" class="w-6 h-6"></i>
      </div>
      <h3 class="text-base font-bold text-white text-center">Rendez-vous confirmé !</h3>
      <p class="text-xs text-slate-400 text-center mt-1">Un lien de visioconférence et un rappel vous ont été envoyés.</p>
      
      <div class="my-5 p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
        <div class="flex justify-between">
          <span class="text-slate-400">Expert :</span>
          <span id="modal-expert-name" class="font-bold text-white">Dr. Sophie Martin</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-400">Date :</span>
          <span id="modal-date-val" class="font-bold text-white">Lun 15 Sept à 09:30</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-400">Tarif :</span>
          <span id="modal-price-val" class="font-bold text-emerald-400">120 €</span>
        </div>
      </div>

      <button id="btn-done-modal" class="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition">
        Voir mes rendez-vous
      </button>
    </div>
  </div>

  <script>
    let selectedPractitioner = { id: '1', name: 'Dr. Sophie Martin', price: '120 €' };
    let selectedDate = 'Lun 15 Sept';
    let selectedTime = '09:30';

    // Elements
    const practitioners = document.querySelectorAll('.practitioner-card');
    const dayBtns = document.querySelectorAll('.cal-day-btn');
    const slotBtns = document.querySelectorAll('.slot-btn');
    const priceTag = document.getElementById('booking-price-tag');
    const dateLabel = document.getElementById('selected-date-label');
    const btnProceed = document.getElementById('btn-proceed-booking');
    const modal = document.getElementById('modal-confirmation');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnDoneModal = document.getElementById('btn-done-modal');
    const viewBooking = document.getElementById('view-booking');
    const viewMyBookings = document.getElementById('view-my-bookings');
    const btnTabBook = document.getElementById('btn-tab-book');
    const btnTabMyBookings = document.getElementById('btn-tab-my-bookings');
    const btnBackToBooking = document.getElementById('btn-back-to-booking');

    practitioners.forEach(card => {
      card.addEventListener('click', () => {
        practitioners.forEach(c => {
          c.classList.remove('border-indigo-500', 'bg-indigo-950/30');
          c.classList.add('border-slate-800', 'bg-slate-800/40');
        });
        card.classList.remove('border-slate-800', 'bg-slate-800/40');
        card.classList.add('border-indigo-500', 'bg-indigo-950/30');
        selectedPractitioner = {
          id: card.dataset.id,
          name: card.dataset.name,
          price: card.dataset.price
        };
        priceTag.textContent = selectedPractitioner.price;
      });
    });

    dayBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        dayBtns.forEach(b => {
          b.classList.remove('border-indigo-500', 'bg-indigo-950/40');
          b.classList.add('border-slate-800', 'bg-slate-800/40');
        });
        btn.classList.remove('border-slate-800', 'bg-slate-800/40');
        btn.classList.add('border-indigo-500', 'bg-indigo-950/40');
        selectedDate = btn.dataset.date;
        dateLabel.textContent = selectedDate;
      });
    });

    slotBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        slotBtns.forEach(b => {
          b.classList.remove('border-indigo-500', 'bg-indigo-950/60', 'text-white');
          b.classList.add('border-slate-800', 'bg-slate-800/40', 'text-slate-300');
        });
        btn.classList.remove('border-slate-800', 'bg-slate-800/40', 'text-slate-300');
        btn.classList.add('border-indigo-500', 'bg-indigo-950/60', 'text-white');
        selectedTime = btn.dataset.time;
      });
    });

    btnProceed.addEventListener('click', () => {
      document.getElementById('modal-expert-name').textContent = selectedPractitioner.name;
      document.getElementById('modal-date-val').textContent = selectedDate + ' à ' + selectedTime;
      document.getElementById('modal-price-val').textContent = selectedPractitioner.price;
      modal.classList.remove('hidden');
    });

    btnCloseModal.addEventListener('click', () => modal.classList.add('hidden'));

    btnDoneModal.addEventListener('click', () => {
      modal.classList.add('hidden');
      switchToMyBookings();
    });

    function switchToMyBookings() {
      viewBooking.classList.add('hidden');
      viewMyBookings.classList.remove('hidden');
      btnTabMyBookings.classList.remove('bg-slate-800', 'text-slate-300');
      btnTabMyBookings.classList.add('bg-indigo-600', 'text-white');
      btnTabBook.classList.remove('bg-indigo-600', 'text-white');
      btnTabBook.classList.add('bg-slate-800', 'text-slate-300');
      document.getElementById('my-bookings-count').textContent = '2';
    }

    function switchToBooking() {
      viewMyBookings.classList.add('hidden');
      viewBooking.classList.remove('hidden');
      btnTabBook.classList.remove('bg-slate-800', 'text-slate-300');
      btnTabBook.classList.add('bg-indigo-600', 'text-white');
      btnTabMyBookings.classList.remove('bg-indigo-600', 'text-white');
      btnTabMyBookings.classList.add('bg-slate-800', 'text-slate-300');
    }

    btnTabMyBookings.addEventListener('click', switchToMyBookings);
    btnTabBook.addEventListener('click', switchToBooking);
    btnBackToBooking.addEventListener('click', switchToBooking);

    document.addEventListener('DOMContentLoaded', () => {
      if (window.lucide) lucide.createIcons();
    });
  </script>
</body>
</html>`;
}
