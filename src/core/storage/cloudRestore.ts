import { db } from './db';
import { WorkoutSessionLog, DailyFoodLog } from './types';
import {
  fetchProfileFromCloud,
  fetchMealPlansFromCloud,
  fetchRoutinesFromCloud,
  fetchWeightLogsFromCloud,
  fetchSessionLogsFromCloud,
  fetchCheckInLogsFromCloud,
  fetchFoodLogsFromCloud
} from '../supabase/supabaseClient';
import { isCloudSyncActive, getCloudUserId } from '../supabase/cloudSync';

/**
 * Restauração de dados da nuvem para o aparelho.
 *
 * Vive aqui, e não em `cloudSync.ts`, para evitar dependência circular:
 * `db.ts` importa o push de `cloudSync`, então `cloudSync` não pode importar
 * `db`. Este módulo é o único que conhece os dois lados.
 *
 * Antes disso existir, a sincronização era só de subida: um backup do qual não
 * se conseguia restaurar nada, e trocar de celular significava começar do zero
 * mesmo com os dados no servidor.
 */

export interface PullResult {
  perfilRestaurado: boolean;
  refeicoes: number;
  fichas: number;
  pesagens: number;
  treinos: number;
  checkIns: number;
  itensDiario: number;
  /** Mensagem pronta para exibir ao usuário. */
  resumo: string;
}

const RESULTADO_VAZIO: Omit<PullResult, 'resumo'> = {
  perfilRestaurado: false,
  refeicoes: 0,
  fichas: 0,
  pesagens: 0,
  treinos: 0,
  checkIns: 0,
  itensDiario: 0
};

/** O contêiner local está vazio? Decide se é seguro restaurar sem perguntar. */
export async function isLocalContainerEmpty(): Promise<boolean> {
  const [perfis, refeicoes, fichas, pesagens] = await Promise.all([
    db.profiles.count(),
    db.mealPlans.count(),
    db.routines.count(),
    db.weightLogs.count()
  ]);

  return perfis === 0 && refeicoes === 0 && fichas === 0 && pesagens === 0;
}

/**
 * Baixa os dados da nuvem e reconcilia com o banco local.
 *
 * Estratégia por natureza do dado:
 *
 * - Perfil, refeições e fichas são ESTADO ATUAL. Em `replace` a versão da nuvem
 *   substitui a local; em `merge` só entram se o local estiver vazio, para
 *   nunca descartar edição recente do usuário sem que ele peça.
 * - Pesagens, treinos, check-ins e diário são HISTÓRICO append-only: são unidos
 *   por chave natural (data, ou data + alimento + refeição) e o registro local
 *   vence em caso de empate, por ser a fonte mais recente.
 *
 * Nunca lança: o app é offline-first e falha de rede não pode quebrar nada.
 */
