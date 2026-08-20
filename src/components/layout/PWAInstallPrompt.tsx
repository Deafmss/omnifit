import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';
import {
  isInstallPromptAvailable,
  isIOSDevice,
  isRunningStandalone,
  showInstallPrompt,
  subscribeToInstallPrompt
} from '../../core/pwa/installPrompt';

const DISMISSED_KEY = 'omnifit_pwa_dismissed_at';
const DISMISS_HOURS = 24;

interface PWAInstallPromptProps {
  /** Ignora o período de silêncio de 24 h (usado pelo botão em Configurações). */
  forceVisible?: boolean;
  onDismiss?: () => void;
}

function wasRecentlyDismissed(): boolean {
  const dismissedAt = localStorage.getItem(DISMISSED_KEY);
  if (!dismissedAt) return false;

  const hours = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60);
  return Number.isFinite(hours) && hours < DISMISS_HOURS;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ forceVisible, onDismiss }) => {
  const [isIOS, setIsIOS] = useState(false);
  const [hasNativePrompt, setHasNativePrompt] = useState(() => isInstallPromptAvailable());
  const [isVisible, setIsVisible] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    // Já instalado: nada a oferecer.
    if (isRunningStandalone()) return;

    if (!forceVisible && wasRecentlyDismissed()) return;

    const iosDevice = isIOSDevice();
    setIsIOS(iosDevice);

    if (iosDevice) {
      // iOS não tem prompt nativo: só instruções.
      const timer = setTimeout(() => setIsVisible(true), forceVisible ? 0 : 2500);
      return () => clearTimeout(timer);
    }

    // Android/desktop: o evento pode já ter sido capturado no bootstrap.
    if (isInstallPromptAvailable()) {
      setHasNativePrompt(true);
      const timer = setTimeout(() => setIsVisible(true), forceVisible ? 0 : 1500);
      return () => clearTimeout(timer);
    }

    // Ou pode chegar depois — o módulo global avisa.
    const unsubscribe = subscribeToInstallPrompt((available) => {
      setHasNativePrompt(available);
      if (available) setIsVisible(true);
      if (!available) setIsVisible(false);
    });

    return unsubscribe;
  }, [forceVisible]);

  const handleInstallClick = async () => {
    const outcome = await showInstallPrompt();

    if (outcome === 'accepted') {
      setIsVisible(false);
      return;
    }

    if (outcome === 'dismissed') {
      // O usuário recusou: fecha o cartão em vez de deixar um botão inerte —
      // o evento nativo só pode ser consumido uma vez.
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
      setIsVisible(false);
      onDismiss?.();
      return;
    }

    setStatusMsg(
      'Seu navegador não ofereceu a instalação automática. Use o menu do navegador e escolha "Instalar aplicativo" ou "Adicionar à tela inicial".'
    );
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  const showNativeButton = !isIOS && hasNativePrompt;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto animate-in slide-in-from-bottom-6 duration-300">
      <div className="p-4 rounded-3xl bg-[#090F1E]/95 backdrop-blur-xl border border-[#84CC16]/40 shadow-2xl shadow-lime-500/10 space-y-3 relative overflow-hidden">
        {/* Glowing Spot */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#84CC16]/20 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between relative z-10 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#060A14] border border-[#84CC16]/30 flex items-center justify-center text-[#A3E635] shadow-inner shrink-0">
              <img src="/favicon.svg" alt="OmniFit" className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-extrabold text-white font-display">Instalar o OmniFit</h4>
                <span className="px-1.5 py-0.5 rounded-full bg-[#84CC16]/15 border border-[#84CC16]/30 text-[#A3E635] text-[8px] font-black font-mono uppercase">
                  App Nativo
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                {isIOS
                  ? 'Acesso rápido em tela cheia com funcionamento offline no iPhone e iPad.'
                  : 'Instale na sua tela inicial para acesso offline rápido e tela cheia.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-xl text-slate-500 hover:text-white hover:bg-white/10 transition-all shrink-0"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="relative z-10 pt-1 space-y-2">
          {showNativeButton ? (
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-3 px-4 rounded-2xl btn-lime text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-md shadow-lime-500/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Instalar Aplicativo (1 Toque)</span>
            </button>
          ) : isIOS ? (
            /* iOS: instruções, já que não existe prompt nativo */
            <div className="p-3 rounded-2xl bg-[#060A14] border border-white/[0.08] text-xs space-y-1.5 font-mono">
              <div className="flex items-center gap-2 text-slate-200">
                <span>1. Toque em Compartilhar</span>
                <Share className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <span>2. Selecione</span>
                <span className="text-[#A3E635] font-bold flex items-center gap-1">
                  "Adicionar à Tela de Início"
                  <PlusSquare className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-[10px] text-slate-500 pt-0.5">
                No iPhone e iPad, use o Safari para que a opção apareça.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-[#060A14] border border-white/[0.08] text-[11px] font-mono text-slate-300">
              Abra o menu do navegador e escolha "Instalar aplicativo" ou "Adicionar à tela inicial".
            </div>
          )}

          {statusMsg && (
            <p className="text-[10px] font-mono text-amber-400 leading-snug">{statusMsg}</p>
          )}
        </div>
      </div>
    </div>
  );
};
