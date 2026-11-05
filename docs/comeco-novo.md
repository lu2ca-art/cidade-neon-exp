# O começo, de um save novo (05/11)

Branch `feature/game/comeco-novo` (a partir de `feature/game/mapa-disco`, `4c5b0ed`).
Um passeio de leitura pelo código, passo a passo, de um save NOVO: da página inicial
até completar a 1ª missão da carreira e pegar a 2ª. Em cada passo: o que ele vê, o que
pode fazer, o que muda, e se fechar e reabrir o jogo ali volta num estado jogável.
Sem build, sem Playwright: só leitura e `npx tsc --noEmit -p .`. Um commit por correção.
`app/teste/mesa.ts` não foi mexido.

## O passo a passo

| # | fase (save) | o que ele vê | o que ele faz | o que muda | fechar e reabrir aqui |
|---|---|---|---|---|---|
| 1 | `minhoca` | a página inicial (`disco/Inicio.tsx`): "entrar" | toca em "entrar" | o disco antigo entra em fade, distorcido; o buraco de minhoca | volta pra página inicial |
| 2 | `minhoca` → `casa` | o túnel (~7 s; um toque pula) | espera ou toca | `fimMinhoca`: fase `casa`, a hora do céu = a hora real | o túnel de novo e a chegada (agora com o disco tocando: correção 5) |
| 3 | `casa` | a Kombi sai do túnel a 220 m/s, freia sozinha na frente da varanda, a porta abre | nada (a cena de lado) | evento `casa` → a cena da casa | igual ao 2 |
| 4 | `casa` | a cena: D-Bee, a escolha (3 respostas), o **tambor** (toca junto), a **entrega do holo** | toca as falas, o tambor, pega o holo | `fimCasaDisco`: fase `dunas`, `holo`, `drone`, +água; o disco antigo recomeça | — |
| 5 | `dunas` | a tela de recompensa do holo; depois a pedra **"toca no mapa"** (o mapa balança); o notch "Agora: o subúrbio" | toca no mapa → o drone sobe → "viu a linha? volta pra rua" → "ícone no meio: acelera" → "vira forte e solta: drift" → "o anel" → "o ?" | a D-Bee fala pelo rádio (não tem estrada, a cidade é lá em cima, vai por baixo) | nasce onde parou no deserto, com o disco tocando (correção 5) |
| 6 | `dunas` → `bar` | ~1,3 km do subúrbio a **rádio Xenom liga sozinha** (o disco para) | segue dirigindo de Kombi | entrou no anel do subúrbio: evento `cidade` → porta da D-Bee (recompensa), fase `bar`, a D-Bee: "o bar é aí embaixo: o letreiro laranja" | nasce no subúrbio, rádio Xenom tocando |
| 7 | `bar` | a coluna de luz no bar; "Agora: o bar · o subúrbio" | dirige até a porta (de Kombi: no prólogo a regra das zonas espera, `roteiro`) | a cena do bar: os seis copos | **antes:** reabrindo em cima da porta, nada abria (correção 1) |
| 8 | `bar` | beber um copo: "a noite volta pro começo" | "a noite volta →" | `loops.bar + 1`; **o bar abre de novo** com as falas de volta e a palavra "escolha" (correção 2) | — |
| 9 | `bar` → `oficina` | negar ("escolha" → "não") | — | fase `oficina`; a D-Bee: "tem uma oficina aqui embaixo: a luz laranja" | nasce no subúrbio |
| 10 | `oficina` | a oficina (cena do mecânico) → "o lixo bom · o lixão · 0/4" | pega as 4 peças passando (de Kombi, fora do anel: deserto) → volta → a bancada → a goteira → volta → paga em água | `passoOficina`: chegar → catar → reciclar → goteira → montar | em cima da oficina/goteira, o passo abre de novo (correção 1) |
| 11 | `oficina` → `subir` | a porta da oficina (o motor) | — | fase `subir`; "a cidade · lá em cima"; pedras "segura: a Kombi voa" e **"pousa numa pista acesa"** (antes desta, o turbo tomava a vez: correção 4) | nasce no subúrbio, de Kombi |
| 12 | `subir` → `carreira` | voa, pousa numa pista | — | evento `subiu`: fase `carreira`; 222 FM "uma kombi velha subiu do subúrbio". As zonas e os rachas passam a valer | nasce na pista onde parou |
| 13 | `carreira` | "Agora: pega uma missão no mapa · 3"; pedra **"escolhe a missão"** no anel (antes o turbo vinha na frente: correção 4). A D-Bee não fala por cima da pedra (correção 3) | anel → mapa → "pegar" (ou chega no lugar de uma oferta: ela é pega ali). As 3: **quadra (Alohan), túneis, LU2CA** | `h.missao` | a missão pegada fica no save |
| 14 | `carreira` | "Agora: vai até a quadra, no chão do subúrbio…" + a distância; pedra "segue a linha até lá" | voa pra fora da pista, desce no subúrbio: a Kombi para na entrada ("o subúrbio é a pé"), ele segue **de patins** | — | nasce onde parou (de patins, a Kombi na entrada) |
| 15 | `carreira` | perto: pedra "chegou: desce aqui" (no notch; na pista em cima, aponta pra dica "desce: o lugar é aqui embaixo": correção 4); o balão do Alohan ("bora ▸") | "bora" | B4TIDA (a arte) → o segundo balão → basquete 6 pts em 45 s | em cima da quadra, a missão abre de novo (correção 1); o B4TIDA/basquete aberto não fica no save (começa da peça que falta) |
| 16 | `carreira` | a porta: o mapa brilha, notch "abriu · a quadra +n" e "+N neon$"; pedra **"abriu coisa nova: olha"** | toca no mapa | `feitas13` + `quadra`; acende a DopaminA; a feira: túneis, LU2CA, **Notti** | limpo (missão feita no save, nenhuma pegada) |
| 17 | `carreira` | o anel/mapa com as 3 ofertas | "pegar" a 2ª | `h.missao` = a 2ª | idem 13 |

