// AS TRINCHEIRAS (T11): o mapa dos túneis, as raízes da cidade-árvore.
// (05/11, o dono: "aumentar bem mais a dimensão dos túneis, criar mais trajeto")
// Era um triângulo de 3 rios (~1,7 km). Agora é uma rede: 5 rios secos em
// pentágono (a volta da corrida, ~3,9 km), uma galeria de atalho cortando por
// dentro e a rampa da descida (a porta de entrada, um beco sem saída). Os rios se
// encontram em SALÕES: as 3 torres (sobem pra rua), o salão do metrô (a linha 9,
// o trem parado na plataforma) e o salão do grafite. Mapa e lugares: docs/tuneis.md.
// Lá embaixo só a pé, de patins, skate, BMX ou a moto (a Kombi fica na porta).
//
// Este arquivo é só a geometria (sem React nem three), pra a corrida (T13) e
// as motos (T14) usarem o mesmo mapa: onde é chão, onde é parede, a altura em
// cada ponto e a volta inteira pra quem corre.
//
// A seção de cada rio é a de um rio canalizado: o leito plano no meio e, dos
// dois lados, a parede curva (meio-tubo) que dá pra subir de patins e, no fim,
// fica em pé. Em cima, o teto de vidro (areia e sol) com as raízes. Os salões
// têm o mesmo perfil girado em volta, com o teto bem mais alto.

export type P2 = { x: number; z: number }

// medidas (metros). Antes: leito 8, curva 5,5, teto 11 (16 m de chão, 27 de parede a parede)
export const LEITO = 13 // meia largura do leito plano (26 m de chão)
export const CURVA = 7 // raio do meio-tubo da parede
export const MEIA = LEITO + CURVA // meia largura de parede a parede (40 m)
export const SUBIDA_MAX = CURVA - 0.35 // até onde dá pra subir na parede (depois é em pé)
export const TETO = 22 // altura do vidro nos rios (nos salões, cada um tem o seu)
export const TORRE_R = 6 // raio da torre
export const TORRE_DESVIO = 26 // a torre fica no fundo do salão, pra fora do mapa
export const R_MAPA = 640 // do centro do pentágono até cada salão da volta
const PASSO = 2 // metros entre os pontos da linha do meio

export type TipoSalao = "torre" | "metro" | "grafite" | "descida"
export type Salao = { i: number; tipo: TipoSalao; nome: string; c: P2; r: number; alto: number; fora: P2; torre: P2 | null }
export type Avenida = { i: number; de: number; ate: number; nome: string; cor: string; volta: boolean; pts: P2[]; comp: number }

const vertice = (i: number): P2 => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
  return { x: R_MAPA * Math.cos(a), z: R_MAPA * Math.sin(a) }
}
const unit = (x: number, z: number): P2 => { const n = Math.hypot(x, z) || 1; return { x: x / n, z: z / n } }

// a descida: a rampa sai da TORRE 1 pra fora, de lado (longe da torre e do rio A)
const ANG_DESCIDA = (-25 * Math.PI) / 180
const COMP_DESCIDA = 300

// os salões: r = raio até a parede em pé; alto = o vidro lá em cima
const SALOES_BASE: { tipo: TipoSalao; nome: string; c: P2; r: number; alto: number }[] = [
  { tipo: "torre", nome: "TORRE 1 · TÚNEIS", c: vertice(0), r: 48, alto: 32 },
  { tipo: "metro", nome: "SALÃO DO METRÔ", c: vertice(1), r: 100, alto: 42 },
  { tipo: "torre", nome: "TORRE 2", c: vertice(2), r: 46, alto: 30 },
  { tipo: "grafite", nome: "SALÃO DO GRAFITE", c: vertice(3), r: 88, alto: 38 },
  { tipo: "torre", nome: "TORRE 3", c: vertice(4), r: 46, alto: 30 },
  { tipo: "descida", nome: "A DESCIDA", c: { x: vertice(0).x + Math.cos(ANG_DESCIDA) * COMP_DESCIDA, z: vertice(0).z + Math.sin(ANG_DESCIDA) * COMP_DESCIDA }, r: 36, alto: 26 },
]
export const SALOES: Salao[] = SALOES_BASE.map((b, i) => {
  const fora = b.tipo === "descida" ? unit(Math.cos(ANG_DESCIDA), Math.sin(ANG_DESCIDA)) : unit(b.c.x, b.c.z)
  const torre = b.tipo === "torre" ? { x: b.c.x + fora.x * TORRE_DESVIO, z: b.c.z + fora.z * TORRE_DESVIO } : null
  return { ...b, i, fora, torre }
})
export const TORRES = SALOES.filter((s): s is Salao & { torre: P2 } => !!s.torre)
export const SALAO_LARGADA = SALOES[0] // a corrida larga e chega na TORRE 1
export const SALAO_DESCIDA = SALOES[5] // a porta de entrada (o passeio começa aqui)
export const SALAO_METRO = SALOES[1]
export const SALAO_GRAFITE = SALOES[3]

