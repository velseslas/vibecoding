import React, { useState } from 'react';
import { 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  Save, 
  FolderOpen
} from 'lucide-react';
import { CodeFile } from '../types';
import { playSound } from '../utils/audio';

interface CodeEditorProps {
  files: CodeFile[];
  onUpdateFileContent: (fileName: string, newContent: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  files,
  onUpdateFileContent,
}) => {
  const [activeFileName, setActiveFileName] = useState<string>(
    files[0]?.name || 'index.html'
  );
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(true);

  const activeFile = files.find((f) => f.name === activeFileName) || files[0];
  const [editorContent, setEditorContent] = useState(activeFile?.content || '');

  // Keep editor content in sync if files prop changes or activeFile changes
  const handleSelectFile = (name: string) => {
    playSound('click');
    setActiveFileName(name);
    const f = files.find((item) => item.name === name);
    if (f) {
      setEditorContent(f.content);
    }
    setIsSaved(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditorContent(e.target.value);
    setIsSaved(false);
  };

  const handleApplyChanges = () => {
    playSound('magic');
    onUpdateFileContent(activeFileName, editorContent);
    setIsSaved(true);
  };

  const handleCopy = () => {
    playSound('pop');
    navigator.clipboard.writeText(editorContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    playSound('pop');
    const blob = new Blob([editorContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFileName;
    a.click();
  };

  const lineCount = editorContent.split('\n').length;

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-slate-950 text-slate-200 overflow-hidden select-none">
      {/* Left Sidebar: All Files List */}
      <div className="w-full md:w-64 bg-slate-900/90 border-r border-slate-800/80 flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-slate-800/80 flex items-center space-x-2 bg-slate-950/60">
          <FolderOpen className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Fichiers du Projet ({files.length})</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {files.map((file) => (
            <button
              key={file.name}
              onClick={() => handleSelectFile(file.name)}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition ${
                activeFileName === file.name
                  ? 'bg-violet-600/20 text-violet-300 font-bold border border-violet-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-2 truncate">
                <FileCode className={`w-3.5 h-3.5 shrink-0 ${activeFileName === file.name ? 'text-violet-400' : 'text-slate-500'}`} />
                <span className="truncate">{file.name}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {file.content.split('\n').length} l.
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Right Area: Code Editor & Actions */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
        {/* Top Action Bar */}
        <div className="h-11 px-4 bg-slate-950 border-b border-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-semibold text-violet-300 bg-violet-950/60 px-2.5 py-1 rounded-lg border border-violet-900/40">
              {activeFileName}
            </span>
            {!isSaved && (
              <span className="text-[10px] text-amber-400 font-medium animate-pulse">
                Modifications non enregistrées
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {!isSaved && (
              <button
                onClick={handleApplyChanges}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-1.5"
                title="Appliquer immédiatement à l'aperçu"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Appliquer</span>
              </button>
            )}

            <button
              onClick={handleCopy}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition shadow-sm"
              title="Copier le code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleDownload}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition shadow-sm"
              title="Télécharger ce fichier"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Editor Body with line numbers */}
        <div className="flex-1 flex overflow-hidden font-mono text-xs">
          {/* Line Numbers */}
          <div className="w-12 bg-slate-950/80 py-3 text-right pr-3 text-slate-600 select-none overflow-hidden shrink-0">
            {Array.from({ length: Math.min(lineCount, 1000) }).map((_, i) => (
              <div key={i} className="leading-5">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Textarea Code Content */}
          <textarea
            value={editorContent}
            onChange={handleChange}
            spellCheck={false}
            className="flex-1 bg-slate-950 p-3 text-slate-200 font-mono text-xs leading-5 focus:outline-none resize-none overflow-auto select-text selection:bg-violet-900 selection:text-white"
          />
        </div>
      </div>
    </div>
  );
};

