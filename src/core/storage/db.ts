import Dexie, { type EntityTable } from 'dexie';
import { 
  UserProfile, 
  MealPlan, 
  FoodItem, 
  WorkoutRoutine, 
  WorkoutSessionLog, 
  WeightLog, 
  CheckInLog,
  DailyThermogenicLog
} from './types';
import { calculateWeightEMA } from '../math/adaptiveEngine';
import { 
  USER_PRE_WORKOUT_FORMULA, 
  DEFAULT_COFFEE_CONFIG, 
  calculateCaffeineThermogenesis, 
  calculatePreWorkoutThermogenesis 
} from '../math/thermogenics';
import { TACO_FOOD_DATABASE, FOOD_DATABASE_MAP, resetFoodDatabaseMap } from '../data/tacoDatabase';
import {
  SplitTemplateType,
  buildRoutines,
  templateForFrequency
} from '../data/workoutTemplates';
import { generateSmartMealPlan } from '../math/dietOptimizer';
import { todayLocal, currentMonthPrefix, startOfWeekMonday, addDays, toLocalDateString } from '../utils/dateUtils';
import { pushProfile, pushMealPlans, pushRoutines, pushWeightLog } from '../supabase/cloudSync';

export type { SplitTemplateType };

export class OmniFitDatabase extends Dexie {
  profiles!: EntityTable<UserProfile, 'id'>;
  mealPlans!: EntityTable<MealPlan, 'id'>;
  customFoods!: EntityTable<FoodItem, 'id'>;
  routines!: EntityTable<WorkoutRoutine, 'id'>;
  sessionLogs!: EntityTable<WorkoutSessionLog, 'id'>;
  weightLogs!: EntityTable<WeightLog, 'id'>;
  checkInLogs!: EntityTable<CheckInLog, 'id'>;
  thermogenicLogs!: EntityTable<DailyThermogenicLog, 'id'>;

  constructor(dbName: string = 'OmniFitDatabase') {
    super(dbName);
    this.version(2).stores({
      profiles: '++id, isCalibrated, createdAt',
      mealPlans: '++id, order, name',
      customFoods: 'id, name, category',
      routines: '++id, splitCode, name',
      sessionLogs: '++id, date, completed',
      weightLogs: '++id, date',
      checkInLogs: '++id, date',
      thermogenicLogs: '++id, date'
    });
  }
}

function getActiveDbName(): string {
  const activeUserId = typeof localStorage !== 'undefined' ? localStorage.getItem('omnifit_active_user_id') : null;
  return activeUserId ? `OmniFit_user_${activeUserId}` : 'OmniFitDatabase';
}

let currentDbInstance = new OmniFitDatabase(getActiveDbName());

export function switchUserDb(userId: string) {
  const targetName = `OmniFit_user_${userId}`;

  // Idempotente: trocar para o banco que já está ativo fecharia a conexão
  // atual e derrubaria qualquer leitura em voo com DatabaseClosedError.
  // A tela de login e o App chamam esta função em sequência para a mesma conta.
  if (currentDbInstance.name === targetName) return;

  try {
    currentDbInstance.close();
  } catch (e) {
    // ignora erro ao fechar
  }
  currentDbInstance = new OmniFitDatabase(targetName);

  // O mapa de alimentos é global e em memória. Sem esta limpeza, os alimentos
  // personalizados da conta anterior continuariam visíveis na nova conta,
  // furando o isolamento entre contêineres de usuário.
  resetFoodDatabaseMap();
  foodMapHydratedFor = null;
}

export const db: OmniFitDatabase = new Proxy({} as OmniFitDatabase, {
  get(_, prop) {
    const target = currentDbInstance as any;
    const value = target[prop];
    if (typeof value === 'function') {
      return value.bind(target);
    }
    return value;
  }
});

/** Nome do banco cujos alimentos personalizados já estão no mapa em memória. */
let foodMapHydratedFor: string | null = null;

/**
 * Retorna todos os alimentos oficiais TACO + Alimentos Personalizados cadastrados.
 */
export async function getAllFoods(): Promise<FoodItem[]> {
  const custom = await db.customFoods.toArray();
  for (const c of custom) {
    FOOD_DATABASE_MAP.set(c.id, c);
  }
  foodMapHydratedFor = currentDbInstance.name;
  return [...TACO_FOOD_DATABASE, ...custom];
}

/**
 * Garante que os alimentos personalizados do usuário ativo estejam no mapa em
 * memória antes de qualquer cálculo nutricional.
 *
 * Sem isto, telas que leem FOOD_DATABASE_MAP diretamente (resumo da dieta,
 * cartões de refeição) ignoravam silenciosamente tudo que o usuário cadastrou
 * à mão ou importou do Open Food Facts, contando 0 kcal para esses itens.
 */
