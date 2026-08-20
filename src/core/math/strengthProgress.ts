import { WorkoutSessionLog } from '../storage/types';

/**
 * Progressão de força e recordes pessoais, derivados dos logs de treino.
 *
 * Os dados já existiam: cada `WorkoutSessionLog` guarda peso e repetições de
 * toda série executada. Faltava apenas ler — o app registrava tudo e não
 * mostrava nada além do volume total.
 *
 * Funções puras: recebem os logs e devolvem os agregados, sem tocar no banco.
 */

export interface ExerciseSessionPoint {
  date: string;
  /** Maior carga de trabalho da sessão (kg). */
  topWeightKg: number;
  /** Somatório de peso × repetições das séries concluídas. */
  volumeKg: number;
  /** Repetições feitas na série de maior carga. */
  topSetReps: number;
  /** Carga estimada para 1 repetição máxima (fórmula de Epley). */
  estimated1RmKg: number;
  completedSets: number;
}

export interface ExerciseProgress {
  exerciseId: string;
  points: ExerciseSessionPoint[];
  /** Recorde de carga em uma única série. */
  bestWeightKg: number;
  /** Recorde de volume em uma única sessão. */
  bestSessionVolumeKg: number;
  /** Melhor 1RM estimado. */
  best1RmKg: number;
  /** Variação percentual da carga entre a primeira e a última sessão. */
  weightChangePercent: number;
  /** Tendência das últimas sessões. */
  trend: 'subindo' | 'estavel' | 'caindo' | 'insuficiente';
}

export interface PersonalRecord {
  exerciseId: string;
  type: 'weight' | 'volume' | 'estimated1rm';
  value: number;
  date: string;
  /** Valor anterior superado, quando havia um. */
  previousValue?: number;
}

/**
 * 1RM estimado pela fórmula de Epley: peso × (1 + reps/30).
 *
 * É uma estimativa e perde precisão acima de ~10 repetições — serve para
 * comparar o próprio progresso ao longo do tempo, não para prescrever uma
 * tentativa de carga máxima.
 */
export function estimate1Rm(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return Number((weightKg * (1 + reps / 30)).toFixed(1));
}

/** Extrai a série histórica de um exercício a partir das sessões concluídas. */
export function buildExerciseProgress(
  sessions: WorkoutSessionLog[],
  exerciseId: string
): ExerciseProgress {
  const points: ExerciseSessionPoint[] = [];

  const ordenadas = sessions
    .filter((s) => s.completed)
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const session of ordenadas) {
    const log = (session.exerciseLogs || []).find((e) => e.exerciseId === exerciseId);
    if (!log) continue;

    const concluidas = log.sets.filter((s) => s.completed);
    if (concluidas.length === 0) continue;

    let topWeightKg = 0;
    let topSetReps = 0;
    let volumeKg = 0;

    for (const set of concluidas) {
      const peso = Number(set.weightKg) || 0;
      const reps = Number(set.reps) || 0;

      volumeKg += peso * reps;

      // Empate de carga: fica com a série que fez mais repetições.
      if (peso > topWeightKg || (peso === topWeightKg && reps > topSetReps)) {
        topWeightKg = peso;
        topSetReps = reps;
      }
    }

    if (topWeightKg <= 0) continue;

    points.push({
      date: session.date,
      topWeightKg,
      topSetReps,
      volumeKg: Math.round(volumeKg),
      estimated1RmKg: estimate1Rm(topWeightKg, topSetReps),
      completedSets: concluidas.length
    });
  }

  const bestWeightKg = points.reduce((max, p) => Math.max(max, p.topWeightKg), 0);
  const bestSessionVolumeKg = points.reduce((max, p) => Math.max(max, p.volumeKg), 0);
  const best1RmKg = points.reduce((max, p) => Math.max(max, p.estimated1RmKg), 0);

  const primeiro = points[0];
  const ultimo = points[points.length - 1];

  const weightChangePercent =
    primeiro && ultimo && primeiro.topWeightKg > 0
      ? Number((((ultimo.topWeightKg - primeiro.topWeightKg) / primeiro.topWeightKg) * 100).toFixed(1))
      : 0;

  return {
    exerciseId,
    points,
    bestWeightKg,
    bestSessionVolumeKg,
    best1RmKg,
    weightChangePercent,
    trend: calculateTrend(points)
  };
}

