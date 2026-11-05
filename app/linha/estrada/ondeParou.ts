// (notas 04/11, o dono: "o certo é voltar pra onde a gente tava toda vez que
// voltar pro game") ONDE A KOMBI PAROU, guardado entre uma visita e outra.
//
// A Corrida grava de tempos em tempos (e ao sair): na pista (a via, o u, o x) ou
// no chão (x, z, rumo). No ar não grava (fica a última no chão ou na pista).
// Na volta, a Kombi aparece ali. Mora junto do save que vale na aba (o de
// verdade ou o de teste: chaveSave.ts), e um link de teste começa limpo.

import { chaveSave } from "../chaveSave"

export type OndeParou =
  | { t: "pista"; via: string; u: number; x: number }
  | { t: "chao"; x: number; z: number; rumo: number }

const chave = () => `${chaveSave()}-onde`

export function lerOndeParou(): OndeParou | null {
  try {
    const r = JSON.parse(localStorage.getItem(chave()) ?? "null")
    if (r && r.t === "pista" && typeof r.via === "string" && Number.isFinite(r.u)) return r
    if (r && r.t === "chao" && Number.isFinite(r.x) && Number.isFinite(r.z)) return r
  } catch {}
  return null
}

let ultima = ""
export function gravarOndeParou(o: OndeParou) {
  // arredondado: parado, não regrava
  const s = JSON.stringify(o.t === "pista" ? { ...o, u: Math.round(o.u), x: Math.round(o.x * 10) / 10 } : { ...o, x: Math.round(o.x), z: Math.round(o.z), rumo: Math.round(o.rumo * 100) / 100 })
  if (s === ultima) return
  ultima = s
  try { localStorage.setItem(chave(), s) } catch {}
}

export function apagarOndeParou() {
  ultima = ""
  try { localStorage.removeItem(chave()) } catch {}
}
