// ─── síntese por instrumento e timbre ───────────────────────────────────────
// Cada instrumento tem 4 timbres fixos, e cada timbre carrega um efeito
// específico embutido na própria síntese (não é só EQ diferente). Todas as
// funções recebem (ctx, out, time, ...) e nunca leem ctx.currentTime — assim
// funcionam idêntico em AudioContext (ao vivo) e OfflineAudioContext (export).

import type { DrumRow, DrumTimbre } from "./types"
import { createDistortion, createImpulseResponse, scheduleLfo } from "./dsp"

// ─── BATERIA (4 kits — mesma técnica do B4TIDA original) ───────────────────

export const DRUM_TIMBRES: DrumTimbre[] = ["sintetico", "808", "acustico", "lofi"]
export const DRUM_TIMBRE_LABEL: Record<DrumTimbre, string> = {
  sintetico: "SINTÉTICO",
  "808": "808",
  acustico: "ACÚSTICO",
  lofi: "LO-FI",
}
export const DRUM_TIMBRE_EFFECT: Record<DrumTimbre, string> = {
  sintetico: "limpo, sem efeito",
  "808": "saturação no sub",
  acustico: "reverb de sala curta",
  lofi: "bitcrush + lowpass",
}

const DRUM_KIT_PARAMS: Record<DrumTimbre, {
  kick: { freqStart: number; freqEnd: number; decay: number }
  snare: { durSec: number; filter: BiquadFilterType; cutoff: number; decay: number }
  hat: { durSec: number; filter: BiquadFilterType; cutoff: number; decay: number }
  perc: { freqStart: number; freqEnd: number; decay: number; wave: OscillatorType }
}> = {
  sintetico: {
    kick: { freqStart: 150, freqEnd: 45, decay: 0.2 },
    snare: { durSec: 0.2, filter: "highpass", cutoff: 1200, decay: 0.18 },
    hat: { durSec: 0.06, filter: "highpass", cutoff: 6000, decay: 0.05 },
    perc: { freqStart: 520, freqEnd: 300, decay: 0.12, wave: "triangle" },
  },
  "808": {
    kick: { freqStart: 95, freqEnd: 32, decay: 0.34 },
    snare: { durSec: 0.22, filter: "bandpass", cutoff: 1800, decay: 0.14 },
    hat: { durSec: 0.05, filter: "highpass", cutoff: 8500, decay: 0.04 },
    perc: { freqStart: 180, freqEnd: 90, decay: 0.16, wave: "sine" },
  },
  acustico: {
    kick: { freqStart: 130, freqEnd: 55, decay: 0.22 },
    snare: { durSec: 0.22, filter: "bandpass", cutoff: 900, decay: 0.2 },
    hat: { durSec: 0.07, filter: "highpass", cutoff: 5000, decay: 0.07 },
    perc: { freqStart: 700, freqEnd: 500, decay: 0.1, wave: "triangle" },
  },
  lofi: {
    kick: { freqStart: 110, freqEnd: 40, decay: 0.36 },
    snare: { durSec: 0.24, filter: "lowpass", cutoff: 2200, decay: 0.28 },
    hat: { durSec: 0.08, filter: "lowpass", cutoff: 4000, decay: 0.09 },
    perc: { freqStart: 400, freqEnd: 260, decay: 0.18, wave: "sine" },
  },
}

function drumVoiceOut(ctx: BaseAudioContext, out: AudioNode, timbre: DrumTimbre): AudioNode {
  // efeito específico embutido por timbre
  if (timbre === "808") {
    const drive = createDistortion(ctx, 0.35)
    drive.connect(out)
    return drive
  }
  if (timbre === "acustico") {
    const conv = ctx.createConvolver()
    conv.buffer = createImpulseResponse(ctx, 0.6, 2.2)
    const wet = ctx.createGain()
    wet.gain.value = 0.35
    const dry = ctx.createGain()
    dry.gain.value = 0.85
    conv.connect(wet).connect(out)
    dry.connect(out)
    const split = ctx.createGain()
    split.connect(conv)
    split.connect(dry)
    return split
  }
  if (timbre === "lofi") {
    const crush = createDistortion(ctx, 0.12)
    const lp = ctx.createBiquadFilter()
    lp.type = "lowpass"
    lp.frequency.value = 3200
    crush.connect(lp).connect(out)
    return crush
  }
  return out
}

