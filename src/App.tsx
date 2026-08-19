import React, { useState, useEffect } from 'react';
import { UserProfile, MetabolicStats } from './core/storage/types';
import { getActiveProfile } from './core/storage/db';
import { calculateMetabolicStats } from './core/math/metabolism';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { ProfileModal } from './components/layout/ProfileModal';
import { OnboardingWizard } from './features/onboarding/OnboardingWizard';
import { DietOverview } from './features/diet/DietOverview';
import { WorkoutSplitView } from './features/workout/WorkoutSplitView';
import { ProgressDashboard } from './features/progress/ProgressDashboard';

export const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | undefined>(undefined);
  const [stats, setStats] = useState<MetabolicStats | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'diet' | 'workout' | 'progress'>('diet');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);

  const loadUserData = async () => {
    try {
      const active = await getActiveProfile();
      if (active && active.isCalibrated) {
        setProfile(active);
        const calculatedStats = calculateMetabolicStats(active);
        setStats(calculatedStats);
        setIsOnboardingOpen(false);
      } else {
        setIsOnboardingOpen(true);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do usuário:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070D18] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold font-mono text-slate-300">Carregando OmniFit...</span>
        </div>
      </div>
    );
  }

  if (isOnboardingOpen || !profile || !stats) {
    return (
      <OnboardingWizard
        initialProfile={profile}
        onComplete={() => {
          loadUserData();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#070D18] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <Header
        profile={profile}
        stats={stats}
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
            onProfileUpdated={loadUserData}
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
        onReOnboard={() => {
          setIsOnboardingOpen(true);
        }}
      />
    </div>
  );
};

export default App;
