"use client"

// A ROTA NA PISTA (T58, o GPS tipo Waze): uma faixa luminosa leve no chão, à
// frente da Kombi, pelo caminho que a rota manda (nav.ts). Perto de uma rampa
// ela já puxa pro lado da saída (a faixa certa). Fora da pista (no chão do
// subúrbio, nas dunas, voando), uma linha reta no chão até o destino.
//
// Desempenho: UMA geometria e UM material (1 draw), aditivo, sem luz e sem
// sombra. Os buffers têm o tamanho máximo desde o começo e só se reescrevem
// quando o NAV se refaz (4×/s, ~200 pontos); por quadro, só uniforms.
// Na vista do drone ela some (lá o drone pinta a rota inteira).

import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { Mundo } from "./mundo"
import { PASSO } from "./pista"
import { NAV, ladoDaFaixa } from "./nav"
import { DRONE } from "./Drone"

export const ROTA_PISTA_CFG = {
  alcance: 520, // m à frente desenhados
  passo: 3, // m entre amostras
  larg: 1.25, // meia largura (m)
  alt: 0.14, // m acima do asfalto
  vel: 22, // m/s: as setas correndo pra frente
  per: 9, // m entre as setas
  forca: 1, // brilho geral
}

const MAXP = Math.ceil(ROTA_PISTA_CFG.alcance / ROTA_PISTA_CFG.passo) + 8

const VERT = /* glsl */ `
attribute float aD; attribute float aL;
varying float vD; varying float vL;
#include <fog_pars_vertex>
void main() {
  vD = aD; vL = aL;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const FRAG = /* glsl */ `
