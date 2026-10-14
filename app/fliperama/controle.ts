// O controle das máquinas: deslizar o dedo (celular) ou as setas/WASD.
import { useEffect, useRef } from "react"

export type Dir = "c" | "b" | "e" | "d"
export const PASSO: Record<Dir, [number, number]> = { c: [0, -1], b: [0, 1], e: [-1, 0], d: [1, 0] }
export const OPOSTO: Record<Dir, Dir> = { c: "b", b: "c", e: "d", d: "e" }

export function useDirecao(onDir: (d: Dir) => void) {
  const cb = useRef(onDir)
  useEffect(() => { cb.current = onDir })
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const m: Record<string, Dir> = { ArrowUp: "c", ArrowDown: "b", ArrowLeft: "e", ArrowRight: "d", w: "c", s: "b", a: "e", d: "d" }
      const d = m[e.key]; if (d) { e.preventDefault(); cb.current(d) }
    }
    let ini: { x: number; y: number } | null = null
    const down = (e: PointerEvent) => { ini = { x: e.clientX, y: e.clientY } }
    const move = (e: PointerEvent) => {
      if (!ini) return
      const dx = e.clientX - ini.x, dy = e.clientY - ini.y
      if (Math.hypot(dx, dy) < 22) return
      cb.current(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "d" : "e") : (dy > 0 ? "b" : "c"))
      ini = { x: e.clientX, y: e.clientY }
    }
    const up = () => { ini = null }
    window.addEventListener("keydown", tecla)
    window.addEventListener("pointerdown", down)
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    return () => {
      window.removeEventListener("keydown", tecla)
      window.removeEventListener("pointerdown", down)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
  }, [])
}
