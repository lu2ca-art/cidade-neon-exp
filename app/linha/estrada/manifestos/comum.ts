// Peças comuns das ruas-manifesto: o tempo da faixa, onde fica cada coisa ao
// lado da rua e o pedaço de névoa dos shaders. Tudo barato (sem alocação por quadro).

import * as THREE from "three"
import { pistaSom } from "../../som"
import { PASSO } from "../pista"
import type { Via } from "../mundo"

/** meia largura da pista (mundoDisco.ts MEIA_PISTA): a parede fica aqui */
export const MEIA_PISTA = 8.4

/** o segundo da faixa `id` no toca-discos (null = ela não está soando) */
export function tempoDaFaixa(id: string): { t: number; dur: number } | null {
  const f = pistaSom.faixa, el = pistaSom.el
  if (!f || f.id !== id || !el) return null
  const dur = el.duration && isFinite(el.duration) && el.duration > 1 ? el.duration : f.dur
  return { t: el.currentTime || 0, dur }
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