uniform float uT; uniform float uIni; uniform float uK; uniform float uFim; uniform float uVel; uniform float uPer; uniform vec3 uCor;
varying float vD; varying float vL;
#include <fog_pars_fragment>
void main() {
  float d = vD - uIni;
  if (d < 0.0) discard;
  float l = abs(vL);
  float borda = smoothstep(0.62, 0.92, l) * (1.0 - smoothstep(0.92, 1.0, l));
  // as setas (um V apontando pra frente) correndo pro destino
  float f = fract((vD - l * 2.2 - uT * uVel) / uPer);
  float seta = smoothstep(0.0, 0.07, f) * (1.0 - smoothstep(0.07, 0.24, f)) * (1.0 - smoothstep(0.7, 1.0, l));
  float perto = smoothstep(3.0, 16.0, d);
  float longe = 1.0 - smoothstep(uFim - 140.0, uFim, vD);
  float a = (0.07 + 0.5 * borda + 0.62 * seta) * perto * longe * uK;
  vec3 c = mix(uCor, vec3(1.0), 0.45 * seta);
  gl_FragColor = vec4(c * a, 1.0);
  #ifdef USE_FOG
    #ifdef FOG_EXP2
      float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
    #else
      float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
    #endif
    gl_FragColor.rgb *= 1.0 - fogFactor;
  #endif
}`

interface PoseRota { via: number; u: number; v: number; voo?: boolean; livreOk?: boolean; wx?: number; wz?: number; y?: number }

export function RotaPista({ M, jogo, chaoEm }: { M: Mundo; jogo: React.RefObject<PoseRota>; chaoEm?: (x: number, z: number) => number }) {
  const C = ROTA_PISTA_CFG
  const faixa = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(MAXP * 2 * 3), d = new Float32Array(MAXP * 2), l = new Float32Array(MAXP * 2)
    for (let i = 0; i < MAXP; i++) { l[i * 2] = -1; l[i * 2 + 1] = 1 }
    const idx = new Uint16Array((MAXP - 1) * 6)
    for (let i = 0; i < MAXP - 1; i++) { const a = i * 2; idx.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], i * 6) }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute("aD", new THREE.BufferAttribute(d, 1).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute("aL", new THREE.BufferAttribute(l, 1))
    g.setIndex(new THREE.BufferAttribute(idx, 1))
    g.setDrawRange(0, 0)
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5)
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: true,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uT: { value: 0 }, uIni: { value: 0 }, uK: { value: 0 }, uFim: { value: C.alcance }, uVel: { value: C.vel }, uPer: { value: C.per }, uCor: { value: new THREE.Color("#2fe8ff") } }]),
    })
    mat.name = "rota-pista"
    return { g, mat, pos, d }
  }, [C.alcance, C.per, C.vel])
  useEffect(() => () => { faixa.g.dispose(); faixa.mat.dispose() }, [faixa])
  const malha = useRef<THREE.Mesh>(null)
  const st = useRef({ versao: -1, ini: 0, n: 0, k: 0 })
  useEffect(() => {
    if (typeof window !== "undefined" && /[?&]medir/.test(location.search)) (window as unknown as Record<string, unknown>).__rotaPista = { faixa, st: st.current }
  }, [faixa])

  useFrame((state, dt) => {
    const m = malha.current, j = jogo.current, s = st.current, U = faixa.mat.uniforms
    if (!m || !j) return
    const quer = NAV.ativo && !!NAV.destino && DRONE.e < 0.3
    s.k += ((quer ? 1 : 0) - s.k) * Math.min(1, dt * 4)
    const on = s.k > 0.01
    if (m.visible !== on) m.visible = on
    if (!on) return
    if (NAV.versao !== s.versao && quer) {
      s.versao = NAV.versao
      s.n = escrever(M, j, faixa, chaoEm)
      s.ini = 0
      faixa.g.setDrawRange(0, Math.max(0, s.n - 1) * 6)
      U.uFim.value = faixa.d[Math.max(0, s.n - 1) * 2] || C.alcance
      ;(U.uCor.value as THREE.Color).set(NAV.destino!.cor)
    }
    s.ini += Math.abs(j.v) * dt
    U.uIni.value = s.ini
    U.uT.value = state.clock.elapsedTime
    U.uK.value = s.k * C.forca
  })

  return <mesh ref={malha} geometry={faixa.g} material={faixa.mat} frustumCulled={false} renderOrder={4} visible={false} />
}

type F = { pos: Float32Array; d: Float32Array; g: THREE.BufferGeometry }
function ponto(F: F, n: number, x: number, y: number, z: number, nx: number, nz: number, ny: number, dist: number) {
  if (n >= MAXP) return n
  const W = ROTA_PISTA_CFG.larg, a = n * 6
  F.pos[a] = x - nx * W; F.pos[a + 1] = y - ny * W; F.pos[a + 2] = z - nz * W
  F.pos[a + 3] = x + nx * W; F.pos[a + 4] = y + ny * W; F.pos[a + 5] = z + nz * W
  F.d[n * 2] = F.d[n * 2 + 1] = dist
  return n + 1
}

// reescreve a faixa a partir de onde a Kombi está agora
function escrever(M: Mundo, j: PoseRota, F: F, chaoEm?: (x: number, z: number) => number) {
  const C = ROTA_PISTA_CFG
  let n = 0
  const r = NAV.rota
  if (r) {
    let dist = 0, ax = NaN, az = NaN
    fora: for (const t of r.trechos) {
      const v = M.vias[t.via]
      for (let u = t.u0; ; u += C.passo) {
        const uu = Math.min(u, t.u1)
        const i = v.fechada ? ((Math.round(uu / PASSO) % v.n) + v.n) % v.n : Math.max(0, Math.min(v.n - 1, Math.round(uu / PASSO)))
        // o lado da faixa (perto da rampa, puxa pra saída) e a inclinação da curva
        const lat = ladoDaFaixa(dist), cb = Math.cos(v.bank[i]), sb = Math.sin(v.bank[i])
        const x = v.px[i] - v.tz[i] * lat * cb, z = v.pz[i] + v.tx[i] * lat * cb, y = v.py[i] - lat * sb + C.alt
        if (!Number.isNaN(ax)) dist += Math.hypot(x - ax, z - az)
        ax = x; az = z
        // a normal pro lado direito, com a inclinação da pista
        n = ponto(F, n, x, y, z, -v.tz[i] * cb, v.tx[i] * cb, -sb, dist)
        if (dist > C.alcance || n >= MAXP) break fora
        if (uu >= t.u1) break
      }
    }
  } else if (NAV.destino && j.wx !== undefined && j.wz !== undefined) {
    // sem rota (no chão, voando): a reta no chão até o destino
    const x0 = j.wx, z0 = j.wz, dx = NAV.destino.x - x0, dz = NAV.destino.z - z0
    const L = Math.min(C.alcance, Math.hypot(dx, dz)), tx = dx / Math.max(1e-3, Math.hypot(dx, dz)), tz = dz / Math.max(1e-3, Math.hypot(dx, dz))
    const N = Math.max(2, Math.min(MAXP, Math.ceil(L / C.passo) + 1))
    for (let k = 0; k < N; k++) {
      const d = (L * k) / (N - 1), x = x0 + tx * d, z = z0 + tz * d
      const y = (chaoEm ? chaoEm(x, z) : (j.y ?? 0)) + C.alt + 0.1
      n = ponto(F, n, x, y, z, -tz, tx, 0, d)
    }
  }
  for (const k of ["position", "aD"]) (F.g.getAttribute(k) as THREE.BufferAttribute).needsUpdate = true
  return n
}
