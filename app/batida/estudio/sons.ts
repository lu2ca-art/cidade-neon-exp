// B4TIDA estúdio — os sons. Reaproveita os timbres da v1 (synths.ts, os
// sintetizados e os tirados das faixas) e soma o PACK CIDADE NEON: kits de
// bateria de 8 pads e notas de baixo tirados das stems das faixas lançadas
// (tools/batida/packs.py → public/batida/packs).

import {
  BASS_TIMBRE_LABEL, DRUM_TIMBRES, DRUM_TIMBRE_LABEL, GUITAR_TIMBRE_LABEL, PAD_TIMBRE_LABEL, PIANO_TIMBRE_LABEL,
  triggerBassNote, triggerChordFor, triggerDrum,
} from "../lib/synths"
import { carregarDaMusica } from "../lib/amostras"
import { midiToFreq } from "../lib/theory"
import type { DrumRow, DrumTimbre, Track } from "../lib/types"
import { PADS, type Faixa, type Inst, type Pad } from "./tipos"

/* ─── o pack da cidade ──────────────────────────────────── */
export const PACKS = [
  { id: "chuva", nome: "CHUVA" }, { id: "copo", nome: "COPO AMERICANO" }, { id: "dopamina", nome: "DOPAMINA" },
  { id: "sexta", nome: "SEXTA-FEIRA" }, { id: "ontem", nome: "SABE ONTEM?" }, { id: "nectar", nome: "NECTAR" },
]
type Indice = Record<string, { pads: Pad[]; baixo: number | null }>
let indice: Indice | null = null
let indiceP: Promise<Indice | null> | null = null
function carregarIndice() {
  indiceP ??= fetch("/batida/packs/kits.json").then((r) => r.json()).then((j: Indice) => (indice = j)).catch(() => null)
  return indiceP
}

const buffers = new Map<string, AudioBuffer>()
const carregando = new Map<string, Promise<AudioBuffer | null>>()
function buf(ctx: BaseAudioContext, url: string) {
  if (!carregando.has(url)) {
    carregando.set(url, fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject())).then((a) => ctx.decodeAudioData(a)).then((b) => { buffers.set(url, b); return b }).catch(() => null))
  }
  return carregando.get(url)!
}
const urlPad = (pack: string, pad: Pad) => `/batida/packs/${pack}-${pad}.wav`
const urlBaixo = (pack: string) => `/batida/packs/${pack}-baixo.wav`

/* ─── catálogo de sons por instrumento ──────────────────── */
// "pack:<faixa>" = kit/nota da cidade · "s:<n>" = timbre da v1 (n = índice) · "k:<kit>" = kit da v1
export function sonsDe(inst: Inst): { id: string; nome: string; cidade?: boolean }[] {
  if (inst === "bateria") return [
    ...PACKS.map((p) => ({ id: `pack:${p.id}`, nome: `kit ${p.nome.toLowerCase()}`, cidade: true })),
    ...DRUM_TIMBRES.map((t) => ({ id: `k:${t}`, nome: (DRUM_TIMBRE_LABEL[t] ?? t).toLowerCase() })),
  ]
  if (inst === "baixo") return [
    ...PACKS.map((p) => ({ id: `pack:${p.id}`, nome: `baixo de ${p.nome.toLowerCase()}`, cidade: true })),
    ...BASS_TIMBRE_LABEL.map((n, i) => ({ id: `s:${i}`, nome: n.toLowerCase() })),
  ]
  const lista = inst === "guitarra" ? GUITAR_TIMBRE_LABEL : inst === "pad" ? PAD_TIMBRE_LABEL : PIANO_TIMBRE_LABEL
  if (inst === "voz") return [{ id: "voz", nome: "microfone" }]
  return lista.map((n, i) => ({ id: `s:${i}`, nome: String(n).toLowerCase() }))
}
export const nomeDoSom = (f: Faixa) => sonsDe(f.inst).find((s) => s.id === f.som)?.nome ?? f.som

// carrega antes de tocar o que a música usa (pra o primeiro golpe não sair mudo)
export async function precarregar(ctx: BaseAudioContext, faixas: Faixa[]) {
  await carregarIndice()
  const ps: Promise<unknown>[] = []
  const velhas: Track[] = []
  for (const f of faixas) {
    const [tipo, id] = f.som.split(":")
    if (tipo === "pack" && indice?.[id]) {
      if (f.inst === "bateria") for (const p of indice[id].pads) ps.push(buf(ctx, urlPad(id, p)))
      if (f.inst === "baixo" && indice[id].baixo) ps.push(buf(ctx, urlBaixo(id)))
    }
    if (tipo === "k" && id.startsWith("faixa-")) velhas.push({ id: f.id, instrument: "bateria", fx: { volume: 1, reverb: 0, delay: 0, muted: false }, data: { kind: "drum", timbre: id as DrumTimbre, bars: 1, cells: { kick: [], snare: [], hat: [], perc: [] } } })
    if (tipo === "s" && Number(id) >= 6 && f.inst !== "guitarra" && f.inst !== "voz") {
      velhas.push(f.inst === "baixo"
        ? { id: f.id, instrument: "baixo", fx: { volume: 1, reverb: 0, delay: 0, muted: false }, data: { kind: "bass", timbre: Number(id), bars: 1, cells: [] } }
        : { id: f.id, instrument: f.inst === "pad" ? "pad" : "piano", fx: { volume: 1, reverb: 0, delay: 0, muted: false }, data: { kind: "chord", timbre: Number(id), bars: 1, steps: [] } })
    }
  }
  ps.push(carregarDaMusica(ctx, velhas))
  await Promise.all(ps)
}

