// "começa no clima de…" — uma música que já nasce tocando, no BPM e no TOM
// da faixa (tom lido do áudio, mesma tabela da Linha 222), com bateria,
// baixo e um pad fazendo a progressão. Só timbres — nenhum trecho da faixa.

import { defaultFx, emptySong, newTrackId, type DrumRow, type DrumTimbre, type MusicMode, type Song } from "./types"

interface Clima {
  id: string
  nome: string
  bpm: number
  cor: string
  tom: [number, MusicMode] // tônica (0 = Dó) e modo
  bateria: DrumTimbre
  pad: number // timbre do pad
  ritmo: Record<DrumRow, number[]> // passos acesos (colcheias, 1 compasso)
  graus: number[] // progressão: um grau por meio compasso, 2 compassos
}

export const CLIMAS: Clima[] = [
  {
    id: "chuva", nome: "CHUVA", bpm: 95, cor: "#2fe8ff", tom: [2, "minor"], bateria: "chuva", pad: 3,
    ritmo: { kick: [0, 5], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6, 7], perc: [3, 7] },
    graus: [0, 5, 2, 6],
  },
  {
    id: "copo", nome: "COPO AMERICANO", bpm: 110, cor: "#ff6a35", tom: [10, "minor"], bateria: "neonio", pad: 4,
    ritmo: { kick: [0, 3, 5], snare: [2, 6], hat: [0, 2, 4, 6], perc: [] },
    graus: [0, 3, 5, 4],
  },
  {
    id: "dopamina", nome: "DOPAMINA", bpm: 128, cor: "#5dffa0", tom: [5, "minor"], bateria: "xenonio", pad: 0,
    ritmo: { kick: [0, 2, 4, 6], snare: [2, 6], hat: [1, 3, 5, 7], perc: [7] },
    graus: [0, 0, 5, 6],
  },
  {
    id: "sexta", nome: "SEXTA-FEIRA", bpm: 105, cor: "#ff3fb0", tom: [9, "minor"], bateria: "argonio", pad: 2,
    ritmo: { kick: [0, 5], snare: [4], hat: [0, 1, 2, 3, 4, 5, 6, 7], perc: [3] },
    graus: [0, 3, 6, 2],
  },
  {
    id: "ontem", nome: "SABE ONTEM?", bpm: 100, cor: "#ffc857", tom: [8, "minor"], bateria: "xenonio", pad: 5,
    ritmo: { kick: [0, 3, 6], snare: [4], hat: [0, 2, 4, 6, 7], perc: [5] },
    graus: [0, 5, 3, 4],
  },
]

export function musicaNoClima(c: Clima): Song {
  const song = emptySong(`song-${Date.now()}`)
  const cells = {} as Record<DrumRow, boolean[]>
  for (const row of ["kick", "snare", "hat", "perc"] as DrumRow[]) {
    cells[row] = Array.from({ length: 8 }, (_, i) => c.ritmo[row].includes(i))
  }
  // 2 compassos de semicolcheias: um grau a cada 8 passos
  const steps: (number | null)[] = Array(32).fill(null)
  const baixo = Array.from({ length: 7 }, () => Array(32).fill(false) as boolean[])
  c.graus.forEach((g, k) => {
    steps[k * 8] = g
    baixo[g][k * 8] = true
    baixo[g][k * 8 + 6] = true
  })
  return {
    ...song,
    name: `no clima de ${c.nome.toLowerCase()}`,
    bpm: c.bpm,
    rootNote: c.tom[0],
    mode: c.tom[1],
    keySetBy: "baixo",
    tracks: [
      { id: newTrackId(), instrument: "bateria", fx: defaultFx(), data: { kind: "drum", timbre: c.bateria, bars: 1, cells } },
      { id: newTrackId(), instrument: "baixo", fx: defaultFx(), data: { kind: "bass", timbre: 1, bars: 2, cells: baixo } },
      { id: newTrackId(), instrument: "pad", fx: { ...defaultFx(), volume: 0.7, reverb: 0.2 }, data: { kind: "chord", timbre: c.pad, bars: 2, steps } },
    ],
  }
}
