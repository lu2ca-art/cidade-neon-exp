# Revisão 3, noite de 05/11: as frentes do fim do dia

Branch `feature/game/revisao3` (a partir de `feature/game/mapa-disco`, `9ec3d57`).
O que entrou depois da revisão 2 (`docs/revisao2-0511.md`): o final (`docs/final.md`),
a D-Bee sugere (`docs/dbee-sugere.md`), a vida no subúrbio (`docs/vida-suburbio.md`) e
a corrida de rua (`docs/corrida-suburbio.md`), lidas contra o resto do jogo.

Regra: só leitura e `npx tsc --noEmit -p .` (conferido pelo código de saída); sem build,
sem Playwright, sem medir quadro. Um commit por correção. `app/teste/mesa.ts` não foi mexido.

## Corrigido

### 1. A D-Bee nunca falava na carreira (D-Bee sugere × `intro` da história)
- **Onde:** `estrada/Corrida.tsx:3028` (o `ocupado` do `<DbeeSugere>`)
- **Causa:** o `ocupado` tinha `intro`. No disco, a página passa `intro={HIST || …}`
  (`page.tsx:2350`), e `HIST = historiaAtiva(h) = fase !== "livre"`: o `intro` é "a cidade
  quieta" e vale a história toda, **inclusive a carreira**. Com isso a D-Bee só falava no
  jogo livre, e o doc diz carreira e livre.
- **Correção:** tirei o `intro` do `ocupado`. A fase quem confere é o próprio DbeeSugere
  (só carreira e livre), e as falas da história continuam bloqueando pelo `fala`.
- Commit `b5a66a1`.

### 2. Corrida de rua: closure e filter a cada quadro
- **Onde:** `disco/CorridaDeRua.tsx:120` (`acabarRua`) e `:223`
- **Causa:** o `useFrame` da cena (montada sempre que se está no subúrbio) criava a
  closure `acabar` todo quadro, e na corrida um `E.rivais.filter(...)` por quadro pra o lugar.
- **Correção:** `acabarRua(E, agora, motivo)` no módulo; o lugar é contado num `for`.
- Commit `f2250ef`.

### 3. Vida no subúrbio: a função de evitar o traçado a cada quadro da corrida
- **Onde:** `estrada/VidaSuburbio.tsx:240` (`vida.evitar`) e o `useFrame`
- **Causa:** durante a contagem e a corrida, `(e) => R.ar[e].corrida` nascia todo quadro.
- **Correção:** a função nasce uma vez, junto com a vida.
- Commit `c4f8ff7`.

### 4. A chuva da câmera alocava 700 arrays por quadro, chovendo ou não (final × chuva)
- **Onde:** `estrada/Corrida.tsx:6802`
- **Causa:** o laço da chuva (que o final e a rua CHUVA usam) fazia
  `chuva.pos.set([x, yy, z, …])` por gota (700 arrays de 6 números) e marcava o buffer pra
  subir pra GPU **todo quadro**, mesmo sem chuva nenhuma na tela (o caso comum).
- **Correção:** só anda e sobe quando a chuva está visível; escreve direto no `Float32Array`.
  Quando a chuva volta, as gotas seguem de onde pararam (é ruído, ninguém nota).
- Commit `e1601c6`.

### 5. Vida no subúrbio: as instanciadas ficavam na GPU a cada remontagem
- **Onde:** `estrada/VidaSuburbio.tsx:239` (`descartar`)
- **Causa:** o dispose soltava geometrias e materiais, mas não as 4 `InstancedMesh` (gente,
  bichos, roupas, fumaça). Sem o `dispose()` delas, o buffer das matrizes (e das cores) fica
  no WebGL toda vez que o `<Perto>` das ruínas desmonta e monta de novo.
- **Correção:** as 4 entram no `descartar`.
- Commit `3412b97`.

## Conferido, sem problema

- **Quem ganha o notch:** a pedra da trilha manda (`tut`), depois o "?" (`explicando`),
  depois a mensagem que passa (a D-Bee é uma delas), depois o "Agora"/piloto/dica. O ♪ fica
  ao lado da mensagem e do "Agora", e some só com a pedra ou o "?". A D-Bee não fala com
  pedra na tela (`lerNexoTutorial`), com missão pegada (a `IntroMissao` só abre pra missão
  pegada, então também cala a D-Bee), nem em cena/cinema (o notch some no cinema:
  `.is-cinema .l-ilha`).
