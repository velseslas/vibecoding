import React, { useState, useEffect } from 'react';
import { History, RotateCcw, Clock, Sparkles, Check, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { AppIteration } from '../types';
import { playSound } from '../utils/audio';
import { productApi } from '../services/api';

interface HistoryTimelineProps {
  projectId: string;
  iterations: AppIteration[];
  currentIterationId?: string;
  onRestoreIteration: (iteration: AppIteration) => void;
}

export const HistoryTimeline: React.FC<HistoryTimelineProps> = ({
  projectId,
  iterations,
  currentIterationId,
  onRestoreIteration,
}) => {
  const [serverVersions, setServerVersions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchVersions = async () => {
    try {
      setIsLoading(true);
      const res = await productApi.getVersions(projectId);
      if (res.success && res.versions) {
        setServerVersions(res.versions);
      }
    } catch (e) {
      console.warn('Failed to load server versions, using local iterations', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [projectId, iterations.length]);

  return (
    <div className="flex-1 bg-slate-950 p-6 overflow-y-auto select-none">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 text-violet-400 font-bold text-xs uppercase tracking-wider mb-1">
              <History className="w-4 h-4" />
              <span>Historique & Rollback</span>
            </div>
            <h2 className="text-xl font-extrabold text-white">Versions de votre Application</h2>
            <p className="text-slate-400 text-xs mt-1">
              Chaque prompt génère une version immuable. Vous pouvez revenir en arrière à tout moment sans perte d'historique.
            </p>
          </div>

          <button
            onClick={fetchVersions}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition shadow-sm"
            title="Rafraîchir les versions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="relative border-l-2 border-slate-900 ml-4 space-y-6">
          {iterations.map((iter, idx) => {
            const isCurrent = iter.id === currentIterationId || (idx === iterations.length - 1 && !currentIterationId);

            return (
              <div key={iter.id} className="relative pl-6">
                {/* Node circle */}
                <div
                  className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 transition ${
                    isCurrent
                      ? 'bg-violet-600 border-violet-300 ring-4 ring-violet-500/25'
                      : 'bg-slate-900 border-slate-700'
                  }`}
                />

                <div
                  className={`p-4 rounded-2xl transition ${
                    isCurrent
                      ? 'bg-slate-900/95 shadow-xl shadow-violet-600/10'
                      : 'bg-slate-900/60 hover:bg-slate-900/80 shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white">
                        Version #{iter.versionNumber || (iterations.length - idx)}
                      </span>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-violet-600 text-white text-[10px] font-bold uppercase tracking-wider">
                          Actuelle
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(iter.timestamp).toLocaleTimeString()}</span>
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-violet-300 mb-1">
                    "{iter.prompt}"
                  </p>
                  <p className="text-xs text-slate-400 mb-4">
                    {iter.summary || 'Itération générée par IA'}
                  </p>

                  {!isCurrent && (
                    <button
                      onClick={() => {
                        playSound('magic');
                        onRestoreIteration(iter);
                      }}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-violet-600 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Revenir à cette version</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
