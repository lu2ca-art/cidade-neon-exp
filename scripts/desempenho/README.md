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

Variáveis: `DPR` (densidade do aparelho; o Mac retina é 2), `DUR` (ms medidos),
`NOPROF=1` (sem o profiler, que pesa), `Q` (mais parâmetros na URL:
`&dpr=1.25` fixa a densidade, `&lente=0|1|2` fixa a lente), `BASE` (outra URL).

Referência (19/10, M1, retina, mapa-disco): média 12–13 ms, p50 ~9 ms,
p95 ~31 ms, densidade assenta em 0,75; mapa velho 5 ms, densidade 1,25–1,375.
