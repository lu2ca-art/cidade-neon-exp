// API pública tipada pro analytics do jogo (PostHog EU Cloud).
// ÚNICA forma de emitir eventos — nunca chamar posthog.capture() direto
// fora deste arquivo. Contrato de eventos: ~/vault/projetos/cidade-neon/analytics.md
// Nomes e propriedades são contrato — mudar quebra dashboards históricos.

import posthog from "posthog-js"

export type DeviceType = "desktop" | "mobile" | "tablet"
export type PlaceType = "museu" | "galeria" | "loja-discos" | "drive-v2" | "radio" | string
export type MusicSource = "radio" | "loja-discos" | "museu" | "other"

export interface AnalyticsEvents {
  // 1. Acesso
  game_opened: {
    session_id: string
    user_id_anon: string
    referrer: string
    utm_source?: string
    utm_campaign?: string
    utm_content?: string
    utm_medium?: string
    utm_term?: string
  }
  session_started: {
    session_id: string
    timestamp: number
    device_type: DeviceType
  }
  session_ended: {
    session_id: string
    duration_ms: number
    sessions_this_user_total: number
  }

  // 2. Perfil (agregado, zero PII)
  device_detected: {
    device_type: DeviceType
    os: string
    browser: string
    language: string
    timezone: string
    region_approx?: string
  }

  // 3. Movimentação
  place_entered: {
    place_id: string
    place_type: PlaceType
    from_place?: string
    coords?: { x: number; y: number; z?: number }
  }
  place_exited: {
    place_id: string
    duration_ms: number
    exit_action: "walked" | "drove" | "closed_tab" | "idle"
  }
  // Throttle: max 1/segundo, agrupa por segmento contínuo
  path_segment: {
    from_place: string
    to_place: string
    distance_units: number
    mode: "drive" | "walk" | "teleport"
  }
  abandonment: {
    last_place: string
    time_since_open_ms: number
    reason: "idle" | "tab_hidden" | "closed"
  }

  // 4. Interações
  item_discovered: {
    item_id: string
    place_id: string
    discovery_type: "clicked" | "proximity" | "triggered"
  }
  mission_started: { mission_id: string; place_id: string }
  mission_completed: { mission_id: string; duration_ms: number }
  resource_used: { resource_id: string; place_id: string; action: string }
  // fallback pra elementos sem evento dedicado
  click: { element_id: string; place_id: string; kind: string }

  // 5. Música
  music_play_started: {
    track_id: string | number
    track_name: string
    source: MusicSource
    place_id?: string
  }
  music_progress: { track_id: string | number; milestone: 25 | 50 | 75 | 100 }
  music_replayed: { track_id: string | number; replay_number: number }
  music_abandoned: {
    track_id: string | number
    position_ms: number
    total_ms: number
    position_pct: number
    reason: string
  }
  music_link_to_spotify_click: {
    track_id: string | number
    spotify_track_id: string
    utm_source: "cidade-neon"
  }

  // 6. Conversão externa
  external_link_click: {
    destination: "spotify" | "instagram" | "youtube" | "other"
    track_id?: string | number
    place_id?: string
    utm_source?: string
    utm_campaign?: string
    utm_medium?: string
  }
}

export type AnalyticsEventName = keyof AnalyticsEvents

// Setado pelo PostHogProvider só depois de posthog.init() (que por sua vez
// só roda após consentimento LGPD) — track() antes disso vira no-op em vez
// de acumular chamadas contra uma instância não inicializada.
let ready = false

export function setAnalyticsReady(value: boolean) {
  ready = value
}

export function track<K extends AnalyticsEventName>(name: K, props: AnalyticsEvents[K]) {
  if (typeof window === "undefined" || !ready) return
  posthog.capture(name, props as Record<string, unknown>)
}
