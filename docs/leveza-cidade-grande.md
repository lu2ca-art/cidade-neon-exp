# Leveza na cidade grande

Com as ruas do tamanho da faixa (docs/ruas-faixa.md) o mundo do disco passou de
≈ 1,9 km pra ≈ 3,4 km de lado. Os riscos 3 e 4 de lá: o asfalto e as faixas, os
postes (+ reflexo + luz), os pilares e as gotas eram uma malha só pro mundo
inteiro (a esfera dela pegava tudo: ia inteira pra placa todo quadro, inclusive
o que estava atrás da câmera e depois da névoa).

## O que mudou (`app/linha/estrada/pistaQuadras.ts`)

- **Quadras de 300 m, uma draw call por material.** Partir em malhas separadas,
  como os prédios, multiplicava as draw calls (14 → 55 numa vista típica; até 90).
  No iPhone o custo por objeto pesa mais que vértice, então ficou assim: os itens
  (cada quad das fitas, cada poste, cada pilar) ficam **ordenados por quadra**
  dentro de uma malha só, e o que vai pra placa é só a parte das quadras a até
  `névoa + 400 m` da câmera (a mesma folga dos prédios):
  - **pista**: as 12 fitas viraram 5 malhas (asfalto · faixas · neon = bordas +
    guard rails · linhas brancas · saias). O índice da malha é refeito com as
    quadras perto (`copiarFita`, `drawRange`).
  - **postes, reflexos, luzes, pilares**: as instâncias das quadras perto são
    copiadas pro começo do buffer e `count` = quantas (`copiarPostes`, `copiarPilares`).
  - **quando**: `EmQuadras.escolher` só olha de novo quando a câmera andou 40 m ou
    a névoa mudou (o drone sobe → a névoa vai longe → a cidade inteira entra). Os
    postes copiam na hora; a pista e os pilares, no máximo 2 malhas por quadro (o
    índice da fita é o maior pedaço de subir: a troca se espalha por uns quadros).
- **`apagarPostes`** continua pelo índice do poste: `EmQuadras` guarda o mapa
  índice → (quadra, índice local) (`quadra`, `local`, `ordem`). O poste de pista
  apagada fica **fora** (`marcarFora`): não é copiado (antes ia com matriz zerada).
- **Cor das pistas apagadas** (`tingirApagadas`) e o drone (`aVia`, `ACENDE`):
  a cor acesa e o "tinge" vão junto, quad a quad, na nova ordem. Nada muda pra eles.
- **Gotas**: já eram uma malha com só as de até 450/300/190 m. O laço por quadro
  agora olha só as células perto numa grade de 150 m (`GradeXZ`).
- **Prédios**: continuam em quadras de 900 m, uma malha por quadra e cara (o corte
  pela névoa agora é `cortarPelaNevoa`, a mesma conta). Não entram na tabela.
- Fora do disco (o mapa de sempre e o novo) é uma quadra só: tudo sempre, como antes.

## Antes e depois

`bun scripts/contar-quadras.ts` (sem navegador: monta o mundo, põe a câmera atrás
da Kombi a cada ~250 m de cada pista do disco, 254 vistas; fov 75, névoa 950 m).
Draw calls e vértices mandados pra placa, por quadro, só destas malhas:

| | malhas montadas | draw calls (média / pior) | vértices (média / pior) | postes desenhados |
|---|---|---|---|---|
| antes (uma malha pro mundo) | 16 | 14 / 14 | 384 mil / 384 mil | 2422 |
| alternativa: uma malha por quadra de 900 m (frustum + névoa), deitado | 153 | 55 / 90 | 184 mil / 321 mil | ~1170 |
| alternativa, em pé (aspecto 0,46) | 153 | 38 / 63 | 135 mil / 278 mil | — |
| **depois: uma por material, quadras de 300 m perto** | 9 | **9 / 9** | **243 mil / 334 mil** | **~1540** |

| gotas (1978) | antes | depois |
|---|---|---|
| contas de distância por quadro | 1978 | ~257 |
| na malha (raio 450 m) | ~154 | ~154 (igual) |

Por material (depois, média): asfalto 21 mil · faixas 20 mil · neon 82 mil · linhas
21 mil · saias 35 mil · postes 37 mil · reflexos 6 mil · luzes 1,5 mil · pilares 18 mil.

- O corte é pela distância (um círculo em volta da câmera), não pelo frustum: o
  que está atrás da câmera e perto ainda vai. Cortar pelo frustum mudaria o
  conjunto a cada curva (subir índice toda hora). Se a Mesa medir que vértice
  ainda pesa, o próximo passo é a folga: com `névoa + 150` os vértices caem pra
  ~193 mil (`--folga=150`), mas na borda da tela (névoa por profundidade) pode
  aparecer pedaço de pista surgindo a ~80% de névoa.
- `--q=200,300,450` compara o tamanho da quadra (200: 229 mil; 450: 262 mil). 300
  é o meio-termo entre vértice e troca de índice.

## Pra Mesa conferir

- Rodando reto numa pista longa: asfalto, faixas, guard rails, postes e pilares
  sempre lá até a névoa (nada surgindo perto, nada sumindo na frente).
- Ato que acende/apaga pista: os postes dela somem/voltam; a cor cinza da pista apagada.
- Drone (vista de cima): a cidade inteira acesa, com postes.
- Gotas aparecendo normal na frente da Kombi.
