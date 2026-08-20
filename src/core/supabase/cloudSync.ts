import { supabase } from './supabaseClient';
import {
  syncProfileToCloud,
  syncMealPlansToCloud,
  syncRoutinesToCloud,
  syncSessionLogToCloud,
  syncWeightLogToCloud,
  syncCheckInLogToCloud,
  syncFoodLogsToCloud
} from './supabaseClient';
import { WorkoutSessionLog, WeightLog, CheckInLog, DailyFoodLog } from '../storage/types';

/**
 * Ponte entre o banco local e a nuvem.
 *
 * As funções de sincronização existiam mas nunca eram chamadas por ninguém —
 * o SDK do Supabase entrava no bundle sem uso. Aqui elas são acionadas de
 * verdade, sempre respeitando duas regras:
 *
 * 1. Só sincroniza quando há sessão do Supabase Auth. As políticas RLS usam
 *    `auth.uid()`, que é NULL para contas puramente locais — sem sessão, toda
 *    escrita seria rejeitada pelo servidor.
 * 2. Nunca bloqueia nem quebra o fluxo local. O app é offline-first: falha de
 *    rede apenas registra um aviso no console.
 */

/** Id do usuário autenticado na nuvem, ou null se a sincronização não se aplica. */
export async function getCloudUserId(): Promise<string | null> {
  if (!supabase) return null;

  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id || null;
  } catch {
    return null;
  }
}

/** Debounce por chave, para não disparar uma escrita de rede por tecla digitada. */
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleSync(key: string, task: () => Promise<void>, delayMs = 2500): void {
  const existing = pendingTimers.get(key);
  if (existing) clearTimeout(existing);

  pendingTimers.set(
    key,
    setTimeout(() => {
      pendingTimers.delete(key);
      void task().catch((err) => console.warn(`Sincronização (${key}) falhou:`, err));
    }, delayMs)
  );
}

export async function pushProfile(profile: Parameters<typeof syncProfileToCloud>[1]): Promise<void> {
  const userId = await getCloudUserId();
  if (!userId) return;
  scheduleSync('profile', () => syncProfileToCloud(userId, profile));
}

export async function pushMealPlans(mealPlans: Parameters<typeof syncMealPlansToCloud>[1]): Promise<void> {
  const userId = await getCloudUserId();
  if (!userId) return;
  scheduleSync('mealPlans', () => syncMealPlansToCloud(userId, mealPlans));
}

export async function pushRoutines(routines: Parameters<typeof syncRoutinesToCloud>[1]): Promise<void> {
  const userId = await getCloudUserId();
  if (!userId) return;
  scheduleSync('routines', () => syncRoutinesToCloud(userId, routines));
}

/** Logs são append-only: vão imediatamente, sem debounce. */
export async function pushSessionLog(log: WorkoutSessionLog): Promise<void> {
  const userId = await getCloudUserId();
  if (!userId) return;
  await syncSessionLogToCloud(userId, log);
}

export async function pushWeightLog(log: WeightLog): Promise<void> {
  const userId = await getCloudUserId();
  if (!userId) return;
  await syncWeightLogToCloud(userId, log);
}

export async function pushCheckInLog(log: CheckInLog): Promise<void> {
  const userId = await getCloudUserId();
  if (!userId) return;
  await syncCheckInLogToCloud(userId, log);
}

/** A sincronização com a nuvem está ativa para o usuário atual? */
export async function isCloudSyncActive(): Promise<boolean> {
  return (await getCloudUserId()) !== null;
}

export async function pushFoodLogs(logs: DailyFoodLog[]): Promise<void> {
  const userId = await getCloudUserId();
  if (!userId) return;
  scheduleSync('foodLogs', () => syncFoodLogsToCloud(userId, logs));
}
