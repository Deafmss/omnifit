import { MetabolicStats } from '../storage/types';

/**
 * Ciclo de carboidratos e refeição livre planejada.
 *
 * A ideia é simples: mais carboidrato no dia de treino, menos no dia de
 * descanso, mantendo a MÉDIA semanal igual à meta original. O total da semana
 * não muda — só a distribuição.
 *
 * Proteína fica fixa (é o macro que menos deve oscilar) e a gordura absorve
 * parte do ajuste nos dias de menos carboidrato, para as calorias fecharem.
 */

export type DayType = 'treino' | 'descanso';

export interface CycledDayTargets {
  dayType: DayType;
  calories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
}

export interface CarbCyclePlan {
  trainingDay: CycledDayTargets;
  restDay: CycledDayTargets;
  /** Média semanal resultante, para conferir que fecha com a meta. */
  weeklyAverageCalories: number;
  /** Diferença entre a média do ciclo e a meta original (deve ser ~0). */
  driftFromTarget: number;
}

/**
 * Distribui as calorias entre dias de treino e descanso.
 *
 * `intensity` controla o quanto os dias se afastam da média:
 * 0.10 é suave, 0.25 é agressivo. Acima disso o dia de descanso ficaria com
 * pouquíssimo carboidrato, o que costuma sabotar a adesão.
 */
export function buildCarbCyclePlan(
  stats: MetabolicStats,
  trainingDaysPerWeek: number,
  intensity: number = 0.15
): CarbCyclePlan {
  const treinoDias = Math.max(1, Math.min(7, Math.round(trainingDaysPerWeek)));
  const descansoDias = 7 - treinoDias;

  const forca = Math.max(0.05, Math.min(0.25, intensity));

  // Sem dia de descanso não há ciclo a fazer.
  if (descansoDias === 0) {
    const igual: CycledDayTargets = {
      dayType: 'treino',
      calories: stats.targetCalories,
      proteinGrams: stats.proteinGrams,
      carbGrams: stats.carbGrams,
      fatGrams: stats.fatGrams
    };

    return {
      trainingDay: igual,
      restDay: { ...igual, dayType: 'descanso' },
      weeklyAverageCalories: stats.targetCalories,
      driftFromTarget: 0
    };
  }

  // O acréscimo do dia de treino é bancado pelos dias de descanso, para que a
  // soma da semana continue igual: treino*extra = descanso*corte.
  const extraTreino = Math.round(stats.targetCalories * forca);
  const corteDescanso = Math.round((extraTreino * treinoDias) / descansoDias);

  const caloriasTreino = stats.targetCalories + extraTreino;
  const caloriasDescanso = stats.targetCalories - corteDescanso;

  // Proteína não muda. A gordura tem um piso: cortar demais afeta hormônios.
  const gorduraMinima = Math.round(stats.fatGrams * 0.7);

  const carboTreino = Math.round(stats.carbGrams + extraTreino / 4);

  // No dia de descanso o corte sai primeiro do carboidrato; se não couber,
  // a gordura completa o restante até o piso.
  const carboDescansoBruto = stats.carbGrams - corteDescanso / 4;
  const carboDescanso = Math.max(30, Math.round(carboDescansoBruto));

  const faltaCortar = Math.max(0, Math.round((carboDescanso - carboDescansoBruto) * 4));
  const gorduraDescanso = Math.max(gorduraMinima, Math.round(stats.fatGrams - faltaCortar / 9));

  const trainingDay: CycledDayTargets = {
    dayType: 'treino',
    calories: caloriasTreino,
    proteinGrams: stats.proteinGrams,
    carbGrams: carboTreino,
    fatGrams: stats.fatGrams
  };

  const restDay: CycledDayTargets = {
    dayType: 'descanso',
    calories: Math.max(0, caloriasDescanso),
    proteinGrams: stats.proteinGrams,
    carbGrams: carboDescanso,
    fatGrams: gorduraDescanso
  };

  const mediaSemanal = Math.round(
    (trainingDay.calories * treinoDias + restDay.calories * descansoDias) / 7
  );

  return {
    trainingDay,
    restDay,
    weeklyAverageCalories: mediaSemanal,
    driftFromTarget: mediaSemanal - stats.targetCalories
  };
}

export interface FreeMealPlan {
  /** Calorias liberadas para a refeição livre. */
  freeMealCalories: number;
  /** Corte por dia nos demais dias da semana. */
  dailyReductionKcal: number;
  /** Quantos dias absorvem o corte. */
  spreadOverDays: number;
  /** Meta ajustada nos dias de compensação. */
  adjustedDailyTarget: number;
  /** Aviso quando o pedido é grande demais para compensar com segurança. */
  warning?: string;
}

/**
 * Planeja uma refeição livre distribuindo o excedente pelos outros dias.
 *
 * O objetivo é tirar a culpa da conta: em vez de "estourei a dieta", o excesso
 * entra no planejamento e some diluído na semana.
 */
export function planFreeMeal(
  stats: MetabolicStats,
  freeMealCalories: number,
  spreadOverDays: number = 6
): FreeMealPlan {
  const dias = Math.max(1, Math.min(13, Math.round(spreadOverDays)));
  const extra = Math.max(0, Math.round(freeMealCalories));

  // A refeição livre substitui uma refeição normal, então só o que passa da
  // fatia habitual precisa ser compensado.
  const fatiaHabitual = Math.round(stats.targetCalories / 4);
  const excedente = Math.max(0, extra - fatiaHabitual);

  const corteDiario = Math.round(excedente / dias);
  const metaAjustada = stats.targetCalories - corteDiario;

  // Cortar mais de 25% da meta por vários dias derruba a adesão e a energia.
  const limiteSeguro = Math.round(stats.targetCalories * 0.25);

  let warning: string | undefined;
  if (corteDiario > limiteSeguro) {
    warning =
      'A compensação necessária é grande demais para caber com folga na semana. ' +
      'Considere distribuir em mais dias ou aceitar um excedente parcial — um dia acima da meta não desfaz semanas de consistência.';
  }

  return {
    freeMealCalories: extra,
    dailyReductionKcal: corteDiario,
    spreadOverDays: dias,
    adjustedDailyTarget: Math.max(stats.bmr, metaAjustada),
    warning
  };
}