function triggerKick(ctx: BaseAudioContext, out: AudioNode, time: number, p: typeof DRUM_KIT_PARAMS.sintetico.kick) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = "sine"
  osc.frequency.setValueAtTime(p.freqStart, time)
  osc.frequency.exponentialRampToValueAtTime(p.freqEnd, time + p.decay * 0.7)
  gain.gain.setValueAtTime(0.9, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + p.decay)
  osc.connect(gain).connect(out)
  osc.start(time)
  osc.stop(time + p.decay + 0.02)
}

function triggerNoise(ctx: BaseAudioContext, out: AudioNode, time: number, p: { durSec: number; filter: BiquadFilterType; cutoff: number; decay: number }, vol: number) {
  const bufferSize = Math.floor(ctx.sampleRate * p.durSec)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = p.filter
  filter.frequency.value = p.cutoff
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(vol, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + p.decay)
  noise.connect(filter).connect(gain).connect(out)
  noise.start(time)
}

function triggerPerc(ctx: BaseAudioContext, out: AudioNode, time: number, p: typeof DRUM_KIT_PARAMS.sintetico.perc) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = p.wave
  osc.frequency.setValueAtTime(p.freqStart, time)
  osc.frequency.exponentialRampToValueAtTime(p.freqEnd, time + p.decay * 0.6)
  gain.gain.setValueAtTime(0.5, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + p.decay)
  osc.connect(gain).connect(out)
  osc.start(time)
  osc.stop(time + p.decay + 0.02)
}

export function triggerDrum(ctx: BaseAudioContext, out: AudioNode, time: number, row: DrumRow, timbre: DrumTimbre) {
  const p = DRUM_KIT_PARAMS[timbre]
  const voiceOut = drumVoiceOut(ctx, out, timbre)
  if (row === "kick") triggerKick(ctx, voiceOut, time, p.kick)
  else if (row === "snare") triggerNoise(ctx, voiceOut, time, p.snare, 0.6)
  else if (row === "hat") triggerNoise(ctx, voiceOut, time, p.hat, 0.35)
  else triggerPerc(ctx, voiceOut, time, p.perc)
}

// ─── BAIXO (4 timbres) ───────────────────────────────────────────────────

export const BASS_TIMBRE_LABEL = ["SINTÉTICO", "SUB 808", "DEDILHADO", "FUNK"] as const
export const BASS_TIMBRE_EFFECT = [
  "limpo, sem efeito",
  "saturação (drive)",
  "filtro em decaimento (pluck)",
  "auto-wah (filtro em LFO)",
] as const

export function triggerBassNote(ctx: BaseAudioContext, out: AudioNode, time: number, freq: number, durSec: number, timbre: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, time)

  if (timbre === 0) {
    // sintético — triangle limpo
    osc.type = "triangle"
    osc.frequency.setValueAtTime(freq, time)
    gain.gain.exponentialRampToValueAtTime(0.55, time + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, time + durSec)
    osc.connect(gain).connect(out)
  } else if (timbre === 1) {
    // sub 808 — sine grave + saturação
    osc.type = "sine"
    osc.frequency.setValueAtTime(freq * 0.5, time)
    gain.gain.exponentialRampToValueAtTime(0.7, time + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.001, time + durSec * 1.2)
    const drive = createDistortion(ctx, 0.4)
    osc.connect(gain).connect(drive).connect(out)
  } else if (timbre === 2) {
    // dedilhado — pluck: decaimento rápido + filtro fechando
    osc.type = "sawtooth"
    osc.frequency.setValueAtTime(freq, time)
    gain.gain.exponentialRampToValueAtTime(0.6, time + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.001, time + durSec * 0.7)
    const filter = ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.setValueAtTime(3000, time)
    filter.frequency.exponentialRampToValueAtTime(200, time + durSec * 0.6)
    osc.connect(filter).connect(gain).connect(out)
  } else {
    // funk — auto-wah via bandpass em LFO
    osc.type = "square"
    osc.frequency.setValueAtTime(freq, time)
    gain.gain.exponentialRampToValueAtTime(0.4, time + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, time + durSec)
    const filter = ctx.createBiquadFilter()
    filter.type = "bandpass"
    filter.Q.value = 6
    scheduleLfo(filter.frequency, time, durSec, { rateHz: 5, base: 900, depth: 700 })
    osc.connect(filter).connect(gain).connect(out)
  }

  osc.start(time)
  osc.stop(time + durSec + 0.1)
}

