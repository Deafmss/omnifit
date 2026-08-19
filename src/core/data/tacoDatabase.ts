import { FoodItem } from '../storage/types';

/**
 * Base oficial de alimentos baseada na Tabela TACO (UNICAMP - 4ª Edição) e TBCA (USP).
 * Valores nutricionais exatos por 100g de alimento preparado/in natura.
 */
export const TACO_FOOD_DATABASE: FoodItem[] = [
  // ================= PROTEÍNAS =================
  {
    id: 'peito_frango_grelhado',
    name: 'Peito de Frango Grelhado',
    category: 'protein',
    servingName: '1 filé médio (120g)',
    baseGrams: 100,
    caloriesPer100g: 159,
    proteinPer100g: 32.0,
    carbsPer100g: 0.0,
    fatPer100g: 2.5,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 50
  },
  {
    id: 'ovo_galinha_cozido',
    name: 'Ovo de Galinha Cozido',
    category: 'protein',
    servingName: '1 unidade grande (50g)',
    baseGrams: 100,
    caloriesPer100g: 146,
    proteinPer100g: 13.3,
    carbsPer100g: 0.6,
    fatPer100g: 9.5,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 146
  },
  {
    id: 'clara_ovo_cozida',
    name: 'Clara de Ovo Cozida',
    category: 'protein',
    servingName: '1 clara (35g)',
    baseGrams: 100,
    caloriesPer100g: 52,
    proteinPer100g: 11.2,
    carbsPer100g: 0.7,
    fatPer100g: 0.2,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 166
  },
  {
    id: 'patinho_bovino_grelhado',
    name: 'Patinho Bovino Grelhado',
    category: 'protein',
    servingName: '1 bife (120g)',
    baseGrams: 100,
    caloriesPer100g: 219,
    proteinPer100g: 35.9,
    carbsPer100g: 0.0,
    fatPer100g: 7.3,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 61
  },
  {
    id: 'tilapia_grelhada',
    name: 'Filé de Tilápia Grelhado',
    category: 'protein',
    servingName: '1 filé (120g)',
    baseGrams: 100,
    caloriesPer100g: 128,
    proteinPer100g: 26.0,
    carbsPer100g: 0.0,
    fatPer100g: 2.7,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 52
  },
  {
    id: 'carne_moida_patinho',
    name: 'Carne Moída (Patinho Refogado)',
    category: 'protein',
    servingName: '4 colheres de sopa (100g)',
    baseGrams: 100,
    caloriesPer100g: 215,
    proteinPer100g: 34.5,
    carbsPer100g: 0.0,
    fatPer100g: 7.5,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 65
  },
  {
    id: 'atum_conserva_agua',
    name: 'Atum Ralado em Água',
    category: 'protein',
    servingName: '1 lata drenada (120g)',
    baseGrams: 100,
    caloriesPer100g: 116,
    proteinPer100g: 26.2,
    carbsPer100g: 0.0,
    fatPer100g: 0.8,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 330
  },
  {
    id: 'whey_protein_concentrado',
    name: 'Whey Protein Concentrado 80%',
    category: 'supplement',
    servingName: '1 dosador (30g)',
    baseGrams: 100,
    caloriesPer100g: 400,
    proteinPer100g: 80.0,
    carbsPer100g: 6.0,
    fatPer100g: 5.0,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 150
  },

  // ================= CARBOIDRATOS =================
  {
    id: 'arroz_branco_cozido',
    name: 'Arroz Branco Cozido',
    category: 'carb',
    servingName: '1 colher de servir (50g)',
    baseGrams: 100,
    caloriesPer100g: 128,
    proteinPer100g: 2.5,
    carbsPer100g: 28.1,
    fatPer100g: 0.2,
    fiberPer100g: 1.6,
    sodiumMgPer100g: 1
  },
  {
    id: 'arroz_integral_cozido',
    name: 'Arroz Integral Cozido',
    category: 'carb',
    servingName: '1 colher de servir (50g)',
    baseGrams: 100,
    caloriesPer100g: 124,
    proteinPer100g: 2.6,
    carbsPer100g: 25.8,
    fatPer100g: 1.0,
    fiberPer100g: 2.7,
    sodiumMgPer100g: 1
  },
  {
    id: 'feijao_carioca_cozido',
    name: 'Feijão Carioca Cozido (com caldo)',
    category: 'carb',
    servingName: '1 concha média (100g)',
    baseGrams: 100,
    caloriesPer100g: 76,
    proteinPer100g: 4.8,
    carbsPer100g: 13.6,
    fatPer100g: 0.5,
    fiberPer100g: 8.5,
    sodiumMgPer100g: 2
  },
  {
    id: 'batata_doce_cozida',
    name: 'Batata Doce Cozida',
    category: 'carb',
    servingName: '1 pedaço médio (120g)',
    baseGrams: 100,
    caloriesPer100g: 77,
    proteinPer100g: 0.6,
    carbsPer100g: 18.4,
    fatPer100g: 0.1,
    fiberPer100g: 2.2,
    sodiumMgPer100g: 3
  },
  {
    id: 'batata_inglesa_cozida',
    name: 'Batata Inglesa Cozida',
    category: 'carb',
    servingName: '1 unidade média (140g)',
    baseGrams: 100,
    caloriesPer100g: 52,
    proteinPer100g: 1.2,
    carbsPer100g: 11.9,
    fatPer100g: 0.0,
    fiberPer100g: 1.3,
    sodiumMgPer100g: 2
  },
  {
    id: 'mandioca_cozida',
    name: 'Mandioca / Aipim Cozido',
    category: 'carb',
    servingName: '1 pedaço médio (100g)',
    baseGrams: 100,
    caloriesPer100g: 125,
    proteinPer100g: 0.6,
    carbsPer100g: 30.1,
    fatPer100g: 0.3,
    fiberPer100g: 1.6,
    sodiumMgPer100g: 2
  },
  {
    id: 'aveia_flocos',
    name: 'Aveia em Flocos',
    category: 'carb',
    servingName: '2 colheres de sopa (30g)',
    baseGrams: 100,
    caloriesPer100g: 394,
    proteinPer100g: 13.9,
    carbsPer100g: 66.6,
    fatPer100g: 8.5,
    fiberPer100g: 9.1,
    sodiumMgPer100g: 5
  },
  {
    id: 'pao_forma_integral',
    name: 'Pão de Forma 100% Integral',
    category: 'carb',
    servingName: '2 fatias (50g)',
    baseGrams: 100,
    caloriesPer100g: 246,
    proteinPer100g: 11.2,
    carbsPer100g: 44.5,
    fatPer100g: 2.8,
    fiberPer100g: 6.9,
    sodiumMgPer100g: 380
  },
  {
    id: 'macarrao_cozido',
    name: 'Macarrão de Sêmola Cozido',
    category: 'carb',
    servingName: '1 prato raso (150g)',
    baseGrams: 100,
    caloriesPer100g: 141,
    proteinPer100g: 4.8,
    carbsPer100g: 29.5,
    fatPer100g: 0.6,
    fiberPer100g: 1.4,
    sodiumMgPer100g: 1
  },
  {
    id: 'tapioca_goma',
    name: 'Goma de Tapioca Hidratada',
    category: 'carb',
    servingName: '3 colheres de sopa (50g)',
    baseGrams: 100,
    caloriesPer100g: 240,
    proteinPer100g: 0.0,
    carbsPer100g: 60.0,
    fatPer100g: 0.0,
    fiberPer100g: 0.5,
    sodiumMgPer100g: 2
  },

  // ================= GORDURAS BOAS =================
  {
    id: 'azeite_oliva_extra_virgem',
    name: 'Azeite de Oliva Extra Virgem',
    category: 'fat',
    servingName: '1 colher de sopa (13ml)',
    baseGrams: 100,
    caloriesPer100g: 884,
    proteinPer100g: 0.0,
    carbsPer100g: 0.0,
    fatPer100g: 100.0,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 0
  },
  {
    id: 'pasta_amendoim_integral',
    name: 'Pasta de Amendoim Integral',
    category: 'fat',
    servingName: '1 colher de sopa (15g)',
    baseGrams: 100,
    caloriesPer100g: 588,
    proteinPer100g: 25.0,
    carbsPer100g: 20.0,
    fatPer100g: 50.0,
    fiberPer100g: 8.0,
    sodiumMgPer100g: 15
  },
  {
    id: 'abacate',
    name: 'Abacate Fresco',
    category: 'fat',
    servingName: '2 colheres de sopa (50g)',
    baseGrams: 100,
    caloriesPer100g: 96,
    proteinPer100g: 1.2,
    carbsPer100g: 6.0,
    fatPer100g: 8.4,
    fiberPer100g: 6.3,
    sodiumMgPer100g: 2
  },
  {
    id: 'castanha_para',
    name: 'Castanha-do-Pará / Brasil',
    category: 'fat',
    servingName: '2 unidades (10g)',
    baseGrams: 100,
    caloriesPer100g: 643,
    proteinPer100g: 14.5,
    carbsPer100g: 15.1,
    fatPer100g: 63.5,
    fiberPer100g: 7.9,
    sodiumMgPer100g: 2
  },

  // ================= FRUTAS =================
  {
    id: 'banana_prata',
    name: 'Banana Prata',
    category: 'fruit',
    servingName: '1 unidade média (70g)',
    baseGrams: 100,
    caloriesPer100g: 98,
    proteinPer100g: 1.3,
    carbsPer100g: 26.0,
    fatPer100g: 0.1,
    fiberPer100g: 2.0,
    sodiumMgPer100g: 1
  },
  {
    id: 'maca_fuji',
    name: 'Maçã Fuji com Casca',
    category: 'fruit',
    servingName: '1 unidade média (130g)',
    baseGrams: 100,
    caloriesPer100g: 56,
    proteinPer100g: 0.3,
    carbsPer100g: 15.2,
    fatPer100g: 0.2,
    fiberPer100g: 1.3,
    sodiumMgPer100g: 1
  },
  {
    id: 'morango_fresco',
    name: 'Morango Fresco',
    category: 'fruit',
    servingName: '1 xícara (150g)',
    baseGrams: 100,
    caloriesPer100g: 30,
    proteinPer100g: 0.9,
    carbsPer100g: 6.8,
    fatPer100g: 0.3,
    fiberPer100g: 1.7,
    sodiumMgPer100g: 1
  },
  {
    id: 'mamao_papaia',
    name: 'Mamão Papaia',
    category: 'fruit',
    servingName: '1/2 unidade (140g)',
    baseGrams: 100,
    caloriesPer100g: 40,
    proteinPer100g: 0.5,
    carbsPer100g: 10.4,
    fatPer100g: 0.1,
    fiberPer100g: 1.0,
    sodiumMgPer100g: 2
  },

  // ================= VEGETAIS & LATICÍNIOS =================
  {
    id: 'brocolis_cozido',
    name: 'Brócolis Cozido',
    category: 'vegetable',
    servingName: '1 prato de sobremesa (80g)',
    baseGrams: 100,
    caloriesPer100g: 25,
    proteinPer100g: 2.1,
    carbsPer100g: 4.4,
    fatPer100g: 0.5,
    fiberPer100g: 3.4,
    sodiumMgPer100g: 12
  },
  {
    id: 'alface_crespa',
    name: 'Alface Crespa',
    category: 'vegetable',
    servingName: '5 folhas (50g)',
    baseGrams: 100,
    caloriesPer100g: 11,
    proteinPer100g: 1.3,
    carbsPer100g: 1.7,
    fatPer100g: 0.2,
    fiberPer100g: 1.8,
    sodiumMgPer100g: 4
  },
  {
    id: 'iogurte_natural_desnatado',
    name: 'Iogurte Natural Desnatado',
    category: 'dairy',
    servingName: '1 pote (160g)',
    baseGrams: 100,
    caloriesPer100g: 43,
    proteinPer100g: 4.1,
    carbsPer100g: 6.2,
    fatPer100g: 0.3,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 60
  },
  {
    id: 'queijo_cottage',
    name: 'Queijo Cottage Light',
    category: 'dairy',
    servingName: '2 colheres de sopa (50g)',
    baseGrams: 100,
    caloriesPer100g: 98,
    proteinPer100g: 12.5,
    carbsPer100g: 3.4,
    fatPer100g: 4.3,
    fiberPer100g: 0.0,
    sodiumMgPer100g: 364
  }
];

export const FOOD_DATABASE_MAP = new Map<string, FoodItem>(
  TACO_FOOD_DATABASE.map(food => [food.id, food])
);
