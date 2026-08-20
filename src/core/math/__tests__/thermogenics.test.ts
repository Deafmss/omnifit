import { describe, it, expect } from 'vitest';
import {
  calculateCaffeineThermogenesis,
  calculatePreWorkoutThermogenesis,
  USER_PRE_WORKOUT_FORMULA
} from '../thermogenics';

describe('Motor de termogênese por cafeína', () => {
  const bmr = 1800; // Taxa Metabólica Basal típica

  it('deve estimar queima modesta para 1 xícara de café preto sem açúcar (~100mg de cafeína)', () => {
    const result = calculateCaffeineThermogenesis(100, bmr);
    expect(result.burnKcal).toBeGreaterThan(0);
    expect(result.burnKcal).toBeLessThanOrEqual(25);
    expect(result.durationHours).toBe(3);
  });

  it('deve estimar queima para ~300mg de cafeína com duração mais longa', () => {
    const result = calculateCaffeineThermogenesis(300, bmr);
    expect(result.burnKcal).toBeGreaterThan(0);
    expect(result.burnKcal).toBeLessThanOrEqual(45);
    expect(result.durationHours).toBe(4);
  });

  it('deve retornar tudo zerado para dose zero ou negativa', () => {
    for (const dose of [0, -50]) {
      const result = calculateCaffeineThermogenesis(dose, bmr);
      expect(result.burnKcal).toBe(0);
      expect(result.metabolicBoostPercentage).toBe(0);
      expect(result.durationHours).toBe(0);
    }
  });

  it('deve marcar o resultado como estimativa e trazer a ressalva de confiança', () => {
    const result = calculateCaffeineThermogenesis(200, bmr);
    expect(result.isEstimate).toBe(true);
    expect(result.confidenceNote).toMatch(/estimativa/i);
    expect(result.confidenceNote).toMatch(/tolerância/i);

    // A ressalva também acompanha o caso zerado, porque a interface a exibe sempre.
    expect(calculateCaffeineThermogenesis(0, bmr).confidenceNote).toBe(result.confidenceNote);
  });
});

describe('Saturação da resposta à cafeína', () => {
  const bmr = 1800;

  it('não deve dobrar a queima quando a dose dobra', () => {
    const single = calculateCaffeineThermogenesis(200, bmr).burnKcal;
    const double = calculateCaffeineThermogenesis(400, bmr).burnKcal;

    expect(double).toBeGreaterThan(single);
    expect(double).toBeLessThan(single * 2);
  });

  it('deve entregar rendimento decrescente por mg em doses maiores', () => {
    const perMgLow = calculateCaffeineThermogenesis(100, bmr).burnKcal / 100;
    const perMgMid = calculateCaffeineThermogenesis(400, bmr).burnKcal / 400;
    const perMgHigh = calculateCaffeineThermogenesis(800, bmr).burnKcal / 800;

    expect(perMgMid).toBeLessThan(perMgLow);
    expect(perMgHigh).toBeLessThan(perMgMid);
  });

  it('deve manter a queima abaixo de um teto conservador mesmo em doses absurdas', () => {
    const result = calculateCaffeineThermogenesis(5000, bmr);
    expect(result.burnKcal).toBeLessThanOrEqual(60);
  });
});

describe('Coerência entre percentual de boost e queima em kcal', () => {
  it('deve derivar o boost percentual da própria queima estimada', () => {
    for (const bmr of [1400, 1800, 2400]) {
      for (const dose of [100, 250, 400, 900]) {
        const result = calculateCaffeineThermogenesis(dose, bmr);
        const expected = Math.round((result.burnKcal / bmr) * 1000) / 10;
        expect(result.metabolicBoostPercentage).toBe(expected);
      }
    }
  });

  it('deve manter o boost percentual em patamar de estimativa honesta (bem abaixo de 9,5%)', () => {
    const result = calculateCaffeineThermogenesis(400, 1800);
    expect(result.metabolicBoostPercentage).toBeLessThan(5);
  });

  it('deve repassar o mesmo percentual no detalhamento do pré-treino', () => {
    const bmr = 1800;
    const breakdown = calculatePreWorkoutThermogenesis(USER_PRE_WORKOUT_FORMULA, bmr, 1);
    const expected = Math.round((breakdown.caffeineBurnKcal / bmr) * 1000) / 10;
    expect(breakdown.metabolicBoostPercentage).toBe(expected);
  });
});

describe('Detalhamento termogênico do pré-treino', () => {
  const bmr = 1800;

  it('deve zerar a componente de taurina e não somá-la ao total', () => {
    const breakdown = calculatePreWorkoutThermogenesis(USER_PRE_WORKOUT_FORMULA, bmr, 1);

    expect(breakdown.taurineSynergyBurnKcal).toBe(0);
    expect(breakdown.totalThermogenicKcal).toBe(breakdown.caffeineBurnKcal);
  });

  it('deve manter a taurina zerada em doses múltiplas', () => {
    const breakdown = calculatePreWorkoutThermogenesis(USER_PRE_WORKOUT_FORMULA, bmr, 3);
    expect(breakdown.taurineSynergyBurnKcal).toBe(0);
    expect(breakdown.totalThermogenicKcal).toBe(breakdown.caffeineBurnKcal);
  });

  it('deve saturar entre 1 e 2 doses da mesma fórmula', () => {
    const one = calculatePreWorkoutThermogenesis(USER_PRE_WORKOUT_FORMULA, bmr, 1);
    const two = calculatePreWorkoutThermogenesis(USER_PRE_WORKOUT_FORMULA, bmr, 2);

    expect(two.totalThermogenicKcal).toBeGreaterThan(one.totalThermogenicKcal);
    expect(two.totalThermogenicKcal).toBeLessThan(one.totalThermogenicKcal * 2);
  });

  it('deve retornar 0 quando nenhuma dose é consumida', () => {
    const breakdown = calculatePreWorkoutThermogenesis(USER_PRE_WORKOUT_FORMULA, bmr, 0);

    expect(breakdown.totalThermogenicKcal).toBe(0);
    expect(breakdown.caffeineBurnKcal).toBe(0);
    expect(breakdown.taurineSynergyBurnKcal).toBe(0);
    expect(breakdown.metabolicBoostPercentage).toBe(0);
    expect(breakdown.durationHours).toBe(0);
  });

  it('deve sinalizar que o detalhamento é estimativa', () => {
    const breakdown = calculatePreWorkoutThermogenesis(USER_PRE_WORKOUT_FORMULA, bmr, 1);
    expect(breakdown.isEstimate).toBe(true);
    expect(breakdown.confidenceNote.length).toBeGreaterThan(0);
  });
});
