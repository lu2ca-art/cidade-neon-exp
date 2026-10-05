// O fio entre a legenda da cena (cena.tsx) e a sala em 3D (Interior.tsx).
//
// A legenda manda pra sala o que está acontecendo: quem está falando, que
// passo é, se tem gesto valendo. A sala manda de volta o que você fez lá
// dentro: tocou num copo, terminou o gesto, mexeu em alguma coisa — e pode
// pedir uma fala (a mulher dos copos responde quando você bebe).

import { useSyncExternalStore } from "react"

export interface EstadoCena {
  // índice do passo atual (muda a cada passo: a sala troca de plano)
  pos: number
  // quem fala agora (null = ação/silêncio)
  falando: string | null
  // o texto na legenda agora (a sala reage a uma ação: "na parede, uma foto")
  texto: string | null
  // o gesto valendo, se a cena parou nele
  gesto: string | null
  // escolha na tela (a câmera vai pra quem perguntou)
  escolha: boolean
  // ganhou alguma coisa (a sala ilumina o objeto)
  ganha: boolean
}

const VAZIO: EstadoCena = { pos: 0, falando: null, texto: null, gesto: null, escolha: false, ganha: false }
let estado: EstadoCena = VAZIO
const ouvintes = new Set<() => void>()

export function publicar(e: EstadoCena) {
  if (e.pos === estado.pos && e.falando === estado.falando && e.texto === estado.texto && e.gesto === estado.gesto && e.escolha === estado.escolha && e.ganha === estado.ganha) return
  estado = e
  ouvintes.forEach((f) => f())
}

export function zerar() { publicar(VAZIO) }

export function useEstadoCena() {
  return useSyncExternalStore(
    (f) => { ouvintes.add(f); return () => { ouvintes.delete(f) } },
    () => estado,
    () => VAZIO,
  )
}

// ── da sala pra legenda ──

export type Sinal =
  | { t: "fim-gesto" } // o gesto em 3D acabou: a cena segue
  | { t: "fala"; de?: string; texto: string; tipo?: "fala" | "acao" } // uma fala solta na legenda
  | { t: "bebeu"; n: number } // o bar: quantos copos já foram (aparece o "negar")

const sinais = new Set<(s: Sinal) => void>()
export function ouvirSala(f: (s: Sinal) => void) { sinais.add(f); return () => { sinais.delete(f) } }
export function sinalizar(s: Sinal) { sinais.forEach((f) => f(s)) }
