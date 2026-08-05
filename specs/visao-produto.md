# visao-produto.md — visão de longo prazo (norte do produto)

> **Importante**: este arquivo descreve pra onde o produto está indo, não o
> que já está implementado hoje. Pra saber o que já existe, ver `CLAUDE.md`
> e o código em `app/`. Nada aqui deve ser tratado como já construído — vira
> tarefa concreta só quando o usuário priorizar e pedir.

## Objetivo central

Fazer a pessoa explorar o mapa da cidade, descobrir música e artistas novos,
e se conectar através de uma plataforma "viva" — não uma landing page, uma
experiência imersiva de verdade. A jornada de lançamento de CIDADE NEON
(documentada em `CLAUDE.md`) é o primeiro capítulo desse universo maior.

## Mecânica central: cidade, carro, personagem

- Mundo dirigível de carro, mapa da cidade.
- Cada pessoa tem seu próprio carro e personagem, ambos customizáveis — o
  usuário escolhe "quem ele quer ser" ali dentro.
- Cada tipo de personagem tem um tipo de carro associado.

## Rádio como descoberta musical

- O rádio do carro é o meio pelo qual a pessoa conhece a obra de um artista
  — cada frequência sintonizável corresponde à obra de um artista
  específico (hoje: as 4 frequências de LU2CA em `lib/radio-tiers.ts`).
- Liberar uma frequência nova exige rodar a cidade + cumprir missões
  especiais (ver "Sistema de progressão" abaixo pros tipos de missão).
- Escala: hoje são 4 frequências preenchidas (LU2CA). A visão é ter muito
  mais, com prévias reais de música endereçadas pelo mesmo site — a cidade
  cresce de tamanho conforme mais artistas/pessoas entram.

## Criação musical — pilar grande

Foco forte em transformar a plataforma num criador de sons/samples, um
"produtor de música remoto" — o carro funciona como um estúdio.

- **B4TIDA** (já existe hoje): MPC virtual de beats em diferentes timbres e
  tempos — já salva as batidas criadas na sessão. É o ponto de partida real
  desse pilar.
- Visão: além de ouvir as faixas, a pessoa pode **samplear** as músicas do
  artista, criar **remixes**, **baixar** os projetos que criar e
  **compartilhar** com o próprio artista.
- Mais pra frente: artistas que toparem terão suas músicas **destrinchadas**
  (stems separados) pra que as pessoas criem novas ideias a partir dali —
  isso pede um **gravador de música portátil** dentro do app, além de um
  **player de música**.
- **GUITAR DRIVER** (já existe hoje): a visão é ele ser conectado
  diretamente ao instrumental real de cada faixa — detectando os
  instrumentos presentes e gerando linhas de combinação 100% fiéis ao áudio
  de cada instrumento, com a pessoa escolhendo qual instrumento vai tocar.

## Sistema de progressão / recursos (regra de design central)

A cidade e as missões são a **única fonte de recursos** do jogo — isso
precisa ficar claro e simples pra quem joga.

- Nada é dado de uma vez só. Desbloqueio é sempre gradual.
- No início, a pessoa já tem acesso a **tudo**, mas em **quantidade
  reduzida** dentro de cada interação — ex: GUITAR DRIVER liberado, mas só
  com 1 música; rádio liberada, mas só com 1 estação.
- Recursos vão aparecendo aos poucos conforme ela explora/cumpre missões —
  ex: rodar a cidade pra liberar um kit de bateria novo no B4TIDA, ir até um
  lugar X pra receber uma rádio nova.
- Itens colecionáveis espalhados pelo mapa (referência: power-ups de estilo
  Crash Bandicoot / Mario Kart) — regras estritas de spawn; se a pessoa
  perder o item de vista, tem que rodar a cidade de novo até achar.
- Regras estritas valem também pra mapa, design, render e storytelling —
  padrão de experiência **premium** pra nova geração (é um compromisso da
  empresa, não só uma preferência estética).

## Camada social futura

- Sem chat. A única interação social visível entre pessoas é **qual música
  cada uma está ouvindo**.
- Possível feature futura: entrar no mesmo carro que outra pessoa pra ouvir
  o mesmo som junto.
- Pontos de parada na cidade pra encontros — nesses pontos, pessoas podem
  trocar "artes" (criações/artefatos) entre si.

## Sistema multi-artista (mapa A–Z)

- O mapa da cidade vai de A a Z — cada letra representa um artista/zona.
- Hoje só existe **L** (LU2CA, o próprio usuário/artista dono do projeto).
- Quem entra pelo link de um artista específico já conhece a zona
  correspondente àquele artista (ex: veio pelo link do artista X → já
  conhece a zona X).
- Esse conhecimento de zona pode ficar compartilhado entre todo mundo se a
  infraestrutura for leve, organizada e sustentável o bastante pra
  hospedar isso.
- A cidade tem um tamanho limitado hoje e vai se expandir conforme mais
  pessoas e artistas passem a fazer parte do universo.

## Como isso se relaciona com o que já existe

| Peça da visão | Onde já tem uma semente no código hoje |
|---|---|
| MPC de batidas | `app/batida/page.tsx` (B4TIDA) — já salva batidas da sessão |
| Guitar Hero ligado ao instrumental | `app/feel-good/page.tsx` / GUITAR DRIVER (`lib/audio-analysis.ts`) |
| Rádio = descoberta de artista | `lib/radio-tiers.ts` — 4 frequências de LU2CA |
| Conversa com escolhas que mudam o mundo | Quiz de arquétipo em NECTAR (`NECTAR_QUESTIONS`/`NECTAR_RESULTS` em `app/page.tsx`) é a semente — hoje não afeta a cidade visualmente, isso é visão futura |
| Personagem/carro customizável | Não existe ainda — carro hoje é fixo (`app/drive/page.tsx`) |
| Multiplayer / outras pessoas no mapa | Não existe ainda — hoje é single-player, sincronizado só via `localStorage` local |
| Mapa multi-artista (A–Z) | Não existe ainda — hoje só tem a cidade de LU2CA (L) |
