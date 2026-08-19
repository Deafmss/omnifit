import React, { useState } from 'react';
import { Coffee, Zap, Check } from 'lucide-react';
import { UserProfile, CoffeeConfig, PreWorkoutFormula } from '../../core/storage/types';
import { 
  DEFAULT_COFFEE_CONFIG, 
  COFFEE_PRESETS, 
  PRE_WORKOUT_PRESETS, 
  USER_PRE_WORKOUT_FORMULA 
} from '../../core/math/thermogenics';
import { Modal } from '../../components/ui/Modal';
import { saveProfile } from '../../core/storage/db';

interface ThermogenicsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSaved: () => void;
}

export const ThermogenicsConfigModal: React.FC<ThermogenicsConfigModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaved
}) => {
  const [activeTab, setActiveTab] = useState<'coffee' | 'preworkout'>('coffee');

  // Coffee State
  const [coffeeConfig, setCoffeeConfig] = useState<CoffeeConfig>(
    profile.coffeeConfig || DEFAULT_COFFEE_CONFIG
  );

  // Pre-Workout State
  const [preWorkoutFormula, setPreWorkoutFormula] = useState<PreWorkoutFormula>(
    profile.preWorkoutFormula || USER_PRE_WORKOUT_FORMULA
  );

  const [isCustomCoffee, setIsCustomCoffee] = useState(false);
  const [isCustomPre, setIsCustomPre] = useState(false);

  const handleSave = async () => {
    await saveProfile({
      ...profile,
      coffeeConfig,
      preWorkoutFormula
    });
    onSaved();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Calibrar Estimulantes & Termogênese"
      subtitle="Personalize as doses exatas do seu café e pré-treino para máxima precisão"
    >
      <div className="space-y-4">
        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl border border-white/5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('coffee')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'coffee'
                ? 'bg-amber-600/20 border border-amber-500/40 text-amber-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Coffee className="w-4 h-4" />
            <span>Café Puro</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preworkout')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'preworkout'
                ? 'bg-blue-600/20 border border-blue-500/40 text-blue-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Pré-Treino</span>
          </button>
        </div>

        {/* COFFEE TAB */}
        {activeTab === 'coffee' && (
          <div className="space-y-3 animate-in fade-in">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Escolha seu tipo de dose habitual:
            </span>

            <div className="space-y-2">
              {COFFEE_PRESETS.map((preset) => {
                const isSelected = !isCustomCoffee && coffeeConfig.servingMl === preset.servingMl && coffeeConfig.caffeineMg === preset.caffeineMg;
                return (
                  <div
                    key={preset.name}
                    onClick={() => {
                      setCoffeeConfig(preset);
                      setIsCustomCoffee(false);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-amber-600/15 border-amber-500 text-white'
                        : 'bg-slate-900/60 border-white/5 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <p className="font-bold">{preset.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {preset.servingMl}ml &bull; ~{preset.caffeineMg}mg de Cafeína
                      </p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                  </div>
                );
              })}

              {/* Custom Coffee */}
              <div
                onClick={() => setIsCustomCoffee(true)}
                className={`p-3 rounded-xl border cursor-pointer transition-all text-xs ${
                  isCustomCoffee
                    ? 'bg-amber-600/15 border-amber-500 text-white'
                    : 'bg-slate-900/60 border-white/5 text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold">Personalizado (Outro Volume / Dose)</p>
                  {isCustomCoffee && <Check className="w-4 h-4 text-amber-400" />}
                </div>

                {isCustomCoffee && (
                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Volume (ml):</label>
                      <input
                        type="number"
                        value={coffeeConfig.servingMl}
                        onChange={(e) =>
                          setCoffeeConfig({
                            ...coffeeConfig,
                            name: 'Café Personalizado',
                            servingMl: Number(e.target.value) || 150,
                            caffeineMg: Math.round((Number(e.target.value) || 150) * 0.67)
                          })
                        }
                        className="w-full p-2 bg-slate-950 border border-white/10 rounded-lg text-white font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Cafeína (mg):</label>
                      <input
                        type="number"
                        value={coffeeConfig.caffeineMg}
                        onChange={(e) =>
                          setCoffeeConfig({
                            ...coffeeConfig,
                            name: 'Café Personalizado',
                            caffeineMg: Number(e.target.value) || 100
                          })
                        }
                        className="w-full p-2 bg-slate-950 border border-white/10 rounded-lg text-white font-bold text-center"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PRE-WORKOUT TAB */}
        {activeTab === 'preworkout' && (
          <div className="space-y-3 animate-in fade-in">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Escolha seu pré-treino ou cadastre a fórmula exata:
            </span>

            <div className="space-y-2">
              {PRE_WORKOUT_PRESETS.map((preset) => {
                const isSelected = !isCustomPre && preWorkoutFormula.name === preset.name;
                return (
                  <div
                    key={preset.name}
                    onClick={() => {
                      setPreWorkoutFormula(preset);
                      setIsCustomPre(false);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500 text-white'
                        : 'bg-slate-900/60 border-white/5 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <p className="font-bold">{preset.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Dose {preset.doseGrams}g &bull; {preset.caffeineMg}mg Cafeína | {preset.taurineMg}mg Taurina | {preset.betaAlanineMg}mg Beta-Alanina
                      </p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                  </div>
                );
              })}

              {/* Custom Formula Editor */}
              <div
                onClick={() => setIsCustomPre(true)}
                className={`p-3 rounded-xl border cursor-pointer transition-all text-xs ${
                  isCustomPre
                    ? 'bg-blue-600/15 border-blue-500 text-white'
                    : 'bg-slate-900/60 border-white/5 text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold">Cadastrar Fórmula Personalizada da Embalagem</p>
                  {isCustomPre && <Check className="w-4 h-4 text-blue-400" />}
                </div>

                {isCustomPre && (
                  <div className="space-y-2 pt-1 font-mono">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Nome / Marca:</label>
                      <input
                        type="text"
                        value={preWorkoutFormula.name}
                        onChange={(e) =>
                          setPreWorkoutFormula({ ...preWorkoutFormula, name: e.target.value })
                        }
                        placeholder="Ex: C4, Psycho, Venom, Manipulado..."
                        className="w-full p-2 bg-slate-950 border border-white/10 rounded-lg text-white font-sans text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Dose Scoop (g):</label>
                        <input
                          type="number"
                          value={preWorkoutFormula.doseGrams}
                          onChange={(e) =>
                            setPreWorkoutFormula({
                              ...preWorkoutFormula,
                              doseGrams: Number(e.target.value) || 10
                            })
                          }
                          className="w-full p-1.5 bg-slate-950 border border-white/10 rounded-lg text-white text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Cafeína (mg):</label>
                        <input
                          type="number"
                          value={preWorkoutFormula.caffeineMg}
                          onChange={(e) =>
                            setPreWorkoutFormula({
                              ...preWorkoutFormula,
                              caffeineMg: Number(e.target.value) || 200
                            })
                          }
                          className="w-full p-1.5 bg-slate-950 border border-white/10 rounded-lg text-white text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Taurina (mg):</label>
                        <input
                          type="number"
                          value={preWorkoutFormula.taurineMg}
                          onChange={(e) =>
                            setPreWorkoutFormula({
                              ...preWorkoutFormula,
                              taurineMg: Number(e.target.value) || 0
                            })
                          }
                          className="w-full p-1.5 bg-slate-950 border border-white/10 rounded-lg text-white text-center font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-extrabold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all"
          >
            Salvar e Atualizar Cálculos
          </button>
        </div>
      </div>
    </Modal>
  );
};
