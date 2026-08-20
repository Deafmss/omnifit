import { describe, it, expect } from 'vitest';
import { buildPlanText, planFileName } from '../planExport';
import { calculateMetabolicStats } from '../../math/metabolism';
import { UserProfile, MealPlan, WorkoutRoutine } from '../../storage/types';

const perfil: UserProfile = {
  name: 'João da Silva',
  age: 30, gender: 'male', heightCm: 180, weightKg: 80, bodyFatPercentage: 18,
  experienceLevel: 'intermediate', goal: 'fat_loss',
  trainingDaysPerWeek: 4, sessionDurationMin: 60,
  dietMode: 'guided', mealsPerDay: 2, isCalibrated: true,
  createdAt: '', updatedAt: ''
};

const stats = calculateMetabolicStats(perfil);

const refeicoes: MealPlan[] = [
  {
    name: 'Almoço', order: 2, timeLabel: '12:30',
    targetCalories: 700, targetProtein: 50, targetCarbs: 70, targetFat: 20,
    portions: [
      { foodId: 'peito_frango_grelhado', grams: 150, consumed: false },
      { foodId: 'arroz_branco_cozido', grams: 200, consumed: false }
    ]
  },
  {
    name: 'Café da Manhã', order: 1, timeLabel: '08:00',
    targetCalories: 500, targetProtein: 40, targetCarbs: 50, targetFat: 15,
    portions: [{ foodId: 'ovo_galinha_cozido', grams: 100, consumed: false }]
  }
];

const treinos: WorkoutRoutine[] = [
  {
    name: 'Treino A', splitCode: 'A', dayOfWeek: 1, targetMuscles: ['chest'],
    exercises: [{ exerciseId: 'supino_reto_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 }]
  }
];

describe('Exportação do plano em texto', () => {
  it('deve incluir perfil, metas, cardápio e treino', () => {
    const texto = buildPlanText(perfil, stats, refeicoes, treinos);

    expect(texto).toContain('João da Silva');
    expect(texto).toContain('Emagrecimento');
    expect(texto).toContain('CARDÁPIO');
    expect(texto).toContain('Peito de Frango');
    expect(texto).toContain('DIVISÃO DE TREINO');
    expect(texto).toContain('Supino Reto');
    expect(texto).toContain('Segunda');
  });

  it('deve ordenar as refeições pela ordem do dia', () => {
    const texto = buildPlanText(perfil, stats, refeicoes, treinos);

    // 'Café da Manhã' tem order 1 e foi passado em segundo lugar no array.
    expect(texto.indexOf('CAFÉ DA MANHÃ')).toBeLessThan(texto.indexOf('ALMOÇO'));
  });

  it('deve somar o total do dia', () => {
    const texto = buildPlanText(perfil, stats, refeicoes, treinos);
    expect(texto).toMatch(/TOTAL DO DIA: \d+ kcal/);
  });

  it('deve declarar que os valores são estimativas', () => {
    const texto = buildPlanText(perfil, stats, refeicoes, treinos);

    // O documento sai do app e pode chegar a um profissional: precisa dizer
    // o que é, sem se apresentar como prescrição.
    expect(texto).toContain('estimativas');
    expect(texto).toContain('Não substituem acompanhamento profissional');
  });

  it('deve funcionar com cardápio e treinos vazios', () => {
    const texto = buildPlanText(perfil, stats, [], []);

    expect(texto).toContain('PERFIL');
    expect(texto).not.toContain('CARDÁPIO');
  });

  it('deve indicar refeição sem alimentos em vez de omitir', () => {
    const texto = buildPlanText(perfil, stats, [{ ...refeicoes[0], portions: [] }], []);
    expect(texto).toContain('nenhum alimento definido');
  });

  it('deve gerar nome de arquivo sem acentos nem espaços', () => {
    const nome = planFileName(perfil);

    expect(nome).toMatch(/^omnifit-plano-[a-z0-9-]+-\d{4}-\d{2}-\d{2}\.txt$/);
    expect(nome).not.toMatch(/[ãáéíóúçÃ ]/);
  });

  it('deve usar um nome padrão quando o perfil não tem nome utilizável', () => {
    expect(planFileName({ ...perfil, name: '   ' })).toContain('usuario');
  });
});
