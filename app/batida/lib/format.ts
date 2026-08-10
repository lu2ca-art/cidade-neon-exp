import { DRUM_TIMBRE_LABEL, BASS_TIMBRE_LABEL, GUITAR_TIMBRE_LABEL, PIANO_TIMBRE_LABEL } from "./synths"
import type { Track } from "./types"

export function timbreLabel(track: Track): string {
  const d = track.data
  if (d.kind === "drum") return DRUM_TIMBRE_LABEL[d.timbre]
  if (d.kind === "bass") return BASS_TIMBRE_LABEL[d.timbre]
  if (d.kind === "chord" && track.instrument === "guitarra") return GUITAR_TIMBRE_LABEL[d.timbre]
  if (d.kind === "chord") return PIANO_TIMBRE_LABEL[d.timbre]
  return `${d.bars} compassos`
}
