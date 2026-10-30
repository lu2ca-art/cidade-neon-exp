// AS TRINCHEIRAS (T11): o mapa dos túneis, as raízes da cidade-árvore.
// Mais simples que o da cidade: 3 avenidas (os rios secos) em triângulo, que
// se encontram sempre nas torres; cada torre sobe e liga com as ruas lá de
// cima. Lá só se anda de BMX, patins ou skate (a Kombi não entra).
//
// Este arquivo é só a geometria (sem React nem three), pra a corrida (T13) e
// as motos (T14) usarem o mesmo mapa: onde é chão, onde é parede, a altura em
// cada ponto e a volta inteira pra quem corre.
//
// A seção de cada avenida é a de um rio canalizado: o leito plano no meio e,
// dos dois lados, a parede curva (meio-tubo) que dá pra subir de patins e, no
// fim, fica em pé. Em cima, o teto de vidro (areia e sol) com as raízes.

export type P2 = { x: number; z: number }

// medidas (metros)
export const RAIO_TRIANGULO = 320 // do centro do triângulo até cada torre
export const LEITO = 8 // meia largura do leito plano
export const CURVA = 5.5 // raio do meio-tubo da parede
export const SUBIDA_MAX = CURVA - 0.35 // até onde dá pra subir na parede (depois é em pé)
export const TETO = 11 // altura do vidro
export const PRACA = 36 // raio da praça em volta de cada torre
export const TORRE_R = 6 // raio da torre
export const TORRE_DESVIO = 20 // a torre fica pra fora do triângulo, no fundo da praça
const MEANDRO = 70 // o quanto o rio serpenteia
const PASSO = 2 // metros entre os pontos da linha do meio

export type Torre = { i: number; c: P2; torre: P2; fora: P2 }
export type Avenida = { i: number; de: number; ate: number; pts: P2[]; comp: number }

const vertice = (i: number): P2 => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3
  return { x: RAIO_TRIANGULO * Math.cos(a), z: RAIO_TRIANGULO * Math.sin(a) }
}

export const TORRES: Torre[] = [0, 1, 2].map((i) => {
  const c = vertice(i), n = Math.hypot(c.x, c.z), fora = { x: c.x / n, z: c.z / n }
  return { i, c, fora, torre: { x: c.x + fora.x * TORRE_DESVIO, z: c.z + fora.z * TORRE_DESVIO } }
})

// o rio serpenteia: zero e reto nas duas pontas (sai e chega na praça reto)
const desvio = (t: number) => MEANDRO * Math.sin(Math.PI * t) ** 2 * Math.sin(2 * Math.PI * t)

export const AVENIDAS: Avenida[] = [0, 1, 2].map((i) => {
  const a = TORRES[i].c, b = TORRES[(i + 1) % 3].c
  const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L
  const nx = -uz, nz = ux, sinal = i === 1 ? -1 : 1
  const n = Math.ceil(L / PASSO), pts: P2[] = []
  for (let k = 0; k <= n; k++) {
    const t = k / n, s = t * L, o = desvio(t) * sinal
    pts.push({ x: a.x + ux * s + nx * o, z: a.z + uz * s + nz * o })
  }
  let comp = 0
  for (let k = 1; k < pts.length; k++) comp += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].z - pts[k - 1].z)
  return { i, de: i, ate: (i + 1) % 3, pts, comp }
})

// a volta inteira (torre 0 → 1 → 2 → 0), pela linha do meio: o piloto
// automático da medição e, depois, a corrida (T13)
export const VOLTA: P2[] = AVENIDAS.flatMap((a) => a.pts.slice(0, -1))

// a altura da parede curva a "e" metros depois do fim do leito, e a inclinação
export function perfil(e: number): { y: number; incl: number } {
  if (e <= 0) return { y: 0, incl: 0 }
  const k = Math.min(e, SUBIDA_MAX), r = Math.sqrt(CURVA * CURVA - k * k)
  return { y: CURVA - r, incl: k / r }
}

// onde o ponto está: "e" é quanto passou do leito (<= 0: no chão plano; > 0:
// subindo a parede), (nx, nz) aponta pra fora (pra parede), e "onde" diz se é
// a praça de uma torre ou uma avenida (e "s", quantos metros dela)
export type Onde = { e: number; nx: number; nz: number; tipo: "praca" | "avenida"; i: number; s: number }

export function ondeEsta(x: number, z: number): Onde {
  let melhor: Onde = { e: Infinity, nx: 0, nz: 1, tipo: "praca", i: 0, s: 0 }
  // as praças (um círculo; a torre é obstáculo à parte)
  for (const t of TORRES) {
    const dx = x - t.c.x, dz = z - t.c.z, r = Math.hypot(dx, dz) || 1e-6
    const e = r - (PRACA - CURVA)
    if (e < melhor.e) melhor = { e, nx: dx / r, nz: dz / r, tipo: "praca", i: t.i, s: 0 }
  }
  // as avenidas: o ponto mais perto da linha do meio (de 4 em 4 e refina)
  for (const a of AVENIDAS) {
    const p = a.pts
    let kb = 0, db = Infinity
    for (let k = 0; k < p.length; k += 4) { const d = (p[k].x - x) ** 2 + (p[k].z - z) ** 2; if (d < db) { db = d; kb = k } }
    let best = { d2: Infinity, px: 0, pz: 0, k: 0, f: 0 }
    for (let k = Math.max(0, kb - 5); k < Math.min(p.length - 1, kb + 5); k++) {
      const ax = p[k].x, az = p[k].z, bx = p[k + 1].x - ax, bz = p[k + 1].z - az
      const f = Math.max(0, Math.min(1, ((x - ax) * bx + (z - az) * bz) / (bx * bx + bz * bz)))
      const px = ax + bx * f, pz = az + bz * f, d2 = (x - px) ** 2 + (z - pz) ** 2
      if (d2 < best.d2) best = { d2, px, pz, k, f }
    }
    const d = Math.sqrt(best.d2) || 1e-6, e = d - LEITO
    if (e < melhor.e) melhor = { e, nx: (x - best.px) / d, nz: (z - best.pz) / d, tipo: "avenida", i: a.i, s: (best.k + best.f) * PASSO }
  }
  return melhor
}

// a torre é um obstáculo redondo: devolve o ponto empurrado pra fora (ou null)
export function batenaTorre(x: number, z: number, folga = 0.6): { x: number; z: number; nx: number; nz: number } | null {
  for (const t of TORRES) {
    const dx = x - t.torre.x, dz = z - t.torre.z, r = Math.hypot(dx, dz), min = TORRE_R + folga
    if (r < min) { const nx = dx / (r || 1e-6), nz = dz / (r || 1e-6); return { x: t.torre.x + nx * min, z: t.torre.z + nz * min, nx, nz } }
  }
  return null
}

// os nomes (RASCUNHO: o dono escolhe)
export const NOME_TORRE = ["TORRE 1 · TÚNEIS", "TORRE 2", "TORRE 3"]
export const NOME_AVENIDA = ["RIO SECO A", "RIO SECO B", "RIO SECO C"]
export const COR_AVENIDA = ["#ff3fb0", "#2fe8ff", "#ffc857"]
export const COR_TORRE = "#9b8cff" // a cor dos TÚNEIS no mapa do subúrbio (T02)
