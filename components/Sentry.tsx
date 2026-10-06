"use client"

// SENTRY (06/10): os erros que acontecem no aparelho de quem joga chegam pro
// LU2CA (lu2caart.sentry.io). Carrega DEPOIS da página abrir (não pesa no
// começo do jogo), só em produção. O DSN é público por natureza (vai no site).
// Sem gravação de tela (session replay) e sem dados pessoais.

import { useEffect } from "react"

const DSN = "https://4f60ca6432ff6e178a5aaaa51e9a9295@o4512208135127040.ingest.de.sentry.io/4512208145809489"

export function Sentry() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    let vivo = true
    const iniciar = () => {
      import("@sentry/browser").then((S) => {
        if (!vivo) return
        S.init({
          dsn: DSN,
          environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "production",
          // um pouco de medição de lentidão (5% das visitas)
          tracesSampleRate: 0.05,
          integrations: [S.browserTracingIntegration()],
          // ruído conhecido de navegador/extensão, que não é bug do jogo
          ignoreErrors: ["ResizeObserver loop", "Non-Error promise rejection captured", /extension\//i],
        })
      }).catch(() => {})
    }
    const w = window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }
    if (w.requestIdleCallback) w.requestIdleCallback(iniciar, { timeout: 4000 })
    else setTimeout(iniciar, 2500)
    return () => { vivo = false }
  }, [])
  return null
}
