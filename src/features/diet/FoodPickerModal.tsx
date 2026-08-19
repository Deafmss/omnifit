import React, { useState, useEffect } from 'react';
import { Search, Plus, Globe, BookOpen, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { FoodItem } from '../../core/storage/types';
import { TACO_FOOD_DATABASE } from '../../core/data/tacoDatabase';
import { getAllFoods, saveFoodItem } from '../../core/storage/db';
import { formatHouseholdPortion, calculateFoodNutrients } from '../../core/math/macroSolver';
import { searchOpenFoodFacts } from '../../core/services/openFoodFacts';
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
  const [searchMode, setSearchMode] = useState<'local' | 'online'>('local');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState<number | string>(100);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // Estados de busca online
  const [onlineResults, setOnlineResults] = useState<FoodItem[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [hasSearchedOnline, setHasSearchedOnline] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAllFoods();
      setSearch('');
      setSearchMode('local');
      setSelectedFood(null);
      setGrams(100);
      setOnlineResults([]);
      setHasSearchedOnline(false);
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

  // Busca online com debounce
  useEffect(() => {
    if (searchMode !== 'online') return;

    const trimmed = search.trim();
    if (trimmed.length < 2) {
      setOnlineResults([]);
      setHasSearchedOnline(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingOnline(true);
      const results = await searchOpenFoodFacts(trimmed);
      setOnlineResults(results);
      setIsSearchingOnline(false);
      setHasSearchedOnline(true);
    }, 450);

    return () => clearTimeout(timer);
  }, [search, searchMode]);

  const handleTriggerOnlineSearch = async () => {
    setSearchMode('online');
    if (search.trim().length >= 2) {
      setIsSearchingOnline(true);
      const results = await searchOpenFoodFacts(search.trim());
      setOnlineResults(results);
      setIsSearchingOnline(false);
      setHasSearchedOnline(true);
    }
  };

  const filteredLocalFoods = foods.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectFoodItem = (food: FoodItem) => {
    setSelectedFood(food);
    setGrams(food.servingGrams || food.baseGrams || 100);
  };

  const handleConfirm = async () => {
    if (selectedFood) {
      const cleanGrams = typeof grams === 'number' && grams > 0 ? grams : Number(grams) || 100;
      
      // Se veio da busca online, salva no IndexedDB para ficar sempre disponível offline
      if (selectedFood.id.startsWith('off_')) {
        await saveFoodItem(selectedFood);
      }

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
  const selectedNutrients = selectedFood ? calculateFoodNutrients(selectedFood, typeof grams === 'number' ? grams : Number(grams) || 100) : null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Catálogo Oficial de Alimentos"
        subtitle="Consulte a tabela oficial TACO/TBCA ou pesquise mais de 50.000 produtos comerciais"
      >
        <div className="space-y-3.5">
          {/* Toggle de Modo: Base Local vs Base Nacional */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#060A14] border border-white/[0.08] rounded-2xl">
            <button
              type="button"
              onClick={() => setSearchMode('local')}
              className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 btn-tactile ${
                searchMode === 'local'
                  ? 'btn-lime text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Tabela Oficial (TACO)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSearchMode('online');
                if (search.trim().length >= 2 && onlineResults.length === 0) {
                  handleTriggerOnlineSearch();
                }
              }}
              className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 btn-tactile ${
                searchMode === 'online'
                  ? 'btn-lime text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Base Nacional (50.000+)</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                searchMode === 'local'
                  ? 'Buscar por frango, arroz, ovos, salsicha, mortadela, pizza...'
                  : 'Digite a marca ou produto (ex: Salsicha Sadia, Whey Growth, Danone)...'
              }
              className="w-full pl-10 pr-4 py-2.5 bg-[#060A14] border border-white/[0.08] rounded-2xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
            {isSearchingOnline && (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
            )}
          </div>

          {/* Category Filter Pills (apenas no modo local) */}
          {searchMode === 'local' && (
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
                      ? 'btn-lime text-slate-950 shadow-sm font-bold'
                      : 'bg-[#060A14] text-slate-400 border border-white/5 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            {searchMode === 'local' ? (
              <>
                {filteredLocalFoods.length === 0 ? (
                  <div className="p-5 text-center space-y-2">
                    <p className="text-slate-400 text-xs">Nenhum alimento encontrado na lista local.</p>
                    <button
                      type="button"
                      onClick={handleTriggerOnlineSearch}
                      className="px-3.5 py-2 rounded-xl bg-[#84CC16]/20 text-[#A3E635] hover:bg-[#84CC16]/30 border border-[#84CC16]/30 text-xs font-bold transition-all inline-flex items-center gap-1.5 btn-tactile"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Buscar "{search}" na Base Nacional (50.000+ marcas)</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {filteredLocalFoods.map((food) => {
                      const isSelected = selectedFood?.id === food.id;
                      return (
                        <div
                          key={food.id}
                          onClick={() => handleSelectFoodItem(food)}
                          className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all flex items-center justify-between btn-tactile ${
                            isSelected
                              ? 'bg-[#84CC16]/15 border-[#84CC16] text-white shadow-md'
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
                              {food.servingName ? (
                                <strong className="text-amber-400 font-semibold">{food.servingName} &bull; </strong>
                              ) : (
                                ''
                              )}
                              {food.caloriesPer100g} kcal/100g &bull; P: {food.proteinPer100g}g | C: {food.carbsPer100g}g | G: {food.fatPer100g}g
                            </p>
                          </div>
                          {isSelected && <span className="text-[#A3E635] font-bold text-xs shrink-0 font-mono">Selecionado</span>}
                        </div>
                      );
                    })}

                    {search.trim().length >= 2 && (
                      <div
                        onClick={handleTriggerOnlineSearch}
                        className="p-2.5 rounded-2xl border border-dashed border-[#84CC16]/30 bg-[#84CC16]/10 hover:bg-[#84CC16]/20 text-center cursor-pointer transition-all flex items-center justify-center gap-2 text-xs font-bold text-[#A3E635] btn-tactile"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#A3E635]" />
                        <span>Não achou sua marca? Buscar "{search}" na Base Nacional Oficial</span>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                {isSearchingOnline ? (
                  <div className="p-8 text-center space-y-2">
                    <Loader2 className="w-6 h-6 text-[#A3E635] animate-spin mx-auto" />
                    <p className="text-xs text-slate-400">Consultando base nacional de rótulos comerciais...</p>
                  </div>
                ) : onlineResults.length === 0 ? (
                  <div className="p-6 text-center space-y-1.5 text-slate-400 text-xs">
                    {hasSearchedOnline ? (
                      <>
                        <AlertCircle className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                        <p>Nenhum produto encontrado na base nacional para "{search}".</p>
                        <p className="text-[11px] text-slate-500">Tente buscar por um termo mais simples ou cadastre pelo rótulo.</p>
                      </>
                    ) : (
                      <p>Digite o nome do produto ou marca para pesquisar em 50.000+ itens brasileiros.</p>
                    )}
                  </div>
                ) : (
                  onlineResults.map((food) => {
                    const isSelected = selectedFood?.id === food.id;
                    return (
                      <div
                        key={food.id}
                        onClick={() => handleSelectFoodItem(food)}
                        className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all flex items-center justify-between btn-tactile ${
                          isSelected
                            ? 'bg-[#84CC16]/15 border-[#84CC16] text-white shadow-md'
                            : 'bg-[#060A14] border-white/[0.06] text-slate-300 hover:border-white/[0.14]'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold truncate text-slate-100">{food.name}</p>
                            <span className="px-1.5 py-0.2 bg-[#84CC16]/20 text-[#A3E635] rounded text-[9px] font-bold shrink-0 font-mono">
                              Nacional
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {food.servingName ? <span className="text-white font-bold">{food.servingName} &bull; </span> : ''}
                            {food.caloriesPer100g} kcal/100g &bull; P: {food.proteinPer100g}g | C: {food.carbsPer100g}g | G: {food.fatPer100g}g
                          </p>
                        </div>
                        {isSelected && <span className="text-[#A3E635] font-bold text-xs shrink-0 font-mono">Selecionado</span>}
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>

          {selectedFood && selectedNutrients && (
            <div className="p-4 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-white font-display">
                    {selectedFood.name}
                  </h4>
                  <p className="text-xs text-[#A3E635] font-mono font-bold mt-0.5">
                    {selectedNutrients.calories} kcal
                    <span className="text-slate-400 font-normal text-[10px] ml-2">
                      (P: {selectedNutrients.protein}g | C: {selectedNutrients.carbs}g | G: {selectedNutrients.fat}g)
                    </span>
                  </p>
                </div>

                {selectedFood.servingGrams ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-[#060A14] border border-white/10 rounded-xl px-2 py-1">
                      <button
                        type="button"
                        onClick={() => handleAdjustUnits(-1)}
                        className="w-6 h-6 rounded bg-[#090F1E] text-slate-200 font-bold text-sm btn-tactile"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-white font-mono px-2 whitespace-nowrap">
                        {household?.units} {household?.abbrevUnit}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAdjustUnits(1)}
                        className="w-6 h-6 rounded btn-lime text-slate-950 font-bold text-sm btn-tactile"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={grams}
                        onChange={(e) => setGrams(e.target.value === '' ? '' : e.target.value)}
                        className="w-16 px-1.5 py-1 bg-slate-950 border border-white/10 rounded-xl text-xs text-white font-bold text-center font-mono focus:border-[#84CC16] focus:outline-none"
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
                      className="w-20 px-2 py-1 bg-slate-950 border border-white/10 rounded-xl text-sm text-white font-bold text-center font-mono focus:border-[#84CC16] focus:outline-none"
                    />
                    <span className="text-xs font-bold text-slate-400">g</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleConfirm}
                className="w-full py-3 rounded-2xl btn-lime text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-lime-500/20 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar à Refeição</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsCustomModalOpen(true)}
            className="w-full py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 text-slate-400 hover:text-slate-200 text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 btn-tactile"
          >
            <Plus className="w-3 h-3" />
            <span>Cadastrar produto específico manualmente</span>
          </button>
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
