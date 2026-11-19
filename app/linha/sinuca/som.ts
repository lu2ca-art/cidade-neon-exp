// A SINUCA (T17): os sons, todos sintetizados no Web Audio (nada pra baixar),
// saindo pelo mesmo mestre do jogo (respeita o volume dos efeitos e o mudo).
// O "clac" da bola é um estalo curto com dois parciais agudos inarmônicos +
// um ruído bem curto; a tabela é um "tum" abafado; a caçapa, o baque e o
// chocalho da bola descendo.

import { audioCtx, saidaSom } from "../som"

let ruido: AudioBuffer | null = null
function bufRuido(c: AudioContext) {
  if (ruido && ruido.sampleRate === c.sampleRate) return ruido
  const b = c.createBuffer(1, Math.floor(c.sampleRate * 0.4), c.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  ruido = b
  return b
}

function env(c: AudioContext, t: number, pico: number, dur: number, ataque = 0.001) {
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, pico), t + ataque)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  return g
}

function tom(c: AudioContext, out: AudioNode, t: number, f: number, pico: number, dur: number, tipo: OscillatorType = "sine", fFim?: number) {
  const o = c.createOscillator()
  o.type = tipo
  o.frequency.setValueAtTime(f, t)
  if (fFim) o.frequency.exponentialRampToValueAtTime(fFim, t + dur)
  o.connect(env(c, t, pico, dur)).connect(out)
  o.start(t); o.stop(t + dur + 0.02)
}

function chiado(c: AudioContext, out: AudioNode, t: number, tipo: BiquadFilterType, f: number, q: number, pico: number, dur: number) {
  const n = c.createBufferSource()
  n.buffer = bufRuido(c)
  const fl = c.createBiquadFilter()
  fl.type = tipo; fl.frequency.value = f; fl.Q.value = q
  n.connect(fl).connect(env(c, t, pico, dur)).connect(out)
  n.start(t, Math.random() * 0.3, dur + 0.02)
}

const forca = (v: number, ref: number) => Math.min(1, Math.pow(v / ref, 0.8))

// bola com bola: v = velocidade do choque (m/s)
export function somBola(v: number) {
  const c = audioCtx(), out = saidaSom()
  if (!c || !out || v < 0.03) return
  const t = c.currentTime + 0.005
  const k = forca(v, 3.5)
  const af = 1 + (Math.random() - 0.5) * 0.06
  tom(c, out, t, 3150 * af, 0.32 * k, 0.045)
  tom(c, out, t, 5350 * af, 0.16 * k, 0.03)
  tom(c, out, t, 1450 * af, 0.08 * k, 0.06)
  chiado(c, out, t, "highpass", 2500, 0.7, 0.18 * k, 0.012)
}

// na tabela: o tum da borracha
export function somTabela(v: number) {
  const c = audioCtx(), out = saidaSom()
  if (!c || !out || v < 0.05) return
  const t = c.currentTime + 0.005
  const k = forca(v, 3)
  tom(c, out, t, 140, 0.35 * k, 0.12, "sine", 90)
  chiado(c, out, t, "lowpass", 520, 0.8, 0.3 * k, 0.07)
}

// caiu na caçapa: o baque e o chocalho descendo
export function somCacapa(v: number) {
  const c = audioCtx(), out = saidaSom()
  if (!c || !out) return
  const t = c.currentTime + 0.005
  const k = 0.5 + 0.5 * forca(v, 2)
  chiado(c, out, t, "bandpass", 1800, 1.5, 0.12 * k, 0.03)
  tom(c, out, t + 0.03, 95, 0.5 * k, 0.18, "sine", 60)
  chiado(c, out, t + 0.03, "lowpass", 300, 1, 0.35 * k, 0.1)
  // o chocalho
  for (let i = 0; i < 4; i++) {
    const ti = t + 0.14 + i * (0.05 + Math.random() * 0.04)
    tom(c, out, ti, 900 + Math.random() * 500, 0.06 * k * (1 - i * 0.2), 0.04)
    chiado(c, out, ti, "bandpass", 1200, 2, 0.05 * k, 0.03)
  }
}

// o taco na branca
export function somTaco(f: number) {
  const c = audioCtx(), out = saidaSom()
  if (!c || !out) return
  const t = c.currentTime + 0.005
  const k = 0.3 + 0.7 * f
  tom(c, out, t, 1050, 0.22 * k, 0.05, "triangle", 700)
  chiado(c, out, t, "bandpass", 2200, 1.2, 0.2 * k, 0.025)
  tom(c, out, t, 260, 0.12 * k, 0.07)
}

// um tiquinho ao mirar (o taco encostando no giz), bem baixo
export function somClique() {
  const c = audioCtx(), out = saidaSom()
  if (!c || !out) return
  chiado(c, out, c.currentTime + 0.003, "bandpass", 3500, 3, 0.04, 0.015)
}

// acorda o áudio no primeiro toque (política de autoplay)
export function acordarSom() { const c = audioCtx(); if (c) bufRuido(c) }
