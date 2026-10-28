// AS PEÇAS DAS MISSÕES DAS PESSOAS (T15, T18, T23, T24, T25, T16 — 28/10).
// Tudo o que é RASCUNHO mora aqui, num lugar só: o dono decide, a gente troca
// o número (ou o texto) sem mexer no resto. As artes marcadas "proposta" no
// retomar-mundo.md (a dança do Drew, a vinheta do Xeriff, a trilha 8 bits do
// Notti, o clipe da Nizzy, o prato do Tony) jogam assim até ele aprovar.

import type { PistaId } from "../../estrada/pistas"

// ── T15 · Drew · a arte (PROPOSTA): dançar na balada, marcando o ritmo ──
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

// ── T18 · Xeriff · a arte (PROPOSTA): gravar a vinheta da rádio pirata ──
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

// ── T23 · Notti · a arte (PROPOSTA): a trilha de 8 bits da máquina ──
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

// ── T24 · Nizzy · a arte (PROPOSTA): filmar o clipe vertical da Rollercoaster ──
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

// ── T25 · Tony Gordo · a arte (PROPOSTA): cozinhar um prato com o que nasceu ──
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
