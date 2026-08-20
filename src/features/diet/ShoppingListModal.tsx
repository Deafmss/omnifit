import React, { useState, useMemo } from 'react';
import { Check, ShoppingBag } from 'lucide-react';
import { MealPlan } from '../../core/storage/types';
import { FOOD_DATABASE_MAP } from '../../core/data/tacoDatabase';
import { generateWeeklyShoppingList, ShoppingItem } from '../../core/math/macroSolver';
import { Modal } from '../../components/ui/Modal';

interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealPlans: MealPlan[];
}

export const ShoppingListModal: React.FC<ShoppingListModalProps> = ({
  isOpen,
  onClose,
  mealPlans
}) => {
  const [days, setDays] = useState<number>(7);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());

  // A lista é derivada do cardápio e do período, e não guardada em estado
  // inicializado uma única vez: o inicializador rodava na primeira renderização
  // da tela de dieta, quando `mealPlans` ainda estava vazio, e a lista abria em
  // branco a menos que o usuário trocasse o período.
  const items = useMemo<ShoppingItem[]>(
    () =>
      generateWeeklyShoppingList(mealPlans, FOOD_DATABASE_MAP, days).map((item) => ({
        ...item,
        checked: checkedIds.has(item.foodId)
      })),
    [mealPlans, days, checkedIds]
  );

  const handleDaysChange = (newDays: number) => {
    setDays(newDays);
  };

  const toggleItem = (foodId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(foodId)) {
        next.delete(foodId);
      } else {
        next.add(foodId);
      }
      return next;
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lista de Compras da Dieta"
      subtitle={`Calculada para ${days} dias de cardápio planejado`}
    >
      <div className="space-y-4">
        {/* Days Filter */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
            Período da Lista:
          </span>
          <div className="flex gap-1.5">
            {[3, 7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => handleDaysChange(d)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                  days === d
                    ? 'btn-lime text-slate-950 shadow-sm font-black'
                    : 'bg-[#060A14] text-slate-400 border border-white/5 hover:text-white'
                }`}
              >
                {d} dias
              </button>
            ))}
          </div>
        </div>

        {/* Item List */}
        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
          {items.map((item) => (
            <div
              key={item.foodId}
              onClick={() => toggleItem(item.foodId)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                item.checked
                  ? 'bg-[#060A14]/60 border-white/5 opacity-50'
                  : 'bg-[#090F1E] border-white/[0.08] hover:border-[#84CC16]/40 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                    item.checked
                      ? 'bg-[#84CC16] border-[#84CC16] text-slate-950'
                      : 'border-white/20'
                  }`}
                >
                  {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <span
                  className={`text-xs font-bold text-slate-200 ${
                    item.checked ? 'line-through text-slate-500' : ''
                  }`}
                >
                  {item.name}
                </span>
              </div>

              <span className="text-xs font-mono font-bold text-[#A3E635]">
                {item.servingDescription}
              </span>
            </div>
          ))}

          {items.length === 0 && (
            <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
              <ShoppingBag className="w-8 h-8 text-slate-600" />
              <span>Nenhum alimento cadastrado nas refeições.</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
