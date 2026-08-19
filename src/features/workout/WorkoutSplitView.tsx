import React, { useState, useEffect } from 'react';
import { 
  Play, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  RotateCcw 
} from 'lucide-react';
import { WorkoutRoutine, UserProfile, Exercise } from '../../core/storage/types';
import { db, generateDefaultRoutines } from '../../core/storage/db';
import { EXERCISE_DATABASE_MAP } from '../../core/data/exerciseDatabase';
import { MUSCLE_LABELS } from '../../core/math/trainingEngine';
import { ActiveWorkoutModal } from './ActiveWorkoutModal';
import { WorkoutAuditorModal } from './WorkoutAuditorModal';
import { ExerciseSelectorModal } from './ExerciseSelectorModal';

interface WorkoutSplitViewProps {
  profile: UserProfile;
}

export const WorkoutSplitView: React.FC<WorkoutSplitViewProps> = ({ profile }) => {
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [selectedRoutineIndex, setSelectedRoutineIndex] = useState<number>(0);
  const [activeRoutineToStart, setActiveRoutineToStart] = useState<WorkoutRoutine | null>(null);
  const [isAuditorOpen, setIsAuditorOpen] = useState<boolean>(false);
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState<boolean>(false);

  const loadRoutines = async () => {
    const list = await db.routines.toArray();
    setRoutines(list);
  };

  useEffect(() => {
    loadRoutines();
  }, []);

  const currentRoutine = routines[selectedRoutineIndex] || routines[0];

  const handleRegenerate = async () => {
    if (confirm('Deseja recalcular e regenerar as fichas com base no seu nível e frequência?')) {
      await generateDefaultRoutines(profile.trainingDaysPerWeek);
      loadRoutines();
      setSelectedRoutineIndex(0);
    }
  };

  const handleAddExercise = async (
    exercise: Exercise,
    targetSets: number,
    minReps: number,
    maxReps: number,
    restSeconds: number
  ) => {
    if (!currentRoutine?.id) return;

    const newExercises = [
      ...currentRoutine.exercises,
      {
        exerciseId: exercise.id,
        targetSets,
        minReps,
        maxReps,
        restSeconds
      }
    ];

    await db.routines.update(currentRoutine.id, { exercises: newExercises });
    loadRoutines();
    setIsAddExerciseOpen(false);
  };

  const handleRemoveExercise = async (exerciseIdx: number) => {
    if (!currentRoutine?.id) return;
    const newExercises = currentRoutine.exercises.filter((_, i) => i !== exerciseIdx);
    await db.routines.update(currentRoutine.id, { exercises: newExercises });
    loadRoutines();
  };

  return (
    <div className="space-y-5 pb-24 max-w-lg mx-auto p-4">
      {/* Top Controls */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setIsAuditorOpen(true)}
          className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-950/50 to-slate-900 border border-emerald-500/30 hover:border-emerald-500/60 text-emerald-400 text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Auditoria de Volume (MEV/MAV)</span>
        </button>

        <button
          onClick={handleRegenerate}
          className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white transition-all active:scale-95"
          title="Regenerar Fichas Científicas"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Routine Split Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {routines.map((r, idx) => (
          <button
            key={r.id || idx}
            onClick={() => setSelectedRoutineIndex(idx)}
            className={`py-2 px-4 rounded-xl border text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              selectedRoutineIndex === idx
                ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20 scale-[1.02]'
                : 'bg-slate-900/80 border-white/10 text-slate-400 hover:border-white/20'
            }`}
          >
            <span className="w-5 h-5 rounded-md bg-black/30 flex items-center justify-center font-mono text-[10px]">
              {r.splitCode}
            </span>
            <span>{r.name.split('-')[0].trim()}</span>
          </button>
        ))}
      </div>

      {/* Current Routine Card */}
      {currentRoutine && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-[#0D1527] border border-white/10 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-wider">
                  Divisão Selecionada
                </span>
                <h3 className="text-lg font-bold text-white font-display mt-0.5">
                  {currentRoutine.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {currentRoutine.exercises.length} exercícios planejados
                </p>
              </div>

              <button
                onClick={() => setIsAddExerciseOpen(true)}
                className="p-2 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
                title="Adicionar Exercício"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Adicionar</span>
              </button>
            </div>

            {/* Big Workout Start Button */}
            <button
              onClick={() => setActiveRoutineToStart(currentRoutine)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 hover:brightness-110 transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>INICIAR TREINO NA ACADEMIA ⚡</span>
            </button>
          </div>

          {/* Exercise List */}
          <div className="space-y-2.5">
            {currentRoutine.exercises.map((exEntry, exIdx) => {
              const exercise = EXERCISE_DATABASE_MAP.get(exEntry.exerciseId);
              if (!exercise) return null;

              return (
                <div
                  key={`${exEntry.exerciseId}-${exIdx}`}
                  className="p-4 rounded-2xl bg-[#0D1527] border border-white/5 hover:border-white/10 transition-all flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 shrink-0 font-mono font-bold text-xs">
                      #{exIdx + 1}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">
                        {exercise.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        <strong className="text-emerald-400 font-bold">{exEntry.targetSets}</strong> séries &bull; {exEntry.minReps}-{exEntry.maxReps} reps &bull; {exEntry.restSeconds}s
                      </p>
                      <span className="inline-block text-[10px] text-slate-500 font-medium">
                        {MUSCLE_LABELS[exercise.primaryMuscle]}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveExercise(exIdx)}
                    className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 active:scale-95"
                    title="Remover exercício da ficha"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Workout Session Modal */}
      {activeRoutineToStart && (
        <ActiveWorkoutModal
          isOpen={true}
          onClose={() => {
            setActiveRoutineToStart(null);
            loadRoutines();
          }}
          routine={activeRoutineToStart}
          profile={profile}
        />
      )}

      {/* Workout Auditor Modal */}
      <WorkoutAuditorModal
        isOpen={isAuditorOpen}
        onClose={() => setIsAuditorOpen(false)}
        routines={routines}
        level={profile.experienceLevel}
      />

      {/* Exercise Selector Modal */}
      <ExerciseSelectorModal
        isOpen={isAddExerciseOpen}
        onClose={() => setIsAddExerciseOpen(false)}
        onSelectExercise={handleAddExercise}
      />
    </div>
  );
};
