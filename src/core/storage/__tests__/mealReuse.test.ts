import './setup';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  db,
  switchUserDb,
  logFoodConsumption,
  getDatesWithFoodLog,
  copyMealFromDate,
  saveMealAsTemplate,
  listMealTemplates,
  applyMealTemplate,
  deleteMealTemplate
} from '../db';
import { MealPlan } from '../types';
import { todayLocal, toLocalDateString, addDays } from '../../utils/dateUtils';

/** Reutilização de refeições: copiar de um dia anterior e templates salvos. */

const daysAgo = (n: number) => toLocalDateString(addDays(new Date(), -n));

function refeicao(overrides: Partial<MealPlan> = {}): MealPlan {
  return {
    name: 'Almoço',
    order: 2,
    targetCalories: 700,
    targetProtein: 50,
    targetCarbs: 70,
    targetFat: 20,
    portions: [],
    ...overrides
  };
}

beforeEach(() => {
  switchUserDb(`reuse_${Math.random().toString(36).slice(2)}`);
});

describe('Dias disponíveis para copiar', () => {
  it('deve listar do mais recente para o mais antigo', async () => {
    await logFoodConsumption(daysAgo(1), 'Almoço', 2, 'arroz_branco_cozido', 150);
    await logFoodConsumption(daysAgo(3), 'Almoço', 2, 'arroz_branco_cozido', 150);

    const dias = await getDatesWithFoodLog();

    expect(dias.map((d) => d.date)).toEqual([daysAgo(1), daysAgo(3)]);
    expect(dias[0].calories).toBeGreaterThan(0);
  });

  it('não deve oferecer o dia corrente', async () => {
    await logFoodConsumption(todayLocal(), 'Almoço', 2, 'arroz_branco_cozido', 150);

    // Copiar de hoje para hoje não faz sentido.
    expect(await getDatesWithFoodLog()).toHaveLength(0);
  });
});

describe('Copiar refeição de outro dia', () => {
  it('deve trazer as porções daquela refeição', async () => {
    await logFoodConsumption(daysAgo(1), 'Almoço', 2, 'peito_frango_grelhado', 150);
    await logFoodConsumption(daysAgo(1), 'Almoço', 2, 'arroz_branco_cozido', 200);

    const mealId = (await db.mealPlans.add(refeicao())) as number;
    const copiados = await copyMealFromDate(daysAgo(1), 2, mealId);

    expect(copiados).toBe(2);

    const destino = await db.mealPlans.get(mealId);
    expect(destino?.portions).toHaveLength(2);
    expect(destino?.portions.find((p) => p.foodId === 'arroz_branco_cozido')?.grams).toBe(200);
  });

  it('deve copiar apenas a refeição pedida', async () => {
    await logFoodConsumption(daysAgo(1), 'Café da Manhã', 1, 'banana_prata', 70);
    await logFoodConsumption(daysAgo(1), 'Almoço', 2, 'arroz_branco_cozido', 150);

    const mealId = (await db.mealPlans.add(refeicao())) as number;
    await copyMealFromDate(daysAgo(1), 2, mealId);

    const destino = await db.mealPlans.get(mealId);
    expect(destino?.portions).toHaveLength(1);
    expect(destino?.portions[0].foodId).toBe('arroz_branco_cozido');
  });

  it('deve chegar sempre como não consumido', async () => {
    await logFoodConsumption(daysAgo(1), 'Almoço', 2, 'arroz_branco_cozido', 150);

    const mealId = (await db.mealPlans.add(refeicao())) as number;
    await copyMealFromDate(daysAgo(1), 2, mealId);

    // Copiar o cardápio não é o mesmo que já ter comido.
    const destino = await db.mealPlans.get(mealId);
    expect(destino?.portions.every((p) => !p.consumed)).toBe(true);
  });

  it('deve somar gramas em vez de duplicar alimento já presente', async () => {
    await logFoodConsumption(daysAgo(1), 'Almoço', 2, 'arroz_branco_cozido', 150);

    const mealId = (await db.mealPlans.add(
      refeicao({ portions: [{ foodId: 'arroz_branco_cozido', grams: 100, consumed: false }] })
    )) as number;

    await copyMealFromDate(daysAgo(1), 2, mealId);

    const destino = await db.mealPlans.get(mealId);
    expect(destino?.portions).toHaveLength(1);
    expect(destino?.portions[0].grams).toBe(250);
  });

  it('deve devolver zero quando a origem está vazia', async () => {
    const mealId = (await db.mealPlans.add(refeicao())) as number;
    expect(await copyMealFromDate(daysAgo(5), 2, mealId)).toBe(0);
  });
});

describe('Templates de refeição', () => {
  it('deve salvar e listar', async () => {
    await saveMealAsTemplate('Meu café da manhã', [
      { foodId: 'ovo_galinha_cozido', grams: 100, consumed: true },
      { foodId: 'aveia_flocos', grams: 40, consumed: false }
    ]);

    const templates = await listMealTemplates();

    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe('Meu café da manhã');
    // O template guarda o conteúdo, não o estado de um dia.
    expect(templates[0].portions.every((p) => !p.consumed)).toBe(true);
  });

  it('deve recusar nome vazio ou sem alimentos', async () => {
    await expect(saveMealAsTemplate('   ', [{ foodId: 'banana_prata', grams: 70, consumed: false }]))
      .rejects.toThrow();
    await expect(saveMealAsTemplate('Vazio', [])).rejects.toThrow();
  });

  it('deve aplicar o template na refeição', async () => {
    const templateId = await saveMealAsTemplate('Lanche', [
      { foodId: 'banana_prata', grams: 70, consumed: false },
      { foodId: 'aveia_flocos', grams: 30, consumed: false }
    ]);

    const mealId = (await db.mealPlans.add(refeicao())) as number;
    const aplicados = await applyMealTemplate(templateId, mealId);

    expect(aplicados).toBe(2);
    expect((await db.mealPlans.get(mealId))?.portions).toHaveLength(2);
  });

  it('deve contar quantas vezes foi usado e ordenar pelos mais usados', async () => {
    const raro = await saveMealAsTemplate('Raro', [
      { foodId: 'banana_prata', grams: 70, consumed: false }
    ]);
    const frequente = await saveMealAsTemplate('Frequente', [
      { foodId: 'aveia_flocos', grams: 40, consumed: false }
    ]);

    const mealId = (await db.mealPlans.add(refeicao())) as number;
    await applyMealTemplate(frequente, mealId);
    await applyMealTemplate(frequente, mealId);
    await applyMealTemplate(raro, mealId);

    const templates = await listMealTemplates();
    expect(templates[0].name).toBe('Frequente');
    expect(templates[0].timesUsed).toBe(2);
  });

  it('deve somar gramas ao aplicar sobre alimento já presente', async () => {
    const templateId = await saveMealAsTemplate('Aveia', [
      { foodId: 'aveia_flocos', grams: 40, consumed: false }
    ]);

    const mealId = (await db.mealPlans.add(
      refeicao({ portions: [{ foodId: 'aveia_flocos', grams: 20, consumed: false }] })
    )) as number;

    await applyMealTemplate(templateId, mealId);

    const destino = await db.mealPlans.get(mealId);
    expect(destino?.portions).toHaveLength(1);
    expect(destino?.portions[0].grams).toBe(60);
  });

  it('deve excluir template', async () => {
    const id = await saveMealAsTemplate('Temporário', [
      { foodId: 'banana_prata', grams: 70, consumed: false }
    ]);

    await deleteMealTemplate(id);
    expect(await listMealTemplates()).toHaveLength(0);
  });
});
