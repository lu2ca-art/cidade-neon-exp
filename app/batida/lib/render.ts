// ─── bounce offline + export WAV ────────────────────────────────────────────
// Renderiza a música inteira num OfflineAudioContext (mesmo grafo de mixagem
// do motor ao vivo) e converte pra um WAV de verdade, baixável.

import { createMixBus, buildOneShotChain, scheduleTrackTick, secPerBar, secPerTick, TICKS_PER_BAR } from "./mixgraph"
import type { Song, Track, VoiceClip } from "./types"

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b) }
function lcm(a: number, b: number): number { return (a * b) / gcd(a, b) }
function lcmAll(nums: number[]): number { return nums.reduce((acc, n) => lcm(acc, n), 1) }

export async function renderSongOffline(song: Song): Promise<AudioBuffer> {
  const voiceTracks = song.tracks.filter((t): t is Track & { data: VoiceClip } => t.data.kind === "voice")
  const patternTracks = song.tracks.filter((t) => t.data.kind !== "voice")

  const barsList = voiceTracks.map((t) => t.data.bars)
  const cycleBars = Math.min(barsList.length ? lcmAll(barsList) : 1, 32)
  const spb = secPerBar(song.bpm)
  const totalSec = cycleBars * spb + 1.4 // cauda pro reverb/delay não cortar

  const sampleRate = 44100
  const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalSec * sampleRate), sampleRate)
  const bus = createMixBus(offlineCtx)
  const songCtx = { bpm: song.bpm, rootNote: song.rootNote, mode: song.mode }

  for (const track of voiceTracks) {
    if (track.fx.muted) continue
    const arrBuf = await track.data.blob.arrayBuffer()
    const buf = await offlineCtx.decodeAudioData(arrBuf.slice(0))
    const source = offlineCtx.createBufferSource()
    source.buffer = buf
    source.loop = true
    source.loopStart = 0
    source.loopEnd = Math.max(0.05, track.data.bars * spb)
    const chain = buildOneShotChain(offlineCtx, bus, track.fx)
    source.connect(chain)
    source.start(0)
    source.stop(totalSec)
  }

  const totalTicks = cycleBars * TICKS_PER_BAR
  for (let i = 0; i < totalTicks; i++) {
    const tick = i % TICKS_PER_BAR
    const time = i * secPerTick(song.bpm)
    for (const track of patternTracks) {
      scheduleTrackTick(offlineCtx, bus, songCtx, track, tick, time)
    }
  }

  return offlineCtx.startRendering()
}

export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const bitDepth = 16
  const bytesPerSample = bitDepth / 8
  const blockAlign = numChannels * bytesPerSample
  const numSamples = buffer.length
  const dataSize = numSamples * blockAlign

  const arrayBuf = new ArrayBuffer(44 + dataSize)
  const view = new DataView(arrayBuf)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeString(0, "RIFF")
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, "WAVE")
  writeString(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeString(36, "data")
  view.setUint32(40, dataSize, true)

  const channels: Float32Array[] = []
  for (let ch = 0; ch < numChannels; ch++) channels.push(buffer.getChannelData(ch))

  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const raw = Math.max(-1, Math.min(1, channels[ch][i]))
      const sample = raw < 0 ? raw * 0x8000 : raw * 0x7fff
      view.setInt16(offset, sample, true)
      offset += 2
    }
  }

  return new Blob([arrayBuf], { type: "audio/wav" })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}
