# OmniFit — Pendências de Desenvolvimento

> Documento de handoff. Descreve o estado atual do projeto, o que já foi corrigido
> e o que falta fazer. Autocontido: não depende de contexto de conversa anterior.

## ⏩ RETOMADA RÁPIDA

**Estado:** working tree limpo, tudo commitado. `281 testes` passando, `tsc` limpo,
`eslint` 0 erros, `vite build` ok.

**Lista 1 (correções): CONCLUÍDA** — seção 3.
**Lista 2 (novos recursos): 10 de 12 feitos** — seção 4. Os 2 restantes estão
**deliberadamente adiados**, com o motivo escrito em cada um.

**Último trabalho:** scanner de código de barras + lembretes de água, refeição e
treino (`core/services/reminders.ts`, `core/services/useReminders.ts`,
`features/diet/BarcodeScannerModal.tsx`, `components/layout/RemindersSection.tsx`).

**PRÓXIMO PASSO:** não há item obrigatório em aberto. As duas pendências da Lista 2
(fotos de progresso e modo treinador) exigem decisões de produto descritas na seção
4.3 — leia antes de começar qualquer uma.

**Antes de publicar** — seção 5: configurar `VITE_SUPABASE_URL` e
`VITE_SUPABASE_ANON_KEY` na Vercel (senão o login com Google devolve erro) e conferir
que o `supabase/schema.sql` foi aplicado de verdade no projeto. A rotação da chave é
opcional e de prioridade baixa — o motivo está escrito lá.

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

6. ~~**Scanner de código de barras.**~~ ✅ FEITO
   `openFoodFacts.fetchFoodByBarcode()` consulta o endpoint de produto do Open Food
   Facts (chave exata, não busca textual) e reaproveita o mesmo mapeador da busca por
   texto — os dois caminhos geram o mesmo id determinístico, sem duplicar o produto.
   A UI é `features/diet/BarcodeScannerModal.tsx`, aberta pelo botão de scanner ao
   lado da busca no `FoodPickerModal`.

   **Limitação real:** `BarcodeDetector` não existe no Safari nem em navegadores
   antigos, e a permissão de câmera pode ser negada. Nos dois casos o modal cai na
   digitação manual do código, que resolve o mesmo problema. A câmera é liberada ao
   fechar o modal (sem isso o LED fica aceso).

7. ~~**Lembretes e notificações.**~~ ✅ FEITO
   `core/services/reminders.ts` tem a regra pura de "quando avisar"
   (`collectDueReminders`), com 24 testes; `core/services/useReminders.ts` roda o
   ciclo de 1 minuto lendo o estado do banco; `components/layout/RemindersSection.tsx`
   são os ajustes, dentro do modal de perfil. As preferências ficam em `appMeta`, ou
   seja, por usuário.

   Cobre água (por intervalo, dentro de uma janela de horas, e para de avisar quando
   a meta do dia é batida), refeição (no horário do plano, por até 45 min, e só se
   ainda não houver registro no diário) e treino (no horário escolhido, só nos dias
   com treino no plano e se ainda não foi concluído). As chaves de disparo incluem a
   data, então os avisos se renovam sozinhos a cada dia.

   **Limitação real, dita na própria interface:** sem servidor de push, o aviso só sai
   com o app aberto (inclusive em segundo plano no celular com a PWA instalada).
   Notificação com o app totalmente fechado exigiria Web Push com backend e chaves
   VAPID — incompatível com o modo local-first atual.

### 4.3 Recursos de coach (diferencial)

9. ~~**Ciclo de carboidratos**~~ ✅ FEITO — `core/math/carbCycling.ts`, 13 testes.
10. ~~**Refeição livre planejada**~~ ✅ FEITO — `planFreeMeal()`, mesmo módulo.
11. ~~**Exportar dieta e treino**~~ ✅ FEITO — `core/backup/planExport.ts`, 8 testes.
    Gera **texto puro**, não PDF: um PDF exigiria biblioteca de ~300 KB no bundle e o
    texto atende os dois usos reais (mandar por mensagem e imprimir pelo navegador).