export async function pullFromCloud(mode: 'merge' | 'replace' = 'merge'): Promise<PullResult> {
  const userId = await getCloudUserId();
  if (!userId) {
    return {
      ...RESULTADO_VAZIO,
      resumo: 'Sincronização indisponível: entre com o Google para usar a nuvem.'
    };
  }

  const [perfil, refeicoes, fichas, pesagens, treinos, checkIns, diario] = await Promise.all([
    fetchProfileFromCloud(userId),
    fetchMealPlansFromCloud(userId),
    fetchRoutinesFromCloud(userId),
    fetchWeightLogsFromCloud(userId),
    fetchSessionLogsFromCloud(userId),
    fetchCheckInLogsFromCloud(userId),
    fetchFoodLogsFromCloud(userId)
  ]);

  const resultado: PullResult = { ...RESULTADO_VAZIO, resumo: '' };

  // --- Estado atual --------------------------------------------------------
  if (perfil && (mode === 'replace' || (await db.profiles.count()) === 0)) {
    await db.transaction('rw', db.profiles, async () => {
      await db.profiles.clear();
      await db.profiles.add(perfil);
    });
    resultado.perfilRestaurado = true;
  }

  if (refeicoes && refeicoes.length > 0) {
    if (mode === 'replace' || (await db.mealPlans.count()) === 0) {
      await db.transaction('rw', db.mealPlans, async () => {
        await db.mealPlans.clear();
        await db.mealPlans.bulkAdd(refeicoes);
      });
      resultado.refeicoes = refeicoes.length;
    }
  }

  if (fichas && fichas.length > 0) {
    if (mode === 'replace' || (await db.routines.count()) === 0) {
      await db.transaction('rw', db.routines, async () => {
        await db.routines.clear();
        await db.routines.bulkAdd(fichas);
      });
      resultado.fichas = fichas.length;
    }
  }

  // --- Histórico (união por chave natural) ---------------------------------
  if (pesagens && pesagens.length > 0) {
    const existentes = new Set((await db.weightLogs.toArray()).map((l) => l.date));
    const novos = pesagens.filter((l) => !existentes.has(l.date));
    if (novos.length > 0) {
      await db.weightLogs.bulkAdd(novos);
      resultado.pesagens = novos.length;
    }
  }

  if (treinos && treinos.length > 0) {
    // Data + nome da ficha: duas sessões no mesmo dia normalmente têm nomes
    // diferentes, e repetir a mesma ficha no mesmo dia é caso de borda raro.
    const chave = (l: WorkoutSessionLog) => `${l.date}|${l.name}`;
    const existentes = new Set((await db.sessionLogs.toArray()).map(chave));
    const novos = treinos.filter((l) => !existentes.has(chave(l)));
    if (novos.length > 0) {
      await db.sessionLogs.bulkAdd(novos);
      resultado.treinos = novos.length;
    }
  }

  if (checkIns && checkIns.length > 0) {
    const existentes = new Set((await db.checkInLogs.toArray()).map((l) => l.date));
    const novos = checkIns.filter((l) => !existentes.has(l.date));
    if (novos.length > 0) {
      await db.checkInLogs.bulkAdd(novos);
      resultado.checkIns = novos.length;
    }
  }

  if (diario && diario.length > 0) {
    const chave = (l: DailyFoodLog) => `${l.date}|${l.foodId}|${l.mealOrder}`;
    const existentes = new Set((await db.foodLogs.toArray()).map(chave));
    const novos = diario.filter((l) => !existentes.has(chave(l)));
    if (novos.length > 0) {
      await db.foodLogs.bulkAdd(novos);
      resultado.itensDiario = novos.length;
    }
  }

  const partes: string[] = [];
  if (resultado.perfilRestaurado) partes.push('perfil');
  if (resultado.refeicoes > 0) partes.push(`${resultado.refeicoes} refeições`);
  if (resultado.fichas > 0) partes.push(`${resultado.fichas} fichas de treino`);
  if (resultado.pesagens > 0) partes.push(`${resultado.pesagens} pesagens`);
  if (resultado.treinos > 0) partes.push(`${resultado.treinos} treinos`);
  if (resultado.checkIns > 0) partes.push(`${resultado.checkIns} check-ins`);
  if (resultado.itensDiario > 0) partes.push(`${resultado.itensDiario} itens do diário`);

  resultado.resumo =
    partes.length === 0
      ? 'Nada novo para restaurar: seus dados locais já estão atualizados.'
      : `Restaurado da nuvem: ${partes.join(', ')}.`;

  return resultado;
}

/**
 * Restauração automática no login: age somente quando o aparelho está vazio.
 * É o cenário "troquei de celular" — e por ser silenciosa, nunca sobrescreve
 * nada que já exista localmente.
 */
export async function pullIfLocalEmpty(): Promise<PullResult | null> {
  try {
    if (!(await isCloudSyncActive())) return null;
    if (!(await isLocalContainerEmpty())) return null;

    return await pullFromCloud('merge');
  } catch (err) {
    console.warn('Falha na restauração automática da nuvem:', err);
    return null;
  }
}
