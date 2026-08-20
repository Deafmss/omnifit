import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Repeat, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Pencil, 
  Clock 
} from 'lucide-react';
import { MealPlan, FoodItem } from '../../core/storage/types';
import { FOOD_DATABASE_MAP } from '../../core/data/tacoDatabase';
import { calculatePortionsTotal, calculateFoodNutrients, formatHouseholdPortion } from '../../core/math/macroSolver';
import { logFoodConsumption, unlogFoodConsumption } from '../../core/storage/db';
import { todayLocal } from '../../core/utils/dateUtils';
import { MacroSwapModal } from './MacroSwapModal';
import { FoodPickerModal } from './FoodPickerModal';

interface MealCardProps {
  meal: MealPlan;
  timeLabel?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onUpdateMeal: (updated: MealPlan) => void;
  onDeleteMeal?: (id: number) => void;
}

const getMealEmoji = (name: string, index: number) => {
  const n = name.toLowerCase();
  if (n.includes('café') || n.includes('manhã') || n.includes('breakfast')) return '🍳';
  if (n.includes('almoço') || n.includes('lunch')) return '🥗';
  if (n.includes('lanche') || n.includes('snack') || n.includes('tarde')) return '🥪';
  if (n.includes('jantar') || n.includes('janta') || n.includes('dinner')) return '🍲';
  if (n.includes('ceia') || n.includes('bedtime')) return '🥛';
  return index === 0 ? '🍳' : index === 1 ? '🥗' : index === 2 ? '🥪' : '🍲';
};

