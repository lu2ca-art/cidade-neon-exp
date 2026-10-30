// O registro das salas por dentro: quais lugares têm sala, quais gestos
// cada uma faz em 3D, e como carregar cada uma. LEVE de propósito: a página
// importa isto sem puxar three.js nem nenhuma sala. Cada sala é um pedaço
// separado do pacote, baixado só quando a missão aponta pra ela (ou quando a
// cena abre) — passo 1 da otimização (docs/linha-222/ARQUITETURA-CENAS.md).

import type { ComponentType } from "react"
import type { LugarId } from "../lugares"
import type { SalaMissao } from "../disco/portas"
import type { SalaProps } from "./motor"

type Carga = () => Promise<ComponentType<SalaProps>>

// (T22) a sala de um lugar, ou a casa de uma missão (que mora num lugar mas é outra sala)
export type SalaId = LugarId | SalaMissao

export const CARREGAR: Partial<Record<SalaId, Carga>> = {
  bar: () => import("./salas/Bar").then((m) => m.SalaBar),
  balada: () => import("./salas/Balada").then((m) => m.SalaBalada),
  plataforma: () => import("./salas/Vagao").then((m) => m.SalaVagao),
  "casa-drewboy": () => import("./salas/Quarto").then((m) => m.SalaQuarto),
  escondido: () => import("./salas/Escondido").then((m) => m.SalaEscondido),
  beco: () => import("./salas/Beco").then((m) => m.SalaBeco),
  topo: () => import("./salas/Topo").then((m) => m.SalaTopo),
  "casa-shows": () => import("./salas/Shows").then((m) => m.SalaShows),
  posto: () => import("./salas/Posto").then((m) => m.SalaPosto),
  "casa-dbee": () => import("./salas/CasaDbee").then((m) => m.SalaCasaDbee),
  // (T22) a casa da Ella, que é a galeria: a planta, os quadros, a tela em branco
  "galeria-ella": () => import("./salas/GaleriaElla").then((m) => m.SalaGaleriaElla),
}

export function temSala(id: SalaId) { return !!CARREGAR[id] }

// os gestos que cada sala faz em 3D (o resto continua na legenda)
export const GESTOS_3D: Partial<Record<SalaId, string[]>> = {
  bar: ["copos"],
  balada: ["danca"],
  plataforma: ["tocar", "fuga"],
  "casa-drewboy": ["quarto"],
  escondido: ["prova:regar"],
  beco: ["ordem"],
  "casa-dbee": ["casa", "casa-inicio"],
  "galeria-ella": ["quadros", "pintar"],
}

// baixa antes de precisar: o motor das salas + a sala do lugar. Chamado
// quando a missão passa a apontar pra um lugar (a Kombi ainda está longe)
const pedidas = new Set<string>()
export function precarregarSala(id: SalaId) {
  const c = CARREGAR[id]
  if (!c || pedidas.has(id)) return
  pedidas.add(id)
  const ir = () => { void import("./Interior"); void c().catch(() => pedidas.delete(id)) }
  const w = window as Window & { requestIdleCallback?: (f: () => void) => number }
  if (w.requestIdleCallback) w.requestIdleCallback(ir)
  else setTimeout(ir, 300)
}
