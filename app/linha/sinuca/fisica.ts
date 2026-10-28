// A SINUCA (T17): a física. 2D vista de cima, em metros, passo fixo.
// Cada bola tem velocidade (vx, vy) e rotação (wx, wy, wz). Enquanto o ponto
// de contato com o pano escorrega, o atrito de deslizamento puxa a bola pro
// rolamento: é daí que saem o "puxar" (efeito embaixo) e o "seguir" (efeito
// em cima) depois de bater numa bola, sem regra especial. O efeito lateral
// (wz) só aparece na tabela.
//
// Determinística: o mesmo passo roda no jogo e na cabeça do Mubarak (ia.ts),
// que simula as tacadas antes de escolher.

export const L = 2.0 // comprimento do pano (m)
export const W = 1.0 // largura
export const R = 0.0285 // raio da bola
export const H = 1 / 600 // o passo fixo (s)
const PASSO = H
// (a cabeça do Mubarak simula com passo 2H: metade do custo; o erro some no erro da mão dele)

const G = 9.81
const MU_S = 0.2 // atrito de deslizamento
const ROLA = 0.15 // m/s²: resistência ao rolar (base)
const ROLA_V = 0.04 // ... mais um tanto que cresce com a velocidade (pano "lento" de jogo)
const GIRO_Z = 9 // rad/s²: o efeito lateral morre
const E_BOLA = 0.94
const E_TABELA = 0.8
export const VMAX = 6.2 // m/s: a tacada mais forte

// ── a mesa: tabelas (segmentos com ponta redonda) e caçapas ──
export const CANTO = 0.086 // da quina até a boca, em cada tabela (boca do canto = 0,116 m)
export const MEIO = 0.064 // meia boca da caçapa do meio (0,128 m)
export const TABELA = 0.045 // fundo da tabela (do nariz até a madeira)

export interface Seg { ax: number; ay: number; bx: number; by: number }
export interface Cacapa { x: number; y: number; r: number; bx: number; by: number } // (x,y,r) onde cai; (bx,by) a boca, pra onde se mira

function montar() {
  const segs: Seg[] = []
  const s = (ax: number, ay: number, bx: number, by: number) => segs.push({ ax, ay, bx, by })
  const l = L / 2, w = W / 2, c = CANTO, m = MEIO, t = TABELA
  for (const sy of [1, -1]) {
    // tabela comprida de cima/baixo, duas metades
    s(-l + c, sy * w, -m, sy * w)
    s(m, sy * w, l - c, sy * w)
    // as bocas do meio (estreitam um pouco pra dentro)
    s(-m, sy * w, -m + 0.012, sy * (w + t))
    s(m, sy * w, m - 0.012, sy * (w + t))
  }
  for (const sx of [1, -1]) s(sx * l, -w + c, sx * l, w - c)
  // as quinas: dois queixos a 45°, paredes paralelas ao eixo da caçapa
  for (const sx of [1, -1]) for (const sy of [1, -1]) {
    s(sx * (l - c), sy * w, sx * (l - c + t), sy * (w + t))
    s(sx * l, sy * (w - c), sx * (l + t), sy * (w - c + t))
  }
  const cac: Cacapa[] = []
  const d = 0.065 / Math.SQRT2
  for (const sy of [1, -1]) for (const sx of [-1, 1]) {
    const bx = sx * (l - c / 2), by = sy * (w - c / 2)
    cac.push({ x: bx + sx * d, y: by + sy * d, r: 0.058, bx, by })
  }
  for (const sy of [1, -1]) cac.push({ x: 0, y: sy * (w + 0.052), r: 0.05, bx: 0, by: sy * w })
  return { segs, cac }
}
const GEO = montar()
export const SEGS = GEO.segs
export const CACAPAS = GEO.cac

// ── as bolas ──
export interface Bola {
  id: number // 0 = branca, 1–7 lisas, 8 a preta, 9–15 listradas
  x: number; y: number; vx: number; vy: number
  wx: number; wy: number; wz: number
  ativa: boolean // na mesa
  parada: boolean
}
export type Evento =
  | { t: "bola"; v: number; x: number; y: number }
  | { t: "tabela"; v: number; x: number; y: number }
  | { t: "cacapa"; id: number; c: number; v: number }

