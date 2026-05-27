"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ConfirmacaoDesbloqueioPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/neon-tiles")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#000" }}>
      <p className="font-mono text-xs" style={{ color: "rgba(0,255,240,0.4)" }}>
        carregando...
      </p>
    </div>
  )
}
