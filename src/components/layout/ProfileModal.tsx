import React from 'react';
import { 
  RotateCcw, 
  ShieldAlert 
} from 'lucide-react';
import { UserProfile, MetabolicStats } from '../../core/storage/types';
import { Modal } from '../ui/Modal';
import { db } from '../../core/storage/db';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  stats: MetabolicStats;
  onReOnboard: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  stats,
  onReOnboard
}) => {
  const handleResetApp = async () => {
    if (confirm('Tem certeza de que deseja resetar todos os dados e refazer a calibração do zero?')) {
      await db.delete();
      window.location.reload();
    }
  };

  const getGoalName = () => {
    switch (profile.goal) {
      case 'recomposition':
        return 'Recomposição Corporal';
      case 'fat_loss':
        return 'Emagrecimento Acelerado';
      case 'hypertrophy':
        return 'Hipertrofia Limpa (Bulking)';
      case 'maintenance':
        return 'Manutenção & Performance';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Perfil & Fórmulas Metabólicas"
      subtitle={`Parâmetros científicos calibrados para ${profile.name}`}
    >
      <div className="space-y-4">
        {/* User Anthropometrics */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="font-bold text-white uppercase tracking-wider">Dados Antropométricos</span>
            <span className="text-blue-400 font-bold">{getGoalName()}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono text-center pt-1">
            <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5">
              <span className="text-[10px] text-slate-500 block">Peso Atual</span>
              <strong className="text-white font-bold text-sm">{profile.weightKg} kg</strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5">
              <span className="text-[10px] text-slate-500 block">Altura</span>
              <strong className="text-white font-bold text-sm">{profile.heightCm} cm</strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5">
              <span className="text-[10px] text-slate-500 block">% Gordura</span>
              <strong className="text-emerald-400 font-bold text-sm">{profile.bodyFatPercentage || 18}%</strong>
            </div>
          </div>
        </div>

        {/* Scientific Metabolic Breakdown */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-500/20 space-y-2.5 text-xs">
          <span className="font-bold text-blue-400 uppercase tracking-wider block">
            Detalhamento Termodinâmico Real
          </span>

          <div className="space-y-2 text-slate-300">
            <div className="flex items-center justify-between py-1 border-b border-white/5 font-mono">
              <span className="text-slate-400">TMB ({stats.formulaUsed.replace('_', ' ')}):</span>
              <strong className="text-white">{stats.bmr} kcal/dia</strong>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-white/5 font-mono">
              <span className="text-slate-400">Gasto Total (TDEE):</span>
              <strong className="text-white">{stats.tdee} kcal/dia</strong>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-white/5 font-mono">
              <span className="text-slate-400">Meta Diária Alocada:</span>
              <strong className="text-emerald-400 font-bold text-sm">{stats.targetCalories} kcal</strong>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-white/5 font-mono">
              <span className="text-slate-400">Efeito Térmico Alimentos (TEF):</span>
              <strong className="text-amber-400">~{stats.tefKcal} kcal</strong>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-white/5 font-mono">
              <span className="text-slate-400">Meta Hídrica Diária:</span>
              <strong className="text-cyan-400">{stats.waterIntakeMl} ml</strong>
            </div>

            <div className="flex items-center justify-between py-1 font-mono">
              <span className="text-slate-400">Fibras Mínimas Recomendadas:</span>
              <strong className="text-slate-200">{stats.fiberGramsTarget}g</strong>
            </div>
          </div>
        </div>

        {/* Re-calibrate / Reset Actions */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => {
              onClose();
              onReOnboard();
            }}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Editar Parâmetros & Recalibrar Plano</span>
          </button>

          <button
            onClick={handleResetApp}
            className="w-full py-2.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 font-bold text-xs transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Limpar Banco de Dados & Resetar App</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
