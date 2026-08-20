import { describe, it, expect } from 'vitest';
import { TACO_FOOD_DATABASE, FOOD_DATABASE_MAP } from '../tacoDatabase';
import { EXERCISE_DATABASE_MAP, EXERCISE_DATABASE } from '../exerciseDatabase';
import { WORKOUT_TEMPLATES, buildRoutines, deriveTargetMuscles, SplitTemplateType } from '../workoutTemplates';
import { FOOD_BUDGET_TIERS, generateSmartMealPlan, BudgetTier, DietFocus } from '../../math/dietOptimizer';
import { calculatePortionsTotal } from '../../math/macroSolver';

/**
 * Estes testes cruzam CÓDIGO com DADOS REAIS.
 *
 * A suíte anterior usava fixtures fabricadas (`id: 'arroz_branco'`), então
 * passava verde enquanto o montador de cardápio referenciava 5 alimentos
 * inexistentes e 26 das 49 faixas de preço apontavam para IDs que não existem.
 */

const TEMPLATE_KEYS: SplitTemplateType[] = ['ppl', 'upper_lower', 'abcde', 'abc_classic', 'fullbody', 'blank'];
const TIERS: BudgetTier[] = ['economic', 'standard', 'premium'];
const FOCUSES: DietFocus[] = ['fat_loss', 'hypertrophy', 'recomposition'];

