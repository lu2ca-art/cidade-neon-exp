// Missões no mapa — cada uma tem um contato/letra (estilo marcador de missão
// de GTA), a rota que abre no celular, em que confirmationCount ela aparece
// no mapa e conta como concluída, e a distância dirigida até "chegar no
// local" (odômetro, mesma unidade de TOTAL_LEN — a primeira é curta pra
// aprender a mecânica, as seguintes aumentam).

// Constantes da engine pseudo-3D do /drive — reexportadas pra qualquer
// consumidor (missões usam TOTAL_LEN como referência de distância).
export const ROAD_LEN  = 1600
export const SEG_LEN   = 200
export const DRAW_DIST = 100
export const ROAD_W    = 2200
export const CAM_H     = 1500
export const CAM_DEPTH = 0.84
export const TOTAL_LEN = ROAD_LEN * SEG_LEN

export interface MissionDef {
  id: "nectar" | "batida" | "guitarDriver"
  letter: string
  name: string
  route: string
  visibleFromCC: number
  doneAtCC: number
  distance: number
}

export const MISSIONS: MissionDef[] = [
  { id: "nectar",       letter: "A", name: "NECTAR",       route: "/nectar",     visibleFromCC: 0, doneAtCC: 1, distance: TOTAL_LEN * 0.15 },
  { id: "batida",       letter: "N", name: "B4TIDA",       route: "/batida",     visibleFromCC: 1, doneAtCC: 2, distance: TOTAL_LEN * 0.35 },
  { id: "guitarDriver", letter: "D", name: "GUITAR DRIVER",route: "/neon-tiles", visibleFromCC: 2, doneAtCC: 3, distance: TOTAL_LEN * 0.6 },
]

export function activeMission(confirmationCount: number): MissionDef | undefined {
  return MISSIONS.find(m => m.doneAtCC > confirmationCount)
}

export const MISSION_COLORS: Record<MissionDef["id"], string> = {
  nectar: "#a78bfa",
  batida: "#00e5ff",
  guitarDriver: "#ff2d78",
}
