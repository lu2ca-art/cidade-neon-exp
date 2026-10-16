// O terreno da cidade (o diorama v5 que o LU2CA aprovou em 15/10): as mesmas
// funções de altura, costa e bairro da maquete, pra que a rede de ruas, o
// jogo e o mapa grande desenhem o mesmo lugar. Unidades da maquete: o mundo
// tem 2000 × 1400; ESCALA converte pra metros.

export const W = 2000, H = 1400
export const ESCALA = 8 // metros por unidade: atravessar a cidade (deserto → orla) ≈ 10 min

const perm = new Uint8Array(512)
{
  let s = 7
  const p = [...Array(256).keys()]
  for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [p[i], p[j]] = [p[j], p[i]] }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
}
const h2 = (x: number, y: number) => perm[(perm[x & 255] + y) & 255] / 255
const sm = (t: number) => t * t * (3 - 2 * t)
function ruido(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = sm(xf), v = sm(yf)
  return (h2(xi, yi) * (1 - u) + h2(xi + 1, yi) * u) * (1 - v) + (h2(xi, yi + 1) * (1 - u) + h2(xi + 1, yi + 1) * u) * v
}
export const fbm = (x: number, y: number) => ruido(x, y) * 0.55 + ruido(x * 2.1, y * 2.1) * 0.3 + ruido(x * 4.3, y * 4.3) * 0.15

export const costa = (x: number) => (x < 860 ? H + 200 : H - (x - 860) * 0.42 + Math.sin(x / 70) * 14 + Math.sin(x / 23) * 5)
const morro = (x: number, y: number) => Math.exp(-(((x - 1610) / 230) ** 2 + ((y - 300) / 180) ** 2))

export type Bairro = "cidade" | "suburbio" | "mirante" | "arena" | "deserto" | "orla" | "campo" | "mar"
export const BAIRROS: Record<"cidade" | "suburbio" | "mirante" | "arena" | "deserto", { x: number; y: number; rx: number; ry: number }> = {
  cidade: { x: 1000, y: 590, rx: 440, ry: 300 },
  suburbio: { x: 830, y: 1010, rx: 480, ry: 250 },
  mirante: { x: 1610, y: 300, rx: 380, ry: 290 },
  arena: { x: 1580, y: 780, rx: 250, ry: 200 },
  deserto: { x: 150, y: 700, rx: 430, ry: 900 },
}

export function bairro(x: number, y: number): Bairro {
  if (y > costa(x)) return "mar"
  if (y > costa(x) - 70 && x > 900) return "orla"
  let m: Bairro = "campo", dm = 1.05
  for (const k of Object.keys(BAIRROS) as (keyof typeof BAIRROS)[]) {
    const b = BAIRROS[k]
    const d = Math.hypot((x - b.x) / b.rx, (y - b.y) / b.ry) + (fbm(x / 160, y / 160) - 0.5) * 0.5
    if (d < dm) { dm = d; m = k }
  }
  return m
}

// a altura (em unidades da maquete): a serra atrás, o morro do mirante, o
// cânion do deserto, o platô da cidade e a descida do subúrbio pro mar
export function altura(x: number, y: number) {
  let h = (fbm(x / 220, y / 220) - 0.5) * 60
  const serra = Math.max(0, 1 - y / 300) * (0.6 + fbm(x / 140, 3) * 0.9)
  h += serra * (120 + (1 - Math.abs(fbm(x / 90, y / 90) - 0.5) * 2) * 160)
  h += morro(x, y) * 380
  const dDes = Math.max(0, 1 - Math.hypot((x - 150) / 430, (y - 700) / 900))
  if (dDes > 0) { const cr = 1 - Math.abs(fbm(x / 110, y / 110) - 0.5) * 2; h += dDes * (70 + cr * cr * 90 - Math.abs(fbm(x / 45, y / 45) - 0.5) * 60) }
  const dCid = Math.max(0, 1 - Math.hypot((x - 1000) / 440, (y - 590) / 300))
  h = h * (1 - Math.min(1, dCid * 1.6)) + Math.min(1, dCid * 1.6) * 55
  const dSub = Math.max(0, 1 - Math.hypot((x - 830) / 480, (y - 1010) / 250))
  h = h * (1 - dSub) + dSub * (40 - (y - 760) * 0.08)
  h += 34
  const c = costa(x)
  if (y > c - 40) h -= (y - (c - 40)) * 1.4
  return h
}
