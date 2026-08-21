import { useCallback, useEffect, useRef, useState } from 'react';
import { MetabolicStats } from '../storage/types';
import { db, getFoodLogForDate, getMeta, getTodayWaterIntake, setMeta } from '../storage/db';
import { todayLocal } from '../utils/dateUtils';
import {
  collectDueReminders,
  fireReminder,
  parseReminderSettings,
  ReminderContext,
  ReminderSettings,
  REMINDER_SETTINGS_KEY
} from './reminders';

/** Um minuto entre verificações: os lembretes têm granularidade de minuto. */
const TICK_MS = 60_000;

/**
 * Mantém o ciclo de lembretes rodando enquanto o app está aberto.
 *
 * A decisão de "quando avisar" mora em `collectDueReminders`, que é pura e
 * testada. Aqui fica só a parte que precisa do navegador: ler o estado atual do
 * banco, disparar a notificação e lembrar o que já foi disparado.
 */
export function useReminders(stats: MetabolicStats | undefined, enabled: boolean) {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const firedRef = useRef<Set<string>>(new Set());
  const statsRef = useRef(stats);

  // A escrita fica no efeito, não no corpo do render: o intervalo lê o ref a
  // cada minuto, então um render de atraso não muda nada na prática.
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  // Carrega as preferências do contêiner do usuário.
  useEffect(() => {
    if (!enabled) {
      setSettings(null);
      return;
    }

    let cancelled = false;

    getMeta(REMINDER_SETTINGS_KEY).then((raw) => {
      if (!cancelled) setSettings(parseReminderSettings(raw));
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const saveSettings = useCallback(async (next: ReminderSettings) => {
    setSettings(next);
    await setMeta(REMINDER_SETTINGS_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    if (!enabled || !settings) return;

    const algumLigado = settings.waterEnabled || settings.mealsEnabled || settings.workoutEnabled;
    if (!algumLigado) return;

    // Sem permissão concedida não há por que consultar o banco a cada minuto.
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    let cancelled = false;

    const verificar = async () => {
      const currentStats = statsRef.current;
      if (!currentStats || cancelled) return;

      const hoje = todayLocal();
      const agora = new Date();

      const [meals, logs, waterMl, routines, sessions] = await Promise.all([
        db.mealPlans.toArray(),
        getFoodLogForDate(hoje),
        getTodayWaterIntake(),
        db.routines.toArray(),
        db.sessionLogs.where('date').equals(hoje).toArray()
      ]);

      if (cancelled) return;

      // Uma refeição conta como feita quando já tem algum registro no diário.
      const ordensRegistradas = new Set(logs.map((l) => l.mealOrder));

      const rotinaDeHoje = routines.find((r) => r.dayOfWeek === agora.getDay());
      const treinoFeito = sessions.some((s) => s.completed);

      const context: ReminderContext = {
        meals: [...meals]
          .sort((a, b) => a.order - b.order)
          .map((m) => ({
            name: m.name,
            timeLabel: m.timeLabel,
            done: ordensRegistradas.has(m.order)
          })),
        workoutName: rotinaDeHoje?.name,
        workoutDone: treinoFeito,
        waterMl,
        waterTargetMl: currentStats.waterIntakeMl
      };

      const devidos = collectDueReminders(settings, context, agora, firedRef.current);

      for (const reminder of devidos) {
        // Marca antes de disparar: se a notificação falhar, ainda assim não
        // insistimos no mesmo aviso a cada minuto.
        firedRef.current.add(reminder.fireKey);
        fireReminder(reminder);
      }
    };

    verificar();
    const timer = window.setInterval(verificar, TICK_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled, settings]);

  return { settings, saveSettings };
}
