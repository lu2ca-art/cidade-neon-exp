# Medição de desempenho

Scripts pra medir o jogo no Chrome com a GPU de verdade (headless, Metal no Mac).
Rodam contra um build de produção (`bun run build && PORT=3110 bun run start`);
a URL leva `?medir`, que expõe `__cena`, `__gl` e `__cam` também em produção.

| script | o que mede | uso |
|---|---|---|
| `medir.mjs` | tempo de quadro (média, p50, p95), draw calls, triângulos, shaders compilados no meio da corrida, densidade escolhida | `NOPROF=1 DPR=2 DUR=30000 node scripts/desempenho/medir.mjs disco .` |
| `liso.mjs` | lisura: o tranco da câmera de um quadro pro outro, com engasgos de 0–15 ms injetados | `node scripts/desempenho/liso.mjs 3110 disco` |
| `loaf-up.mjs` | os quadros longos (Long Animation Frames): script x desenho, e os uploads de textura/buffer em cada um | `node scripts/desempenho/loaf-up.mjs disco` |
| `picos.mjs` | o perfil de CPU só de dentro dos picos | `node scripts/desempenho/picos.mjs disco` |

**O save.** Por padrão os scripts semeiam o save "livre" (`cn-linha-222` com
`disco.fase="livre"`, o de quem já jogava; `save.mjs`), pulam as cenas, clicam
"dar partida" e seguram ArrowUp: a Kombi dirige na cidade. Com save novo o jogo
abre na história do começo (a casinha parada, ~65 draws, 4–6 ms, `velMedia` 0) e
os números não servem pra comparar. `SAVE=novo` mede o começo de propósito.

Variáveis: `SAVE` (`livre` por padrão; `novo` = save vazio), `DPR` (densidade do aparelho; o Mac retina é 2), `DUR` (ms medidos),
`NOPROF=1` (sem o profiler, que pesa), `Q` (mais parâmetros na URL:
`&dpr=1.25` fixa a densidade, `&lente=0|1|2` fixa a lente), `BASE` (outra URL).

Referência (21/10, M1, retina, mapa-disco, build de produção, save "livre",
3 rodadas de `NOPROF=1 DPR=2 DUR=30000 medir.mjs disco`): média 15,3 ms,
p50 12,5 ms, p95 30,9 ms, ~450 draws, ~725 mil triângulos, densidade sem
assentar (0,875–1,125); `liso.mjs` velMedia 55,6. Relatório:
`operacional/empresa/relatorios/2026-10-21-perf-001.md` (no repo LU2CA).

Referência antiga (19/10): média 12–13 ms, p50 ~9 ms, p95 ~31 ms, densidade
assenta em 0,75; mapa velho 5 ms, densidade 1,25–1,375.
