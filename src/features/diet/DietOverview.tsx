import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  ShoppingBag, 
  Droplets, 
  RotateCcw,
  Flame,
  Zap,
  Coffee,
  Settings2,
  TrendingDown
} from 'lucide-react';
import { MealPlan, UserProfile, MetabolicStats, DailyThermogenicLog } from '../../core/storage/types';
import { db, getTodayThermogenicLog, updateTodayThermogenics, getActiveProfile } from '../../core/storage/db';
import { FOOD_DATABASE_MAP } from '../../core/data/tacoDatabase';
import { calculateFoodNutrients } from '../../core/math/macroSolver';
import { MealCard } from './MealCard';
import { ShoppingListModal } from './ShoppingListModal';
import { ThermogenicsConfigModal } from './ThermogenicsConfigModal';

interface DietOverviewProps {
  profile: UserProfile;
  stats: MetabolicStats;
}

export const DietOverview: React.FC<DietOverviewProps> = ({ profile: initialProfile, stats }) => {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [isShoppingOpen, setIsShoppingOpen] = useState(false);
  const [isThermoConfigOpen, setIsThermoConfigOpen] = useState(false);
  const [waterDrunkMl, setWaterDrunkMl] = useState<number>(1500);
  const [eatBonusCalories, setEatBonusCalories] = useState<boolean>(false); // Se true, soma ao orçamento; se false, soma ao déficit de gordura
  const [thermogenicLog, setThermogenicLog] = useState<DailyThermogenicLog>({
    date: new Date().toISOString().split('T')[0],
    blackCoffeeCups: 0,
    preWorkoutDoses: 0,
    totalThermogenicCaloriesBurned: 0
  });

  const loadMealsAndProfile = async () => {
    const plans = await db.mealPlans.orderBy('order').toArray();
    setMealPlans(plans);

    const thermo = await getTodayThermogenicLog();
    setThermogenicLog(thermo);

    const active = await getActiveProfile();
    if (active) setProfile(active);
  };

  useEffect(() => {
    loadMealsAndProfile();
  }, [stats.bmr]);

  const handleUpdateMeal = async (updated: MealPlan) => {
    if (updated.id) {
      await db.mealPlans.put(updated);
      loadMealsAndProfile();
    }
  };

  const handleDeleteMeal = async (id: number) => {
    await db.mealPlans.delete(id);
    loadMealsAndProfile();
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
    loadMealsAndProfile();
  };

  const handleResetDay = async () => {
    for (const meal of mealPlans) {
      if (meal.id) {
        const resetPortions = meal.portions.map((p) => ({ ...p, consumed: false }));
        await db.mealPlans.put({ ...meal, portions: resetPortions });
      }
    }
    setWaterDrunkMl(0);
    const resetThermo = await updateTodayThermogenics(
      -thermogenicLog.blackCoffeeCups,
      -thermogenicLog.preWorkoutDoses,
      stats.bmr
    );
    setThermogenicLog(resetThermo);
    loadMealsAndProfile();
  };

  const handleCoffeeChange = async (delta: number) => {
    const updated = await updateTodayThermogenics(delta, 0, stats.bmr);
    setThermogenicLog(updated);
  };

  const handlePreWorkoutChange = async (delta: number) => {
    const updated = await updateTodayThermogenics(0, delta, stats.bmr);
    setThermogenicLog(updated);
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

  // Integração determinística de queima termogênica
  const extraBurnKcal = thermogenicLog.totalThermogenicCaloriesBurned;
  
  // Orçamento calórico com ou sem inclusão do bônus
  const effectiveCalorieTarget = eatBonusCalories 
    ? stats.targetCalories + extraBurnKcal 
    : stats.targetCalories;

  const remainingCalories = Math.max(0, effectiveCalorieTarget - totalCaloriesConsumed);
  const caloriePercentage = Math.min(100, Math.round((totalCaloriesConsumed / effectiveCalorieTarget) * 100));

  // Cálculo do Déficit Fisiológico Real do Dia
  const baseTdee = stats.tdee;
  const actualTdeeToday = baseTdee + extraBurnKcal;
  const netDeficitToday = actualTdeeToday - totalCaloriesConsumed;
  const plannedFullDeficit = (baseTdee - stats.targetCalories) + extraBurnKcal;

  const coffeeServingMl = profile.coffeeConfig?.servingMl || 150;
  const coffeeCaffeineMg = profile.coffeeConfig?.caffeineMg || 100;
  const preDoseGrams = profile.preWorkoutFormula?.doseGrams || 10;
  const preCaffeineMg = profile.preWorkoutFormula?.caffeineMg || 400;

  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto p-4 animate-in fade-in duration-300">
      {/* Telemetry Card (Whoop + Linear Analytics com Déficit Integrado) */}
      <div className="p-5 rounded-3xl bg-[#090F1E] border border-white/[0.09] shadow-2xl relative overflow-hidden space-y-4">
        {/* Subtle Background Radial Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
                Balanço Energético Hoje
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-1">
              <h2 className="text-4xl font-extrabold text-white font-display tracking-tight">
                {totalCaloriesConsumed}
              </h2>
              <span className="text-sm font-semibold text-slate-400 font-mono">
                / {effectiveCalorieTarget} kcal
              </span>
              {extraBurnKcal > 0 && eatBonusCalories && (
                <span className="text-[10px] text-amber-400 font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  +{extraBurnKcal} bônus
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono block">
              Restante
            </span>
            <p className="text-xl font-extrabold text-emerald-400 font-mono mt-0.5">
              {remainingCalories} <span className="text-xs text-emerald-500/70 font-normal">kcal</span>
            </p>
          </div>
        </div>

        {/* Global Thin Precision Progress Line */}
        <div className="h-1.5 w-full bg-[#050811] rounded-full overflow-hidden border border-white/[0.05]">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${caloriePercentage}%` }}
          />
        </div>

        {/* Déficit Real Integrado Banner (Estimulantes + TDEE - Ingestão) */}
        <div className="p-3 rounded-2xl bg-[#060A14] border border-white/[0.06] flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-200">Déficit Real Projetado:</span>
                {extraBurnKcal > 0 && (
                  <span className="text-[10px] text-amber-400 font-bold px-1 py-0.2 rounded bg-amber-500/15">
                    +{extraBurnKcal} kcal café/pré
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-sans">
                {totalCaloriesConsumed === 0 
                  ? `Se bater a meta de comida, seu déficit final será de -${plannedFullDeficit} kcal`
                  : `Déficit acumulado até agora: -${netDeficitToday} kcal`}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-sm font-black text-amber-400 font-mono">
              -{totalCaloriesConsumed === 0 ? plannedFullDeficit : netDeficitToday} kcal
            </span>
          </div>
        </div>

        {/* Tremor-Style Minimalist Macro Cards */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {/* Protein */}
          <div className="p-3 rounded-2xl bg-[#060A14] border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider font-mono">
                Proteína
              </span>
              <span className="text-[10px] font-mono text-slate-400 font-bold">
                {Math.round((totalProteinConsumed / stats.proteinGrams) * 100)}%
              </span>
            </div>
            <p className="text-sm font-extrabold text-white font-mono">
              {Math.round(totalProteinConsumed)}<span className="text-slate-500 text-xs font-normal">/{stats.proteinGrams}g</span>
            </p>
            <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (totalProteinConsumed / stats.proteinGrams) * 100)}%` }}
              />
            </div>
          </div>

          {/* Carbs */}
          <div className="p-3 rounded-2xl bg-[#060A14] border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono">
                Carbos
              </span>
              <span className="text-[10px] font-mono text-slate-400 font-bold">
                {Math.round((totalCarbsConsumed / stats.carbGrams) * 100)}%
              </span>
            </div>
            <p className="text-sm font-extrabold text-white font-mono">
              {Math.round(totalCarbsConsumed)}<span className="text-slate-500 text-xs font-normal">/{stats.carbGrams}g</span>
            </p>
            <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (totalCarbsConsumed / stats.carbGrams) * 100)}%` }}
              />
            </div>
          </div>

          {/* Fats */}
          <div className="p-3 rounded-2xl bg-[#060A14] border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">
                Gorduras
              </span>
              <span className="text-[10px] font-mono text-slate-400 font-bold">
                {Math.round((totalFatConsumed / stats.fatGrams) * 100)}%
              </span>
            </div>
            <p className="text-sm font-extrabold text-white font-mono">
              {Math.round(totalFatConsumed)}<span className="text-slate-500 text-xs font-normal">/{stats.fatGrams}g</span>
            </p>
            <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (totalFatConsumed / stats.fatGrams) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Water Bar */}
        <div className="pt-2 flex items-center justify-between gap-3 text-xs border-t border-white/[0.06]">
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
              className="px-2.5 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[11px] font-bold btn-tactile"
            >
              +250ml
            </button>
            <button
              onClick={() => setWaterDrunkMl((w) => w + 500)}
              className="px-2.5 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[11px] font-bold btn-tactile"
            >
              +500ml
            </button>
          </div>
        </div>
      </div>

      {/* Thermogenic & Stimulant Burn Tracker Card (Linear Style com Ação Direta no Déficit) */}
      <div className="p-4 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs font-mono">
            <Flame className="w-4 h-4 fill-amber-400" />
            <span className="uppercase tracking-wider">Termogênese por Estimulantes</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-black text-amber-300">
              +{thermogenicLog.totalThermogenicCaloriesBurned} kcal
            </span>
            <button
              type="button"
              onClick={() => setIsThermoConfigOpen(true)}
              className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-colors btn-tactile"
              title="Calibrar dosagens de café e pré-treino"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Coffee Tracker */}
          <div className="p-3 rounded-2xl bg-[#060A14] border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Coffee className="w-4 h-4 text-amber-400" />
                <span>Café Puro</span>
              </div>
              <span className="text-xs font-mono font-bold text-white">
                {thermogenicLog.blackCoffeeCups}x
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight font-mono">
              {coffeeServingMl}ml (~{coffeeCaffeineMg}mg caf)
            </p>
            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={() => handleCoffeeChange(-1)}
                disabled={thermogenicLog.blackCoffeeCups <= 0}
                className="flex-1 py-1 rounded-xl bg-[#0D1527] hover:bg-slate-800 disabled:opacity-30 text-xs font-bold text-slate-300 btn-tactile border border-white/5"
              >
                -1
              </button>
              <button
                onClick={() => handleCoffeeChange(1)}
                className="flex-1 py-1 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-xs font-bold text-amber-400 btn-tactile"
              >
                +1 ☕
              </button>
            </div>
          </div>

          {/* Pre-Workout Tracker */}
          <div className="p-3 rounded-2xl bg-[#060A14] border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Zap className="w-4 h-4 text-blue-400 fill-blue-400" />
                <span>Pré-Treino</span>
              </div>
              <span className="text-xs font-mono font-bold text-white">
                {thermogenicLog.preWorkoutDoses} dose
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight truncate font-mono">
              {preDoseGrams}g ({preCaffeineMg}mg caf)
            </p>
            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={() => handlePreWorkoutChange(-1)}
                disabled={thermogenicLog.preWorkoutDoses <= 0}
                className="flex-1 py-1 rounded-xl bg-[#0D1527] hover:bg-slate-800 disabled:opacity-30 text-xs font-bold text-slate-300 btn-tactile border border-white/5"
              >
                -1
              </button>
              <button
                onClick={() => handlePreWorkoutChange(1)}
                className="flex-1 py-1 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-xs font-bold text-blue-400 btn-tactile"
              >
                +1 ⚡
              </button>
            </div>
          </div>
        </div>

        {/* Destino das Calorias Termogênicas Toggle */}
        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400">Como aplicar as calorias queimadas?</span>
          <button
            type="button"
            onClick={() => setEatBonusCalories(!eatBonusCalories)}
            className="px-2.5 py-1 rounded-xl bg-[#060A14] border border-white/[0.08] text-[10px] font-mono font-bold text-slate-300 hover:text-white btn-tactile flex items-center gap-1.5"
          >
            <span className={`w-2 h-2 rounded-full ${eatBonusCalories ? 'bg-blue-400' : 'bg-emerald-400'}`} />
            <span>{eatBonusCalories ? 'Somar ao Orçamento (+Comida)' : 'Acelerar Déficit de Gordura 🔥'}</span>
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setIsShoppingOpen(true)}
          className="flex-1 py-2.5 px-3 rounded-2xl bg-[#090F1E] border border-white/[0.08] hover:border-emerald-500/40 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 btn-tactile shadow-sm"
        >
          <ShoppingBag className="w-4 h-4 text-emerald-400" />
          <span>Lista de Compras</span>
        </button>

        <button
          onClick={handleAddMeal}
          className="py-2.5 px-4 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 hover:bg-blue-600/30 text-xs font-bold transition-all flex items-center gap-1.5 btn-tactile shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Refeição</span>
        </button>

        <button
          onClick={handleResetDay}
          className="p-2.5 rounded-2xl bg-[#090F1E] border border-white/[0.08] text-slate-400 hover:text-white transition-all btn-tactile"
          title="Resetar Checks do Dia"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Meals List */}
      <div className="space-y-3">
        {mealPlans.map((meal) => (
          <MealCard
            key={meal.id || meal.order}
            meal={meal}
            onUpdateMeal={handleUpdateMeal}
            onDeleteMeal={mealPlans.length > 1 ? handleDeleteMeal : undefined}
          />
        ))}
      </div>

      {/* Modais */}
      <ShoppingListModal
        isOpen={isShoppingOpen}
        onClose={() => setIsShoppingOpen(false)}
        mealPlans={mealPlans}
      />

      <ThermogenicsConfigModal
        isOpen={isThermoConfigOpen}
        onClose={() => setIsThermoConfigOpen(false)}
        profile={profile}
        onSaved={loadMealsAndProfile}
      />
    </div>
  );
};
