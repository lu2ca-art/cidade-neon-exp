# Estudo: como o Guitar Hero fazia as notas (e o que o Guitar Driver 2 copia)

21/10/2026 · base do item A5 do BACKLOG (o Guitar Driver 2: as notas e a banda) e do A5b (um jogo pra cada instrumento).
Pedido do LU2CA: "estude como o Guitar Hero fazia, quais eram as nuances das notas, como ele sincronizava com o BPM certinho. Nunca queremos um vazio."

## 1. Como os jogos faziam (Harmonix / Neversoft / Rock Band)

**As notas eram feitas à mão.** Os charters da Harmonix (Guitar Hero 1–2, Rock Band) e da Neversoft (GH3 em diante) escreviam cada parte num editor MIDI, ouvindo a música multipista. Nada era "detectado": o jogo é bom porque uma pessoa decidia o que cada botão representava. Os jogos da comunidade (Clone Hero) seguem o mesmo modelo, com charts autorais.

**O mapa de tempo vem antes de tudo.** Primeiro se alinha a grade do MIDI à música (beat map): cada compasso cai em cima do tempo real da gravação, mesmo quando a banda acelera ou atrasa. Só depois se colocam as notas, encaixadas na grade: semicolcheia (1/16) e tercina (1/12) no Expert, colcheia e semínima nos níveis fáceis. É isso que dá a sensação de "sincronia certinha": a nota não fica onde o som começa, fica na batida mais perto dele.

**As 5 cores representam o desenho da melodia, não a nota exata.** Verde → laranja = grave → agudo *relativo*. Um riff que sobe vai pra direita; o mesmo riff uma oitava acima continua sendo desenhado igual. Repetição musical = repetição de padrão no chart (o jogador reconhece a música pelas mãos).

**As nuances:**
- **Acordes** (2–3 botões juntos) onde a guitarra bate acorde; quase só no Hard/Expert.
- **Notas longas (sustain)** onde o som se estende; a cauda acaba um pouco antes da próxima nota, nunca encosta nela. Notas curtas não ganham cauda.
- **HOPO** (hammer-on/pull-off): notas rápidas seguidas, de cores diferentes, que se tocam sem palhetar. Era automático por distância (a próxima nota muito perto da anterior) e o charter forçava ligado/desligado onde precisava.
- **Frases de star power**: trechos marcados que, tocados limpo, enchem a barra.
- **Solos** marcados; no Rock Band, a seção vira um momento.
- **Nunca nota em cima de nota** na mesma cor (sem sobreposição); só o teclado do Rock Band permite segurar uma e tocar outra.

**A redução por dificuldade** (prática dos charters; não há regra oficial publicada):
- Expert: o que a música toca, na grade fina.
- Hard: tira notas de passagem e alguns acordes; menos tercina.
- Medium: 4 cores (sem a laranja), quase sem acorde, colcheia no máximo.
- Easy: 3 cores, semínimas, segue o tempo forte; o padrão ainda lembra a música.

**Cada instrumento é um jogo diferente (Rock Band):**
- **Vocal**: uma linha de altura (pitch) que corre na tela; o microfone mede a sua altura e há uma tolerância (no fácil, larga); as partes faladas ("talkies") valem por ritmo, não por altura; frases separam a pontuação. O Rock Band 3 tem até 3 vozes (harmonia).
- **Bateria**: 4 pads + o bumbo (pedal), cada peça do kit vira uma cor; o bumbo é a linha laranja atravessada.
- **Teclado** (Rock Band 3): no modo normal, 5 teclas brancas, igual à guitarra; no Pro Keys, as 25 teclas, com a pista deslizando pra mostrar a região tocada.
- **Baixo**: igual à guitarra, mais esparso, muito sustain, mais grave no desenho.

**Nunca um vazio:** nos jogos de banda, quando um instrumento para (um break, uma introdução só de bateria), a sua pista mostra "descanso" curto e a câmera/pontuação passa pra quem toca. Em música eletrônica/rap, onde a guitarra some, os charts de comunidade escolhem "o que estiver tocando aquela função" (o synth vira guitarra). Num trecho de 22 s, a solução é escolher a janela certa pra cada instrumento.

## 2. O que a pesquisa acadêmica faz hoje (gerar automático)

- **audio2chart (2025)**: transformador que gera charts de Guitar Hero direto do áudio, em passos de tempo discretos; código e modelos abertos.
- **STRUM (2026)**: transcreve o áudio em charts de 5 instrumentos; acerta ~84% dos ataques na bateria e 50–70% nos outros. Nota importante: até os charts humanos da comunidade não batem 100% com o áudio (o teto é ~89%), porque charter decide, não copia.
- **Time-based Chart Partitioning (AIIDE 2025)**: detecta ataques com rede neural, **encaixa na batida simbólica** e depois aplica padrões pra coerência local (o chart "faz sentido" por trechos).
- **GenerationMania (Beatmania)**: usar a altura da nota pra escolher a coluna **não melhorou** a precisão: o que importa é ritmo e coerência de padrão.
- **AutoOsu / densidade por dificuldade**: a dificuldade é controlada pela densidade de notas, não por um rótulo.

