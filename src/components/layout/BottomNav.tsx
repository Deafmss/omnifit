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
          className={`flex flex-col items-center gap-1 py-1.5 px-5 rounded-2xl btn-tactile transition-all ${
            activeTab === 'diet'
              ? 'text-blue-400 font-extrabold'
              : 'text-slate-500 hover:text-slate-300 font-medium'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === 'diet' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 glow-blue' : ''
            }`}
          >
            <Utensils className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-sans">Dieta</span>
        </button>

        <button
          onClick={() => onChangeTab('workout')}
          className={`flex flex-col items-center gap-1 py-1.5 px-5 rounded-2xl btn-tactile transition-all ${
            activeTab === 'workout'
              ? 'text-emerald-400 font-extrabold'
              : 'text-slate-500 hover:text-slate-300 font-medium'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === 'workout' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 glow-emerald' : ''
            }`}
          >
            <Dumbbell className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-sans">Treino</span>
        </button>

        <button
          onClick={() => onChangeTab('progress')}
          className={`flex flex-col items-center gap-1 py-1.5 px-5 rounded-2xl btn-tactile transition-all ${
            activeTab === 'progress'
              ? 'text-amber-400 font-extrabold'
              : 'text-slate-500 hover:text-slate-300 font-medium'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === 'progress' ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30 glow-amber' : ''
            }`}
          >
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-sans">Evolução</span>
        </button>
      </div>
    </nav>
  );
};
