import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'

// Acessibilidade entra como aviso: o objetivo é dar visibilidade aos problemas
// sem transformar o `npm run lint` em bloqueio de build. As regras que o preset
// já desliga (caso do `label-has-for`, obsoleto) continuam desligadas.
const jsxA11yWarnings = Object.fromEntries(
  Object.entries(jsxA11y.flatConfigs.recommended.rules).map(([regra, nivel]) => [
    regra,
    nivel === 'off' || nivel === 0 ? 'off' : 'warn',
  ])
)

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'public', 'dev-dist'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'jsx-a11y': jsxA11y,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...jsxA11yWarnings,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // O prefixo `_` já é usado no código para marcar descartes intencionais
      // (ex.: `const { id: _ignorado, ...resto } = row`).
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    rules: {
      // Dependência faltante costuma indicar bug real, mas manter como aviso
      // evita travar o build enquanto o débito existente é endereçado.
      'react-hooks/exhaustive-deps': 'warn',
      // Regra do React Compiler que reprova o padrão "useEffect + carregar do
      // IndexedDB + setState". Ele é usado em toda a aplicação e trocá-lo por
      // outra estratégia de carregamento é refatoração de arquitetura, não
      // ajuste de lint. Fica como aviso para o débito continuar visível.
      'react-hooks/set-state-in-effect': 'warn',
    },
  }
)
