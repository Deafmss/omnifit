/**
 * Utilitários de data com base no fuso horário LOCAL do dispositivo.
 *
 * IMPORTANTE: nunca use `new Date().toISOString().split('T')[0]` para obter "hoje".
 * O `toISOString()` converte para UTC, então no Brasil (UTC-3) tudo que acontece
 * entre 21h e meia-noite é registrado no dia seguinte.
 */

/**
 * Retorna a data local no formato YYYY-MM-DD.
 */
export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Atalho para a data de hoje no fuso local (YYYY-MM-DD).
 */
export function todayLocal(): string {
  return toLocalDateString(new Date());
}

/**
 * Retorna o prefixo do mês local no formato YYYY-MM.
 */
export function currentMonthPrefix(date: Date = new Date()): string {
  return toLocalDateString(date).slice(0, 7);
}

/**
 * Converte uma string YYYY-MM-DD em Date à meia-noite LOCAL.
 * `new Date('2026-08-19')` seria interpretado como UTC, deslocando o dia.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

/**
 * Retorna a segunda-feira da semana da data informada (segunda = início da semana).
 */
export function startOfWeekMonday(date: Date = new Date()): Date {
  const distanceToMonday = (date.getDay() + 6) % 7;
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - distanceToMonday);
  return monday;
}

/**
 * Soma dias a uma data, devolvendo uma nova instância.
 */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Diferença em dias inteiros entre duas datas YYYY-MM-DD (b - a).
 */
export function daysBetween(fromDateStr: string, toDateStr: string): number {
  const from = parseLocalDate(fromDateStr);
  const to = parseLocalDate(toDateStr);
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

/**
 * Formata YYYY-MM-DD para o padrão brasileiro DD/MM.
 */
export function formatDayMonthBR(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  if (!month || !day) return dateStr;
  return `${day}/${month}`;
}