/* ─── tocar ─────────────────────────────────────────────── */
const ROW_V1: Record<Pad, DrumRow> = { bumbo: "kick", caixa: "snare", chimbal: "hat", aberto: "hat", palma: "snare", perc: "perc", tom: "perc", prato: "hat" }

function comForca(ctx: BaseAudioContext, out: AudioNode, v: number) {
  const g = ctx.createGain()
  g.gain.value = v
  g.connect(out)
  return g
}

function amostra(ctx: BaseAudioContext, out: AudioNode, b: AudioBuffer, t: number, rate = 1, dur?: number, ganho = 1) {
  const s = ctx.createBufferSource()
  s.buffer = b
  s.playbackRate.value = rate
  const g = ctx.createGain()
  g.gain.value = ganho
  s.connect(g).connect(out)
  s.start(t)
  if (dur !== undefined) {
    g.gain.setValueAtTime(ganho, t + dur)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12)
    s.stop(t + dur + 0.14)
  }
}

// golpes extras que a v1 não tinha (quando o kit não tem aquele pad)
function extra(ctx: BaseAudioContext, out: AudioNode, t: number, pad: Pad) {
  const n = ctx.createBufferSource()
  const len = pad === "prato" ? 1.6 : pad === "aberto" ? 0.5 : 0.25
  const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  n.buffer = b
  const f = ctx.createBiquadFilter()
  const g = ctx.createGain()
  if (pad === "palma") {
    f.type = "bandpass"; f.frequency.value = 1600; f.Q.value = 1.2
    // três batidas rápidas = palma
    g.gain.setValueAtTime(0, t)
    for (const k of [0, 0.012, 0.024]) { g.gain.setValueAtTime(0.9, t + k); g.gain.exponentialRampToValueAtTime(0.2, t + k + 0.01) }
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
  } else if (pad === "tom") {
    const o = ctx.createOscillator(); const og = ctx.createGain()
    o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.3)
    og.gain.setValueAtTime(0.8, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
    o.connect(og).connect(out); o.start(t); o.stop(t + 0.42)
    return
  } else {
    f.type = "highpass"; f.frequency.value = pad === "prato" ? 5000 : 7000
    g.gain.setValueAtTime(pad === "prato" ? 0.5 : 0.4, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + len)
  }
  n.connect(f).connect(g).connect(out)
  n.start(t)
  n.stop(t + len)
}

export function tocarPad(ctx: BaseAudioContext, out: AudioNode, t: number, som: string, i: number, v: number) {
  const pad = PADS[i]
  const o = comForca(ctx, out, 0.25 + v * 0.75)
  const [tipo, id] = som.split(":")
  if (tipo === "pack") {
    const b = buffers.get(urlPad(id, pad))
    if (b) { amostra(ctx, o, b, t, 1, undefined, pad === "chimbal" ? 0.7 : 0.95); return }
    void carregarIndice().then(() => { if (indice?.[id]?.pads.includes(pad)) void buf(ctx, urlPad(id, pad)) })
  }
  if (pad === "palma" || pad === "tom" || pad === "prato" || pad === "aberto") {
    if (tipo !== "pack" || !indice?.[id]?.pads.includes(pad)) { extra(ctx, o, t, pad); return }
  }
  const kit = (tipo === "k" ? id : "acustico") as DrumTimbre
  triggerDrum(ctx, o, t, ROW_V1[pad], kit)
}

export function tocarNota(ctx: BaseAudioContext, out: AudioNode, t: number, inst: Inst, som: string, midis: number[], dur: number, v: number) {
  const o = comForca(ctx, out, 0.3 + v * 0.7)
  const [tipo, id] = som.split(":")
  if (inst === "baixo") {
    if (tipo === "pack") {
      const b = buffers.get(urlBaixo(id))
      const raiz = indice?.[id]?.baixo
      if (b && raiz) { for (const m of midis) amostra(ctx, o, b, t, Math.pow(2, (m - raiz) / 12), Math.max(0.12, dur), 1); return }
      void precarregar(ctx, [{ id: "x", inst: "baixo", som, vol: 1, pan: 0, reverb: 0, delay: 0, mudo: false, solo: false }])
    }
    for (const m of midis) triggerBassNote(ctx, o, t, midiToFreq(m), Math.max(0.1, dur), tipo === "s" ? Number(id) : 1)
    return
  }
  const instV1 = inst === "teclas" ? "piano" : inst
  triggerChordFor(instV1, ctx, o, t, midis.map(midiToFreq), Math.max(0.12, dur), tipo === "s" ? Number(id) : 0)
}
