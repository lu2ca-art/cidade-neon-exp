// Abrir o jogo direto numa parte da jornada (22/10): /linha?mapa=disco&parte=casa
// troca o save por um pronto pra aquela parte (os ids de parte.ts e do mapa do
// jogo). O save de verdade fica guardado em CHAVE_REAL (o /teste devolve).
// Só vale fora da produção, como os atalhos do /teste. A mesa de montagem usa
// estes links pra cada momento ter o seu "testar".

import { BASE_TESTE, CHAVE_REAL, CHAVE_SAVE, atalhosLiberados } from "../teste/atalhos"

const MISSOES = ["sexta", "dopamina", "ojala", "swav", "copo", "ontem", "rollercoaster", "chuva", "nectar"]

function discoDa(parte: string): Record<string, unknown> | null {
  if (parte === "inicio" || parte === "minhoca") return null // save novo: começa no buraco de minhoca
  if (["casa"].includes(parte)) return { fase: "casa", holo: false }
  if (["dunas", "bar", "oficina", "subir"].includes(parte)) return { fase: parte, holo: true }
  if (parte === "nectar" || parte.startsWith("nectar.")) return { fase: "nectar", holo: true, nectar: parte.split(".")[1] || "quebra" }
  if (parte === "carreira.feira" || parte === "feira") return { fase: "carreira", holo: true }
  if (parte.startsWith("missao.")) { const m = parte.slice(7); if (MISSOES.includes(m)) return { fase: "carreira", holo: true, missao: m } }
  if (parte === "livre" || parte === "final") return { fase: "livre", holo: true }
  return undefined as unknown as null
}

export const PARTES_TESTE = ["inicio", "minhoca", "casa", "dunas", "bar", "oficina", "subir", "nectar", "carreira.feira", ...MISSOES.map((m) => `missao.${m}`), "livre"]

// chamado antes de o jogo ler o save; devolve true se trocou
export function aplicarParteDeTeste(): boolean {
  if (typeof window === "undefined" || !atalhosLiberados()) return false
  const url = new URL(location.href)
  const parte = url.searchParams.get("parte")
  if (!parte) return false
  const disco = discoDa(parte)
  if (disco === undefined) return false
  if (localStorage.getItem(CHAVE_REAL) === null) localStorage.setItem(CHAVE_REAL, localStorage.getItem(CHAVE_SAVE) ?? "")
  if (disco === null) localStorage.removeItem(CHAVE_SAVE)
  else localStorage.setItem(CHAVE_SAVE, JSON.stringify({ ...BASE_TESTE, disco }))
  // tira o ?parte da URL: recarregar não troca o save de novo
  url.searchParams.delete("parte")
  history.replaceState(null, "", url.pathname + (url.search ? url.search : ""))
  return true
}
