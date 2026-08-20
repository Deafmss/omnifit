import './setup';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  db,
  switchUserDb,
  logFoodConsumption,
  unlogFoodConsumption,
  clearFoodLogForDate,
  getFoodLogForDate,
  getIntakeSummaryForDate,
  getIntakeHistory,
  calculateDietAdherence,
  ensureDailyRollover,
  getMeta
} from '../db';
import { MealPlan } from '../types';
import { todayLocal, toLocalDateString, addDays } from '../../utils/dateUtils';

/**
 * Diário alimentar: a falha mais séria do app era não existir registro do que
 * foi comido. O campo `consumed` vivia dentro do plano de refeição, sem data e
 * sem reset — no dia seguinte o app afirmava que o usuário já havia comido tudo.
 */

const daysAgo = (n: number) => toLocalDateString(addDays(new Date(), -n));

const freshContainer = () => switchUserDb(`diary_${Math.random().toString(36).slice(2)}`);

function meal(overrides: Partial<MealPlan> = {}): MealPlan {
  return {
    name: 'Almoço',
    order: 1,
    targetCalories: 700,
    targetProtein: 50,
    targetCarbs: 70,
    targetFat: 20,
    portions: [{ foodId: 'peito_frango_grelhado', grams: 150, consumed: false }],
    ...overrides
  };
}

describe('Registro de consumo no diário', () => {
  beforeEach(freshContainer);

  it('deve registrar uma porção consumida com data e snapshot nutricional', async () => {
    await logFoodConsumption(todayLocal(), 'Almoço', 1, 'peito_frango_grelhado', 150);

    const logs = await getFoodLogForDate(todayLocal());
    expect(logs).toHaveLength(1);
    expect(logs[0].foodId).toBe('peito_frango_grelhado');
    expect(logs[0].grams).toBe(150);
    expect(logs[0].mealName).toBe('Almoço');
    // O snapshot precisa ter valores reais, não zeros.
    expect(logs[0].calories).toBeGreaterThan(0);
    expect(logs[0].protein).toBeGreaterThan(0);
    expect(logs[0].foodName).toBeTruthy();
  });

  it('deve ser idempotente: marcar duas vezes não duplica', async () => {
    await logFoodConsumption(todayLocal(), 'Almoço', 1, 'arroz_branco_cozido', 150);
    await logFoodConsumption(todayLocal(), 'Almoço', 1, 'arroz_branco_cozido', 150);

    expect(await getFoodLogForDate(todayLocal())).toHaveLength(1);
  });

  it('deve atualizar a gramatura quando a porção muda', async () => {
    await logFoodConsumption(todayLocal(), 'Almoço', 1, 'arroz_branco_cozido', 100);
    await logFoodConsumption(todayLocal(), 'Almoço', 1, 'arroz_branco_cozido', 200);

    const logs = await getFoodLogForDate(todayLocal());
    expect(logs).toHaveLength(1);
    expect(logs[0].grams).toBe(200);
  });

  it('deve tratar o mesmo alimento em refeições diferentes como registros separados', async () => {
    await logFoodConsumption(todayLocal(), 'Café da Manhã', 1, 'banana_prata', 70);
    await logFoodConsumption(todayLocal(), 'Lanche da Tarde', 3, 'banana_prata', 70);

    const logs = await getFoodLogForDate(todayLocal());
    expect(logs).toHaveLength(2);
  });

  it('deve remover o registro ao desmarcar', async () => {
    await logFoodConsumption(todayLocal(), 'Almoço', 1, 'arroz_branco_cozido', 150);
    await unlogFoodConsumption(todayLocal(), 1, 'arroz_branco_cozido');

    expect(await getFoodLogForDate(todayLocal())).toHaveLength(0);
  });

  it('não deve registrar alimento inexistente', async () => {
    await logFoodConsumption(todayLocal(), 'Almoço', 1, 'alimento_que_nao_existe', 100);
    expect(await getFoodLogForDate(todayLocal())).toHaveLength(0);
  });

  it('deve isolar o diário por data', async () => {
    await logFoodConsumption(daysAgo(1), 'Almoço', 1, 'arroz_branco_cozido', 150);
    await logFoodConsumption(todayLocal(), 'Almoço', 1, 'arroz_branco_cozido', 200);

    expect(await getFoodLogForDate(daysAgo(1))).toHaveLength(1);
    expect((await getFoodLogForDate(todayLocal()))[0].grams).toBe(200);
  });
});

