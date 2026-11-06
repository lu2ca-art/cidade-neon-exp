// O "♥ SALVAR" (a ponte para o streaming, bíblia §7, 03/11): um toque e a faixa
// abre no app de música da pessoa, pra ela salvar ou pôr na playlist. Nunca
// obrigatório, nunca missão. Sem link aqui, o botão nem aparece.
//
// (05/11) Preenchido com os links que já estavam em ../plataformas.tsx: o `smart` é o
// song.link da faixa no Spotify (abre a página com todos os apps). Swav e Rollercoaster
// ainda não têm faixa lançada: caem no perfil do LU2CA (LINK_ARTISTA). O Ojalá saiu 06/11.
//
// ── COMO PREENCHER (pro dono) ──
// Para cada faixa, cole o link entre as aspas. O melhor é o `smart`: o link
// inteligente da distribuidora (HyperFollow da DistroKid, Feature.fm, ONErpm,
// Linkfire...). Ele abre uma página com todos os apps e a pessoa escolhe o dela.
// Se não tiver, cole o do Spotify, o da Apple Music ou o do YouTube. Basta um.
// O jogo usa o primeiro que existir, nesta ordem:
//   smart → spotify → apple → youtube → LINK_ARTISTA (o perfil geral do LU2CA)
// Exemplo:
//   copo: { smart: "https://distrokid.com/hyperfollow/lu2ca/copo-americano" },
//
// Para ver o botão antes dos links reais: abrir o jogo com ?links=teste no fim do
// endereço. Aí todas as faixas abrem uma busca no Spotify (só naquela vez).

import { PISTAS, type PistaId } from "../estrada/pistas"
import { track } from "@/lib/analytics"

export type LinksFaixa = { smart?: string; spotify?: string; apple?: string; youtube?: string }

/** o perfil do LU2CA (vale pra faixa que ainda não tem link próprio) */
export const LINK_ARTISTA = "https://open.spotify.com/artist/4usu8NiBnHtI02Xvh6bn3l"

export const LINKS_FAIXAS: Record<PistaId, LinksFaixa> = {
  ontem: { smart: "https://song.link/s/4FHMTXwQMyyq3GSqWJ91jD", spotify: "https://open.spotify.com/track/4FHMTXwQMyyq3GSqWJ91jD", apple: "", youtube: "" }, // Sabe Ontem?
  copo: { smart: "https://song.link/s/4DYevP4zARvbm8OvmHjvoU", spotify: "https://open.spotify.com/track/4DYevP4zARvbm8OvmHjvoU", apple: "", youtube: "" }, // Copo Americano
  swav: { smart: "", spotify: "", apple: "", youtube: "" }, // Swav
  sexta: { smart: "https://song.link/s/3JdymrUE96UQlhUEI7GuMC", spotify: "https://open.spotify.com/track/3JdymrUE96UQlhUEI7GuMC", apple: "", youtube: "" }, // Sexta-Feira
  rollercoaster: { smart: "", spotify: "", apple: "", youtube: "" }, // Rollercoaster
  dopamina: { smart: "https://song.link/s/3VY1XVScepLnITFdvGRlkn", spotify: "https://open.spotify.com/track/3VY1XVScepLnITFdvGRlkn", apple: "", youtube: "" }, // DopaminA
  chuva: { smart: "https://song.link/s/1JT0MfwIqtr1RxXxtxLChA", spotify: "https://open.spotify.com/track/1JT0MfwIqtr1RxXxtxLChA", apple: "", youtube: "" }, // CHUVA
  ojala: { smart: "https://song.link/s/6xKW52exqgwgTv4scGBjX6", spotify: "https://open.spotify.com/track/6xKW52exqgwgTv4scGBjX6", apple: "", youtube: "" }, // Ojalá (saiu 06/11)
  nectar: { smart: "https://song.link/s/1xmpDdYDKLx9UhiqMkUiop", spotify: "https://open.spotify.com/track/1xmpDdYDKLx9UhiqMkUiop", apple: "", youtube: "" }, // Nectar
}

// ?links=teste: todas apontam pra uma busca no Spotify (só nesta página aberta)
let teste: boolean | null = null
function modoTeste(): boolean {
  if (teste === null) {
    try { teste = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("links") === "teste" } catch { teste = false }
  }
  return teste
}

type Destino = "spotify" | "apple" | "youtube" | "other"
function melhor(id: string): { url: string; destino: Destino } | null {
  const p = PISTAS.find((x) => x.id === id)
  if (!p) return null
  if (modoTeste()) return { url: `https://open.spotify.com/search/${encodeURIComponent(`LU2CA ${p.faixa}`)}`, destino: "spotify" }
  const l = LINKS_FAIXAS[p.id]
  if (l.smart) return { url: l.smart, destino: "other" }
  if (l.spotify) return { url: l.spotify, destino: "spotify" }
  if (l.apple) return { url: l.apple, destino: "apple" }
  if (l.youtube) return { url: l.youtube, destino: "youtube" }
  if (LINK_ARTISTA) return { url: LINK_ARTISTA, destino: "other" }
  return null
}

/** o melhor link da faixa (smart > spotify > apple > youtube > LINK_ARTISTA) ou null */
export function linkDaFaixa(id: string | null | undefined): string | null {
  return id ? melhor(id)?.url ?? null : null
}

/** o nome da faixa (pro texto do botão) */
export const nomeDaFaixa = (id: string | null | undefined) => PISTAS.find((x) => x.id === id)?.faixa ?? ""

/** a faixa do vol. 1 de um título da rádio ("CHUVA · ao vivo" → "chuva"), ou null */
export function faixaDoTitulo(titulo: string | null | undefined): PistaId | null {
  if (!titulo) return null
  const t = titulo.toLowerCase()
  return PISTAS.find((p) => t.startsWith(p.faixa.toLowerCase()))?.id ?? null
}

/** o toque no "♥ salvar": abre o app/a página e conta (PostHog, se a pessoa
 *  aceitou). `onde` = de onde veio o toque (nexo, guitar, radio) */
export function salvarFaixa(id: string, onde: string) {
  const m = melhor(id)
  if (!m) return
  try { window.open(m.url, "_blank", "noopener") } catch {}
  track("external_link_click", { destination: m.destino, track_id: id, place_id: onde, utm_source: "cidade-neon", utm_campaign: "salvar_faixa" })
}
