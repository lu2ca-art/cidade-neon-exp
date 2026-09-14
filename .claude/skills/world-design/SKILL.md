---
name: world-design
description: >
  World/spatial design methodology for Cidade Neon — how to map characters
  and narrative to physical places in the 3D world, reconcile conflicting
  color systems, and use the Blender MCP as a visual sketch before writing
  code. Load when designing a new place, zone, or character space in the
  game.
description_pt-BR: >
  Metodologia de design espacial da Cidade Neon — como mapear personagens e
  narrativa pra lugares físicos no mundo 3D, reconciliar sistemas de cor
  conflitantes, e usar o Blender MCP como rascunho visual antes de código.
  Carregar ao desenhar um lugar/zona/personagem novo no jogo.
categories: [game-design, narrative, world-building, blender]
---

# Design de mundo da Cidade Neon

## Estrutura da narrativa

Fonte: `app/n3xo/privado/[member]/page.tsx` (`SCRIPTS`). 3 personagens
fixos em ordem emocional crescente: **Alohan** (calmo, observacional) →
**Nizzy** (intensa, exige confiança primeiro) → **D-Bee** (rigoroso,
gatekeeper final). Essa ordem já bate com os 3 andares do loop de
`/drive-v2` (Y=6→22→38 — ver skill `drive-v2-tracks`) — não precisa
inventar hierarquia espacial nova pra um personagem, só usar a física que
já existe (andar mais alto = mais exigente/intenso).

## Três sistemas de cor que não se sobrepõem (decisão já tomada)

Cada personagem tem 3 cores diferentes em 3 lugares diferentes do código,
e eles não batem entre si:
- Cor pessoal (bolha de chat, avatar) — `SCRIPTS` em `n3xo/privado`.
- Cor da estação/tier de recompensa — `lib/radio-tiers.ts`.
- Cor do marcador de missão no HUD do `/drive` antigo — `lib/missions.ts`.

Regra adotada (não reabrir sem motivo novo): **cor-ambiente de um lugar
físico = cor da estação/tier** (faz sentido narrativo — você está dentro
da frequência); **cor pessoal = acento/detalhe** (pilar, portão,
holofote, nunca o volume principal); **cor do marcador de missão não
muda**, é só iconografia de HUD, não precisa combinar com nada. São 3
camadas de propósito diferentes, não uma inconsistência pra corrigir.

## Inconsistência de tom ainda aberta

Os scripts do DM privado (`n3xo/privado`) são frios/enigmáticos; os
mesmos personagens no chat de grupo (`app/page.tsx`) soam soltos/caseiros
("MANO TU PASSOU EM TUDO"). Antes de escrever qualquer texto novo pra um
personagem (sinalização de um lugar, nova fala), perguntar ao LU2CA qual
tom é o canônico — não decidir sozinho nem tentar fundir os dois.

## Workflow: Blender antes de código

Pra ideia espacial nova (onde um personagem "mora", formato de uma
região, massa de um prédio), simula primeiro no Blender MCP
(`mcp__blender__execute_blender_code`) — geometria simples (cilindro,
caixa, cone), cor emissiva batendo com a regra de cor acima, screenshot
pra validar com o LU2CA — **antes** de escrever componente React/Three.js
de verdade. Mais barato iterar em 3 primitivas no Blender do que em
código R3F com collider, InstancedMesh etc.

Arquivo de cena vive em `blender/cenas/` (fora do git, local — já
configurado no `.gitignore`; ver commit "organiza pipeline de arquivos do
Blender"). GLBs curados que vão pro jogo de verdade passam por
`blender/exports/` antes de promover pra `public/models/`.
