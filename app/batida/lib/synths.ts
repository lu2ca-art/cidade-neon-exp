// ─── síntese por instrumento e timbre ───────────────────────────────────────
// Cada instrumento tem 4 timbres fixos, e cada timbre carrega um efeito
// específico embutido na própria síntese (não é só EQ diferente). Todas as
// funções recebem (ctx, out, time, ...) e nunca leem ctx.currentTime — assim
// funcionam idêntico em AudioContext (ao vivo) e OfflineAudioContext (export).

import type { DrumRow, DrumTimbre } from "./types"
import { createDistortion, createImpulseResponse, scheduleLfo } from "./dsp"
import { BAIXOS_DA_FAIXA, KITS_DA_FAIXA, PADS_DA_FAIXA, SYNTHS_DA_FAIXA, tocarGolpe, tocarTimbreDaFaixa } from "./amostras"

// ─── BATERIA (4 kits — mesma técnica do B4TIDA original) ───────────────────

// kits "da faixa": golpes de verdade tirados das instrumentais (amostras.ts)
export const DRUM_TIMBRES: DrumTimbre[] = ["sintetico", "808", "acustico", "lofi", "xenonio", "neonio", "argonio", "chuva", ...KITS_DA_FAIXA.map((k) => k.id as DrumTimbre)]
export const DRUM_TIMBRE_LABEL: Record<DrumTimbre, string> = {
  ...Object.fromEntries(KITS_DA_FAIXA.map((k) => [k.id, k.nome])),
  sintetico: "SINTÉTICO",
  "808": "808",
  acustico: "ACÚSTICO",
  lofi: "LO-FI",
  // ids internos vêm dos gases (inspiração); na tela, só o lugar
  xenonio: "SUBÚRBIO",
  neonio: "CENTRO",
  argonio: "MORRO",
  chuva: "CHUVA",
}
export const DRUM_TIMBRE_EFFECT: Record<DrumTimbre, string> = {
  ...Object.fromEntries(KITS_DA_FAIXA.map((k) => [k.id, "golpes de verdade, tirados da faixa"])),
  sintetico: "limpo, sem efeito",
  "808": "saturação no sub",
  acustico: "reverb de sala curta",
  lofi: "bitcrush + lowpass",
  xenonio: "808 longo do subúrbio, hat fininho, brilho azul",
  neonio: "garage do centro: ataque seco, sala curta",
  argonio: "lo-fi do morro: poeira, grave abafado",
  chuva: "respingo, garoa e gota — reverb molhado",
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
  xenonio: {
    kick: { freqStart: 90, freqEnd: 29, decay: 0.62 },
    snare: { durSec: 0.16, filter: "bandpass", cutoff: 2400, decay: 0.12 },
    hat: { durSec: 0.03, filter: "highpass", cutoff: 10500, decay: 0.028 },
    perc: { freqStart: 240, freqEnd: 110, decay: 0.26, wave: "sine" },
  },
  neonio: {
    kick: { freqStart: 170, freqEnd: 52, decay: 0.17 },
    snare: { durSec: 0.2, filter: "highpass", cutoff: 1500, decay: 0.2 },
    hat: { durSec: 0.06, filter: "highpass", cutoff: 7200, decay: 0.055 },
    perc: { freqStart: 900, freqEnd: 640, decay: 0.08, wave: "square" },
  },
  argonio: {
    kick: { freqStart: 100, freqEnd: 42, decay: 0.3 },
    snare: { durSec: 0.3, filter: "lowpass", cutoff: 1700, decay: 0.3 },
    hat: { durSec: 0.1, filter: "lowpass", cutoff: 3300, decay: 0.1 },
    perc: { freqStart: 330, freqEnd: 200, decay: 0.2, wave: "sine" },
  },
  chuva: {
    kick: { freqStart: 75, freqEnd: 40, decay: 0.42 },
    snare: { durSec: 0.12, filter: "bandpass", cutoff: 3200, decay: 0.1 },
    hat: { durSec: 0.025, filter: "highpass", cutoff: 11500, decay: 0.02 },
    perc: { freqStart: 1300, freqEnd: 720, decay: 0.09, wave: "sine" },
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
  if (timbre === "xenonio") {
    const drive = createDistortion(ctx, 0.22)
    const shelf = ctx.createBiquadFilter()
    shelf.type = "highshelf"
    shelf.frequency.value = 6000
    shelf.gain.value = 5
    drive.connect(shelf).connect(out)
    return drive
  }
  if (timbre === "neonio" || timbre === "chuva") {
    const conv = ctx.createConvolver()
    conv.buffer = createImpulseResponse(ctx, timbre === "chuva" ? 2.4 : 0.35, timbre === "chuva" ? 1.6 : 3)
    const wet = ctx.createGain()
    wet.gain.value = timbre === "chuva" ? 0.55 : 0.22
    const dry = ctx.createGain()
    dry.gain.value = 0.9
    conv.connect(wet).connect(out)
    dry.connect(out)
    const split = ctx.createGain()
    split.connect(conv)
    split.connect(dry)
    return split
  }
  if (timbre === "argonio") {
    const crush = createDistortion(ctx, 0.18)
    const lp = ctx.createBiquadFilter()
    lp.type = "lowpass"
    lp.frequency.value = 2400
    crush.connect(lp).connect(out)
    return crush
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
  // kit da faixa: golpe gravado; se ainda não carregou (ou a faixa não tem
  // aquele golpe limpo), cai no sintético
  if (timbre.startsWith("faixa-") && tocarGolpe(ctx, out, time, timbre, row)) return
  const p = DRUM_KIT_PARAMS[timbre] ?? DRUM_KIT_PARAMS.sintetico
  const voiceOut = drumVoiceOut(ctx, out, timbre)
  if (row === "kick") triggerKick(ctx, voiceOut, time, p.kick)
  else if (row === "snare") triggerNoise(ctx, voiceOut, time, p.snare, 0.6)
  else if (row === "hat") triggerNoise(ctx, voiceOut, time, p.hat, 0.35)
  else triggerPerc(ctx, voiceOut, time, p.perc)
}

// ─── BAIXO (4 timbres) ───────────────────────────────────────────────────

export const BASS_TIMBRE_LABEL: readonly string[] = ["SINTÉTICO", "SUB 808", "DEDILHADO", "FUNK", "REESE XENOM", "SUB ÁGUA", ...BAIXOS_DA_FAIXA.map((b) => b.nome)]
export const BASS_TIMBRE_EFFECT = [
  "limpo, sem efeito",
  "saturação (drive)",
  "filtro em decaimento (pluck)",
  "auto-wah (filtro em LFO)",
  "dois serrotes desafinados, grave largo",
  "sub com gota no ataque, chorus lento",
  ...BAIXOS_DA_FAIXA.map(() => "nota de baixo de verdade, tirada da faixa"),
]

export function triggerBassNote(ctx: BaseAudioContext, out: AudioNode, time: number, freq: number, durSec: number, timbre: number) {
  if (timbre >= 6) return tocarTimbreDaFaixa(ctx, out, time, freq, Math.max(durSec, 0.25), "baixo", timbre)
  if (timbre >= 4) return triggerBassCidade(ctx, out, time, freq, durSec, timbre)
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

export const GUITAR_TIMBRE_LABEL = ["LIMPA", "ACÚSTICA", "DISTORÇÃO", "ABAFADA", "CHORUS CHUVA", "SHOEGAZE"] as const
export const GUITAR_TIMBRE_EFFECT = [
  "chorus leve (duplo oscilador)",
  "reverb curto embutido",
  "distorção (drive)",
  "palm mute (filtro + decay curto)",
  "chorus lento + reverb de rua molhada",
  "fuzz + parede de reverb, ataque lento",
] as const

function triggerGuitarString(ctx: BaseAudioContext, out: AudioNode, time: number, freq: number, durSec: number, timbre: number) {
  if (timbre >= 4) return triggerGuitarCidade(ctx, out, time, freq, durSec, timbre)
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

// ─── SYNTH (id interno "piano", pra não quebrar música salva) ─────────────

export const PIANO_TIMBRE_LABEL: readonly string[] = ["SUPERSAW", "PLUCK", "LEAD QUADRADO", "ACID", "SINO NEON", "TECLA MOLHADA", ...SYNTHS_DA_FAIXA.map((s) => s.nome)]
export const PIANO_TIMBRE_EFFECT = [
  "cinco serrotes desafinados, largo",
  "ataque estalado, filtro fechando rápido",
  "onda quadrada com vibrato",
  "filtro ressonante que abre e fecha, drive",
  "sino FM, brilho que some devagar",
  "tecla elétrica com tremolo e reverb",
  ...SYNTHS_DA_FAIXA.map(() => "nota de synth de verdade, tirada da faixa"),
]

function triggerPianoNote(ctx: BaseAudioContext, out: AudioNode, time: number, freq: number, durSec: number, timbre: number) {
  if (timbre >= 6) return tocarTimbreDaFaixa(ctx, out, time, freq, durSec, "piano", timbre)
  if (timbre >= 4) return triggerPianoCidade(ctx, out, time, freq, durSec, timbre)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, time)
  const fim = time + durSec + 0.25

  if (timbre === 0) {
    // supersaw — 5 serrotes espalhados, lowpass aberto
    const lp = ctx.createBiquadFilter()
    lp.type = "lowpass"
    lp.frequency.value = 3600
    ;[-24, -11, 0, 11, 24].forEach((det) => {
      const o = ctx.createOscillator()
      o.type = "sawtooth"
      o.frequency.setValueAtTime(freq, time)
      o.detune.setValueAtTime(det, time)
      o.connect(lp)
      o.start(time)
      o.stop(fim)
    })
    gain.gain.exponentialRampToValueAtTime(0.16, time + 0.012)
    gain.gain.setTargetAtTime(0.1, time + 0.05, 0.1)
    gain.gain.setTargetAtTime(0.0001, time + durSec, 0.08)
    lp.connect(gain).connect(out)
    return
  }

  if (timbre === 1) {
    // pluck — serrote + quadrada, filtro despenca
    const a = ctx.createOscillator()
    const b = ctx.createOscillator()
    a.type = "sawtooth"
    b.type = "square"
    a.frequency.setValueAtTime(freq, time)
    b.frequency.setValueAtTime(freq * 2, time)
    const bg = ctx.createGain()
    bg.gain.value = 0.3
    const lp = ctx.createBiquadFilter()
    lp.type = "lowpass"
    lp.Q.value = 4
    lp.frequency.setValueAtTime(5200, time)
    lp.frequency.exponentialRampToValueAtTime(380, time + 0.18)
    gain.gain.exponentialRampToValueAtTime(0.32, time + 0.003)
    gain.gain.exponentialRampToValueAtTime(0.001, time + Math.min(0.45, durSec + 0.2))
    a.connect(lp)
    b.connect(bg).connect(lp)
    lp.connect(gain).connect(out)
    a.start(time); b.start(time)
    a.stop(fim); b.stop(fim)
    return
  }

  if (timbre === 2) {
    // lead quadrado — vibrato entra depois do ataque
    const o = ctx.createOscillator()
    o.type = "square"
    o.frequency.setValueAtTime(freq, time)
    scheduleLfo(o.detune, time + 0.15, durSec, { rateHz: 5.5, base: 0, depth: 14 })
    const lp = ctx.createBiquadFilter()
    lp.type = "lowpass"
    lp.frequency.value = 2800
    gain.gain.exponentialRampToValueAtTime(0.2, time + 0.01)
    gain.gain.setTargetAtTime(0.0001, time + durSec, 0.06)
    o.connect(lp).connect(gain).connect(out)
    o.start(time)
    o.stop(fim)
    return
  }

  // acid — serrote, filtro ressonante com envelope, drive
  const o = ctx.createOscillator()
  o.type = "sawtooth"
  o.frequency.setValueAtTime(freq, time)
  const lp = ctx.createBiquadFilter()
  lp.type = "lowpass"
  lp.Q.value = 14
  lp.frequency.setValueAtTime(220, time)
  lp.frequency.exponentialRampToValueAtTime(2600, time + 0.04)
  lp.frequency.exponentialRampToValueAtTime(300, time + 0.35)
  const drive = createDistortion(ctx, 0.3)
  gain.gain.exponentialRampToValueAtTime(0.22, time + 0.005)
  gain.gain.setTargetAtTime(0.0001, time + durSec, 0.05)
  o.connect(lp).connect(drive).connect(gain).connect(out)
  o.start(time)
  o.stop(fim)
}

export function triggerPianoChord(ctx: BaseAudioContext, out: AudioNode, time: number, freqs: number[], durSec: number, timbre: number) {
  freqs.forEach((f) => triggerPianoNote(ctx, out, time, f, durSec, timbre))
}

// ─── PAD (acorde que fica soando até o próximo) ─────────────────────────────

export const PAD_TIMBRE_LABEL: readonly string[] = ["NUVEM", "CORAL", "VIDRO", "CHUVA", "ÓRGÃO", "NOITE", ...PADS_DA_FAIXA.map((p) => p.nome)]
export const PAD_TIMBRE_EFFECT = [
  "serrotes largos, filtro respirando devagar",
  "vogal \"ah\" formada por filtros",
  "FM suave, brilho de vidro",
  "garoa por baixo do acorde, reverb longo",
  "órgão com tremolo girando",
  "grave quente, ataque bem lento",
  ...PADS_DA_FAIXA.map(() => "nota da faixa esticada em loop, ataque lento"),
]

function triggerPadNote(ctx: BaseAudioContext, out: AudioNode, time: number, freq: number, durSec: number, timbre: number) {
  if (timbre >= 6) return tocarTimbreDaFaixa(ctx, out, time, freq, durSec, "pad", timbre)
  const ataque = [0.6, 0.4, 0.3, 0.8, 0.12, 1.1][timbre] ?? 0.5
  const solta = [1.2, 1, 1.4, 1.8, 0.4, 1.6][timbre] ?? 1
  const vol = [0.09, 0.1, 0.12, 0.1, 0.1, 0.14][timbre] ?? 0.1
  const fim = time + durSec + solta + 0.2
  const env = ctx.createGain()
  env.gain.setValueAtTime(0.0001, time)
  env.gain.linearRampToValueAtTime(vol, time + ataque)
  env.gain.setValueAtTime(vol, time + Math.max(ataque, durSec))
  env.gain.setTargetAtTime(0.0001, time + Math.max(ataque, durSec), solta / 3)
  const osc = (tipo: OscillatorType, f: number, det = 0) => {
    const o = ctx.createOscillator()
    o.type = tipo
    o.frequency.setValueAtTime(f, time)
    o.detune.setValueAtTime(det, time)
    o.start(time)
    o.stop(fim)
    return o
  }

  if (timbre === 0) {
    const lp = ctx.createBiquadFilter()
    lp.type = "lowpass"
    scheduleLfo(lp.frequency, time, durSec + solta, { rateHz: 0.25, base: 1500, depth: 700 })
    ;[-14, 0, 14].forEach((d) => osc("sawtooth", freq, d).connect(lp))
    lp.connect(env).connect(reverbSend(ctx, out, 2.4, 0.35))
    return
  }
  if (timbre === 1) {
    const src = ctx.createGain()
    ;[-6, 6].forEach((d) => osc("sawtooth", freq, d).connect(src))
    const mix = ctx.createGain()
    ;[[720, 8, 1], [1150, 10, 0.6], [2600, 12, 0.25]].forEach(([f, q, g]) => {
      const bp = ctx.createBiquadFilter()
      bp.type = "bandpass"
      bp.frequency.value = f
      bp.Q.value = q
      const gg = ctx.createGain()
      gg.gain.value = g * 2.2
      src.connect(bp).connect(gg).connect(mix)
    })
    mix.connect(env).connect(reverbSend(ctx, out, 2.8, 0.45))
    return
  }
  if (timbre === 2) {
    const car = osc("sine", freq)
    const mod = osc("sine", freq * 2)
    const idx = ctx.createGain()
    idx.gain.setValueAtTime(freq * 0.8, time)
    mod.connect(idx).connect(car.frequency)
    const trem = ctx.createGain()
    scheduleLfo(trem.gain, time, durSec + solta, { rateHz: 3, base: 0.85, depth: 0.15 })
    car.connect(env).connect(trem).connect(reverbSend(ctx, out, 2.2, 0.4))
    osc("triangle", freq * 2, 5).connect(env)
    return
  }
  if (timbre === 3) {
    osc("sine", freq, -8).connect(env)
    osc("triangle", freq, 8).connect(env)
    // garoa: ruído filtrado bem baixinho junto com o acorde
    const n = ctx.createBufferSource()
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.004 ? 1 : 0.08)
    n.buffer = buf
    n.loop = true
    const hp = ctx.createBiquadFilter()
    hp.type = "bandpass"
    hp.frequency.value = 4200
    const ng = ctx.createGain()
    ng.gain.value = 0.35
    n.connect(hp).connect(ng).connect(env)
    n.start(time)
    n.stop(fim)
    env.connect(reverbSend(ctx, out, 3.4, 0.55))
    return
  }
  if (timbre === 4) {
    osc("square", freq).connect(env)
    osc("sine", freq * 2).connect(env)
    osc("sine", freq / 2).connect(env)
    const lp = ctx.createBiquadFilter()
    lp.type = "lowpass"
    lp.frequency.value = 2200
    const trem = ctx.createGain()
    scheduleLfo(trem.gain, time, durSec + solta, { rateHz: 6.2, base: 0.8, depth: 0.2 })
    env.connect(lp).connect(trem).connect(out)
    return
  }
  const lp = ctx.createBiquadFilter()
  lp.type = "lowpass"
  lp.frequency.value = 700
  osc("sine", freq / 2).connect(env)
  osc("sawtooth", freq, -4).connect(lp)
  lp.connect(env)
  env.connect(reverbSend(ctx, out, 2, 0.3))
}

export function triggerPadChord(ctx: BaseAudioContext, out: AudioNode, time: number, freqs: number[], durSec: number, timbre: number) {
  freqs.forEach((f) => triggerPadNote(ctx, out, time, f, durSec, timbre))
}

// um lugar só pra decidir quem toca um acorde
export function triggerChordFor(instrument: string, ctx: BaseAudioContext, out: AudioNode, time: number, freqs: number[], durSec: number, timbre: number) {
  if (instrument === "guitarra") triggerGuitarChord(ctx, out, time, freqs, durSec, timbre)
  else if (instrument === "pad") triggerPadChord(ctx, out, time, freqs, durSec, timbre)
  else triggerPianoChord(ctx, out, time, freqs, durSec, timbre)
}

// ─── timbres da cidade (4 e 5 de cada instrumento melódico) ─────────────────

function reverbSend(ctx: BaseAudioContext, out: AudioNode, seg: number, wet: number) {
  const conv = ctx.createConvolver()
  conv.buffer = createImpulseResponse(ctx, seg, 2)
  const w = ctx.createGain()
  w.gain.value = wet
  const d = ctx.createGain()
  d.gain.value = 1 - wet * 0.4
  const entrada = ctx.createGain()
  entrada.connect(conv).connect(w).connect(out)
  entrada.connect(d).connect(out)
  return entrada
}

function triggerBassCidade(ctx: BaseAudioContext, out: AudioNode, time: number, freq: number, durSec: number, timbre: number) {
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, time)
  if (timbre === 4) {
    // reese xenom — dois serrotes desafinados, lowpass, drive leve
    const a = ctx.createOscillator()
    const b = ctx.createOscillator()
    a.type = b.type = "sawtooth"
    a.frequency.setValueAtTime(freq, time)
    b.frequency.setValueAtTime(freq, time)
    a.detune.setValueAtTime(-16, time)
    b.detune.setValueAtTime(16, time)
    const lp = ctx.createBiquadFilter()
    lp.type = "lowpass"
    lp.frequency.setValueAtTime(760, time)
    lp.Q.value = 3
    const drive = createDistortion(ctx, 0.2)
    gain.gain.exponentialRampToValueAtTime(0.42, time + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, time + durSec * 1.1)
    a.connect(lp)
    b.connect(lp)
    lp.connect(drive).connect(gain).connect(out)
    a.start(time); b.start(time)
    a.stop(time + durSec + 0.15); b.stop(time + durSec + 0.15)
    return
  }
  // sub água — seno com "gota" no ataque (pitch caindo) e chorus lento
  const osc = ctx.createOscillator()
  osc.type = "sine"
  osc.frequency.setValueAtTime(freq * 1.6, time)
  osc.frequency.exponentialRampToValueAtTime(freq, time + 0.05)
  scheduleLfo(osc.detune, time, durSec, { rateHz: 0.8, base: 0, depth: 9 })
  gain.gain.exponentialRampToValueAtTime(0.75, time + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.001, time + durSec * 1.3)
  osc.connect(gain).connect(out)
  osc.start(time)
  osc.stop(time + durSec * 1.3 + 0.05)
}

function triggerGuitarCidade(ctx: BaseAudioContext, out: AudioNode, time: number, freq: number, durSec: number, timbre: number) {
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, time)
  if (timbre === 4) {
    // chorus chuva — triângulo + seno com detune em LFO, reverb de rua molhada
    const a = ctx.createOscillator()
    const b = ctx.createOscillator()
    a.type = "triangle"
    b.type = "sine"
    a.frequency.setValueAtTime(freq, time)
    b.frequency.setValueAtTime(freq * 2, time)
    scheduleLfo(a.detune, time, durSec * 1.4, { rateHz: 0.9, base: 0, depth: 14 })
    const bg = ctx.createGain()
    bg.gain.value = 0.25
    gain.gain.exponentialRampToValueAtTime(0.4, time + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.001, time + durSec * 1.4)
    const rev = reverbSend(ctx, out, 2.2, 0.45)
    a.connect(gain)
    b.connect(bg).connect(gain)
    gain.connect(rev)
    a.start(time); b.start(time)
    a.stop(time + durSec * 1.4 + 0.1); b.stop(time + durSec * 1.4 + 0.1)
    return
  }
  // shoegaze — fuzz + parede de reverb, ataque lento
  const osc = ctx.createOscillator()
  osc.type = "sawtooth"
  osc.frequency.setValueAtTime(freq, time)
  osc.detune.setValueAtTime(-5, time)
  const fuzz = createDistortion(ctx, 0.8)
  const lp = ctx.createBiquadFilter()
  lp.type = "lowpass"
  lp.frequency.value = 2600
  gain.gain.linearRampToValueAtTime(0.22, time + 0.12)
  gain.gain.exponentialRampToValueAtTime(0.001, time + durSec * 1.8)
  const rev = reverbSend(ctx, out, 3.2, 0.6)
  osc.connect(fuzz).connect(lp).connect(gain).connect(rev)
  osc.start(time)
  osc.stop(time + durSec * 1.8 + 0.1)
}

