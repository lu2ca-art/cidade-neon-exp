"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import posthog from "posthog-js"
import { setAnalyticsReady, track } from "@/lib/analytics"

export type ConsentLevel = "full" | "essential"

const CONSENT_KEY = "cidade-neon-analytics-consent"
const SESSION_KEY = "cidade-neon-session-id"
const DEV_MODE_KEY = "cidade-neon-dev-mode"

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

function detectDeviceType(): "desktop" | "mobile" | "tablet" {
  const ua = navigator.userAgent
  if (/tablet|ipad/i.test(ua)) return "tablet"
  if (/mobile|iphone|android/i.test(ua)) return "mobile"
  return "desktop"
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

  useEffect(() => {
    setConsentState(readStoredConsent())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated || !consent) return
    if (isDevMode()) return

    initPostHog(consent)

    const sessionId = getOrCreateSessionId()
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
      timestamp: Date.now(),
      device_type: detectDeviceType(),
    })
  }, [hydrated, consent])

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
