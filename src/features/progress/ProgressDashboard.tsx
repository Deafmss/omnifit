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
import { todayLocal } from '../../core/utils/dateUtils';
import { db, getWeightHistory, logWeightEntry } from '../../core/storage/db';
import { CheckInModal } from './CheckInModal';
import { WeightTrendChart } from './WeightTrendChart';
import { VolumeTonnageChart } from './VolumeTonnageChart';
import { IntakeHistoryChart } from './IntakeHistoryChart';
import { StrengthProgressChart } from './StrengthProgressChart';
import { WorkoutFrequencyTracker } from '../workout/WorkoutFrequencyTracker';

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const wLogs = await getWeightHistory();
      setWeightLogs(wLogs);

      const sLogs = (await db.sessionLogs.toArray()).sort((a, b) => b.date.localeCompare(a.date));
      setSessionLogs(sLogs);
      setErrorMsg(null);
    } catch (err) {
      console.error('Erro ao carregar o progresso:', err);
      setErrorMsg('Não foi possível carregar seu histórico. Recarregue a página.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogWeight = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = Number(inputWeight);
    // Faixa fisiologicamente plausível: evita gravar 5 kg ou 900 kg por engano.
    if (!Number.isFinite(parsed) || parsed < 30 || parsed > 300) {
      setErrorMsg('Informe um peso entre 30 e 300 kg.');
      return;
    }

    try {
      await logWeightEntry(todayLocal(), parsed);
      await loadData();
      onProfileUpdated();
    } catch (err) {
      console.error('Erro ao registrar pesagem:', err);
      setErrorMsg('Não foi possível registrar sua pesagem. Tente novamente.');
    }
  };

  // Métricas acumuladas — apenas de sessões efetivamente concluídas.
  const completedSessions = sessionLogs.filter((s) => s.completed);
  const totalTonnageKg = completedSessions.reduce((acc, s) => acc + (s.totalVolumeLoadKg || 0), 0);
  const totalWorkouts = completedSessions.length;

  // Soma o gasto real gravado em cada sessão. O valor anterior era
  // `2350 + tonelagem * 0.15`, uma constante inventada que exibia 2350 kcal
  // mesmo sem nenhum treino registrado.
  const totalCaloriesBurned = completedSessions.reduce(
    (acc, s) => acc + (s.caloriesBurnedEstimate || 0),
    0
  );

  return (
    <div className="space-y-4 pb-28 max-w-lg mx-auto p-4 animate-in fade-in duration-300">
      {errorMsg && (
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold">
          {errorMsg}
        </div>
      )}
      {/* Top Segmented Tabs (Gym UI Kit Style) */}
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

      {/* ABA 1: VISÃO GERAL */}
      {activeTab === 'overview' && (
        <div className="space-y-4 animate-in fade-in duration-200">
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

          {/* Weekly Frequency & Tonnage Chart */}
          <VolumeTonnageChart sessions={sessionLogs} />

          {/* 2-Column Mini Sparklines Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-4 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-sm space-y-2 relative overflow-hidden">
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-slate-300">Queima Total</span>
              </div>
              <h3 className="text-2xl font-black text-white font-mono">
                {totalCaloriesBurned} <span className="text-xs text-slate-400 font-normal">kcal</span>
              </h3>
            </div>

            <div className="p-4 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-sm space-y-2 relative overflow-hidden">
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                <Dumbbell className="w-4 h-4 text-[#A3E635]" />
                <span className="font-bold text-slate-300">Volume Total</span>
              </div>
              <h3 className="text-2xl font-black text-white font-mono">
                {(totalTonnageKg / 1000).toFixed(1)} <span className="text-xs text-slate-400 font-normal">ton</span>
              </h3>
            </div>
          </div>

          {/* Goal Progress Bar */}
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
        </div>
      )}

      {/* ABA 2: TREINOS & FREQUÊNCIA */}
      {activeTab === 'workouts' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <WorkoutFrequencyTracker targetWeeklyDays={profile.trainingDaysPerWeek || 4} />
          <StrengthProgressChart sessions={sessionLogs} />

          <VolumeTonnageChart sessions={sessionLogs} />

          {/* Recent Workout Sessions History */}
          <div className="p-4 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono block">
                Histórico Recente de Sessões
              </span>
              <span className="text-[10px] font-mono text-[#A3E635] font-bold">
                {sessionLogs.length} concluídos
              </span>
            </div>

            {sessionLogs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                Nenhum treino concluído ainda. Inicie um treino hoje!
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {sessionLogs.slice(0, 10).map((s) => (
                  <div
                    key={s.id || `${s.date}-${s.name}`}
                    className="p-3 rounded-2xl bg-[#060A14] border border-white/[0.04] flex items-center justify-between text-xs"
                  >
                    <div>
                      <h4 className="font-bold text-white font-display truncate max-w-[180px]">
                        {s.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {s.date} &bull; {s.durationMinutes} min
                      </p>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-xs font-bold text-[#A3E635] block">
                        {(s.totalVolumeLoadKg / 1000).toFixed(1)}t
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        ~{s.caloriesBurnedEstimate} kcal
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 3: MÉTRICAS & PESAGENS */}
      {activeTab === 'body' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Histórico do diário alimentar */}
          <IntakeHistoryChart targetCalories={stats.targetCalories} days={14} />

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
                className="px-5 py-2.5 rounded-2xl btn-lime text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5 font-mono"
              >
                <Plus className="w-4 h-4" />
                <span>Salvar</span>
              </button>
            </form>
          </div>

          {/* Weight Trend Chart */}
          <WeightTrendChart logs={weightLogs} />

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
        </div>
      )}

      {/* Check-In Modal */}
      {isCheckInOpen && (
        <CheckInModal
          isOpen
          onClose={() => setIsCheckInOpen(false)}
          profile={profile}
          stats={stats}
          weightLogs={weightLogs}
          onRecalibrated={() => {
            loadData();
            onProfileUpdated();
          }}
        />
      )}
    </div>
  );
};