**Conclusão pra nós:** a detecção dá o *ritmo* (quando) muito bem; a *escolha da cor* precisa de regras de charter (contorno relativo, repetição, limites por dificuldade). É um charter automático com regras de gente, não um transcritor puro.

## 3. O método do Guitar Driver 2 (o que vamos fazer)

Tudo roda na máquina do LU2CA, no disco "IA Cidade Neon" do SSD externo. O que entra no jogo são só as notas (JSON), nunca o áudio separado.

1. **Separar a banda** (Demucs htdemucs_6s): voz, bateria, baixo, guitarra, piano, outros. Das faixas que o jogo toca (public/audio/pistas: com voz nas 6 lançadas; o instrumental nas 3 que ainda não saíram), pra que o tempo das notas bata com o áudio do jogo.
2. **O mapa de tempo**: a grade do BPM de cada faixa (pistas.ts), com o primeiro tempo achado pelo beat tracking (librosa) e conferido contra os ataques da bateria.
3. **Os ataques e as alturas por instrumento**:
   - voz, baixo, guitarra, piano/teclado: Basic Pitch (Spotify) → notas com início, fim e altura. Voz e baixo: uma nota por vez (a mais forte). Guitarra e piano: até 3 juntas (acordes).
   - bateria: ataques por faixa de frequência (bumbo grave, caixa média, prato agudo).
4. **O charter automático, com as regras da seção 1**:
   - encaixar cada ataque na grade (1/16 e 1/12 no difícil; 1/8 no médio; 1/4 no fácil);
   - cor = contorno relativo dentro da frase (sobe → direita), com repetição: a mesma frase musical ganha o mesmo desenho;
   - acordes só onde há 2+ notas juntas, e só no difícil (no médio, a nota mais alta);
   - sustain quando a nota dura mais que ~1/4 de tempo; a cauda acaba antes da próxima;
   - HOPO automático quando a próxima nota, de outra cor, cai a menos de 1/12 de compasso;
   - fácil = 3 cores, médio = 4, difícil = 5; densidade máxima por nível.
5. **Os 22 segundos de cada instrumento**: pra cada faixa e instrumento, a janela de 22 s com mais notas tocáveis (sem buraco maior que 2 tempos). **Nunca um vazio**: se o instrumento escolhido para no meio, o chart puxa a "função" que estiver tocando (no rap sem guitarra, o synth/outros vira a guitarra; sem baixo, o grave do synth).
6. **A prova**: pra cada faixa e instrumento, quantas notas, o maior buraco (s), e a porcentagem de notas que caem num ataque real do áudio (± 50 ms). Vai pro RELATÓRIO.

## 4. Os jogos de cada instrumento (A5b, o que o LU2CA desenhou)

Todos leem o mesmo JSON (o mesmo tempo, os mesmos 22 s); muda a forma de tocar:
- **Cantar = o afinador**: a linha da melodia (a altura de cada nota da voz) corre; você mantém a agulha no meio. Fora do meio, a voz da faixa desafina junto (um pitch-shift proporcional ao erro). Na tela: um afinador de verdade, não notas caindo.
- **Guitarra = o Guitar Driver de hoje** (as 5 cores caindo, acordes, sustain, HOPO).
- **Baixo = a corda virtual**: uma corda horizontal que você sobe e desce; as notas viram faixas coloridas na altura delas; acertar = a corda estar na faixa quando ela passa. Sustain = segurar na faixa.
- **Teclado = a trava-mente** (a desenhar com ele): proposta de partida — cada nota vira um bit (tecla clara/escura) e você repete sequências curtas de memória, no tempo; erro = a tecla soa fora.
- **Bateria** (a desenhar): as 4 peças + o bumbo, tocadas por toque em regiões da tela.

## Fontes
- [audio2chart: End to End Audio Transcription into playable Guitar Hero charts](https://arxiv.org/pdf/2511.03337)
- [STRUM: Spectral Transcription and Rhythm Understanding Model](https://arxiv.org/pdf/2605.12135)
- [Time-based Chart Partitioning (AIIDE 2025)](https://ojs.aaai.org/index.php/AIIDE/article/view/36808)
- [GenerationMania: Learning to Semantically Choreograph](https://ar5iv.arxiv.org/html/1806.11170)
- [AutoOsu (ISMIR 2023 LBD)](https://ismir2023program.ismir.net/lbd_319.html)
- [Density-based Bias-Free Chart Generation (IEICE 2022)](https://ken.ieice.org/ken/paper/202212216Cp0/eng/)
- [Clone Hero wiki: dictionary (sustains, HOPO, intensidade)](https://wiki.clonehero.net/books/general-info/page/dictionary)
- [Guitar charting advice: sustained notes](https://rhythmgamingworld.com/forums/topic/guitar-charting-advice-sustained-notes/)
- [Custom Songs Central: diff_guitar guidelines](https://customsongscentral.com/diff-guitar)
- [HowStuffWorks: Playing Guitar Hero (HOPO)](https://electronics.howstuffworks.com/guitar-hero2.htm)
- [Rock Band 3 (Giant Bomb): keys e Pro Keys](https://www.giantbomb.com/games/3030-27919/)
