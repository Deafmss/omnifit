import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. Verifica se já está rodando como app instalado (standalone)
    const checkStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (checkStandalone) {
      setIsStandalone(true);
      return;
    }

    // 2. Verifica se o usuário já fechou recentemente
    const dismissedAt = localStorage.getItem('omnifit_pwa_dismissed_at');
    if (dismissedAt) {
      const hoursSinceDismissed = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60);
      if (hoursSinceDismissed < 24) {
        return; // Não incomoda o usuário nas primeiras 24h após fechar
      }
    }

    // 3. Detecta iOS / Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    if (isIosDevice) {
      setIsIOS(true);
      // Exibe para iOS após 2.5 segundos
      const timer = setTimeout(() => setIsVisible(true), 2500);
      return () => clearTimeout(timer);
    }

    // 4. Listener do evento nativo beforeinstallprompt (Android / Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Exibe o popup com animação
      setTimeout(() => setIsVisible(true), 1500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('omnifit_pwa_dismissed_at', String(Date.now()));
    setIsVisible(false);
  };

  if (isStandalone || !isVisible) {
    return null;
  }

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
                <h4 className="text-sm font-extrabold text-white font-display">
                  Instalar o OmniFit
                </h4>
                <span className="px-1.5 py-0.5 rounded-full bg-[#84CC16]/15 border border-[#84CC16]/30 text-[#A3E635] text-[8px] font-black font-mono uppercase">
                  App Nativo
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                {isIOS 
                  ? 'Acesso rápido em tela cheia com funcionamento 100% offline no iPhone.' 
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
        <div className="relative z-10 pt-1">
          {isIOS ? (
            /* iOS Instruction Box */
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
            </div>
          ) : (
            /* Android / Desktop 1-Click Install Button */
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-3 px-4 rounded-2xl btn-lime text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-md shadow-lime-500/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Instalar Aplicativo (1 Toque)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
