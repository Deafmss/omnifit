import React from 'react';
import { Trophy, Zap, Dumbbell, Target, Layers, FileText, Check } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { SplitTemplateType } from '../../core/storage/db';

interface SplitTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: SplitTemplateType) => void;
}

interface TemplateOption {
  id: SplitTemplateType;
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  details: string[];
  icon: React.ComponentType<{ className?: string }>;
}

const TEMPLATES: TemplateOption[] = [
  {
    id: 'ppl',
    title: 'Push / Pull / Legs (PPL)',
    badge: '3 a 6 Dias',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    description: 'Divisão clássica e mais recomendada da hipertrofia. Agrupa músculos por padrão de movimento.',
    details: [
      'Treino A (Push): Peito, Ombros e Tríceps',
      'Treino B (Pull): Costas, Posterior de Ombro e Bíceps',
      'Treino C (Legs): Quadríceps, Posteriores, Glúteos e Panturrilhas'
    ],
    icon: Trophy
  },
  {
    id: 'upper_lower',
    title: 'Upper / Lower (Superior & Inferior)',
    badge: '4 Dias',
    badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    description: 'Excelente para treinar 4 dias na semana com alta frequência (2x por semana cada músculo).',
    details: [
      'Treino A: Superior 1 (Foco Peito e Costas)',
      'Treino B: Inferior 1 (Foco Quadríceps e Panturrilhas)',
      'Treino C: Superior 2 (Foco Ombros e Braços)',
      'Treino D: Inferior 2 (Foco Posterior, Glúteo e Abdômen)'
    ],
    icon: Zap
  },
  {
    id: 'abcde',
    title: 'ABCDE (Bro Split - 1 Músculo/Dia)',
    badge: '5 Dias',
    badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    description: 'Foco em volume máximo por sessão para quem treina de segunda a sexta-feira.',
    details: [
      'Treino A: Peitoral & Abdômen',
      'Treino B: Costas & Trapézio',
      'Treino C: Pernas Completo (Quadríceps e Posteriores)',
      'Treino D: Deltoides & Ombros Completo',
      'Treino E: Braços (Bíceps, Tríceps e Antebraço)'
    ],
    icon: Dumbbell
  },
  {
    id: 'abc_classic',
    title: 'ABC Clássico Brasileiro',
    badge: '3 Dias',
    badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    description: 'A divisão mais tradicional das academias brasileiras.',
    details: [
      'Treino A: Peito, Tríceps e Abdômen',
      'Treino B: Costas, Bíceps e Trapézio',
      'Treino C: Pernas Completo e Ombros'
    ],
    icon: Target
  },
  {
    id: 'fullbody',
    title: 'Full Body (Corpo Inteiro)',
    badge: '3 Dias',
    badgeColor: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    description: 'Estimula todos os grandes grupos musculares em cada sessão.',
    details: [
      'Treino A: Ênfase Peito & Quadríceps',
      'Treino B: Ênfase Costas & Posteriores',
      'Treino C: Ênfase Ombros & Pernas'
    ],
    icon: Layers
  },
  {
    id: 'blank',
    title: 'Montar do Zero (Fichas em Branco)',
    badge: '100% Livre',
    badgeColor: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    description: 'Comece com fichas limpas para adicionar exatamente os exercícios que você já faz na sua academia.',
    details: [
      'Treino A (Vazio)',
      'Treino B (Vazio)',
      'Treino C (Vazio)'
    ],
    icon: FileText
  }
];

export const SplitTemplateModal: React.FC<SplitTemplateModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate
}) => {
  const handleChoose = (templateId: SplitTemplateType) => {
    if (confirm('Tem certeza? Isso substituirá as fichas atuais pelo modelo selecionado.')) {
      onSelectTemplate(templateId);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Escolher Divisão de Treino"
      subtitle="Selecione um modelo consagrado de hipertrofia ou crie sua própria ficha do zero"
    >
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        {TEMPLATES.map((tpl) => {
          const IconComponent = tpl.icon;
          return (
            <div
              key={tpl.id}
              onClick={() => handleChoose(tpl.id)}
              className="p-4 rounded-2xl bg-[#060A14] border border-white/[0.08] hover:border-blue-500/50 hover:bg-[#090F1E] transition-all cursor-pointer space-y-2.5 group btn-tactile"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white font-display group-hover:text-blue-400 transition-colors">
                      {tpl.title}
                    </h4>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold font-mono border ${tpl.badgeColor}`}>
                  {tpl.badge}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {tpl.description}
              </p>

              <div className="space-y-1 pt-1 border-t border-white/[0.04]">
                {tpl.details.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-300 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span>{d}</span>
                  </div>
                ))}
              </div>

              <div className="pt-1 flex items-center justify-end">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Aplicar esta divisão</span>
                  <Check className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
};
