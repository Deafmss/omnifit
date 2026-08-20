import { FoodItem, MealPlan } from '../storage/types';
import { FOOD_DATABASE_MAP } from '../data/tacoDatabase';

export type BudgetTier = 'economic' | 'standard' | 'premium';
export type DietFocus = 'fat_loss' | 'hypertrophy' | 'recomposition';

export interface DietRestrictions {
  lactoseFree?: boolean;
  noFish?: boolean;
  vegetarian?: boolean;
}

export interface DietOptimizerOptions {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  mealsPerDay: number;
  budgetTier: BudgetTier;
  focus: DietFocus;
  restrictions?: DietRestrictions;
}

/**
 * Classificação de custo dos alimentos no mercado brasileiro.
 *
 * Todas as chaves são validadas contra a base TACO pelo teste de integridade
 * referencial: mais da metade delas eram IDs inexistentes, o que fazia salmão e
 * ovo caírem na mesma faixa de preço pelo fallback 'standard'.
 */
export const FOOD_BUDGET_TIERS: Record<string, BudgetTier> = {
  // Econômicos (excelente custo-benefício)
  ovo_galinha_cozido: 'economic',
  clara_ovo_cozida: 'economic',
  peito_frango_grelhado: 'economic',
  sobrecoxa_frango_sem_pele_assada: 'economic',
  acem_bovino_moido_cozido: 'economic',
  figado_bovino_grelhado: 'economic',
  atum_conserva_em_agua: 'economic',
  arroz_branco_cozido: 'economic',
  arroz_integral_cozido: 'economic',
  feijao_carioca_cozido: 'economic',
  feijao_preto_cozido: 'economic',
  lentilha_cozida: 'economic',
  macarrao_espaguete_cozido: 'economic',
  aveia_flocos: 'economic',
  farelo_aveia: 'economic',
  banana_prata: 'economic',
  banana_nanica: 'economic',
  batata_doce_cozida: 'economic',
  batata_inglesa_cozida: 'economic',
  mandioca_aipim_cozido: 'economic',
  pao_frances_unidade: 'economic',
  pao_forma_integral: 'economic',
  leite_vaca_desnatado: 'economic',
  leite_vaca_integral: 'economic',
  margarina_vegetal: 'economic',
  manteiga_com_sal: 'economic',
  laranja_pera: 'economic',
  maca_fuji_com_casca: 'economic',
  melancia_fresca: 'economic',
  brocolis_cozido: 'economic',
  cenoura_cozida: 'economic',
  cenoura_crua_ralada: 'economic',
  couve_manteiga_refogada: 'economic',
  chuchu_cozido: 'economic',
  abobrinha_italiana_cozida: 'economic',
  alface_crespa_americana: 'economic',
  tomate_salada: 'economic',

  // Padrão / médio
  patinho_bovino_grelhado_moido: 'standard',
  alcatra_bovina_grelhada: 'standard',
  maminha_bovina_grelhada: 'standard',
  lombo_suino_assado: 'standard',
  atum_conserva_em_oleo: 'standard',
  tofu_firme: 'standard',
  presunto_cozido_fatiado: 'standard',
  queijo_minas_frescal: 'standard',
  queijo_mussarela: 'standard',
  queijo_cottage: 'standard',
  queijo_ricota_fresca: 'standard',
  requeijao_cremoso_light: 'standard',
  iogurte_natural_desnatado: 'standard',
  whey_protein_concentrado: 'standard',
  albumina_pura_po: 'standard',
  azeite_oliva_extra_virgem: 'standard',
  pasta_de_amendoim_integral: 'standard',
  amendoim_torrado_sem_pele: 'standard',
  manteiga_tradicional: 'standard',
  grao_de_bico_cozido: 'standard',
  inhame_cozido: 'standard',
  cuscuz_milho_cozido: 'standard',
  tapioca_goma_preparada: 'standard',
  macarrao_integral_cozido: 'standard',
  mamao_papaia: 'standard',
  abacaxi_perola: 'standard',
  manga_tommy: 'standard',
  pera_williams: 'standard',
  beterraba_cozida: 'standard',
  couve_flor_cozida: 'standard',
  vagem_cozida: 'standard',
  espinafre_cozido: 'standard',
  pepino_japones: 'standard',

  // Premium / mais caros
  salmao_file_grelhado: 'premium',
  file_mignon_bovino_grelhado: 'premium',
  file_mignon_suino_grelhado: 'premium',
  tilapia_file_grelhado: 'premium',
  camarao_cozido: 'premium',
  peito_peru_defumado_fatiado: 'premium',
  whey_protein_isolado: 'premium',
  caseina_micellar: 'premium',
  bebida_lactea_proteica_yopro: 'premium',
  iogurte_grego_natural_zero: 'premium',
  castanha_de_caju_torrada: 'premium',
  castanha_para: 'premium',
  nozes_chilenas: 'premium',
  semente_chia: 'premium',
  semente_linhaca_dourada: 'premium',
  abacate_manteiga: 'premium',
  morango_fresco: 'premium',
  kiwi_verde: 'premium',
  uva_thompson_italia: 'premium',
  rucula_fresca: 'premium',
  palmito_pupunha_conserva: 'premium'
};

