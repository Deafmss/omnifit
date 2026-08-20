/**
 * Exportação e importação do banco local do usuário ativo.
 *
 * O app é local-first: todo o histórico vive no IndexedDB deste navegador.
 * Limpar os dados do site, trocar de aparelho ou uma aba corrompida apagam
 * meses de pesagens, sessões e check-ins sem nenhuma forma de recuperação.
 * Este módulo é a única saída de dados que não depende de login na nuvem.
 */
import type { Table } from 'dexie';
import { db } from '../storage/db';
import {
  UserProfile,
  MealPlan,
  FoodItem,
  WorkoutRoutine,
  WorkoutSessionLog,
  WeightLog,
  CheckInLog,
  DailyThermogenicLog
} from '../storage/types';
import { todayLocal } from '../utils/dateUtils';

/**
 * Versão do formato do arquivo de backup.
 *
 * É independente da versão do schema do Dexie: só precisa mudar quando o
 * formato do ARQUIVO deixar de ser legível por esta função de importação.
 */
export const BACKUP_SCHEMA_VERSION = 1;

/** Versão do app gravada no arquivo, espelhando o package.json. */
export const BACKUP_APP_VERSION = '1.0.0';

/**
 * Tabelas exportadas, na ordem em que são gravadas.
 * Toda tabela nova do db.ts precisa entrar aqui, senão o backup fica silenciosamente incompleto.
 */
export const BACKUP_TABLES = [
  'profiles',
  'mealPlans',
  'customFoods',
  'routines',
  'sessionLogs',
  'weightLogs',
  'checkInLogs',
  'thermogenicLogs'
] as const;

export type BackupTableName = (typeof BACKUP_TABLES)[number];

export interface BackupData {
  profiles: UserProfile[];
  mealPlans: MealPlan[];
  customFoods: FoodItem[];
  routines: WorkoutRoutine[];
  sessionLogs: WorkoutSessionLog[];
  weightLogs: WeightLog[];
  checkInLogs: CheckInLog[];
  thermogenicLogs: DailyThermogenicLog[];
}

export interface UserDataBackup {
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  data: BackupData;
}

export type ImportMode = 'replace' | 'merge';

export interface ImportResult {
  mode: ImportMode;
  /** Quantos registros foram efetivamente gravados por tabela. */
  imported: Record<BackupTableName, number>;
}

/**
 * Lê todas as tabelas do usuário ativo e monta o objeto de backup.
 */
export async function exportUserData(): Promise<UserDataBackup> {
  const [
    profiles,
    mealPlans,
    customFoods,
    routines,
    sessionLogs,
    weightLogs,
    checkInLogs,
    thermogenicLogs
  ] = await Promise.all([
    db.profiles.toArray(),
    db.mealPlans.toArray(),
    db.customFoods.toArray(),
    db.routines.toArray(),
    db.sessionLogs.toArray(),
    db.weightLogs.toArray(),
    db.checkInLogs.toArray(),
    db.thermogenicLogs.toArray()
  ]);

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: BACKUP_APP_VERSION,
    data: {
      profiles,
      mealPlans,
      customFoods,
      routines,
      sessionLogs,
      weightLogs,
      checkInLogs,
      thermogenicLogs
    }
  };
}

/**
 * Nome do arquivo de backup com a data LOCAL (nunca UTC: um backup feito às
 * 22h no Brasil ficaria datado do dia seguinte).
 */
export function backupFileName(): string {
  return `omnifit-backup-${todayLocal()}.json`;
}

/**
 * Gera o arquivo de backup e entrega ao navegador. Devolve o nome usado para
 * que a interface possa dizer ao usuário o que procurar na pasta de downloads.
 */
export async function downloadUserDataBackup(): Promise<string> {
  const backup = await exportUserData();
  const fileName = backupFileName();

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Revogar na mesma tarefa cancela o download em parte dos navegadores;
  // o atraso dá tempo de eles lerem o blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return fileName;
}

/**
 * Valida a estrutura do arquivo antes de qualquer escrita.
 *
 * Toda rejeição acontece AQUI, fora da transação: um arquivo estranho nunca
 * chega a encostar no banco.
 */
