// (notas 04/11, o dono: "o certo é voltar pra onde a gente tava toda vez que
// voltar pro game") ONDE A KOMBI PAROU, guardado entre uma visita e outra.
//
// A Corrida grava de tempos em tempos (e ao sair): na pista (a via, o u, o x) ou
// no chão (x, z, rumo). No ar não grava (fica a última no chão ou na pista).
// Na volta, a Kombi aparece ali. Mora junto do save que vale na aba (o de
// verdade ou o de teste: chaveSave.ts), e um link de teste começa limpo.

import { chaveSave } from "../chaveSave"

// (revisão 05/11) FORA DA KOMBI: de patins ou de moto, com a Kombi estacionada onde
// ficou (o subúrbio é a pé: ela fica na entrada). A volta (abrir o jogo, sair de uma
// sala, subir do túnel) começa assim, sem tirar e pôr ele na Kombi
export interface KombiParada { x: number; y: number; z: number; q: [number, number, number, number]; via: string; u: number; xl: number }
export interface Desembarque { modo: "patins" | "moto"; kombi: KombiParada }
const desembarqueOk = (d: unknown): d is Desembarque => {
  const o = d as Desembarque | null
  return !!o && (o.modo === "patins" || o.modo === "moto") && !!o.kombi && Number.isFinite(o.kombi.x) && Number.isFinite(o.kombi.z) && Array.isArray(o.kombi.q) && o.kombi.q.length === 4
}

export type OndeParou = (
  | { t: "pista"; via: string; u: number; x: number }
  | { t: "chao"; x: number; z: number; rumo: number }
) & { fora?: Desembarque }

const chave = () => `${chaveSave()}-onde`

export function lerOndeParou(): OndeParou | null {
  try {
    const r = JSON.parse(localStorage.getItem(chave()) ?? "null")
    if (r && r.fora !== undefined && !desembarqueOk(r.fora)) delete r.fora
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

// (revisão 05/11) a Kombi acabou de nascer aqui (a volta pro jogo). Os lugares do
// chão em que ela já nasce em cima (a porta do túnel, a casa, o bar…) só valem
// depois que ela sair deles e voltar: senão abrir o jogo de quem fechou a aba nas
// trincheiras (a Corrida grava a boca ao desmontar) descia direto pro túnel
let nasceu: { x: number; z: number; em: number } | null = null
export function nasceuOndeParou(x: number, z: number) {
  nasceu = { x, z, em: typeof performance === "undefined" ? 0 : performance.now() }
}
/** onde a Kombi nasceu pelo ondeParou, nos primeiros 8 s (null = não nasceu assim) */
export function ondeNasceu(): { x: number; z: number } | null {
  if (!nasceu || typeof performance === "undefined" || performance.now() - nasceu.em > 8000) return null
  return nasceu
}
