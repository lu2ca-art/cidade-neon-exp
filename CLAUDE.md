# Cidade Neon Experience — repo do jogo

Este repo é o jogo/experiência interativa do projeto **LU2CA**, deployada em
https://lu2ca.art. Não é um projeto isolado — é **um nó** dentro de um
sistema maior. Toda decisão aqui deve considerar o resto.

## Contexto do sistema (leia antes de trabalhar em release, campanha ou narrativa)

- **Estado atual (bookmark cross-conversa):** `/Users/lu2ca/_opensquad/_memory/state.md`
  **Ler primeiro.** Guarda onde cada thread parou, o que aguarda decisão,
  o que tá bloqueado. Se o assunto tocar release/game/workflow criativo,
  esse arquivo evita o "me explica de novo".
- **Cronograma-mestre:** `/Users/lu2ca/_opensquad/_memory/cronograma.md`
  Fonte de verdade dos lançamentos, regras duras (T-21, sextas 00:00,
  intervalos 21/28 dias), estratégia Untitled × streaming, decisões
  em aberto. Sempre ler antes de sugerir qualquer coisa temporal.
- **Perfil da marca:** `/Users/lu2ca/_opensquad/_memory/company.md`
- **Filosofia operacional:** trabalho **sempre à frente do tempo**.
  Toda entrega tem deadlines T-N derivadas. Se não pode ser antecipado,
  não entra no plano.

## Stack

- **Next.js 16** (App Router, Cache Components)
- **React 19**
- **Tailwind 4** + **shadcn/ui** + **Radix**
- **Three.js** (`three@0.185`) para 3D
- **Bun** como package manager — lockfile é `bun.lock`.
  **Não rodar `npm install` ou `pnpm install`** (cria divergência).
- **Deploy:** Vercel, **auto-deploy do `main`** (via integração v0).

## Como rodar

```bash
bun install       # instala deps
bun run dev       # dev server em http://localhost:3000
bun run build     # build de produção
bun run lint      # eslint
```

## Etiqueta de deploy (CRÍTICO)

- **Todo push em `main` = deploy em produção em lu2ca.art.**
- **v0 também empurra pra `main`** a partir de https://v0.app —
  cuidado com corridas.
- Preferir **feature branches** pra qualquer mudança não-trivial.
- **Nunca** force-push em `main`.
- **Nunca** commitar `.env.local` ou arquivos de link Vercel (já no .gitignore).

## Branch policy (obrigatório antes de commitar)

O jogo é uma **plataforma** que abriga muitos lugares (museu, galeria,
loja de discos, pistas, prédios, ruas), personagens, histórias e missões.
Branch naming reflete essa arquitetura. **Uma branch = um escopo**:

```
main                              → sempre deployável (produção)
feature/game/<lugar-ou-sistema>   → dentro do jogo (museu, galeria,
                                    drive-v2, loja-discos, personagem-X,
                                    missao-Y, etc.)
feature/tools/<ferramenta>        → apps/ferramentas paralelas ao jogo
                                    (batida é o exemplo — studio musical
                                    que vive dentro do repo mas não é
                                    parte do jogo)
feature/infra/<escopo>            → tooling: CI, deploy, CLAUDE.md,
                                    hooks, refactor cross-cutting
```

Regras:
- **Nome da branch tem que descrever o escopo.** `feature/museu` só
  pode conter mudanças no museu. Não é bucket genérico de "próxima
  release" nem "coisas variadas".
- **Se um commit não cabe na branch, crie outra branch pra ele.** Não
  empurra fix de drive na branch da loja-discos.
- **Merge → delete a branch** (local e remoto). Branches longas
  acumulam trabalho não-relacionado.
- **Nunca commitar direto em `main`** exceto `feature/infra/*` triviais
  (chore de docs, .gitignore, config) — todo o resto passa por branch.
- **Chore de infra pode ir direto em `main`** se for pequeno e sem
  risco de produção (ex: adicionar seção no CLAUDE.md).

## Estrutura

- `app/` — App Router. Cada pasta é uma **sala** da experiência
  (`drive`, `radio`, `nectar`, `spotify`, `hacker`, `sintonizador`...).
- `components/` — componentes shadcn + UI própria.
- `hooks/` — estado do jogo (ver `useGameFunnel`).
- `lib/` — utilitários compartilhados.
- PNGs na raiz e em `public/` — assets visuais.

## Regras quando o trabalho toca um momento de release

- Cruzar com `cronograma.md` pra saber a fase atual.
- Assets, salas ou copy amarrados a uma faixa específica devem
  referenciar o **status da faixa** (rascunho, produção, delivery, público).
- Nada deve ir ao ar no jogo antes da faixa correspondente ter passado
  o T-21 — a não ser que seja uma feature "tier pago Untitled" de
  antecipação (comprador vê antes).
- **néctar** é a carro-chefe do próximo drop (11/09/2026) — sala ou
  componente novo relacionado a ela tem prioridade visual.

## Onde este repo se conecta ao resto do sistema

- **Untitled** (untitled.stream) — hub central de distribuição.
  Toda menção a álbum/faixa no jogo deve reforçar essa lógica.
- **Rádio 222 FM** dentro do jogo — vitrine musical do universo,
  toca todas as faixas incluindo `cidadeneon.crypto` e `subúrbio xenom`.
- **Skill `o-que-a-semana-pede`** — se você quiser saber o que a semana
  exige, chama a skill (fora do repo, no ambiente principal).
