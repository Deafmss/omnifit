import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar, 
  Sparkles, 
  Dumbbell, 
  Activity, 
  Scale 
} from 'lucide-react';
import { UserProfile, MetabolicStats, WeightLog, WorkoutSessionLog } from '../../core/storage/types';
import { db, getWeightHistory, logWeightEntry } from '../../core/storage/db';
import { CheckInModal } from './CheckInModal';

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
  const [inputWeight, setInputWeight] = useState<number>(profile.weightKg);
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
    const today = new Date().toISOString().split('T')[0];
    await logWeightEntry(today, inputWeight);
    loadData();
    onProfileUpdated();
  };

  // Métricas acumuladas
  const totalTonnageKg = sessionLogs.reduce((acc, s) => acc + s.totalVolumeLoadKg, 0);
  const totalWorkouts = sessionLogs.length;
  const initialWeight = weightLogs.length > 0 ? weightLogs[0].weightKg : profile.weightKg;
  const currentWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weightKg : profile.weightKg;
  const deltaWeight = Number((currentWeight - initialWeight).toFixed(1));

  return (
    <div className="space-y-5 pb-24 max-w-lg mx-auto p-4">
      {/* Check-In CTA Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-900/40 via-purple-900/30 to-emerald-900/40 border border-blue-500/20 shadow-xl space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Controle em Malha Fechada
            </span>
            <h3 className="text-base font-bold text-white font-display">
              Check-In Semanal & Ajuste Fino
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              O motor analisa sua fome, energia e média móvel real de peso para recalibrar as calorias.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCheckInOpen(true)}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <Activity className="w-4 h-4" />
          <span>Fazer Check-In Semanal</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-[#0D1527] border border-white/10 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Variação de Peso
          </span>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-black text-white font-mono">
              {deltaWeight > 0 ? `+${deltaWeight}` : deltaWeight}
            </p>
            <span className="text-xs text-slate-400 font-mono">kg</span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium">
            Início: {initialWeight}kg &bull; Atual: {currentWeight}kg
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0D1527] border border-white/10 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Tonelagem Levantada
          </span>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-black text-emerald-400 font-mono">
              {totalTonnageKg >= 1000 ? `${(totalTonnageKg / 1000).toFixed(1)}k` : totalTonnageKg}
            </p>
            <span className="text-xs text-slate-400 font-mono">kg</span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium">
            {totalWorkouts} treinos concluídos
          </p>
        </div>
      </div>

      {/* Quick Weight Log Form */}
      <div className="p-4 rounded-2xl bg-[#0D1527] border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-blue-400" />
            <span>Registrar Pesagem Diária</span>
          </h4>
          <span className="text-[10px] text-slate-500">Hoje</span>
        </div>

        <form onSubmit={handleLogWeight} className="flex gap-2">
          <input
            type="number"
            step="0.1"
            value={inputWeight}
            onChange={(e) => setInputWeight(Number(e.target.value))}
            placeholder="Ex: 80.5"
            className="flex-1 px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm font-bold text-white text-center font-mono focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Salvar</span>
          </button>
        </form>
      </div>

      {/* Weight History Table with EMA */}
      <div className="p-4 rounded-2xl bg-[#0D1527] border border-white/10 space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
          Histórico com Média Móvel Suavizada (EMA)
        </h4>

        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
          {weightLogs.slice().reverse().map((w) => (
            <div
              key={w.id || w.date}
              className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-300 font-mono">{w.date}</span>
              </div>

              <div className="flex items-center gap-3 font-mono">
                <span className="text-slate-400">
                  Real: <strong className="text-white">{w.weightKg}kg</strong>
                </span>
                {w.emaWeightKg && (
                  <span className="text-emerald-400 font-bold">
                    EMA: {w.emaWeightKg}kg
                  </span>
                )}
              </div>
            </div>
          ))}

          {weightLogs.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-4">
              Nenhuma pesagem registrada ainda.
            </p>
          )}
        </div>
      </div>

      {/* Recent Workouts History */}
      <div className="p-4 rounded-2xl bg-[#0D1527] border border-white/10 space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Dumbbell className="w-4 h-4 text-emerald-400" />
          <span>Últimos Treinos Realizados</span>
        </h4>

        <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
          {sessionLogs.slice(0, 5).map((s) => (
            <div
              key={s.id || s.date}
              className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white truncate max-w-[200px]">
                  {s.name}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(s.date).toLocaleDateString('pt-BR')}
                </span>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                <span>⏱ {s.durationMinutes} min</span>
                <span>&bull;</span>
                <span className="text-emerald-400 font-bold">🏋️‍♂️ {s.totalVolumeLoadKg} kg total</span>
                <span>&bull;</span>
                <span className="text-amber-400">🔥 ~{s.caloriesBurnedEstimate} kcal</span>
              </div>
            </div>
          ))}

          {sessionLogs.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-4">
              Nenhum treino concluído ainda. Inicie um treino na aba Treino!
            </p>
          )}
        </div>
      </div>

      {/* Check In Modal */}
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
