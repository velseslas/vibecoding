import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Trash2, 
  Pause, 
  Play, 
  ChevronUp, 
  ChevronDown, 
  AlertCircle, 
  CheckCircle2, 
  Maximize2,
  Minimize2,
  Filter,
  X
} from 'lucide-react';
import { playSound } from '../utils/audio';

export interface ServerLogItem {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  module: string;
  message: string;
}

interface RealtimeLogsConsoleProps {
  /** Optional mode: 'embedded' (collapsible bottom panel above chat input) or 'full' (for tab view) */
  mode?: 'embedded' | 'full';
  /** Optional callback if user wants to ask AI to auto-fix an error */
  onAutoFixError?: (errorMessage: string) => void;
}

export const RealtimeLogsConsole: React.FC<RealtimeLogsConsoleProps> = ({
  mode = 'embedded',
  onAutoFixError,
}) => {
  const [logs, setLogs] = useState<ServerLogItem[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(mode === 'full');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [unseenCount, setUnseenCount] = useState<number>(0);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [filterLevel, setFilterLevel] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(isPaused);
  const isExpandedRef = useRef(isExpanded);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    isExpandedRef.current = isExpanded;
    if (isExpanded) {
      setUnseenCount(0);
    }
  }, [isExpanded]);

  // Connect to SSE stream /api/logs/stream
  useEffect(() => {
    let es: EventSource | null = null;
    let isMounted = true;

    const connect = () => {
      try {
        es = new EventSource('/api/logs/stream');

        es.onopen = () => {
          if (isMounted) setIsConnected(true);
        };

        es.onmessage = (event) => {
          if (!isMounted) return;
          if (event.data === ': ping' || event.data === ': heartbeat') return;

          try {
            const data = JSON.parse(event.data);
            if (data && data.message && !isPausedRef.current) {
              const itemLevel = (data.level || 'info').toLowerCase() as 'info' | 'warn' | 'error' | 'debug';
              
              const newLogItem: ServerLogItem = {
                id: data.id || 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
                timestamp: data.timestamp || new Date().toISOString(),
                level: itemLevel,
                module: data.module || data.service || 'Server',
                message: data.message,
              };

              setLogs((prev) => {
                if (prev.some((item) => item.id === newLogItem.id)) {
                  return prev;
                }
                const updated = [...prev, newLogItem];
                return updated.slice(-500); // Retain max 500 logs in memory
              });

              if (itemLevel === 'error') {
                setErrorCount((c) => c + 1);
              }

              if (!isExpandedRef.current) {
                setUnseenCount((c) => c + 1);
              }
            }
          } catch (e) {
            // Ignore parse errors or SSE keepalives
          }
        };

        es.onerror = () => {
          if (isMounted) {
            setIsConnected(false);
            if (es) {
              es.close();
              es = null;
            }
            // Auto reconnect after 3 seconds
            setTimeout(() => {
              if (isMounted) connect();
            }, 3000);
          }
        };
      } catch (err) {
        if (isMounted) setIsConnected(false);
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (es) {
        es.close();
      }
    };
  }, []);

  // Auto scroll down when new logs arrive
  useEffect(() => {
    if ((isExpanded || mode === 'full') && autoScroll && !isPaused) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isExpanded, mode, autoScroll, isPaused]);

  // Format ISO timestamp to HH:MM:SS
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toTimeString().split(' ')[0] || isoString;
    } catch {
      return isoString;
    }
  };

  // Color mapping according to spec
  const getLevelStyle = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-400 font-bold'; // ERROR = text red
      case 'warn':
        return 'text-amber-400 font-semibold'; // WARN = text orange
      case 'debug':
        return 'text-slate-400'; // DEBUG = text gray
      case 'info':
      default:
        return 'text-white'; // INFO = text white
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.module.toLowerCase().includes(q) ||
        log.level.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleClear = () => {
    playSound('click');
    setLogs([]);
    setUnseenCount(0);
    setErrorCount(0);
  };

  const handleTogglePause = () => {
    playSound('click');
    setIsPaused((p) => !p);
  };

  // Retracted / Collapsed Bar view for embedded mode
  if (mode === 'embedded' && !isExpanded) {
    return (
      <div 
        className="px-3 py-1.5 flex items-center justify-between text-xs font-mono select-none transition-all duration-200 bg-slate-950"
      >
        <div 
          onClick={() => setIsExpanded(true)}
          className="flex items-center space-x-2.5 cursor-pointer hover:opacity-90 flex-1 overflow-hidden"
        >
          <div className="flex items-center space-x-1.5 shrink-0">
            <Terminal className="w-3.5 h-3.5 text-violet-400" />
            <span className="font-semibold text-slate-200 text-xs">Console Server</span>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} title={isConnected ? "Connecté en direct via SSE" : "Reconnexion..."} />
          </div>

          {unseenCount > 0 ? (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              errorCount > 0 ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse' : 'bg-slate-800 text-violet-300 border border-slate-700'
            }`}>
              Console ({unseenCount} nouveau{unseenCount > 1 ? 'x' : ''} log{unseenCount > 1 ? 's' : ''})
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 truncate">
              {logs.length > 0 ? logs[logs.length - 1].message : "Prêt • Aucun nouveau log"}
            </span>
          )}

          {errorCount > 0 && (
            <span className="flex items-center space-x-1 px-1.5 py-0.5 bg-rose-950/80 border border-rose-800 text-rose-300 rounded text-[10px] font-bold shrink-0">
              <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
              <span>{errorCount} erreur{errorCount > 1 ? 's' : ''}</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1.5 shrink-0 ml-2">
          {logs.length > 0 && (
            <button
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
              title="Vider les logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => {
              playSound('pop');
              setIsExpanded(true);
            }}
            className="px-2 py-1 bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 border border-violet-500/40 rounded flex items-center space-x-1 text-[11px] font-sans font-semibold transition"
          >
            <span>Ouvrir</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Expanded / Full Terminal Console view
  return (
    <div 
      className={`flex flex-col font-mono text-xs overflow-hidden select-text transition-all bg-slate-950 ${
        mode === 'full' ? 'h-full flex-1' : 'h-52 shadow-2xl shrink-0'
      }`}
    >
      {/* Console Header Bar */}
      <div 
        className="h-9 px-3 flex items-center justify-between shrink-0 select-none text-xs bg-slate-900/90"
      >
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <Terminal className="w-4 h-4 text-violet-400 shrink-0" />
          <span className="font-bold text-slate-200 tracking-tight text-xs shrink-0">
            Console Backend (SSE)
          </span>

          <span className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} title={isConnected ? "En direct (SSE /api/logs/stream)" : "Connexion au serveur..."} />

          <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-700/60 px-2 py-0.5 rounded shrink-0 font-sans">
            {filteredLogs.length} / {logs.length} logs
          </span>

          {isPaused && (
            <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded font-bold font-sans shrink-0">
              PAUSE
            </span>
          )}
        </div>

        {/* Toolbar controls */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Search box */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer..."
            className="w-24 sm:w-32 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
          />

          {/* Level filter buttons */}
          <div className="hidden sm:flex items-center bg-slate-900 border border-slate-700 rounded p-0.5 text-[10px] font-sans">
            <button
              onClick={() => setFilterLevel('all')}
              className={`px-1.5 py-0.5 rounded transition ${filterLevel === 'all' ? 'bg-violet-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilterLevel('error')}
              className={`px-1.5 py-0.5 rounded transition ${filterLevel === 'error' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Err
            </button>
            <button
              onClick={() => setFilterLevel('warn')}
              className={`px-1.5 py-0.5 rounded transition ${filterLevel === 'warn' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Warn
            </button>
          </div>

          {/* Pause / Resume button */}
          <button
            onClick={handleTogglePause}
            className={`px-2 py-1 rounded text-[11px] font-sans font-medium flex items-center space-x-1 transition border ${
              isPaused 
                ? 'bg-amber-600/30 text-amber-300 border-amber-500/50 hover:bg-amber-600/50' 
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
            }`}
            title={isPaused ? "Reprendre le flux en direct" : "Mettre en pause le flux de logs"}
          >
            {isPaused ? (
              <>
                <Play className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">Reprendre</span>
              </>
            ) : (
              <>
                <Pause className="w-3 h-3 text-slate-400" />
                <span className="hidden sm:inline">Pause</span>
              </>
            )}
          </button>

          {/* Clear button */}
          <button
            onClick={handleClear}
            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
            title="Vider la console (Clear)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Collapse button for embedded mode */}
          {mode === 'embedded' && (
            <button
              onClick={() => {
                playSound('pop');
                setIsExpanded(false);
              }}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition ml-1"
              title="Réduire la console"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Logs Body */}
      <div 
        ref={logsContainerRef}
        style={{ backgroundColor: '#0d1117' }}
        className="flex-1 p-2.5 overflow-y-auto space-y-1 font-mono text-[11px] leading-relaxed custom-scrollbar selection:bg-violet-600 selection:text-white"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-600 py-8 font-sans space-y-1">
            <CheckCircle2 className="w-6 h-6 text-emerald-500/60" />
            <p className="text-xs font-semibold text-slate-400">Aucun log à afficher</p>
            <p className="text-[11px] text-slate-600">
              {logs.length === 0 ? "Le serveur écoute les événements..." : "Aucun log ne correspond au filtre actif."}
            </p>
          </div>
        ) : (
          filteredLogs.map((log, idx) => {
            const timeStr = formatTime(log.timestamp);
            const levelUpper = log.level.toUpperCase();

            return (
              <div 
                key={log.id ? `${log.id}-${idx}` : `log-${idx}`} 
                className="group flex items-start space-x-2 hover:bg-slate-900/60 px-1.5 py-0.5 rounded transition break-all leading-normal"
              >
                {/* Time [HH:MM:SS] */}
                <span className="text-slate-500 shrink-0 font-mono text-[10px] select-none">
                  [{timeStr}]
                </span>

                {/* Level [LEVEL] */}
                <span className={`shrink-0 font-mono text-[10px] px-1 rounded ${
                  log.level === 'error' ? 'bg-rose-950/80 text-rose-400 font-bold border border-rose-800/60' :
                  log.level === 'warn' ? 'bg-amber-950/80 text-amber-400 font-bold border border-amber-800/60' :
                  log.level === 'debug' ? 'bg-slate-900 text-slate-400' :
                  'bg-slate-800/80 text-slate-200 font-medium'
                }`}>
                  [{levelUpper}]
                </span>

                {/* Module [MODULE] */}
                <span className="text-violet-400 shrink-0 font-semibold text-[10px]">
                  [{log.module}]
                </span>

                {/* Message text */}
                <span className={`flex-1 font-mono text-[11px] whitespace-pre-wrap ${getLevelStyle(log.level)}`}>
                  {log.message}
                </span>

                {/* Auto fix button if error */}
                {log.level === 'error' && onAutoFixError && (
                  <button
                    onClick={() => onAutoFixError(log.message)}
                    className="opacity-0 group-hover:opacity-100 px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-sans font-bold shrink-0 transition"
                  >
                    Auto-Fix
                  </button>
                )}
              </div>
            );
          })
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
};
