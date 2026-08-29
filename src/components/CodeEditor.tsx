import React, { useState } from 'react';
import { 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  Code2, 
  Save, 
  RefreshCw,
  Sparkles
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

  const handleSelectFile = (name: string) => {
    playSound('click');
    setActiveFileName(name);
    const f = files.find((item) => item.name === name);
    if (f) setEditorContent(f.content);
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
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-200 overflow-hidden select-none">
      {/* Tab bar */}
      <div className="h-10 bg-slate-950 border-b border-slate-800 px-3 flex items-center justify-between shrink-0">
        {/* File Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto">
          {files.map((file) => (
            <button
              key={file.name}
              onClick={() => handleSelectFile(file.name)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-2 transition ${
                activeFileName === file.name
                  ? 'bg-slate-900 text-violet-400 border border-violet-800/40 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{file.name}</span>
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {!isSaved && (
            <button
              onClick={handleApplyChanges}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center space-x-1.5"
              title="Appliquer immédiatement à l'aperçu"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Appliquer</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition"
            title="Copier le code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleDownload}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition"
            title="Télécharger ce fichier"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Body with line numbers */}
      <div className="flex-1 flex overflow-hidden font-mono text-xs">
        {/* Line Numbers */}
        <div className="w-12 bg-slate-950 border-r border-slate-800/80 py-3 text-right pr-3 text-slate-600 select-none overflow-hidden shrink-0">
          {Array.from({ length: Math.min(lineCount, 500) }).map((_, i) => (
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
  );
};
