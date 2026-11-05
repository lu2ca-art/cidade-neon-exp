// O som de fliperama: onda quadrada, tudo sintetizado. Bipes de ponto, o
// tombo, e um laço de 8 bits de fundo (provisório: as trilhas das faixas do
// LU2CA em 8 bits entram depois).

import { canal, mesaCtx, musicaDoJogoTocando } from "@/lib/mesa"

// (T40b) o contexto e a saída são os da mesa de mixagem (lib/mesa.ts): um só
// no jogo inteiro, com o volume, o mudo e o limitador
export function ac() { return mesaCtx() }
const fx = (c: AudioContext) => canal("efeitos") ?? c.destination

export function bipe(f: number, dur = 0.06, tipo: OscillatorType = "square", vol = 0.12, ate?: number) {
  const c = ac(); if (!c) return
  const t = c.currentTime, o = c.createOscillator(), g = c.createGain()
  o.type = tipo; o.frequency.setValueAtTime(f, t)
  if (ate) o.frequency.exponentialRampToValueAtTime(ate, t + dur)
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  o.connect(g).connect(fx(c)); o.start(t); o.stop(t + dur + 0.02)
}

export const ponto = () => bipe(880, 0.05)
export const tombo = () => bipe(440, 0.6, "square", 0.15, 60)
export const ficha = () => { bipe(988, 0.08); setTimeout(() => bipe(1319, 0.2), 80) }

// laço de fundo: baixo + arpejo, 8 compassos, para quando o jogo para
const NOTAS = [57, 57, 60, 62, 53, 53, 57, 60, 55, 55, 59, 62, 52, 52, 55, 59]
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12)
export function laco(bpm = 132) {
  const c = ac(); if (!c) return () => {}
  // (trilha sonora, 05/11; bíblia 9: a trilha não para) dentro do jogo, com a música
  // dele tocando (a rádio, a faixa da rua), a máquina não toca o laço por cima nem
  // corta nada: a trilha segue. Sem música (ou no /fliperama solto), o laço de sempre
  if (musicaDoJogoTocando()) return () => {}
  const g = c.createGain(); g.gain.value = 0.05; g.connect(canal("musica") ?? c.destination)
  let passo = 0, prox = c.currentTime + 0.05, vivo = true
  const seg = 60 / bpm / 2
  const tic = () => {
    if (!vivo) return
    while (prox < c.currentTime + 0.15) {
      const base = NOTAS[Math.floor(passo / 4) % NOTAS.length]
      const o = c.createOscillator(), e = c.createGain()
      o.type = passo % 2 ? "square" : "triangle"
      o.frequency.value = hz(passo % 2 ? base + 12 + [0, 4, 7, 12][passo % 4] : base - 12)
      e.gain.setValueAtTime(1, prox); e.gain.exponentialRampToValueAtTime(0.01, prox + seg * 0.9)
      o.connect(e).connect(g); o.start(prox); o.stop(prox + seg)
      prox += seg; passo++
    }
    setTimeout(tic, 50)
  }
  tic()
  return () => {
    if (!vivo) return
    vivo = false; g.gain.setTargetAtTime(0, c.currentTime, 0.05)
    setTimeout(() => g.disconnect(), 400)
  }
}
