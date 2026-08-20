import React, { useEffect, useState } from 'react';
import { Flame, Trophy, Calendar, Check, Zap } from 'lucide-react';
import { getWorkoutFrequencyStats } from '../../core/storage/db';
import { todayLocal, toLocalDateString, startOfWeekMonday, addDays } from '../../core/utils/dateUtils';

interface WorkoutFrequencyTrackerProps {
  targetWeeklyDays?: number;
}

export const WorkoutFrequencyTracker: React.FC<WorkoutFrequencyTrackerProps> = ({
  targetWeeklyDays = 4
}) => {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getWorkoutFrequencyStats>> | null>(null);

  const loadStats = async () => {
    const data = await getWorkoutFrequencyStats(targetWeeklyDays);
    setStats(data);
  };

  useEffect(() => {
    loadStats();
  }, [targetWeeklyDays]);

  if (!stats) return null;

  // Monta a semana atual (Segunda a Domingo) em datas LOCAIS
  const now = new Date();
  const todayStr = todayLocal();
  const monday = startOfWeekMonday(now);

  const weekDays = [
    { short: 'SEG', full: 'Segunda' },
    { short: 'TER', full: 'Terça' },
    { short: 'QUA', full: 'Quarta' },
    { short: 'QUI', full: 'Quinta' },
    { short: 'SEX', full: 'Sexta' },
    { short: 'SÁB', full: 'Sábado' },
    { short: 'DOM', full: 'Domingo' }
  ].map((day, idx) => {
    const d = addDays(monday, idx);
    const dateStr = toLocalDateString(d);

    return {
      ...day,
      dateStr,
      dayNumber: d.getDate(),
      isCompleted: stats.completedDates.has(dateStr),
      isToday: dateStr === todayStr
    };
  });

  // Monta a matriz das últimas 4 semanas (28 dias) para o heatmap de consistência
  const fourWeeksMatrix: { dateStr: string; isCompleted: boolean; isToday: boolean }[][] = [];
  const startOf4Weeks = addDays(monday, -21); // 3 semanas antes da atual

  for (let w = 0; w < 4; w++) {
    const week: { dateStr: string; isCompleted: boolean; isToday: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const str = toLocalDateString(addDays(startOf4Weeks, w * 7 + d));
      week.push({
        dateStr: str,
        isCompleted: stats.completedDates.has(str),
        isToday: str === todayStr
      });
    }
    fourWeeksMatrix.push(week);
  }

  return (
    <div className="space-y-3.5">
      {/* Hero Streak & Weekly Goal Card (Gym UI Kit Style) */}
      <div className="p-4 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-xl space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Flame className="w-4 h-4 fill-amber-400" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
                Sequência Ativa
              </span>
              <h4 className="text-sm font-extrabold text-white font-display">
                {stats.currentStreak > 0 ? `${stats.currentStreak} dias consecutivos` : 'Inicie sua sequência hoje!'}
              </h4>
            </div>
          </div>

          <div className="text-right font-mono">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">
              Meta Semanal
            </span>
            <span className="text-xs font-black text-[#A3E635]">
              {stats.thisWeekDaysCount}/{stats.targetWeeklyDays} treinos ({stats.weeklyAdherencePercent}%)
            </span>
          </div>
        </div>

        {/* Progress Bar of Weekly Goal */}
        <div className="space-y-1">
          <div className="h-2 w-full bg-[#060A14] rounded-full overflow-hidden border border-white/[0.05]">
            <div
              style={{ width: `${stats.weeklyAdherencePercent}%` }}
              className="h-full rounded-full bg-[#84CC16] transition-all duration-500"
            />
          </div>
        </div>

        {/* Weekly 7-Day Matrix */}
        <div className="grid grid-cols-7 gap-1 pt-1">
          {weekDays.map((day) => (
            <div
              key={day.dateStr}
              className={`p-2 rounded-2xl border text-center flex flex-col items-center justify-between transition-all ${
                day.isCompleted
                  ? 'bg-[#84CC16]/15 border-[#84CC16]/40 text-[#A3E635]'
                  : day.isToday
                  ? 'bg-[#060A14] border-white/20 text-white'
                  : 'bg-[#060A14] border-white/[0.04] text-slate-500'
              }`}
            >
              <span className="text-[9px] font-extrabold font-mono uppercase">
                {day.short}
              </span>

              <div className="my-1 flex items-center justify-center">
                {day.isCompleted ? (
                  <div className="w-5 h-5 rounded-full bg-[#84CC16] text-slate-950 flex items-center justify-center shadow-sm">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <span className={`text-[11px] font-bold font-mono ${day.isToday ? 'text-white' : 'text-slate-500'}`}>
                    {day.dayNumber}
                  </span>
                )}
              </div>

              <span className="text-[8px] font-bold font-mono">
                {day.isCompleted ? 'FEITO' : day.isToday ? 'HOJE' : '-'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Consistency Matrix (Last 4 Weeks Heatmap) */}
      <div className="p-4 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#A3E635]" />
            <h4 className="text-xs font-extrabold text-white font-display">
              Matriz de Consistência (Últimas 4 Semanas)
            </h4>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            <strong className="text-white font-bold">{stats.thisMonthDaysCount}</strong> treinos neste mês
          </span>
        </div>

        {/* Heatmap Grid */}
        <div className="space-y-1.5 pt-1">
          {fourWeeksMatrix.map((week, wIdx) => (
            <div key={wIdx} className="grid grid-cols-7 gap-1.5 items-center">
              {week.map((day) => (
                <div
                  key={day.dateStr}
                  title={`${day.dateStr}: ${day.isCompleted ? 'Treino Concluído' : 'Sem treino'}`}
                  className={`h-4 rounded-lg transition-all border ${
                    day.isCompleted
                      ? 'bg-[#84CC16] border-[#A3E635] shadow-sm'
                      : day.isToday
                      ? 'bg-[#060A14] border-white/30'
                      : 'bg-[#060A14] border-white/[0.05]'
                  }`}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-white/[0.04]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-[#060A14] border border-white/10" />
            <span>Descanso</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-[#84CC16]" />
            <span className="text-[#A3E635] font-bold">Treino Concluído</span>
          </span>
        </div>
      </div>

      {/* Motivational Stats Grid */}
      <div className="grid grid-cols-3 gap-2 font-mono">
        <div className="p-3 rounded-2xl bg-[#090F1E] border border-white/[0.08] text-center space-y-0.5">
          <Trophy className="w-3.5 h-3.5 text-amber-400 mx-auto" />
          <span className="text-[9px] text-slate-400 block uppercase">Total Sessões</span>
          <strong className="text-sm font-black text-white">{stats.totalCompletedSessions}</strong>
        </div>

        <div className="p-3 rounded-2xl bg-[#090F1E] border border-white/[0.08] text-center space-y-0.5">
          <Zap className="w-3.5 h-3.5 text-[#A3E635] mx-auto" />
          <span className="text-[9px] text-slate-400 block uppercase">Tonelagem Mês</span>
          <strong className="text-sm font-black text-white">
            {(stats.monthVolumeLiftedKg / 1000).toFixed(1)}t
          </strong>
        </div>

        <div className="p-3 rounded-2xl bg-[#090F1E] border border-white/[0.08] text-center space-y-0.5">
          <Flame className="w-3.5 h-3.5 text-[#A3E635] mx-auto" />
          <span className="text-[9px] text-slate-400 block uppercase">Gasto no Mês</span>
          <strong className="text-sm font-black text-white">
            {stats.monthCaloriesBurned} kcal
          </strong>
        </div>
      </div>
    </div>
  );
};
