import '../../storage/__tests__/setup';
import { describe, it, expect, beforeEach } from 'vitest';
import { db, switchUserDb } from '../../storage/db';
import {
  BACKUP_SCHEMA_VERSION,
  BACKUP_TABLES,
  exportUserData,
  importUserData,
  parseUserDataBackup,
  backupFileName
} from '../dataBackup';
import { UserProfile, FoodItem } from '../../storage/types';
import { todayLocal } from '../../utils/dateUtils';

const baseProfile: UserProfile = {
  name: 'Teste Backup',
  age: 30,
  gender: 'male',
  heightCm: 180,
  weightKg: 80,
  bodyFatPercentage: 18,
  experienceLevel: 'intermediate',
  goal: 'recomposition',
  trainingDaysPerWeek: 4,
  sessionDurationMin: 60,
  dietMode: 'guided',
  mealsPerDay: 4,
  isCalibrated: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

const customFood: FoodItem = {
  id: 'custom_whey',
  name: 'Whey Isolado',
  category: 'supplement',
  servingName: 'scoop',
  baseGrams: 30,
  caloriesPer100g: 380,
  proteinPer100g: 85,
  carbsPer100g: 4,
  fatPer100g: 2,
  fiberPer100g: 0,
  sodiumMgPer100g: 200,
  isCustom: true
};

/** Cada teste roda num contêiner novo para não herdar dados do anterior. */
const freshContainer = () => switchUserDb(`backup_${Math.random().toString(36).slice(2)}`);

async function seedFullDatabase() {
  await db.profiles.add({ ...baseProfile });
  await db.customFoods.put({ ...customFood });
  await db.mealPlans.add({
    name: 'Café da manhã',
    order: 1,
    targetProtein: 40,
    targetCarbs: 60,
    targetFat: 15,
    targetCalories: 535,
    portions: [{ foodId: 'custom_whey', grams: 30, consumed: false }]
  });
  await db.routines.add({
    name: 'Treino A',
    splitCode: 'A',
    dayOfWeek: 1,
    targetMuscles: ['chest'],
    exercises: [{ exerciseId: 'bench_press', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 }]
  });
  await db.sessionLogs.add({
    name: 'Treino A',
    date: '2026-08-10',
    durationMinutes: 62,
    caloriesBurnedEstimate: 410,
    totalVolumeLoadKg: 5200,
    completed: true,
    exerciseLogs: [
      {
        exerciseId: 'bench_press',
        sets: [{ setNumber: 1, weightKg: 60, reps: 10, completed: true }]
      }
    ]
  });
  await db.weightLogs.add({ date: '2026-08-10', weightKg: 80.4, emaWeightKg: 80.5 });
  await db.checkInLogs.add({
    date: '2026-08-10',
    weightKg: 80.4,
    hungerRating: 3,
    energyRating: 4,
    adherencePercentage: 90,
    caloricAdjustmentSuggestedKcal: -100,
    notes: 'semana boa'
  });
  await db.thermogenicLogs.add({
    date: '2026-08-10',
    blackCoffeeCups: 2,
    preWorkoutDoses: 1,
    totalThermogenicCaloriesBurned: 84,
    waterMl: 2500
  });
}

async function countAllTables(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const name of BACKUP_TABLES) {
    counts[name] = await (db[name] as { count: () => Promise<number> }).count();
  }
  return counts;
}

