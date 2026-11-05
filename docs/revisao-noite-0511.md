# Revisão de integração, noite de 05/11

Branch `feature/game/revisao-noite` (a partir do topo de `feature/game/mapa-disco`,
`beb21c1`). Leitura dos ~128 commits de `4cc84e6..beb21c1` procurando onde as
frentes se cruzam. Sem build, sem Playwright, sem medição: só leitura e
`npx tsc --noEmit -p .`. Cada correção é um commit à parte.

## Bugs corrigidos

### 1. A zona do som media o deserto pelo raio cru (ruas-faixa × trilha sonora/rádios)
- **Onde:** `app/linha/disco/radioAntiga.ts:29` (`zonaDoSom`)
- **Causa:** `RAIO_DESERTO = 1300` era "o mesmo raio que o clima usa", mas o clima
  (`Corrida.tsx`, `alemDaCidade(...) > 1300`) passou a descontar o quanto a cidade
  cresceu em cada rumo; o som ficou no raio cru. No chão embaixo da cidade nova
  (1,3 a 2 km do centro) o som dizia "deserto" (Rádio Xenom, sem filtro) e o clima,
  "cidade".
- **Correção:** `zonaDoSom` usa `alemDaCidade(wx, wz)`. No rumo do subúrbio e da casa
  da D-Bee a cidade não cresceu: a primeira chegada ao subúrbio continua igual.
- Commit `69fd8b1`.

### 2. Dois balões juntos na chegada da missão (trilha de pedras × introdução da missão)
- **Onde:** `app/linha/page.tsx:2535` (o `pausado` da `<TrilhaPedras>`)
- **Causa:** a pedra "chegou: desce aqui" aparece exatamente quando ele chega perto do
  lugar da missão, que é quando a `IntroMissao` abre o balão de quem pede ("bora ▸").
  Os dois na tela, com ordens diferentes; sem âncora, o da trilha cai a 26% do pé da
  tela, em cima do balão da introdução.
- **Correção:** a trilha fica pausada enquanto a introdução está aberta (`|| !!introMissao`).
- Commit `c599758`.

### 3. Reabrir o jogo descia direto pro túnel (ondeParou × túneis/lugares do chão)
- **Onde:** `app/linha/estrada/ondeParou.ts` (`nasceuOndeParou`/`ondeNasceu`, novos) e
  `app/linha/estrada/Corrida.tsx:681` e `:1558`
- **Causa:** a Corrida grava onde parou também ao desmontar. Descendo pras trincheiras
  ela desmonta parada na porta do túnel; quem fechava a aba lá embaixo reabria o jogo
  com a Kombi em cima da boca, e o intervalo do chão disparava `chao:tuneis` no
  primeiro quadro (de volta pro túnel). O mesmo valia pra casa da D-Bee (a cena dos
  instrumentos), o bar (a porta), a oficina, a quadra. A volta do túnel já tinha essa
  proteção (`nascerNoTunel`); a volta pelo ondeParou não.
- **Correção:** nascendo pelo ondeParou (ou pela retomada no chão, item 5), os lugares
  do chão em que a Kombi já nasce em cima só valem depois de sair e voltar.
- Commit `4562a81`.

### 4. Voar de propulsor na cidade trocava a zona (propulsor × zonas × rádios)
- **Onde:** `app/linha/estrada/Corrida.tsx:6189` (`definirZonaSom`) e `:1772` (`zonaDoJogo`)
- **Causa:** o propulsor acima de 3,5 m da pista liga o voo livre (`j.voo = true`).
  `zonaDoSom` e `zonaDoJogo` liam `j.voo` como "no chão, fora das vias": cada voo na
  cidade virava "subúrbio" pro som (o filtro de rádio antigo entrava na hora) e, com
  mais de 4 s no ar, a estação trocava pra Rádio Xenom, com chiado, e voltava 4 s depois
  de pousar. A zona dos veículos também piscava pra "deserto" no ar.
- **Correção:** no ar (`j.ar`) a zona fica a de antes; muda quando pousa.
- Commit `9c9641f`.

### 5. Sair de uma sala aberta no chão jogava a Kombi na última pista (notas 04/11 + vitrine × RETOMAR)
- **Onde:** `app/linha/estrada/Corrida.tsx:1006` (o `RETOMAR` ao desmontar) e `:667` (o `jogo0`)
- **Causa:** a retomada da sala só guardava a pista (`via`, `u`, `x`). Desde que a casa
  da D-Bee mora no deserto (notas 04/11, `chao:casa`) e o bar do subúrbio abre depois do
  prólogo (vitrine 4), entrar nelas pelo chão e sair voltava com a Kombi lá em cima,
  na última pista da cidade.
- **Correção:** no chão (`j.voo`, fora do ar), a retomada guarda `chao: { x, z, rumo }` e
  a Kombi volta ali, com a mesma proteção do item 3 (a porta de onde ele saiu não
  reabre parada, como o `naVaga` da pista). As fases do subúrbio (bar, oficina, subir) e
  a volta do túnel continuam com o lugar fixo delas.
- Commit `92bc310`.

