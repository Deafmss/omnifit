import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  Check,
  Clock,
  Trophy,
  Zap,
  Flame,
  AlertCircle
} from 'lucide-react';
import { WorkoutRoutine, WorkoutSessionLog, UserProfile, WorkoutExerciseLog } from '../../core/storage/types';
import { EXERCISE_DATABASE_MAP } from '../../core/data/exerciseDatabase';
import {
  estimateWorkoutCalories,
  evaluateDoubleProgression,
  averageMetsForRoutine
} from '../../core/math/trainingEngine';
import { db, getLastWeightByExercise } from '../../core/storage/db';
import { pushSessionLog } from '../../core/supabase/cloudSync';
import { todayLocal } from '../../core/utils/dateUtils';

interface ActiveWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  routine: WorkoutRoutine;
  profile: UserProfile;
}

export const ActiveWorkoutModal: React.FC<ActiveWorkoutModalProps> = ({
  isOpen,
  onClose,
  routine,
  profile
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState<number | null>(null);

  // Inicializa logs das séries. A carga real de cada exercício é carregada do
  // histórico logo abaixo, para não recomeçar de um valor fixo a cada treino.
  const [exerciseLogs, setExerciseLogs] = useState<WorkoutExerciseLog[]>(() =>
    routine.exercises.map((item) => ({
      exerciseId: item.exerciseId,
      sets: Array.from({ length: item.targetSets }).map((_, sIdx) => ({
        setNumber: sIdx + 1,
        weightKg: 0,
        reps: item.minReps,
        completed: false
      }))
    }))
  );

  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Pré-carrega a última carga usada em cada exercício.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const lastWeights = await getLastWeightByExercise();
        if (cancelled) return;

        setExerciseLogs((current) =>
          current.map((log) => {
            const previous = lastWeights.get(log.exerciseId);
            if (!previous) return log;

            return {
              ...log,
              sets: log.sets.map((set) => {
                // Só preenche o que ainda está zerado: se o usuário começou a
                // digitar antes do histórico chegar, o que ele digitou vence.
                const current = Number(set.weightKg) || 0;
                return current > 0 ? set : { ...set, weightKg: previous };
              })
            };
          })
        );
      } catch (err) {
        console.warn('Não foi possível carregar o histórico de cargas:', err);
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const [progressionAlerts, setProgressionAlerts] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [summaryData, setSummaryData] = useState<{ calories: number; volume: number } | null>(null);

  // Timer da sessão (para de contar quando o treino é finalizado)
  useEffect(() => {
    if (!isOpen || isFinished) return;

    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isFinished]);

  // Timer de descanso
  useEffect(() => {
    if (restSecondsRemaining === null) return;

    if (restSecondsRemaining === 0) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
      return;
    }

    const restInterval = setInterval(() => {
      setRestSecondsRemaining((s) => (s !== null ? s - 1 : null));
    }, 1000);

    return () => clearInterval(restInterval);
  }, [restSecondsRemaining]);

  if (!isOpen) return null;

  const handleUpdateSet = (exIdx: number, setIdx: number, field: 'weightKg' | 'reps', val: number | string) => {
    setExerciseLogs((current) =>
      current.map((log, i) =>
        i !== exIdx
          ? log
          : {
              ...log,
              sets: log.sets.map((set, j) => (j === setIdx ? { ...set, [field]: val } : set))
            }
      )
    );
  };

  const handleToggleSet = (exIdx: number, setIdx: number) => {
    const isNowCompleted = !exerciseLogs[exIdx]?.sets[setIdx]?.completed;

    setExerciseLogs((current) =>
      current.map((log, i) =>
        i !== exIdx
          ? log
          : {
              ...log,
              sets: log.sets.map((set, j) => (j === setIdx ? { ...set, completed: isNowCompleted } : set))
            }
      )
    );

    if (isNowCompleted) {
      const routineEx = routine.exercises[exIdx];
      setRestSecondsRemaining(routineEx?.restSeconds || 90);
    }
  };

  const handleFinishWorkout = async () => {
    const alerts: string[] = [];
    let totalVolumeLoad = 0;

    exerciseLogs.forEach((exLog, idx) => {
      const routineEx = routine.exercises[idx];
      const exercise = EXERCISE_DATABASE_MAP.get(exLog.exerciseId);
      if (!routineEx || !exercise) return;

      const completedSets = exLog.sets.filter((s) => s.completed);
      const repsArray = completedSets.map((s) => Number(s.reps) || 0);
      const avgWeight = completedSets.length > 0
        ? completedSets.reduce((acc, s) => acc + (Number(s.weightKg) || 0), 0) / completedSets.length
        : 0;

      completedSets.forEach((s) => {
        totalVolumeLoad += (Number(s.weightKg) || 0) * (Number(s.reps) || 0);
      });

      const feedback = evaluateDoubleProgression(
        avgWeight,
        repsArray,
        routineEx.minReps,
        routineEx.maxReps,
        exercise.category === 'compound'
      );

      if (feedback.shouldIncreaseLoad) {
        alerts.push(`${exercise.name}: ${feedback.message}`);
      }
    });

    setProgressionAlerts(alerts);

    // Uma única duração para tudo: antes as calorias usavam o piso de 10 min
    // enquanto o log gravava a duração sem piso, então um treino de 40 s era
    // salvo como "0 min" com as calorias de 10 minutos.
    const durationMin = Math.max(1, Math.round(elapsedSeconds / 60));

    // MET médio real da ficha, em vez de 6,0 fixo para qualquer treino.
    const routineMets = averageMetsForRoutine(routine, EXERCISE_DATABASE_MAP);
    const caloriesBurned = estimateWorkoutCalories(durationMin, profile.weightKg, routineMets);

    const session: WorkoutSessionLog = {
      routineId: routine.id,
      name: routine.name,
      date: todayLocal(),
      durationMinutes: durationMin,
      caloriesBurnedEstimate: caloriesBurned,
      totalVolumeLoadKg: totalVolumeLoad,
      exerciseLogs,
      completed: true
    };

    // A celebração só acontece DEPOIS de a gravação ter dado certo: antes o
    // confete e a tela de sucesso apareciam mesmo com o treino perdido.
    setIsSaving(true);
    setSaveError(null);

    try {
      const savedId = (await db.sessionLogs.add(session)) as number;
      // Espelha na nuvem quando há sessão do Supabase; falha de rede não
      // invalida o registro local.
      void pushSessionLog({ ...session, id: savedId });
    } catch (err) {
      console.error('Erro ao salvar o treino:', err);
      setSaveError(
        'Não foi possível salvar este treino. Não feche a tela: verifique o armazenamento do navegador e tente novamente.'
      );
      return;
    } finally {
      setIsSaving(false);
    }

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    setSummaryData({ calories: caloriesBurned, volume: totalVolumeLoad });
    setIsFinished(true);
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050811] flex flex-col animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="bg-[#090F1E]/95 backdrop-blur-2xl border-b border-white/[0.08] px-4 py-3.5 flex items-center justify-between safe-top">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 btn-tactile"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-extrabold text-white font-display truncate max-w-[200px]">
              {routine.name}
            </h2>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold mt-0.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleFinishWorkout}
          disabled={isSaving}
          className="px-4 py-2 rounded-xl btn-lime text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-lime-500/20 flex items-center gap-1.5 disabled:opacity-60"
        >
          <Trophy className="w-4 h-4" />
          <span>{isSaving ? 'Salvando...' : 'Concluir Treino'}</span>
        </button>
      </div>

      {saveError && (
        <div className="mx-4 mt-3 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{saveError}</span>
        </div>
      )}

      {isLoadingHistory && (
        <div className="mx-4 mt-3 p-2.5 rounded-2xl bg-[#090F1E] border border-white/[0.06] text-[11px] font-mono text-slate-400 text-center">
          Carregando suas cargas anteriores...
        </div>
      )}

      {/* Rest Timer Floating Bar */}
      {restSecondsRemaining !== null && (
        <div className="bg-[#090F1E] border-b border-white/10 px-4 py-2.5 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#A3E635] animate-pulse" />
            <span className="text-xs font-bold text-slate-200">Tempo de Descanso:</span>
            <span className="text-sm font-mono font-black text-[#A3E635]">
              {formatTimer(restSecondsRemaining)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setRestSecondsRemaining((s) => (s !== null ? s + 30 : 30))}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-slate-200 btn-tactile"
            >
              +30s
            </button>
            <button
              onClick={() => setRestSecondsRemaining(null)}
              className="p-1 rounded-lg bg-white/10 text-slate-400 hover:text-white btn-tactile"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Progression Alerts Banner */}
      {progressionAlerts.length > 0 && (
        <div className="p-4 bg-amber-950/40 border-b border-amber-500/30 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider font-mono">
            <Zap className="w-4 h-4 fill-amber-400" />
            <span>Sobrecarga Progressiva Conquistada!</span>
          </div>
          {progressionAlerts.map((msg, i) => (
            <p key={i} className="text-xs text-slate-200 leading-relaxed font-medium">
              {msg}
            </p>
          ))}
        </div>
      )}

      {/* Exercise List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 pb-20 max-w-lg mx-auto w-full">
        {exerciseLogs.map((exLog, exIdx) => {
          const exercise = EXERCISE_DATABASE_MAP.get(exLog.exerciseId);
          const routineEx = routine.exercises[exIdx];
          if (!exercise || !routineEx) return null;

          return (
            <div
              key={exLog.exerciseId}
              className="rounded-3xl bg-[#090F1E] border border-white/[0.08] p-4 space-y-3 shadow-lg"
            >
              {/* Exercise Title */}
              <div className="flex items-center justify-between border-b border-white/[0.05] pb-2.5">
                <div>
                  <h3 className="font-extrabold text-sm text-white font-display">
                    {exercise.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Meta: {routineEx.minReps}-{routineEx.maxReps} reps &bull; Descanso: {routineEx.restSeconds}s
                  </p>
                </div>
                <span className="px-2.5 py-0.5 bg-[#060A14] text-slate-400 rounded-lg text-[10px] font-bold uppercase font-mono border border-white/5">
                  {exercise.category}
                </span>
              </div>

              {/* Sets Table */}
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2 font-mono">
                  <span className="col-span-2 text-center">Série</span>
                  <span className="col-span-4 text-center">Carga (kg)</span>
                  <span className="col-span-4 text-center">Reps</span>
                  <span className="col-span-2 text-center">Check</span>
                </div>

                {exLog.sets.map((set, setIdx) => (
                  <div
                    key={setIdx}
                    className={`grid grid-cols-12 gap-2 items-center p-2 rounded-2xl border transition-all ${
                      set.completed
                        ? 'bg-[#84CC16]/10 border-[#84CC16]/40'
                        : 'bg-[#060A14] border-white/[0.05]'
                    }`}
                  >
                    <span className="col-span-2 text-center text-xs font-mono font-bold text-slate-400">
                      {set.setNumber}
                    </span>

                    <div className="col-span-4 flex items-center justify-center">
                      <input
                        type="number"
                        value={set.weightKg}
                        onChange={(e) =>
                          handleUpdateSet(exIdx, setIdx, 'weightKg', e.target.value === '' ? '' : e.target.value)
                        }
                        className="w-full max-w-[70px] py-1 px-2 bg-slate-950 border border-white/10 rounded-xl text-center text-xs font-bold text-white font-mono focus:border-[#84CC16]"
                      />
                    </div>

                    <div className="col-span-4 flex items-center justify-center">
                      <input
                        type="number"
                        value={set.reps}
                        onChange={(e) =>
                          handleUpdateSet(exIdx, setIdx, 'reps', e.target.value === '' ? '' : e.target.value)
                        }
                        className="w-full max-w-[70px] py-1 px-2 bg-slate-950 border border-white/10 rounded-xl text-center text-xs font-bold text-white font-mono focus:border-[#84CC16]"
                      />
                    </div>

                    <div className="col-span-2 flex items-center justify-center">
                      <button
                        onClick={() => handleToggleSet(exIdx, setIdx)}
                        className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all btn-tactile ${
                          set.completed
                            ? 'bg-[#84CC16] border-[#84CC16] text-slate-950 shadow-md'
                            : 'border-white/20 hover:border-[#84CC16] bg-slate-950/60 text-slate-500'
                        }`}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Finished Summary Modal Overlay */}
      {isFinished && summaryData && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#090F1E] border border-[#84CC16]/30 p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-3xl bg-[#84CC16]/20 border border-[#84CC16]/40 text-[#A3E635] flex items-center justify-center mx-auto">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-white font-display">
                Treino Finalizado com Sucesso!
              </h3>
              <p className="text-xs text-slate-400">
                Sessão registrada e computada no seu balanço diário.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 py-2 font-mono">
              <div className="p-3 rounded-2xl bg-[#060A14] border border-white/5 space-y-1">
                <Flame className="w-4 h-4 text-amber-400 mx-auto" />
                <span className="text-[10px] text-slate-500 block">Gasto Estimado</span>
                <strong className="text-base font-bold text-white">
                  {summaryData.calories} kcal
                </strong>
              </div>

              <div className="p-3 rounded-2xl bg-[#060A14] border border-white/5 space-y-1">
                <Zap className="w-4 h-4 text-[#A3E635] mx-auto" />
                <span className="text-[10px] text-slate-500 block">Volume Total</span>
                <strong className="text-base font-bold text-white">
                  {summaryData.volume} kg
                </strong>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl btn-lime text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-lime-500/20"
            >
              Fechar & Voltar ao Painel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
