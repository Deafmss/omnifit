import { useCallback, useState } from 'react';
import confetti from 'canvas-confetti';
import { UserProfile, Gender, ExperienceLevel, FitnessGoal, DietMode } from '../../core/storage/types';
import { calculateMetabolicStats } from '../../core/math/metabolism';
import {
  db,
  saveProfile,
  generateDefaultRoutines,
  generateInitialMealPlans,
  logWeightEntry
} from '../../core/storage/db';
import { todayLocal } from '../../core/utils/dateUtils';

/**
 * Formulário de calibração inicial, separado da apresentação.
 * A tela tinha 655 linhas com 12 campos de estado, validação, escrita no banco
 * e o JSX dos 5 passos no mesmo arquivo.
 */

export type BodyShapeArchetype = 'overweight' | 'slightly_above' | 'moderate' | 'lean' | 'athletic';

/** Estimativa de gordura corporal por arquétipo, em % — ponto de partida. */
const ARCHETYPE_BODY_FAT: Record<BodyShapeArchetype, { male: number; female: number }> = {
  overweight: { male: 26, female: 34 },
  slightly_above: { male: 21, female: 28 },
  moderate: { male: 16, female: 23 },
  lean: { male: 12, female: 19 },
  athletic: { male: 10, female: 16 }
};

/** Mantém o valor dentro de uma faixa fisiologicamente plausível. */
function clamp(value: number | string, min: number, max: number, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function useOnboardingForm(initialProfile: UserProfile | undefined, onComplete: () => void) {
  const [step, setStep] = useState<number>(1);

  // Os campos numéricos aceitam string vazia para a digitação ficar fluida.
  const [name, setName] = useState(initialProfile?.name || '');
  const [age, setAge] = useState<number | string>(initialProfile?.age ?? 26);
  const [gender, setGender] = useState<Gender>(initialProfile?.gender || 'male');
  const [heightCm, setHeightCm] = useState<number | string>(initialProfile?.heightCm ?? 178);
  const [weightKg, setWeightKg] = useState<number | string>(initialProfile?.weightKg ?? 80);

  const [selectedArchetype, setSelectedArchetype] = useState<BodyShapeArchetype>('overweight');
  const [showExactBfInput, setShowExactBfInput] = useState<boolean>(false);
  const [exactBf, setExactBf] = useState<number | string>('');

  const [goal, setGoal] = useState<FitnessGoal>(initialProfile?.goal || 'recomposition');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    initialProfile?.experienceLevel || 'intermediate'
  );
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState<number>(
    initialProfile?.trainingDaysPerWeek || 4
  );
  const [sessionDurationMin, setSessionDurationMin] = useState<number>(
    initialProfile?.sessionDurationMin || 60
  );

  const [dietMode] = useState<DietMode>(initialProfile?.dietMode || 'guided');
  const [mealsPerDay, setMealsPerDay] = useState<number>(initialProfile?.mealsPerDay || 4);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /** % de gordura informado à mão tem prioridade sobre o arquétipo escolhido. */
  const getEstimatedBf = useCallback((): number | undefined => {
    if (showExactBfInput && exactBf !== '') {
      const parsed = Number(exactBf);
      if (parsed > 3 && parsed < 60) return parsed;
    }

    const mapa = ARCHETYPE_BODY_FAT[selectedArchetype];
    return gender === 'male' ? mapa.male : mapa.female;
  }, [exactBf, gender, selectedArchetype, showExactBfInput]);

  const finish = useCallback(async () => {
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const sanitizedAge = clamp(age, 12, 100, 26);
      const sanitizedHeight = clamp(heightCm, 120, 230, 178);
      const sanitizedWeight = clamp(weightKg, 30, 300, 80);
      const calculatedBf = getEstimatedBf();

      const profileData: UserProfile = {
        // Preserva o restante do perfil (id, ajuste calórico acumulado,
        // fórmulas de termogênico) ao recalibrar.
        ...initialProfile,
        name: name.trim() || 'Usuário',
        age: sanitizedAge,
        gender,
        heightCm: sanitizedHeight,
        weightKg: sanitizedWeight,
        bodyFatPercentage: calculatedBf,
        goal,
        experienceLevel,
        trainingDaysPerWeek,
        sessionDurationMin,
        dietMode,
        mealsPerDay,
        isCalibrated: true,
        createdAt: initialProfile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveProfile(profileData);
      await logWeightEntry(todayLocal(), sanitizedWeight, calculatedBf);

      const stats = calculateMetabolicStats(profileData);

      // Só gera treinos e cardápio quando ainda não existem. Na recalibração de
      // um perfil existente, regerar apagaria as fichas personalizadas e o
      // cardápio inteiro do usuário sem aviso.
      const [routineCount, mealCount] = await Promise.all([
        db.routines.count(),
        db.mealPlans.count()
      ]);

      if (routineCount === 0) {
        await generateDefaultRoutines(trainingDaysPerWeek);
      }

      if (mealCount === 0) {
        await generateInitialMealPlans(
          mealsPerDay,
          stats.targetCalories,
          stats.proteinGrams,
          stats.carbGrams,
          stats.fatGrams
        );
      }

      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      onComplete();
    } catch (err) {
      console.error('Erro ao salvar onboarding:', err);
      setErrorMsg(
        'Não foi possível salvar sua calibração. Verifique se o navegador permite armazenamento local (evite o modo privado) e tente novamente.'
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    age,
    dietMode,
    experienceLevel,
    gender,
    getEstimatedBf,
    goal,
    heightCm,
    initialProfile,
    mealsPerDay,
    name,
    onComplete,
    sessionDurationMin,
    trainingDaysPerWeek,
    weightKg
  ]);

  return {
    step,
    setStep,
    name,
    setName,
    age,
    setAge,
    gender,
    setGender,
    heightCm,
    setHeightCm,
    weightKg,
    setWeightKg,
    selectedArchetype,
    setSelectedArchetype,
    showExactBfInput,
    setShowExactBfInput,
    exactBf,
    setExactBf,
    goal,
    setGoal,
    experienceLevel,
    setExperienceLevel,
    trainingDaysPerWeek,
    setTrainingDaysPerWeek,
    sessionDurationMin,
    setSessionDurationMin,
    mealsPerDay,
    setMealsPerDay,
    isSaving,
    errorMsg,
    finish
  };
}
