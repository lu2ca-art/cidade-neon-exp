import type { Grafite, Pt } from "../tipos"

// RASCUNHO: um raio gigante com eco e faíscas. Trocar pelo desenho do artista.
const raio: Pt[] = [[62, 8], [28, 54], [50, 54], [36, 92], [76, 40], [54, 40], [62, 8]]
const eco = raio.map(([x, y]): Pt => [x - 4.5, y + 3.5])

const g: Grafite = {
  id: "raio",
  nome: "Raio do Túnel",
  rascunho: true,
  gesto: [[62, 12], [30, 52], [66, 52], [38, 88]],
  tracos: [
    { cor: "#22e6ff", largura: 1.8, pts: eco },
    { cor: "#ffd23f", largura: 3.6, pts: raio },
    { cor: "#fff7d6", largura: 1.2, pts: [[60, 16], [38, 46]] },
    { cor: "#ff3fb0", largura: 2.4, pts: [[12, 90], [30, 93], [60, 91], [88, 86]], vel: 1.3 },
    { cor: "#ffd23f", largura: 1.5, pts: [[80, 18], [90, 10]], vel: 0.6 },
    { cor: "#ffd23f", largura: 1.5, pts: [[84, 30], [95, 28]], vel: 0.6 },
    { cor: "#22e6ff", largura: 1.5, pts: [[16, 30], [8, 24]], vel: 0.6 },
    { cor: "#22e6ff", largura: 1.5, pts: [[14, 42], [4, 44]], vel: 0.6 },
    { cor: "#ff3fb0", largura: 2, pts: [[41, 94], [41, 99]], vel: 0.5 },
  ],
}
export default g
