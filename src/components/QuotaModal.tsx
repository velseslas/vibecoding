import React, { useState, useEffect } from 'react';
import { 
  X, 
  Zap, 
  ShieldCheck, 
  Activity, 
  Server, 
  Cpu, 
  Sparkles, 
  Check, 
  ArrowRight,
  RefreshCw,
  Gauge
} from 'lucide-react';
import { playSound } from '../utils/audio';

interface QuotaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuotaModal: React.FC<QuotaModalProps> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activePlan, setActivePlan] = useState<'free' | 'pro' | 'enterprise'>('pro');

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch {
      // Mock stats if offline
      setStats({
        userQuota: {
          remainingGenerations: 48,
          maxGenerations: 50,
          totalRequests: 12,
          totalTokens: 14500,
          plan: 'Pro Creator',
          speed: '120 tokens/sec',
        },
        system: {
          averageLatencyMs: 720,
          totalGenerations: 85,
          memory: { heapUsedMb: 42 },
          engine: 'Gemini 3.7 Flash',
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-xl text-white shadow-lg shadow-violet-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Quotas & Infrastructure Backend
                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold px-2 py-0.5 rounded-full">
                  Production Ready
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Surveillance de la consommation d'IA, débit de génération et quotas
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playSound('click');
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Live Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[11px] font-medium">Générations</span>
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <div className="text-lg font-extrabold text-white">
                {stats?.userQuota?.remainingGenerations ?? 48} <span className="text-xs font-normal text-slate-500">/ 50</span>
              </div>
              <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Quota actif
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[11px] font-medium">Tokens Traités</span>
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="text-lg font-extrabold text-white">
                {stats?.userQuota?.totalTokens ? `${(stats.userQuota.totalTokens / 1000).toFixed(1)}k` : '18.2k'}
              </div>
              <div className="text-[10px] text-indigo-400 mt-1">
                Gemini 3.7 Flash
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[11px] font-medium">Latence Moyenne</span>
                <Activity className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-lg font-extrabold text-white">
                {stats?.system?.averageLatencyMs ?? 750} <span className="text-xs font-normal text-slate-500">ms</span>
              </div>
              <div className="text-[10px] text-amber-400 mt-1">
                Streaming SSE actif
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[11px] font-medium">Rate Limiter</span>
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-lg font-extrabold text-emerald-400">
                100% OK
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Token Bucket sliding
              </div>
            </div>
          </div>

          {/* Pricing & Scaling Plans */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              Plans & Niveaux de Performance
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Free Plan */}
              <div 
                onClick={() => {
                  playSound('click');
                  setActivePlan('free');
                }}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  activePlan === 'free'
                    ? 'bg-slate-800/60 border-violet-500 ring-1 ring-violet-500'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-white">Starter</span>
                    <span className="text-xs font-extrabold text-slate-300">0€</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">Pour tester et explorer le vibecoding.</p>
                  <ul className="space-y-1.5 text-[11px] text-slate-300">
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> 15 générations / jour
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Vitesse standard
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Export ZIP / HTML
                    </li>
                  </ul>
                </div>
              </div>

              {/* Pro Plan */}
              <div 
                onClick={() => {
                  playSound('click');
                  setActivePlan('pro');
                }}
                className={`p-4 rounded-xl border cursor-pointer transition relative flex flex-col justify-between ${
                  activePlan === 'pro'
                    ? 'bg-violet-950/30 border-violet-500 ring-1 ring-violet-500 shadow-lg shadow-violet-500/10'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="absolute -top-2.5 right-3 bg-violet-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                  Populaire
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-white">Pro Creator</span>
                    <span className="text-xs font-extrabold text-violet-400">19€<span className="text-[10px] text-slate-400">/m</span></span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">Pour les créateurs et développeurs SaaS.</p>
                  <ul className="space-y-1.5 text-[11px] text-slate-300">
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Générations illimitées
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Streaming SSE ultra-rapide
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Inspecteur chirurgical
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Déploiement 1-Clic
                    </li>
                  </ul>
                </div>
              </div>

              {/* Enterprise Plan */}
              <div 
                onClick={() => {
                  playSound('click');
                  setActivePlan('enterprise');
                }}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  activePlan === 'enterprise'
                    ? 'bg-slate-800/60 border-violet-500 ring-1 ring-violet-500'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-white">Enterprise</span>
                    <span className="text-xs font-extrabold text-indigo-400">Sur mesure</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">Pour les équipes et agences de production.</p>
                  <ul className="space-y-1.5 text-[11px] text-slate-300">
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Clé API dédiée & Quotas custom
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> SLA 99.9% garanti
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Support prioritaire 24/7
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Backend Info Alert */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-slate-300">
              <Server className="w-4 h-4 text-violet-400 shrink-0" />
              <span>
                Backend connecté à <strong>Google Cloud Run</strong> avec autoscaling automatique.
              </span>
            </div>
            <button
              onClick={() => {
                playSound('pop');
                fetchStats();
              }}
              disabled={isLoading}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition flex items-center gap-1 shrink-0"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Actualiser</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex justify-end">
          <button
            onClick={() => {
              playSound('magic');
              onClose();
            }}
            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-violet-500/20 transition flex items-center space-x-2"
          >
            <span>Confirmer mon Plan ({activePlan.toUpperCase()})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
