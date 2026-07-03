/**
 * AudioBridge — comunicação entre iframe (player UI) e janela pai (motor de áudio).
 * O iframe envia comandos; o pai executa e devolve estado.
 */

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
}

export function sendNotificationToParent(n: Omit<PhoneNotification, "type">) {
  if (typeof window === "undefined") return
  if (window.self === window.top) return // não está dentro de um iframe
  const msg: PhoneNotification = { type: "PHONE_NOTIFICATION", ...n }
  window.parent.postMessage(msg, "*")
}
