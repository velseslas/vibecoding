import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { VibeChat } from './components/VibeChat';
import { PreviewCanvas } from './components/PreviewCanvas';
import { CodeEditor } from './components/CodeEditor';
import { ComponentTree } from './components/ComponentTree';
import { ConsoleLogs, ConsoleLogItem } from './components/ConsoleLogs';
import { HistoryTimeline } from './components/HistoryTimeline';
import { VibeAcademyModal } from './components/VibeAcademyModal';
import { ExportModal } from './components/ExportModal';
import { DeployModal } from './components/DeployModal';
import { TemplatesGallery } from './components/TemplatesGallery';
import { QuotaModal } from './components/QuotaModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { UserProfileModal } from './components/UserProfileModal';
import { TechnicalPlanPanel } from './components/TechnicalPlanPanel';
import { 
  VibeProject, 
  WorkspaceTab, 
  DeviceMode, 
  ChatMessage, 
  AppElementTarget, 
  VibeStyle, 
  TemplateProject,
  AppIteration,
  CodeFile,
  ConversationCompassState
} from './types';
import { STARTER_TEMPLATES } from './data/templates';
import { 
  extractFilesFromHtml, 
  extractComponentsFromHtml, 
  generateLocalFallbackApp, 
  applyClientModification,
  buildIframeHtmlFromFiles
} from './utils/localGenerator';
import { playSound } from './utils/audio';
import { productApi } from './services/api';