export async function ensureFoodDatabaseReady(): Promise<void> {
  if (foodMapHydratedFor === currentDbInstance.name) return;
  await getAllFoods();
}

/**
 * Salva ou atualiza um item no banco local e atualiza o mapa em memória.
 */
export async function saveFoodItem(food: FoodItem): Promise<void> {
  await db.customFoods.put(food);
  FOOD_DATABASE_MAP.set(food.id, food);
}

/**
 * Obtém o perfil ativo do usuário.
 */
export async function getActiveProfile(): Promise<UserProfile | undefined> {
  const profiles = await db.profiles.toArray();
  return profiles[0];
}

/**
 * Salva ou atualiza o perfil do usuário.
 */
export async function saveProfile(profile: UserProfile): Promise<number> {
  const normalized: UserProfile = {
    ...profile,
    preWorkoutFormula: profile.preWorkoutFormula || USER_PRE_WORKOUT_FORMULA,
    coffeeConfig: profile.coffeeConfig || DEFAULT_COFFEE_CONFIG,
    updatedAt: new Date().toISOString()
  };

  const existing = await getActiveProfile();
  let id: number;

  if (existing?.id) {
    // O `id` é a chave primária e não pode ir no objeto de atualização.
    const { id: _ignored, ...changes } = normalized;
    await db.profiles.update(existing.id, changes);
    id = existing.id;
  } else {
    id = (await db.profiles.add({
      ...normalized,
      createdAt: profile.createdAt || new Date().toISOString()
    })) as number;
  }

  // Espelha na nuvem quando há sessão do Supabase (não bloqueia o fluxo local).
  void pushProfile(normalized);

  return id;
}

/**
 * Registra ou atualiza o consumo termogênico de café e pré-treino do dia.
 */
export async function updateTodayThermogenics(
  coffeeDelta: number,
  preWorkoutDelta: number,
  bmr: number
): Promise<DailyThermogenicLog> {
  const today = todayLocal();
  const existing = await db.thermogenicLogs.where('date').equals(today).first();

  const currentCoffee = Math.max(0, (existing?.blackCoffeeCups || 0) + coffeeDelta);
  const currentPreWorkout = Math.max(0, (existing?.preWorkoutDoses || 0) + preWorkoutDelta);

  const profile = await getActiveProfile();
  const coffeeCaffeinePerCup = profile?.coffeeConfig?.caffeineMg || DEFAULT_COFFEE_CONFIG.caffeineMg;
  const formula = profile?.preWorkoutFormula || USER_PRE_WORKOUT_FORMULA;

  // Calcula queima de café
  const coffeeBurn = calculateCaffeineThermogenesis(currentCoffee * coffeeCaffeinePerCup, bmr).burnKcal;

  // Calcula queima de pré-treino
  const preWorkoutBurn = calculatePreWorkoutThermogenesis(formula, bmr, currentPreWorkout).totalThermogenicKcal;

  const totalBurn = coffeeBurn + preWorkoutBurn;

  const logData: DailyThermogenicLog = {
    date: today,
    blackCoffeeCups: currentCoffee,
    preWorkoutDoses: currentPreWorkout,
    totalThermogenicCaloriesBurned: totalBurn
  };

  if (existing?.id) {
    await db.thermogenicLogs.update(existing.id, logData);
    return { ...logData, id: existing.id };
  } else {
    const newId = (await db.thermogenicLogs.add(logData)) as number;
    return { ...logData, id: newId };
  }
}

/**
 * Obtém o log termogênico do dia.
 */
export async function getTodayThermogenicLog(): Promise<DailyThermogenicLog> {
  const today = todayLocal();
  const existing = await db.thermogenicLogs.where('date').equals(today).first();
  if (existing) return existing;

  return {
    date: today,
    blackCoffeeCups: 0,
    preWorkoutDoses: 0,
    totalThermogenicCaloriesBurned: 0
  };
}

/**
 * Consumo de água registrado hoje, em ml.
 * Antes o valor iniciava em 1500 ml fixos na interface — o app abria afirmando
 * que o usuário já havia bebido 1,5 L — e nunca era persistido.
 */
export async function getTodayWaterIntake(): Promise<number> {
  const existing = await db.thermogenicLogs.where('date').equals(todayLocal()).first();
  return existing?.waterMl || 0;
}

/**
 * Grava o consumo de água do dia (nunca negativo).
 */
