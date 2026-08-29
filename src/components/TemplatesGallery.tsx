import React, { useState } from 'react';
import { 
  Sparkles, 
  Search, 
  Zap, 
  Flame, 
  Headphones, 
  ShoppingBag, 
  ArrowRight, 
  X, 
  Wand2, 
  Send,
  BookOpen,
  Layers,
  Code
} from 'lucide-react';
import { TemplateProject, VibeStyle } from '../types';
import { STARTER_TEMPLATES } from '../data/templates';
import { playSound } from '../utils/audio';

interface TemplatesGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: TemplateProject) => void;
  onCreateFromPrompt: (prompt: string, vibe: VibeStyle) => void;
  onOpenAcademy: () => void;
}

export const TemplatesGallery: React.FC<TemplatesGalleryProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  onCreateFromPrompt,
  onOpenAcademy,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('Tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [heroPrompt, setHeroPrompt] = useState('');
  const [heroVibe, setHeroVibe] = useState<VibeStyle>('modern-saas');

  if (!isOpen) return null;

  const categories = ['Tous', 'SaaS', 'Productivité', 'Fun & Jeux'];

  const filteredTemplates = STARTER_TEMPLATES.filter((t) => {
    const matchCat = activeCategory === 'Tous' || t.category === activeCategory;
    const matchSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroPrompt.trim()) return;
    playSound('magic');
    onCreateFromPrompt(heroPrompt.trim(), heroVibe);
    onClose();
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap':
        return <Zap className="w-5 h-5" />;
      case 'Flame':
        return <Flame className="w-5 h-5" />;
      case 'Headphones':
        return <Headphones className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 select-none overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 max-w-5xl w-full rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header with Close */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-white">VibeCode Starter Studio</h2>
              <p className="text-xs text-slate-400">Lancez un projet à partir d'une idée ou d'un modèle interactif</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                playSound('click');
                onOpenAcademy();
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Guide Débutant</span>
            </button>
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
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-8">
          {/* Custom Prompt Hero Creator */}
          <div className="bg-gradient-to-br from-violet-950/50 via-slate-900 to-slate-900 border-2 border-violet-500/30 p-6 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="max-w-2xl">
              <span className="px-3 py-1 bg-violet-600/30 border border-violet-500/40 text-violet-300 text-[11px] font-bold uppercase rounded-full tracking-wider inline-block mb-3">
                ✨ Création Directe par Prompt
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white mb-2">
                Qu'avez-vous envie de construire aujourd'hui ?
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Pas besoin de savoir coder. Décrivez votre projet comme vous le feriez à un ami.
              </p>

              <form onSubmit={handleHeroSubmit} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={heroPrompt}
                    onChange={(e) => setHeroPrompt(e.target.value)}
                    placeholder="Ex: Une application de recettes de cuisine saine avec filtre d'ingrédients et minuteur de cuisson..."
                    className="flex-1 px-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-xs"
                  />
                  <select
                    value={heroVibe}
                    onChange={(e) => setHeroVibe(e.target.value as VibeStyle)}
                    className="bg-slate-950 border border-slate-700/80 text-xs text-slate-300 rounded-2xl px-3 focus:outline-none focus:border-violet-500 hidden sm:block"
                  >
                    <option value="modern-saas">⚡ Modern SaaS</option>
                    <option value="pastel-dream">🌸 Pastel Dream</option>
                    <option value="cyberpunk">👾 Cyberpunk</option>
                    <option value="midnight-luxe">🌌 Midnight Luxe</option>
                  </select>
                  <button
                    type="submit"
                    className="px-5 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl shadow-lg shadow-violet-600/30 transition transform active:scale-95 text-xs flex items-center space-x-2 shrink-0"
                  >
                    <span>Créer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Templates Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base text-white">Modèles Débutants Prêts à l'Emploi</h3>
                <p className="text-xs text-slate-400">Applications complètes, fonctionnelles et personnalisables</p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      playSound('click');
                      setActiveCategory(cat);
                    }}
                    className={`px-3 py-1 rounded-lg transition ${
                      activeCategory === cat
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
              {filteredTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => {
                    playSound('magic');
                    onSelectTemplate(tpl);
                    onClose();
                  }}
                  className="bg-slate-950/60 border border-slate-800 hover:border-violet-600/60 p-5 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-violet-600/5 transition cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${tpl.colorGradient} flex items-center justify-center text-white shadow-md`}>
                        {getIcon(tpl.iconName)}
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-violet-300">
                        {tpl.badge}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-white group-hover:text-violet-300 transition mb-1">
                      {tpl.title}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      {tpl.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {tpl.components.slice(0, 3).map((comp, cIdx) => (
                        <span
                          key={cIdx}
                          className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-md border border-slate-800/80"
                        >
                          {comp.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-900 flex items-center justify-between text-xs font-semibold text-violet-400 group-hover:text-violet-300">
                    <span>Ouvrir & Personnaliser</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
