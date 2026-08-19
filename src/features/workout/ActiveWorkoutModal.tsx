import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  X, 
  Clock, 
  Trophy, 
  Zap
} from 'lucide-react';
import { WorkoutRoutine, WorkoutSessionLog, WorkoutExerciseLog, UserProfile } from '../../core/storage/types';
import { EXERCISE_DATABASE_MAP } from '../../core/data/exerciseDatabase';
import { evaluateDoubleProgression, estimateWorkoutCalories } from '../../core/math/trainingEngine';
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
  // Estado das séries de cada exercício
  const [exerciseLogs, setExerciseLogs] = useState<WorkoutExerciseLog[]>(() =>
    routine.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      sets: Array.from({ length: ex.targetSets }, (_, i) => ({
        setNumber: i + 1,
        weightKg: 20,
        reps: ex.minReps,
        completed: false
      }))
    }))
  );

  // Timer de treino total
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Cronômetro de descanso
  const [restSecondsRemaining, setRestSecondsRemaining] = useState<number | null>(null);

  // Feedback de sobrecarga progressiva
  const [progressionAlerts, setProgressionAlerts] = useState<string[]>([]);

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
      // Vibra o celular se suportado
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
      // Dispara descanso do exercício
      const routineEx = routine.exercises[exIdx];
      const restTime = routineEx?.restSeconds || 90;
      setRestSecondsRemaining(restTime);
    }
  };

  const handleFinishWorkout = async () => {
    // Avalia a progressão de cargas
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

    // Salva o log de treino na base IndexedDB
    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const caloriesBurned = estimateWorkoutCalories(durationMinutes, profile.weightKg, 6.0);

    const session: WorkoutSessionLog = {
      routineId: routine.id,
      name: routine.name,
      date: new Date().toISOString(),
      durationMinutes,
      caloriesBurnedEstimate: caloriesBurned,
      totalVolumeLoadKg: totalVolumeLoad,
      exerciseLogs,
      completed: true
    };

    await db.sessionLogs.add(session);

    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.5 }
    });
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070D18] flex flex-col text-slate-100 overflow-hidden">
      {/* Top Bar */}
      <div className="px-4 py-3 bg-[#0D1527] border-b border-white/10 flex items-center justify-between safe-top">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white bg-white/5 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-bold text-white font-display truncate max-w-[200px]">
              {routine.name}
            </h2>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleFinishWorkout}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 active:scale-95"
        >
          <Trophy className="w-4 h-4" />
          <span>Concluir Treino</span>
        </button>
      </div>

      {/* Rest Timer Floating Bar */}
      {restSecondsRemaining !== null && (
        <div className="bg-gradient-to-r from-blue-900/90 to-emerald-900/90 border-b border-white/10 px-4 py-2 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-200">Tempo de Descanso:</span>
            <span className="text-sm font-mono font-black text-white">
              {formatTimer(restSecondsRemaining)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setRestSecondsRemaining((s) => (s !== null ? s + 30 : 30))}
              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-bold text-slate-300"
            >
              +30s
            </button>
            <button
              onClick={() => setRestSecondsRemaining(null)}
              className="p-1 rounded bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Progression Alerts Banner */}
      {progressionAlerts.length > 0 && (
        <div className="p-4 bg-amber-950/40 border-b border-amber-500/30 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {exerciseLogs.map((exLog, exIdx) => {
          const exercise = EXERCISE_DATABASE_MAP.get(exLog.exerciseId);
          const routineEx = routine.exercises[exIdx];
          if (!exercise || !routineEx) return null;

          return (
            <div
              key={exLog.exerciseId}
              className="rounded-2xl bg-[#0D1527] border border-white/10 p-4 space-y-3 shadow-lg"
            >
              {/* Exercise Title */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <div>
                  <h3 className="text-sm font-bold text-white font-display">
                    {exercise.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Meta: {routineEx.targetSets} séries &bull; {routineEx.minReps}-{routineEx.maxReps} reps &bull; {routineEx.restSeconds}s descanso
                  </p>
                </div>
              </div>

              {/* Sets Table */}
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2">
                  <span className="col-span-2 text-center">Série</span>
                  <span className="col-span-4 text-center">Carga (kg)</span>
                  <span className="col-span-4 text-center">Reps</span>
                  <span className="col-span-2 text-center">Check</span>
                </div>

                {exLog.sets.map((set, setIdx) => (
                  <div
                    key={setIdx}
                    className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl border transition-all ${
                      set.completed
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : 'bg-slate-900/60 border-white/5'
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
                        className="w-full max-w-[70px] py-1 px-2 bg-slate-950 border border-white/10 rounded-lg text-center text-xs font-bold text-white font-mono focus:border-blue-500"
                      />
                    </div>

                    <div className="col-span-4 flex items-center justify-center">
                      <input
                        type="number"
                        value={set.reps}
                        onChange={(e) =>
                          handleUpdateSet(exIdx, setIdx, 'reps', e.target.value === '' ? '' : e.target.value)
                        }
                        className="w-full max-w-[70px] py-1 px-2 bg-slate-950 border border-white/10 rounded-lg text-center text-xs font-bold text-white font-mono focus:border-blue-500"
                      />
                    </div>

                    <div className="col-span-2 flex items-center justify-center">
                      <button
                        onClick={() => handleToggleSet(exIdx, setIdx)}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all active:scale-95 ${
                          set.completed
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                            : 'border-white/20 hover:border-emerald-400 text-slate-400'
                        }`}
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