export async function setTodayWaterIntake(waterMl: number): Promise<number> {
  const today = todayLocal();
  const clamped = Math.max(0, Math.round(waterMl));
  const existing = await db.thermogenicLogs.where('date').equals(today).first();

  if (existing?.id) {
    await db.thermogenicLogs.update(existing.id, { waterMl: clamped });
  } else {
    await db.thermogenicLogs.add({
      date: today,
      blackCoffeeCups: 0,
      preWorkoutDoses: 0,
      totalThermogenicCaloriesBurned: 0,
      waterMl: clamped
    });
  }

  return clamped;
}

/**
 * Registra uma pesagem e recalcula a curva de Média Móvel Exponencial (EMA) para todo o histórico.
 */
export async function logWeightEntry(date: string, weightKg: number, bodyFatPercentage?: number, notes?: string): Promise<void> {
  const existingForDate = await db.weightLogs.where('date').equals(date).first();
  if (existingForDate?.id) {
    await db.weightLogs.update(existingForDate.id, {
      weightKg,
      bodyFatPercentage,
      notes
    });
  } else {
    await db.weightLogs.add({
      date,
      weightKg,
      bodyFatPercentage,
      notes
    });
  }

  // Recalcula a série histórica com EMA
  const allLogs = await db.weightLogs.toArray();
  const smoothed = calculateWeightEMA(allLogs, 7);

  await db.transaction('rw', db.weightLogs, async () => {
    for (const log of smoothed) {
      if (log.id) {
        await db.weightLogs.update(log.id, { emaWeightKg: log.emaWeightKg });
      }
    }
  });

  const savedForDate = smoothed.find((log) => log.date === date);
  if (savedForDate) {
    void pushWeightLog(savedForDate);
  }
}

/**
 * Obtém todos os logs de peso ordenados por data.
 */
