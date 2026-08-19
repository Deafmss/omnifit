import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Sparkles, 
  Dumbbell, 
  Activity, 
  Scale,
  Flame,
  Target
} from 'lucide-react';
import { UserProfile, MetabolicStats, WeightLog, WorkoutSessionLog } from '../../core/storage/types';
import { db, getWeightHistory, logWeightEntry } from '../../core/storage/db';
import { CheckInModal } from './CheckInModal';
import { WeightTrendChart } from './WeightTrendChart';
import { VolumeTonnageChart } from './VolumeTonnageChart';

interface ProgressDashboardProps {
  profile: UserProfile;
  stats: MetabolicStats;
  onProfileUpdated: () => void;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({
  profile,
  stats,
  onProfileUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'workouts' | 'body'>('overview');
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [sessionLogs, setSessionLogs] = useState<WorkoutSessionLog[]>([]);
  const [inputWeight, setInputWeight] = useState<number | string>(profile.weightKg);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);

  const loadData = async () => {
    const wLogs = await getWeightHistory();
    setWeightLogs(wLogs);

    const sLogs = (await db.sessionLogs.toArray()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setSessionLogs(sLogs);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWeight = typeof inputWeight === 'number' && inputWeight > 0 ? inputWeight : Number(inputWeight) || profile.weightKg;
    const today = new Date().toISOString().split('T')[0];
    await logWeightEntry(today, cleanWeight);
    loadData();
    onProfileUpdated();
  };

  // Métricas acumuladas
  const totalTonnageKg = sessionLogs.reduce((acc, s) => acc + s.totalVolumeLoadKg, 0);
  const totalWorkouts = sessionLogs.length;

  // Estimativa de calorias totais queimadas
  const totalCaloriesBurned = 2350 + Math.round(totalTonnageKg * 0.15);

  return (
    <div className="space-y-4 pb-28 max-w-lg mx-auto p-4 animate-in fade-in duration-300">
      {/* Top Segmented Tabs (Matching Reference Screen 4 "Progress" UI Kit) */}
      <div className="p-1 bg-[#060A14] border border-white/[0.08] rounded-2xl flex gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all text-center ${
            activeTab === 'overview'
              ? 'btn-lime text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Visão Geral
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('workouts')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all text-center ${
            activeTab === 'workouts'
              ? 'btn-lime text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Treinos
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('body')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all text-center ${
            activeTab === 'body'
              ? 'btn-lime text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Métricas
        </button>
      </div>

      {/* Check-In CTA Banner */}
      <div className="p-5 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-xl space-y-3 relative overflow-hidden">
        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-[#A3E635] uppercase tracking-wider font-mono flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Controle em Malha Fechada
            </span>
            <h3 className="text-base font-extrabold text-white font-display">
              Diagnóstico & Check-In Semanal
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              O algoritmo avalia sua taxa de perda real contra o déficit calórico e recalibra sua meta automaticamente.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCheckInOpen(true)}
          className="w-full py-3 px-4 rounded-2xl btn-lime text-slate-950 font-extrabold text-xs shadow-lg shadow-lime-500/20 flex items-center justify-center gap-2"
        >
          <Activity className="w-4 h-4" />
          <span>Fazer Check-In & Diagnóstico</span>
        </button>
      </div>

      {/* Weekly Frequency & Tonnage Chart (UI Kit Screen 4 Reference) */}
      <VolumeTonnageChart sessions={sessionLogs} />

      {/* 2-Column Mini Sparklines Grid (UI Kit Reference Style) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Calories Burned Sparkline */}
        <div className="p-4 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <Flame className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-slate-300">Queima Total</span>
          </div>

          <div>
            <h3 className="text-2xl font-black text-white font-mono">
              {totalCaloriesBurned} <span className="text-xs text-slate-400 font-normal">kcal</span>
            </h3>
          </div>

          {/* Mini Orange Sparkline SVG */}
          <div className="h-10 w-full pt-1">
            <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="sparkOrange" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M 0,25 Q 25,5 50,18 T 100,8 L 100,30 L 0,30 Z" fill="url(#sparkOrange)" />
              <path d="M 0,25 Q 25,5 50,18 T 100,8" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Volume Acumulado Sparkline */}
        <div className="p-4 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <Dumbbell className="w-4 h-4 text-[#A3E635]" />
            <span className="font-bold text-slate-300">Volume Total</span>
          </div>

          <div>
            <h3 className="text-2xl font-black text-white font-mono">
              {(totalTonnageKg / 1000).toFixed(1)} <span className="text-xs text-slate-400 font-normal">ton</span>
            </h3>
          </div>

          {/* Mini Purple/Lime Sparkline SVG */}
          <div className="h-10 w-full pt-1">
            <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="sparkPurple" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#84CC16" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#84CC16" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M 0,20 Q 25,28 50,10 T 100,4 L 100,30 L 0,30 Z" fill="url(#sparkPurple)" />
              <path d="M 0,20 Q 25,28 50,10 T 100,4" fill="none" stroke="#84CC16" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Goal Progress Bar (UI Kit Reference Style) */}
      <div className="p-4 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-sm space-y-2.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#A3E635]" />
            <span className="font-bold text-white">Progresso do Objetivo</span>
          </div>
          <span className="text-xs font-black text-[#A3E635]">78%</span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>{profile.goal === 'fat_loss' ? 'Perda de Gordura / Definição' : profile.goal === 'hypertrophy' ? 'Ganho de Massa Muscular' : 'Recomposição Corporal'}</span>
          <span className="font-mono text-white font-bold">{totalWorkouts} treinos concluídos</span>
        </div>

        <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
          <div className="h-full bg-[#84CC16] rounded-full transition-all duration-500 w-[78%]" />
        </div>
      </div>

      {/* Weight Trend Chart */}
      <WeightTrendChart logs={weightLogs} />

      {/* Fast Daily Weight Logger */}
      <div className="p-4 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#A3E635]" />
            <span className="text-xs font-bold text-white font-display">Registrar Pesagem em Jejum</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 font-bold">Hoje</span>
        </div>

        <form onSubmit={handleLogWeight} className="flex gap-2">
          <input
            type="number"
            step="0.1"
            value={inputWeight}
            onChange={(e) => setInputWeight(e.target.value === '' ? '' : e.target.value)}
            placeholder="Ex: 80.5"
            className="flex-1 px-4 py-2.5 bg-[#060A14] border border-white/[0.08] rounded-2xl text-sm font-bold text-white text-center font-mono focus:border-[#84CC16] focus:outline-none"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-2xl btn-lime text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Salvar</span>
          </button>
        </form>
      </div>

      {/* Recent Weight History Table */}
      <div className="p-4 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-sm space-y-3">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono block">
          Histórico de Pesagens Recentes
        </span>

        {weightLogs.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">
            Nenhuma pesagem cadastrada ainda.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {weightLogs
              .slice()
              .reverse()
              .map((log) => (
                <div
                  key={log.id || log.date}
                  className="p-2.5 rounded-2xl bg-[#060A14] border border-white/[0.04] flex items-center justify-between text-xs font-mono"
                >
                  <span className="text-slate-400">{log.date}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-bold">{log.weightKg} kg</span>
                    {log.emaWeightKg && (
                      <span className="text-[10px] text-[#A3E635]">
                        (EMA: {log.emaWeightKg.toFixed(1)})
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Check-In Modal */}
      <CheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        profile={profile}
        stats={stats}
        weightLogs={weightLogs}
        onRecalibrated={() => {
          loadData();
          onProfileUpdated();
        }}
      />
    </div>
  );
};
