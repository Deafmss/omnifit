import './setup';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Testes da restauração nuvem -> aparelho.
 *
 * O acesso ao Supabase é substituído por dublês: o objetivo aqui é a lógica de
 * reconciliação, que é onde os dados do usuário podem ser perdidos. Sem estes
 * testes o `pullFromCloud` seria código nunca exercitado — a situação em que a
 * subida para a nuvem ficou por meses.
 */

const cloudData = {
  profile: null as unknown,
  mealPlans: null as unknown,
  routines: null as unknown,
  weightLogs: null as unknown,
  sessionLogs: null as unknown,
  checkInLogs: null as unknown,
  foodLogs: null as unknown
};

let cloudUserId: string | null = 'user-nuvem';

vi.mock('../../supabase/supabaseClient', () => ({
  supabase: null,
  isSupabaseConfigured: () => false,
  fetchProfileFromCloud: async () => cloudData.profile,
  fetchMealPlansFromCloud: async () => cloudData.mealPlans,
  fetchRoutinesFromCloud: async () => cloudData.routines,
  fetchWeightLogsFromCloud: async () => cloudData.weightLogs,
  fetchSessionLogsFromCloud: async () => cloudData.sessionLogs,
  fetchCheckInLogsFromCloud: async () => cloudData.checkInLogs,
  fetchFoodLogsFromCloud: async () => cloudData.foodLogs,
  syncProfileToCloud: async () => {},
  syncMealPlansToCloud: async () => {},
  syncRoutinesToCloud: async () => {},
  syncSessionLogToCloud: async () => {},
  syncWeightLogToCloud: async () => {},
  syncCheckInLogToCloud: async () => {},
  syncFoodLogsToCloud: async () => {}
}));

vi.mock('../../supabase/cloudSync', () => ({
  getCloudUserId: async () => cloudUserId,
  isCloudSyncActive: async () => cloudUserId !== null,
  pushProfile: async () => {},
  pushMealPlans: async () => {},
  pushRoutines: async () => {},
  pushWeightLog: async () => {},
  pushSessionLog: async () => {},
  pushCheckInLog: async () => {},
  pushFoodLogs: async () => {}
}));

const { db, switchUserDb } = await import('../db');
const { pullFromCloud, pullIfLocalEmpty, isLocalContainerEmpty } = await import('../cloudRestore');

const perfilNuvem = {
  name: 'Da Nuvem',
  age: 30,
  gender: 'male' as const,
  heightCm: 180,
  weightKg: 82,
  experienceLevel: 'intermediate' as const,
  goal: 'fat_loss' as const,
  trainingDaysPerWeek: 4,
  sessionDurationMin: 60,
  dietMode: 'guided' as const,
  mealsPerDay: 4,
  isCalibrated: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z'
};

const refeicaoNuvem = {
  name: 'Almoço da Nuvem',
  order: 1,
  targetCalories: 700,
  targetProtein: 50,
  targetCarbs: 70,
  targetFat: 20,
  portions: [{ foodId: 'arroz_branco_cozido', grams: 150, consumed: false }]
};

function resetCloud() {
  cloudData.profile = null;
  cloudData.mealPlans = null;
  cloudData.routines = null;
  cloudData.weightLogs = null;
  cloudData.sessionLogs = null;
  cloudData.checkInLogs = null;
  cloudData.foodLogs = null;
  cloudUserId = 'user-nuvem';
}

beforeEach(async () => {
  switchUserDb(`restore_${Math.random().toString(36).slice(2)}`);
  resetCloud();
});

describe('Detecção de contêiner vazio', () => {
  it('deve reconhecer um aparelho novo', async () => {
    expect(await isLocalContainerEmpty()).toBe(true);
  });

  it('não deve considerar vazio quando já existe perfil', async () => {
    await db.profiles.add({ ...perfilNuvem, name: 'Local' });
    expect(await isLocalContainerEmpty()).toBe(false);
  });
});

describe('Restauração sem sessão na nuvem', () => {
  it('deve avisar em vez de falhar quando não há login Google', async () => {
    cloudUserId = null;

    const result = await pullFromCloud('merge');
    expect(result.perfilRestaurado).toBe(false);
    expect(result.resumo).toContain('Google');
  });

  it('pullIfLocalEmpty deve devolver null sem sessão', async () => {
    cloudUserId = null;
    expect(await pullIfLocalEmpty()).toBeNull();
  });
});

