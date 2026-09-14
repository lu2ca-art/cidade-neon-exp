"use client"

import { useEffect } from "react"

// Só dispara se o próprio root layout quebrar — substitui <html>/<body>
// inteiros (exigência do Next), por isso fica deliberadamente simples e
// sem depender de nenhum provider/CSS do resto do app.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[cidade-neon] erro fatal no root layout:", error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: "#0a0918", color: "#fff" }}>
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.5rem",
            padding: "0 2rem",
            textAlign: "center",
            fontFamily: "-apple-system, system-ui, sans-serif",
          }}
        >
          <p style={{ fontSize: "1.1rem", fontWeight: 600, maxWidth: 320 }}>
            Alguma coisa travou aqui dentro.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "1rem",
              background: "#fff",
              color: "#000",
              fontSize: "0.9rem",
              fontWeight: 500,
              border: "none",
            }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  )
}
