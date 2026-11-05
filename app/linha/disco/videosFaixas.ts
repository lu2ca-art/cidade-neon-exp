// OS VÍDEOS DA TV DO HOLO (bíblia §7: "a TV no holo, com o YouTube, só com
// player visível e play dado pela pessoa"). Um lugar só: cada faixa do vol. 1
// aponta pro vídeo dela no YouTube. A TV (disco/TvHolo.tsx) toca daqui.
//
// ── COMO COLAR O LINK DE CADA VÍDEO (pro dono) ──
// Abra o vídeo no YouTube (ou no YouTube Music) e olhe o endereço:
//   https://www.youtube.com/watch?v=oedzqXNw-U0       → videoId: "oedzqXNw-U0"
//   https://youtu.be/oedzqXNw-U0                       → videoId: "oedzqXNw-U0"
//   https://music.youtube.com/watch?v=oedzqXNw-U0      → videoId: "oedzqXNw-U0"
//   https://music.youtube.com/playlist?list=OLAK5uy_…  → playlistId: "OLAK5uy_…"
// Cole SÓ o pedaço depois de "v=" (o videoId, 11 letras) ou depois de "list="
// (o playlistId). Se tiver os dois, o videoId manda (o vídeo oficial é melhor
// que a playlist do álbum). Exemplo:
//   swav: { videoId: "abcdEFGhijk" },
// Faixa sem nada aqui: o botão 📺 TV avisa "essa faixa ainda não tem vídeo" e
// não abre. Ver docs/tv-holo.md.

import { PISTAS, type PistaId } from "../estrada/pistas"

export type VideoFaixa = { videoId?: string; playlistId?: string }

// (05/11) preenchido com o que já estava em ../plataformas.tsx (YouTube Music)
export const VIDEOS_FAIXAS: Record<PistaId, VideoFaixa> = {
  ontem: { videoId: "oedzqXNw-U0" }, // Sabe Ontem?
  copo: { playlistId: "OLAK5uy_my3dkkeGLHVkQaeOYKlNUu99xbRzlJLbc" }, // Copo Americano (o álbum/single no YouTube Music)
  swav: {}, // Swav
  sexta: {}, // Sexta-Feira
  rollercoaster: {}, // Rollercoaster
  dopamina: {}, // DopaminA
  chuva: { playlistId: "OLAK5uy_lDGiE3xcQDPoi3SiVKKVA9eIwRx6-f-zM" }, // CHUVA (o álbum/single no YouTube Music)
  ojala: {}, // Ojalá
  nectar: {}, // Nectar
}

/** a ordem da TV (a mesma das pistas, como a rádio) */
export const ORDEM_TV: PistaId[] = PISTAS.map((p) => p.id)

/** o vídeo da faixa, ou null se ela ainda não tem */
export function videoDaFaixa(id: string | null | undefined): VideoFaixa | null {
  if (!id) return null
  const v = VIDEOS_FAIXAS[id as PistaId]
  return v && (v.videoId || v.playlistId) ? v : null
}

/** a próxima faixa (depois de `id`, dando a volta) que tem vídeo; null se nenhuma */
export function proximaComVideo(id: string | null | undefined): PistaId | null {
  const i = ORDEM_TV.indexOf(id as PistaId)
  for (let k = 1; k <= ORDEM_TV.length; k++) {
    const p = ORDEM_TV[(i + k + ORDEM_TV.length) % ORDEM_TV.length]
    if (videoDaFaixa(p)) return p
  }
  return null
}
