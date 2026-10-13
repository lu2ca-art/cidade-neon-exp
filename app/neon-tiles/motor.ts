// GUITAR DRIVER — o motor do show (regras, sem desenho).
//
// Notas vêm do chart (public/gd/<faixa>.json, desenhado das stems). Frases:
// as notas se agrupam de 6 em 6; uma frase a cada quatro é de NEON (estrela):
// acertou a frase inteira, o tubo enche um quarto. No duelo, a frase de
// estrela vira um ATAQUE na mão. O som some quando erra (som.ts).

import type { Dificuldade, Instrumento, Rival } from "./dados"
import type { Nota } from "./cena"

export type NotaGd = [number, number, number, number?] // [tempo, trilha, duração, trilha do acorde?]
export interface ChartGd { bpm: number; t0: number; dur: number; guitarra: Partial<Record<Dificuldade, NotaGd[]>>; baixo: Partial<Record<Dificuldade, NotaGd[]>> }

export const JANELA: Record<Dificuldade, number> = { facil: 0.15, medio: 0.125, dificil: 0.105, expert: 0.09 }
export const PERFEITO = 0.045
export const VISIVEL: Record<Dificuldade, number> = { facil: 2.1, medio: 1.75, dificil: 1.45, expert: 1.2 }

export function notasDoChart(c: ChartGd, inst: Instrumento, dif: Dificuldade): Nota[] {
  const lista = c[inst][dif] ?? c[inst].dificil ?? []
  const out: Nota[] = []
  lista.forEach(([t, lane, dur, l2], i) => {
    const frase = Math.floor(i / 6)
    const estrela = frase % 4 === 2
    for (const l of l2 === undefined ? [lane] : [lane, l2]) {
      out.push({ id: out.length, lane: l, t, dur, estrela, frase: estrela ? frase : undefined, acertou: false, errou: false, segurando: false, soltou: false })
    }
  })
  return out
}

// densidade (notas por minuto) pra mostrar o quanto o instrumento toca na faixa
export function densidade(c: ChartGd, inst: Instrumento, dif: Dificuldade) {
  const n = (c[inst][dif] ?? []).length
  return Math.round((n / Math.max(1, c.dur)) * 60)
}

export interface Placar {
  pontos: number
  seq: number
  maxSeq: number
  acertos: number
  perfeitos: number
  total: number
  erros: number
  galera: number // 0..1 (zerou = vaiado)
  neon: number // 0..1 (tubo)
  neonAtivo: number // segundos restantes
  neonUsos: number
}

export function novoPlacar(total = 0): Placar {
  return { pontos: 0, seq: 0, maxSeq: 0, acertos: 0, perfeitos: 0, total, erros: 0, galera: 0.5, neon: 0, neonAtivo: 0, neonUsos: 0 }
}

export const multiplicador = (p: Placar) => Math.min(4, 1 + Math.floor(p.seq / 10)) * (p.neonAtivo > 0 ? 2 : 1)

/* ─── o duelo ───────────────────────────────────────────── */
export type Ataque = "trocadas" | "apagao" | "rapida"
export const NOME_ATAQUE: Record<Ataque, string> = { trocadas: "TRILHAS TROCADAS!", apagao: "APAGÃO!", rapida: "PISTA RÁPIDA!" }

export interface Duelo {
  rival: Rival
  voce: number // 0..1 (1 = você levou; 0 = o rival levou)
  cartas: number // ataques na mão
  ataque: { tipo: Ataque; ate: number } | null // o que o rival jogou em você
  proximo: number // quando o rival ataca de novo
  atordoado: number // até quando o rival erra tudo (o seu ataque)
  ptr: number // a próxima nota que o rival toca
}

export function novoDuelo(rival: Rival): Duelo {
  return { rival, voce: 0.5, cartas: 0, ataque: null, proximo: 14, atordoado: 0, ptr: 0 }
}

// o rival toca a mesma música: cada nota que passa, ele acerta (ou não)
export function andarRival(d: Duelo, notas: Nota[], agora: number) {
  while (d.ptr < notas.length && notas[d.ptr].t <= agora) {
    const acertou = agora > d.atordoado && Math.random() < d.rival.habilidade
    d.voce += acertou ? -0.0055 : 0.02
    d.ptr++
  }
  if (d.ataque && agora > d.ataque.ate) d.ataque = null
  let novo: Ataque | null = null
  if (!d.ataque && agora >= d.proximo) {
    const tipos: Ataque[] = ["trocadas", "apagao", "rapida"]
    novo = tipos[Math.floor(Math.random() * tipos.length)]
    d.ataque = { tipo: novo, ate: agora + 6 }
    d.proximo = agora + 60 / d.rival.ataquesPorMin + Math.random() * 6
  }
  d.voce = Math.max(0, Math.min(1, d.voce))
  return novo
}
