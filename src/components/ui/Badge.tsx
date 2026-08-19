import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'lime' | 'blue' | 'emerald' | 'amber' | 'danger' | 'slate';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'lime',
  size = 'sm'
}) => {
  const variantStyles = {
    lime: 'bg-[#84CC16]/15 text-[#A3E635] border-[#84CC16]/30 font-mono font-bold',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30 font-mono',
    emerald: 'bg-[#84CC16]/15 text-[#A3E635] border-[#84CC16]/30 font-mono font-bold',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-mono',
    danger: 'bg-red-500/10 text-red-400 border-red-500/30 font-mono',
    slate: 'bg-slate-800 text-slate-300 border-slate-700 font-mono'
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1'
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {children}
    </span>
  );
};
