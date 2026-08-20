# OmniFit — Pendências de Desenvolvimento

> Documento de handoff. Descreve o estado atual do projeto, o que já foi corrigido
> e o que falta fazer. Autocontido: não depende de contexto de conversa anterior.

## ⏩ RETOMADA RÁPIDA

**Estado:** working tree limpo, tudo commitado. `210 testes` passando, `tsc` limpo,
`eslint` 0 erros, `vite build` ok.

**Lista 1 (correções): CONCLUÍDA** — seção 3.
**Lista 2 (novos recursos): 1 de 12 feito** — seção 4.

**Último trabalho:** progressão de carga por exercício + recordes pessoais
(`core/math/strengthProgress.ts`, `features/progress/StrengthProgressChart.tsx`),
commit `f161350`.

**PRÓXIMO PASSO** — seguir a ordem da seção 4.1, que usa dados que o app já tem:
1. **Sugestão de deload** — `trainingEngine.auditWorkoutRoutines()` já calcula o MRV
   por grupo muscular; falta avisar quando o volume estourar o teto.
2. **Copiar refeição de outro dia** — a tabela `foodLogs` já tem o histórico por data.
3. **Templates de refeição** ("meu café da manhã padrão").

**Duas pendências que só o dono do projeto resolve** — seção 5: rotacionar a chave do
Supabase e configurar as variáveis de ambiente na Vercel. Sem a segunda, o login com
Google quebra em produção.

**Nada foi publicado ainda.** Os commits estão apenas locais; a Vercel só recebe as
mudanças após `git push`.

---

---

## 1. Contexto do projeto

**OmniFit** é um PWA de nutrição e treino, em português do Brasil, com base de
alimentos brasileira (TACO).

| | |
|---|---|
| Stack | React 19 · TypeScript · Vite 8 · Tailwind 3 · Dexie (IndexedDB) |
| Nuvem | Supabase (opcional — login Google + espelho de dados) |
| Testes | Vitest + fake-indexeddb |
| Deploy | Vercel · repo `Deafmss/omnifit` |
| Idioma | Todo o código, comentários e interface em pt-BR com acentuação correta |

### Arquitetura

```
src/
  core/           # domínio, NÃO importa nada da UI
    math/         # metabolism, adaptiveEngine, macroSolver, trainingEngine,
                  # dietOptimizer, thermogenics  (funções puras, testadas)
    data/         # tacoDatabase (141 alimentos), exerciseDatabase (80),
                  # workoutTemplates
    storage/      # db.ts (Dexie, schema v3), types.ts
    services/     # openFoodFacts
    supabase/     # supabaseClient, cloudSync
    backup/       # dataBackup (exportar/importar JSON)
    pwa/          # installPrompt
    utils/        # dateUtils  (SEMPRE usar — nunca toISOString para datas locais)
  features/       # telas: diet, workout, progress, onboarding, auth
  components/     # layout (Header, BottomNav, ProfileModal, PWAInstallPrompt)
                  # ui (Modal, Badge)
```

### Estado de qualidade (verificado)

- `npx tsc --noEmit` → limpo
- `npx vitest run` → **188 testes passando** (15 arquivos, incluindo componentes)
- `npx eslint .` → **0 erros**
- `npx vite build` → ok, bundle inicial ~258 KB (5 chunks)

**A LISTA 1 (correções) ESTÁ CONCLUÍDA.** O que resta é a Lista 2 (novos recursos),
na seção 4 deste documento.

### Convenções obrigatórias

1. **Datas locais**: use `core/utils/dateUtils` (`todayLocal()`, `toLocalDateString()`,
   `addDays()`, `daysBetween()`, `formatDayMonthBR()`).
   **Nunca** `new Date().toISOString().split('T')[0]` — isso retorna data UTC e no
   Brasil joga tudo que acontece após 21h para o dia seguinte.
2. **Datas na interface**: formato brasileiro DD/MM.
3. **Nunca duplicar cálculo na UI.** Toda matemática vive em `core/math` e a tela
   apenas exibe. Já houve bug de card com `* 87` cravado no JSX divergindo do motor.
4. **Modais renderizados sob demanda**: `{isOpen && <Modal…>}`. Montar sempre
   congela o estado interno na primeira renderização.
5. **Toda escrita no banco precisa de `try/catch`** com mensagem visível ao usuário.
   O app é local-first: falha silenciosa = perda de dados sem aviso.
6. **Comentários explicam o POR QUÊ**, nunca o óbvio.
7. Ao terminar qualquer tarefa: `npx tsc --noEmit` **e** `npx vitest run` devem passar.

---

## 2. Já foi feito — NÃO REFAZER

Cerca de 50 bugs foram corrigidos e verificados. Os principais:

### Correções de lógica
- **Índice booleano do IndexedDB**: `where('completed').equals(1)` num campo boolean
  retornava sempre vazio, zerando streak, aderência semanal, tonelagem e calorias.
- **Motor adaptativo sem efeito**: o ajuste calórico do check-in era gravado no log e
  nunca chegava ao alvo. Agora existe `UserProfile.calorieAdjustmentKcal`, aplicado em
  `calculateMetabolicStats` com teto de ±30% do TDEE e piso na TMB.
- **Janela do check-in**: usava `weightLogs.length` como se fosse dias. Agora usa
  diferença real de datas numa janela de 21 dias.
- **10 foodIds inexistentes** no gerador de cardápio (alimentos desapareciam em
  silêncio) e **26 de 49 chaves** de `FOOD_BUDGET_TIERS` apontando para IDs órfãos.
- **Timezone**: 17 pontos migrados para `dateUtils`.
- **Re-onboarding destrutivo**: recalibrar apagava treinos e cardápio. Agora só gera
  quando não existe nada.
- **Diário alimentar** (era a falha mais grave): `consumed` vivia no plano, sem data e
  sem reset. No dia seguinte o app afirmava que o usuário já havia comido tudo.
  Agora existe tabela `foodLogs` (schema v3) + `ensureDailyRollover()`.
- **Aderência**: era um slider que o usuário chutava. Agora `calculateDietAdherence()`
  mede do diário real.
- **"Déficit Projetado" de -3596 kcal**: mostrava `gasto − consumido até agora` com o
  rótulo errado. Agora há dois indicadores distintos: "Meta do dia" (fixo) e
  "Agora" (diminui conforme o usuário registra).

### Segurança e honestidade
- Senha migrada de SHA-256 puro para **PBKDF2** com salt (migração transparente das
  contas antigas no primeiro login).
- **Logout não desconectava** o Google — a sessão Supabase sobrevivia e relogava.
- **Login rápido burlava a senha**: clicar numa conta salva entrava sem credencial.
- **Credenciais do Supabase hardcoded** removidas do código.
- **Termogênese**: era linear e infinita (`0,18 kcal/mg`), com 15 kcal de taurina
  inventados e um `metabolicBoostPercentage` que contradizia o próprio `burnKcal`.
  Agora usa curva saturante com teto de 60 kcal, taurina em zero e nota de confiança.
- **Removido o botão que somava calorias estimadas à meta** (o erro ia direto ao prato).
- **Texto falso "dados criptografados localmente"** corrigido (o IndexedDB é texto claro).
- Rótulos "padrão ouro clínico" / "exatidão científica" ajustados para linguagem de
  estimativa.

### Infraestrutura
- `workoutTemplates.ts`: 390 linhas duplicadas entre duas funções viraram catálogo
  declarativo; `targetMuscles` agora é **derivado** dos exercícios.
- **Backup**: `core/backup/dataBackup.ts` exporta e importa JSON de todas as tabelas.
- **ESLint** configurado (flat config, react-hooks, jsx-a11y).
- **Code splitting** no `vite.config.ts`.
- PWA: ícones válidos, captura de `beforeinstallprompt` fora do React, `safe-area`
  (as classes `safe-top`/`safe-bottom` não existiam em lugar nenhum).
- Modal com portal, focus trap, Escape e contador global de scroll.

---

## 3. Correções — CONCLUÍDAS

Todos os itens da Lista 1 foram implementados e verificados.

### 3.1 Sincronização bidirecional ✅
- 7 funções de leitura em `supabaseClient.ts` (`fetchProfileFromCloud`, etc.)
- `core/storage/cloudRestore.ts` com `pullFromCloud('merge' | 'replace')`
- Tabela `food_logs` adicionada ao `supabase/schema.sql`, com constraint única
- Restauração automática no login quando o aparelho está vazio (`pullIfLocalEmpty`)
- Botão "Restaurar da nuvem" no `ProfileModal`
- 20 testes, validados por inversão do bug

Estratégia de conflito implementada: **estado atual** (perfil, cardápio, fichas) só é
sobrescrito em modo `replace`; **histórico** (pesagens, treinos, check-ins, diário) é
unido por chave natural e o registro local vence em empate. `null` da nuvem significa
"falha de leitura" e nunca apaga nada local; `[]` significa "não há dados lá".

### 3.2 Testes de componente ✅
- `jsdom` + Testing Library, com `@vitest-environment jsdom` por arquivo
  (a camada `core/` segue em `node`, que é mais rápido)
- Setup compartilhado em `src/test/componentSetup.ts`
- 28 testes cobrindo `DietOverview`, `Modal`, `AuthScreen`, `ActiveWorkoutModal`
  e `CheckInModal`
- Validados por inversão: reintroduzir cada um dos 4 bugs originais faz os
  testes correspondentes falharem

