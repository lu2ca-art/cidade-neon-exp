import { suave, type Grafite, type Pt } from "../tipos"

// RASCUNHO: coração neon cortado por um raio. Trocar pelo desenho do artista.
const cx = 50, cy = 47, k = 2.25
const coracao = (esc: number, dx = 0, dy = 0): Pt[] => {
  const o: Pt[] = []
  for (let i = 0; i <= 72; i++) {
    const t = Math.PI + (i / 72) * Math.PI * 2 // começa na ponta de baixo
    const x = 16 * Math.sin(t) ** 3
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
    o.push([cx + dx + x * k * esc, cy + dy - y * k * esc])
  }
  return o
}
const brilho = (x: number, y: number): [Pt, Pt][] => [[[x - 4, y], [x + 4, y]], [[x, y - 4], [x, y + 4]]]

const g: Grafite = {
  id: "coracao",
  nome: "Coração Neon",
  rascunho: true,
  gesto: [[27, 30], [50, 86], [73, 30], [50, 42]],
  tracos: [
    { cor: "#ff3fb0", largura: 3.8, pts: coracao(1) },
    { cor: "#9b5cff", largura: 1.9, pts: coracao(0.74, 0, 1.5) },
    { cor: "#22e6ff", largura: 3, pts: [[57, 22], [43, 50], [55, 50], [41, 80]] },
    { cor: "#fff1fb", largura: 1.5, pts: suave([[24, 38], [26, 28], [34, 22]], 6) },
    { cor: "#ff3fb0", largura: 2.4, pts: [[33, 72], [33, 83]], vel: 0.5 },
    { cor: "#ff3fb0", largura: 2, pts: [[64, 70], [64, 77]], vel: 0.5 },
    ...brilho(84, 22).map(([a, b]) => ({ cor: "#ffd23f", largura: 1.4, pts: [a, b], vel: 0.6 })),
    ...brilho(14, 60).map(([a, b]) => ({ cor: "#22e6ff", largura: 1.4, pts: [a, b], vel: 0.6 })),
  ],
}
export default g
