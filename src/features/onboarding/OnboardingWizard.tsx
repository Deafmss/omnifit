import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  User, 
  Target, 
  Dumbbell, 
  Utensils, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Sparkles,
  Zap,
  Smile,
  ShieldCheck
} from 'lucide-react';
import { UserProfile, Gender, ExperienceLevel, FitnessGoal, DietMode } from '../../core/storage/types';
import { calculateMetabolicStats } from '../../core/math/metabolism';
import { saveProfile, generateDefaultRoutines, generateInitialMealPlans, logWeightEntry } from '../../core/storage/db';

interface OnboardingWizardProps {
  onComplete: () => void;
  initialProfile?: UserProfile;
}

type BodyShapeArchetype = 'overweight' | 'slightly_above' | 'moderate' | 'lean' | 'athletic';

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, initialProfile }) => {
  const [step, setStep] = useState<number>(1);

  // Form State - aceita string vazia para digitação fluida
  const [name, setName] = useState(initialProfile?.name || '');
  const [age, setAge] = useState<number | string>(initialProfile?.age ?? 26);
  const [gender, setGender] = useState<Gender>(initialProfile?.gender || 'male');
  const [heightCm, setHeightCm] = useState<number | string>(initialProfile?.heightCm ?? 178);
  const [weightKg, setWeightKg] = useState<number | string>(initialProfile?.weightKg ?? 80);
  
  // Triagem humanizada de corpo
  const [selectedArchetype, setSelectedArchetype] = useState<BodyShapeArchetype>('overweight');
  const [showExactBfInput, setShowExactBfInput] = useState<boolean>(false);
  const [exactBf, setExactBf] = useState<number | string>('');
  
  const [goal, setGoal] = useState<FitnessGoal>(initialProfile?.goal || 'recomposition');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(initialProfile?.experienceLevel || 'intermediate');
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState<number>(initialProfile?.trainingDaysPerWeek || 4);
  const [sessionDurationMin, setSessionDurationMin] = useState<number>(initialProfile?.sessionDurationMin || 60);

  const [dietMode] = useState<DietMode>(initialProfile?.dietMode || 'guided');
  const [mealsPerDay, setMealsPerDay] = useState<number>(initialProfile?.mealsPerDay || 4);

  const [isSaving, setIsSaving] = useState(false);

  // Mapeia o arquétipo para uma estimativa interna suave
  const getEstimatedBf = (): number | undefined => {
    if (showExactBfInput && exactBf !== '') {
      const parsed = Number(exactBf);
      if (parsed > 3 && parsed < 60) return parsed;
    }

    const archetypeMap: Record<BodyShapeArchetype, { male: number; female: number }> = {
      overweight: { male: 26, female: 34 },
      slightly_above: { male: 21, female: 28 },
      moderate: { male: 16, female: 23 },
      lean: { male: 12, female: 19 },
      athletic: { male: 10, female: 16 }
    };

    return gender === 'male' 
      ? archetypeMap[selectedArchetype].male 
      : archetypeMap[selectedArchetype].female;
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      const sanitizedAge = typeof age === 'number' && age > 0 ? age : Number(age) || 26;
      const sanitizedHeight = typeof heightCm === 'number' && heightCm > 0 ? heightCm : Number(heightCm) || 178;
      const sanitizedWeight = typeof weightKg === 'number' && weightKg > 0 ? weightKg : Number(weightKg) || 80;
      const calculatedBf = getEstimatedBf();

      const profileData: UserProfile = {
        name: name.trim() || 'Usuário',
        age: sanitizedAge,
        gender,
        heightCm: sanitizedHeight,
        weightKg: sanitizedWeight,
        bodyFatPercentage: calculatedBf,
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
      await logWeightEntry(new Date().toISOString().split('T')[0], sanitizedWeight, calculatedBf);

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
    <div className="min-h-screen bg-[#050811] flex flex-col justify-between p-4 max-w-lg mx-auto">
      {/* Top Progress */}
      <div className="pt-4 pb-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2 font-mono">
          <span>Passo {step} de 5</span>
          <span className="text-blue-400 font-bold">{Math.round((step / 5) * 100)}%</span>
        </div>
        <div className="h-1.5 w-full bg-[#090F1E] rounded-full overflow-hidden border border-white/[0.06]">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300 rounded-full"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="my-auto py-6 space-y-6">
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-[#090F1E] border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3 shadow-lg">
                <User className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight font-display">
                Sobre Você & Biometria
              </h2>
              <p className="text-xs text-slate-400">
                Usado para calcular sua Taxa Metabólica Basal (TMB) com exatidão científica.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                  Seu Nome ou Apelido
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como quer ser chamado?"
                  className="w-full px-4 py-3 bg-[#090F1E] border border-white/[0.08] rounded-2xl text-white font-medium focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                  Sexo Biológico (Fator Hormonal / TMB)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`py-3 px-4 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 btn-tactile ${
                      gender === 'male'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-md shadow-blue-500/10'
                        : 'bg-[#090F1E] border-white/[0.08] text-slate-400 hover:border-white/20'
                    }`}
                  >
                    Masculino
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`py-3 px-4 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 btn-tactile ${
                      gender === 'female'
                        ? 'bg-pink-600/20 border-pink-500 text-pink-400 shadow-md shadow-pink-500/10'
                        : 'bg-[#090F1E] border-white/[0.08] text-slate-400 hover:border-white/20'
                    }`}
                  >
                    Feminino
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                    Idade
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ex: 26"
                    className="w-full px-3 py-3 bg-[#090F1E] border border-white/[0.08] rounded-2xl text-white font-bold text-center focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                    Altura (cm)
                  </label>
                  <input
                    type="number"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ex: 178"
                    className="w-full px-3 py-3 bg-[#090F1E] border border-white/[0.08] rounded-2xl text-white font-bold text-center focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ex: 80"
                    className="w-full px-3 py-3 bg-[#090F1E] border border-white/[0.08] rounded-2xl text-white font-bold text-center focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-[#090F1E] border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2 shadow-lg">
                <Smile className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight font-display">
                Como você sente seu corpo hoje?
              </h2>
              <p className="text-xs text-slate-400">
                Selecione a opção que mais se aproxima de como você se vê no espelho:
              </p>
            </div>

            {/* Human Body Archetype Cards */}
            <div className="space-y-2.5">
              {[
                {
                  id: 'overweight',
                  title: 'Estou com sobrepeso / Barriga aparente',
                  desc: 'Quero focar na queima de gordura e perder medidas abdominais.',
                  badge: 'Foco Queima'
                },
                {
                  id: 'slightly_above',
                  title: 'Um pouco acima do peso / Pochete leve',
                  desc: 'Gordura localizada nos flancos e cintura, quero secar e tonificar.',
                  badge: 'Recomposição'
                },
                {
                  id: 'moderate',
                  title: 'Peso equilibrado / Moderado',
                  desc: 'Sem excesso aparente, busco melhorar o condicionamento e formato do corpo.',
                  badge: 'Equilíbrio'
                },
                {
                  id: 'lean',
                  title: 'Magro / Pouca gordura e pouca massa',
                  desc: 'Quero preencher o corpo e construir massa muscular.',
                  badge: 'Hipertrofia'
                },
                {
                  id: 'athletic',
                  title: 'Já tenho músculos / Atlético',
                  desc: 'Tenho boa base muscular e quero lapidar ou aumentar performance.',
                  badge: 'Avançado'
                }
              ].map((item) => {
                const isSelected = selectedArchetype === item.id && !showExactBfInput;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedArchetype(item.id as BodyShapeArchetype);
                      setShowExactBfInput(false);
                    }}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 btn-tactile ${
                      isSelected
                        ? 'bg-emerald-600/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                        : 'bg-[#090F1E] border-white/[0.08] text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white truncate">{item.title}</span>
                        <span className="px-2 py-0.5 bg-[#060A14] text-slate-400 rounded-full text-[9px] font-bold uppercase shrink-0 font-mono border border-white/5">
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">{item.desc}</p>
                    </div>

                    {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                  </div>
                );
              })}
            </div>

            {/* Reassurance Banner */}
            <div className="p-3.5 rounded-2xl bg-[#090F1E] border border-white/[0.08] flex items-start gap-2.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Não precisa se preocupar com números exatos. O motor calcula suas calorias diretamente a partir do seu peso e altura reais.
              </span>
            </div>

            {/* Subtle Advanced Option */}
            <div className="text-center pt-1">
              {!showExactBfInput ? (
                <button
                  type="button"
                  onClick={() => setShowExactBfInput(true)}
                  className="text-[11px] text-slate-500 hover:text-slate-300 underline font-medium transition-colors"
                >
                  Fez exame de bioimpedância e quer digitar o número exato?
                </button>
              ) : (
                <div className="p-3.5 rounded-2xl bg-[#090F1E] border border-white/[0.08] space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-bold">Percentual de Gordura do Exame (%):</span>
                    <input
                      type="number"
                      step="0.1"
                      value={exactBf}
                      onChange={(e) => setExactBf(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ex: 22.5"
                      className="w-20 px-2 py-1 bg-slate-950 border border-emerald-500 rounded-xl text-center text-xs font-bold text-white font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-[#090F1E] border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-lg">
                <Target className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight font-display">
                Qual é o seu Objetivo?
              </h2>
              <p className="text-xs text-slate-400">
                O algoritmo definirá a partição exata de calorias, déficit/superávit e proporção de macros.
              </p>
            </div>

            <div className="space-y-3">
              <div
                onClick={() => setGoal('recomposition')}
                className={`p-4 rounded-3xl border cursor-pointer transition-all relative overflow-hidden btn-tactile ${
                  goal === 'recomposition'
                    ? 'bg-blue-600/15 border-blue-500 text-white shadow-xl shadow-blue-500/10'
                    : 'bg-[#090F1E] border-white/[0.08] text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">Recomposição Corporal</span>
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-[9px] font-extrabold uppercase font-mono">
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
                className={`p-4 rounded-3xl border cursor-pointer transition-all btn-tactile ${
                  goal === 'fat_loss'
                    ? 'bg-amber-600/15 border-amber-500 text-white shadow-xl shadow-amber-500/10'
                    : 'bg-[#090F1E] border-white/[0.08] text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="font-bold text-sm text-white">Emagrecimento Acelerado</span>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Foco primário em perda de gordura rápida com déficit de -22% e preservação de tecido magro.
                    </p>
                  </div>
                  {goal === 'fat_loss' && <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
                </div>
              </div>

              <div
                onClick={() => setGoal('hypertrophy')}
                className={`p-4 rounded-3xl border cursor-pointer transition-all btn-tactile ${
                  goal === 'hypertrophy'
                    ? 'bg-emerald-600/15 border-emerald-500 text-white shadow-xl shadow-emerald-500/10'
                    : 'bg-[#090F1E] border-white/[0.08] text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="font-bold text-sm text-white">Hipertrofia Limpa (Bulking)</span>
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
              <div className="w-12 h-12 rounded-2xl bg-[#090F1E] border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-lg">
                <Dumbbell className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight font-display">
                Rotina de Treinamento
              </h2>
              <p className="text-xs text-slate-400">
                O motor biomecânico gerará a divisão ideal de treinos e o volume de séries por músculo.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider font-mono">
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
                      className={`p-3 rounded-2xl border text-center transition-all btn-tactile ${
                        experienceLevel === lvl.id
                          ? 'bg-cyan-600/20 border-cyan-500 text-white'
                          : 'bg-[#090F1E] border-white/[0.08] text-slate-400'
                      }`}
                    >
                      <p className="font-bold text-xs">{lvl.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{lvl.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider font-mono">
                  Frequência Semanal (Dias de Treino)
                </label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setTrainingDaysPerWeek(days)}
                      className={`flex-1 py-3 rounded-2xl border font-mono font-bold text-sm transition-all btn-tactile ${
                        trainingDaysPerWeek === days
                          ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                          : 'bg-[#090F1E] border-white/[0.08] text-slate-400 hover:border-white/20'
                      }`}
                    >
                      {days}x
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider font-mono">
                  Tempo por Sessão
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[30, 45, 60, 90].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setSessionDurationMin(mins)}
                      className={`py-2.5 rounded-2xl border text-xs font-mono font-bold transition-all btn-tactile ${
                        sessionDurationMin === mins
                          ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                          : 'bg-[#090F1E] border-white/[0.08] text-slate-400'
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
              <div className="w-12 h-12 rounded-2xl bg-[#090F1E] border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3 shadow-lg">
                <Utensils className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight font-display">
                Estrutura das Refeições
              </h2>
              <p className="text-xs text-slate-400">
                Como prefere organizar seu cardápio e rotina alimentar no dia a dia.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider font-mono">
                  Quantas Refeições por Dia?
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMealsPerDay(num)}
                      className={`py-3 rounded-2xl border text-xs font-mono font-bold transition-all btn-tactile ${
                        mealsPerDay === num
                          ? 'bg-purple-600 border-purple-400 text-white shadow-md'
                          : 'bg-[#090F1E] border-white/[0.08] text-slate-400'
                      }`}
                    >
                      {num} ref
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-3xl bg-[#090F1E] border border-blue-500/20 space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
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
