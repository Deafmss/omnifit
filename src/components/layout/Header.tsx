import React from 'react';
import { Flame, Dumbbell, Utensils, TrendingUp } from 'lucide-react';
import { UserProfile, MetabolicStats } from '../../core/storage/types';

interface HeaderProps {
  profile?: UserProfile;
  stats?: MetabolicStats;
  activeTab: 'diet' | 'workout' | 'progress';
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  stats,
  activeTab,
  onOpenSettings
}) => {
  const getTabTitle = () => {
    switch (activeTab) {
      case 'diet':
        return { title: 'Nutrição de Precisão', subtitle: 'Balanço calórico e tabela TACO' };
      case 'workout':
        return { title: 'Ficha & Biomecânica', subtitle: 'Volume MAV e sobrecarga progressiva' };
      case 'progress':
        return { title: 'Evolução Adaptativa', subtitle: 'Filtro EMA e taxa metabólica real' };
    }
  };

  const { title, subtitle } = getTabTitle();

  return (
    <header className="sticky top-0 z-40 bg-[#050811]/85 backdrop-blur-2xl border-b border-white/[0.08] px-4 py-3 safe-top">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#060A14] border border-[#84CC16]/30 flex items-center justify-center shadow-inner text-[#A3E635]">
            {activeTab === 'diet' && <Utensils className="w-5 h-5" />}
            {activeTab === 'workout' && <Dumbbell className="w-5 h-5" />}
            {activeTab === 'progress' && <TrendingUp className="w-5 h-5" />}
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight font-display">
              {title}
            </h1>
            <p className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">
              {subtitle}
            </p>
          </div>
        </div>

        {stats && profile && (
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0E1629] border border-white/[0.08] hover:border-amber-500/40 transition-all text-xs font-mono font-bold text-slate-200 btn-tactile shadow-sm"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>{stats.targetCalories} kcal</span>
          </button>
        )}
      </div>
    </header>
  );
};
