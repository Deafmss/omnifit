import { describe, it, expect } from 'vitest';
import { evaluateDeloadNeed, countConsecutiveTrainingWeeks } from '../deloadAdvisor';
import { MuscleAuditResult } from '../trainingEngine';
import { WorkoutSessionLog } from '../../storage/types';

/**
 * Sugestão de semana de descarga. O MRV já era calculado pelo auditor de volume
 * e o app nunca avisava quando o usuário passava do teto.
 */

function sessao(date: string, completed = true): WorkoutSessionLog {
  return {
    name: 'Treino',
    date,
    durationMinutes: 50,
    caloriesBurnedEstimate: 300,
    totalVolumeLoadKg: 5000,
    completed,
    exerciseLogs: []
  };
}

function auditoria(status: MuscleAuditResult['status'], muscleLabel = 'Peitoral'): MuscleAuditResult {
  return {
    muscle: 'chest',
    muscleLabel,
    totalEffectiveSets: status === 'over' ? 30 : 14,
    landmarks: { mv: 6, mev: 8, mavMin: 12, mavMax: 18, mrv: 22 },
    status,
    recommendation: ''
  };
}

/** N semanas seguidas com 3 sessões cada, terminando na semana informada. */
function semanasSeguidas(quantidade: number, sessoesPorSemana = 3): WorkoutSessionLog[] {
  const logs: WorkoutSessionLog[] = [];
  const base = new Date(2026, 7, 17); // segunda-feira

  for (let semana = 0; semana < quantidade; semana++) {
    for (let dia = 0; dia < sessoesPorSemana; dia++) {
      const d = new Date(base.getTime());
      d.setDate(base.getDate() - semana * 7 + dia);
      logs.push(
        sessao(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
      );
    }
  }

  return logs;
}

describe('Semanas consecutivas de treino', () => {
  it('deve devolver zero sem histórico', () => {
    expect(countConsecutiveTrainingWeeks([])).toBe(0);
  });

  it('deve contar semanas seguidas', () => {
    expect(countConsecutiveTrainingWeeks(semanasSeguidas(5))).toBe(5);
  });

  it('deve interromper a contagem numa semana sem treino', () => {
    const logs = [
      ...semanasSeguidas(2), // semanas recentes
      // salta uma semana inteira
      sessao('2026-07-20'),
      sessao('2026-07-21'),
      sessao('2026-07-22')
    ];

    // A lacuna significa descanso: a sequência para nas 2 semanas recentes.
    expect(countConsecutiveTrainingWeeks(logs)).toBe(2);
  });

  it('deve tratar semana de uma única sessão como alívio', () => {
    const logs = [
      ...semanasSeguidas(2),
      // semana anterior com apenas 1 sessão — já funciona como descarga
      ...semanasSeguidas(1, 1).map((s) => {
        const d = new Date(2026, 7, 10);
        return { ...s, date: `${d.getFullYear()}-08-10` };
      })
    ];

    expect(countConsecutiveTrainingWeeks(logs)).toBe(2);
  });

  it('deve ignorar sessões não concluídas', () => {
    const logs = semanasSeguidas(3).map((s, i) => (i === 0 ? { ...s, completed: false } : s));
    expect(countConsecutiveTrainingWeeks(logs)).toBeGreaterThan(0);
  });
});

describe('Recomendação de descarga', () => {
  it('não deve recomendar nada sem histórico', () => {
    const result = evaluateDeloadNeed([auditoria('optimal')], []);

    expect(result.urgency).toBe('nenhuma');
    expect(result.advice).toBe('');
  });

  it('não deve recomendar com volume na faixa e poucas semanas', () => {
    const result = evaluateDeloadNeed([auditoria('optimal')], semanasSeguidas(3));
    expect(result.urgency).toBe('nenhuma');
  });

  it('deve chamar atenção quando um grupo passa do teto recuperável', () => {
    const result = evaluateDeloadNeed([auditoria('over')], semanasSeguidas(2));

    expect(result.urgency).toBe('atencao');
    expect(result.overMrvMuscles).toEqual(['Peitoral']);
    expect(result.advice).toBeTruthy();
  });

  it('deve recomendar descarga com três grupos acima do teto', () => {
    const result = evaluateDeloadNeed(
      [auditoria('over', 'Peitoral'), auditoria('over', 'Costas'), auditoria('over', 'Ombros')],
      semanasSeguidas(2)
    );

    expect(result.urgency).toBe('recomendado');
    expect(result.reason).toContain('3 grupos');
  });

  it('deve recomendar descarga após 8 semanas seguidas, mesmo com volume na faixa', () => {
    const result = evaluateDeloadNeed([auditoria('optimal')], semanasSeguidas(8));

    expect(result.urgency).toBe('recomendado');
    expect(result.consecutiveWeeks).toBeGreaterThanOrEqual(8);
    expect(result.reason).toContain('semanas seguidas');
  });

  it('deve chamar atenção a partir de 6 semanas seguidas', () => {
    const result = evaluateDeloadNeed([auditoria('optimal')], semanasSeguidas(6));
    expect(result.urgency).toBe('atencao');
  });

  it('deve elevar para recomendado quando volume alto encontra muitas semanas', () => {
    const result = evaluateDeloadNeed([auditoria('over')], semanasSeguidas(6));

    // Um sinal isolado é atenção; os dois juntos justificam a recomendação.
    expect(result.urgency).toBe('recomendado');
  });

  it('deve sempre sugerir, nunca afirmar sobretreino', () => {
    const result = evaluateDeloadNeed([auditoria('over')], semanasSeguidas(9));

    // O app não mede sono, alimentação nem estresse: a linguagem precisa ser de
    // sugestão, não de diagnóstico.
    expect(result.advice.toLowerCase()).toMatch(/considere|planeje|reduza/);
    expect(result.advice.toLowerCase()).not.toMatch(/você está sobretreinado/);
  });
});
