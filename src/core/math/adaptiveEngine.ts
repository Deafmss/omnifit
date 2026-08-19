import { FitnessGoal, WeightLog } from '../storage/types';

/**
 * Calcula a Média Móvel Exponencial (EMA) para suavizar flutuações de retenção hídrica/sódio.
 */
export function calculateWeightEMA(logs: WeightLog[], periodDays: number = 7): WeightLog[] {
  if (logs.length === 0) return [];

  const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const alpha = 2 / (periodDays + 1);

  let previousEMA = sortedLogs[0].weightKg;
  return sortedLogs.map((log, index) => {
    if (index === 0) {
      return { ...log, emaWeightKg: Number(log.weightKg.toFixed(2)) };
    }
    const currentEMA = (log.weightKg * alpha) + (previousEMA * (1 - alpha));
    previousEMA = currentEMA;
    return { ...log, emaWeightKg: Number(currentEMA.toFixed(2)) };
  });
}

export interface AdaptiveEvaluationResult {
  status: 'on_track' | 'stalled' | 'losing_too_fast' | 'gaining_too_fast' | 'low_adherence';
  deltaWeightKg: number;
  revealedTDEE?: number;
  suggestedCaloricChangeKcal: number;
  reasoning: string;
}

/**
 * Avalia a taxa de variação real do corpo ao longo de um período e sugere ajuste calórico determinístico.
 */
export function evaluateAdaptiveMetabolism(
  goal: FitnessGoal,
  initialEmaWeightKg: number,
  currentEmaWeightKg: number,
  daysElapsed: number,
  averageDailyCaloriesConsumed: number,
  adherencePercentage: number,
  hungerRating: number // 1 a 5
): AdaptiveEvaluationResult {
  const deltaWeightKg = Number((currentEmaWeightKg - initialEmaWeightKg).toFixed(2));
  const weeklyRateKg = Number(((deltaWeightKg / daysElapsed) * 7).toFixed(2));

  // Se a adesão for muito baixa (< 75%), o problema não é o metabolismo e sim o seguimento da dieta
  if (adherencePercentage < 75) {
    return {
      status: 'low_adherence',
      deltaWeightKg,
      suggestedCaloricChangeKcal: 0,
      reasoning: 'Adesão abaixo de 75%. O metabolismo não pode ser calibrado com precisão se o plano não foi seguido de forma consistente. Mantenha as calorias atuais e foque na constância.'
    };
  }

  // Cálculo do TDEE real revelado termodinamicamente (7700 kcal ≈ 1kg de tecido adiposo)
  const revealedTDEE = Math.round(
    averageDailyCaloriesConsumed - ((deltaWeightKg * 7700) / Math.max(1, daysElapsed))
  );

  switch (goal) {
    case 'recomposition':
      // Recomposição: o peso deve oscilar muito pouco (-0.2kg a +0.1kg/sem) com ganho de força
      if (weeklyRateKg < -0.6) {
        return {
          status: 'losing_too_fast',
          deltaWeightKg,
          revealedTDEE,
          suggestedCaloricChangeKcal: +150,
          reasoning: `Perda de peso acima do ideal para recomposição (${weeklyRateKg} kg/sem). Risco de perda de massa magra. Aumentamos +150 kcal/dia.`
        };
      } else if (weeklyRateKg > +0.3) {
        return {
          status: 'gaining_too_fast',
          deltaWeightKg,
          revealedTDEE,
          suggestedCaloricChangeKcal: -100,
          reasoning: `Ganho de peso acima do ideal para recomposição corporal (+${weeklyRateKg} kg/sem). Ajustamos -100 kcal/dia para priorizar queima de gordura.`
        };
      }
      return {
        status: 'on_track',
        deltaWeightKg,
        revealedTDEE,
        suggestedCaloricChangeKcal: 0,
        reasoning: 'Excelente! A variação de peso está na faixa ideal para recomposição corporal simultânea (perda de gordura com manutenção/ganho muscular).'
      };

    case 'fat_loss':
      // Emagrecimento: taxa ideal de perda é entre -0.4kg e -0.9kg por semana
      if (Math.abs(weeklyRateKg) < 0.15 && daysElapsed >= 10) {
        // Estagnação com alta adesão
        const hungerHigh = hungerRating >= 4;
        const adjustment = hungerHigh ? -75 : -150;
        return {
          status: 'stalled',
          deltaWeightKg,
          revealedTDEE,
          suggestedCaloricChangeKcal: adjustment,
          reasoning: `Peso estagnado nos últimos ${daysElapsed} dias com adesão de ${adherencePercentage}%. Seu TDEE real calculado é de ~${revealedTDEE} kcal. Reduzimos ${Math.abs(adjustment)} kcal para reativar o déficit.`
        };
      } else if (weeklyRateKg < -1.2) {
        return {
          status: 'losing_too_fast',
          deltaWeightKg,
          revealedTDEE,
          suggestedCaloricChangeKcal: +150,
          reasoning: `Perda de peso excessivamente rápida (${weeklyRateKg} kg/sem). Risco de desaceleração da tireoide e catabolismo muscular. Adicionamos +150 kcal.`
        };
      }
      return {
        status: 'on_track',
        deltaWeightKg,
        revealedTDEE,
        suggestedCaloricChangeKcal: 0,
        reasoning: `Ritmo de queima de gordura perfeito (${weeklyRateKg} kg/sem). Mantenha o plano!`
      };

    case 'hypertrophy':
      // Hipertrofia limpa: ganho ideal é de +0.2kg a +0.4kg por semana
      if (weeklyRateKg < 0.1 && daysElapsed >= 10) {
        return {
          status: 'stalled',
          deltaWeightKg,
          revealedTDEE,
          suggestedCaloricChangeKcal: +150,
          reasoning: `Ganho de peso estagnado para hipertrofia. Aumentamos +150 kcal/dia de carboidratos para fornecer mais substrato energético aos treinos.`
        };
      } else if (weeklyRateKg > 0.6) {
        return {
          status: 'gaining_too_fast',
          deltaWeightKg,
          revealedTDEE,
          suggestedCaloricChangeKcal: -100,
          reasoning: `Ganho de peso rápido (+${weeklyRateKg} kg/sem). Parte expressiva pode ser acúmulo de gordura. Reduzimos -100 kcal.`
        };
      }
      return {
        status: 'on_track',
        deltaWeightKg,
        revealedTDEE,
        suggestedCaloricChangeKcal: 0,
        reasoning: `Ganho de massa muscular limpo e controlado (+${weeklyRateKg} kg/sem).`
      };

    case 'maintenance':
      return {
        status: 'on_track',
        deltaWeightKg,
        revealedTDEE,
        suggestedCaloricChangeKcal: 0,
        reasoning: 'Peso e balanço energético em equilíbrio perfeito de manutenção.'
      };
  }
}
