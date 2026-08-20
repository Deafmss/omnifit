import React from 'react';
import { Utensils, Dumbbell, TrendingUp } from 'lucide-react';

type TabId = 'diet' | 'workout' | 'progress';

interface BottomNavProps {
  activeTab: TabId;
  onChangeTab: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'diet', label: 'Dieta', icon: Utensils },
  { id: 'workout', label: 'Treino', icon: Dumbbell },
  { id: 'progress', label: 'Progresso', icon: TrendingUp }
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  return (
    <nav
      role="tablist"
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#050811]/90 backdrop-blur-2xl border-t border-white/[0.08] safe-bottom"
    >
      <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-3">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;

          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onChangeTab(id)}
              className={`flex flex-col items-center gap-1 py-1 px-4 rounded-2xl btn-tactile transition-all ${
                isActive
                  ? 'text-[#A3E635] font-extrabold'
                  : 'text-slate-500 hover:text-slate-300 font-medium'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-[#84CC16]/20 text-[#A3E635] border border-[#84CC16]/30 glow-lime'
                    : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
