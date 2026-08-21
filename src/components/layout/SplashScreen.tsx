import React from 'react';

export const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 bg-[#050811] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/3 -left-20 w-80 h-80 bg-lime-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/3 -right-20 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="flex flex-col items-center gap-6 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        {/* Animated Dumbbell / Halter Logo Container */}
        <div className="relative group">
          <div className="absolute -inset-3 bg-gradient-to-r from-lime-500/30 via-emerald-500/30 to-lime-400/30 rounded-3xl blur-xl transition-all animate-pulse" />
          
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-[#090F1E] border border-[#84CC16]/40 p-3 flex items-center justify-center shadow-2xl relative shadow-lime-500/20">
            {/* Real Gym Dumbbell Icon from favicon.svg */}
            <img
              src="/favicon.svg"
              alt="OmniFit Halter"
              className="w-full h-full object-contain drop-shadow-[0_0_16px_rgba(163,230,53,0.5)] transition-transform duration-700 hover:scale-105"
            />
          </div>
        </div>

        {/* Brand Text */}
        <div className="text-center space-y-1.5">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-display">
            Omni<span className="text-[#A3E635]">Fit</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium font-sans">
            Nutrição de Precisão & Biomecânica Adaptativa
          </p>
        </div>

        {/* Smooth Loading Indicator */}
        <div className="w-48 sm:w-56 mt-2 space-y-2">
          <div className="h-1.5 w-full bg-[#090F1E] rounded-full overflow-hidden border border-white/[0.06] p-0.5">
            <div className="h-full bg-gradient-to-r from-[#84CC16] via-[#A3E635] to-emerald-400 rounded-full animate-[pulse_1.5s_ease-in-out_infinite] w-full" />
          </div>
          <p className="text-[10px] font-mono text-center font-bold text-slate-500 uppercase tracking-widest">
            Inicializando Dados Locais...
          </p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
