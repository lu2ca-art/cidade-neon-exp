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

## Suspeitas (não mexi)

1. **O `intro` do disco desliga também a regra das zonas e os rachas na carreira.**
   `Corrida.tsx:1247` (`rachasOk` lista `historia.fase === "carreira"` e logo depois
   `!intro`, que na carreira é sempre verdade: a cláusula da carreira nunca vale),
   `:1773` (`regraZona`) e `:1794` (`motoZona`). Na carreira: sem racha, e o "subúrbio é a
   pé"/"deserto só Kombi" não acontecem (só no jogo livre). É a mesma causa da correção 1,
   mas mexe em jogo de verdade (zonas e rachas a carreira toda): decisão do coordenador.
   Se for pra valer, a troca é `!intro` → `!(intro && historia?.fase !== "carreira")`
   (ou passar um `quieta` separado do `intro` na página).
2. **A pedra da trilha no meio da mensagem.** Se uma pedra aparece enquanto uma mensagem
   do notch passa (uma frase da D-Bee, ou qualquer outra), a mensagem fica guardada e
   recomeça do início quando a pedra sai (e de novo a cada pedra seguinte, se houver um
   instante sem pedra entre elas). Não some, mas pode piscar e voltar velha. A D-Bee já
   não começa com pedra na tela, então é raro. Uma saída: a mensagem guardada por mais de
   `NOTCH_VELHA` cai (`Holo.tsx`, `useNotch`).
3. **A marca do chão da D-Bee e o piloto de novo.** O piloto entrega na pista mais perto e
   desliga. Enquanto a marca do chão existir (ela só sai a 45 m do lugar, e o mapa não tira
   marca com `wx` com o GPS ligado: `Mapa.tsx:260`), ligar o piloto ali mesmo desliga na
   hora (o destino está a menos de 26 m). Ele precisa ir até o lugar (a reta) ou "tirar a
   marca". É a mesma regra dos destinos de missão, mas a marca da D-Bee é um convite: se o
   dono quiser, o piloto pode passear quando o destino de agora é o mesmo que ele acabou
   de entregar (`j.pilD`, ~4 linhas em `Corrida.tsx:4790` e na escolha do cruzamento `:5252`).
4. **O final pula de bairro em bairro (os nove).** Os `<Perto>` medem pela câmera. No "nove"
   a câmera corta pra outro monumento a cada 2,6 s e no "CHUVA" fica a 520 m da torre
   central: cada corte pode montar blocos da cidade (fachadas, monumentos) na hora, com
   tranco. Não medi (regra). Se tranca na Mesa: montar os blocos dos nove pontos antes
   (no "sinal") ou segurar os `<Perto>` montados enquanto `FINAL_VIVO.momento` existe.
5. **O vídeo da despedida e a música.** `CenaFilme` não cala a música do jogo. Hoje o filme
   é só legenda (`video: null`); quando o vídeo de IA entrar, o som dele vai tocar por cima
   da rádio/faixa. Chamar `musicaPropria()`/`silenciar` ao abrir o filme (e soltar no fim).
6. **Duas Kombis depois do final.** O quintal ganha a Kombi da memória para sempre, e a do
   jogador continua estacionada na frente da casa. Se a do quintal é "a mesma", o dono decide.
7. **A marca da D-Bee na corrida de rua.** Com uma marca dela no mapa, o GPS segue apontando
   pra ela durante a corrida (a corrida de rua não usa o alvo do GPS como os rachas).
   Não atrapalha a regra, só a barra.
8. **Alocação rara:** `vidaNasRuas.ts`, `proximaRua` faz dois `filter` quando alguém troca de
   rua (uns poucos por segundo com ~130 andando). Pequeno; deixei.

Sem teste no jogo (regra). Na Mesa: a D-Bee falando na carreira (sem missão, ~45 s parado),
a chuva do final e da rua CHUVA (a chuva da câmera agora só anda quando aparece), e voltar
ao subúrbio algumas vezes (a vida remonta).
