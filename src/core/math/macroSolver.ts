import { FoodItem, MealFoodPortion, MealPlan } from '../storage/types';

export interface CalculatedNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodiumMg: number;
}

/**
 * Calcula os nutrientes exatos de um alimento para uma dada quantidade em gramas.
 */
export function calculateFoodNutrients(food: FoodItem, grams: number): CalculatedNutrients {
  const factor = Math.max(0, grams) / 100;
  return {
    calories: Math.round(food.caloriesPer100g * factor),
    protein: Number((food.proteinPer100g * factor).toFixed(1)),
    carbs: Number((food.carbsPer100g * factor).toFixed(1)),
    fat: Number((food.fatPer100g * factor).toFixed(1)),
    fiber: Number((food.fiberPer100g * factor).toFixed(1)),
    sodiumMg: Math.round(food.sodiumMgPer100g * factor)
  };
}

/**
 * Calcula a soma dos nutrientes de uma lista de porções.
 */
export function calculatePortionsTotal(
  portions: MealFoodPortion[],
  foodMap: Map<string, FoodItem>
): CalculatedNutrients {
  return portions.reduce(
    (acc, portion) => {
      const food = foodMap.get(portion.foodId);
      if (!food) return acc;
      const nut = calculateFoodNutrients(food, portion.grams);
      return {
        calories: acc.calories + nut.calories,
        protein: Number((acc.protein + nut.protein).toFixed(1)),
        carbs: Number((acc.carbs + nut.carbs).toFixed(1)),
        fat: Number((acc.fat + nut.fat).toFixed(1)),
        fiber: Number((acc.fiber + nut.fiber).toFixed(1)),
        sodiumMg: acc.sodiumMg + nut.sodiumMg
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodiumMg: 0 }
  );
}

export interface MacroSwapResult {
  replacementGrams: number;
  primaryMacroMatched: 'protein' | 'carbs' | 'fat';
  originalNutrients: CalculatedNutrients;
  replacementNutrients: CalculatedNutrients;
  calorieDifference: number;
}

/**
 * Calcula a substituição equivalente (Macro-Swap) de um alimento por outro.
 * Encontra a gramatura necessária para igualar o macronutriente dominante do alimento original.
 */
export function calculateMacroSwap(
  originalFood: FoodItem,
  originalGrams: number,
  replacementFood: FoodItem
): MacroSwapResult {
  const originalNutrients = calculateFoodNutrients(originalFood, originalGrams);

  // Determina o macro predominante
  let primaryMacro: 'protein' | 'carbs' | 'fat' = 'carbs';
  if (originalFood.proteinPer100g * 4 > originalFood.carbsPer100g * 4 && originalFood.proteinPer100g * 4 > originalFood.fatPer100g * 9) {
    primaryMacro = 'protein';
  } else if (originalFood.fatPer100g * 9 > originalFood.proteinPer100g * 4 && originalFood.fatPer100g * 9 > originalFood.carbsPer100g * 4) {
    primaryMacro = 'fat';
  }

  let replacementGrams = 100;
  if (primaryMacro === 'protein') {
    const targetProtein = originalNutrients.protein;
    const proteinPerGram = replacementFood.proteinPer100g / 100;
    replacementGrams = proteinPerGram > 0 ? Math.round(targetProtein / proteinPerGram) : 100;
  } else if (primaryMacro === 'carbs') {
    const targetCarbs = originalNutrients.carbs;
    const carbsPerGram = replacementFood.carbsPer100g / 100;
    replacementGrams = carbsPerGram > 0 ? Math.round(targetCarbs / carbsPerGram) : 100;
  } else {
    const targetFat = originalNutrients.fat;
    const fatPerGram = replacementFood.fatPer100g / 100;
    replacementGrams = fatPerGram > 0 ? Math.round(targetFat / fatPerGram) : 100;
  }

  const replacementNutrients = calculateFoodNutrients(replacementFood, replacementGrams);
  const calorieDifference = replacementNutrients.calories - originalNutrients.calories;

  return {
    replacementGrams,
    primaryMacroMatched: primaryMacro,
    originalNutrients,
    replacementNutrients,
    calorieDifference
  };
}

export interface ShoppingItem {
  foodId: string;
  name: string;
  category: string;
  totalGrams: number;
  servingDescription: string;
  checked: boolean;
}

/**
 * Gera a lista de compras consolidada a partir dos planos de refeição da semana.
 */
export function generateWeeklyShoppingList(
  mealPlans: MealPlan[],
  foodMap: Map<string, FoodItem>,
  days: number = 7
): ShoppingItem[] {
  const totalsByFoodId = new Map<string, number>();

  for (const meal of mealPlans) {
    for (const portion of meal.portions) {
      const current = totalsByFoodId.get(portion.foodId) || 0;
      totalsByFoodId.set(portion.foodId, current + (portion.grams * days));
    }
  }

  const shoppingList: ShoppingItem[] = [];
  totalsByFoodId.forEach((totalGrams, foodId) => {
    const food = foodMap.get(foodId);
    if (!food) return;

    let servingDesc = `${Math.round(totalGrams)}g`;
    if (totalGrams >= 1000) {
      servingDesc = `${(totalGrams / 1000).toFixed(2)} kg`;
    }

    shoppingList.push({
      foodId,
      name: food.name,
      category: food.category,
      totalGrams: Math.round(totalGrams),
      servingDescription: servingDesc,
      checked: false
    });
  });

  // Ordena por categoria e depois alfabeticamente
  return shoppingList.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });
}

