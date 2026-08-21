import { useEffect, useRef, useState } from 'react';
import {
  RotateCcw,
  ShieldAlert,
  LogOut,
  Smartphone,
  Download,
  Upload,
  CloudDownload,
  FileText,
  Share2
} from 'lucide-react';
import { UserProfile, MetabolicStats } from '../../core/storage/types';
import { UserAccount } from '../../core/auth/authService';
import { Modal } from '../ui/Modal';
import {
  isInstallPromptAvailable,
  isIOSDevice,
  isRunningStandalone,
  showInstallPrompt
} from '../../core/pwa/installPrompt';
import { isCloudSyncActive } from '../../core/supabase/cloudSync';
import { downloadUserDataBackup, importUserData } from '../../core/backup/dataBackup';
import { pullFromCloud } from '../../core/storage/cloudRestore';
import { downloadPlanText, sharePlanText } from '../../core/backup/planExport';
import { db } from '../../core/storage/db';
import { ReminderSettings } from '../../core/services/reminders';
import { RemindersSection } from './RemindersSection';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  stats: MetabolicStats;
  account?: UserAccount | null;
  onReOnboard: () => void;
  onLogout: () => void;
  /** Chamado após restaurar dados, para a tela recarregar o perfil novo. */
  onDataRestored?: () => void;
  /** Preferências de lembretes; o ciclo em si roda no App. */
  reminderSettings?: ReminderSettings | null;
  onSaveReminders?: (next: ReminderSettings) => Promise<void>;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  stats,
  account,
  onReOnboard,
  onLogout,
  onDataRestored,
  reminderSettings,
  onSaveReminders
}) => {
  const [installMsg, setInstallMsg] = useState<string | null>(null);
  const [cloudSyncOn, setCloudSyncOn] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [isCloudRestoring, setIsCloudRestoring] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Informa se os dados estão sendo espelhados na nuvem: só acontece com login
  // pelo Google, já que as políticas do servidor exigem sessão autenticada.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void isCloudSyncActive().then((active) => {
      if (!cancelled) setCloudSyncOn(active);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  /**
   * Dispara o prompt nativo de instalação de verdade. A versão anterior apenas
   * limpava a chave de "dispensado" e recarregava a página, o que no Android
   * não instalava nada nem fazia o cartão reaparecer.
   */
  const handleInstallApp = async () => {
    setInstallMsg(null);

    if (isInstallPromptAvailable()) {
      const outcome = await showInstallPrompt();
      if (outcome === 'accepted') {
        onClose();
        return;
      }
      if (outcome === 'dismissed') {
        setInstallMsg('Instalação cancelada. Você pode tentar novamente quando quiser.');
        return;
      }
    }

    if (isIOSDevice()) {
      setInstallMsg(
        'No iPhone e iPad: toque em Compartilhar no Safari e escolha "Adicionar à Tela de Início".'
      );
      return;
    }

    setInstallMsg(
      'Seu navegador não ofereceu a instalação automática. Abra o menu do navegador e escolha "Instalar aplicativo" ou "Adicionar à tela inicial".'
    );
  };

  /** Exporta o plano em texto, para levar ao nutricionista ou imprimir. */
  const handleExportPlan = async (modo: 'baixar' | 'compartilhar') => {
    setBackupError(null);
    setBackupMsg(null);

    try {
      const [mealPlans, routines] = await Promise.all([
        db.mealPlans.toArray(),
        db.routines.toArray()
      ]);

      if (modo === 'baixar') {
        const arquivo = downloadPlanText(profile, stats, mealPlans, routines);
        setBackupMsg(`Plano salvo como "${arquivo}".`);
        return;
      }

      const resultado = await sharePlanText(profile, stats, mealPlans, routines);
      setBackupMsg(
        resultado === 'compartilhado'
          ? 'Plano compartilhado.'
          : resultado === 'copiado'
          ? 'Plano copiado para a área de transferência.'
          : 'Seu navegador não permitiu compartilhar. Use o botão de baixar.'
      );
    } catch (err) {
      console.error('Erro ao exportar o plano:', err);
      setBackupError('Não foi possível gerar o plano. Tente novamente.');
    }
  };

  const handleResetApp = async () => {
    if (
      !confirm(
        'Isto apaga TODOS os seus dados deste dispositivo: perfil, cardápio, fichas de treino, pesagens e histórico. Esta ação não pode ser desfeita. Deseja continuar?'
      )
    ) {
      return;
    }

    // Segunda confirmação: é destrutivo e irreversível.
    if (!confirm('Confirma o apagamento definitivo de todos os dados?')) return;

    try {
      await db.delete();
      window.location.reload();
    } catch (err) {
      console.error('Erro ao resetar os dados:', err);
      alert('Não foi possível apagar os dados. Feche outras abas do OmniFit e tente novamente.');
    }
  };

  const handleExportBackup = async () => {
    setBackupError(null);
    setBackupMsg(null);

    try {
      const fileName = await downloadUserDataBackup();
      setBackupMsg(`Backup salvo como "${fileName}". Guarde este arquivo fora do celular.`);
    } catch (err) {
      console.error('Erro ao exportar backup:', err);
      setBackupError('Não foi possível gerar o arquivo de backup. Tente novamente.');
    }
  };

  /**
   * Baixa os dados da nuvem para este aparelho. Em 'replace' o servidor vence;
   * é o caminho para quem trocou de celular ou perdeu os dados locais.
   */
  const handleCloudRestore = async () => {
    setBackupError(null);
    setBackupMsg(null);

    if (
      !confirm(
        'Isto vai substituir seu perfil, cardápio e fichas de treino pelos que estão salvos na nuvem. ' +
        'Pesagens, treinos e diário alimentar serão somados ao histórico local, sem apagar nada. Continuar?'
      )
    ) {
      return;
    }

    setIsCloudRestoring(true);
    try {
      const result = await pullFromCloud('replace');
      setBackupMsg(result.resumo);
      if (result.perfilRestaurado) {
        onDataRestored?.();
      }
    } catch (err) {
      console.error('Erro ao restaurar da nuvem:', err);
      setBackupError('Não foi possível restaurar da nuvem. Verifique sua conexão e tente novamente.');
    } finally {
      setIsCloudRestoring(false);
    }
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    // O input é reaproveitado: sem zerar o valor, escolher o MESMO arquivo de
    // novo não dispara outro onChange.
    event.target.value = '';
    if (!file) return;

    if (
      !confirm(
        `Restaurar "${file.name}" SUBSTITUI todos os dados deste dispositivo: perfil, cardápio, fichas de treino, pesagens e histórico. O que existe hoje será sobrescrito e não poderá ser recuperado. Deseja continuar?`
      )
    ) {
      return;
    }

    setBackupError(null);
    setBackupMsg(null);
    setIsRestoring(true);

    try {
      await importUserData(await file.text(), 'replace');
      // A base de alimentos e o estado das telas vivem em memória; recarregar é
      // a única forma segura de refletir o banco recém-restaurado.
      window.location.reload();
    } catch (err) {
      console.error('Erro ao importar backup:', err);
      // As mensagens de validação já são escritas para o usuário final.
      setBackupError(
        err instanceof Error ? err.message : 'Não foi possível restaurar o backup.'
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const getGoalName = () => {
    switch (profile.goal) {
      case 'recomposition':
        return 'Recomposição Corporal';
      case 'fat_loss':
        return 'Emagrecimento Acelerado';
      case 'hypertrophy':
        return 'Hipertrofia Limpa (Bulking)';
      case 'maintenance':
        return 'Manutenção & Performance';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Perfil & Fórmulas Metabólicas"
      subtitle={`Parâmetros estimados e calibrados para ${profile.name}`}
    >
      <div className="space-y-4">
        {/* Account Info & Logout */}
        {account && (
          <div className="p-3.5 rounded-2xl bg-[#060A14] border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#84CC16]/15 border border-[#84CC16]/30 text-[#A3E635] flex items-center justify-center font-bold text-sm font-mono shrink-0 uppercase">
                {account.name.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white truncate">{account.name}</h4>
                <p className="text-[10px] text-slate-400 font-mono truncate">{account.email}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-red-400 border border-white/5 text-xs font-bold font-mono transition-all flex items-center gap-1.5 shrink-0"
              title="Encerrar sessão"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        )}

        {/* User Anthropometrics */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="font-bold text-white uppercase tracking-wider">Dados Antropométricos</span>
            <span className="text-[#A3E635] font-bold font-mono">{getGoalName()}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono text-center pt-1">
            <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5">
              <span className="text-[10px] text-slate-500 block">Peso Atual</span>
              <strong className="text-white font-bold text-sm">{profile.weightKg} kg</strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5">
              <span className="text-[10px] text-slate-500 block">Altura</span>
              <strong className="text-white font-bold text-sm">{profile.heightCm} cm</strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5">
              <span className="text-[10px] text-slate-500 block">% Gordura</span>
              <strong className="text-emerald-400 font-bold text-sm">{profile.bodyFatPercentage || 18}%</strong>
            </div>
          </div>
        </div>

        {/* Scientific Metabolic Breakdown */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-500/20 space-y-2.5 text-xs">
          <span className="font-bold text-blue-400 uppercase tracking-wider block">
            Detalhamento Termodinâmico Real
          </span>

          <div className="space-y-2 text-slate-300">
            <div className="flex items-center justify-between py-1 border-b border-white/5 font-mono">
              <span className="text-slate-400">TMB ({stats.formulaUsed.replace('_', ' ')}):</span>
              <strong className="text-white">{stats.bmr} kcal/dia</strong>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-white/5 font-mono">
              <span className="text-slate-400">Gasto Total (TDEE):</span>
              <strong className="text-white">{stats.tdee} kcal/dia</strong>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-white/5 font-mono">
              <span className="text-slate-400">Meta Diária Alocada:</span>
              <strong className="text-emerald-400 font-bold text-sm">{stats.targetCalories} kcal</strong>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-white/5 font-mono">
              <span className="text-slate-400">Efeito Térmico Alimentos (TEF):</span>
              <strong className="text-amber-400">~{stats.tefKcal} kcal</strong>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-white/5 font-mono">
              <span className="text-slate-400">Meta Hídrica Diária:</span>
              <strong className="text-cyan-400">{stats.waterIntakeMl} ml</strong>
            </div>

            <div className="flex items-center justify-between py-1 font-mono">
              <span className="text-slate-400">Fibras Mínimas Recomendadas:</span>
              <strong className="text-slate-200">{stats.fiberGramsTarget}g</strong>
            </div>
          </div>
        </div>

        {/* Pre-Workout Exact Formulation */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/30 to-slate-900 border border-amber-500/20 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
            <span className="font-bold text-amber-400 uppercase tracking-wider">
              Fórmula de Pré-Treino Cadastrada
            </span>
            <span className="text-[10px] font-mono text-slate-400 font-bold">Dose 10g (Zero Açúcar)</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono text-[11px] pt-1">
            <div className="flex justify-between bg-black/30 p-1.5 rounded-lg">
              <span className="text-slate-400">Cafeína:</span>
              <strong className="text-white">400 mg</strong>
            </div>
            <div className="flex justify-between bg-black/30 p-1.5 rounded-lg">
              <span className="text-slate-400">Taurina:</span>
              <strong className="text-white">2000 mg</strong>
            </div>
            <div className="flex justify-between bg-black/30 p-1.5 rounded-lg">
              <span className="text-slate-400">Beta-Alanina:</span>
              <strong className="text-white">2000 mg</strong>
            </div>
            <div className="flex justify-between bg-black/30 p-1.5 rounded-lg">
              <span className="text-slate-400">L-Arginina:</span>
              <strong className="text-white">1000 mg</strong>
            </div>
            <div className="flex justify-between bg-black/30 p-1.5 rounded-lg">
              <span className="text-slate-400">Sódio:</span>
              <strong className="text-white">40 mg</strong>
            </div>
            <div className="flex justify-between bg-black/30 p-1.5 rounded-lg">
              <span className="text-slate-400">Cromo:</span>
              <strong className="text-white">35 mcg</strong>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 pt-1">
            Vitaminas ativas: B5 (5.64mg), B6 (3.9mg), Vitamina E (30mg).
          </p>
        </div>

        {/* Lembretes */}
        {reminderSettings && onSaveReminders && (
          <div className="pt-3 border-t border-white/[0.06]">
            <RemindersSection settings={reminderSettings} onSave={onSaveReminders} />
          </div>
        )}

        {/* Backup & Restore (local-first: sem isto, limpar o navegador apaga tudo) */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-2.5 text-xs">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="font-bold text-white uppercase tracking-wider">Backup e Restauração</span>
            <span className="text-[10px] font-mono text-slate-400">Arquivo .json</span>
          </div>

          <p className="text-[10px] text-slate-400 leading-snug">
            Seus dados ficam apenas neste aparelho. Exporte um arquivo de vez em quando: limpar os
            dados do navegador apaga todo o histórico sem volta.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleExportBackup}
              className="py-2.5 rounded-2xl bg-[#060A14] hover:bg-[#060A14]/80 text-[#A3E635] border border-[#84CC16]/40 font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isRestoring}
              className="py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{isRestoring ? 'Restaurando...' : 'Restaurar'}</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportBackup}
            className="hidden"
          />

          <div className="pt-1 border-t border-white/[0.06] space-y-2">
            <p className="text-[10px] text-slate-400 leading-snug">
              Plano em texto para levar ao nutricionista ou personal, ou imprimir.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleExportPlan('baixar')}
                className="py-2.5 rounded-2xl bg-[#060A14] hover:bg-[#060A14]/80 text-slate-300 border border-white/10 font-bold text-xs transition-all flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>Baixar plano</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportPlan('compartilhar')}
                className="py-2.5 rounded-2xl bg-[#060A14] hover:bg-[#060A14]/80 text-slate-300 border border-white/10 font-bold text-xs transition-all flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Compartilhar</span>
              </button>
            </div>
          </div>

          {backupMsg && (
            <p className="text-[10px] font-mono text-[#A3E635] leading-snug">{backupMsg}</p>
          )}

          {backupError && (
            <p className="text-[10px] font-mono text-red-400 leading-snug">{backupError}</p>
          )}
        </div>

        {/* Re-calibrate / Reset Actions */}
        <div className="space-y-2 pt-2">
          {cloudSyncOn && (
            <button
              type="button"
              onClick={handleCloudRestore}
              disabled={isCloudRestoring}
              className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              title="Traz para este aparelho os dados salvos na sua conta Google"
            >
              <CloudDownload className="w-4 h-4" />
              <span>{isCloudRestoring ? 'Restaurando da nuvem...' : 'Restaurar da nuvem'}</span>
            </button>
          )}

          <div className="p-3 rounded-2xl bg-[#060A14] border border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">Backup na nuvem</span>
            <span className={cloudSyncOn ? 'text-[#A3E635] font-bold' : 'text-slate-500 font-bold'}>
              {cloudSyncOn ? 'Ativo' : 'Somente neste aparelho'}
            </span>
          </div>

          {!isRunningStandalone() && (
            <button
              onClick={handleInstallApp}
              className="w-full py-3 rounded-2xl bg-[#060A14] hover:bg-[#060A14]/80 text-[#A3E635] border border-[#84CC16]/40 font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              <span>Instalar Aplicativo no Celular (PWA)</span>
            </button>
          )}

          {installMsg && (
            <p className="text-[10px] font-mono text-amber-400 leading-snug px-1">{installMsg}</p>
          )}

          <button
            onClick={() => {
              onClose();
              onReOnboard();
            }}
            className="w-full py-3.5 rounded-2xl btn-lime text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-lime-500/20 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Editar Parâmetros & Recalibrar Plano</span>
          </button>

          <button
            onClick={handleResetApp}
            className="w-full py-2.5 rounded-2xl bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 font-bold text-xs transition-all flex items-center justify-center gap-2"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Limpar Banco de Dados & Resetar App</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
