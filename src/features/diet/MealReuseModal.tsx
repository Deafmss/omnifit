import React, { useEffect, useState } from 'react';
import { CalendarDays, BookmarkPlus, Bookmark, Trash2, AlertCircle } from 'lucide-react';
import { MealPlan, MealTemplate } from '../../core/storage/types';
import {
  getDatesWithFoodLog,
  copyMealFromDate,
  saveMealAsTemplate,
  listMealTemplates,
  applyMealTemplate,
  deleteMealTemplate
} from '../../core/storage/db';
import { formatDayMonthBR } from '../../core/utils/dateUtils';
import { Modal } from '../../components/ui/Modal';

interface MealReuseModalProps {
  isOpen: boolean;
  onClose: () => void;
  meal: MealPlan;
  onApplied: () => void;
}

/**
 * Reaproveitar refeições: copiar o que foi comido em outro dia ou aplicar um
 * modelo salvo.
 *
 * O diário alimentar já guardava o histórico por data — faltava um caminho para
 * o usuário reusar aquilo em vez de remontar o prato item por item.
 */
export const MealReuseModal: React.FC<MealReuseModalProps> = ({
  isOpen,
  onClose,
  meal,
  onApplied
}) => {
  const [dias, setDias] = useState<{ date: string; itemCount: number; calories: number }[]>([]);
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [nomeTemplate, setNomeTemplate] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const carregar = async () => {
    try {
      const [diasComLog, salvos] = await Promise.all([getDatesWithFoodLog(14), listMealTemplates()]);
      setDias(diasComLog);
      setTemplates(salvos);
    } catch (err) {
      console.error('Erro ao carregar opções de reuso:', err);
      setErro('Não foi possível carregar o histórico.');
    }
  };

  useEffect(() => {
    if (isOpen) void carregar();
  }, [isOpen]);

  const executar = async (acao: () => Promise<number>, sucesso: (n: number) => string) => {
    setOcupado(true);
    setErro(null);
    setMsg(null);

    try {
      const total = await acao();
      if (total === 0) {
        setErro('Nada foi encontrado para aplicar.');
        return;
      }
      setMsg(sucesso(total));
      onApplied();
      await carregar();
    } catch (err) {
      console.error('Erro ao aplicar:', err);
      setErro('Não foi possível aplicar. Tente novamente.');
    } finally {
      setOcupado(false);
    }
  };

  const handleSalvarTemplate = async () => {
    if (!nomeTemplate.trim()) {
      setErro('Dê um nome ao modelo.');
      return;
    }

    setOcupado(true);
    setErro(null);
    setMsg(null);

    try {
      await saveMealAsTemplate(nomeTemplate, meal.portions);
      setMsg(`Modelo "${nomeTemplate.trim()}" salvo.`);
      setNomeTemplate('');
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar o modelo.');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reaproveitar Refeição" subtitle={meal.name}>
      <div className="space-y-4">
        {erro && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{erro}</span>
          </div>
        )}

        {msg && (
          <div className="p-3 rounded-2xl bg-[#84CC16]/10 border border-[#84CC16]/30 text-[#A3E635] text-xs font-semibold">
            {msg}
          </div>
        )}

        {/* Copiar de um dia anterior */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider font-mono">
            <CalendarDays className="w-4 h-4 text-[#A3E635]" />
            <span>Copiar de outro dia</span>
          </div>

          {dias.length === 0 ? (
            <p className="text-[11px] text-slate-400 leading-snug">
              Assim que você marcar alimentos como consumidos, os dias anteriores aparecem aqui para
              reaproveitar.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {dias.map((dia) => (
                <button
                  key={dia.date}
                  type="button"
                  disabled={ocupado}
                  onClick={() =>
                    executar(
                      () => copyMealFromDate(dia.date, meal.order, meal.id!),
                      (n) => `${n} ${n === 1 ? 'alimento' : 'alimentos'} copiados de ${formatDayMonthBR(dia.date)}.`
                    )
                  }
                  className="w-full p-2.5 rounded-2xl bg-[#060A14] border border-white/[0.06] hover:border-[#84CC16]/50 transition-all flex items-center justify-between text-left disabled:opacity-50"
                >
                  <span className="text-xs font-bold text-white font-mono">
                    {formatDayMonthBR(dia.date)}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {dia.itemCount} {dia.itemCount === 1 ? 'item' : 'itens'} · {dia.calories} kcal
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Modelos salvos */}
        <div className="space-y-2 pt-1 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider font-mono">
            <Bookmark className="w-4 h-4 text-[#A3E635]" />
            <span>Meus modelos</span>
          </div>

          {templates.length === 0 ? (
            <p className="text-[11px] text-slate-400 leading-snug">
              Salve esta refeição como modelo para montá-la com um toque depois.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-2.5 rounded-2xl bg-[#060A14] border border-white/[0.06] flex items-center justify-between gap-2"
                >
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() =>
                      executar(
                        () => applyMealTemplate(tpl.id!, meal.id!),
                        (n) => `${n} ${n === 1 ? 'alimento' : 'alimentos'} de "${tpl.name}" aplicados.`
                      )
                    }
                    className="flex-1 text-left min-w-0 disabled:opacity-50"
                  >
                    <span className="text-xs font-bold text-white truncate block">{tpl.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {tpl.portions.length} {tpl.portions.length === 1 ? 'alimento' : 'alimentos'}
                      {tpl.timesUsed > 0 && ` · usado ${tpl.timesUsed}x`}
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-label={`Excluir modelo ${tpl.name}`}
                    onClick={async () => {
                      if (!confirm(`Excluir o modelo "${tpl.name}"?`)) return;
                      await deleteMealTemplate(tpl.id!);
                      await carregar();
                    }}
                    className="p-1.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Salvar a refeição atual como modelo */}
        {meal.portions.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider font-mono">
              <BookmarkPlus className="w-4 h-4 text-[#A3E635]" />
              <span>Salvar esta refeição</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={nomeTemplate}
                onChange={(e) => setNomeTemplate(e.target.value)}
                placeholder="Ex: Meu café da manhã"
                className="flex-1 px-3 py-2.5 bg-[#060A14] border border-white/[0.08] rounded-2xl text-xs font-bold text-white placeholder-slate-600 focus:border-[#84CC16] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSalvarTemplate}
                disabled={ocupado || !nomeTemplate.trim()}
                className="px-4 py-2.5 rounded-2xl btn-lime text-slate-950 font-display font-black text-xs uppercase tracking-wider disabled:opacity-40"
              >
                Salvar
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