- **A marca da D-Bee × missão:** pegou missão, a marca dela sai em até 3 s (o GPS e a
  escolha do cruzamento voltam pra vaga). Se ele marcou outra coisa, ela esquece a dela.
  Se ele tirou a marca longe, ela esquece sem contar como feita.
- **A marca × piloto:** o piloto leva até a pista mais perto do lugar do chão, para e
  devolve o volante (a mesma regra dos destinos de missão). Ver a suspeita 3.
- **Save antigo:** `carregar()` faz `{ ...VAZIO, ...bruto }`; `dbee`, `ruaSuburbio` e
  `historia.radioXenom` são opcionais. `definirMemoriaDbee` junta com `MEMORIA_VAZIA`
  (falta um campo, vale o vazio); `placarComCorrida` e a tela da corrida aceitam placar
  vazio ou sem `melhor`; o mapa da corrida usa `radioXenom` ou a fase (save de antes).
  `lerOndeParou` valida o desembarque (`desembarqueOk`) e joga fora o que não bate.
- **A chuva do final × a da rua CHUVA:** as duas escrevem o mesmo `CHUVA_MANIFESTO.k` (não
  somam: a chuva da tela usa `max(clima, rua)`). Nunca estão juntas: o final começa na casa
  da D-Bee (deserto) e o manifesto só monta com a Kombi na rua dele. O final zera o `k` ao
  acabar e ao desmontar, e só escreve enquanto passa.
- **A câmera do final:** `CAM_ROTEIRO` é aplicado depois do drone/primeira pessoa; o
  manifesto não empurra a câmera (o `cine` tira o `CAMERA_RUA.livre`). A chuva segue a
  câmera, então aparece lá no alto no "CHUVA".
- **Fim do final:** `setFinalAgora(null)` e o `concluir` saem no mesmo lote; o quintal não
  pisca entre o "quintal" e o "feito" (os dois avisos do `FINAL_VIVO` caem no mesmo flush).
- **Corrida de rua × D-Bee:** ela não fala na contagem, na corrida nem no resultado
  (`RUA.e.fase`). Na largada ("perto") pode falar; a sugestão da própria corrida pesa 0,2
  em cima dela.
- **Corrida × vida:** durante a contagem e a corrida, quem está a menos de 8,5 m do eixo
  some encolhendo e quem anda não entra nas ruas do traçado; volta no resultado.
- **Listeners e timers:** DbeeSugere (1 `setInterval`, limpo), a memória (`ouvirMemoriaDbee`
  devolve a limpeza; `aoOuvirCompleta` é do módulo, uma vez), FinalTela (timers limpos),
  FinalNove (dispose das instanciadas e do mato; a câmera e a chuva soltas ao desmontar),
  CorridaRuaHud (`setInterval` de 100 ms, limpo).

## Parte 2: as decisões do coordenador (05/11)

As suspeitas 1 a 7 da parte 1 viraram tarefa. Um commit por item.

