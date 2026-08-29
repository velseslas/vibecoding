import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  FolderGit2, 
  Copy, 
  Trash2, 
  ExternalLink, 
  Clock, 
  Check, 
  Sparkles,
  CloudUpload,
  RefreshCw,
  Search
} from 'lucide-react';
import { VibeProject } from '../types';
import { playSound } from '../utils/audio';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: VibeProject | null;
  onSelectProject: (project: VibeProject) => void;
  onNewProject: () => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  onSelectProject,
  onNewProject,
}) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.projects) {
        setProjects(data.projects);
      }
    } catch {
      // Fallback to local storage list
      const savedProjects = localStorage.getItem('vibecode_saved_projects');
      if (savedProjects) {
        try {
          setProjects(JSON.parse(savedProjects));
        } catch {
          setProjects([]);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  const handleForkProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playSound('pop');
    try {
      const res = await fetch(`/api/projects/${id}/fork`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `${currentProject?.title || 'Projet'} (Cloné)` }),
      });
      const data = await res.json();
      if (data.project) {
        setStatusMessage('Projet cloné avec succès !');
        fetchProjects();
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch {
      setStatusMessage('Erreur lors du clonage.');
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Voulez-vous vraiment supprimer ce projet ?')) {
      playSound('pop');
      try {
        await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        setProjects((prev) => prev.filter((p) => p.id !== id));
      } catch {
        // Fallback
      }
    }
  };

  const handleSaveCurrentToCloud = async () => {
    if (!currentProject) return;
    playSound('success');
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentProject),
      });
      setStatusMessage('✅ Projet synchronisé sur le Cloud !');
      fetchProjects();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      setStatusMessage('Erreur de synchronisation.');
    }
  };

  if (!isOpen) return null;

  const filteredProjects = projects.filter((p) =>
    (p.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-xl text-white shadow-lg shadow-violet-500/20">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Mes Projets VibeCode
                <span className="text-[10px] bg-violet-950 text-violet-300 font-semibold px-2 py-0.5 rounded-full border border-violet-800/40">
                  {projects.length} projet{projects.length > 1 ? 's' : ''}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Gérez vos espaces de travail, clonez et synchronisez vos applications
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSaveCurrentToCloud}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5"
              title="Sauvegarder le projet actif sur le serveur"
            >
              <CloudUpload className="w-3.5 h-3.5 text-violet-400" />
              <span className="hidden sm:inline">Sauvegarder Projet Actuel</span>
            </button>

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
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher un projet par titre ou description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                playSound('pop');
                fetchProjects();
              }}
              disabled={isLoading}
              className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl transition"
              title="Actualiser la liste"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => {
                playSound('pop');
                onNewProject();
                onClose();
              }}
              className="px-3.5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-violet-600/20 transition flex items-center space-x-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Projet</span>
            </button>
          </div>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div className="px-4 py-2 bg-violet-950/70 border-b border-violet-800 text-xs text-violet-300 flex items-center justify-center animate-fadeIn">
            {statusMessage}
          </div>
        )}

        {/* Project Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FolderGit2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Aucun projet trouvé</p>
              <p className="text-xs text-slate-600 mt-1">Créez votre première application avec le bouton ci-dessus.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProjects.map((proj) => {
                const isCurrent = currentProject?.id === proj.id;
                return (
                  <div
                    key={proj.id}
                    onClick={() => {
                      playSound('click');
                      onSelectProject(proj);
                      onClose();
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition relative group ${
                      isCurrent
                        ? 'bg-violet-950/20 border-violet-500 ring-1 ring-violet-500/50 shadow-md'
                        : 'bg-slate-950/50 border-slate-800/90 hover:border-slate-700 hover:bg-slate-950/80'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white group-hover:text-violet-300 transition">
                            {proj.title || 'Sans titre'}
                          </h4>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(proj.updatedAt || Date.now()).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>

                      {isCurrent && (
                        <span className="px-2 py-0.5 bg-violet-600/20 border border-violet-500/40 text-violet-300 text-[10px] font-semibold rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" /> Actif
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 mb-3">
                      {proj.description || 'Application web générée avec VibeCode Studio.'}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px] text-slate-500">
                      <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-400">
                        {proj.vibe || 'modern-saas'}
                      </span>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => handleForkProject(proj.id, e)}
                          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                          title="Cloner ce projet"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {!isCurrent && (
                          <button
                            onClick={(e) => handleDeleteProject(proj.id, e)}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                            title="Supprimer ce projet"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
