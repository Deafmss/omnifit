import './setup';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  db,
  switchUserDb,
  saveProfile,
  getActiveProfile,
  getTodayWaterIntake,
  setTodayWaterIntake,
  updateTodayThermogenics,
  getTodayThermogenicLog,
  logWeightEntry,
  getWeightHistory,
  addNewRoutine,
  applySplitTemplate,
  getAllFoods,
  saveFoodItem
} from '../db';
import { UserProfile } from '../types';
import { FOOD_DATABASE_MAP } from '../../data/tacoDatabase';
import { todayLocal } from '../../utils/dateUtils';

const baseProfile: UserProfile = {
  name: 'Teste',
  age: 30,
  gender: 'male',
  heightCm: 180,
  weightKg: 80,
  bodyFatPercentage: 18,
  experienceLevel: 'intermediate',
  goal: 'fat_loss',
  trainingDaysPerWeek: 4,
  sessionDurationMin: 60,
  dietMode: 'guided',
  mealsPerDay: 4,
  isCalibrated: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

const freshContainer = () => switchUserDb(`test_${Math.random().toString(36).slice(2)}`);

describe('Troca de contêiner de usuário', () => {
  it('deve ser idempotente para o mesmo usuário', async () => {
    switchUserDb('usuario_a');
    await db.profiles.add({ ...baseProfile });

    // Chamar de novo para a MESMA conta não pode fechar a conexão: a tela de
    // login e o App faziam isso em sequência e derrubavam as leituras em voo
    // com DatabaseClosedError.
    switchUserDb('usuario_a');

    const profile = await getActiveProfile();
    expect(profile?.name).toBe('Teste');
  });

  it('deve isolar os dados entre contas diferentes', async () => {
    switchUserDb('usuario_b');
    await db.profiles.add({ ...baseProfile, name: 'Conta B' });

    switchUserDb('usuario_c');
    expect(await getActiveProfile()).toBeUndefined();

    switchUserDb('usuario_b');
    expect((await getActiveProfile())?.name).toBe('Conta B');
  });

  it('deve remover alimentos personalizados do mapa em memória ao trocar de conta', async () => {
    switchUserDb('usuario_d');
    await saveFoodItem({
      id: 'custom_teste_vazamento',
      name: 'Alimento da Conta D',
      category: 'protein',
      servingName: 'Porção (100g)',
      baseGrams: 100,
      caloriesPer100g: 100,
      proteinPer100g: 20,
      carbsPer100g: 0,
      fatPer100g: 2,
      fiberPer100g: 0,
      sodiumMgPer100g: 50,
      isCustom: true
    });

    expect(FOOD_DATABASE_MAP.has('custom_teste_vazamento')).toBe(true);

    // Ao trocar de conta, o item não pode continuar visível — o mapa é global.
    switchUserDb('usuario_e');
    expect(FOOD_DATABASE_MAP.has('custom_teste_vazamento')).toBe(false);
  });

  it('deve reidratar os alimentos personalizados da conta ativa', async () => {
    switchUserDb('usuario_d');
    const foods = await getAllFoods();

    expect(foods.some((f) => f.id === 'custom_teste_vazamento')).toBe(true);
    expect(FOOD_DATABASE_MAP.has('custom_teste_vazamento')).toBe(true);
  });
});

describe('Perfil e ajuste calórico', () => {
  beforeEach(freshContainer);

  it('deve persistir o ajuste calórico acumulado dos check-ins', async () => {
    await saveProfile({ ...baseProfile, calorieAdjustmentKcal: -150 });

    const saved = await getActiveProfile();
    expect(saved?.calorieAdjustmentKcal).toBe(-150);
  });

  it('deve atualizar o perfil existente em vez de criar um segundo', async () => {
    await saveProfile({ ...baseProfile });
    await saveProfile({ ...baseProfile, weightKg: 78, calorieAdjustmentKcal: -100 });

    expect(await db.profiles.count()).toBe(1);

    const saved = await getActiveProfile();
    expect(saved?.weightKg).toBe(78);
    expect(saved?.calorieAdjustmentKcal).toBe(-100);
  });

  it('deve preencher fórmulas padrão quando ausentes', async () => {
    await saveProfile({ ...baseProfile });

    const saved = await getActiveProfile();
    expect(saved?.preWorkoutFormula).toBeDefined();
    expect(saved?.coffeeConfig).toBeDefined();
  });
});

describe('Registro diário de água', () => {
  beforeEach(freshContainer);

  it('deve começar em zero, e não em 1500 ml fictícios', async () => {
    expect(await getTodayWaterIntake()).toBe(0);
  });

  it('deve persistir o consumo entre leituras', async () => {
    await setTodayWaterIntake(750);
    expect(await getTodayWaterIntake()).toBe(750);
  });

  it('nunca deve gravar valor negativo', async () => {
    await setTodayWaterIntake(-500);
    expect(await getTodayWaterIntake()).toBe(0);
  });

  it('deve conviver com o registro de termogênicos do mesmo dia', async () => {
    await setTodayWaterIntake(1000);
    await updateTodayThermogenics(2, 0, 1800);

    // Registrar café não pode apagar a água (ambos vivem no log do dia).
    expect(await getTodayWaterIntake()).toBe(1000);

    const thermo = await getTodayThermogenicLog();
    expect(thermo.blackCoffeeCups).toBe(2);
    expect(thermo.totalThermogenicCaloriesBurned).toBeGreaterThan(0);
  });

  it('deve acumular e nunca deixar as doses negativas', async () => {
    await updateTodayThermogenics(1, 1, 1800);
    await updateTodayThermogenics(-5, -5, 1800);

    const thermo = await getTodayThermogenicLog();
    expect(thermo.blackCoffeeCups).toBe(0);
    expect(thermo.preWorkoutDoses).toBe(0);
  });
});

describe('Histórico de pesagens', () => {
  beforeEach(freshContainer);

  it('deve gravar a pesagem na data local informada', async () => {
    await logWeightEntry(todayLocal(), 80.5);

    const history = await getWeightHistory();
    expect(history).toHaveLength(1);
    expect(history[0].date).toBe(todayLocal());
    expect(history[0].weightKg).toBe(80.5);
  });

  it('deve sobrescrever a pesagem do mesmo dia em vez de duplicar', async () => {
    await logWeightEntry(todayLocal(), 80.5);
    await logWeightEntry(todayLocal(), 79.9);

    const history = await getWeightHistory();
    expect(history).toHaveLength(1);
    expect(history[0].weightKg).toBe(79.9);
  });

  it('deve calcular a média móvel exponencial de todo o histórico', async () => {
    await logWeightEntry('2026-08-01', 82);
    await logWeightEntry('2026-08-02', 81);
    await logWeightEntry('2026-08-03', 80);

    const history = await getWeightHistory();
    expect(history).toHaveLength(3);
    // O primeiro ponto ancora a curva no próprio peso.
    expect(history[0].emaWeightKg).toBe(82);
    // A tendência suaviza: fica acima do peso do dia, que caiu rápido.
    expect(history[2].emaWeightKg).toBeGreaterThan(80);
    expect(history[2].emaWeightKg).toBeLessThan(82);
  });
});

describe('Fichas de treino', () => {
  beforeEach(freshContainer);

  it('deve aplicar um template substituindo as fichas anteriores', async () => {
    await applySplitTemplate('ppl');
    const ppl = await db.routines.count();

    await applySplitTemplate('abcde');
    const abcde = await db.routines.toArray();

    expect(ppl).toBe(3);
    expect(abcde).toHaveLength(5);
    expect(abcde.every((r) => r.targetMuscles.length > 0)).toBe(true);
  });

  it('deve criar fichas novas em dias livres, sem colidir nem gerar dia inválido', async () => {
    await applySplitTemplate('ppl'); // ocupa segunda, terça, quarta

    await addNewRoutine();
    await addNewRoutine();

    const routines = await db.routines.toArray();
    const days = routines.map((r) => r.dayOfWeek!);

    // O cálculo antigo `(count % 7) + 1` gerava 7 (dia inexistente) e repetia
    // dias já ocupados, deixando fichas inacessíveis na interface.
    expect(new Set(days).size).toBe(days.length);
    for (const day of days) {
      expect(day).toBeGreaterThanOrEqual(0);
      expect(day).toBeLessThanOrEqual(6);
    }
  });

  it('deve gerar códigos de divisão válidos além da 26ª ficha', async () => {
    await db.routines.clear();
    for (let i = 0; i < 28; i++) {
      await addNewRoutine();
    }

    const codes = (await db.routines.toArray()).map((r) => r.splitCode);
    // `String.fromCharCode(65 + n)` produzia '[', '\' e ']' depois do Z.
    expect(codes.every((c) => /^[A-Z]\d*$/.test(c))).toBe(true);
  });
});
