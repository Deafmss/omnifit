import './setup';
import { describe, it, expect, beforeEach } from 'vitest';
import { db, switchUserDb, getWorkoutFrequencyStats, getLastWeightByExercise } from '../db';
import { WorkoutSessionLog } from '../types';
import { toLocalDateString, addDays, todayLocal } from '../../utils/dateUtils';

/**
 * Cobertura da camada de armazenamento com IndexedDB real (fake-indexeddb).
 *
 * O ponto central aqui é o campo `completed`, que é um boolean. IndexedDB não
 * aceita boolean como chave de índice, então a consulta antiga
 * `where('completed').equals(1)` devolvia uma lista SEMPRE vazia — sem lançar
 * erro, o que fazia o `.catch()` de fallback nunca rodar — e zerava streak,
 * aderência semanal, tonelagem e calorias na interface.
 */

const daysAgo = (n: number) => toLocalDateString(addDays(new Date(), -n));

function session(overrides: Partial<WorkoutSessionLog> = {}): WorkoutSessionLog {
  return {
    name: 'Treino Teste',
    date: todayLocal(),
    durationMinutes: 50,
    caloriesBurnedEstimate: 300,
    totalVolumeLoadKg: 5000,
    completed: true,
    exerciseLogs: [],
    ...overrides
  };
}

describe('Estatísticas de frequência de treino (IndexedDB real)', () => {
  beforeEach(async () => {
    switchUserDb(`test_${Math.random().toString(36).slice(2)}`);
    await db.sessionLogs.clear();
  });

  it('deve encontrar sessões gravadas com completed booleano', async () => {
    await db.sessionLogs.bulkAdd([session(), session({ date: daysAgo(1) })]);

    const stats = await getWorkoutFrequencyStats(4);

    // Este é o teste que faltava: com a consulta por índice booleano, todos
    // estes valores voltavam zerados.
    expect(stats.totalCompletedSessions).toBe(2);
    expect(stats.totalVolumeLiftedKg).toBe(10000);
    expect(stats.totalCaloriesBurned).toBe(600);
    expect(stats.completedDates.size).toBe(2);
  });

  it('deve ignorar sessões não concluídas', async () => {
    await db.sessionLogs.bulkAdd([
      session(),
      session({ date: daysAgo(1), completed: false, totalVolumeLoadKg: 9999 })
    ]);

    const stats = await getWorkoutFrequencyStats(4);

    expect(stats.totalCompletedSessions).toBe(1);
    expect(stats.totalVolumeLiftedKg).toBe(5000);
  });

  it('deve contar a sequência de dias consecutivos', async () => {
    await db.sessionLogs.bulkAdd([
      session({ date: todayLocal() }),
      session({ date: daysAgo(1) }),
      session({ date: daysAgo(2) }),
      // Lacuna no dia 3 — a sequência precisa parar aqui.
      session({ date: daysAgo(4) })
    ]);

    const stats = await getWorkoutFrequencyStats(4);
    expect(stats.currentStreak).toBe(3);
  });

  it('deve manter a sequência viva quando o treino foi ontem e hoje é descanso', async () => {
    await db.sessionLogs.bulkAdd([session({ date: daysAgo(1) }), session({ date: daysAgo(2) })]);

    const stats = await getWorkoutFrequencyStats(4);
    expect(stats.currentStreak).toBe(2);
  });

  it('deve zerar a sequência após dois dias sem treino', async () => {
    await db.sessionLogs.bulkAdd([session({ date: daysAgo(2) }), session({ date: daysAgo(3) })]);

    const stats = await getWorkoutFrequencyStats(4);
    expect(stats.currentStreak).toBe(0);
  });

  it('deve calcular a aderência semanal com teto de 100%', async () => {
    // 5 treinos nesta semana contra uma meta de 4.
    const monday = addDays(new Date(), -((new Date().getDay() + 6) % 7));
    await db.sessionLogs.bulkAdd(
      [0, 1, 2, 3, 4].map((i) => session({ date: toLocalDateString(addDays(monday, i)) }))
    );

    const stats = await getWorkoutFrequencyStats(4);
    expect(stats.weeklyAdherencePercent).toBe(100);
  });

  it('deve separar as métricas do mês das métricas totais', async () => {
    await db.sessionLogs.bulkAdd([
      session({ date: todayLocal(), totalVolumeLoadKg: 1000, caloriesBurnedEstimate: 100 }),
      // Muito antes: entra no total, mas não no mês corrente.
      session({ date: '2020-01-15', totalVolumeLoadKg: 8000, caloriesBurnedEstimate: 800 })
    ]);

    const stats = await getWorkoutFrequencyStats(4);

    expect(stats.totalVolumeLiftedKg).toBe(9000);
    expect(stats.monthVolumeLiftedKg).toBe(1000);
    expect(stats.monthCaloriesBurned).toBe(100);
  });

  it('deve devolver zeros sem nenhuma sessão, sem lançar erro', async () => {
    const stats = await getWorkoutFrequencyStats(4);

    expect(stats.totalCompletedSessions).toBe(0);
    expect(stats.currentStreak).toBe(0);
    expect(stats.weeklyAdherencePercent).toBe(0);
  });
});

describe('Histórico de cargas por exercício', () => {
  beforeEach(async () => {
    switchUserDb(`test_${Math.random().toString(36).slice(2)}`);
    await db.sessionLogs.clear();
  });

  it('deve devolver a carga da sessão mais recente de cada exercício', async () => {
    await db.sessionLogs.bulkAdd([
      session({
        date: daysAgo(7),
        exerciseLogs: [
          { exerciseId: 'supino_reto_barra', sets: [{ setNumber: 1, weightKg: 60, reps: 8, completed: true }] }
        ]
      }),
      session({
        date: daysAgo(1),
        exerciseLogs: [
          { exerciseId: 'supino_reto_barra', sets: [{ setNumber: 1, weightKg: 70, reps: 8, completed: true }] }
        ]
      })
    ]);

    const weights = await getLastWeightByExercise();
    expect(weights.get('supino_reto_barra')).toBe(70);
  });

  it('deve usar a maior carga da sessão e ignorar séries não concluídas', async () => {
    await db.sessionLogs.add(
      session({
        exerciseLogs: [
          {
            exerciseId: 'agachamento_livre_barra',
            sets: [
              { setNumber: 1, weightKg: 80, reps: 8, completed: true },
              { setNumber: 2, weightKg: 100, reps: 5, completed: true },
              // Série planejada e não executada não deve virar referência.
              { setNumber: 3, weightKg: 150, reps: 3, completed: false }
            ]
          }
        ]
      })
    );

    const weights = await getLastWeightByExercise();
    expect(weights.get('agachamento_livre_barra')).toBe(100);
  });

  it('deve aceitar cargas digitadas como texto', async () => {
    await db.sessionLogs.add(
      session({
        exerciseLogs: [
          { exerciseId: 'leg_press_45', sets: [{ setNumber: 1, weightKg: '120', reps: '10', completed: true }] }
        ]
      })
    );

    const weights = await getLastWeightByExercise();
    expect(weights.get('leg_press_45')).toBe(120);
  });

  it('não deve registrar exercício sem carga informada', async () => {
    await db.sessionLogs.add(
      session({
        exerciseLogs: [
          { exerciseId: 'abdominal_infra_paralela', sets: [{ setNumber: 1, weightKg: 0, reps: 15, completed: true }] }
        ]
      })
    );

    const weights = await getLastWeightByExercise();
    expect(weights.has('abdominal_infra_paralela')).toBe(false);
  });
});
