// O traçado da montanha-russa: um circuito fechado com subida de corrente,
// a grande descida, uma curva inclinada, o looping e o morrinho de "frio na
// barriga" antes de voltar pra estação. A física é só energia: v² = 2g·(E − h),
// com um pouco de atrito ao longo do caminho.

import * as THREE from "three"

const P: [number, number, number][] = [
  [0, 2, 0], [0, 2, -14],                          // estação
  [0, 6, -26], [0, 18, -42], [0, 30, -58],         // a corrente
  [0, 32, -64], [0, 30, -70],                      // o topo
  [0, 12, -84], [0, 3, -98],                       // a grande descida
  [8, 2, -114], [26, 6, -124], [44, 10, -116],     // a curva
  [54, 4, -98], [56, 2, -84],                      // entra no looping
  [57, 10, -74], [58, 20, -78], [59, 22, -86], [60, 18, -94], [61, 8, -92],
  [63, 2, -82], [64, 2, -66],                      // sai do looping
  [62, 11, -48], [58, 3, -34],                     // o morrinho
  [46, 8, -16], [30, 4, -2], [18, 2, 10], [6, 2, 12],   // a volta
]

export const G = 9.8
export const CORRENTE = { ini: 0.035, fim: 0.205 }  // fração do circuito
export const VEL_CORRENTE = 4.5
export const ESTACAO = 0.985                         // freio a partir daqui

export interface Trilho {
  curva: THREE.CatmullRomCurve3
  comp: number
  n: number
  pontos: THREE.Vector3[]
  frente: THREE.Vector3[]
  cima: THREE.Vector3[]
  lado: THREE.Vector3[]
  alturaTopo: number
}

// quadros por transporte paralelo (o "cima" acompanha o carrinho no looping)
export function montarTrilho(n = 1400): Trilho {
  const curva = new THREE.CatmullRomCurve3(P.map((p) => new THREE.Vector3(...p)), true, "centripetal", 0.5)
  const comp = curva.getLength()
  const pontos: THREE.Vector3[] = [], frente: THREE.Vector3[] = [], cima: THREE.Vector3[] = [], lado: THREE.Vector3[] = []
  let up = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i < n; i++) {
    const u = i / n
    const p = curva.getPointAt(u), t = curva.getTangentAt(u).normalize()
    // tira de "up" o que é frente e renormaliza
    up = up.clone().sub(t.clone().multiplyScalar(up.dot(t))).normalize()
    const l = new THREE.Vector3().crossVectors(t, up).normalize()
    pontos.push(p); frente.push(t); cima.push(up.clone()); lado.push(l)
  }
  // no circuito fechado o fim tem que casar com o começo: distribui a torção
  const giro = Math.atan2(cima[n - 1].clone().cross(cima[0]).dot(frente[0]), cima[n - 1].dot(cima[0]))
  for (let i = 0; i < n; i++) {
    const a = (giro * i) / n
    cima[i].applyAxisAngle(frente[i], a)
    lado[i].crossVectors(frente[i], cima[i]).normalize()
  }
  const alturaTopo = Math.max(...pontos.map((p) => p.y))
  return { curva, comp, n, pontos, frente, cima, lado, alturaTopo }
}

// índice do quadro mais perto da fração u
export function quadro(tr: Trilho, u: number) {
  const f = (((u % 1) + 1) % 1) * tr.n
  const i = Math.floor(f) % tr.n, j = (i + 1) % tr.n, k = f - Math.floor(f)
  return {
    p: tr.pontos[i].clone().lerp(tr.pontos[j], k),
    t: tr.frente[i].clone().lerp(tr.frente[j], k).normalize(),
    up: tr.cima[i].clone().lerp(tr.cima[j], k).normalize(),
    l: tr.lado[i].clone().lerp(tr.lado[j], k).normalize(),
  }
}
