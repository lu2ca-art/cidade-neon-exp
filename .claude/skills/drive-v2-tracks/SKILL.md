---
name: drive-v2-tracks
description: >
  Procedural race-track generation for /drive-v2 (CyberpunkCity.tsx) — corner
  smoothing, crossing bridges, banking, collider alignment. Load before
  touching track geometry, ramps, or car physics in this file.
description_pt-BR: >
  Geração procedural das pistas de corrida do /drive-v2 (CyberpunkCity.tsx) —
  suavização de curva, pontes em cruzamentos, banking, alinhamento de
  collider. Carregar antes de mexer em geometria de pista, rampas, ou física
  do carro nesse arquivo.
categories: [game-design, physics, three.js, react-three-fiber, rapier]
---

# Pipeline de pistas do /drive-v2

## Onde fica

`components/DriveCockpit/CyberpunkCity.tsx` — 3 circuitos (magenta=Mônaco,
cyan=Suzuka, yellow=Interlagos) inspirados em F1 de verdade, cada um num
andar (Y=6/22/38), espalhados em cantos diferentes da cidade
(`MONACO_OFFSET`/`SUZUKA_OFFSET`/`INTERLAGOS_OFFSET`), conectados por
rampas (`makeRampBetweenNearest`).

## Pipeline (a ordem importa, ver Armadilha 3 pra saber por quê)

1. `makeMonaco`/`makeSuzuka`/`makeInterlagos` — pontos normalizados
   [-1,1] com nome da curva real (Loews Hairpin, Spoon etc) como
   comentário. **Nunca edita esses pontos pra "consertar" um problema de
   renderização** — eles são só a forma bruta; o pipeline abaixo é que
   garante que ficam dirigíveis.
2. `translateXZ` — aplica o offset de posição na cidade.
3. `smoothAndBridgeTrack` → `removeDegenerateReversals` (mata reversão
   quase-180° que sobra do fechamento do loop) → `chaikinOpenCorners`
   (abre curva mais fechada que `MAX_TRACK_TURN_DEG` por corte de canto —
   nunca relaxamento por média, ver Armadilha 1) → `enforceMinSpacing`
   (mata pontos quase-colados, ver Armadilha 2).
4. Só dentro do componente `Circuit` que `CatmullRomCurve3` interpola os
   pontos de controle pra curva final discretizada (`disc`,
   `SEGMENT_DIVISIONS=120` amostras).
5. `applyCrossingBumps` roda EM CIMA de `disc` já pronta, nunca nos
   pontos de controle — ver Armadilha 3, a mais cara de errar.
6. `bankAngleAt` calcula inclinação lateral por curvatura local,
   incorporada no mesmo quaternion (ordem `"YXZ"`) que o pitch.
7. Collider físico usa `quaternion`, nunca `rotation` — ver Armadilha 4.

## Armadilhas (cada uma já causou um bug real, não é teórico)

**1. Relaxamento por média cria "laçinho" (overshoot).** Se dois cantos
apertados estão perto um do outro (ex: uma chicane), puxar cada ponto na
direção da média dos vizinhos pode ultrapassar a linha e criar um
mini-loop de autocruzamento. Corte de canto (Chaikin: novo ponto =
interpolação ENTRE o original e o vizinho, nunca extrapola) não tem esse
problema por construção geométrica.

**2. Pontos de controle quase-colados "beliscam" a curva.** Se dois
pontos consecutivos ficam muito próximos (pode acontecer depois de
qualquer transformação que adiciona/move pontos), o `CatmullRomCurve3`
interpola mal bem ali. Sinal visual: pedaço da mureta parece sumir; sinal
físico: collider fica fino/degenerado e o carro engancha. Sempre roda
`enforceMinSpacing` depois de qualquer etapa que mexe nos pontos de
controle.

**3. Bump de altura NUNCA nos pontos de controle — sempre na curva já
discretizada.** Inserir pontos de controle extras pra criar uma "ponte"
(ex: subir Y num cruzamento) muda a densidade local de pontos, o que
bagunça a estimativa de tangente do CatmullRom nos vizinhos. Mesmo com um
perfil de altura suave (cosseno), a curva final pode se autocruzar em X/Z
bem ali — era o "X" quebrado que aparecia perto de algumas curvas.
Em vez disso: interpola a curva primeiro (`curve.getPoints(...)`), DEPOIS
sobe a altura Y de uma janela de amostras já existentes ao redor do
cruzamento (`applyCrossingBumps`). Mexer só em Y numa curva já pronta é
geometricamente incapaz de criar autocruzamento novo em X/Z.

**4. Collider precisa de `quaternion`, nunca `rotation`.** O array
`[pitch, angle, roll]` é composto em ordem `"YXZ"` (igual o mesh visual),
mas o prop `rotation` do r3f/rapier assume ordem XYZ por padrão — passar
o array direto desalinha collider e visual sempre que pitch OU roll não
são zero (rampas e curvas bancadas). Sempre constrói o quaternion
explícito com `new THREE.Euler(x, y, z, "YXZ")` e passa via
`quaternion={[q.x, q.y, q.z, q.w]}`.

## Como validar uma mudança

Ver a skill `test-by-driving` (no arsenal) pra dirigir de verdade em
navegador headless.

Pra validar só a geometria, sem navegador: extrai as funções puras (sem
JSX/React, sem imports de `@react-three/rapier`) pra um `.ts` **dentro do
próprio repo** (bun resolve `three` relativo ao arquivo, por isso não dá
pra rodar de um scratchpad fora do projeto) e roda com `bun run
arquivo.ts`. Testa `findSelfCrossings` na curva DISCRETIZADA
(`curve.getPoints(120)`), não só nos pontos de controle — pontos de
controle limpos não garantem curva final limpa (foi exatamente esse gap
que escondeu a Armadilha 3 por uma rodada inteira de "correção" que não
resolveu nada).
