import React, { useMemo, useState } from 'react';
import { Zap, BedDouble, PartyPopper, AlertCircle } from 'lucide-react';
import { UserProfile, MetabolicStats } from '../../core/storage/types';
import { buildCarbCyclePlan, planFreeMeal } from '../../core/math/carbCycling';
import { Modal } from '../../components/ui/Modal';

interface CarbCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  stats: MetabolicStats;
}

/**
 * Ciclo de carboidratos e refeição livre.
 *
 * Os dois recursos são de planejamento: mostram números para o usuário seguir,
 * sem alterar a meta gravada no perfil. Mudar o alvo automaticamente conforme o
 * dia da semana confundiria o histórico e a aderência medida.
 */
export const CarbCycleModal: React.FC<CarbCycleModalProps> = ({ isOpen, onClose, profile, stats }) => {
  const [intensidade, setIntensidade] = useState(0.15);
  const [caloriasLivres, setCaloriasLivres] = useState<number | string>(1200);
  const [diasCompensacao, setDiasCompensacao] = useState(6);

  const ciclo = useMemo(
    () => buildCarbCyclePlan(stats, profile.trainingDaysPerWeek, intensidade),
    [stats, profile.trainingDaysPerWeek, intensidade]
  );

  const livre = useMemo(
    () => planFreeMeal(stats, Number(caloriasLivres) || 0, diasCompensacao),
    [stats, caloriasLivres, diasCompensacao]
  );

  const semDiaDeDescanso = profile.trainingDaysPerWeek >= 7;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ciclo de Carboidratos"
      subtitle="Planejamento: a média da semana continua igual à sua meta"
    >
      <div className="space-y-4">
        {semDiaDeDescanso ? (
          <div className="p-3 rounded-2xl bg-[#060A14] border border-white/[0.08] text-xs text-slate-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Você treina todos os dias, então não há dia de descanso de onde tirar as calorias.
              O ciclo só faz sentido com pelo menos um dia sem treino na semana.
            </span>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Intensidade do ciclo
                </label>
                <span className="text-xs font-mono font-bold text-[#A3E635]">
                  {Math.round(intensidade * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={25}
                step={5}
                value={Math.round(intensidade * 100)}
                onChange={(e) => setIntensidade(Number(e.target.value) / 100)}
                className="w-full accent-[#84CC16]"
              />
              <p className="text-[10px] font-mono text-slate-500">
                Quanto o dia de treino se afasta da média. Acima de 25% o dia de descanso fica
                restritivo demais para sustentar.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-2xl bg-[#84CC16]/10 border border-[#84CC16]/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[#A3E635] font-mono">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Dia de treino</span>
                </div>
                <div className="font-mono">
                  <span className="text-xl font-black text-white">{ciclo.trainingDay.calories}</span>
                  <span className="text-[10px] text-slate-400"> kcal</span>
                </div>
                <div className="text-[10px] font-mono text-slate-300 space-y-0.5">
                  <div>P {ciclo.trainingDay.proteinGrams}g</div>
                  <div className="text-[#A3E635] font-bold">C {ciclo.trainingDay.carbGrams}g</div>
                  <div>G {ciclo.trainingDay.fatGrams}g</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#060A14] border border-white/[0.08] space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 font-mono">
                  <BedDouble className="w-3.5 h-3.5" />
                  <span>Descanso</span>
                </div>
                <div className="font-mono">
                  <span className="text-xl font-black text-white">{ciclo.restDay.calories}</span>
                  <span className="text-[10px] text-slate-400"> kcal</span>
                </div>
                <div className="text-[10px] font-mono text-slate-300 space-y-0.5">
                  <div>P {ciclo.restDay.proteinGrams}g</div>
                  <div className="text-amber-400 font-bold">C {ciclo.restDay.carbGrams}g</div>
                  <div>G {ciclo.restDay.fatGrams}g</div>
                </div>
              </div>
            </div>

            <p className="text-[10px] font-mono text-slate-400 leading-snug">
              Média semanal: <strong className="text-slate-200">{ciclo.weeklyAverageCalories} kcal</strong>{' '}
              contra a meta de {stats.targetCalories} kcal. A proteína não muda; o carboidrato migra
              do dia de descanso para o de treino.
            </p>
          </>
        )}

        {/* Refeição livre */}
        <div className="space-y-2 pt-2 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider font-mono">
            <PartyPopper className="w-4 h-4 text-[#A3E635]" />
            <span>Refeição livre planejada</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase">Calorias estimadas</label>
              <input
                type="number"
                step="100"
                value={caloriasLivres}
                onChange={(e) => setCaloriasLivres(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#060A14] border border-white/[0.08] rounded-2xl text-xs font-bold text-white text-center font-mono focus:border-[#84CC16] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase">Diluir em (dias)</label>
              <input
                type="number"
                min={1}
                max={13}
                value={diasCompensacao}
                onChange={(e) => setDiasCompensacao(Number(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-[#060A14] border border-white/[0.08] rounded-2xl text-xs font-bold text-white text-center font-mono focus:border-[#84CC16] focus:outline-none"
              />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#060A14] border border-white/[0.08] text-xs font-mono space-y-1">
            {livre.dailyReductionKcal === 0 ? (
              <p className="text-slate-300 leading-snug">
                Esse tamanho cabe na fatia de uma refeição normal do seu dia. Nada a compensar.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Corte por dia:</span>
                  <strong className="text-white">-{livre.dailyReductionKcal} kcal</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Meta nos dias de ajuste:</span>
                  <strong className="text-[#A3E635]">{livre.adjustedDailyTarget} kcal</strong>
                </div>
              </>
            )}
          </div>

          {livre.warning && (
            <p className="text-[10px] font-mono text-amber-400 leading-snug">{livre.warning}</p>
          )}
        </div>

        <p className="text-[10px] font-mono text-slate-500 leading-snug pt-1 border-t border-white/[0.06]">
          Estes números são um guia de planejamento. A meta gravada no seu perfil continua a mesma —
          mudá-la automaticamente conforme o dia bagunçaria o histórico e a adesão medida.
        </p>
      </div>
    </Modal>
  );
};
