import { MuscleGroup, WorkoutRoutine } from '../storage/types';
import { EXERCISE_DATABASE_MAP } from './exerciseDatabase';

/**
 * Catálogo declarativo de divisões de treino.
 *
 * Antes estes dados viviam duplicados dentro de `generateDefaultRoutines` e
 * `applySplitTemplate` em db.ts (~390 linhas repetidas), e as duas cópias já
 * haviam divergido. Aqui existe uma única definição por divisão.
 *
 * `targetMuscles` NÃO é declarado à mão: ele é derivado dos exercícios por
 * `buildRoutines`, de modo que a ficha nunca possa anunciar um grupo muscular
 * que ela não treina.
 */

export type SplitTemplateType = 'ppl' | 'upper_lower' | 'abcde' | 'abc_classic' | 'fullbody' | 'blank';

export interface RoutineExerciseTemplate {
  exerciseId: string;
  targetSets: number;
  minReps: number;
  maxReps: number;
  restSeconds: number;
}

export interface RoutineTemplate {
  name: string;
  splitCode: string;
  exercises: RoutineExerciseTemplate[];
}

const PPL: RoutineTemplate[] = [
  {
    name: 'Treino A - Push (Peito, Ombros e Tríceps)',
    splitCode: 'A',
    exercises: [
      { exerciseId: 'supino_reto_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
      { exerciseId: 'supino_inclinado_halteres', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
      { exerciseId: 'desenvolvimento_halteres', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90 },
      { exerciseId: 'elevacao_lateral_halteres', targetSets: 4, minReps: 12, maxReps: 15, restSeconds: 60 },
      { exerciseId: 'triceps_polia_corda', targetSets: 3, minReps: 10, maxReps: 15, restSeconds: 60 }
    ]
  },
  {
    name: 'Treino B - Pull (Costas, Deltoide Posterior e Bíceps)',
    splitCode: 'B',
    exercises: [
      { exerciseId: 'puxada_alta_frente', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
      { exerciseId: 'remada_curvada_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
      { exerciseId: 'crucifixo_inverso_maquina', targetSets: 3, minReps: 12, maxReps: 15, restSeconds: 60 },
      { exerciseId: 'rosca_direta_barra_w', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 60 },
      { exerciseId: 'rosca_martelo_halteres', targetSets: 3, minReps: 10, maxReps: 12, restSeconds: 60 }
    ]
  },
  {
    name: 'Treino C - Legs (Quadríceps, Posteriores, Glúteos e Panturrilhas)',
    splitCode: 'C',
    exercises: [
      { exerciseId: 'agachamento_livre_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 150 },
      { exerciseId: 'leg_press_45', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 120 },
      { exerciseId: 'stiff_barra', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
      { exerciseId: 'elevacao_pelvica_barra', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90 },
      { exerciseId: 'mesa_flexora', targetSets: 3, minReps: 10, maxReps: 15, restSeconds: 60 },
      { exerciseId: 'panturrilha_em_pe_maquina', targetSets: 4, minReps: 12, maxReps: 18, restSeconds: 60 }
    ]
  }
];

const UPPER_LOWER: RoutineTemplate[] = [
  {
    name: 'Treino A - Superior 1 (Foco Peito e Costas)',
    splitCode: 'A',
    exercises: [
      { exerciseId: 'supino_reto_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
      { exerciseId: 'remada_curvada_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
      { exerciseId: 'desenvolvimento_halteres', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90 },
      { exerciseId: 'triceps_polia_corda', targetSets: 3, minReps: 10, maxReps: 15, restSeconds: 60 },
      { exerciseId: 'rosca_direta_barra_w', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 60 }
    ]
  },
  {
    name: 'Treino B - Inferior 1 (Foco Quadríceps e Panturrilhas)',
    splitCode: 'B',
    exercises: [
      { exerciseId: 'agachamento_livre_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 150 },
      { exerciseId: 'leg_press_45', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 120 },
      { exerciseId: 'cadeira_extensora', targetSets: 3, minReps: 10, maxReps: 15, restSeconds: 60 },
      { exerciseId: 'mesa_flexora', targetSets: 3, minReps: 10, maxReps: 15, restSeconds: 60 },
      { exerciseId: 'panturrilha_em_pe_maquina', targetSets: 4, minReps: 12, maxReps: 18, restSeconds: 60 }
    ]
  },
  {
    name: 'Treino C - Superior 2 (Foco Ombros e Braços)',
    splitCode: 'C',
    exercises: [
      { exerciseId: 'puxada_alta_frente', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
      { exerciseId: 'supino_inclinado_halteres', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
      { exerciseId: 'elevacao_lateral_halteres', targetSets: 4, minReps: 12, maxReps: 15, restSeconds: 60 },
      { exerciseId: 'triceps_testa_barra_w', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 75 },
      { exerciseId: 'rosca_martelo_halteres', targetSets: 3, minReps: 10, maxReps: 12, restSeconds: 60 }
    ]
  },
  {
    name: 'Treino D - Inferior 2 (Foco Posterior, Glúteo e Abdômen)',
    splitCode: 'D',
    exercises: [
      { exerciseId: 'stiff_barra', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
      { exerciseId: 'elevacao_pelvica_barra', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
      { exerciseId: 'mesa_flexora', targetSets: 4, minReps: 10, maxReps: 12, restSeconds: 60 },
      { exerciseId: 'abdominal_infra_paralela', targetSets: 4, minReps: 12, maxReps: 15, restSeconds: 60 }
    ]
  }
];

const ABCDE: RoutineTemplate[] = [
  {
    name: 'Treino A - Peito & Abdômen',
    splitCode: 'A',
    exercises: [
      { exerciseId: 'supino_reto_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
      { exerciseId: 'supino_inclinado_halteres', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
      { exerciseId: 'crucifixo_reto_halteres', targetSets: 3, minReps: 10, maxReps: 15, restSeconds: 60 },
      { exerciseId: 'abdominal_infra_paralela', targetSets: 4, minReps: 12, maxReps: 15, restSeconds: 60 }
    ]
  },
  {
    name: 'Treino B - Costas & Trapézio',
    splitCode: 'B',
    exercises: [
      { exerciseId: 'puxada_alta_frente', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
      { exerciseId: 'remada_curvada_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
      { exerciseId: 'remada_baixa_triangulo', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90 },
      { exerciseId: 'encolhimento_ombros_barra', targetSets: 4, minReps: 10, maxReps: 15, restSeconds: 60 }
    ]
  },
  {
    name: 'Treino C - Pernas Completo (Quadríceps e Posteriores)',
    splitCode: 'C',
    exercises: [
      { exerciseId: 'agachamento_livre_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 150 },
      { exerciseId: 'leg_press_45', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 120 },
      { exerciseId: 'stiff_barra', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
      { exerciseId: 'cadeira_extensora', targetSets: 3, minReps: 10, maxReps: 15, restSeconds: 60 },
      { exerciseId: 'mesa_flexora', targetSets: 3, minReps: 10, maxReps: 15, restSeconds: 60 },
      { exerciseId: 'panturrilha_em_pe_maquina', targetSets: 4, minReps: 12, maxReps: 18, restSeconds: 60 }
    ]
  },
  {
    name: 'Treino D - Deltoides & Ombros Completo',
    splitCode: 'D',
    exercises: [
      { exerciseId: 'desenvolvimento_halteres', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 90 },
      { exerciseId: 'elevacao_lateral_halteres', targetSets: 4, minReps: 12, maxReps: 15, restSeconds: 60 },
      { exerciseId: 'crucifixo_inverso_maquina', targetSets: 4, minReps: 12, maxReps: 15, restSeconds: 60 }
    ]
  },
  {
    name: 'Treino E - Braços (Bíceps e Tríceps)',
    splitCode: 'E',
    exercises: [
      { exerciseId: 'rosca_direta_barra_w', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 60 },
      { exerciseId: 'rosca_martelo_halteres', targetSets: 3, minReps: 10, maxReps: 12, restSeconds: 60 },
      { exerciseId: 'triceps_polia_corda', targetSets: 4, minReps: 10, maxReps: 15, restSeconds: 60 },
      { exerciseId: 'triceps_testa_barra_w', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 75 },
      { exerciseId: 'rosca_punho_barra', targetSets: 3, minReps: 12, maxReps: 15, restSeconds: 45 }
    ]
  }
];

const ABC_CLASSIC: RoutineTemplate[] = [
  {
    name: 'Treino A - Peito, Tríceps e Abdômen',
    splitCode: 'A',
    exercises: [
      { exerciseId: 'supino_reto_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
      { exerciseId: 'supino_inclinado_halteres', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90 },
      { exerciseId: 'triceps_polia_corda', targetSets: 4, minReps: 10, maxReps: 15, restSeconds: 60 },
      { exerciseId: 'triceps_testa_barra_w', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 75 },
      { exerciseId: 'abdominal_infra_paralela', targetSets: 3, minReps: 12, maxReps: 15, restSeconds: 60 }
    ]
  },
  {
    name: 'Treino B - Costas, Bíceps e Trapézio',
    splitCode: 'B',
    exercises: [
      { exerciseId: 'puxada_alta_frente', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
      { exerciseId: 'remada_curvada_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
      { exerciseId: 'rosca_direta_barra_w', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 60 },
      { exerciseId: 'rosca_martelo_halteres', targetSets: 3, minReps: 10, maxReps: 12, restSeconds: 60 },
      { exerciseId: 'encolhimento_ombros_barra', targetSets: 3, minReps: 10, maxReps: 15, restSeconds: 60 }
    ]
  },
  {
    name: 'Treino C - Pernas Completo e Ombros',
    splitCode: 'C',
    exercises: [
      { exerciseId: 'agachamento_livre_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 150 },
      { exerciseId: 'leg_press_45', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 120 },
      { exerciseId: 'stiff_barra', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90 },
      { exerciseId: 'desenvolvimento_halteres', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
      { exerciseId: 'elevacao_lateral_halteres', targetSets: 4, minReps: 12, maxReps: 15, restSeconds: 60 },
      { exerciseId: 'panturrilha_em_pe_maquina', targetSets: 4, minReps: 12, maxReps: 18, restSeconds: 60 }
    ]
  }
];

const FULLBODY: RoutineTemplate[] = [
  {
    name: 'Full Body A - Ênfase Peito & Quadríceps',
    splitCode: 'A',
    exercises: [
      { exerciseId: 'agachamento_livre_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
      { exerciseId: 'supino_reto_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
      { exerciseId: 'puxada_alta_frente', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
      { exerciseId: 'elevacao_lateral_halteres', targetSets: 3, minReps: 12, maxReps: 15, restSeconds: 60 },
      { exerciseId: 'abdominal_infra_paralela', targetSets: 3, minReps: 12, maxReps: 15, restSeconds: 60 }
    ]
  },
  {
    name: 'Full Body B - Ênfase Costas & Posteriores',
    splitCode: 'B',
    exercises: [
      { exerciseId: 'stiff_barra', targetSets: 4, minReps: 8, maxReps: 10, restSeconds: 120 },
      { exerciseId: 'remada_curvada_barra', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 },
      { exerciseId: 'supino_inclinado_halteres', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90 },
      { exerciseId: 'rosca_direta_barra_w', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 60 },
      { exerciseId: 'triceps_polia_corda', targetSets: 3, minReps: 10, maxReps: 15, restSeconds: 60 }
    ]
  },
  {
    name: 'Full Body C - Pernas & Superior Completo',
    splitCode: 'C',
    exercises: [
      { exerciseId: 'leg_press_45', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 120 },
      { exerciseId: 'elevacao_pelvica_barra', targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90 },
      { exerciseId: 'desenvolvimento_halteres', targetSets: 4, minReps: 8, maxReps: 12, restSeconds: 90 },
      { exerciseId: 'panturrilha_em_pe_maquina', targetSets: 4, minReps: 12, maxReps: 15, restSeconds: 60 }
    ]
  }
];

/** Fichas vazias, para quem prefere montar tudo à mão. */
const CUSTOM_BLANK: RoutineTemplate[] = [
  { name: 'Treino A (Personalizado)', splitCode: 'A', exercises: [] },
  { name: 'Treino B (Personalizado)', splitCode: 'B', exercises: [] },
  { name: 'Treino C (Personalizado)', splitCode: 'C', exercises: [] }
];

export const WORKOUT_TEMPLATES: Record<SplitTemplateType, RoutineTemplate[]> = {
  ppl: PPL,
  upper_lower: UPPER_LOWER,
  abcde: ABCDE,
  abc_classic: ABC_CLASSIC,
  fullbody: FULLBODY,
  blank: CUSTOM_BLANK
};

/**
 * Divisão recomendada para cada frequência semanal de treino.
 */
export function templateForFrequency(frequencyDays: number): SplitTemplateType {
  if (frequencyDays <= 3) return 'fullbody';
  if (frequencyDays === 4) return 'upper_lower';
  if (frequencyDays === 5) return 'abcde';
  return 'ppl';
}

/**
 * Deriva os grupos musculares realmente trabalhados por uma ficha.
 * Primários entram sempre; secundários só quando somam volume relevante
 * (>= 2 séries efetivas, contadas a 0.5x como no auditor de volume).
 */
export function deriveTargetMuscles(exercises: RoutineExerciseTemplate[]): MuscleGroup[] {
  const primary = new Set<MuscleGroup>();
  const secondaryVolume = new Map<MuscleGroup, number>();

  for (const item of exercises) {
    const exercise = EXERCISE_DATABASE_MAP.get(item.exerciseId);
    if (!exercise) continue;

    primary.add(exercise.primaryMuscle);
    for (const muscle of exercise.secondaryMuscles) {
      secondaryVolume.set(muscle, (secondaryVolume.get(muscle) || 0) + item.targetSets * 0.5);
    }
  }

  const result = new Set(primary);
  secondaryVolume.forEach((volume, muscle) => {
    if (volume >= 2) result.add(muscle);
  });

  return Array.from(result);
}

/**
 * Converte um template em fichas prontas para gravar, distribuindo os dias da
 * semana a partir de segunda-feira sem colisões (segunda..domingo).
 */
export function buildRoutines(template: SplitTemplateType): WorkoutRoutine[] {
  const routines = WORKOUT_TEMPLATES[template] || WORKOUT_TEMPLATES.blank;

  return routines.map((routine, index) => ({
    name: routine.name,
    splitCode: routine.splitCode,
    // index 0 -> segunda (1) ... index 6 -> domingo (0)
    dayOfWeek: (index + 1) % 7,
    targetMuscles: deriveTargetMuscles(routine.exercises),
    exercises: routine.exercises.map((e) => ({ ...e }))
  }));
}
