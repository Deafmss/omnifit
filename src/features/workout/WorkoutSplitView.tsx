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
  };

  const handleRemoveExercise = async (index: number) => {
    if (!currentRoutine?.id) return;
    const newExercises = currentRoutine.exercises.filter((_, i) => i !== index);
    await db.routines.update(currentRoutine.id, { exercises: newExercises });
    loadRoutines();
  };

  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto p-4 animate-in fade-in duration-300">
      {/* Splits Navigation Bar */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        {routines.map((r, idx) => (
          <button
            key={r.id || idx}
            onClick={() => setSelectedRoutineIndex(idx)}
            className={`py-2 px-4 rounded-2xl font-display font-extrabold text-xs tracking-wide transition-all whitespace-nowrap btn-tactile ${
              selectedRoutineIndex === idx
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 glow-emerald scale-[1.02]'
                : 'bg-[#090F1E] border border-white/[0.08] text-slate-400 hover:text-white'
            }`}
          >
            Treino {r.splitCode}
          </button>
        ))}

        <button
          onClick={handleRegenerate}
          className="p-2 rounded-2xl bg-[#090F1E] border border-white/[0.08] text-slate-400 hover:text-white transition-all btn-tactile ml-auto shrink-0"
          title="Regenerar Fichas Automáticas"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Routine Detail Card */}
      {currentRoutine && (
        <div className="space-y-3">
          {/* Main Action Banner */}
          <div className="p-5 rounded-3xl bg-[#090F1E] border border-white/[0.09] shadow-xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-mono">
                  Divisão {currentRoutine.splitCode}
                </span>
                <h2 className="text-xl font-extrabold text-white font-display tracking-tight mt-1">
                  {currentRoutine.name}
                </h2>
                <p className="text-xs text-slate-400">
                  {currentRoutine.exercises.length} exercícios &bull; Volume Total:{' '}
                  <span className="font-mono text-slate-200 font-bold">
                    {currentRoutine.exercises.reduce((a, b) => a + b.targetSets, 0)} séries
                  </span>
                </p>
              </div>

              <button
                onClick={() => setIsAuditorOpen(true)}
                className="p-2 rounded-2xl bg-[#060A14] border border-white/[0.08] text-slate-300 hover:text-emerald-400 text-xs font-bold transition-all flex items-center gap-1.5 btn-tactile"
                title="Auditar Volume MAV/MRV"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Auditar Volume</span>
              </button>
            </div>

            {/* Target Muscles Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {currentRoutine.targetMuscles.map((m) => (
                <span
                  key={m}
                  className="px-2.5 py-1 rounded-xl bg-[#060A14] border border-white/[0.06] text-[11px] font-bold text-slate-300 font-mono"
                >
                  {MUSCLE_LABELS[m]}
                </span>
              ))}
            </div>

            {/* Giant Start Button */}
            <button
              onClick={() => setActiveRoutineToStart(currentRoutine)}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 text-slate-950 font-display font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Iniciar Treino na Academia ⚡</span>
            </button>
          </div>

          {/* Exercises Header */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
              Sequência de Exercícios
            </span>

            <button
              onClick={() => setIsAddExerciseOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400 hover:bg-blue-600/25 text-xs font-bold transition-all flex items-center gap-1.5 btn-tactile"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Exercício</span>
            </button>
          </div>

          {/* Exercises List */}
          <div className="space-y-2.5">
            {currentRoutine.exercises.map((item, idx) => {
              const exercise = EXERCISE_DATABASE_MAP.get(item.exerciseId);
              if (!exercise) return null;

              return (
                <div
                  key={`${item.exerciseId}-${idx}`}
                  className="p-3.5 rounded-2xl bg-[#090F1E] border border-white/[0.08] shadow-sm flex items-center justify-between gap-3 hover:border-white/[0.14] transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#060A14] border border-white/[0.06] flex items-center justify-center text-xs font-black text-slate-400 font-mono shrink-0">
                      {idx + 1}
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-slate-100 truncate">
                        {exercise.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        <span className="text-emerald-400 font-bold">{item.targetSets} séries</span> &bull; {item.minReps}-{item.maxReps} reps &bull; {item.restSeconds}s descanso
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 rounded-lg bg-[#060A14] text-[10px] font-bold text-slate-400 uppercase font-mono border border-white/5">
                      {exercise.category}
                    </span>

                    <button
                      onClick={() => handleRemoveExercise(idx)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all btn-tactile"
                      title="Remover"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modais */}
      {activeRoutineToStart && (
        <ActiveWorkoutModal
          isOpen={true}
          onClose={() => setActiveRoutineToStart(null)}
          routine={activeRoutineToStart}
          profile={profile}
        />
      )}

      <WorkoutAuditorModal
        isOpen={isAuditorOpen}
        onClose={() => setIsAuditorOpen(false)}
        routines={routines}
        level={profile.experienceLevel}
      />

      <ExerciseSelectorModal
        isOpen={isAddExerciseOpen}
        onClose={() => setIsAddExerciseOpen(false)}
        onSelectExercise={handleAddExercise}
      />
    </div>
  );
};
