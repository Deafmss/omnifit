import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, MetabolicStats } from './core/storage/types';
import { getActiveProfile, switchUserDb } from './core/storage/db';
import { calculateMetabolicStats } from './core/math/metabolism';
import { getActiveAccount, logout, processOAuthUser, UserAccount } from './core/auth/authService';
import { supabase } from './core/supabase/supabaseClient';
import { pullIfLocalEmpty } from './core/storage/cloudRestore';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { ProfileModal } from './components/layout/ProfileModal';
import { OnboardingWizard } from './features/onboarding/OnboardingWizard';
import { DietOverview } from './features/diet/DietOverview';
import { WorkoutSplitView } from './features/workout/WorkoutSplitView';
import { ProgressDashboard } from './features/progress/ProgressDashboard';
import { AuthScreen } from './features/auth/AuthScreen';
import { PWAInstallPrompt } from './components/layout/PWAInstallPrompt';

const TABS: ('diet' | 'workout' | 'progress')[] = ['diet', 'workout', 'progress'];
const ACTIVE_TAB_KEY = 'omnifit_active_tab';

const getInitialTab = (): 'diet' | 'workout' | 'progress' => {
  try {
    const saved = localStorage.getItem(ACTIVE_TAB_KEY);
    if (saved === 'diet' || saved === 'workout' || saved === 'progress') {
      return saved;
    }
  } catch {
    // ignore
  }
  return 'diet';
};

