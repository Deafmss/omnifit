import { UserProfile, MetabolicStats, MealPlan, WorkoutRoutine } from '../storage/types';
import { FOOD_DATABASE_MAP } from '../data/tacoDatabase';
import { EXERCISE_DATABASE_MAP } from '../data/exerciseDatabase';
import { calculateFoodNutrients } from '../math/macroSolver';
import { MUSCLE_LABELS } from '../math/trainingEngine';
import { todayLocal } from '../utils/dateUtils';

/**
 * Exportação do plano em texto legível, para levar ao nutricionista, ao
 * personal ou simplesmente imprimir.
 *
 * Gera texto puro em vez de PDF de propósito: um PDF exigiria uma biblioteca
 * de ~300 KB no bundle, e o texto resolve os dois casos de uso reais
 * (compartilhar por mensagem e imprimir pelo navegador).
 */

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const NOMES_OBJETIVO: Record<UserProfile['goal'], string> = {
  recomposition: 'Recomposição corporal',
  fat_loss: 'Emagrecimento',
  hypertrophy: 'Hipertrofia',
  maintenance: 'Manutenção'
};

/** Plano alimentar e de treino em texto. */
export function buildPlanText(
  profile: UserProfile,
  stats: MetabolicStats,
  mealPlans: MealPlan[],
  routines: WorkoutRoutine[]
): string {
  const linhas: string[] = [];
  const separador = '='.repeat(52);

  linhas.push(separador);
  linhas.push('OMNIFIT — PLANO ALIMENTAR E DE TREINO');
  linhas.push(`${profile.name} · gerado em ${todayLocal().split('-').reverse().join('/')}`);
  linhas.push(separador);
  linhas.push('');

  // --- Perfil e metas ------------------------------------------------------
  linhas.push('PERFIL');
  linhas.push(`  Objetivo: ${NOMES_OBJETIVO[profile.goal]}`);
  linhas.push(`  Peso: ${profile.weightKg} kg · Altura: ${profile.heightCm} cm · Idade: ${profile.age}`);
  if (profile.bodyFatPercentage) {
    linhas.push(`  Gordura corporal estimada: ${profile.bodyFatPercentage}%`);
  }
  linhas.push(`  Treinos: ${profile.trainingDaysPerWeek}x por semana, ${profile.sessionDurationMin} min`);
  linhas.push('');

  linhas.push('METAS DIÁRIAS (estimativas)');
  linhas.push(`  Taxa metabólica basal: ${stats.bmr} kcal`);
  linhas.push(`  Gasto total estimado: ${stats.tdee} kcal`);
  linhas.push(`  Meta calórica: ${stats.targetCalories} kcal`);
  if (stats.appliedCalorieAdjustmentKcal !== 0) {
    const sinal = stats.appliedCalorieAdjustmentKcal > 0 ? '+' : '';
    linhas.push(`    (inclui ajuste de ${sinal}${stats.appliedCalorieAdjustmentKcal} kcal dos check-ins)`);
  }
  linhas.push(`  Proteína: ${stats.proteinGrams} g`);
  linhas.push(`  Carboidratos: ${stats.carbGrams} g`);
  linhas.push(`  Gorduras: ${stats.fatGrams} g`);
  linhas.push(`  Fibras: ${stats.fiberGramsTarget} g · Água: ${(stats.waterIntakeMl / 1000).toFixed(1)} L`);
  linhas.push('');

  // --- Cardápio ------------------------------------------------------------
  if (mealPlans.length > 0) {
    linhas.push(separador);
    linhas.push('CARDÁPIO');
    linhas.push(separador);

    let totalDia = { kcal: 0, p: 0, c: 0, g: 0 };

    for (const meal of [...mealPlans].sort((a, b) => a.order - b.order)) {
      linhas.push('');
      linhas.push(`${meal.name.toUpperCase()}${meal.timeLabel ? ` — ${meal.timeLabel}` : ''}`);

      if (meal.portions.length === 0) {
        linhas.push('  (nenhum alimento definido)');
        continue;
      }

      const totalRefeicao = { kcal: 0, p: 0, c: 0, g: 0 };

      for (const portion of meal.portions) {
        const food = FOOD_DATABASE_MAP.get(portion.foodId);
        if (!food) continue;

        const nut = calculateFoodNutrients(food, portion.grams);
        totalRefeicao.kcal += nut.calories;
        totalRefeicao.p += nut.protein;
        totalRefeicao.c += nut.carbs;
        totalRefeicao.g += nut.fat;

        const medida = food.servingUnit && food.servingGrams
          ? ` (~${(portion.grams / food.servingGrams).toFixed(1).replace('.0', '')} ${food.servingUnit})`
          : '';

        linhas.push(`  - ${food.name}: ${portion.grams} g${medida} · ${nut.calories} kcal`);
      }

      linhas.push(
        `  Subtotal: ${totalRefeicao.kcal} kcal · P ${Math.round(totalRefeicao.p)}g · C ${Math.round(totalRefeicao.c)}g · G ${Math.round(totalRefeicao.g)}g`
      );

      totalDia = {
        kcal: totalDia.kcal + totalRefeicao.kcal,
        p: totalDia.p + totalRefeicao.p,
        c: totalDia.c + totalRefeicao.c,
        g: totalDia.g + totalRefeicao.g
      };
    }

    linhas.push('');
    linhas.push(
      `TOTAL DO DIA: ${totalDia.kcal} kcal · P ${Math.round(totalDia.p)}g · C ${Math.round(totalDia.c)}g · G ${Math.round(totalDia.g)}g`
    );
    linhas.push('');
  }

  // --- Treinos -------------------------------------------------------------
  if (routines.length > 0) {
    linhas.push(separador);
    linhas.push('DIVISÃO DE TREINO');
    linhas.push(separador);

    const ordenadas = [...routines].sort((a, b) => {
      // Segunda primeiro, domingo por último.
      const ordem = (d?: number) => (d === 0 ? 7 : d ?? 8);
      return ordem(a.dayOfWeek) - ordem(b.dayOfWeek);
    });

    for (const routine of ordenadas) {
      linhas.push('');
      const dia = routine.dayOfWeek !== undefined ? DIAS_SEMANA[routine.dayOfWeek] : 'Sem dia definido';
      linhas.push(`${routine.name.toUpperCase()} — ${dia}`);

      if (routine.targetMuscles.length > 0) {
        const musculos = routine.targetMuscles.map((m) => MUSCLE_LABELS[m] || m).join(', ');
        linhas.push(`  Grupos: ${musculos}`);
      }

      if (routine.exercises.length === 0) {
        linhas.push('  (nenhum exercício definido)');
        continue;
      }

      for (const item of routine.exercises) {
        const exercise = EXERCISE_DATABASE_MAP.get(item.exerciseId);
        const nome = exercise?.name || item.exerciseId;
        linhas.push(
          `  - ${nome}: ${item.targetSets} x ${item.minReps}-${item.maxReps} reps · ${item.restSeconds}s descanso`
        );
      }
    }
    linhas.push('');
  }

  linhas.push(separador);
  linhas.push('Valores calóricos e de macronutrientes são estimativas baseadas na');
  linhas.push('tabela TACO e em fórmulas populacionais (Mifflin-St Jeor e');
  linhas.push('Katch-McArdle). Não substituem acompanhamento profissional.');
  linhas.push(separador);

  return linhas.join('\n');
}