## Corrigido

1. **Reabrir em cima do lugar do passo de agora não abria nada** (`aa1480a`)
   `estrada/Corrida.tsx` (o `dentro` do intervalo do chão). A proteção da revisão 05/11
   (`ondeNasceu`: não reabrir o lugar do chão em que a Kombi nasce, pro túnel não descer
   sozinho) valia também pro alvo da história. Quem fechava a aba no meio da cena do bar,
   da oficina, da goteira ou da quadra (a Corrida grava onde parou ao desmontar) voltava
   parado em cima do alvo, com "Agora: … · aqui", e nada abria até sair ~80 m e voltar.
   Agora o alvo de agora (`alvoChao`) não entra na proteção; o túnel continua protegido.
2. **Beber no bar do prólogo deixava ele parado na porta** (`8a92e19`)
   `page.tsx` (`fimBarDisco`). A cena fechava e o jogo voltava no lugar fixo do subúrbio
   (~66 m do bar): o bar só abria chegando de novo, e nada dizia isso. Agora o bar abre
   de novo 2,2 s depois ("a noite volta pro começo"), com as falas de volta e a escolha.
3. **A D-Bee falava por cima da pedra da trilha** (`16a2b3d`)
   `disco/DbeeSugere.tsx`. Ela conferia a pedra por `lerNexoTutorial()`, que ninguém
   escreve desde a trilha de pedras. Na primeira carreira, com "escolhe a missão" na
   tela, ela sugeria sinuca, corrida de rua, fliperama. A TrilhaPedras agora publica a
   pedra de agora (`TRILHA_NA_TELA`, em `trilhaPedras.ts`) e a D-Bee espera.