describe('Modo merge (não destrutivo)', () => {
  it('deve restaurar o perfil quando o aparelho está vazio', async () => {
    cloudData.profile = perfilNuvem;

    const result = await pullFromCloud('merge');

    expect(result.perfilRestaurado).toBe(true);
    expect((await db.profiles.toArray())[0].name).toBe('Da Nuvem');
  });

  it('NÃO deve sobrescrever o perfil local existente', async () => {
    await db.profiles.add({ ...perfilNuvem, name: 'Local Mais Recente' });
    cloudData.profile = perfilNuvem;

    const result = await pullFromCloud('merge');

    // Regra central: merge nunca descarta edição local sem o usuário pedir.
    expect(result.perfilRestaurado).toBe(false);
    expect((await db.profiles.toArray())[0].name).toBe('Local Mais Recente');
  });

  it('NÃO deve sobrescrever o cardápio local existente', async () => {
    await db.mealPlans.add({ ...refeicaoNuvem, name: 'Meu Almoço Local' });
    cloudData.mealPlans = [refeicaoNuvem];

    await pullFromCloud('merge');

    const plans = await db.mealPlans.toArray();
    expect(plans).toHaveLength(1);
    expect(plans[0].name).toBe('Meu Almoço Local');
  });
});

describe('Modo replace (restauração explícita)', () => {
  it('deve substituir o perfil e o cardápio locais', async () => {
    await db.profiles.add({ ...perfilNuvem, name: 'Local' });
    await db.mealPlans.add({ ...refeicaoNuvem, name: 'Local' });

    cloudData.profile = perfilNuvem;
    cloudData.mealPlans = [refeicaoNuvem];

    const result = await pullFromCloud('replace');

    expect(result.perfilRestaurado).toBe(true);
    expect((await db.profiles.toArray())[0].name).toBe('Da Nuvem');
    expect((await db.mealPlans.toArray())[0].name).toBe('Almoço da Nuvem');
  });

  it('não deve duplicar o perfil ao substituir', async () => {
    await db.profiles.add({ ...perfilNuvem, name: 'Local' });
    cloudData.profile = perfilNuvem;

    await pullFromCloud('replace');

    expect(await db.profiles.count()).toBe(1);
  });
});

