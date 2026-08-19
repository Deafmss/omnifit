import { UserProfile, MetabolicStats } from '../storage/types';

/**
 * Calcula a Taxa Metabólica Basal (TMB) com padrão ouro clínico.
 * Utiliza Katch-McArdle quando % de gordura está disponível, ou Mifflin-St Jeor caso contrário.
 */
export function calculateBMR(
  gender: 'male' | 'female',
  weightKg: number,
  heightCm: number,
  age: number,
  bodyFatPercentage?: number
): { bmr: number; formulaUsed: 'mifflin' | 'katch_mcardle' | 'cunningham' } {
  if (bodyFatPercentage && bodyFatPercentage > 3 && bodyFatPercentage < 60) {
    const leanBodyMassKg = weightKg * (1 - bodyFatPercentage / 100);
    const bmr = 370 + (21.6 * leanBodyMassKg);
    return { bmr: Math.round(bmr), formulaUsed: 'katch_mcardle' };
  }

  const s = gender === 'male' ? 5 : -161;
  const bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + s;
  return { bmr: Math.round(bmr), formulaUsed: 'mifflin' };
}

/**
 * Calcula o Gasto Energético Diário Total (TDEE) considerando atividade basal e volume de treino.
 */
export function calculateTDEE(
  bmr: number,
  trainingDaysPerWeek: number,
  sessionDurationMin: number
): number {
  // Fator de atividade base para rotina diária (trabalho/estudo de escritório)
  const basePAL = 1.2;

  // Gasto adicional estimado de treino por semana (média de 6.0 METs para musculação)
  const weeklyTrainingHours = (trainingDaysPerWeek * sessionDurationMin) / 60;
  const weeklyTrainingSurplusFactor = (weeklyTrainingHours * 0.05); // ~5% de acréscimo por hora semanal

  const activityMultiplier = Math.min(2.0, Math.max(1.2, basePAL + weeklyTrainingSurplusFactor));
  return Math.round(bmr * activityMultiplier);
}

/**
 * Gera os parâmetros metabólicos, calóricos e de macronutrientes com precisão clínica.
 */
export function calculateMetabolicStats(profile: UserProfile): MetabolicStats {
  const { bmr, formulaUsed } = calculateBMR(
    profile.gender,
    profile.weightKg,
    profile.heightCm,
    profile.age,
    profile.bodyFatPercentage
  );

  const tdee = calculateTDEE(bmr, profile.trainingDaysPerWeek, profile.sessionDurationMin);

  let targetCalories = tdee;
  let dailyDeficitOrSurplusKcal = 0;
  let proteinRatioGPerKg = 2.0;
  let fatRatioGPerKg = 0.85;

  switch (profile.goal) {
    case 'recomposition':
      // Recomposição: déficit suave (-10%) com alta ingestão de proteína para hipertrofia + queima de gordura
      dailyDeficitOrSurplusKcal = -Math.round(tdee * 0.10);
      targetCalories = tdee + dailyDeficitOrSurplusKcal;
      proteinRatioGPerKg = 2.2;
      fatRatioGPerKg = 0.85;
      break;

    case 'fat_loss':
      // Emagrecimento: déficit de 22%, garantindo que não caia perigosamente abaixo da TMB
      dailyDeficitOrSurplusKcal = -Math.round(tdee * 0.22);
      targetCalories = Math.max(bmr + 50, tdee + dailyDeficitOrSurplusKcal);
      dailyDeficitOrSurplusKcal = targetCalories - tdee;
      proteinRatioGPerKg = 2.2;
      fatRatioGPerKg = 0.80;
      break;

    case 'hypertrophy':
      // Hipertrofia limpa: superávit controlado de 12%
      dailyDeficitOrSurplusKcal = Math.round(tdee * 0.12);
      targetCalories = tdee + dailyDeficitOrSurplusKcal;
      proteinRatioGPerKg = 2.0;
      fatRatioGPerKg = 0.90;
      break;

    case 'maintenance':
      targetCalories = tdee;
      dailyDeficitOrSurplusKcal = 0;
      proteinRatioGPerKg = 1.8;
      fatRatioGPerKg = 0.90;
      break;
  }

  // Gramas de Proteína e Gordura
  const proteinGrams = Math.round(profile.weightKg * proteinRatioGPerKg);
  const minFatGrams = profile.gender === 'female' ? 45 : 50;
  const fatGrams = Math.max(minFatGrams, Math.round(profile.weightKg * fatRatioGPerKg));

  // Calorias restantes para Carboidratos
  const caloriesFromProteinAndFat = (proteinGrams * 4) + (fatGrams * 9);
  const remainingCaloriesForCarbs = Math.max(0, targetCalories - caloriesFromProteinAndFat);
  const carbGrams = Math.round(remainingCaloriesForCarbs / 4);

  // Efeito Térmico dos Alimentos (TEF)
  const tefKcal = Math.round(
    (proteinGrams * 4 * 0.25) +
    (carbGrams * 4 * 0.075) +
    (fatGrams * 9 * 0.015)
  );

  // Ingestão hídrica recomendada: 35ml/kg + 500ml adicionais para quem treina
  const waterIntakeMl = Math.round(
    (profile.weightKg * 35) + (profile.trainingDaysPerWeek > 0 ? 500 : 0)
  );

  // Fibras: 14g a cada 1000 kcal ingeridas (Diretrizes da USDA/IOM)
  const fiberGramsTarget = Math.round((targetCalories / 1000) * 14);

  // Variação teórica de peso corporal semanal (1 kg de gordura ≈ 7700 kcal)
  const expectedWeeklyWeightChangeKg = Number(((dailyDeficitOrSurplusKcal * 7) / 7700).toFixed(2));

  return {
    bmr,
    tdee,
    formulaUsed,
    targetCalories,
    proteinGrams,
    carbGrams,
    fatGrams,
    tefKcal,
    waterIntakeMl,
    fiberGramsTarget,
    dailyDeficitOrSurplusKcal,
    expectedWeeklyWeightChangeKg
  };
}
