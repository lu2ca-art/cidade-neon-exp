"use client"

// Speedometer isolado — lê o linvel do RigidBody da van via ref + escreve
// diretamente no DOM sem React state. Evita re-render do root a 12/s (que
// reinstanciava handlers e reconciliava toda a árvore R3F).

import { useEffect, useRef } from "react"
import type { RapierRigidBody } from "@react-three/rapier"

export function Speedometer({
  bodyRef,
  position = "bottom-right",
}: {
  bodyRef: React.MutableRefObject<RapierRigidBody | null>
  /** "bottom-right" (desktop) ou "top-left" (mobile) pra não conflitar com pedais. */
  position?: "bottom-right" | "top-left"
}) {
  const displayRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const id = setInterval(() => {
      const b = bodyRef.current
      const el = displayRef.current
      if (!b || !el) return
      const v = b.linvel()
      const kmh = Math.round(Math.sqrt(v.x * v.x + v.z * v.z) * 3.6)
      el.textContent = String(kmh)
    }, 80)
    return () => clearInterval(id)
  }, [bodyRef])
  const posClass = position === "top-left"
    ? "top-4 left-4"
    : "bottom-6 right-6"
  return (
    <div className={`pointer-events-none absolute ${posClass} z-10 rounded border border-white/10 bg-black/80 px-4 py-3 text-right backdrop-blur-md`}>
      <div ref={displayRef} className="font-mono text-3xl font-bold text-[#00ffff]">0</div>
      <div className="text-[10px] uppercase tracking-widest text-white/50">km/h</div>
    </div>
  )
}
