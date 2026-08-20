import React, { useState } from 'react';
import { Plus, Tag } from 'lucide-react';
import { FoodItem } from '../../core/storage/types';
import { Modal } from '../../components/ui/Modal';
import { db } from '../../core/storage/db';

interface CustomFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFoodCreated: (food: FoodItem) => void;
}

export const CustomFoodModal: React.FC<CustomFoodModalProps> = ({
  isOpen,
  onClose,
  onFoodCreated
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<FoodItem['category']>('protein');
  const [portionGrams, setPortionGrams] = useState<number | string>(100);
  
  // Nutrientes da porção informada
  const [calories, setCalories] = useState<number | string>('');
  const [protein, setProtein] = useState<number | string>('');
  const [carbs, setCarbs] = useState<number | string>('');
  const [fat, setFat] = useState<number | string>('');
  const [fiber, setFiber] = useState<number | string>('0');
  const [sodium, setSodium] = useState<number | string>('0');

  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o nome do alimento ou produto.');
      return;
    }

    // A porção precisa ser positiva: um valor negativo produziria macros
    // negativos, e zero dividiria por zero.
    const parsedPortion = Number(portionGrams);
    const cleanPortion = Number.isFinite(parsedPortion) && parsedPortion > 0 ? parsedPortion : 100;
    const factor = 100 / cleanPortion;

    const positive = (value: number | string) => Math.max(0, Number(value) || 0);

    const cleanCalories = positive(calories) * factor;
    const cleanProtein = positive(protein) * factor;
    const cleanCarbs = positive(carbs) * factor;
    const cleanFat = positive(fat) * factor;
    const cleanFiber = positive(fiber) * factor;
    const cleanSodium = positive(sodium) * factor;

    // Slug sem acentos, no mesmo padrão dos ids da base oficial.
    const slug = name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40);

    const newFood: FoodItem = {
      id: `custom_${Date.now().toString(36)}_${slug || 'alimento'}`,
      name: name.trim(),
      category,
      servingName: `Porção (${cleanPortion}g)`,
      baseGrams: 100,
      // Preserva a porção informada pelo usuário para as medidas caseiras;
      // antes ela era descartada e a tela voltava a exibir apenas gramas.
      servingGrams: cleanPortion,
      caloriesPer100g: Math.round(cleanCalories),
      proteinPer100g: Number(cleanProtein.toFixed(1)),
      carbsPer100g: Number(cleanCarbs.toFixed(1)),
      fatPer100g: Number(cleanFat.toFixed(1)),
      fiberPer100g: Number(cleanFiber.toFixed(1)),
      sodiumMgPer100g: Math.round(cleanSodium),
      isCustom: true
    };

    await db.customFoods.add(newFood);
    onFoodCreated(newFood);
    onClose();

    // Reset Form
    setName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setFiber('0');
    setSodium('0');
    setError('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cadastrar Alimento pelo Rótulo"
      subtitle="Digite os valores da tabela nutricional da embalagem"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
            Nome do Alimento / Marca
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Whey 100% Max Titanium, Barra Protein Dark..."
            className="w-full px-3 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FoodItem['category'])}
              className="w-full px-3 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="protein">Proteína / Carne / Ovo</option>
              <option value="carb">Carboidrato / Cereal</option>
              <option value="fat">Gordura / Oleaginosa</option>
              <option value="dairy">Laticínio</option>
              <option value="supplement">Suplemento</option>
              <option value="fruit">Fruta</option>
              <option value="vegetable">Vegetal</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
              Porção do Rótulo (g ou ml)
            </label>
            <input
              type="number"
              value={portionGrams}
              onChange={(e) => setPortionGrams(e.target.value === '' ? '' : e.target.value)}
              placeholder="Ex: 30"
              className="w-full px-3 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white text-xs font-bold text-center font-mono focus:border-blue-500"
            />
          </div>
        </div>

        {/* Nutritional Values Grid */}
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
            <Tag className="w-3.5 h-3.5" />
            <span>Valores na Porção de {portionGrams || 100}g informada</span>
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono text-center text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Calorias (kcal)</span>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value === '' ? '' : e.target.value)}
                placeholder="Ex: 120"
                className="w-full p-2 bg-slate-950 border border-white/10 rounded-lg text-white font-bold text-center"
                required
              />
            </div>
            <div>
              <span className="text-[10px] text-blue-400 block mb-1">Proteína (g)</span>
              <input
                type="number"
                step="0.1"
                value={protein}
                onChange={(e) => setProtein(e.target.value === '' ? '' : e.target.value)}
                placeholder="Ex: 24"
                className="w-full p-2 bg-slate-950 border border-blue-500/30 rounded-lg text-white font-bold text-center"
                required
              />
            </div>
            <div>
              <span className="text-[10px] text-amber-400 block mb-1">Carboidratos (g)</span>
              <input
                type="number"
                step="0.1"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value === '' ? '' : e.target.value)}
                placeholder="Ex: 2.5"
                className="w-full p-2 bg-slate-950 border border-amber-500/30 rounded-lg text-white font-bold text-center"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono text-center text-xs">
            <div>
              <span className="text-[10px] text-emerald-400 block mb-1">Gorduras (g)</span>
              <input
                type="number"
                step="0.1"
                value={fat}
                onChange={(e) => setFat(e.target.value === '' ? '' : e.target.value)}
                placeholder="Ex: 1.5"
                className="w-full p-2 bg-slate-950 border border-emerald-500/30 rounded-lg text-white font-bold text-center"
                required
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Fibras (g)</span>
              <input
                type="number"
                step="0.1"
                value={fiber}
                onChange={(e) => setFiber(e.target.value === '' ? '' : e.target.value)}
                placeholder="0"
                className="w-full p-2 bg-slate-950 border border-white/10 rounded-lg text-white font-bold text-center"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Sódio (mg)</span>
              <input
                type="number"
                value={sodium}
                onChange={(e) => setSodium(e.target.value === '' ? '' : e.target.value)}
                placeholder="0"
                className="w-full p-2 bg-slate-950 border border-white/10 rounded-lg text-white font-bold text-center"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-extrabold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Salvar no Meu Banco de Alimentos</span>
        </button>
      </form>
    </Modal>
  );
};