// os rios: de/ate são salões. "volta" = faz parte da volta da corrida (em ordem)
// amp = o quanto serpenteia (com sinal); fase = a segunda onda
const AVENIDAS_BASE: { de: number; ate: number; nome: string; cor: string; volta: boolean; amp: number; fase: number }[] = [
  { de: 0, ate: 1, nome: "RIO SECO A", cor: "#ff3fb0", volta: true, amp: 95, fase: 0.3 },
  { de: 1, ate: 2, nome: "RIO SECO B", cor: "#2fe8ff", volta: true, amp: -95, fase: 1.4 },
  { de: 2, ate: 3, nome: "RIO SECO C", cor: "#ffc857", volta: true, amp: 95, fase: 2.2 },
  { de: 3, ate: 4, nome: "RIO SECO D", cor: "#7dffb0", volta: true, amp: -95, fase: 3.1 },
  { de: 4, ate: 0, nome: "RIO SECO E", cor: "#c08cff", volta: true, amp: 95, fase: 4.0 },
  { de: 1, ate: 3, nome: "GALERIA DO ATALHO", cor: "#ff7a3c", volta: false, amp: 70, fase: 0.9 },
  { de: 5, ate: 0, nome: "RAMPA DA DESCIDA", cor: "#ffcf8a", volta: false, amp: -18, fase: 0 },
]

// o rio serpenteia: zero e reto nas duas pontas (sai e chega no salão reto)
const desvio = (t: number, amp: number, fase: number) => amp * Math.sin(Math.PI * t) ** 2 * (Math.sin(2 * Math.PI * t) + 0.3 * Math.sin(4 * Math.PI * t + fase))

export const AVENIDAS: Avenida[] = AVENIDAS_BASE.map((b, i) => {
  const a = SALOES[b.de].c, c = SALOES[b.ate].c
  const dx = c.x - a.x, dz = c.z - a.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L
  const nx = -uz, nz = ux
  const n = Math.ceil(L / PASSO), pts: P2[] = []
  for (let k = 0; k <= n; k++) {
    const t = k / n, s = t * L, o = desvio(t, b.amp, b.fase)
    pts.push({ x: a.x + ux * s + nx * o, z: a.z + uz * s + nz * o })
  }
  let comp = 0
  for (let k = 1; k < pts.length; k++) comp += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].z - pts[k - 1].z)
  return { i, de: b.de, ate: b.ate, nome: b.nome, cor: b.cor, volta: b.volta, pts, comp }
})
export const AVENIDAS_VOLTA = AVENIDAS.filter((a) => a.volta)

// a volta inteira (TORRE 1 → metrô → TORRE 2 → grafite → TORRE 3 → TORRE 1),
// pela linha do meio: o piloto automático e a corrida (T13)
export const VOLTA: P2[] = AVENIDAS_VOLTA.flatMap((a) => a.pts.slice(0, -1))

// ── os trechos: cada rio cortado em pedaços de ~200 m (a colisão procura só nos
// pedaços em volta; o desenho monta só os pedaços perto de quem anda) ──
export const PONTOS_TRECHO = 100
export type TrechoRio = { av: number; k0: number; k1: number; min: P2; max: P2 }
export const TRECHOS_RIO: TrechoRio[] = AVENIDAS.flatMap((a) => {
  const out: TrechoRio[] = [], n = a.pts.length - 1
  for (let k0 = 0; k0 < n; k0 += PONTOS_TRECHO) {
    const k1 = Math.min(n, k0 + PONTOS_TRECHO)
    const min = { x: Infinity, z: Infinity }, max = { x: -Infinity, z: -Infinity }
    for (let k = k0; k <= k1; k++) { const p = a.pts[k]; min.x = Math.min(min.x, p.x); min.z = Math.min(min.z, p.z); max.x = Math.max(max.x, p.x); max.z = Math.max(max.z, p.z) }
    out.push({ av: a.i, k0, k1, min, max })
  }
  return out
})

