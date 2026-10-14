// Os canteiros da Ella (dados, sem three.js: a página principal lê pra
// contar a conquista; o desenho mora em Flores.tsx).

import type { Mundo } from "./mundo"

export type Especie = "girassol" | "rosa" | "lavanda" | "hortensia" | "margarida" | "tulipa" | "orquidea"
export const ESPECIES: Record<Especie, { nome: string; cor: string; miolo: string; altura: number; n: number }> = {
  girassol: { nome: "os girassóis", cor: "#ffc21a", miolo: "#4a2a12", altura: 1.6, n: 5 },
  rosa: { nome: "as rosas", cor: "#d81b3c", miolo: "#8a0f24", altura: 0.9, n: 8 },
  lavanda: { nome: "a lavanda", cor: "#9b7bd8", miolo: "#7a5cb8", altura: 0.85, n: 14 },
  hortensia: { nome: "as hortênsias", cor: "#5b8cff", miolo: "#8fb0ff", altura: 0.75, n: 5 },
  margarida: { nome: "as margaridas", cor: "#f4f1ea", miolo: "#ffc21a", altura: 0.7, n: 10 },
  tulipa: { nome: "as tulipas", cor: "#ff5a7a", miolo: "#ffd23a", altura: 0.9, n: 9 },
  orquidea: { nome: "as orquídeas", cor: "#d94fd0", miolo: "#fff2a8", altura: 0.95, n: 6 },
}
const ORDEM: Especie[] = ["girassol", "rosa", "lavanda", "hortensia", "margarida", "tulipa", "orquidea"]

export interface Canteiro { id: string; area: "linha" | "suburbio" | "crypto" | "live" | "full"; u: number; lado: 1 | -1; especie: Especie }

// 21 canteiros: longe das portas dos lugares (lugares.ts), do parque, das
// bifurcações e de onde as saídas chegam; no acostamento (a pista é elevada
// em vários trechos: do lado de fora da mureta ninguém vê)
const POS: Omit<Canteiro, "especie">[] = [
  { id: "linha-1", area: "linha", u: 130, lado: -1 },
  { id: "linha-2", area: "linha", u: 260, lado: 1 },
  { id: "linha-3", area: "linha", u: 1750, lado: -1 },
  { id: "linha-4", area: "linha", u: 699, lado: 1 },
  { id: "linha-5", area: "linha", u: 2400, lado: -1 },
  { id: "linha-6", area: "linha", u: 38, lado: 1 },
  { id: "suburbio-1", area: "suburbio", u: 414, lado: -1 },
  { id: "suburbio-2", area: "suburbio", u: 158, lado: 1 },
  { id: "suburbio-3", area: "suburbio", u: 986, lado: -1 },
  { id: "suburbio-4", area: "suburbio", u: 316, lado: 1 },
  { id: "suburbio-5", area: "suburbio", u: 1400, lado: -1 },
  { id: "suburbio-6", area: "suburbio", u: 730, lado: 1 },
  { id: "crypto-1", area: "crypto", u: 508, lado: -1 },
  { id: "crypto-2", area: "crypto", u: 1836, lado: 1 },
  { id: "crypto-3", area: "crypto", u: 194, lado: -1 },
  { id: "live-1", area: "live", u: 1763, lado: 1 },
  { id: "live-2", area: "live", u: 974, lado: -1 },
  { id: "live-3", area: "live", u: 186, lado: 1 },
  { id: "full-1", area: "full", u: 1509, lado: -1 },
  { id: "full-2", area: "full", u: 2086, lado: 1 },
  { id: "full-3", area: "full", u: 1153, lado: -1 },
]
export const CANTEIROS: Canteiro[] = POS.map((c, i) => ({ ...c, especie: ORDEM[i % ORDEM.length] }))
export const canteiroPorId = (id: string) => CANTEIROS.find((c) => c.id === id) ?? null

// o canteiro conta de 70 m antes até 12 m depois (dá tempo de frear)
const ANTES = 70, DEPOIS = 12

// o canteiro logo à frente da Kombi (u em metros na via)
export function canteiroPerto(M: Mundo, via: number, u: number): Canteiro | null {
  const V = M.vias[via]
  for (const c of CANTEIROS) {
    if (M.circuito[c.area] !== via) continue
    let d = c.u - u
    if (V.fechada) d = ((d % V.L) + V.L * 1.5) % V.L - V.L / 2
    if (d > -DEPOIS && d < ANTES) return c
  }
  return null
}

