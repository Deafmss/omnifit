import { UserProfile, MetabolicStats } from '../storage/types';

/**
 * Estima a Taxa Metabólica Basal (TMB).
 * Usa Katch-McArdle quando há % de gordura informado (a fórmula parte da massa
 * magra, então só faz sentido com esse dado); caso contrário, Mifflin-St Jeor.
 *
 * O resultado é uma estimativa populacional: a TMB real de cada pessoa pode
 * ficar acima ou abaixo do valor calculado. Os check-ins adaptativos existem
 * justamente para corrigir esse desvio com o tempo.
 */
export function calculateBMR(
  gender: 'male' | 'female',
  weightKg: number,
  heightCm: number,
  age: number,
  bodyFatPercentage?: number
): { bmr: number; formulaUsed: 'mifflin' | 'katch_mcardle' } {
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
 * Estima o Gasto Energético Diário Total (TDEE) a partir da TMB, somando um
 * fator de atividade basal e um acréscimo pelo volume de treino.
 *
 * O acréscimo por hora de treino é uma aproximação interna do app, não uma
 * fórmula publicada: serve para diferenciar quem treina 2x de quem treina 6x
 * por semana, e o valor final é calibrado pelos check-ins.
 */
export function calculateTDEE(
  bmr: number,
  trainingDaysPerWeek: number,
  sessionDurationMin: number
): number {
  // Fator de atividade base para rotina diária (trabalho/estudo de escritório)
  const basePAL = 1.2;

  // Acréscimo pelo volume de treino: ~5% do PAL por hora de treino semanal.
  const weeklyTrainingHours = (Math.max(0, trainingDaysPerWeek) * Math.max(0, sessionDurationMin)) / 60;
  const weeklyTrainingSurplusFactor = weeklyTrainingHours * 0.05;

  const activityMultiplier = Math.min(2.0, Math.max(1.2, basePAL + weeklyTrainingSurplusFactor));
  return Math.round(bmr * activityMultiplier);
}

/**
 * Deriva os parâmetros metabólicos, calóricos e de macronutrientes do perfil.
 * Todos os valores são estimativas de ponto de partida, refinadas pelo ajuste
 * acumulado dos check-ins.
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

  // Ajuste acumulado pelos check-ins adaptativos. É aqui que o motor de malha
  // fechada passa a ter efeito real: antes o valor era gravado no log do
  // check-in e nunca chegava ao alvo calórico do usuário.
  //
  // O ajuste é limitado a +/- 30% do TDEE e o alvo nunca desce abaixo da TMB,
  // para que uma sequência de check-ins não empurre a dieta a um patamar
  // perigosamente baixo.
  const adjustmentCap = Math.round(tdee * 0.3);
  const appliedCalorieAdjustmentKcal = Math.max(
    -adjustmentCap,
    Math.min(adjustmentCap, Math.round(profile.calorieAdjustmentKcal || 0))
  );

  if (appliedCalorieAdjustmentKcal !== 0) {
    const floor = profile.goal === 'fat_loss' ? bmr + 50 : bmr;
    targetCalories = Math.max(floor, targetCalories + appliedCalorieAdjustmentKcal);
    dailyDeficitOrSurplusKcal = targetCalories - tdee;
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
    expectedWeeklyWeightChangeKg,
    appliedCalorieAdjustmentKcal
  };
}
