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

Os números saem de `bun scripts/medir-ruas.ts --ajustar` (busca binária, ~5 s): a meta
é a volta = 1,03 × a faixa (o "pelo menos" da bíblia, com folga pra frear nas curvas).

```
ESCALA_GRUPO = [1.38, 1.584, 1.129]   // torre 1 (Nectar, Sexta, Ojalá), 2 (Roller, Swav, Dopamina), 3 (Copo, Chuva, Ontem)
ALONGA = { Nectar: 1.654, Ojalá: 1.697, Rollercoaster: 3.787, Swav: 1.473, Copo Americano: 1.424, CHUVA: 1.48 }
```

Mudou a duração de uma faixa (a voz da Swav/Rollercoaster/Ojalá saiu com outro
tamanho) ou o desenho: roda o `--ajustar` e cola os números.
