// ─── motor de áudio ao vivo do B4TIDA ───────────────────────────────────────
// Um AudioContext com barramentos compartilhados de reverb/delay (mixgraph.ts)
// e um scheduler "lookahead" (agenda um pouco à frente do tempo real — evita
// o desalinhamento que setInterval puro causa num sequenciador).

import { degreeToMidi, degreeTriadMidi, midiToFreq } from "./theory"
import { triggerDrum, triggerBassNote, triggerGuitarChord, triggerPianoChord } from "./synths"
import { createMixBus, scheduleTrackTick, secPerBar, secPerTick, TICKS_PER_BAR, type MixBus } from "./mixgraph"
import type { InstrumentId, MusicMode, Track } from "./types"

const LOOKAHEAD_SEC = 0.1
const SCHEDULER_INTERVAL_MS = 25

interface SongCtx { bpm: number; rootNote: number; mode: MusicMode }

interface LiveVoiceNodes {
  source: AudioBufferSourceNode
  gain: GainNode
  reverbSend: GainNode
  delaySend: GainNode
}

export class BatidaEngine {
  ctx: AudioContext
  private bus: MixBus
  private tracks: Track[] = []
  private song: SongCtx = { bpm: 100, rootNote: 0, mode: "major" }
  private voiceBuffers = new Map<string, AudioBuffer>()
  private liveVoiceNodes = new Map<string, LiveVoiceNodes>()
  private playing = false
  private nextTickTime = 0
  private tickIndex = 0
  private barIndex = 0
  private timerId: number | null = null
  private onTick?: (tick: number, bar: number) => void

  constructor() {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new AudioCtx()
    this.bus = createMixBus(this.ctx)
  }

  destroy() {
    this.stop()
    try { this.ctx.close() } catch {}
  }

  setOnTick(cb?: (tick: number, bar: number) => void) { this.onTick = cb }
  setSong(song: SongCtx) { this.song = song }

