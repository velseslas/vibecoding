import React, { useState } from 'react';
import { 
  Download, 
  X, 
  FileCode, 
  Package, 
  Copy, 
  Check, 
  Share2, 
  ExternalLink,
  Code2
} from 'lucide-react';
import JSZip from 'jszip';
import { VibeProject } from '../types';
import { playSound } from '../utils/audio';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: VibeProject | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);

  if (!isOpen || !project) return null;

  const handleDownloadSingleHtml = () => {
    playSound('magic');
    const blob = new Blob([project.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.toLowerCase().replace(/\s+/g, '-')}.html`;
    a.click();
  };

  const handleDownloadZip = async () => {
    playSound('magic');
    setIsExportingZip(true);
    try {
      const zip = new JSZip();
      
      project.files.forEach((file) => {
        zip.file(file.name, file.content);
      });

      // Also add a README.md for beginners
      zip.file(
        'README.md',
        `# ${project.title}

> ${project.description}
> Généré avec VibeCode Studio (Style Lovable.dev)

## 🚀 Comment l'exécuter ?
Double-cliquez simplement sur \`index.html\` pour l'ouvrir directement dans n'importe quel navigateur web !
`
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.toLowerCase().replace(/\s+/g, '-')}-project.zip`;
      a.click();
    } catch (err) {
      console.error(err);
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleCopyRaw = () => {
    playSound('pop');
    navigator.clipboard.writeText(project.html);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-3xl shadow-2xl overflow-hidden p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Exporter votre Projet</h3>
              <p className="text-xs text-slate-400">Code 100% propre, autonome et sans dépendances lourdes</p>
            </div>
          </div>
          <button
            onClick={() => {
              playSound('click');
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options List */}
        <div className="space-y-3">
          {/* ZIP Archive Option */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 hover:border-violet-600/50 rounded-2xl flex items-center justify-between transition group">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-violet-950 flex items-center justify-center text-violet-400">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white">Archive ZIP Complète</h4>
                <p className="text-[11px] text-slate-400">Contient index.html, styles.css, app.js et README</p>
              </div>
            </div>
            <button
              onClick={handleDownloadZip}
              disabled={isExportingZip}
              className="px-3.5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              {isExportingZip ? 'Génération...' : 'Télécharger .ZIP'}
            </button>
          </div>

          {/* Standalone HTML Option */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 hover:border-violet-600/50 rounded-2xl flex items-center justify-between transition group">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-950 flex items-center justify-center text-indigo-400">
                <FileCode className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white">Fichier HTML Unique</h4>
                <p className="text-[11px] text-slate-400">Prêt à être hébergé sur Vercel, Netlify ou GitHub Pages</p>
              </div>
            </div>
            <button
              onClick={handleDownloadSingleHtml}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
            >
              Télécharger .HTML
            </button>
          </div>

          {/* Copy Code */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 hover:border-violet-600/50 rounded-2xl flex items-center justify-between transition group">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-slate-400">
                <Code2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white">Copier le Code Source</h4>
                <p className="text-[11px] text-slate-400">Collez-le dans VS Code ou votre éditeur préféré</p>
              </div>
            </div>
            <button
              onClick={handleCopyRaw}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center space-x-1"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copié !' : 'Copier'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