// os limites do mapa inteiro (o mapinha)
export const LIMITES = (() => {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity
  for (const a of AVENIDAS) for (const p of a.pts) { x0 = Math.min(x0, p.x); z0 = Math.min(z0, p.z); x1 = Math.max(x1, p.x); z1 = Math.max(z1, p.z) }
  for (const s of SALOES) { x0 = Math.min(x0, s.c.x - s.r); z0 = Math.min(z0, s.c.z - s.r); x1 = Math.max(x1, s.c.x + s.r); z1 = Math.max(z1, s.c.z + s.r) }
  return { x0: x0 - MEIA, z0: z0 - MEIA, x1: x1 + MEIA, z1: z1 + MEIA }
})()

// a altura da parede curva a "e" metros depois do fim do leito, e a inclinação
export function perfil(e: number): { y: number; incl: number } {
  if (e <= 0) return { y: 0, incl: 0 }
  const k = Math.min(e, SUBIDA_MAX), r = Math.sqrt(CURVA * CURVA - k * k)
  return { y: CURVA - r, incl: k / r }
}

// onde o ponto está: "e" é quanto passou do leito (<= 0: no chão plano; > 0:
// subindo a parede), (nx, nz) aponta pra fora (pra parede), e "onde" diz se é
// um salão ("praca") ou um rio ("avenida"), e "s", quantos metros dele
export type Onde = { e: number; nx: number; nz: number; tipo: "praca" | "avenida"; i: number; s: number }

const PERTO = MEIA + 40 // a folga da caixa de cada trecho
function rioMaisPerto(a: Avenida, x: number, z: number, ka: number, kb: number, melhor: Onde): Onde {
  const p = a.pts
  let kc = ka, db = Infinity
  for (let k = ka; k <= kb; k += 4) { const d = (p[k].x - x) ** 2 + (p[k].z - z) ** 2; if (d < db) { db = d; kc = k } }
  let best = { d2: Infinity, px: 0, pz: 0, k: 0, f: 0 }
  for (let k = Math.max(0, kc - 5); k < Math.min(p.length - 1, kc + 5); k++) {
    const ax = p[k].x, az = p[k].z, bx = p[k + 1].x - ax, bz = p[k + 1].z - az
    const f = Math.max(0, Math.min(1, ((x - ax) * bx + (z - az) * bz) / (bx * bx + bz * bz)))
    const px = ax + bx * f, pz = az + bz * f, d2 = (x - px) ** 2 + (z - pz) ** 2
    if (d2 < best.d2) best = { d2, px, pz, k, f }
  }
  const d = Math.sqrt(best.d2) || 1e-6, e = d - LEITO
  return e < melhor.e ? { e, nx: (x - best.px) / d, nz: (z - best.pz) / d, tipo: "avenida", i: a.i, s: (best.k + best.f) * PASSO } : melhor
}

export function ondeEsta(x: number, z: number): Onde {
  let melhor: Onde = { e: Infinity, nx: 0, nz: 1, tipo: "praca", i: 0, s: 0 }
  // os salões (um círculo; a torre e o trem são obstáculos à parte)
  for (const t of SALOES) {
    const dx = x - t.c.x, dz = z - t.c.z, r = Math.hypot(dx, dz) || 1e-6
    const e = r - (t.r - CURVA)
    if (e < melhor.e) melhor = { e, nx: dx / r, nz: dz / r, tipo: "praca", i: t.i, s: 0 }
  }
  // os rios: só os trechos em volta do ponto (de 4 em 4 e refina)
  let achou = false
  for (const tr of TRECHOS_RIO) {
    if (x < tr.min.x - PERTO || x > tr.max.x + PERTO || z < tr.min.z - PERTO || z > tr.max.z + PERTO) continue
    achou = true
    const a = AVENIDAS[tr.av]
    melhor = rioMaisPerto(a, x, z, Math.max(0, tr.k0 - 4), Math.min(a.pts.length - 1, tr.k1 + 4), melhor)
  }
  // longe de tudo (a câmera, um teste): procura em todos
  if (!achou) for (const a of AVENIDAS) melhor = rioMaisPerto(a, x, z, 0, a.pts.length - 1, melhor)
  return melhor
}