describe('Integridade da base de alimentos', () => {
  it('não deve ter IDs duplicados', () => {
    const ids = TACO_FOOD_DATABASE.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('deve ter macros e calorias coerentes entre si', () => {
    // Álcool fornece 7 kcal/g e não aparece nos macros, então bebidas
    // alcoólicas divergem por construção.
    const alcoholic = new Set(['cerveja_pilsen_tradicional', 'vinho_tinto_seco_taca']);
    const divergent: string[] = [];

    for (const food of TACO_FOOD_DATABASE) {
      if (alcoholic.has(food.id) || food.caloriesPer100g <= 20) continue;

      const fromMacros = food.proteinPer100g * 4 + food.carbsPer100g * 4 + food.fatPer100g * 9;
      const absoluteError = Math.abs(fromMacros - food.caloriesPer100g);
      const relativeError = absoluteError / food.caloriesPer100g;

      // Exige os dois critérios: em vegetais fibrosos de baixa caloria, a fibra
      // não metabolizável cria um desvio relativo grande a partir de poucas kcal,
      // o que é esperado e não indica erro de digitação.
      if (relativeError > 0.2 && absoluteError > 15) {
        divergent.push(`${food.id}: tabela=${food.caloriesPer100g} macros=${Math.round(fromMacros)}`);
      }
    }

    expect(divergent).toEqual([]);
  });

  it('todo alimento deve ter gramatura de porção positiva quando declarada', () => {
    for (const food of TACO_FOOD_DATABASE) {
      if (food.servingGrams !== undefined) {
        expect(food.servingGrams, food.id).toBeGreaterThan(0);
      }
      expect(food.baseGrams, food.id).toBeGreaterThan(0);
    }
  });
});

describe('Integridade referencial das faixas de preço', () => {
  it('toda chave de FOOD_BUDGET_TIERS deve existir na base TACO', () => {
    const orphans = Object.keys(FOOD_BUDGET_TIERS).filter((id) => !FOOD_DATABASE_MAP.has(id));
    expect(orphans).toEqual([]);
  });
});

describe('Integridade do montador automático de cardápio', () => {
  it('todo alimento sugerido deve existir na base, em qualquer combinação', () => {
    const orphans = new Set<string>();

    for (const tier of TIERS) {
      for (const focus of FOCUSES) {
        for (let meals = 2; meals <= 6; meals++) {
          const plans = generateSmartMealPlan({
            targetCalories: 2400,
            targetProtein: 180,
            targetCarbs: 240,
            targetFat: 70,
            mealsPerDay: meals,
            budgetTier: tier,
            focus
          });

          for (const plan of plans) {
            for (const portion of plan.portions) {
              if (!FOOD_DATABASE_MAP.has(portion.foodId)) {
                orphans.add(`${tier}/${focus}/${meals}: ${portion.foodId}`);
              }
            }
          }
        }
      }
    }

    expect(Array.from(orphans)).toEqual([]);
  });

  it('deve gerar exatamente o número de refeições pedido, entre 2 e 6', () => {
    for (let meals = 2; meals <= 6; meals++) {
      const plans = generateSmartMealPlan({
        targetCalories: 2000,
        targetProtein: 150,
        targetCarbs: 200,
        targetFat: 60,
        mealsPerDay: meals,
        budgetTier: 'standard',
        focus: 'recomposition'
      });
      expect(plans).toHaveLength(meals);
    }
  });

  it('deve manter as refeições em ordem cronológica crescente', () => {
    for (let meals = 2; meals <= 6; meals++) {
      const plans = generateSmartMealPlan({
        targetCalories: 2000,
        targetProtein: 150,
        targetCarbs: 200,
        targetFat: 60,
        mealsPerDay: meals,
        budgetTier: 'standard',
        focus: 'recomposition'
      });

      const minutes = plans.map((p) => {
        const [h, m] = (p.timeLabel || '00:00').split(':').map(Number);
        return h * 60 + m;
      });

      for (let i = 1; i < minutes.length; i++) {
        expect(minutes[i], `refeição ${i + 1} de ${meals} está fora de ordem`).toBeGreaterThan(minutes[i - 1]);
      }
    }
  });

  it('a soma das metas por refeição deve fechar com a meta diária (±2%)', () => {
    for (let meals = 2; meals <= 6; meals++) {
      const plans = generateSmartMealPlan({
        targetCalories: 2400,
        targetProtein: 180,
        targetCarbs: 240,
        targetFat: 70,
        mealsPerDay: meals,
        budgetTier: 'standard',
        focus: 'recomposition'
      });

      const sum = plans.reduce((acc, p) => acc + p.targetCalories, 0);
      expect(Math.abs(sum - 2400) / 2400, `${meals} refeições`).toBeLessThan(0.02);
    }
  });

  it('deve entregar as calorias planejadas com desvio aceitável (±15%)', () => {
    const plans = generateSmartMealPlan({
      targetCalories: 2400,
      targetProtein: 180,
      targetCarbs: 240,
      targetFat: 70,
      mealsPerDay: 4,
      budgetTier: 'standard',
      focus: 'recomposition'
    });

    const totals = plans.reduce(
      (acc, plan) => {
        const t = calculatePortionsTotal(plan.portions, FOOD_DATABASE_MAP);
        return {
          calories: acc.calories + t.calories,
          protein: acc.protein + t.protein
        };
      },
      { calories: 0, protein: 0 }
    );

    // O plano precisa ser nutricionalmente próximo do alvo — antes as porções
    // eram fixas e ignoravam completamente a meta calculada.
    expect(Math.abs(totals.calories - 2400) / 2400).toBeLessThan(0.15);
    expect(totals.protein).toBeGreaterThan(180 * 0.8);
  });

  it('deve respeitar restrições alimentares', () => {
    const vegetarian = generateSmartMealPlan({
      targetCalories: 2200,
      targetProtein: 160,
      targetCarbs: 220,
      targetFat: 65,
      mealsPerDay: 4,
      budgetTier: 'standard',
      focus: 'recomposition',
      restrictions: { vegetarian: true }
    });

    const meatIds = [
      'peito_frango_grelhado',
      'patinho_bovino_grelhado_moido',
      'salmao_file_grelhado',
      'tilapia_file_grelhado',
      'lombo_suino_assado'
    ];

    const usedIds = vegetarian.flatMap((p) => p.portions.map((portion) => portion.foodId));
    for (const meat of meatIds) {
      expect(usedIds).not.toContain(meat);
    }
  });
});

describe('Integridade das divisões de treino', () => {
  it('não deve ter IDs de exercício duplicados na base', () => {
    const ids = EXERCISE_DATABASE.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todo exercício de todo template deve existir na base', () => {
    const orphans: string[] = [];

    for (const key of TEMPLATE_KEYS) {
      for (const routine of WORKOUT_TEMPLATES[key]) {
        for (const item of routine.exercises) {
          if (!EXERCISE_DATABASE_MAP.has(item.exerciseId)) {
            orphans.push(`${key}/${routine.name}: ${item.exerciseId}`);
          }
        }
      }
    }

    expect(orphans).toEqual([]);
  });

  it('os grupos musculares anunciados devem ser realmente treinados pela ficha', () => {
    const inconsistent: string[] = [];

    for (const key of TEMPLATE_KEYS) {
      for (const routine of buildRoutines(key)) {
        const derived = new Set(deriveTargetMuscles(routine.exercises));
        for (const muscle of routine.targetMuscles) {
          if (!derived.has(muscle)) {
            inconsistent.push(`${key}/${routine.name}: anuncia ${muscle}`);
          }
        }
      }
    }

    expect(inconsistent).toEqual([]);
  });

  it('deve distribuir dias da semana válidos e sem colisão', () => {
    for (const key of TEMPLATE_KEYS) {
      const routines = buildRoutines(key);
      const days = routines.map((r) => r.dayOfWeek);

      for (const day of days) {
        expect(day, `${key}: dia inválido`).toBeGreaterThanOrEqual(0);
        expect(day, `${key}: dia inválido`).toBeLessThanOrEqual(6);
      }

      expect(new Set(days).size, `${key}: dias duplicados`).toBe(days.length);
    }
  });

  it('deve ter faixas de repetições e séries coerentes', () => {
    for (const key of TEMPLATE_KEYS) {
      for (const routine of WORKOUT_TEMPLATES[key]) {
        for (const item of routine.exercises) {
          expect(item.minReps, `${item.exerciseId}`).toBeGreaterThan(0);
          expect(item.maxReps, `${item.exerciseId}`).toBeGreaterThanOrEqual(item.minReps);
          expect(item.targetSets, `${item.exerciseId}`).toBeGreaterThan(0);
          expect(item.restSeconds, `${item.exerciseId}`).toBeGreaterThan(0);
        }
      }
    }
  });
});
