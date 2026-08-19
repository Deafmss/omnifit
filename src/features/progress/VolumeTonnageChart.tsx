import React, { useState } from 'react';
import { WorkoutSessionLog } from '../../core/storage/types';
import { Dumbbell, Trophy } from 'lucide-react';

interface VolumeTonnageChartProps {
  sessions: WorkoutSessionLog[];
}

export const VolumeTonnageChart: React.FC<VolumeTonnageChartProps> = ({ sessions }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (sessions.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-[#060A14] border border-white/[0.05] text-center space-y-2 text-slate-500 text-xs">
        <Dumbbell className="w-8 h-8 mx-auto text-slate-600" />
        <p>Inicie e conclua seus primeiros treinos para visualizar o gráfico de tonelagem.</p>
      </div>
    );
  }

  // Pega os últimos 7 treinos concluídos em ordem cronológica
  const data = sessions
    .filter((s) => s.completed)
    .slice(0, 7)
    .reverse();

  const tonnages = data.map((s) => Number((s.totalVolumeLoadKg / 1000).toFixed(1)));
  const maxTonnage = Math.max(...tonnages, 5);

  const activeSession = hoveredIndex !== null ? data[hoveredIndex] : data[data.length - 1];

  return (
    <div className="p-4 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-xl space-y-3 relative overflow-hidden">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono">
          <Trophy className="w-4 h-4 text-[#A3E635]" />
          <span className="font-bold text-slate-200">Sobrecarga & Volume Semanal</span>
        </div>

        {activeSession && (
          <div className="text-right font-mono">
            <span className="text-xs font-black text-white">
              {(activeSession.totalVolumeLoadKg / 1000).toFixed(1)} toneladas
            </span>
            <span className="text-[10px] text-[#A3E635] block font-bold truncate max-w-[150px]">
              {activeSession.name}
            </span>
          </div>
        )}
      </div>

      {/* Bar Chart Area (Gym UI Kit Style) */}
      <div className="h-32 flex items-end justify-between gap-2 pt-6 px-1">
        {data.map((s, idx) => {
          const ton = Number((s.totalVolumeLoadKg / 1000).toFixed(1));
          const heightPercent = Math.max(15, (ton / maxTonnage) * 100);
          const isHovered = hoveredIndex === idx;

          return (
            <div
              key={s.id || idx}
              onMouseEnter={() => setHoveredIndex(idx)}
              onTouchStart={() => setHoveredIndex(idx)}
              className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer"
            >
              {/* Tonnage value tag */}
              <span
                className={`text-[9px] font-mono font-extrabold transition-all ${
                  isHovered ? 'text-[#A3E635] scale-110' : 'text-slate-500'
                }`}
              >
                {ton}t
              </span>

              {/* Bar */}
              <div className="w-full max-w-[32px] bg-[#060A14] rounded-2xl h-full flex items-end p-0.5 border border-white/[0.04] overflow-hidden">
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-xl transition-all duration-500 ${
                    isHovered
                      ? 'bg-[#A3E635] glow-lime'
                      : 'bg-[#84CC16] opacity-85 group-hover:opacity-100'
                  }`}
                />
              </div>

              {/* Date / Label */}
              <span className="text-[9px] font-mono text-slate-500 truncate w-full text-center">
                {s.date.split('-').slice(1).join('/')}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer Legend */}
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-white/[0.04]">
        <span>Volume mecânico total por sessão</span>
        <span className="text-[#A3E635] font-bold">Frequência Semanal</span>
      </div>
    </div>
  );
};
