"use client"

// AS GOTAS NA TELA (14/11, o dono: saiu o vidro embaçado). Pouquíssimas gotas e
// resquícios de gota em PRIMEIRO PLANO, por cima de tudo (até do HUD), como se a
// tela da pessoa estivesse molhada: "ela vai ficar até meio confusa achando que é
// o pc dela". Por isso: sem aviso, sem dica, sem clique (pointer-events: none),
// sem animação chamativa. Uma gota nasce de vez em quando enquanto chove, uma ou
// outra escorre um pouco, e quando a chuva para elas secam e viram marca, que
// some devagar. Coletar água no deserto respinga duas ou três (respingar()).

import { useEffect, useRef, useState } from "react"

interface Gota {
  id: number
  x: number // % da largura
  y: number // % da altura
  r: number // raio, px
  achata: number // a gota não é um círculo perfeito
  giro: number
  seca: boolean // virou marca (resquício)
  desce: number // px que escorreu
  nasceu: number // ms (Date.now)
}

// ── os números (RASCUNHO): poucas, de propósito ──
const MAX = 7 // nunca mais que isso na tela
const CHANCE_NASCER = 0.14 // por segundo, chovendo
const CHANCE_ESCORRER = 0.025 // por segundo, por gota grande
const CHANCE_SECAR = 0.035 // por segundo, por gota, sem chuva
const VIDA_MARCA = 45_000 // ms: a marca seca some depois disso

// respingo: um store mínimo, a page chama quando a água é coletada
const ouvintes = new Set<() => void>()
export function respingar() { ouvintes.forEach((f) => f()) }

let seq = 0
function novaGota(seca = false, perto?: { x: number; y: number }): Gota {
  const grande = Math.random() < 0.35
  return {
    id: ++seq,
    // fora do miolo da tela: a pessoa joga olhando o meio
    x: perto ? perto.x + (Math.random() - 0.5) * 14 : Math.random() < 0.5 ? 4 + Math.random() * 30 : 66 + Math.random() * 30,
    y: perto ? perto.y + (Math.random() - 0.5) * 16 : 6 + Math.random() * 80,
    r: seca ? 5 + Math.random() * 9 : grande ? 9 + Math.random() * 7 : 3 + Math.random() * 5,
    achata: 0.82 + Math.random() * 0.3,
    giro: Math.random() * 180,
    seca,
    desce: 0,
    nasceu: Date.now(),
  }
}

export function Gotas({ molhadoRef }: { molhadoRef: React.RefObject<boolean> }) {
  const [gotas, setGotas] = useState<Gota[]>([])
  const ultimaChuva = useRef(false)

  useEffect(() => {
    const t = setInterval(() => {
      const chove = !!molhadoRef.current
      const comecou = chove && !ultimaChuva.current
      ultimaChuva.current = chove
      setGotas((gs) => {
        const agora = Date.now()
        let out = gs.filter((g) => !(g.seca && agora - g.nasceu > VIDA_MARCA))
        if (chove) {
          // a primeira chega logo (senão a pessoa nem liga a chuva às gotas); depois, de vez em quando
          if (out.length < MAX && (comecou || Math.random() < CHANCE_NASCER)) out = [...out, novaGota(Math.random() < 0.25)]
          out = out.map((g) => !g.seca && g.r > 9 && g.desce < 160 && Math.random() < CHANCE_ESCORRER ? { ...g, desce: g.desce + 30 + Math.random() * 70 } : g)
        } else {
          out = out.map((g) => !g.seca && Math.random() < CHANCE_SECAR ? { ...g, seca: true, nasceu: agora } : g)
        }
        return out.length === gs.length && out.every((g, i) => g === gs[i]) ? gs : out
      })
    }, 1000)
    return () => clearInterval(t)
  }, [molhadoRef])

  useEffect(() => {
    const f = () => setGotas((gs) => {
      const perto = { x: 20 + Math.random() * 60, y: 20 + Math.random() * 50 }
      const n = 2 + Math.floor(Math.random() * 2)
      return [...gs, ...Array.from({ length: n }, () => novaGota(false, perto))].slice(-MAX - 2)
    })
    ouvintes.add(f)
    return () => { ouvintes.delete(f) }
  }, [])

  if (!gotas.length) return null
  return (
    <div className="l-gotas" aria-hidden="true">
      {gotas.map((g) => (
        <i
          key={g.id}
          className={`l-gota ${g.seca ? "is-seca" : ""}`}
          style={{
            left: `${g.x}%`,
            top: `${g.y}%`,
            width: g.r * 2,
            height: g.r * 2 * g.achata,
            transform: `translate(-50%, calc(-50% + ${g.desce}px)) rotate(${g.giro}deg)`,
          }}
        />
      ))}
    </div>
  )
}