export const App: React.FC = () => {
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [profile, setProfile] = useState<UserProfile | undefined>(undefined);
  const [stats, setStats] = useState<MetabolicStats | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTabState] = useState<'diet' | 'workout' | 'progress'>(getInitialTab);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const setActiveTab = (tab: 'diet' | 'workout' | 'progress') => {
    setActiveTabState(tab);
    try {
      localStorage.setItem(ACTIVE_TAB_KEY, tab);
    } catch {
      // ignore
    }
  };

  // Espelha a conta ativa para o listener de OAuth, que roda fora do ciclo de render.
  const activeAccountIdRef = useRef<string | null>(null);

  // Reconhecimento de gestos touch para swipe lateral (carrossel)
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isSwipingHorizontal = useRef<boolean | null>(null);

  const activateAccount = async (acc: UserAccount) => {
    activeAccountIdRef.current = acc.id;
    setAccount(acc);
    switchUserDb(acc.id);

    // Aparelho novo com dados na nuvem: restaura antes de carregar a tela,
    // senão o usuário cairia no onboarding como se fosse a primeira vez.
    // Só age quando o contêiner local está vazio.
    try {
      const restored = await pullIfLocalEmpty();
      if (restored && restored.perfilRestaurado) {
        console.info('[OmniFit]', restored.resumo);
      }
    } catch (err) {
      console.warn('Restauração da nuvem indisponível:', err);
    }

    await loadUserData(acc);
  };

  const initAuthAndData = async () => {
    try {
      setLoading(true);

      const activeAcc = await getActiveAccount();
      if (activeAcc) {
        await activateAccount(activeAcc);
        return;
      }

      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const oauthAccount = await processOAuthUser(session.user);
          await activateAccount(oauthAccount);
          return;
        }
      }

      activeAccountIdRef.current = null;
      setAccount(null);
      setProfile(undefined);
      setStats(undefined);
      setLoading(false);
    } catch (err) {
      console.error('Erro ao inicializar autenticação:', err);
      setAuthError(
        'Não foi possível carregar seus dados neste dispositivo. Verifique se o navegador permite armazenamento local e recarregue a página.'
      );
      setLoading(false);
    }
  };

  const loadUserData = async (currentAcc?: UserAccount | null) => {
    try {
      const activeProf = await getActiveProfile();
      if (activeProf && activeProf.isCalibrated) {
        setProfile(activeProf);
        const calculatedStats = calculateMetabolicStats(activeProf);
        setStats(calculatedStats);
        setIsOnboardingOpen(false);
      } else {
        const accToUse = currentAcc || account;
        if (accToUse) {
          setProfile({
            id: undefined,
            name: accToUse.name,
            gender: 'male',
            age: 26,
            weightKg: 80,
            heightCm: 178,
            bodyFatPercentage: 16,
            experienceLevel: 'intermediate',
            goal: 'fat_loss',
            trainingDaysPerWeek: 4,
            sessionDurationMin: 60,
            dietMode: 'guided',
            mealsPerDay: 4,
            isCalibrated: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
        setIsOnboardingOpen(true);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do contêiner do usuário:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAuthAndData();

    if (!supabase) return;

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== 'SIGNED_IN' || !session?.user) return;

      try {
        const oauthAccount = await processOAuthUser(session.user);
        if (activeAccountIdRef.current === oauthAccount.id) return;
        await activateAccount(oauthAccount);
      } catch (err) {
        console.error('Erro ao processar login OAuth:', err);
        setAuthError('Não foi possível concluir o login com o Google. Tente novamente.');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleAuthenticated = async (newAccount: UserAccount) => {
    setAuthError(null);
    await activateAccount(newAccount);
  };

  const handleLogout = async () => {
    await logout();
    activeAccountIdRef.current = null;
    setAccount(null);
    setProfile(undefined);
    setStats(undefined);
    setIsOnboardingOpen(false);
    setIsProfileModalOpen(false);
    setAuthError(null);
  };

  // Gestos de toque para alternar abas via Swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwipingHorizontal.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - touchStartY.current;

    if (isSwipingHorizontal.current === null) {
      if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
        isSwipingHorizontal.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    if (isSwipingHorizontal.current) {
      const touchEndX = e.changedTouches[0].clientX;
      const diffX = touchEndX - touchStartX.current;
      const threshold = 45; // pixels para acionar o swipe

      if (diffX < -threshold) {
        // Deslizar para a esquerda -> Próxima aba
        const currentIndex = TABS.indexOf(activeTab);
        if (currentIndex < TABS.length - 1) {
          setActiveTab(TABS[currentIndex + 1]);
        }
      } else if (diffX > threshold) {
        // Deslizar para a direita -> Aba anterior
        const currentIndex = TABS.indexOf(activeTab);
        if (currentIndex > 0) {
          setActiveTab(TABS[currentIndex - 1]);
        }
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
    isSwipingHorizontal.current = null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050811] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#84CC16] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold font-mono text-[#A3E635]">Conectando ao contêiner OmniFit...</span>
        </div>
      </div>
    );
  }

  // Se não estiver logado em nenhuma conta -> exibe a tela de Autenticação
  if (!account) {
    return (
      <>
        <AuthScreen onAuthenticated={handleAuthenticated} initialError={authError} />
        <PWAInstallPrompt />
      </>
    );
  }

  // Se a conta não foi calibrada -> exibe o Onboarding Wizard
  if (isOnboardingOpen || !profile || !stats) {
    return (
      <>
        <OnboardingWizard
          initialProfile={profile}
          onComplete={() => {
            loadUserData(account);
          }}
        />
        <PWAInstallPrompt />
      </>
    );
  }

  const activeIndex = TABS.indexOf(activeTab);

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col selection:bg-[#84CC16] selection:text-slate-950 w-full max-w-full overflow-x-hidden">
      {/* Top Header */}
      <Header
        profile={profile}
        stats={stats}
        account={account}
        activeTab={activeTab}
        onOpenSettings={() => setIsProfileModalOpen(true)}
      />

      {/* Main Content View with Carousel Slide & Swipe Gestures */}
      <main
        className="flex-1 w-full max-w-full overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex w-[300%] transition-transform duration-300 ease-out will-change-transform"
          style={{
            transform: `translateX(-${(activeIndex * 100) / 3}%)`
          }}
        >
          {/* Aba 0: Dieta */}
          <div className="w-1/3 shrink-0">
            <DietOverview profile={profile} stats={stats} />
          </div>

          {/* Aba 1: Treino */}
          <div className="w-1/3 shrink-0">
            <WorkoutSplitView profile={profile} />
          </div>

          {/* Aba 2: Progresso */}
          <div className="w-1/3 shrink-0">
            <ProgressDashboard
              profile={profile}
              stats={stats}
              onProfileUpdated={() => loadUserData(account)}
            />
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />

      {/* Profile & Metabolic Formula Inspector Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
        stats={stats}
        account={account}
        onReOnboard={() => {
          setIsOnboardingOpen(true);
        }}
        onLogout={handleLogout}
        onDataRestored={() => {
          // Restauração troca o perfil no banco: recarrega para a tela refletir.
          void loadUserData(account);
        }}
      />

      {/* PWA Floating Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
};

export default App;
