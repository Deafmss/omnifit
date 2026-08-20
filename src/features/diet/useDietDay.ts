import { useCallback, useEffect, useMemo, useState } from 'react';
import { MealPlan, UserProfile, MetabolicStats, DailyThermogenicLog } from '../../core/storage/types';
import {
  db,
  getTodayThermogenicLog,
  updateTodayThermogenics,
  getActiveProfile,
  ensureFoodDatabaseReady,
  getTodayWaterIntake,
  setTodayWaterIntake,
  ensureDailyRollover,
  clearFoodLogForDate
} from '../../core/storage/db';
import { pushMealPlans } from '../../core/supabase/cloudSync';
import { FOOD_DATABASE_MAP } from '../../core/data/tacoDatabase';
import { calculateFoodNutrients } from '../../core/math/macroSolver';
import { todayLocal } from '../../core/utils/dateUtils';

/**
 * Estado e regras do dia alimentar, separados da apresentação.
 *
 * A tela de dieta tinha 672 linhas com carregamento, escrita no banco,
 * cálculo de balanço energético e JSX no mesmo arquivo. Aqui fica só a lógica,
 * o que também a torna testável sem renderizar nada.
 */

const MEAL_PRESETS = [
  { name: 'Café da Manhã', time: '08:00' },
  { name: 'Almoço', time: '12:30' },
  { name: 'Lanche da Tarde', time: '16:30' },
  { name: 'Jantar', time: '20:00' },
  { name: 'Ceia', time: '22:30' }
];

export interface ConsumedTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface EnergyBalance {
  /** Déficit (ou superávit) que o dia fecha se o plano for seguido. */
  projectedEndOfDay: number;
  /** Gasto do dia menos o já registrado. Diminui conforme o usuário consome. */
  current: number;
  /** Diferença entre gasto estimado e meta, sem os estimulantes. */
  planned: number;
}