describe('Histórico: união por chave natural', () => {
  it('deve somar pesagens novas sem duplicar as existentes', async () => {
    await db.weightLogs.add({ date: '2026-08-01', weightKg: 80 });
    cloudData.weightLogs = [
      { date: '2026-08-01', weightKg: 80 },
      { date: '2026-08-02', weightKg: 79.5 }
    ];

    const result = await pullFromCloud('merge');

    expect(result.pesagens).toBe(1);
    expect(await db.weightLogs.count()).toBe(2);
  });

  it('deve manter a pesagem local em caso de conflito de data', async () => {
    await db.weightLogs.add({ date: '2026-08-01', weightKg: 80 });
    cloudData.weightLogs = [{ date: '2026-08-01', weightKg: 99 }];

    await pullFromCloud('merge');

    const logs = await db.weightLogs.toArray();
    expect(logs).toHaveLength(1);
    // O registro local é a fonte mais recente e vence.
    expect(logs[0].weightKg).toBe(80);
  });

  it('deve unir treinos por data e nome da ficha', async () => {
    await db.sessionLogs.add({
      name: 'Treino A', date: '2026-08-01', durationMinutes: 50,
      caloriesBurnedEstimate: 300, totalVolumeLoadKg: 5000, completed: true, exerciseLogs: []
    });

    cloudData.sessionLogs = [
      { name: 'Treino A', date: '2026-08-01', durationMinutes: 50, caloriesBurnedEstimate: 300, totalVolumeLoadKg: 5000, completed: true, exerciseLogs: [] },
      { name: 'Treino B', date: '2026-08-01', durationMinutes: 40, caloriesBurnedEstimate: 250, totalVolumeLoadKg: 4000, completed: true, exerciseLogs: [] },
      { name: 'Treino A', date: '2026-08-02', durationMinutes: 55, caloriesBurnedEstimate: 320, totalVolumeLoadKg: 5200, completed: true, exerciseLogs: [] }
    ];

    const result = await pullFromCloud('merge');

    // Duas sessões novas: 'Treino B' no mesmo dia e 'Treino A' no dia seguinte.
    expect(result.treinos).toBe(2);
    expect(await db.sessionLogs.count()).toBe(3);
  });

  it('deve unir o diário por data + alimento + refeição', async () => {
    await db.foodLogs.add({
      date: '2026-08-01', foodId: 'banana_prata', foodName: 'Banana', grams: 70,
      calories: 62, protein: 1, carbs: 16, fat: 0, fiber: 2,
      mealName: 'Café da Manhã', mealOrder: 1, loggedAt: '2026-08-01T08:00:00.000Z'
    });

    cloudData.foodLogs = [
      // Mesma chave: já existe.
      { date: '2026-08-01', foodId: 'banana_prata', foodName: 'Banana', grams: 70, calories: 62, protein: 1, carbs: 16, fat: 0, fiber: 2, mealName: 'Café da Manhã', mealOrder: 1, loggedAt: '2026-08-01T08:00:00.000Z' },
      // Mesmo alimento, OUTRA refeição: é registro novo.
      { date: '2026-08-01', foodId: 'banana_prata', foodName: 'Banana', grams: 70, calories: 62, protein: 1, carbs: 16, fat: 0, fiber: 2, mealName: 'Lanche', mealOrder: 3, loggedAt: '2026-08-01T16:00:00.000Z' }
    ];

    const result = await pullFromCloud('merge');

    expect(result.itensDiario).toBe(1);
    expect(await db.foodLogs.count()).toBe(2);
  });

  it('deve unir check-ins por data', async () => {
    cloudData.checkInLogs = [
      { date: '2026-08-01', weightKg: 80, hungerRating: 2 as const, energyRating: 4 as const, adherencePercentage: 90, caloricAdjustmentSuggestedKcal: -100, notes: 'x' }
    ];

    const result = await pullFromCloud('merge');
    expect(result.checkIns).toBe(1);
  });
});

describe('Falha de leitura vs ausência de dados', () => {
  it('não deve apagar nada local quando a nuvem devolve null (falha)', async () => {
    await db.mealPlans.add({ ...refeicaoNuvem, name: 'Local' });
    // null = não deu para ler. Diferente de [] = não existe nada lá.
    cloudData.mealPlans = null;

    await pullFromCloud('replace');

    const plans = await db.mealPlans.toArray();
    expect(plans).toHaveLength(1);
    expect(plans[0].name).toBe('Local');
  });

  it('não deve apagar o cardápio local quando a nuvem está vazia', async () => {
    await db.mealPlans.add({ ...refeicaoNuvem, name: 'Local' });
    cloudData.mealPlans = [];

    await pullFromCloud('replace');

    // Nuvem vazia não é motivo para destruir o que existe no aparelho.
    expect(await db.mealPlans.count()).toBe(1);
  });
});

describe('Resumo para o usuário', () => {
  it('deve informar quando não há nada novo', async () => {
    const result = await pullFromCloud('merge');
    expect(result.resumo).toContain('Nada novo');
  });

  it('deve listar o que foi restaurado', async () => {
    cloudData.profile = perfilNuvem;
    cloudData.weightLogs = [{ date: '2026-08-01', weightKg: 80 }];

    const result = await pullFromCloud('merge');

    expect(result.resumo).toContain('perfil');
    expect(result.resumo).toContain('1 pesagens');
  });
});

describe('Restauração automática no login', () => {
  it('deve restaurar quando o aparelho está vazio', async () => {
    cloudData.profile = perfilNuvem;

    const result = await pullIfLocalEmpty();

    expect(result?.perfilRestaurado).toBe(true);
  });

  it('deve ficar inerte quando já existem dados locais', async () => {
    await db.profiles.add({ ...perfilNuvem, name: 'Local' });
    cloudData.profile = perfilNuvem;

    expect(await pullIfLocalEmpty()).toBeNull();
    expect((await db.profiles.toArray())[0].name).toBe('Local');
  });
});