type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'bedtime';

interface MealPreset {
  name: string;
  time: string;
  type: MealType;
  /** Fração do total diário de calorias destinada a esta refeição. */
  share: number;
}

/**
 * Distribuição das refeições ao longo do dia. As frações somam 1 em cada
 * configuração, para que a soma das metas por refeição feche com a meta diária.
 */
const MEAL_PRESETS: Record<number, MealPreset[]> = {
  2: [
    { name: 'Almoço Principal', time: '12:30', type: 'lunch', share: 0.55 },
    { name: 'Jantar Principal', time: '20:00', type: 'dinner', share: 0.45 }
  ],
  3: [
    { name: 'Café da Manhã', time: '08:00', type: 'breakfast', share: 0.3 },
    { name: 'Almoço Completo', time: '12:30', type: 'lunch', share: 0.4 },
    { name: 'Jantar', time: '20:00', type: 'dinner', share: 0.3 }
  ],
  4: [
    { name: 'Café da Manhã', time: '08:00', type: 'breakfast', share: 0.25 },
    { name: 'Almoço Completo', time: '12:30', type: 'lunch', share: 0.35 },
    { name: 'Lanche da Tarde', time: '16:30', type: 'snack', share: 0.15 },
    { name: 'Jantar', time: '20:30', type: 'dinner', share: 0.25 }
  ],
  5: [
    { name: 'Café da Manhã', time: '08:00', type: 'breakfast', share: 0.22 },
    { name: 'Almoço Completo', time: '12:30', type: 'lunch', share: 0.32 },
    { name: 'Lanche da Tarde', time: '16:30', type: 'snack', share: 0.14 },
    { name: 'Jantar', time: '20:00', type: 'dinner', share: 0.22 },
    { name: 'Ceia', time: '22:30', type: 'bedtime', share: 0.1 }
  ],
  6: [
    { name: 'Café da Manhã', time: '07:30', type: 'breakfast', share: 0.2 },
    { name: 'Colação', time: '10:30', type: 'snack', share: 0.1 },
    { name: 'Almoço Completo', time: '13:00', type: 'lunch', share: 0.28 },
    { name: 'Lanche da Tarde', time: '16:30', type: 'snack', share: 0.13 },
    { name: 'Jantar', time: '20:00', type: 'dinner', share: 0.2 },
    { name: 'Ceia', time: '22:30', type: 'bedtime', share: 0.09 }
  ]
};

/** Candidatos por papel na refeição, em ordem de preferência dentro de cada faixa. */
interface FoodSlotCandidates {
  protein: string[];
  carb: string[];
  fat: string[];
  produce: string[];
}

