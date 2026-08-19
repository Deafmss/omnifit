import React, { useState, useEffect } from 'react';
import { 
  Play, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Pencil, 
  Check, 
  Layers, 
  Dumbbell, 
  Calendar, 
  Sparkles, 
  BedDouble 
} from 'lucide-react';
import { WorkoutRoutine, UserProfile, Exercise, WorkoutSessionLog } from '../../core/storage/types';
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

const DAYS_OF_WEEK = [
  { dayIndex: 1, short: 'SEG', full: 'Segunda-feira' },
  { dayIndex: 2, short: 'TER', full: 'Terça-feira' },
  { dayIndex: 3, short: 'QUA', full: 'Quarta-feira' },
  { dayIndex: 4, short: 'QUI', full: 'Quinta-feira' },
  { dayIndex: 5, short: 'SEX', full: 'Sexta-feira' },
  { dayIndex: 6, short: 'SÁB', full: 'Sábado' },
  { dayIndex: 0, short: 'DOM', full: 'Domingo' }
];

export const WorkoutSplitView: React.FC<WorkoutSplitViewProps> = ({ profile }) => {
  const todayDayIndex = new Date().getDay(); // 0 = Domingo, 1 = Segunda ... 6 = Sábado
  const [selectedDay, setSelectedDay] = useState<number>(todayDayIndex);

  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [sessionLogs, setSessionLogs] = useState<WorkoutSessionLog[]>([]);
  const [activeRoutineToStart, setActiveRoutineToStart] = useState<WorkoutRoutine | null>(null);
  const [isAuditorOpen, setIsAuditorOpen] = useState<boolean>(false);
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState<boolean>(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);

  // Estados de edição do nome da ficha
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [tempTitle, setTempTitle] = useState<string>('');

  const loadData = async () => {
    const list = await db.routines.toArray();
    for (let i = 0; i < list.length; i++) {
      if (list[i].dayOfWeek === undefined) {
        list[i].dayOfWeek = (i + 1) % 7;
        if (list[i].id) {
          await db.routines.update(list[i].id!, { dayOfWeek: (i + 1) % 7 });
        }
      }
    }
    setRoutines(list);

    const logs = await db.sessionLogs.toArray();
    setSessionLogs(logs);
  };

  useEffect(() => {
    loadData();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCompletedLog = sessionLogs.find((s) => s.date === todayStr && s.completed);

  // Mapa de dias da semana atual que têm treino concluído
  const now = new Date();
  const currentDayOfWeek = now.getDay();
  const distanceToMonday = (currentDayOfWeek + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - distanceToMonday);

  const currentWeekDatesMap = new Map<number, boolean>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dayIdx = d.getDay();
    const dStr = d.toISOString().split('T')[0];
    const isDone = sessionLogs.some((s) => s.date === dStr && s.completed);
    currentWeekDatesMap.set(dayIdx, isDone);
  }

  // Encontra a rotina correspondente ao dia selecionado
  const currentRoutine = routines.find((r) => r.dayOfWeek === selectedDay);
  const currentDayInfo = DAYS_OF_WEEK.find((d) => d.dayIndex === selectedDay) || DAYS_OF_WEEK[0];

  const handleApplyTemplate = async (templateId: SplitTemplateType) => {
    await applySplitTemplate(templateId);
    await loadData();
  };

  const handleCreateRoutineForSelectedDay = async () => {
    await addNewRoutine(`Treino de ${currentDayInfo.full}`, undefined, selectedDay);
    await loadData();
  };

  const handleDeleteSplit = async (routineId?: number) => {
    if (!routineId) return;
    if (confirm(`Tem certeza que deseja desvincular ou excluir o treino deste dia?`)) {
      await deleteRoutine(routineId);
      await loadData();
    }
  };

  const handleSaveTitle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentRoutine?.id || !tempTitle.trim()) {
      setIsEditingTitle(false);
      return;
    }

    await db.routines.update(currentRoutine.id, { name: tempTitle.trim() });
    await loadData();
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

    const newTargetMuscles = Array.from(
      new Set([...currentRoutine.targetMuscles, exercise.primaryMuscle])
    );

    await db.routines.update(currentRoutine.id, { 
      exercises: newExercises,
      targetMuscles: newTargetMuscles
    });
    loadData();
  };

  const handleRemoveExercise = async (index: number) => {
    if (!currentRoutine?.id) return;
    const newExercises = currentRoutine.exercises.filter((_, i) => i !== index);
    await db.routines.update(currentRoutine.id, { exercises: newExercises });
    loadData();
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
    loadData();
  };

  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto p-4 animate-in fade-in duration-300">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[#090F1E] border border-white/[0.08] hover:border-[#84CC16]/50 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 btn-tactile shadow-sm font-mono"
            title="Trocar Divisão de Treino (PPL, ABCDE, Upper/Lower, Full Body...)"
          >
            <Layers className="w-3.5 h-3.5 text-[#A3E635]" />
            <span>Divisões de Treino</span>
          </button>
        </div>

        <button
          onClick={() => setIsAuditorOpen(true)}
          className="p-1.5 px-2.5 rounded-xl bg-[#090F1E] border border-white/[0.08] text-slate-300 hover:text-[#A3E635] text-xs font-bold transition-all flex items-center gap-1.5 btn-tactile font-mono"
          title="Auditar Volume MAV/MRV"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#A3E635]" />
          <span className="hidden sm:inline">Auditar Volume</span>
        </button>
      </div>

      {/* Weekly Schedule Days Bar (Segunda a Domingo) */}
      <div className="p-1.5 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-lg">
        <div className="grid grid-cols-7 gap-1">
          {DAYS_OF_WEEK.map((d) => {
            const isToday = d.dayIndex === todayDayIndex;
            const isSelected = d.dayIndex === selectedDay;
            const hasRoutine = routines.some((r) => r.dayOfWeek === d.dayIndex);
            const isDayCompleted = currentWeekDatesMap.get(d.dayIndex);

            return (
              <button
                key={d.dayIndex}
                onClick={() => {
                  setSelectedDay(d.dayIndex);
                  setIsEditingTitle(false);
                }}
                className={`py-2 px-1 rounded-2xl flex flex-col items-center justify-between transition-all relative btn-tactile ${
                  isSelected
                    ? 'btn-lime text-slate-950 shadow-md font-black scale-[1.03]'
                    : isDayCompleted
                    ? 'bg-[#84CC16]/15 border border-[#84CC16]/40 text-[#A3E635]'
                    : isToday
                    ? 'bg-[#060A14] border border-[#84CC16]/60 text-[#A3E635]'
                    : 'bg-[#060A14] border border-white/[0.04] text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-[10px] font-bold tracking-wider font-mono">
                  {d.short}
                </span>

                {/* Indicator Dot or Check */}
                <div className="mt-1 flex items-center justify-center">
                  {isDayCompleted ? (
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${isSelected ? 'bg-slate-950 text-[#A3E635]' : 'bg-[#84CC16] text-slate-950'}`}>
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  ) : hasRoutine ? (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-slate-950' : 'bg-[#A3E635]'}`} />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                  )}
                </div>

                {/* Today Badge */}
                {isToday && !isSelected && !isDayCompleted && (
                  <span className="absolute -top-1 px-1 rounded-full bg-[#84CC16] text-slate-950 text-[7px] font-black uppercase font-mono">
                    Hoje
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Routine Detail Card or Rest Day Card */}
      {currentRoutine ? (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* Main Action Banner */}
          <div className="p-5 rounded-3xl bg-[#090F1E] border border-white/[0.09] shadow-xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start justify-between relative z-10 gap-3">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-[#84CC16]/15 border border-[#84CC16]/30 text-[#A3E635] rounded-full text-[10px] font-extrabold uppercase tracking-wider font-mono flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{currentDayInfo.full}</span>
                  </span>

                  {selectedDay === todayDayIndex && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-extrabold font-mono flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Treino de Hoje</span>
                    </span>
                  )}

                  <button
                    onClick={() => handleDeleteSplit(currentRoutine.id)}
                    className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto"
                    title="Remover treino deste dia (marcar como descanso)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Editable Title */}
                {isEditingTitle ? (
                  <form onSubmit={handleSaveTitle} className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      className="w-full px-2.5 py-1 bg-slate-950 border border-[#84CC16] rounded-xl text-sm font-extrabold text-white font-display focus:outline-none"
                      autoFocus
                      onBlur={() => handleSaveTitle()}
                    />
                    <button
                      type="submit"
                      className="p-1.5 rounded-xl btn-lime text-slate-950 font-bold"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
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
                  {currentRoutine.exercises.length} exercícios &bull; Volume:{' '}
                  <span className="font-mono text-slate-200 font-bold">
                    {currentRoutine.exercises.reduce((a, b) => a + b.targetSets, 0)} séries
                  </span>
                </p>
              </div>
            </div>

            {/* Celebratory Completed Banner for Today */}
            {selectedDay === todayDayIndex && todayCompletedLog && (
              <div className="p-3.5 rounded-2xl bg-[#84CC16]/15 border border-[#84CC16]/40 flex items-center justify-between animate-in zoom-in-95">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#84CC16] text-slate-950 flex items-center justify-center font-black shadow-md">
                    <Check className="w-5 h-5 stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-white font-display">
                      Treino de Hoje Concluído! 🏆
                    </h4>
                    <p className="text-[11px] text-[#A3E635] font-mono font-bold">
                      +{todayCompletedLog.caloriesBurnedEstimate} kcal &bull; {(todayCompletedLog.totalVolumeLoadKg / 1000).toFixed(1)}t levantadas
                    </p>
                  </div>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#84CC16] text-slate-950 font-black font-mono uppercase shadow-sm">
                  Concluído
                </span>
              </div>
            )}

            {/* Metric Pills (UI Kit Style) */}
            <div className="grid grid-cols-3 gap-2 py-1">
              <div className="p-2.5 rounded-2xl bg-[#060A14] border border-white/[0.06] text-center">
                <span className="text-[10px] text-slate-400 block font-mono">Exercícios</span>
                <span className="text-sm font-black text-white font-mono">{currentRoutine.exercises.length}</span>
              </div>

              <div className="p-2.5 rounded-2xl bg-[#060A14] border border-white/[0.06] text-center">
                <span className="text-[10px] text-slate-400 block font-mono">Duração</span>
                <span className="text-sm font-black text-white font-mono">~45 min</span>
              </div>

              <div className="p-2.5 rounded-2xl bg-[#060A14] border border-white/[0.06] text-center">
                <span className="text-[10px] text-slate-400 block font-mono">Calorias</span>
                <span className="text-sm font-black text-[#A3E635] font-mono">~{currentRoutine.exercises.length * 45} kcal</span>
              </div>
            </div>

            {/* Target Muscles Pills */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {currentRoutine.targetMuscles.map((m) => (
                <span
                  key={m}
                  className="px-2.5 py-0.5 rounded-xl bg-[#060A14] border border-white/[0.06] text-[10px] font-bold text-slate-300 font-mono"
                >
                  {MUSCLE_LABELS[m] || m}
                </span>
              ))}
            </div>

            {/* High-Impact Electric Lime Button (Gym UI Kit Style) */}
            {selectedDay === todayDayIndex && todayCompletedLog ? (
              <button
                onClick={() => setActiveRoutineToStart(currentRoutine)}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#060A14] border border-[#84CC16]/60 text-[#A3E635] hover:bg-[#84CC16]/10 font-display font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>✓ Treino Concluído Hoje (Treinar Novamente)</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveRoutineToStart(currentRoutine)}
                disabled={currentRoutine.exercises.length === 0}
                className="w-full py-4 px-4 rounded-2xl btn-lime text-slate-950 font-display font-black text-sm uppercase tracking-wider shadow-lg shadow-lime-500/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {selectedDay === todayDayIndex ? 'Iniciar Treino de Hoje' : `Iniciar Treino de ${currentDayInfo.short}`}
                </span>
              </button>
            )}
          </div>

          {/* Exercises Header */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
              Exercícios de {currentDayInfo.full}
            </span>

            <button
              onClick={() => setIsAddExerciseOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#84CC16]/15 border border-[#84CC16]/30 text-[#A3E635] hover:bg-[#84CC16]/25 text-xs font-bold transition-all flex items-center gap-1.5 btn-tactile font-mono"
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
                <Plus className="w-8 h-8 text-blue-400 mx-auto" />
                <p className="text-xs font-bold text-slate-300">Nenhum exercício cadastrado para {currentDayInfo.full}.</p>
                <p className="text-[11px] text-slate-500">Toque aqui para adicionar os exercícios que você faz neste dia!</p>
              </div>
            ) : (
              currentRoutine.exercises.map((item, idx) => {
                const exercise = EXERCISE_DATABASE_MAP.get(item.exerciseId);
                if (!exercise) return null;

                return (
                  <div
                    key={`${item.exerciseId}-${idx}`}
                    className="p-3.5 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-sm flex items-center justify-between gap-3 hover:border-white/[0.14] transition-all group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Exercise Thumbnail Icon */}
                      <div className="w-11 h-11 rounded-2xl bg-[#060A14] border border-white/[0.08] flex items-center justify-center text-xs font-black text-slate-300 font-mono shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                        <Dumbbell className="w-5 h-5 text-[#A3E635]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-sm text-white truncate tracking-tight">
                          {exercise.name}
                        </h4>
                        
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                          <span className="font-bold text-slate-200">
                            {item.targetSets} Séries &times; {item.minReps}-{item.maxReps} Reps
                          </span>
                          <span>&bull;</span>
                          <span className="text-slate-500">{item.restSeconds}s descanso</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stepper & Remove */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 bg-[#060A14] px-2 py-1 rounded-xl border border-white/5">
                        <button
                          type="button"
                          onClick={() => handleUpdateExerciseConfig(idx, -1, 0, 0)}
                          className="text-slate-400 hover:text-white font-bold px-1"
                          title="Diminuir séries"
                        >
                          -
                        </button>
                        <span className="text-[#A3E635] font-bold px-1 text-xs font-mono">{item.targetSets}s</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateExerciseConfig(idx, 1, 0, 0)}
                          className="text-slate-400 hover:text-white font-bold px-1"
                          title="Aumentar séries"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemoveExercise(idx)}
                        className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all btn-tactile"
                        title="Remover Exercício"
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
      ) : (
        /* Rest Day (Descanso & Recuperação) Card */
        <div className="p-8 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-xl text-center space-y-4 animate-in fade-in">
          <div className="w-14 h-14 rounded-3xl bg-[#84CC16]/15 border border-[#84CC16]/30 text-[#A3E635] flex items-center justify-center mx-auto shadow-inner">
            <BedDouble className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 font-mono">
              {currentDayInfo.full}
            </span>
            <h3 className="text-lg font-extrabold text-white font-display">
              Dia de Descanso & Recuperação
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              O descanso é essencial para a síntese proteica e reconstrução das fibras musculares.
            </p>
          </div>

          <button
            onClick={handleCreateRoutineForSelectedDay}
            className="py-3 px-5 rounded-2xl btn-lime text-slate-950 font-display font-black text-xs uppercase tracking-wider transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Treino para {currentDayInfo.full}</span>
          </button>
        </div>
      )}

      {/* Modais */}
      {activeRoutineToStart && (
        <ActiveWorkoutModal
          isOpen={true}
          onClose={() => {
            setActiveRoutineToStart(null);
            loadData();
          }}
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
