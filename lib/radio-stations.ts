// Estações e faixas da rádio do carro — fonte única compartilhada entre
// /drive (canvas 2D) e /drive-cockpit (R3F). Os títulos vêm mascarados
// com asteriscos (convenção do jogo). Cada faixa carrega sua estação/cor
// e o tier — a frequência é anunciada ANTES da missão que a segue (gancho
// pra próxima etapa), exceto CIDADE NEON 222.4 FM, que só entra no ar no
// fim (unlocked.finalCompleted), somando-se ao que já toca na LIVE NEON.

import { ALL_TIERS, TIER_META, type Tier } from "./radio-tiers"

export interface RadioTrack {
  title: string
  src: string
  freq: string
  color: string
  label: string
  tier: Tier
}

const F = TIER_META

export const STATION_TRACKS: Record<string, RadioTrack[]> = {
  "SUBÚRBIO XÊNON": [
    { title: "g*** m**",   src: "/audio/tracks/gata-mia.mp3",     ...F.suburbio },
    { title: "t***o",       src: "/audio/tracks/tedio.mp3",        ...F.suburbio },
    { title: "b*** b*** k", src: "/audio/tracks/boom-boom-k.mp3",  ...F.suburbio },
    { title: "10 D3 10",    src: "/audio/tracks/10de10.mp3",       ...F.suburbio },
  ],
  // CIDADENEON.CRYPTO — os 5 instrumentais do jogo FEEL.GOOD
  "CIDADE NEON": [
    { title: "n****r",      src: "/audio/tracks/inst-nectar.mp3",      ...F.crypto },
    { title: "d*****nA",    src: "/audio/tracks/inst-dopamina.mp3",    ...F.crypto },
    { title: "o***á",       src: "/audio/tracks/inst-ojala.mp3",       ...F.crypto },
    { title: "s*** o****?", src: "/audio/tracks/inst-sabe-ontem.mp3",  ...F.crypto },
    { title: "C***A",       src: "/audio/tracks/inst-chuva.mp3",       ...F.crypto },
  ],
  // NOVA ONDA — LIVE NEON (5 ao vivo) + CIDADE NEON 222.4 FM (15 prévias do álbum)
  "NOVA ONDA": [
    { title: "n****r",      src: "/audio/tracks/live-nectar.mp3",      ...F.live },
    { title: "d*****nA",    src: "/audio/tracks/live-dopamina.mp3",    ...F.live },
    { title: "o***á",       src: "/audio/tracks/live-ojala.mp3",       ...F.live },
    { title: "s*** o****?", src: "/audio/tracks/live-sabe-ontem.mp3",  ...F.live },
    { title: "C***A",       src: "/audio/tracks/live-chuva.mp3",       ...F.live },
    { title: "s*****ira",       src: "/audio/tracks/sextafeira.mp3",     ...F.full },
    { title: "n****r",          src: "/audio/tracks/nectar.mp3",         ...F.full },
    { title: "c*** a*****no",   src: "/audio/tracks/222-copo-americano.mp3", ...F.full },
    { title: "d*****nA",        src: "/audio/tracks/dopamina.mp3",       ...F.full },
    { title: "o***á",           src: "/audio/tracks/ojala.mp3",          ...F.full },
    { title: "s**v",            src: "/audio/tracks/swav.mp3",           ...F.full },
    { title: "c****e",          src: "/audio/tracks/cliche.mp3",         ...F.full },
    { title: "s*** o****?",     src: "/audio/tracks/sabe-ontem.mp3",     ...F.full },
    { title: "h*****ood",       src: "/audio/tracks/hollywood.mp3",      ...F.full },
    { title: "s*****t",         src: "/audio/tracks/stylist.mp3",        ...F.full },
    { title: "o***s",           src: "/audio/tracks/oasis.mp3",          ...F.full },
    { title: "a*******a",       src: "/audio/tracks/astronauta.mp3",     ...F.full },
    { title: "C***A",           src: "/audio/tracks/222-chuva.mp3",      ...F.full },
    { title: "q* é v*?",        src: "/audio/tracks/qm-e-vc.mp3",        ...F.full },
    { title: "r*******ster",    src: "/audio/tracks/rollercoaster.mp3",  ...F.full },
  ],
}

// Pool isolado por frequência (usado na sintonia livre, após finalCompleted)
export const TRACKS_BY_TIER: Record<Tier, RadioTrack[]> = {
  suburbio: STATION_TRACKS["SUBÚRBIO XÊNON"],
  crypto:   STATION_TRACKS["CIDADE NEON"],
  live:     STATION_TRACKS["NOVA ONDA"].filter(t => t.tier === "live"),
  full:     STATION_TRACKS["NOVA ONDA"].filter(t => t.tier === "full"),
}

// Deriva a estação sintonizada por último a partir do que já foi SINTONIZADO
// (persistido no funil) — evita que reentrar em /drive (remount) perca a
// seleção da pessoa. Retorna null se nada foi sintonizado ainda.
export function highestAcceptedTier(accepted: Record<Tier, boolean>): Tier | null {
  for (let i = ALL_TIERS.length - 1; i >= 0; i--) {
    if (accepted[ALL_TIERS[i]]) return ALL_TIERS[i]
  }
  return null
}

// Sintonia manual (dial) — espectro real das 4 estações (69.9 a 222.4 FM),
// usado pra posicionar ponteiro e marcações
export const FREQ_MIN = 69.9
export const FREQ_MAX = 222.4
export const FREQ_TOLERANCE = 6 // janela de acerto em torno de cada marcação
export const RADIO_SNIPPET_MS = 22000 // duração fixa de cada faixa na rádio (prévia)

export function freqOf(tier: Tier): number {
  return parseFloat(TIER_META[tier].freq)
}

export function pctForFreq(freq: number): number {
  return Math.min(1, Math.max(0, (freq - FREQ_MIN) / (FREQ_MAX - FREQ_MIN)))
}
