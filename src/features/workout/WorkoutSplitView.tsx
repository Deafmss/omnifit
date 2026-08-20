import React, { useState } from 'react';
import { 
  Play, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Pencil, 
  Check, 
  Layers, 
  Calendar, 
  Sparkles, 
  BedDouble,
  ChevronDown
} from 'lucide-react';
import { WorkoutRoutine, UserProfile } from '../../core/storage/types';
import { useWorkoutSplit, DAYS_OF_WEEK } from './useWorkoutSplit';
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
  const {
    selectedDay,
    setSelectedDay,
    routines,
    currentRoutine,
    currentDayInfo,
    todayCompletedLog,
    weekCompletionMap: currentWeekDatesMap,
    errorMsg,
    applyTemplate: handleApplyTemplate,
    createRoutineForSelectedDay: handleCreateRoutineForSelectedDay,
    removeRoutine: handleDeleteSplit,
    renameRoutine,
    addExercise: handleAddExercise,
    removeExercise: handleRemoveExercise,
    updateExerciseConfig: handleUpdateExerciseConfig,
    reload: loadData
  } = useWorkoutSplit();

  const todayDayIndex = new Date().getDay(); // 0 = Domingo ... 6 = Sábado

  const [activeRoutineToStart, setActiveRoutineToStart] = useState<WorkoutRoutine | null>(null);
  const [isAuditorOpen, setIsAuditorOpen] = useState<boolean>(false);
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState<boolean>(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);

  // Edição do nome da ficha
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [tempTitle, setTempTitle] = useState<string>('');

  const handleSaveTitle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await renameRoutine(tempTitle);
    setIsEditingTitle(false);
  };

  return (
    <div className="space-y-4 pb-28 max-w-lg mx-auto px-3.5 sm:px-4 py-3 w-full box-border">
      {errorMsg && (
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. TOP CONTROL BAR: Split Selector & Volume Auditor      */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => setIsTemplateModalOpen(true)}
          className="p-3 rounded-2xl bg-[#090F1E] border border-white/[0.08] hover:border-[#84CC16]/40 text-left transition-all btn-tactile shadow-sm flex items-center justify-between group"
          title="Trocar Divisão de Treino"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#060A14] border border-white/[0.06] flex items-center justify-center text-[#A3E635] shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-extrabold uppercase font-mono text-slate-400 tracking-wider block">
                Divisões
              </span>
              <span className="text-xs font-extrabold text-white truncate block group-hover:text-[#A3E635] transition-colors">
                Trocar Divisão
              </span>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        </button>

        <button
          onClick={() => setIsAuditorOpen(true)}
          className="p-3 rounded-2xl bg-[#090F1E] border border-white/[0.08] hover:border-[#84CC16]/40 text-left transition-all btn-tactile shadow-sm flex items-center justify-between group"
          title="Auditar Volume MAV/MRV"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#060A14] border border-white/[0.06] flex items-center justify-center text-[#A3E635] shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-extrabold uppercase font-mono text-slate-400 tracking-wider block">
                Auditoria MAV
              </span>
              <span className="text-xs font-extrabold text-white truncate block group-hover:text-[#A3E635] transition-colors">
                Volume Semanal
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 2. WEEKLY 7-DAY SCHEDULE BAR                             */}
      {/* ========================================================= */}
      <div className="p-2 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-lg">
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
                className={`py-2.5 px-1 rounded-2xl flex flex-col items-center justify-between transition-colors relative btn-tactile ${
                  isSelected
                    ? 'btn-lime text-slate-950 shadow-md font-black'
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
                <div className="mt-1.5 flex items-center justify-center">
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
                  <span className="absolute -top-1.5 px-1 py-0.2 rounded-full bg-[#84CC16] text-slate-950 text-[7px] font-black uppercase font-mono shadow-xs">
                    Hoje
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. HERO ROUTINE CARD (Matching Diet Hero Aesthetic)      */}
      {/* ========================================================= */}
      {currentRoutine ? (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-2xl space-y-4 relative overflow-hidden">
            {/* Subtle glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-lime-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Top Card Badge & Action Icons */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 bg-[#84CC16]/15 border border-[#84CC16]/30 text-[#A3E635] rounded-full text-[10px] font-extrabold uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  <span>{currentDayInfo.full}</span>
                </span>

                {selectedDay === todayDayIndex && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-extrabold font-mono flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Treino de Hoje</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setTempTitle(currentRoutine.name);
                    setIsEditingTitle(true);
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  title="Renomear Ficha"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDeleteSplit(currentRoutine.id)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Remover treino deste dia"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Routine Title (Full without cutting off) */}
            <div className="space-y-1 relative z-10">
              {isEditingTitle ? (
                <form onSubmit={handleSaveTitle} className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#060A14] border border-[#84CC16] rounded-xl text-base font-extrabold text-white font-display focus:outline-none"
                    autoFocus
                    onBlur={() => handleSaveTitle()}
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl btn-lime text-slate-950 font-bold"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </button>
                </form>
              ) : (
                <h2 className="text-xl font-black text-white font-display tracking-tight leading-snug">
                  {currentRoutine.name}
                </h2>
              )}

              <p className="text-xs text-slate-400">
                {currentRoutine.exercises.length} exercícios &bull; Volume Total:{' '}
                <span className="font-mono text-slate-200 font-bold">
                  {currentRoutine.exercises.reduce((a, b) => a + b.targetSets, 0)} séries
                </span>
              </p>
            </div>

            {/* Celebratory Completed Banner */}
            {selectedDay === todayDayIndex && todayCompletedLog && (
              <div className="p-3.5 rounded-2xl bg-[#84CC16]/15 border border-[#84CC16]/40 flex items-center justify-between">
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

            {/* Metric Pills (Matching Diet Sub-Card Layout) */}
            <div className="grid grid-cols-3 gap-2 py-1">
              <div className="p-3 rounded-2xl bg-[#060A14] border border-white/[0.06] text-center">
                <span className="text-[10px] text-slate-400 block font-mono uppercase tracking-wider font-extrabold">
                  Exercícios
                </span>
                <span className="text-base font-black text-white font-mono">
                  {currentRoutine.exercises.length}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#060A14] border border-white/[0.06] text-center">
                <span className="text-[10px] text-slate-400 block font-mono uppercase tracking-wider font-extrabold">
                  Duração
                </span>
                <span className="text-base font-black text-white font-mono">
                  ~45 min
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#060A14] border border-white/[0.06] text-center">
                <span className="text-[10px] text-slate-400 block font-mono uppercase tracking-wider font-extrabold">
                  Calorias
                </span>
                <span className="text-base font-black text-[#A3E635] font-mono">
                  ~{currentRoutine.exercises.length * 45} kcal
                </span>
              </div>
            </div>

            {/* Target Muscle Badges */}
            {currentRoutine.targetMuscles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {currentRoutine.targetMuscles.map((m) => (
                  <span
                    key={m}
                    className="px-2.5 py-1 rounded-xl bg-[#060A14] border border-white/[0.06] text-[10px] font-bold text-slate-300 font-mono"
                  >
                    {MUSCLE_LABELS[m] || m}
                  </span>
                ))}
              </div>
            )}

            {/* Hero CTA Button */}
            {selectedDay === todayDayIndex && todayCompletedLog ? (
              <button
                onClick={() => setActiveRoutineToStart(currentRoutine)}
                className="w-full py-4 px-4 rounded-2xl bg-[#060A14] border border-[#84CC16]/60 text-[#A3E635] hover:bg-[#84CC16]/10 font-display font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>✓ Treino Concluído Hoje (Treinar Novamente)</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveRoutineToStart(currentRoutine)}
                disabled={currentRoutine.exercises.length === 0}
                className="w-full py-4 px-4 rounded-2xl btn-lime text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-lime-500/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {selectedDay === todayDayIndex ? 'Iniciar Treino de Hoje' : `Iniciar Treino de ${currentDayInfo.short}`}
                </span>
              </button>
            )}
          </div>

          {/* ========================================================= */}
          {/* 4. EXERCISES LIST (Matching MealCard Layout)             */}
          {/* ========================================================= */}
          <div className="space-y-3">
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

            {currentRoutine.exercises.length === 0 ? (
              <div 
                onClick={() => setIsAddExerciseOpen(true)}
                className="p-8 rounded-3xl bg-[#090F1E] border border-dashed border-white/[0.09] text-center space-y-2 cursor-pointer hover:border-[#84CC16]/40 hover:bg-[#060A14] transition-all"
              >
                <Plus className="w-8 h-8 text-[#A3E635] mx-auto" />
                <p className="text-xs font-bold text-slate-200">Nenhum exercício cadastrado para {currentDayInfo.full}.</p>
                <p className="text-[11px] text-slate-500">Toque aqui para adicionar os exercícios que você faz neste dia!</p>
              </div>
            ) : (
              currentRoutine.exercises.map((item, idx) => {
                const exercise = EXERCISE_DATABASE_MAP.get(item.exerciseId);
                if (!exercise) return null;

                const orderNumber = String(idx + 1).padStart(2, '0');

                return (
                  <div
                    key={`${item.exerciseId}-${idx}`}
                    className="p-4 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-sm flex items-center justify-between gap-3 hover:border-white/[0.16] transition-all group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Number Pill / Identifier */}
                      <div className="w-10 h-10 rounded-2xl bg-[#060A14] border border-white/[0.08] flex items-center justify-center text-xs font-black text-[#A3E635] font-mono shrink-0 shadow-inner">
                        {orderNumber}
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

                    {/* Stepper Controls & Delete */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center bg-[#060A14] p-1 rounded-xl border border-white/[0.08]">
                        <button
                          type="button"
                          onClick={() => handleUpdateExerciseConfig(idx, -1, 0, 0)}
                          className="w-6 h-6 rounded-lg text-slate-400 hover:text-white font-bold flex items-center justify-center hover:bg-white/10 transition-colors text-xs"
                          title="Diminuir séries"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-black font-mono text-[#A3E635]">
                          {item.targetSets}s
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateExerciseConfig(idx, 1, 0, 0)}
                          className="w-6 h-6 rounded-lg text-slate-400 hover:text-white font-bold flex items-center justify-center hover:bg-white/10 transition-colors text-xs"
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
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* 5. REST DAY CARD (Matching Empty/Rest Clean State)       */
        /* ========================================================= */
        <div className="p-8 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-xl text-center space-y-4">
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
            className="px-4 py-2.5 rounded-2xl bg-[#060A14] border border-[#84CC16]/40 text-[#A3E635] hover:bg-[#84CC16]/15 text-xs font-bold font-mono transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Treino para {currentDayInfo.short}</span>
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. MODALS                                                 */}
      {/* ========================================================= */}
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

      {isAuditorOpen && (
        <WorkoutAuditorModal
          isOpen={true}
          onClose={() => setIsAuditorOpen(false)}
          routines={routines}
          level={profile.experienceLevel}
        />
      )}

      {isAddExerciseOpen && currentRoutine && (
        <ExerciseSelectorModal
          isOpen={true}
          onClose={() => setIsAddExerciseOpen(false)}
          onSelectExercise={handleAddExercise}
        />
      )}

      {isTemplateModalOpen && (
        <SplitTemplateModal
          isOpen={true}
          onClose={() => setIsTemplateModalOpen(false)}
          onSelectTemplate={handleApplyTemplate}
        />
      )}
    </div>
  );
};

export default WorkoutSplitView;