export interface Mesa {
  bolas: Bola[]
  tempo: number
  // o que aconteceu na tacada (as regras leem)
  primeiro: number // a primeira bola que a branca tocou (-1 nenhuma)
  tabelaDepois: boolean // alguma bola bateu na tabela depois do 1º toque
  caidas: { id: number; c: number }[]
  eventos: Evento[] | null // null = não guarda (a simulação do Mubarak)
}

export const novaBola = (id: number, x: number, y: number): Bola => ({ id, x, y, vx: 0, vy: 0, wx: 0, wy: 0, wz: 0, ativa: true, parada: true })

export const PE = L / 4 // o ponto do pé (onde fica a ponta do triângulo)
export const CABECEIRA = -L / 4 // a linha de saída

// o triângulo: ponta no ponto do pé, a 8 no meio, um canto de cada grupo
export function rack(rand: () => number = Math.random): Bola[] {
  const lisas = [1, 2, 3, 4, 5, 6, 7], list = [9, 10, 11, 12, 13, 14, 15]
  const emb = (a: number[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
  emb(lisas); emb(list)
  const ordem: number[] = new Array(15).fill(0)
  // posições: linha r (0–4), k (0–r); índice = r(r+1)/2 + k
  ordem[4] = 8 // linha 2, meio
  const cantoA = 10, cantoB = 14 // os dois cantos de trás
  const lisaNoA = rand() < 0.5
  ordem[cantoA] = lisaNoA ? lisas.pop()! : list.pop()!
  ordem[cantoB] = lisaNoA ? list.pop()! : lisas.pop()!
  ordem[0] = lisas.pop()! // a ponta: uma lisa
  const resto = emb([...lisas, ...list])
  for (let i = 0; i < 15; i++) if (!ordem[i]) ordem[i] = resto.pop()!
  const bolas: Bola[] = [novaBola(0, CABECEIRA, 0)]
  const dx = Math.sqrt(3) * (R + 0.0002), dy = 2 * (R + 0.0002)
  let i = 0
  for (let r = 0; r < 5; r++) for (let k = 0; k <= r; k++) {
    // um tiquinho de bagunça (o triângulo nunca é perfeito): a quebra varia
    const j = (rand() - 0.5) * 0.0004
    bolas.push(novaBola(ordem[i++], PE + r * dx + j, (k - r / 2) * dy + j))
  }
  return bolas.sort((a, b) => a.id - b.id)
}

export function novaMesa(bolas: Bola[]): Mesa {
  return { bolas, tempo: 0, primeiro: -1, tabelaDepois: false, caidas: [], eventos: [] }
}

export function clonar(m: Mesa): Mesa {
  return { bolas: m.bolas.map((b) => ({ ...b })), tempo: 0, primeiro: -1, tabelaDepois: false, caidas: [], eventos: null }
}

// a tacada: ângulo, velocidade (m/s), efeito (ex = lado, -1..1; ey = em cima +, embaixo -)
export function tacar(m: Mesa, ang: number, vel: number, ex = 0, ey = 0) {
  const b = m.bolas[0]
  const dx = Math.cos(ang), dy = Math.sin(ang)
  b.vx = dx * vel; b.vy = dy * vel
  // bater acima/abaixo do centro (até meio raio): giro de 0 a 1,25× o rolamento natural
  const k = 1.25 * ey * vel / R
  b.wx = -dy * k; b.wy = dx * k
  b.wz = 1.25 * ex * vel / R * 0.8
  b.parada = false
  m.tempo = 0; m.primeiro = -1; m.tabelaDepois = false; m.caidas = []
}

export const emMovimento = (m: Mesa) => m.bolas.some((b) => b.ativa && !b.parada)

const R2 = 4 * R * R
const PERTO = R + 0.06 // só testa tabela/caçapa quando a bola está perto da borda

// um passo de H segundos. Devolve se ainda tem bola andando
export function passo(m: Mesa, H = PASSO): boolean {
  const bs = m.bolas
  let anda = false
  m.tempo += H
  for (const b of bs) {
    if (!b.ativa || b.parada) continue
    anda = true
    const ux = b.vx - R * b.wy, uy = b.vy + R * b.wx
    const us = Math.hypot(ux, uy)
    const a = MU_S * G
    if (us > 1e-4) {
      if (us <= 3.5 * a * H) {
        // termina de escorregar neste passo: passa a rolar (v final = v − 2/7 u)
        b.vx -= (2 / 7) * ux; b.vy -= (2 / 7) * uy
        b.wx = -b.vy / R; b.wy = b.vx / R
      } else {
        const fx = -ux / us, fy = -uy / us, dv = a * H
        b.vx += fx * dv; b.vy += fy * dv
        const k = (5 / (2 * R)) * dv
        b.wx += k * fy; b.wy -= k * fx
      }
    } else {
      const sp = Math.hypot(b.vx, b.vy)
      const dec = (ROLA + ROLA_V * sp) * H
      if (sp <= dec) { b.vx = 0; b.vy = 0 } else { const f = (sp - dec) / sp; b.vx *= f; b.vy *= f }
      b.wx = -b.vy / R; b.wy = b.vx / R
    }
    const dz = GIRO_Z * H
    b.wz = Math.abs(b.wz) <= dz ? 0 : b.wz - Math.sign(b.wz) * dz
    if (b.vx === 0 && b.vy === 0 && Math.abs(b.wx) + Math.abs(b.wy) < 1e-3) { b.wx = 0; b.wy = 0; if (b.wz === 0 || us <= 1e-4) { b.wz = 0; b.parada = true } }
    b.x += b.vx * H; b.y += b.vy * H
  }
  if (!anda) return false

  // bola com bola
  for (let i = 0; i < bs.length; i++) {
    const a = bs[i]
    if (!a.ativa) continue
    for (let j = i + 1; j < bs.length; j++) {
      const b = bs[j]
      if (!b.ativa || (a.parada && b.parada)) continue
      const dx = b.x - a.x, dy = b.y - a.y
      const d2 = dx * dx + dy * dy
      if (d2 >= R2 || d2 === 0) continue
      const d = Math.sqrt(d2), nx = dx / d, ny = dy / d
      const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
      if (rel < 0) {
        const imp = -(1 + E_BOLA) * rel / 2
        a.vx -= imp * nx; a.vy -= imp * ny; b.vx += imp * nx; b.vy += imp * ny
        a.parada = false; b.parada = false
        if (m.primeiro < 0) { if (a.id === 0) m.primeiro = b.id; else if (b.id === 0) m.primeiro = a.id }
        if (m.eventos) m.eventos.push({ t: "bola", v: -rel, x: a.x + nx * R, y: a.y + ny * R })
      }
      const sep = (2 * R - d) / 2 + 1e-6
      a.x -= nx * sep; a.y -= ny * sep; b.x += nx * sep; b.y += ny * sep
    }
  }

  // tabelas e caçapas
  const lx = L / 2 - PERTO, ly = W / 2 - PERTO
  for (const b of bs) {
    if (!b.ativa || b.parada) continue
    if (Math.abs(b.x) < lx && Math.abs(b.y) < ly) continue
    for (let c = 0; c < CACAPAS.length; c++) {
      const p = CACAPAS[c]
      const dx = b.x - p.x, dy = b.y - p.y
      if (dx * dx + dy * dy < p.r * p.r) {
        b.ativa = false; b.parada = true
        m.caidas.push({ id: b.id, c })
        if (m.eventos) m.eventos.push({ t: "cacapa", id: b.id, c, v: Math.hypot(b.vx, b.vy) })
        break
      }
    }
    if (!b.ativa) continue
    for (const s of SEGS) {
      const ex = s.bx - s.ax, ey = s.by - s.ay
      let t = ((b.x - s.ax) * ex + (b.y - s.ay) * ey) / (ex * ex + ey * ey)
      t = t < 0 ? 0 : t > 1 ? 1 : t
      const px = s.ax + ex * t, py = s.ay + ey * t
      const dx = b.x - px, dy = b.y - py
      const d2 = dx * dx + dy * dy
      if (d2 >= R * R || d2 === 0) continue
      const d = Math.sqrt(d2), nx = dx / d, ny = dy / d
      const vn = b.vx * nx + b.vy * ny
      if (vn < 0) {
        const tx = -ny, ty = nx
        let vt = b.vx * tx + b.vy * ty
        // o efeito lateral morde a tabela
        const escorrega = vt - b.wz * R
        const dvt = -0.22 * escorrega
        vt += dvt
        b.wz += -2.5 * dvt / R
        const vn2 = -E_TABELA * vn
        b.vx = nx * vn2 + tx * vt; b.vy = ny * vn2 + ty * vt
        // o giro de rolar quase todo se perde na borracha
        b.wx = -b.vy / R * 0.7; b.wy = b.vx / R * 0.7
        if (m.primeiro >= 0) m.tabelaDepois = true
        if (m.eventos) m.eventos.push({ t: "tabela", v: -vn, x: px, y: py })
      }
      b.x = px + nx * (R + 1e-6); b.y = py + ny * (R + 1e-6)
    }
  }
  return true
}

// roda até tudo parar (ou o limite). Pra simulação: devolve quantos passos
export function rodar(m: Mesa, max = 60 / H): number {
  let n = 0
  while (n < max && passo(m)) n++
  return n
}

// a bola cabe aqui? (bola na mão)
export function cabe(m: Mesa, x: number, y: number, ignorar = 0): boolean {
  if (Math.abs(x) > L / 2 - R || Math.abs(y) > W / 2 - R) return false
  for (const b of m.bolas) {
    if (!b.ativa || b.id === ignorar) continue
    if ((b.x - x) ** 2 + (b.y - y) ** 2 < (2 * R + 0.001) ** 2) return false
  }
  return true
}

// a linha-guia: da branca na direção (dx,dy), o que ela encontra primeiro
export interface Mira {
  tipo: "bola" | "tabela" | "nada"
  gx: number; gy: number // onde a branca chega (bola fantasma)
  alvo: number // id da bola tocada
  ox: number; oy: number // direção que a bola tocada sai
  bx: number; by: number // direção que a branca segue (tangente) ou reflete na tabela
  corte: number // cos do corte (1 = cheia)
}

export function mirar(m: Mesa, ang: number): Mira {
  const c = m.bolas[0]
  const dx = Math.cos(ang), dy = Math.sin(ang)
  let melhor = Infinity, alvo = -1
  for (const b of m.bolas) {
    if (!b.ativa || b.id === 0) continue
    const fx = b.x - c.x, fy = b.y - c.y
    const proj = fx * dx + fy * dy
    if (proj <= 0) continue
    const perp2 = fx * fx + fy * fy - proj * proj
    if (perp2 >= R2) continue
    const t = proj - Math.sqrt(R2 - perp2)
    if (t < melhor) { melhor = t; alvo = b.id }
  }
  // a parede (caixa recolhida de R)
  const bx = L / 2 - R, by = W / 2 - R
  const tx = dx > 0 ? (bx - c.x) / dx : dx < 0 ? (-bx - c.x) / dx : Infinity
  const ty = dy > 0 ? (by - c.y) / dy : dy < 0 ? (-by - c.y) / dy : Infinity
  const tp = Math.max(0, Math.min(tx, ty))
  if (alvo >= 0 && melhor < tp) {
    const gx = c.x + dx * melhor, gy = c.y + dy * melhor
    const o = m.bolas.find((b) => b.id === alvo)!
    let ox = o.x - gx, oy = o.y - gy
    const n = Math.hypot(ox, oy) || 1
    ox /= n; oy /= n
    const corte = dx * ox + dy * oy
    // a branca sai na tangente
    let ux = dx - corte * ox, uy = dy - corte * oy
    const un = Math.hypot(ux, uy)
    if (un > 1e-6) { ux /= un; uy /= un } else { ux = 0; uy = 0 }
    return { tipo: "bola", gx, gy, alvo, ox, oy, bx: ux, by: uy, corte }
  }
  const gx = c.x + dx * tp, gy = c.y + dy * tp
  const rx = tx < ty ? -dx : dx, ry = tx < ty ? dy : -dy
  return { tipo: tp < Infinity ? "tabela" : "nada", gx, gy, alvo: -1, ox: 0, oy: 0, bx: rx, by: ry, corte: 0 }
}
