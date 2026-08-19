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
import { TACO_FOOD_DATABASE, FOOD_DATABASE_MAP } from '../data/tacoDatabase';

export class OmniFitDatabase extends Dexie {
  profiles!: EntityTable<UserProfile, 'id'>;
  mealPlans!: EntityTable<MealPlan, 'id'>;
  customFoods!: EntityTable<FoodItem, 'id'>;
  routines!: EntityTable<WorkoutRoutine, 'id'>;
  sessionLogs!: EntityTable<WorkoutSessionLog, 'id'>;
  weightLogs!: EntityTable<WeightLog, 'id'>;
  checkInLogs!: EntityTable<CheckInLog, 'id'>;
  thermogenicLogs!: EntityTable<DailyThermogenicLog, 'id'>;

  constructor() {
    super('OmniFitDatabase');
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

export const db = new OmniFitDatabase();

/**
 * Retorna todos os alimentos oficiais TACO + Alimentos Personalizados cadastrados.
 */
export async function getAllFoods(): Promise<FoodItem[]> {
  const custom = await db.customFoods.toArray();
  for (const c of custom) {
    FOOD_DATABASE_MAP.set(c.id, c);
  }
  return [...TACO_FOOD_DATABASE, ...custom];
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
  const existing = await getActiveProfile();
  if (existing?.id) {
    await db.profiles.update(existing.id, {
      ...profile,
      preWorkoutFormula: profile.preWorkoutFormula || USER_PRE_WORKOUT_FORMULA,
      coffeeConfig: profile.coffeeConfig || DEFAULT_COFFEE_CONFIG,
      updatedAt: new Date().toISOString()
    });
    return existing.id;
  }
  return (await db.profiles.add({
    ...profile,
    preWorkoutFormula: profile.preWorkoutFormula || USER_PRE_WORKOUT_FORMULA,
    coffeeConfig: profile.coffeeConfig || DEFAULT_COFFEE_CONFIG,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })) as number;
}

/**
 * Registra ou atualiza o consumo termogênico de café e pré-treino do dia.
 */
export async function updateTodayThermogenics(
  coffeeDelta: number,
  preWorkoutDelta: number,
  bmr: number
): Promise<DailyThermogenicLog> {
  const today = new Date().toISOString().split('T')[0];
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
  const today = new Date().toISOString().split('T')[0];
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
}

/**
 * Obtém todos os logs de peso ordenados por data.
 */
export async function getWeightHistory(): Promise<WeightLog[]> {
  return (await db.weightLogs.toArray()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Gera as fichas de treino automáticas recomendadas pelo motor algorítmico.
 */
export async function generateDefaultRoutines(frequencyDays: number): Promise<void> {
  await db.routines.clear();

  if (frequencyDays <= 3) {
    await db.routines.bulkAdd([
      {
        name: 'Full Body A - Ênfase Peito & Quadríceps',
        splitCode: 'A',
        targetMuscles: ['chest', 'quadriceps', 'back', 'shoulders', 'abs'],
        exercises: [
          { exerciseId: 'agachamento_livre_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
          { exerciseId: 'supino_reto_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
          { exerciseId: 'puxada_alta_frente', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'elevacao_lateral_halteres', targetSets: 3, minReps: 12, maxReps: 15, restSeconds: 60 },
          { exerciseId: 'abdominal_infra_paralela', targetSets: 3, minReps: 12, maxReps: 15, restSeconds: 60 }
        ]
      },
      {
        name: 'Full Body B - Ênfase Costas & Posteriores',
        splitCode: 'B',
        targetMuscles: ['back', 'hamstrings', 'chest', 'biceps', 'triceps'],
        exercises: [
          { exerciseId: 'stiff_barra', targetSets: 4, minReps: 8, maxReps: 10, restSeconds: 120 },
          { exerciseId: 'remada_curvada_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
          { exerciseId: 'supino_inclinado_halteres', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'rosca_direta_barra_w', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 60 },
          { exerciseId: 'triceps_polia_corda', targetSets: 3, minReps: 10, maxReps: 15, restSeconds: 60 }
        ]
      },
      {
        name: 'Full Body C - Pernas & Superior Completo',
        splitCode: 'C',
        targetMuscles: ['quadriceps', 'glutes', 'shoulders', 'calves'],
        exercises: [
          { exerciseId: 'leg_press_45', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 120 },
          { exerciseId: 'elevacao_pelvica_barra', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'desenvolvimento_halteres', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'panturrilha_em_pe_maquina', targetSets: 4, minReps: 12, maxReps: 15, restSeconds: 60 }
        ]
      }
    ]);
  } else if (frequencyDays === 4) {
    await db.routines.bulkAdd([
      {
        name: 'Treino A - Superior (Upper 1)',
        splitCode: 'A',
        targetMuscles: ['chest', 'back', 'shoulders', 'triceps', 'biceps'],
        exercises: [
          { exerciseId: 'supino_reto_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
          { exerciseId: 'remada_curvada_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
          { exerciseId: 'desenvolvimento_halteres', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'triceps_polia_corda', targetSets: 3, minReps: 10, maxReps: 15, restSeconds: 60 },
          { exerciseId: 'rosca_direta_barra_w', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 60 }
        ]
      },
      {
        name: 'Treino B - Inferior (Lower 1)',
        splitCode: 'B',
        targetMuscles: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'abs'],
        exercises: [
          { exerciseId: 'agachamento_livre_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 150 },
          { exerciseId: 'stiff_barra', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'cadeira_extensora', targetSets: 3, minReps: 10, maxReps: 15, restSeconds: 60 },
          { exerciseId: 'mesa_flexora', targetSets: 3, minReps: 10, maxReps: 15, restSeconds: 60 },
          { exerciseId: 'panturrilha_em_pe_maquina', targetSets: 4, minReps: 12, maxReps: 18, restSeconds: 60 }
        ]
      },
      {
        name: 'Treino C - Superior (Upper 2 - Foco Ombros & Dorsal)',
        splitCode: 'C',
        targetMuscles: ['back', 'chest', 'shoulders', 'biceps', 'triceps'],
        exercises: [
          { exerciseId: 'puxada_alta_frente', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'supino_inclinado_halteres', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'elevacao_lateral_halteres', targetSets: 4, minReps: 12, maxReps: 15, restSeconds: 60 },
          { exerciseId: 'crucifixo_inverso_maquina', targetSets: 3, minReps: 12, maxReps: 15, restSeconds: 60 },
          { exerciseId: 'triceps_testa_barra_w', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 75 },
          { exerciseId: 'rosca_martelo_halteres', targetSets: 3, minReps: 10, maxReps: 12, restSeconds: 60 }
        ]
      },
      {
        name: 'Treino D - Inferior (Lower 2 - Foco Posterior & Glúteo)',
        splitCode: 'D',
        targetMuscles: ['hamstrings', 'glutes', 'quadriceps', 'abs'],
        exercises: [
          { exerciseId: 'leg_press_45', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 120 },
          { exerciseId: 'elevacao_pelvica_barra', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'mesa_flexora', targetSets: 4, minReps: 10, maxReps: 12, restSeconds: 60 },
          { exerciseId: 'abdominal_infra_paralela', targetSets: 4, minReps: 12, maxReps: 15, restSeconds: 60 }
        ]
      }
    ]);
  } else {
    await db.routines.bulkAdd([
      {
        name: 'Treino A - Push (Peito, Ombros e Tríceps)',
        splitCode: 'A',
        targetMuscles: ['chest', 'shoulders', 'triceps'],
        exercises: [
          { exerciseId: 'supino_reto_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
          { exerciseId: 'supino_inclinado_halteres', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'desenvolvimento_halteres', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'elevacao_lateral_halteres', targetSets: 4, minReps: 12, maxReps: 15, restSeconds: 60 },
          { exerciseId: 'triceps_polia_corda', targetSets: 3, minReps: 10, maxReps: 15, restSeconds: 60 }
        ]
      },
      {
        name: 'Treino B - Pull (Costas, Deltoide Posterior e Bíceps)',
        splitCode: 'B',
        targetMuscles: ['back', 'shoulders', 'biceps'],
        exercises: [
          { exerciseId: 'puxada_alta_frente', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'remada_curvada_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
          { exerciseId: 'crucifixo_inverso_maquina', targetSets: 3, minReps: 12, maxReps: 15, restSeconds: 60 },
          { exerciseId: 'rosca_direta_barra_w', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 60 },
          { exerciseId: 'rosca_martelo_halteres', targetSets: 3, minReps: 10, maxReps: 12, restSeconds: 60 }
        ]
      },
      {
        name: 'Treino C - Legs (Quadríceps, Posteriores, Glúteos e Panturrilhas)',
        splitCode: 'C',
        targetMuscles: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'abs'],
        exercises: [
          { exerciseId: 'agachamento_livre_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 150 },
          { exerciseId: 'leg_press_45', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 120 },
          { exerciseId: 'stiff_barra', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'mesa_flexora', targetSets: 3, minReps: 10, maxReps: 15, restSeconds: 60 },
          { exerciseId: 'panturrilha_em_pe_maquina', targetSets: 4, minReps: 12, maxReps: 18, restSeconds: 60 }
        ]
      }
    ]);
  }
}

export type SplitTemplateType = 'ppl' | 'upper_lower' | 'abcde' | 'abc_classic' | 'fullbody' | 'blank';

/**
 * Aplica um modelo de divisão de treino completo (PPL, Upper/Lower, ABCDE, ABC Clássico, Full Body ou Em Branco).
 */
export async function applySplitTemplate(template: SplitTemplateType): Promise<void> {
  await db.routines.clear();

  if (template === 'ppl') {
    await db.routines.bulkAdd([
      {
        name: 'Treino A - Push (Peito, Ombros e Tríceps)',
        splitCode: 'A',
        targetMuscles: ['chest', 'shoulders', 'triceps'],
        exercises: [
          { exerciseId: 'supino_reto_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
          { exerciseId: 'supino_inclinado_halteres', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'desenvolvimento_halteres', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'elevacao_lateral_halteres', targetSets: 4, minReps: 12, maxReps: 15, restSeconds: 60 },
          { exerciseId: 'triceps_polia_corda', targetSets: 3, minReps: 10, maxReps: 15, restSeconds: 60 }
        ]
      },
      {
        name: 'Treino B - Pull (Costas, Deltoide Posterior e Bíceps)',
        splitCode: 'B',
        targetMuscles: ['back', 'shoulders', 'biceps'],
        exercises: [
          { exerciseId: 'puxada_alta_frente', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'remada_curvada_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
          { exerciseId: 'crucifixo_inverso_maquina', targetSets: 3, minReps: 12, maxReps: 15, restSeconds: 60 },
          { exerciseId: 'rosca_direta_barra_w', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 60 },
          { exerciseId: 'rosca_martelo_halteres', targetSets: 3, minReps: 10, maxReps: 12, restSeconds: 60 }
        ]
      },
      {
        name: 'Treino C - Legs (Quadríceps, Posteriores, Glúteos e Panturrilhas)',
        splitCode: 'C',
        targetMuscles: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'abs'],
        exercises: [
          { exerciseId: 'agachamento_livre_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 150 },
          { exerciseId: 'leg_press_45', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 120 },
          { exerciseId: 'stiff_barra', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'mesa_flexora', targetSets: 3, minReps: 10, maxReps: 15, restSeconds: 60 },
          { exerciseId: 'panturrilha_em_pe_maquina', targetSets: 4, minReps: 12, maxReps: 18, restSeconds: 60 }
        ]
      }
    ]);
  } else if (template === 'upper_lower') {
    await db.routines.bulkAdd([
      {
        name: 'Treino A - Superior 1 (Foco Peito e Costas)',
        splitCode: 'A',
        targetMuscles: ['chest', 'back', 'shoulders', 'triceps', 'biceps'],
        exercises: [
          { exerciseId: 'supino_reto_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
          { exerciseId: 'remada_curvada_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
          { exerciseId: 'desenvolvimento_halteres', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'triceps_polia_corda', targetSets: 3, minReps: 10, maxReps: 15, restSeconds: 60 },
          { exerciseId: 'rosca_direta_barra_w', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 60 }
        ]
      },
      {
        name: 'Treino B - Inferior 1 (Foco Quadríceps e Panturrilhas)',
        splitCode: 'B',
        targetMuscles: ['quadriceps', 'hamstrings', 'glutes', 'calves'],
        exercises: [
          { exerciseId: 'agachamento_livre_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 150 },
          { exerciseId: 'leg_press_45', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 120 },
          { exerciseId: 'cadeira_extensora', targetSets: 3, minReps: 10, maxReps: 15, restSeconds: 60 },
          { exerciseId: 'mesa_flexora', targetSets: 3, minReps: 10, maxReps: 15, restSeconds: 60 },
          { exerciseId: 'panturrilha_em_pe_maquina', targetSets: 4, minReps: 12, maxReps: 18, restSeconds: 60 }
        ]
      },
      {
        name: 'Treino C - Superior 2 (Foco Ombros e Braços)',
        splitCode: 'C',
        targetMuscles: ['back', 'chest', 'shoulders', 'biceps', 'triceps'],
        exercises: [
          { exerciseId: 'puxada_alta_frente', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'supino_inclinado_halteres', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'elevacao_lateral_halteres', targetSets: 4, minReps: 12, maxReps: 15, restSeconds: 60 },
          { exerciseId: 'triceps_testa_barra_w', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 75 },
          { exerciseId: 'rosca_martelo_halteres', targetSets: 3, minReps: 10, maxReps: 12, restSeconds: 60 }
        ]
      },
      {
        name: 'Treino D - Inferior 2 (Foco Posterior, Glúteo e Abdômen)',
        splitCode: 'D',
        targetMuscles: ['hamstrings', 'glutes', 'quadriceps', 'abs'],
        exercises: [
          { exerciseId: 'stiff_barra', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'elevacao_pelvica_barra', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'mesa_flexora', targetSets: 4, minReps: 10, maxReps: 12, restSeconds: 60 },
          { exerciseId: 'abdominal_infra_paralela', targetSets: 4, minReps: 12, maxReps: 15, restSeconds: 60 }
        ]
      }
    ]);
  } else if (template === 'abcde') {
    await db.routines.bulkAdd([
      {
        name: 'Treino A - Peito & Abdômen',
        splitCode: 'A',
        targetMuscles: ['chest', 'abs'],
        exercises: [
          { exerciseId: 'supino_reto_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
          { exerciseId: 'supino_inclinado_halteres', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'crucifixo_reto_halteres', targetSets: 3, minReps: 10, maxReps: 15, restSeconds: 60 },
          { exerciseId: 'abdominal_infra_paralela', targetSets: 4, minReps: 12, maxReps: 15, restSeconds: 60 }
        ]
      },
      {
        name: 'Treino B - Costas & Trapézio',
        splitCode: 'B',
        targetMuscles: ['back', 'shoulders'],
        exercises: [
          { exerciseId: 'puxada_alta_frente', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'remada_curvada_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
          { exerciseId: 'remada_baixa_triangulo', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'encolhimento_ombros_barra', targetSets: 4, minReps: 10, maxReps: 15, restSeconds: 60 }
        ]
      },
      {
        name: 'Treino C - Pernas Completo (Quadríceps e Posteriores)',
        splitCode: 'C',
        targetMuscles: ['quadriceps', 'hamstrings', 'glutes', 'calves'],
        exercises: [
          { exerciseId: 'agachamento_livre_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 150 },
          { exerciseId: 'leg_press_45', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 120 },
          { exerciseId: 'stiff_barra', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'cadeira_extensora', targetSets: 3, minReps: 10, maxReps: 15, restSeconds: 60 },
          { exerciseId: 'mesa_flexora', targetSets: 3, minReps: 10, maxReps: 15, restSeconds: 60 },
          { exerciseId: 'panturrilha_em_pe_maquina', targetSets: 4, minReps: 12, maxReps: 18, restSeconds: 60 }
        ]
      },
      {
        name: 'Treino D - Deltoides & Ombros Completo',
        splitCode: 'D',
        targetMuscles: ['shoulders'],
        exercises: [
          { exerciseId: 'desenvolvimento_halteres', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 90 },
          { exerciseId: 'elevacao_lateral_halteres', targetSets: 4, minReps: 12, maxReps: 15, restSeconds: 60 },
          { exerciseId: 'crucifixo_inverso_maquina', targetSets: 4, minReps: 12, maxReps: 15, restSeconds: 60 }
        ]
      },
      {
        name: 'Treino E - Braços (Bíceps e Tríceps)',
        splitCode: 'E',
        targetMuscles: ['biceps', 'triceps'],
        exercises: [
          { exerciseId: 'rosca_direta_barra_w', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 60 },
          { exerciseId: 'rosca_martelo_halteres', targetSets: 3, minReps: 10, maxReps: 12, restSeconds: 60 },
          { exerciseId: 'triceps_polia_corda', targetSets: 4, minReps: 10, maxReps: 15, restSeconds: 60 },
          { exerciseId: 'triceps_testa_barra_w', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 75 },
          { exerciseId: 'rosca_punho_barra', targetSets: 3, minReps: 12, maxReps: 15, restSeconds: 45 }
        ]
      }
    ]);
  } else if (template === 'abc_classic') {
    await db.routines.bulkAdd([
      {
        name: 'Treino A - Peito, Tríceps e Abdômen',
        splitCode: 'A',
        targetMuscles: ['chest', 'triceps', 'abs'],
        exercises: [
          { exerciseId: 'supino_reto_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
          { exerciseId: 'supino_inclinado_halteres', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'triceps_polia_corda', targetSets: 4, minReps: 10, maxReps: 15, restSeconds: 60 },
          { exerciseId: 'triceps_testa_barra_w', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 75 },
          { exerciseId: 'abdominal_infra_paralela', targetSets: 3, minReps: 12, maxReps: 15, restSeconds: 60 }
        ]
      },
      {
        name: 'Treino B - Costas, Bíceps e Trapézio',
        splitCode: 'B',
        targetMuscles: ['back', 'biceps', 'shoulders'],
        exercises: [
          { exerciseId: 'puxada_alta_frente', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'remada_curvada_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
          { exerciseId: 'rosca_direta_barra_w', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 60 },
          { exerciseId: 'rosca_martelo_halteres', targetSets: 3, minReps: 10, maxReps: 12, restSeconds: 60 },
          { exerciseId: 'encolhimento_ombros_barra', targetSets: 3, minReps: 10, maxReps: 15, restSeconds: 60 }
        ]
      },
      {
        name: 'Treino C - Pernas Completo e Ombros',
        splitCode: 'C',
        targetMuscles: ['quadriceps', 'hamstrings', 'shoulders', 'calves'],
        exercises: [
          { exerciseId: 'agachamento_livre_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 150 },
          { exerciseId: 'leg_press_45', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 120 },
          { exerciseId: 'stiff_barra', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'desenvolvimento_halteres', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'elevacao_lateral_halteres', targetSets: 4, minReps: 12, maxReps: 15, restSeconds: 60 },
          { exerciseId: 'panturrilha_em_pe_maquina', targetSets: 4, minReps: 12, maxReps: 18, restSeconds: 60 }
        ]
      }
    ]);
  } else if (template === 'fullbody') {
    await db.routines.bulkAdd([
      {
        name: 'Full Body A - Ênfase Peito & Quadríceps',
        splitCode: 'A',
        targetMuscles: ['chest', 'quadriceps', 'back', 'shoulders', 'abs'],
        exercises: [
          { exerciseId: 'agachamento_livre_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
          { exerciseId: 'supino_reto_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
          { exerciseId: 'puxada_alta_frente', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'elevacao_lateral_halteres', targetSets: 3, minReps: 12, maxReps: 15, restSeconds: 60 }
        ]
      },
      {
        name: 'Full Body B - Ênfase Costas & Posteriores',
        splitCode: 'B',
        targetMuscles: ['back', 'hamstrings', 'chest', 'biceps', 'triceps'],
        exercises: [
          { exerciseId: 'stiff_barra', targetSets: 4, minReps: 8, maxReps: 10, restSeconds: 120 },
          { exerciseId: 'remada_curvada_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
          { exerciseId: 'supino_inclinado_halteres', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'rosca_direta_barra_w', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 60 }
        ]
      },
      {
        name: 'Full Body C - Pernas & Superior Completo',
        splitCode: 'C',
        targetMuscles: ['quadriceps', 'glutes', 'shoulders', 'calves'],
        exercises: [
          { exerciseId: 'leg_press_45', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 120 },
          { exerciseId: 'elevacao_pelvica_barra', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'desenvolvimento_halteres', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
          { exerciseId: 'panturrilha_em_pe_maquina', targetSets: 4, minReps: 12, maxReps: 15, restSeconds: 60 }
        ]
      }
    ]);
  } else {
    // Blank custom templates
    await db.routines.bulkAdd([
      {
        name: 'Treino A (Personalizado)',
        splitCode: 'A',
        targetMuscles: ['chest', 'triceps'],
        exercises: []
      },
      {
        name: 'Treino B (Personalizado)',
        splitCode: 'B',
        targetMuscles: ['back', 'biceps'],
        exercises: []
      },
      {
        name: 'Treino C (Personalizado)',
        splitCode: 'C',
        targetMuscles: ['quadriceps', 'hamstrings'],
        exercises: []
      }
    ]);
  }
}

/**
 * Cria uma nova ficha de treino customizada.
 */
/**
 * Associa uma ficha a um dia específico da semana (0=Dom, 1=Seg... 6=Sáb).
 */
export async function setRoutineDay(routineId: number, dayOfWeek: number): Promise<void> {
  await db.routines.update(routineId, { dayOfWeek });
}

/**
 * Cria uma nova ficha de treino customizada associada a um dia da semana.
 */
export async function addNewRoutine(name?: string, splitCode?: string, dayOfWeek?: number): Promise<number> {
  const count = await db.routines.count();
  const nextLetter = String.fromCharCode(65 + count); // A, B, C, D, E, F...
  const finalSplitCode = splitCode || nextLetter;
  const finalName = name || `Treino ${finalSplitCode} (Personalizado)`;

  const id = await db.routines.add({
    name: finalName,
    splitCode: finalSplitCode,
    dayOfWeek: dayOfWeek !== undefined ? dayOfWeek : (count % 7) + 1,
    targetMuscles: ['chest', 'back', 'quadriceps'],
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
 * Gera o cardápio padrão inicial de acordo com as metas calculadas e número de refeições.
 */
export async function generateInitialMealPlans(
  mealsPerDay: number,
  targetCalories: number,
  targetProtein: number,
  targetCarbs: number,
  targetFat: number
): Promise<void> {
  await db.mealPlans.clear();

  const mealNamesMap: Record<number, string[]> = {
    2: ['Almoço Principal', 'Jantar Principal'],
    3: ['Café da Manhã', 'Almoço Completo', 'Jantar'],
    4: ['Café da Manhã', 'Almoço Completo', 'Lanche da Tarde', 'Jantar'],
    5: ['Café da Manhã', 'Almoço Completo', 'Lanche da Tarde', 'Jantar', 'Ceia'],
    6: ['Café da Manhã', 'Colação', 'Almoço Completo', 'Lanche da Tarde', 'Jantar', 'Ceia']
  };

  const names = mealNamesMap[mealsPerDay] || mealNamesMap[4];
  const calPerMeal = Math.round(targetCalories / mealsPerDay);
  const protPerMeal = Math.round(targetProtein / mealsPerDay);
  const carbPerMeal = Math.round(targetCarbs / mealsPerDay);
  const fatPerMeal = Math.round(targetFat / mealsPerDay);

  const initialPlans: MealPlan[] = [];

  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    let portions: { foodId: string; grams: number; consumed: boolean }[] = [];

    if (name.includes('Café') || name.includes('Colação')) {
      portions = [
        { foodId: 'ovo_galinha_cozido', grams: 100, consumed: false },
        { foodId: 'pao_forma_integral', grams: 50, consumed: false },
        { foodId: 'banana_prata', grams: 70, consumed: false }
      ];
    } else if (name.includes('Almoço') || name.includes('Jantar')) {
      portions = [
        { foodId: 'peito_frango_grelhado', grams: 130, consumed: false },
        { foodId: 'arroz_branco_cozido', grams: 150, consumed: false },
        { foodId: 'feijao_carioca_cozido', grams: 100, consumed: false },
        { foodId: 'azeite_oliva_extra_virgem', grams: 8, consumed: false },
        { foodId: 'brocolis_cozido', grams: 80, consumed: false }
      ];
    } else if (name.includes('Lanche') || name.includes('Pré-Treino')) {
      portions = [
        { foodId: 'iogurte_natural_desnatado', grams: 160, consumed: false },
        { foodId: 'aveia_flocos', grams: 30, consumed: false },
        { foodId: 'banana_prata', grams: 70, consumed: false },
        { foodId: 'whey_protein_concentrado', grams: 20, consumed: false }
      ];
    } else {
      portions = [
        { foodId: 'queijo_cottage', grams: 100, consumed: false },
        { foodId: 'castanha_para', grams: 10, consumed: false }
      ];
    }

    initialPlans.push({
      name,
      order: i + 1,
      targetCalories: calPerMeal,
      targetProtein: protPerMeal,
      targetCarbs: carbPerMeal,
      targetFat: fatPerMeal,
      portions
    });
  }

  await db.mealPlans.bulkAdd(initialPlans);
}
