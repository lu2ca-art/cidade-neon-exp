# Áudio + gameplay · 21/10 · item 2: uma missão = uma música

**Pedido do dono (21/10 (2)):** "uma missão dura uma música e já muda pra próxima. Sempre que acaba, um destaque do widget de ouvir a música nas plataformas ou comprar o disco no holo; logo some, e começa outra música: a próxima começa instrumental abafada, até o player ir pra pista daquela música liberada, e aí ela começa a tocar."

**Commit:** e2d813e (feature/game/mapa-disco)

## O que mudou
- **O fim da missão:** o show de uma linha acaba → depois do jornal, o destaque "a missão acabou · a música fica": as plataformas da faixa (Spotify, Apple, YouTube, Deezer; a que ainda não saiu mostra a data e o pré-save) e "comprar o disco" (untitled). Some sozinho em 14 s, ou no ×. Enquanto ele está na tela, a feira espera.
- **A próxima música:** a da missão pegada (sem missão, a 1ª oferta da feira). Fora das pistas (torres, espirais) ela toca o instrumental abafado; quando ele pisa na pista dela (acesa), entra com voz e daí segue nas torres como qualquer faixa.

## Medido: antes × depois
Teste no navegador (Playwright, save na carreira, a Sexta pegada). Scripts no scratchpad da sessão: `musica.mjs`, `fimshow.mjs`, `fimshow-gpu.mjs`.

| situação | antes (badb52e) | depois (e2d813e) |
|---|---|---|
| na torre, antes de pisar em qualquer pista | a última que tocou (nectar.mp3) | **sexta-inst.mp3, abafada** |
| na pista da Sexta | sexta.mp3 | sexta.mp3 (com voz) |
| na torre, depois de passar pela pista | sexta.mp3 | sexta.mp3 (segue) |
| fim do show da Sexta | só o jornal | o jornal → **o destaque** (4 plataformas + untitled) |
| quanto tempo o destaque fica | — | **14 s** (GPU real: na tela dos 58 s aos 71 s do relógio da página) |
| a torre depois da missão | — | **dopamina-inst.mp3** (a próxima da feira) |
| erros no console | 0 | 0 |

## Desempenho (build de produção, M1, DPR 2, 30 s, `scripts/desempenho/medir.mjs disco`)
Medido com o dev server rodando ao lado (os números absolutos ficam acima da referência de 19/10; a comparação vale por ser nas mesmas condições).

| | antes | depois |
|---|---|---|
| quadro médio | 31,6 ms | 20,6 ms |
| p50 | 29,9 ms | 19,8 ms |
| p95 | 49,2 ms | 32,2 ms |
| draw calls | 1394 | 1399 |
| triângulos | 1,27 M | 1,27 M |
| shaders compilados | 95 | 95 |

**Leitura:** a mudança não pesa. O que ela mexe (um widget de 14 s e qual arquivo o toca-discos da pista abre) não desenha nada por quadro: draw calls, triângulos e shaders ficaram iguais. A queda do tempo de quadro é ruído do "antes" (o dev server recompilando ao lado durante a medição), não ganho desta mudança.

## Notas do teste
- No navegador sem GPU (swiftshader) a página trava por dezenas de segundos e os timers disparam atrasados: o destaque parecia sumir na hora. Com a GPU de verdade, os 14 s se confirmaram. Testes de tempo: usar sempre o perfil com Metal.
- A pista da Ojalá se chama "deserto" no mapa (o começo usa ela): `__via("disco:7:ida")` não acha. Não é bug do jogo.

## Decisão do dono (no BACKLOG, "Aguardando o dono")
- "Uma missão dura uma música": TEMPO (acaba quando a música acaba) ou TRILHA (a música acompanha até você terminar)? Feito como trilha, sem cronômetro.