export const MealCard: React.FC<MealCardProps> = ({
  meal,
  timeLabel,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
  onUpdateMeal,
  onDeleteMeal
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(true);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const toggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  // Guarda também o índice da porção: trocar por foodId alterava TODAS as
  // porções do mesmo alimento na refeição.
  const [swapState, setSwapState] = useState<{
    index: number;
    originalFoodId: string;
    originalGrams: number;
  } | null>(null);
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);

  // Estados de edição do nome e do horário da refeição
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(meal.name);

  const [isEditingTime, setIsEditingTime] = useState(false);
  const [tempTime, setTempTime] = useState(meal.timeLabel || timeLabel || '12:00');

  const currentTotals = calculatePortionsTotal(meal.portions, FOOD_DATABASE_MAP);
  const allConsumed = meal.portions.length > 0 && meal.portions.every((p) => p.consumed);

  // As porções são recriadas por map: mutar `[...meal.portions][index]` alterava
  // o objeto original dentro da prop `meal`.
  /**
   * Marca/desmarca a porção e registra no diário alimentar do dia.
   * O `consumed` da porção é só o estado visual de hoje; o histórico
   * permanente vai para a tabela de logs, com data.
   */
  const togglePortionConsumed = async (index: number) => {
    const portion = meal.portions[index];
    if (!portion) return;

    const willBeConsumed = !portion.consumed;

    const newPortions = meal.portions.map((p, i) =>
      i === index ? { ...p, consumed: willBeConsumed } : p
    );
    onUpdateMeal({ ...meal, portions: newPortions });

    try {
      const today = todayLocal();
      if (willBeConsumed) {
        await logFoodConsumption(today, meal.name, meal.order, portion.foodId, portion.grams);
      } else {
        await unlogFoodConsumption(today, meal.order, portion.foodId);
      }
    } catch (err) {
      // A marcação visual já foi aplicada; o diário é complementar e não deve
      // bloquear a interação se a escrita falhar.
      console.error('Não foi possível registrar o consumo no diário:', err);
    }
  };

  const handleApplySwap = (newFoodId: string, newGrams: number) => {
    if (!swapState) return;
    const newPortions = meal.portions.map((p, i) =>
      i === swapState.index ? { ...p, foodId: newFoodId, grams: newGrams } : p
    );
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

  const handleAdjustHouseholdUnits = (index: number, delta: number, servingGrams: number) => {
    const newPortions = meal.portions.map((p, i) => {
      if (i !== index) return p;
      return { ...p, grams: Math.max(servingGrams, p.grams + delta * servingGrams) };
    });
    onUpdateMeal({ ...meal, portions: newPortions });
  };

  const handleSaveName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = tempName.trim();
    if (clean) {
      onUpdateMeal({ ...meal, name: clean });
    }
    setIsEditingName(false);
  };

  const handleSaveTime = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = tempTime.trim();
    if (clean) {
      onUpdateMeal({ ...meal, timeLabel: clean });
    }
    setIsEditingTime(false);
  };

  const displayTime = meal.timeLabel || timeLabel;
  const foodSummaryText = meal.portions.length > 0
    ? meal.portions
        .map((p) => FOOD_DATABASE_MAP.get(p.foodId)?.name)
        .filter(Boolean)
        .slice(0, 3)
        .join(', ') + (meal.portions.length > 3 ? '...' : '')
    : 'Nenhum alimento cadastrado';

  return (
    <div className="rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-lg transition-all duration-200 hover:border-white/[0.14] overflow-hidden">
      {/* Meal Header (Matching Reference Screen 3 "Nutrition" UI Kit) */}
      <div 
        onClick={toggleCollapse}
        className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none group"
      >
        {/* Round Dish Thumbnail on Left */}
        <div className="w-12 h-12 rounded-2xl bg-[#060A14] border border-white/[0.08] flex items-center justify-center text-xl shrink-0 shadow-inner group-hover:scale-105 transition-transform">
          {getMealEmoji(meal.name, meal.order)}
        </div>

        {/* Meal Info Middle */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm text-white font-display tracking-tight truncate group-hover:text-[#A3E635] transition-colors">
              {meal.name}
            </h3>
            {displayTime && (
              <span className="text-[10px] font-mono text-slate-500">
                {displayTime}
              </span>
            )}
            {allConsumed && (
              <span className="px-1.5 py-0.2 rounded bg-[#84CC16]/20 text-[9px] font-extrabold text-[#A3E635] font-mono">
                Feita
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 truncate mt-0.5 font-medium">
            {foodSummaryText}
          </p>
        </div>

        {/* Calories Right Aligned (Mockup Reference Style) */}
        <div className="text-right shrink-0 flex items-center gap-2">
          <div>
            <span className="text-sm font-black text-white font-mono block">
              {currentTotals.calories} <span className="text-xs font-normal text-slate-400">kcal</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono block">
              P:{Math.round(currentTotals.protein)}g &bull; C:{Math.round(currentTotals.carbs)}g
            </span>
          </div>
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
          ) : (
            <ChevronUp className="w-4 h-4 text-[#A3E635] transition-colors" />
          )}
        </div>
      </div>

      {/* Expanded Meal Details */}
      {!isCollapsed && (
        <div className="p-4 pt-0 space-y-3 border-t border-white/[0.04] mt-1 animate-in fade-in duration-200">
          {/* Quick Edit Tools (Name & Time) */}
          <div className="flex items-center justify-between text-xs pt-3 pb-1 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setTempName(meal.name);
                  setIsEditingName(true);
                }}
                className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <Pencil className="w-3 h-3" />
                <span>Renomear</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTempTime(displayTime || '12:00');
                  setIsEditingTime(true);
                }}
                className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <Clock className="w-3 h-3" />
                <span>Horário</span>
              </button>
            </div>

            {onDeleteMeal && (
              <button
                type="button"
                onClick={() => onDeleteMeal(meal.id!)}
                className="text-[11px] font-bold text-red-400/80 hover:text-red-400 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Excluir</span>
              </button>
            )}
          </div>

          {/* Inline Edit Form for Name */}
          {isEditingName && (
            <form onSubmit={handleSaveName} className="flex gap-2">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-950 border border-blue-500 rounded-xl text-xs font-bold text-white focus:outline-none"
                autoFocus
              />
              <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold">
                Salvar
              </button>
            </form>
          )}

          {/* Inline Edit Form for Time */}
          {isEditingTime && (
            <form onSubmit={handleSaveTime} className="flex gap-2">
              <input
                type="text"
                value={tempTime}
                onChange={(e) => setTempTime(e.target.value)}
                className="w-24 px-3 py-1.5 bg-slate-950 border border-blue-500 rounded-xl text-xs font-bold text-white text-center focus:outline-none"
                autoFocus
              />
              <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold">
                Salvar
              </button>
            </form>
          )}

          {/* Food Portions List */}
          <div className="space-y-2">
            {meal.portions.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-3">
                Nenhum alimento cadastrado nesta refeição ainda.
              </p>
            ) : (
              meal.portions.map((portion, idx) => {
                const food = FOOD_DATABASE_MAP.get(portion.foodId);
                if (!food) return null;
                const nutrients = calculateFoodNutrients(food, portion.grams);
                const household = formatHouseholdPortion(food, portion.grams);

                return (
                  <div
                    key={`${portion.foodId}-${idx}`}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                      portion.consumed
                        ? 'bg-[#060A14] border-[#84CC16]/30 opacity-80'
                        : 'bg-[#060A14] border-white/[0.06]'
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => togglePortionConsumed(idx)}
                      aria-pressed={portion.consumed}
                      aria-label={`${portion.consumed ? 'Desmarcar' : 'Marcar'} ${food.name} como consumido`}
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                        portion.consumed
                          ? 'bg-[#84CC16] border-[#84CC16] text-slate-950'
                          : 'border-slate-700 bg-transparent hover:border-slate-500'
                      }`}
                    >
                      {portion.consumed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    {/* Food Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold truncate ${portion.consumed ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                          {food.name}
                        </span>
                      </div>

                      {/* Household measure stepper */}
                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mt-1">
                        <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-white/5">
                          <button
                            type="button"
                            onClick={() => handleAdjustHouseholdUnits(idx, -1, food.servingGrams || 100)}
                            className="text-slate-400 hover:text-white font-bold px-0.5"
                          >
                            -
                          </button>
                          <span className="text-[#A3E635] font-bold px-1">{household.label}</span>
                          <button
                            type="button"
                            onClick={() => handleAdjustHouseholdUnits(idx, 1, food.servingGrams || 100)}
                            className="text-slate-400 hover:text-white font-bold px-0.5"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-white font-bold">{nutrients.calories} kcal</span>
                      </div>
                    </div>

                    {/* Actions (Swap & Delete) */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSwapState({ index: idx, originalFoodId: food.id, originalGrams: portion.grams })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#A3E635] hover:bg-white/5 transition-all"
                        title="Troca Inteligente de Alimento"
                      >
                        <Repeat className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemovePortion(idx)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
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

          {/* Add Food Button */}
          <button
            type="button"
            onClick={() => setIsAddFoodOpen(true)}
            className="w-full py-2.5 rounded-2xl bg-[#060A14] border border-white/[0.08] hover:border-[#84CC16]/40 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-[#A3E635]" />
            <span>Adicionar Alimento</span>
          </button>
        </div>
      )}

      {/* Food Picker Modal */}
      {isAddFoodOpen && (
        <FoodPickerModal
          isOpen
          onClose={() => setIsAddFoodOpen(false)}
          onSelectFood={handleAddFood}
        />
      )}

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
    </div>
  );
};
