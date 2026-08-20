import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, MetabolicStats } from './core/storage/types';
import { getActiveProfile, switchUserDb } from './core/storage/db';
import { calculateMetabolicStats } from './core/math/metabolism';
import { getActiveAccount, logout, processOAuthUser, UserAccount } from './core/auth/authService';
import { supabase } from './core/supabase/supabaseClient';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { ProfileModal } from './components/layout/ProfileModal';
import { OnboardingWizard } from './features/onboarding/OnboardingWizard';
import { DietOverview } from './features/diet/DietOverview';
import { WorkoutSplitView } from './features/workout/WorkoutSplitView';
import { ProgressDashboard } from './features/progress/ProgressDashboard';
import { AuthScreen } from './features/auth/AuthScreen';
import { PWAInstallPrompt } from './components/layout/PWAInstallPrompt';

export const App: React.FC = () => {
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [profile, setProfile] = useState<UserProfile | undefined>(undefined);
  const [stats, setStats] = useState<MetabolicStats | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'diet' | 'workout' | 'progress'>('diet');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Espelha a conta ativa para o listener de OAuth, que roda fora do ciclo de render.
  const activeAccountIdRef = useRef<string | null>(null);

  const activateAccount = async (acc: UserAccount) => {
    activeAccountIdRef.current = acc.id;
    setAccount(acc);
    switchUserDb(acc.id);
    await loadUserData(acc);
  };

  const initAuthAndData = async () => {
    try {
      setLoading(true);

      // 1. A escolha explícita do usuário vem primeiro. Se ele selecionou uma
      //    conta local, ela tem prioridade sobre qualquer sessão de nuvem —
      //    caso contrário uma sessão Google residual sequestraria o login local.
      const activeAcc = await getActiveAccount();
      if (activeAcc) {
        await activateAccount(activeAcc);
        return;
      }

      // 2. Sem conta local ativa, tenta restaurar a sessão do Supabase
      //    (é o caminho de volta do redirect do Google).
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const oauthAccount = await processOAuthUser(session.user);
          await activateAccount(oauthAccount);
          return;
        }
      }

      // 3. Ninguém autenticado -> tela de login
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
        // Se ainda não calibrou o perfil, abre o Onboarding com o nome da conta pré-preenchido
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
      // 'INITIAL_SESSION' já é tratado por initAuthAndData; reprocessá-lo aqui
      // causaria carregamento duplicado do contêiner.
      if (event !== 'SIGNED_IN' || !session?.user) return;

      try {
        const oauthAccount = await processOAuthUser(session.user);
        // Só troca de conta se realmente mudou (evita recarregar tudo a cada
        // renovação de token).
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

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col selection:bg-[#84CC16] selection:text-slate-950">
      {/* Top Header */}
      <Header
        profile={profile}
        stats={stats}
        account={account}
        activeTab={activeTab}
        onOpenSettings={() => setIsProfileModalOpen(true)}
      />

      {/* Main Content View */}
      <main className="flex-1">
        {activeTab === 'diet' && <DietOverview profile={profile} stats={stats} />}
        {activeTab === 'workout' && <WorkoutSplitView profile={profile} />}
        {activeTab === 'progress' && (
          <ProgressDashboard
            profile={profile}
            stats={stats}
            onProfileUpdated={() => loadUserData(account)}
          />
        )}
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
      />

      {/* PWA Floating Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
};

export default App;
