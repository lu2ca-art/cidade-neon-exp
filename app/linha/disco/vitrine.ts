// O MODO VITRINE (02/11, o dono: "quero todas as experiências visitáveis desde
// o início"). Todo lugar e toda experiência do jogo dá pra VISITAR desde o
// primeiro minuto; o que ainda não foi liberado aparece TRANCADO, com um aviso
// curto do que libera ("faça a missão do Notti pra jogar"), em vez de sumir,
// não deixar entrar ou dizer "em breve". O que libera continua igual
// (portas.ts: trancado, CONFIG13.trancar): aqui só o texto do aviso e o
// transporte dele até as páginas (?tranca=, Trancado.tsx). Leve: sem three.js, sem React.
// O inventário (lugar → o que bloqueava → como ficou) mora em docs/vitrine.md.

import { MISSOES13, trancado, type MissaoId, type PortaId } from "./portas"
import type { HistoriaDisco } from "./historia"
import { cenaDe, type Cena } from "../cenas"
import { LUGARES, type LugarId } from "../lugares"

// "da D-Bee", "do Drew", "do mecânico", "dos túneis"
export function daMissao(id: MissaoId): string {
  const q = MISSOES13[id].quem
  if (q.startsWith("os ")) return `dos ${q.slice(3)}`
  if (q.startsWith("o ")) return `do ${q.slice(2)}`
  if (q.startsWith("as ")) return `das ${q.slice(3)}`
  return `${["dbee", "ella", "nizzy"].includes(id) ? "da" : "do"} ${q}`
}

// o pedido curto: "faça a missão do Notti pra jogar"
export const facaMissao = (id: MissaoId, pra: string) => `faça a missão ${daMissao(id)} pra ${pra}`

// a porta trancada agora (a mesma regra do portas.ts) dita como pedido; null = aberta
export function pedidoDaPorta(h: HistoriaDisco | null, porta: PortaId, pra: string): string | null {
  if (!trancado(h, porta)) return null
  const dona = (Object.keys(MISSOES13) as MissaoId[]).find((id) => MISSOES13[id].abre.includes(porta))
  return dona ? facaMissao(dona, pra) : `ainda trancado pra ${pra}`
}

// a missão que libera uma faixa (o fliperama antigo exigia a Rollercoaster)
export const donaDaFaixa = (faixa: string): MissaoId | null => (Object.keys(MISSOES13) as MissaoId[]).find((id) => MISSOES13[id].faixa === faixa) ?? null

// ── o bar do subúrbio depois do prólogo: entra, olha, e a mesa de sinuca no fundo ──
export const CENA_BAR_VISITA: Cena = {
  lugar: "bar",
  titulo: "o copo",
  missao: "copo",
  passos: [
    { t: "acao", texto: "o bar de sempre. o balcão aceso, as mesas, e no fundo a mesa de sinuca" },
    { t: "fala", de: "ela", texto: "a mesa tá livre. treina à vontade" },
    { t: "fim" },
  ],
}
// a partida de verdade é a do Mubarak (a peça da missão dele): null = já liberada
export function trancaSinuca(h: HistoriaDisco | null): string | null {
  if (!h || h.fase === "livre") return null
  if ((h.feitas13 ?? []).includes("mubarak")) return null
  return `treino livre · ${facaMissao("mubarak", "jogar com ele")}`
}

// ── (vitrine, parte 2) as salas da cidade fora da missão: entra, olha, e o que
// é da missão aparece com o cadeado. A casa da D-Bee tem a visita dela
// (CENA_CASA_VISITA, pela page.tsx); estas são as outras ──
export const SALAS_VISITA: LugarId[] = ["balada", "casa-drewboy", "topo", "casa-shows", "casa-dbee"]
export function cenaVisita(id: LugarId, h: HistoriaDisco | null): Cena {
  const L = LUGARES[id]
  const base = cenaDe(id)
  const dona = (Object.keys(MISSOES13) as MissaoId[]).find((m) => MISSOES13[m].lugar.lugar === id && !(h?.feitas13 ?? []).includes(m))
  return {
    lugar: id,
    titulo: L?.nome ?? id,
    missao: base?.missao ?? "sexta",
    passos: [
      { t: "acao", texto: `${L?.nome ?? "o lugar"}. a porta tá aberta: dá pra olhar à vontade` },
      ...(dona ? [{ t: "acao" as const, texto: `trancado · ${facaMissao(dona, "ver o que acontece aqui")}` }] : []),
      { t: "fim" },
    ],
  }
}