// ─── GUITARRA (4 timbres) ───────────────────────────────────────────────

export const GUITAR_TIMBRE_LABEL = ["LIMPA", "ACÚSTICA", "DISTORÇÃO", "ABAFADA"] as const
export const GUITAR_TIMBRE_EFFECT = [
  "chorus leve (duplo oscilador)",
  "reverb curto embutido",
  "distorção (drive)",
  "palm mute (filtro + decay curto)",
] as const

function triggerGuitarString(ctx: BaseAudioContext, out: AudioNode, time: number, freq: number, durSec: number, timbre: number) {
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, time)

  if (timbre === 0) {
    // limpa — dois osciladores levemente destafinados (chorus)
    const oscA = ctx.createOscillator()
    const oscB = ctx.createOscillator()
    oscA.type = "sawtooth"
    oscB.type = "sawtooth"
    oscA.frequency.setValueAtTime(freq, time)
    oscB.frequency.setValueAtTime(freq, time)
    oscA.detune.setValueAtTime(-7, time)
    oscB.detune.setValueAtTime(7, time)
    const lp = ctx.createBiquadFilter()
    lp.type = "lowpass"
    lp.frequency.value = 2600
    gain.gain.exponentialRampToValueAtTime(0.35, time + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, time + durSec)
    oscA.connect(lp)
    oscB.connect(lp)
    lp.connect(gain).connect(out)
    oscA.start(time); oscB.start(time)
    oscA.stop(time + durSec + 0.1); oscB.stop(time + durSec + 0.1)
    return
  }

  if (timbre === 1) {
    // acústica — pluck curto + reverb embutido
    const osc = ctx.createOscillator()
    osc.type = "triangle"
    osc.frequency.setValueAtTime(freq, time)
    gain.gain.exponentialRampToValueAtTime(0.45, time + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.001, time + durSec * 0.85)
    const conv = ctx.createConvolver()
    conv.buffer = createImpulseResponse(ctx, 0.9, 2.5)
    const wet = ctx.createGain(); wet.gain.value = 0.3
    const dry = ctx.createGain(); dry.gain.value = 0.8
    osc.connect(gain)
    gain.connect(dry).connect(out)
    gain.connect(conv).connect(wet).connect(out)
    osc.start(time)
    osc.stop(time + durSec + 0.1)
    return
  }

  if (timbre === 2) {
    // distorção — waveshaper drive
    const osc = ctx.createOscillator()
    osc.type = "sawtooth"
    osc.frequency.setValueAtTime(freq, time)
    gain.gain.exponentialRampToValueAtTime(0.4, time + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.001, time + durSec)
    const drive = createDistortion(ctx, 0.55)
    const lp = ctx.createBiquadFilter()
    lp.type = "lowpass"
    lp.frequency.value = 3400
    osc.connect(gain).connect(drive).connect(lp).connect(out)
    osc.start(time)
    osc.stop(time + durSec + 0.1)
    return
  }

  // abafada — decay bem curto + bandpass (palm mute / funk)
  const osc = ctx.createOscillator()
  osc.type = "square"
  osc.frequency.setValueAtTime(freq, time)
  gain.gain.exponentialRampToValueAtTime(0.35, time + 0.004)
  gain.gain.exponentialRampToValueAtTime(0.001, time + Math.min(durSec, 0.14))
  const bp = ctx.createBiquadFilter()
  bp.type = "bandpass"
  bp.frequency.value = 1400
  bp.Q.value = 2
  osc.connect(bp).connect(gain).connect(out)
  osc.start(time)
  osc.stop(time + 0.2)
}

