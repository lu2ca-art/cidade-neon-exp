# Testes da Linha 222 no navegador

Scripts de ponta a ponta usados em 30/09/2026 (Playwright + Chrome de teste).
Rodam contra o dev server (`bun run dev -- -p 3222`) e usam os atalhos de dev
da estrada (`__via`, `__irPara`, `__marcos`, `__estacoes`, `__pular`, `__estado`).

| script | o que testa |
|---|---|
| fluxo.mjs | abertura + quiz → 1ª missão → busca no mapa → entrega → prova → recompensa |
| garfo.mjs | bifurcação: um toque marca a saída; marcar e desmarcar fica |
| carro.mjs | a Kombi como tela inicial, ícone do celular, passar por estação |
| sobre.mjs | celular por cima da estrada (pausa e continua) + impacto da sintonia |
| radio.mjs | programação da 222 FM sem repetição + estreias |
| direcao.mjs | acelerar, drift + mini-turbo, ré, ré saindo de uma saída |
| nucleo.mjs | invasão fraca (repelida) e forte (cai → cinza → antena) |
| grupo.mjs | save antigo migrando + grupo recebendo quem você ajudou |

Precisa de `playwright-core` e do Chrome de teste do Playwright
(`~/Library/Caches/ms-playwright/chromium-*`). Prints vão pra `$SHOTS` (padrão `./shots`).
Rodar: `bun scripts/linha-testes/fluxo.mjs`