export interface HouseholdPortionDisplay {
  label: string;
  hasHousehold: boolean;
  unitName?: string;
  abbrevUnit?: string;
  units?: number;
  grams: number;
}

const UNIT_ABBREVIATIONS: Record<string, string> = {
  'unidade': 'un',
  'unidade(s)': 'un',
  'unidades': 'un',
  'fatia': 'fat',
  'fatia(s)': 'fat',
  'fatias': 'fat',
  'scoop': 'scp',
  'scoop(s)': 'scp',
  'scoops': 'scp',
  'colher(es) de sopa': 'cs',
  'colher de sopa': 'cs',
  'concha': 'cch',
  'concha(s)': 'cch',
  'copo': 'copo',
  'copo(s)': 'copo',
  'lata': 'lata',
  'lata(s)': 'lata',
  'taça': 'taça',
  'taça(s)': 'taça',
  'bola': 'bola',
  'bola(s)': 'bola',
  'gomo': 'gomo',
  'gomo(s)': 'gomo',
  'pote': 'pote',
  'pote(s)': 'pote',
  'clara': 'clara',
  'clara(s)': 'clara',
  'tablete': 'tab',
  'quadrado': 'quad'
};

/**
 * Converte gramas para medidas caseiras intuitivas do dia a dia com abreviação compacta.
 */
export function formatHouseholdPortion(food: FoodItem, grams: number): HouseholdPortionDisplay {
  if (food.servingUnit && food.servingGrams && food.servingGrams > 0) {
    const rawUnits = grams / food.servingGrams;
    const roundedUnits = Math.round(rawUnits * 10) / 10;
    const countStr = roundedUnits % 1 === 0 ? roundedUnits.toString() : roundedUnits.toFixed(1);
    
    const rawKey = food.servingUnit.toLowerCase().trim();
    const abbrev = UNIT_ABBREVIATIONS[rawKey] || rawKey.replace(/\(s\)/g, '');
    const baseUnit = food.servingUnit.replace(/\(s\)/g, '');

    return {
      label: `${countStr} ${abbrev} (${grams}g)`,
      hasHousehold: true,
      unitName: baseUnit,
      abbrevUnit: abbrev,
      units: roundedUnits,
      grams
    };
  }

  // Fallback se não tiver medida cadastrada
  return {
    label: `${grams}g`,
    hasHousehold: false,
    grams
  };
}


