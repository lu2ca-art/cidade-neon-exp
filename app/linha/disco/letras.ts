// A ARTE DA MISSÃO DO LU2CA: ESCREVER A LETRA (T19, 28/10). RASCUNHO
// CONFIGURÁVEL: a arte ainda é "proposta" no retomar-mundo.md (o dono decide).
//
// Como joga: antes de subir no palco, ele escreve a estrofe que vai cantar.
// São 4 versos; em cada um, escolhe um dos 3 pedaços (ou escreve o dele, se
// `livre`). A estrofe escrita fica no save (`letras[faixa]`) e aparece no show,
// embaixo do afinador, enquanto ele canta (a arte vira o show).
//
// Tudo aqui é rascunho: os versos são do Claude, pra o LU2CA reescrever. Pra
// trocar o jogo da letra sem mexer no resto: mude os versos, o número de
// opções, `livre` (deixar escrever) ou `minimo` (quantos versos pra seguir).

import type { PistaId } from "../estrada/pistas"

export interface ConfigLetra {
  titulo: string
  // o que ele pensa antes de escrever (uma linha, no topo)
  mote: string
  // cada verso: a deixa (o que já está escrito antes) e as opções
  versos: { deixa: string; opcoes: string[] }[]
  // deixar escrever o próprio verso (um campo de texto curto)
  livre: boolean
  // quantos versos precisam estar escritos pra subir no palco
  minimo: number
  // o tamanho máximo de um verso escrito à mão
  maxLetras: number
}

// RASCUNHO (Claude, 28/10): a Nectar, o tema da pista é "as flores"
export const LETRAS: Partial<Record<PistaId, ConfigLetra>> = {
  nectar: {
    titulo: "Nectar",
    mote: "o palco tá vazio. antes de subir, escreve o que você vai cantar",
    versos: [
      { deixa: "começa", opcoes: ["a cidade bebe a água que era nossa", "lá em cima ninguém sabe o gosto da chuva", "eu desci sem nada e voltei com uma flor"] },
      { deixa: "e então", opcoes: ["mas a flor ainda abre no concreto", "e o néctar pinga devagar do cano", "cada gota é um verso que eu guardei"] },
      { deixa: "vira", opcoes: ["se a máquina não dorme, eu canto pra ela", "quem planta no deserto não tem pressa", "o neon apaga, a semente fica"] },
      { deixa: "fecha", opcoes: ["e o mel é de quem chega até o fim", "hoje a rua inteira vai florir", "a gente sobe, mas a raiz fica"] },
    ],
    livre: true,
    minimo: 4,
    maxLetras: 48,
  },
}

export const letraDe = (faixa: PistaId | null | undefined): ConfigLetra | null => (faixa ? LETRAS[faixa] ?? null : null)
