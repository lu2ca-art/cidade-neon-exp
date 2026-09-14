"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import posthog from "posthog-js"
import { setAnalyticsReady, track } from "@/lib/analytics"

export type ConsentLevel = "full" | "essential"

const CONSENT_KEY = "cidade-neon-analytics-consent"
const SESSION_KEY = "cidade-neon-session-id"
const DEV_MODE_KEY = "cidade-neon-dev-mode"
// Muita navegação do jogo é hard-navigation (window.location.href), não
// router.push — cada uma remonta o PostHogProvider inteiro. As chaves abaixo
// vivem em sessionStorage (não em estado de componente) justamente pra
// sobreviver a esses remounts e continuar representando UMA sessão real de
// aba, não uma sessão por página visitada.
const SESSION_EVENTS_FIRED_KEY = "cidade-neon-session-events-fired"
const SESSION_STARTED_AT_KEY = "cidade-neon-session-started-at"
const LAST_PLACE_KEY = "cidade-neon-last-place"
const SESSIONS_TOTAL_KEY = "cidade-neon-sessions-total"

interface PostHogConsentContextType {
  consent: ConsentLevel | null
  setConsent: (level: ConsentLevel) => void
}

const PostHogConsentContext = createContext<PostHogConsentContextType | null>(null)

export function useAnalyticsConsent() {
  const ctx = useContext(PostHogConsentContext)
  if (!ctx) throw new Error("useAnalyticsConsent must be used within PostHogProvider")
  return ctx
}

function readStoredConsent(): ConsentLevel | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(CONSENT_KEY)
  return raw === "full" || raw === "essential" ? raw : null
}

function getOrCreateSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

function getOrCreateSessionStartedAt(): number {
  const raw = sessionStorage.getItem(SESSION_STARTED_AT_KEY)
  if (raw) return parseInt(raw, 10)
  const now = Date.now()
  sessionStorage.setItem(SESSION_STARTED_AT_KEY, String(now))
  return now
}

function bumpSessionsTotal(): number {
  const raw = localStorage.getItem(SESSIONS_TOTAL_KEY)
  const n = (raw ? Number.parseInt(raw, 10) : 0) + 1
  localStorage.setItem(SESSIONS_TOTAL_KEY, String(n))
  return n
}

function detectDeviceType(): "desktop" | "mobile" | "tablet" {
  const ua = navigator.userAgent
  if (/tablet|ipad/i.test(ua)) return "tablet"
  if (/mobile|iphone|android/i.test(ua)) return "mobile"
  return "desktop"
}

