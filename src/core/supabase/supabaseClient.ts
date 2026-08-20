import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile, MealPlan, WorkoutRoutine, WorkoutSessionLog, WeightLog, CheckInLog } from '../storage/types';

const DEFAULT_SUPABASE_URL = 'https://zsyzudynremhcuchitgt.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_byS2mSHnvPpQx5b84ZxH1g_3kv5Cp-B';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('your-project-id')
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Sincroniza o perfil do usuário com a nuvem do Supabase.
 */
export async function syncProfileToCloud(userId: string, profile: UserProfile): Promise<void> {
  if (!supabase) return;

  try {
    const payload = {
      user_id: userId,
      name: profile.name,
      age: profile.age,
      gender: profile.gender,
      height_cm: profile.heightCm,
      weight_kg: profile.weightKg,
      body_fat_percentage: profile.bodyFatPercentage || null,
      experience_level: profile.experienceLevel,
      goal: profile.goal,
      training_days_per_week: profile.trainingDaysPerWeek,
      session_duration_min: profile.sessionDurationMin,
      diet_mode: profile.dietMode,
      meals_per_day: profile.mealsPerDay,
      is_calibrated: profile.isCalibrated,
      pre_workout_formula: profile.preWorkoutFormula || null,
      coffee_config: profile.coffeeConfig || null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      console.warn('Erro na sincronização de perfil com Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Falha de rede ao sincronizar perfil com Supabase:', err);
  }
}

/**
 * Sincroniza refeições com o Supabase.
 */
export async function syncMealPlansToCloud(userId: string, mealPlans: MealPlan[]): Promise<void> {
  if (!supabase) return;

  try {
    const payload = mealPlans.map((m) => ({
      user_id: userId,
      name: m.name,
      order_index: m.order,
      suggested_time: m.timeLabel || null,
      target_calories: m.targetCalories,
      target_protein_g: m.targetProtein,
      target_carbs_g: m.targetCarbs,
      target_fat_g: m.targetFat,
      items: m.portions || [],
      updated_at: new Date().toISOString()
    }));

    await supabase.from('meal_plans').delete().eq('user_id', userId);
    if (payload.length > 0) {
      const { error } = await supabase.from('meal_plans').insert(payload);
      if (error) console.warn('Erro ao sincronizar refeições:', error.message);
    }
  } catch (err) {
    console.warn('Falha de rede ao sincronizar refeições:', err);
  }
}

/**
 * Sincroniza rotinas de treino com o Supabase.
 */
export async function syncRoutinesToCloud(userId: string, routines: WorkoutRoutine[]): Promise<void> {
  if (!supabase) return;

  try {
    const payload = routines.map((r) => ({
      user_id: userId,
      split_code: r.splitCode,
      name: r.name,
      day_of_week: r.dayOfWeek,
      target_muscles: r.targetMuscles || [],
      exercises: r.exercises || [],
      updated_at: new Date().toISOString()
    }));

    await supabase.from('workout_routines').delete().eq('user_id', userId);
    if (payload.length > 0) {
      const { error } = await supabase.from('workout_routines').insert(payload);
      if (error) console.warn('Erro ao sincronizar rotinas de treino:', error.message);
    }
  } catch (err) {
    console.warn('Falha de rede ao sincronizar treinos:', err);
  }
}

/**
 * Sincroniza log de sessão de treino concluída com o Supabase.
 */
export async function syncSessionLogToCloud(userId: string, log: WorkoutSessionLog): Promise<void> {
  if (!supabase) return;

  try {
    const payload = {
      user_id: userId,
      name: log.name,
      date: log.date,
      duration_minutes: log.durationMinutes,
      total_volume_load_kg: log.totalVolumeLoadKg,
      calories_burned_estimate: log.caloriesBurnedEstimate,
      completed: log.completed,
      exercise_logs: log.exerciseLogs || [],
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('workout_session_logs').insert(payload);
    if (error) console.warn('Erro ao sincronizar log de treino:', error.message);
  } catch (err) {
    console.warn('Falha de rede ao sincronizar log de treino:', err);
  }
}

/**
 * Sincroniza registro de pesagem com o Supabase.
 */
export async function syncWeightLogToCloud(userId: string, log: WeightLog): Promise<void> {
  if (!supabase) return;

  try {
    const payload = {
      user_id: userId,
      date: log.date,
      weight_kg: log.weightKg,
      ema_weight_kg: log.emaWeightKg || null,
      body_fat_percentage: log.bodyFatPercentage || null,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('weight_logs').insert(payload);
    if (error) console.warn('Erro ao sincronizar pesagem:', error.message);
  } catch (err) {
    console.warn('Falha de rede ao sincronizar pesagem:', err);
  }
}

/**
 * Sincroniza log de check-in com o Supabase.
 */
export async function syncCheckInLogToCloud(userId: string, log: CheckInLog): Promise<void> {
  if (!supabase) return;

  try {
    const payload = {
      user_id: userId,
      date: log.date,
      adherence_score: log.adherencePercentage,
      hunger_level: log.hungerRating,
      energy_level: log.energyRating,
      weekly_avg_weight_kg: log.weightKg,
      calculated_tdee: 0,
      recommended_calorie_delta: log.caloricAdjustmentSuggestedKcal || 0,
      applied_calorie_adjustment: log.caloricAdjustmentSuggestedKcal || 0,
      diagnosis_text: log.notes || '',
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('check_in_logs').insert(payload);
    if (error) console.warn('Erro ao sincronizar check-in:', error.message);
  } catch (err) {
    console.warn('Falha de rede ao sincronizar check-in:', err);
  }
}
