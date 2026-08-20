import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile, MealPlan, WorkoutRoutine, WorkoutSessionLog, WeightLog, CheckInLog, DailyFoodLog } from '../storage/types';

// As credenciais vêm EXCLUSIVAMENTE das variáveis de ambiente.
// Nunca reintroduza chaves literais aqui: elas ficam no histórico do git para
// sempre e passam a valer para todos os ambientes (dev, preview e produção).
// Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env local e no painel
// da Vercel (Settings -> Environment Variables).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('your-project-id')
  );
};

if (!isSupabaseConfigured() && import.meta.env.DEV) {
  console.info(
    '[OmniFit] Supabase não configurado. O app funciona 100% offline; ' +
    'defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para habilitar login com Google e sincronização.'
  );
}

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

/**
 * Sincroniza o diário alimentar com o Supabase.
 * Usa upsert pela chave natural (data + alimento + refeição) para ser idempotente:
 * reenviar o mesmo dia não duplica registros.
 */
export async function syncFoodLogsToCloud(userId: string, logs: DailyFoodLog[]): Promise<void> {
  if (!supabase || logs.length === 0) return;

  try {
    const payload = logs.map((log) => ({
      user_id: userId,
      date: log.date,
      food_id: log.foodId,
      food_name: log.foodName,
      grams: log.grams,
      calories: log.calories,
      protein_g: log.protein,
      carbs_g: log.carbs,
      fat_g: log.fat,
      fiber_g: log.fiber,
      meal_name: log.mealName,
      meal_order: log.mealOrder,
      logged_at: log.loggedAt
    }));

    const { error } = await supabase
      .from('food_logs')
      .upsert(payload, { onConflict: 'user_id,date,food_id,meal_order' });

    if (error) console.warn('Erro ao sincronizar diário alimentar:', error.message);
  } catch (err) {
    console.warn('Falha de rede ao sincronizar diário alimentar:', err);
  }
}

// ============================================================================
// LEITURA DA NUVEM
//
// Sem estas funções a sincronização era só de subida: um backup do qual não se
// conseguia restaurar nada, e que não servia para trocar de dispositivo.
//
// Todas devolvem `null` quando a leitura FALHA (rede, permissão) e um array
// vazio quando simplesmente não há dados. A diferença importa: o reconciliador
// não pode confundir "não deu para ler" com "não existe nada lá".
// ============================================================================

/** Perfil salvo na nuvem, ou null se não houver / falhar. */
export async function fetchProfileFromCloud(userId: string): Promise<UserProfile | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      name: data.name,
      age: data.age,
      gender: data.gender,
      heightCm: Number(data.height_cm),
      weightKg: Number(data.weight_kg),
      bodyFatPercentage: data.body_fat_percentage ?? undefined,
      experienceLevel: data.experience_level,
      goal: data.goal,
      trainingDaysPerWeek: data.training_days_per_week,
      sessionDurationMin: data.session_duration_min,
      dietMode: data.diet_mode,
      mealsPerDay: data.meals_per_day,
      isCalibrated: data.is_calibrated,
      preWorkoutFormula: data.pre_workout_formula ?? undefined,
      coffeeConfig: data.coffee_config ?? undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (err) {
    console.warn('Falha ao ler perfil da nuvem:', err);
    return null;
  }
}

export async function fetchMealPlansFromCloud(userId: string): Promise<MealPlan[] | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', userId)
      .order('order_index', { ascending: true });

    if (error || !data) return null;

    return data.map((row) => ({
      name: row.name,
      order: row.order_index,
      timeLabel: row.suggested_time ?? undefined,
      targetCalories: row.target_calories,
      targetProtein: Number(row.target_protein_g),
      targetCarbs: Number(row.target_carbs_g),
      targetFat: Number(row.target_fat_g),
      portions: Array.isArray(row.items) ? row.items : []
    }));
  } catch (err) {
    console.warn('Falha ao ler refeições da nuvem:', err);
    return null;
  }
}

export async function fetchRoutinesFromCloud(userId: string): Promise<WorkoutRoutine[] | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('workout_routines')
      .select('*')
      .eq('user_id', userId)
      .order('day_of_week', { ascending: true });

    if (error || !data) return null;

    return data.map((row) => ({
      name: row.name,
      splitCode: row.split_code,
      dayOfWeek: row.day_of_week,
      targetMuscles: Array.isArray(row.target_muscles) ? row.target_muscles : [],
      exercises: Array.isArray(row.exercises) ? row.exercises : []
    }));
  } catch (err) {
    console.warn('Falha ao ler fichas da nuvem:', err);
    return null;
  }
}

export async function fetchWeightLogsFromCloud(userId: string): Promise<WeightLog[] | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (error || !data) return null;

    return data.map((row) => ({
      date: row.date,
      weightKg: Number(row.weight_kg),
      emaWeightKg: row.ema_weight_kg ? Number(row.ema_weight_kg) : undefined,
      bodyFatPercentage: row.body_fat_percentage ? Number(row.body_fat_percentage) : undefined
    }));
  } catch (err) {
    console.warn('Falha ao ler pesagens da nuvem:', err);
    return null;
  }
}

export async function fetchSessionLogsFromCloud(userId: string): Promise<WorkoutSessionLog[] | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('workout_session_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (error || !data) return null;

    return data.map((row) => ({
      name: row.name,
      date: row.date,
      durationMinutes: row.duration_minutes,
      caloriesBurnedEstimate: row.calories_burned_estimate,
      totalVolumeLoadKg: Number(row.total_volume_load_kg),
      completed: row.completed,
      exerciseLogs: Array.isArray(row.exercise_logs) ? row.exercise_logs : []
    }));
  } catch (err) {
    console.warn('Falha ao ler treinos da nuvem:', err);
    return null;
  }
}

export async function fetchCheckInLogsFromCloud(userId: string): Promise<CheckInLog[] | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('check_in_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (error || !data) return null;

    return data.map((row) => ({
      date: row.date,
      weightKg: Number(row.weekly_avg_weight_kg),
      hungerRating: row.hunger_level,
      energyRating: row.energy_level,
      adherencePercentage: row.adherence_score,
      caloricAdjustmentSuggestedKcal: row.recommended_calorie_delta,
      notes: row.diagnosis_text || ''
    }));
  } catch (err) {
    console.warn('Falha ao ler check-ins da nuvem:', err);
    return null;
  }
}

export async function fetchFoodLogsFromCloud(userId: string): Promise<DailyFoodLog[] | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (error || !data) return null;

    return data.map((row) => ({
      date: row.date,
      foodId: row.food_id,
      foodName: row.food_name,
      grams: Number(row.grams),
      calories: row.calories,
      protein: Number(row.protein_g),
      carbs: Number(row.carbs_g),
      fat: Number(row.fat_g),
      fiber: Number(row.fiber_g),
      mealName: row.meal_name,
      mealOrder: row.meal_order,
      loggedAt: row.logged_at
    }));
  } catch (err) {
    console.warn('Falha ao ler diário alimentar da nuvem:', err);
    return null;
  }
}
