import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar, 
  Sparkles, 
  Dumbbell, 
  Activity, 
  Scale,
  TrendingDown,
  BarChart3
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
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [sessionLogs, setSessionLogs] = useState<WorkoutSessionLog[]>([]);
  const [inputWeight, setInputWeight] = useState<number | string>(profile.weightKg);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState<'weight' | 'tonnage'>('weight');

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
  const initialWeight = weightLogs.length > 0 ? weightLogs[0].weightKg : profile.weightKg;
  const currentWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weightKg : profile.weightKg;
  const currentEma = weightLogs.length > 0 && weightLogs[weightLogs.length - 1].emaWeightKg
    ? weightLogs[weightLogs.length - 1].emaWeightKg
    : currentWeight;
  const deltaWeight = Number((currentWeight - initialWeight).toFixed(1));

  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto p-4 animate-in fade-in duration-300">
      {/* Check-In CTA Banner (MacroFactor Style) */}
      <div className="p-5 rounded-3xl bg-[#090F1E] border border-white/[0.09] shadow-xl space-y-3.5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-wider font-mono flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Controle em Malha Fechada
            </span>
            <h3 className="text-base font-extrabold text-white font-display">
              Check-In Semanal & Diagnóstico
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              O algoritmo avalia sua taxa de perda real contra o déficit calórico prescrito e recalibra sua meta automaticamente.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCheckInOpen(true)}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-teal-500 to-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-blue-500/20 btn-tactile flex items-center justify-center gap-2"
        >
          <Activity className="w-4 h-4" />
          <span>Fazer Check-In & Diagnóstico Semanal</span>
        </button>
      </div>

      {/* Primary Telemetry Metrics Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Weight & EMA Card */}
        <div className="p-4 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-sm space-y-1.5">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
            <Scale className="w-4 h-4 text-emerald-400" />
            <span className="uppercase tracking-wider font-bold">Peso / Tendência EMA</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-white font-mono">
              {currentWeight} <span className="text-xs text-slate-400 font-normal">kg</span>
            </h3>
            {deltaWeight !== 0 && (
              <span
                className={`text-xs font-mono font-bold ${
                  deltaWeight < 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {deltaWeight > 0 ? `+${deltaWeight}` : deltaWeight} kg
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 font-mono">
            Tendência: <strong className="text-emerald-400">{currentEma?.toFixed(1)} kg</strong>
          </p>
        </div>

        {/* Tonnage / Workouts Card */}
        <div className="p-4 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-sm space-y-1.5">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
            <Dumbbell className="w-4 h-4 text-blue-400" />
            <span className="uppercase tracking-wider font-bold">Volume Acumulado</span>
          </div>
          <h3 className="text-2xl font-black text-white font-mono">
            {(totalTonnageKg / 1000).toFixed(1)} <span className="text-xs text-slate-400 font-normal">toneladas</span>
          </h3>
          <p className="text-[10px] text-slate-400 font-mono">
            <strong className="text-white">{totalWorkouts}</strong> {totalWorkouts === 1 ? 'sessão concluída' : 'sessões concluídas'}
          </p>
        </div>
      </div>

      {/* Visual Analytics Chart Switcher */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 p-1 bg-[#060A14] border border-white/[0.06] rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveChartTab('weight')}
            className={`flex-1 py-2 px-3 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-1.5 transition-all btn-tactile ${
              activeChartTab === 'weight'
                ? 'btn-lime text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Tendência de Peso (EMA)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChartTab('tonnage')}
            className={`flex-1 py-2 px-3 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-1.5 transition-all btn-tactile ${
              activeChartTab === 'tonnage'
                ? 'btn-lime text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Volume Semanal</span>
          </button>
        </div>

        {/* Active Chart Component */}
        {activeChartTab === 'weight' ? (
          <WeightTrendChart logs={weightLogs} />
        ) : (
          <VolumeTonnageChart sessions={sessionLogs} />
        )}
      </div>

      {/* Fast Daily Weight Logger */}
      <div className="p-4 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
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
            className="flex-1 px-4 py-2.5 bg-[#060A14] border border-white/[0.08] rounded-2xl text-sm font-bold text-white text-center font-mono focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 btn-tactile"
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
                      <span className="text-[10px] text-emerald-400">
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
