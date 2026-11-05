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
