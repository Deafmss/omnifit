import { describe, it, expect } from 'vitest';
import { calculateBMR, calculateMetabolicStats, calculateTDEE } from '../metabolism';
import { calculateFoodNutrients, calculateMacroSwap, generateWeeklyShoppingList } from '../macroSolver';
import {
  auditWorkoutRoutines,
  evaluateDoubleProgression,
  estimateWorkoutCalories,
  getVolumeLandmarks
} from '../trainingEngine';
import { calculateWeightEMA, evaluateAdaptiveMetabolism } from '../adaptiveEngine';
import { UserProfile, FoodItem, Exercise, WorkoutRoutine, MealPlan } from '../../storage/types';

describe('Motor Metabólico (Termodinâmica & Padrão Ouro)', () => {
  it('deve calcular TMB via Mifflin-St Jeor para homens e mulheres corretamente', () => {
    // Homem: 80kg, 180cm, 30 anos
    // TMB = (10 * 80) + (6.25 * 180) - (5 * 30) + 5 = 800 + 1125 - 150 + 5 = 1780
    const maleBmr = calculateBMR('male', 80, 180, 30);
    expect(maleBmr.bmr).toBe(1780);
    expect(maleBmr.formulaUsed).toBe('mifflin');

    // Mulher: 60kg, 165cm, 28 anos
    // TMB = (10 * 60) + (6.25 * 165) - (5 * 28) - 161 = 600 + 1031.25 - 140 - 161 = 1330.25 -> 1330
    const femaleBmr = calculateBMR('female', 60, 165, 28);
    expect(femaleBmr.bmr).toBe(1330);
    expect(femaleBmr.formulaUsed).toBe('mifflin');
  });

  it('deve calcular TMB via Katch-McArdle quando %BF é informado', () => {
    // 80kg com 15% de gordura -> MLG = 80 * 0.85 = 68kg
    // TMB = 370 + (21.6 * 68) = 370 + 1468.8 = 1838.8 -> 1839
    const katchBmr = calculateBMR('male', 80, 180, 30, 15);
    expect(katchBmr.bmr).toBe(1839);
    expect(katchBmr.formulaUsed).toBe('katch_mcardle');
  });

  it('deve gerar parâmetros para Recomposição Corporal com alta proteína e déficit leve', () => {
    const profile: UserProfile = {
      name: 'Teste',
      age: 28,
      gender: 'male',
      heightCm: 178,
      weightKg: 82,
      bodyFatPercentage: 18,
      experienceLevel: 'intermediate',
      goal: 'recomposition',
      trainingDaysPerWeek: 4,
      sessionDurationMin: 60,
      dietMode: 'guided',
      mealsPerDay: 4,
      isCalibrated: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const stats = calculateMetabolicStats(profile);
    expect(stats.targetCalories).toBeLessThan(stats.tdee);
    expect(stats.proteinGrams).toBe(Math.round(82 * 2.2)); // 180g
    expect(stats.fatGrams).toBeGreaterThanOrEqual(50);
    expect(stats.carbGrams).toBeGreaterThan(50);
    expect(stats.waterIntakeMl).toBeGreaterThanOrEqual(3000);
  });
});

describe('Otimizador de Dieta & Macro-Solver', () => {
  const rice: FoodItem = {
    id: 'arroz_branco',
    name: 'Arroz Branco Cozido',
    category: 'carb',
    servingName: '100g',
    baseGrams: 100,
    caloriesPer100g: 128,
    proteinPer100g: 2.5,
    carbsPer100g: 28.1,
    fatPer100g: 0.2,
    fiberPer100g: 1.6,
    sodiumMgPer100g: 1
  };

  const sweetPotato: FoodItem = {
    id: 'batata_doce',
    name: 'Batata Doce Cozida',
    category: 'carb',
    servingName: '100g',
    baseGrams: 100,
    caloriesPer100g: 77,
    proteinPer100g: 0.6,
    carbsPer100g: 18.4,
    fatPer100g: 0.1,
    fiberPer100g: 2.2,
    sodiumMgPer100g: 3
  };

  it('deve calcular nutrientes exatos por gramatura', () => {
    const nut = calculateFoodNutrients(rice, 150);
    expect(nut.calories).toBe(192); // 128 * 1.5
    expect(nut.carbs).toBe(42.2);   // 28.1 * 1.5 = 42.15 -> 42.2
  });

  it('deve calcular Macro-Swap equivalente com precisão de carboidrato', () => {
    // 150g de arroz tem 42.15g de carbo
    // Batata doce tem 18.4g de carbo a cada 100g (0.184g/g)
    // Quantidade necessária = 42.15 / 0.184 ≈ 229g
    const swap = calculateMacroSwap(rice, 150, sweetPotato);
    expect(swap.primaryMacroMatched).toBe('carbs');
    expect(swap.replacementGrams).toBeGreaterThanOrEqual(225);
    expect(swap.replacementGrams).toBeLessThanOrEqual(235);
  });

  it('deve gerar lista de compras semanal consolidada', () => {
    const mealPlans: MealPlan[] = [
      {
        id: 1,
        name: 'Almoço',
        order: 1,
        targetCalories: 500,
        targetProtein: 40,
        targetCarbs: 60,
        targetFat: 10,
        portions: [{ foodId: 'arroz_branco', grams: 150, consumed: false }]
      }
    ];

    const foodMap = new Map<string, FoodItem>([[rice.id, rice]]);
    const shopping = generateWeeklyShoppingList(mealPlans, foodMap, 7);

    expect(shopping.length).toBe(1);
    expect(shopping[0].totalGrams).toBe(1050); // 150g * 7 = 1050g
    expect(shopping[0].servingDescription).toBe('1.05 kg');
  });
});

describe('Motor de Treinamento Biomecânico', () => {
  it('deve auditar o volume e classificar status de MEV/MAV/MRV', () => {
    const benchPress: Exercise = {
      id: 'supino_reto',
      name: 'Supino Reto com Barra',
      primaryMuscle: 'chest',
      secondaryMuscles: ['triceps', 'shoulders'],
      category: 'compound',
      mets: 6.0,
      minReps: 6,
      maxReps: 10,
      defaultRestSeconds: 120,
      instructions: 'Desça até tocar levemente o peito.'
    };

    const routines: WorkoutRoutine[] = [
      {
        id: 1,
        name: 'Treino A',
        splitCode: 'A',
        targetMuscles: ['chest'],
        exercises: [
          { exerciseId: 'supino_reto', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 }
        ]
      },
      {
        id: 2,
        name: 'Treino B',
        splitCode: 'B',
        targetMuscles: ['chest'],
        exercises: [
          { exerciseId: 'supino_reto', targetSets: 4, minReps: 6, maxReps: 10, restSeconds: 120 }
        ]
      }
    ];

    const exerciseMap = new Map<string, Exercise>([[benchPress.id, benchPress]]);
    const audit = auditWorkoutRoutines(routines, exerciseMap, 'intermediate');

    const chestResult = audit.find(a => a.muscle === 'chest');
    expect(chestResult).toBeDefined();
    expect(chestResult?.totalEffectiveSets).toBe(8); // 4 + 4

    const tricepsResult = audit.find(a => a.muscle === 'triceps');
    expect(tricepsResult).toBeDefined();
    expect(tricepsResult?.totalEffectiveSets).toBe(4); // 8 * 0.5 = 4
  });

  it('deve sugerir aumento de carga quando o usuário bate o teto de reps (Dupla Progressão)', () => {
    // Incremento proporcional: 5% de 60 kg = 3 kg no composto.
    const progress = evaluateDoubleProgression(60, [10, 10, 10], 6, 10, true);
    expect(progress.shouldIncreaseLoad).toBe(true);
    expect(progress.suggestedWeightKg).toBe(63);
  });

  it('deve escalar o incremento de carga proporcionalmente, respeitando o piso', () => {
    // Carga leve: o piso absoluto evita saltos percentuais absurdos, mas
    // também impede que +4 kg fixos representem 40% de aumento em 10 kg.
    const light = evaluateDoubleProgression(10, [12, 12, 12], 8, 12, true);
    expect(light.suggestedWeightKg).toBe(12); // +2 kg (piso), não +4

    // Carga pesada: 5% de 200 kg = 10 kg, no teto do passo.
    const heavy = evaluateDoubleProgression(200, [10, 10, 10], 6, 10, true);
    expect(heavy.suggestedWeightKg).toBe(210);

    // Isolador usa metade do percentual e piso menor.
    const isolation = evaluateDoubleProgression(20, [15, 15, 15], 12, 15, false);
    expect(isolation.suggestedWeightKg).toBe(21); // +1 kg (piso)
  });

  it('deve estimar o gasto ADICIONAL do treino, descontando o metabolismo de repouso', () => {
    // 60 min a 6.0 METs para 80 kg. Desconta 1 MET (o repouso do mesmo
    // período, já contido no TDEE): (6 - 1) * 80 * 1 = 400 kcal.
    // Sem o desconto o valor era 480 kcal, superestimando ~20% e contando
    // duas vezes as calorias basais da hora de treino.
    const cals = estimateWorkoutCalories(60, 80, 6.0);
    expect(cals).toBe(400);
  });

  it('deve reportar volume de manutenção quando fica entre MV e MEV', () => {
    // Peitoral intermediário: MV 6, MEV 8. Com 6 séries o status precisa ser
    // 'maintenance' — antes esse ramo era inalcançável, porque a checagem de
    // "abaixo do MEV" vinha primeiro e capturava todos esses casos.
    const exerciseMap = new Map<string, Exercise>([
      [
        'supino',
        {
          id: 'supino',
          name: 'Supino Reto',
          primaryMuscle: 'chest',
          secondaryMuscles: [],
          category: 'compound',
          mets: 6,
          minReps: 6,
          maxReps: 10,
          defaultRestSeconds: 120,
          instructions: ''
        }
      ]
    ]);

    const routines: WorkoutRoutine[] = [
      {
        name: 'A',
        splitCode: 'A',
        targetMuscles: ['chest'],
        exercises: [{ exerciseId: 'supino', targetSets: 6, minReps: 6, maxReps: 10, restSeconds: 120 }]
      }
    ];

    const audit = auditWorkoutRoutines(routines, exerciseMap, 'intermediate');
    const chest = audit.find((a) => a.muscle === 'chest');

    expect(chest?.totalEffectiveSets).toBe(6);
    expect(chest?.status).toBe('maintenance');
  });
});

describe('Motor Adaptativo de Malha Fechada', () => {
  it('deve suavizar flutuações de peso usando filtro EMA', () => {
    const logs: { date: string; weightKg: number }[] = [
      { date: '2026-08-01', weightKg: 80.0 },
      { date: '2026-08-02', weightKg: 81.2 }, // pico falso de retenção
      { date: '2026-08-03', weightKg: 80.1 },
      { date: '2026-08-04', weightKg: 79.8 }
    ];

    const smoothed = calculateWeightEMA(logs, 7);
    expect(smoothed.length).toBe(4);
    // O pico falso de 81.2 deve ser atenuado na curva EMA
    expect(smoothed[1].emaWeightKg).toBeLessThan(81.2);
    expect(smoothed[1].emaWeightKg).toBeGreaterThan(80.0);
  });

  it('deve detectar estagnação em emagrecimento e calcular TDEE real revelado', () => {
    // Começou em 80kg EMA e continuou em 80kg EMA após 14 dias comendo 2200 kcal com 95% de adesão
    const result = evaluateAdaptiveMetabolism('fat_loss', 80.0, 80.0, 14, 2200, 95, 2);
    expect(result.status).toBe('stalled');
    expect(result.revealedTDEE).toBe(2200); // Já que peso não variou, TDEE real = calorias consumidas
    expect(result.suggestedCaloricChangeKcal).toBeLessThan(0); // Redução calórica sugerida
  });
});

describe('Marcos de volume por nível de experiência', () => {
  it('deve manter o MAV sempre igual ou acima do MEV', () => {
    const muscles = [
      'chest', 'back', 'quadriceps', 'hamstrings', 'glutes',
      'calves', 'shoulders', 'biceps', 'triceps', 'abs'
    ] as const;
    const levels = ['beginner', 'intermediate', 'advanced'] as const;

    for (const muscle of levels.flatMap(() => muscles)) {
      for (const level of levels) {
        const marks = getVolumeLandmarks(muscle, level);
        const label = `${muscle}/${level}`;

        // Ordem lógica dos marcos: MV <= MEV <= MAVmin <= MAVmax <= MRV.
        // Antes, glúteos e abdômen de iniciante tinham mavMin (4) abaixo do
        // mev (6), invertendo a escala.
        expect(marks.mev, label).toBeGreaterThanOrEqual(marks.mv);
        expect(marks.mavMin, label).toBeGreaterThanOrEqual(marks.mev);
        expect(marks.mavMax, label).toBeGreaterThanOrEqual(marks.mavMin);
        expect(marks.mrv, label).toBeGreaterThanOrEqual(marks.mavMax);
      }
    }
  });

  it('deve escalar o volume com o nível de experiência', () => {
    const beginner = getVolumeLandmarks('chest', 'beginner');
    const intermediate = getVolumeLandmarks('chest', 'intermediate');
    const advanced = getVolumeLandmarks('chest', 'advanced');

    expect(intermediate.mrv).toBeGreaterThan(beginner.mrv);
    expect(advanced.mrv).toBeGreaterThan(intermediate.mrv);
  });
});

describe('Gasto Energético Total (TDEE)', () => {
  it('deve aumentar com o volume de treino, dentro de limites plausíveis', () => {
    const sedentary = calculateTDEE(1800, 0, 0);
    const moderate = calculateTDEE(1800, 4, 60);
    const heavy = calculateTDEE(1800, 6, 90);

    // Sem treino, o PAL é o basal de 1.2.
    expect(sedentary).toBe(Math.round(1800 * 1.2));
    expect(moderate).toBeGreaterThan(sedentary);
    expect(heavy).toBeGreaterThan(moderate);

    // O multiplicador é limitado a 2.0 para não gerar valores irreais.
    expect(calculateTDEE(1800, 7, 240)).toBeLessThanOrEqual(1800 * 2);
  });

  it('deve tratar entradas negativas como ausência de treino', () => {
    expect(calculateTDEE(1800, -3, -60)).toBe(Math.round(1800 * 1.2));
  });
});

describe('Ajuste calórico do check-in aplicado ao alvo', () => {
  const baseProfile: UserProfile = {
    name: 'Teste',
    age: 30,
    gender: 'male',
    heightCm: 180,
    weightKg: 80,
    bodyFatPercentage: 18,
    experienceLevel: 'intermediate',
    goal: 'fat_loss',
    trainingDaysPerWeek: 4,
    sessionDurationMin: 60,
    dietMode: 'guided',
    mealsPerDay: 4,
    isCalibrated: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  };

  // Manutenção deixa o alvo igual ao TDEE, bem acima do piso de segurança,
  // isolando o efeito puro do ajuste.
  const maintenanceProfile: UserProfile = { ...baseProfile, goal: 'maintenance' };

  it('deve subtrair o ajuste acumulado da meta calórica', () => {
    const semAjuste = calculateMetabolicStats(maintenanceProfile);
    const comAjuste = calculateMetabolicStats({ ...maintenanceProfile, calorieAdjustmentKcal: -150 });

    // O ajuste precisa CHEGAR ao alvo: antes ele era gravado no log do
    // check-in e nunca influenciava a dieta.
    expect(comAjuste.targetCalories).toBe(semAjuste.targetCalories - 150);
    expect(comAjuste.appliedCalorieAdjustmentKcal).toBe(-150);
  });

  it('deve somar o ajuste positivo à meta', () => {
    const semAjuste = calculateMetabolicStats(maintenanceProfile);
    const comAjuste = calculateMetabolicStats({ ...maintenanceProfile, calorieAdjustmentKcal: 200 });

    expect(comAjuste.targetCalories).toBe(semAjuste.targetCalories + 200);
  });

  it('não deve deixar o ajuste derrubar a meta abaixo do piso de segurança', () => {
    // Em emagrecimento o alvo já parte de um déficit de 22%. O piso é TMB + 50,
    // para que uma sequência de check-ins não empurre a dieta a um patamar
    // perigosamente baixo.
    const comAjuste = calculateMetabolicStats({ ...baseProfile, calorieAdjustmentKcal: -400 });

    expect(comAjuste.targetCalories).toBeGreaterThanOrEqual(comAjuste.bmr + 50);
    // O déficit registrado precisa refletir o alvo que realmente valeu.
    expect(comAjuste.dailyDeficitOrSurplusKcal).toBe(comAjuste.targetCalories - comAjuste.tdee);
  });

  it('deve limitar o ajuste a 30% do TDEE e nunca descer abaixo da TMB', () => {
    const extremo = calculateMetabolicStats({ ...maintenanceProfile, calorieAdjustmentKcal: -5000 });

    expect(extremo.appliedCalorieAdjustmentKcal).toBe(-Math.round(extremo.tdee * 0.3));
    // Piso de segurança: nunca abaixo da taxa metabólica basal.
    expect(extremo.targetCalories).toBeGreaterThanOrEqual(extremo.bmr);
  });

  it('deve recalcular os macros a partir da meta ajustada', () => {
    const comAjuste = calculateMetabolicStats({ ...baseProfile, calorieAdjustmentKcal: -300 });
    const somaMacros =
      comAjuste.proteinGrams * 4 + comAjuste.carbGrams * 4 + comAjuste.fatGrams * 9;

    // Os macros precisam fechar com a meta (tolerância de arredondamento).
    expect(Math.abs(somaMacros - comAjuste.targetCalories)).toBeLessThan(30);
  });
});
