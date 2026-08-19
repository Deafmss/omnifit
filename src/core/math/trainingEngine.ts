import { Exercise, ExperienceLevel, MuscleGroup, WorkoutRoutine } from '../storage/types';

export interface MuscleVolumeLandmarks {
  mv: number;  // Maintenance Volume
  mev: number; // Minimum Effective Volume
  mavMin: number; // Maximum Adaptive Volume (início)
  mavMax: number; // Maximum Adaptive Volume (fim)
  mrv: number; // Maximum Recoverable Volume
}

export function getVolumeLandmarks(muscle: MuscleGroup, level: ExperienceLevel): MuscleVolumeLandmarks {
  const baseLandmarks: Record<MuscleGroup, { mv: number; mev: number; mavMin: number; mavMax: number; mrv: number }> = {
    chest: { mv: 6, mev: 8, mavMin: 12, mavMax: 18, mrv: 22 },
    back: { mv: 6, mev: 10, mavMin: 14, mavMax: 20, mrv: 25 },
    quadriceps: { mv: 6, mev: 8, mavMin: 12, mavMax: 18, mrv: 22 },
    hamstrings: { mv: 4, mev: 6, mavMin: 10, mavMax: 16, mrv: 20 },
    glutes: { mv: 0, mev: 4, mavMin: 8, mavMax: 14, mrv: 18 },
    calves: { mv: 6, mev: 8, mavMin: 12, mavMax: 16, mrv: 20 },
    shoulders: { mv: 6, mev: 8, mavMin: 12, mavMax: 18, mrv: 22 },
    biceps: { mv: 4, mev: 6, mavMin: 10, mavMax: 16, mrv: 20 },
    triceps: { mv: 4, mev: 6, mavMin: 10, mavMax: 16, mrv: 20 },
    abs: { mv: 0, mev: 4, mavMin: 8, mavMax: 14, mrv: 18 }
  };

  const base = baseLandmarks[muscle];
  if (level === 'beginner') {
    return {
      mv: Math.max(4, base.mv - 2),
      mev: Math.max(6, base.mev - 2),
      mavMin: base.mev,
      mavMax: base.mavMin + 2,
      mrv: base.mavMax
    };
  } else if (level === 'advanced') {
    return {
      mv: base.mv + 2,
      mev: base.mev + 2,
      mavMin: base.mavMin + 2,
      mavMax: base.mavMax + 2,
      mrv: base.mrv + 3
    };
  }

  return base;
}

export interface MuscleAuditResult {
  muscle: MuscleGroup;
  muscleLabel: string;
  totalEffectiveSets: number;
  landmarks: MuscleVolumeLandmarks;
  status: 'under' | 'optimal' | 'over' | 'maintenance';
  recommendation: string;
}

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Peitoral',
  back: 'Costas / Dorsais',
  quadriceps: 'Quadríceps',
  hamstrings: 'Posteriores de Coxa',
  glutes: 'Glúteos',
  calves: 'Panturrilhas',
  shoulders: 'Ombros / Deltoides',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  abs: 'Abdômen / Core'
};

/**
 * Audita as fichas de treino do usuário e calcula o volume efetivo semanal por grupo muscular.
 */
export function auditWorkoutRoutines(
  routines: WorkoutRoutine[],
  exerciseMap: Map<string, Exercise>,
  level: ExperienceLevel
): MuscleAuditResult[] {
  const setsByMuscle: Record<MuscleGroup, number> = {
    chest: 0,
    back: 0,
    quadriceps: 0,
    hamstrings: 0,
    glutes: 0,
    calves: 0,
    shoulders: 0,
    biceps: 0,
    triceps: 0,
    abs: 0
  };

  for (const routine of routines) {
    for (const exEntry of routine.exercises) {
      const exercise = exerciseMap.get(exEntry.exerciseId);
      if (!exercise) continue;

      // Músculo primário recebe 1.0x da contagem de séries
      setsByMuscle[exercise.primaryMuscle] += exEntry.targetSets;

      // Músculos secundários recebem 0.5x da contagem de séries
      for (const sec of exercise.secondaryMuscles) {
        setsByMuscle[sec] += (exEntry.targetSets * 0.5);
      }
    }
  }

  const results: MuscleAuditResult[] = [];
  const muscleKeys = Object.keys(setsByMuscle) as MuscleGroup[];

  for (const muscle of muscleKeys) {
    const sets = Number(setsByMuscle[muscle].toFixed(1));
    const landmarks = getVolumeLandmarks(muscle, level);

    let status: 'under' | 'optimal' | 'over' | 'maintenance' = 'optimal';
    let recommendation = 'Volume na faixa ótima de hipertrofia (MAV).';

    if (sets < landmarks.mev) {
      status = 'under';
      recommendation = `Volume abaixo do mínimo efetivo (${sets}/${landmarks.mev} séries). Aumente de 2 a 4 séries semanais para gerar estímulo real.`;
    } else if (sets > landmarks.mrv) {
      status = 'over';
      recommendation = `Volume acima do teto recuperável (${sets}/${landmarks.mrv} séries). Risco de fadiga excessiva e lesão articular. Reduza séries.`;
    } else if (sets >= landmarks.mv && sets < landmarks.mev) {
      status = 'maintenance';
      recommendation = `Volume suficiente apenas para manutenção (${sets} séries). Não haverá ganho muscular significativo.`;
    }

    results.push({
      muscle,
      muscleLabel: MUSCLE_LABELS[muscle],
      totalEffectiveSets: sets,
      landmarks,
      status,
      recommendation
    });
  }

  return results;
}

export interface ProgressionFeedback {
  shouldIncreaseLoad: boolean;
  suggestedWeightKg: number;
  message: string;
}

/**
 * Aplica a regra de Dupla Progressão de Cargas (Double Progression).
 */
export function evaluateDoubleProgression(
  currentWeightKg: number,
  completedReps: number[],
  minReps: number,
  maxReps: number,
  isCompound: boolean
): ProgressionFeedback {
  if (completedReps.length === 0) {
    return { shouldIncreaseLoad: false, suggestedWeightKg: currentWeightKg, message: 'Nenhuma série registrada.' };
  }

  const allSetsHitMax = completedReps.every(reps => reps >= maxReps);

  if (allSetsHitMax) {
    const increment = isCompound ? 4 : 2; // +4kg para compostos, +2kg para isoladores
    const newWeight = currentWeightKg + increment;
    return {
      shouldIncreaseLoad: true,
      suggestedWeightKg: newWeight,
      message: `🏆 Excelente! Você bateu o teto de ${maxReps} reps em todas as séries. Aumente a carga para ${newWeight}kg no próximo treino e busque ${minReps} reps.`
    };
  }

  return {
    shouldIncreaseLoad: false,
    suggestedWeightKg: currentWeightKg,
    message: `Mantenha a carga de ${currentWeightKg}kg e busque atingir ${maxReps} reps em todas as séries antes de subir o peso.`
  };
}

/**
 * Calcula o gasto calórico real do treino por METs (Compêndio de Ainsworth).
 */
export function estimateWorkoutCalories(
  durationMinutes: number,
  weightKg: number,
  averageMets: number = 6.0
): number {
  const hours = durationMinutes / 60;
  return Math.round(averageMets * weightKg * hours);
}