export function parseUserDataBackup(json: unknown): UserDataBackup {
  let raw: unknown = json;

  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      throw new Error('Arquivo de backup inválido: o conteúdo não é um JSON válido.');
    }
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Arquivo de backup inválido: era esperado um objeto de backup do OmniFit.');
  }

  const candidate = raw as Record<string, unknown>;

  if (typeof candidate.schemaVersion !== 'number' || !Number.isFinite(candidate.schemaVersion)) {
    throw new Error('Arquivo de backup inválido: a versão do formato (schemaVersion) está ausente.');
  }

  if (candidate.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error(
      `Versão de backup não suportada (${candidate.schemaVersion}). Esta versão do app lê apenas o formato ${BACKUP_SCHEMA_VERSION}.`
    );
  }

  const data = candidate.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Arquivo de backup inválido: o bloco "data" está ausente ou corrompido.');
  }

  const tables = data as Record<string, unknown>;

  for (const name of BACKUP_TABLES) {
    const rows = tables[name];

    if (rows === undefined || rows === null) {
      throw new Error(`Arquivo de backup incompleto: a tabela "${name}" está ausente.`);
    }

    if (!Array.isArray(rows)) {
      throw new Error(`Arquivo de backup inválido: a tabela "${name}" deveria ser uma lista de registros.`);
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error(
          `Arquivo de backup inválido: o registro ${i + 1} da tabela "${name}" não é um objeto.`
        );
      }
    }
  }

  return {
    schemaVersion: candidate.schemaVersion,
    exportedAt: typeof candidate.exportedAt === 'string' ? candidate.exportedAt : '',
    appVersion: typeof candidate.appVersion === 'string' ? candidate.appVersion : '',
    data: tables as unknown as BackupData
  };
}

type AnyRow = Record<string, unknown>;

/**
 * Acrescenta registros sem apagar nada do que já existe.
 *
 * Para as tabelas de chave auto-incremental o `id` do arquivo é descartado:
 * mantê-lo sobrescreveria registros atuais que por coincidência tenham o mesmo
 * número. `customFoods` usa id textual próprio, que identifica o alimento — aí
 * um id repetido é o MESMO alimento e simplesmente é ignorado.
 */
async function mergeRows(table: Table<AnyRow, unknown>, name: BackupTableName, rows: AnyRow[]): Promise<number> {
  if (rows.length === 0) return 0;

  if (name === 'customFoods') {
    const existentes = new Set((await table.toCollection().primaryKeys()) as unknown[]);
    const novos = rows.filter((row) => !existentes.has(row.id));
    if (novos.length > 0) await table.bulkAdd(novos);
    return novos.length;
  }

  const semId = rows.map((row) => {
    const { id: _ignorado, ...resto } = row;
    return resto;
  });

  await table.bulkAdd(semId);
  return semId.length;
}

/**
 * Restaura um backup.
 *
 * - 'replace': zera as tabelas e regrava o arquivo preservando os ids originais.
 * - 'merge': acrescenta os registros do arquivo aos que já existem.
 *
 * Tudo roda numa única transação do Dexie: se qualquer tabela falhar no meio,
 * o banco volta ao estado anterior em vez de ficar meio restaurado.
 */
export async function importUserData(json: unknown, mode: ImportMode = 'replace'): Promise<ImportResult> {
  if (mode !== 'replace' && mode !== 'merge') {
    throw new Error(`Modo de importação desconhecido: "${String(mode)}".`);
  }

  const backup = parseUserDataBackup(json);

  const imported = {} as Record<BackupTableName, number>;
  const tables = BACKUP_TABLES.map((name) => db[name] as unknown as Table<AnyRow, unknown>);

  await db.transaction('rw', tables, async () => {
    for (let i = 0; i < BACKUP_TABLES.length; i++) {
      const name = BACKUP_TABLES[i];
      const table = tables[i];
      const rows = (backup.data[name] || []) as unknown as AnyRow[];

      if (mode === 'replace') {
        await table.clear();
        // bulkPut (e não bulkAdd) porque o arquivo pode conter ids repetidos
        // de exportações concatenadas à mão; o último vence em vez de abortar.
        if (rows.length > 0) await table.bulkPut(rows);
        imported[name] = rows.length;
      } else {
        imported[name] = await mergeRows(table, name, rows);
      }
    }
  });

  return { mode, imported };
}
