import React from 'react';
import { Utensils, Dumbbell, TrendingUp } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'diet' | 'workout' | 'progress';
  onChangeTab: (tab: 'diet' | 'workout' | 'progress') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#050811]/90 backdrop-blur-2xl border-t border-white/[0.08] safe-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-3">
        <button
          onClick={() => onChangeTab('diet')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-2xl btn-tactile transition-all ${
            activeTab === 'diet'
              ? 'text-[#A3E635] font-extrabold'
              : 'text-slate-500 hover:text-slate-300 font-medium'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === 'diet' ? 'bg-[#84CC16]/20 text-[#A3E635] border border-[#84CC16]/30 glow-lime' : ''
            }`}
          >
            <Utensils className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-mono">Dieta</span>
        </button>

        <button
          onClick={() => onChangeTab('workout')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-2xl btn-tactile transition-all ${
            activeTab === 'workout'
              ? 'text-[#A3E635] font-extrabold'
              : 'text-slate-500 hover:text-slate-300 font-medium'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === 'workout' ? 'bg-[#84CC16]/20 text-[#A3E635] border border-[#84CC16]/30 glow-lime' : ''
            }`}
          >
            <Dumbbell className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-mono">Treino</span>
        </button>

        <button
          onClick={() => onChangeTab('progress')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-2xl btn-tactile transition-all ${
            activeTab === 'progress'
              ? 'text-[#A3E635] font-extrabold'
              : 'text-slate-500 hover:text-slate-300 font-medium'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === 'progress' ? 'bg-[#84CC16]/20 text-[#A3E635] border border-[#84CC16]/30 glow-lime' : ''
            }`}
          >
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-mono">Progresso</span>
        </button>
      </div>
    </nav>
  );
};
