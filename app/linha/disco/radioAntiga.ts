// ONDE A RÁDIO SOA ANTIGA (trilha sonora, 05/11; bíblia, seção 9: "ao chegar
// do deserto no subúrbio Xenom, começa a rádio, com filtro de rádio antigo").
//
// - a zona do som: cidade (nas pistas), subúrbio (no chão, perto do anel),
//   deserto (no chão, longe) e túneis (as trincheiras)
// - no subúrbio e nos túneis a rádio passa pelo filtro de rádio antigo
//   (som.ts, radioAntiga); na cidade e no deserto, limpa
// - a PRIMEIRA chegada do deserto no subúrbio avisa quem ouve (a page.tsx liga
//   a rádio uma vez só e grava no save; depois respeita se ele desligou)
//
// Barato: o Corrida chama definirZonaSom a cada quadro; só faz algo quando muda.

import { radioAntiga } from "../som"

export type ZonaSom = "cidade" | "suburbio" | "deserto" | "tuneis"

// o mesmo raio que o clima usa (Corrida.tsx): no chão e mais longe que isso do
// centro do mapa, é deserto (a casa da D-Bee fica a ~2600 m; o subúrbio, a ~1000 m)
export const RAIO_DESERTO = 1300

/** onde a Kombi está, pro som: `livre` = fora das vias (no chão), wx/wz = a posição */
export function zonaDoSom(livre: boolean, wx: number | undefined, wz: number | undefined): ZonaSom {
  if (!livre || wx === undefined || wz === undefined) return "cidade"
  return wx * wx + wz * wz > RAIO_DESERTO * RAIO_DESERTO ? "deserto" : "suburbio"
}

// o filtro de rádio antigo vale aqui
export const ZONAS_RADIO_ANTIGA: ZonaSom[] = ["suburbio", "tuneis"]

let zona: ZonaSom | null = null
const ouvintes = new Set<() => void>()
// (rádios, 05/11) quem quer saber de toda troca de zona (a estação muda com ela: disco/radios.ts)
const ouvintesZona = new Set<(z: ZonaSom, antes: ZonaSom | null) => void>()
export const zonaSomAgora = () => zona

export function definirZonaSom(z: ZonaSom) {
  if (z === zona) return
  const antes = zona
  zona = z
  radioAntiga(ZONAS_RADIO_ANTIGA.includes(z))
  if (antes === "deserto" && z === "suburbio") ouvintes.forEach((f) => f())
  ouvintesZona.forEach((f) => f(z, antes))
}

/** toda troca de zona (barato: só chama quando muda) */
export function aoMudarZona(f: (z: ZonaSom, antes: ZonaSom | null) => void) {
  ouvintesZona.add(f)
  return () => { ouvintesZona.delete(f) }
}

/** chegou do deserto no subúrbio (toda vez; quem ouve decide se é a primeira) */
export function aoChegarNoSuburbio(f: () => void) {
  ouvintes.add(f)
  return () => { ouvintes.delete(f) }
}
