import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  ShoppingBag, 
  Droplets, 
  RotateCcw,
  Zap,
  Coffee,
  Settings2,
  TrendingDown,
  Sun,
  Sunrise,
  Sunset,
  Moon
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

const HUMAN_MEAL_PRESETS = [
  { name: 'Café da Manhã', time: '08:00', icon: Sunrise },
  { name: 'Almoço', time: '12:30', icon: Sun },
  { name: 'Lanche / Pré-Treino', time: '16:30', icon: Sunset },
  { name: 'Jantar', time: '20:00', icon: Moon },
  { name: 'Ceia / Lanche Noturno', time: '22:30', icon: Moon }
];

export const DietOverview: React.FC<DietOverviewProps> = ({ profile: initialProfile, stats }) => {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [isShoppingOpen, setIsShoppingOpen] = useState(false);
  const [isThermoConfigOpen, setIsThermoConfigOpen] = useState(false);
  const [waterDrunkMl, setWaterDrunkMl] = useState<number>(1500);
  const [eatBonusCalories, setEatBonusCalories] = useState<boolean>(false);
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
    const preset = HUMAN_MEAL_PRESETS[mealPlans.length] || { name: `Refeição ${newOrder}`, time: '18:00' };
    const newMeal: MealPlan = {
      name: preset.name,
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

  // Totais consumidos
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

  // Integração com a Termogênese
  const extraBurnKcal = thermogenicLog.totalThermogenicCaloriesBurned;
  const effectiveCalorieTarget = eatBonusCalories 
    ? stats.targetCalories + extraBurnKcal 
    : stats.targetCalories;

  const remainingCalories = Math.max(0, effectiveCalorieTarget - totalCaloriesConsumed);
  const calorieFraction = Math.min(1, totalCaloriesConsumed / (effectiveCalorieTarget || 1));

  // Geometria do Anel Circular Hero (SVG)
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - calorieFraction * circumference;

  // Déficit Real
  const baseTdee = stats.tdee;
  const actualTdeeToday = baseTdee + extraBurnKcal;
  const netDeficitToday = actualTdeeToday - totalCaloriesConsumed;
  const plannedFullDeficit = (baseTdee - stats.targetCalories) + extraBurnKcal;

  return (
    <div className="space-y-4 pb-28 max-w-lg mx-auto p-4 animate-in fade-in duration-300">
      {/* ========================================================= */}
      {/* 1. HERO CIRCULAR ENERGY DIAL (Apple Watch / MacroFactor)   */}
      {/* ========================================================= */}
      <div className="p-6 rounded-[32px] bg-[#090F1E] border border-white/[0.08] shadow-2xl relative overflow-hidden flex flex-col items-center justify-center text-center">
        {/* Subtle Radial Glow */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Circular Ring Gauge */}
        <div className="relative w-44 h-44 flex items-center justify-center my-1">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
            {/* Background Track */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="currentColor"
              strokeWidth="10"
              className="text-[#050811]"
              fill="transparent"
            />
            {/* Progress Stroke */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="url(#calorieGradient)"
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
              fill="transparent"
            />
            <defs>
              <linearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0066FF" />
                <stop offset="50%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
          </svg>

          {/* Centered Dial Information */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
              Restante
            </span>
            <h2 className="text-3xl font-black text-white font-display tracking-tight leading-none mt-1">
              {remainingCalories}
            </h2>
            <span className="text-[11px] font-bold text-slate-400 font-mono mt-0.5">
              kcal
            </span>
          </div>
        </div>

        {/* Dial Meta Legend & Real Deficit Badge */}
        <div className="w-full space-y-2 mt-2">
          <div className="flex items-center justify-center gap-3 text-xs font-mono">
            <span className="text-slate-400">
              Ingerido: <strong className="text-white">{totalCaloriesConsumed}</strong>
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-400">
              Meta: <strong className="text-white">{effectiveCalorieTarget}</strong> kcal
            </span>
          </div>

          {/* Déficit Real Pill & Strategy Toggle */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#060A14] border border-white/[0.08] text-[11px] font-mono shadow-sm">
              <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-300">Déficit Projetado:</span>
              <strong className="text-amber-400 font-bold">
                -{totalCaloriesConsumed === 0 ? plannedFullDeficit : netDeficitToday} kcal
              </strong>
            </div>

            {extraBurnKcal > 0 && (
              <button
                type="button"
                onClick={() => setEatBonusCalories(!eatBonusCalories)}
                className="px-2.5 py-1 rounded-full bg-[#060A14] border border-amber-500/30 text-[10px] font-mono text-amber-300 hover:text-white btn-tactile flex items-center gap-1.5 shadow-sm"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${eatBonusCalories ? 'bg-blue-400' : 'bg-amber-400 animate-pulse'}`} />
                <span>{eatBonusCalories ? '+Comida (+198 kcal)' : 'Acelerar Déficit 🔥'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Macro Triple Pill Row */}
        <div className="grid grid-cols-3 gap-2.5 w-full mt-4 pt-4 border-t border-white/[0.06]">
          {/* Protein */}
          <div className="p-2.5 rounded-2xl bg-[#060A14] border border-white/[0.06] flex flex-col items-center justify-center space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[10px] font-extrabold text-slate-400 uppercase font-mono">Proteína</span>
            </div>
            <p className="text-xs font-extrabold text-white font-mono">
              {Math.round(totalProteinConsumed)}<span className="text-[10px] text-slate-500 font-normal">/{stats.proteinGrams}g</span>
            </p>
            <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (totalProteinConsumed / stats.proteinGrams) * 100)}%` }}
              />
            </div>
          </div>

          {/* Carbs */}
          <div className="p-2.5 rounded-2xl bg-[#060A14] border border-white/[0.06] flex flex-col items-center justify-center space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[10px] font-extrabold text-slate-400 uppercase font-mono">Carbos</span>
            </div>
            <p className="text-xs font-extrabold text-white font-mono">
              {Math.round(totalCarbsConsumed)}<span className="text-[10px] text-slate-500 font-normal">/{stats.carbGrams}g</span>
            </p>
            <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (totalCarbsConsumed / stats.carbGrams) * 100)}%` }}
              />
            </div>
          </div>

          {/* Fats */}
          <div className="p-2.5 rounded-2xl bg-[#060A14] border border-white/[0.06] flex flex-col items-center justify-center space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-extrabold text-slate-400 uppercase font-mono">Gorduras</span>
            </div>
            <p className="text-xs font-extrabold text-white font-mono">
              {Math.round(totalFatConsumed)}<span className="text-[10px] text-slate-500 font-normal">/{stats.fatGrams}g</span>
            </p>
            <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (totalFatConsumed / stats.fatGrams) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. BARRA DE PULSO DIÁRIO RÁPIDO (Café, Pré-Treino, Água)  */}
      {/* ========================================================= */}
      <div className="p-3 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-lg space-y-2">
        <div className="grid grid-cols-3 gap-2">
          {/* Café Pulse Pill */}
          <div className="p-2 rounded-2xl bg-[#060A14] border border-white/[0.06] flex flex-col justify-between space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-bold text-slate-300">Café</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-white">
                {thermogenicLog.blackCoffeeCups}x
              </span>
            </div>
            
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[9px] font-mono text-amber-400 font-bold">
                +{thermogenicLog.blackCoffeeCups * (profile.coffeeConfig?.caffeineMg ? Math.round(profile.coffeeConfig.caffeineMg * 0.18) : 18)} kcal
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleCoffeeChange(-1)}
                  disabled={thermogenicLog.blackCoffeeCups <= 0}
                  className="w-5 h-5 rounded-lg bg-slate-900 text-slate-300 disabled:opacity-20 text-xs font-bold btn-tactile flex items-center justify-center border border-white/5"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => handleCoffeeChange(1)}
                  className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-bold btn-tactile flex items-center justify-center border border-amber-500/30"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Pré-Treino Pulse Pill */}
          <div className="p-2 rounded-2xl bg-[#060A14] border border-white/[0.06] flex flex-col justify-between space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
                <span className="text-[10px] font-bold text-slate-300">Pré-Treino</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-white">
                {thermogenicLog.preWorkoutDoses}d
              </span>
            </div>
            
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[9px] font-mono text-blue-400 font-bold">
                +{thermogenicLog.preWorkoutDoses * 87} kcal
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handlePreWorkoutChange(-1)}
                  disabled={thermogenicLog.preWorkoutDoses <= 0}
                  className="w-5 h-5 rounded-lg bg-slate-900 text-slate-300 disabled:opacity-20 text-xs font-bold btn-tactile flex items-center justify-center border border-white/5"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => handlePreWorkoutChange(1)}
                  className="w-5 h-5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-bold btn-tactile flex items-center justify-center border border-blue-500/30"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Água Pulse Pill */}
          <div className="p-2 rounded-2xl bg-[#060A14] border border-white/[0.06] flex flex-col justify-between space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-bold text-slate-300">Água</span>
              </div>
              <button
                type="button"
                onClick={() => setIsThermoConfigOpen(true)}
                className="text-slate-500 hover:text-white p-0.5"
                title="Configurações"
              >
                <Settings2 className="w-3 h-3" />
              </button>
            </div>
            
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[9px] font-mono text-cyan-400 font-bold">
                {(waterDrunkMl / 1000).toFixed(1)}/{(stats.waterIntakeMl / 1000).toFixed(1)}L
              </span>
              <button
                type="button"
                onClick={() => setWaterDrunkMl((w) => w + 250)}
                className="px-1.5 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-[10px] font-bold btn-tactile border border-cyan-500/30"
              >
                +250ml
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. BARRA DE AÇÕES DA DIETA                                */}
      {/* ========================================================= */}
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-xs font-extrabold text-slate-300 uppercase tracking-widest font-mono flex items-center gap-1.5">
          <span>Timeline de Refeições</span>
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsShoppingOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[#090F1E] border border-white/[0.08] hover:border-emerald-500/40 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 btn-tactile shadow-sm"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
            <span>Compras</span>
          </button>

          <button
            onClick={handleAddMeal}
            className="px-3 py-1.5 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 hover:bg-blue-600/30 text-xs font-bold transition-all flex items-center gap-1 btn-tactile shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Refeição</span>
          </button>

          <button
            onClick={handleResetDay}
            className="p-2 rounded-xl bg-[#090F1E] border border-white/[0.08] text-slate-400 hover:text-white btn-tactile"
            title="Resetar Checks do Dia"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. TIMELINE VERTICAL CONECTADA DE REFEIÇÕES               */}
      {/* ========================================================= */}
      <div className="relative pl-3 space-y-4">
        {/* Continuous Left Timeline Rail */}
        <div className="absolute left-[22px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-blue-500 via-emerald-500 to-slate-800 pointer-events-none" />

        {mealPlans.map((meal, index) => {
          const preset = HUMAN_MEAL_PRESETS[index] || { time: '18:00', icon: Sun };
          const IconComponent = preset.icon;

          return (
            <div key={meal.id || meal.order} className="relative flex items-start gap-3">
              {/* Timeline Node Badge */}
              <div className="w-7 h-7 rounded-full bg-[#050811] border-2 border-blue-500 text-blue-400 flex items-center justify-center shrink-0 z-10 shadow-md">
                <IconComponent className="w-3.5 h-3.5" />
              </div>

              {/* Meal Card Content */}
              <div className="flex-1 min-w-0">
                <MealCard
                  meal={meal}
                  timeLabel={preset.time}
                  onUpdateMeal={handleUpdateMeal}
                  onDeleteMeal={mealPlans.length > 1 ? handleDeleteMeal : undefined}
                />
              </div>
            </div>
          );
        })}
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
