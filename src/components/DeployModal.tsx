import React, { useState, useEffect } from 'react';
import { 
  Rocket, 
  X, 
  CheckCircle2, 
  Loader2, 
  ExternalLink, 
  Copy, 
  Check, 
  Globe, 
  ShieldCheck, 
  Sparkles,
  QrCode
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { VibeProject } from '../types';
import { playSound } from '../utils/audio';

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: VibeProject | null;
}

export const DeployModal: React.FC<DeployModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const [deployStep, setDeployStep] = useState<number>(0);
  const [isDeploying, setIsDeploying] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const slug = project ? project.title.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'mon-app';
  const simulatedUrl = `https://${slug}.vibecode.app`;

  useEffect(() => {
    if (isOpen) {
      setIsDeploying(true);
      setDeployStep(1);

      const timer1 = setTimeout(() => setDeployStep(2), 700);
      const timer2 = setTimeout(() => setDeployStep(3), 1500);
      const timer3 = setTimeout(() => {
        setDeployStep(4);
        setIsDeploying(false);
        playSound('deploy');
        try {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } catch {}
      }, 2300);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    } else {
      setDeployStep(0);
      setIsDeploying(false);
    }
  }, [isOpen]);

  if (!isOpen || !project) return null;

  const handleCopyUrl = () => {
    playSound('pop');
    navigator.clipboard.writeText(simulatedUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-3xl shadow-2xl overflow-hidden p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Déploiement Instantané</h3>
              <p className="text-xs text-slate-400">Publication Cloud mondiale CDN</p>
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

        {/* Steps Progress */}
        <div className="space-y-3 p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
          <div className="flex items-center space-x-3 text-xs">
            {deployStep > 1 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : deployStep === 1 ? (
              <Loader2 className="w-4 h-4 text-violet-400 animate-spin shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
            )}
            <span className={deployStep >= 1 ? 'text-white font-medium' : 'text-slate-500'}>
              Minification des assets HTML & Tailwind
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            {deployStep > 2 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : deployStep === 2 ? (
              <Loader2 className="w-4 h-4 text-violet-400 animate-spin shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
            )}
            <span className={deployStep >= 2 ? 'text-white font-medium' : 'text-slate-500'}>
              Génération du certificat SSL / HTTPS
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            {deployStep > 3 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : deployStep === 3 ? (
              <Loader2 className="w-4 h-4 text-violet-400 animate-spin shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
            )}
            <span className={deployStep >= 3 ? 'text-white font-medium' : 'text-slate-500'}>
              Propagation sur le réseau Edge mondial
            </span>
          </div>
        </div>

        {/* Success Box */}
        {deployStep === 4 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl text-center space-y-2">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>En Ligne & Actif</span>
              </div>
              <h4 className="text-sm font-bold text-white">Votre application est déployée !</h4>
              <p className="text-xs text-slate-400">
                Accessible instantanément depuis n'importe quel appareil.
              </p>
            </div>

            {/* URL bar */}
            <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 p-2 rounded-xl">
              <Globe className="w-4 h-4 text-violet-400 ml-1 shrink-0" />
              <input
                type="text"
                readOnly
                value={simulatedUrl}
                className="bg-transparent text-xs text-slate-200 flex-1 outline-none font-mono"
              />
              <button
                onClick={handleCopyUrl}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                title="Copier le lien"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              onClick={() => {
                const blob = new Blob([project.html], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
              }}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-violet-600/25 transition flex items-center justify-center space-x-2 text-xs"
            >
              <span>Tester le lien en direct</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
