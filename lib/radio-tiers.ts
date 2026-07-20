// Fonte única das 4 frequências/estações do rádio e de quando cada uma libera
// — compartilhado entre o painel do carro (app/drive/page.tsx) e o hub de
// sintonia (app/sintonizador/page.tsx), pra nunca mais desalinhar (já
// aconteceu uma vez: frequências placeholder divergindo do que era real).

export type Tier = "suburbio" | "crypto" | "live" | "full"

export const ALL_TIERS: Tier[] = ["suburbio", "crypto", "live", "full"]

export interface TierMeta {
  label: string
  freq: string
  color: string
  tier: Tier
  // recompensa real (untitled.stream) desse tier — mesmos links que hoje
  // moram espalhados pelo NEXO (SCRIPTS[member].reward.rewardLink); aqui é a
  // fonte única, usada pela galeria do FREQUÊNCIA e por quem antes linkava
  // direto pro NEXO/externo
  projectName: string
  projectLink: string
  projectKind: "listen" | "buy"
}

export const TIER_META: Record<Tier, TierMeta> = {
  suburbio: {
    label: "SUBÚRBIO XÊNON", freq: "69.9", color: "#ff2d78", tier: "suburbio",
    projectName: "SUBÚRBIO XÊNON", projectKind: "listen",
    projectLink: "https://untitled.stream/library/project/K4Sh04mZhmvSQmJGyW3yw",
  },
  crypto: {
    label: "CIDADENEON.CRYPTO", freq: "88.7", color: "#00e5ff", tier: "crypto",
    projectName: "CIDADENEON.CRYPTO", projectKind: "listen",
    projectLink: "https://untitled.stream/library/project/xss93AFmqBYaNqTMb5gDU",
  },
  live: {
    label: "LIVE NEON", freq: "111.3", color: "#a855f7", tier: "live",
    projectName: "LIVE NEON", projectKind: "listen",
    projectLink: "https://untitled.stream/library/project/TcgmYSll5sI9VfDorJbNA",
  },
  full: {
    label: "CIDADE NEON 222.4 FM", freq: "222.4", color: "#ffd93d", tier: "full",
    projectName: "CIDADE NEON — álbum completo", projectKind: "buy",
    projectLink: "https://untitled.stream/buy/project/cwGIXvpY419u7v6UDOHQz",
  },
}

// missão-pré-requisito de cada tier já concluída? (não é o mesmo que "já
// sintonizou" — isso é só se a pessoa JÁ PODE ir sintonizar aquele tier)
export function missionDoneForTier(tier: Tier, confirmationCount: number, finalCompleted: boolean): boolean {
  switch (tier) {
    case "suburbio": return confirmationCount >= 1
    case "crypto":   return confirmationCount >= 2
    case "live":     return confirmationCount >= 3
    case "full":     return finalCompleted
  }
}

// próximo tier cuja missão já foi concluída mas que a pessoa ainda não
// sintonizou — undefined se não houver nenhum (nada novo pra sintonizar)
export function nextTierToTune(
  confirmationCount: number,
  finalCompleted: boolean,
  radioAccepted: Record<Tier, boolean>
): Tier | undefined {
  return ALL_TIERS.find(
    (t) => missionDoneForTier(t, confirmationCount, finalCompleted) && !radioAccepted[t]
  )
}

// uma faixa representativa de cada tier, usada como áudio de referência no
// minigame de sintonia (mesmas faixas que tocam de verdade no rádio do carro)
export const PREVIEW_TRACK: Record<Tier, string> = {
  suburbio: "/audio/tracks/gata-mia.mp3",
  crypto:   "/audio/tracks/inst-nectar.mp3",
  live:     "/audio/tracks/live-nectar.mp3",
  full:     "/audio/tracks/sextafeira.mp3",
}