### 4.4 Adiados de propósito (decisão de produto pendente)

Os dois itens abaixo **não** foram feitos, e não por falta de tempo — cada um exige
uma decisão que muda a arquitetura. Entregá-los "mais ou menos" custaria mais do que
não entregar.

8. **Fotos de progresso** com comparação lado a lado.
   **Decisão pendente:** onde guardar as imagens. O backup atual é um JSON único, e
   fotos em base64 dentro dele inflam o arquivo para dezenas de MB, tornando o
   `downloadUserDataBackup` inutilizável na prática. Os caminhos possíveis são: (a)
   blobs no IndexedDB e **fora** do backup JSON — simples, mas as fotos não viajam
   entre dispositivos; (b) Supabase Storage — as fotos sincronizam, mas passam a
   depender de nuvem e de política RLS própria, quebrando a premissa local-first para
   o dado mais sensível do app; (c) exportação separada, um ZIP de fotos à parte.
   Antes de codar, escolher uma.

12. **Modo treinador** — compartilhar plano com aluno.
    **Por que está fora:** exige backend com autenticação de dois papéis (treinador e
    aluno), modelo de permissão, convite/aceite e uma tela nova inteira. É um projeto
    próprio, não um recurso incremental — o app hoje é single-user local-first, e isso
    atravessa a arquitetura toda.

---

## 5. Ações que dependem do dono do projeto

Não podem ser feitas por código:

1. **Configurar as variáveis de ambiente na Vercel** — *este é o bloqueio real.*
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em Settings → Environment
   Variables, e depois **redeploy** (a Vercel injeta as variáveis no build, então
   um deploy antigo não as pega). Sem isso o app continua funcionando 100%
   offline, mas o botão "Continuar com o Google" devolve erro
   (`signInWithGoogle` lança quando `supabase` é `null`).

2. **Confirmar que o `supabase/schema.sql` foi aplicado no projeto real.**
   O arquivo cobre as 7 tabelas com `enable row level security` e políticas
   `auth.uid() = user_id`. Mas o arquivo estar no repositório não prova que foi
   executado no painel do Supabase. Vale abrir o SQL Editor e conferir — é isso
   que protege os dados, não a chave.

3. **Rotacionar a chave do Supabase — opcional, prioridade baixa.**

   **Correção de uma avaliação anterior deste documento**, que tratava isso como
   urgente. A chave que ficou no histórico do git (commits `4fcff84`, `f89f8e0`)
   é `sb_publishable_...` — a chave **publicável**, o novo formato da anon key.
   Ela é *feita* para ser pública: vai no bundle JavaScript e qualquer pessoa que
   abra o app em produção pode lê-la no DevTools. Estar no histórico do git não
   expõe nada que a produção já não exponha.

   O que de fato limita o acesso é o RLS (item 2). Rotacionar faz sentido por
   higiene, não por vazamento. **Se o item 2 não estiver confirmado, aí sim há um
   problema** — mas o problema seria o RLS ausente, não a chave.

---

## 6. Ordem sugerida

A ordem abaixo **já foi executada** por completo:

1. ~~Testes de componente (3.2)~~
2. ~~Sync bidirecional (3.1)~~
3. ~~Progressão de carga + PRs (4.1 itens 1 e 2)~~
4. ~~Quebrar componentes gigantes (3.3)~~
5. ~~Scanner de código de barras + lembretes (4.2)~~
6. ~~Restante da seção 4~~ — exceto os dois itens da seção 4.4, adiados de propósito

O que sobra é a seção 5 (ações do dono do projeto) e, se houver interesse, decidir o
armazenamento das fotos de progresso descrito em 4.4.

---

## 7. Aviso sobre o estado do repositório

Working tree limpo: tudo está commitado. Mas **nada foi publicado**.

- O código **está rodando** localmente — o Vite lê do disco, não do git.
- **A produção na Vercel não tem nenhuma destas mudanças.** Os commits são locais.
- Para chegar em produção: `git push` → a Vercel faz o deploy.
- **Antes de subir**, configure as variáveis de ambiente (seção 5, item 2). Sem elas
  o login com Google quebra em produção.