  setMasterVolume(v: number) {
    this.bus.masterVolume.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02)
  }

  private voiceFingerprint(tracks: Track[]): string {
    return tracks
      .filter((t) => t.data.kind === "voice")
      .map((t) => `${t.id}:${t.data.kind === "voice" ? t.data.bars : ""}`)
      .join(",")
  }

  // só reinicia os loops de voz quando a LISTA de faixas de voz muda de
  // verdade (nova gravação, remoção, duração diferente) — editar um passo de
  // bateria/baixo/acorde não pode cortar um vocal que já está tocando
  setTracks(tracks: Track[]) {
    const prevFingerprint = this.voiceFingerprint(this.tracks)
    this.tracks = tracks
    const nextFingerprint = this.voiceFingerprint(tracks)
    if (this.playing && prevFingerprint !== nextFingerprint) this.restartVoiceLoops()
  }

  setTrackFx(trackId: string, fx: Partial<Track["fx"]>) {
    const track = this.tracks.find((t) => t.id === trackId)
    if (!track) return
    track.fx = { ...track.fx, ...fx }
    const nodes = this.liveVoiceNodes.get(trackId)
    if (nodes) {
      const t = this.ctx.currentTime
      nodes.gain.gain.setTargetAtTime(track.fx.muted ? 0 : track.fx.volume, t, 0.02)
      nodes.reverbSend.gain.setTargetAtTime(track.fx.reverb, t, 0.02)
      nodes.delaySend.gain.setTargetAtTime(track.fx.delay, t, 0.02)
    }
  }

  async decodeVoiceBlob(trackId: string, blob: Blob) {
    const arrBuf = await blob.arrayBuffer()
    const audioBuf = await this.ctx.decodeAudioData(arrBuf.slice(0))
    this.voiceBuffers.set(trackId, audioBuf)
  }

  private stopVoiceLoops() {
    this.liveVoiceNodes.forEach((n) => { try { n.source.stop() } catch {} })
    this.liveVoiceNodes.clear()
  }

  private restartVoiceLoops() {
    this.stopVoiceLoops()
    this.startVoiceLoops(this.nextBarBoundaryTime())
  }

  private startVoiceLoops(t0: number) {
    for (const track of this.tracks) {
      if (track.data.kind !== "voice") continue
      const buffer = this.voiceBuffers.get(track.id)
      if (!buffer) continue
      const source = this.ctx.createBufferSource()
      source.buffer = buffer
      source.loop = true
      source.loopStart = 0
      source.loopEnd = Math.max(0.05, track.data.bars * secPerBar(this.song.bpm))

      const gain = this.ctx.createGain()
      gain.gain.value = track.fx.muted ? 0 : track.fx.volume
      gain.connect(this.bus.master)
      const reverbSend = this.ctx.createGain()
      reverbSend.gain.value = track.fx.reverb
      gain.connect(reverbSend)
      reverbSend.connect(this.bus.reverbBus)
      const delaySend = this.ctx.createGain()
      delaySend.gain.value = track.fx.delay
      gain.connect(delaySend)
      delaySend.connect(this.bus.delayBus)

      source.connect(gain)
      source.start(t0)
      this.liveVoiceNodes.set(track.id, { source, gain, reverbSend, delaySend })
    }
  }

  private nextBarBoundaryTime(): number {
    if (!this.playing) return this.ctx.currentTime + 0.05
    const ticksToNext = (TICKS_PER_BAR - this.tickIndex) % TICKS_PER_BAR
    return this.nextTickTime + ticksToNext * secPerTick(this.song.bpm)
  }

  // ponto de sincronismo exposto pra gravação de voz — a página de voz agenda
  // o início da gravação pra esse instante (início do próximo compasso)
  getNextBarStartTime(): number { return this.nextBarBoundaryTime() }
  getBpm(): number { return this.song.bpm }
  getSecPerBar(): number { return secPerBar(this.song.bpm) }

  play() {
    if (this.playing) return
    void this.ctx.resume()
    this.playing = true
    this.tickIndex = 0
    this.barIndex = 0
    this.nextTickTime = this.ctx.currentTime + 0.12
    this.startVoiceLoops(this.nextTickTime)
    this.timerId = window.setInterval(() => this.schedulerTick(), SCHEDULER_INTERVAL_MS)
    this.schedulerTick()
  }

  stop() {
    this.playing = false
    if (this.timerId !== null) { clearInterval(this.timerId); this.timerId = null }
    this.stopVoiceLoops()
  }

  get isPlaying() { return this.playing }

  private schedulerTick() {
    if (!this.playing) return
    while (this.nextTickTime < this.ctx.currentTime + LOOKAHEAD_SEC) {
      // tick GLOBAL (nunca reseta em 0 a cada compasso) — cada faixa reduz
      // esse valor módulo o próprio tamanho de padrão em mixgraph.ts, então
      // faixas de 1, 2 ou 4 compassos ficam todas alinhadas na mesma origem
      const globalTick = this.barIndex * TICKS_PER_BAR + this.tickIndex
      for (const track of this.tracks) {
        if (track.data.kind === "voice") continue
        scheduleTrackTick(this.ctx, this.bus, this.song, track, globalTick, this.nextTickTime)
      }
      const tick = this.tickIndex
      const bar = this.barIndex
      const delayMs = Math.max(0, (this.nextTickTime - this.ctx.currentTime) * 1000)
      const cb = this.onTick
      if (cb) window.setTimeout(() => cb(tick, bar), delayMs)
      this.nextTickTime += secPerTick(this.song.bpm)
      this.tickIndex++
      if (this.tickIndex >= TICKS_PER_BAR) { this.tickIndex = 0; this.barIndex++ }
    }
  }

  // ─── audição rápida (tap num pad, fora do grid) ────────────────────────
  previewDrum(row: Parameters<typeof triggerDrum>[3], timbre: Parameters<typeof triggerDrum>[4]) {
    void this.ctx.resume()
    triggerDrum(this.ctx, this.bus.master, this.ctx.currentTime + 0.01, row, timbre)
  }
  previewBass(degree: number, timbre: number) {
    void this.ctx.resume()
    const midi = degreeToMidi(this.song.rootNote, this.song.mode, degree, 2)
    triggerBassNote(this.ctx, this.bus.master, this.ctx.currentTime + 0.01, midiToFreq(midi), 0.35, timbre)
  }
  previewChord(instrument: InstrumentId, degree: number, timbre: number) {
    void this.ctx.resume()
    const octave = instrument === "guitarra" ? 3 : 4
    const freqs = degreeTriadMidi(this.song.rootNote, this.song.mode, degree, octave).map(midiToFreq)
    const time = this.ctx.currentTime + 0.01
    if (instrument === "guitarra") triggerGuitarChord(this.ctx, this.bus.master, time, freqs, 0.8, timbre)
    else triggerPianoChord(this.ctx, this.bus.master, time, freqs, 0.8, timbre)
  }

  // uma corda só (fretboard Smart Guitar) ou uma tecla só (Smart Piano) —
  // usadas pelas telas com o instrumento "tocável" de verdade, nota a nota
  previewGuitarNote(midi: number, timbre: number) {
    void this.ctx.resume()
    triggerGuitarChord(this.ctx, this.bus.master, this.ctx.currentTime + 0.004, [midiToFreq(midi)], 0.9, timbre)
  }
  previewPianoNote(midi: number, timbre: number) {
    void this.ctx.resume()
    triggerPianoChord(this.ctx, this.bus.master, this.ctx.currentTime + 0.004, [midiToFreq(midi)], 1.1, timbre)
  }
}