### 6. A introdução da missão ficava aberta pra sempre (trilha sonora × missões claras)
- **Onde:** `app/linha/page.tsx:1087` e o efeito logo abaixo
- **Causa:** o balão de quem pede não fechava sozinho. Dava pra sair dirigindo, ou
  trocar a missão no mapa, e o "bora" (ou o Enter/espaço, que no teclado também é o
  turbo) abria a peça da missão antiga em qualquer lugar: o basquete no meio da cidade,
  a descida pro túnel de longe.
- **Correção:** o balão guarda a missão pegada e a distância de quando abriu; trocou de
  missão, ou se afastou mais de `CHEGADA_MISSAO.avisar` (160 m) do ponto em que abriu,
  ele fecha. Conta o afastamento (não a distância absoluta) pra os links de teste que
  abrem a missão de longe (`?parte=missao.tuneis.trincheiras`) seguirem valendo.
- Commit `994cc00`.

## Suspeitas abertas (não corrigidas)

### Áudio
- **TV do holo × fazer música / peças:** com a TV tocando, abrir o Guitar Driver, a
  batida, o tambor ou uma peça com música própria (`pecas/sons.ts`, `elPeca`, que sai
  pelo canal da música e não pelo abafo) deixa as duas músicas soando. A regra do
  YouTube não deixa calar a TV; o caminho seria pausar o player (API) ou fechar a TV ao
  entrar nesses modos. Decisão de design.
- **Peça com `sync` e TV:** com a TV tocando, a faixa da rua está a zero (`calarPraTv`);
  uma peça de ritmo que decide usar a faixa da rua (`naRua`) fica sem música audível.
- **Evento tardio do YouTube:** `TvHolo.tsx` (`estado`) não confere `vivo`. Um `onStateChange`
  "tocando" que chegue depois do fechamento deixaria `pelaTv = true` e a música do jogo
  muda até abrir a TV de novo. Não vi acontecer lendo; a guarda é uma linha
  (`if (!vivo) return` no começo de `estado`).
- **Troca de estação sem próxima:** `radios.ts`, `trocarPara` zera o volume da rádio e
  chama o tocador; se ele não tocar nada (`proxima` devolve null, a 222 caída/fora do ar),
  a faixa antiga segue a zero até acabar. Hoje as listas nunca vêm vazias.
- **Fazer música não pausa de verdade em dois casos:** a troca de estação pela zona ou
  uma troca completa ⇄ instrumental (`pistaSom.missao`) no meio de um "fazer música"
  dão play num deck/na rádio, que seguem andando calados (o silêncio segura; só a
  posição anda).
- **Locutor com voz:** as vinhetas com `audio` (hoje todas `null`) tocam pelo canal das
  vozes, que não é calado por `fazerMusica` nem pela TV.

### Zonas, moto, túneis, ondeParou
- **Volta do túnel dentro do subúrbio:** `pararNaBoca` grava a posição de quem chegou na
  porta, que agora é a pé/de moto (a Kombi ficou na entrada do subúrbio). Na volta,
  `saidaDoTunel` põe a Kombi na boca, ele nasce nela e a regra das zonas o tira na hora
  (notch "o subúrbio é a pé"), deixando a Kombi estacionada na boca. Funciona, mas a
  Kombi "anda" pra dentro do subúrbio. Precisa de decisão (nascer a pé/de moto na boca).
- **ondeParou não guarda o veículo:** quem fecha o jogo de moto ou de patins volta de
  Kombi naquele ponto; no subúrbio a regra o tira logo (a Kombi fica onde ele estava,
  não na entrada).
- **Piloto passeando no deserto:** a "volta larga" sem destino pode cruzar o anel do
  subúrbio; a regra das zonas tira ele da Kombi e o piloto desliga.
- **Chão embaixo da cidade = deserto pros veículos:** `zonaDoJogo` chama de deserto todo
  chão fora do anel do subúrbio, inclusive embaixo das pistas (já era assim antes; com a
  cidade maior há mais chão embaixo dela). Lá não dá pra sair da Kombi.

### Mundo
- **Pilares nas ruínas:** 3 ou 4 pilares de pista (`pilaresDoMundo`) caem dentro da
  pegada de prédios das ruínas (perto de (−682, −459), (−595, −665), (−624, −591),
  (−659, −480)). Só visual (pilar atravessando o prédio); conferido com um script contra
  `ruinasDados.ts`, a rotação das peças pode estar trocada no script.
- **Memória das ruínas:** `RuinasSuburbio` vive num `<Perto>` (monta e desmonta ao
  chegar/sair do subúrbio) e a cada montagem clona os materiais de noite e mescla
  geometrias novas sem `dispose` na saída. O `Suburbio.tsx` antigo tem o mesmo padrão.

### Tela
- **Notch lotado:** "Agora: …" + distância/setinha + ♥ salvar (até 46% com o nome no
  brilho) + 📺 TV + "?" numa linha só. O texto do "Agora" encolhe com reticências; no
  celular estreito pode sumir quase todo enquanto o ♥ brilha.
- **TV × balão da introdução:** a TV no canto de baixo à esquerda (o padrão) fica por
  cima da metade esquerda do balão da introdução (onde mora o "depois"), no celular.
- **Introdução e o teclado:** a `IntroMissao` ouve Enter/espaço na janela sem parar a
  propagação; o espaço também chega na estrada (turbo/propulsor) no mesmo toque.
