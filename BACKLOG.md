# BACKLOG
(o diretor mantém; a ordem combinada com o dono em 21/10 — fonte: ~/repos/LU2CA/projetos/cidade-neon/mapa-disco-decisoes.md, "21/10 (2)")

## Em andamento
- (nada: o próximo é o 3, quando o dono liberar)

## Fila (ordenada por prioridade)
3. **A física** · gameplay + performance · gravidade 9,8 m/s², o propulsor saindo do chão acelerando, o bounce de pinball (nunca trava em nada).
4. **As laterais da espiral e os monumentos** · arte-3d · direita = a próxima entrada, esquerda = a seguinte, em degradê; monumento em cima da missão atual, cutscene nas 3 primeiras.
5. **O holo** · ui · o N3XO abaixo dos ícones; a checklist da missão vira um ponto de luz que vai pro número do mapa.
6. **Sons e acabamento** · áudio + arte-3d · rodinhas de gel no patins (no ar, o vento neon); gotas sem o spray de luz; a fala nova da D-Bee.
7. **A Kombi por dentro** · arte-3d · toca-discos, MPC, rádio, painel antigo, objetos atrás, chão de grama, teto de madeira.

## Aguardando o dono (decisões de gosto/negócio)
- "Uma missão dura uma música": a missão tem TEMPO (acaba quando a música acaba) ou a música só é a trilha dela (toca até você terminar)? — a equipe seguiu com "a trilha dela", sem cronômetro.
- Os pedidos da feira (o que cada personagem diz que a cidade precisa) são RASCUNHO: app/linha/disco/missoes.ts, PEDIDO.
- Os recortes de 22 s da Nectar, Sexta e Copo vêm da mixagem do jogo (public/audio/pistas): se quiser o corte dele, reexportar com 22 s.
- A mudança antiga staged no checkout principal (apaga a câmera Horizon do Corrida.tsx): manter ou descartar?
- As perguntas do plano-noite-20-10.md (falas RASCUNHO, o bar na pista da Nectar, a música do show do prólogo, vol.2/CIDADE NEON no untitled, "mais flores, mais água", as 4 peças).

## Feito (com prova)
- **2. Uma missão = uma música** (e2d813e) · RELATORIOS/2026-10-21-audio.md: na torre, antes nectar (a última) → depois sexta-inst abafada; fim do show → destaque com 4 plataformas + untitled por 14 s; a torre passa pra dopamina-inst; desempenho igual (draw calls 1394 → 1399, triângulos 1,27 M → 1,27 M).
- **1. Missões como feira** (badb52e) · Playwright com save na carreira: a feira mostra Sexta e DopaminA; pegar → checklist; 6 s parado → o piloto liga e a Kombi acelera; largar → volta pra feira.
- **As prévias do vol.1 com 22 s** (2ddb77f) · ffprobe: as 9 com 22,000 s (Nectar, Sexta e Copo eram 21,5–21,8 s).
- **A empresa-ia instalada** (c86f00f) · agentes, /triagem, BACKLOG, RELATORIOS, as regras no CLAUDE.md.
