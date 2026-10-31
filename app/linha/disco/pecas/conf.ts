// AS PEÇAS DAS MISSÕES DAS PESSOAS (T15, T18, T23, T24, T25, T16 — 28/10).
// Tudo o que é RASCUNHO mora aqui, num lugar só: o dono decide, a gente troca
// o número (ou o texto) sem mexer no resto. (Bloco 1, 30/10) As artes do Notti
// (a trilha 8 bits), da Nizzy (o clipe) e do Tony (o prato) foram aprovadas
// como estão; a do Drew virou a moda (MODA) e a do Xeriff, o ping pong.

import type { PistaId } from "../../estrada/pistas"

// ── T15 · Drew · a arte (decidido 30/10, bloco 1 · A3): moda sustentável e
// high fashion. Montar um look com o que sobrou no subúrbio (as roupas e os
// restos do lixão, reciclados como a oficina recicla a tecnologia) e desfilar.
// Uma peça por parte do corpo; o Drew olha o conjunto. RASCUNHO dos nomes ──
export const MODA = {
  partes: [
    { id: "cabeca", nome: "a cabeça", opcoes: [
      { nome: "turbante de lona de outdoor", cor: "#ffc857" },
      { nome: "boné de câmara de pneu", cor: "#2a2a30" },
      { nome: "tiara de tampinhas", cor: "#ff3fb0" },
    ] },
    { id: "tronco", nome: "o tronco", opcoes: [
      { nome: "jaqueta de capa de banco da Kombi", cor: "#ff6a35" },
      { nome: "colete de rede de pesca", cor: "#5dffa0" },
      { nome: "blazer de saco de café", cor: "#b38c5a" },
    ] },
    { id: "pernas", nome: "as pernas", opcoes: [
      { nome: "calça de jeans remendado", cor: "#3d7bff" },
      { nome: "saia de guarda-chuva quebrado", cor: "#6d7bff" },
      { nome: "bermuda de lona de caminhão", cor: "#4fc3ff" },
    ] },
    { id: "pes", nome: "os pés", opcoes: [
      { nome: "tênis de sola de pneu", cor: "#1a1a1e" },
      { nome: "bota de câmara de ar", cor: "#3a3a44" },
      { nome: "sandália de cinto velho", cor: "#8a5a2a" },
    ] },
    { id: "acessorio", nome: "o detalhe", opcoes: [
      { nome: "colar de fio de cobre", cor: "#ff9000" },
      { nome: "óculos de tela de celular", cor: "#7fe8ff" },
      { nome: "bolsa de lacres de lata", cor: "#c9d3e6" },
    ] },
  ],
  // o que o Drew diz no desfile (pela quantidade de cores diferentes no look)
  falas: {
    ousado: "isso não é roupa. é manifesto. a cidade inteira vai querer, e não vai achar pra comprar.",
    certo: "lixo nenhum. isso aí é alta costura do subúrbio.",
    calmo: "discreto. mas cada peça tem história. dá pra ver.",
  },
}

// ── (até 30/10) T15 · Drew · a arte antiga, a dança (saiu do mapa; fica pro
// link de teste e pra reaproveitar) ──
// dançar na balada, marcando o ritmo
// as batidas chegam num anel; você bate (toque, espaço) quando ela fecha.
export const DANCA = {
  faixa: "sexta" as PistaId,
  // quantas batidas a música dura até o fim da dança (a música toca por baixo)
  batidas: 24,
  // começa a marcar depois de N batidas (a introdução)
  entrada: 4,
  // a janela do "certo" e do "quase", em ms em volta da batida
  certoMs: 110,
  quaseMs: 220,
  // nada trava: a dança acaba sempre. Abaixo disto o Drew diz "de novo?" e dá pra repetir
  minimo: 0.4,
  // quando o som não toca (aparelho mudo), o relógio segue o bpm da faixa
}

