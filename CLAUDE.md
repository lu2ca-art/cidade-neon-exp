# CLAUDE.md

Contexto do projeto para qualquer sessão do Claude Code trabalhando neste repo.

## O que é

**Cidade Neon** é uma experiência narrativa interativa (estilo ARG/funil
gamificado) construída em Next.js, gerada e mantida via [v0.app](https://v0.app)
(merges em `main` fazem deploy automático). O usuário passa por uma sequência
de telas que simulam apps de um celular (ligação, WhatsApp, Spotify, TikTok,
rádio de carro, um "hacker takeover", etc.) dentro de uma narrativa com
missões e confirmações que vão desbloqueando conteúdo.

## Stack

- Next.js 16 (App Router) + React 19, TypeScript
- Tailwind CSS 4 + Radix UI (`components/ui`, padrão shadcn) + `class-variance-authority`
- `three` para elementos 3D (`SteeringWheel3D.tsx`)
- Gerenciador de pacotes: **pnpm** (`pnpm-lock.yaml` é o lockfile válido; ignore `bun.lock` se aparecer desatualizado)
- Sem backend/DB — todo estado persiste em `localStorage` no client

Rodar local: `pnpm install && pnpm dev`

## Arquitetura do estado (o coração do projeto)

`app/providers/GameFunnelProvider.tsx` é a fonte de verdade de todo o funil
narrativo (`GameFunnelState`): passo atual (`cinematicStep`), confirmações
(`c1`/`c2`/`c3`), estado por "mini-app" (`perAppState.call`, `.hacker`,
`.whatsapp`, `.tiktok`, ...), o que já foi desbloqueado, etc. Persiste em
`localStorage` sob a chave `cidade-neon-funnel-v3` (versionado — mudar o shape
do estado exige bump de `CURRENT_VERSION` e um bloco de migração em `loadState`,
não um reset silencioso que apaga progresso de quem já está no meio do funil).

Ponto **não óbvio e crítico**: `/drive` (o carro) e o hub do celular (dentro de
um iframe) são duas árvores React separadas, cada uma com sua própria instância
do `GameFunnelProvider` — elas só se sincronizam via `localStorage` + o evento
`storage` do browser (ver o `useEffect` com `window.addEventListener("storage", ...)`
em `GameFunnelProvider.tsx`). Se você adicionar um novo pedaço de estado
compartilhado entre carro e celular, ele **precisa** passar por esse mesmo
mecanismo — não dá pra assumir que as duas árvores compartilham memória.

Padrões que o estado do projeto segue (violar isso já causou bug em produção —
ver `STATE_AUDIT_REPORT.md`):
- Nunca confundir o valor do estado (`state`) com o updater (`setState`) —
  são coisas destruturadas separadamente de `useGameFunnel()`.
- Todo update é imutável: merge/spread, nunca mutação direta.
- Updates que dependem do estado anterior usam a forma funcional
  (`setState(prev => ...)`), não closures com valor stale.
- Efeitos com `setInterval`/`setTimeout` sempre limpam no cleanup.

Uso da skill/agent relacionados: antes de mexer em `GameFunnelProvider.tsx` ou
em qualquer componente que chama `useGameFunnel()`, rode o agent
`state-auditor` (`.claude/agents/state-auditor.md`).

## Áudio

`app/providers/AudioPlayerProvider.tsx` toca as faixas (`public/audio/tracks`)
e efeitos sonoros pontuais (`public/audio/*.mp3`). `app/providers/AudioBridge.ts`
faz a ponte de mensagens entre o iframe do celular e a janela pai (o carro) —
é o mesmo tipo de fronteira que o `GameFunnelProvider`, então qualquer coisa de
áudio que precise refletir dos dois lados passa por aqui, não por estado local.

## Mapa de rotas (`app/*/page.tsx`)

Cada pasta sob `app/` é uma tela/mini-app da narrativa. As mais relevantes:

| Rota | O que é |
|---|---|
| `/` | tela raiz — orquestra as fases iniciais (ligação, hacker, spotify, whatsapp) via uma máquina de estados local (`Phase`) |
| `/drive` | o carro — hub externo, painel, rádio, navegação entre missões |
| `/sintonizador` | interface de sintonizar frequências de rádio |
| `/radio`, `/spotify` | players temáticos |
| `/ligacao` | tela de ligação recebida/ativa |
| `/hacker` | terminal de "invasão" (efeito Matrix) |
| `/neon-tiles` | mini-game |
| `/nectar`, `/feel-good`, `/batida`, `/n3xo` | telas de confirmação/missão específicas |
| `/tiktok` | feed simulado |
| `/confirmacao`, `/final` | encerramento do funil |
| `/dev` | rota utilitária de desenvolvimento |

Cada página nova geralmente segue o mesmo esqueleto: `"use client"`, uma
`type Phase = ...` local para a sub-máquina de estados da tela, consome
`useGameFunnel()` e/ou `useAudioPlayer()`, e ao terminar chama
`updateCinematicStep(...)` / `completeConfirmation(...)` para avançar o funil
global. Use a skill `scaffold-neon-page` para criar uma tela nova já seguindo
esse padrão em vez de copiar/colar manualmente uma existente.

## Convenções de conteúdo

Textos visíveis ao usuário (diálogos, mensagens, UI) são em **português
informal, sem acento em comentários de código** (olhe `GameFunnelProvider.tsx`
para o tom). Nomes de variáveis/tipos/funções em inglês, como o resto do
código React/TS padrão.

## Organização de arquivos

- `references/` — screenshots e mockups de referência visual (não é asset do
  app). Ver `references/README.md`. Não solte imagem nova na raiz do repo —
  use a skill `add-reference-asset`.
- `.claude/agents/` — subagentes especializados neste projeto.
- `.claude/skills/` — procedimentos reutilizáveis específicos deste projeto.

## Coisas para não fazer

- Não resetar `CURRENT_VERSION`/o shape do `GameFunnelState` sem escrever a
  migração em `loadState` — isso apaga o progresso de quem está no meio do
  funil.
- Não adicionar estado que precisa ser visto tanto pelo carro quanto pelo
  celular sem passar pelo mecanismo de `localStorage` + evento `storage`.
- Não soltar imagens/arquivos soltos na raiz do repo — usar `references/`.
