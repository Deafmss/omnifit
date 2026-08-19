import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  X, 
  Check, 
  Clock, 
  Trophy, 
  Zap, 
  Flame 
} from 'lucide-react';
import { WorkoutRoutine, WorkoutSessionLog, UserProfile, WorkoutExerciseLog } from '../../core/storage/types';
import { EXERCISE_DATABASE_MAP } from '../../core/data/exerciseDatabase';
import { estimateWorkoutCalories, evaluateDoubleProgression } from '../../core/math/trainingEngine';
import { db } from '../../core/storage/db';

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

  // Inicializa logs das séries
  const [exerciseLogs, setExerciseLogs] = useState<WorkoutExerciseLog[]>(() =>
    routine.exercises.map((item) => ({
      exerciseId: item.exerciseId,
      sets: Array.from({ length: item.targetSets }).map((_, sIdx) => ({
        setNumber: sIdx + 1,
        weightKg: 20,
        reps: item.minReps,
        completed: false
      }))
    }))
  );

  const [progressionAlerts, setProgressionAlerts] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [summaryData, setSummaryData] = useState<{ calories: number; volume: number } | null>(null);

  // Timer da sessão
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen) {
      interval = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen]);

  // Timer de descanso
  useEffect(() => {
    let restInterval: NodeJS.Timeout;
    if (restSecondsRemaining !== null && restSecondsRemaining > 0) {
      restInterval = setInterval(() => {
        setRestSecondsRemaining((s) => (s !== null ? s - 1 : null));
      }, 1000);
    } else if (restSecondsRemaining === 0) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    }
    return () => clearInterval(restInterval);
  }, [restSecondsRemaining]);

  if (!isOpen) return null;

  const handleUpdateSet = (exIdx: number, setIdx: number, field: 'weightKg' | 'reps', val: number | string) => {
    const newLogs = [...exerciseLogs];
    newLogs[exIdx].sets[setIdx][field] = val;
    setExerciseLogs(newLogs);
  };

  const handleToggleSet = (exIdx: number, setIdx: number) => {
    const newLogs = [...exerciseLogs];
    const isNowCompleted = !newLogs[exIdx].sets[setIdx].completed;
    newLogs[exIdx].sets[setIdx].completed = isNowCompleted;
    setExerciseLogs(newLogs);

    if (isNowCompleted) {
      const routineEx = routine.exercises[exIdx];
      const restTime = routineEx?.restSeconds || 90;
      setRestSecondsRemaining(restTime);
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

    const durationMin = Math.max(10, Math.round(elapsedSeconds / 60));
    const caloriesBurned = estimateWorkoutCalories(
      durationMin,
      profile.weightKg
    );

    const session: WorkoutSessionLog = {
      routineId: routine.id,
      name: routine.name,
      date: new Date().toISOString().split('T')[0],
      durationMinutes: Math.round(elapsedSeconds / 60),
      caloriesBurnedEstimate: caloriesBurned,
      totalVolumeLoadKg: totalVolumeLoad,
      exerciseLogs,
      completed: true
    };

    await db.sessionLogs.add(session);

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
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-extrabold text-xs shadow-lg shadow-emerald-500/20 btn-tactile flex items-center gap-1.5"
        >
          <Trophy className="w-4 h-4" />
          <span>Concluir Treino</span>
        </button>
      </div>

      {/* Rest Timer Floating Bar */}
      {restSecondsRemaining !== null && (
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-emerald-950 border-b border-white/10 px-4 py-2.5 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-200">Tempo de Descanso:</span>
            <span className="text-sm font-mono font-black text-white glow-emerald">
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
                        ? 'bg-emerald-950/20 border-emerald-500/40'
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
                        className="w-full max-w-[70px] py-1 px-2 bg-slate-950 border border-white/10 rounded-xl text-center text-xs font-bold text-white font-mono focus:border-blue-500"
                      />
                    </div>

                    <div className="col-span-4 flex items-center justify-center">
                      <input
                        type="number"
                        value={set.reps}
                        onChange={(e) =>
                          handleUpdateSet(exIdx, setIdx, 'reps', e.target.value === '' ? '' : e.target.value)
                        }
                        className="w-full max-w-[70px] py-1 px-2 bg-slate-950 border border-white/10 rounded-xl text-center text-xs font-bold text-white font-mono focus:border-blue-500"
                      />
                    </div>

                    <div className="col-span-2 flex items-center justify-center">
                      <button
                        onClick={() => handleToggleSet(exIdx, setIdx)}
                        className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all btn-tactile ${
                          set.completed
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-md glow-emerald'
                            : 'border-white/20 hover:border-emerald-400 bg-slate-950/60 text-slate-500'
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
          <div className="w-full max-w-sm rounded-3xl bg-[#090F1E] border border-emerald-500/30 p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-white font-display">
                Treino Finalizado com Sucesso!
              </h3>
              <p className="text-xs text-slate-400">
                Sessão registrada e computada no seu balanço metabólico diário.
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
                <Zap className="w-4 h-4 text-blue-400 mx-auto" />
                <span className="text-[10px] text-slate-500 block">Volume Total</span>
                <strong className="text-base font-bold text-white">
                  {summaryData.volume} kg
                </strong>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-display font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 btn-tactile"
            >
              Fechar & Voltar ao Painel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
