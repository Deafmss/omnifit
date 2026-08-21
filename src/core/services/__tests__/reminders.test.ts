import { describe, it, expect } from 'vitest';
import {
  collectDueReminders,
  parseReminderSettings,
  parseTimeToMinutes,
  DEFAULT_REMINDER_SETTINGS,
  ReminderSettings,
  ReminderContext
} from '../reminders';

const settings: ReminderSettings = {
  waterEnabled: true,
  waterIntervalMin: 120,
  waterStartHour: 8,
  waterEndHour: 22,
  mealsEnabled: true,
  workoutEnabled: true,
  workoutTime: '18:00'
};

const context: ReminderContext = {
  meals: [
    { name: 'Café da manhã', timeLabel: '07:00', done: false },
    { name: 'Almoço', timeLabel: '12:00', done: false },
    { name: 'Jantar', timeLabel: '20:00', done: false }
  ],
  workoutName: 'Treino A — Empurrar',
  workoutDone: false,
  waterMl: 500,
  waterTargetMl: 3000
};

/** Data local fixa, para não depender do fuso do runner. */
function em(hora: number, minuto = 0): Date {
  return new Date(2026, 7, 20, hora, minuto, 0);
}

describe('parseTimeToMinutes', () => {
  it('deve converter horários válidos', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('07:30')).toBe(450);
    expect(parseTimeToMinutes('23:59')).toBe(1439);
    expect(parseTimeToMinutes(' 8:05 ')).toBe(485);
  });

  it('deve rejeitar horários inválidos', () => {
    expect(parseTimeToMinutes('24:00')).toBeNull();
    expect(parseTimeToMinutes('12:60')).toBeNull();
    expect(parseTimeToMinutes('meio-dia')).toBeNull();
    expect(parseTimeToMinutes('')).toBeNull();
  });
});

describe('parseReminderSettings', () => {
  it('deve usar o padrão quando não há nada gravado', () => {
    expect(parseReminderSettings(null)).toEqual(DEFAULT_REMINDER_SETTINGS);
  });

  it('deve usar o padrão quando o JSON está corrompido', () => {
    expect(parseReminderSettings('{isso nao e json')).toEqual(DEFAULT_REMINDER_SETTINGS);
  });

  it('deve limitar valores fora de faixa em vez de aceitá-los', () => {
    const lido = parseReminderSettings(
      JSON.stringify({ waterIntervalMin: 5, waterStartHour: -3, waterEndHour: 99 })
    );

    expect(lido.waterIntervalMin).toBe(30);
    expect(lido.waterStartHour).toBe(0);
    expect(lido.waterEndHour).toBe(23);
  });

  it('deve descartar horário de treino inválido', () => {
    const lido = parseReminderSettings(JSON.stringify({ workoutTime: '99:99' }));
    expect(lido.workoutTime).toBe(DEFAULT_REMINDER_SETTINGS.workoutTime);
  });
});

describe('Lembretes de água', () => {
  it('deve avisar dentro da janela ativa', () => {
    const devidos = collectDueReminders(settings, context, em(10), new Set());
    expect(devidos.some((r) => r.kind === 'water')).toBe(true);
  });

  it('não deve avisar antes do horário de início', () => {
    const devidos = collectDueReminders(settings, context, em(6), new Set());
    expect(devidos.some((r) => r.kind === 'water')).toBe(false);
  });

  it('não deve avisar depois do horário final', () => {
    const devidos = collectDueReminders(settings, context, em(23), new Set());
    expect(devidos.some((r) => r.kind === 'water')).toBe(false);
  });

  it('não deve avisar quando a meta já foi batida', () => {
    const batida = { ...context, waterMl: 3200 };
    const devidos = collectDueReminders(settings, batida, em(10), new Set());
    expect(devidos.some((r) => r.kind === 'water')).toBe(false);
  });

  it('não deve repetir o mesmo slot de intervalo', () => {
    const primeiro = collectDueReminders(settings, context, em(10), new Set());
    const chave = primeiro.find((r) => r.kind === 'water')!.fireKey;

    // Meia hora depois, ainda dentro do mesmo slot de 2 h: nada de novo.
    const segundo = collectDueReminders(settings, context, em(10, 30), new Set([chave]));
    expect(segundo.some((r) => r.kind === 'water')).toBe(false);
  });

  it('deve avisar de novo no slot seguinte', () => {
    const primeiro = collectDueReminders(settings, context, em(10), new Set());
    const chave = primeiro.find((r) => r.kind === 'water')!.fireKey;

    // Duas horas depois já é outro slot.
    const segundo = collectDueReminders(settings, context, em(12, 5), new Set([chave]));
    expect(segundo.some((r) => r.kind === 'water')).toBe(true);
  });

  it('não deve avisar quando desligado', () => {
    const desligado = { ...settings, waterEnabled: false };
    const devidos = collectDueReminders(desligado, context, em(10), new Set());
    expect(devidos.some((r) => r.kind === 'water')).toBe(false);
  });
});

