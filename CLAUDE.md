# CLAUDE.md

## O que é

CIDADE NEON é a experiência interativa de lançamento do álbum **CIDADE NEON**, do
artista **LU2CA** (Instagram [@lu2ca.art](https://www.instagram.com/lu2ca.art),
YouTube [@LU222CA](https://www.youtube.com/@LU222CA), TikTok
[@lu2ca.mp3](https://tiktok.com/@lu2ca.mp3)). Site: lu2ca.art.

Não é uma landing page comum — é um **jogo narrativo imersivo** ambientado numa
cidade neon, com vários tipos diferentes de interação (ligação, terminal de
hacker, carro/rádio, grupo de WhatsApp, minigames, celular navegável). O jogo
simula o próprio celular do usuário sendo "invadido" e guia a pessoa numa
jornada de descoberta até o álbum completo no Untitled
(untitled.stream).

## Pra quem

Gen Z, público de música eletrônica/synthwave que descobre a experiência via
redes sociais e é atraído por formatos interativos tipo ARG (não por uma
página de lançamento tradicional).

## A jornada (visão geral)

1. Tela inicial (lu2ca.art) → ligação recebida de "D-Bee"
2. Sequência hacker (invasão simulada, estética terminal/Matrix)
3. Ligação ativa → cai no carro (`/drive`), com painel e rádio interativos
4. Grupo de WhatsApp (N3XO) com 3 personagens — D-Bee, Nizzy, Alohan —
   guiando 3 "confirmações" (testes que provam que a pessoa é humana/sente de
   verdade):
   - Confirmação 1 — NECTAR: quiz de arquétipo
   - Confirmação 2 — sintonizar frequências no rádio do carro
   - Confirmação 3 — GUITAR DRIVER: minigame de ritmo
5. Cada confirmação libera uma frequência de rádio nova (SUBÚRBIO XÊNON,
   CIDADENEON.CRYPTO, LIVE NEON, CIDADE NEON 222.4 FM) e novos apps no
   celular (NECTAR, B4TIDA, GUITAR DRIVER, SINT0NIA)
6. Final: acesso liberado a Instagram (`_IRIS.EXE`), TikTok (`//LOOP`),
   YouTube (`STR34M`) e ao álbum completo no Untitled (`[UNTITLED]`)

Faixas do álbum (ver `TRACKS` em `app/page.tsx`): nectar, dopamina, ojala,
sabe ontem?, chuva.

## Direção visual

Estrutura e clima de referência vêm de `references/horizon-drive/` — prints
do jogo de corrida synthwave "HORIZON Drive" (Shopify Editions Summer '25).
**Não é pra clonar** — é direção de estrutura (HUD, horizonte, estrada com
linhas neon) e atmosfera (contraste entre fundo escuro e acentos neon
saturados).

A paleta e o tom **já em uso de verdade no código** são a fonte da verdade e
estão documentados em `specs/design.md`.

## Regras gerais

- Se um pedido meu contradisser o que já está definido em
  `specs/design.md`, **PARE e me avise antes de fazer qualquer mudança** —
  não altere `specs/design.md` por conta própria.
- Onde a referência (visual ou de produto) não resolver uma decisão
  sozinha, pergunte antes de escrever ou decidir.
- Telas/fases novas seguem o mesmo padrão já usado em `app/page.tsx` (tipo
  `Phase`) e o estado compartilhado do `GameFunnelProvider`
  (`app/providers/GameFunnelProvider.tsx`) — não duplicar lógica de funil
  fora dele.
- `/drive` e o hub do celular (iframe) são duas árvores React separadas que
  só sincronizam via `localStorage` + evento `storage` — ver comentário em
  `GameFunnelProvider.tsx` antes de mexer nisso.

## Visão de longo prazo

O que está descrito acima é o que **já existe hoje**: o funil de lançamento
de CIDADE NEON, single-player, um artista só (LU2CA). A visão de produto vai
muito além disso — plataforma multiplayer, mapa multi-artista (A–Z), carro/
personagem customizáveis, e um pilar grande de criação musical (sampleamento,
remix, stems, MPC, Guitar Hero ligado ao instrumental real). Está tudo
documentado em `specs/visao-produto.md` — **não é o estado atual do código**,
é o norte. Só vira trabalho quando o usuário priorizar um pedaço específico.

## Arquivos de contexto

- @specs/design.md — paleta, tipografia, tom (fonte da verdade de design)
- @specs/narrativa.md — a história por trás da experiência (tema de
  independência, por que o hacker existe, multiplicidade de estímulo)
- @specs/visao-produto.md — visão de longo prazo do produto (norte, não é o
  que já está implementado)
- @memoria.md — decisões e aprendizados conforme o projeto avança
