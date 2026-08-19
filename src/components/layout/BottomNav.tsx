import React from 'react';
import { Utensils, Dumbbell, TrendingUp } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'diet' | 'workout' | 'progress';
  onChangeTab: (tab: 'diet' | 'workout' | 'progress') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A1120]/95 backdrop-blur-xl border-t border-white/10 safe-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-4">
        <button
          onClick={() => onChangeTab('diet')}
          className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all ${
            activeTab === 'diet'
              ? 'text-blue-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200 font-medium'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === 'diet' ? 'bg-blue-500/20 text-blue-400 shadow-sm' : ''
            }`}
          >
            <Utensils className="w-5 h-5" />
          </div>
          <span className="text-[11px]">Dieta</span>
        </button>

        <button
          onClick={() => onChangeTab('workout')}
          className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all ${
            activeTab === 'workout'
              ? 'text-emerald-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200 font-medium'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === 'workout' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : ''
            }`}
          >
            <Dumbbell className="w-5 h-5" />
          </div>
          <span className="text-[11px]">Treino</span>
        </button>

        <button
          onClick={() => onChangeTab('progress')}
          className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all ${
            activeTab === 'progress'
              ? 'text-amber-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200 font-medium'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === 'progress' ? 'bg-amber-500/20 text-amber-400 shadow-sm' : ''
            }`}
          >
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-[11px]">Evolução</span>
        </button>
      </div>
    </nav>
  );
};
