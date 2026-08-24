// HUB estilo Apple CarPlay — mesma ordem/dados do N3XO (app/n3xo/page.tsx)
// pra lista de mensagens recentes bater exatamente com o app de verdade.

import type { MemberKey } from "@/app/n3xo/privado/[member]/page"

export const HUB_MEMBER_ORDER: MemberKey[] = ["alohan", "nizzy", "dbee"]

export const HUB_VISIBLE_FROM_CC: Record<MemberKey, number> = {
  alohan: 0,
  nizzy: 1,
  dbee: 2,
}

export const HUB_AVATARS: Record<MemberKey, { avatar: string; color: string }> = {
  alohan: { avatar: "A", color: "#4ECDC4" },
  nizzy: { avatar: "N", color: "#FF6B6B" },
  dbee: { avatar: "D", color: "#6B7FD7" },
}

// Apps clicáveis direto do HUB — não abre mais a tela inicial genérica do
// celular, só os apps específicos (cada um com sua rota). Miniatura do
// ícone de verdade do app (AppIcon), não uma letra inicial.
export interface HubAppUnlockState {
  radioAnyAccepted: boolean
  nectar: boolean
  feelGood: boolean
  guitarDriver: boolean
}

export interface HubApp {
  id: string
  label: string
  icon: string
  color: string
  route: string
  external?: boolean
  unlocked: (s: HubAppUnlockState) => boolean
}

// Blocos grandes (estilo TikTok/Netflix da referência) — os 3 apps-jogo
export const HUB_TILES: HubApp[] = [
  { id: "loop",   label: "//LOOP",       icon: "tiktok",       color: "#1a0010", route: "/tiktok/feed", unlocked: () => true },
  { id: "batida", label: "B4TIDA",       icon: "beatbuilder",  color: "#2a0505", route: "/batida",      unlocked: (s) => s.feelGood },
  { id: "guitar", label: "GUITAR DRIVER",icon: "guitardriver", color: "#1a0a00", route: "/neon-tiles",  unlocked: (s) => s.guitarDriver },
]

// Dock fino embaixo — utilitários + os apps externos do celular (YouTube/Instagram)
export const HUB_APPS: HubApp[] = [
  { id: "sintonia",  label: "SINT0NIA",  icon: "tuner",     color: "#22ff88", route: "/sintonizador",       unlocked: (s) => s.radioAnyAccepted },
  { id: "n3xo",      label: "N3XO",      icon: "whatsapp",  color: "#00e5ff", route: "/n3xo",               unlocked: () => true },
  { id: "freq",      label: "FR3Q_",     icon: "heartbeat", color: "#1DB954", route: "/spotify/auto-chuva", unlocked: (s) => s.radioAnyAccepted },
  { id: "nectar",    label: "NECTAR",    icon: "nectar",    color: "#a78bfa", route: "/nectar",             unlocked: (s) => s.nectar },
  { id: "youtube",   label: "STR34M",    icon: "youtube",   color: "#FF0000", route: "https://www.youtube.com/@LU222CA", external: true, unlocked: () => true },
  { id: "instagram", label: "_IRIS.EXE", icon: "instagram", color: "#3B0764", route: "https://www.instagram.com/lu2ca.art?igsh=cDRrcGpndjJrdjJ6&utm_source=qr", external: true, unlocked: () => true },
]
