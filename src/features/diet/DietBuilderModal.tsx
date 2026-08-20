import React, { useState } from 'react';
import {
  Check,
  Layers,
  FileText,
  AlertCircle
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
  onApplyDiet: () => void;
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
  const [isApplying, setIsApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /** Substitui o cardápio atual, sempre confirmando antes. */
  const replaceMealPlans = async (plans: MealPlan[], confirmMessage: string) => {
    if (isApplying) return;

    const hasExisting = (await db.mealPlans.count()) > 0;
    if (hasExisting && !confirm(confirmMessage)) return;

    setIsApplying(true);
    setErrorMsg(null);

    try {
      await db.transaction('rw', db.mealPlans, async () => {
        await db.mealPlans.clear();
        await db.mealPlans.bulkAdd(plans);
      });
      onApplyDiet();
      onClose();
    } catch (err) {
      console.error('Erro ao aplicar cardápio:', err);
      setErrorMsg('Não foi possível salvar o novo cardápio. Tente novamente.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleGenerateAutomatic = async () => {
    const plans = generateSmartMealPlan({
      targetCalories: stats.targetCalories,
      targetProtein: stats.proteinGrams,
      targetCarbs: stats.carbGrams,
      targetFat: stats.fatGrams,
      mealsPerDay: mealsCount,
      budgetTier,
      focus,
      restrictions: profile.dietRestrictions
    });

    await replaceMealPlans(
      plans,
      'Isto substitui todo o seu cardápio atual por um novo, gerado automaticamente. Deseja continuar?'
    );
  };

  const handleStartBlank = async () => {
    const count = Math.max(2, Math.min(6, mealsCount));
    const calPerMeal = Math.round(stats.targetCalories / count);
    const protPerMeal = Math.round(stats.proteinGrams / count);
    const carbPerMeal = Math.round(stats.carbGrams / count);
    const fatPerMeal = Math.round(stats.fatGrams / count);

    // Nomes e horários em ordem cronológica. Antes 'Colação' (10:30) estava na
    // última posição, depois da 'Ceia' (22:30), então com 6 refeições a última
    // do dia caía às 10:30 da manhã.
    const slots: { name: string; time: string }[] = [
      { name: 'Café da Manhã', time: '08:00' },
      { name: 'Almoço', time: '12:30' },
      { name: 'Lanche da Tarde', time: '16:30' },
      { name: 'Jantar', time: '20:00' },
      { name: 'Ceia', time: '22:30' }
    ];

    if (count === 6) {
      slots.splice(1, 0, { name: 'Colação', time: '10:30' });
    }

    const blankPlans: MealPlan[] = Array.from({ length: count }).map((_, i) => ({
      name: slots[i]?.name || `Refeição ${i + 1}`,
      order: i + 1,
      timeLabel: slots[i]?.time || '12:00',
      targetCalories: calPerMeal,
      targetProtein: protPerMeal,
      targetCarbs: carbPerMeal,
      targetFat: fatPerMeal,
      portions: []
    }));

    await replaceMealPlans(
      blankPlans,
      'Isto apaga o seu cardápio atual e cria refeições vazias para você montar do zero. Deseja continuar?'
    );
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
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
        {/* Segmented Control (Gym UI Kit Style) */}
        <div className="p-1 bg-[#060A14] border border-white/[0.08] rounded-2xl flex gap-1">
          <button
            type="button"
            onClick={() => setMode('auto')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              mode === 'auto'
                ? 'btn-lime text-slate-950 shadow-md font-extrabold'
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
                ? 'btn-lime text-slate-950 shadow-md font-extrabold'
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
                          ? 'bg-[#0B1220] border-[#84CC16] text-white shadow-sm'
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
                            ? 'border-[#84CC16] bg-[#84CC16] text-slate-950'
                            : 'border-slate-700 bg-transparent'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
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
                        ? 'bg-[#84CC16]/20 border-[#84CC16] text-[#A3E635]'
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
                <span className="text-xs font-mono font-bold text-[#A3E635]">
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
                        ? 'btn-lime text-slate-950 shadow-sm'
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
                <strong className="text-[#A3E635]">{stats.targetCalories} kcal</strong> &bull; P: {stats.proteinGrams}g &bull; C: {stats.carbGrams}g &bull; G: {stats.fatGrams}g
              </span>
            </div>

            {/* Botão de Ação Sólido */}
            <button
              onClick={handleGenerateAutomatic}
              disabled={isApplying}
              className="w-full py-3.5 px-4 rounded-2xl btn-lime text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-lime-500/20 transition-all flex items-center justify-center disabled:opacity-60"
            >
              <span>{isApplying ? 'Criando...' : 'Criar Plano Alimentar'}</span>
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
                <span className="text-xs font-mono font-bold text-[#A3E635]">
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
                        ? 'btn-lime text-slate-950 shadow-sm'
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
              disabled={isApplying}
              className="w-full py-3.5 px-4 rounded-2xl btn-lime text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-lime-500/20 transition-all flex items-center justify-center disabled:opacity-60"
            >
              <span>{isApplying ? 'Preparando...' : 'Iniciar Montagem Manual'}</span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