| item | o quê | onde | commit |
|---|---|---|---|
| 1 | **As zonas e os rachas valem na carreira.** Novo sinal `roteiro` no Corrida: é o `intro` da página só fora da carreira e do livre (o prólogo, do buraco de minhoca até subir pra cidade). Ele entra no lugar do `intro` no `rachasOk`, na `regraZona` e na `motoZona`. As cenas de verdade continuam com os sinais delas (cinema, cenaLugar, abertura, chegada, perseguição, quebra, conserto, `semKombi`). Conferido lendo: na perseguição e com a Kombi quebrada ou no conserto a regra espera, como antes; o fim do conserto traz a Kombi até ele e, no subúrbio, a zona o põe de patins/moto com a Kombi ali (o mesmo do livre); a chegada do lugar do chão (`chao:*`) vale de patins; o prólogo (dunas, bar, oficina, subir) não muda | `estrada/Corrida.tsx:1252` (`roteiro`), `:1259`, `:1785`, `:1800` | `17331c9` |
| 2 | **A mensagem interrompida retoma.** Se a pedra da trilha (ou o "?") toma o notch no meio de uma mensagem, a posição da animação fica guardada na mensagem (`pos`). Quando o notch volta, ela continua dali, com o tempo que faltava | `estrada/Holo.tsx` (`MsgNotch.pos`, `MsgNoNotch`) | `c28820d` |
| 3 | **O piloto na marca do chão.** Entregou na pista mais perto de uma marca com `wx/wz` (a da D-Bee): o notch diz "desce aqui: o lugar é lá embaixo" e o piloto guarda a trava (`j.pilTrava`). Ligar de novo ali, com o mesmo destino, desliga na hora e repete o aviso. A trava sai a mais de 90 m de rota (`PILOTO_TRAVA_M`) ou quando o destino muda | `estrada/Corrida.tsx` (`PILOTO_DESCE`, `pilTrava`, perto da escolha do destino do piloto e da chegada) | `f36a0d6` |
| 4 | **O final aquece os nove pontos.** `PERTO_EXTRA` em `Perto.tsx`: pontos que contam como câmera pros blocos normais (os de `fora` ignoram). Durante o "sinal" (8 s), o FinalNove põe um ponto por vez (os nove e a torre central), e o tranco de montar se espalha no sinal. No "nove" e no "CHUVA" ficam todos; na despedida, saem. Vazio no resto do jogo (custo zero) | `estrada/Perto.tsx`, `estrada/FinalNove.tsx` (`aquecer`) | `de3406e` |
| 5 | **O vídeo com som cala a música.** `CenaFilme` chama `fazerMusica(true)` enquanto o vídeo toca: a música do jogo some em fade e pausa (e a TV do holo fecha), e volta de onde estava no fim, ao pular ou se o vídeo falhar. `Filme.semSom` pra um vídeo só de imagem. Hoje nenhum filme tem vídeo (o provisório não mexe no som) | `CenaFilme.tsx`, `estrada/ganchoCena.ts` | `8226c74` |
| 6 | **Uma Kombi só depois do final.** Na despedida (a câmera na frente da casa), o Corrida põe a Kombi DO JOGADOR no quintal (`QUINTAL_FINAL`), estacionada, e o "quintal" já a mostra lá. A cópia (`KombiHerbal` no quintal) saiu. Depois do final ele está na Kombi, no quintal. O mato continua | `estrada/Corrida.tsx` (antes da câmera roteirizada), `estrada/FinalNove.tsx`, `docs/final.md` | `bb0a45a` |
| 7 | **O GPS na corrida de rua.** Na contagem e na corrida, `destinoMundo` devolve o próximo portão ("o próximo portão", e na última "a chegada"), antes da marca e da missão. O GPS, o drone e a reta seguem ele; acabou, volta o que estava | `estrada/Gps.tsx` (`destinoMundo`) | `8b7416c` |

## Suspeitas que ficam

- **Zonas na carreira (item 1), a conferir na Mesa:** a missão do bar, da quadra e dos túneis de Kombi
  (agora ele desce na borda do subúrbio e vai a pé/de patins/de moto); a Kombi voltando do
  conserto dentro do subúrbio; os rachas oferecendo durante uma missão pegada (a regra deles
  não olha a missão).
- **Item 2:** se a mensagem guardada esperar muito (uma trilha longa), ela volta velha.
  Não tem prazo (o pedido foi retomar).
- **Item 3:** a trava é só pra marca do chão. O destino de missão no chão (o bar, a casa) segue a
  regra de antes: o piloto entrega, e religar ali para na hora.
- **Item 4:** com os pontos extras, os blocos da cidade ficam montados longe da câmera durante o
  nove e o CHUVA (memória e algum desenho a mais, por ~40 s). Pular o "sinal" com um toque leva
  o tranco todo pro primeiro corte.
- **Item 6:** o rumo da Kombi no quintal (`ROT_CASA + 1,5π`) é a conta do modelo olhando pra -z.
  Pode ficar de ré em vez de "de lado"; é um número em `QUINTAL_FINAL`. Quem chega de patins na
  casa (o deserto é só Kombi, então não deveria) não é movido.
- **Alocação rara:** `vidaNasRuas.ts`, `proximaRua` faz dois `filter` quando alguém troca de rua
  (uns poucos por segundo com ~130 andando). Pequeno; deixei.

Sem teste no jogo (regra). Na Mesa: as zonas e os rachas na carreira; a D-Bee falando na carreira (sem missão, ~45 s parado); o piloto até uma marca da D-Bee no chão; o final inteiro (o nove sem tranco, a Kombi no quintal); a corrida de rua com o GPS;
a chuva do final e da rua CHUVA (a chuva da câmera agora só anda quando aparece), e voltar
ao subúrbio algumas vezes (a vida remonta).
