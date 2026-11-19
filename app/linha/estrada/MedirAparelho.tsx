"use client"

// Mede o aparelho (qualidade.ts) dentro do Canvas: espera o jogo assentar
// (compilando shaders tudo engasga), colhe ~6 s de quadros pelo carimbo do
// quadro e decide o nível. Uma vez só; o resultado fica guardado.

import { useFrame } from "@react-three/fiber"
import { useRef } from "react"
import { QUALIDADE, guardarQualidade, veredito, type NivelQualidade } from "./qualidade"

const ESPERA = 6000, JANELA = 6000

export function MedirAparelho({ onFim }: { onFim: (n: NivelQualidade) => void }) {
  const st = useRef({ t0: 0, tq: 0, q: [] as number[], feito: false })
  useFrame(() => {
    const s = st.current
    if (s.feito) return
    const tq = (document.timeline?.currentTime as number | null) ?? performance.now()
    if (!s.t0) s.t0 = tq
    if (tq - s.t0 > ESPERA && s.tq) s.q.push(tq - s.tq)
    s.tq = tq
    if (tq - s.t0 < ESPERA + JANELA || s.q.length < 30) return
    s.feito = true
    const q = s.q.sort((a, b) => a - b)
    const n = veredito(q[Math.floor(q.length * 0.5)], q[Math.floor(q.length * 0.9)], QUALIDADE.nivel)
    guardarQualidade(n)
    ;(window as unknown as Record<string, unknown>).__qualidade = { nivel: n, p50: +q[Math.floor(q.length * 0.5)].toFixed(1), p90: +q[Math.floor(q.length * 0.9)].toFixed(1) }
    onFim(n)
  })
  return null
}
