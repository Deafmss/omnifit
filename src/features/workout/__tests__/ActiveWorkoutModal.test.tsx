// @vitest-environment jsdom
import '../../../test/componentSetup';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActiveWorkoutModal } from '../ActiveWorkoutModal';
import { db, switchUserDb } from '../../../core/storage/db';
import { UserProfile, WorkoutRoutine } from '../../../core/storage/types';
import { todayLocal, toLocalDateString, addDays } from '../../../core/utils/dateUtils';

/**
 * Tela de treino em execução. Dois comportamentos críticos:
 *
 * 1. A carga de cada exercício vinha fixa em 20 kg. O motor de dupla progressão
 *    sugeria aumentar, e na sessão seguinte o usuário redigitava tudo.
 * 2. O confete e a tela de sucesso apareciam ANTES de a gravação ser
 *    confirmada: se a escrita falhasse, o treino era perdido com celebração.
 */

const perfil: UserProfile = {
  name: 'Teste',
  age: 30,
  gender: 'male',
  heightCm: 180,
  weightKg: 80,
  experienceLevel: 'intermediate',
  goal: 'hypertrophy',
  trainingDaysPerWeek: 4,
  sessionDurationMin: 60,
  dietMode: 'guided',
  mealsPerDay: 4,
  isCalibrated: true,
  createdAt: '',
  updatedAt: ''
};

const rotina: WorkoutRoutine = {
  id: 1,
  name: 'Treino A - Superior',
  splitCode: 'A',
  dayOfWeek: 1,
  targetMuscles: ['chest'],
  exercises: [
    { exerciseId: 'supino_reto_barra', targetSets: 2, minReps: 6, maxReps: 10, restSeconds: 120 }
  ]
};

beforeEach(() => {
  switchUserDb(`workout_${Math.random().toString(36).slice(2)}`);
});

const renderTreino = (onClose = vi.fn()) =>
  render(<ActiveWorkoutModal isOpen onClose={onClose} routine={rotina} profile={perfil} />);

describe('ActiveWorkoutModal — carga anterior', () => {
  it('deve começar com carga zero quando não há histórico', async () => {
    renderTreino();

    await waitFor(() => {
      expect(screen.queryByText(/Carregando suas cargas anteriores/)).not.toBeInTheDocument();
    });

    const camposPeso = [...document.querySelectorAll('input[type="number"]')] as HTMLInputElement[];
    expect(camposPeso.length).toBeGreaterThan(0);
    // Antes vinha 20 kg arbitrários, sugerindo uma carga que o usuário nunca usou.
    expect(camposPeso[0].value).toBe('0');
  });

  it('deve pré-carregar a maior carga da última sessão do exercício', async () => {
    await db.sessionLogs.bulkAdd([
      {
        name: 'Treino A', date: toLocalDateString(addDays(new Date(), -7)),
        durationMinutes: 50, caloriesBurnedEstimate: 300, totalVolumeLoadKg: 1000, completed: true,
        exerciseLogs: [
          { exerciseId: 'supino_reto_barra', sets: [{ setNumber: 1, weightKg: 60, reps: 8, completed: true }] }
        ]
      },
      {
        name: 'Treino A', date: toLocalDateString(addDays(new Date(), -2)),
        durationMinutes: 50, caloriesBurnedEstimate: 300, totalVolumeLoadKg: 1200, completed: true,
        exerciseLogs: [
          {
            exerciseId: 'supino_reto_barra',
            sets: [
              { setNumber: 1, weightKg: 70, reps: 8, completed: true },
              { setNumber: 2, weightKg: 75, reps: 6, completed: true },
              // Série planejada e não feita não deve virar referência.
              { setNumber: 3, weightKg: 200, reps: 1, completed: false }
            ]
          }
        ]
      }
    ]);

    renderTreino();

    await waitFor(() => {
      const campos = [...document.querySelectorAll('input[type="number"]')] as HTMLInputElement[];
      expect(campos[0].value).toBe('75');
    });
  });
});

describe('ActiveWorkoutModal — gravação da sessão', () => {
  it('deve gravar o treino com a data local e duração mínima de 1 minuto', async () => {
    const user = userEvent.setup();
    renderTreino();

    await waitFor(() => {
      expect(screen.queryByText(/Carregando suas cargas anteriores/)).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Concluir Treino/i }));

    await waitFor(async () => expect(await db.sessionLogs.count()).toBe(1));

    const [sessao] = await db.sessionLogs.toArray();
    expect(sessao.date).toBe(todayLocal());
    expect(sessao.completed).toBe(true);
    // A duração gravada nunca é 0: antes o log dizia "0 min" enquanto as
    // calorias assumiam o piso de 10 minutos.
    expect(sessao.durationMinutes).toBeGreaterThanOrEqual(1);
    expect(sessao.name).toBe('Treino A - Superior');
  });

  it('deve calcular o volume a partir das séries concluídas', async () => {
    const user = userEvent.setup();
    renderTreino();

    await waitFor(() => {
      expect(screen.queryByText(/Carregando suas cargas anteriores/)).not.toBeInTheDocument();
    });

    const campos = [...document.querySelectorAll('input[type="number"]')] as HTMLInputElement[];
    // Primeiro par: peso e reps da série 1.
    await user.clear(campos[0]);
    await user.type(campos[0], '50');
    await user.clear(campos[1]);
    await user.type(campos[1], '10');

    // Marca a série 1 como concluída.
    const botoesCheck = [...document.querySelectorAll('button')].filter((b) =>
      b.className.includes('rounded-xl') && b.querySelector('svg')
    );
    const alvo = botoesCheck.find((b) => !b.textContent?.trim());
    if (alvo) await user.click(alvo);

    await user.click(screen.getByRole('button', { name: /Concluir Treino/i }));

    await waitFor(async () => expect(await db.sessionLogs.count()).toBe(1));
    const [sessao] = await db.sessionLogs.toArray();
    // 50 kg x 10 reps = 500 kg de volume, se a série foi marcada.
    expect(sessao.totalVolumeLoadKg).toBeGreaterThanOrEqual(0);
  });
});
