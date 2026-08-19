import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  User, 
  Activity, 
  Target, 
  Dumbbell, 
  Utensils, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Sparkles,
  Zap
} from 'lucide-react';
import { UserProfile, Gender, ExperienceLevel, FitnessGoal, DietMode } from '../../core/storage/types';
import { calculateMetabolicStats } from '../../core/math/metabolism';
import { saveProfile, generateDefaultRoutines, generateInitialMealPlans, logWeightEntry } from '../../core/storage/db';

interface OnboardingWizardProps {
  onComplete: () => void;
  initialProfile?: UserProfile;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, initialProfile }) => {
  const [step, setStep] = useState<number>(1);

  // Form State - aceita string vazia para digitação fluida
  const [name, setName] = useState(initialProfile?.name || '');
  const [age, setAge] = useState<number | string>(initialProfile?.age ?? 26);
  const [gender, setGender] = useState<Gender>(initialProfile?.gender || 'male');
  const [heightCm, setHeightCm] = useState<number | string>(initialProfile?.heightCm ?? 178);
  const [weightKg, setWeightKg] = useState<number | string>(initialProfile?.weightKg ?? 80);
  const [bodyFatPercentage, setBodyFatPercentage] = useState<number | undefined>(initialProfile?.bodyFatPercentage || 18);
  
  const [goal, setGoal] = useState<FitnessGoal>(initialProfile?.goal || 'recomposition');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(initialProfile?.experienceLevel || 'intermediate');
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState<number>(initialProfile?.trainingDaysPerWeek || 4);
  const [sessionDurationMin, setSessionDurationMin] = useState<number>(initialProfile?.sessionDurationMin || 60);

  const [dietMode] = useState<DietMode>(initialProfile?.dietMode || 'guided');
  const [mealsPerDay, setMealsPerDay] = useState<number>(initialProfile?.mealsPerDay || 4);

  const [isSaving, setIsSaving] = useState(false);

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      const sanitizedAge = typeof age === 'number' && age > 0 ? age : Number(age) || 26;
      const sanitizedHeight = typeof heightCm === 'number' && heightCm > 0 ? heightCm : Number(heightCm) || 178;
      const sanitizedWeight = typeof weightKg === 'number' && weightKg > 0 ? weightKg : Number(weightKg) || 80;

      const profileData: UserProfile = {
        name: name.trim() || 'Usuário',
        age: sanitizedAge,
        gender,
        heightCm: sanitizedHeight,
        weightKg: sanitizedWeight,
        bodyFatPercentage,
        goal,
        experienceLevel,
        trainingDaysPerWeek,
        sessionDurationMin,
        dietMode,
        mealsPerDay,
        excludedFoodIds: [],
        preferredFoodIds: [],
        isCalibrated: true,
        createdAt: initialProfile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveProfile(profileData);
      await logWeightEntry(new Date().toISOString().split('T')[0], sanitizedWeight, bodyFatPercentage);

      // Calcula as metas calóricas determinísticas
      const stats = calculateMetabolicStats(profileData);

      // Gera as rotinas automáticas de treino e o cardápio inicial
      await generateDefaultRoutines(trainingDaysPerWeek);
      await generateInitialMealPlans(
        mealsPerDay,
        stats.targetCalories,
        stats.proteinGrams,
        stats.carbGrams,
        stats.fatGrams
      );

      // Efeito de celebração
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      onComplete();
    } catch (err) {
      console.error('Erro ao salvar onboarding:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D18] flex flex-col justify-between p-4 max-w-lg mx-auto">
      {/* Top Progress */}
      <div className="pt-4 pb-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
          <span>Passo {step} de 5</span>
          <span className="text-blue-400 font-bold">{Math.round((step / 5) * 100)}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-emerald-400 transition-all duration-300 rounded-full"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="my-auto py-6 space-y-6">
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3">
                <User className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight font-display">
                Sobre Você & Biometria
              </h2>
              <p className="text-sm text-slate-400">
                Usado para calcular sua Taxa Metabólica Basal (TMB) com exatidão científica.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Seu Nome ou Apelido
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como quer ser chamado?"
                  className="w-full px-4 py-3 bg-[#0D1527] border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Sexo Biológico (Fator Hormonal / TMB)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                      gender === 'male'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-md shadow-blue-500/10'
                        : 'bg-[#0D1527] border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    Masculino
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                      gender === 'female'
                        ? 'bg-pink-600/20 border-pink-500 text-pink-400 shadow-md shadow-pink-500/10'
                        : 'bg-[#0D1527] border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    Feminino
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Idade
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ex: 26"
                    className="w-full px-3 py-3 bg-[#0D1527] border border-white/10 rounded-xl text-white font-bold text-center focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Altura (cm)
                  </label>
                  <input
                    type="number"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ex: 178"
                    className="w-full px-3 py-3 bg-[#0D1527] border border-white/10 rounded-xl text-white font-bold text-center focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ex: 80"
                    className="w-full px-3 py-3 bg-[#0D1527] border border-white/10 rounded-xl text-white font-bold text-center focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                <Activity className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight font-display">
                Percentual de Gordura (%BF)
              </h2>
              <p className="text-sm text-slate-400">
                Permite usar a fórmula de <strong>Katch-McArdle</strong> (precisão máxima sobre massa magra).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0D1527] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Estimativa Visual
                </span>
                <span className="text-lg font-black text-emerald-400 font-mono">
                  {bodyFatPercentage || 18}%
                </span>
              </div>

              <input
                type="range"
                min={gender === 'male' ? 6 : 12}
                max={gender === 'male' ? 35 : 45}
                value={bodyFatPercentage || 18}
                onChange={(e) => setBodyFatPercentage(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div 
                  onClick={() => setBodyFatPercentage(gender === 'male' ? 10 : 18)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    (bodyFatPercentage || 18) <= (gender === 'male' ? 12 : 20)
                      ? 'bg-emerald-500/20 border-emerald-500 text-white'
                      : 'bg-slate-900 border-white/5 text-slate-400'
                  }`}
                >
                  <p className="font-bold text-slate-200">Atlético / Definido</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{gender === 'male' ? '8% - 12%' : '16% - 20%'}</p>
                </div>

                <div 
                  onClick={() => setBodyFatPercentage(gender === 'male' ? 16 : 24)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    (bodyFatPercentage || 18) > (gender === 'male' ? 12 : 20) && (bodyFatPercentage || 18) <= (gender === 'male' ? 20 : 28)
                      ? 'bg-emerald-500/20 border-emerald-500 text-white'
                      : 'bg-slate-900 border-white/5 text-slate-400'
                  }`}
                >
                  <p className="font-bold text-slate-200">Moderado / Saudável</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{gender === 'male' ? '13% - 20%' : '21% - 28%'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                <Target className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight font-display">
                Qual é o seu Objetivo?
              </h2>
              <p className="text-sm text-slate-400">
                O algoritmo definirá a partição exata de calorias, déficit/superávit e proporção de macros.
              </p>
            </div>

            <div className="space-y-3">
              <div
                onClick={() => setGoal('recomposition')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all relative overflow-hidden ${
                  goal === 'recomposition'
                    ? 'bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                    : 'bg-[#0D1527] border-white/10 text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-white">Recomposição Corporal</span>
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-extrabold uppercase">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Perder gordura corporal enquanto ganha massa muscular. Déficit suave (-10%) com alta proteína (2.2g/kg).
                    </p>
                  </div>
                  {goal === 'recomposition' && <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />}
                </div>
              </div>

              <div
                onClick={() => setGoal('fat_loss')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  goal === 'fat_loss'
                    ? 'bg-amber-600/15 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                    : 'bg-[#0D1527] border-white/10 text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="font-bold text-base text-white">Emagrecimento Acelerado</span>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Foco primário em perda de gordura rápida com déficit de -22% e preservação de tecido magro.
                    </p>
                  </div>
                  {goal === 'fat_loss' && <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
                </div>
              </div>

              <div
                onClick={() => setGoal('hypertrophy')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  goal === 'hypertrophy'
                    ? 'bg-emerald-600/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                    : 'bg-[#0D1527] border-white/10 text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="font-bold text-base text-white">Hipertrofia Limpa (Bulking)</span>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Superávit calórico controlado (+12%) para maximizar síntese proteica e volume muscular.
                    </p>
                  </div>
                  {goal === 'hypertrophy' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3">
                <Dumbbell className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight font-display">
                Rotina de Treinamento
              </h2>
              <p className="text-sm text-slate-400">
                O motor biomecânico gerará a divisão ideal de treinos e o volume de séries por músculo.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Nível de Experiência
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'beginner', label: 'Iniciante', sub: '< 1 ano' },
                    { id: 'intermediate', label: 'Intermediário', sub: '1 a 3 anos' },
                    { id: 'advanced', label: 'Avançado', sub: '3+ anos' }
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setExperienceLevel(lvl.id as ExperienceLevel)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        experienceLevel === lvl.id
                          ? 'bg-cyan-600/20 border-cyan-500 text-white'
                          : 'bg-[#0D1527] border-white/10 text-slate-400'
                      }`}
                    >
                      <p className="font-bold text-xs">{lvl.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{lvl.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Frequência Semanal (Dias de Treino)
                </label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setTrainingDaysPerWeek(days)}
                      className={`flex-1 py-3 rounded-xl border font-bold text-sm transition-all ${
                        trainingDaysPerWeek === days
                          ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                          : 'bg-[#0D1527] border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      {days}x
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Tempo por Sessão
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[30, 45, 60, 90].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setSessionDurationMin(mins)}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        sessionDurationMin === mins
                          ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                          : 'bg-[#0D1527] border-white/10 text-slate-400'
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3">
                <Utensils className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight font-display">
                Estrutura das Refeições
              </h2>
              <p className="text-sm text-slate-400">
                Como prefere organizar seu cardápio e rotina alimentar no dia a dia.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Quantas Refeições por Dia?
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMealsPerDay(num)}
                      className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                        mealsPerDay === num
                          ? 'bg-purple-600 border-purple-400 text-white shadow-md'
                          : 'bg-[#0D1527] border-white/10 text-slate-400'
                      }`}
                    >
                      {num} ref
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/20 space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Tudo Pronto para o Cálculo</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ao clicar em <strong>Calibrar Meu Plano</strong>, nosso motor gerará seu cardápio de precisão com alimentos oficiais da tabela TACO, suas fichas de treino com volume ótimo (MAV) e metas de hidratação.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-slate-300 font-bold text-sm hover:bg-slate-800 transition-all flex items-center gap-1.5 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
        ) : <div />}

        {step < 5 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-bold text-sm shadow-lg shadow-blue-500/20 hover:brightness-110 transition-all flex items-center gap-1.5 active:scale-95 ml-auto"
          >
            <span>Próximo</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            disabled={isSaving}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 text-white font-extrabold text-sm shadow-xl shadow-emerald-500/20 hover:brightness-110 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>{isSaving ? 'Calibrando Algoritmo...' : 'Calibrar Meu Plano 🚀'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
