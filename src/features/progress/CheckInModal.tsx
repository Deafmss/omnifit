import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Check,
  AlertCircle
} from 'lucide-react';
import { UserProfile, WeightLog, MetabolicStats, CheckInLog } from '../../core/storage/types';
import { evaluateAdaptiveMetabolism, AdaptiveEvaluationResult } from '../../core/math/adaptiveEngine';
import { calculateMetabolicStats } from '../../core/math/metabolism';
import { logWeightEntry, db, saveProfile, ensureFoodDatabaseReady } from '../../core/storage/db';
import { calculatePortionsTotal } from '../../core/math/macroSolver';
import { FOOD_DATABASE_MAP } from '../../core/data/tacoDatabase';
import { todayLocal, daysBetween } from '../../core/utils/dateUtils';
import { pushCheckInLog } from '../../core/supabase/cloudSync';
import { Modal } from '../../components/ui/Modal';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  stats: MetabolicStats;
  weightLogs: WeightLog[];
  onRecalibrated: () => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  isOpen,
  onClose,
  profile,
  stats,
  weightLogs,
  onRecalibrated
}) => {
  const [currentWeight, setCurrentWeight] = useState<number | string>(profile.weightKg);
  const [hungerRating, setHungerRating] = useState<number>(2);
  const [energyRating, setEnergyRating] = useState<number>(4);
  const [adherencePercentage, setAdherencePercentage] = useState<number>(90);
  const [evaluation, setEvaluation] = useState<AdaptiveEvaluationResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /**
   * Janela de avaliação: as pesagens dos últimos 21 dias, comparando a
   * tendência (EMA) do início da janela com a de hoje.
   *
   * A versão anterior usava `weightLogs[0]` — o primeiro registro histórico de
   * todos os tempos — e `Math.max(7, weightLogs.length)`, tratando a QUANTIDADE
   * de pesagens como se fossem DIAS. Depois de alguns meses de uso, o
   * "check-in semanal" comparava o peso de hoje com o do primeiro dia e dividia
   * pelo número de registros, produzindo uma taxa semanal sem relação com a
   * realidade.
   */
  const evaluationWindow = useMemo(() => {
    const today = todayLocal();
    const sorted = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date));

    if (sorted.length === 0) {
      return { initialEma: profile.weightKg, daysElapsed: 7, hasHistory: false, windowLabel: 'sem histórico' };
    }

    const WINDOW_DAYS = 21;
    // Primeiro registro dentro da janela; se não houver, usa o mais antigo.
    const inWindow = sorted.filter((log) => daysBetween(log.date, today) <= WINDOW_DAYS);
    const baseline = inWindow.length > 0 ? inWindow[0] : sorted[sorted.length - 1];

    const elapsed = daysBetween(baseline.date, today);

    return {
      initialEma: baseline.emaWeightKg || baseline.weightKg,
      daysElapsed: Math.max(1, elapsed),
      hasHistory: elapsed >= 7,
      windowLabel: elapsed >= 1 ? `${elapsed} ${elapsed === 1 ? 'dia' : 'dias'}` : 'menos de um dia'
    };
  }, [weightLogs, profile.weightKg]);

  /**
   * Calorias efetivamente marcadas como consumidas no cardápio, usadas como
   * melhor estimativa da ingestão diária média.
   *
   * Ainda é uma aproximação — o app registra o consumo do dia corrente, não uma
   * média histórica — mas é um dado real. Passar `stats.targetCalories` como se
   * fosse o consumo (comportamento anterior) tornava o "TDEE revelado" uma
   * função da própria premissa, sem informação nova.
   */
  const [estimatedDailyIntake, setEstimatedDailyIntake] = useState<number>(stats.targetCalories);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    (async () => {
      try {
        await ensureFoodDatabaseReady();
        const plans = await db.mealPlans.toArray();
        const consumed = plans.reduce((acc, plan) => {
          const totals = calculatePortionsTotal(
            plan.portions.filter((p) => p.consumed),
            FOOD_DATABASE_MAP
          );
          return acc + totals.calories;
        }, 0);

        if (cancelled) return;
        // Se nada foi marcado hoje, o alvo planejado é a melhor estimativa disponível.
        setEstimatedDailyIntake(consumed > 0 ? consumed : stats.targetCalories);
      } catch {
        if (!cancelled) setEstimatedDailyIntake(stats.targetCalories);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, stats.targetCalories]);

  /**
   * Alvo calórico que realmente valerá após aplicar o ajuste.
   * Passa pelo mesmo cálculo do app (incluindo o teto de 30% do TDEE e o piso
   * da TMB), para que a projeção mostrada não prometa um número diferente do
   * que o usuário vai ver depois de salvar.
   */
  const projectedTarget = useMemo(() => {
    if (!evaluation) return stats.targetCalories;

    return calculateMetabolicStats({
      ...profile,
      calorieAdjustmentKcal:
        (profile.calorieAdjustmentKcal || 0) + evaluation.suggestedCaloricChangeKcal
    }).targetCalories;
  }, [evaluation, profile, stats.targetCalories]);

  const handleEvaluate = () => {
    const cleanWeight = typeof currentWeight === 'number' && currentWeight > 0 ? currentWeight : Number(currentWeight) || profile.weightKg;
    const result = evaluateAdaptiveMetabolism(
      profile.goal,
      evaluationWindow.initialEma,
      cleanWeight,
      evaluationWindow.daysElapsed,
      estimatedDailyIntake,
      adherencePercentage,
      hungerRating
    );
    setEvaluation(result);
  };

  const handleApplyAdjustment = async () => {
    if (!evaluation || isSaving) return;

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const cleanWeight = typeof currentWeight === 'number' && currentWeight > 0 ? currentWeight : Number(currentWeight) || profile.weightKg;
      const today = todayLocal();

      await logWeightEntry(today, cleanWeight);

      // Acumula o ajuste sugerido no perfil. Sem esta linha, o botão de aplicar
      // era puramente decorativo: o alvo calórico nunca mudava.
      const newAdjustment = (profile.calorieAdjustmentKcal || 0) + evaluation.suggestedCaloricChangeKcal;

      await saveProfile({
        ...profile,
        weightKg: cleanWeight,
        calorieAdjustmentKcal: newAdjustment
      });

      const checkInLog: CheckInLog = {
        date: today,
        weightKg: cleanWeight,
        hungerRating: hungerRating as CheckInLog['hungerRating'],
        energyRating: energyRating as CheckInLog['energyRating'],
        adherencePercentage,
        caloricAdjustmentSuggestedKcal: evaluation.suggestedCaloricChangeKcal,
        notes: evaluation.reasoning
      };

      const checkInId = (await db.checkInLogs.add(checkInLog)) as number;
      void pushCheckInLog({ ...checkInLog, id: checkInId });

      confetti({
        particleCount: 70,
        spread: 60
      });

      onRecalibrated();
      onClose();
    } catch (err) {
      console.error('Erro ao salvar o check-in:', err);
      setErrorMsg('Não foi possível salvar o check-in. Verifique o espaço de armazenamento do navegador e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Check-In Semanal Adaptativo"
      subtitle="Recalibração matemática baseada na resposta biológica real"
    >
      <div className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Step 1: Input Questions */}
        {!evaluation ? (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-[#060A14] border border-white/[0.06] text-[11px] font-mono text-slate-400 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#A3E635] shrink-0 mt-0.5" />
              <span>
                {evaluationWindow.hasHistory ? (
                  <>
                    Comparando com a tendência de{' '}
                    <strong className="text-white">{evaluationWindow.windowLabel}</strong> atrás.
                  </>
                ) : (
                  <>
                    Você tem <strong className="text-white">{evaluationWindow.windowLabel}</strong> de
                    histórico. O diagnóstico fica mais preciso a partir de 7 dias de pesagens.
                  </>
                )}
              </span>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                Peso em Jejum Hoje (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(e.target.value === '' ? '' : e.target.value)}
                placeholder="Ex: 80"
                className="w-full px-4 py-3 bg-[#060A14] border border-white/10 rounded-2xl text-white font-mono font-bold text-lg text-center focus:border-[#84CC16] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                Nível de Fome ao Longo da Semana
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { r: 1, label: 'Sem Fome' },
                  { r: 2, label: 'Controlada' },
                  { r: 3, label: 'Moderada' },
                  { r: 4, label: 'Alta' },
                  { r: 5, label: 'Faminto' }
                ].map((item) => (
                  <button
                    key={item.r}
                    type="button"
                    onClick={() => setHungerRating(item.r)}
                    className={`py-2 px-1 rounded-2xl border text-[11px] font-bold text-center transition-all ${
                      hungerRating === item.r
                        ? 'bg-[#84CC16]/20 border-[#84CC16] text-[#A3E635] shadow-md shadow-lime-500/10'
                        : 'bg-[#060A14] border-white/5 text-slate-400'
                    }`}
                  >
                    {item.r}
                    <span className="block text-[9px] font-normal text-slate-500 truncate">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                Nível de Energia e Força no Treino
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { r: 1, label: 'Exausto' },
                  { r: 2, label: 'Baixa' },
                  { r: 3, label: 'Normal' },
                  { r: 4, label: 'Boa' },
                  { r: 5, label: 'Excelente' }
                ].map((item) => (
                  <button
                    key={item.r}
                    type="button"
                    onClick={() => setEnergyRating(item.r)}
                    className={`py-2 px-1 rounded-2xl border text-[11px] font-bold text-center transition-all ${
                      energyRating === item.r
                        ? 'bg-[#84CC16]/20 border-[#84CC16] text-[#A3E635] shadow-md shadow-lime-500/10'
                        : 'bg-[#060A14] border-white/5 text-slate-400'
                    }`}
                  >
                    {item.r}
                    <span className="block text-[9px] font-normal text-slate-500 truncate">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Adesão à Dieta na Semana:
                </label>
                <span className="text-xs font-mono font-bold text-[#A3E635]">
                  {adherencePercentage}%
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={adherencePercentage}
                onChange={(e) => setAdherencePercentage(Number(e.target.value))}
                className="w-full accent-[#84CC16]"
              />
            </div>

            <button
              onClick={handleEvaluate}
              className="w-full py-3.5 rounded-2xl btn-lime text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-lime-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Avaliar Metabolismo Real</span>
            </button>
          </div>
        ) : (
          /* Step 2: Evaluation Results */
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="p-4 rounded-2xl bg-[#060A14] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase font-mono">
                  Diagnóstico Algorítmico
                </span>
                {evaluation.revealedTDEE && (
                  <span className="text-xs font-mono font-bold text-[#A3E635]">
                    TDEE Revelado: {evaluation.revealedTDEE} kcal
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {evaluation.reasoning}
              </p>

              {evaluation.suggestedCaloricChangeKcal !== 0 && (
                <div className="p-3 rounded-xl bg-[#090F1E] border border-[#84CC16]/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Ajuste a aplicar:</span>
                    <span className="text-sm font-mono font-black text-[#A3E635]">
                      {evaluation.suggestedCaloricChangeKcal > 0 ? '+' : ''}
                      {evaluation.suggestedCaloricChangeKcal} kcal/dia
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Nova meta diária:</span>
                    <span className="text-white font-bold">
                      {stats.targetCalories} &rarr; {projectedTarget} kcal
                    </span>
                  </div>
                  {projectedTarget !== stats.targetCalories + evaluation.suggestedCaloricChangeKcal && (
                    <p className="text-[10px] font-mono text-amber-400 leading-snug">
                      O ajuste foi limitado pelo piso de segurança calórico (nunca abaixo da sua
                      taxa metabólica basal).
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setEvaluation(null)}
                disabled={isSaving}
                className="flex-1 py-3 rounded-2xl bg-[#060A14] border border-white/10 text-slate-300 text-xs font-bold disabled:opacity-50"
              >
                Revisar Respostas
              </button>
              <button
                onClick={handleApplyAdjustment}
                disabled={isSaving}
                className="flex-1 py-3 rounded-2xl btn-lime text-slate-950 text-xs font-display font-black uppercase tracking-wider shadow-lg shadow-lime-500/20 flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>
                  {isSaving
                    ? 'Salvando...'
                    : evaluation.suggestedCaloricChangeKcal !== 0
                    ? 'Salvar e Aplicar'
                    : 'Salvar Check-in'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