export default function App() {
  // Initial project from first starter template (SaaS Pulse Analytics)
  const initialTemplate = STARTER_TEMPLATES[0];

  const [project, setProject] = useState<VibeProject>(() => {
    const saved = localStorage.getItem('vibecode_active_project');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }

    return {
      id: 'proj-' + Date.now(),
      title: initialTemplate.title,
      description: initialTemplate.description,
      vibe: initialTemplate.vibe,
      html: initialTemplate.html || initialTemplate.files[0].content,
      files: initialTemplate.files,
      components: initialTemplate.components,
      suggestedPrompts: initialTemplate.suggestedPrompts,
      iterations: [
        {
          id: 'iter-init',
          timestamp: Date.now(),
          prompt: 'Initialisation : ' + initialTemplate.title,
          summary: 'Modèle de départ prêt à être personnalisé',
          html: initialTemplate.html || initialTemplate.files[0].content,
          files: initialTemplate.files,
          versionNumber: 1,
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  });

  const [undoStack, setUndoStack] = useState<VibeProject[]>([]);
  const [redoStack, setRedoStack] = useState<VibeProject[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'ai',
      text: `👋 Bienvenue dans votre workspace Vibecoding !
Votre projet "${initialTemplate.title}" est actif et prêt.

💡 Décrivez simplement ce que vous souhaitez ajouter ou modifier en français :
• "Ajoute une page de gestion des tâches avec une liste et des boutons de suppression"
• "Ajoute un filtre de recherche dynamique et un mode sombre"
• "Active l'inspecteur visuel pour modifier un composant précis"`,
      timestamp: Date.now(),
      compassState: 'COMPLETED',
      suggestedPrompts: initialTemplate.suggestedPrompts,
    }
  ]);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('preview');
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [selectedElement, setSelectedElement] = useState<AppElementTarget | null>(null);
  const [logs, setLogs] = useState<ConsoleLogItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentCompassState, setCurrentCompassState] = useState<ConversationCompassState>('IDLE');

  // Extensible / Resizable Chat State
  const [chatWidth, setChatWidth] = useState<number>(() => {
    const saved = localStorage.getItem('vibecode_chat_width');
    return saved ? Math.max(280, Math.min(800, parseInt(saved, 10))) : 420;
  });
  const [isChatExpanded, setIsChatExpanded] = useState<boolean>(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState<boolean>(false);
  const [isInspectorActive, setIsInspectorActive] = useState<boolean>(false);
  const [isExpertMode, setIsExpertMode] = useState<boolean>(() => {
    return localStorage.getItem('vibecode_expert_mode') === 'true';
  });
  const [previewReloadKey, setPreviewReloadKey] = useState<number>(0);

  const handleToggleExpertMode = () => {
    playSound('click');
    setIsExpertMode((prev) => {
      const next = !prev;
      localStorage.setItem('vibecode_expert_mode', next.toString());
      return next;
    });
  };

  const handleReloadPreview = () => {
    playSound('click');
    setPreviewReloadKey((prev) => prev + 1);
  };

  const handleOpenNewTab = () => {
    playSound('click');
    if (!project?.html) return;
    const blob = new Blob([project.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleToggleInspector = () => {
    playSound('click');
    setIsInspectorActive((prev) => !prev);
  };

  // Modals state
  const [isAcademyOpen, setIsAcademyOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDeployOpen, setIsDeployOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isQuotaOpen, setIsQuotaOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userModalTab, setUserModalTab] = useState<'profile' | 'billing' | 'ai_settings' | 'preferences'>('profile');

  const handleChatWidthChange = (width: number) => {
    setChatWidth(width);
    localStorage.setItem('vibecode_chat_width', width.toString());
  };

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('vibecode_active_project', JSON.stringify(project));
  }, [project]);

  // Log catcher from iframe
  const handleCatchLog = useCallback((type: 'log' | 'warn' | 'error', message: string) => {
    setLogs((prev) => [
      {
        id: 'log-' + Date.now() + '-' + Math.random(),
        type,
        message,
        timestamp: Date.now(),
      },
      ...prev.slice(0, 50),
    ]);
  }, []);

  // Push to Undo history
  const recordHistory = (newProject: VibeProject) => {
    setUndoStack((prev) => [...prev.slice(-15), project]);
    setRedoStack([]);
    setProject(newProject);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    playSound('pop');
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, project]);
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setProject(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    playSound('pop');
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, project]);
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setProject(next);
  };

  // Enhance prompt with AI or local rules
  const handleEnhancePrompt = async (rawPrompt: string): Promise<string> => {
    try {
      return await productApi.enhancePrompt(rawPrompt, project.vibe);
    } catch {
      return `Crée une interface web moderne et interactive : "${rawPrompt}". Avec un design Tailwind soigné, animations fluides et sauvegarde LocalStorage.`;
    }
  };

  // Core Send / Iterate Message via Unified Product Conversation API
  const handleSendMessage = async (text: string, elementTarget?: AppElementTarget, confirmedByUser = false) => {
    const userMsgId = 'msg-user-' + Date.now();
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text,
      timestamp: Date.now(),
      elementTarget,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);
    setCurrentCompassState('UNDERSTANDING');

    const aiMsgId = 'msg-ai-' + Date.now();
    const initialAiMsg: ChatMessage = {
      id: aiMsgId,
      sender: 'ai',
      text: "J'analyse votre demande et prépare les modifications...",
      timestamp: Date.now(),
      compassState: 'UNDERSTANDING',
      steps: [
        { label: "Analyse de l'intention et du contexte", status: 'in-progress' },
        { label: "Vérification des impacts et du plan", status: 'pending' },
        { label: 'Application des modifications de code', status: 'pending' },
        { label: 'Validation du Preview et enregistrement de version', status: 'pending' },
      ],
    };

    setMessages((prev) => [...prev, initialAiMsg]);

    try {
      // Call unified backend conversation pipeline
      const apiResult = await productApi.sendMessage({
        projectId: project.id,
        prompt: text,
        vibe: project.vibe,
        currentHtml: project.html,
        files: project.files,
        confirmedByUser,
        elementTarget,
      });

      setCurrentCompassState(apiResult.compassState);

      // Handle Clarification requirement
      if (apiResult.compassState === 'CLARIFYING') {
        playSound('pop');
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  text: apiResult.aiResponseText,
                  compassState: 'CLARIFYING',
                  clarificationQuestion: apiResult.confirmationQuestion || apiResult.aiResponseText,
                  steps: [
                    { label: "Analyse de l'intention", status: 'completed' },
                    { label: 'Clarification demandée', status: 'completed' },
                  ],
                }
              : m
          )
        );
        return;
      }

      // Handle Explicit Confirmation requirement
      if (apiResult.compassState === 'WAITING_CONFIRMATION' && apiResult.requiresUserConfirmation) {
        playSound('error');
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  text: apiResult.aiResponseText,
                  compassState: 'WAITING_CONFIRMATION',
                  requiresConfirmation: true,
                  confirmationQuestion: apiResult.confirmationQuestion,
                  plan: apiResult.plan,
                  impact: apiResult.impact,
                  steps: [
                    { label: "Analyse de l'intention", status: 'completed' },
                    { label: 'Évaluation des impacts critiques', status: 'completed' },
                    { label: 'En attente de votre confirmation', status: 'in-progress' },
                  ],
                }
              : m
          )
        );
        return;
      }

      // Completed Iteration with Generated HTML & Files
      let newHtml = apiResult.previewHtml || project.html;
      if (!newHtml || newHtml.length < 50) {
        const fallback = applyClientModification(project.html, text, elementTarget);
        newHtml = fallback.html;
      }

      const newFiles = (apiResult.files && apiResult.files.length > 0)
        ? (apiResult.files as CodeFile[])
        : extractFilesFromHtml(newHtml);
      const newComponents = extractComponentsFromHtml(newHtml);
      const versionNumber = project.iterations.length + 1;

      const newIteration: AppIteration = {
        id: apiResult.versionId || 'iter-' + Date.now(),
        timestamp: Date.now(),
        prompt: text,
        summary: apiResult.plan?.goal || `Itération #${versionNumber}`,
        html: newHtml,
        files: newFiles,
        versionNumber,
        riskLevel: apiResult.impact?.riskLevel || 'LOW',
        qualityScore: apiResult.quality?.overallScore || 100,
        elementTarget,
      };

      const updatedProject: VibeProject = {
        ...project,
        html: newHtml,
        files: newFiles,
        components: newComponents,
        iterations: [...project.iterations, newIteration],
        currentVersionId: newIteration.id,
        technicalPlan: apiResult.technicalPlan || project.technicalPlan,
        updatedAt: Date.now(),
      };

      recordHistory(updatedProject);
      playSound('success');

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? {
                ...m,
                text: apiResult.aiResponseText || `✨ Votre application a été mise à jour (Version #${versionNumber}) !`,
                compassState: 'COMPLETED',
                plan: apiResult.plan,
                impact: apiResult.impact,
                quality: apiResult.quality,
                technicalPlan: apiResult.technicalPlan,
                rawChanges: {
                  filesModified: newFiles.length,
                  componentsAdded: newComponents.length,
                  summary: apiResult.plan?.goal || 'Mise à jour réussie',
                },
                suggestedPrompts: [
                  'Ajouter un mode sombre / clair',
                  'Ajouter un export de données',
                  'Améliorer les animations au survol',
                ],
                steps: [
                  { label: "Analyse de l'intention et du contexte", status: 'completed' },
                  { label: "Vérification des impacts et du plan", status: 'completed' },
                  { label: 'Application des modifications de code', status: 'completed' },
                  { label: 'Validation du Preview et enregistrement de version', status: 'completed' },
                ],
              }
            : m
        )
      );
    } catch (err: any) {
      console.warn('API error, executing client fallback:', err);
      const fallback = applyClientModification(project.html, text, elementTarget);
      const newFiles = extractFilesFromHtml(fallback.html);
      const newComponents = extractComponentsFromHtml(fallback.html);
      const versionNumber = project.iterations.length + 1;

      const newIteration: AppIteration = {
        id: 'iter-' + Date.now(),
        timestamp: Date.now(),
        prompt: text,
        summary: fallback.summary,
        html: fallback.html,
        files: newFiles,
        versionNumber,
        elementTarget,
      };

      const updatedProject: VibeProject = {
        ...project,
        html: fallback.html,
        files: newFiles,
        components: newComponents,
        iterations: [...project.iterations, newIteration],
        updatedAt: Date.now(),
      };

      recordHistory(updatedProject);
      playSound('success');

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? {
                ...m,
                text: `✨ **${fallback.summary}**\n\nVotre application a été mise à jour dans l'aperçu !`,
                compassState: 'COMPLETED',
                suggestedPrompts: fallback.suggestedPrompts,
                steps: [
                  { label: "Analyse de l'intention", status: 'completed' },
                  { label: 'Synthèse du code et du design', status: 'completed' },
                  { label: 'Validation du bac à sable', status: 'completed' },
                ],
              }
            : m
        )
      );
    } finally {
      setIsGenerating(false);
      setCurrentCompassState('IDLE');
    }
  };

  // Create new project from custom prompt
  const handleCreateFromPrompt = async (prompt: string, vibe: VibeStyle) => {
    setIsGenerating(true);
    playSound('magic');
    setCurrentCompassState('EXECUTING');

    let newHtml = '';
    let title = prompt.length > 25 ? prompt.slice(0, 24) + '...' : prompt;
    let description = prompt;
    let files: CodeFile[] = [];
    let components: { name: string; description: string }[] = [];
    let technicalPlan: any = null;
    let suggestedPrompts = [
      'Ajouter un mode sombre',
      'Ajouter des confettis au clic',
      'Sauvegarder dans LocalStorage',
    ];

    try {
      const response = await fetch('/api/generate-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, vibe }),
      });
      const data = await response.json();
      if (data.success && data.html) {
        newHtml = data.html;
        title = data.title || title;
        description = data.description || description;
        files = data.files || extractFilesFromHtml(newHtml);
        components = data.components || extractComponentsFromHtml(newHtml);
        technicalPlan = data.technicalPlan || null;
        if (data.suggestedPrompts) suggestedPrompts = data.suggestedPrompts;
      } else {
        throw new Error('Fallback to local generator');
      }
    } catch {
      const local = generateLocalFallbackApp(prompt, vibe);
      newHtml = local.html;
      title = local.title;
      description = local.description;
      files = local.files;
      components = local.components;
      suggestedPrompts = local.suggestedPrompts;
    }

    const newProject: VibeProject = {
      id: 'proj-' + Date.now(),
      title,
      description,
      vibe,
      html: newHtml,
      files,
      components,
      suggestedPrompts,
      technicalPlan,
      iterations: [
        {
          id: 'iter-0',
          timestamp: Date.now(),
          prompt,
          summary: 'Création initiale du projet',
          html: newHtml,
          files,
          versionNumber: 1,
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setUndoStack([]);
    setRedoStack([]);
    setProject(newProject);
    setIsGenerating(false);
    setCurrentCompassState('IDLE');
    playSound('deploy');

    setMessages([
      {
        id: 'msg-init-' + Date.now(),
        sender: 'ai',
        text: `🚀 Projet "${title}" créé avec succès !
Votre application est prête dans l'aperçu. Dites-moi ce que vous souhaitez y ajouter ou améliorer.`,
        timestamp: Date.now(),
        compassState: 'COMPLETED',
        suggestedPrompts,
      }
    ]);
  };

  // Load a starter template
  const handleSelectTemplate = (template: TemplateProject) => {
    playSound('magic');
    const newProject: VibeProject = {
      id: 'proj-' + Date.now(),
      title: template.title,
      description: template.description,
      vibe: template.vibe,
      html: template.html || template.files[0].content,
      files: template.files,
      components: template.components,
      suggestedPrompts: template.suggestedPrompts,
      iterations: [
        {
          id: 'iter-tpl',
          timestamp: Date.now(),
          prompt: 'Chargement du starter : ' + template.title,
          summary: 'Modèle prêt à l\'emploi',
          html: template.html || template.files[0].content,
          files: template.files,
          versionNumber: 1,
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setUndoStack([]);
    setRedoStack([]);
    setProject(newProject);

    setMessages([
      {
        id: 'msg-tpl-' + Date.now(),
        sender: 'ai',
        text: `🌟 Modèle "${template.title}" chargé avec succès !
Testez l'interface dans l'aperçu et personnalisez-la simplement avec vos mots.`,
        timestamp: Date.now(),
        compassState: 'COMPLETED',
        suggestedPrompts: template.suggestedPrompts,
      }
    ]);
  };

  // Direct manual code edit from CodeEditor tab
  const handleUpdateFileContent = (fileName: string, newContent: string) => {
    const updatedFiles = project.files.map((f) =>
      f.name === fileName ? { ...f, content: newContent } : f
    );

    const newHtml = buildIframeHtmlFromFiles(updatedFiles);

    const updatedProject: VibeProject = {
      ...project,
      html: newHtml,
      files: updatedFiles,
      updatedAt: Date.now(),
    };

    recordHistory(updatedProject);
  };

  // Restore previous iteration via Rollback
  const handleRestoreIteration = async (iteration: AppIteration) => {
    try {
      await productApi.rollback(project.id, iteration.id);
    } catch (e) {
      console.warn('Server rollback error, restoring locally:', e);
    }

    const updatedProject: VibeProject = {
      ...project,
      html: iteration.html,
      files: iteration.files,
      components: extractComponentsFromHtml(iteration.html),
      currentVersionId: iteration.id,
      updatedAt: Date.now(),
    };

    recordHistory(updatedProject);
    playSound('magic');
    setMessages((prev) => [
      ...prev,
      {
        id: 'msg-restore-' + Date.now(),
        sender: 'ai',
        text: `⏪ **Version #${iteration.versionNumber || 'précédente'} restaurée avec succès** : "${iteration.prompt}"`,
        timestamp: Date.now(),
        compassState: 'COMPLETED',
      }
    ]);
    setActiveTab('preview');
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans antialiased selection:bg-violet-500 selection:text-white">
      {/* Top Header */}
      <Header
        project={project}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        deviceMode={deviceMode}
        setDeviceMode={setDeviceMode}
        onNewProject={() => setIsTemplatesOpen(true)}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onOpenAcademy={() => setIsAcademyOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenDeploy={() => setIsDeployOpen(true)}
        onOpenQuota={() => setIsQuotaOpen(true)}
        onOpenProjects={() => setIsProjectsOpen(true)}
        onOpenUserModal={(tab) => {
          setUserModalTab(tab || 'profile');
          setIsUserModalOpen(true);
        }}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onReloadPreview={handleReloadPreview}
        onOpenNewTab={handleOpenNewTab}
        isExpanded={isChatExpanded}
        onToggleExpand={() => setIsChatExpanded((prev) => !prev)}
        isCollapsed={isChatCollapsed}
        onToggleCollapse={() => setIsChatCollapsed((prev) => !prev)}
        onUpdateTitle={(title) => setProject((prev) => ({ ...prev, title }))}
        isExpertMode={isExpertMode}
        onToggleExpertMode={handleToggleExpertMode}
      />

      {/* Main Workspace Split-Screen */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Side: Vibe Chat & Iteration Studio */}
        <VibeChat
          messages={messages}
          isGenerating={isGenerating}
          onSendMessage={handleSendMessage}
          selectedElement={selectedElement}
          onClearSelectedElement={() => setSelectedElement(null)}
          currentVibe={project.vibe}
          onChangeVibe={(vibe) => setProject((prev) => ({ ...prev, vibe }))}
          onEnhancePrompt={handleEnhancePrompt}
          chatWidth={chatWidth}
          onChatWidthChange={handleChatWidthChange}
          isExpanded={isChatExpanded}
          onToggleExpand={() => setIsChatExpanded((prev) => !prev)}
          isCollapsed={isChatCollapsed}
          onToggleCollapse={() => setIsChatCollapsed((prev) => !prev)}
          currentCompassState={currentCompassState}
          isInspectorActive={isInspectorActive}
          onToggleInspector={handleToggleInspector}
        />

        {/* Middle Volet (Mode Expert): Plan Technique Architectural */}
        {isExpertMode && (
          <TechnicalPlanPanel
            project={project}
            latestMessage={messages[messages.length - 1]}
            isOpen={isExpertMode}
            onClose={() => setIsExpertMode(false)}
          />
        )}

        {/* Right Side: Tab Switcher (Preview, Code, Components, Console, History) */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
          {activeTab === 'preview' && (
            <PreviewCanvas
              key={previewReloadKey}
              html={project.html}
              deviceMode={deviceMode}
              onSelectElement={(target) => setSelectedElement(target)}
              selectedElement={selectedElement}
              onCatchLog={handleCatchLog}
              isUpdating={isGenerating}
              onAutoRepair={(errMsg) => {
                handleSendMessage(`Corrige automatiquement ce problème d'exécution : "${errMsg}"`);
              }}
              isInspectorActive={isInspectorActive}
              onToggleInspector={handleToggleInspector}
            />
          )}

          {activeTab === 'code' && (
            <CodeEditor
              files={project.files}
              onUpdateFileContent={handleUpdateFileContent}
            />
          )}

          {activeTab === 'structure' && (
            <ComponentTree
              components={project.components}
              onPromptForComponent={(compName) => {
                handleSendMessage(`Améliore et enrichis le composant "${compName}"`);
              }}
            />
          )}

          {activeTab === 'console' && (
            <ConsoleLogs
              logs={logs}
              onClearLogs={() => setLogs([])}
              onAutoFixError={(errMsg) => {
                handleSendMessage(`Corrige automatiquement cette erreur JavaScript : "${errMsg}"`);
              }}
            />
          )}

          {activeTab === 'history' && (
            <HistoryTimeline
              projectId={project.id}
              iterations={project.iterations}
              currentIterationId={project.currentVersionId}
              onRestoreIteration={handleRestoreIteration}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <VibeAcademyModal
        isOpen={isAcademyOpen}
        onClose={() => setIsAcademyOpen(false)}
        onUsePrompt={(p) => handleCreateFromPrompt(p, 'modern-saas')}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        project={project}
      />

      <DeployModal
        isOpen={isDeployOpen}
        onClose={() => setIsDeployOpen(false)}
        project={project}
      />

      <TemplatesGallery
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectTemplate={handleSelectTemplate}
        onCreateFromPrompt={handleCreateFromPrompt}
        onOpenAcademy={() => {
          setIsTemplatesOpen(false);
          setIsAcademyOpen(true);
        }}
      />

      <QuotaModal
        isOpen={isQuotaOpen}
        onClose={() => setIsQuotaOpen(false)}
      />

      <ProjectManagerModal
        isOpen={isProjectsOpen}
        onClose={() => setIsProjectsOpen(false)}
        currentProject={project}
        onSelectProject={(proj) => {
          setProject(proj);
          setUndoStack([]);
          setRedoStack([]);
        }}
        onNewProject={() => {
          setIsProjectsOpen(false);
          setIsTemplatesOpen(true);
        }}
      />

      <UserProfileModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        userEmail="noubaschool@gmail.com"
        initialTab={userModalTab}
      />
    </div>
  );
}
