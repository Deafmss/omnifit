/**
 * Lembretes de água, refeição e treino.
 *
 * Limitação importante e assumida: sem servidor de push, o navegador só dispara
 * notificação enquanto o app está aberto (aba em primeiro plano ou em segundo
 * plano no celular com a PWA ativa). Notificação com o app fechado exigiria
 * Web Push com backend e chaves VAPID — isso está fora do escopo local-first.
 * A interface diz isso ao usuário em vez de prometer o que não entrega.
 */

export interface ReminderSettings {
  waterEnabled: boolean;
  /** Intervalo entre lembretes de água, em minutos. */
  waterIntervalMin: number;
  /** Faixa de horas em que os lembretes de água fazem sentido. */
  waterStartHour: number;
  waterEndHour: number;
  mealsEnabled: boolean;
  workoutEnabled: boolean;
  /** Horário do lembrete de treino, formato "HH:MM". */
  workoutTime: string;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  waterEnabled: false,
  waterIntervalMin: 120,
  waterStartHour: 8,
  waterEndHour: 22,
  mealsEnabled: false,
  workoutEnabled: false,
  workoutTime: '18:00'
};

export const REMINDER_SETTINGS_KEY = 'reminderSettings';

export type ReminderKind = 'water' | 'meal' | 'workout';

export interface DueReminder {
  kind: ReminderKind;
  title: string;
  body: string;
  /** Identidade do disparo, para não repetir o mesmo lembrete. */
  fireKey: string;
}

/** Converte "HH:MM" em minutos desde a meia-noite; null se inválido. */
export function parseTimeToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

/** Lê as configurações de um JSON gravado, caindo no padrão em qualquer erro. */
export function parseReminderSettings(raw: string | null): ReminderSettings {
  if (!raw) return { ...DEFAULT_REMINDER_SETTINGS };

  try {
    const parsed = JSON.parse(raw) as Partial<ReminderSettings>;

    // Sanitiza cada campo: um JSON antigo ou corrompido não pode quebrar o app.
    return {
      waterEnabled: parsed.waterEnabled === true,
      waterIntervalMin: clamp(parsed.waterIntervalMin, 30, 480, DEFAULT_REMINDER_SETTINGS.waterIntervalMin),
      waterStartHour: clamp(parsed.waterStartHour, 0, 23, DEFAULT_REMINDER_SETTINGS.waterStartHour),
      waterEndHour: clamp(parsed.waterEndHour, 0, 23, DEFAULT_REMINDER_SETTINGS.waterEndHour),
      mealsEnabled: parsed.mealsEnabled === true,
      workoutEnabled: parsed.workoutEnabled === true,
      workoutTime:
        typeof parsed.workoutTime === 'string' && parseTimeToMinutes(parsed.workoutTime) !== null
          ? parsed.workoutTime
          : DEFAULT_REMINDER_SETTINGS.workoutTime
    };
  } catch {
    return { ...DEFAULT_REMINDER_SETTINGS };
  }
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export interface ReminderContext {
  /** Refeições do dia, com horário definido. */
  meals: Array<{ name: string; timeLabel?: string; done: boolean }>;
  /** Nome do treino de hoje, quando existe. */
  workoutName?: string;
  /** Se o treino de hoje já foi concluído. */
  workoutDone: boolean;
  /** Água já consumida no dia, em ml. */
  waterMl: number;
  /** Meta diária de água, em ml. */
  waterTargetMl: number;
}

/**
 * Decide quais lembretes estão vencidos agora.
 *
 * Função pura de propósito: o disparo da notificação é efeito colateral e fica
 * em `fireReminder`. Assim a regra de "quando avisar" é testável sem navegador.
 *
 * `alreadyFired` guarda as `fireKey` já disparadas — a chave inclui a data, o
 * que evita repetir o mesmo aviso e faz a lista se renovar sozinha a cada dia.
 */
export function collectDueReminders(
  settings: ReminderSettings,
  context: ReminderContext,
  now: Date,
  alreadyFired: Set<string>
): DueReminder[] {
  const dia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const minutosAgora = now.getHours() * 60 + now.getMinutes();

  const devidos: DueReminder[] = [];

  // --- Água ----------------------------------------------------------------
  // Um lembrete por "slot" do intervalo dentro da janela ativa. Se o usuário já
  // bateu a meta, não há o que lembrar.
  if (settings.waterEnabled && context.waterMl < context.waterTargetMl) {
    const inicio = settings.waterStartHour * 60;
    const fim = settings.waterEndHour * 60;

    if (minutosAgora >= inicio && minutosAgora <= fim) {
      const slot = Math.floor((minutosAgora - inicio) / settings.waterIntervalMin);
      const fireKey = `water:${dia}:${slot}`;

      if (!alreadyFired.has(fireKey)) {
        const faltaMl = context.waterTargetMl - context.waterMl;
        devidos.push({
          kind: 'water',
          title: 'Hora de beber água',
          body: `Faltam ${(faltaMl / 1000).toFixed(1)} L para a meta de hoje.`,
          fireKey
        });
      }
    }
  }

  // --- Refeições -----------------------------------------------------------
  // Avisa a partir do horário da refeição e por até 45 min depois; passado
  // disso o aviso perde utilidade e vira barulho.
  if (settings.mealsEnabled) {
    context.meals.forEach((meal, index) => {
      if (meal.done || !meal.timeLabel) return;

      const horario = parseTimeToMinutes(meal.timeLabel);
      if (horario === null) return;

      const atraso = minutosAgora - horario;
      if (atraso < 0 || atraso > 45) return;

      const fireKey = `meal:${dia}:${index}`;
      if (alreadyFired.has(fireKey)) return;

      devidos.push({
        kind: 'meal',
        title: meal.name,
        body: `Horário de ${meal.name.toLowerCase()} (${meal.timeLabel}).`,
        fireKey
      });
    });
  }

  // --- Treino --------------------------------------------------------------
  if (settings.workoutEnabled && context.workoutName && !context.workoutDone) {
    const horario = parseTimeToMinutes(settings.workoutTime);

    if (horario !== null) {
      const atraso = minutosAgora - horario;

      if (atraso >= 0 && atraso <= 90) {
        const fireKey = `workout:${dia}`;
        if (!alreadyFired.has(fireKey)) {
          devidos.push({
            kind: 'workout',
            title: 'Treino de hoje',
            body: `${context.workoutName} está no plano de hoje.`,
            fireKey
          });
        }
      }
    }
  }

  return devidos;
}

/** O navegador suporta notificações? */
export function supportsNotifications(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!supportsNotifications()) return 'unsupported';
  return Notification.permission;
}

/**
 * Pede permissão para notificar.
 * Só pode ser chamado a partir de um gesto do usuário — os navegadores
 * bloqueiam pedidos automáticos no carregamento da página.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!supportsNotifications()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;

  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/** Dispara a notificação. Retorna false quando o navegador não permitiu. */
export function fireReminder(reminder: DueReminder): boolean {
  if (!supportsNotifications() || Notification.permission !== 'granted') return false;

  try {
    new Notification(reminder.title, {
      body: reminder.body,
      icon: '/pwa-192x192.png',
      // A tag evita empilhar avisos do mesmo tipo na bandeja.
      tag: `omnifit-${reminder.kind}`
    });
    return true;
  } catch {
    return false;
  }
}
