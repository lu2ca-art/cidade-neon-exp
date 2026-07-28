/**
 * AudioBridge — comunicação entre iframe (player UI) e janela pai (motor de áudio).
 * O iframe envia comandos; o pai executa e devolve estado.
 */

import type { Tier } from "@/lib/radio-tiers"

export type BridgeCommand =
  | { type: "PLAY"; index: number }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "TOGGLE" }
  | { type: "SEEK"; seconds: number }
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "REQUEST_STATE" }

export type BridgeState = {
  type: "AUDIO_STATE"
  trackIdx: number
  playing: boolean
  elapsed: number
}

export function sendToParent(cmd: BridgeCommand) {
  if (typeof window === "undefined") return
  if (window.self === window.top) return // já é o pai
  window.parent.postMessage(cmd, "*")
}

export function sendStateToIframe(
  iframe: HTMLIFrameElement | null,
  state: Omit<BridgeState, "type">,
) {
  if (!iframe?.contentWindow) return
  const msg: BridgeState = { type: "AUDIO_STATE", ...state }
  iframe.contentWindow.postMessage(msg, "*")
}

// ── Notificações do celular ecoadas na barra do rádio (quando o celular
// roda dentro do iframe do /drive) ──
export type PhoneNotification = {
  type: "PHONE_NOTIFICATION"
  id: string
  app: string
  icon: string
  color: string
  title: string
  body: string
  // true pra notificações de "entrar na missão" (NEXO orientando abrir o app
  // da missão ativa) — únicas que ganham botão de aceitar direto na ilha de
  // notificação do painel (sem precisar abrir o celular) e não somem sozinhas
  // depois de alguns segundos, só quando a missão é resolvida
  isMission?: boolean
}

export function sendNotificationToParent(n: Omit<PhoneNotification, "type">) {
  if (typeof window === "undefined") return
  if (window.self === window.top) return // não está dentro de um iframe
  const msg: PhoneNotification = { type: "PHONE_NOTIFICATION", ...n }
  window.parent.postMessage(msg, "*")
}

// Clique na barra do rádio (pai) -> executa a mesma ação da notificação
// dentro do celular (iframe), igual a tocar nela lá dentro
export type NotificationClick = { type: "NOTIFICATION_CLICK"; id: string }

export function sendNotificationClickToIframe(iframe: HTMLIFrameElement | null, id: string) {
  if (!iframe?.contentWindow) return
  const msg: NotificationClick = { type: "NOTIFICATION_CLICK", id }
  iframe.contentWindow.postMessage(msg, "*")
}

// Pede pro /drive minimizar o console (fechar o painel maximizado) — usado
// ao voltar de uma missão completa, pra a pessoa cair de volta na cena do
// carro (e no diálogo de nova frequência) em vez de ficar presa no console
export type MinimizeConsole = { type: "MINIMIZE_CONSOLE" }

export function sendMinimizeConsole() {
  if (typeof window === "undefined") return
  if (window.self === window.top) return
  const msg: MinimizeConsole = { type: "MINIMIZE_CONSOLE" }
  window.parent.postMessage(msg, "*")
}

// Escolher, dentro do SINT0NIA (favoritos), qual das frequências já
// sintonizadas o rádio do painel deve tocar — o seletor de estação não fica
// mais solto no painel do carro, só dentro do próprio app de sintonia
export type SelectRadioTier = { type: "SELECT_RADIO_TIER"; tier: Tier }

export function sendSelectRadioTier(tier: Tier) {
  if (typeof window === "undefined") return
  if (window.self === window.top) return
  const msg: SelectRadioTier = { type: "SELECT_RADIO_TIER", tier }
  window.parent.postMessage(msg, "*")
}

// Estado do rádio do carro (o pai) ecoado pro celular (iframe) — o SINT0NIA
// usa isso pra mostrar um "tocando agora" sincronizado de verdade com o que
// está no ar no painel, na cor da frequência atual, em vez de ter seu
// próprio player desconectado.
export type CarRadioState = {
  type: "CAR_RADIO_STATE"
  tier: Tier
  label: string
  color: string
  title: string
  elapsedMs: number
  durationMs: number
  playing: boolean
}

export function sendCarRadioState(
  iframe: HTMLIFrameElement | null,
  state: Omit<CarRadioState, "type">,
) {
  if (!iframe?.contentWindow) return
  const msg: CarRadioState = { type: "CAR_RADIO_STATE", ...state }
  iframe.contentWindow.postMessage(msg, "*")
}
