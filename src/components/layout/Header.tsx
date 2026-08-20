import React from 'react';
import { Flame, Dumbbell, Utensils, TrendingUp } from 'lucide-react';
import { UserProfile, MetabolicStats } from '../../core/storage/types';
import { UserAccount } from '../../core/auth/authService';

interface HeaderProps {
  profile?: UserProfile;
  stats?: MetabolicStats;
  account?: UserAccount | null;
  activeTab: 'diet' | 'workout' | 'progress';
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  stats,
  account,
  activeTab,
  onOpenSettings
}) => {
  const getTabTitle = () => {
    switch (activeTab) {
      case 'diet':
        return { title: 'Nutrição de Precisão', subtitle: 'Balanço calórico e tabela TACO' };
      case 'workout':
        return { title: 'Ficha & Biomecânica', subtitle: 'Volume MAV e sobrecarga' };
      case 'progress':
        return { title: 'Evolução Adaptativa', subtitle: 'Filtro EMA e taxa metabólica' };
    }
  };

  const { title, subtitle } = getTabTitle();

  return (
    <header className="sticky top-0 z-40 bg-[#050811]/90 backdrop-blur-2xl border-b border-white/[0.08] px-3 sm:px-4 py-2.5 sm:py-3 safe-top w-full overflow-hidden">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
        {/* Left Side: Icon & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#060A14] border border-[#84CC16]/30 flex items-center justify-center shadow-inner text-[#A3E635] shrink-0">
            {activeTab === 'diet' && <Utensils className="w-4 h-4 sm:w-5 sm:h-5" />}
            {activeTab === 'workout' && <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5" />}
            {activeTab === 'progress' && <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight font-display truncate">
              {title}
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right Side: Calorie Pill & Avatar Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {stats && profile && (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#0E1629] border border-white/[0.08] hover:border-amber-500/40 transition-all text-[11px] sm:text-xs font-mono font-bold text-slate-200 btn-tactile shadow-sm shrink-0"
              title="Meta Calórica Atual"
            >
              <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 fill-amber-400" />
              <span>{stats.targetCalories} kcal</span>
            </button>
          )}

          {account && (
            <button
              onClick={onOpenSettings}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#84CC16]/20 border border-[#84CC16]/40 text-[#A3E635] flex items-center justify-center text-[10px] sm:text-xs font-mono font-black uppercase hover:scale-105 transition-all shrink-0"
              title={`Perfil de ${account.name}`}
            >
              {account.name.slice(0, 2)}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
