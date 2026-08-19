import { PreWorkoutFormula } from '../storage/types';

/**
 * Fórmula padrão do usuário com dose de 10g (zero açúcar).
 */
export const USER_PRE_WORKOUT_FORMULA: PreWorkoutFormula = {
  name: 'Pré-Treino de Alta Performance (Dose 10g)',
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

export interface ThermogenicBurnBreakdown {
  caffeineBurnKcal: number;
  taurineSynergyBurnKcal: number;
  totalThermogenicKcal: number;
  durationHours: number;
  metabolicBoostPercentage: number;
}

/**
 * Calcula a queima termogênica induzida por doses de cafeína (Dulloo et al., Astrup et al.).
 * 100mg de cafeína (1 xícara de 150ml de café preto sem açúcar) gera em média ~18 kcal de gasto termogênico passivo.
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
 * Combina o efeito mitocondrial da cafeína com o aumento de oxidação lipídica da taurina.
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

  // A taurina (2g por dose) promove aumento de ~10 a 15% na oxidação de ácidos graxos
  // gerando ~15 kcal adicionais via desacoplamento lipídico por dose
  const taurineSynergyBurnKcal = Math.round(dosesCount * (formula.taurineMg >= 1500 ? 15 : 8));

  const totalThermogenicKcal = caffeineResult.burnKcal + taurineSynergyBurnKcal;

  return {
    caffeineBurnKcal: caffeineResult.burnKcal,
    taurineSynergyBurnKcal,
    totalThermogenicKcal,
    durationHours: caffeineResult.durationHours,
    metabolicBoostPercentage: caffeineResult.metabolicBoostPercentage
  };
}
