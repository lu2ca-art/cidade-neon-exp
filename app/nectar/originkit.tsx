"use client"

// Animações do OriginKit (originkit.dev, componentes gratuitos), adaptadas
// pro quiz: a pergunta CHEGA subindo letra por letra (Stagger Text Rise) e,
// quando a resposta sai, a tela RASGA em fatias RGB tremendo (Glitch Text).
// Adaptações: o rise agrupa as letras por palavra (não quebra palavra no meio
// da linha no celular) e o glitch vira um invólucro que liga/desliga por prop.

import { motion, stagger, useAnimate } from "framer-motion"
import { useEffect, useMemo } from "react"

// ── Stagger Text Rise ────────────────────────────────────────
export function TextoSobe({ texto, className, atraso = 0 }: { texto: string; className?: string; atraso?: number }) {
  const [scope, animate] = useAnimate()
  useEffect(() => {
    if (!scope.current) return
    animate(".ok-l", { y: 38, opacity: 0, filter: "blur(6px)" }, { duration: 0 })
    const t = setTimeout(() => {
      animate(".ok-l", { y: 0, opacity: 1, filter: "blur(0px)" }, { type: "spring", stiffness: 260, damping: 18, mass: 0.9, delay: stagger(0.022) })
    }, atraso)
    return () => clearTimeout(t)
  }, [texto, atraso, animate, scope])
  const palavras = useMemo(() => texto.split(" "), [texto])
  return (
    <h2 ref={scope} className={className} aria-label={texto}>
      {palavras.map((p, i) => (
        <span key={i} aria-hidden style={{ display: "inline-block", whiteSpace: "nowrap" }}>
          {p.split("").map((c, k) => <motion.span key={k} className="ok-l" style={{ display: "inline-block", opacity: 0 }}>{c}</motion.span>)}
          {i < palavras.length - 1 && " "}
        </span>
      ))}
    </h2>
  )
}

// ── Glitch Text (fatias + tremor) ────────────────────────────
// os quadros das fatias: sorteio com semente fixa (igual no servidor e no
// navegador, sem erro de hidratação)
function fatias(min: number, max: number) {
  let semente = 222
  const sorte = () => ((semente = (semente * 16807) % 2147483647) / 2147483647)
  let f = ""
  for (let i = 0; i <= 8; i++) {
    const off = (sorte() * 2 - 1) * 10
    const h = min + sorte() * (max - min)
    f += `${(i / 8) * 100}% { clip-path: inset(${Math.max(0, Math.min(100 - h, 50 + off)).toFixed(1)}% 0 ${h.toFixed(1)}% 0); filter: hue-rotate(${Math.floor(sorte() * 360)}deg); }\n`
  }
  return f
}
const CSS = `
@keyframes ok-tremor { 0% { transform: translate(0,0) } 20% { transform: translate(2px,-2px) } 40% { transform: translate(-2px,2px) } 60% { transform: translate(1.3px,1.3px) } 80% { transform: translate(-1.3px,-1.3px) } 100% { transform: translate(0,0) } }
@keyframes ok-fatia { ${fatias(25, 75)} }
@keyframes ok-some { 0%, 55% { opacity: 1 } 100% { opacity: 0 } }
.ok-rasgo.is-on { animation: ok-tremor 90ms linear infinite, ok-fatia 120ms steps(1) infinite, ok-some 0.65s ease-in forwards; pointer-events: none; }
`

// a resposta saiu: a tela toda da pergunta rasga, treme e some
export function Rasgo({ on, className, children }: { on: boolean; className?: string; children: React.ReactNode }) {
  return (
    <section className={`${className ?? ""} ok-rasgo ${on ? "is-on" : ""}`}>
      <style>{CSS}</style>
      {children}
    </section>
  )
}
