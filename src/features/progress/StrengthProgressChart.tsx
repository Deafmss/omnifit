import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Trophy, Dumbbell } from 'lucide-react';
import { WorkoutSessionLog } from '../../core/storage/types';
import { EXERCISE_DATABASE_MAP } from '../../core/data/exerciseDatabase';
import { buildExerciseProgress, listTrainedExercises } from '../../core/math/strengthProgress';
import { formatDayMonthBR } from '../../core/utils/dateUtils';

interface StrengthProgressChartProps {
  sessions: WorkoutSessionLog[];
}

/**
 * Evolução de carga por exercício.
 *
 * O app já gravava peso e repetições de toda série executada e mostrava apenas
 * a tonelagem total — o dado mais motivador do treino estava invisível.
 */
export const StrengthProgressChart: React.FC<StrengthProgressChartProps> = ({ sessions }) => {
  const treinados = useMemo(() => listTrainedExercises(sessions), [sessions]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const exercicioAtual = selectedId || treinados[0]?.exerciseId || null;

  const progresso = useMemo(
    () => (exercicioAtual ? buildExerciseProgress(sessions, exercicioAtual) : null),
    [exercicioAtual, sessions]
  );

  if (treinados.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-[#060A14] border border-white/[0.05] text-center space-y-2 text-slate-500 text-xs">
        <Dumbbell className="w-8 h-8 mx-auto text-slate-600" />
        <p>
          Registre as cargas durante o treino. A partir da segunda sessão do mesmo exercício, sua
          evolução de força aparece aqui.
        </p>
      </div>
    );
  }

  if (!progresso || progresso.points.length === 0) return null;

  const { points, bestWeightKg, best1RmKg, weightChangePercent, trend } = progresso;

  const maxWeight = Math.max(...points.map((p) => p.topWeightKg));
  const ativo = hoveredIndex !== null ? points[hoveredIndex] : points[points.length - 1];

  const tendencia = {
    subindo: { icone: TrendingUp, cor: 'text-[#A3E635]', texto: 'Carga subindo' },
    caindo: { icone: TrendingDown, cor: 'text-amber-400', texto: 'Carga caindo' },
    estavel: { icone: Minus, cor: 'text-slate-400', texto: 'Carga estável' },
    insuficiente: { icone: Minus, cor: 'text-slate-500', texto: 'Poucas sessões' }
  }[trend];

  const IconeTendencia = tendencia.icone;

  return (
    <div className="p-4 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-xl space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-mono min-w-0">
          <Dumbbell className="w-4 h-4 text-[#A3E635] shrink-0" />
          <span className="font-bold text-slate-200 truncate">Evolução de Carga</span>
        </div>

        <div className={`flex items-center gap-1 text-[10px] font-mono font-bold ${tendencia.cor}`}>
          <IconeTendencia className="w-3.5 h-3.5" />
          <span>{tendencia.texto}</span>
        </div>
      </div>

      {/* Seletor de exercício */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {treinados.slice(0, 8).map(({ exerciseId, sessions: total }) => {
          const nome = EXERCISE_DATABASE_MAP.get(exerciseId)?.name || exerciseId;
          const ativoSelecionado = exerciseId === exercicioAtual;

          return (
            <button
              key={exerciseId}
              type="button"
              onClick={() => {
                setSelectedId(exerciseId);
                setHoveredIndex(null);
              }}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold whitespace-nowrap transition-all shrink-0 ${
                ativoSelecionado
                  ? 'bg-[#84CC16] text-slate-950'
                  : 'bg-[#060A14] text-slate-400 border border-white/[0.06] hover:text-white'
              }`}
              title={`${nome} · ${total} ${total === 1 ? 'sessão' : 'sessões'}`}
            >
              {nome.length > 22 ? `${nome.slice(0, 22)}…` : nome}
            </button>
          );
        })}
      </div>

      {/* Leitura do ponto ativo */}
      <div className="flex items-end justify-between gap-2 font-mono">
        <div>
          <span className="text-2xl font-black text-white">{ativo.topWeightKg}</span>
          <span className="text-xs text-slate-400 font-bold"> kg</span>
          <span className="text-[10px] text-slate-500 block">
            {ativo.topSetReps} reps · {formatDayMonthBR(ativo.date)}
          </span>
        </div>

        <div className="text-right text-[10px] text-slate-400 space-y-0.5">
          <div>
            recorde <strong className="text-[#A3E635]">{bestWeightKg} kg</strong>
          </div>
          <div title="Estimativa de 1 repetição máxima pela fórmula de Epley">
            1RM est. <strong className="text-slate-200">{best1RmKg} kg</strong>
          </div>
        </div>
      </div>

      {/* Barras por sessão */}
      <div
        className="h-24 flex items-end justify-between gap-1"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {points.slice(-12).map((p, idx, arr) => {
          const indiceReal = points.length - arr.length + idx;
          const altura = maxWeight > 0 ? (p.topWeightKg / maxWeight) * 100 : 0;
          const isHovered = hoveredIndex === indiceReal;
          const isRecorde = p.topWeightKg === bestWeightKg;

          return (
            <div
              key={`${p.date}-${idx}`}
              onMouseEnter={() => setHoveredIndex(indiceReal)}
              onTouchStart={() => setHoveredIndex(indiceReal)}
              className="flex-1 h-full flex items-end cursor-pointer"
              title={`${formatDayMonthBR(p.date)}: ${p.topWeightKg} kg × ${p.topSetReps} reps`}
            >
              <div
                style={{ height: `${Math.max(6, altura)}%` }}
                className={`w-full rounded-t-md transition-all ${
                  isHovered ? 'bg-[#A3E635]' : isRecorde ? 'bg-[#84CC16]' : 'bg-[#84CC16]/40'
                }`}
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-white/[0.04]">
        <span>{formatDayMonthBR(points[Math.max(0, points.length - 12)].date)}</span>
        <span className="flex items-center gap-1">
          <Trophy className="w-3 h-3 text-[#A3E635]" />
          <span>
            {weightChangePercent >= 0 ? '+' : ''}
            {weightChangePercent}% desde o início
          </span>
        </span>
        <span>{formatDayMonthBR(points[points.length - 1].date)}</span>
      </div>
    </div>
  );
};
