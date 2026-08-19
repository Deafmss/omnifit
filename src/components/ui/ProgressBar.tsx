import React from 'react';

interface ProgressBarProps {
  current: number;
  target: number;
  label?: string;
  unit?: string;
  color?: 'blue' | 'emerald' | 'amber' | 'cyan' | 'purple';
  showValues?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  target,
  label,
  unit = '',
  color = 'blue',
  showValues = true
}) => {
  const percentage = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  const colorStyles = {
    blue: 'from-blue-600 to-cyan-400 text-blue-400',
    emerald: 'from-emerald-600 to-teal-400 text-emerald-400',
    amber: 'from-amber-600 to-yellow-400 text-amber-400',
    cyan: 'from-cyan-600 to-blue-400 text-cyan-400',
    purple: 'from-purple-600 to-pink-400 text-purple-400'
  };

  return (
    <div className="space-y-1.5 w-full">
      {(label || showValues) && (
        <div className="flex items-center justify-between text-xs font-semibold">
          {label && <span className="text-slate-300">{label}</span>}
          {showValues && (
            <span className="text-slate-400 font-mono">
              <strong className="text-white font-bold">{Math.round(current)}</strong>
              <span className="text-slate-500"> / {target}{unit}</span>
            </span>
          )}
        </div>
      )}
      <div className="h-2.5 w-full bg-slate-900/90 rounded-full overflow-hidden border border-white/5 p-0.5">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${colorStyles[color]} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
