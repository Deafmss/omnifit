/**
 * Ambiente mínimo de navegador para os testes de armazenamento.
 *
 * Sem isto, `environment: 'node'` deixa toda a camada Dexie/IndexedDB sem
 * cobertura — foi exatamente por isso que o bug do índice booleano em
 * `getWorkoutFrequencyStats` (que zerava streak, aderência e tonelagem)
 * passou despercebido por uma suíte inteira de testes verdes.
 */
import 'fake-indexeddb/auto';

// O db.ts consulta o localStorage para descobrir o contêiner do usuário ativo.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      }
    }
  });
}