export function useDietDay(initialProfile: UserProfile, stats: MetabolicStats) {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [waterDrunkMl, setWaterDrunkMl] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [thermogenicLog, setThermogenicLog] = useState<DailyThermogenicLog>({
    date: todayLocal(),
    blackCoffeeCups: 0,
    preWorkoutDoses: 0,
    totalThermogenicCaloriesBurned: 0
  });

  const reload = useCallback(async () => {
    try {
      // Os alimentos personalizados precisam estar no mapa em memória antes de
      // somar qualquer macro — sem isto eles contavam 0 kcal.
      await ensureFoodDatabaseReady();

      // Virada do dia: zera as marcações se o último uso foi em outra data.
      // O histórico permanente já está no diário alimentar.
      await ensureDailyRollover();

      const plans = await db.mealPlans.orderBy('order').toArray();
      setMealPlans(plans);

      // Espelha o cardápio na nuvem, cobrindo também as edições feitas na tela
      // que não passam pelo gerador. O cloudSync agrupa com debounce.
      void pushMealPlans(plans);

      setThermogenicLog(await getTodayThermogenicLog());
      setWaterDrunkMl(await getTodayWaterIntake());

      const active = await getActiveProfile();
      if (active) setProfile(active);
    } catch (err) {
      console.error('Erro ao carregar o cardápio:', err);
      setErrorMsg('Não foi possível carregar seu cardápio. Recarregue a página.');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, stats.targetCalories]);

  /** Executa uma escrita reportando falhas ao usuário em vez de falhar em silêncio. */
  const runWrite = useCallback(
    async (action: () => Promise<void>, failureMessage: string) => {
      try {
        setErrorMsg(null);
        await action();
      } catch (err) {
        console.error(failureMessage, err);
        setErrorMsg(failureMessage);
      }
    },
    []
  );

  const updateMeal = useCallback(
    async (updated: MealPlan) => {
      if (!updated.id) return;
      await runWrite(async () => {
        await db.mealPlans.put(updated);
        await reload();
      }, 'Não foi possível salvar a alteração na refeição.');
    },
    [reload, runWrite]
  );

  const deleteMeal = useCallback(
    async (id: number) => {
      await runWrite(async () => {
        await db.mealPlans.delete(id);
        await reload();
      }, 'Não foi possível excluir a refeição.');
    },
    [reload, runWrite]
  );

  const addMeal = useCallback(async () => {
    await runWrite(async () => {
      const total = mealPlans.length + 1;
      const preset = MEAL_PRESETS[mealPlans.length] || { name: `Refeição ${total}`, time: '18:00' };

      const share = {
        targetCalories: Math.round(stats.targetCalories / total),
        targetProtein: Math.round(stats.proteinGrams / total),
        targetCarbs: Math.round(stats.carbGrams / total),
        targetFat: Math.round(stats.fatGrams / total)
      };

      await db.mealPlans.add({
        name: preset.name,
        order: total,
        timeLabel: preset.time,
        portions: [],
        ...share
      });

      // Redistribui as metas das refeições existentes: antes só a nova recebia
      // o valor dividido por N+1, e a soma dos alvos deixava de fechar.
      await Promise.all(
        mealPlans.map((meal) => (meal.id ? db.mealPlans.update(meal.id, share) : Promise.resolve(0)))
      );

      await reload();
    }, 'Não foi possível adicionar a refeição.');
  }, [mealPlans, reload, runWrite, stats]);

  const resetDay = useCallback(async () => {
    if (!confirm('Desmarcar todos os alimentos consumidos, a água e os termogênicos de hoje?')) {
      return;
    }

    await runWrite(async () => {
      for (const meal of mealPlans) {
        if (!meal.id) continue;
        await db.mealPlans.put({
          ...meal,
          portions: meal.portions.map((p) => ({ ...p, consumed: false }))
        });
      }

      // Limpa também o diário do dia, senão o histórico continuaria registrando
      // o que o usuário acabou de desmarcar.
      await clearFoodLogForDate(todayLocal());

      await setTodayWaterIntake(0);
      await updateTodayThermogenics(
        -thermogenicLog.blackCoffeeCups,
        -thermogenicLog.preWorkoutDoses,
        stats.bmr
      );

      await reload();
    }, 'Não foi possível reiniciar o dia.');
  }, [mealPlans, reload, runWrite, stats.bmr, thermogenicLog]);

  const changeWater = useCallback(
    async (deltaMl: number) => {
      const next = Math.max(0, waterDrunkMl + deltaMl);
      setWaterDrunkMl(next); // resposta imediata na interface
      await runWrite(async () => {
        setWaterDrunkMl(await setTodayWaterIntake(next));
      }, 'Não foi possível salvar o consumo de água.');
    },
    [runWrite, waterDrunkMl]
  );

  const changeCoffee = useCallback(
    async (delta: number) => {
      await runWrite(async () => {
        setThermogenicLog(await updateTodayThermogenics(delta, 0, stats.bmr));
      }, 'Não foi possível registrar o café.');
    },
    [runWrite, stats.bmr]
  );

  const changePreWorkout = useCallback(
    async (delta: number) => {
      await runWrite(async () => {
        setThermogenicLog(await updateTodayThermogenics(0, delta, stats.bmr));
      }, 'Não foi possível registrar o pré-treino.');
    },
    [runWrite, stats.bmr]
  );

  /** Soma dos macros das porções marcadas como consumidas. */
  const consumed = useMemo<ConsumedTotals>(() => {
    const totals: ConsumedTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

    for (const meal of mealPlans) {
      for (const portion of meal.portions) {
        if (!portion.consumed) continue;

        const food = FOOD_DATABASE_MAP.get(portion.foodId);
        if (!food) continue;

        const nut = calculateFoodNutrients(food, portion.grams);
        totals.calories += nut.calories;
        totals.protein += nut.protein;
        totals.carbs += nut.carbs;
        totals.fat += nut.fat;
      }
    }

    return totals;
  }, [mealPlans]);

  const extraBurnKcal = thermogenicLog.totalThermogenicCaloriesBurned;

  const balance = useMemo<EnergyBalance>(() => {
    const planned = stats.tdee - stats.targetCalories;

    return {
      planned,
      // O que o dia fecha seguindo o plano, já com a queima estimada.
      projectedEndOfDay: planned + extraBurnKcal,
      // Gasto do dia menos o registrado até agora. Usa o gasto de 24 h: pela
      // manhã é otimista, e só descreve a realidade quando o dia termina.
      current: stats.tdee + extraBurnKcal - consumed.calories
    };
  }, [consumed.calories, extraBurnKcal, stats.targetCalories, stats.tdee]);

  return {
    profile,
    mealPlans,
    waterDrunkMl,
    thermogenicLog,
    extraBurnKcal,
    errorMsg,
    consumed,
    balance,
    reload,
    updateMeal,
    deleteMeal,
    addMeal,
    resetDay,
    changeWater,
    changeCoffee,
    changePreWorkout
  };
}
