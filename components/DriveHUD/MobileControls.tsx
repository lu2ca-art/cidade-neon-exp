"use client"

// Controles touch pra jogar no mobile web — volante virtual + pedais.
// Dispara KeyboardEvent sintético (w/a/s/d/shift/f) — VanBody consome
// exatamente os mesmos eventos do teclado desktop, sem refactor.

import { useEffect, useRef, useState } from "react"

function dispatchKey(key: string, down: boolean) {
  const type = down ? "keydown" : "keyup"
  window.dispatchEvent(new KeyboardEvent(type, { key, code: key.toUpperCase() }))
}

export function MobileControls() {
  // Steer entre -1 (esquerda) e 1 (direita). Volante virtual → dispatch a/d.
  const [steer, setSteer] = useState(0)
  const dragging = useRef(false)
  const wheelRef = useRef<HTMLDivElement>(null)
  const centerX = useRef(0)
  const lastKeys = useRef({ a: false, d: false })

  // Dispatch a/d baseado no steer atual
  useEffect(() => {
    const wantA = steer < -0.15
    const wantD = steer > 0.15
    if (wantA !== lastKeys.current.a) {
      dispatchKey("a", wantA)
      lastKeys.current.a = wantA
    }
    if (wantD !== lastKeys.current.d) {
      dispatchKey("d", wantD)
      lastKeys.current.d = wantD
    }
  }, [steer])

  // Volante drag — captura touch/pointer no elemento
  useEffect(() => {
    const el = wheelRef.current
    if (!el) return
    const onDown = (e: PointerEvent) => {
      dragging.current = true
      const rect = el.getBoundingClientRect()
      centerX.current = rect.left + rect.width / 2
      el.setPointerCapture(e.pointerId)
      updateSteer(e.clientX)
    }
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return
      updateSteer(e.clientX)
    }
    const onUp = (e: PointerEvent) => {
      dragging.current = false
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
      // Volante volta pro centro suavemente (0)
      setSteer(0)
    }
    const updateSteer = (x: number) => {
      const dx = x - centerX.current
      const maxDx = 100 // pixels de raio pra chegar em ±1
      const s = Math.max(-1, Math.min(1, dx / maxDx))
      setSteer(s)
    }
    el.addEventListener("pointerdown", onDown)
    el.addEventListener("pointermove", onMove)
    el.addEventListener("pointerup", onUp)
    el.addEventListener("pointercancel", onUp)
    return () => {
      el.removeEventListener("pointerdown", onDown)
      el.removeEventListener("pointermove", onMove)
      el.removeEventListener("pointerup", onUp)
      el.removeEventListener("pointercancel", onUp)
    }
  }, [])

  // Botão touch genérico com press/release (dispatch key on touch)
  const holdButton = (key: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      dispatchKey(key, true)
    },
    onPointerUp: (e: React.PointerEvent) => {
      if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      }
      dispatchKey(key, false)
    },
    onPointerCancel: (e: React.PointerEvent) => {
      dispatchKey(key, false)
    },
  })

  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none" style={{ touchAction: "none" }}>
      {/* Freio + Ré (canto inferior esquerdo) */}
      <button
        {...holdButton("s")}
        className="pointer-events-auto absolute bottom-24 left-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/30 font-black text-white active:scale-95"
        style={{
          background: "radial-gradient(circle, #ff2d78 0%, #7a0033 100%)",
          boxShadow: "0 0 24px rgba(255, 45, 120, 0.55)",
          touchAction: "none",
        }}
        aria-label="freio / ré"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><rect x="4" y="7" width="16" height="10" rx="2"/></svg>
      </button>

      {/* Acelerador (canto inferior direito) */}
      <button
        {...holdButton("w")}
        className="pointer-events-auto absolute bottom-24 right-6 flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/30 font-black text-black active:scale-95"
        style={{
          background: "radial-gradient(circle, #34ff8f 0%, #0e8a3f 100%)",
          boxShadow: "0 0 32px rgba(52, 255, 143, 0.6)",
          touchAction: "none",
        }}
        aria-label="acelerador"
      >
        <svg width="34" height="34" viewBox="0 0 24 24" fill="black"><path d="M8 5v14l11-7z"/></svg>
      </button>

      {/* Boost (Shift) — acima do acelerador */}
      <button
        {...holdButton("Shift")}
        className="pointer-events-auto absolute bottom-52 right-8 flex h-12 w-12 items-center justify-center rounded-full border border-yellow-300/50 text-xs font-black text-yellow-300 active:scale-95"
        style={{
          background: "rgba(255, 204, 0, 0.15)",
          boxShadow: "0 0 12px rgba(255, 204, 0, 0.35)",
          touchAction: "none",
        }}
        aria-label="boost"
      >
        ▲▲
      </button>

      {/* Jetpack (F) — acima do freio */}
      <button
        {...holdButton("f")}
        className="pointer-events-auto absolute bottom-52 left-8 flex h-12 w-12 items-center justify-center rounded-full border border-orange-400/50 text-lg text-orange-300 active:scale-95"
        style={{
          background: "rgba(255, 107, 53, 0.18)",
          boxShadow: "0 0 12px rgba(255, 107, 53, 0.4)",
          touchAction: "none",
        }}
        aria-label="jetpack"
      >
        🔥
      </button>

      {/* Volante virtual — barra horizontal grande centro-baixo, drag = steer */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
        <div
          ref={wheelRef}
          className="pointer-events-auto relative flex h-16 items-center justify-center rounded-full border-2 border-white/25 backdrop-blur-md"
          style={{
            width: "min(320px, 60vw)",
            background: "rgba(0, 0, 0, 0.55)",
            boxShadow: "0 0 24px rgba(255, 0, 255, 0.35)",
            touchAction: "none",
          }}
        >
          {/* Indicador central (deslocado pelo steer) */}
          <div
            className="absolute h-10 w-10 rounded-full transition-transform"
            style={{
              transform: `translateX(${steer * 100}px)`,
              background: "linear-gradient(180deg, #ff5fae, #a855f7)",
              boxShadow: "0 0 14px #ff00ff",
            }}
          />
          {/* Guias visuais laterais */}
          <span className="absolute left-3 text-xl text-white/40">◀</span>
          <span className="absolute right-3 text-xl text-white/40">▶</span>
          <span className="pointer-events-none absolute -top-5 text-[9px] font-mono uppercase tracking-widest text-white/60">
            volante
          </span>
        </div>
      </div>
    </div>
  )
}
