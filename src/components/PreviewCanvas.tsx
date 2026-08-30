import React, { useRef, useEffect, useState, useMemo } from 'react';
import { 
  RefreshCw, 
  ExternalLink, 
  MousePointerClick, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Sparkles,
  Check,
  AlertTriangle,
  Wrench,
  Loader2,
  Play
} from 'lucide-react';
import { DeviceMode, AppElementTarget } from '../types';
import { playSound } from '../utils/audio';

interface PreviewCanvasProps {
  html: string;
  deviceMode: DeviceMode;
  onSelectElement: (target: AppElementTarget) => void;
  selectedElement: AppElementTarget | null;
  onCatchLog: (type: 'log' | 'warn' | 'error', message: string) => void;
  isUpdating?: boolean;
  onAutoRepair?: (errorMsg: string) => void;
  isInspectorActive?: boolean;
  onToggleInspector?: () => void;
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  html,
  deviceMode,
  onSelectElement,
  selectedElement,
  onCatchLog,
  isUpdating = false,
  onAutoRepair,
  isInspectorActive: externalIsInspectorActive,
  onToggleInspector: externalOnToggleInspector,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [internalIsInspectorActive, setInternalIsInspectorActive] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);
  const [lastRuntimeError, setLastRuntimeError] = useState<string | null>(null);

  const isInspectorActive = externalIsInspectorActive !== undefined ? externalIsInspectorActive : internalIsInspectorActive;

  const toggleInspector = () => {
    playSound('click');
    if (externalOnToggleInspector) {
      externalOnToggleInspector();
    } else {
      setInternalIsInspectorActive((prev) => !prev);
    }
  };

  // Clear error whenever new HTML is injected
  useEffect(() => {
    setLastRuntimeError(null);
  }, [html]);

  // Inject sandbox communication script into the iframe HTML
  // Injects script bridge only if missing, and memoizes result to avoid iframe flickering
  const augmentedHtml = useMemo(() => {
    if (!html) return '';

    // If script bridge already exists in HTML from backend session, use as-is
    if (html.includes('vibecode-preview-bridge')) {
      return html;
    }

    const injectedScript = `
      <script id="vibecode-preview-bridge">
        (function() {
          if (window.__vibecode_bridge_loaded) return;
          window.__vibecode_bridge_loaded = true;

          const origLog = console.log;
          const origWarn = console.warn;
          const origError = console.error;

          console.log = function(...args) {
            origLog.apply(console, args);
            window.parent.postMessage({ type: 'CONSOLE_LOG', level: 'log', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }, '*');
          };

          console.warn = function(...args) {
            origWarn.apply(console, args);
            window.parent.postMessage({ type: 'CONSOLE_LOG', level: 'warn', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }, '*');
          };

          console.error = function(...args) {
            origError.apply(console, args);
            const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
            window.parent.postMessage({ type: 'CONSOLE_LOG', level: 'error', message: msg }, '*');
            window.parent.postMessage({ type: 'PREVIEW_RUNTIME_ERROR', error: msg }, '*');
          };

          window.onerror = function(message, source, lineno, colno) {
            const errStr = message + ' (' + lineno + ':' + colno + ')';
            window.parent.postMessage({ type: 'CONSOLE_LOG', level: 'error', message: errStr }, '*');
            window.parent.postMessage({ type: 'PREVIEW_RUNTIME_ERROR', error: errStr }, '*');
          };

          window.addEventListener('unhandledrejection', function(event) {
            const reason = event.reason ? (event.reason.message || String(event.reason)) : 'Promesse non gérée';
            window.parent.postMessage({ type: 'CONSOLE_LOG', level: 'error', message: reason }, '*');
            window.parent.postMessage({ type: 'PREVIEW_RUNTIME_ERROR', error: reason }, '*');
          });

          // Inspector event handlers
          let isInspecting = false;
          let prevElement = null;

          window.addEventListener('message', function(e) {
            if (e.data && e.data.type === 'SET_INSPECTOR_MODE') {
              isInspecting = e.data.enabled;
              if (!isInspecting && prevElement) {
                prevElement.style.outline = '';
                prevElement = null;
              }
            }
          });

          document.addEventListener('mouseover', function(e) {
            if (!isInspecting) return;
            const el = e.target;
            if (el === document.body || el === document.documentElement) return;
            if (prevElement && prevElement !== el) {
              prevElement.style.outline = '';
            }
            prevElement = el;
            el.style.outline = '2px solid #8b5cf6';
            el.style.cursor = 'crosshair';

            window.parent.postMessage({
              type: 'INSPECTOR_HOVER',
              tagName: el.tagName.toLowerCase(),
              className: el.className,
              id: el.id
            }, '*');
          });

          document.addEventListener('mouseout', function(e) {
            if (!isInspecting) return;
            if (e.target && e.target.style) {
              e.target.style.outline = '';
            }
          });

          document.addEventListener('click', function(e) {
            if (!isInspecting) return;
            e.preventDefault();
            e.stopPropagation();

            const el = e.target;
            const selector = el.id ? '#' + el.id : (el.className ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase());
            
            window.parent.postMessage({
              type: 'INSPECTOR_SELECT',
              target: {
                tagName: el.tagName.toLowerCase(),
                id: el.id || undefined,
                className: el.className || undefined,
                innerText: el.innerText ? el.innerText.slice(0, 40) : undefined,
                selector: selector
              }
            }, '*');
          }, true);
        })();
      </script>
    `;

    return html.includes('</head>')
      ? html.replace('</head>', `${injectedScript}</head>`)
      : `${injectedScript}${html}`;
  }, [html]);

  // Listen to messages from the sandbox iframe idempotently
  useEffect(() => {
    let lastHandledTime = 0;
    let lastHandledMessage = '';

    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      // Deduplicate identical messages arriving within 100ms
      const msgKey = JSON.stringify(event.data);
      const now = Date.now();
      if (msgKey === lastHandledMessage && now - lastHandledTime < 100) {
        return;
      }
      lastHandledTime = now;
      lastHandledMessage = msgKey;

      if (event.data.type === 'CONSOLE_LOG') {
        onCatchLog(event.data.level, event.data.message);
      } else if (event.data.type === 'PREVIEW_RUNTIME_ERROR') {
        setLastRuntimeError(event.data.error);
      } else if (event.data.type === 'VIBECODE_PREVIEW_ERROR') {
        const errMsg = event.data.error?.message || 'Erreur d\'exécution du preview';
        setLastRuntimeError(errMsg);
      } else if (event.data.type === 'INSPECTOR_HOVER') {
        setHoveredTag(`<${event.data.tagName}${event.data.id ? ` id="${event.data.id}"` : ''}>`);
      } else if (event.data.type === 'INSPECTOR_SELECT') {
        playSound('pop');
        onSelectElement(event.data.target);
        if (externalOnToggleInspector && isInspectorActive) {
          externalOnToggleInspector();
        } else {
          setInternalIsInspectorActive(false);
        }
        setHoveredTag(null);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onCatchLog, onSelectElement, isInspectorActive, externalOnToggleInspector]);

  // Sync inspector state to iframe
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'SET_INSPECTOR_MODE', enabled: isInspectorActive },
        '*'
      );
    }
  }, [isInspectorActive, reloadKey]);

  const handleReload = () => {
    playSound('click');
    setReloadKey((prev) => prev + 1);
  };

  const handleOpenNewTab = () => {
    playSound('pop');
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  // Device dimension styling
  const getContainerStyles = () => {
    switch (deviceMode) {
      case 'mobile':
        return 'w-[375px] h-[680px] rounded-[36px] shadow-2xl overflow-hidden my-auto shadow-black/60';
      case 'tablet':
        return 'w-[768px] h-[92%] rounded-3xl shadow-2xl overflow-hidden my-auto shadow-black/60';
      case 'desktop':
      default:
        return 'w-full h-full rounded-2xl shadow-2xl overflow-hidden shadow-black/40';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-2 sm:p-3 overflow-hidden relative select-none">
      {/* Floating Canvas Action Bar */}
      {(isUpdating || lastRuntimeError || (hoveredTag && isInspectorActive)) && (
        <div className="h-9 px-2 flex items-center justify-between z-10 shrink-0 mb-1 pb-1">
          <div className="flex items-center space-x-2">
            {isUpdating && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 text-[11px] font-medium shadow-sm">
                <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                <span className="text-amber-300">Mise à jour...</span>
              </div>
            )}
            {lastRuntimeError && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 text-[11px] font-medium shadow-sm">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-rose-300">Erreur détectée</span>
              </div>
            )}
            {hoveredTag && isInspectorActive && (
              <span className="text-[11px] font-mono text-violet-300 bg-violet-950/90 px-2.5 py-1 rounded-xl shadow-sm">
                Élément survolé: {hoveredTag}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Runtime Error Overlay Banner if error was caught */}
      {lastRuntimeError && (
        <div className="mb-2 p-3 bg-rose-950/80 border border-rose-800/80 rounded-2xl flex items-center justify-between animate-fadeIn text-xs text-rose-200 shrink-0 shadow-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <span className="font-bold">Problème d'exécution détecté : </span>
              <span className="font-mono text-[11px] text-rose-300">{lastRuntimeError}</span>
            </div>
          </div>
          {onAutoRepair && (
            <button
              onClick={() => onAutoRepair(lastRuntimeError)}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow transition shrink-0 ml-2"
            >
              <Wrench className="w-3 h-3" />
              <span>Réparer avec l'IA</span>
            </button>
          )}
        </div>
      )}

      {/* Main Canvas Viewport Area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div className={`transition-all duration-300 flex flex-col bg-white ${getContainerStyles()}`}>
          {/* Mobile/Tablet Top Notch if in mobile mode */}
          {deviceMode === 'mobile' && (
            <div className="h-6 bg-slate-950 flex items-center justify-center px-4 shrink-0">
              <div className="w-20 h-3.5 bg-slate-900 rounded-full" />
            </div>
          )}

          {/* Sandboxed Live Iframe */}
          <iframe
            key={reloadKey}
            ref={iframeRef}
            srcDoc={augmentedHtml}
            title="Aperçu de l'Application"
            sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
            className="w-full flex-1 border-none bg-white rounded-b-2xl"
          />
        </div>
      </div>
    </div>
  );
};