/** Nome de arquivo com a data local. */
export function planFileName(profile: UserProfile): string {
  const nome = profile.name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'usuario';

  return `omnifit-plano-${nome}-${todayLocal()}.txt`;
}

/** Baixa o plano como arquivo de texto. */
export function downloadPlanText(
  profile: UserProfile,
  stats: MetabolicStats,
  mealPlans: MealPlan[],
  routines: WorkoutRoutine[]
): string {
  const texto = buildPlanText(profile, stats, mealPlans, routines);
  const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const fileName = planFileName(profile);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return fileName;
}

/**
 * Compartilha pelo menu nativo do sistema, quando disponível (celular).
 * Cai para a área de transferência no desktop.
 */
export async function sharePlanText(
  profile: UserProfile,
  stats: MetabolicStats,
  mealPlans: MealPlan[],
  routines: WorkoutRoutine[]
): Promise<'compartilhado' | 'copiado' | 'indisponivel'> {
  const texto = buildPlanText(profile, stats, mealPlans, routines);

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: 'Plano OmniFit', text: texto });
      return 'compartilhado';
    } catch {
      // Usuário cancelou ou o navegador recusou: tenta a área de transferência.
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(texto);
      return 'copiado';
    } catch {
      return 'indisponivel';
    }
  }

  return 'indisponivel';
}
