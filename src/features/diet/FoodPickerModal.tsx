import React, { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { FoodItem } from '../../core/storage/types';
import { Modal } from '../../components/ui/Modal';
import { getAllFoods } from '../../core/storage/db';
import { CustomFoodModal } from './CustomFoodModal';

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
  const [allFoods, setAllFoods] = useState<FoodItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState<number | string>(100);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  const loadFoods = async () => {
    const foods = await getAllFoods();
    setAllFoods(foods);
  };

  useEffect(() => {
    if (isOpen) {
      loadFoods();
    }
  }, [isOpen]);

  const filteredFoods = allFoods.filter((f) => {
    const matchesSearch = search === '' || f.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'all' || f.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleConfirm = () => {
    if (selectedFood) {
      const cleanGrams = typeof grams === 'number' && grams > 0 ? grams : Number(grams) || 100;
      onSelectFood(selectedFood, cleanGrams);
      setSelectedFood(null);
      setGrams(100);
      onClose();
    }
  };

  const handleFoodCreated = (newFood: FoodItem) => {
    loadFoods();
    setSelectedFood(newFood);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Tabela de Alimentos (TACO & Personalizados)"
        subtitle="Mais de 100 alimentos com dados oficiais e cadastros próprios"
      >
        <div className="space-y-4">
          {/* Action to create custom food */}
          <button
            type="button"
            onClick={() => setIsCustomModalOpen(true)}
            className="w-full py-2.5 px-3 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400 hover:bg-blue-600/25 text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Alimento pelo Rótulo da Embalagem</span>
          </button>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por frango, patinho, arroz, cuscuz, aveia, whey..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'protein', label: 'Proteínas' },
              { id: 'carb', label: 'Carboidratos' },
              { id: 'fat', label: 'Gorduras' },
              { id: 'dairy', label: 'Laticínios' },
              { id: 'supplement', label: 'Suplementos' },
              { id: 'fruit', label: 'Frutas' },
              { id: 'vegetable', label: 'Vegetais' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-lg whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
            {filteredFoods.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                Nenhum alimento encontrado. Use o botão acima para cadastrar pelo rótulo!
              </div>
            ) : (
              filteredFoods.map((food) => {
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
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold truncate">{food.name}</p>
                        {food.isCustom && (
                          <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded text-[9px] font-bold shrink-0">
                            Próprio
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {food.caloriesPer100g} kcal &bull; P: {food.proteinPer100g}g | C: {food.carbsPer100g}g | G: {food.fatPer100g}g
                      </p>
                    </div>
                    {isSelected && <span className="text-blue-400 font-bold text-xs shrink-0">Selecionado</span>}
                  </div>
                );
              })
            )}
          </div>

          {/* Selected Config */}
          {selectedFood && (
            <div className="p-4 rounded-xl bg-slate-900 border border-blue-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-300 block">Quantidade para a refeição:</span>
                  <span className="text-[10px] text-slate-400">{selectedFood.servingName}</span>
                </div>
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
                type="button"
                onClick={handleConfirm}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar à Refeição</span>
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal de cadastro personalizado */}
      <CustomFoodModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onFoodCreated={handleFoodCreated}
      />
    </>
  );
};
