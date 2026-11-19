// A ROTA (o GPS do mapa, LU2CA 14/10: "no jeito do GTA / Watch Dogs, ver a
// distância e o percurso e marcar o percurso pra chegar"). O mundo é um
// grafo pequeno: cada circuito é um anel que só anda pra frente, e as
// saídas ligam um circuito a outro (ou viram estrada, o deserto). A rota
// é o caminho mais curto de onde a Kombi está até um ponto (via, u).

import type { Mundo } from "./mundo"
import { calcularRotaRede, type MundoRede } from "./mundoRede"
import { calcularRotaDisco, type MundoDisco } from "./mundoDisco"
import { PASSO } from "./pista"

export interface Ponto { via: number; u: number }
export interface Trecho { via: number; u0: number; u1: number } // u0 → u1, andando pra frente
export interface Rota { trechos: Trecho[]; metros: number }

// distância andando pra frente num circuito (dá a volta)
function frente(L: number, de: number, ate: number) {
  return (((ate - de) % L) + L) % L
}

export function calcularRota(M: Mundo, de: Ponto, ate: Ponto): Rota | null {
  // o mapa novo: a rede de ruas
  // o disco: as pistas de mão única
  if ("disco" in M) return calcularRotaDisco(M as MundoDisco, de, ate)
  if ("ligacoes" in M) return calcularRotaRede(M as MundoRede, de, ate)
  let melhor: Rota | null = null
  const busca = (p: Ponto, feito: Trecho[], metros: number, visitados: Set<number>) => {
    if (melhor && metros >= melhor.metros) return
    const V = M.vias[p.via]
    if (!V) return
    // numa saída (ou no deserto): só dá pra seguir até o fim dela
    if (V.tipo === "saida") {
      if (ate.via === p.via && ate.u >= p.u) {
        melhor = { trechos: [...feito, { via: p.via, u0: p.u, u1: ate.u }], metros: metros + ate.u - p.u }
        return
      }
      if (!V.chega) return
      const c = M.circuito[V.t]
      if (visitados.has(c)) return
      busca({ via: c, u: V.chega.u }, [...feito, { via: p.via, u0: p.u, u1: V.L }], metros + V.L - p.u, new Set([...visitados, c]))
      return
    }
    // num circuito: ou o destino está aqui, ou pega uma das saídas
    if (ate.via === p.via) {
      const d = frente(V.L, p.u, ate.u)
      const r = { trechos: [...feito, { via: p.via, u0: p.u, u1: p.u + d }], metros: metros + d }
      if (!melhor || r.metros < melhor.metros) melhor = r
    }
    for (const f of V.faixas) {
      const S = M.vias[f.via]
      if (!S) continue
      const d = frente(V.L, p.u, f.u)
      const ate1 = { via: p.via, u0: p.u, u1: p.u + d }
      if (ate.via === f.via) {
        const r = { trechos: [...feito, ate1, { via: f.via, u0: 0, u1: ate.u }], metros: metros + d + ate.u }
        if (!melhor || r.metros < melhor.metros) melhor = r
        continue
      }
      if (!S.chega) continue
      const c = M.circuito[S.t]
      if (visitados.has(c) && c !== ate.via) continue
      if (visitados.size > 4) continue
      busca({ via: c, u: S.chega.u }, [...feito, ate1, { via: f.via, u0: 0, u1: S.L }], metros + d + S.L, new Set([...visitados, c]))
    }
  }
  const inicio = M.vias[de.via]
  busca(de, [], 0, new Set(inicio?.tipo === "circuito" ? [de.via] : []))
  return melhor
}

// o ponto da pista mais perto de um lugar do mundo (x, z): pra marcar o
// destino tocando no mapa grande
export function pontoMaisPerto(M: Mundo, x: number, z: number): (Ponto & { d: number }) | null {
  let m: (Ponto & { d: number }) | null = null
  M.vias.forEach((v, vi) => {
    for (let i = 0; i < v.n; i += 3) {
      const d = Math.hypot(v.px[i] - x, v.pz[i] - z)
      if (!m || d < m.d) m = { via: vi, u: i * PASSO, d }
    }
  })
  return m
}
