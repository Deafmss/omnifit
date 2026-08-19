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
  excludedFoodIds: string[];
  preferredFoodIds: string[];
  isCalibrated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MetabolicStats {
  bmr: number;
  tdee: number;
  formulaUsed: 'mifflin' | 'katch_mcardle' | 'cunningham';
  targetCalories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  tefKcal: number;
  waterIntakeMl: number;
  fiberGramsTarget: number;
  dailyDeficitOrSurplusKcal: number;
  expectedWeeklyWeightChangeKg: number;
}

export interface FoodItem {
  id: string;
  name: string;
  category: 'protein' | 'carb' | 'fat' | 'vegetable' | 'fruit' | 'dairy' | 'supplement';
  servingName: string;
  baseGrams: number;
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
  consumed: boolean;
}

export interface MealPlan {
  id?: number;
  name: string; // "Café da Manhã", "Almoço", etc.
  order: number;
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
  weightKg: number;
  reps: number;
  rpe?: number; // Rate of Perceived Exertion (6-10)
  completed: boolean;
}

export interface WorkoutExerciseLog {
  exerciseId: string;
  sets: WorkoutSetLog[];
  notes?: string;
}

export interface WorkoutRoutine {
  id?: number;
  name: string; // e.g., "Treino A - Peito, Ombros e Tríceps"
  splitCode: 'A' | 'B' | 'C' | 'D' | 'E';
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
  date: string; // ISO date string
  durationMinutes: number;
  caloriesBurnedEstimate: number;
  totalVolumeLoadKg: number;
  exerciseLogs: WorkoutExerciseLog[];
  completed: boolean;
}

export interface WeightLog {
  id?: number;
  date: string; // YYYY-MM-DD
  weightKg: number;
  emaWeightKg?: number; // Exponential Moving Average smoothed
  bodyFatPercentage?: number;
  waistCircumferenceCm?: number;
  notes?: string;
}

export interface CheckInLog {
  id?: number;
  date: string;
  weightKg: number;
  hungerRating: 1 | 2 | 3 | 4 | 5; // 1 = sem fome, 5 = faminto
  energyRating: 1 | 2 | 3 | 4 | 5; // 1 = exausto, 5 = excelente
  adherencePercentage: number;
  caloricAdjustmentSuggestedKcal: number;
  notes: string;
}
