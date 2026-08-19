import React, { useState, useEffect } from 'react';
import { ArrowRight, Check, Repeat, Search } from 'lucide-react';
import { FoodItem } from '../../core/storage/types';
import { FOOD_DATABASE_MAP } from '../../core/data/tacoDatabase';
import { calculateMacroSwap, calculateFoodNutrients } from '../../core/math/macroSolver';
import { Modal } from '../../components/ui/Modal';
import { getAllFoods } from '../../core/storage/db';

interface MacroSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalFoodId: string;
  originalGrams: number;
  onApplySwap: (newFoodId: string, newGrams: number) => void;
}

export const MacroSwapModal: React.FC<MacroSwapModalProps> = ({
  isOpen,
  onClose,
  originalFoodId,
  originalGrams,
  onApplySwap
}) => {
  const [allFoods, setAllFoods] = useState<FoodItem[]>([]);
  const originalFood = FOOD_DATABASE_MAP.get(originalFoodId) || allFoods.find((f) => f.id === originalFoodId);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReplacement, setSelectedReplacement] = useState<FoodItem | null>(null);

  useEffect(() => {
    if (isOpen) {
      getAllFoods().then(setAllFoods);
    }
  }, [isOpen]);

  if (!originalFood) return null;

  const originalNutrients = calculateFoodNutrients(originalFood, originalGrams);

  // Filtra alimentos candidatos (priorizando mesma categoria e excluindo o próprio alimento)
  const candidateFoods = allFoods.filter(
    (f) =>
      f.id !== originalFoodId &&
      (searchQuery === '' || f.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const swapResult = selectedReplacement
    ? calculateMacroSwap(originalFood, originalGrams, selectedReplacement)
    : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Troca Inteligente de Alimentos"
      subtitle={`Substituindo ${originalGrams}g de ${originalFood.name}`}
    >
      <div className="space-y-4">
        {/* Original Food Summary Card */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Alimento Original
            </span>
            <p className="font-bold text-white text-sm">{originalFood.name}</p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {originalGrams}g &bull; {originalNutrients.calories} kcal (P: {originalNutrients.protein}g | C: {originalNutrients.carbs}g | G: {originalNutrients.fat}g)
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Repeat className="w-4 h-4" />
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar alimento substituto na tabela TACO..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Food List */}
        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
          {candidateFoods.map((food) => {
            const isSelected = selectedReplacement?.id === food.id;
            return (
              <div
                key={food.id}
                onClick={() => setSelectedReplacement(food)}
                className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-500 text-white'
                    : 'bg-slate-900/40 border-white/5 text-slate-300 hover:border-white/20'
                }`}
              >
                <div>
                  <p className="font-bold">{food.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {food.servingName} &bull; P: {food.proteinPer100g}g | C: {food.carbsPer100g}g | G: {food.fatPer100g}g (por 100g)
                  </p>
                </div>
                {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
              </div>
            );
          })}
        </div>

        {/* Calculation Result */}
        {swapResult && selectedReplacement && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Check className="w-4 h-4" /> Equivalência Calculada
              </span>
              <span className="text-xs font-mono font-bold text-slate-300">
                Foco em {swapResult.primaryMacroMatched.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center justify-between text-center py-2 px-3 bg-black/40 rounded-xl">
              <div>
                <p className="text-[10px] text-slate-400">De</p>
                <p className="text-sm font-bold text-white">{originalGrams}g</p>
                <p className="text-[10px] text-slate-400">{originalNutrients.calories} kcal</p>
              </div>

              <ArrowRight className="w-4 h-4 text-emerald-400" />

              <div>
                <p className="text-[10px] text-emerald-400 font-bold">Consuma</p>
                <p className="text-base font-black text-emerald-300 font-mono">
                  {swapResult.replacementGrams}g
                </p>
                <p className="text-[10px] text-slate-400">
                  {swapResult.replacementNutrients.calories} kcal
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-tight">
              Para bater os mesmos <strong>{originalNutrients[swapResult.primaryMacroMatched]}g de {swapResult.primaryMacroMatched}</strong>, consuma exatamente <strong>{swapResult.replacementGrams}g de {selectedReplacement.name}</strong>.
            </p>

            <button
              onClick={() => {
                onApplySwap(selectedReplacement.id, swapResult.replacementGrams);
                onClose();
              }}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <span>Aplicar Substituição no Cardápio</span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
