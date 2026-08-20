import { describe, it, expect } from 'vitest';
import { buildCarbCyclePlan, planFreeMeal } from '../carbCycling';
import { calculateMetabolicStats } from '../metabolism';
import { UserProfile } from '../../storage/types';

const perfil: UserProfile = {
  name: 'Teste',
  age: 30,
  gender: 'male',
  heightCm: 180,
  weightKg: 80,
  bodyFatPercentage: 18,
  experienceLevel: 'intermediate',
  goal: 'recomposition',
  trainingDaysPerWeek: 4,
  sessionDurationMin: 60,
  dietMode: 'guided',
  mealsPerDay: 4,
  isCalibrated: true,
  createdAt: '',
  updatedAt: ''
};

const stats = calculateMetabolicStats(perfil);

describe('Ciclo de carboidratos', () => {
  it('deve manter a média semanal igual à meta original', () => {
    const plano = buildCarbCyclePlan(stats, 4, 0.15);

    // A regra central: o total da semana não muda, só a distribuição.
    expect(Math.abs(plano.driftFromTarget)).toBeLessThanOrEqual(2);
  });

  it('deve dar mais calorias e carboidrato no dia de treino', () => {
    const plano = buildCarbCyclePlan(stats, 4, 0.15);

    expect(plano.trainingDay.calories).toBeGreaterThan(stats.targetCalories);
    expect(plano.restDay.calories).toBeLessThan(stats.targetCalories);
    expect(plano.trainingDay.carbGrams).toBeGreaterThan(plano.restDay.carbGrams);
  });

  it('deve manter a proteína fixa nos dois tipos de dia', () => {
    const plano = buildCarbCyclePlan(stats, 4, 0.2);

    // A proteína é o macro que menos deve oscilar.
    expect(plano.trainingDay.proteinGrams).toBe(stats.proteinGrams);
    expect(plano.restDay.proteinGrams).toBe(stats.proteinGrams);
  });

  it('deve respeitar um piso de gordura no dia de descanso', () => {
    const plano = buildCarbCyclePlan(stats, 6, 0.25);

    // Cortar gordura sem limite afeta produção hormonal.
    expect(plano.restDay.fatGrams).toBeGreaterThanOrEqual(Math.round(stats.fatGrams * 0.7));
  });

  it('não deve ciclar quando o usuário treina todos os dias', () => {
    const plano = buildCarbCyclePlan(stats, 7);

    // Sem dia de descanso não há de onde tirar as calorias.
    expect(plano.trainingDay.calories).toBe(stats.targetCalories);
    expect(plano.restDay.calories).toBe(stats.targetCalories);
    expect(plano.driftFromTarget).toBe(0);
  });

  it('deve limitar a intensidade a uma faixa praticável', () => {
    const suave = buildCarbCyclePlan(stats, 4, 0.01);
    const extremo = buildCarbCyclePlan(stats, 4, 0.9);

    // Fora de 5%–25% a adesão despenca; o cálculo trava nos limites.
    const variacaoSuave = suave.trainingDay.calories - stats.targetCalories;
    const variacaoExtrema = extremo.trainingDay.calories - stats.targetCalories;

    expect(variacaoSuave).toBeGreaterThanOrEqual(Math.round(stats.targetCalories * 0.05) - 1);
    expect(variacaoExtrema).toBeLessThanOrEqual(Math.round(stats.targetCalories * 0.25) + 1);
  });

  it('deve manter o carboidrato do dia de descanso num mínimo praticável', () => {
    const plano = buildCarbCyclePlan(stats, 6, 0.25);
    expect(plano.restDay.carbGrams).toBeGreaterThanOrEqual(30);
  });
});

describe('Refeição livre planejada', () => {
  it('deve compensar apenas o que passa da fatia habitual', () => {
    const fatia = Math.round(stats.targetCalories / 4);
    const plano = planFreeMeal(stats, fatia, 6);

    // Uma refeição livre do tamanho de uma refeição normal não gera excedente.
    expect(plano.dailyReductionKcal).toBe(0);
  });

  it('deve distribuir o excedente pelos dias informados', () => {
    const plano = planFreeMeal(stats, 1600, 6);

    expect(plano.spreadOverDays).toBe(6);
    expect(plano.dailyReductionKcal).toBeGreaterThan(0);
    expect(plano.adjustedDailyTarget).toBeLessThan(stats.targetCalories);
  });

  it('nunca deve levar a meta ajustada abaixo da TMB', () => {
    const plano = planFreeMeal(stats, 10000, 2);
    expect(plano.adjustedDailyTarget).toBeGreaterThanOrEqual(stats.bmr);
  });

  it('deve avisar quando a compensação é grande demais', () => {
    const plano = planFreeMeal(stats, 8000, 2);

    expect(plano.warning).toBeTruthy();
    // O aviso não pode ser moralista: um dia acima da meta não apaga semanas.
    expect(plano.warning?.toLowerCase()).toContain('consistência');
  });

  it('não deve avisar quando a compensação é confortável', () => {
    const plano = planFreeMeal(stats, 1200, 6);
    expect(plano.warning).toBeUndefined();
  });

  it('deve tratar valores inválidos sem quebrar', () => {
    const plano = planFreeMeal(stats, -500, 0);

    expect(plano.freeMealCalories).toBe(0);
    expect(plano.spreadOverDays).toBe(1);
    expect(plano.dailyReductionKcal).toBe(0);
  });
});
