import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Play, 
  Code2, 
  Layers, 
  Terminal, 
  History, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Rocket, 
  Download, 
  BookOpen, 
  Undo2, 
  Redo2, 
  FolderGit2, 
  ChevronDown, 
  Share2, 
  Zap, 
  LayoutGrid, 
  User, 
  Settings, 
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Laptop
} from 'lucide-react';
import { DeviceMode, WorkspaceTab, VibeProject } from '../types';
import { playSound } from '../utils/audio';

interface HeaderProps {
  project: VibeProject | null;
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;
  deviceMode: DeviceMode;
  setDeviceMode: (mode: DeviceMode) => void;
  onNewProject: () => void;
  onOpenTemplates: () => void;
  onOpenAcademy: () => void;
  onOpenExport: () => void;
  onOpenDeploy: () => void;
  onOpenQuota: () => void;
  onOpenProjects: () => void;
  onOpenUserModal: (initialTab?: 'profile' | 'billing' | 'ai_settings' | 'preferences') => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onReloadPreview: () => void;
  onUpdateTitle: (title: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  activeTab,
  setActiveTab,
  deviceMode,
  setDeviceMode,
  onNewProject,
  onOpenTemplates,
  onOpenAcademy,
  onOpenExport,
  onOpenDeploy,
  onOpenQuota,
  onOpenProjects,
  onOpenUserModal,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onReloadPreview,
  onUpdateTitle,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project?.title || 'Mon Projet');
  
