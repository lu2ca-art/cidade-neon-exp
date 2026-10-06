"use client"

// Ouvir fora do jogo: Spotify, Apple Music, YouTube Music e Deezer, link
// DIRETO pra faixa (não pra busca). Faixa sem link numa plataforma (ainda
// processando, ou que não saiu) cai na página do LU2CA nessa plataforma.
// Links tirados em 06/10 dos smartlinks da Ditto, da API pública da Deezer,
// da busca da Apple e do Spotify. Faixa nova: acrescentar aqui no dia.

import type { EstacaoId } from "./data"
import { track } from "@/lib/analytics"

export type PlataformaId = "spotify" | "apple" | "youtube" | "deezer"

export const PLATAFORMAS: { id: PlataformaId; nome: string; curto: string; cor: string }[] = [
  { id: "spotify", nome: "Spotify", curto: "Spotify", cor: "#1ed760" },
  { id: "apple", nome: "Apple Music", curto: "Apple", cor: "#fa5770" },
  { id: "youtube", nome: "YouTube Music", curto: "YouTube", cor: "#ff3b3b" },
  { id: "deezer", nome: "Deezer", curto: "Deezer", cor: "#a238ff" },
]

const ARTISTA: Record<PlataformaId, string> = {
  spotify: "https://open.spotify.com/artist/4usu8NiBnHtI02Xvh6bn3l",
  apple: "https://music.apple.com/br/artist/lu2ca/1760823074",
  youtube: "https://music.youtube.com/search?q=LU2CA",
  deezer: "https://www.deezer.com/artist/276148971",
}

const yt = (q: string) => `https://music.youtube.com/search?q=${encodeURIComponent(`LU2CA ${q}`)}`

export const LINKS: Partial<Record<EstacaoId, Partial<Record<PlataformaId, string>>>> = {
  chuva: {
    spotify: "https://open.spotify.com/track/1JT0MfwIqtr1RxXxtxLChA",
    apple: "https://music.apple.com/br/album/chuva/1769122368?i=1769122799",
    youtube: "https://music.youtube.com/playlist?list=OLAK5uy_lDGiE3xcQDPoi3SiVKKVA9eIwRx6-f-zM",
    deezer: "https://www.deezer.com/track/2999820211",
  },
  copo: {
    spotify: "https://open.spotify.com/track/4DYevP4zARvbm8OvmHjvoU",
    apple: "https://music.apple.com/br/album/copo-americano/1780572285?i=1780572717",
    youtube: "https://music.youtube.com/playlist?list=OLAK5uy_my3dkkeGLHVkQaeOYKlNUu99xbRzlJLbc",
    deezer: "https://www.deezer.com/track/3100240391",
  },
  dopamina: {
    spotify: "https://open.spotify.com/track/3VY1XVScepLnITFdvGRlkn",
    apple: "https://music.apple.com/br/album/dopamina/1877565482?i=1877565483",
    youtube: yt("Dopamina"),
    deezer: "https://www.deezer.com/track/3846476251",
  },
  sexta: {
    spotify: "https://open.spotify.com/track/3JdymrUE96UQlhUEI7GuMC",
    apple: "https://music.apple.com/br/album/sexta-feira/1887941536?i=1887941537",
    youtube: yt("Sexta-Feira"),
    deezer: "https://www.deezer.com/track/3921415361",
  },
  ontem: {
    spotify: "https://open.spotify.com/track/4FHMTXwQMyyq3GSqWJ91jD",
    // apple: ainda não aparecia na busca da Apple em 06/10 (cai no artista)
    youtube: "https://music.youtube.com/watch?v=oedzqXNw-U0",
    deezer: "https://www.deezer.com/track/4279545722",
  },
  // nectar, ojala, swav, rollercoaster: no dia de cada lançamento
}

// Pré-save (smartlink da Ditto) das faixas que ainda não saíram. No dia do
// lançamento a faixa ganha os LINKS acima e o pré-save some sozinho (lancada).
export const PRESAVE: Partial<Record<EstacaoId, string>> = {
  nectar: "https://ditto.fm/nectar-lu2ca",
}

export function PreSave({ faixa, lugar }: { faixa: EstacaoId; lugar: string }) {
  const url = PRESAVE[faixa]
  if (!url) return null
  return (
    <a
      className="l-presave"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("external_link_click", { destination: "presave", track_id: faixa, place_id: lugar })}
    >
      pré-save ↗
    </a>
  )
}

export function linkDe(faixa: EstacaoId | null, p: PlataformaId) {
  const base = (faixa && LINKS[faixa]?.[p]) || ARTISTA[p]
  // utm só onde não atrapalha o app abrir (Spotify e Apple ignoram)
  return base.includes("deezer.com") ? `${base}?utm_source=cidade-neon&utm_medium=game` : base
}

// a fileira de botões: uma faixa (ou o LU2CA, sem faixa) em todas as plataformas
export function Plataformas({ faixa, lugar, compacto }: { faixa: EstacaoId | null; lugar: string; compacto?: boolean }) {
  return (
    <div className={`l-plats ${compacto ? "is-compacto" : ""}`}>
      {PLATAFORMAS.map((p) => (
        <a
          key={p.id}
          href={linkDe(faixa, p.id)}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ["--plat" as string]: p.cor }}
          aria-label={`ouvir no ${p.nome}`}
          onClick={() => track("external_link_click", { destination: p.id, track_id: faixa ?? "artista", place_id: lugar })}
        >
          <Marca id={p.id} />
          <span>{compacto ? p.curto : p.nome}</span>
        </a>
      ))}
    </div>
  )
}

// marcas simplificadas, no traço do celular (não são os logos oficiais)
function Marca({ id }: { id: PlataformaId }) {
  const p = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "var(--plat)", strokeWidth: 1.8, strokeLinecap: "round" as const, "aria-hidden": true }
  switch (id) {
    case "spotify": return <svg {...p}><circle cx="12" cy="12" r="9.5" /><path d="M7 9.5c3.5-1 7-.6 10 1M7.6 12.8c2.8-.7 5.6-.4 8 .9M8.2 15.8c2.2-.5 4.3-.3 6.1.7" /></svg>
    case "apple": return <svg {...p}><path d="M9 17V6.5l9-2V15" /><circle cx="7" cy="17" r="2" /><circle cx="16" cy="15" r="2" /></svg>
    case "youtube": return <svg {...p}><circle cx="12" cy="12" r="9.5" /><path d="M10 8.5v7l6-3.5z" fill="var(--plat)" /></svg>
    case "deezer": return <svg {...p}><path d="M4 18h3M9 18h3M14 18h3M19 18h1.5M9 14.5h3M14 14.5h3M19 14.5h1.5M14 11h3M19 11h1.5M19 7.5h1.5" /></svg>
  }
}
