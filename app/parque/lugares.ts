// Onde ficam os brinquedos do parque a pé (leve: a página lê sem puxar o three.js)

export type Brinquedo = "montanha" | "roda" | "carrossel"
export interface Controle { mx: number; my: number; yaw: number; pitch: number; corre: boolean; roda: boolean }

export const RODA = { x: 42, z: -52, r: 14, h: 17 }
export const CARROSSEL = { x: 58, z: 12, r: 7 }
export const MONTANHA_XZ: [number, number] = [-78, -8]
export const PERTO: { id: Brinquedo; x: number; z: number; nome: string }[] = [
  { id: "montanha", x: MONTANHA_XZ[0] + 8, z: MONTANHA_XZ[1] - 6, nome: "andar na montanha-russa" },
  { id: "roda", x: RODA.x, z: RODA.z + 7, nome: "andar na roda-gigante" },
  { id: "carrossel", x: CARROSSEL.x - 9, z: CARROSSEL.z, nome: "o carrossel" },
]
