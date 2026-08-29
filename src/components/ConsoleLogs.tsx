import React, { useState } from 'react';
import { Terminal, AlertCircle, AlertTriangle, Info, Trash2, Sparkles, CheckCircle2 } from 'lucide-react';
import { playSound } from '../utils/audio';

export interface ConsoleLogItem {
  id: string;
  type: 'log' | 'warn' | 'error';
  message: string;
  timestamp: number;
}

interface ConsoleLogsProps {
  logs: ConsoleLogItem[];
  onClearLogs: () => void;
  onAutoFixError: (errorMessage: string) => void;
}

export const ConsoleLogs: React.FC<ConsoleLogsProps> = ({
  logs,
  onClearLogs,
  onAutoFixError,
}) => {
  const [filter, setFilter] = useState<'all' | 'error' | 'warn'>('all');

  const filtered = logs.filter((l) => {
    if (filter === 'all') return true;
    return l.type === filter;
  });

  return (
    <div className="flex-1 bg-slate-950 flex flex-col h-full overflow-hidden select-none font-mono text-xs">
      {/* Top filter bar */}
      <div className="h-10 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-violet-400" />
          <span className="font-bold text-white text-xs">Console & Logs d'Exécution</span>
          <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full border border-slate-800 font-sans">
            {logs.length} messages
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-[11px] font-sans">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded transition ${
                filter === 'all' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`px-2 py-0.5 rounded transition ${
                filter === 'error' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Erreurs
            </button>
            <button
              onClick={() => setFilter('warn')}
              className={`px-2 py-0.5 rounded transition ${
                filter === 'warn' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Avertissements
            </button>
          </div>

          <button
            onClick={() => {
              playSound('click');
              onClearLogs();
            }}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition"
            title="Effacer la console"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Logs List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2 select-text">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-600 font-sans space-y-2 py-12">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/60" />
            <p className="text-sm font-semibold text-slate-400">Aucune erreur détectée</p>
            <p className="text-xs text-slate-600 max-w-xs">
              Votre application s'exécute parfaitement dans le bac à sable !
            </p>
          </div>
        ) : (
          filtered.map((log) => (
            <div
              key={log.id}
              className={`p-3 rounded-xl border flex items-start justify-between space-x-3 ${
                log.type === 'error'
                  ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                  : log.type === 'warn'
                  ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-start space-x-2.5 overflow-hidden">
                {log.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                ) : log.type === 'warn' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                )}
                <div className="overflow-hidden">
                  <div className="text-[10px] text-slate-500 mb-0.5 font-sans">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                  <pre className="whitespace-pre-wrap font-mono text-xs break-all">
                    {log.message}
                  </pre>
                </div>
              </div>

              {log.type === 'error' && (
                <button
                  onClick={() => {
                    playSound('magic');
                    onAutoFixError(log.message);
                  }}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-sans font-bold flex items-center space-x-1 shrink-0 shadow-sm transition"
                  title="Demander à l'IA de réparer automatiquement ce bug"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Auto-Fix</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
