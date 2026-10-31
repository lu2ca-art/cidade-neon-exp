// O GRAFITE DOS TÚNEIS (T12): o formato de um grafite.
//
// COMO TROCAR PELO DESENHO REAL: cada grafite é UM arquivo em `grafites/` que
// exporta um `Grafite` (ver coracao.ts). Pra pôr o desenho do artista:
//   1. duplique um arquivo, mude `id`, `nome` e tire `rascunho: true`;
//   2. `gesto`: os pontos que o jogador liga, na ordem (caixa 0..100 x 0..100);
//   3. `tracos`: cada traço da arte, na ordem em que o spray pinta: cor, largura
//      e a lista de pontos [x, y] na mesma caixa 0..100 (pode vir de um SVG
//      traçado: cada <path> vira um traço; use `suave()` pra alisar poucos pontos);
//   4. registre o arquivo em `grafites/index.ts`.
// O gesto é simples e a arte é sempre a mesma: o jogador "assina", o artista desenhou.

export type Pt = [number, number]

export interface Traco {
  cor: string
  /** largura em unidades da caixa 0..100 (3 = traço grosso, 1.5 = fino) */
  largura: number
  pts: Pt[]
  /** velocidade do spray neste traço (1 = normal; 0.5 = pingo devagar) */
  vel?: number
}

export interface Grafite {
  id: string
  nome: string
  /** true enquanto o desenho é provisório (o dono ainda vai mandar o real) */
  rascunho: boolean
  autor?: string
  /** os pontos que o jogador liga, em ordem */
  gesto: Pt[]
  tracos: Traco[]
}

/** Catmull-Rom: alisa uma lista curta de pontos de controle numa curva. */
export function suave(ctrl: Pt[], seg = 10, fechado = false): Pt[] {
  const n = ctrl.length
  const p = (i: number): Pt => (fechado ? ctrl[((i % n) + n) % n] : ctrl[Math.max(0, Math.min(n - 1, i))])
  const out: Pt[] = []
  const fim = fechado ? n : n - 1
  for (let i = 0; i < fim; i++) {
    const p0 = p(i - 1), p1 = p(i), p2 = p(i + 1), p3 = p(i + 2)
    for (let s = 0; s < seg; s++) {
      const t = s / seg, t2 = t * t, t3 = t2 * t
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ])
    }
  }
  out.push(fechado ? out[0] : ctrl[n - 1])
  return out
}
