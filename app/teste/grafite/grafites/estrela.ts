import { suave, type Grafite, type Pt } from "../tipos"

// RASCUNHO: estrela de cinco pontas com órbita. Trocar pelo desenho do artista.
const v = (k: number, r = 40): Pt => {
  const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5
  return [50 + r * Math.cos(a), 52 + r * Math.sin(a)]
}
const ordem = [0, 2, 4, 1, 3]
const estrela: Pt[] = [...ordem, 0].map((k) => v(k))
const anel: Pt[] = Array.from({ length: 61 }, (_, i): Pt => {
  const a = (i / 60) * Math.PI * 2 - Math.PI / 2
  return [50 + 46 * Math.cos(a), 52 + 46 * Math.sin(a)]
})
const orbita = suave([[6, 70], [30, 80], [70, 74], [95, 40], [80, 22]], 10)

const g: Grafite = {
  id: "estrela",
  nome: "Estrela Cadente",
  rascunho: true,
  // o jogador desenha a própria estrela: 1 → 5 na ordem em que se traça
  gesto: ordem.map((k) => v(k, 38)),
  tracos: [
    { cor: "#22e6ff", largura: 2, pts: anel, vel: 1.4 },
    { cor: "#b46bff", largura: 3.6, pts: estrela },
    { cor: "#f4e9ff", largura: 1.2, pts: [v(0, 34), v(2, 34)] },
    { cor: "#ff3fb0", largura: 2.2, pts: orbita, vel: 1.2 },
    { cor: "#ffd23f", largura: 2.6, pts: [[50, 49], [50, 49.1]], vel: 0.4 },
    { cor: "#ffd23f", largura: 1.4, pts: [[88, 10], [88, 18]], vel: 0.6 },
    { cor: "#ffd23f", largura: 1.4, pts: [[84, 14], [92, 14]], vel: 0.6 },
  ],
}
export default g