export function triggerGuitarChord(ctx: BaseAudioContext, out: AudioNode, time: number, freqs: number[], durSec: number, timbre: number) {
  freqs.forEach((f, i) => triggerGuitarString(ctx, out, time + i * 0.012, f, durSec, timbre))
}

// ─── PIANO (4 timbres) ───────────────────────────────────────────────────

export const PIANO_TIMBRE_LABEL = ["GRAND", "ELÉTRICO", "LO-FI", "PAD SINTÉTICO"] as const
export const PIANO_TIMBRE_EFFECT = [
  "limpo, ataque de martelo",
  "tremolo (LFO de amplitude)",
  "lowpass pesado + saturação",
  "chorus largo + ataque lento",
] as const

function triggerPianoNote(ctx: BaseAudioContext, out: AudioNode, time: number, freq: number, durSec: number, timbre: number) {
  if (timbre === 0) {
    // grand — sine + harmônico oitava acima simulando corpo do piano
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    osc1.type = "sine"; osc2.type = "triangle"
    osc1.frequency.setValueAtTime(freq, time)
    osc2.frequency.setValueAtTime(freq * 2, time)
    const g1 = ctx.createGain(); const g2 = ctx.createGain()
    g1.gain.setValueAtTime(0.0001, time)
    g1.gain.exponentialRampToValueAtTime(0.5, time + 0.004)
    g1.gain.exponentialRampToValueAtTime(0.001, time + durSec)
    g2.gain.setValueAtTime(0.0001, time)
    g2.gain.exponentialRampToValueAtTime(0.12, time + 0.004)
    g2.gain.exponentialRampToValueAtTime(0.001, time + durSec * 0.5)
    osc1.connect(g1).connect(out)
    osc2.connect(g2).connect(out)
    osc1.start(time); osc2.start(time)
    osc1.stop(time + durSec + 0.1); osc2.stop(time + durSec + 0.1)
    return
  }

  if (timbre === 1) {
    // elétrico (rhodes) — tremolo
    const osc = ctx.createOscillator()
    osc.type = "sine"
    osc.frequency.setValueAtTime(freq, time)
    const envGain = ctx.createGain()
    envGain.gain.setValueAtTime(0.0001, time)
    envGain.gain.exponentialRampToValueAtTime(0.5, time + 0.006)
    envGain.gain.exponentialRampToValueAtTime(0.001, time + durSec * 1.1)
    const tremolo = ctx.createGain()
    scheduleLfo(tremolo.gain, time, durSec, { rateHz: 6, base: 0.75, depth: 0.25 })
    osc.connect(envGain).connect(tremolo).connect(out)
    osc.start(time)
    osc.stop(time + durSec + 0.15)
    return
  }

  if (timbre === 2) {
    // lo-fi / feltro — lowpass pesado + leve saturação
    const osc = ctx.createOscillator()
    osc.type = "triangle"
    osc.frequency.setValueAtTime(freq, time)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.exponentialRampToValueAtTime(0.45, time + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, time + durSec * 1.3)
    const lp = ctx.createBiquadFilter()
    lp.type = "lowpass"
    lp.frequency.value = 900
    const drive = createDistortion(ctx, 0.1)
    osc.connect(gain).connect(lp).connect(drive).connect(out)
    osc.start(time)
    osc.stop(time + durSec + 0.15)
    return
  }

  // pad sintético — chorus largo (3 osciladores destafinados) + ataque lento
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(0.35, time + durSec * 0.3)
  gain.gain.exponentialRampToValueAtTime(0.001, time + durSec * 1.4)
  ;[-10, 0, 10].forEach((detune) => {
    const osc = ctx.createOscillator()
    osc.type = "sawtooth"
    osc.frequency.setValueAtTime(freq, time)
    osc.detune.setValueAtTime(detune, time)
    osc.connect(gain)
    osc.start(time)
    osc.stop(time + durSec + 0.2)
  })
  const lp = ctx.createBiquadFilter()
  lp.type = "lowpass"
  lp.frequency.value = 2200
  gain.connect(lp).connect(out)
}

export function triggerPianoChord(ctx: BaseAudioContext, out: AudioNode, time: number, freqs: number[], durSec: number, timbre: number) {
  freqs.forEach((f) => triggerPianoNote(ctx, out, time, f, durSec, timbre))
}