const CANDIDATES: Record<BudgetTier, Record<'main' | 'light', FoodSlotCandidates>> = {
  economic: {
    main: {
      protein: ['peito_frango_grelhado', 'ovo_galinha_cozido', 'acem_bovino_moido_cozido', 'tofu_firme'],
      carb: ['arroz_branco_cozido', 'batata_doce_cozida', 'macarrao_espaguete_cozido'],
      fat: ['azeite_oliva_extra_virgem', 'manteiga_com_sal'],
      produce: ['brocolis_cozido', 'cenoura_cozida', 'couve_manteiga_refogada']
    },
    light: {
      protein: ['ovo_galinha_cozido', 'leite_vaca_desnatado', 'tofu_firme'],
      carb: ['aveia_flocos', 'pao_frances_unidade', 'banana_prata'],
      fat: ['pasta_de_amendoim_integral', 'manteiga_com_sal'],
      produce: ['banana_prata', 'maca_fuji_com_casca']
    }
  },
  standard: {
    main: {
      protein: ['patinho_bovino_grelhado_moido', 'peito_frango_grelhado', 'lombo_suino_assado', 'tofu_firme'],
      carb: ['arroz_integral_cozido', 'batata_doce_cozida', 'macarrao_integral_cozido'],
      fat: ['azeite_oliva_extra_virgem', 'manteiga_tradicional'],
      produce: ['brocolis_cozido', 'couve_flor_cozida', 'espinafre_cozido']
    },
    light: {
      protein: ['iogurte_natural_desnatado', 'whey_protein_concentrado', 'queijo_cottage'],
      carb: ['aveia_flocos', 'pao_forma_integral', 'banana_prata'],
      fat: ['pasta_de_amendoim_integral', 'amendoim_torrado_sem_pele'],
      produce: ['mamao_papaia', 'banana_prata']
    }
  },
  premium: {
    main: {
      protein: ['salmao_file_grelhado', 'file_mignon_bovino_grelhado', 'tilapia_file_grelhado', 'tofu_firme'],
      carb: ['arroz_integral_cozido', 'batata_doce_cozida', 'inhame_cozido'],
      fat: ['azeite_oliva_extra_virgem', 'abacate_manteiga'],
      produce: ['rucula_fresca', 'espinafre_cozido', 'brocolis_cozido']
    },
    light: {
      protein: ['iogurte_grego_natural_zero', 'whey_protein_isolado', 'bebida_lactea_proteica_yopro'],
      carb: ['aveia_flocos', 'tapioca_goma_preparada', 'banana_prata'],
      fat: ['castanha_para', 'castanha_de_caju_torrada', 'semente_chia'],
      produce: ['morango_fresco', 'kiwi_verde']
    }
  }
};

const FISH_IDS = new Set([
  'salmao_file_grelhado',
  'tilapia_file_grelhado',
  'atum_conserva_em_agua',
  'atum_conserva_em_oleo',
  'camarao_cozido'
]);

const MEAT_IDS = new Set([
  'peito_frango_grelhado',
  'sobrecoxa_frango_sem_pele_assada',
  'patinho_bovino_grelhado_moido',
  'alcatra_bovina_grelhada',
  'maminha_bovina_grelhada',
  'acem_bovino_moido_cozido',
  'file_mignon_bovino_grelhado',
  'file_mignon_suino_grelhado',
  'lombo_suino_assado',
  'figado_bovino_grelhado',
  'presunto_cozido_fatiado',
  'peito_peru_defumado_fatiado'
]);

const LACTOSE_IDS = new Set([
  'leite_vaca_desnatado',
  'leite_vaca_integral',
  'iogurte_natural_desnatado',
  'iogurte_grego_natural_zero',
  'bebida_lactea_proteica_yopro',
  'queijo_cottage',
  'queijo_ricota_fresca',
  'queijo_minas_frescal',
  'queijo_mussarela',
  'requeijao_cremoso_light',
  'manteiga_com_sal',
  'manteiga_tradicional',
  'whey_protein_concentrado',
  'whey_protein_isolado',
  'caseina_micellar'
]);

function isAllowed(foodId: string, restrictions?: DietRestrictions): boolean {
  if (!FOOD_DATABASE_MAP.has(foodId)) return false;
  if (!restrictions) return true;
  if (restrictions.vegetarian && (MEAT_IDS.has(foodId) || FISH_IDS.has(foodId))) return false;
  if (restrictions.noFish && FISH_IDS.has(foodId)) return false;
  if (restrictions.lactoseFree && LACTOSE_IDS.has(foodId)) return false;
  return true;
}

/** Escolhe o primeiro candidato permitido; cai para a base econômica se nada servir. */
function pickFood(candidates: string[], restrictions?: DietRestrictions): FoodItem | undefined {
  for (const id of candidates) {
    if (isAllowed(id, restrictions)) {
      return FOOD_DATABASE_MAP.get(id);
    }
  }
  // Último recurso: ovo (ou tofu, para vegetarianos que também evitam ovo não é o caso)
  const fallback = restrictions?.vegetarian ? 'tofu_firme' : 'ovo_galinha_cozido';
  return FOOD_DATABASE_MAP.get(fallback);
}

/** Gramas necessárias de um alimento para atingir X g de um macro, com limites sensatos. */
function gramsForMacro(
  food: FoodItem | undefined,
  macro: 'protein' | 'carbs' | 'fat',
  targetGrams: number,
  minGrams: number,
  maxGrams: number
): number {
  if (!food || targetGrams <= 0) return 0;

  const perGram =
    (macro === 'protein' ? food.proteinPer100g : macro === 'carbs' ? food.carbsPer100g : food.fatPer100g) / 100;

  if (perGram <= 0) return minGrams;

  const raw = targetGrams / perGram;
  // Arredonda para múltiplos de 5 g: é o que a balança de cozinha resolve.
  const rounded = Math.round(raw / 5) * 5;
  return Math.min(maxGrams, Math.max(minGrams, rounded));
}

