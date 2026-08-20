export type Gender = 'male' | 'female';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type FitnessGoal = 'recomposition' | 'fat_loss' | 'hypertrophy' | 'maintenance';
export type DietMode = 'guided' | 'fixed' | 'flexible';

export type MuscleGroup = 
  | 'chest' 
  | 'back' 
  | 'quadriceps' 
  | 'hamstrings' 
  | 'glutes' 
  | 'calves' 
  | 'shoulders' 
  | 'biceps' 
  | 'triceps' 
  | 'abs';

export interface PreWorkoutFormula {
  name: string;
  doseGrams: number;
  caffeineMg: number;
  taurineMg: number;
  betaAlanineMg: number;
  arginineMg: number;
  sodiumMg: number;
  vitaminB5Mg: number;
  vitaminB6Mg: number;
  vitaminEMg: number;
  chromiumMcg: number;
  zeroSugar: boolean;
}

export interface CoffeeConfig {
  name: string;
  servingMl: number;
  caffeineMg: number;
}

export interface UserProfile {
  id?: number;
  name: string;
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  bodyFatPercentage?: number;
  experienceLevel: ExperienceLevel;
  goal: FitnessGoal;
  trainingDaysPerWeek: number;
  sessionDurationMin: number;
  dietMode: DietMode;
  mealsPerDay: number;
  /** Restrições alimentares aplicadas na montagem automática do cardápio. */
  dietRestrictions?: {
    lactoseFree?: boolean;
    noFish?: boolean;
    vegetarian?: boolean;
  };
  isCalibrated: boolean;
  /**
   * Ajuste calórico acumulado pelos check-ins adaptativos, em kcal/dia.
   * É somado ao alvo calculado pelas fórmulas, e é o que faz o motor de
   * malha fechada realmente ter efeito sobre a dieta.
   */
  calorieAdjustmentKcal?: number;
  preWorkoutFormula?: PreWorkoutFormula;
  coffeeConfig?: CoffeeConfig;
  createdAt: string;
  updatedAt: string;
}

export interface MetabolicStats {
  bmr: number;
  tdee: number;
  formulaUsed: 'mifflin' | 'katch_mcardle';
  targetCalories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  tefKcal: number;
  waterIntakeMl: number;
  fiberGramsTarget: number;
  dailyDeficitOrSurplusKcal: number;
  expectedWeeklyWeightChangeKg: number;
  /** Ajuste vindo dos check-ins que já está embutido em targetCalories. */
  appliedCalorieAdjustmentKcal: number;
}

export interface DailyThermogenicLog {
  id?: number;
  date: string; // YYYY-MM-DD
  blackCoffeeCups: number; // 1 cup = 150ml ~100mg cafeina
  preWorkoutDoses: number; // 1 dose = formula (400mg cafeina + taurina + beta-alanina)
  totalThermogenicCaloriesBurned: number;
  /**
   * Queima estimada separada por fonte. Existe para que a interface apenas
   * EXIBA os valores em vez de recalculá-los: os cartões de café e pré-treino
   * tinham a fórmula antiga embutida no JSX (um deles com "87" cravado
   * literalmente), e mostravam números que não somavam o total.
   */
  coffeeBurnKcal?: number;
  preWorkoutBurnKcal?: number;
  /** Água ingerida no dia, em ml. Persistida para não zerar a cada recarga. */
  waterMl?: number;
}

export interface FoodItem {
  id: string;
  name: string;
  category: 'protein' | 'carb' | 'fat' | 'vegetable' | 'fruit' | 'dairy' | 'supplement';
  servingName: string;
  baseGrams: number;
  servingUnit?: string;
  servingGrams?: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  sodiumMgPer100g: number;
  isCustom?: boolean;
}

export interface MealFoodPortion {
  foodId: string;
  grams: number;
  /**
   * Marcação do DIA CORRENTE apenas. O registro permanente de consumo vive em
   * `DailyFoodLog`: este campo é zerado na virada do dia, e sem isso o app
   * abria no dia seguinte afirmando que o usuário já havia comido tudo.
   */
  consumed: boolean;
}

/**
 * Uma porção efetivamente consumida, com data. É o diário alimentar do app.
 *
 * Os valores nutricionais são gravados como SNAPSHOT no momento do consumo:
 * o alimento pode ser editado ou excluído depois, e o histórico precisa
 * continuar refletindo o que foi comido de fato.
 */
export interface DailyFoodLog {
  id?: number;
  /** Data local no formato YYYY-MM-DD. */
  date: string;
  foodId: string;
  foodName: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  /** Nome e ordem da refeição no momento do consumo. */
  mealName: string;
  mealOrder: number;
  loggedAt: string;
}

/** Consolidado de um dia do diário alimentar. */
export interface DailyIntakeSummary {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  itemCount: number;
}

/**
 * Refeição salva pelo usuário para reutilizar depois ("meu café da manhã").
 * Guarda apenas as porções: as metas de macro vêm da refeição de destino.
 */
export interface MealTemplate {
  id?: number;
  name: string;
  portions: MealFoodPortion[];
  createdAt: string;
  /** Quantas vezes foi aplicado — usado para ordenar por mais usados. */
  timesUsed: number;
}

/**
 * Metadados internos do contêiner do usuário (chave/valor).
 * Usado para saber qual foi o último dia de uso e disparar a virada do dia.
 */
export interface AppMeta {
  key: string;
  value: string;
}

export interface MealPlan {
  id?: number;
  name: string;
  order: number;
  timeLabel?: string;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  targetCalories: number;
  portions: MealFoodPortion[];
}

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  category: 'compound' | 'isolation' | 'bodyweight' | 'machine' | 'cable';
  mets: number;
  minReps: number;
  maxReps: number;
  defaultRestSeconds: number;
  instructions: string;
}

export interface WorkoutSetLog {
  setNumber: number;
  weightKg: number | string;
  reps: number | string;
  completed: boolean;
}

export interface WorkoutExerciseLog {
  exerciseId: string;
  sets: WorkoutSetLog[];
  notes?: string;
}

export interface WorkoutRoutine {
  id?: number;
  name: string;
  splitCode: string;
  dayOfWeek?: number; // 0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado
  targetMuscles: MuscleGroup[];
  exercises: {
    exerciseId: string;
    targetSets: number;
    minReps: number;
    maxReps: number;
    restSeconds: number;
  }[];
}

export interface WorkoutSessionLog {
  id?: number;
  routineId?: number;
  name: string;
  date: string;
  durationMinutes: number;
  caloriesBurnedEstimate: number;
  totalVolumeLoadKg: number;
  exerciseLogs: WorkoutExerciseLog[];
  completed: boolean;
}

export interface WeightLog {
  id?: number;
  date: string;
  weightKg: number;
  emaWeightKg?: number;
  bodyFatPercentage?: number;
  notes?: string;
}

export interface CheckInLog {
  id?: number;
  date: string;
  weightKg: number;
  hungerRating: 1 | 2 | 3 | 4 | 5;
  energyRating: 1 | 2 | 3 | 4 | 5;
  adherencePercentage: number;
  caloricAdjustmentSuggestedKcal: number;
  notes: string;
}
