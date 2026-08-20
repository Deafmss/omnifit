import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  ShoppingBag, 
  Droplets, 
  RotateCcw,
  Zap,
  Coffee,
  Settings2,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  UtensilsCrossed,
  AlertCircle
} from 'lucide-react';
import { MealPlan, UserProfile, MetabolicStats, DailyThermogenicLog } from '../../core/storage/types';
import {
  db,
  getTodayThermogenicLog,
  updateTodayThermogenics,
  getActiveProfile,
  ensureFoodDatabaseReady,
  getTodayWaterIntake,
  setTodayWaterIntake
} from '../../core/storage/db';
import { todayLocal } from '../../core/utils/dateUtils';
import { pushMealPlans } from '../../core/supabase/cloudSync';
import { FOOD_DATABASE_MAP } from '../../core/data/tacoDatabase';
import { calculateFoodNutrients } from '../../core/math/macroSolver';
import { MealCard } from './MealCard';
import { ShoppingListModal } from './ShoppingListModal';
import { ThermogenicsConfigModal } from './ThermogenicsConfigModal';
import { DietBuilderModal } from './DietBuilderModal';

interface DietOverviewProps {
  profile: UserProfile;
  stats: MetabolicStats;
}

const HUMAN_MEAL_PRESETS = [
  { name: 'Café da Manhã', time: '08:00', icon: Sunrise },
  { name: 'Almoço', time: '12:30', icon: Sun },
  { name: 'Lanche da Tarde', time: '16:30', icon: Sunset },
  { name: 'Jantar', time: '20:00', icon: Moon },
  { name: 'Ceia', time: '22:30', icon: Moon }
];