// ── (até 30/10) T18 · Xeriff · a arte antiga, a vinheta da rádio pirata. Desde o
// bloco 1 · A4 a arte dele é a dos esportes: o ping pong (disco/PingPong.tsx),
// que saiu do Drew. A vinheta fica pro link de teste e pra reaproveitar ──
// 4 trilhas, uma escolha em cada; "gravar" toca a vinheta inteira em REC.
export const VINHETA = {
  nome: "RÁDIO PIRATA 222",
  trilhas: [
    { id: "abre", nome: "a abertura", opcoes: ["sirene que desce", "chiado de antena", "três bipes"] },
    { id: "batida", nome: "a batida", opcoes: ["bumbo e caixa", "só o bumbo, devagar", "palmas"] },
    { id: "voz", nome: "a voz", opcoes: ["\"aqui ninguém manda\"", "\"a frequência é nossa\"", "\"222, no ar\""] },
    { id: "fecha", nome: "o fecho", opcoes: ["a sirene subindo", "a fita parando", "um acorde"] },
  ],
}

// ── T23 · Notti · a arte (decidido 30/10): a trilha de 8 bits da máquina ──
// uma grade de 4 vozes × 8 passos, onda quadrada; tocando em loop.
export const TRILHA8 = {
  bpm: 125, // o da DopaminA
  passos: 8,
  // as 4 vozes (de cima pra baixo) e a nota de cada uma (Hz)
  vozes: [
    { nome: "melodia", f: [880, 988, 1047, 1175, 1319, 1175, 1047, 988] },
    { nome: "baixo", f: [110, 110, 131, 131, 147, 147, 131, 131] },
    { nome: "pulso", f: [440, 440, 440, 440, 440, 440, 440, 440] },
    { nome: "ruído", f: [0, 0, 0, 0, 0, 0, 0, 0] },
  ],
  // quantas notas pelo menos pra "gravar na máquina"
  minimo: 6,
}

// ── T23 · Notti · o jogo (decidido): uma máquina do fliperama ──
// qual das 7 máquinas e quantos pontos contam (0 = jogar uma partida basta)
export const MAQUINA = {
  id: "quebra" as "linha9" | "cobra" | "invasores" | "pingue" | "quebra" | "predio" | "atravessa",
  pontosMin: 0,
}

// ── T24 · Nizzy · a arte (decidido 30/10): filmar o clipe vertical da Rollercoaster ──
// 3 câmeras; você corta no tempo da música. O clipe fica com os cortes.
export const CLIPE = {
  faixa: "rollercoaster" as PistaId,
  cortes: 8,
  // um corte vale "no tempo" se cair até esta distância da batida (ms)
  noTempoMs: 160,
  cameras: [
    { id: "a", nome: "a Nizzy de frente" },
    { id: "b", nome: "o trilho de cima" },
    { id: "c", nome: "a cidade passando" },
  ],
}

// ── T25 · Tony Gordo · o jogo (decidido): regar a horta atrás do restaurante ──
export const HORTA = {
  // os canteiros da horta (o que nasce em cada um)
  plantas: ["tomate", "manjericão", "pimenta", "alface", "milho", "abóbora"],
  // quanto de água cada muda precisa (segundos regando)
  regaS: 1.1,
  // regar demais encharca (a muda some um pouco e volta)
  demaisS: 2.4,
}

// ── T25 · Tony Gordo · a arte (decidido 30/10): cozinhar um prato com o que nasceu ──
export const COZINHAR = {
  escolher: 3, // quantos ingredientes vão no prato
  // o fogo: segura até a barra chegar no ponto (0–1); o ponto certo é esta faixa
  ponto: [0.62, 0.82] as [number, number],
  // a velocidade do fogo (barra por segundo)
  fogo: 0.32,
  falas: {
    bom: "…isso tem gosto. faz quanto tempo que eu não sinto gosto de nada?",
    cru: "tá cru, mas é de verdade. melhor que a ração.",
    queimado: "queimou. e mesmo assim tem mais gosto que tudo aqui em cima.",
  },
}

// ── T16 · Mubarak · a arte (decidido): apreciar um disco antigo ──
export const DISCO_ANTIGO = {
  // quantos discos do caixote dele (vinis.json) aparecem pra escolher
  noCaixote: 4,
  // quanto tempo ouvindo até ele falar (s); a agulha dá pra levantar antes
  ouvirS: 12,
  fala: "é isso que eu ponho aqui. ninguém mais ouve. por isso mesmo.",
}

// ── T16 · Mubarak · o jogo (decidido): a sinuca ──
// (proposta) uma partida inteira basta, ganhando ou perdendo: é de leve
export const SINUCA_MISSAO = { precisaVencer: false }
