import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Exercise, MuscleGroup } from '../../core/storage/types';
import { EXERCISE_DATABASE } from '../../core/data/exerciseDatabase';
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

  const muscleList: (MuscleGroup | 'all')[] = [
    'all',
    'chest',
    'back',
    'quadriceps',
    'hamstrings',
    'glutes',
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
      title="Adicionar Exercício"
      subtitle="Escolha da biblioteca biomecânica oficial"
    >
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por supino, agachamento, puxada..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Muscle Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {muscleList.map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMuscle(m)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                selectedMuscle === m
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 text-slate-400 border border-white/5'
              }`}
            >
              {m === 'all' ? 'Todos' : MUSCLE_LABELS[m]}
            </button>
          ))}
        </div>

        {/* Exercises List */}
        <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
          {filtered.map((ex) => {
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
                className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500 text-white'
                    : 'bg-slate-900/50 border-white/5 text-slate-300 hover:border-white/20'
                }`}
              >
                <div>
                  <p className="font-bold">{ex.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {MUSCLE_LABELS[ex.primaryMuscle]} &bull; {ex.category} &bull; {ex.mets} METs
                  </p>
                </div>
                {isSelected && <span className="text-blue-400 font-bold text-xs">Selecionado</span>}
              </div>
            );
          })}
        </div>

        {/* Config Selected */}
        {selectedExercise && (
          <div className="p-4 rounded-2xl bg-slate-900 border border-blue-500/30 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold">Séries</span>
                <input
                  type="number"
                  value={sets}
                  onChange={(e) => setSets(e.target.value === '' ? '' : e.target.value)}
                  className="w-full mt-1 p-1 bg-slate-950 border border-white/10 rounded-lg text-center font-bold text-white font-mono"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold">Faixa Reps</span>
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="number"
                    value={minReps}
                    onChange={(e) => setMinReps(e.target.value === '' ? '' : e.target.value)}
                    className="w-full p-1 bg-slate-950 border border-white/10 rounded-lg text-center font-bold text-white text-xs font-mono"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    value={maxReps}
                    onChange={(e) => setMaxReps(e.target.value === '' ? '' : e.target.value)}
                    className="w-full p-1 bg-slate-950 border border-white/10 rounded-lg text-center font-bold text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold">Descanso (s)</span>
                <input
                  type="number"
                  value={restSecs}
                  onChange={(e) => setRestSecs(e.target.value === '' ? '' : e.target.value)}
                  className="w-full mt-1 p-1 bg-slate-950 border border-white/10 rounded-lg text-center font-bold text-white font-mono"
                />
              </div>
            </div>

            <button
              onClick={handleConfirm}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar à Ficha</span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
