# Ruas do tamanho da faixa

Bíblia (seções 1, 3 e 7): a cidade é um disco, cada rua é uma faixa do vol. 1, e
**uma volta na rua, na velocidade normal (sem turbo), dura pelo menos a faixa inteira.**
O dono (05/11): "aumentar o tamanho do mapa, deixar maior, pra pessoa ter mais tempo
na experiência e escutar as músicas de fato."

## Como se mede

- **Uma volta** = sair da rotatória central pela alça da linha → a ida inteira →
  a alça de chegada na torre da ponta → o anel da ponta (da chegada até a saída da
  mesma linha, mão única) → a alça de saída → a volta inteira → a alça de entrada na
  central. É o tempo em que a faixa toca (na central a música some; na torre da ponta
  ela continua).
- **Velocidade normal** = a da pista, 2 × BPM em km/h (`pistas.ts`, `velocidade`;
  `Corrida.tsx` usa ela como `vmax` fora do anel), sem turbo (o turbo passa 25%).
  No anel da torre, `V_TORRE` = 26 m/s.
- **A faixa** = o arquivo que toca hoje em `public/audio/pistas/` (ffprobe). Os
  `public/audio/tracks/*.mp3` são as prévias de ~22 s, não servem pra isso. Swav e
  Rollercoaster só têm o instrumental até o lançamento; Ojalá toca o instrumental de
  2:55 (a versão com voz será a de 2:48, `PISTAS.duracao`). O alvo é o mais longo dos dois.
- O script: `bun scripts/medir-ruas.ts` (monta o mundo sem tela e imprime a tabela).

## Antes (05/11, `feature/game/mapa-disco` edb9d5b)

| pista | torre da ponta | ida (m) | volta inteira (m) | km/h | volta (s) | faixa (s) | volta / faixa |
|---|---|---|---|---|---|---|---|
| Sabe Ontem? | 3 | 3598 | 7838 | 200 | 146 | 159 | 0,92 |
| Copo Americano | 3 | 2536 | 5674 | 160 | 131 | 174 | 0,75 |
| Swav | 2 | 3050 | 6756 | 270 | 96 | 189 (inst) | 0,51 |
| Sexta-Feira | 1 | 3038 | 6724 | 176 | 141 | 202 | 0,70 |
| Rollercoaster | 2 | 1600 | 3872 | 208 | 72 | 295 (inst) | 0,24 |
| DopaminA | 2 | 2858 | 6342 | 250 | 97 | 151 | 0,64 |
| CHUVA | 3 | 2722 | 6006 | 158 | 140 | 190 | 0,74 |
| Ojalá | 1 | 2692 | 6004 | 236 | 97 | 175 (inst) | 0,57 |
| Nectar | 1 | 1418 | 3452 | 158 | 82 | 155 | 0,53 |

O mundo das pistas cabia em x −892…906, z −955…950 (≈ 1,9 km de lado). Torres: a
central em (0, 0), anel de 174 m; as das pontas em (−679, −417), (864, −639) e (49, 300).

Nenhuma rua durava a faixa: a mais perto (Sabe Ontem?) dava 92%; a Rollercoaster, 24%.
O desenho foi feito na regra antiga ("uma volta = meia música", `pistas.ts`).

## Como cresce (item 2)

O desenho do dono (`polvo-desenho.json`) continua sendo a fonte. Em `mundoDisco.ts`
(`crescer`), antes de cortar as linhas nas torres:

1. **Cada grupo se afasta do centro** (`ESCALA_GRUPO`, na ordem de `GRUPOS`): as 3
   linhas de uma torre da ponta crescem juntas, numa escala só, a partir da cabeça do
   desenho. A torre da ponta vai junto (ela é a média das 3 pontas). A escala do grupo
   é a que faz a **primeira** linha dele chegar na faixa.
