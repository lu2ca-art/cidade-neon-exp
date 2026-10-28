// A SINUCA (T17): as regras do 8 ball, do jeito simples do 8 Ball Pool.
// Mesa aberta até alguém encaçapar depois da quebra (a primeira bola que cai
// diz o grupo). Falta = a branca cai, não toca em nada, toca primeiro na
// bola errada, ou nenhuma bola vai na tabela depois do toque. Falta dá bola
// na mão em qualquer lugar pro outro. A 8 só no fim: antes da hora (ou com
// falta) perde; na quebra ela volta pro ponto do pé.

import type { Mesa } from "./fisica"

export type Grupo = "lisas" | "listradas" | null
export type Modo = "mubarak" | "pratica"

export interface Regras {
  modo: Modo
  vez: 0 | 1 // 0 = você, 1 = o Mubarak
  grupos: [Grupo, Grupo]
  quebra: boolean
  mao: "livre" | "cabeceira" | null // bola na mão
  fim: null | { vencedor: 0 | 1; motivo: string }
  tacadas: number
}

export const grupoDe = (id: number): Grupo => (id >= 1 && id <= 7 ? "lisas" : id >= 9 && id <= 15 ? "listradas" : null)
export const outroGrupo = (g: Grupo): Grupo => (g === "lisas" ? "listradas" : g === "listradas" ? "lisas" : null)

export function novasRegras(modo: Modo): Regras {
  return { modo, vez: 0, grupos: [null, null], quebra: true, mao: "cabeceira", fim: null, tacadas: 0 }
}

const naMesa = (ids: number[], g: Grupo) => ids.filter((id) => grupoDe(id) === g)

// em que bolas o jogador da vez pode mirar
export function alvos(r: Regras, ativos: number[]): number[] {
  const g = r.grupos[r.vez]
  if (!g) return ativos.filter((id) => id !== 0 && id !== 8)
  const meus = naMesa(ativos, g)
  return meus.length ? meus : [8]
}

export interface Julgamento {
  r: Regras
  falta: string // "" = sem falta
  msg: string // o que aparece na tela
  continua: boolean
  recolocar8: boolean
  devolverBranca: boolean
}

// ativosAntes: as bolas na mesa antes da tacada
export function julgar(r0: Regras, ativosAntes: number[], m: Mesa): Julgamento {
  const r: Regras = { ...r0, grupos: [...r0.grupos] as [Grupo, Grupo], tacadas: r0.tacadas + 1 }
  const quem = r.vez
  const outro: 0 | 1 = r.modo === "pratica" ? quem : ((1 - quem) as 0 | 1)
  const caidas = m.caidas.map((c) => c.id)
  const branca = caidas.includes(0)
  const oito = caidas.includes(8)
  const meu = r.grupos[quem]
  const limpoAntes = !!meu && naMesa(ativosAntes, meu).length === 0

  let falta = ""
  if (branca) falta = "a branca caiu"
  else if (m.primeiro < 0) falta = "a branca não tocou em nenhuma bola"
  else if (meu) {
    if (limpoAntes ? m.primeiro !== 8 : grupoDe(m.primeiro) !== meu) falta = limpoAntes ? "tinha que tocar primeiro na 8" : `tocou primeiro na bola errada (a ${m.primeiro})`
  } else if (m.primeiro === 8 && !r.quebra) falta = "tocou primeiro na 8"
  if (!falta && !r.quebra && caidas.length === 0 && !m.tabelaDepois) falta = "nenhuma bola foi na tabela"

  let msg = ""
  let recolocar8 = false
  if (oito) {
    if (r.quebra) { recolocar8 = true; msg = "a 8 caiu na quebra: volta pro lugar" }
    else if (limpoAntes && !falta) r.fim = { vencedor: quem, motivo: "encaçapou a 8" }
    else r.fim = { vencedor: r.modo === "pratica" ? 1 : outro, motivo: falta ? `a 8 caiu com falta (${falta})` : "a 8 caiu antes da hora" }
  }

  // o grupo: a primeira bola que cai numa tacada limpa, fora da quebra
  if (!r.fim && !meu && !r.quebra && !falta) {
    const pri = caidas.find((id) => grupoDe(id))
    if (pri !== undefined) {
      const g = grupoDe(pri)
      r.grupos[quem] = g
      if (r.modo === "mubarak") r.grupos[outro] = outroGrupo(g)
      msg = quem === 0 ? `você fica com as ${g}` : `o Mubarak fica com as ${g}`
    }
  }
  const g = r.grupos[quem]
  const encacapouSua = caidas.some((id) => id !== 0 && id !== 8 && (g ? grupoDe(id) === g : true))
  const continua = !r.fim && !falta && encacapouSua

  r.quebra = false
  r.mao = null
  if (!r.fim) {
    if (falta) { r.vez = outro; r.mao = "livre" }
    else if (!continua) r.vez = outro
  }
  if (falta) msg = `falta: ${falta}`
  return { r, falta, msg, continua, recolocar8, devolverBranca: branca }
}