/**
 * Ajusta a divisão dos macros conforme o foco do plano.
 * Antes estes parâmetros eram recebidos e descartados.
 */
function macroSplitForFocus(focus: DietFocus): { proteinShare: number; fatShare: number } {
  switch (focus) {
    case 'fat_loss':
      // Mais proteína por refeição preserva massa magra em déficit e aumenta a saciedade.
      return { proteinShare: 1.05, fatShare: 0.95 };
    case 'hypertrophy':
      // Prioriza carboidrato como substrato de treino, mantendo a gordura no piso.
      return { proteinShare: 0.95, fatShare: 0.9 };
    case 'recomposition':
    default:
      return { proteinShare: 1.0, fatShare: 1.0 };
  }
}

/**
 * Gera um plano de refeições balanceado de acordo com orçamento, foco e restrições.
 *
 * As gramaturas são calculadas para atingir as metas de macronutrientes de cada
 * refeição, em vez de usar porções fixas que ignoravam completamente o alvo.
 */
export function generateSmartMealPlan(options: DietOptimizerOptions): MealPlan[] {
  const {
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat,
    mealsPerDay,
    budgetTier,
    focus,
    restrictions
  } = options;

  const count = Math.max(2, Math.min(6, Math.round(mealsPerDay) || 4));
  const presets = MEAL_PRESETS[count];
  const { proteinShare, fatShare } = macroSplitForFocus(focus);
  const tierCandidates = CANDIDATES[budgetTier] || CANDIDATES.standard;

  const plans: MealPlan[] = [];

  presets.forEach((preset, index) => {
    const isMainMeal = preset.type === 'lunch' || preset.type === 'dinner';
    const slots = isMainMeal ? tierCandidates.main : tierCandidates.light;

    const mealCalories = Math.round(targetCalories * preset.share);
    const mealProtein = Math.round(targetProtein * preset.share * proteinShare);
    const mealCarbs = Math.round(targetCarbs * preset.share);
    const mealFat = Math.round(targetFat * preset.share * fatShare);

    const proteinFood = pickFood(slots.protein, restrictions);
    const carbFood = pickFood(slots.carb, restrictions);
    const fatFood = pickFood(slots.fat, restrictions);
    const produceFood = pickFood(slots.produce, restrictions);

    const portions: { foodId: string; grams: number; consumed: boolean }[] = [];

    if (proteinFood) {
      const grams = gramsForMacro(proteinFood, 'protein', mealProtein, 30, 350);
      portions.push({ foodId: proteinFood.id, grams, consumed: false });
    }

    if (carbFood) {
      // Desconta o carboidrato que já vem da fonte de proteína (leite, iogurte, feijão).
      const carbsFromProtein = proteinFood
        ? (proteinFood.carbsPer100g / 100) * (portions[0]?.grams || 0)
        : 0;
      const remainingCarbs = Math.max(0, mealCarbs - carbsFromProtein);
      const grams = gramsForMacro(carbFood, 'carbs', remainingCarbs, 20, 400);
      portions.push({ foodId: carbFood.id, grams, consumed: false });
    }

    if (fatFood) {
      const fatFromOthers = portions.reduce((acc, p) => {
        const food = FOOD_DATABASE_MAP.get(p.foodId);
        return acc + (food ? (food.fatPer100g / 100) * p.grams : 0);
      }, 0);
      const remainingFat = Math.max(0, mealFat - fatFromOthers);
      // Gorduras são densas: 5 g a 40 g é a faixa prática de uma refeição.
      const grams = gramsForMacro(fatFood, 'fat', remainingFat, 0, 40);
      if (grams > 0) {
        portions.push({ foodId: fatFood.id, grams, consumed: false });
      }
    }

    // Vegetal nas refeições principais, fruta nas leves: volume, fibra e micronutrientes.
    if (produceFood) {
      portions.push({ foodId: produceFood.id, grams: isMainMeal ? 80 : 70, consumed: false });
    }

    plans.push({
      name: preset.name,
      order: index + 1,
      timeLabel: preset.time,
      targetCalories: mealCalories,
      targetProtein: mealProtein,
      targetCarbs: mealCarbs,
      targetFat: mealFat,
      portions
    });
  });

  return plans;
}