/**
 * Tendência das últimas sessões, comparando a média da metade recente com a
 * da metade anterior. Precisa de pelo menos 3 sessões: com menos, uma variação
 * qualquer viraria "tendência" sem base.
 */
function calculateTrend(points: ExerciseSessionPoint[]): ExerciseProgress['trend'] {
  if (points.length < 3) return 'insuficiente';

  const recentes = points.slice(-3);
  const anteriores = points.slice(0, -3);

  if (anteriores.length === 0) {
    const primeiro = recentes[0].topWeightKg;
    const ultimo = recentes[recentes.length - 1].topWeightKg;
    if (ultimo > primeiro) return 'subindo';
    if (ultimo < primeiro) return 'caindo';
    return 'estavel';
  }

  const media = (lista: ExerciseSessionPoint[]) =>
    lista.reduce((acc, p) => acc + p.topWeightKg, 0) / lista.length;

  const mediaRecente = media(recentes);
  const mediaAnterior = media(anteriores);
  const variacao = (mediaRecente - mediaAnterior) / mediaAnterior;

  // Margem de 2% para não chamar ruído de tendência.
  if (variacao > 0.02) return 'subindo';
  if (variacao < -0.02) return 'caindo';
  return 'estavel';
}

/** Todos os exercícios com histórico, do mais treinado para o menos. */
export function listTrainedExercises(sessions: WorkoutSessionLog[]): { exerciseId: string; sessions: number }[] {
  const contagem = new Map<string, number>();

  for (const session of sessions) {
    if (!session.completed) continue;

    for (const log of session.exerciseLogs || []) {
      if (!log.sets.some((s) => s.completed)) continue;
      contagem.set(log.exerciseId, (contagem.get(log.exerciseId) || 0) + 1);
    }
  }

  return Array.from(contagem.entries())
    .map(([exerciseId, count]) => ({ exerciseId, sessions: count }))
    .sort((a, b) => b.sessions - a.sessions);
}

/**
 * Recordes batidos numa sessão específica, comparando com todo o histórico
 * anterior a ela.
 *
 * Só conta como recorde se havia histórico antes: a primeira execução de um
 * exercício não é "recorde", é o ponto de partida.
 */
export function detectPersonalRecords(
  sessions: WorkoutSessionLog[],
  targetSession: WorkoutSessionLog
): PersonalRecord[] {
  const records: PersonalRecord[] = [];

  const anteriores = sessions.filter(
    (s) => s.completed && s.date < targetSession.date
  );

  for (const log of targetSession.exerciseLogs || []) {
    const concluidas = log.sets.filter((s) => s.completed);
    if (concluidas.length === 0) continue;

    const atual = buildExerciseProgress([targetSession], log.exerciseId);
    if (atual.points.length === 0) continue;

    const historico = buildExerciseProgress(anteriores, log.exerciseId);

    // Sem histórico anterior não há recorde a bater.
    if (historico.points.length === 0) continue;

    if (atual.bestWeightKg > historico.bestWeightKg) {
      records.push({
        exerciseId: log.exerciseId,
        type: 'weight',
        value: atual.bestWeightKg,
        date: targetSession.date,
        previousValue: historico.bestWeightKg
      });
    }

    if (atual.bestSessionVolumeKg > historico.bestSessionVolumeKg) {
      records.push({
        exerciseId: log.exerciseId,
        type: 'volume',
        value: atual.bestSessionVolumeKg,
        date: targetSession.date,
        previousValue: historico.bestSessionVolumeKg
      });
    }

    if (atual.best1RmKg > historico.best1RmKg) {
      records.push({
        exerciseId: log.exerciseId,
        type: 'estimated1rm',
        value: atual.best1RmKg,
        date: targetSession.date,
        previousValue: historico.best1RmKg
      });
    }
  }

  return records;
}

/** Melhores marcas de cada exercício, para o quadro de recordes. */
export function collectAllTimeRecords(sessions: WorkoutSessionLog[]): PersonalRecord[] {
  const records: PersonalRecord[] = [];

  for (const { exerciseId } of listTrainedExercises(sessions)) {
    const progresso = buildExerciseProgress(sessions, exerciseId);
    if (progresso.points.length === 0) continue;

    const melhorPonto = progresso.points.reduce((melhor, p) =>
      p.topWeightKg > melhor.topWeightKg ? p : melhor
    );

    records.push({
      exerciseId,
      type: 'weight',
      value: progresso.bestWeightKg,
      date: melhorPonto.date
    });
  }

  return records.sort((a, b) => b.value - a.value);
}
