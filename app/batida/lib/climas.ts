// "começa no clima de…" — uma música que já nasce tocando, no BPM da faixa,
// com um kit de bateria da cidade e os chops dela. Sem baixo de propósito:
// o tom das faixas não está mapeado aqui, e um baixo no tom errado brigaria
// com os chops. A tonalidade fica pra pessoa definir na página do baixo.

import { defaultFx, emptySong, newTrackId, type DrumRow, type DrumTimbre, type Song } from "./types"

interface Clima {
  kit: string
  nome: string
  bpm: number
  cor: string
  bateria: DrumTimbre
  ritmo: Record<DrumRow, number[]> // passos acesos (colcheias, 1 compasso)
  chops: [number, number][] // [pad, passo] em 2 compassos (0-15)
}

export const CLIMAS: Clima[] = [
  {
    kit: "chuva", nome: "CHUVA", bpm: 95, cor: "#2fe8ff", bateria: "chuva",
    ritmo: { kick: [0, 5], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6, 7], perc: [3, 7] },
    chops: [[2, 0], [0, 6], [3, 8], [6, 14]],
  },
  {
    kit: "copo", nome: "COPO AMERICANO", bpm: 110, cor: "#ff6a35", bateria: "neonio",
    ritmo: { kick: [0, 3, 5], snare: [2, 6], hat: [0, 2, 4, 6], perc: [] },
    chops: [[2, 0], [1, 4], [4, 8], [7, 12]],
  },
  {
    kit: "dopamina", nome: "DOPAMINA", bpm: 128, cor: "#5dffa0", bateria: "xenonio",
    ritmo: { kick: [0, 2, 4, 6], snare: [2, 6], hat: [1, 3, 5, 7], perc: [7] },
    chops: [[0, 0], [0, 4], [3, 8], [6, 12], [0, 14]],
  },
  {
    kit: "sexta", nome: "SEXTA-FEIRA", bpm: 105, cor: "#ff3fb0", bateria: "argonio",
    ritmo: { kick: [0, 5], snare: [4], hat: [0, 1, 2, 3, 4, 5, 6, 7], perc: [3] },
    chops: [[2, 0], [5, 8], [7, 12]],
  },
  {
    kit: "ontem", nome: "SABE ONTEM?", bpm: 100, cor: "#ffc857", bateria: "xenonio",
    ritmo: { kick: [0, 3, 6], snare: [4], hat: [0, 2, 4, 6, 7], perc: [5] },
    chops: [[3, 0], [1, 6], [4, 8], [6, 15]],
  },
]

export function musicaNoClima(c: Clima): Song {
  const song = emptySong(`song-${Date.now()}`)
  const cells = {} as Record<DrumRow, boolean[]>
  for (const row of ["kick", "snare", "hat", "perc"] as DrumRow[]) {
    cells[row] = Array.from({ length: 8 }, (_, i) => c.ritmo[row].includes(i))
  }
  const chops = Array.from({ length: 8 }, () => Array(16).fill(false) as boolean[])
  for (const [pad, passo] of c.chops) chops[pad][passo] = true
  return {
    ...song,
    name: `no clima de ${c.nome.toLowerCase()}`,
    bpm: c.bpm,
    tracks: [
      { id: newTrackId(), instrument: "bateria", fx: defaultFx(), data: { kind: "drum", timbre: c.bateria, bars: 1, cells } },
      { id: newTrackId(), instrument: "chops", fx: { ...defaultFx(), reverb: 0.15 }, data: { kind: "chops", kit: c.kit, bars: 2, cells: chops } },
    ],
  }
}
