import { useCallback, useEffect, useMemo, useState } from 'react';
import { WorkoutRoutine, WorkoutSessionLog, Exercise } from '../../core/storage/types';
import {
  db,
  applySplitTemplate,
  addNewRoutine,
  deleteRoutine,
  SplitTemplateType
} from '../../core/storage/db';
import { pushRoutines } from '../../core/supabase/cloudSync';
import { todayLocal, toLocalDateString, startOfWeekMonday, addDays } from '../../core/utils/dateUtils';

/**
 * Estado e regras da divisão de treino, separados da apresentação.
 * A tela tinha 650 linhas misturando acesso ao banco, cálculo de semana e JSX.
 */

export const DAYS_OF_WEEK = [
  { dayIndex: 1, short: 'SEG', full: 'Segunda-feira' },
  { dayIndex: 2, short: 'TER', full: 'Terça-feira' },
  { dayIndex: 3, short: 'QUA', full: 'Quarta-feira' },
  { dayIndex: 4, short: 'QUI', full: 'Quinta-feira' },
  { dayIndex: 5, short: 'SEX', full: 'Sexta-feira' },
  { dayIndex: 6, short: 'SÁB', full: 'Sábado' },
  { dayIndex: 0, short: 'DOM', full: 'Domingo' }
];

export function useWorkoutSplit() {
  const [selectedDay, setSelectedDay] = useState<number>(() => new Date().getDay());
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [sessionLogs, setSessionLogs] = useState<WorkoutSessionLog[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const list = await db.routines.toArray();

      // Atribui dias apenas às fichas sem dia, sempre escolhendo um livre:
      // `(i + 1) % 7` cegamente colidia com dias ocupados e a ficha sobreposta
      // ficava inacessível na interface.
      const taken = new Set(list.filter((r) => r.dayOfWeek !== undefined).map((r) => r.dayOfWeek));
      const preference = [1, 2, 3, 4, 5, 6, 0];

      for (const routine of list) {
        if (routine.dayOfWeek !== undefined) continue;

        const freeDay = preference.find((d) => !taken.has(d));
        if (freeDay === undefined) continue;

        routine.dayOfWeek = freeDay;
        taken.add(freeDay);
        if (routine.id) {
          await db.routines.update(routine.id, { dayOfWeek: freeDay });
        }
      }

      setRoutines(list);
      setSessionLogs(await db.sessionLogs.toArray());
      setErrorMsg(null);

      // Espelha as fichas na nuvem, cobrindo as edições feitas nesta tela.
      void pushRoutines(list);
    } catch (err) {
      console.error('Erro ao carregar os treinos:', err);
      setErrorMsg('Não foi possível carregar suas fichas de treino. Recarregue a página.');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const currentRoutine = useMemo(
    () => routines.find((r) => r.dayOfWeek === selectedDay),
    [routines, selectedDay]
  );

  const currentDayInfo = useMemo(
    () => DAYS_OF_WEEK.find((d) => d.dayIndex === selectedDay) || DAYS_OF_WEEK[0],
    [selectedDay]
  );

  const todayCompletedLog = useMemo(() => {
    const hoje = todayLocal();
    return sessionLogs.find((s) => s.date === hoje && s.completed);
  }, [sessionLogs]);

  /** Dias da semana corrente que já têm treino concluído. */
  const weekCompletionMap = useMemo(() => {
    const monday = startOfWeekMonday();
    const map = new Map<number, boolean>();

    for (let i = 0; i < 7; i++) {
      const d = addDays(monday, i);
      const dStr = toLocalDateString(d);
      map.set(d.getDay(), sessionLogs.some((s) => s.date === dStr && s.completed));
    }

    return map;
  }, [sessionLogs]);

  const applyTemplate = useCallback(
    async (templateId: SplitTemplateType) => {
      await applySplitTemplate(templateId);
      await reload();
    },
    [reload]
  );

  const createRoutineForSelectedDay = useCallback(async () => {
    await addNewRoutine(`Treino de ${currentDayInfo.full}`, undefined, selectedDay);
    await reload();
  }, [currentDayInfo.full, reload, selectedDay]);

  const removeRoutine = useCallback(
    async (routineId?: number) => {
      if (!routineId) return;
      if (!confirm('Tem certeza que deseja desvincular ou excluir o treino deste dia?')) return;

      await deleteRoutine(routineId);
      await reload();
    },
    [reload]
  );

  const renameRoutine = useCallback(
    async (novoNome: string) => {
      if (!currentRoutine?.id || !novoNome.trim()) return;
      await db.routines.update(currentRoutine.id, { name: novoNome.trim() });
      await reload();
    },
    [currentRoutine, reload]
  );

  const addExercise = useCallback(
    async (
      exercise: Exercise,
      targetSets: number,
      minReps: number,
      maxReps: number,
      restSeconds: number
    ) => {
      if (!currentRoutine?.id) return;

      await db.routines.update(currentRoutine.id, {
        exercises: [
          ...currentRoutine.exercises,
          { exerciseId: exercise.id, targetSets, minReps, maxReps, restSeconds }
        ],
        // Mantém a lista de músculos coerente com o que a ficha treina.
        targetMuscles: Array.from(
          new Set([...currentRoutine.targetMuscles, exercise.primaryMuscle])
        )
      });

      await reload();
    },
    [currentRoutine, reload]
  );

  const removeExercise = useCallback(
    async (index: number) => {
      if (!currentRoutine?.id) return;
      await db.routines.update(currentRoutine.id, {
        exercises: currentRoutine.exercises.filter((_, i) => i !== index)
      });
      await reload();
    },
    [currentRoutine, reload]
  );

  const updateExerciseConfig = useCallback(
    async (index: number, deltaSets: number, deltaReps: number, deltaRest: number) => {
      if (!currentRoutine?.id) return;

      const ex = currentRoutine.exercises[index];
      if (!ex) return;

      const exercises = currentRoutine.exercises.map((item, i) =>
        i !== index
          ? item
          : {
              ...item,
              targetSets: Math.max(1, Math.min(10, item.targetSets + deltaSets)),
              minReps: Math.max(1, item.minReps + deltaReps),
              maxReps: Math.max(item.minReps + deltaReps, item.maxReps + deltaReps),
              restSeconds: Math.max(30, item.restSeconds + deltaRest)
            }
      );

      await db.routines.update(currentRoutine.id, { exercises });
      await reload();
    },
    [currentRoutine, reload]
  );

  return {
    selectedDay,
    setSelectedDay,
    routines,
    sessionLogs,
    currentRoutine,
    currentDayInfo,
    todayCompletedLog,
    weekCompletionMap,
    errorMsg,
    reload,
    applyTemplate,
    createRoutineForSelectedDay,
    removeRoutine,
    renameRoutine,
    addExercise,
    removeExercise,
    updateExerciseConfig
  };
}