### 3.3 Componentes gigantes ✅
Lógica extraída para hooks, deixando as telas com apresentação:

| Arquivo | Antes | Depois | Hook criado |
|---|---|---|---|
| `DietOverview.tsx` | 672 | 468 | `useDietDay.ts` |
| `WorkoutSplitView.tsx` | 650 | 518 | `useWorkoutSplit.ts` |
| `OnboardingWizard.tsx` | 655 | 555 | `useOnboardingForm.ts` |

### 3.4 Acessibilidade — parcial
Os erros de ESLint estão em zero. Restam warnings de `jsx-a11y`, a maioria
`<div onClick>` que deveria ser `<button>`. Não bloqueia nada, mas continua
valendo como limpeza futura.

### 3.5 Proteína sobre massa magra — DECISÃO DE PRODUTO PENDENTE
`core/math/metabolism.ts` calcula proteína sobre o **peso total** (2,2 g/kg). Para
alguém de 134 kg isso dá 295 g/dia, acima do que a literatura mostra como útil.
Calcular sobre a massa magra quando o % de gordura é conhecido daria um número mais
realista — mas muda as metas de todos os usuários. Decidir antes de implementar.

---

## 4. FALTA FAZER — Novos recursos

### 4.1 Dados que o app já tem (melhor retorno, esforço pequeno)

1. ~~**Gráfico de progressão de carga por exercício.**~~ ✅ FEITO (commit `f161350`)
   `core/math/strengthProgress.ts` + `features/progress/StrengthProgressChart.tsx`,
   com 22 testes. Mostra carga de topo, 1RM estimado (Epley), tendência e variação
   percentual, com seletor de exercício na aba Treinos.
2. ~~**Recordes pessoais (PRs).**~~ ✅ FEITO (mesmo commit)
   `detectPersonalRecords()` compara a sessão com todo o histórico anterior. Aviso
   aparece ao concluir o treino, mostrando a marca superada. A primeira execução de
   um exercício não conta como recorde.
3. **Sugestão automática de deload.** ← PRÓXIMO
   `trainingEngine.auditWorkoutRoutines()` já calcula MRV por grupo muscular; falta
   avisar quando o volume estourar o teto recuperável.
4. **Copiar refeição de outro dia / duplicar refeição.** O diário (`foodLogs`) já tem
   o histórico por data.
5. **Refeições salvas como template** ("meu café da manhã padrão").

### 4.2 Alto impacto no uso diário (esforço médio)

6. **Scanner de código de barras.** `core/services/openFoodFacts.ts` já consulta a
   base por texto; adicionar busca por EAN + leitura de câmera (`BarcodeDetector` com
   fallback).
7. **Lembretes e notificações.** O PWA já tem service worker: beber água, hora da
   refeição, treino do dia.
8. **Fotos de progresso** com comparação lado a lado.

### 4.3 Recursos de coach (diferencial)

9. **Ciclo de carboidratos** — mais carboidrato em dia de treino, menos em descanso.
10. **Refeição livre planejada** com compensação ao longo da semana.
11. **Exportar dieta e treino em PDF** para levar ao nutricionista ou personal.
12. **Modo treinador** — compartilhar plano com aluno (esforço grande).

---

## 5. Ações que dependem do dono do projeto

Não podem ser feitas por código:

1. **Rotacionar a chave do Supabase.** As credenciais estavam fixas no código e
   continuam no histórico do git (commits `4fcff84` e `f89f8e0`). Removê-las do
   código não as remove do histórico. Gerar chave nova e revogar a antiga.
2. **Configurar as variáveis de ambiente na Vercel**: `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY`. Sem isso o login com Google **quebra em produção**,
   porque as credenciais hardcoded foram removidas.

---

## 6. Ordem sugerida

1. **Testes de componente** (3.2) — rede de proteção antes de mexer em UI
2. **Sync bidirecional** (3.1) — o recurso que hoje está pela metade
3. **Progressão de carga + PRs** (4.1 itens 1 e 2) — primeiro ganho que o usuário sente
4. **Quebrar componentes gigantes** (3.3) — agora com testes cobrindo
5. **Scanner de código de barras + lembretes** (4.2)
6. Restante da seção 4

---

## 7. Aviso sobre o estado do repositório

Há **23 arquivos modificados e não commitados**, contendo as correções descritas na
seção 2 (diário alimentar, termogênese, backup, ESLint, déficit).

- O código **está rodando** localmente — o Vite lê do disco, não do git.
- **A produção na Vercel NÃO tem essas correções**: o último commit publicado é de UI.
- Para chegar em produção: `commit` → `push` → a Vercel faz o deploy.
- **Antes de subir**, configure as variáveis de ambiente (seção 5, item 2).
