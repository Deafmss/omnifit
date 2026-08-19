import React, { useState, useEffect } from 'react';
import { 
  Play, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Pencil,
  Check,
  Layers,
  Clock,
  Dumbbell
} from 'lucide-react';
import { WorkoutRoutine, UserProfile, Exercise } from '../../core/storage/types';
import { db, applySplitTemplate, addNewRoutine, deleteRoutine, SplitTemplateType } from '../../core/storage/db';
import { EXERCISE_DATABASE_MAP } from '../../core/data/exerciseDatabase';
import { MUSCLE_LABELS } from '../../core/math/trainingEngine';
import { ActiveWorkoutModal } from './ActiveWorkoutModal';
import { WorkoutAuditorModal } from './WorkoutAuditorModal';
import { ExerciseSelectorModal } from './ExerciseSelectorModal';
import { SplitTemplateModal } from './SplitTemplateModal';

interface WorkoutSplitViewProps {
  profile: UserProfile;
}

export const WorkoutSplitView: React.FC<WorkoutSplitViewProps> = ({ profile }) => {
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [selectedRoutineIndex, setSelectedRoutineIndex] = useState<number>(0);
  const [activeRoutineToStart, setActiveRoutineToStart] = useState<WorkoutRoutine | null>(null);
  const [isAuditorOpen, setIsAuditorOpen] = useState<boolean>(false);
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState<boolean>(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);

  // Estados de edição do nome da ficha
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [tempTitle, setTempTitle] = useState<string>('');

  const loadRoutines = async () => {
    const list = await db.routines.toArray();
    setRoutines(list);
    if (selectedRoutineIndex >= list.length) {
      setSelectedRoutineIndex(Math.max(0, list.length - 1));
    }
  };

  useEffect(() => {
    loadRoutines();
  }, []);

  const currentRoutine = routines[selectedRoutineIndex] || routines[0];

  const handleApplyTemplate = async (templateId: SplitTemplateType) => {
    await applySplitTemplate(templateId);
    await loadRoutines();
    setSelectedRoutineIndex(0);
  };

  const handleAddNewSplit = async () => {
    await addNewRoutine();
    await loadRoutines();
    const updated = await db.routines.toArray();
    setSelectedRoutineIndex(updated.length - 1);
  };

  const handleDeleteSplit = async (routineId?: number) => {
    if (!routineId) return;
    if (confirm(`Tem certeza que deseja excluir esta ficha de treino?`)) {
      await deleteRoutine(routineId);
      await loadRoutines();
      setSelectedRoutineIndex(0);
    }
  };

  const handleSaveTitle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentRoutine?.id || !tempTitle.trim()) {
      setIsEditingTitle(false);
      return;
    }

    await db.routines.update(currentRoutine.id, { name: tempTitle.trim() });
    await loadRoutines();
    setIsEditingTitle(false);
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

    // Atualiza músculos alvo com base nos exercícios adicionados
    const newTargetMuscles = Array.from(
      new Set([...currentRoutine.targetMuscles, exercise.primaryMuscle])
    );

    await db.routines.update(currentRoutine.id, { 
      exercises: newExercises,
      targetMuscles: newTargetMuscles
    });
    loadRoutines();
  };

  const handleRemoveExercise = async (index: number) => {
    if (!currentRoutine?.id) return;
    const newExercises = currentRoutine.exercises.filter((_, i) => i !== index);
    await db.routines.update(currentRoutine.id, { exercises: newExercises });
    loadRoutines();
  };

  const handleUpdateExerciseConfig = async (
    index: number,
    deltaSets: number,
    deltaReps: number,
    deltaRest: number
  ) => {
    if (!currentRoutine?.id) return;
    const ex = currentRoutine.exercises[index];
    if (!ex) return;

    const newExercises = [...currentRoutine.exercises];
    newExercises[index] = {
      ...ex,
      targetSets: Math.max(1, Math.min(10, ex.targetSets + deltaSets)),
      minReps: Math.max(1, ex.minReps + deltaReps),
      maxReps: Math.max(ex.minReps + deltaReps, ex.maxReps + deltaReps),
      restSeconds: Math.max(30, ex.restSeconds + deltaRest)
    };

    await db.routines.update(currentRoutine.id, { exercises: newExercises });
    loadRoutines();
  };

  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto p-4 animate-in fade-in duration-300">
      {/* Splits Navigation & Controls Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsTemplateModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400 hover:bg-blue-600/25 text-xs font-bold transition-all flex items-center gap-1.5 btn-tactile shadow-sm"
              title="Trocar Divisão de Treino (PPL, ABCDE, Upper/Lower, Full Body...)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Trocar Divisão</span>
            </button>

            <button
              onClick={handleAddNewSplit}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-xs font-bold transition-all flex items-center gap-1 btn-tactile shadow-sm"
              title="Adicionar Nova Ficha (Treino D, E, F...)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Ficha</span>
            </button>
          </div>

          <button
            onClick={() => setIsAuditorOpen(true)}
            className="p-1.5 px-2.5 rounded-xl bg-[#090F1E] border border-white/[0.08] text-slate-300 hover:text-emerald-400 text-xs font-bold transition-all flex items-center gap-1.5 btn-tactile"
            title="Auditar Volume MAV/MRV"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Auditar Volume</span>
          </button>
        </div>

        {/* Horizontal Split Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {routines.map((r, idx) => (
            <button
              key={r.id || idx}
              onClick={() => {
                setSelectedRoutineIndex(idx);
                setIsEditingTitle(false);
              }}
              className={`py-2 px-4 rounded-2xl font-display font-extrabold text-xs tracking-wide transition-all whitespace-nowrap btn-tactile flex items-center gap-1.5 ${
                selectedRoutineIndex === idx
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 glow-emerald scale-[1.02]'
                  : 'bg-[#090F1E] border border-white/[0.08] text-slate-400 hover:text-white'
              }`}
            >
              <span>Treino {r.splitCode}</span>
              <span className="text-[10px] opacity-75 font-mono">
                ({r.exercises.length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Routine Detail Card */}
      {currentRoutine && (
        <div className="space-y-3.5">
          {/* Main Action Banner */}
          <div className="p-5 rounded-3xl bg-[#090F1E] border border-white/[0.09] shadow-xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start justify-between relative z-10 gap-3">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-mono">
                    Divisão {currentRoutine.splitCode}
                  </span>
                  {routines.length > 1 && currentRoutine.id && (
                    <button
                      onClick={() => handleDeleteSplit(currentRoutine.id)}
                      className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Excluir esta ficha de treino"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Editable Title */}
                {isEditingTitle ? (
                  <form onSubmit={handleSaveTitle} className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      className="w-full px-2.5 py-1 bg-slate-950 border border-emerald-500 rounded-xl text-sm font-extrabold text-white font-display focus:outline-none"
                      autoFocus
                      onBlur={() => handleSaveTitle()}
                    />
                    <button
                      type="submit"
                      className="p-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold btn-tactile"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2 group/title pt-0.5">
                    <h2 className="text-xl font-extrabold text-white font-display tracking-tight truncate">
                      {currentRoutine.name}
                    </h2>
                    <button
                      onClick={() => {
                        setTempTitle(currentRoutine.name);
                        setIsEditingTitle(true);
                      }}
                      className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 opacity-70 hover:opacity-100 transition-all"
                      title="Renomear Ficha"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <p className="text-xs text-slate-400">
                  {currentRoutine.exercises.length} exercícios &bull; Volume Total:{' '}
                  <span className="font-mono text-slate-200 font-bold">
                    {currentRoutine.exercises.reduce((a, b) => a + b.targetSets, 0)} séries
                  </span>
                </p>
              </div>
            </div>

            {/* Target Muscles Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {currentRoutine.targetMuscles.map((m) => (
                <span
                  key={m}
                  className="px-2.5 py-1 rounded-xl bg-[#060A14] border border-white/[0.06] text-[11px] font-bold text-slate-300 font-mono"
                >
                  {MUSCLE_LABELS[m] || m}
                </span>
              ))}
            </div>

            {/* Giant Start Button */}
            <button
              onClick={() => setActiveRoutineToStart(currentRoutine)}
              disabled={currentRoutine.exercises.length === 0}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 text-slate-950 font-display font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
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
            {currentRoutine.exercises.length === 0 ? (
              <div 
                onClick={() => setIsAddExerciseOpen(true)}
                className="p-8 rounded-3xl border border-dashed border-white/[0.09] text-center space-y-2 cursor-pointer hover:border-blue-500/40 hover:bg-blue-950/10 transition-all"
              >
                <Dumbbell className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs font-bold text-slate-300">Esta ficha está em branco.</p>
                <p className="text-[11px] text-slate-500">Toque aqui para adicionar os exercícios que você faz na sua academia!</p>
              </div>
            ) : (
              currentRoutine.exercises.map((item, idx) => {
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
                        
                        {/* Configuração Rápida de Séries & Reps */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-1">
                          {/* Sets Stepper */}
                          <div className="flex items-center gap-1 bg-[#060A14] px-1.5 py-0.5 rounded-lg border border-white/5">
                            <button
                              type="button"
                              onClick={() => handleUpdateExerciseConfig(idx, -1, 0, 0)}
                              className="text-slate-400 hover:text-white font-bold px-0.5"
                            >
                              -
                            </button>
                            <span className="text-emerald-400 font-bold px-0.5">{item.targetSets} séries</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateExerciseConfig(idx, 1, 0, 0)}
                              className="text-slate-400 hover:text-white font-bold px-0.5"
                            >
                              +
                            </button>
                          </div>

                          {/* Reps */}
                          <span>&bull;</span>
                          <span>{item.minReps}-{item.maxReps} reps</span>

                          {/* Rest */}
                          <span>&bull;</span>
                          <span className="flex items-center gap-0.5 text-slate-400">
                            <Clock className="w-2.5 h-2.5 text-blue-400" />
                            <span>{item.restSeconds}s</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
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
              })
            )}
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

      <SplitTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={handleApplyTemplate}
      />
    </div>
  );
};
