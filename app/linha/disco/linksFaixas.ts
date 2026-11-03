// O "♥ SALVAR" (a ponte para o streaming, bíblia §7, 03/11): um toque e a faixa
// abre no app de música da pessoa, pra ela salvar ou pôr na playlist. Nunca
// obrigatório, nunca missão. Sem link aqui, o botão nem aparece.
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
export const LINK_ARTISTA = ""

export const LINKS_FAIXAS: Record<PistaId, LinksFaixa> = {
  ontem: { smart: "", spotify: "", apple: "", youtube: "" }, // Sabe Ontem?
  copo: { smart: "", spotify: "", apple: "", youtube: "" }, // Copo Americano
  swav: { smart: "", spotify: "", apple: "", youtube: "" }, // Swav
  sexta: { smart: "", spotify: "", apple: "", youtube: "" }, // Sexta-Feira
  rollercoaster: { smart: "", spotify: "", apple: "", youtube: "" }, // Rollercoaster
  dopamina: { smart: "", spotify: "", apple: "", youtube: "" }, // DopaminA
  chuva: { smart: "", spotify: "", apple: "", youtube: "" }, // CHUVA
  ojala: { smart: "", spotify: "", apple: "", youtube: "" }, // Ojalá
  nectar: { smart: "", spotify: "", apple: "", youtube: "" }, // Nectar
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

/** o toque no "♥ salvar": abre o app/a página e conta (PostHog, se a pessoa
 *  aceitou). `onde` = de onde veio o toque (nexo, guitar, radio) */
export function salvarFaixa(id: string, onde: string) {
  const m = melhor(id)
  if (!m) return
  try { window.open(m.url, "_blank", "noopener") } catch {}
  track("external_link_click", { destination: m.destino, track_id: id, place_id: onde, utm_source: "cidade-neon", utm_campaign: "salvar_faixa" })
}
