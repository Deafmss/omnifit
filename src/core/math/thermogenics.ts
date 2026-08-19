import { PreWorkoutFormula, CoffeeConfig } from '../storage/types';

/**
 * Predefinições de doses comuns de café puro sem açúcar.
 */
export const DEFAULT_COFFEE_CONFIG: CoffeeConfig = {
  name: 'Xícara de Café Coado',
  servingMl: 150,
  caffeineMg: 100
};

export const COFFEE_PRESETS: CoffeeConfig[] = [
  { name: 'Dose Expresso Curto', servingMl: 50, caffeineMg: 65 },
  { name: 'Xícara de Café Coado', servingMl: 150, caffeineMg: 100 },
  { name: 'Caneca Média de Café', servingMl: 200, caffeineMg: 130 },
  { name: 'Caneca Grande de Café', servingMl: 250, caffeineMg: 165 },
  { name: 'Cápsula Intensa', servingMl: 110, caffeineMg: 90 }
];

/**
 * Fórmula padrão do usuário com dose de 10g (zero açúcar).
 */
export const USER_PRE_WORKOUT_FORMULA: PreWorkoutFormula = {
  name: 'Pré-Treino Alta Performance (400mg)',
  doseGrams: 10,
  caffeineMg: 400,
  taurineMg: 2000,
  betaAlanineMg: 2000,
  arginineMg: 1000,
  sodiumMg: 40,
  vitaminB5Mg: 5.64,
  vitaminB6Mg: 3.9,
  vitaminEMg: 30,
  chromiumMcg: 35,
  zeroSugar: true
};

export const PRE_WORKOUT_PRESETS: PreWorkoutFormula[] = [
  USER_PRE_WORKOUT_FORMULA,
  {
    name: 'Pré-Treino Leve / Diário (150mg)',
    doseGrams: 5,
    caffeineMg: 150,
    taurineMg: 1000,
    betaAlanineMg: 1000,
    arginineMg: 500,
    sodiumMg: 20,
    vitaminB5Mg: 2.5,
    vitaminB6Mg: 1.5,
    vitaminEMg: 10,
    chromiumMcg: 15,
    zeroSugar: true
  },
  {
    name: 'Pré-Treino Médio Padrão (250mg)',
    doseGrams: 7,
    caffeineMg: 250,
    taurineMg: 1200,
    betaAlanineMg: 1500,
    arginineMg: 800,
    sodiumMg: 30,
    vitaminB5Mg: 4.0,
    vitaminB6Mg: 2.5,
    vitaminEMg: 20,
    chromiumMcg: 25,
    zeroSugar: true
  },
  {
    name: 'Pré-Treino Forte (300mg)',
    doseGrams: 8,
    caffeineMg: 300,
    taurineMg: 1500,
    betaAlanineMg: 2000,
    arginineMg: 1000,
    sodiumMg: 35,
    vitaminB5Mg: 5.0,
    vitaminB6Mg: 3.0,
    vitaminEMg: 25,
    chromiumMcg: 30,
    zeroSugar: true
  }
];

export interface ThermogenicBurnBreakdown {
  caffeineBurnKcal: number;
  taurineSynergyBurnKcal: number;
  totalThermogenicKcal: number;
  durationHours: number;
  metabolicBoostPercentage: number;
}

/**
 * Calcula a queima termogênica induzida por doses de cafeína (Dulloo et al., Astrup et al.).
 * 
 * @param caffeineMg Miligramas totais de cafeína consumidos
 * @param bmr Taxa Metabólica Basal do indivíduo (kcal/dia)
 */
export function calculateCaffeineThermogenesis(
  caffeineMg: number,
  bmr: number
): { burnKcal: number; metabolicBoostPercentage: number; durationHours: number } {
  if (caffeineMg <= 0) {
    return { burnKcal: 0, metabolicBoostPercentage: 0, durationHours: 0 };
  }

  // Fator de escala metabólica em relação à TMB de referência (1800 kcal)
  const bmrScaling = Math.max(0.6, bmr / 1800);

  // Coeficiente cinético da literatura: ~0.18 kcal de queima termogênica por mg de cafeína
  const burnKcal = Math.round(caffeineMg * 0.18 * bmrScaling);

  const durationHours = caffeineMg >= 300 ? 4 : 3;
  const metabolicBoostPercentage = caffeineMg >= 350 ? 9.5 : caffeineMg >= 200 ? 6.5 : 4.0;

  return {
    burnKcal,
    metabolicBoostPercentage,
    durationHours
  };
}

/**
 * Calcula a queima calórica e o impacto termogênico total da fórmula de pré-treino.
 */
export function calculatePreWorkoutThermogenesis(
  formula: PreWorkoutFormula,
  bmr: number,
  dosesCount: number = 1
): ThermogenicBurnBreakdown {
  if (dosesCount <= 0) {
    return {
      caffeineBurnKcal: 0,
      taurineSynergyBurnKcal: 0,
      totalThermogenicKcal: 0,
      durationHours: 0,
      metabolicBoostPercentage: 0
    };
  }

  const totalCaffeine = formula.caffeineMg * dosesCount;
  const caffeineResult = calculateCaffeineThermogenesis(totalCaffeine, bmr);

  // A taurina (>=1.5g por dose) promove aumento de ~10 a 15% na oxidação de ácidos graxos
  const taurineSynergyBurnKcal = Math.round(
    dosesCount * (formula.taurineMg >= 1500 ? 15 : formula.taurineMg > 0 ? 8 : 0)
  );

  const totalThermogenicKcal = caffeineResult.burnKcal + taurineSynergyBurnKcal;

  return {
    caffeineBurnKcal: caffeineResult.burnKcal,
    taurineSynergyBurnKcal,
    totalThermogenicKcal,
    durationHours: caffeineResult.durationHours,
    metabolicBoostPercentage: caffeineResult.metabolicBoostPercentage
  };
}
