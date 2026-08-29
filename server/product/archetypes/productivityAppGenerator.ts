import { ProductBlueprint } from '../productBlueprint';
import { UXPlan } from '../uxProductPlanner';

export function generateProductivityApp(bp: ProductBlueprint, ux: UXPlan): string {
  return `<!DOCTYPE html>
<html lang="fr" class="h-full bg-slate-950 text-slate-100 font-sans">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${bp.title} — Suivi d'Habitudes & Focus</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  </style>
</head>
<body class="h-full flex items-center justify-center bg-slate-950 p-0 sm:p-4 text-slate-100">
  
  <!-- Mobile Container Shell -->
  <div class="max-w-md w-full h-full sm:h-[840px] bg-slate-900 border-0 sm:border sm:border-slate-800 rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
    
    <!-- Top Header -->
    <header class="h-16 px-5 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur flex items-center justify-between z-10">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black shadow">
          <i data-lucide="zap" class="w-4 h-4"></i>
        </div>
        <div>
          <h1 class="text-xs font-bold text-white tracking-tight">${bp.title}</h1>
          <p class="text-[10px] text-slate-400">Dimanche, 28 Septembre</p>
        </div>
      </div>
      <div class="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full text-amber-400 text-xs font-extrabold">
        <span>🔥</span>
        <span id="streak-val">12 Jours</span>
      </div>
    </header>

    <!-- Main View: Habits & Focus -->
    <main class="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
      
      <!-- Daily Progress Card -->
      <div class="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-sm">
        <div class="flex justify-between items-center mb-2">
          <span class="text-xs font-bold text-white">Objectifs du Jour</span>
          <span id="progress-text" class="text-xs font-black text-emerald-400">3 / 4 validés (75%)</span>
        </div>
        <div class="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
          <div id="progress-bar-fill" class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" style="width: 75%;"></div>
        </div>
      </div>

      <!-- Pomodoro Focus Timer Block -->
      <div class="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-inner">
        <span class="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 mb-1">Session Focus Pomodoro</span>
        <div id="timer-display" class="text-4xl font-black text-white tracking-wider my-2 font-mono">25:00</div>
        <div class="flex items-center gap-3 mt-2">
          <button id="btn-timer-toggle" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5">
            <i data-lucide="play" class="w-3.5 h-3.5"></i>
            <span id="timer-btn-label">Démarrer</span>
          </button>
          <button id="btn-timer-reset" class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition">
            <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>

      <!-- Habits List -->
      <div class="space-y-3">
        <div class="flex justify-between items-center">
          <h2 class="text-xs font-bold text-white">Routines Quotidiennes</h2>
          <button id="btn-open-habit-modal" class="text-[11px] text-emerald-400 font-bold hover:underline flex items-center gap-1">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i> Ajouter
          </button>
        </div>

        <div id="habits-container" class="space-y-2.5">
          
          <!-- Habit 1 (Completed) -->
          <div class="habit-row p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between transition cursor-pointer" data-completed="true">
            <div class="flex items-center gap-3">
              <div class="habit-check-btn w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs shadow">
                ✓
              </div>
              <div>
                <h4 class="text-xs font-bold text-slate-300 line-through">Boire 1.5L d'eau</h4>
                <p class="text-[10px] text-slate-500">Santé & Hydratation</p>
              </div>
            </div>
            <span class="text-[10px] font-bold text-emerald-400">🔥 14 j</span>
          </div>

          <!-- Habit 2 (Completed) -->
          <div class="habit-row p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between transition cursor-pointer" data-completed="true">
            <div class="flex items-center gap-3">
              <div class="habit-check-btn w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs shadow">
                ✓
              </div>
              <div>
                <h4 class="text-xs font-bold text-slate-300 line-through">Méditation & Respiration (10 min)</h4>
                <p class="text-[10px] text-slate-500">Bien-être mental</p>
              </div>
            </div>
            <span class="text-[10px] font-bold text-emerald-400">🔥 9 j</span>
          </div>

          <!-- Habit 3 (Completed) -->
          <div class="habit-row p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between transition cursor-pointer" data-completed="true">
            <div class="flex items-center gap-3">
              <div class="habit-check-btn w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs shadow">
                ✓
              </div>
              <div>
                <h4 class="text-xs font-bold text-slate-300 line-through">Deep Work sans distraction (90 min)</h4>
                <p class="text-[10px] text-slate-500">Focus Productif</p>
              </div>
            </div>
            <span class="text-[10px] font-bold text-emerald-400">🔥 21 j</span>
          </div>

          <!-- Habit 4 (Pending) -->
          <div class="habit-row p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex items-center justify-between transition cursor-pointer" data-completed="false">
            <div class="flex items-center gap-3">
              <div class="habit-check-btn w-6 h-6 rounded-lg border-2 border-slate-700 bg-transparent flex items-center justify-center font-black text-xs">
              </div>
              <div>
                <h4 class="text-xs font-bold text-white">Lecture 20 pages de livre</h4>
                <p class="text-[10px] text-slate-400">Développement personnel</p>
              </div>
            </div>
            <span class="text-[10px] font-bold text-slate-500">🔥 5 j</span>
          </div>

        </div>
      </div>

    </main>

    <!-- Bottom Navigation -->
    <nav class="h-16 border-t border-slate-800 bg-slate-900/95 px-6 flex items-center justify-around z-10">
      <button class="flex flex-col items-center gap-1 text-emerald-400">
        <i data-lucide="check-circle-2" class="w-5 h-5"></i>
        <span class="text-[10px] font-bold">Habitudes</span>
      </button>
      <button class="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200">
        <i data-lucide="timer" class="w-5 h-5"></i>
        <span class="text-[10px] font-semibold">Minuteur</span>
      </button>
      <button class="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200">
        <i data-lucide="bar-chart-3" class="w-5 h-5"></i>
        <span class="text-[10px] font-semibold">Stats</span>
      </button>
    </nav>

    <!-- Modal: Add Habit -->
    <div id="modal-habit" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 hidden">
      <div class="max-w-md w-full bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl relative">
        <button id="btn-close-habit-modal" class="absolute top-4 right-4 text-slate-400 hover:text-white">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
        <h3 class="text-sm font-bold text-white mb-3">Nouvelle habitude</h3>
        <input type="text" id="input-habit-title" placeholder="ex: Séance d'étirements du soir..." class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 mb-4">
        <button id="btn-create-habit" class="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition">
          Ajouter la routine
        </button>
      </div>
    </div>

  </div>

  <script>
    let timerRunning = false;
    let timerSeconds = 25 * 60;
    let timerInterval = null;

    const timerDisplay = document.getElementById('timer-display');
    const btnToggle = document.getElementById('btn-timer-toggle');
    const btnReset = document.getElementById('btn-timer-reset');
    const timerBtnLabel = document.getElementById('timer-btn-label');
    const modalHabit = document.getElementById('modal-habit');
    const btnOpenHabit = document.getElementById('btn-open-habit-modal');
    const btnCloseHabit = document.getElementById('btn-close-habit-modal');
    const btnCreateHabit = document.getElementById('btn-create-habit');
    const habitTitleInput = document.getElementById('input-habit-title');

    btnOpenHabit.addEventListener('click', () => modalHabit.classList.remove('hidden'));
    btnCloseHabit.addEventListener('click', () => modalHabit.classList.add('hidden'));

    btnCreateHabit.addEventListener('click', () => {
      const val = habitTitleInput.value.trim();
      if (val) {
        alert('Nouvelle habitude "' + val + '" ajoutée !');
        modalHabit.classList.add('hidden');
        habitTitleInput.value = '';
      }
    });

    btnToggle.addEventListener('click', () => {
      if (timerRunning) {
        clearInterval(timerInterval);
        timerRunning = false;
        timerBtnLabel.textContent = 'Reprendre';
      } else {
        timerRunning = true;
        timerBtnLabel.textContent = 'Pause';
        timerInterval = setInterval(() => {
          if (timerSeconds > 0) {
            timerSeconds--;
            updateTimerDisplay();
          } else {
            clearInterval(timerInterval);
            timerRunning = false;
            alert('Session Pomodoro terminée ! Bravo 🎉');
            timerSeconds = 25 * 60;
            updateTimerDisplay();
          }
        }, 1000);
      }
    });

    btnReset.addEventListener('click', () => {
      clearInterval(timerInterval);
      timerRunning = false;
      timerSeconds = 25 * 60;
      timerBtnLabel.textContent = 'Démarrer';
      updateTimerDisplay();
    });

    function updateTimerDisplay() {
      const m = Math.floor(timerSeconds / 60);
      const s = timerSeconds % 60;
      timerDisplay.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    document.querySelectorAll('.habit-row').forEach(row => {
      row.addEventListener('click', () => {
        const isComp = row.dataset.completed === 'true';
        const checkBtn = row.querySelector('.habit-check-btn');
        const title = row.querySelector('h4');
        if (isComp) {
          row.dataset.completed = 'false';
          checkBtn.className = 'habit-check-btn w-6 h-6 rounded-lg border-2 border-slate-700 bg-transparent flex items-center justify-center font-black text-xs';
          checkBtn.textContent = '';
          title.className = 'text-xs font-bold text-white';
        } else {
          row.dataset.completed = 'true';
          checkBtn.className = 'habit-check-btn w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs shadow';
          checkBtn.textContent = '✓';
          title.className = 'text-xs font-bold text-slate-300 line-through';
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
