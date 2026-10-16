// AS FLORES DO ASFALTO (LU2CA 16/10). No lugar dos canteiros: flores que
// nascem das rachaduras na beira da rua, e só aparecem pra quem está de
// patins. Ficam 10 esperando água pela cidade; regou as 10, nascem mais 10
// em outros pontos, e as regadas ficam lá floridas pra sempre — quem rega
// muito enche a cidade de flores. Regar é só a animação: a água cai e a flor
// cresce. (Dados leves; o desenho mora em FloresAsfalto.tsx.)

import type { Especie } from "./canteiros"
import type { Mundo } from "./mundo"

export const POR_VEZ = 10
const CHAVE = "cn-flores-asfalto"
const ESPECIES: Especie[] = ["girassol", "rosa", "lavanda", "hortensia", "margarida", "tulipa", "orquidea"]

export interface FlorAsfalto { id: string; via: number; u: number; lado: 1 | -1; especie: Especie }
export interface EstadoFlores { geracao: number; regadas: FlorAsfalto[]; desta: string[] } // desta: as regadas da leva atual

export function lerFlores(): EstadoFlores {
  try { return { geracao: 0, regadas: [], desta: [], ...JSON.parse(localStorage.getItem(CHAVE) || "{}") } } catch { return { geracao: 0, regadas: [], desta: [] } }
}
export function guardarFlores(e: EstadoFlores) {
  try { localStorage.setItem(CHAVE, JSON.stringify(e)) } catch {}
}

// as 10 da leva: sorteadas (sempre as mesmas pra mesma leva) pelas ruas da
// cidade, do subúrbio e da orla, longe umas das outras
export function levaDe(M: Mundo, geracao: number): FlorAsfalto[] {
  let s = 1013 + geracao * 7919
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const ruas = M.vias.map((v, vi) => ({ v, vi })).filter(({ v }) => v.tipo === "rua" && v.rede?.ida && ["rua", "avenida", "principal", "orla", "beco"].includes(v.rede.tipo) && ["cidade", "suburbio", "orla"].includes(v.rede.bairro) && v.L > 120)
  const out: FlorAsfalto[] = []
  for (let k = 0; k < 400 && out.length < POR_VEZ && ruas.length; k++) {
    const { v, vi } = ruas[Math.floor(r() * ruas.length)]
    const u = 40 + r() * (v.L - 80), i = Math.floor(u / 2)
    const longe = out.every((o) => { const w = M.vias[o.via], j = Math.floor(o.u / 2); return Math.hypot(w.px[j] - v.px[i], w.pz[j] - v.pz[i]) > 140 })
    if (!longe) continue
    out.push({ id: `g${geracao}-${out.length}`, via: vi, u, lado: r() < 0.5 ? -1 : 1, especie: ESPECIES[Math.floor(r() * ESPECIES.length)] })
  }
  return out
}
