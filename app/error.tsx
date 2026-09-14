"use client"

import { useEffect } from "react"
import posthog from "posthog-js"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[cidade-neon] erro não tratado:", error)
    // best-effort: se o PostHog ainda não foi inicializado (sem consentimento
    // LGPD, por exemplo), captureException pode falhar — nunca deixa isso
    // quebrar o próprio error boundary.
    try {
      posthog.captureException(error)
    } catch {}
  }, [error])

  return (
    <div
      className="min-h-dvh w-full flex flex-col items-center justify-center gap-6 px-8 text-center select-none"
      style={{ background: "linear-gradient(180deg, #1a0533 0%, #4a0a6b 45%, #0a0918 100%)" }}
    >
      <p className="text-white/40 text-xs uppercase tracking-[0.3em]">Cidade Neon</p>
      <h1 className="text-white text-xl font-semibold max-w-xs leading-relaxed">
        Alguma coisa travou aqui dentro.
      </h1>
      <p className="text-white/50 text-sm max-w-xs leading-relaxed">
        Já ficamos sabendo. Tenta de novo — se continuar, volta pro início.
      </p>
      <div className="flex flex-col gap-3 mt-2">
        <button
          type="button"
          onClick={reset}
          className="px-6 py-3 rounded-2xl bg-white text-black text-sm font-medium active:scale-95 transition-transform"
        >
          Tentar de novo
        </button>
        <a
          href="/"
          className="px-6 py-3 rounded-2xl border border-white/20 text-white/70 text-sm font-medium active:scale-95 transition-transform"
        >
          Voltar ao início
        </a>
      </div>
    </div>
  )
}