describe('Exportação de dados', () => {
  beforeEach(() => {
    freshContainer();
  });

  it('deve exportar todas as tabelas com metadados do formato', async () => {
    await seedFullDatabase();

    const backup = await exportUserData();

    expect(backup.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(backup.appVersion).toBeTruthy();
    expect(new Date(backup.exportedAt).getTime()).not.toBeNaN();

    for (const name of BACKUP_TABLES) {
      expect(Array.isArray(backup.data[name])).toBe(true);
      expect(backup.data[name].length).toBe(1);
    }
  });

  it('deve nomear o arquivo com a data local', () => {
    expect(backupFileName()).toBe(`omnifit-backup-${todayLocal()}.json`);
  });
});

describe('Ida e volta (exportar e reimportar)', () => {
  beforeEach(() => {
    freshContainer();
  });

  it('deve preservar os dados ao restaurar em um banco vazio', async () => {
    await seedFullDatabase();
    const original = await exportUserData();
    const arquivo = JSON.stringify(original);

    // Restaura num contêiner limpo, simulando outro aparelho.
    freshContainer();
    expect(await db.profiles.count()).toBe(0);

    await importUserData(arquivo, 'replace');

    const restaurado = await exportUserData();
    expect(restaurado.data).toEqual(original.data);
  });

  it('deve substituir os dados existentes no modo replace', async () => {
    await seedFullDatabase();
    const arquivo = JSON.stringify(await exportUserData());

    await db.weightLogs.add({ date: '2026-08-11', weightKg: 79.9 });
    await db.weightLogs.add({ date: '2026-08-12', weightKg: 79.7 });
    expect(await db.weightLogs.count()).toBe(3);

    await importUserData(arquivo, 'replace');

    const pesagens = await db.weightLogs.toArray();
    expect(pesagens).toHaveLength(1);
    expect(pesagens[0].date).toBe('2026-08-10');
  });

  it('deve informar quantos registros foram gravados', async () => {
    await seedFullDatabase();
    const arquivo = JSON.stringify(await exportUserData());

    const resultado = await importUserData(arquivo, 'replace');

    expect(resultado.mode).toBe('replace');
    expect(resultado.imported.weightLogs).toBe(1);
    expect(resultado.imported.sessionLogs).toBe(1);
  });

  it('deve aceitar o objeto já desserializado, não só a string', async () => {
    await seedFullDatabase();
    const objeto = await exportUserData();

    freshContainer();
    await importUserData(objeto, 'replace');

    expect(await db.sessionLogs.count()).toBe(1);
  });
});

describe('Modo merge', () => {
  beforeEach(() => {
    freshContainer();
  });

  it('não deve apagar os dados já existentes', async () => {
    await seedFullDatabase();
    const arquivo = JSON.stringify(await exportUserData());

    // Dados que só existem no banco atual e precisam sobreviver à importação.
    await db.weightLogs.add({ date: '2026-08-15', weightKg: 79.2 });
    await db.sessionLogs.add({
      name: 'Treino B',
      date: '2026-08-15',
      durationMinutes: 55,
      caloriesBurnedEstimate: 380,
      totalVolumeLoadKg: 4800,
      completed: true,
      exerciseLogs: []
    });

    await importUserData(arquivo, 'merge');

    const datasDePeso = (await db.weightLogs.toArray()).map((w) => w.date).sort();
    expect(datasDePeso).toEqual(['2026-08-10', '2026-08-10', '2026-08-15']);

    const sessoes = (await db.sessionLogs.toArray()).map((s) => s.name).sort();
    expect(sessoes).toEqual(['Treino A', 'Treino A', 'Treino B']);
  });

  it('deve preservar os ids dos registros atuais ao acrescentar', async () => {
    const idExistente = (await db.weightLogs.add({ date: '2026-08-01', weightKg: 81 })) as number;
    const arquivo = JSON.stringify({
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: '2026-08-10T12:00:00.000Z',
      appVersion: '1.0.0',
      data: {
        profiles: [],
        mealPlans: [],
        customFoods: [],
        routines: [],
        sessionLogs: [],
        // Mesmo id do registro atual: o merge não pode sobrescrevê-lo.
        weightLogs: [{ id: idExistente, date: '2026-07-01', weightKg: 83 }],
        checkInLogs: [],
        thermogenicLogs: []
      }
    });

    await importUserData(arquivo, 'merge');

    const original = await db.weightLogs.get(idExistente);
    expect(original?.date).toBe('2026-08-01');
    expect(await db.weightLogs.count()).toBe(2);
  });

  it('deve ignorar alimentos personalizados que já existem com o mesmo id', async () => {
    await db.customFoods.put({ ...customFood, name: 'Whey editado pelo usuário' });
    const arquivo = JSON.stringify({
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: '2026-08-10T12:00:00.000Z',
      appVersion: '1.0.0',
      data: {
        profiles: [],
        mealPlans: [],
        customFoods: [{ ...customFood }, { ...customFood, id: 'custom_arroz', name: 'Arroz Integral' }],
        routines: [],
        sessionLogs: [],
        weightLogs: [],
        checkInLogs: [],
        thermogenicLogs: []
      }
    });

    const resultado = await importUserData(arquivo, 'merge');

    expect(resultado.imported.customFoods).toBe(1);
    expect((await db.customFoods.get('custom_whey'))?.name).toBe('Whey editado pelo usuário');
    expect(await db.customFoods.count()).toBe(2);
  });
});

describe('Validação antes de escrever', () => {
  beforeEach(() => {
    freshContainer();
  });

  it('deve rejeitar JSON inválido sem tocar no banco', async () => {
    await seedFullDatabase();
    const antes = await countAllTables();

    await expect(importUserData('{ isto não é json', 'replace')).rejects.toThrow(
      /não é um JSON válido/
    );

    expect(await countAllTables()).toEqual(antes);
  });

  it('deve rejeitar conteúdo que não é um objeto de backup', async () => {
    await expect(importUserData('[1, 2, 3]', 'replace')).rejects.toThrow(/objeto de backup/);
    await expect(importUserData('"texto"', 'replace')).rejects.toThrow(/objeto de backup/);
  });

  it('deve rejeitar schemaVersion desconhecida sem tocar no banco', async () => {
    await seedFullDatabase();
    const backup = await exportUserData();
    const antes = await countAllTables();

    const futuro = JSON.stringify({ ...backup, schemaVersion: BACKUP_SCHEMA_VERSION + 1 });

    await expect(importUserData(futuro, 'replace')).rejects.toThrow(/não suportada/);
    expect(await countAllTables()).toEqual(antes);
  });

  it('deve rejeitar arquivo sem a versão do formato', async () => {
    const backup = await exportUserData();
    const { schemaVersion: _ignorado, ...semVersao } = backup;

    await expect(importUserData(JSON.stringify(semVersao), 'replace')).rejects.toThrow(
      /schemaVersion/
    );
  });

  it('deve rejeitar arquivo sem o bloco data', async () => {
    const arquivo = JSON.stringify({ schemaVersion: BACKUP_SCHEMA_VERSION, exportedAt: '', appVersion: '1.0.0' });
    await expect(importUserData(arquivo, 'replace')).rejects.toThrow(/"data"/);
  });

  it('deve rejeitar arquivo com tabela ausente sem tocar no banco', async () => {
    await seedFullDatabase();
    const backup = await exportUserData();
    const antes = await countAllTables();

    const data = { ...backup.data } as Record<string, unknown>;
    delete data.weightLogs;

    await expect(importUserData(JSON.stringify({ ...backup, data }), 'replace')).rejects.toThrow(
      /tabela "weightLogs" está ausente/
    );
    expect(await countAllTables()).toEqual(antes);
  });

  it('deve rejeitar tabela que não é uma lista', async () => {
    const backup = await exportUserData();
    const data = { ...backup.data, sessionLogs: { date: '2026-08-10' } };

    await expect(importUserData(JSON.stringify({ ...backup, data }), 'replace')).rejects.toThrow(
      /deveria ser uma lista/
    );
  });

  it('deve rejeitar registro que não é um objeto', async () => {
    const backup = await exportUserData();
    const data = { ...backup.data, weightLogs: [{ date: '2026-08-10', weightKg: 80 }, 42] };

    await expect(importUserData(JSON.stringify({ ...backup, data }), 'replace')).rejects.toThrow(
      /registro 2 da tabela "weightLogs"/
    );
  });

  it('deve rejeitar modo de importação desconhecido', async () => {
    const arquivo = JSON.stringify(await exportUserData());
    await expect(
      importUserData(arquivo, 'sobrescrever' as unknown as 'replace')
    ).rejects.toThrow(/Modo de importação desconhecido/);
  });

  it('parseUserDataBackup deve devolver o backup validado', async () => {
    await seedFullDatabase();
    const backup = await exportUserData();

    const validado = parseUserDataBackup(JSON.stringify(backup));

    expect(validado.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(validado.data.profiles).toHaveLength(1);
  });
});
