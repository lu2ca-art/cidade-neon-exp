// qual mapa esta aba está jogando: o velho (padrão), o novo (?mapa=novo) ou o
// disco (?mapa=disco, em construção). Fica marcado na aba; ?mapa=velho desfaz.
// Arquivo leve de propósito: a página usa sem carregar a Corrida.
export function qualMapa(): "velho" | "novo" | "disco" {
  if (typeof window === "undefined") return "velho"
  try {
    const q = new URLSearchParams(location.search).get("mapa")
    if (q === "novo" || q === "disco") sessionStorage.setItem("cn-mapa", q)
    if (q === "velho") sessionStorage.removeItem("cn-mapa")
    const m = sessionStorage.getItem("cn-mapa")
    return m === "novo" || m === "disco" ? m : "velho"
  } catch { return "velho" }
}