4. **A trilha: o turbo na frente do caminho; "chegou" no botão errado** (`f86a027`)
   `disco/trilhaPedras.ts`. A pedra do turbo vinha antes de "pousa" (subida) e de
   "escolhe a missão" (carreira): quem não disparava o turbo via só "turbo cheio: toca".
   Ela foi pra depois do `liberou`. E a "chegou: desce aqui" apontava pro "sair da Kombi"
   quando ele está na pista em cima de um lugar do chão (descer da Kombi ali não
   adianta); com a dica do guia no notch, ela aponta pro notch.
5. **Reabrir na casa ou nas dunas: deserto mudo** (`3bcc4de`)
   `page.tsx` (`entrar`). O disco antigo só ligava na fase do buraco de minhoca; na casa e
   nas dunas ficava em silêncio até a rádio Xenom ligar no subúrbio. Agora o toque em
   "continuar" liga o disco (o mesmo do começo).

## Conferido, sem trava

- **Zonas no prólogo:** `roteiro` vale de `casa` a `subir` (`Corrida.tsx`, `roteiro`): de
  Kombi dá pra entrar no subúrbio até o bar e a oficina, e catar as peças no deserto.
  Na carreira a zona tira da Kombi na borda do subúrbio, e o gatilho do chão (quadra,
  túneis) vale de patins (`combRef.aqui` é o patinador; `chegouNoAlvo`, 32 m).
- **Rádio Xenom:** liga no deserto, a ~1,3 km (a zona do som), antes do evento `cidade`.
  Nunca liga com uma cena aberta (a Kombi está parada). Nada fica pausado depois do
  tambor nem das peças (`fazerMusica` é contado e sempre pareado).
- **Introdução da missão:** só abre ao chegar no lugar da missão pegada; fecha se trocar
  de missão ou se afastar 160 m. Com a introdução aberta a trilha pausa.
- **Casa da D-Bee:** só no deserto (`chao:casa`), e só na carreira/livre com instrumento novo.
- **Os sinais `roteiro`/`intro`:** os rachas e as zonas só na carreira e no livre; a
  D-Bee só na carreira e no livre, sem missão.

## Suspeitas (não corrigidas)

- **A rádio Xenom entra seca:** `disco.parar()` corta o disco antigo sem fade, chiado,
  900 ms de silêncio e a música Xenom em volume cheio (`som.ts`). E a fala da D-Bee
  "lá em cima não tem como subir…" cai junto da primeira vinheta (as duas a ~1,3 km).
- **Vinheta e chiado por baixo das cenas:** a troca de música da rádio (`tocarProxima`)
  não olha `cinema`: no meio da cena do bar ou da oficina, quando a faixa acaba, toca o
  chiado e a vinheta aparece no notch. (O "a mesma música, no mesmo trecho" do bar
  também não bate mais: a rádio segue andando.)
- **iPhone:** o `<audio>` da rádio nasce e toca pela primeira vez no quadro (sem toque);
  o iOS pode bloquear esse primeiro `play()` (o erro é engolido).
- **Fechou antes de gravar `radioXenom`** e reabriu dentro do subúrbio: a rádio não liga
  sozinha (a zona nasce sem a de antes).
- **"Depois" na introdução:** fecha o balão; a missão só abre de novo saindo ~80 m (chão)
  ou pelo `visitaAbriu` (cidade). É de propósito, mas nada diz isso.
- **B4TIDA, basquete e as peças de cena** não entram no `corridaPausada` nem na pausa da
  trilha: o mundo segue andando por baixo (o espaço também é o propulsor).
- **O Nectar no save:** pelo caminho novo (sem a fase `nectar`) o objeto "nectar" nunca
  entra em `save.objetos`. Não trava nada no começo; a conferir onde ele é lido.

Na Mesa: fechar a aba no meio da cena do bar e reabrir (o bar abre); beber um copo (o bar
abre de novo); fechar nas dunas e reabrir (o disco toca); a primeira carreira sem ter
usado o turbo (a pedra "escolhe a missão" logo depois de pousar); a D-Bee calada com a
pedra na tela; na pista em cima da quadra, a pedra "chegou" no notch.
