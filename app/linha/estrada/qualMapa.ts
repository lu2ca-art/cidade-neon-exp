// qual mapa esta aba está jogando: o velho (padrão), o novo (?mapa=novo) ou o
// disco (?mapa=disco, em construção). Fica marcado na aba; ?mapa=velho desfaz.
// Arquivo leve de propósito: a página usa sem carregar a Corrida.
//
// (20/10) a prévia desta branch abre no disco sem precisar do ?mapa=disco (o
// login da Vercel derrubava o parâmetro do link e ele caía no mapa velho). A
// produção (lu2ca.art) não muda: lá o padrão continua o velho.
const BRANCH_DISCO = "feature/game/mapa-disco"
function previaDoDisco() {
  if (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF === BRANCH_DISCO) return true
  return process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" && location.hostname.startsWith("v0-ip-hone-call-simulati")
}
export function qualMapa(): "velho" | "novo" | "disco" {
  if (typeof window === "undefined") return "velho"
  try {
    const q = new URLSearchParams(location.search).get("mapa")
    if (q === "novo" || q === "disco" || q === "velho") sessionStorage.setItem("cn-mapa", q)
    const m = sessionStorage.getItem("cn-mapa")
    if (m === "novo" || m === "disco") return m
    if (m === "velho") return "velho"
    return previaDoDisco() ? "disco" : "velho"
  } catch { return "velho" }
}