  // Dropdown states
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const viewMenuRef = useRef<HTMLDivElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(event.target as Node)) {
        setIsViewMenuOpen(false);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setIsActionsMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (titleInput.trim()) {
      onUpdateTitle(titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const getTabLabel = (tab: WorkspaceTab) => {
    switch (tab) {
      case 'preview': return 'Aperçu Direct';
      case 'code': return 'Code Source';
      case 'structure': return 'Arbre Composants';
      case 'console': return 'Logs & Erreurs';
      case 'history': return 'Historique';
      default: return 'Aperçu';
    }
  };

  return (
    <header className="h-14 bg-slate-950/90 backdrop-blur-xl px-4 flex items-center justify-between select-none z-30 shrink-0 border-b border-slate-800/40">
      {/* Left: Brand + Project Title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => {
            playSound('click');
            onOpenProjects();
          }}
          className="flex items-center space-x-2.5 p-1 rounded-2xl hover:bg-slate-900/60 transition group text-left"
          title="Mes projets"
        >
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-600/20 group-hover:scale-105 transition-transform duration-200">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white hidden sm:inline">
            Vibe<span className="text-violet-400 font-normal">Code</span>
          </span>
        </button>

        {/* Project Selector pill */}
        <button
          onClick={() => {
            playSound('click');
            onOpenProjects();
          }}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 text-xs font-medium rounded-2xl transition"
          title="Ouvrir la liste des projets"
        >
          <FolderGit2 className="w-3.5 h-3.5 text-violet-400" />
          <span className="hidden md:inline">Projets</span>
          <ChevronDown className="w-3 h-3 text-slate-500" />
        </button>

        {/* Project Title with inline edit */}
        {project && (
          <div className="flex items-center space-x-2 pl-1">
            {isEditingTitle ? (
              <form onSubmit={handleTitleSubmit} className="flex items-center">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={() => {
                    if (titleInput.trim()) onUpdateTitle(titleInput.trim());
                    setIsEditingTitle(false);
                  }}
                  autoFocus
                  className="bg-slate-900 text-xs text-white px-2.5 py-1 rounded-xl outline-none ring-1 ring-violet-500 max-w-[160px]"
                />
              </form>
            ) : (
              <button
                onClick={() => {
                  setTitleInput(project.title);
                  setIsEditingTitle(true);
                }}
                className="text-xs font-medium text-slate-300 hover:text-white px-2.5 py-1 rounded-xl hover:bg-slate-900/60 transition max-w-[130px] sm:max-w-[200px] truncate"
                title="Cliquer pour renommer"
              >
                {project.title}
              </button>
            )}

            <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full bg-violet-950/40 text-[10px] font-medium text-violet-300">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mr-1.5" />
              {project.vibe}
            </span>
          </div>
        )}
      </div>

      {/* Center: Simplified Tab Switcher & Dropdown Mode for small screens */}
      <div className="flex items-center space-x-2">
        {/* Main 2 Tabs: Aperçu / Code */}
        <div className="flex items-center bg-slate-900/70 p-1 rounded-2xl">
          <button
            onClick={() => {
              playSound('click');
              setActiveTab('preview');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl flex items-center space-x-1.5 transition ${
              activeTab === 'preview'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Aperçu</span>
          </button>

          <button
            onClick={() => {
              playSound('click');
              setActiveTab('code');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl flex items-center space-x-1.5 transition ${
              activeTab === 'code'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Code</span>
          </button>

          {/* Dropdown for Secondary Tabs: Components, Logs, History */}
          <div className="relative" ref={viewMenuRef}>
            <button
              onClick={() => {
                playSound('click');
                setIsViewMenuOpen((prev) => !prev);
              }}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-xl flex items-center space-x-1 transition ${
                ['structure', 'console', 'history'].includes(activeTab)
                  ? 'bg-violet-950 text-violet-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Autres vues (Composants, Logs, Historique)"
            >
              <span>{['structure', 'console', 'history'].includes(activeTab) ? getTabLabel(activeTab) : 'Plus'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isViewMenuOpen && (
              <div className="absolute top-full mt-2 left-0 w-48 bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl p-1.5 z-50 border border-slate-800/80 animate-fadeIn">
                <button
                  onClick={() => {
                    playSound('click');
                    setActiveTab('structure');
                    setIsViewMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs rounded-xl transition ${
                    activeTab === 'structure' ? 'bg-violet-600/20 text-violet-300 font-semibold' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <Layers className="w-4 h-4 text-violet-400" />
                  <span>Composants</span>
                </button>

                <button
                  onClick={() => {
                    playSound('click');
                    setActiveTab('console');
                    setIsViewMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs rounded-xl transition ${
                    activeTab === 'console' ? 'bg-violet-600/20 text-violet-300 font-semibold' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Console & Logs</span>
                </button>

                <button
                  onClick={() => {
                    playSound('click');
                    setActiveTab('history');
                    setIsViewMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs rounded-xl transition ${
                    activeTab === 'history' ? 'bg-violet-600/20 text-violet-300 font-semibold' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <History className="w-4 h-4 text-indigo-400" />
                  <span>Historique</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Responsive Device Modes in clean rounded pill */}
        {activeTab === 'preview' && (
          <div className="hidden lg:flex items-center bg-slate-900/70 p-1 rounded-2xl">
            <button
              onClick={() => {
                playSound('click');
                setDeviceMode('desktop');
              }}
              className={`p-1.5 rounded-xl transition ${
                deviceMode === 'desktop' ? 'bg-slate-800 text-violet-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Bureau"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                playSound('click');
                setDeviceMode('tablet');
              }}
              className={`p-1.5 rounded-xl transition ${
                deviceMode === 'tablet' ? 'bg-slate-800 text-violet-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Tablette"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                playSound('click');
                setDeviceMode('mobile');
              }}
              className={`p-1.5 rounded-xl transition ${
                deviceMode === 'mobile' ? 'bg-slate-800 text-violet-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Mobile"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Right: Consolidated Dropdown Menu & Primary Deploy Button */}
      <div className="flex items-center space-x-2">
        {/* Undo/Redo compact pill */}
        <div className="hidden sm:flex items-center bg-slate-900/60 p-1 rounded-2xl">
          <button
            onClick={() => {
              playSound('click');
              onUndo();
            }}
            disabled={!canUndo}
            className={`p-1.5 rounded-xl transition ${
              canUndo ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Annuler"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              playSound('click');
              onRedo();
            }}
            disabled={!canRedo}
            className={`p-1.5 rounded-xl transition ${
              canRedo ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Rétablir"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dropdown Menu: "Outils" (Starters, Académie, Exporter, Quotas) */}
        <div className="relative" ref={actionsMenuRef}>
          <button
            onClick={() => {
              playSound('click');
              setIsActionsMenuOpen((prev) => !prev);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 hover:text-white text-xs font-medium rounded-2xl transition"
          >
            <span>Outils</span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          {isActionsMenuOpen && (
            <div className="absolute top-full mt-2 right-0 w-56 bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl p-1.5 z-50 border border-slate-800/80 animate-fadeIn">
              <button
                onClick={() => {
                  playSound('click');
                  setIsActionsMenuOpen(false);
                  onOpenTemplates();
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs rounded-xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition text-left"
              >
                <LayoutGrid className="w-4 h-4 text-indigo-400" />
                <div>
                  <div className="font-semibold text-white">Modèles Starters</div>
                  <div className="text-[10px] text-slate-400">Galerie de projets prêts</div>
                </div>
              </button>

              <button
                onClick={() => {
                  playSound('click');
                  setIsActionsMenuOpen(false);
                  onOpenExport();
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs rounded-xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition text-left"
              >
                <Download className="w-4 h-4 text-violet-400" />
                <div>
                  <div className="font-semibold text-white">Exporter le Code</div>
                  <div className="text-[10px] text-slate-400">Archive ZIP & HTML</div>
                </div>
              </button>

              <button
                onClick={() => {
                  playSound('click');
                  setIsActionsMenuOpen(false);
                  onOpenAcademy();
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs rounded-xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition text-left"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="font-semibold text-white">Académie & Prompts</div>
                  <div className="text-[10px] text-slate-400">Guides du vibecoding</div>
                </div>
              </button>

              <button
                onClick={() => {
                  playSound('click');
                  setIsActionsMenuOpen(false);
                  onOpenQuota();
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs rounded-xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition text-left"
              >
                <Zap className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-semibold text-white">Quotas & Infrastructure</div>
                  <div className="text-[10px] text-slate-400">Statistiques serveur</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Primary Deploy Button with smooth rounded-2xl style */}
        <button
          onClick={() => {
            playSound('deploy');
            onOpenDeploy();
          }}
          className="px-3.5 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-2xl shadow-lg shadow-violet-600/20 transition transform active:scale-95 flex items-center space-x-1.5"
        >
          <Rocket className="w-3.5 h-3.5" />
          <span>Déployer</span>
        </button>

        {/* User Profile Avatar Dropdown (Lovable-inspired) */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => {
              playSound('click');
              setIsUserMenuOpen((prev) => !prev);
            }}
            className="p-1 rounded-2xl hover:ring-2 hover:ring-violet-500/50 transition flex items-center"
            title="Espace Utilisateur"
          >
            <div className="w-7 h-7 rounded-2xl bg-gradient-to-tr from-violet-500 via-indigo-500 to-pink-500 flex items-center justify-center text-[11px] font-bold text-white shadow-md shadow-violet-500/20">
              N
            </div>
          </button>

          {isUserMenuOpen && (
            <div className="absolute top-full mt-2 right-0 w-64 bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl p-2 z-50 border border-slate-800/80 animate-fadeIn select-none">
              {/* User summary card */}
              <div className="p-3 bg-slate-950/60 rounded-xl mb-1.5 flex items-center space-x-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow">
                  N
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">Nouba Creator</div>
                  <div className="text-[11px] text-slate-400 truncate">noubaschool@gmail.com</div>
                </div>
              </div>

              {/* Menu items */}
              <button
                onClick={() => {
                  playSound('click');
                  setIsUserMenuOpen(false);
                  onOpenUserModal('profile');
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs rounded-xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition text-left"
              >
                <User className="w-4 h-4 text-violet-400" />
                <span>Mon Profil & Paramètres</span>
              </button>

              <button
                onClick={() => {
                  playSound('click');
                  setIsUserMenuOpen(false);
                  onOpenUserModal('ai_settings');
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs rounded-xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition text-left"
              >
                <Zap className="w-4 h-4 text-indigo-400" />
                <span>Paramètres IA & Fournisseurs</span>
              </button>

              <button
                onClick={() => {
                  playSound('click');
                  setIsUserMenuOpen(false);
                  onOpenUserModal('billing');
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs rounded-xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition text-left"
              >
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Abonnement & Facturation</span>
              </button>

              <button
                onClick={() => {
                  playSound('click');
                  setIsUserMenuOpen(false);
                  onOpenQuota();
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs rounded-xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition text-left"
              >
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Quotas & Métriques Infra</span>
              </button>

              <div className="h-px bg-slate-800/80 my-1" />

              <button
                onClick={() => {
                  playSound('click');
                  setIsUserMenuOpen(false);
                  onOpenUserModal();
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl text-slate-400 hover:bg-slate-800/80 hover:text-white transition text-left"
              >
                <span>Plan Actuel</span>
                <span className="px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-300 font-bold text-[10px]">
                  Pro Creator
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
