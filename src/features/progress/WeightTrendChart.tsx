import React, { useState } from 'react';
import { WeightLog } from '../../core/storage/types';
import { daysBetween, formatDayMonthBR } from '../../core/utils/dateUtils';
import { TrendingDown, Scale } from 'lucide-react';

interface WeightTrendChartProps {
  logs: WeightLog[];
}

export const WeightTrendChart: React.FC<WeightTrendChartProps> = ({ logs }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (logs.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-[#060A14] border border-white/[0.05] text-center space-y-2 text-slate-500 text-xs">
        <Scale className="w-8 h-8 mx-auto text-slate-600" />
        <p>Registre suas pesagens diárias para visualizar o gráfico de tendência.</p>
      </div>
    );
  }

  // Últimos 14 registros, em ordem cronológica.
  const data = [...logs].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

  const weights = data.map((d) => d.weightKg);
  const emas = data.map((d) => d.emaWeightKg || d.weightKg);

  const allValues = [...weights, ...emas];
  const minVal = Math.floor(Math.min(...allValues) - 0.5);
  const maxVal = Math.ceil(Math.max(...allValues) + 0.5);
  const range = maxVal - minVal || 1;

  // Dimensões SVG
  const width = 360;
  const height = 160;
  const paddingX = 25;
  const paddingY = 25;

  // O eixo X é proporcional ao TEMPO REAL entre as pesagens. Distribuir por
  // índice fazia pesagens do dia 1, dia 2 e dia 60 aparecerem equidistantes,
  // mostrando uma inclinação de tendência que não corresponde à realidade.
  const firstDate = data[0].date;
  const spanDays = Math.max(1, daysBetween(firstDate, data[data.length - 1].date));

  const getX = (index: number) => {
    const offsetDays = daysBetween(firstDate, data[index].date);
    return paddingX + (offsetDays / spanDays) * (width - paddingX * 2);
  };

  const getY = (val: number) => {
    return height - paddingY - ((val - minVal) / range) * (height - paddingY * 2);
  };

  // Coordenadas para os pontos reais
  const rawPoints = data.map((d, i) => ({
    x: getX(i),
    y: getY(d.weightKg),
    date: d.date,
    weight: d.weightKg,
    ema: d.emaWeightKg || d.weightKg
  }));

  // Coordenadas para a linha suave de EMA
  const emaPoints = data.map((d, i) => ({
    x: getX(i),
    y: getY(d.emaWeightKg || d.weightKg)
  }));

  // Com um único registro não existe tendência a desenhar: antes o código
  // duplicava o ponto com `date: 'Hoje'` e traçava uma linha horizontal que
  // sugeria estabilidade inexistente.
  const emaPath = emaPoints.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = emaPoints[i - 1];
    const midX = (prev.x + pt.x) / 2;
    return `${acc} C ${midX} ${prev.y}, ${midX} ${pt.y}, ${pt.x} ${pt.y}`;
  }, '');

  // Caminho da área preenchida com gradiente
  const firstPt = emaPoints[0];
  const lastPt = emaPoints[emaPoints.length - 1];
  const areaPath = `${emaPath} L ${lastPt.x} ${height - paddingY} L ${firstPt.x} ${height - paddingY} Z`;

  const activePoint = hoveredIndex !== null ? rawPoints[hoveredIndex] : rawPoints[rawPoints.length - 1];

  return (
    <div className="p-4 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-xl space-y-3 relative overflow-hidden">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono">
          <TrendingDown className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-200">Tendência de Peso (EMA)</span>
        </div>

        {activePoint && (
          <div className="text-right font-mono">
            <span className="text-xs font-black text-white">
              {activePoint.weight} kg
              <span className="text-slate-500 font-mono font-normal ml-1.5">
                {formatDayMonthBR(activePoint.date)}
              </span>
            </span>
            <span className="text-[10px] text-emerald-400 block font-bold">
              Tendência: {activePoint.ema.toFixed(1)} kg
            </span>
          </div>
        )}
      </div>

      {/* SVG Chart Area */}
      <div className="relative w-full overflow-hidden" onMouseLeave={() => setHoveredIndex(null)}>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
          <defs>
            <linearGradient id="weightAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="weightLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0066FF" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Lines */}
          <line
            x1={paddingX}
            y1={getY(maxVal)}
            x2={width - paddingX}
            y2={getY(maxVal)}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={getY((maxVal + minVal) / 2)}
            x2={width - paddingX}
            y2={getY((maxVal + minVal) / 2)}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={getY(minVal)}
            x2={width - paddingX}
            y2={getY(minVal)}
            stroke="rgba(255,255,255,0.05)"
          />

          {/* Area Fill */}
          <path d={areaPath} fill="url(#weightAreaGrad)" />

          {/* Raw Weight Dashed Reference Line */}
          {rawPoints.length > 1 && (
            <polyline
              points={rawPoints.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
          )}

          {/* Smoothed EMA Trend Line */}
          <path
            d={emaPath}
            fill="none"
            stroke="url(#weightLineGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Raw Data Dots */}
          {rawPoints.map((pt, idx) => (
            <g
              key={idx}
              onMouseEnter={() => setHoveredIndex(idx)}
              onTouchStart={() => setHoveredIndex(idx)}
              className="cursor-pointer"
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIndex === idx ? 6 : 4}
                className={`transition-all ${
                  hoveredIndex === idx
                    ? 'fill-emerald-400 stroke-slate-950 stroke-2'
                    : 'fill-blue-400/80 stroke-slate-950 stroke-1'
                }`}
              />
            </g>
          ))}
        </svg>
      </div>

      {/* Footer Legend */}
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-white/[0.04]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-slate-500 inline-block border-t border-dashed" />
            <span>Balança</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-1 bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full inline-block" />
            <span className="text-emerald-400 font-bold">Tendência Real</span>
          </span>
        </div>
        <span>Últimas pesagens</span>
      </div>
    </div>
  );
};
