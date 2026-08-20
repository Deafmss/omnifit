/**
 * Ambiente para testes de COMPONENTE (jsdom).
 *
 * Os arquivos que usam este setup declaram `@vitest-environment jsdom` no topo.
 * O restante da suíte continua em `node`, que é mais rápido e suficiente para a
 * camada `core/`.
 *
 * Antes disso existir, 29 telas não tinham um único teste: toda a interface era
 * verificada só por clique manual.
 */
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// O jsdom não implementa matchMedia, usado na detecção de PWA standalone.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  })) as unknown as typeof window.matchMedia;
}

// `confirm` bloquearia o teste. O padrão é aceitar; cada teste sobrescreve
// quando precisa verificar o caminho de cancelamento.
window.confirm = vi.fn(() => true);
window.alert = vi.fn();

// canvas-confetti tenta desenhar num canvas real.
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

// O Supabase não deve ser tocado em teste de interface.
vi.mock('../core/supabase/supabaseClient', () => ({
  supabase: null,
  isSupabaseConfigured: () => false,
  syncProfileToCloud: vi.fn(),
  syncMealPlansToCloud: vi.fn(),
  syncRoutinesToCloud: vi.fn(),
  syncSessionLogToCloud: vi.fn(),
  syncWeightLogToCloud: vi.fn(),
  syncCheckInLogToCloud: vi.fn(),
  syncFoodLogsToCloud: vi.fn(),
  fetchProfileFromCloud: vi.fn(async () => null),
  fetchMealPlansFromCloud: vi.fn(async () => null),
  fetchRoutinesFromCloud: vi.fn(async () => null),
  fetchWeightLogsFromCloud: vi.fn(async () => null),
  fetchSessionLogsFromCloud: vi.fn(async () => null),
  fetchCheckInLogsFromCloud: vi.fn(async () => null),
  fetchFoodLogsFromCloud: vi.fn(async () => null)
}));

afterEach(() => {
  cleanup();
});
