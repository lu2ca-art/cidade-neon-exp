// ─── B4TIDA — modelo de dados compartilhado ─────────────────────────────────
// Uma "música" (Song) vive num dos 4 slots salvos. Cada música tem até
// MAX_TRACKS faixas (podendo repetir instrumento). Faixas de instrumentos
// "sequenciados" (bateria/baixo/guitarra/piano) guardam um padrão de passos;
// a faixa de voz guarda áudio gravado (Blob) em vez de padrão.

export const MAX_SLOTS = 4
export const MAX_TRACKS = 5
export const MAX_VOICE_BARS = 16

export type InstrumentId = "bateria" | "baixo" | "guitarra" | "piano" | "voz"

export const INSTRUMENT_LABEL: Record<InstrumentId, string> = {
  bateria: "BATERIA",
  baixo: "BAIXO",
  guitarra: "GUITARRA",
  piano: "PIANO",
  voz: "VOZ",
}

export const INSTRUMENT_COLOR: Record<InstrumentId, string> = {
  bateria: "#FF6B6B",
  baixo: "#00E5FF",
  guitarra: "#FFD93D",
  piano: "#A78BFA",
  voz: "#4ADE80",
}

// grade de passos por instrumento sequenciado — bateria em colcheias (8),
// baixo/guitarra/piano em semicolcheias (16), ambos cabendo em exatamente
// 1 compasso (4/4), então tudo permanece sincronizado em loop
export const STEPS_PER_INSTRUMENT: Record<Exclude<InstrumentId, "voz">, number> = {
  bateria: 8,
  baixo: 16,
  guitarra: 16,
  piano: 16,
}

export type DrumTimbre = "sintetico" | "808" | "acustico" | "lofi"
export type MelodicTimbre = 0 | 1 | 2 | 3

// linhas do grid de bateria (mantém compat com o app original)
export type DrumRow = "kick" | "snare" | "hat" | "perc"
export const DRUM_ROWS: { id: DrumRow; label: string; color: string }[] = [
  { id: "kick", label: "KICK", color: "#FF6B6B" },
  { id: "snare", label: "SNARE", color: "#00E5FF" },
  { id: "hat", label: "HAT", color: "#FFD93D" },
  { id: "perc", label: "PERC", color: "#A78BFA" },
]

export interface DrumPattern {
  kind: "drum"
  timbre: DrumTimbre
  cells: Record<DrumRow, boolean[]>
}

// baixo: 7 linhas = graus da escala (I..VII) da tonalidade da música
export interface BassPattern {
  kind: "bass"
  timbre: MelodicTimbre
  cells: boolean[][] // [grau 0-6][passo] — 7 x 16
}

// guitarra/piano: 1 acorde (ou vazio) por passo, escolhido entre os acordes
// desbloqueados pelo baixo
export interface ChordPattern {
  kind: "chord"
  timbre: MelodicTimbre
  steps: (number | null)[] // grau da escala (0-6) ocupando aquele passo, ou null
}

export type SequencedPattern = DrumPattern | BassPattern | ChordPattern

export interface VoiceClip {
  kind: "voice"
  bars: number // 1..MAX_VOICE_BARS
  blob: Blob
}

export interface TrackFx {
  volume: number // 0..1
  reverb: number // 0..1 (send)
  delay: number // 0..1 (send)
  muted: boolean
}

export interface Track {
  id: string
  instrument: InstrumentId
  fx: TrackFx
  data: SequencedPattern | VoiceClip
}

export type MusicMode = "major" | "minor"

export interface Song {
  id: string
  name: string
  bpm: number
  rootNote: number // 0-11, pitch-class (C=0)
  mode: MusicMode
  keySetBy: "bateria" | "baixo" | null // baixo define a tonalidade; até lá fica no default
  tracks: Track[]
  updatedAt: number
}

export function emptySong(id: string): Song {
  return {
    id,
    name: "",
    bpm: 100,
    rootNote: 0, // C
    mode: "major",
    keySetBy: null,
    tracks: [],
    updatedAt: Date.now(),
  }
}

export function newTrackId(): string {
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function defaultFx(): TrackFx {
  return { volume: 0.85, reverb: 0, delay: 0, muted: false }
}

export function tracksOfInstrument(song: Song, instrument: InstrumentId): Track[] {
  return song.tracks.filter((t) => t.instrument === instrument)
}

export function songHasRoomForTrack(song: Song): boolean {
  return song.tracks.length < MAX_TRACKS
}

// graus da escala (I..VII) que o baixo já usou em algum padrão — isso é o
// que "desbloqueia" os acordes disponíveis pra guitarra/piano
export function unlockedDegrees(song: Song): Set<number> {
  const degrees = new Set<number>()
  for (const t of song.tracks) {
    if (t.instrument === "baixo" && t.data.kind === "bass") {
      t.data.cells.forEach((row, degree) => {
        if (row.some(Boolean)) degrees.add(degree)
      })
    }
  }
  return degrees
}
