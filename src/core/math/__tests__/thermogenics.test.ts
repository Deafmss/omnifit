import { describe, it, expect } from 'vitest';
import { 
  calculateCaffeineThermogenesis, 
  calculatePreWorkoutThermogenesis, 
  USER_PRE_WORKOUT_FORMULA 
} from '../thermogenics';

describe('Motor de Termogênese Científica (Dulloo / Astrup)', () => {
  const bmr = 1800; // Taxa Metabólica Basal típica

  it('deve calcular queima termogênica de 1 xícara de café preto sem açúcar (~100mg cafeína)', () => {
    const result = calculateCaffeineThermogenesis(100, bmr);
    expect(result.burnKcal).toBeGreaterThanOrEqual(15);
    expect(result.burnKcal).toBeLessThanOrEqual(25);
    expect(result.durationHours).toBe(3);
    expect(result.metabolicBoostPercentage).toBe(4.0);
  });

  it('deve calcular queima termogênica de 3 xícaras de café ao longo do dia (~300mg cafeína)', () => {
    const result = calculateCaffeineThermogenesis(300, bmr);
    expect(result.burnKcal).toBeGreaterThanOrEqual(50);
    expect(result.burnKcal).toBeLessThanOrEqual(75);
    expect(result.durationHours).toBe(4);
  });

  it('deve calcular o gasto da dose exata de pré-treino do usuário (10g com 400mg cafeína + 2g taurina + beta-alanina)', () => {
    const breakdown = calculatePreWorkoutThermogenesis(USER_PRE_WORKOUT_FORMULA, bmr, 1);
    
    // 400mg cafeína para 1800 BMR: ~71 kcal cafeína + 15 kcal sinergia de taurina/oxidação = ~86 kcal
    expect(breakdown.caffeineBurnKcal).toBeGreaterThanOrEqual(65);
    expect(breakdown.taurineSynergyBurnKcal).toBe(15);
    expect(breakdown.totalThermogenicKcal).toBeGreaterThanOrEqual(80);
    expect(breakdown.totalThermogenicKcal).toBeLessThanOrEqual(115);
    expect(breakdown.metabolicBoostPercentage).toBe(9.5);
  });

  it('deve retornar 0 quando nenhuma dose é consumida', () => {
    const breakdown = calculatePreWorkoutThermogenesis(USER_PRE_WORKOUT_FORMULA, bmr, 0);
    expect(breakdown.totalThermogenicKcal).toBe(0);
  });
});