describe('Lembretes de refeição', () => {
  it('deve avisar no horário da refeição', () => {
    const devidos = collectDueReminders(settings, context, em(12, 5), new Set());
    const refeicao = devidos.find((r) => r.kind === 'meal');

    expect(refeicao).toBeDefined();
    expect(refeicao?.title).toBe('Almoço');
  });

  it('não deve avisar antes do horário', () => {
    const devidos = collectDueReminders(settings, context, em(11, 30), new Set());
    expect(devidos.some((r) => r.title === 'Almoço')).toBe(false);
  });

  it('deve parar de avisar depois de 45 minutos', () => {
    const devidos = collectDueReminders(settings, context, em(13), new Set());
    expect(devidos.some((r) => r.title === 'Almoço')).toBe(false);
  });

  it('não deve avisar de refeição já registrada', () => {
    const comAlmocoFeito: ReminderContext = {
      ...context,
      meals: context.meals.map((m) => (m.name === 'Almoço' ? { ...m, done: true } : m))
    };

    const devidos = collectDueReminders(settings, comAlmocoFeito, em(12, 5), new Set());
    expect(devidos.some((r) => r.title === 'Almoço')).toBe(false);
  });

  it('deve ignorar refeição sem horário definido', () => {
    const semHorario: ReminderContext = {
      ...context,
      meals: [{ name: 'Ceia', done: false }]
    };

    const devidos = collectDueReminders(settings, semHorario, em(12, 5), new Set());
    expect(devidos.some((r) => r.kind === 'meal')).toBe(false);
  });
});

describe('Lembrete de treino', () => {
  it('deve avisar no horário configurado', () => {
    const devidos = collectDueReminders(settings, context, em(18, 10), new Set());
    const treino = devidos.find((r) => r.kind === 'workout');

    expect(treino).toBeDefined();
    expect(treino?.body).toContain('Treino A');
  });

  it('não deve avisar quando o treino já foi feito', () => {
    const feito = { ...context, workoutDone: true };
    const devidos = collectDueReminders(settings, feito, em(18, 10), new Set());
    expect(devidos.some((r) => r.kind === 'workout')).toBe(false);
  });

  it('não deve avisar em dia sem treino no plano', () => {
    const descanso = { ...context, workoutName: undefined };
    const devidos = collectDueReminders(settings, descanso, em(18, 10), new Set());
    expect(devidos.some((r) => r.kind === 'workout')).toBe(false);
  });

  it('deve avisar apenas uma vez por dia', () => {
    const primeiro = collectDueReminders(settings, context, em(18, 5), new Set());
    const chave = primeiro.find((r) => r.kind === 'workout')!.fireKey;

    const segundo = collectDueReminders(settings, context, em(19), new Set([chave]));
    expect(segundo.some((r) => r.kind === 'workout')).toBe(false);
  });
});

describe('Chaves de disparo', () => {
  it('devem incluir a data, para os avisos renovarem no dia seguinte', () => {
    const hoje = collectDueReminders(settings, context, new Date(2026, 7, 20, 18, 5), new Set());
    const amanha = collectDueReminders(settings, context, new Date(2026, 7, 21, 18, 5), new Set());

    const chaveHoje = hoje.find((r) => r.kind === 'workout')!.fireKey;
    const chaveAmanha = amanha.find((r) => r.kind === 'workout')!.fireKey;

    expect(chaveHoje).not.toBe(chaveAmanha);

    // O aviso de ontem não silencia o de hoje.
    const aindaAvisa = collectDueReminders(
      settings,
      context,
      new Date(2026, 7, 21, 18, 5),
      new Set([chaveHoje])
    );
    expect(aindaAvisa.some((r) => r.kind === 'workout')).toBe(true);
  });

  it('devem separar os slots de água por dia', () => {
    const hoje = collectDueReminders(settings, context, new Date(2026, 7, 20, 10, 0), new Set());
    const chaveHoje = hoje.find((r) => r.kind === 'water')!.fireKey;

    // Mesmo slot do intervalo, dia seguinte: precisa avisar de novo.
    const amanha = collectDueReminders(
      settings,
      context,
      new Date(2026, 7, 21, 10, 0),
      new Set([chaveHoje])
    );

    expect(amanha.some((r) => r.kind === 'water')).toBe(true);
  });
});