describe('Consolidação nutricional do diário', () => {
  beforeEach(freshContainer);

  it('deve somar os macros de todos os itens do dia', async () => {
    await logFoodConsumption(todayLocal(), 'Almoço', 1, 'peito_frango_grelhado', 150);
    await logFoodConsumption(todayLocal(), 'Almoço', 1, 'arroz_branco_cozido', 200);

    const summary = await getIntakeSummaryForDate(todayLocal());
    const logs = await getFoodLogForDate(todayLocal());

    expect(summary.itemCount).toBe(2);
    expect(summary.calories).toBe(logs[0].calories + logs[1].calories);
    expect(summary.protein).toBeGreaterThan(0);
  });

  it('deve devolver zeros para um dia sem registro', async () => {
    const summary = await getIntakeSummaryForDate(todayLocal());
    expect(summary.calories).toBe(0);
    expect(summary.itemCount).toBe(0);
  });

  it('deve montar o histórico sem lacunas, do mais antigo ao mais recente', async () => {
    await logFoodConsumption(daysAgo(2), 'Almoço', 1, 'arroz_branco_cozido', 150);
    await logFoodConsumption(todayLocal(), 'Almoço', 1, 'arroz_branco_cozido', 150);

    const history = await getIntakeHistory(5);

    expect(history).toHaveLength(5);
    // Ordem cronológica crescente.
    expect(history[0].date < history[4].date).toBe(true);
    expect(history[4].date).toBe(todayLocal());
    // Dias sem registro aparecem zerados, não ausentes.
    expect(history.filter((d) => d.itemCount > 0)).toHaveLength(2);
    expect(history.filter((d) => d.itemCount === 0)).toHaveLength(3);
  });
});

describe('Aderência calculada do diário', () => {
  beforeEach(freshContainer);

  it('deve devolver zero quando não há nada registrado', async () => {
    const result = await calculateDietAdherence(2000, 14);
    expect(result.daysLogged).toBe(0);
    expect(result.adherencePercent).toBe(0);
  });

  it('deve dar aderência alta quando o consumo fica próximo da meta', async () => {
    // ~2000 kcal de arroz: 128 kcal/100g -> 1560g ≈ 1997 kcal
    await logFoodConsumption(todayLocal(), 'Almoço', 1, 'arroz_branco_cozido', 1560);

    const result = await calculateDietAdherence(2000, 14);
    expect(result.daysLogged).toBe(1);
    expect(result.adherencePercent).toBeGreaterThan(90);
  });

  it('deve penalizar desvio em qualquer direção', async () => {
    // Muito abaixo da meta.
    await logFoodConsumption(todayLocal(), 'Almoço', 1, 'arroz_branco_cozido', 200);

    const result = await calculateDietAdherence(2000, 14);
    expect(result.adherencePercent).toBeLessThan(30);
  });

  it('deve ignorar dias sem registro em vez de contá-los como zero', async () => {
    // Um único dia perfeito, com 13 dias em branco na janela.
    await logFoodConsumption(todayLocal(), 'Almoço', 1, 'arroz_branco_cozido', 1560);

    const result = await calculateDietAdherence(2000, 14);
    // Dia em branco significa "não anotou", não "não comeu": a média não pode
    // ser diluída por 13 zeros.
    expect(result.daysLogged).toBe(1);
    expect(result.adherencePercent).toBeGreaterThan(90);
  });
});

describe('Virada do dia', () => {
  beforeEach(freshContainer);

  it('deve zerar as marcações de consumo quando o dia muda', async () => {
    await db.mealPlans.add(
      meal({ portions: [{ foodId: 'peito_frango_grelhado', grams: 150, consumed: true }] })
    );

    // Simula que o último uso foi ontem.
    await db.appMeta.put({ key: 'lastActiveDate', value: daysAgo(1) });

    const houveVirada = await ensureDailyRollover();

    expect(houveVirada).toBe(true);
    const plans = await db.mealPlans.toArray();
    expect(plans[0].portions.every((p) => !p.consumed)).toBe(true);
  });

  it('não deve zerar nada quando ainda é o mesmo dia', async () => {
    await db.mealPlans.add(
      meal({ portions: [{ foodId: 'peito_frango_grelhado', grams: 150, consumed: true }] })
    );
    await db.appMeta.put({ key: 'lastActiveDate', value: todayLocal() });

    const houveVirada = await ensureDailyRollover();

    expect(houveVirada).toBe(false);
    const plans = await db.mealPlans.toArray();
    expect(plans[0].portions[0].consumed).toBe(true);
  });

  it('deve preservar o histórico do diário ao virar o dia', async () => {
    await logFoodConsumption(daysAgo(1), 'Almoço', 1, 'arroz_branco_cozido', 150);
    await db.mealPlans.add(
      meal({ portions: [{ foodId: 'arroz_branco_cozido', grams: 150, consumed: true }] })
    );
    await db.appMeta.put({ key: 'lastActiveDate', value: daysAgo(1) });

    await ensureDailyRollover();

    // As marcações de hoje foram zeradas, mas o registro de ontem continua lá.
    expect(await getFoodLogForDate(daysAgo(1))).toHaveLength(1);
  });

  it('deve registrar a data corrente como último uso', async () => {
    await ensureDailyRollover();
    expect(await getMeta('lastActiveDate')).toBe(todayLocal());
  });
});

describe('Reiniciar o dia', () => {
  beforeEach(freshContainer);

  it('deve apagar o diário apenas da data informada', async () => {
    await logFoodConsumption(daysAgo(1), 'Almoço', 1, 'arroz_branco_cozido', 150);
    await logFoodConsumption(todayLocal(), 'Almoço', 1, 'arroz_branco_cozido', 150);

    await clearFoodLogForDate(todayLocal());

    expect(await getFoodLogForDate(todayLocal())).toHaveLength(0);
    expect(await getFoodLogForDate(daysAgo(1))).toHaveLength(1);
  });
});
