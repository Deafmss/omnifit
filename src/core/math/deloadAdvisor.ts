import { WorkoutSessionLog } from '../storage/types';
import { MuscleAuditResult } from './trainingEngine';

/**
 * Recomendação de semana de descarga (deload).
 *
 * O app já calculava o teto recuperável (MRV) de cada grupo muscular no auditor
 * de volume, mas nunca avisava quando o usuário passava desse teto nem quando
 * acumulava semanas seguidas de treino sem alívio. A informação existia e ficava
 * parada.
 *
 * Funções puras: recebem a auditoria e o histórico, devolvem a recomendação.
 */

export type DeloadUrgency = 'nenhuma' | 'atencao' | 'recomendado';

export interface DeloadRecommendation {
  urgency: DeloadUrgency;
  /** Grupos musculares acima do teto recuperável. */
  overMrvMuscles: string[];
  /** Semanas consecutivas com treino registrado, sem semana leve. */
  consecutiveWeeks: number;
  /** Frase curta com o motivo, para exibir ao usuário. */
  reason: string;
  /** O que fazer na prática, se houver recomendação. */
  advice: string;
}

/** Semanas de treino acumuladas sem uma semana leve pelo caminho. */
const WEEKS_BEFORE_ATTENTION = 6;
const WEEKS_BEFORE_DELOAD = 8;

/**
 * Uma semana conta como "leve" quando tem no máximo este número de sessões.
 * Semanas assim já funcionam como alívio, então zeram a contagem.
 */
const LIGHT_WEEK_MAX_SESSIONS = 1;

/** Chave ISO da semana (ano + número da semana) para agrupar as sessões. */
function weekKey(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);

  // Quinta-feira da semana corrente define o ano ISO.
  const thursday = new Date(date.getTime());
  thursday.setDate(date.getDate() - ((date.getDay() + 6) % 7) + 3);

  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);

  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return `${thursday.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Conta as semanas consecutivas de treino "cheio" terminando na mais recente.
 *
 * Semanas sem nenhuma sessão interrompem a contagem — foram descanso, mesmo que
 * não planejado. Semanas com uma sessão só também contam como alívio.
 */
export function countConsecutiveTrainingWeeks(sessions: WorkoutSessionLog[]): number {
  const concluidas = sessions.filter((s) => s.completed);
  if (concluidas.length === 0) return 0;

  const porSemana = new Map<string, number>();
  for (const session of concluidas) {
    const key = weekKey(session.date);
    porSemana.set(key, (porSemana.get(key) || 0) + 1);
  }

  const semanas = Array.from(porSemana.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  let consecutivas = 0;
  let esperada: string | null = null;

  for (const [key, total] of semanas) {
    // Lacuna entre semanas: houve pausa, a sequência quebra.
    if (esperada !== null && key !== esperada) break;

    if (total <= LIGHT_WEEK_MAX_SESSIONS) break;

    consecutivas += 1;
    esperada = previousWeekKey(key);
  }

  return consecutivas;
}

/** Chave da semana anterior à informada. */
function previousWeekKey(key: string): string {
  const [yearPart, weekPart] = key.split('-W');
  const year = Number(yearPart);
  const week = Number(weekPart);

  if (week > 1) return `${year}-W${String(week - 1).padStart(2, '0')}`;

  // Primeira semana do ano: volta para a última do ano anterior (52 ou 53).
  const dec28 = new Date(year - 1, 11, 28);
  return weekKey(
    `${dec28.getFullYear()}-${String(dec28.getMonth() + 1).padStart(2, '0')}-${String(dec28.getDate()).padStart(2, '0')}`
  );
}

/**
 * Avalia se é hora de uma semana de descarga.
 *
 * Dois sinais independentes: volume acima do teto recuperável em algum grupo, e
 * semanas seguidas de treino sem alívio. A recomendação é conservadora — sugere,
 * nunca afirma que o usuário está sobretreinado, porque isso depende de sono,
 * alimentação e estresse, que o app não mede.
 */
export function evaluateDeloadNeed(
  audit: MuscleAuditResult[],
  sessions: WorkoutSessionLog[]
): DeloadRecommendation {
  const overMrvMuscles = audit.filter((a) => a.status === 'over').map((a) => a.muscleLabel);
  const consecutiveWeeks = countConsecutiveTrainingWeeks(sessions);

  const volumeAlto = overMrvMuscles.length > 0;
  const muitoTempo = consecutiveWeeks >= WEEKS_BEFORE_DELOAD;
  const chegandoLa = consecutiveWeeks >= WEEKS_BEFORE_ATTENTION;

  if (volumeAlto && (chegandoLa || overMrvMuscles.length >= 3)) {
    return {
      urgency: 'recomendado',
      overMrvMuscles,
      consecutiveWeeks,
      reason:
        overMrvMuscles.length >= 3
          ? `${overMrvMuscles.length} grupos musculares estão acima do teto recuperável.`
          : `Volume acima do teto em ${overMrvMuscles.join(', ')} somado a ${consecutiveWeeks} semanas seguidas de treino.`,
      advice:
        'Considere uma semana de descarga: mantenha os mesmos exercícios, reduza as séries à metade e as cargas em torno de 10%. A força volta acima do ponto anterior.'
    };
  }

  if (muitoTempo) {
    return {
      urgency: 'recomendado',
      overMrvMuscles,
      consecutiveWeeks,
      reason: `${consecutiveWeeks} semanas seguidas de treino sem uma semana leve.`,
      advice:
        'Uma semana de descarga a cada 6 a 8 semanas ajuda a recuperar articulações e sistema nervoso. Reduza as séries à metade e mantenha as cargas próximas.'
    };
  }

  if (volumeAlto) {
    return {
      urgency: 'atencao',
      overMrvMuscles,
      consecutiveWeeks,
      reason: `Volume acima do teto recuperável em ${overMrvMuscles.join(', ')}.`,
      advice:
        'Reduza algumas séries desse grupo ou observe a recuperação nas próximas sessões. Se a carga parar de subir, é sinal de descarga.'
    };
  }

  if (chegandoLa) {
    return {
      urgency: 'atencao',
      overMrvMuscles,
      consecutiveWeeks,
      reason: `${consecutiveWeeks} semanas seguidas de treino.`,
      advice: 'Planeje uma semana de descarga nas próximas duas semanas.'
    };
  }

  return {
    urgency: 'nenhuma',
    overMrvMuscles,
    consecutiveWeeks,
    reason:
      consecutiveWeeks > 0
        ? `${consecutiveWeeks} ${consecutiveWeeks === 1 ? 'semana' : 'semanas'} de treino, volume dentro da faixa recuperável.`
        : 'Sem histórico suficiente para avaliar a necessidade de descarga.',
    advice: ''
  };
}
