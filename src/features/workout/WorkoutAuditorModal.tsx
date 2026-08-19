import React from 'react';
import { Info } from 'lucide-react';
import { WorkoutRoutine, ExperienceLevel } from '../../core/storage/types';
import { EXERCISE_DATABASE_MAP } from '../../core/data/exerciseDatabase';
import { auditWorkoutRoutines, MuscleAuditResult } from '../../core/math/trainingEngine';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';

interface WorkoutAuditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  routines: WorkoutRoutine[];
  level: ExperienceLevel;
}

export const WorkoutAuditorModal: React.FC<WorkoutAuditorModalProps> = ({
  isOpen,
  onClose,
  routines,
  level
}) => {
  const auditResults = auditWorkoutRoutines(routines, EXERCISE_DATABASE_MAP, level);

  const getStatusBadge = (status: MuscleAuditResult['status']) => {
    switch (status) {
      case 'optimal':
        return <Badge variant="emerald">Ótimo (MAV)</Badge>;
      case 'under':
        return <Badge variant="amber">Abaixo do MEV</Badge>;
      case 'over':
        return <Badge variant="danger">Acima do MRV</Badge>;
      case 'maintenance':
        return <Badge variant="slate">Manutenção</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Auditoria Biomecânica de Volume"
      subtitle="Baseado no modelo científico de Volume Landmarks (Dr. Mike Israetel)"
    >
      <div className="space-y-4">
        {/* Info Card */}
        <div className="p-3.5 rounded-2xl bg-[#090F1E] border border-white/[0.08] text-xs text-slate-300 space-y-1.5">
          <div className="flex items-center gap-2 text-[#A3E635] font-bold">
            <Info className="w-4 h-4" />
            <span>Volume Semanal Efetivo</span>
          </div>
          <p className="leading-relaxed">
            Músculos primários (agonistas) recebem 1.0x da contagem de séries; músculos auxiliares (sinergistas, ex: tríceps no supino) recebem 0.5x.
          </p>
        </div>

        {/* Muscle Audit List */}
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {auditResults.map((result) => {
            const { mev, mavMin, mavMax, mrv } = result.landmarks;
            const progressPercent = Math.min(100, Math.round((result.totalEffectiveSets / mrv) * 100));

            return (
              <div
                key={result.muscle}
                className="p-3.5 rounded-2xl bg-[#090F1E] border border-white/[0.08] space-y-2.5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white font-display">
                      {result.muscleLabel}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      <strong className="text-white font-bold">{result.totalEffectiveSets}</strong> séries semanais (MEV: {mev} | MAV: {mavMin}-{mavMax} | MRV: {mrv})
                    </p>
                  </div>
                  {getStatusBadge(result.status)}
                </div>

                {/* Visual Volume Bar with Markers */}
                <div className="space-y-1">
                  <div className="h-2 w-full bg-[#060A14] rounded-full overflow-hidden border border-white/5 relative">
                    <div
                      className={`h-full rounded-full transition-all ${
                        result.status === 'optimal'
                          ? 'bg-[#84CC16]'
                          : result.status === 'under'
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-snug">
                  {result.recommendation}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
