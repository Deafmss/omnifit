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
  isEstimate: boolean;
  confidenceNote: string;
}

export interface CaffeineThermogenesisResult {
  burnKcal: number;
  metabolicBoostPercentage: number;
  durationHours: number;
  isEstimate: boolean;
  confidenceNote: string;
}

/**
 * Texto exibido junto de qualquer número de queima termogênica. Existe porque o valor
 * é uma estimativa grosseira: a resposta à cafeína varia muito entre pessoas e cai com
 * o uso habitual, então mostrar o número sem ressalva induz o usuário a comer de volta
 * calorias que talvez nunca tenham sido gastas.
 */
export const THERMOGENIC_CONFIDENCE_NOTE =
  'Estimativa aproximada. A variação entre indivíduos é grande e o efeito diminui com o uso diário (tolerância), então trate como ordem de grandeza, não como caloria contabilizada.';

/**
 * Teto assintótico de queima extra (kcal) por episódio de consumo, antes do ajuste de TMB.
 * Deliberadamente baixo: a curva precisa subestimar, porque o erro de superestimar vira
 * comida a mais no prato do usuário.
 */
const CAFFEINE_MAX_BURN_KCAL = 60;

/** Dose (mg) em que a curva entrega metade do teto. Define a velocidade da saturação. */
const CAFFEINE_HALF_SATURATION_MG = 300;

/**
 * Estima a queima termogênica extra induzida por uma dose de cafeína.
 *
 * A resposta usa uma curva saturante (hiperbólica, estilo Michaelis-Menten):
 *
 *   queima = teto * dose / (dose + meia_saturação)
 *
 * O formato saturante importa mais que os coeficientes: dobrar a dose não dobra o gasto,
 * porque a termogênese induzida por cafeína tem rendimento decrescente e é atenuada por
 * tolerância em quem consome todos os dias. Os coeficientes foram escolhidos para ficar na
 * ordem de grandeza descrita na literatura de termogênese por cafeína (dezenas de kcal por
 * episódio, não centenas) e no limite conservador dela — nenhum número aqui vem de um
 * estudo específico nem deve ser apresentado como tal.
 *
 * @param caffeineMg Miligramas totais de cafeína consumidos
 * @param bmr Taxa Metabólica Basal do indivíduo (kcal/dia)
 */
export function calculateCaffeineThermogenesis(
  caffeineMg: number,
  bmr: number
): CaffeineThermogenesisResult {
  if (caffeineMg <= 0) {
    return {
      burnKcal: 0,
      metabolicBoostPercentage: 0,
      durationHours: 0,
      isEstimate: true,
      confidenceNote: THERMOGENIC_CONFIDENCE_NOTE
    };
  }

  // Fator de escala metabólica em relação à TMB de referência (1800 kcal)
  const bmrScaling = Math.max(0.6, bmr / 1800);

  const saturatedBurn =
    (CAFFEINE_MAX_BURN_KCAL * caffeineMg) / (caffeineMg + CAFFEINE_HALF_SATURATION_MG);

  const burnKcal = Math.round(saturatedBurn * bmrScaling);

  const durationHours = caffeineMg >= 300 ? 4 : 3;

  return {
    burnKcal,
    // Derivado da mesma queima exibida na interface: um número, uma fonte. Antes havia uma
    // tabela de percentuais fixos que contradizia o kcal mostrado ao lado dela.
    metabolicBoostPercentage: deriveMetabolicBoostPercentage(burnKcal, bmr),
    durationHours,
    isEstimate: true,
    confidenceNote: THERMOGENIC_CONFIDENCE_NOTE
  };
}

/**
 * Converte a queima estimada em percentual da TMB diária, com uma casa decimal.
 */
function deriveMetabolicBoostPercentage(burnKcal: number, bmr: number): number {
  if (burnKcal <= 0 || bmr <= 0) return 0;
  return Math.round((burnKcal / bmr) * 1000) / 10;
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
      metabolicBoostPercentage: 0,
      isEstimate: true,
      confidenceNote: THERMOGENIC_CONFIDENCE_NOTE
    };
  }

  const totalCaffeine = formula.caffeineMg * dosesCount;
  const caffeineResult = calculateCaffeineThermogenesis(totalCaffeine, bmr);

  // Zerado de propósito: não há base para atribuir gasto energético à taurina. O valor antigo
  // (kcal fixos por dose) se justificava com aumento de oxidação de ácidos graxos, mas oxidar
  // mais gordura é trocar o substrato usado, não gastar mais energia. O campo continua no
  // retorno apenas para não quebrar a interface que já o exibe.
  const taurineSynergyBurnKcal = 0;

  const totalThermogenicKcal = caffeineResult.burnKcal + taurineSynergyBurnKcal;

  return {
    caffeineBurnKcal: caffeineResult.burnKcal,
    taurineSynergyBurnKcal,
    totalThermogenicKcal,
    durationHours: caffeineResult.durationHours,
    metabolicBoostPercentage: caffeineResult.metabolicBoostPercentage,
    isEstimate: caffeineResult.isEstimate,
    confidenceNote: caffeineResult.confidenceNote
  };
}
