// ─── timbres tirados das faixas do LU2CA ────────────────────────────────────
// Um golpe de bateria ou UMA nota por arquivo (nunca trecho de música),
// separados das instrumentais lançadas — ver scripts/batida-timbres.py.
// A nota é afinada pelo playbackRate a partir da nota raiz medida. Os
// AudioBuffers são decodificados uma vez e reaproveitados, inclusive no
// render offline (AudioBuffer não pertence a um contexto só).

import { TIMBRES_FAIXAS } from "./timbres-faixas"
import { midiToFreq } from "./theory"
import type { DrumRow, Track } from "./types"

interface NotaDaFaixa { nome: string; pasta: string; arq: string; raiz: number }
interface KitDaFaixa { id: string; nome: string; pasta: string; arqs: Partial<Record<DrumRow, string>> }

// timbres 0-5 de cada instrumento são sintetizados; a partir do 6, vêm daqui
export const PRIMEIRO_DA_FAIXA = 6
export const BAIXOS_DA_FAIXA: readonly NotaDaFaixa[] = TIMBRES_FAIXAS.baixo
export const SYNTHS_DA_FAIXA: readonly NotaDaFaixa[] = TIMBRES_FAIXAS.synth
export const PADS_DA_FAIXA: readonly NotaDaFaixa[] = TIMBRES_FAIXAS.pad
export const KITS_DA_FAIXA: readonly KitDaFaixa[] = TIMBRES_FAIXAS.kits

type Inst = "baixo" | "piano" | "pad"
const listaDe = (inst: Inst) => (inst === "baixo" ? BAIXOS_DA_FAIXA : inst === "pad" ? PADS_DA_FAIXA : SYNTHS_DA_FAIXA)
const url = (pasta: string, arq: string) => `/batida/timbres/${pasta}/${arq}`

const buffers = new Map<string, AudioBuffer>()
const carregando = new Map<string, Promise<void>>()

function carregar(ctx: BaseAudioContext, u: string): Promise<void> {
  if (carregando.has(u)) return carregando.get(u)!
  const p = (async () => {
    try {
      const r = await fetch(u)
      buffers.set(u, await ctx.decodeAudioData(await r.arrayBuffer()))
    } catch {}
  })()
  carregando.set(u, p)
  return p
}

function urlsDaFaixa(t: Track): string[] {
  const d = t.data
  if (d.kind === "drum") {
    const k = KITS_DA_FAIXA.find((x) => x.id === d.timbre)
    return k ? Object.values(k.arqs).map((a) => url(k.pasta, a!)) : []
  }
  if ((d.kind === "bass" || d.kind === "chord") && d.timbre >= PRIMEIRO_DA_FAIXA) {
    const inst: Inst = d.kind === "bass" ? "baixo" : t.instrument === "pad" ? "pad" : "piano"
    const e = listaDe(inst)[d.timbre - PRIMEIRO_DA_FAIXA]
    return e ? [url(e.pasta, e.arq)] : []
  }
  return []
}

export function carregarDaMusica(ctx: BaseAudioContext, tracks: Track[]): Promise<void> {
  return Promise.all(tracks.flatMap(urlsDaFaixa).map((u) => carregar(ctx, u))).then(() => {})
}

export function tocarTimbreDaFaixa(ctx: BaseAudioContext, out: AudioNode, time: number, freq: number, durSec: number, inst: Inst, timbre: number) {
  const e = listaDe(inst)[timbre - PRIMEIRO_DA_FAIXA]
  if (!e) return
  const u = url(e.pasta, e.arq)
  const buf = buffers.get(u)
  if (!buf) { void carregar(ctx, u); return }
  const rate = Math.max(0.25, Math.min(4, freq / midiToFreq(e.raiz)))
  const pad = inst === "pad"
  const ataque = pad ? 0.25 : 0.004
  const solta = pad ? 0.9 : 0.12
  // pad: a nota fica em loop no miolo (a parte estável) enquanto segura
  const fim = pad ? time + durSec + solta : Math.min(time + buf.duration / rate, time + durSec + solta)
  const src = ctx.createBufferSource()
  src.buffer = buf
  if (pad) {
    src.loop = true
    src.loopStart = buf.duration * 0.35
    src.loopEnd = buf.duration * 0.85
  }
  src.playbackRate.setValueAtTime(rate, time)
  const g = ctx.createGain()
  const vol = pad ? 0.32 : 0.7
  g.gain.setValueAtTime(0.0001, time)
  g.gain.linearRampToValueAtTime(vol, time + ataque)
  g.gain.setValueAtTime(vol, Math.max(time + ataque, fim - solta))
  g.gain.linearRampToValueAtTime(0.0001, fim)
  src.connect(g).connect(out)
  src.start(time)
  src.stop(fim + 0.02)
}

// golpe do kit da faixa; false = ainda não carregou (quem chama usa o sintético)
export function tocarGolpe(ctx: BaseAudioContext, out: AudioNode, time: number, kitId: string, row: DrumRow): boolean {
  const k = KITS_DA_FAIXA.find((x) => x.id === kitId)
  const arq = k?.arqs[row]
  if (!k || !arq) return false
  const u = url(k.pasta, arq)
  const buf = buffers.get(u)
  if (!buf) { void carregar(ctx, u); return false }
  const src = ctx.createBufferSource()
  src.buffer = buf
  const g = ctx.createGain()
  g.gain.value = row === "hat" ? 0.55 : 0.85
  src.connect(g).connect(out)
  src.start(time)
  return true
}