// ── os obstáculos: as torres (redondas) e o trem parado no salão do metrô (uma caixa) ──
export type Caixa = { c: P2; ax: number; az: number; meioC: number; meioL: number; alto: number }
const metroC = SALAO_METRO.c, metroF = SALAO_METRO.fora
// o trem: encostado na plataforma, do lado de fora do salão (longe das bocas dos rios)
export const TREM: Caixa = { c: { x: metroC.x + metroF.x * 62, z: metroC.z + metroF.z * 62 }, ax: -metroF.z, az: metroF.x, meioC: 31, meioL: 2.3, alto: 4.6 }
// as trincheiras de verdade: 3 muros baixos no fundo do salão do grafite (o grafite dos dois lados)
const grafC = SALAO_GRAFITE.c, grafA = Math.atan2(SALAO_GRAFITE.fora.z, SALAO_GRAFITE.fora.x)
export const MUROS: Caixa[] = [-1, 0, 1].map((j) => {
  const a = grafA + j * 0.42, d = j === 0 ? 56 : 46
  return { c: { x: grafC.x + Math.cos(a) * d, z: grafC.z + Math.sin(a) * d }, ax: -Math.sin(a), az: Math.cos(a), meioC: 7, meioL: 0.6, alto: 3.6 }
})
// a porta de entrada: no fundo da descida, de pé no pé da parede (sobe pro subúrbio)
const descC = SALAO_DESCIDA.c, descF = SALAO_DESCIDA.fora, portaD = SALAO_DESCIDA.r - CURVA + 0.4
export const PORTA: Caixa = { c: { x: descC.x + descF.x * portaD, z: descC.z + descF.z * portaD }, ax: -descF.z, az: descF.x, meioC: 5, meioL: 0.4, alto: 10 }
export const CAIXAS: Caixa[] = [TREM, ...MUROS, PORTA]

// bateu numa torre ou no trem: devolve o ponto empurrado pra fora e a normal (ou null)
export function batenaTorre(x: number, z: number, folga = 0.6): { x: number; z: number; nx: number; nz: number } | null {
  for (const t of TORRES) {
    const dx = x - t.torre.x, dz = z - t.torre.z, r = Math.hypot(dx, dz), min = TORRE_R + folga
    if (r < min) { const nx = dx / (r || 1e-6), nz = dz / (r || 1e-6); return { x: t.torre.x + nx * min, z: t.torre.z + nz * min, nx, nz } }
  }
  for (const b of CAIXAS) {
    const dx = x - b.c.x, dz = z - b.c.z
    const u = dx * b.ax + dz * b.az, v = dx * -b.az + dz * b.ax // ao longo e de lado
    const pu = b.meioC + folga - Math.abs(u), pv = b.meioL + folga - Math.abs(v)
    if (pu <= 0 || pv <= 0) continue
    if (pv < pu) { const s = Math.sign(v) || 1, nv = s * (b.meioL + folga); return { x: b.c.x + b.ax * u - b.az * nv, z: b.c.z + b.az * u + b.ax * nv, nx: -b.az * s, nz: b.ax * s } }
    const s = Math.sign(u) || 1, nu = s * (b.meioC + folga)
    return { x: b.c.x + b.ax * nu - b.az * v, z: b.c.z + b.az * nu + b.ax * v, nx: b.ax * s, nz: b.az * s }
  }
  return null
}

// os nomes (RASCUNHO: o dono escolhe)
export const NOME_SALAO = SALOES.map((s) => s.nome)
export const NOME_AVENIDA = AVENIDAS.map((a) => a.nome)
export const COR_AVENIDA = AVENIDAS.map((a) => a.cor)
export const COR_TORRE = "#9b8cff" // a cor dos TÚNEIS no mapa do subúrbio (T02)
