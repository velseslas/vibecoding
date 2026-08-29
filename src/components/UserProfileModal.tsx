import React, { useState, useEffect } from 'react';
import { 
  User, 
  ShieldCheck, 
  Sparkles, 
  Key, 
  Zap, 
  Database, 
  Check, 
  X, 
  LogOut, 
  CreditCard,
  Lock,
  Download,
  CheckCircle2,
  Sliders,
  Settings,
  Mail,
  Building,
  Bell,
  Cpu,
  RefreshCw,
  AlertTriangle,
  Server,
  Activity
} from 'lucide-react';
import { playSound } from '../utils/audio';
import { productApi } from '../services/api';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  initialTab?: 'profile' | 'billing' | 'ai_settings' | 'preferences';
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userEmail = 'noubaschool@gmail.com',
  initialTab = 'profile',
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'billing' | 'ai_settings' | 'preferences'>(initialTab);
  const [emailInput, setEmailInput] = useState(userEmail);
  const [nameInput, setNameInput] = useState('Nouba Creator');
  const [companyInput, setCompanyInput] = useState('Studio Digital');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'starter' | 'enterprise'>('pro');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);

  // AI Providers State
  const [providers, setProviders] = useState<any[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [savingProviderId, setSavingProviderId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      loadProviders();
    }
  }, [isOpen, initialTab]);

  const loadProviders = async () => {
    setIsLoadingProviders(true);
    try {
      const data = await productApi.getAIProviders();
      if (data.success && data.providers) {
        setProviders(data.providers);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingProviders(false);
    }
  };

  const handleTestConnection = async (providerId: string) => {
    playSound('pop');
    setTestingProviderId(providerId);
    try {
      const data = await productApi.testAIProviderConnection(providerId);
      const res = data.result || data;
      setTestResults((prev) => ({ ...prev, [providerId]: res }));
      if (res.success) {
        playSound('success');
      } else {
        playSound('error');
      }
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [providerId]: {
          success: false,
          status: 'PROVIDER_ERROR',
          statusLabel: 'Erreur fournisseur',
          message: err.message || 'Impossible de contacter le serveur.',
          latencyMs: 0,
        },
      }));
      playSound('error');
    } finally {
      setTestingProviderId(null);
    }
  };

  const handleUpdateProvider = async (providerId: string, updates: Record<string, any>) => {
    setSavingProviderId(providerId);
    try {
      await productApi.updateAIProviderConfig(providerId, updates);
      setProviders((prev) =>
        prev.map((p) => (p.id === providerId ? { ...p, ...updates } : p))
      );
      playSound('click');
    } catch {
      // Error
    } finally {
      setSavingProviderId(null);
    }
  };

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    playSound('success');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSelectPlan = (plan: 'starter' | 'pro' | 'enterprise') => {
    playSound('magic');
    setSelectedPlan(plan);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-800/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Simple Header */}
        <div className="p-5 border-b border-slate-800/60 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-600/20 text-white font-bold text-lg">
              {nameInput.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Espace Compte</h2>
              <p className="text-xs text-slate-400">Gérez votre profil, abonnement et préférences</p>
            </div>
          </div>
          <button
            onClick={() => {
              playSound('click');
              onClose();
            }}
            className="p-2 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lovable-style simple pills nav */}
        <div className="flex px-6 pt-4 pb-1 space-x-2 bg-slate-900 border-b border-slate-800/40 overflow-x-auto">
          <button
            onClick={() => {
              playSound('click');
              setActiveTab('profile');
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-2xl flex items-center space-x-2 transition shrink-0 ${
              activeTab === 'profile'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profil</span>
          </button>
          
          <button
            onClick={() => {
              playSound('click');
              setActiveTab('billing');
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-2xl flex items-center space-x-2 transition shrink-0 ${
              activeTab === 'billing'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Abonnement & Plan</span>
          </button>

          <button
            onClick={() => {
              playSound('click');
              setActiveTab('ai_settings');
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-2xl flex items-center space-x-2 transition shrink-0 ${
              activeTab === 'ai_settings'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-300" />
            <span>IA & Fournisseurs</span>
          </button>

          <button
            onClick={() => {
              playSound('click');
              setActiveTab('preferences');
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-2xl flex items-center space-x-2 transition shrink-0 ${
              activeTab === 'preferences'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Préférences</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-300">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="bg-slate-950/60 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Compte Vérifié</div>
                    <div className="text-[11px] text-slate-400">Accès créateur complet & projets illimités</div>
                  </div>
                </div>
                <span className="px-3 py-1 bg-violet-600/20 text-violet-300 rounded-2xl text-xs font-bold">
                  Plan Pro
                </span>
              </div>

              {/* Edit form */}
              <form onSubmit={handleSave} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Nom complet</label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full bg-slate-950/80 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Adresse Email</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-slate-950/80 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Organisation ou Studio</label>
                  <input
                    type="text"
                    value={companyInput}
                    onChange={(e) => setCompanyInput(e.target.value)}
                    className="w-full bg-slate-950/80 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-emerald-400 flex items-center space-x-1.5">
                    {savedSuccess && (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Modifications enregistrées</span>
                      </>
                    )}
                  </span>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-violet-600/20 transition"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Starter */}
                <div 
                  onClick={() => handleSelectPlan('starter')}
                  className={`p-4 rounded-3xl cursor-pointer transition flex flex-col justify-between ${
                    selectedPlan === 'starter'
                      ? 'bg-slate-800/80 ring-2 ring-violet-500'
                      : 'bg-slate-950/60 hover:bg-slate-850/60'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Starter</div>
                    <div className="text-2xl font-extrabold text-white mt-1">Gratuit</div>
                    <p className="text-[11px] text-slate-400 mt-2">Pour débuter</p>
                    <ul className="mt-3 space-y-1.5 text-[11px] text-slate-300">
                      <li className="flex items-center space-x-1.5"><Check className="w-3 h-3 text-emerald-400" /><span>15 prompts / jour</span></li>
                      <li className="flex items-center space-x-1.5"><Check className="w-3 h-3 text-emerald-400" /><span>3 projets actifs</span></li>
                    </ul>
                  </div>
                  <button className="mt-4 w-full py-2 bg-slate-900 text-slate-300 text-xs font-semibold rounded-2xl">
                    {selectedPlan === 'starter' ? 'Sélectionné' : 'Choisir'}
                  </button>
                </div>

                {/* Pro */}
                <div 
                  onClick={() => handleSelectPlan('pro')}
                  className={`p-4 rounded-3xl cursor-pointer transition relative flex flex-col justify-between ${
                    selectedPlan === 'pro'
                      ? 'bg-violet-950/50 ring-2 ring-violet-500 shadow-lg shadow-violet-500/10'
                      : 'bg-slate-950/60 hover:bg-slate-850/60'
                  }`}
                >
                  <span className="absolute -top-2.5 right-4 px-2 py-0.5 bg-violet-600 text-white text-[9px] font-bold rounded-full uppercase tracking-wider">
                    Actif
                  </span>
                  <div>
                    <div className="text-xs font-bold text-violet-400 uppercase">Pro Creator</div>
                    <div className="text-2xl font-extrabold text-white mt-1">19 € <span className="text-xs font-normal text-slate-400">/m</span></div>
                    <p className="text-[11px] text-slate-400 mt-2">Pour créateurs réguliers</p>
                    <ul className="mt-3 space-y-1.5 text-[11px] text-slate-200">
                      <li className="flex items-center space-x-1.5"><Check className="w-3 h-3 text-violet-400" /><span>Générations illimitées</span></li>
                      <li className="flex items-center space-x-1.5"><Check className="w-3 h-3 text-violet-400" /><span>Déploiement en 1 clic</span></li>
                      <li className="flex items-center space-x-1.5"><Check className="w-3 h-3 text-violet-400" /><span>Projets illimités</span></li>
                    </ul>
                  </div>
                  <button className="mt-4 w-full py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-2xl shadow-md transition">
                    Plan Actif
                  </button>
                </div>

                {/* Enterprise */}
                <div 
                  onClick={() => handleSelectPlan('enterprise')}
                  className={`p-4 rounded-3xl cursor-pointer transition flex flex-col justify-between ${
                    selectedPlan === 'enterprise'
                      ? 'bg-slate-800/80 ring-2 ring-violet-500'
                      : 'bg-slate-950/60 hover:bg-slate-850/60'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Enterprise</div>
                    <div className="text-2xl font-extrabold text-white mt-1">99 € <span className="text-xs font-normal text-slate-400">/m</span></div>
                    <p className="text-[11px] text-slate-400 mt-2">Équipes & Agences</p>
                    <ul className="mt-3 space-y-1.5 text-[11px] text-slate-300">
                      <li className="flex items-center space-x-1.5"><Check className="w-3 h-3 text-emerald-400" /><span>Multi-utilisateurs</span></li>
                      <li className="flex items-center space-x-1.5"><Check className="w-3 h-3 text-emerald-400" /><span>Support prioritaire</span></li>
                    </ul>
                  </div>
                  <button className="mt-4 w-full py-2 bg-slate-900 text-slate-300 text-xs font-semibold rounded-2xl">
                    {selectedPlan === 'enterprise' ? 'Sélectionné' : 'Passer au plan'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai_settings' && (
            <div className="space-y-4">
              <div className="bg-slate-950/60 p-3.5 rounded-2xl flex items-center justify-between border border-slate-800/60">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      Fournisseurs d'IA & Moteurs Actifs
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                        Multi-Provider Live
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Orchestration dynamique, failover résilient et observabilité par tâche
                    </div>
                  </div>
                </div>
                <button
                  onClick={loadProviders}
                  disabled={isLoadingProviders}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
                  title="Rafraîchir les statuts"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingProviders ? 'animate-spin text-violet-400' : ''}`} />
                </button>
              </div>

              {/* Providers List */}
              <div className="space-y-3.5">
                {providers.map((p) => {
                  const testRes = testResults[p.id];
                  const isTesting = testingProviderId === p.id;
                  const isSaving = savingProviderId === p.id;

                  return (
                    <div 
                      key={p.id}
                      className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-3.5 hover:border-slate-700/80 transition"
                    >
                      {/* Provider Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2.5 rounded-xl text-white font-bold text-xs shadow-md ${
                            p.id === 'oxalpha'
                              ? 'bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-cyan-500/20'
                              : p.id === 'gemini'
                              ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-violet-500/20'
                              : 'bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-emerald-500/20'
                          }`}>
                            <Cpu className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="text-sm font-bold text-white">{p.name}</h3>
                              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                                {p.type}
                              </span>
                              {p.configured ? (
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Configurée
                                </span>
                              ) : (
                                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Non configurée
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{p.role}</p>
                          </div>
                        </div>

                        {/* Enable/Disable Toggle */}
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] text-slate-400">
                            {p.enabled ? 'Activé' : 'Désactivé'}
                          </span>
                          <button
                            onClick={() => handleUpdateProvider(p.id, { enabled: !p.enabled })}
                            disabled={isSaving}
                            className={`w-10 h-5.5 rounded-full transition-colors relative p-0.5 ${
                              p.enabled ? 'bg-violet-600' : 'bg-slate-800'
                            }`}
                          >
                            <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${p.enabled ? 'translate-x-4.5' : 'translate-x-0'}`} />
                          </button>
                        </div>
                      </div>

                      {/* Technical & Operational Specs */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/60">
                          <span className="text-[10px] text-slate-400 block mb-1">Clé API (Secret)</span>
                          <div className="font-mono text-slate-300 flex items-center gap-1.5 text-[11px]">
                            <Lock className="w-3 h-3 text-slate-500" />
                            <span>••••••••••••</span>
                          </div>
                        </div>

                        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/60">
                          <span className="text-[10px] text-slate-400 block mb-1">Modèle</span>
                          <span className="font-mono text-white text-[11px] font-semibold truncate block">
                            {p.model}
                          </span>
                        </div>

                        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/60">
                          <span className="text-[10px] text-slate-400 block mb-1">Circuit Breaker</span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            p.circuitState === 'CLOSED'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : p.circuitState === 'HALF_OPEN'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {p.circuitState || 'CLOSED'}
                          </span>
                        </div>

                        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/60">
                          <span className="text-[10px] text-slate-400 block mb-1">Taux Succès</span>
                          <span className="font-semibold text-emerald-400 text-[11px]">
                            {Math.round((p.successRate || 1) * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Configurable Parameters Bar */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/40 text-xs">
                        <div className="flex items-center justify-between sm:justify-start sm:space-x-2">
                          <span className="text-slate-400 text-[11px]">Priorité :</span>
                          <select
                            value={p.priority}
                            onChange={(e) => handleUpdateProvider(p.id, { priority: Number(e.target.value) })}
                            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:ring-1 focus:ring-violet-500"
                          >
                            <option value={1}>1 (Priorité Haute)</option>
                            <option value={2}>2 (Standard)</option>
                            <option value={3}>3 (Fallback)</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between sm:justify-start sm:space-x-2">
                          <span className="text-slate-400 text-[11px]">Température :</span>
                          <span className="font-mono text-white text-xs">{p.temperature ?? 0.2}</span>
                        </div>

                        <div className="flex items-center justify-between sm:justify-start sm:space-x-2">
                          <span className="text-slate-400 text-[11px]">Timeout :</span>
                          <span className="font-mono text-slate-300 text-xs">{p.timeout || 15000} ms</span>
                        </div>
                      </div>

                      {/* Info & Fallback Metadata */}
                      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 px-1 gap-2">
                        <div className="flex items-center gap-3">
                          <span>Fallback : <strong className="text-slate-300">{p.fallback || 'local_engine'}</strong></span>
                          <span>Coût : <strong className="text-slate-300">{p.estimatedCost || 'Inclus'}</strong></span>
                        </div>

                        {/* Test Connection Button */}
                        <button
                          onClick={() => handleTestConnection(p.id)}
                          disabled={isTesting}
                          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-xl font-medium text-xs flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-50"
                        >
                          <Activity className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-indigo-400' : ''}`} />
                          <span>{isTesting ? 'Test en cours...' : 'Tester la connexion'}</span>
                        </button>
                      </div>

                      {/* Connection Test Result Feedback Banner */}
                      {testRes && (
                        <div className={`p-3 rounded-xl border text-xs flex items-start space-x-2.5 animate-fadeIn ${
                          testRes.success
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                            : testRes.status === 'AUTH_INVALID' || testRes.status === 'PROVIDER_ERROR'
                            ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                            : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                        }`}>
                          {testRes.success ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-bold flex items-center justify-between">
                              <span>{testRes.statusLabel || (testRes.success ? 'Connexion réussie' : 'Erreur')}</span>
                              {testRes.latencyMs > 0 && (
                                <span className="font-mono text-[10px] opacity-80">{testRes.latencyMs} ms</span>
                              )}
                            </div>
                            <p className="text-[11px] opacity-90 mt-0.5">{testRes.message}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-3">
              <div className="bg-slate-950/60 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Sauvegarde Automatique</div>
                  <div className="text-[11px] text-slate-400">Enregistre l'état du projet dans le navigateur</div>
                </div>
                <button
                  onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    autoSaveEnabled ? 'bg-violet-600' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${autoSaveEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Effets Sonores & Feedback</div>
                  <div className="text-[11px] text-slate-400">Micro-sons d'interaction lors des générations</div>
                </div>
                <button
                  onClick={() => setSoundEffectsEnabled(!soundEffectsEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    soundEffectsEnabled ? 'bg-violet-600' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${soundEffectsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-950/60 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Session sécurisée</span>
          </div>
          <button
            onClick={() => {
              playSound('click');
              onClose();
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-2xl transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
