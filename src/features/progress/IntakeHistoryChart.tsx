import React, { useEffect, useState } from 'react';
import { UtensilsCrossed, TrendingUp } from 'lucide-react';
import { DailyIntakeSummary } from '../../core/storage/types';
import { getIntakeHistory } from '../../core/storage/db';
import { formatDayMonthBR } from '../../core/utils/dateUtils';

interface IntakeHistoryChartProps {
  targetCalories: number;
  days?: number;
}

/**
 * Histórico de calorias consumidas por dia, lido do diário alimentar.
 *
 * Antes o app não guardava nada do que era comido: as marcações viviam no plano
 * de refeição, sem data. Este gráfico é a primeira vez que o usuário consegue
 * ver o próprio passado alimentar.
 */
export const IntakeHistoryChart: React.FC<IntakeHistoryChartProps> = ({
  targetCalories,
  days = 14
}) => {
  const [history, setHistory] = useState<DailyIntakeSummary[] | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getIntakeHistory(days);
        if (!cancelled) setHistory(data);
      } catch (err) {
        console.error('Erro ao carregar o histórico alimentar:', err);
        if (!cancelled) setHistory([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [days]);

  if (!history) return null;

  const loggedDays = history.filter((d) => d.itemCount > 0);

  if (loggedDays.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-[#060A14] border border-white/[0.05] text-center space-y-2 text-slate-500 text-xs">
        <UtensilsCrossed className="w-8 h-8 mx-auto text-slate-600" />
        <p>
          Marque os alimentos consumidos na aba Dieta. Cada dia registrado aparece aqui, e a partir
          disso o app passa a medir sua adesão real.
        </p>
      </div>
    );
  }

  const maxCalories = Math.max(targetCalories, ...history.map((d) => d.calories));
  const averageCalories = Math.round(
    loggedDays.reduce((acc, d) => acc + d.calories, 0) / loggedDays.length
  );

  const active = hoveredIndex !== null ? history[hoveredIndex] : null;
  const targetLinePercent = maxCalories > 0 ? (targetCalories / maxCalories) * 100 : 0;

  return (
    <div className="p-4 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono">
          <TrendingUp className="w-4 h-4 text-[#A3E635]" />
          <span className="font-bold text-slate-200">Consumo Diário Registrado</span>
        </div>

        <div className="text-right font-mono">
          {active ? (
            <>
              <span className="text-xs font-black text-white">{active.calories} kcal</span>
              <span className="text-[10px] text-slate-400 block font-bold">
                {formatDayMonthBR(active.date)}
                {active.itemCount === 0 ? ' · sem registro' : ` · ${active.itemCount} itens`}
              </span>
            </>
          ) : (
            <>
              <span className="text-xs font-black text-white">{averageCalories} kcal</span>
              <span className="text-[10px] text-slate-400 block font-bold">
                média de {loggedDays.length} {loggedDays.length === 1 ? 'dia' : 'dias'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Barras diárias com linha da meta */}
      <div className="relative h-32 pt-4" onMouseLeave={() => setHoveredIndex(null)}>
        {/* Linha da meta calórica */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-[#84CC16]/50 z-10 pointer-events-none"
          style={{ bottom: `${targetLinePercent}%` }}
        >
          <span className="absolute -top-4 right-0 text-[9px] font-mono text-[#A3E635] bg-[#090F1E] px-1">
            meta {targetCalories}
          </span>
        </div>

        <div className="h-full flex items-end justify-between gap-0.5">
          {history.map((day, idx) => {
            const heightPercent = maxCalories > 0 ? (day.calories / maxCalories) * 100 : 0;
            const isHovered = hoveredIndex === idx;
            const hasLog = day.itemCount > 0;

            // Dentro de 10% da meta conta como dia no alvo.
            const withinTarget =
              hasLog && Math.abs(day.calories - targetCalories) / targetCalories <= 0.1;

            return (
              <div
                key={day.date}
                onMouseEnter={() => setHoveredIndex(idx)}
                onTouchStart={() => setHoveredIndex(idx)}
                className="flex-1 h-full flex items-end cursor-pointer group"
                title={`${formatDayMonthBR(day.date)}: ${hasLog ? `${day.calories} kcal` : 'sem registro'}`}
              >
                <div
                  style={{ height: hasLog ? `${Math.max(3, heightPercent)}%` : '2px' }}
                  className={`w-full rounded-t-md transition-all ${
                    !hasLog
                      ? 'bg-white/[0.06]'
                      : isHovered
                      ? 'bg-[#A3E635]'
                      : withinTarget
                      ? 'bg-[#84CC16]'
                      : 'bg-[#84CC16]/40'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-white/[0.04]">
        <span>{formatDayMonthBR(history[0].date)}</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded bg-[#84CC16]" />
          <span>na meta</span>
          <span className="w-2 h-2 rounded bg-[#84CC16]/40 ml-1.5" />
          <span>fora</span>
          <span className="w-2 h-2 rounded bg-white/[0.06] ml-1.5" />
          <span>sem registro</span>
        </span>
        <span>{formatDayMonthBR(history[history.length - 1].date)}</span>
      </div>
    </div>
  );
};
