import { describe, it, expect } from 'vitest';
import {
  toLocalDateString,
  parseLocalDate,
  startOfWeekMonday,
  addDays,
  daysBetween,
  formatDayMonthBR,
  currentMonthPrefix
} from '../dateUtils';

describe('Utilitários de data no fuso local', () => {
  it('deve formatar a data usando o fuso LOCAL, não UTC', () => {
    // 19/08/2026 às 22h locais. Em UTC-3 isto é 20/08 em UTC, e o
    // `toISOString().split('T')[0]` retornaria o dia seguinte — a causa de
    // treinos noturnos serem registrados na data errada.
    const lateNight = new Date(2026, 7, 19, 22, 30, 0);
    expect(toLocalDateString(lateNight)).toBe('2026-08-19');
  });

  it('deve formatar corretamente a virada de mês e de ano', () => {
    expect(toLocalDateString(new Date(2026, 0, 1, 1, 0))).toBe('2026-01-01');
    expect(toLocalDateString(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });

  it('deve interpretar YYYY-MM-DD como meia-noite local', () => {
    const parsed = parseLocalDate('2026-08-19');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(7); // agosto
    expect(parsed.getDate()).toBe(19);
  });

  it('deve encontrar a segunda-feira da semana para qualquer dia', () => {
    // 2026-08-19 é uma quarta-feira; a segunda é 2026-08-17.
    expect(toLocalDateString(startOfWeekMonday(new Date(2026, 7, 19)))).toBe('2026-08-17');

    // Domingo pertence à semana que começou na segunda anterior.
    expect(toLocalDateString(startOfWeekMonday(new Date(2026, 7, 23)))).toBe('2026-08-17');

    // Na própria segunda, devolve o mesmo dia.
    expect(toLocalDateString(startOfWeekMonday(new Date(2026, 7, 17)))).toBe('2026-08-17');
  });

  it('deve somar dias atravessando o limite do mês', () => {
    expect(toLocalDateString(addDays(new Date(2026, 7, 30), 3))).toBe('2026-09-02');
    expect(toLocalDateString(addDays(new Date(2026, 7, 2), -3))).toBe('2026-07-30');
  });

  it('deve contar dias inteiros entre duas datas', () => {
    expect(daysBetween('2026-08-01', '2026-08-08')).toBe(7);
    expect(daysBetween('2026-08-19', '2026-08-19')).toBe(0);
    expect(daysBetween('2026-02-26', '2026-03-05')).toBe(7);
    // Ordem invertida devolve negativo.
    expect(daysBetween('2026-08-08', '2026-08-01')).toBe(-7);
  });

  it('deve formatar a data no padrão brasileiro DD/MM', () => {
    // 2026-05-11 é 11 de maio. O formato antigo produzia "05/11", lido como
    // 5 de novembro por qualquer usuário brasileiro.
    expect(formatDayMonthBR('2026-05-11')).toBe('11/05');
    expect(formatDayMonthBR('2026-12-31')).toBe('31/12');
  });

  it('deve devolver o prefixo do mês local', () => {
    expect(currentMonthPrefix(new Date(2026, 7, 19, 23, 30))).toBe('2026-08');
    expect(currentMonthPrefix(new Date(2026, 0, 31, 22, 0))).toBe('2026-01');
  });
});
