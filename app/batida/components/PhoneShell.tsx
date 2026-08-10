"use client"

import type { ReactNode } from "react"

// Moldura mobile compartilhada por todas as páginas do B4TIDA (extraída do
// app original) — mantém o mesmo enquadramento em toda a seção.
export function PhoneShell({ accent, children }: { accent: string; children: ReactNode }) {
  return (
    <div className="h-dvh flex items-center justify-center overflow-hidden select-none" style={{ background: "#0a0206" }}>
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}12 0%, transparent 60%)` }} />
        <div className="relative z-10 flex flex-col h-full px-5 pt-12 pb-5 min-h-0">{children}</div>
      </div>
    </div>
  )
}