2. **Cada linha estica de lado** (`ALONGA`): o desenho dela estica atravessado na reta
   entre as duas pontas (só o desvio de lado cresce: um esticão, as curvas abrem mais).
   Nos primeiros 280 m (central) e 158 m (ponta) de cada lado nada mexe, e o esticão
   entra numa rampa de 260 m: os portões, as alças e as rotatórias ficam como eram.
3. Os anéis, as alças, as torres (tamanho), a altura (sobe e desce sem encostar) e a
   relaxação das alturas são os mesmos de antes: rodam em cima do desenho maior.

Os números saem de `bun scripts/medir-ruas.ts --ajustar --fixa=0` (busca binária, ~5 s):
a meta é a volta = 1,03 × a faixa (o "pelo menos" da bíblia, com folga pra frear nas
curvas). `--fixa=0` deixa a **torre 1 no lugar**: embaixo e em volta dela moram o
subúrbio, a casa da D-Bee, a queda e o deserto da chegada (coordenadas fixas em
`disco/historia.ts`, `chao.ts`, túneis). As 3 linhas dela crescem só esticando.

```
ESCALA_GRUPO = [1, 1.584, 1.129]   // torre 1 (Nectar, Sexta, Ojalá), 2 (Roller, Swav, Dopamina), 3 (Copo, Chuva, Ontem)
ALONGA = { Nectar: 2.446, Sexta-Feira: 1.824, Ojalá: 2.577, Rollercoaster: 3.787, Swav: 1.473, Copo Americano: 1.425, CHUVA: 1.48 }
```

Mudou a duração de uma faixa (a voz da Swav/Rollercoaster/Ojalá saiu com outro
tamanho) ou o desenho: roda o `--ajustar --fixa=0`, cola os números em `mundoDisco.ts`
e a linha `SETORES` em `raioCidade.ts`.

## Depois

| pista | torre da ponta | ida (m) | volta inteira (m) | km/h | volta (s) | faixa (s) | volta / faixa |
|---|---|---|---|---|---|---|---|
| Sabe Ontem? | 3 | 3598 → 4094 | 7838 → 8882 | 200 | 146 → 164 | 159 | 0,92 → 1,03 |
| Copo Americano | 3 | 2536 → 3580 | 5674 → 7820 | 160 | 131 → 179 | 174 | 0,75 → 1,03 |
| Swav | 2 | 3050 → 6570 | 6756 → 13894 | 270 | 96 → 194 | 189 (inst) | 0,51 → 1,03 |
| Sexta-Feira | 1 | 3038 → 4720 | 6724 → 10088 | 176 | 141 → 210 | 202 | 0,70 → 1,04 |
| Rollercoaster | 2 | 1600 → 8206 | 3872 → 17150 | 208 | 72 → 304 | 295 (inst) | 0,24 → 1,03 |
| DopaminA | 2 | 2858 → 4752 | 6342 → 10210 | 250 | 97 → 156 | 151 | 0,64 → 1,03 |
| CHUVA | 3 | 2722 → 3920 | 6006 → 8432 | 158 | 140 → 196 | 190 | 0,74 → 1,03 |
| Ojalá | 1 | 2692 → 5444 | 6004 → 11504 | 236 | 97 → 180 | 175 (inst) | 0,55 → 1,03 |
| Nectar | 1 | 1418 → 3120 | 3452 → 6856 | 158 | 82 → 160 | 155 | 0,53 → 1,03 |

- O mundo das pistas: x −892…906, z −955…950 → **x −1304…1877, z −1906…1555**
  (≈ 1,9 km → ≈ 3,4 km de lado). Pro lado da casa da D-Bee (sudoeste) ficou igual.
- Torres: central (0, 0) igual; torre 1 (−679, −417) igual; torre 2 (864, −639) →
  (1369, −1013); torre 3 (49, 300) → (56, 339).
