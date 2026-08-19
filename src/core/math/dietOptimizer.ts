import { MealPlan } from '../storage/types';

export type BudgetTier = 'economic' | 'standard' | 'premium';
export type DietFocus = 'fat_loss' | 'hypertrophy' | 'recomposition';

export interface DietOptimizerOptions {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  mealsPerDay: number;
  budgetTier: BudgetTier;
  focus: DietFocus;
  restrictions?: {
    lactoseFree?: boolean;
    noFish?: boolean;
    vegetarian?: boolean;
  };
  preferredProteins?: string[];
  preferredCarbs?: string[];
}

// Classificação dos alimentos por faixa de custo no mercado brasileiro
export const FOOD_BUDGET_TIERS: Record<string, BudgetTier> = {
  // Econômicos (Excelente Custo-Benefício)
  ovo_galinha_cozido: 'economic',
  ovo_frito_azeite: 'economic',
  peito_frango_grelhado: 'economic',
  coxa_sobrecoxa_frango: 'economic',
  sardinha_oleo_drenada: 'economic',
  arroz_branco_cozido: 'economic',
  arroz_integral_cozido: 'economic',
  feijao_carioca_cozido: 'economic',
  feijao_preto_cozido: 'economic',
  aveia_flocos_crua: 'economic',
  banana_prata: 'economic',
  banana_nanica: 'economic',
  batata_doce_cozida: 'economic',
  batata_inglesa_cozida: 'economic',
  pao_frances: 'economic',
  pao_forma_tradicional: 'economic',
  pao_forma_integral: 'economic',
  pasta_amendoim_integral: 'economic',
  leite_vaca_desnatado: 'economic',
  leite_vaca_integral: 'economic',
  margarina: 'economic',
  manteiga: 'economic',
  laranja_pera: 'economic',
  maca_fuji: 'economic',
  brocolis_cozido: 'economic',
  cenoura_crua: 'economic',

  // Padrão / Médio
  patinho_bovino_grelhado: 'standard',
  alcatra_grelhada: 'standard',
  carne_moida_patinho: 'standard',
  atum_solido_oleo: 'standard',
  queijo_minas_frescal: 'standard',
  queijo_mussarela: 'standard',
  queijo_prato: 'standard',
  whey_protein_concentrado: 'standard',
  azeite_oliva_extra_virgem: 'standard',
  mandioca_cozida: 'standard',
  morango_fresco: 'standard',
  abacate: 'standard',
  iogurte_natural_desnatado: 'standard',
  presunto_cozido: 'standard',

  // Premium / Mais Caros
  salmao_grelhado: 'premium',
  file_mignon_grelhado: 'premium',
  tilapia_grelhada: 'premium',
  castanha_caju_torrada: 'premium',
  castanha_para: 'premium',
  nozes: 'premium',
  queijo_parmesao: 'premium',
  whey_protein_isolado: 'premium',
  peito_peru_defumado: 'premium'
};

/**
 * Gera um plano de refeições inteligente e balanceado de acordo com o orçamento e metas.
 */
