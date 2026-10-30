// O SOM DO TAMBOR (T06, 30/10): amostras de djembê de verdade, que mudam com
// ONDE e COM QUE FORÇA a mão bate.
//
// Onde (r: 0 = centro, 1 = borda): no centro, o grave (a palma inteira); no
// meio pra borda, o tom (os dedos juntos); bem na borda, o tapa (estala). Entre
// um e outro as amostras se misturam, então não tem degrau.
// Força (0–1): volume e brilho (um filtro abre com a força) e a pele afina um
// tiquinho pra cima quando bate forte, como no tambor de verdade.
//
// As amostras (public/tambor/*.mp3, 88 KB no total) são do "African Kit" do
// GarageBand/Logic (o djembê grave: LDJ_PBL, LDJ_OTL, LDJ_SLL), cortadas e
// comprimidas. Provisórias: o dono vai mandar o sample dele (lista-mestra T06).
// Sem atraso: tudo é baixado e decodificado ANTES do minijogo (carregarTambor,
// chamado quando a casa abre) e cada toque é só um AudioBufferSourceNode.
// Enquanto não carregou (ou se falhar), toca o sintetizado antigo.

import { audioCtx, saidaSom } from "../som"

export type Golpe = "grave" | "tom" | "tapa"
const AMOSTRAS: Record<Golpe, string[]> = {
  grave: ["/tambor/grave-1.mp3", "/tambor/grave-2.mp3"],
  tom: ["/tambor/tom-1.mp3", "/tambor/tom-2.mp3"],
  tapa: ["/tambor/tapa-1.mp3", "/tambor/tapa-2.mp3"],
}
// o volume de cada golpe (o grave da amostra é bem mais cheio)
const NIVEL: Record<Golpe, number> = { grave: 0.85, tom: 1, tapa: 0.95 }

// onde cada golpe mora no tambor (r), pra quem toca por tecla e pra ela
export const R_GOLPE: Record<Golpe, number> = { grave: 0.08, tom: 0.66, tapa: 0.96 }

type Buf = { b: AudioBuffer; ini: number }
const bufs: Partial<Record<Golpe, Buf[]>> = {}
let carregando: Promise<boolean> | null = null
let roda = 0

// onde o som começa de verdade (o mp3 põe um silêncio no começo): pula ele
function inicio(b: AudioBuffer) {
  const d = b.getChannelData(0)
  for (let i = 0; i < Math.min(d.length, 8000); i++) if (Math.abs(d[i]) > 0.01) return Math.max(0, i - 16) / b.sampleRate
  return 0
}

export function carregarTambor(): Promise<boolean> {
  if (carregando) return carregando
  const c = audioCtx()
  if (!c) return Promise.resolve(false)
  carregando = Promise.all(
    (Object.keys(AMOSTRAS) as Golpe[]).map(async (g) => {
      bufs[g] = await Promise.all(AMOSTRAS[g].map(async (u) => {
        const r = await fetch(u)
        if (!r.ok) throw new Error(u)
        const b = await c.decodeAudioData(await r.arrayBuffer())
        return { b, ini: inicio(b) }
      }))
    }),
  ).then(() => true, () => { carregando = null; return false })
  return carregando
}
export const tamborPronto = () => !!(bufs.grave && bufs.tom && bufs.tapa)

const liso = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
// quanto de cada golpe soa num ponto r (soma ~1)
export function mistura(r: number, forca: number): Record<Golpe, number> {
  const grave = 1 - liso(0.22, 0.52, r)
  // o tapa precisa de mão firme: fraco na borda vira tom
  const tapa = liso(0.8, 0.95, r) * (0.35 + 0.65 * forca)
  const tom = Math.max(0, 1 - grave - tapa)
  return { grave, tom, tapa }
}

type Fonte = AudioScheduledSourceNode
// um toque: `r` onde (0 centro, 1 borda), `forca` 0–1, `torto` 0–1 (fora do
// tempo: abafado e desafinado). Devolve as fontes (pra parar) ou null se as
// amostras ainda não chegaram
export function baterAmostra(quando: number, r: number, forca: number, torto = 0, vol = 0.8): Fonte[] | null {
  const c = audioCtx()
  const out = saidaSom()
  if (!c || !out || !tamborPronto()) return null
  const t = Math.max(quando, c.currentTime)
  const f = Math.min(1, Math.max(0, forca))
  const bus = c.createGain()
  bus.gain.value = vol * (0.22 + 0.78 * Math.pow(f, 1.4)) * (1 - 0.3 * torto)
  // o brilho: fraco é abafado, forte abre tudo; o torto fecha
  const lp = c.createBiquadFilter()
  lp.type = "lowpass"
  lp.frequency.value = (700 + 11000 * Math.pow(f, 1.6)) * (1 - 0.75 * torto)
  lp.Q.value = 0.5
  bus.connect(lp).connect(out)
  const taxa = (1 - 0.14 * torto) * (0.985 + 0.03 * f) * (1 + (Math.random() - 0.5) * 0.012)
  const m = mistura(r, f)
  roda++
  const fontes: Fonte[] = []
  for (const g of ["grave", "tom", "tapa"] as const) {
    if (m[g] < 0.04) continue
    const lista = bufs[g]!
    const { b, ini } = lista[roda % lista.length]
    const s = c.createBufferSource()
    s.buffer = b
    s.playbackRate.value = taxa
    const gg = c.createGain()
    gg.gain.value = m[g] * NIVEL[g]
    s.connect(gg).connect(bus)
    s.start(t, ini)
    fontes.push(s)
  }
  return fontes
}
