import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Mic, 
  MicOff, 
  Wand2, 
  Target, 
  X, 
  CheckCircle2, 
  CircleDot, 
  Loader2, 
  ChevronDown,
  Minimize2,
  Maximize2,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUp,
  AlertTriangle,
  ShieldAlert,
  HelpCircle,
  Layers,
  FileCode,
  Check,
  RotateCcw,
  Zap
} from 'lucide-react';
import { 
  ChatMessage, 
  AppElementTarget, 
  VibeStyle, 
  ConversationCompassState,
  RiskLevel 
} from '../types';
import { playSound } from '../utils/audio';

interface VibeChatProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  onSendMessage: (text: string, elementTarget?: AppElementTarget, confirmedByUser?: boolean) => void;
  selectedElement: AppElementTarget | null;
  onClearSelectedElement: () => void;
  currentVibe: VibeStyle;
  onChangeVibe: (vibe: VibeStyle) => void;
  onEnhancePrompt: (text: string) => Promise<string>;
  chatWidth: number;
  onChatWidthChange: (width: number) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentCompassState?: ConversationCompassState;
}

export const VibeChat: React.FC<VibeChatProps> = ({
  messages,
  isGenerating,
  onSendMessage,
  selectedElement,
  onClearSelectedElement,
  currentVibe,
  onChangeVibe,
  onEnhancePrompt,
  chatWidth,
  onChatWidthChange,
  isExpanded,
  onToggleExpand,
  isCollapsed,
  onToggleCollapse,
  currentCompassState,
}) => {
  const [inputText, setInputText] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const styleDropdownRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating, currentCompassState]);

  // Close style dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (styleDropdownRef.current && !styleDropdownRef.current.contains(event.target as Node)) {
        setIsStyleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle drag to resize chat
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const maxW = Math.min(800, window.innerWidth * 0.65);
      const newWidth = Math.max(280, Math.min(maxW, e.clientX));
      onChatWidthChange(newWidth);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    if (isDragging) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onChatWidthChange]);

  // Voice speech-to-text setup
  const toggleRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("La reconnaissance vocale n'est pas supportée sur ce navigateur.");
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
        playSound('pop');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsRecording(false);
        playSound('success');
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error(err);
      setIsRecording(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isGenerating) return;
    playSound('pop');
    onSendMessage(inputText.trim(), selectedElement || undefined);
    setInputText('');
    if (selectedElement) {
      onClearSelectedElement();
    }
  };

  const handleEnhance = async () => {
    if (!inputText.trim() || isEnhancing) return;
    playSound('magic');
    setIsEnhancing(true);
    try {
      const enhanced = await onEnhancePrompt(inputText.trim());
      setInputText(enhanced);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleQuickPill = (prompt: string) => {
    playSound('click');
    onSendMessage(prompt, selectedElement || undefined);
    if (selectedElement) {
      onClearSelectedElement();
    }
  };

  const handleConfirmAction = (prompt: string) => {
    playSound('magic');
    onSendMessage(prompt, undefined, true);
  };

  const quickPills = [
    { label: '🌙 Mode Sombre', prompt: 'Passe l\'application en thème sombre avec de beaux contrastes' },
    { label: '💾 Sauvegarde Locale', prompt: 'Sauvegarde automatiquement toutes les données dans LocalStorage' },
    { label: '📱 Optimiser Mobile', prompt: 'Améliore l\'ergonomie et les espacements tactiles sur smartphone' },
    { label: '✨ Animations Douces', prompt: 'Ajoute des transitions fluides et micro-interactions au survol' },
  ];

  const getStyleLabel = (style: VibeStyle) => {
    switch (style) {
      case 'modern-saas': return 'Modern SaaS';
      case 'midnight-luxe': return 'Midnight Dark';
      case 'pastel-dream': return 'Pastel Doux';
      case 'cyberpunk': return 'Cyber Neon';
      case 'neo-brutalist': return 'Néo-Brutalist';
      default: return 'Modern';
    }
  };

  const getHumanCompassStatus = (state?: ConversationCompassState): string => {
    switch (state) {
      case 'UNDERSTANDING':
        return "J'analyse votre demande et votre application...";
      case 'CLARIFYING':
        return "J'ai besoin d'une petite précision...";
      case 'PLANNING':
        return "Voici ce que je vais faire pour vous...";
      case 'WAITING_CONFIRMATION':
        return "Confirmation requise avant modification sensible...";
      case 'EXECUTING':
        return "Application des modifications dans votre code...";
      case 'VALIDATING':
        return "Je vérifie que tout fonctionne parfaitement...";
      case 'REPAIRING':
        return "J'ai détecté un problème. Je le corrige immédiatement...";
      case 'COMPLETED':
        return "C'est terminé !";
      case 'FAILED':
        return "Une étape a rencontré une difficulté.";
      default:
        return "Que souhaitez-vous créer ou modifier ?";
    }
  };

  const getHumanRiskExplanation = (risk?: RiskLevel): { label: string; text: string; color: string } => {
    switch (risk) {
      case 'LOW':
        return {
          label: 'Impact Faible',
          text: 'Modification sans impact majeur détecté.',
          color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40',
        };
      case 'MEDIUM':
        return {
          label: 'Impact Modéré',
          text: 'Quelques parties existantes seront adaptées.',
          color: 'text-sky-400 bg-sky-950/60 border-sky-800/40',
        };
      case 'HIGH':
        return {
          label: 'Impact Élevé',
          text: 'Cette modification peut affecter plusieurs fonctionnalités.',
          color: 'text-amber-400 bg-amber-950/60 border-amber-800/40',
        };
      case 'CRITICAL':
        return {
          label: 'Impact Critique',
          text: 'Cette action touche une partie essentielle de votre application.',
          color: 'text-rose-400 bg-rose-950/60 border-rose-800/40',
        };
      default:
        return {
          label: 'Standard',
          text: 'Application des changements demandés.',
          color: 'text-violet-400 bg-violet-950/60 border-violet-800/40',
        };
    }
  };

  if (isCollapsed) {
    return (
      <aside className="w-12 bg-slate-950 flex flex-col items-center py-4 justify-between h-full shrink-0 select-none z-20">
        <button
          onClick={() => {
            playSound('click');
            onToggleCollapse();
          }}
          className="p-2 bg-slate-900 hover:bg-violet-600 text-slate-300 hover:text-white rounded-2xl transition shadow-sm"
          title="Ouvrir le chat"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
      </aside>
    );
  }

  const computedWidth = isExpanded ? 'w-full md:w-[580px] lg:w-[640px]' : undefined;
  const inlineStyle = !isExpanded && window.innerWidth >= 768 ? { width: `${chatWidth}px` } : undefined;

  return (
    <aside 
      style={inlineStyle}
      className={`w-full ${computedWidth || 'md:w-96 lg:w-[420px]'} bg-slate-950 flex flex-col h-full shrink-0 select-none relative transition-[width] duration-150 ease-out border-r border-slate-850/60`}
    >
      {/* Top chat bar */}
      <div className="px-4 py-3 flex items-center justify-between bg-slate-950 shrink-0 border-b border-slate-850/50">
        <div className="flex items-center space-x-2.5">
          <div className="relative flex h-2.5 w-2.5">
            {isGenerating ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            )}
          </div>
          <div>
            <span className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
              Assistant Vibecoding
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Style Selector Dropdown */}
          <div className="relative" ref={styleDropdownRef}>
            <button
              onClick={() => setIsStyleDropdownOpen((prev) => !prev)}
              className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-900/80 hover:bg-slate-800/80 text-slate-300 text-[11px] font-medium rounded-2xl transition border border-slate-800"
            >
              <span>{getStyleLabel(currentVibe)}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {isStyleDropdownOpen && (
              <div className="absolute top-full mt-1.5 right-0 w-40 bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl p-1 z-50 border border-slate-800/80 animate-fadeIn">
                {(['modern-saas', 'midnight-luxe', 'pastel-dream', 'cyberpunk', 'neo-brutalist'] as VibeStyle[]).map((vibe) => (
                  <button
                    key={vibe}
                    onClick={() => {
                      playSound('click');
                      onChangeVibe(vibe);
                      setIsStyleDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs rounded-xl transition ${
                      currentVibe === vibe ? 'bg-violet-600/20 text-violet-300 font-semibold' : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    {getStyleLabel(vibe)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Expand Toggle */}
          <button
            onClick={() => {
              playSound('click');
              onToggleExpand();
            }}
            className="p-1.5 bg-slate-900/70 hover:bg-slate-800/70 text-slate-400 hover:text-white rounded-xl transition"
            title={isExpanded ? 'Réduire' : 'Agrandir'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Collapse sidebar */}
          <button
            onClick={() => {
              playSound('click');
              onToggleCollapse();
            }}
            className="p-1.5 bg-slate-900/70 hover:bg-slate-800/70 text-slate-400 hover:text-white rounded-xl transition"
            title="Masquer le panneau"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Real-time UX status banner if active */}
      {isGenerating && (
        <div className="bg-violet-950/40 border-b border-violet-900/30 px-4 py-2 flex items-center space-x-2 text-violet-300 text-xs animate-fadeIn shrink-0">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400 shrink-0" />
          <span className="text-[11px] font-medium tracking-tight">
            {getHumanCompassStatus(currentCompassState || 'EXECUTING')}
          </span>
        </div>
      )}

      {/* Target Element Banner */}
      {selectedElement && (
        <div className="bg-violet-950/40 px-4 py-2 flex items-center justify-between border-b border-violet-900/30 animate-fadeIn shrink-0">
          <div className="flex items-center space-x-2 text-violet-300 text-xs">
            <Target className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span className="text-[11px]">Élément ciblé :</span>
            <span className="font-mono text-[10px] bg-violet-900/60 px-2 py-0.5 rounded-lg text-violet-200">
              {selectedElement.tagName || 'Élément'}
            </span>
          </div>
          <button
            onClick={() => {
              playSound('click');
              onClearSelectedElement();
            }}
            className="text-violet-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Chat Messages List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-xs">
        {messages.map((msg) => {
          const riskDetails = getHumanRiskExplanation(msg.impact?.riskLevel || msg.plan?.riskLevel);

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              } space-y-1.5`}
            >
              <div
                className={`max-w-[92%] p-4 rounded-3xl leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-violet-600 text-white rounded-br-md shadow-md shadow-violet-600/10'
                    : 'bg-slate-900/90 text-slate-200 rounded-bl-md border border-slate-800/80 shadow-sm'
                }`}
              >
                {/* Targeted element badge if any */}
                {msg.elementTarget && (
                  <div className="mb-2 text-[10px] text-violet-300 flex items-center space-x-1 font-mono">
                    <Target className="w-3 h-3 text-violet-400" />
                    <span>Cible : <strong>{msg.elementTarget.tagName}</strong></span>
                  </div>
                )}

                {/* Clarification Box */}
                {msg.compassState === 'CLARIFYING' && (
                  <div className="mb-3 p-3 bg-amber-950/40 border border-amber-800/40 rounded-2xl">
                    <div className="flex items-center space-x-2 text-amber-400 font-semibold text-[11px] mb-1">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Précision souhaitée</span>
                    </div>
                    <p className="text-amber-200/90 text-xs">
                      {msg.clarificationQuestion || msg.text}
                    </p>
                  </div>
                )}

                {/* Plan & Impact Box */}
                {msg.plan && (
                  <div className="mb-3 p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-violet-400 font-bold text-[11px]">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Plan d'action</span>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${riskDetails.color}`}>
                        {riskDetails.label}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 font-medium">
                      🎯 Objectif : {msg.plan.goal}
                    </p>

                    <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                      {msg.plan.steps.map((step, sIdx) => (
                        <div key={step.id || sIdx} className="flex items-start space-x-2 text-[11px] text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{step.label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-[10px] text-slate-400 pt-1">
                      ℹ️ {riskDetails.text}
                    </div>
                  </div>
                )}

                {/* Explicit Confirmation Dialog if required */}
                {msg.requiresConfirmation && (
                  <div className="mb-3 p-3.5 bg-rose-950/40 border border-rose-800/50 rounded-2xl space-y-2">
                    <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs">
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Confirmation requise</span>
                    </div>
                    <p className="text-rose-200 text-xs">
                      {msg.confirmationQuestion || "Cette modification touche des éléments sensibles de votre application."}
                    </p>
                    
                    {msg.impact?.potentialBreakingChanges && msg.impact.potentialBreakingChanges.length > 0 && (
                      <ul className="list-disc list-inside text-[11px] text-rose-300/80 space-y-0.5">
                        {msg.impact.potentialBreakingChanges.map((change, cIdx) => (
                          <li key={cIdx}>{change}</li>
                        ))}
                      </ul>
                    )}

                    <div className="pt-2 flex items-center space-x-2">
                      <button
                        onClick={() => handleConfirmAction(msg.text)}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs shadow-md transition"
                      >
                        Oui, continuer la modification
                      </button>
                    </div>
                  </div>
                )}

                {/* Main Message Text */}
                <p className="whitespace-pre-wrap">{msg.text}</p>

                {/* Quality Status Card if completed */}
                {msg.quality && msg.quality.passed && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/60 space-y-1">
                    <div className="text-[11px] text-emerald-400 flex items-center space-x-1.5 font-semibold">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Application validée & opérationnelle</span>
                    </div>
                    <div className="text-[10px] text-slate-400 space-y-0.5 pl-5">
                      <div>✓ Code propre & conforme</div>
                      <div>✓ Aucune erreur d'exécution détectée</div>
                      <div>✓ Aperçu en direct prêt</div>
                    </div>
                  </div>
                )}

                {/* Changes summary if present */}
                {msg.rawChanges && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
                    <span className="flex items-center space-x-1">
                      <FileCode className="w-3 h-3 text-violet-400" />
                      <span>{msg.rawChanges.filesModified} fichier(s) modifié(s)</span>
                    </span>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">
                      {msg.rawChanges.summary}
                    </span>
                  </div>
                )}

                {/* Steps Progress */}
                {msg.steps && msg.steps.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/60 space-y-1.5">
                    {msg.steps.map((step, idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-[11px]">
                        {step.status === 'completed' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : step.status === 'in-progress' ? (
                          <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin shrink-0" />
                        ) : (
                          <CircleDot className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        )}
                        <span className={step.status === 'completed' ? 'text-slate-300' : 'text-violet-300'}>
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Suggested prompts in rounded pills */}
              {msg.suggestedPrompts && msg.suggestedPrompts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {msg.suggestedPrompts.map((sPrompt, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => handleQuickPill(sPrompt)}
                      className="px-3 py-1 bg-slate-900/70 hover:bg-slate-800 text-slate-300 hover:text-white rounded-2xl text-[11px] transition text-left border border-slate-800/50"
                    >
                      {sPrompt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Lovable-style Floating Input Form */}
      <div className="p-3 bg-slate-950 shrink-0 border-t border-slate-850/50">
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900/90 rounded-3xl p-2 flex flex-col gap-2 shadow-lg border border-slate-800/70"
        >
          {/* Quick pills bar inside/above */}
          <div className="flex items-center space-x-1.5 overflow-x-auto px-2 pt-1 pb-0.5 no-scrollbar">
            {quickPills.map((pill, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickPill(pill.prompt)}
                className="px-2.5 py-1 bg-slate-950/60 hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 text-[10px] font-medium rounded-full whitespace-nowrap transition border border-slate-800/40"
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Text input area + Action buttons */}
          <div className="flex items-center px-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Décrivez ce que vous souhaitez créer ou modifier..."
              disabled={isGenerating}
              className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none py-1.5"
            />

            <div className="flex items-center space-x-1">
              {/* Magic Enhance prompt */}
              <button
                type="button"
                onClick={handleEnhance}
                disabled={!inputText.trim() || isEnhancing}
                className="p-1.5 text-slate-400 hover:text-amber-300 rounded-xl transition disabled:opacity-30"
                title="Améliorer le prompt"
              >
                <Wand2 className={`w-4 h-4 ${isEnhancing ? 'animate-spin text-amber-400' : ''}`} />
              </button>

              {/* Voice button */}
              <button
                type="button"
                onClick={toggleRecording}
                className={`p-1.5 rounded-xl transition ${
                  isRecording ? 'text-rose-400 animate-pulse' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Dictée vocale"
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Submit button */}
              <button
                type="submit"
                disabled={!inputText.trim() || isGenerating}
                className="w-8 h-8 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 text-white flex items-center justify-center transition shadow-md shadow-violet-600/20 disabled:shadow-none"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={() => setIsDragging(true)}
        className="hidden md:block absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-violet-500/50 transition"
      />
    </aside>
  );
};
