import { describe, it, expect } from 'vitest';
import { calculateBMR, calculateMetabolicStats } from '../metabolism';
import { calculateFoodNutrients, calculateMacroSwap, generateWeeklyShoppingList } from '../macroSolver';
import { auditWorkoutRoutines, evaluateDoubleProgression, estimateWorkoutCalories } from '../trainingEngine';
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
      excludedFoodIds: [],
      preferredFoodIds: [],
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
    const progress = evaluateDoubleProgression(60, [10, 10, 10], 6, 10, true);
    expect(progress.shouldIncreaseLoad).toBe(true);
    expect(progress.suggestedWeightKg).toBe(64); // +4kg no composto
  });

  it('deve estimar calorias gastas no treino por METs', () => {
    // 60 min de musculação (6.0 METs) para 80kg = 6.0 * 80 * 1 = 480 kcal
    const cals = estimateWorkoutCalories(60, 80, 6.0);
    expect(cals).toBe(480);
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