export const DietOverview: React.FC<DietOverviewProps> = ({ profile: initialProfile, stats }) => {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [isShoppingOpen, setIsShoppingOpen] = useState(false);
  const [isThermoConfigOpen, setIsThermoConfigOpen] = useState(false);
  const [isSmartWizardOpen, setIsSmartWizardOpen] = useState(false);
  const [waterDrunkMl, setWaterDrunkMl] = useState<number>(0);
  const [eatBonusCalories, setEatBonusCalories] = useState<boolean>(false);
  // Guarda a ORDEM das refeições recolhidas, não o id do banco: os ids são
  // auto-incrementais e o conjunto fixo [2,3,4,5] só acertava na primeira
  // instalação, deixando de funcionar depois de recriar refeições.
  const [expandedMealOrder, setExpandedMealOrder] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [thermogenicLog, setThermogenicLog] = useState<DailyThermogenicLog>({
    date: todayLocal(),
    blackCoffeeCups: 0,
    preWorkoutDoses: 0,
    totalThermogenicCaloriesBurned: 0
  });

  const loadMealsAndProfile = async () => {
    try {
      // Garante que os alimentos personalizados do usuário estejam no mapa em
      // memória antes de somar qualquer macro — sem isto eles contavam 0 kcal.
      await ensureFoodDatabaseReady();

      const plans = await db.mealPlans.orderBy('order').toArray();
      setMealPlans(plans);

      // Espelha o cardápio na nuvem. Cobre também as edições feitas direto na
      // tela (adicionar alimento, trocar porção), que não passam pelo gerador.
      // O cloudSync agrupa as chamadas com debounce.
      void pushMealPlans(plans);

      const thermo = await getTodayThermogenicLog();
      setThermogenicLog(thermo);

      setWaterDrunkMl(await getTodayWaterIntake());

      const active = await getActiveProfile();
      if (active) setProfile(active);
    } catch (err) {
      console.error('Erro ao carregar o cardápio:', err);
      setErrorMsg('Não foi possível carregar seu cardápio. Recarregue a página.');
    }
  };

  useEffect(() => {
    loadMealsAndProfile();
  }, [stats.targetCalories]);

  /** Executa uma escrita no banco reportando falhas ao usuário. */
  const runWrite = async (action: () => Promise<void>, failureMessage: string) => {
    try {
      setErrorMsg(null);
      await action();
    } catch (err) {
      console.error(failureMessage, err);
      setErrorMsg(failureMessage);
    }
  };

  const handleUpdateMeal = async (updated: MealPlan) => {
    if (!updated.id) return;
    await runWrite(async () => {
      await db.mealPlans.put(updated);
      await loadMealsAndProfile();
    }, 'Não foi possível salvar a alteração na refeição.');
  };

  const handleDeleteMeal = async (id: number) => {
    await runWrite(async () => {
      await db.mealPlans.delete(id);
      await loadMealsAndProfile();
    }, 'Não foi possível excluir a refeição.');
  };

  const handleAddMeal = async () => {
    await runWrite(async () => {
      const total = mealPlans.length + 1;
      const preset = HUMAN_MEAL_PRESETS[mealPlans.length] || { name: `Refeição ${total}`, time: '18:00' };

      const newMeal: MealPlan = {
        name: preset.name,
        order: total,
        timeLabel: preset.time,
        targetCalories: Math.round(stats.targetCalories / total),
        targetProtein: Math.round(stats.proteinGrams / total),
        targetCarbs: Math.round(stats.carbGrams / total),
        targetFat: Math.round(stats.fatGrams / total),
        portions: []
      };

      await db.mealPlans.add(newMeal);

      // Redistribui as metas das refeições já existentes: antes só a nova
      // recebia o valor dividido por N+1, e a soma dos alvos deixava de fechar
      // com a meta diária.
      await Promise.all(
        mealPlans.map((meal) =>
          meal.id
            ? db.mealPlans.update(meal.id, {
                targetCalories: Math.round(stats.targetCalories / total),
                targetProtein: Math.round(stats.proteinGrams / total),
                targetCarbs: Math.round(stats.carbGrams / total),
                targetFat: Math.round(stats.fatGrams / total)
              })
            : Promise.resolve(0)
        )
      );

      await loadMealsAndProfile();
    }, 'Não foi possível adicionar a refeição.');
  };

  const handleResetDay = async () => {
    if (!confirm('Desmarcar todos os alimentos consumidos, a água e os termogênicos de hoje?')) {
      return;
    }

    await runWrite(async () => {
      for (const meal of mealPlans) {
        if (meal.id) {
          const resetPortions = meal.portions.map((p) => ({ ...p, consumed: false }));
          await db.mealPlans.put({ ...meal, portions: resetPortions });
        }
      }

      await setTodayWaterIntake(0);
      await updateTodayThermogenics(
        -thermogenicLog.blackCoffeeCups,
        -thermogenicLog.preWorkoutDoses,
        stats.bmr
      );

      await loadMealsAndProfile();
    }, 'Não foi possível reiniciar o dia.');
  };

  const handleWaterChange = async (deltaMl: number) => {
    const next = Math.max(0, waterDrunkMl + deltaMl);
    setWaterDrunkMl(next); // resposta imediata na interface
    await runWrite(async () => {
      const saved = await setTodayWaterIntake(next);
      setWaterDrunkMl(saved);
    }, 'Não foi possível salvar o consumo de água.');
  };

  const handleCoffeeChange = async (delta: number) => {
    await runWrite(async () => {
      const updated = await updateTodayThermogenics(delta, 0, stats.bmr);
      setThermogenicLog(updated);
    }, 'Não foi possível registrar o café.');
  };

  const handlePreWorkoutChange = async (delta: number) => {
    await runWrite(async () => {
      const updated = await updateTodayThermogenics(0, delta, stats.bmr);
      setThermogenicLog(updated);
    }, 'Não foi possível registrar o pré-treino.');
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

  // Uma refeição aberta por vez, identificada pela ordem (estável) e não pelo id.
  const toggleMealCollapse = (mealOrder: number) => {
    setExpandedMealOrder((current) => (current === mealOrder ? -1 : mealOrder));
  };

  return (
    <div className="space-y-4 pb-28 max-w-lg mx-auto p-4 animate-in fade-in duration-300">
      {errorMsg && (
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
      {/* ========================================================= */}
      {/* 1. HERO NUTRITION DIAL (Gym Mobile App UI Kit Style)      */}
      {/* ========================================================= */}
      <div className="p-5 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Left: Circular Dial Gauge */}
          <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="currentColor"
                strokeWidth="11"
                className="text-[#050811]"
                fill="transparent"
              />
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="#84CC16"
                strokeWidth="11"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
                fill="transparent"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <h2 className="text-2xl font-black text-white font-display tracking-tight leading-none">
                {remainingCalories}
              </h2>
              <span className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">
                /{effectiveCalorieTarget} kcal
              </span>
              <span className="text-[9px] font-extrabold text-[#A3E635] uppercase font-mono mt-0.5">
                Restante
              </span>
            </div>
          </div>

          {/* Right: Vertical Macro Breakdown (UI Kit Reference Style) */}
          <div className="flex-1 w-full space-y-2.5">
            {/* Protein */}
            <div className="p-2.5 rounded-2xl bg-[#060A14] border border-white/[0.05] space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#84CC16]" />
                  <span className="font-bold text-slate-200">Proteína</span>
                </div>
                <span className="font-black text-white">
                  {Math.round(totalProteinConsumed)}<span className="text-slate-500 font-normal">/{stats.proteinGrams}g</span>
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#84CC16] rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (totalProteinConsumed / stats.proteinGrams) * 100)}%` }}
                />
              </div>
            </div>

            {/* Carbs */}
            <div className="p-2.5 rounded-2xl bg-[#060A14] border border-white/[0.05] space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="font-bold text-slate-200">Carboidratos</span>
                </div>
                <span className="font-black text-white">
                  {Math.round(totalCarbsConsumed)}<span className="text-slate-500 font-normal">/{stats.carbGrams}g</span>
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (totalCarbsConsumed / stats.carbGrams) * 100)}%` }}
                />
              </div>
            </div>

            {/* Fat */}
            <div className="p-2.5 rounded-2xl bg-[#060A14] border border-white/[0.05] space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="font-bold text-slate-200">Gorduras</span>
                </div>
                <span className="font-black text-white">
                  {Math.round(totalFatConsumed)}<span className="text-slate-500 font-normal">/{stats.fatGrams}g</span>
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (totalFatConsumed / stats.fatGrams) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Real-Time Deficit & Burn Badge */}
        <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
            <span>Déficit Projetado:</span>
            <strong className="text-amber-400 font-bold">
              -{totalCaloriesConsumed === 0 ? plannedFullDeficit : netDeficitToday} kcal
            </strong>
          </div>

          {extraBurnKcal > 0 && (
            <button
              type="button"
              onClick={() => setEatBonusCalories(!eatBonusCalories)}
              className="px-2.5 py-1 rounded-full bg-[#060A14] border border-[#84CC16]/30 text-[10px] font-mono text-[#A3E635] hover:text-white btn-tactile flex items-center gap-1.5"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${eatBonusCalories ? 'bg-blue-400' : 'bg-[#84CC16] animate-pulse'}`} />
              <span>{eatBonusCalories ? '+Comida' : 'Acelerar Déficit 🔥'}</span>
            </button>
          )}
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
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleWaterChange(-250)}
                  disabled={waterDrunkMl <= 0}
                  className="px-1.5 py-0.5 rounded-lg bg-[#060A14] text-slate-400 text-[10px] font-bold btn-tactile border border-white/10 disabled:opacity-40"
                  title="Remover 250 ml"
                >
                  &minus;
                </button>
                <button
                  type="button"
                  onClick={() => handleWaterChange(250)}
                  className="px-1.5 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-[10px] font-bold btn-tactile border border-cyan-500/30"
                >
                  +250ml
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. BARRA DE AÇÕES DA DIETA                                */}
      {/* ========================================================= */}
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-sm font-extrabold text-white font-display">
          Refeições
        </span>

        <div className="flex items-center gap-1.5">
          {/* Diet Builder Button */}
          <button
            onClick={() => setIsSmartWizardOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[#0E1628] border border-white/[0.08] text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 btn-tactile shadow-sm"
            title="Montador de Cardápio"
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-[#A3E635]" />
            <span>Montar Cardápio</span>
          </button>

          <button
            onClick={() => setIsShoppingOpen(true)}
            className="p-1.5 px-2.5 rounded-xl bg-[#090F1E] border border-white/[0.08] hover:border-[#84CC16]/40 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 btn-tactile shadow-sm"
            title="Lista de Compras da Semana"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#A3E635]" />
            <span className="hidden sm:inline">Compras</span>
          </button>

          <button
            onClick={handleAddMeal}
            className="p-1.5 px-2.5 rounded-xl bg-[#84CC16]/20 border border-[#84CC16]/40 text-[#A3E635] hover:bg-[#84CC16]/30 text-xs font-bold transition-all flex items-center gap-1 btn-tactile shadow-sm"
            title="Adicionar Refeição Extra"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Refeição</span>
          </button>

          <button
            onClick={handleResetDay}
            className="p-1.5 rounded-xl bg-[#090F1E] border border-white/[0.08] text-slate-400 hover:text-white btn-tactile"
            title="Resetar Checks do Dia"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. LISTA DE CARDS DE REFEIÇÕES (Gym UI Kit Style)          */}
      {/* ========================================================= */}
      <div className="space-y-3">
        {mealPlans.map((meal, index) => {
          const preset = HUMAN_MEAL_PRESETS[index] || { time: '18:00', icon: Sun };
          const isCollapsed = expandedMealOrder !== meal.order;

          return (
            <MealCard
              key={meal.id || meal.order}
              meal={meal}
              timeLabel={preset.time}
              isCollapsed={isCollapsed}
              onToggleCollapse={() => toggleMealCollapse(meal.order)}
              onUpdateMeal={handleUpdateMeal}
              onDeleteMeal={mealPlans.length > 1 ? handleDeleteMeal : undefined}
            />
          );
        })}
      </div>

      {/* Modais */}
      {isShoppingOpen && (
        <ShoppingListModal
          isOpen
          onClose={() => setIsShoppingOpen(false)}
          mealPlans={mealPlans}
        />
      )}

      {isThermoConfigOpen && (
        <ThermogenicsConfigModal
          isOpen
          onClose={() => setIsThermoConfigOpen(false)}
          profile={profile}
          stats={stats}
          onSaved={loadMealsAndProfile}
        />
      )}

      {isSmartWizardOpen && (
        <DietBuilderModal
          isOpen
          onClose={() => setIsSmartWizardOpen(false)}
          profile={profile}
          stats={stats}
          onApplyDiet={() => {
            loadMealsAndProfile();
          }}
        />
      )}
    </div>
  );
};
