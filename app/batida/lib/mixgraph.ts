// ─── grafo de mixagem compartilhado ─────────────────────────────────────────
// Usado tanto pelo motor ao vivo (engine.ts, AudioContext) quanto pelo render
// offline pro export (render.ts, OfflineAudioContext) — garante que o que a
// pessoa ouve ao vivo é exatamente o que sai no áudio exportado.

import { createImpulseResponse } from "./dsp"
import { chordStepMidiNotes, degreeToMidi, midiToFreq } from "./theory"
import { triggerDrum, triggerBassNote, triggerGuitarChord, triggerPianoChord } from "./synths"
import { DRUM_ROWS, type MusicMode, type Track } from "./types"

export interface MixBus {
  master: GainNode
  masterVolume: GainNode
  reverbBus: ConvolverNode
  delayBus: DelayNode
}

export function createMixBus(ctx: BaseAudioContext): MixBus {
  const master = ctx.createGain()
  master.gain.value = 0.9

  // compressor suave no barramento master — evita estourar quando várias
  // faixas tocam juntas ("masterização" básica, sempre ativa)
  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -6
  limiter.knee.value = 12
  limiter.ratio.value = 4
  limiter.attack.value = 0.003
  limiter.release.value = 0.25

  const masterVolume = ctx.createGain()
  masterVolume.gain.value = 1

  master.connect(limiter)
  limiter.connect(masterVolume)
  masterVolume.connect(ctx.destination)

  const reverbBus = ctx.createConvolver()
  reverbBus.buffer = createImpulseResponse(ctx, 2.2, 2.4)
  const reverbWet = ctx.createGain()
  reverbWet.gain.value = 0.9
  reverbBus.connect(reverbWet).connect(master)

  const delayBus = ctx.createDelay(1.2)
  delayBus.delayTime.value = 0.28
  const feedback = ctx.createGain()
  feedback.gain.value = 0.34
  const delayWet = ctx.createGain()
  delayWet.gain.value = 0.75
  delayBus.connect(feedback)
  feedback.connect(delayBus)
  delayBus.connect(delayWet).connect(master)

  return { master, masterVolume, reverbBus, delayBus }
}

export function buildOneShotChain(ctx: BaseAudioContext, bus: MixBus, fx: Track["fx"]): GainNode {
  const gain = ctx.createGain()
  gain.gain.value = fx.muted ? 0 : fx.volume
  gain.connect(bus.master)
  if (fx.reverb > 0) {
    const send = ctx.createGain()
    send.gain.value = fx.reverb
    gain.connect(send)
    send.connect(bus.reverbBus)
  }
  if (fx.delay > 0) {
    const send = ctx.createGain()
    send.gain.value = fx.delay
    gain.connect(send)
    send.connect(bus.delayBus)
  }
  return gain
}

export const TICKS_PER_BAR = 16

export function secPerBar(bpm: number) { return (60 / bpm) * 4 }
export function secPerTick(bpm: number) { return secPerBar(bpm) / TICKS_PER_BAR }

interface SongCtx { bpm: number; rootNote: number; mode: MusicMode }

// agenda os disparos de UMA faixa sequenciada (bateria/baixo/acorde) num tick
// GLOBAL (contínuo, nunca reinicia em 0 a cada compasso) — não cobre faixas
// de voz (essas usam AudioBufferSource com loop nativo, montado à parte).
// Cada faixa pode ter seu próprio número de compassos (data.bars): o tick
// global é reduzido módulo o tamanho do PADRÃO daquela faixa, não do
// compasso — assim uma progressão de acordes de 4 compassos não fica
// espremida dentro de 1 compasso só, e continua alinhada com faixas de 1
// compasso (drum/baixo) porque todas compartilham o mesmo tick 0 de origem.
export function scheduleTrackTick(ctx: BaseAudioContext, bus: MixBus, song: SongCtx, track: Track, globalTick: number, time: number) {
  if (track.fx.muted) return
  const data = track.data
  const dur = secPerTick(song.bpm)

  if (data.kind === "drum") {
    const patternTicks = (data.bars ?? 1) * TICKS_PER_BAR
    const localTick = globalTick % patternTicks
    if (localTick % 2 !== 0) return
    const stepIdx = localTick / 2
    const out = buildOneShotChain(ctx, bus, track.fx)
    DRUM_ROWS.forEach((row) => {
      if (data.cells[row.id][stepIdx]) triggerDrum(ctx, out, time, row.id, data.timbre)
    })
    return
  }

  if (data.kind === "bass") {
    const patternTicks = (data.bars ?? 1) * TICKS_PER_BAR
    const stepIdx = globalTick % patternTicks
    for (let degree = 0; degree < 7; degree++) {
      if (data.cells[degree]?.[stepIdx]) {
        const out = buildOneShotChain(ctx, bus, track.fx)
        const midi = degreeToMidi(song.rootNote, song.mode, degree, 2)
        triggerBassNote(ctx, out, time, midiToFreq(midi), dur * 0.9, data.timbre)
      }
    }
    return
  }

  if (data.kind === "chord") {
    const patternTicks = (data.bars ?? 1) * TICKS_PER_BAR
    const stepIdx = globalTick % patternTicks
    const octave = track.instrument === "guitarra" ? 3 : 4
    const midiNotes = chordStepMidiNotes(data.steps[stepIdx], song.rootNote, song.mode, octave)
    if (!midiNotes) return
    const out = buildOneShotChain(ctx, bus, track.fx)
    const freqs = midiNotes.map(midiToFreq)
    const ringDur = dur * 4
    if (track.instrument === "guitarra") triggerGuitarChord(ctx, out, time, freqs, ringDur, data.timbre)
    else triggerPianoChord(ctx, out, time, freqs, ringDur, data.timbre)
  }
}
