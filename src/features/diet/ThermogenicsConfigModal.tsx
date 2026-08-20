import React, { useState } from 'react';
import { Coffee, Zap, Flame, Sparkles, Check, Sliders } from 'lucide-react';
import { UserProfile, MetabolicStats, CoffeeConfig, PreWorkoutFormula } from '../../core/storage/types';
import { 
  USER_PRE_WORKOUT_FORMULA,
  calculateCaffeineThermogenesis,
  calculatePreWorkoutThermogenesis
} from '../../core/math/thermogenics';
import { Modal } from '../../components/ui/Modal';
import { saveProfile } from '../../core/storage/db';

interface ThermogenicsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  stats: MetabolicStats;
  onSaved: () => void;
}

export const ThermogenicsConfigModal: React.FC<ThermogenicsConfigModalProps> = ({
  isOpen,
  onClose,
  profile,
  stats,
  onSaved
}) => {
  const [activeTab, setActiveTab] = useState<'coffee' | 'preworkout'>('coffee');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Coffee State
  // Deriva o preset a partir do que já está salvo. Antes iniciava sempre em
  // 'standard', então salvar de novo gravava o nome "Xícara Coada" com o volume
  // e a cafeína de outra dose.
  const [selectedCupType, setSelectedCupType] = useState<'espresso' | 'standard' | 'mug' | 'custom'>(() => {
    const ml = profile.coffeeConfig?.servingMl;
    if (ml === 50) return 'espresso';
    if (ml === 150) return 'standard';
    if (ml === 250) return 'mug';
    return profile.coffeeConfig ? 'custom' : 'standard';
  });
  const [coffeeMl, setCoffeeMl] = useState<number | string>(profile.coffeeConfig?.servingMl || 150);
  const [coffeeCaffeineMg, setCoffeeCaffeineMg] = useState<number | string>(profile.coffeeConfig?.caffeineMg || 100);

  // Pre-Workout State
  const [preName, setPreName] = useState<string>(profile.preWorkoutFormula?.name || USER_PRE_WORKOUT_FORMULA.name);
  const [preDoseGrams, setPreDoseGrams] = useState<number | string>(profile.preWorkoutFormula?.doseGrams || 10);
  const [preCaffeineMg, setPreCaffeineMg] = useState<number | string>(profile.preWorkoutFormula?.caffeineMg || 400);
  const [preTaurineMg, setPreTaurineMg] = useState<number | string>(profile.preWorkoutFormula?.taurineMg || 2000);
  const [preBetaAlanineMg, setPreBetaAlanineMg] = useState<number | string>(profile.preWorkoutFormula?.betaAlanineMg || 2000);

  // TMB real do usuário: a queima termogênica escala com ela, então usar um
  // valor fixo de 1800 fazia o preview divergir do que o app credita no dia.
  const bmr = stats.bmr;

  // Cálculos reativos em tempo real
  const currentCoffeeCaffeine = typeof coffeeCaffeineMg === 'number' ? coffeeCaffeineMg : Number(coffeeCaffeineMg) || 100;
  const coffeePreview = calculateCaffeineThermogenesis(currentCoffeeCaffeine, bmr);

  const currentPreFormula: PreWorkoutFormula = {
    name: preName.trim() || 'Pré-Treino',
    doseGrams: typeof preDoseGrams === 'number' ? preDoseGrams : Number(preDoseGrams) || 10,
    caffeineMg: typeof preCaffeineMg === 'number' ? preCaffeineMg : Number(preCaffeineMg) || 400,
    taurineMg: typeof preTaurineMg === 'number' ? preTaurineMg : Number(preTaurineMg) || 2000,
    betaAlanineMg: typeof preBetaAlanineMg === 'number' ? preBetaAlanineMg : Number(preBetaAlanineMg) || 2000,
    // Campos que não aparecem nesta tela são preservados do perfil, em vez de
    // voltarem para o padrão de fábrica a cada edição.
    arginineMg: profile.preWorkoutFormula?.arginineMg ?? USER_PRE_WORKOUT_FORMULA.arginineMg,
    sodiumMg: profile.preWorkoutFormula?.sodiumMg ?? USER_PRE_WORKOUT_FORMULA.sodiumMg,
    vitaminB5Mg: profile.preWorkoutFormula?.vitaminB5Mg ?? USER_PRE_WORKOUT_FORMULA.vitaminB5Mg,
    vitaminB6Mg: profile.preWorkoutFormula?.vitaminB6Mg ?? USER_PRE_WORKOUT_FORMULA.vitaminB6Mg,
    vitaminEMg: profile.preWorkoutFormula?.vitaminEMg ?? USER_PRE_WORKOUT_FORMULA.vitaminEMg,
    chromiumMcg: profile.preWorkoutFormula?.chromiumMcg ?? USER_PRE_WORKOUT_FORMULA.chromiumMcg,
    zeroSugar: profile.preWorkoutFormula?.zeroSugar ?? true
  };
  const preWorkoutPreview = calculatePreWorkoutThermogenesis(currentPreFormula, bmr, 1);

  const handleSelectCupPreset = (type: 'espresso' | 'standard' | 'mug') => {
    setSelectedCupType(type);
    if (type === 'espresso') {
      setCoffeeMl(50);
      setCoffeeCaffeineMg(65);
    } else if (type === 'standard') {
      setCoffeeMl(150);
      setCoffeeCaffeineMg(100);
    } else if (type === 'mug') {
      setCoffeeMl(250);
      setCoffeeCaffeineMg(165);
    }
  };

  const handleApplyPrePreset = (caffeine: number, dose: number, taurine: number) => {
    setPreCaffeineMg(caffeine);
    setPreDoseGrams(dose);
    setPreTaurineMg(taurine);
    setPreName(caffeine >= 350 ? 'Pré-Treino Hardcore' : caffeine >= 250 ? 'Pré-Treino Médio' : 'Pré-Treino Leve');
  };

  const handleSave = async () => {
    const finalCoffee: CoffeeConfig = {
      name: selectedCupType === 'espresso' ? 'Dose Expresso' : selectedCupType === 'mug' ? 'Caneca Grande' : selectedCupType === 'custom' ? 'Café Personalizado' : 'Xícara Coada',
      servingMl: typeof coffeeMl === 'number' && coffeeMl > 0 ? coffeeMl : Number(coffeeMl) || 150,
      caffeineMg: currentCoffeeCaffeine
    };

    try {
      await saveProfile({
        ...profile,
        coffeeConfig: finalCoffee,
        preWorkoutFormula: currentPreFormula
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error('Erro ao salvar configuração de termogênicos:', err);
      setErrorMsg('Não foi possível salvar a configuração. Tente novamente.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configurar Doses de Estimulantes"
      subtitle="Defina o tamanho da sua xícara e a fórmula do seu pré-treino"
    >
      <div className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-2xl border border-white/5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('coffee')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'coffee'
                ? 'bg-amber-600/20 border border-amber-500/40 text-amber-400 shadow-md shadow-amber-500/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Coffee className="w-4 h-4" />
            <span>Café Puro</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preworkout')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'preworkout'
                ? 'bg-blue-600/20 border border-blue-500/40 text-blue-400 shadow-md shadow-blue-500/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Pré-Treino</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* ABA: CAFÉ PURO                                            */}
        {/* ========================================================= */}
        {activeTab === 'coffee' && (
          <div className="space-y-4 animate-in fade-in">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Qual é o tamanho da sua xícara habitual?
            </span>

            {/* Visual Cups Grid (2x2) */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Expresso */}
              <div
                onClick={() => handleSelectCupPreset('espresso')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 relative overflow-hidden ${
                  selectedCupType === 'espresso'
                    ? 'bg-amber-600/20 border-amber-500 text-white shadow-lg shadow-amber-500/15'
                    : 'bg-slate-900/70 border-white/5 text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Coffee className="w-4 h-4" />
                  </div>
                  {selectedCupType === 'espresso' && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">Expresso Curto</h4>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">50ml &bull; ~65mg caf</p>
                </div>
                <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Queima:</span>
                  <span className="text-amber-400 font-bold">+12 kcal</span>
                </div>
              </div>

              {/* Xícara Tradicional */}
              <div
                onClick={() => handleSelectCupPreset('standard')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 relative overflow-hidden ${
                  selectedCupType === 'standard'
                    ? 'bg-amber-600/20 border-amber-500 text-white shadow-lg shadow-amber-500/15'
                    : 'bg-slate-900/70 border-white/5 text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Coffee className="w-5 h-5" />
                  </div>
                  <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[9px] font-extrabold uppercase">
                    Padrão
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">Xícara Coada</h4>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">150ml &bull; ~100mg caf</p>
                </div>
                <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Queima:</span>
                  <span className="text-amber-400 font-bold">+18 kcal</span>
                </div>
              </div>

              {/* Caneca Grande */}
              <div
                onClick={() => handleSelectCupPreset('mug')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 relative overflow-hidden ${
                  selectedCupType === 'mug'
                    ? 'bg-amber-600/20 border-amber-500 text-white shadow-lg shadow-amber-500/15'
                    : 'bg-slate-900/70 border-white/5 text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Coffee className="w-5 h-5" />
                  </div>
                  {selectedCupType === 'mug' && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">Caneca Grande</h4>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">250ml &bull; ~165mg caf</p>
                </div>
                <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Queima:</span>
                  <span className="text-amber-400 font-bold">+30 kcal</span>
                </div>
              </div>

              {/* Outro Tamanho / Personalizado */}
              <div
                onClick={() => setSelectedCupType('custom')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 relative overflow-hidden ${
                  selectedCupType === 'custom'
                    ? 'bg-amber-600/20 border-amber-500 text-white shadow-lg shadow-amber-500/15'
                    : 'bg-slate-900/70 border-white/5 text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Sliders className="w-4 h-4" />
                  </div>
                  {selectedCupType === 'custom' && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">Outro Volume</h4>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">Definir ml / mg</p>
                </div>
                <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Customizado</span>
                </div>
              </div>
            </div>

            {/* Custom Inputs when 'custom' selected */}
            {selectedCupType === 'custom' && (
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-3 animate-in fade-in">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                      Volume da Xícara (ml)
                    </label>
                    <input
                      type="number"
                      value={coffeeMl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCoffeeMl(val === '' ? '' : val);
                        if (val !== '') {
                          setCoffeeCaffeineMg(Math.round(Number(val) * 0.67));
                        }
                      }}
                      placeholder="Ex: 200"
                      className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white font-mono font-bold text-center focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                      Cafeína Estimada (mg)
                    </label>
                    <input
                      type="number"
                      value={coffeeCaffeineMg}
                      onChange={(e) => setCoffeeCaffeineMg(e.target.value === '' ? '' : e.target.value)}
                      placeholder="Ex: 130"
                      className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white font-mono font-bold text-center focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Live Science Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/20 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Flame className="w-4 h-4 fill-amber-400" />
                <span>Impacto Termogênico por Xícara</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Cada dose consumida de <strong>{currentCoffeeCaffeine}mg de cafeína</strong> elevará sua taxa metabólica em <strong>+{coffeePreview.metabolicBoostPercentage}%</strong>, queimando aproximadamente <strong className="text-amber-300">+{coffeePreview.burnKcal} kcal passivas</strong> ao longo de {coffeePreview.durationHours} horas.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ABA: PRÉ-TREINO                                           */}
        {/* ========================================================= */}
        {activeTab === 'preworkout' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Quick Preset Chips */}
            <div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                Atalhos Rápidos de Dosagem:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Leve (150mg)', caf: 150, dose: 5, tau: 1000 },
                  { label: 'Médio (250mg)', caf: 250, dose: 7, tau: 1500 },
                  { label: 'Forte (400mg)', caf: 400, dose: 10, tau: 2000 }
                ].map((chip) => {
                  const isCurrent = Number(preCaffeineMg) === chip.caf;
                  return (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => handleApplyPrePreset(chip.caf, chip.dose, chip.tau)}
                      className={`py-2 px-2 rounded-xl border text-[11px] font-bold transition-all ${
                        isCurrent
                          ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                          : 'bg-slate-900 border-white/5 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Direct Formula Form */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-blue-500/20 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                  Nome do seu Suplemento / Marca
                </label>
                <input
                  type="text"
                  value={preName}
                  onChange={(e) => setPreName(e.target.value)}
                  placeholder="Ex: C4, Égide, Venom, Manipulado..."
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-xs font-semibold focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Dose (g)</label>
                  <input
                    type="number"
                    value={preDoseGrams}
                    onChange={(e) => setPreDoseGrams(e.target.value === '' ? '' : e.target.value)}
                    placeholder="10"
                    className="w-full p-2 bg-slate-950 border border-white/10 rounded-xl text-white font-bold text-center focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-blue-400 block mb-1">Cafeína (mg)</label>
                  <input
                    type="number"
                    value={preCaffeineMg}
                    onChange={(e) => setPreCaffeineMg(e.target.value === '' ? '' : e.target.value)}
                    placeholder="400"
                    className="w-full p-2 bg-slate-950 border border-blue-500/30 rounded-xl text-white font-bold text-center focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-emerald-400 block mb-1">Taurina (mg)</label>
                  <input
                    type="number"
                    value={preTaurineMg}
                    onChange={(e) => setPreTaurineMg(e.target.value === '' ? '' : e.target.value)}
                    placeholder="2000"
                    className="w-full p-2 bg-slate-950 border border-emerald-500/30 rounded-xl text-white font-bold text-center focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-purple-400 block mb-1">Beta-Al. (mg)</label>
                  <input
                    type="number"
                    value={preBetaAlanineMg}
                    onChange={(e) => setPreBetaAlanineMg(e.target.value === '' ? '' : e.target.value)}
                    placeholder="2000"
                    className="w-full p-2 bg-slate-950 border border-purple-500/30 rounded-xl text-white font-bold text-center focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Live Pre-Workout Science Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-500/20 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-blue-400 font-bold">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>Queima Total por Dose de {preDoseGrams || 10}g</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Esta fórmula gerará um gasto adicional de <strong className="text-blue-300 font-mono">+{preWorkoutPreview.totalThermogenicKcal} kcal</strong> por dose ({preWorkoutPreview.caffeineBurnKcal} kcal pela cafeína + {preWorkoutPreview.taurineSynergyBurnKcal} kcal pela oxidação da taurina).
              </p>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-3.5 rounded-2xl btn-lime text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-lime-500/20 active:scale-95 transition-all"
          >
            Salvar e Atualizar Dieta
          </button>
        </div>
      </div>
    </Modal>
  );
};
