// (missões claras, 02/11, o dono: "não dá pra saber o que tem que ser feito")
// O PRÓXIMO PASSO CONCRETO da missão pegada, numa frase: o que o Nexo escreve
// depois de "Agora:". Onde ir e o que fazer lá. A distância vem do guia
// (estrada/alvoMissao.ts). Função pura: lê a história do save.
// (RASCUNHO das frases: o LU2CA reescreve)

import { LUGARES } from "../lugares"
import { CHAO_LUGARES, type HistoriaDisco } from "./historia"
import { MISSOES13, alvo13, kombiNoConserto, passoAgora, type MissaoId } from "./portas"

// o nome do lugar, curto ("a quadra, no chão do subúrbio", "o palco da Nectar")
export function nomeDoLugar(id: MissaoId): string {
  const m = MISSOES13[id]
  if (m.lugar.chao === "casa") return "a casa da D-Bee, no deserto"
  if (m.lugar.chao) return `${CHAO_LUGARES[m.lugar.chao].nome.toLowerCase()}, ${m.lugar.chao === "palcoDeserto" ? "no centro do deserto" : "no chão do subúrbio"}`
  if (m.lugar.lugar === "casa-drewboy") return "a casa do Drew"
  return m.lugar.lugar ? LUGARES[m.lugar.lugar]?.nome ?? m.quem : m.quem
}

export function agoraDaMissao(h: HistoriaDisco, id: MissaoId): string {
  const m = MISSOES13[id]
  const passo = passoAgora(h, id)
  if (!passo) return `${m.quem}: feita`
  const onde = nomeDoLugar(id)
  if (passo === "porta") return `volta até ${onde}: ${m.quem} te dá a recompensa`
  const pc = m[passo]
  const como = pc.como
  if (!alvo13(h, id) && como?.t === "evento") return como.evento === "montanha" ? "entra numa estação do metrô (no anel de uma torre) e faz a viagem até o fim" : `rega ${como.n} flores na rua, de patins`
  switch (como?.t) {
    case "chegar": return `${kombiNoConserto(h) ? "de patins e jetpack " : ""}até ${onde}`
    case "trincheiras": return "vai até a boca do túnel, no chão do subúrbio, e desce a rampa: a corrida é lá embaixo"
    case "grafite": return "vai até a boca do túnel, no chão do subúrbio, e desce a rampa: o grafite é nas paredes"
    case "casa": return `vai até ${onde} e entra`
    case "basquete": return `vai até ${onde}: ${como.pontos} pontos em ${como.tempo} s no basquete`
    case "batida": return `liga o piloto e faz o beat no caminho até ${onde}`
    case "esporte": return `vai até ${onde}: o esporte que preferir (basquete, ping pong ou ginástica)`
    case "show": return `vai até ${onde} e toca ao vivo no Guitar Driver`
    case "letra": return `vai até ${onde} e escreve a letra`
    default: return `vai até ${onde}: ${pc.nome}`
  }
}
