import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/**
 * Contador global de modais abertos.
 *
 * O scroll do body só é liberado quando o ÚLTIMO modal fecha. Com um simples
 * `overflow = 'unset'` no cleanup, fechar um modal aninhado (o cadastro de
 * alimento dentro do seletor de alimentos) destravava o scroll da página com o
 * modal externo ainda aberto.
 */
let openModalCount = 0;

function lockBodyScroll() {
  openModalCount += 1;
  document.body.style.overflow = 'hidden';
  document.body.style.touchAction = 'none';
}

function unlockBodyScroll() {
  openModalCount = Math.max(0, openModalCount - 1);
  if (openModalCount === 0) {
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    lockBodyScroll();
    return unlockBodyScroll;
  }, [isOpen]);

  // Fecha com Escape e mantém o foco dentro do painel (focus trap).
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Move o foco para o painel, para que leitores de tela e teclado sigam o modal.
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 w-screen h-screen"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-lg bg-[#090F1E] border border-white/[0.12] rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in zoom-in-95 sm:slide-in-from-bottom-2 duration-200 outline-none box-border my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.08] bg-[#060A14]/80 shrink-0">
          <div className="min-w-0 flex-1 pr-2">
            <h3 id={titleId} className="text-base font-extrabold text-white font-display tracking-tight truncate">
              {title}
            </h3>
            {subtitle && <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 font-sans truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors btn-tactile shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 overscroll-contain flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
