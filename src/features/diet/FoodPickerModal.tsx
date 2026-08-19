import React, { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { FoodItem } from '../../core/storage/types';
import { TACO_FOOD_DATABASE } from '../../core/data/tacoDatabase';
import { getAllFoods } from '../../core/storage/db';
import { formatHouseholdPortion } from '../../core/math/macroSolver';
import { Modal } from '../../components/ui/Modal';
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
  const [foods, setFoods] = useState<FoodItem[]>(TACO_FOOD_DATABASE);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState<number | string>(100);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAllFoods();
      setSearch('');
      setSelectedFood(null);
      setGrams(100);
    }
  }, [isOpen]);

  const loadAllFoods = async () => {
    const list = await getAllFoods();
    setFoods(list);
  };

  const handleFoodCreated = async (newFood: FoodItem) => {
    await loadAllFoods();
    setSelectedFood(newFood);
    setGrams(newFood.baseGrams || 100);
    setIsCustomModalOpen(false);
  };

  const filteredFoods = foods.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectFoodItem = (food: FoodItem) => {
    setSelectedFood(food);
    setGrams(food.baseGrams || 100);
  };

  const handleConfirm = () => {
    if (selectedFood) {
      const cleanGrams = typeof grams === 'number' && grams > 0 ? grams : Number(grams) || 100;
      onSelectFood(selectedFood, Math.max(1, cleanGrams));
      onClose();
    }
  };

  const handleAdjustUnits = (delta: number) => {
    if (!selectedFood || !selectedFood.servingGrams) return;
    const currentG = typeof grams === 'number' ? grams : Number(grams) || selectedFood.servingGrams;
    const newG = Math.max(selectedFood.servingGrams, currentG + (delta * selectedFood.servingGrams));
    setGrams(newG);
  };

  const household = selectedFood ? formatHouseholdPortion(selectedFood, typeof grams === 'number' ? grams : Number(grams) || 100) : null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Tabela de Alimentos Oficiais (TACO / TBCA)"
        subtitle="Selecione um alimento da base ou cadastre um novo produto pelo rótulo"
      >
        <div className="space-y-4">
          {/* Top CTA to Add Custom Food */}
          <button
            type="button"
            onClick={() => setIsCustomModalOpen(true)}
            className="w-full py-2.5 px-3 rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-400 hover:bg-blue-600/25 text-xs font-bold transition-all flex items-center justify-center gap-2 btn-tactile"
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
              placeholder="Buscar por ovos, frango, pão, arroz, aveia, whey..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#060A14] border border-white/[0.08] rounded-2xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold [scrollbar-width:none]">
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
                className={`px-3 py-1 rounded-xl whitespace-nowrap transition-all btn-tactile ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-[#060A14] text-slate-400 border border-white/5 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
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
                    onClick={() => handleSelectFoodItem(food)}
                    className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all flex items-center justify-between btn-tactile ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                        : 'bg-[#060A14] border-white/[0.06] text-slate-300 hover:border-white/[0.14]'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold truncate text-slate-100">{food.name}</p>
                        {food.isCustom && (
                          <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded text-[9px] font-bold shrink-0">
                            Próprio
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {food.servingName ? <strong className="text-amber-400 font-semibold">{food.servingName} &bull; </strong> : ''}
                        {food.caloriesPer100g} kcal/100g &bull; P: {food.proteinPer100g}g | C: {food.carbsPer100g}g | G: {food.fatPer100g}g
                      </p>
                    </div>
                    {isSelected && <span className="text-blue-400 font-bold text-xs shrink-0 font-mono">Selecionado</span>}
                  </div>
                );
              })
            )}
          </div>

          {/* Selected Food Quantity Config (Household Measures) */}
          {selectedFood && (
            <div className="p-4 rounded-2xl bg-[#060A14] border border-blue-500/30 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Quantidade da Porção:</span>
                  <span className="text-[10px] text-amber-400 font-mono font-semibold">
                    {household?.hasHousehold ? household.label : `${grams}g`}
                  </span>
                </div>

                {/* Household Stepper vs Grams */}
                {selectedFood.servingGrams ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-slate-900 border border-white/10 rounded-xl px-2 py-1">
                      <button
                        type="button"
                        onClick={() => handleAdjustUnits(-1)}
                        className="w-6 h-6 rounded bg-slate-800 text-slate-200 font-bold text-sm btn-tactile"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-white font-mono px-2 whitespace-nowrap">
                        {household?.units} {household?.abbrevUnit}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAdjustUnits(1)}
                        className="w-6 h-6 rounded bg-blue-600 text-white font-bold text-sm btn-tactile"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={grams}
                        onChange={(e) => setGrams(e.target.value === '' ? '' : e.target.value)}
                        className="w-16 px-1.5 py-1 bg-slate-950 border border-white/10 rounded-xl text-xs text-white font-bold text-center font-mono"
                      />
                      <span className="text-xs text-slate-400 font-mono">g</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={grams}
                      onChange={(e) => setGrams(e.target.value === '' ? '' : e.target.value)}
                      className="w-20 px-2 py-1 bg-slate-950 border border-white/10 rounded-xl text-sm text-white font-bold text-center font-mono"
                    />
                    <span className="text-xs font-bold text-slate-400">g</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleConfirm}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-teal-500 to-emerald-500 text-white font-extrabold text-xs shadow-lg btn-tactile flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar à Refeição 🚀</span>
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
