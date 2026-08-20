import { FoodItem } from '../storage/types';

interface OFFNutriments {
  'energy-kcal_100g'?: number;
  'energy-kcal'?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  fiber_100g?: number;
  sodium_100g?: number;
  'salt_100g'?: number;
}

interface OFFProduct {
  code?: string;
  product_name?: string;
  product_name_pt?: string;
  generic_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: string | number;
  nutriments?: OFFNutriments;
  categories_tags?: string[];
}

interface OFFSearchResponse {
  count: number;
  products?: OFFProduct[];
}

/**
 * Extrai gramas numéricas e unidade de uma string como "1 fatia (30 g)" ou "2 colheres de sopa (20g)"
 */
function parseServingInfo(servingStr?: string, servingQty?: string | number): { servingUnit?: string; servingGrams?: number; servingName: string } {
  if (!servingStr && !servingQty) {
    return { servingName: 'Porção (100g)', servingGrams: 100 };
  }

  const raw = (servingStr || `${servingQty}g`).toLowerCase();
  
  // Tenta extrair gramas: ex: "(30 g)", "30g", "30 g"
  const gramsMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*(?:g|ml|gr)/);
  const parsedGrams = gramsMatch ? Math.round(parseFloat(gramsMatch[1].replace(',', '.'))) : (typeof servingQty === 'number' ? servingQty : 100);

  let servingUnit: string | undefined = undefined;

  if (raw.includes('fatia')) servingUnit = 'fatia(s)';
  // 'un' como substring solta casava em "punhado", "junta", "atum"...
  else if (/unidades?|unid|un/.test(raw)) servingUnit = 'unidade(s)';
  else if (raw.includes('scoop') || raw.includes('dosador')) servingUnit = 'scoop(s)';
  else if (raw.includes('colher')) servingUnit = 'colher(es) de sopa';
  else if (raw.includes('concha')) servingUnit = 'concha(s)';
  else if (raw.includes('copo')) servingUnit = 'copo(s)';
  else if (raw.includes('lata')) servingUnit = 'lata(s)';
  else if (raw.includes('quadrado') || raw.includes('tablete')) servingUnit = 'quadrado';
  else if (raw.includes('gomo')) servingUnit = 'gomo(s)';

  return {
    servingName: servingStr ? servingStr : `Porção (${parsedGrams}g)`,
    servingGrams: parsedGrams > 0 ? parsedGrams : 100,
    servingUnit
  };
}

/**
 * Infere a categoria do macro dominante do alimento
 */
function inferCategory(nutriments: OFFNutriments, categoryTags?: string[]): 'protein' | 'carb' | 'fat' | 'dairy' | 'supplement' | 'vegetable' | 'fruit' {
  const p = nutriments.proteins_100g || 0;
  const c = nutriments.carbohydrates_100g || 0;
  const f = nutriments.fat_100g || 0;

  const tags = (categoryTags || []).join(' ').toLowerCase();

  if (tags.includes('supplement') || tags.includes('whey') || tags.includes('proteina')) return 'supplement';
  if (tags.includes('dairy') || tags.includes('queijo') || tags.includes('leite') || tags.includes('iogurte')) return 'dairy';
  if (tags.includes('fruit') || tags.includes('fruta')) return 'fruit';
  if (tags.includes('vegetal') || tags.includes('legume') || tags.includes('hortali')) return 'vegetable';

  if (p >= 14 && p > c && p > f) return 'protein';
  if (f >= 25 && f * 9 > c * 4) return 'fat';
  return 'carb';
}

/** Normaliza um texto para uso como identificador estável. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

/**
 * Consulta a base nacional oficial do Open Food Facts Brasil
 */
export async function searchOpenFoodFacts(query: string): Promise<FoodItem[]> {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) return [];

  const url = `https://br.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
    cleanQuery
  )}&search_simple=1&action=process&json=1&page_size=20`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 segundos de timeout

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const data: OFFSearchResponse = await res.json();
    if (!data.products || !Array.isArray(data.products)) return [];

    const validItems: FoodItem[] = [];

    for (const prod of data.products) {
      const name = prod.product_name_pt || prod.product_name || prod.generic_name;
      if (!name) continue;

      const nut = prod.nutriments;
      if (!nut) continue;

      const calories = nut['energy-kcal_100g'] ?? nut['energy-kcal'] ?? 0;
      const protein = nut.proteins_100g ?? 0;
      const carbs = nut.carbohydrates_100g ?? 0;
      const fat = nut.fat_100g ?? 0;

      // Ignora itens totalmente sem informação nutricional
      if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) {
        continue;
      }

      const brandPrefix = prod.brands ? `${prod.brands.trim()} - ` : '';
      const fullName = `${brandPrefix}${name.trim()}`;
      const { servingName, servingGrams, servingUnit } = parseServingInfo(prod.serving_size, prod.serving_quantity);
      const category = inferCategory(nut, prod.categories_tags);

      validItems.push({
        // Id determinístico: `Math.random()` gerava um id novo a cada busca,
        // criando duplicatas do mesmo produto no banco de alimentos.
        id: `off_${prod.code || slugify(fullName)}`,
        name: fullName,
        category,
        servingName,
        baseGrams: 100,
        servingUnit,
        servingGrams,
        caloriesPer100g: Math.round(calories),
        proteinPer100g: Number(protein.toFixed(1)),
        carbsPer100g: Number(carbs.toFixed(1)),
        fatPer100g: Number(fat.toFixed(1)),
        fiberPer100g: Number((nut.fiber_100g || 0).toFixed(1)),
        sodiumMgPer100g: Math.round((nut.sodium_100g || (nut.salt_100g ? nut.salt_100g / 2.5 : 0)) * 1000),
        isCustom: false
      });
    }

    return validItems;
  } catch (error) {
    console.warn('Busca Open Food Facts indisponível ou offline:', error);
    return [];
  }
}