function detectBrowser(): string {
  const ua = navigator.userAgent
  if (/edg\//i.test(ua)) return "edge"
  if (/(chrome|crios)\//i.test(ua) && !/edg\//i.test(ua)) return "chrome"
  if (/(firefox|fxios)\//i.test(ua)) return "firefox"
  if (/safari/i.test(ua) && !/(chrome|crios)\//i.test(ua)) return "safari"
  return "other"
}

function detectOS(): string {
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return "ios"
  if (/android/i.test(ua)) return "android"
  if (/mac os x/i.test(ua)) return "macos"
  if (/windows/i.test(ua)) return "windows"
  if (/linux/i.test(ua)) return "linux"
  return "other"
}

// Opt-out de teste interno: visitar com ?dev=1 marca este navegador como
// interno pra sempre (localStorage), e nenhum evento é enviado ao PostHog
// dali em diante — evita que testes do time poluam os dados de público.
// ?dev=0 reverte, pra quando precisar validar o próprio tracking.
function isDevMode(): boolean {
  if (typeof window === "undefined") return false
  const params = new URLSearchParams(window.location.search)
  if (params.get("dev") === "1") {
    localStorage.setItem(DEV_MODE_KEY, "1")
    return true
  }
  if (params.get("dev") === "0") {
    localStorage.removeItem(DEV_MODE_KEY)
    return false
  }
  return localStorage.getItem(DEV_MODE_KEY) === "1"
}

// LGPD: PostHog só inicializa depois do consentimento. "essential" ainda
// inicializa (necessário pra qualquer captura), mas sem session replay,
// autocapture nem profile completo — ver mentoria/analytics.md pra rationale.
function initPostHog(level: ConsentLevel) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

  if (!key || !host) {
    console.warn(
      "[analytics] NEXT_PUBLIC_POSTHOG_KEY/NEXT_PUBLIC_POSTHOG_HOST não configurados em .env.local — eventos não serão enviados"
    )
    return
  }

  posthog.init(key, {
    api_host: host,
    person_profiles: level === "full" ? "always" : "identified_only",
    capture_pageview: level === "full",
    autocapture: level === "full",
    disable_session_recording: level !== "full",
    session_recording: level === "full" ? { sampleRate: 0.1 } : undefined,
  })

  setAnalyticsReady(true)
}

export function PostHogProvider({ children }: { children: ReactNode }) {
  const [consent, setConsentState] = useState<ConsentLevel | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setConsentState(readStoredConsent())
    setHydrated(true)
  }, [])

  // Ciclo de vida da sessão: inicializa o PostHog, dispara os eventos de
  // abertura UMA vez por sessão real de aba (não por remount/hard-nav), e
  // arma o fechamento (session_ended + abandonment) pro fim dessa sessão.
  useEffect(() => {
    if (!hydrated || !consent) return
    if (isDevMode()) return

    initPostHog(consent)

    const sessionId = getOrCreateSessionId()
    const startedAt = getOrCreateSessionStartedAt()

    if (sessionStorage.getItem(SESSION_EVENTS_FIRED_KEY) !== "1") {
      sessionStorage.setItem(SESSION_EVENTS_FIRED_KEY, "1")
      const params = new URLSearchParams(window.location.search)

      track("game_opened", {
        session_id: sessionId,
        user_id_anon: posthog.get_distinct_id() ?? sessionId,
        referrer: document.referrer,
        utm_source: params.get("utm_source") ?? undefined,
        utm_campaign: params.get("utm_campaign") ?? undefined,
        utm_content: params.get("utm_content") ?? undefined,
        utm_medium: params.get("utm_medium") ?? undefined,
        utm_term: params.get("utm_term") ?? undefined,
      })

      track("session_started", {
        session_id: sessionId,
        timestamp: startedAt,
        device_type: detectDeviceType(),
      })

      track("device_detected", {
        device_type: detectDeviceType(),
        os: detectOS(),
        browser: detectBrowser(),
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
    }

    let ended = false
    const endSession = (reason: "idle" | "tab_hidden" | "closed") => {
      if (ended) return
      ended = true

      track("session_ended", {
        session_id: sessionId,
        duration_ms: Date.now() - startedAt,
        sessions_this_user_total: bumpSessionsTotal(),
      })

      const rawPlace = sessionStorage.getItem(LAST_PLACE_KEY)
      const place = rawPlace ? (JSON.parse(rawPlace) as { path: string; enteredAt: number }) : null
      if (place) {
        track("abandonment", {
          last_place: place.path,
          time_since_open_ms: Date.now() - startedAt,
          reason,
        })
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") endSession("tab_hidden")
    }
    const handlePageHide = () => endSession("closed")

    document.addEventListener("visibilitychange", handleVisibility)
    window.addEventListener("pagehide", handlePageHide)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("pagehide", handlePageHide)
    }
  }, [hydrated, consent])

  // Movimentação: place_entered/place_exited a cada troca de rota (soft OU
  // hard navigation — usa sessionStorage em vez de estado de componente
  // porque hard-nav remonta este provider inteiro, apagando qualquer ref).
  useEffect(() => {
    if (!hydrated || !consent) return
    if (isDevMode()) return

    const now = Date.now()
    const raw = sessionStorage.getItem(LAST_PLACE_KEY)
    const stored = raw ? (JSON.parse(raw) as { path: string; enteredAt: number }) : null

    if (stored?.path === pathname) return

    if (stored) {
      track("place_exited", {
        place_id: stored.path,
        duration_ms: now - stored.enteredAt,
        exit_action: "walked",
      })
    }

    track("place_entered", {
      place_id: pathname,
      place_type: pathname.split("/")[1] || "home",
      from_place: stored?.path,
    })

    sessionStorage.setItem(LAST_PLACE_KEY, JSON.stringify({ path: pathname, enteredAt: now }))
  }, [pathname, hydrated, consent])

  const setConsent = (level: ConsentLevel) => {
    localStorage.setItem(CONSENT_KEY, level)
    setConsentState(level)
  }

  return (
    <PostHogConsentContext.Provider value={{ consent, setConsent }}>
      {children}
    </PostHogConsentContext.Provider>
  )
}
