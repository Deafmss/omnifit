import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  ShoppingBag, 
  Droplets, 
  RotateCcw
} from 'lucide-react';
import { MealPlan, UserProfile, MetabolicStats } from '../../core/storage/types';
import { db } from '../../core/storage/db';
import { FOOD_DATABASE_MAP } from '../../core/data/tacoDatabase';
import { calculateFoodNutrients } from '../../core/math/macroSolver';
import { MealCard } from './MealCard';
import { ShoppingListModal } from './ShoppingListModal';

interface DietOverviewProps {
  profile: UserProfile;
  stats: MetabolicStats;
}

export const DietOverview: React.FC<DietOverviewProps> = ({ stats }) => {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [isShoppingOpen, setIsShoppingOpen] = useState(false);
  const [waterDrunkMl, setWaterDrunkMl] = useState<number>(1500);

  const loadMeals = async () => {
    const plans = await db.mealPlans.orderBy('order').toArray();
    setMealPlans(plans);
  };

  useEffect(() => {
    loadMeals();
  }, []);

  const handleUpdateMeal = async (updated: MealPlan) => {
    if (updated.id) {
      await db.mealPlans.put(updated);
      loadMeals();
    }
  };

  const handleDeleteMeal = async (id: number) => {
    await db.mealPlans.delete(id);
    loadMeals();
  };

  const handleAddMeal = async () => {
    const newOrder = mealPlans.length + 1;
    const newMeal: MealPlan = {
      name: `Refeição ${newOrder}`,
      order: newOrder,
      targetCalories: Math.round(stats.targetCalories / (mealPlans.length + 1)),
      targetProtein: Math.round(stats.proteinGrams / (mealPlans.length + 1)),
      targetCarbs: Math.round(stats.carbGrams / (mealPlans.length + 1)),
      targetFat: Math.round(stats.fatGrams / (mealPlans.length + 1)),
      portions: []
    };
    await db.mealPlans.add(newMeal);
    loadMeals();
  };

  const handleResetDay = async () => {
    for (const meal of mealPlans) {
      if (meal.id) {
        const resetPortions = meal.portions.map((p) => ({ ...p, consumed: false }));
        await db.mealPlans.put({ ...meal, portions: resetPortions });
      }
    }
    setWaterDrunkMl(0);
    loadMeals();
  };

  // Calcula totais consumidos no dia
  let totalCaloriesConsumed = 0;
  let totalProteinConsumed = 0;
  let totalCarbsConsumed = 0;
  let totalFatConsumed = 0;

  for (const meal of mealPlans) {
    for (const portion of meal.portions) {
      const food = FOOD_DATABASE_MAP.get(portion.foodId);
      if (!food) continue;
      const nut = calculateFoodNutrients(food, portion.grams);

      if (portion.consumed) {
        totalCaloriesConsumed += nut.calories;
        totalProteinConsumed += nut.protein;
        totalCarbsConsumed += nut.carbs;
        totalFatConsumed += nut.fat;
      }
    }
  }

  const remainingCalories = Math.max(0, stats.targetCalories - totalCaloriesConsumed);

  return (
    <div className="space-y-5 pb-24 max-w-lg mx-auto p-4">
      {/* Daily Target Summary Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-b from-[#0D1527] to-[#0A1120] border border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest">
              Meta Diária Determinística
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h2 className="text-3xl font-black text-white font-mono tracking-tight">
                {totalCaloriesConsumed}
              </h2>
              <span className="text-sm font-semibold text-slate-400 font-mono">
                / {stats.targetCalories} kcal
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Restam</span>
            <p className="text-lg font-black text-emerald-400 font-mono">
              {remainingCalories} kcal
            </p>
          </div>
        </div>

        {/* Macros Grid */}
        <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-white/5">
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/5 space-y-1.5">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
              Proteína
            </span>
            <p className="text-sm font-black text-white font-mono">
              {Math.round(totalProteinConsumed)} <span className="text-slate-500 text-xs font-normal">/ {stats.proteinGrams}g</span>
            </p>
            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${Math.min(100, (totalProteinConsumed / stats.proteinGrams) * 100)}%` }}
              />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/5 space-y-1.5">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
              Carboidratos
            </span>
            <p className="text-sm font-black text-white font-mono">
              {Math.round(totalCarbsConsumed)} <span className="text-slate-500 text-xs font-normal">/ {stats.carbGrams}g</span>
            </p>
            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${Math.min(100, (totalCarbsConsumed / stats.carbGrams) * 100)}%` }}
              />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/5 space-y-1.5">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
              Gorduras
            </span>
            <p className="text-sm font-black text-white font-mono">
              {Math.round(totalFatConsumed)} <span className="text-slate-500 text-xs font-normal">/ {stats.fatGrams}g</span>
            </p>
            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${Math.min(100, (totalFatConsumed / stats.fatGrams) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Water Bar */}
        <div className="pt-2 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-300 font-medium">Água:</span>
            <span className="font-mono font-bold text-cyan-300">
              {waterDrunkMl} / {stats.waterIntakeMl} ml
            </span>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => setWaterDrunkMl((w) => w + 250)}
              className="px-2 py-0.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[11px] font-bold active:scale-95 transition-all"
            >
              +250ml
            </button>
            <button
              onClick={() => setWaterDrunkMl((w) => w + 500)}
              className="px-2 py-0.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[11px] font-bold active:scale-95 transition-all"
            >
              +500ml
            </button>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setIsShoppingOpen(true)}
          className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 border border-white/10 hover:border-emerald-500/40 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <ShoppingBag className="w-4 h-4 text-emerald-400" />
          <span>Lista de Compras</span>
        </button>

        <button
          onClick={handleAddMeal}
          className="py-2.5 px-4 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 hover:bg-blue-600/30 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Refeição</span>
        </button>

        <button
          onClick={handleResetDay}
          className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white transition-all active:scale-95"
          title="Resetar Checks do Dia"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Meals List */}
      <div className="space-y-4">
        {mealPlans.map((meal) => (
          <MealCard
            key={meal.id || meal.order}
            meal={meal}
            onUpdateMeal={handleUpdateMeal}
            onDeleteMeal={mealPlans.length > 1 ? handleDeleteMeal : undefined}
          />
        ))}
      </div>

      {/* Shopping List Modal */}
      <ShoppingListModal
        isOpen={isShoppingOpen}
        onClose={() => setIsShoppingOpen(false)}
        mealPlans={mealPlans}
      />
    </div>
  );
};