export async function getWeightHistory(): Promise<WeightLog[]> {
  return (await db.weightLogs.toArray()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Gera as fichas de treino recomendadas para a frequência semanal informada.
 * Os dados das divisões vivem em core/data/workoutTemplates.ts.
 */
export async function generateDefaultRoutines(frequencyDays: number): Promise<void> {
  await applySplitTemplate(templateForFrequency(frequencyDays));
}

/**
 * Aplica um modelo de divisão de treino completo, substituindo as fichas atuais.
 */
export async function applySplitTemplate(template: SplitTemplateType): Promise<void> {
  const routines = buildRoutines(template);

  await db.transaction('rw', db.routines, async () => {
    await db.routines.clear();
    await db.routines.bulkAdd(routines);
  });

  void pushRoutines(await db.routines.toArray());
}


/**
 * Gera o próximo código de divisão (A..Z, depois A1, B1...), evitando os
 * caracteres inválidos que `String.fromCharCode(65 + n)` produzia após o Z.
 */
function nextSplitCode(count: number): string {
  const letter = String.fromCharCode(65 + (count % 26));
  const cycle = Math.floor(count / 26);
  return cycle === 0 ? letter : `${letter}${cycle}`;
}

/**
 * Cria uma nova ficha de treino customizada associada a um dia da semana.
 */
export async function addNewRoutine(name?: string, splitCode?: string, dayOfWeek?: number): Promise<number> {
  const existing = await db.routines.toArray();
  const finalSplitCode = splitCode || nextSplitCode(existing.length);
  const finalName = name || `Treino ${finalSplitCode} (Personalizado)`;

  let finalDay: number;
  if (dayOfWeek !== undefined) {
    finalDay = dayOfWeek;
  } else {
    // Escolhe o primeiro dia livre da semana (seg..dom). O cálculo antigo
    // `(count % 7) + 1` gerava 7, que não é um dia válido (0..6), e colidia
    // com dias já ocupados deixando fichas inacessíveis na interface.
    const taken = new Set(existing.map((r) => r.dayOfWeek));
    const preference = [1, 2, 3, 4, 5, 6, 0];
    finalDay = preference.find((d) => !taken.has(d)) ?? 1;
  }

  const id = await db.routines.add({
    name: finalName,
    splitCode: finalSplitCode,
    dayOfWeek: finalDay,
    targetMuscles: [],
    exercises: []
  });
  return typeof id === 'number' ? id : 0;
}

/**
 * Exclui uma ficha de treino.
 */
export async function deleteRoutine(id: number): Promise<void> {
  await db.routines.delete(id);
}

/**
 * Gera o cardápio padrão inicial de acordo com as metas calculadas.
 * Delega ao otimizador de dieta para não manter duas listas de alimentos
 * paralelas (que já haviam divergido entre si).
 */
export async function generateInitialMealPlans(
  mealsPerDay: number,
  targetCalories: number,
  targetProtein: number,
  targetCarbs: number,
  targetFat: number
): Promise<void> {
  const plans = generateSmartMealPlan({
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat,
    mealsPerDay,
    budgetTier: 'standard',
    focus: 'recomposition'
  });

  await db.transaction('rw', db.mealPlans, async () => {
    await db.mealPlans.clear();
    await db.mealPlans.bulkAdd(plans);
  });

  void pushMealPlans(await db.mealPlans.toArray());
}

/**
 * Última carga usada em cada exercício, a partir das sessões concluídas.
 *
 * Sem isto, o modal de treino abria toda série com 20 kg fixos: o motor de
 * dupla progressão sugeria "suba para 24 kg" e na sessão seguinte o usuário
 * tinha que redigitar tudo à mão.
 */
export async function getLastWeightByExercise(): Promise<Map<string, number>> {
  // Basta um histórico recente: varrer anos de sessões a cada abertura de
  // treino não muda o resultado e só custa tempo.
  const RECENT_SESSIONS = 60;

  const sessions = (await db.sessionLogs.toArray())
    .filter((s) => s.completed)
    .sort((a, b) => a.date.localeCompare(b.date)) // mais antigo primeiro
    .slice(-RECENT_SESSIONS);

  const lastWeights = new Map<string, number>();

  for (const session of sessions) {
    for (const exerciseLog of session.exerciseLogs || []) {
      const completedSets = exerciseLog.sets.filter((set) => set.completed);
      if (completedSets.length === 0) continue;

      // A maior carga registrada na sessão é a referência de trabalho.
      const heaviest = completedSets.reduce((max, set) => {
        const value = Number(set.weightKg) || 0;
        return value > max ? value : max;
      }, 0);

      if (heaviest > 0) {
        lastWeights.set(exerciseLog.exerciseId, heaviest);
      }
    }
  }

  return lastWeights;
}

/**
 * Retorna estatísticas consolidadas de frequência e consistência de treinos.
 */
export async function getWorkoutFrequencyStats(targetWeeklyDays: number = 4) {
  // IndexedDB não indexa valores booleanos, então `where('completed').equals(1)`
  // retornava sempre uma lista vazia (sem lançar erro, o que fazia o .catch de
  // fallback nunca rodar) e zerava streak, aderência, tonelagem e calorias.
  const sessions = (await db.sessionLogs.toArray()).filter((s) => s.completed);

  const completedDates = new Set(sessions.map((s) => s.date));

  // Cálculo da semana atual (Segunda a Domingo), em datas LOCAIS
  const monday = startOfWeekMonday();
  const currentWeekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    currentWeekDates.push(toLocalDateString(addDays(monday, i)));
  }

  const thisWeekDaysCount = currentWeekDates.filter((dt) => completedDates.has(dt)).length;

  // Cálculo do mês atual
  const monthPrefix = currentMonthPrefix();
  const thisMonthDaysCount = Array.from(completedDates).filter((dt) => dt.startsWith(monthPrefix)).length;
  const thisMonthSessions = sessions.filter((s) => s.date.startsWith(monthPrefix));

  // Streak de dias consecutivos (tolera um dia de descanso hoje)
  let currentStreak = 0;
  let checkDate = new Date();
  const todayStr = todayLocal();

  if (completedDates.has(todayStr)) {
    currentStreak++;
    checkDate = addDays(checkDate, -1);
  } else {
    checkDate = addDays(checkDate, -1);
    if (completedDates.has(toLocalDateString(checkDate))) {
      currentStreak++;
      checkDate = addDays(checkDate, -1);
    }
  }

  while (completedDates.has(toLocalDateString(checkDate))) {
    currentStreak++;
    checkDate = addDays(checkDate, -1);
  }

  const totalVolumeLiftedKg = sessions.reduce((acc, s) => acc + (s.totalVolumeLoadKg || 0), 0);
  const totalCaloriesBurned = sessions.reduce((acc, s) => acc + (s.caloriesBurnedEstimate || 0), 0);
  const monthVolumeLiftedKg = thisMonthSessions.reduce((acc, s) => acc + (s.totalVolumeLoadKg || 0), 0);
  const monthCaloriesBurned = thisMonthSessions.reduce((acc, s) => acc + (s.caloriesBurnedEstimate || 0), 0);

  return {
    sessions,
    completedDates,
    currentStreak,
    thisWeekDaysCount,
    thisMonthDaysCount,
    targetWeeklyDays,
    weeklyAdherencePercent: Math.min(100, Math.round((thisWeekDaysCount / Math.max(1, targetWeeklyDays)) * 100)),
    totalCompletedSessions: sessions.length,
    totalVolumeLiftedKg,
    totalCaloriesBurned,
    monthVolumeLiftedKg,
    monthCaloriesBurned
  };
}
