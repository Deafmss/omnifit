import { describe, it, expect } from 'vitest';
import {
  estimate1Rm,
  buildExerciseProgress,
  listTrainedExercises,
  detectPersonalRecords,
  collectAllTimeRecords
} from '../strengthProgress';
import { WorkoutSessionLog } from '../../storage/types';

/**
 * Progressão de carga e recordes. Os dados já existiam nos logs de treino —
 * o app gravava peso e repetições de cada série e nunca mostrava nada além do
 * volume total.
 */

function sessao(
  date: string,
  exerciseId: string,
  sets: { weightKg: number | string; reps: number | string; completed: boolean }[],
  overrides: Partial<WorkoutSessionLog> = {}
): WorkoutSessionLog {
  return {
    name: 'Treino A',
    date,
    durationMinutes: 50,
    caloriesBurnedEstimate: 300,
    totalVolumeLoadKg: 0,
    completed: true,
    exerciseLogs: [
      {
        exerciseId,
        sets: sets.map((s, i) => ({ setNumber: i + 1, ...s }))
      }
    ],
    ...overrides
  };
}

describe('1RM estimado (Epley)', () => {
  it('deve devolver o próprio peso para uma repetição', () => {
    expect(estimate1Rm(100, 1)).toBe(100);
  });

  it('deve crescer com o número de repetições', () => {
    // 100 kg x 10 reps -> 100 * (1 + 10/30) = 133.3
    expect(estimate1Rm(100, 10)).toBeCloseTo(133.3, 1);
    expect(estimate1Rm(100, 5)).toBeCloseTo(116.7, 1);
  });

  it('deve devolver zero para entradas inválidas', () => {
    expect(estimate1Rm(0, 10)).toBe(0);
    expect(estimate1Rm(100, 0)).toBe(0);
    expect(estimate1Rm(-50, 5)).toBe(0);
  });
});

describe('Série histórica de um exercício', () => {
  it('deve montar os pontos em ordem cronológica', () => {
    const sessoes = [
      sessao('2026-08-10', 'supino_reto_barra', [{ weightKg: 60, reps: 8, completed: true }]),
      sessao('2026-08-03', 'supino_reto_barra', [{ weightKg: 55, reps: 8, completed: true }]),
      sessao('2026-08-17', 'supino_reto_barra', [{ weightKg: 65, reps: 8, completed: true }])
    ];

    const progresso = buildExerciseProgress(sessoes, 'supino_reto_barra');

    expect(progresso.points).toHaveLength(3);
    expect(progresso.points.map((p) => p.date)).toEqual(['2026-08-03', '2026-08-10', '2026-08-17']);
    expect(progresso.points.map((p) => p.topWeightKg)).toEqual([55, 60, 65]);
  });

  it('deve usar a maior carga da sessão e ignorar séries não concluídas', () => {
    const progresso = buildExerciseProgress(
      [
        sessao('2026-08-10', 'supino_reto_barra', [
          { weightKg: 60, reps: 10, completed: true },
          { weightKg: 70, reps: 6, completed: true },
          // Série planejada e não executada não pode virar recorde.
          { weightKg: 200, reps: 1, completed: false }
        ])
      ],
      'supino_reto_barra'
    );

    expect(progresso.bestWeightKg).toBe(70);
    expect(progresso.points[0].completedSets).toBe(2);
  });

  it('deve desempatar carga igual pela série de mais repetições', () => {
    const progresso = buildExerciseProgress(
      [
        sessao('2026-08-10', 'supino_reto_barra', [
          { weightKg: 60, reps: 6, completed: true },
          { weightKg: 60, reps: 10, completed: true }
        ])
      ],
      'supino_reto_barra'
    );

    // Mesma carga com mais repetições é o melhor esforço da sessão.
    expect(progresso.points[0].topSetReps).toBe(10);
  });

  it('deve calcular o volume somando peso × repetições', () => {
    const progresso = buildExerciseProgress(
      [
        sessao('2026-08-10', 'supino_reto_barra', [
          { weightKg: 50, reps: 10, completed: true },
          { weightKg: 50, reps: 8, completed: true }
        ])
      ],
      'supino_reto_barra'
    );

    // 50*10 + 50*8 = 900
    expect(progresso.points[0].volumeKg).toBe(900);
  });

  it('deve aceitar cargas digitadas como texto', () => {
    const progresso = buildExerciseProgress(
      [sessao('2026-08-10', 'leg_press_45', [{ weightKg: '120', reps: '10', completed: true }])],
      'leg_press_45'
    );

    expect(progresso.bestWeightKg).toBe(120);
  });

  it('deve ignorar sessões não concluídas', () => {
    const progresso = buildExerciseProgress(
      [
        sessao('2026-08-10', 'supino_reto_barra', [{ weightKg: 60, reps: 8, completed: true }]),
        sessao('2026-08-12', 'supino_reto_barra', [{ weightKg: 999, reps: 8, completed: true }], {
          completed: false
        })
      ],
      'supino_reto_barra'
    );

    expect(progresso.points).toHaveLength(1);
    expect(progresso.bestWeightKg).toBe(60);
  });

  it('deve calcular a variação percentual da carga', () => {
    const progresso = buildExerciseProgress(
      [
        sessao('2026-08-01', 'supino_reto_barra', [{ weightKg: 50, reps: 8, completed: true }]),
        sessao('2026-08-15', 'supino_reto_barra', [{ weightKg: 60, reps: 8, completed: true }])
      ],
      'supino_reto_barra'
    );

    expect(progresso.weightChangePercent).toBe(20);
  });

  it('deve devolver vazio para exercício sem histórico', () => {
    const progresso = buildExerciseProgress([], 'supino_reto_barra');

    expect(progresso.points).toHaveLength(0);
    expect(progresso.bestWeightKg).toBe(0);
    expect(progresso.trend).toBe('insuficiente');
  });
});

