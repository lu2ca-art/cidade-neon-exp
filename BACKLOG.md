# BACKLOG
(o diretor mantém; fonte das decisões: ~/repos/LU2CA/projetos/cidade-neon/mapa-disco-decisoes.md, "21/10 (2)" a "21/10 (5)". O dashboard vivo lê este arquivo: `bun scripts/empresa/status.mjs` → RELATORIOS/status.json)

## Em andamento
- (nada agora: a noite fechou A1–A5; o próximo é o A5b, um jogo pra cada instrumento)

## Fila (ordenada por impacto no jogador × esforço)
A5b. **Um jogo pra cada instrumento** · gameplay · cantar = o afinador (a voz desafina fora do meio, seguindo a melodia); guitarra = o Guitar Driver; baixo = a corda virtual; teclado = a trava-mente (a desenhar); bateria (a desenhar). Depende das notas do A5.
A6. **A missão do beat com o Alohan** · narrativa + gameplay · ele ensina, você faz o beat no B4TIDA, baixa o áudio, e ele te chama pra um show no Guitar Driver. Espera a decisão de quando ela vem.
V1. **As vozes: o piloto** · narrativa + áudio · o plano está em ~/repos/LU2CA/projetos/cidade-neon/plano-vozes.md; o piloto proposto é a D-Bee nas dunas pelo rádio. Espera as decisões do plano.
3c. **A câmera** · performance · ele gosta da de hoje: só otimizar se der pra aproveitar algo da Horizon (ver a mudança antiga staged no checkout principal antes).
4. **As laterais da espiral e os monumentos** · arte-3d · direita = a próxima entrada, esquerda = a seguinte, em degradê; monumento em cima da missão atual, cutscene nas 3 primeiras.
5. **O holo** · ui · o N3XO abaixo dos ícones; a checklist da missão vira um ponto de luz que vai pro número do mapa.
6. **Sons e acabamento** · áudio + arte-3d · rodinhas de gel no patins (no ar, o vento neon); gotas sem o spray de luz; a fala nova da D-Bee.
7. **A Kombi por dentro** · arte-3d · toca-discos, MPC, rádio, painel antigo, objetos atrás, chão de grama, teto de madeira.

## Aguardando o dono (decisões de gosto/negócio)
- **A missão do beat: logo depois da Nectar ou na linha do Alohan (Sabe Ontem?)?** · narrativa
- **As vozes: as 10 decisões do plano** (quem grava a voz de verdade, o piloto, o N3XO fala?, o Núcleo fala?, idades, dizer que é IA, etc.) · narrativa
- **Um dia inteiro só pras falas e o roteiro: marcar o dia** · narrativa
- **O disparador automático da empresa: ligar?** (o dashboard já existe; falta a decisão de permissão) · diretor
- **As perguntas antigas do plano da noite de 20/10** (o bar na pista da Nectar, a música do show do prólogo, vol.2/CIDADE NEON no untitled, "mais flores, mais água", as 4 peças) · level

## Feito (com prova)
- **A5. O Guitar Driver 2: as notas** (4217d9f) · gameplay + áudio · as 9 faixas separadas no SSD; public/gd2 com voz, guitarra, baixo, teclado e bateria; bateria 84–100% e voz 100% em cima do ataque real; o maior buraco caiu de 3,3 s pra 1,7 s (RELATORIOS/2026-10-21-gameplay.md).
- **3d. O dashboard vivo da empresa** · diretor · o painel lê este BACKLOG (status.json) e mostra o que precisa do dono, cada área e todos os itens.
- **A2. O show é o Guitar Driver** (4217d9f) · gameplay · o fim da missão abre o Guitar Driver no palco do lugar, 22 s, com a plateia da popularidade (print com GPU real: a balada da Sexta, 30 pessoas, as 4 cores; o show fecha em 22 s).
- **A1. O mapa que ensina** (7ae7929) · ui · a pista disponível pulsa; tocar na oferta da feira acende a pista dela e apaga o resto 50% (print com GPU real).
- **A3. As linhas do drift** (a31248b) · arte-3d · a marca contínua no caminho de cada roda; de patins, os dois pés. A feira foi pra direita no computador (não cobre o holo).
- **A4. Estudo: como o Guitar Hero fazia as notas** (c519648) · gameplay · docs/guitar-driver-estudo.md, com o método do Guitar Driver 2 e as fontes.
- **V0. O plano das vozes** · narrativa · as 14 fichas de voz, os três canais (áudio, ligação, rádio), a direção de arte e cinema, o pipeline no VoiceStudio (o modelo padrão dele é não comercial: trocar).
- **As torres, os lançamentos, os 22 s** (cfd8f57) · level · 102 ordens de jogo simuladas, nunca duas abertas na mesma torre; o FR3Q_ libera pelas lojas; o show em 22 s.
- **O foco no mapa** (4bd2c88) · ui · com uma pista marcada, o resto apaga 50%.
- **3e. A marcação do mapa** (bb545f6) · ui · a rota brilha na cor de cada pista, sem o rosa.
- **3. A física** (a51410b) · gameplay · gravidade 24 → 9,8 m/s²; o propulsor sai a 0,4 m/s (antes 3,4); o muro devolve a Kombi (41 → 43 m/s, antes 41 → 28).
- **2b. A música é o tema da missão** (798a1c7) · áudio · sem missão, só os discos; na linha, a voz uma vez; depois, o instrumental.
- **2. Uma missão = uma música** (e2d813e) · áudio · o destaque ouvir/comprar por 14 s no fim; desempenho igual.
- **1. Missões como feira** (badb52e) · ui · pegar → checklist; 6 s parado → a Kombi vai sozinha; largar → volta pra feira.
- **As prévias do vol.1 com 22 s** (2ddb77f) · áudio · as 9 com 22,000 s.
- **A empresa-ia instalada** (c86f00f) · diretor · agentes, /triagem, BACKLOG, RELATORIOS, as regras no CLAUDE.md.
