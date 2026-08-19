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
        return { title: 'Nutrição & Dieta', subtitle: 'Balanço calórico e macros de precisão' };
      case 'workout':
        return { title: 'Treino & Volume', subtitle: 'Periodização e sobrecarga progressiva' };
      case 'progress':
        return { title: 'Evolução Adaptativa', subtitle: 'Tendência de peso e recalibração' };
    }
  };

  const { title, subtitle } = getTabTitle();

  return (
    <header className="sticky top-0 z-40 bg-[#070D18]/90 backdrop-blur-md border-b border-white/10 px-4 py-3 safe-top">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            {activeTab === 'diet' && <Utensils className="w-5 h-5 text-white" />}
            {activeTab === 'workout' && <Dumbbell className="w-5 h-5 text-white" />}
            {activeTab === 'progress' && <TrendingUp className="w-5 h-5 text-white" />}
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight font-display flex items-center gap-2">
              {title}
            </h1>
            <p className="text-xs text-slate-400 font-medium truncate max-w-[200px]">
              {subtitle}
            </p>
          </div>
        </div>

        {stats && profile && (
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-white/10 hover:border-blue-500/50 transition-all text-xs font-semibold text-slate-300 active:scale-95"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>{stats.targetCalories} kcal</span>
          </button>
        )}
      </div>
    </header>
  );
};
