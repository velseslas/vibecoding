import React, { useState } from 'react';
import { 
  FileCode2, 
  Database, 
  Zap, 
  Workflow, 
  ChevronRight, 
  ChevronDown, 
  Layers, 
  Cpu, 
  CheckCircle2, 
  Boxes, 
  ShieldCheck, 
  Minimize2, 
  Maximize2,
  X
} from 'lucide-react';
import { VibeProject, ChatMessage } from '../types';

interface TechnicalPlanPanelProps {
  project: VibeProject;
  latestMessage?: ChatMessage;
  isOpen: boolean;
  onClose: () => void;
}

export const TechnicalPlanPanel: React.FC<TechnicalPlanPanelProps> = ({
  project,
  latestMessage,
  isOpen,
  onClose,
}) => {
  const [collapsedSections, setCollapsedSections] = useState<{ [key: string]: boolean }>({});
  const [isExpandedFull, setIsExpandedFull] = useState(false);

  if (!isOpen) return null;

  const plan = latestMessage?.technicalPlan || project.technicalPlan;

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Helper to extract or fallback structure
  const rawPlan = plan?.rawPlan;
  const filesStructure = plan?.files || plan?.structure || project.files.map((f) => ({
    name: f.name,
    role: f.name === 'index.html' 
      ? 'Structure sémantique & injection des CDNs (Tailwind, Lucide)' 
      : f.name.endsWith('.css') 
      ? 'Styles & animations complémentaires' 
      : f.name === 'app.js' 
      ? 'Contrôleur principal & écouteurs d\'événements' 
      : 'Module logique & composants',
    type: f.type,
  }));

  const dataModels = plan?.dataModel || plan?.dataModels || plan?.states || [
    { name: 'AppStore', fields: ['items', 'activeFilter', 'theme', 'userSession'], description: 'État réactif stocké en mémoire et synchronisé avec LocalStorage' },
    { name: 'UIState', fields: ['isModalOpen', 'selectedItemId', 'isLoading'], description: 'États dynamiques de l\'interface' },
  ];

  const interactions = plan?.interactions || plan?.events || [
    { trigger: 'Boutons d\'action & formulaires', outcome: 'Mise à jour d\'état réactive et re-rendu immédiat du DOM' },
    { trigger: 'Modales & Panneaux latéraux', outcome: 'Gestion propre de l\'ouverture / fermeture et accessibilité aria' },
    { trigger: 'Persistance', outcome: 'Sauvegarde automatique des données utilisateur' },
  ];

  const dependencies = plan?.dependencies || [
    'Tailwind CSS CDN (Styling moderne & responsive)',
    'Lucide Icons (Iconographie vectorielle)',
    'LocalStorage API (Persistance locale)',
  ];

  return (
    <aside
      className={`bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0 transition-all duration-300 select-none z-20 shadow-xl shadow-black/40 ${
        isExpandedFull ? 'w-full md:w-[480px]' : 'w-full md:w-80 lg:w-96'
      }`}
    >
      {/* Panel Header */}
      <div className="h-12 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center space-x-1.5">
              <span>Plan Technique (Mode Expert)</span>
              <span className="px-1.5 py-0.5 rounded-md bg-amber-400/10 text-amber-300 text-[10px] font-semibold">
                Pass 1 & 2
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
              Architecture validée par l'IA
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsExpandedFull((prev) => !prev)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title={isExpandedFull ? 'Réduire' : 'Agrandir le volet'}
          >
            {isExpandedFull ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
            title="Fermer le volet"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Pass 1 Status Badge */}
        <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-2xl flex items-start space-x-3">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-amber-200 text-xs">Plan Architectural Approuvé</div>
            <div className="text-[11px] text-amber-300/80 leading-relaxed">
              Ce plan a été généré lors de la Passe 1 d'ingénierie et appliqué à la lettre lors de la Passe 2 de synthèse de code.
            </div>
          </div>
        </div>

        {/* Section 1: Structure & Rôles des Fichiers */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl overflow-hidden">
          <button
            onClick={() => toggleSection('files')}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left font-semibold text-slate-200 hover:bg-slate-800/40 transition"
          >
            <div className="flex items-center space-x-2">
              <FileCode2 className="w-4 h-4 text-violet-400" />
              <span>Structure & Rôle des Fichiers</span>
            </div>
            {collapsedSections['files'] ? (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {!collapsedSections['files'] && (
            <div className="p-3 pt-1 border-t border-slate-800/60 space-y-2">
              {Array.isArray(filesStructure) ? (
                filesStructure.map((file: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-violet-300 font-medium text-[11px]">
                        {file.name || file.filename}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                        {file.type || (file.name?.endsWith('.css') ? 'CSS' : file.name?.endsWith('.html') ? 'HTML' : 'JS')}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {file.role || file.description || file.purpose || 'Module de l\'application'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-slate-400 text-xs">
                  {typeof filesStructure === 'string' ? filesStructure : JSON.stringify(filesStructure, null, 2)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Modèle de Données & États */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl overflow-hidden">
          <button
            onClick={() => toggleSection('data')}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left font-semibold text-slate-200 hover:bg-slate-800/40 transition"
          >
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Modèle de Données & États</span>
            </div>
            {collapsedSections['data'] ? (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {!collapsedSections['data'] && (
            <div className="p-3 pt-1 border-t border-slate-800/60 space-y-2">
              {Array.isArray(dataModels) ? (
                dataModels.map((model: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1.5"
                  >
                    <div className="flex items-center space-x-2">
                      <Boxes className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-semibold text-white text-[11px]">
                        {model.name || `Entité #${idx + 1}`}
                      </span>
                    </div>
                    {model.fields && Array.isArray(model.fields) && (
                      <div className="flex flex-wrap gap-1">
                        {model.fields.map((f: any, fIdx: number) => (
                          <span
                            key={fIdx}
                            className="px-1.5 py-0.5 rounded bg-emerald-950/50 border border-emerald-500/20 text-emerald-300 text-[10px] font-mono"
                          >
                            {typeof f === 'string' ? f : f.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {model.description && (
                      <p className="text-slate-400 text-[11px]">{model.description}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-slate-400 text-xs">
                  {typeof dataModels === 'string' ? dataModels : JSON.stringify(dataModels, null, 2)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 3: Interactions & Événements */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl overflow-hidden">
          <button
            onClick={() => toggleSection('interactions')}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left font-semibold text-slate-200 hover:bg-slate-800/40 transition"
          >
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Interactions Prévues</span>
            </div>
            {collapsedSections['interactions'] ? (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {!collapsedSections['interactions'] && (
            <div className="p-3 pt-1 border-t border-slate-800/60 space-y-2">
              {Array.isArray(interactions) ? (
                interactions.map((interaction: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1"
                  >
                    <div className="font-semibold text-slate-200 text-[11px] flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span>{interaction.trigger || interaction.name || `Interaction #${idx + 1}`}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {interaction.outcome || interaction.description || 'Action réactive utilisateur'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-slate-400 text-xs">
                  {typeof interactions === 'string' ? interactions : JSON.stringify(interactions, null, 2)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 4: Dépendances & Sécurité */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl overflow-hidden">
          <button
            onClick={() => toggleSection('deps')}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left font-semibold text-slate-200 hover:bg-slate-800/40 transition"
          >
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Dépendances & CDNs</span>
            </div>
            {collapsedSections['deps'] ? (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {!collapsedSections['deps'] && (
            <div className="p-3 pt-1 border-t border-slate-800/60 space-y-1.5">
              {dependencies.map((dep, idx) => (
                <div
                  key={idx}
                  className="px-2.5 py-1.5 bg-slate-900/90 border border-slate-800 rounded-lg text-slate-300 text-[11px] flex items-center space-x-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                  <span>{dep}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Raw JSON View if present */}
        {rawPlan && (
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Données brutes du Plan IA
            </div>
            <pre className="text-[10px] text-slate-400 font-mono overflow-x-auto whitespace-pre-wrap">
              {typeof rawPlan === 'string' ? rawPlan : JSON.stringify(rawPlan, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </aside>
  );
};
