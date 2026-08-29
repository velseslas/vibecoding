import React from 'react';
import { Layers, Sparkles, MessageSquare, ChevronRight } from 'lucide-react';
import { playSound } from '../utils/audio';

interface ComponentTreeProps {
  components: { name: string; description: string; selector?: string }[];
  onPromptForComponent: (componentName: string) => void;
}

export const ComponentTree: React.FC<ComponentTreeProps> = ({
  components,
  onPromptForComponent,
}) => {
  return (
    <div className="flex-1 bg-slate-950 p-6 overflow-y-auto select-none">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <div className="flex items-center space-x-2 text-violet-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>Architecture & Composants UI</span>
          </div>
          <h2 className="text-xl font-extrabold text-white">Structure Visuelle Découpée</h2>
          <p className="text-slate-400 text-xs mt-1">
            Voici les différents blocs qui composent votre application. Cliquez sur un composant pour lui adresser une demande spécifique à l'IA.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {components.map((comp, idx) => (
            <div
              key={idx}
              className="bg-slate-900/90 border border-slate-800 hover:border-violet-600/50 p-5 rounded-2xl transition group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-white group-hover:text-violet-300 transition">
                    {comp.name}
                  </span>
                  <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-400 font-mono">
                    #{idx + 1}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {comp.description}
                </p>
              </div>

              <button
                onClick={() => {
                  playSound('pop');
                  onPromptForComponent(comp.name);
                }}
                className="w-full py-2 bg-slate-950 hover:bg-violet-600 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5"
              >
                <Sparkles className="w-3 h-3 text-violet-400 group-hover:text-white" />
                <span>Modifier ce composant</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
