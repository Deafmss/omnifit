import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  Check
} from 'lucide-react';
import { UserProfile, WeightLog, MetabolicStats } from '../../core/storage/types';
import { evaluateAdaptiveMetabolism, AdaptiveEvaluationResult } from '../../core/math/adaptiveEngine';
import { logWeightEntry, db, saveProfile } from '../../core/storage/db';
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
  const [currentWeight, setCurrentWeight] = useState<number>(profile.weightKg);
  const [hungerRating, setHungerRating] = useState<number>(2);
  const [energyRating, setEnergyRating] = useState<number>(4);
  const [adherencePercentage, setAdherencePercentage] = useState<number>(90);
  const [evaluation, setEvaluation] = useState<AdaptiveEvaluationResult | null>(null);

  const initialEma = weightLogs.length > 0 ? weightLogs[0].emaWeightKg || weightLogs[0].weightKg : profile.weightKg;
  const daysElapsed = Math.max(7, weightLogs.length);

  const handleEvaluate = () => {
    const result = evaluateAdaptiveMetabolism(
      profile.goal,
      initialEma,
      currentWeight,
      daysElapsed,
      stats.targetCalories,
      adherencePercentage,
      hungerRating
    );
    setEvaluation(result);
  };

  const handleApplyAdjustment = async () => {
    if (!evaluation) return;

    // Registra a pesagem no banco
    const today = new Date().toISOString().split('T')[0];
    await logWeightEntry(today, currentWeight);

    // Se houver ajuste calórico, atualizamos o perfil
    await saveProfile({
      ...profile,
      weightKg: currentWeight
    });

    await db.checkInLogs.add({
      date: today,
      weightKg: currentWeight,
      hungerRating: hungerRating as any,
      energyRating: energyRating as any,
      adherencePercentage,
      caloricAdjustmentSuggestedKcal: evaluation.suggestedCaloricChangeKcal,
      notes: evaluation.reasoning
    });

    confetti({
      particleCount: 70,
      spread: 60
    });

    onRecalibrated();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Check-In Semanal Adaptativo"
      subtitle="Recalibração matemática baseada na resposta biológica real"
    >
      <div className="space-y-4">
        {/* Step 1: Input Questions */}
        {!evaluation ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Peso em Jejum Hoje (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white font-mono font-bold text-lg text-center focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
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
                    className={`py-2 px-1 rounded-xl border text-[11px] font-bold text-center transition-all ${
                      hungerRating === item.r
                        ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                        : 'bg-slate-900 border-white/5 text-slate-400'
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
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
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
                    className={`py-2 px-1 rounded-xl border text-[11px] font-bold text-center transition-all ${
                      energyRating === item.r
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                        : 'bg-slate-900 border-white/5 text-slate-400'
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
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Adesão à Dieta na Semana:
                </label>
                <span className="text-xs font-mono font-bold text-blue-400">
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
                className="w-full accent-blue-500"
              />
            </div>

            <button
              onClick={handleEvaluate}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-extrabold text-xs shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Avaliar Metabolismo Real</span>
            </button>
          </div>
        ) : (
          /* Step 2: Evaluation Results */
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">
                  Diagnóstico Algorítmico
                </span>
                {evaluation.revealedTDEE && (
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    TDEE Revelado: {evaluation.revealedTDEE} kcal
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {evaluation.reasoning}
              </p>

              {evaluation.suggestedCaloricChangeKcal !== 0 && (
                <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Ajuste Recomendado:</span>
                  <span className="text-sm font-mono font-black text-blue-300">
                    {evaluation.suggestedCaloricChangeKcal > 0 ? '+' : ''}
                    {evaluation.suggestedCaloricChangeKcal} kcal/dia
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setEvaluation(null)}
                className="flex-1 py-3 rounded-xl bg-slate-900 border border-white/10 text-slate-300 text-xs font-bold"
              >
                Revisar Respostas
              </button>
              <button
                onClick={handleApplyAdjustment}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Check-in</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
