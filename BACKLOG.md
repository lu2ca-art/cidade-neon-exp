# BACKLOG
(o diretor mantém; fonte das decisões: ~/repos/LU2CA/projetos/cidade-neon/mapa-disco-decisoes.md, "21/10 (2)", "21/10 (3)" e "21/10 (4)")

## Em andamento
- (nada: esperando o dono responder as 3 perguntas de "Aguardando o dono" pra começar o A1)

## Fila (ordenada por impacto no jogador × esforço)
A1. **O mapa que acende e ensina** · ui + level · a pista disponível acende (e pulsa), a feita fica colorida pra sempre, a trancada fica apagada; cada missão feita libera duas, de preferência em outras torres; tocar numa oferta da feira marca o caminho no mapa (com o foco de 50%). O mapa vai ficando colorido e a pessoa sabe por onde seguir. **Depende da pergunta 1.**
A2. **O show é o Guitar Driver** · gameplay · sai a engine nova do Show.tsx; o fim da missão abre o Guitar Driver (app/drive) com o lugar da missão como palco; cada missão feita libera a música dela no Guitar Driver (desfaz o B13, "trancado até o fim"). **Pergunta 2.**
A3. **As linhas do drift** · arte-3d · mais contínuas e orgânicas; no patins, a linha são os dois pés (não as quatro rodas).
A4. **Estudo: como o Guitar Hero fazia as notas** · gameplay + áudio · (só pesquisa, um documento) a autoria dos charts, as nuances (acordes, notas longas, HOPO, frases), a sincronia com o BPM, a redução por dificuldade, como não deixar vazio. Base pro A5.
A5. **O Guitar Driver 2: as notas e a banda** · gameplay + áudio · refazer a captação das notas (hoje: public/gd/*.json, guitarra e baixo tirados das stems na grade do BPM); a banda com 4 instrumentos (piano, baixo, bateria, guitarra), a pessoa escolhe; uma diferença pequena na interface de cada um, mesmo funcionamento; nunca um vazio.
A6. **A missão do beat com o Alohan** · narrativa + gameplay · ele ensina, você faz o beat no B4TIDA, baixa o áudio, e ele te chama pra um show no Guitar Driver. **Pergunta 3.**
3d. **O dashboard vivo da empresa** · diretor · o status de cada área num painel; o dono quer ver antes de ligar o disparador.
3c. **A câmera** · performance · ele gosta da de hoje: só otimizar se der pra aproveitar algo da Horizon (ver a mudança antiga staged no checkout principal antes).
4. **As laterais da espiral e os monumentos** · arte-3d · direita = a próxima entrada, esquerda = a seguinte, em degradê; monumento em cima da missão atual, cutscene nas 3 primeiras.
5. **O holo** · ui · o N3XO abaixo dos ícones; a checklist da missão vira um ponto de luz que vai pro número do mapa.
6. **Sons e acabamento** · áudio + arte-3d · rodinhas de gel no patins (no ar, o vento neon); gotas sem o spray de luz; a fala nova da D-Bee.
7. **A Kombi por dentro** · arte-3d · toca-discos, MPC, rádio, painel antigo, objetos atrás, chão de grama, teto de madeira.

## Aguardando o dono (decisões de gosto/negócio)
1. **Os 3 atos ou "cada missão libera duas de outras torres"?** Hoje: a Nectar libera Sexta (mesma torre) e DopaminA (outra); feitas as duas, abre a Ojalá; e assim por diante (os 3 atos de 20/10). A proposta da equipe, mantendo a Nectar no começo: cada missão feita acende duas de torres diferentes da dela — Nectar → DopaminA + Copo Americano; DopaminA → Sexta-Feira + CHUVA; Copo Americano → Swav + Ojalá; e as três últimas (Rollercoaster, Sabe Ontem? e a que sobrar) acendem conforme fecham as anteriores. O mapa fica colorido mais rápido e espalhado. (Torres: 1 = Nectar, Sexta, Ojalá · 2 = Rollercoaster, Swav, DopaminA · 3 = Copo Americano, CHUVA, Sabe Ontem?)
2. **O "cantar" sai?** O show vira o Guitar Driver; o modo cantar (seguir a melodia) pode virar mais um instrumento da banda (a voz) no Guitar Driver 2, ou sair.
3. **A missão do beat é a do Alohan na linha dele (Sabe Ontem?, hoje no ato 3) ou ela vem logo depois da Nectar** (o Alohan aparece cedo como o professor)?
- **Um dia inteiro só pras falas e o roteiro** (decidido 21/10): marcar o dia. Entram aí os pedidos da feira (RASCUNHO em app/linha/disco/missoes.ts, PEDIDO) e as falas RASCUNHO do plano-noite-20-10.md.
- O disparador automático da empresa (plano-max): fica desligado até o dashboard existir e ele decidir a permissão.
- As outras perguntas do plano-noite-20-10.md (o bar na pista da Nectar, a música do show do prólogo, vol.2/CIDADE NEON no untitled, "mais flores, mais água", as 4 peças).

## Feito (com prova)
- **O foco no mapa** (4bd2c88) · com uma pista marcada, o resto apaga 50% (print com GPU real).
- **3e. A marcação do mapa** (bb545f6) · print com GPU real: a rota brilha na cor de cada pista por onde passa, sem o rosa; o alfinete na cor da pista marcada.
- **3. A física** (a51410b) · RELATORIOS/2026-10-21-gameplay.md: gravidade 24 → 9,8 m/s²; o propulsor sai do chão a 0,4 m/s (antes 3,4, o tranco) e acelera; o muro devolve a Kombi (41 → 43 m/s, antes 41 → 28).
- **2b. A música é o tema da missão** (798a1c7) · RELATORIOS/2026-10-21-audio.md (2ª parte): sem missão, nada (só os discos); pegou, o instrumental; na linha, a voz UMA vez; acabou ou demorou, o instrumental; a missão acabou, nada. Testado com GPU real.
- **2. Uma missão = uma música** (e2d813e) · RELATORIOS/2026-10-21-audio.md: o destaque ouvir/comprar por 14 s no fim; desempenho igual (draw calls 1394 → 1399). (A regra da música foi refinada: ver 2b.)
- **1. Missões como feira** (badb52e) · Playwright com save na carreira: a feira mostra Sexta e DopaminA; pegar → checklist; 6 s parado → o piloto liga e a Kombi acelera; largar → volta pra feira.
- **As prévias do vol.1 com 22 s** (2ddb77f) · ffprobe: as 9 com 22,000 s. O dono: ficam assim por enquanto.
- **A empresa-ia instalada** (c86f00f) · agentes, /triagem, BACKLOG, RELATORIOS, as regras no CLAUDE.md.
