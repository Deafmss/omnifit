import React, { useState } from 'react';
import { 
  Check, 
  Layers,
  FileText
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { UserProfile, MetabolicStats, MealPlan } from '../../core/storage/types';
import { BudgetTier, DietFocus, generateSmartMealPlan } from '../../core/math/dietOptimizer';
import { db } from '../../core/storage/db';

interface DietBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  stats: MetabolicStats;
  onApplyDiet: (plans: MealPlan[]) => void;
}

export const DietBuilderModal: React.FC<DietBuilderModalProps> = ({
  isOpen,
  onClose,
  profile,
  stats,
  onApplyDiet
}) => {
  const [mode, setMode] = useState<'auto' | 'custom'>('auto');
  const [budgetTier, setBudgetTier] = useState<BudgetTier>('economic');
  const [focus, setFocus] = useState<DietFocus>(
    profile.goal === 'fat_loss' ? 'fat_loss' : profile.goal === 'hypertrophy' ? 'hypertrophy' : 'recomposition'
  );
  const [mealsCount, setMealsCount] = useState<number>(profile.mealsPerDay || 4);

  const handleGenerateAutomatic = async () => {
    const plans = generateSmartMealPlan({
      targetCalories: stats.targetCalories,
      targetProtein: stats.proteinGrams,
      targetCarbs: stats.carbGrams,
      targetFat: stats.fatGrams,
      mealsPerDay: mealsCount,
      budgetTier,
      focus
    });

    await db.mealPlans.clear();
    await db.mealPlans.bulkAdd(plans);
    onApplyDiet(plans);
    onClose();
  };

  const handleStartBlank = async () => {
    const calPerMeal = Math.round(stats.targetCalories / mealsCount);
    const protPerMeal = Math.round(stats.proteinGrams / mealsCount);
    const carbPerMeal = Math.round(stats.carbGrams / mealsCount);
    const fatPerMeal = Math.round(stats.fatGrams / mealsCount);

    const defaultNames = [
      'Café da Manhã',
      'Almoço',
      'Lanche da Tarde',
      'Jantar',
      'Ceia',
      'Colação'
    ];

    const defaultTimes = ['08:00', '12:30', '16:30', '20:00', '22:30', '10:30'];

    const blankPlans: MealPlan[] = Array.from({ length: mealsCount }).map((_, i) => ({
      name: defaultNames[i] || `Refeição ${i + 1}`,
      order: i + 1,
      timeLabel: defaultTimes[i] || '12:00',
      targetCalories: calPerMeal,
      targetProtein: protPerMeal,
      targetCarbs: carbPerMeal,
      targetFat: fatPerMeal,
      portions: []
    }));

    await db.mealPlans.clear();
    await db.mealPlans.bulkAdd(blankPlans);
    onApplyDiet(blankPlans);
    onClose();
  };

  const budgetOptions: { id: BudgetTier; title: string; subtitle: string; foods: string }[] = [
    {
      id: 'economic',
      title: 'Econômico (Custo-Benefício)',
      subtitle: 'Alimentos acessíveis e de alto valor biológico',
      foods: 'Ovos, frango, feijão, arroz, aveia, banana, amendoim'
    },
    {
      id: 'standard',
      title: 'Padrão Equilibrado',
      subtitle: 'Maior variedade de carnes magras e laticínios',
      foods: 'Patinho moído, frango, queijo minas, iogurte, frutas'
    },
    {
      id: 'premium',
      title: 'Flexível / Amplo',
      subtitle: 'Sem restrições de cortes e ingredientes',
      foods: 'Salmão, tilápia, filé mignon, castanhas nobres'
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Montador de Cardápio"
      subtitle="Defina a estrutura e as preferências do seu plano alimentar"
    >
      <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
        {/* Segmented Control (iOS / Linear Style) */}
        <div className="p-1 bg-[#060A14] border border-white/[0.08] rounded-2xl flex gap-1">
          <button
            type="button"
            onClick={() => setMode('auto')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              mode === 'auto'
                ? 'bg-[#0E1628] text-white shadow border border-white/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Sugestão Pronta</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('custom')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              mode === 'custom'
                ? 'bg-[#0E1628] text-white shadow border border-white/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Montar do Zero</span>
          </button>
        </div>

        {mode === 'auto' ? (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Seletor de Custo / Orçamento */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Perfil de Ingredientes & Custo
              </label>

              <div className="space-y-2">
                {budgetOptions.map((opt) => {
                  const isSelected = budgetTier === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setBudgetTier(opt.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#0B1220] border-blue-500/80 text-white'
                          : 'bg-[#060A14] border-white/[0.06] text-slate-400 hover:border-white/15'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                            {opt.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight">
                          {opt.subtitle}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono pt-1 truncate">
                          {opt.foods}
                        </p>
                      </div>

                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-600 text-white'
                            : 'border-slate-700 bg-transparent'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Seletor de Objetivo */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Objetivo
              </label>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'fat_loss', label: 'Emagrecimento' },
                  { id: 'recomposition', label: 'Recomposição' },
                  { id: 'hypertrophy', label: 'Hipertrofia' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFocus(item.id as DietFocus)}
                    className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all text-center ${
                      focus === item.id
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-[#060A14] border-white/[0.06] text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Número de Refeições */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  Refeições por dia
                </label>
                <span className="text-xs font-mono font-bold text-blue-400">
                  {mealsCount} refeições
                </span>
              </div>

              <div className="flex gap-2">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setMealsCount(num)}
                    className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                      mealsCount === num
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-[#060A14] border border-white/[0.06] text-slate-400 hover:text-white'
                    }`}
                  >
                    {num}x
                  </button>
                ))}
              </div>
            </div>

            {/* Resumo de Metas */}
            <div className="p-3.5 rounded-2xl bg-[#060A14] border border-white/[0.06] flex items-center justify-between font-mono text-xs">
              <span className="text-slate-400 font-medium">Meta Diária:</span>
              <span className="font-bold text-white">
                <strong className="text-blue-400">{stats.targetCalories} kcal</strong> &bull; P: {stats.proteinGrams}g &bull; C: {stats.carbGrams}g &bull; G: {stats.fatGrams}g
              </span>
            </div>

            {/* Botão de Ação Sólido */}
            <button
              onClick={handleGenerateAutomatic}
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center btn-tactile"
            >
              <span>Criar Plano Alimentar</span>
            </button>
          </div>
        ) : (
          /* Custom Mode */
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="p-4 rounded-2xl bg-[#060A14] border border-white/[0.06] space-y-2">
              <h4 className="text-xs font-bold text-white">Montagem manual com metas divididas</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                O aplicativo criará <strong>{mealsCount} refeições em branco</strong> com os alvos calóricos calculados igualmente para o seu dia ({Math.round(stats.targetCalories / mealsCount)} kcal por refeição).
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Você poderá adicionar livremente seus alimentos e acompanhar o progresso dos macronutrientes em tempo real.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  Refeições por dia
                </label>
                <span className="text-xs font-mono font-bold text-blue-400">
                  {mealsCount} refeições
                </span>
              </div>

              <div className="flex gap-2">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setMealsCount(num)}
                    className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                      mealsCount === num
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-[#060A14] border border-white/[0.06] text-slate-400 hover:text-white'
                    }`}
                  >
                    {num}x
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleStartBlank}
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center btn-tactile"
            >
              <span>Iniciar Montagem Manual</span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
