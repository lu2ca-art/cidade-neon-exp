// (08/11, decisão do dono) O GRAFITE LIVRE EM VÁRIAS PAREDES (docs/t64.md): até 8
// paredes dos túneis, cada uma com o seu desenho. Este arquivo é só o desenho e o
// jeito de guardar (sem React nem three).
//
// O SAVE: `historia.paredesLivres` é uma lista de 8 textos, um por parede ("" = sem
// pintar). O desenho mora numa grade baixa de 90×45 e cada traço vira texto:
//   1 letra da cor + o 1º ponto (2 letras) + os outros pontos, cada um em 1 letra
//   (o passo até ±3 na grade) ou em 3 (um pulo maior: a letra de escape + 2 letras);
//   os traços vão separados por ".".
// Com os limites abaixo, o pior caso é ~1,3 KB por parede e ~10 KB nas 8 (a tag
// antiga sozinha já podia ocupar isso). `tagLivre` continua no save, sem conversão.

import type { TagLivre } from "./tipos"

export const MAX_PAREDES = 8
export const LARG_PAREDE = 90, ALT_PAREDE = 45 // a grade do desenho (2:1, como a parede)
export const MAX_PTS = 400 // por parede
export const MAX_TRACOS = 40
export const CORES_PAREDE = ["#ff3fb0", "#22e6ff", "#ffd23f", "#7dffb0", "#f2eefa"]
// a largura do spray na grade (a mesma no dedo e na parede)
export const LARGURA_SPRAY = 1.8

const ALFA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
const VAL: number[] = Array.from({ length: 128 }, () => -1)
for (let i = 0; i < ALFA.length; i++) VAL[ALFA.charCodeAt(i)] = i
const ESCAPE = 63
const PASSOS = 49 // 7×7: dx e dy de -3 a +3

const letra = (s: string, i: number) => { const c = s.charCodeAt(i); return c < 128 ? VAL[c] : -1 }
const dois = (x: number, y: number) => { const v = x + y * LARG_PAREDE; return ALFA[v >> 6] + ALFA[v & 63] }
const naGrade = (x: number, y: number) => x >= 0 && x < LARG_PAREDE && y >= 0 && y < ALT_PAREDE
function lerDois(s: string, i: number): [number, number] | null {
  const a = letra(s, i), b = letra(s, i + 1)
  if (a < 0 || b < 0) return null
  const v = (a << 6) | b, x = v % LARG_PAREDE, y = Math.floor(v / LARG_PAREDE)
  return naGrade(x, y) ? [x, y] : null
}

/** o desenho (pontos inteiros na grade) vira o texto do save */
export function codificar(t: TagLivre): string {
  const partes: string[] = []
  for (const tr of t.tracos) {
    const p = tr.pts
    if (p.length < 2) continue
    let s = ALFA[Math.max(0, CORES_PAREDE.indexOf(tr.cor))] + dois(p[0], p[1])
    for (let j = 2; j < p.length; j += 2) {
      const dx = p[j] - p[j - 2], dy = p[j + 1] - p[j - 1]
      s += Math.abs(dx) <= 3 && Math.abs(dy) <= 3 ? ALFA[dx + 3 + (dy + 3) * 7] : ALFA[ESCAPE] + dois(p[j], p[j + 1])
    }
    partes.push(s)
  }
  return partes.join(".")
}

/** o texto do save volta a ser desenho; vazio ou estragado = null (parede sem pintar) */
export function decodificar(s: string | null | undefined): TagLivre | null {
  if (!s) return null
  const tracos: TagLivre["tracos"] = []
  for (const parte of s.split(".")) {
    const c = letra(parte, 0), ini = c >= 0 && c < CORES_PAREDE.length ? lerDois(parte, 1) : null
    if (!ini) return null
    let [x, y] = ini
    const pts = [x, y]
    for (let j = 3; j < parte.length;) {
      const v = letra(parte, j)
      if (v === ESCAPE) {
        const q = lerDois(parte, j + 1)
        if (!q) return null
        ;[x, y] = q
        j += 3
      } else if (v >= 0 && v < PASSOS) {
        x += (v % 7) - 3; y += Math.floor(v / 7) - 3
        if (!naGrade(x, y)) return null
        j++
      } else return null
      pts.push(x, y)
    }
    tracos.push({ cor: CORES_PAREDE[c], pts })
  }
  return { tracos }
}

/** a lista do save com a parede i trocada (sempre 8 lugares) */
export function comParede(lista: readonly string[] | null | undefined, i: number, s: string): string[] {
  const out = Array.from({ length: MAX_PAREDES }, (_, k) => lista?.[k] ?? "")
  if (i >= 0 && i < MAX_PAREDES) out[i] = s
  return out
}

/** um traço no canvas. Sem shadowBlur (caro no iPhone): o brilho é um risco largo e fraco por baixo */
export function riscar(g: CanvasRenderingContext2D, p: readonly number[], cor: string, x0: number, y0: number, k: number, larg: number) {
  if (p.length < 2) return
  g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = cor
  g.beginPath(); g.moveTo(x0 + p[0] * k, y0 + p[1] * k)
  for (let j = 2; j < p.length; j += 2) g.lineTo(x0 + p[j] * k, y0 + p[j + 1] * k)
  if (p.length === 2) g.lineTo(x0 + p[0] * k + 0.1, y0 + p[1] * k)
  g.globalAlpha = 0.3; g.lineWidth = larg * 2.4; g.stroke()
  g.globalAlpha = 1; g.lineWidth = larg; g.stroke()
}
