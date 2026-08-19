import React, { useState } from 'react';
import { Check, Plus, Repeat, Trash2, Edit2 } from 'lucide-react';
import { MealPlan, FoodItem } from '../../core/storage/types';
import { FOOD_DATABASE_MAP } from '../../core/data/tacoDatabase';
import { calculateFoodNutrients, calculatePortionsTotal } from '../../core/math/macroSolver';
import { MacroSwapModal } from './MacroSwapModal';
import { FoodPickerModal } from './FoodPickerModal';

interface MealCardProps {
  meal: MealPlan;
  onUpdateMeal: (updatedMeal: MealPlan) => void;
  onDeleteMeal?: (mealId: number) => void;
}

export const MealCard: React.FC<MealCardProps> = ({
  meal,
  onUpdateMeal,
  onDeleteMeal
}) => {
  const [swapState, setSwapState] = useState<{ originalFoodId: string; originalGrams: number } | null>(null);
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [editingGramsIndex, setEditingGramsIndex] = useState<number | null>(null);
  const [tempGrams, setTempGrams] = useState<number>(100);

  const currentTotals = calculatePortionsTotal(meal.portions, FOOD_DATABASE_MAP);

  const togglePortionConsumed = (index: number) => {
    const newPortions = [...meal.portions];
    newPortions[index].consumed = !newPortions[index].consumed;
    onUpdateMeal({ ...meal, portions: newPortions });
  };

  const handleApplySwap = (newFoodId: string, newGrams: number) => {
    if (!swapState) return;
    const newPortions = meal.portions.map((p) => {
      if (p.foodId === swapState.originalFoodId) {
        return { ...p, foodId: newFoodId, grams: newGrams };
      }
      return p;
    });
    onUpdateMeal({ ...meal, portions: newPortions });
    setSwapState(null);
  };

  const handleAddFood = (food: FoodItem, grams: number) => {
    const newPortions = [...meal.portions, { foodId: food.id, grams, consumed: false }];
    onUpdateMeal({ ...meal, portions: newPortions });
    setIsAddFoodOpen(false);
  };

  const handleRemovePortion = (index: number) => {
    const newPortions = meal.portions.filter((_, i) => i !== index);
    onUpdateMeal({ ...meal, portions: newPortions });
  };

  const handleSaveGrams = (index: number) => {
    const newPortions = [...meal.portions];
    newPortions[index].grams = Math.max(1, tempGrams);
    onUpdateMeal({ ...meal, portions: newPortions });
    setEditingGramsIndex(null);
  };

  return (
    <div className="rounded-2xl bg-[#0D1527] border border-white/10 overflow-hidden shadow-lg space-y-3 p-4">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div>
          <h3 className="text-base font-bold text-white font-display tracking-tight">
            {meal.name}
          </h3>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mt-0.5">
            <span className="text-blue-400 font-bold">{currentTotals.calories} kcal</span>
            <span>&bull;</span>
            <span>P: {currentTotals.protein}g</span>
            <span>&bull;</span>
            <span>C: {currentTotals.carbs}g</span>
            <span>&bull;</span>
            <span>G: {currentTotals.fat}g</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsAddFoodOpen(true)}
            className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 transition-all text-xs font-bold flex items-center gap-1 active:scale-95"
            title="Adicionar Alimento"
          >
            <Plus className="w-4 h-4" />
          </button>
          {onDeleteMeal && meal.id && (
            <button
              onClick={() => onDeleteMeal(meal.id!)}
              className="p-1.5 rounded-lg bg-red-600/10 text-red-400 hover:bg-red-600/20 border border-red-500/20 transition-all active:scale-95"
              title="Excluir Refeição"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Food Portions List */}
      <div className="space-y-2">
        {meal.portions.map((portion, idx) => {
          const food = FOOD_DATABASE_MAP.get(portion.foodId);
          if (!food) return null;

          const nutrients = calculateFoodNutrients(food, portion.grams);
          const isEditing = editingGramsIndex === idx;

          return (
            <div
              key={`${portion.foodId}-${idx}`}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                portion.consumed
                  ? 'bg-slate-950/60 border-white/5 opacity-60'
                  : 'bg-slate-900/60 border-white/5 hover:border-white/10'
              }`}
            >
              {/* Checkbox & Name */}
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => togglePortionConsumed(idx)}
                  className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                    portion.consumed
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                      : 'border-white/20 hover:border-blue-400'
                  }`}
                >
                  {portion.consumed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>

                <div className="min-w-0">
                  <p
                    className={`text-xs font-bold text-slate-200 truncate ${
                      portion.consumed ? 'line-through text-slate-500' : ''
                    }`}
                  >
                    {food.name}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {nutrients.calories} kcal &bull; P: {nutrients.protein}g | C: {nutrients.carbs}g | G: {nutrients.fat}g
                  </p>
                </div>
              </div>

              {/* Grams & Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={tempGrams}
                      onChange={(e) => setTempGrams(Number(e.target.value))}
                      className="w-16 px-1.5 py-0.5 bg-slate-950 border border-blue-500 rounded text-xs text-white font-bold text-center"
                      autoFocus
                    />
                    <span className="text-[10px] text-slate-400">g</span>
                    <button
                      onClick={() => handleSaveGrams(idx)}
                      className="p-1 rounded bg-blue-600 text-white hover:bg-blue-500"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingGramsIndex(idx);
                      setTempGrams(portion.grams);
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 font-mono border border-white/5 transition-all"
                  >
                    <span>{portion.grams}g</span>
                    <Edit2 className="w-2.5 h-2.5 text-slate-500" />
                  </button>
                )}

                {/* Macro Swap Button */}
                <button
                  onClick={() =>
                    setSwapState({ originalFoodId: portion.foodId, originalGrams: portion.grams })
                  }
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  title="Trocar por equivalente (Macro-Swap)"
                >
                  <Repeat className="w-3.5 h-3.5" />
                </button>

                {/* Remove Portion */}
                <button
                  onClick={() => handleRemovePortion(idx)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Remover alimento"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Macro Swap Modal */}
      {swapState && (
        <MacroSwapModal
          isOpen={true}
          onClose={() => setSwapState(null)}
          originalFoodId={swapState.originalFoodId}
          originalGrams={swapState.originalGrams}
          onApplySwap={handleApplySwap}
        />
      )}

      {/* Add Food Modal */}
      <FoodPickerModal
        isOpen={isAddFoodOpen}
        onClose={() => setIsAddFoodOpen(false)}
        onSelectFood={handleAddFood}
      />
    </div>
  );
};
