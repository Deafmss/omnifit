import React, { useState } from 'react';
import { Search, Plus, Dumbbell, Check } from 'lucide-react';
import { Exercise, MuscleGroup } from '../../core/storage/types';
import { EXERCISE_DATABASE, EXERCISE_DATABASE_MAP } from '../../core/data/exerciseDatabase';
import { MUSCLE_LABELS } from '../../core/math/trainingEngine';
import { Modal } from '../../components/ui/Modal';

interface ExerciseSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise, targetSets: number, minReps: number, maxReps: number, restSeconds: number) => void;
}

export const ExerciseSelectorModal: React.FC<ExerciseSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectExercise
}) => {
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>('all');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const [sets, setSets] = useState<number | string>(3);
  const [minReps, setMinReps] = useState<number | string>(8);
  const [maxReps, setMaxReps] = useState<number | string>(12);
  const [restSecs, setRestSecs] = useState<number | string>(90);

  // Modo de criação de exercício personalizado
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customMuscle, setCustomMuscle] = useState<MuscleGroup>('chest');

  const filtered = EXERCISE_DATABASE.filter((ex) => {
    const matchesSearch = search === '' || ex.name.toLowerCase().includes(search.toLowerCase());
    const matchesMuscle = selectedMuscle === 'all' || ex.primaryMuscle === selectedMuscle;
    return matchesSearch && matchesMuscle;
  });

  const handleConfirm = () => {
    if (selectedExercise) {
      const cleanSets = typeof sets === 'number' && sets > 0 ? sets : Number(sets) || 3;
      const cleanMin = typeof minReps === 'number' && minReps > 0 ? minReps : Number(minReps) || 8;
      const cleanMax = typeof maxReps === 'number' && maxReps > 0 ? maxReps : Number(maxReps) || 12;
      const cleanRest = typeof restSecs === 'number' && restSecs > 0 ? restSecs : Number(restSecs) || 90;

      onSelectExercise(selectedExercise, cleanSets, cleanMin, cleanMax, cleanRest);
      setSelectedExercise(null);
      onClose();
    }
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newExId = `custom_${Date.now()}`;
    const newEx: Exercise = {
      id: newExId,
      name: customName.trim(),
      primaryMuscle: customMuscle,
      secondaryMuscles: [],
      category: 'machine',
      mets: 5.0,
      minReps: 8,
      maxReps: 12,
      defaultRestSeconds: 90,
      instructions: 'Exercício personalizado cadastrado pelo usuário.'
    };

    EXERCISE_DATABASE.unshift(newEx);
    EXERCISE_DATABASE_MAP.set(newExId, newEx);

    setSelectedExercise(newEx);
    setIsCreatingCustom(false);
    setCustomName('');
  };

  const muscleList: (MuscleGroup | 'all')[] = [
    'all',
    'quadriceps',
    'hamstrings',
    'glutes',
    'chest',
    'back',
    'shoulders',
    'biceps',
    'triceps',
    'calves',
    'abs'
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adicionar Exercício / Aparelho"
      subtitle="Escolha entre mais de 80 aparelhos oficiais ou cadastre sua máquina"
    >
      <div className="space-y-4">
        {/* Search & Custom Exercise Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por flexora, hack, smith, voador, supino..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsCreatingCustom(!isCreatingCustom)}
            className="px-3 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-xs font-bold transition-all flex items-center gap-1 shrink-0 btn-tactile"
            title="Cadastrar Aparelho Próprio"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Criar Próprio</span>
          </button>
        </div>

        {/* Custom Exercise Form */}
        {isCreatingCustom && (
          <form onSubmit={handleCreateCustom} className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2.5 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <Dumbbell className="w-4 h-4" />
              <span>Cadastrar Novo Aparelho / Exercício</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Nome do Aparelho (ex: Hack 80º, Pêndulo...)"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                autoFocus
              />

              <select
                value={customMuscle}
                onChange={(e) => setCustomMuscle(e.target.value as MuscleGroup)}
                className="px-3 py-1.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none"
              >
                {muscleList.filter(m => m !== 'all').map((m) => (
                  <option key={m} value={m}>
                    {MUSCLE_LABELS[m as MuscleGroup]}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 btn-tactile"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salvar e Selecionar</span>
            </button>
          </form>
        )}

        {/* Muscle Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {muscleList.map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMuscle(m)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all btn-tactile ${
                selectedMuscle === m
                  ? 'btn-lime text-slate-950 shadow-sm'
                  : 'bg-[#060A14] text-slate-400 border border-white/5 hover:text-white'
              }`}
            >
              {m === 'all' ? 'Todos (+80)' : MUSCLE_LABELS[m]}
            </button>
          ))}
        </div>

        {/* Exercises List */}
        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs space-y-1">
              <p>Nenhum exercício encontrado com "{search}".</p>
              <p className="text-[11px] text-[#A3E635] cursor-pointer" onClick={() => setIsCreatingCustom(true)}>
                Toque em "Criar Próprio" para cadastrar esta máquina!
              </p>
            </div>
          ) : (
            filtered.map((ex) => {
              const isSelected = selectedExercise?.id === ex.id;
              return (
                <div
                  key={ex.id}
                  onClick={() => {
                    setSelectedExercise(ex);
                    setMinReps(ex.minReps);
                    setMaxReps(ex.maxReps);
                    setRestSecs(ex.defaultRestSeconds);
                  }}
                  className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 btn-tactile ${
                    isSelected
                      ? 'bg-[#0C1424] border-[#84CC16] text-white shadow-sm'
                      : 'bg-[#060A14] border-white/5 text-slate-300 hover:border-white/20'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate text-slate-100">{ex.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {MUSCLE_LABELS[ex.primaryMuscle]} &bull; {ex.category} &bull; {ex.mets} METs
                    </p>
                  </div>
                  {isSelected && (
                    <span className="px-2 py-0.5 rounded-lg bg-[#84CC16] text-slate-950 font-extrabold text-[10px] font-mono shrink-0">
                      Selecionado
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Config Selected */}
        {selectedExercise && (
          <div className="p-4 rounded-3xl bg-[#060A14] border border-[#84CC16]/40 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span>Configurar {selectedExercise.name}</span>
              <span className="text-[10px] font-mono text-[#A3E635]">{MUSCLE_LABELS[selectedExercise.primaryMuscle]}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold">Séries</span>
                <input
                  type="number"
                  value={sets}
                  onChange={(e) => setSets(e.target.value === '' ? '' : e.target.value)}
                  className="w-full mt-1 p-1 bg-slate-950 border border-white/10 rounded-xl text-center font-bold text-white font-mono focus:border-[#84CC16] focus:outline-none"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold">Faixa Reps</span>
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="number"
                    value={minReps}
                    onChange={(e) => setMinReps(e.target.value === '' ? '' : e.target.value)}
                    className="w-full p-1 bg-slate-950 border border-white/10 rounded-xl text-center font-bold text-white text-xs font-mono focus:border-[#84CC16] focus:outline-none"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    value={maxReps}
                    onChange={(e) => setMaxReps(e.target.value === '' ? '' : e.target.value)}
                    className="w-full p-1 bg-slate-950 border border-white/10 rounded-xl text-center font-bold text-white text-xs font-mono focus:border-[#84CC16] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold">Descanso (s)</span>
                <input
                  type="number"
                  value={restSecs}
                  onChange={(e) => setRestSecs(e.target.value === '' ? '' : e.target.value)}
                  className="w-full mt-1 p-1 bg-slate-950 border border-white/10 rounded-xl text-center font-bold text-white font-mono focus:border-[#84CC16] focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleConfirm}
              className="w-full py-3.5 rounded-2xl btn-lime text-slate-950 font-bold text-xs shadow-lg shadow-lime-500/20 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar ao Treino</span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
