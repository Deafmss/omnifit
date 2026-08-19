import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Repeat, 
  Check, 
  Edit2, 
  X,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2
} from 'lucide-react';
import { MealPlan, FoodItem } from '../../core/storage/types';
import { FOOD_DATABASE_MAP } from '../../core/data/tacoDatabase';
import { calculatePortionsTotal, calculateFoodNutrients, formatHouseholdPortion } from '../../core/math/macroSolver';
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

export const MealCard: React.FC<MealCardProps> = ({
  meal,
  timeLabel,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
  onUpdateMeal,
  onDeleteMeal
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const toggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  const [swapState, setSwapState] = useState<{ originalFoodId: string; originalGrams: number } | null>(null);
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [editingGramsIndex, setEditingGramsIndex] = useState<number | null>(null);
  const [tempGrams, setTempGrams] = useState<number | string>(100);

  const currentTotals = calculatePortionsTotal(meal.portions, FOOD_DATABASE_MAP);
  const allConsumed = meal.portions.length > 0 && meal.portions.every((p) => p.consumed);

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
    const cleanGrams = typeof tempGrams === 'number' && tempGrams > 0 ? tempGrams : Number(tempGrams) || 100;
    newPortions[index].grams = Math.max(1, cleanGrams);
    onUpdateMeal({ ...meal, portions: newPortions });
    setEditingGramsIndex(null);
  };

  const handleAdjustHouseholdUnits = (index: number, delta: number, servingGrams: number) => {
    const newPortions = [...meal.portions];
    const currentGrams = newPortions[index].grams;
    const newGrams = Math.max(servingGrams, currentGrams + (delta * servingGrams));
    newPortions[index].grams = newGrams;
    onUpdateMeal({ ...meal, portions: newPortions });
  };

  return (
    <div className={`rounded-3xl bg-[#090F1E] border transition-all duration-200 shadow-lg ${
      isCollapsed 
        ? 'p-3.5 border-white/[0.06] hover:border-white/[0.14]' 
        : 'p-4 border-white/[0.09] space-y-3.5'
    }`}>
      {/* Meal Header (Clickable Accordion Area) */}
      <div 
        onClick={toggleCollapse}
        className="flex items-center justify-between cursor-pointer select-none group"
      >
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm text-white font-display tracking-tight group-hover:text-blue-400 transition-colors">
              {meal.name}
            </h3>
            {timeLabel && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#060A14] text-[10px] font-mono text-slate-400 border border-white/5">
                <Clock className="w-2.5 h-2.5 text-blue-400" />
                <span>{timeLabel}</span>
              </span>
            )}
            {allConsumed && (
              <span className="flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-[9px] font-extrabold text-emerald-400 font-mono border border-emerald-500/20">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>Feita</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mt-0.5">
            <span className="text-blue-400 font-bold">{currentTotals.calories} kcal</span>
            <span className="text-slate-600">&bull;</span>
            <span>P: {currentTotals.protein}g</span>
            <span className="text-slate-600">&bull;</span>
            <span>C: {currentTotals.carbs}g</span>
            <span className="text-slate-600">&bull;</span>
            <span>G: {currentTotals.fat}g</span>
            {isCollapsed && meal.portions.length > 0 && (
              <>
                <span className="text-slate-600">&bull;</span>
                <span className="text-slate-500 text-[11px] font-sans">
                  {meal.portions.length} {meal.portions.length === 1 ? 'item' : 'itens'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Header Action Buttons + Collapse Indicator */}
        <div className="flex items-center gap-1 shrink-0">
          {!isCollapsed && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddFoodOpen(true);
                }}
                className="p-1.5 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 transition-all text-xs font-bold flex items-center gap-1 btn-tactile"
                title="Adicionar Alimento"
              >
                <Plus className="w-4 h-4" />
              </button>
              {onDeleteMeal && meal.id && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteMeal(meal.id!);
                  }}
                  className="p-1.5 rounded-xl bg-red-600/10 text-red-400 hover:bg-red-600/20 border border-red-500/20 transition-all btn-tactile"
                  title="Excluir Refeição"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}

          {/* Chevron Collapse Indicator */}
          <div className="p-1 text-slate-400 group-hover:text-white transition-colors">
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Food Portions List (Shown Only When Expanded) */}
      {!isCollapsed && (
        <div className="space-y-2 pt-1 border-t border-white/[0.04] animate-in fade-in duration-200">
          {meal.portions.length === 0 ? (
            <div 
              onClick={() => setIsAddFoodOpen(true)}
              className="p-4 rounded-2xl border border-dashed border-white/[0.08] text-center text-slate-500 text-xs cursor-pointer hover:border-blue-500/40 hover:text-slate-400 transition-all"
            >
              Nenhum alimento cadastrado. Toque para incluir da tabela TACO.
            </div>
          ) : (
            meal.portions.map((portion, idx) => {
              const food = FOOD_DATABASE_MAP.get(portion.foodId);
              if (!food) return null;

              const nutrients = calculateFoodNutrients(food, portion.grams);
              const household = formatHouseholdPortion(food, portion.grams);
              const isEditing = editingGramsIndex === idx;

              return (
                <div
                  key={`${portion.foodId}-${idx}`}
                  className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    portion.consumed
                      ? 'bg-[#050811]/70 border-white/[0.03] opacity-60'
                      : 'bg-[#060A14] border-white/[0.06] hover:border-white/[0.12]'
                  }`}
                >
                  {/* Checkbox & Name */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={() => togglePortionConsumed(idx)}
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 btn-tactile ${
                        portion.consumed
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950 glow-emerald'
                          : 'border-white/20 hover:border-blue-400 bg-slate-950/50'
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
                      <p className="text-[10px] text-slate-400 font-mono">
                        {nutrients.calories} kcal &bull; P: {nutrients.protein}g | C: {nutrients.carbs}g | G: {nutrients.fat}g
                      </p>
                    </div>
                  </div>

                  {/* Grams / Household Units & Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={tempGrams}
                          onChange={(e) => setTempGrams(e.target.value === '' ? '' : e.target.value)}
                          className="w-16 px-1.5 py-0.5 bg-slate-950 border border-blue-500 rounded-lg text-xs text-white font-bold text-center font-mono"
                          autoFocus
                        />
                        <span className="text-[10px] text-slate-400 font-mono">g</span>
                        <button
                          onClick={() => handleSaveGrams(idx)}
                          className="p-1 rounded-lg bg-blue-600 text-white hover:bg-blue-500 btn-tactile"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {/* Se o alimento tiver medida caseira (ex: ovos, pão, scoop) */}
                        {household.hasHousehold && food.servingGrams ? (
                          <div className="flex items-center gap-1 bg-[#0E1629] border border-white/5 rounded-xl px-1.5 py-0.5">
                            <button
                              type="button"
                              onClick={() => handleAdjustHouseholdUnits(idx, -1, food.servingGrams!)}
                              className="w-4 h-4 rounded text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold btn-tactile"
                            >
                              -
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => {
                                setEditingGramsIndex(idx);
                                setTempGrams(portion.grams);
                              }}
                              className="text-xs font-bold text-slate-200 font-mono px-1 hover:text-blue-400 transition-colors whitespace-nowrap"
                              title="Clique para editar gramas exatas"
                            >
                              {household.units} {household.abbrevUnit} <span className="text-slate-500 text-[10px]">({portion.grams}g)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleAdjustHouseholdUnits(idx, 1, food.servingGrams!)}
                              className="w-4 h-4 rounded text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold btn-tactile"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingGramsIndex(idx);
                              setTempGrams(portion.grams);
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#0E1629] hover:bg-slate-800 text-xs font-bold text-slate-300 font-mono border border-white/5 transition-all btn-tactile"
                          >
                            <span>{portion.grams}g</span>
                            <Edit2 className="w-2.5 h-2.5 text-slate-500" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Macro Swap Button */}
                    <button
                      onClick={() =>
                        setSwapState({
                          originalFoodId: portion.foodId,
                          originalGrams: portion.grams
                        })
                      }
                      className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-all btn-tactile"
                      title="Troca Inteligente (Macro-Swap)"
                    >
                      <Repeat className="w-3.5 h-3.5" />
                    </button>

                    {/* Remove Portion */}
                    <button
                      onClick={() => handleRemovePortion(idx)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all btn-tactile"
                      title="Remover"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modais */}
      {swapState && (
        <MacroSwapModal
          isOpen={true}
          onClose={() => setSwapState(null)}
          originalFoodId={swapState.originalFoodId}
          originalGrams={swapState.originalGrams}
          onApplySwap={handleApplySwap}
        />
      )}

      <FoodPickerModal
        isOpen={isAddFoodOpen}
        onClose={() => setIsAddFoodOpen(false)}
        onSelectFood={handleAddFood}
      />
    </div>
  );
};
