/**
 * Captura do evento `beforeinstallprompt` FORA do ciclo do React.
 *
 * O Chrome dispara esse evento muito cedo — normalmente antes de o React
 * montar a árvore, e o App só renderiza depois de resolver a sessão de
 * autenticação (uma chamada de rede). Registrar o listener dentro de um
 * `useEffect` perdia o evento e o botão de instalar nunca aparecia no Android.
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(available: boolean) => void>();

function notify(available: boolean) {
  listeners.forEach((listener) => listener(available));
}

/** Instala os listeners globais. Chamado uma única vez, no bootstrap do app. */
export function initInstallPromptCapture(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify(true);
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify(false);
  });
}

/** O navegador já ofereceu um prompt de instalação nativo? */
export function isInstallPromptAvailable(): boolean {
  return deferredPrompt !== null;
}

/** Inscreve-se em mudanças de disponibilidade do prompt. Devolve o cancelador. */
export function subscribeToInstallPrompt(listener: (available: boolean) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Dispara o prompt nativo. Retorna o desfecho, ou 'unavailable' se o navegador
 * não ofereceu prompt (iOS, ou app já instalado).
 */
export async function showInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';

  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    // O evento só pode ser usado uma vez.
    deferredPrompt = null;
    notify(false);
    return outcome;
  } catch (err) {
    console.warn('Falha ao exibir o prompt de instalação:', err);
    deferredPrompt = null;
    notify(false);
    return 'unavailable';
  }
}

/** O app já está rodando instalado (standalone)? */
export function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Detecta iOS/iPadOS. O iPadOS 13+ se identifica como macOS no user agent,
 * então a checagem por 'ipad' sozinha nunca casava em iPad moderno — o
 * desempate é a presença de touch.
 */
export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipod/.test(ua)) return true;
  if (/ipad/.test(ua)) return true;

  const isMacLike = /macintosh|mac os x/.test(ua);
  return isMacLike && navigator.maxTouchPoints > 1;
}
