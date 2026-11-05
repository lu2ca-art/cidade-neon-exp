// Peças comuns das ruas-manifesto: o tempo da faixa, onde fica cada coisa ao
// lado da rua e o pedaço de névoa dos shaders. Tudo barato (sem alocação por quadro).

import * as THREE from "three"
import { pistaSom } from "../../som"
import { PASSO } from "../pista"
import type { Via } from "../mundo"

/** meia largura da pista (mundoDisco.ts MEIA_PISTA): a parede fica aqui */
export const MEIA_PISTA = 8.4

/** o segundo da faixa `id` no toca-discos (null = ela não está soando).
 *  (revisão 2) lido todo quadro pelo host: devolve sempre o mesmo objeto (leia na hora) */
const TEMPO_FAIXA = { t: 0, dur: 1 }
export function tempoDaFaixa(id: string): Readonly<{ t: number; dur: number }> | null {
  const f = pistaSom.faixa, el = pistaSom.el
  if (!f || f.id !== id || !el) return null
  TEMPO_FAIXA.dur = el.duration && isFinite(el.duration) && el.duration > 1 ? el.duration : f.dur
  TEMPO_FAIXA.t = el.currentTime || 0
  return TEMPO_FAIXA
}

/** a amostra da via mais perto do u */
export const amostra = (v: Via, u: number) =>
  v.fechada ? ((Math.round(u / PASSO) % v.n) + v.n) % v.n : Math.max(0, Math.min(v.n - 1, Math.round(u / PASSO)))

/** um ponto ao lado da via (lat > 0 = à direita de quem anda na via), `alt` acima do asfalto */
export function aoLado(v: Via, i: number, lat: number, alt: number, out: THREE.Vector3) {
  return out.set(v.px[i] - v.tz[i] * lat, v.py[i] + alt, v.pz[i] + v.tx[i] * lat)
}

/** o rumo (ângulo em Y) de um plano de frente pra rua, do lado `lado` */
export const viradoPraRua = (v: Via, i: number, lado: number) => Math.atan2(v.tz[i] * lado, -v.tx[i] * lado)

/** a névoa nos ShaderMaterial (o mesmo jeito da RotaPista) */
export const NEVOA_VERT_PARS = "#include <fog_pars_vertex>"
export const NEVOA_FRAG_PARS = "#include <fog_pars_fragment>"
export const NEVOA_FRAG = /* glsl */ `
  #ifdef USE_FOG
    #ifdef FOG_EXP2
      float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
    #else
      float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
    #endif
    gl_FragColor.rgb *= 1.0 - fogFactor;
    gl_FragColor.a *= 1.0 - fogFactor;
  #endif`

/** um gerador fixo (a mesma rua sempre igual) */
export function semente(s: number) {
  let x = (Math.abs(Math.floor(s)) % 2147483646) + 1
  return () => ((x = (x * 16807) % 2147483647) - 1) / 2147483646
}

/** a amostra da via mais perto de (x, z): procura perto da última (barato); se
 *  caiu na borda da janela ou não havia última, procura na via inteira */
export function amostraPerto(v: Via, x: number, z: number, ant: number): number {
  const busca = (a: number, b: number) => {
    let m = a, dm = Infinity
    for (let i = Math.max(0, a); i <= Math.min(v.n - 1, b); i++) {
      const d = (v.px[i] - x) ** 2 + (v.pz[i] - z) ** 2
      if (d < dm) { dm = d; m = i }
    }
    return m
  }
  if (ant >= 0) {
    const i = busca(ant - 24, ant + 24)
    if (i > ant - 24 && i < ant + 24) return i
  }
  return busca(0, v.n - 1)
}

/** a altura do asfalto a `lat` metros do eixo (a pista deita na curva) */
export const yNaPista = (v: Via, i: number, lat: number) => v.py[i] - lat * Math.sin(v.bank[i])

export const reduzMovimento = () => {
  try { return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches } catch { return false }
}

// UM EMPURRÃO NA CÂMERA (depois do jogo): rolar o horizonte e abrir o campo de
// visão. O jogo põe a câmera no lugar e refaz a projeção todo quadro; a rua só
// mexe depois disso. Se no quadro seguinte ninguém mexeu, a rua desfaz o
// próprio empurrão antes do novo (nada acumula). O fov não é tocado: a rua
// escala a matriz de projeção (o jogo segue com o fov dele).
/** (revisão 2) a câmera do jogo deixa a rua empurrar? O Corrida escreve todo quadro:
 *  só na câmera de perseguição (não no drone, na primeira pessoa, nas cenas, nas
 *  portas, na montanha-russa do parque). Fora dela, o empurrão vai a zero */
export const CAMERA_RUA = { livre: true }

export interface Empurrao { q: THREE.Quaternion; roll: number; k: number; p5: number }
export const novoEmpurrao = (): Empurrao => ({ q: new THREE.Quaternion(), roll: 0, k: 1, p5: NaN })

/** roll em rad, fovExtra em graus (0 = nada) */
export function empurrarCamera(cam: THREE.Camera, e: Empurrao, roll: number, fovExtra: number) {
  if (!CAMERA_RUA.livre) { roll = 0; fovExtra = 0 }
  if (cam.quaternion.equals(e.q)) cam.rotateZ(-e.roll)
  e.roll = roll
  if (roll !== 0) cam.rotateZ(roll)
  e.q.copy(cam.quaternion)
  const pc = cam as THREE.PerspectiveCamera
  if (!pc.isPerspectiveCamera) return
  const m = pc.projectionMatrix.elements
  if (m[5] === e.p5 && e.k !== 1) { m[0] /= e.k; m[5] /= e.k }
  const meio = (pc.fov * Math.PI) / 360
  e.k = fovExtra > 0.01 ? Math.tan(meio) / Math.tan(Math.min(1.4, meio + (fovExtra * Math.PI) / 360)) : 1
  if (e.k !== 1) { m[0] *= e.k; m[5] *= e.k }
  e.p5 = m[5]
  pc.projectionMatrixInverse.copy(pc.projectionMatrix).invert()
}

/** devolve a câmera (ao desmontar) */
export function soltarCamera(cam: THREE.Camera, e: Empurrao) {
  empurrarCamera(cam, e, 0, 0)
}