describe('Tendência de carga', () => {
  const comCargas = (cargas: number[]) =>
    buildExerciseProgress(
      cargas.map((peso, i) =>
        sessao(`2026-08-${String(i + 1).padStart(2, '0')}`, 'supino_reto_barra', [
          { weightKg: peso, reps: 8, completed: true }
        ])
      ),
      'supino_reto_barra'
    );

  it('não deve declarar tendência com menos de 3 sessões', () => {
    expect(comCargas([50, 60]).trend).toBe('insuficiente');
  });

  it('deve detectar carga subindo', () => {
    expect(comCargas([50, 52, 55, 60, 65, 70]).trend).toBe('subindo');
  });

  it('deve detectar carga caindo', () => {
    expect(comCargas([80, 78, 75, 65, 60, 55]).trend).toBe('caindo');
  });

  it('deve considerar estável quando a variação é ruído', () => {
    expect(comCargas([60, 60, 60, 60, 60, 60]).trend).toBe('estavel');
  });
});

describe('Exercícios treinados', () => {
  it('deve listar do mais treinado para o menos', () => {
    const sessoes = [
      sessao('2026-08-01', 'supino_reto_barra', [{ weightKg: 60, reps: 8, completed: true }]),
      sessao('2026-08-03', 'supino_reto_barra', [{ weightKg: 62, reps: 8, completed: true }]),
      sessao('2026-08-05', 'agachamento_livre_barra', [{ weightKg: 80, reps: 8, completed: true }])
    ];

    const lista = listTrainedExercises(sessoes);

    expect(lista[0]).toEqual({ exerciseId: 'supino_reto_barra', sessions: 2 });
    expect(lista[1]).toEqual({ exerciseId: 'agachamento_livre_barra', sessions: 1 });
  });

  it('não deve listar exercício sem nenhuma série concluída', () => {
    const lista = listTrainedExercises([
      sessao('2026-08-01', 'supino_reto_barra', [{ weightKg: 60, reps: 8, completed: false }])
    ]);

    expect(lista).toHaveLength(0);
  });
});

describe('Recordes pessoais', () => {
  it('deve detectar recorde de carga', () => {
    const antiga = sessao('2026-08-01', 'supino_reto_barra', [
      { weightKg: 60, reps: 8, completed: true }
    ]);
    const nova = sessao('2026-08-08', 'supino_reto_barra', [
      { weightKg: 70, reps: 8, completed: true }
    ]);

    const records = detectPersonalRecords([antiga, nova], nova);
    const peso = records.find((r) => r.type === 'weight');

    expect(peso).toBeDefined();
    expect(peso?.value).toBe(70);
    expect(peso?.previousValue).toBe(60);
  });

  it('NÃO deve considerar a primeira execução como recorde', () => {
    const primeira = sessao('2026-08-01', 'supino_reto_barra', [
      { weightKg: 60, reps: 8, completed: true }
    ]);

    // Sem histórico anterior não há marca a superar: é o ponto de partida.
    expect(detectPersonalRecords([primeira], primeira)).toHaveLength(0);
  });

  it('não deve reportar recorde quando a carga piorou', () => {
    const antiga = sessao('2026-08-01', 'supino_reto_barra', [
      { weightKg: 80, reps: 8, completed: true }
    ]);
    const nova = sessao('2026-08-08', 'supino_reto_barra', [
      { weightKg: 60, reps: 8, completed: true }
    ]);

    const records = detectPersonalRecords([antiga, nova], nova);
    expect(records.find((r) => r.type === 'weight')).toBeUndefined();
  });

  it('deve detectar recorde de volume mesmo com carga igual', () => {
    const antiga = sessao('2026-08-01', 'supino_reto_barra', [
      { weightKg: 60, reps: 8, completed: true }
    ]);
    const nova = sessao('2026-08-08', 'supino_reto_barra', [
      { weightKg: 60, reps: 8, completed: true },
      { weightKg: 60, reps: 8, completed: true }
    ]);

    const records = detectPersonalRecords([antiga, nova], nova);
    const volume = records.find((r) => r.type === 'volume');

    expect(volume?.value).toBe(960);
    expect(volume?.previousValue).toBe(480);
  });

  it('deve reunir os melhores de cada exercício ordenados por carga', () => {
    const sessoes = [
      sessao('2026-08-01', 'supino_reto_barra', [{ weightKg: 60, reps: 8, completed: true }]),
      sessao('2026-08-02', 'agachamento_livre_barra', [{ weightKg: 100, reps: 5, completed: true }])
    ];

    const records = collectAllTimeRecords(sessoes);

    expect(records).toHaveLength(2);
    expect(records[0].exerciseId).toBe('agachamento_livre_barra');
    expect(records[0].value).toBe(100);
  });
});
