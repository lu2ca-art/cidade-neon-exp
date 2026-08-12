// ─── Teoria musical mínima pro B4TIDA ───────────────────────────────────────
// Define a escala da tonalidade escolhida, os acordes diatônicos (tríades
// construídas em cada grau) e conversão nota -> frequência. É isso que liga
// o baixo (define a tonalidade e quais graus foram usados) aos acordes
// disponíveis na guitarra/piano.

import type { ChordStepEntry, MusicMode } from "./types"

export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11]
const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10]

export function scaleSteps(mode: MusicMode): number[] {
  return mode === "major" ? MAJOR_STEPS : MINOR_STEPS
}

// tríade diatônica em cada grau (maj/min/dim), calculada empilhando terças
// dentro da escala — não fixamos qualidade "chutada", ela sai da escala real
const TRIAD_QUALITY_SEMITONES: Record<string, number[]> = {
  // [terça, quinta] em semitons relativos à tônica do acorde
  maj: [4, 7],
  min: [3, 7],
  dim: [3, 6],
}

export type ChordQuality = "maj" | "min" | "dim"

// acorde "armado" nas telas Smart Guitar / Smart Piano — o que o braço/
// teclado desenha e o que os toques no trilho de passos colocam na música
export interface ArmedChord {
  rootPc: number
  quality: ChordQuality
  chordName: string
}

export interface DegreeInfo {
  degree: number // 0-6 (I..VII)
  rootPc: number // pitch-class 0-11
  rootName: string
  quality: ChordQuality
  romanNumeral: string
  chordName: string
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"]

function qualityFromSemitones(third: number, fifth: number): ChordQuality {
  if (third === 4 && fifth === 7) return "maj"
  if (third === 3 && fifth === 7) return "min"
  return "dim"
}

export function keyDegrees(rootNote: number, mode: MusicMode): DegreeInfo[] {
  const steps = scaleSteps(mode)
  // estende a escala por 2 oitavas em semitons absolutos (desde a tônica)
  // pra poder empilhar terças sem se preocupar com wraparound
  const extended = [...steps, ...steps.map((s) => s + 12), ...steps.map((s) => s + 24)]

  return steps.map((rootOffset, degree) => {
    const thirdOffset = extended[degree + 2] - rootOffset
    const fifthOffset = extended[degree + 4] - rootOffset
    const quality = qualityFromSemitones(thirdOffset, fifthOffset)
    const rootPc = (rootNote + rootOffset) % 12
    const rootName = NOTE_NAMES[rootPc]
    const roman = quality === "min" ? ROMAN[degree].toLowerCase() : quality === "dim" ? ROMAN[degree].toLowerCase() + "°" : ROMAN[degree]
    return {
      degree,
      rootPc,
      rootName,
      quality,
      romanNumeral: roman,
      chordName: quality === "maj" ? rootName : quality === "min" ? `${rootName}m` : `${rootName}dim`,
    }
  })
}

// MIDI -> frequência (A4 = MIDI 69 = 440Hz)
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

// nota MIDI absoluta de um grau da escala numa oitava base
export function degreeToMidi(rootNote: number, mode: MusicMode, degree: number, octave: number): number {
  const steps = scaleSteps(mode)
  const extended = [...steps, ...steps.map((s) => s + 12)]
  const semis = extended[((degree % 7) + 7) % 7]
  return rootNote + semis + 12 * (octave + 1) // MIDI 0 = C-1
}

// tríade completa (3 notas MIDI) pro grau, numa oitava base — usada pra tocar
// acordes na guitarra/piano
export function degreeTriadMidi(rootNote: number, mode: MusicMode, degree: number, octave: number): number[] {
  const steps = scaleSteps(mode)
  const extended = [...steps, ...steps.map((s) => s + 12), ...steps.map((s) => s + 24)]
  const base = extended[degree]
  const third = extended[degree + 2]
  const fifth = extended[degree + 4]
  const toMidi = (semis: number) => rootNote + semis + 12 * (octave + 1)
  return [toMidi(base), toMidi(third), toMidi(fifth)]
}

// resolve um passo (grau da escala OU voicing customizada do modo PRO) pras
// notas MIDI que precisam soar — ponto único usado tanto pela reprodução ao
// vivo (mixgraph.ts) quanto pelo export offline (render.ts, que chama a
// mesma função de agendamento)
export function chordStepMidiNotes(
  entry: ChordStepEntry | undefined,
  rootNote: number,
  mode: MusicMode,
  octave: number,
): number[] | null {
  if (entry === null || entry === undefined) return null
  if (typeof entry === "number") return degreeTriadMidi(rootNote, mode, entry, octave)
  return entry.midi
}

// nome legível de uma nota MIDI (ex: "C4", "D#3") — usado nos chips da
// esteira e nos rótulos do grid de voicing do modo PRO
export function midiToNoteName(midi: number): string {
  const pc = ((midi % 12) + 12) % 12
  return `${NOTE_NAMES[pc]}${Math.floor(midi / 12) - 1}`
}
