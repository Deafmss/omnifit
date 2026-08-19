import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { FoodItem } from '../../core/storage/types';
import { TACO_FOOD_DATABASE } from '../../core/data/tacoDatabase';
import { Modal } from '../../components/ui/Modal';

interface FoodPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFood: (food: FoodItem, grams: number) => void;
}

export const FoodPickerModal: React.FC<FoodPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectFood
}) => {
  const [search, setSearch] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState<number | string>(100);

  const filteredFoods = TACO_FOOD_DATABASE.filter(
    (f) => search === '' || f.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirm = () => {
    if (selectedFood) {
      const cleanGrams = typeof grams === 'number' && grams > 0 ? grams : Number(grams) || 100;
      onSelectFood(selectedFood, cleanGrams);
      setSelectedFood(null);
      setGrams(100);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adicionar Alimento (Tabela TACO)"
      subtitle="Selecione um alimento para adicionar à refeição"
    >
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por frango, arroz, ovos, aveia..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* List */}
        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
          {filteredFoods.map((food) => {
            const isSelected = selectedFood?.id === food.id;
            return (
              <div
                key={food.id}
                onClick={() => setSelectedFood(food)}
                className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500 text-white'
                    : 'bg-slate-900/50 border-white/5 text-slate-300 hover:border-white/20'
                }`}
              >
                <div>
                  <p className="font-bold">{food.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {food.caloriesPer100g} kcal &bull; P: {food.proteinPer100g}g | C: {food.carbsPer100g}g | G: {food.fatPer100g}g
                  </p>
                </div>
                {isSelected && <span className="text-blue-400 font-bold text-xs">Selecionado</span>}
              </div>
            );
          })}
        </div>

        {/* Selected Config */}
        {selectedFood && (
          <div className="p-4 rounded-xl bg-slate-900 border border-blue-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Quantidade (gramas):</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={grams}
                  onChange={(e) => setGrams(e.target.value === '' ? '' : e.target.value)}
                  className="w-20 px-2 py-1 bg-slate-950 border border-white/10 rounded-lg text-sm text-white font-bold text-center font-mono"
                />
                <span className="text-xs font-bold text-slate-400">g</span>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar à Refeição</span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
