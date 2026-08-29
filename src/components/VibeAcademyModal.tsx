import React, { useState } from 'react';
import { 
  BookOpen, 
  X, 
  Sparkles, 
  Lightbulb, 
  Copy, 
  Check, 
  Code, 
  Flame, 
  ShieldCheck, 
  Wand2,
  ChevronRight
} from 'lucide-react';
import { playSound } from '../utils/audio';

interface VibeAcademyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUsePrompt: (promptText: string) => void;
}

export const VibeAcademyModal: React.FC<VibeAcademyModalProps> = ({
  isOpen,
  onClose,
  onUsePrompt,
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'formula' | 'lexicon' | 'ideas'>('rules');
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    playSound('pop');
    navigator.clipboard.writeText(text);
    setCopiedPrompt(text);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  const samplePrompts = [
    {
      title: '🎯 Suivi d\'Objectifs Gamifié',
      prompt: 'Crée une application de suivi d\'objectifs hebdomadaires avec une jauge de progression, un système de streaks en flammes, des confettis lors de la complétion et sauvegarde dans LocalStorage.',
    },
    {
      title: '🛍️ Boutique Artisanale E-Commerce',
      prompt: 'Crée une boutique minimaliste de céramiques artisanales avec filtre par catégorie (Tasses, Vases, Assiettes), panier d\'achat tiroir latéral, calcul du total avec code promo et modal de commande.',
    },
    {
      title: '📊 Calculateur de Budget & Dépenses',
      prompt: 'Crée un gestionnaire de budget personnel avec ajout de transactions (Revenu/Dépense), graphique en barres des dépenses par catégorie et calcul du solde restant mensuel.',
    },
    {
      title: '🎵 Générateur d\'Ambiance Sonore Lo-Fi',
      prompt: 'Crée un lecteur d\'ambiance zen avec curseurs pour mixer les sons de pluie, feu de cheminée et café, minuteur de concentration 25 minutes et bloc-notes minimaliste.',
    }
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 max-w-3xl w-full rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white">Académie du Vibecoding</h2>
              <p className="text-xs text-slate-400">Le guide complet pour créer des applications pro sans coder</p>
            </div>
          </div>
          <button
            onClick={() => {
              playSound('click');
              onClose();
            }}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('rules')}
            className={`py-3 px-3 border-b-2 transition ${
              activeTab === 'rules'
                ? 'border-violet-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🌟 Les 4 Piliers
          </button>
          <button
            onClick={() => setActiveTab('formula')}
            className={`py-3 px-3 border-b-2 transition ${
              activeTab === 'formula'
                ? 'border-violet-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🧪 Formule de Prompt
          </button>
          <button
            onClick={() => setActiveTab('ideas')}
            className={`py-3 px-3 border-b-2 transition ${
              activeTab === 'ideas'
                ? 'border-violet-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            💡 Exemples Clés en Main
          </button>
          <button
            onClick={() => setActiveTab('lexicon')}
            className={`py-3 px-3 border-b-2 transition ${
              activeTab === 'lexicon'
                ? 'border-violet-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📖 Lexique Débutant
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs leading-relaxed text-slate-300">
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-white">
                Le <strong>Vibecoding</strong> consiste à dialoguer avec l'IA comme avec un designer et développeur senior dans votre équipe. Pour obtenir un résultat spectaculaire, pensez toujours à ces 4 piliers :
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-violet-400 font-bold text-xs uppercase tracking-wider block mb-1">
                    1. L'Intention (Le Quoi)
                  </span>
                  <p className="text-slate-400">
                    Définissez clairement l'utilité : "Une app pour calculer son empreinte carbone", "Un quiz de cinéma".
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-pink-400 font-bold text-xs uppercase tracking-wider block mb-1">
                    2. Le Style Visuel (La Vibe)
                  </span>
                  <p className="text-slate-400">
                    Précisez l'ambiance : "Thème sombre élégant style Linear", "Palette pastel douce", "Néo-brutalisme pop".
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-emerald-400 font-bold text-xs uppercase tracking-wider block mb-1">
                    3. L'Interactivité (L'Action)
                  </span>
                  <p className="text-slate-400">
                    Quels sont les boutons ? "Un toggle mensuel/annuel", "Un minuteur dégressif", "Des confettis au clic".
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-amber-400 font-bold text-xs uppercase tracking-wider block mb-1">
                    4. La Persistance (La Mémoire)
                  </span>
                  <p className="text-slate-400">
                    Dites à l'IA : "Sauvegarde les entrées dans LocalStorage pour que mes données restent après rechargement".
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'formula' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">La formule magique du prompt parfait :</h3>
              
              <div className="p-4 bg-slate-950 border border-violet-800/40 rounded-2xl font-mono text-[11px] text-violet-300 relative">
                <code>
                  [RÔLE] Crée une application web interactive pour [OBJECTIF PRÉCIS].<br/><br/>
                  [STRUCTURE] Comprend un header avec logo et statut, une section principale avec [COMPOSANTS CLÉS], et un pied de page.<br/><br/>
                  [INTERACTION] L'utilisateur peut [ACTION 1], [ACTION 2], et [ACTION 3] avec retours visuels immédiats.<br/><br/>
                  [DONNÉES & STYLE] Stocke les entrées dans LocalStorage. Style moderne avec Tailwind CSS, palette [COULEURS], et animations fluides.
                </code>
              </div>

              <div className="p-4 bg-amber-950/30 border border-amber-800/40 rounded-2xl text-amber-200">
                <div className="flex items-center space-x-2 font-bold mb-1">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <span>Astuce de pro :</span>
                </div>
                <p>
                  Utilisez le bouton <strong>"Inspecteur Visuel"</strong> pour cliquer sur un élément précis dans l'aperçu et demander à l'IA de ne modifier que cet endroit !
                </p>
              </div>
            </div>
          )}

          {activeTab === 'ideas' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white mb-2">Prompts recommandés pour démarrer :</h3>
              {samplePrompts.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{item.title}</span>
                    <button
                      onClick={() => handleCopy(item.prompt)}
                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                      title="Copier le prompt"
                    >
                      {copiedPrompt === item.prompt ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="text-slate-400 text-xs">{item.prompt}</p>
                  <button
                    onClick={() => {
                      playSound('magic');
                      onUsePrompt(item.prompt);
                      onClose();
                    }}
                    className="self-end px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-xs flex items-center space-x-1 transition"
                  >
                    <span>Lancer ce projet</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'lexicon' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <strong className="text-white block mb-1">Tailwind CSS</strong>
                <p className="text-slate-400">Le système de styles le plus rapide au monde, utilisant des classes comme `bg-slate-900` ou `rounded-2xl`.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <strong className="text-white block mb-1">LocalStorage</strong>
                <p className="text-slate-400">Mémoire interne de votre navigateur permettant de sauvegarder des listes et réglages sans serveur.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <strong className="text-white block mb-1">Composant</strong>
                <p className="text-slate-400">Un bloc visuel réutilisable de l'interface (ex: Barre de navigation, Carte de tarif, Modale).</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <strong className="text-white block mb-1">Responsive Design</strong>
                <p className="text-slate-400">Capacité de l'application à s'adapter parfaitement sur grand écran d'ordinateur comme sur smartphone.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