export function generateSmartMealPlan(options: DietOptimizerOptions): MealPlan[] {
  const {
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat,
    mealsPerDay,
    budgetTier
  } = options;

  const count = Math.max(2, Math.min(6, mealsPerDay));
  const calPerMeal = Math.round(targetCalories / count);
  const protPerMeal = Math.round(targetProtein / count);
  const carbPerMeal = Math.round(targetCarbs / count);
  const fatPerMeal = Math.round(targetFat / count);

  const mealPresetsMap: Record<number, { name: string; time: string; type: 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'bedtime' }[]> = {
    2: [
      { name: 'Almoço Principal', time: '12:30', type: 'lunch' },
      { name: 'Jantar Principal', time: '20:00', type: 'dinner' }
    ],
    3: [
      { name: 'Café da Manhã', time: '08:00', type: 'breakfast' },
      { name: 'Almoço Completo', time: '12:30', type: 'lunch' },
      { name: 'Jantar', time: '20:00', type: 'dinner' }
    ],
    4: [
      { name: 'Café da Manhã', time: '08:00', type: 'breakfast' },
      { name: 'Almoço Completo', time: '12:30', type: 'lunch' },
      { name: 'Lanche da Tarde', time: '16:30', type: 'snack' },
      { name: 'Jantar', time: '20:30', type: 'dinner' }
    ],
    5: [
      { name: 'Café da Manhã', time: '08:00', type: 'breakfast' },
      { name: 'Almoço Completo', time: '12:30', type: 'lunch' },
      { name: 'Lanche da Tarde', time: '16:30', type: 'snack' },
      { name: 'Jantar', time: '20:00', type: 'dinner' },
      { name: 'Ceia', time: '22:30', type: 'bedtime' }
    ],
    6: [
      { name: 'Café da Manhã', time: '07:30', type: 'breakfast' },
      { name: 'Colação', time: '10:30', type: 'snack' },
      { name: 'Almoço Completo', time: '13:00', type: 'lunch' },
      { name: 'Lanche da Tarde', time: '16:30', type: 'snack' },
      { name: 'Jantar', time: '20:00', type: 'dinner' },
      { name: 'Ceia', time: '22:30', type: 'bedtime' }
    ]
  };

  const presets = mealPresetsMap[count] || mealPresetsMap[4];
  const plans: MealPlan[] = [];

  for (let i = 0; i < presets.length; i++) {
    const p = presets[i];
    let portions: { foodId: string; grams: number; consumed: boolean }[] = [];

    if (p.type === 'breakfast') {
      if (budgetTier === 'economic') {
        portions = [
          { foodId: 'ovo_galinha_cozido', grams: 100, consumed: false }, // 2 ovos
          { foodId: 'pao_frances', grams: 50, consumed: false }, // 1 pão
          { foodId: 'banana_prata', grams: 70, consumed: false }, // 1 banana
          { foodId: 'manteiga', grams: 8, consumed: false }
        ];
      } else {
        portions = [
          { foodId: 'ovo_galinha_cozido', grams: 100, consumed: false },
          { foodId: 'pao_forma_integral', grams: 50, consumed: false },
          { foodId: 'queijo_minas_frescal', grams: 30, consumed: false },
          { foodId: 'banana_prata', grams: 70, consumed: false }
        ];
      }
    } else if (p.type === 'lunch' || p.type === 'dinner') {
      if (budgetTier === 'economic') {
        portions = [
          { foodId: 'peito_frango_grelhado', grams: 130, consumed: false },
          { foodId: 'arroz_branco_cozido', grams: 150, consumed: false },
          { foodId: 'feijao_carioca_cozido', grams: 100, consumed: false },
          { foodId: 'azeite_oliva_extra_virgem', grams: 6, consumed: false },
          { foodId: 'brocolis_cozido', grams: 80, consumed: false }
        ];
      } else {
        const proteinFood = p.type === 'lunch' ? 'patinho_bovino_grelhado' : 'peito_frango_grelhado';
        portions = [
          { foodId: proteinFood, grams: 130, consumed: false },
          { foodId: 'arroz_branco_cozido', grams: 150, consumed: false },
          { foodId: 'feijao_carioca_cozido', grams: 100, consumed: false },
          { foodId: 'azeite_oliva_extra_virgem', grams: 8, consumed: false },
          { foodId: 'brocolis_cozido', grams: 80, consumed: false }
        ];
      }
    } else if (p.type === 'snack') {
      if (budgetTier === 'economic') {
        portions = [
          { foodId: 'banana_prata', grams: 70, consumed: false },
          { foodId: 'aveia_flocos_crua', grams: 40, consumed: false },
          { foodId: 'pasta_amendoim_integral', grams: 20, consumed: false }
        ];
      } else {
        portions = [
          { foodId: 'whey_protein_concentrado', grams: 30, consumed: false },
          { foodId: 'banana_prata', grams: 70, consumed: false },
          { foodId: 'aveia_flocos_crua', grams: 40, consumed: false }
        ];
      }
    } else {
      // Bedtime / Ceia
      if (budgetTier === 'economic') {
        portions = [
          { foodId: 'ovo_galinha_cozido', grams: 100, consumed: false },
          { foodId: 'pasta_amendoim_integral', grams: 15, consumed: false }
        ];
      } else {
        portions = [
          { foodId: 'iogurte_natural_desnatado', grams: 170, consumed: false },
          { foodId: 'pasta_amendoim_integral', grams: 15, consumed: false }
        ];
      }
    }

    plans.push({
      name: p.name,
      order: i + 1,
      timeLabel: p.time,
      targetCalories: calPerMeal,
      targetProtein: protPerMeal,
      targetCarbs: carbPerMeal,
      targetFat: fatPerMeal,
      portions
    });
  }

  return plans;
}
