# BACKLOG
(o diretor mantém; a ordem combinada com o dono em 21/10 — fonte: ~/repos/LU2CA/projetos/cidade-neon/mapa-disco-decisoes.md, "21/10 (2)" e "21/10 (3)")

## Em andamento
- (triagem da mensagem nova do dono: o mapa que acende, o show no Guitar Driver, a missão do beat)

## Fila (ordenada por prioridade)
3b. **As linhas do drift** · arte-3d · mais contínuas e orgânicas; no patins, a linha são os dois pés (não as quatro rodas).
3c. **A câmera** · performance · ele gosta da de hoje: só otimizar se der pra aproveitar algo da Horizon (a mudança antiga staged no checkout principal que apaga a Horizon: ver antes de decidir).
3d. **O dashboard vivo da empresa** · diretor · o status de cada área num painel; o dono quer ver isso antes de ligar o disparador.
4. **As laterais da espiral e os monumentos** · arte-3d · direita = a próxima entrada, esquerda = a seguinte, em degradê; monumento em cima da missão atual, cutscene nas 3 primeiras.
5. **O holo** · ui · o N3XO abaixo dos ícones; a checklist da missão vira um ponto de luz que vai pro número do mapa.
6. **Sons e acabamento** · áudio + arte-3d · rodinhas de gel no patins (no ar, o vento neon); gotas sem o spray de luz; a fala nova da D-Bee.
7. **A Kombi por dentro** · arte-3d · toca-discos, MPC, rádio, painel antigo, objetos atrás, chão de grama, teto de madeira.

## Aguardando o dono (decisões de gosto/negócio)
- **Um dia inteiro só pras falas e o roteiro** (decidido 21/10): marcar o dia. Entram aí os pedidos da feira (RASCUNHO em app/linha/disco/missoes.ts, PEDIDO) e as falas RASCUNHO do plano-noite-20-10.md.
- O disparador automático da empresa (plano-max): fica desligado até o dashboard existir e ele decidir a permissão.
- As outras perguntas do plano-noite-20-10.md (o bar na pista da Nectar, a música do show do prólogo, vol.2/CIDADE NEON no untitled, "mais flores, mais água", as 4 peças).

## Feito (com prova)
- **3e. A marcação do mapa** · print com GPU real (o mapa grande com um ponto marcado): a rota brilha na cor de cada pista por onde passa (laranja nas torres, azul na linha), sem o rosa; o alfinete na cor da pista marcada.
- **3. A física** · RELATORIOS/2026-10-21-gameplay.md: gravidade 24 → 9,8 m/s²; o propulsor sai do chão a 0,4 m/s (antes 3,4, o tranco) e acelera; o muro devolve a Kombi (41 → 43 m/s, antes 41 → 28).
- **2b. A música é o tema da missão** · RELATORIOS/2026-10-21-audio.md (2ª parte): sem missão, nada (só os discos); pegou, o instrumental; na linha, a voz UMA vez; acabou ou demorou, o instrumental; a missão acabou, nada. Testado com GPU real.
- **2. Uma missão = uma música** (e2d813e) · RELATORIOS/2026-10-21-audio.md: na torre, antes nectar (a última) → depois sexta-inst abafada; fim do show → destaque com 4 plataformas + untitled por 14 s; a torre passa pra dopamina-inst; desempenho igual (draw calls 1394 → 1399, triângulos 1,27 M → 1,27 M). (A regra da música foi refinada pelo dono: ver 2b.)
- **1. Missões como feira** (badb52e) · Playwright com save na carreira: a feira mostra Sexta e DopaminA; pegar → checklist; 6 s parado → o piloto liga e a Kombi acelera; largar → volta pra feira.
- **As prévias do vol.1 com 22 s** (2ddb77f) · ffprobe: as 9 com 22,000 s (Nectar, Sexta e Copo eram 21,5–21,8 s). O dono: ficam assim por enquanto.
- **A empresa-ia instalada** (c86f00f) · agentes, /triagem, BACKLOG, RELATORIOS, as regras no CLAUDE.md.