- Nenhum trecho de pista encosta em outro (a relaxação das alturas fechou sem conflito).
- Montar o mundo: ~105 ms (era ~115 ms). Amostras das vias: 26 mil → 47 mil.
- Asfalto (uma mão): 29 km → 50 km. Gotas: 1034 → 1978 (só as de até 450 m da
  câmera vão pra malha, igual antes). Postes: ~1550 → ~2600.

## O que dependia do tamanho (item 3)

- **Lugares, missões, bombas, páginas, parque, monumentos, canteiros**: todos em
  fração da pista (`POS`, `espalharNaPista`, `L * 0.55`): acompanham sozinhos.
- **O chão do subúrbio e a chegada** (`historia.ts`: CASA, QUEDA, SAIDA_CASA,
  SUBURBIO, CHAO_LUGARES; `chao.ts`; túneis): ficam onde estavam, porque a torre 1
  não andou. A pista mais perto de cada um continua a mesma distância (a casa a ~1,7 km).
  Dois achados do lixão ficaram com pista em cima: o rádio (a 9 m, pista a 15 m de
  altura) e a máquina de lavar (15 m, pista a 35 m).
- **A borda da cidade agora é por rumo** (`raioCidade.ts`, `alemDaCidade`): a
  distância ao centro menos o quanto a cidade cresceu naquele rumo. Onde não cresceu,
  é o número de antes. Usam: as dunas inteiras (900–1500 m), os 17 morros (o anel
  2–3,6 km vai pra depois da borda nova, até 3,7 km), "deserto" sem chuva (1300) e
  com a luz/névoa do deserto (1250), as falas da D-Bee ("cidade" 1350, "perto" 1050),
  os robôs (nascem e voltam a 1300 da borda), os robôs caídos (1380, e o anel deles),
  e o `<Perto fora>` dos robôs (os centros da borda nova: voando na cidade grande
  eles não montam).
- **O modelo do subúrbio** (Suburbio.tsx) era posto no centro da 1ª pista: no disco
  ficou preso onde sempre esteve (−65,3, −404,6).
- **Rachas e trânsito**: nasciam sorteando uma via inteira; com as vias longas quase
  nunca caía perto. Agora as primeiras tentativas são na via da Kombi, à frente/atrás.
- **Drone**: a rota desenhada ia até 16 km (4096 × 4 m); agora 32 km.
- **Mapa grande, minimapa, drone (enquadramento)**: já vêm do tamanho das vias; nada a mudar.
- **Câmera/névoa**: far 3200, névoa 950 (cidade) / 3000 (deserto), céu 2800 que
  acompanha a câmera: não dependem do tamanho do mundo. O chão tem 9 km (±4,5 km) e a
  parede em 3,9 km: a cidade vai até ~2 km, sobra.
- **Perseguição**: tudo relativo ao u da Kombi; nada a mudar.

## Desempenho (item 4)

- **Prédios**: o número cresce com o comprimento das ruas (~1,7×). No disco eles
  agora vão em quadras de 900 m (uma malha por quadra e cara): o que está atrás da
  câmera fica de fora (frustum), e o que está depois da névoa + 400 m nem desenha
  (`visible`, no useFrame da névoa). Na cidade, ao mesmo tempo, fica o mesmo tanto ou
  menos que antes. A folga entre prédios (n²) virou grade de 50 m (a montagem não pesa).
- **Gotas**: já eram cortadas por distância (450/300/190 m); o laço por quadro passou
  de ~1000 pra ~2000 contas de distância (barato).
- **Ainda inteiras (uma malha pro mundo todo)**: as fitas da pista (asfalto, faixas,
  bordas, saias), os postes (+ luz + reflexo), os pilares. Crescem ~1,7× em vértices
  e instâncias. São geometria leve, mas é o primeiro lugar a olhar se a Mesa medir
  queda. Partir por quadras do mesmo jeito dos prédios é o próximo passo (os postes
  têm `posteVia`/`apagarPostes` presos ao índice da instância: dá mais trabalho).
  **Feito (05/11):** docs/leveza-cidade-grande.md (quadras de 300 m, uma draw call
  por material).
