import React, { useState } from 'react';
import { 
  Coins, 
  Flame, 
  Dumbbell, 
  Scale, 
  Check, 
  Utensils, 
  Wand2,
  PenTool
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Montador de Cardápio"
      subtitle="Escolha como prefere estruturar o seu plano alimentar"
    >
      <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('auto')}
            className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-1.5 btn-tactile text-left ${
              mode === 'auto'
                ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                : 'bg-[#060A14] border-white/[0.06] text-slate-400 hover:text-white'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Wand2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white">Gerar Automático</span>
            <span className="text-[10px] text-slate-400 text-center leading-tight">
              O app calcula as porções ideais para você
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMode('custom')}
            className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-1.5 btn-tactile text-left ${
              mode === 'custom'
                ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md'
                : 'bg-[#060A14] border-white/[0.06] text-slate-400 hover:text-white'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <PenTool className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white">Montar do Meu Jeito</span>
            <span className="text-[10px] text-slate-400 text-center leading-tight">
              Adicione seus alimentos vendo as calorias
            </span>
          </button>
        </div>

        {mode === 'auto' ? (
          /* Auto Mode Options */
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Step 1: Orçamento / Custo-Benefício */}
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>Nível de Custo & Orçamento</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Economic */}
                <div
                  onClick={() => setBudgetTier('economic')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all space-y-1.5 btn-tactile ${
                    budgetTier === 'economic'
                      ? 'bg-emerald-950/30 border-emerald-500 text-white shadow-md'
                      : 'bg-[#060A14] border-white/[0.06] text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-400 font-display">🟢 Econômico</span>
                    {budgetTier === 'economic' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-slate-300 font-bold">Máximo Custo-Benefício</p>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Ovos, Frango, Sardinha, Arroz, Feijão, Aveia, Banana, Amendoim.
                  </p>
                </div>

                {/* Standard */}
                <div
                  onClick={() => setBudgetTier('standard')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all space-y-1.5 btn-tactile ${
                    budgetTier === 'standard'
                      ? 'bg-blue-950/30 border-blue-500 text-white shadow-md'
                      : 'bg-[#060A14] border-white/[0.06] text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-400 font-display">🔵 Equilibrado</span>
                    {budgetTier === 'standard' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </div>
                  <p className="text-[11px] text-slate-300 font-bold">Padrão Brasileiro</p>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Patinho moído, Frango, Whey, Queijo Minas, Iogurte, Frutas.
                  </p>
                </div>

                {/* Premium */}
                <div
                  onClick={() => setBudgetTier('premium')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all space-y-1.5 btn-tactile ${
                    budgetTier === 'premium'
                      ? 'bg-purple-950/30 border-purple-500 text-white shadow-md'
                      : 'bg-[#060A14] border-white/[0.06] text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-purple-400 font-display">🟣 Livre</span>
                    {budgetTier === 'premium' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <p className="text-[11px] text-slate-300 font-bold">Gourmet & Variado</p>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Salmão, Filé Mignon, Castanhas, Frutas nobres.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2: Foco da Dieta */}
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-blue-400" />
                <span>Foco & Estratégia</span>
              </span>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFocus('fat_loss')}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1 btn-tactile ${
                    focus === 'fat_loss'
                      ? 'bg-gradient-to-b from-blue-600/30 to-blue-900/30 border-blue-500 text-white'
                      : 'bg-[#060A14] border-white/[0.06] text-slate-400'
                  }`}
                >
                  <Flame className="w-4 h-4 text-blue-400" />
                  <span>Secar (Cutting)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFocus('recomposition')}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1 btn-tactile ${
                    focus === 'recomposition'
                      ? 'bg-gradient-to-b from-emerald-600/30 to-emerald-900/30 border-emerald-500 text-white'
                      : 'bg-[#060A14] border-white/[0.06] text-slate-400'
                  }`}
                >
                  <Scale className="w-4 h-4 text-emerald-400" />
                  <span>Recomposição</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFocus('hypertrophy')}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1 btn-tactile ${
                    focus === 'hypertrophy'
                      ? 'bg-gradient-to-b from-amber-600/30 to-amber-900/30 border-amber-500 text-white'
                      : 'bg-[#060A14] border-white/[0.06] text-slate-400'
                  }`}
                >
                  <Dumbbell className="w-4 h-4 text-amber-400" />
                  <span>Hipertrofia</span>
                </button>
              </div>
            </div>

            {/* Step 3: Quantidade de Refeições */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Número de Refeições no Dia</span>
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">{mealsCount} refeições</span>
              </div>

              <div className="flex gap-1.5">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setMealsCount(num)}
                    className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all btn-tactile ${
                      mealsCount === num
                        ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                        : 'bg-[#060A14] border border-white/[0.06] text-slate-400 hover:text-white'
                    }`}
                  >
                    {num}x
                  </button>
                ))}
              </div>
            </div>

            {/* Target Preview */}
            <div className="p-3.5 rounded-2xl bg-[#060A14] border border-white/[0.06] space-y-1 text-center font-mono">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Meta Calórica Calculada</span>
              <div className="text-sm font-black text-white">
                <span className="text-blue-400">{stats.targetCalories} kcal</span> &bull; P: {stats.proteinGrams}g &bull; C: {stats.carbGrams}g &bull; G: {stats.fatGrams}g
              </div>
            </div>

            <button
              onClick={handleGenerateAutomatic}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-teal-500 to-emerald-500 text-white font-extrabold text-xs shadow-xl shadow-blue-500/20 btn-tactile flex items-center justify-center gap-2"
            >
              <span>Gerar Cardápio Balanceado com Medidas Caseiras</span>
            </button>
          </div>
        ) : (
          /* Custom Blank Mode */
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-[#060A14] border border-white/[0.06] space-y-2">
              <span className="text-xs font-bold text-white block">Como funciona:</span>
              <p className="text-xs text-slate-400 leading-relaxed">
                Criaremos <strong>{mealsCount} refeições limpas</strong> dividindo suas metas de calorias e macros igualmente. Você poderá adicionar qualquer alimento da tabela oficial ou da base nacional e acompanhar as calorias de cada prato.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Quantas refeições você quer no dia?</span>
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">{mealsCount} refeições</span>
              </div>

              <div className="flex gap-1.5">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setMealsCount(num)}
                    className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all btn-tactile ${
                      mealsCount === num
                        ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
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
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-xl shadow-emerald-500/20 btn-tactile flex items-center justify-center gap-2"
            >
              <span>Criar Estrutura e Montar Sozinho</span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