function triggerPianoCidade(ctx: BaseAudioContext, out: AudioNode, time: number, freq: number, durSec: number, timbre: number) {
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, time)
  if (timbre === 4) {
    // sino neon — FM: modulador em 3.5x com índice que cai
    const car = ctx.createOscillator()
    const mod = ctx.createOscillator()
    const idx = ctx.createGain()
    car.type = mod.type = "sine"
    car.frequency.setValueAtTime(freq, time)
    mod.frequency.setValueAtTime(freq * 3.5, time)
    idx.gain.setValueAtTime(freq * 2.2, time)
    idx.gain.exponentialRampToValueAtTime(freq * 0.05, time + durSec * 1.5)
    mod.connect(idx).connect(car.frequency)
    gain.gain.exponentialRampToValueAtTime(0.28, time + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.001, time + durSec * 2.2)
    const rev = reverbSend(ctx, out, 1.8, 0.35)
    car.connect(gain).connect(rev)
    car.start(time); mod.start(time)
    car.stop(time + durSec * 2.2 + 0.1); mod.stop(time + durSec * 2.2 + 0.1)
    return
  }
  // rhodes molhado — seno + oitava suave, tremolo, reverb
  const a = ctx.createOscillator()
  const b = ctx.createOscillator()
  a.type = "sine"
  b.type = "triangle"
  a.frequency.setValueAtTime(freq, time)
  b.frequency.setValueAtTime(freq * 2, time)
  const bg = ctx.createGain()
  bg.gain.value = 0.12
  const trem = ctx.createGain()
  trem.gain.value = 1
  scheduleLfo(trem.gain, time, durSec * 1.5, { rateHz: 4.5, base: 0.8, depth: 0.2 })
  gain.gain.exponentialRampToValueAtTime(0.36, time + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.001, time + durSec * 1.5)
  const rev = reverbSend(ctx, out, 1.6, 0.3)
  a.connect(gain)
  b.connect(bg).connect(gain)
  gain.connect(trem).connect(rev)
  a.start(time); b.start(time)
  a.stop(time + durSec * 1.5 + 0.1); b.stop(time + durSec * 1.5 + 0.1)
}
