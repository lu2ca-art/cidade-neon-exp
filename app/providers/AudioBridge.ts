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

// Clique na barra do rádio (pai) -> executa a mesma ação da notificação
// dentro do celular (iframe), igual a tocar nela lá dentro
export type NotificationClick = { type: "NOTIFICATION_CLICK"; id: string }

export function sendNotificationClickToIframe(iframe: HTMLIFrameElement | null, id: string) {
  if (!iframe?.contentWindow) return
  const msg: NotificationClick = { type: "NOTIFICATION_CLICK", id }
  iframe.contentWindow.postMessage(msg, "*")
}

// Silencia o rádio do carro (painel de /drive) enquanto um teste com áudio
// próprio está aberto dentro do celular (SINT0NIA, B4TIDA, GUITAR DRIVER) — evita
// as duas trilhas tocando ao mesmo tempo. Some no cancel, volta ao sair.
export type CarRadioControl = { type: "CAR_RADIO_MUTE" } | { type: "CAR_RADIO_UNMUTE" }

export function sendCarRadioMute(muted: boolean) {
  if (typeof window === "undefined") return
  if (window.self === window.top) return // não está dentro de um iframe (ex.: /feel-good aberto direto)
  const msg: CarRadioControl = { type: muted ? "CAR_RADIO_MUTE" : "CAR_RADIO_UNMUTE" }
  window.parent.postMessage(msg, "*")
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
