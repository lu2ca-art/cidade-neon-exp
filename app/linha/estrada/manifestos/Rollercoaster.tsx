"use client"

// ROLLERCOASTER (a Nizzy, "o guarda-chuva"): os altos e baixos. A rua mais longa.
//
// - um trilho de montanha-russa de luz acompanha a pista, subindo e descendo.
//   A altura dos morros é a ENERGIA da faixa naquele segundo (o volume do
//   instrumental, medido de 2 em 2 s: ENERGIA_RC): na introdução o trilho anda
//   rente, cresce nos refrões, desmorona no respiro antes do drop (200–216 s) e
//   dispara no drop. O trilho respira com a música
// - carrinhos passam no trilho: lentos nos topos, rápidos nas descidas
// - nas descidas (do trilho ao lado ou da própria pista) o campo de visão abre
//   e o horizonte inclina de leve: o frio na barriga
// - segurar o propulsor num topo é o "braço pra cima": os carrinhos e as luzes
//   do trilho explodem em cor, numa onda que sai de onde você está
//
// Custo: 2 desenhos (o trilho: 1 malha só com os dois trilhos, os dormentes e
// os pilares, ~24 mil vértices, desenhada no vertex shader a partir de 1
// textura de dados com o eixo; os carrinhos: 20 caixas instanciadas), 2
// ShaderMaterial, sem luz. Por quadro: uniforms, 5 números (onde está cada
// trem), a busca da Kombi na via (±24 amostras) e o empurrão da câmera.

import { useEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { PropsManifesto } from "./tipos"
import { PASSO } from "../pista"
import {
  MEIA_PISTA, NEVOA_FRAG, NEVOA_FRAG_PARS, NEVOA_VERT_PARS, amostraPerto, empurrarCamera, novoEmpurrao, reduzMovimento, semente, soltarCamera, yNaPista,
} from "./comum"

export const RC_CFG = {
  lateral: MEIA_PISTA + 7, // m do eixo (à direita da ida)
  trens: 5,
  carros: 4,
  dormente: 2, // amostras entre os dormentes
  pilar: 8, // amostras entre os pilares
  fovDescida: 9, // graus a mais na descida
  roll: 0.022, // rad: o horizonte na descida (≈ 1,3°)
  topo: 0.7, // o morro (0–1) a partir do qual é topo
}

/** a energia do instrumental (rollercoaster-inst.mp3, 295 s), RMS de 2 em 2 s, 0–100 */
const ENERGIA_RC = [
  4, 9, 13, 16, 28, 34, 29, 34, 32, 35, 36, 41, 32, 35, 36, 32, 36, 33, 33, 34, 31, 37, 11, 45, 56,
  49, 53, 53, 52, 58, 50, 44, 35, 54, 52, 51, 57, 47, 55, 46, 58, 56, 48, 30, 47, 31, 38, 50, 51, 43,
  58, 51, 30, 52, 38, 33, 35, 44, 48, 48, 51, 54, 48, 54, 52, 53, 57, 49, 55, 43, 56, 51, 51, 55, 46,
  58, 44, 57, 39, 36, 65, 92, 93, 88, 94, 89, 91, 88, 95, 86, 94, 90, 95, 87, 94, 89, 94, 87, 90, 37,
  15, 16, 15, 20, 19, 23, 29, 26, 64, 100, 88, 90, 88, 91, 90, 85, 91, 85, 99, 85, 94, 86, 94, 85, 96,
  88, 79, 19, 79, 78, 76, 79, 76, 85, 76, 87, 77, 86, 76, 86, 77, 74, 5, 2, 1, 0, 0,
]
const energiaEm = (prog: number) => {
  const f = Math.max(0, Math.min(1, prog)) * (ENERGIA_RC.length - 1)
  const i = Math.floor(f), a = ENERGIA_RC[i], b = ENERGIA_RC[Math.min(ENERGIA_RC.length - 1, i + 1)]
  return (a + (b - a) * (f - i)) / 100
}

// o morro e a altura do trilho: a MESMA conta no shader e na CPU (os trens, o topo, a descida)
const TAU = Math.PI * 2
const morro = (s: number) => {
  const a = 0.5 + 0.5 * Math.sin((s * TAU) / 260 + 0.7)
  const b = 0.5 + 0.5 * Math.sin((s * TAU) / 137 + 2.1)
  const c = 0.5 + 0.5 * Math.sin((s * TAU) / 71 + 4.0)
  return Math.pow(0.55 * a + 0.3 * b + 0.15 * c, 1.5)
}
const ss = THREE.MathUtils.smoothstep
const altura = (s: number, E: number, L: number) => {
  const m = morro(s)
  const pontas = ss(s, 0, 80) * (1 - ss(s, L - 80, L))
  return (2 + m * (8 + 42 * E) - 8 * (1 - m) * E) * pontas + 2 * (1 - pontas)
}
const MORRO_GLSL = /* glsl */ `
uniform sampler2D uEixo; uniform int uN; uniform float uL; uniform float uE;
vec3 eixo(int i) { i = clamp(i, 0, uN - 1); return texelFetch(uEixo, ivec2(i % 1024, i / 1024), 0).xyz; }
float morro(float s) {
  float a = 0.5 + 0.5 * sin(s * 6.2831853 / 260.0 + 0.7);
  float b = 0.5 + 0.5 * sin(s * 6.2831853 / 137.0 + 2.1);
  float c = 0.5 + 0.5 * sin(s * 6.2831853 / 71.0 + 4.0);
  return pow(0.55 * a + 0.3 * b + 0.15 * c, 1.5);
}
float altura(float s) {
  float m = morro(s);
  float pontas = smoothstep(0.0, 80.0, s) * (1.0 - smoothstep(uL - 80.0, uL, s));
  return (2.0 + m * (8.0 + 42.0 * uE) - 8.0 * (1.0 - m) * uE) * pontas + 2.0 * (1.0 - pontas);
}
// o braço pra cima: a onda de cor que sai de onde a Kombi estava
uniform float uT; uniform float uBracoT; uniform float uBracoS;
float braco(float s) {
  float e = uT - uBracoT;
  if (e < 0.0 || e > 3.5) return 0.0;
  float frente = e * 120.0;
  return exp(-abs(abs(s - uBracoS) - frente) / 14.0) * (1.0 - e / 3.5) + 0.5 * exp(-e * 1.5);
}
vec3 arco(float h) { return 0.55 + 0.45 * cos(6.2832 * (h + vec3(0.0, 0.33, 0.67))); }`

// ── o trilho (trilhos, dormentes e pilares numa malha só) ──
const VERT_TRILHO = /* glsl */ `
attribute float aI; attribute vec3 aOff; attribute float aTipo; // 0 trilho, 1 pé do pilar, 2 topo do pilar, 3 dormente
varying float vS; varying float vH; varying float vTipo;
${NEVOA_VERT_PARS}
${MORRO_GLSL}
uniform float uDentro;
void main() {
  int i = int(aI + 0.5);
  float s = aI * ${PASSO.toFixed(1)};
  vec3 b = eixo(i);
  vec3 T = eixo(i + 1) - eixo(i - 1); T.y = 0.0; T = normalize(T);
  vec3 R = vec3(-T.z, 0.0, T.x);
  float H = altura(s) * uDentro;
  vec3 p = b + R * aOff.x + T * aOff.z;
  if (aTipo > 0.5 && aTipo < 1.5) p.y += -40.0;
  else if (aTipo > 1.5 && aTipo < 2.5) p.y += H - 0.3;
  else p.y += H + aOff.y;
  vS = s; vH = H; vTipo = aTipo;
  vec4 mvPosition = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const FRAG_TRILHO = /* glsl */ `
uniform float uBat;
varying float vS; varying float vH; varying float vTipo;
${NEVOA_FRAG_PARS}
${MORRO_GLSL}
void main() {
  float bat = exp(-fract(uBat) * 4.0);
  // quente lá em cima, frio lá embaixo
  vec3 c = mix(vec3(0.2, 0.75, 1.0), vec3(1.0, 0.3, 0.6), clamp(vH / 40.0, 0.0, 1.0));
  // as luzes correm o trilho no tempo da faixa (2 batidas por volta de 12 m)
  float corre = exp(-abs(fract(vS / 12.0 - uBat * 0.5) - 0.5) * 22.0);
  float br = braco(vS);
  vec3 cor; float a;
  if (vTipo > 2.5) { // o dormente: as lâmpadas
    cor = c * (0.4 + 2.2 * corre + 0.5 * bat); a = 0.55 + 0.45 * corre;
  } else if (vTipo > 0.5) { // o pilar: some pra baixo
    cor = vec3(0.5, 0.3, 0.9) * 0.35; a = 0.5 * smoothstep(1.0, 1.85, vTipo);
  } else {
    cor = c * (1.0 + 0.4 * bat + 0.8 * corre); a = 0.95;
  }
  cor = mix(cor, arco(vS / 60.0 - uT * 0.8) * 2.4, clamp(br, 0.0, 1.0));
  if (a < 0.02) discard;
  gl_FragColor = vec4(cor, a);
  ${NEVOA_FRAG}
}`

// ── os carrinhos ──
const VERT_CARRO = /* glsl */ `
attribute vec2 aCar; // o trem, o carro no trem
uniform float uTrem[${RC_CFG.trens}];
uniform float uDentro;
varying vec3 vN; varying vec3 vL; varying float vS; varying float vC;
${NEVOA_VERT_PARS}
${MORRO_GLSL}
void main() {
  float s = uTrem[int(aCar.x + 0.5)] - aCar.y * 3.0;
  float f = s / ${PASSO.toFixed(1)};
  int i0 = int(floor(f));
  vec3 b = mix(eixo(i0), eixo(i0 + 1), fract(f));
  vec3 Tb = eixo(i0 + 2) - eixo(i0 - 1); Tb.y = 0.0; Tb = normalize(Tb);
  float H = altura(s) * uDentro;
  float Hd = (altura(s + 1.5) - altura(s - 1.5)) / 3.0 * uDentro;
  vec3 F = normalize(Tb + vec3(0.0, Hd, 0.0));
  vec3 R = normalize(cross(F, vec3(0.0, 1.0, 0.0)));
  vec3 U = cross(R, F);
  float vis = smoothstep(20.0, 60.0, s) * (1.0 - smoothstep(uL - 60.0, uL - 20.0, s)) * uDentro;
  vec3 lp = position * vec3(1.7, 1.1, 2.6) * vis;
  vec3 w = b + vec3(0.0, H + 0.75, 0.0) + R * lp.x + U * lp.y + F * lp.z;
  vN = normalize(R * normal.x + U * normal.y + F * normal.z);
  vL = position;
  vS = s; vC = aCar.x * 4.0 + aCar.y;
  vec4 mvPosition = viewMatrix * vec4(w, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const FRAG_CARRO = /* glsl */ `
uniform float uBat;
varying vec3 vN; varying vec3 vL; varying float vS; varying float vC;
${NEVOA_FRAG_PARS}
${MORRO_GLSL}
void main() {
  float bat = exp(-fract(uBat) * 4.0);
  vec3 a = abs(vL) * 2.0; // 0 no meio, 1 na borda
  float aresta = smoothstep(0.82, 0.95, max(min(a.x, a.y), max(min(a.x, a.z), min(a.y, a.z))));
  float farol = step(0.45, vL.z) * (1.0 - smoothstep(0.1, 0.25, length(vL.xy - vec2(0.0, 0.1))));
  vec3 c = arco(vC * 0.13);
  vec3 cor = vec3(0.04, 0.03, 0.08) + c * (1.4 * aresta + 0.25 * bat) + vec3(1.0, 0.95, 0.8) * farol * 2.0;
  float br = braco(vS);
  cor = mix(cor, arco(vC * 0.21 + uT * 1.5) * (2.0 + 2.0 * bat), clamp(br * 1.4, 0.0, 1.0));
  gl_FragColor = vec4(cor, 1.0);
  ${NEVOA_FRAG}
}`

// (revisão 2b) o eixo e a malha do trilho, guardados por rua (só números: a
// textura e a geometria nascem de novo a cada montagem e saem no dispose)
type DadosRC = { dados: Float32Array; linhas: number; I: Float32Array; O: Float32Array; Tp: Float32Array; idx: Uint16Array | Uint32Array }
const CACHE_RC = new Map<string, DadosRC>()
function malhaRC(d: DadosRC) {
  const tex = new THREE.DataTexture(d.dados, 1024, d.linhas, THREE.RGBAFormat, THREE.FloatType)
  tex.minFilter = tex.magFilter = THREE.NearestFilter
  tex.needsUpdate = true
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(d.I.length * 3), 3)) // o shader faz a posição
  g.setAttribute("aI", new THREE.BufferAttribute(d.I, 1))
  g.setAttribute("aOff", new THREE.BufferAttribute(d.O, 3))
  g.setAttribute("aTipo", new THREE.BufferAttribute(d.Tp, 1))
  g.setIndex(new THREE.BufferAttribute(d.idx, 1))
  return { tex, g }
}

export function Rollercoaster({ M, k, ctx }: PropsManifesto) {
  const C = RC_CFG
  const { camera } = useThree()

  // o eixo do trilho (na beira, na altura do asfalto) numa textura; a malha do trilho
  const mundo = useMemo(() => {
    const v = M.vias[M.pistas[k].ida]
    const n = v.n
    const L = (n - 1) * PASSO
    const lat = C.lateral
    // (revisão 2b) os vértices (~33 mil) saem uma vez por sessão: o cache do módulo
    const chave = `${k}|${n}|${lat}|${C.dormente}|${C.pilar}`
    const guardado = CACHE_RC.get(chave)
    if (guardado) return { ...malhaRC(guardado), n, L }
    const linhas = Math.ceil(n / 1024)
    const dados = new Float32Array(1024 * linhas * 4)
    for (let i = 0; i < n; i++) dados.set([v.px[i] - v.tz[i] * lat, yNaPista(v, i, MEIA_PISTA), v.pz[i] + v.tx[i] * lat, 0], i * 4)

    const I: number[] = [], O: number[] = [], Tp: number[] = [], idx: number[] = []
    const vert = (i: number, x: number, y: number, z: number, tipo: number) => { I.push(i); O.push(x, y, z); Tp.push(tipo); return I.length - 1 }
    const quad = (a: number, b: number, c: number, d: number) => idx.push(a, b, c, a, c, d)
    // os dois trilhos: cada um uma cruz (uma fita em pé e uma deitada)
    const perfis: [number, number, number, number][] = [] // x0, y0, x1, y1
    for (const x of [-0.75, 0.75]) { perfis.push([x, -0.14, x, 0.14]); perfis.push([x - 0.14, 0, x + 0.14, 0]) }
    for (const [x0, y0, x1, y1] of perfis) {
      let ant = -1
      for (let i = 0; i < n; i++) {
        const a = vert(i, x0, y0, 0, 0)
        vert(i, x1, y1, 0, 0)
        if (ant >= 0) quad(ant, a, a + 1, ant + 1)
        ant = a
      }
    }
    // os dormentes (as lâmpadas) e os pilares
    for (let i = 1; i < n - 1; i += C.dormente) {
      const a = vert(i, -1.0, -0.2, -0.3, 3), b = vert(i, 1.0, -0.2, -0.3, 3), c = vert(i, 1.0, -0.2, 0.3, 3), d = vert(i, -1.0, -0.2, 0.3, 3)
      quad(a, b, c, d)
    }
    for (let i = 4; i < n - 4; i += C.pilar) {
      for (const [dx, dz] of [[0.3, 0], [0, 0.3]]) {
        const a = vert(i, -dx, 0, -dz, 1), b = vert(i, dx, 0, dz, 1), c = vert(i, dx, 0, dz, 2), d = vert(i, -dx, 0, -dz, 2)
        quad(a, b, c, d)
      }
    }
    const dadosRC: DadosRC = { dados, linhas, I: new Float32Array(I), O: new Float32Array(O), Tp: new Float32Array(Tp), idx: I.length > 65535 ? new Uint32Array(idx) : new Uint16Array(idx) }
    CACHE_RC.set(chave, dadosRC)
    return { ...malhaRC(dadosRC), n, L }
  }, [M, k, C.lateral, C.dormente, C.pilar])

  const obj = useMemo(() => {
    const comuns = {
      uEixo: { value: mundo.tex }, uN: { value: mundo.n }, uL: { value: mundo.L }, uE: { value: 0.2 },
      uT: { value: 0 }, uBracoT: { value: -99 }, uBracoS: { value: -1e5 }, uBat: { value: 0 }, uDentro: { value: 0 },
    }
    const matT = new THREE.ShaderMaterial({
      vertexShader: VERT_TRILHO, fragmentShader: FRAG_TRILHO, transparent: true, depthWrite: false, toneMapped: false, fog: true, side: THREE.DoubleSide,
      uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...comuns },
    })
    matT.name = "manifesto-rollercoaster-trilho"
    const trilho = new THREE.Mesh(mundo.g, matT)
    trilho.frustumCulled = false
    trilho.renderOrder = 3
    const nC = C.trens * C.carros
    const gc = new THREE.BoxGeometry(1, 1, 1)
    const aCar = new Float32Array(nC * 2)
    for (let t = 0; t < C.trens; t++) for (let c = 0; c < C.carros; c++) aCar.set([t, c], (t * C.carros + c) * 2)
    gc.setAttribute("aCar", new THREE.InstancedBufferAttribute(aCar, 2))
    const matC = new THREE.ShaderMaterial({
      vertexShader: VERT_CARRO, fragmentShader: FRAG_CARRO, toneMapped: false, fog: true,
      uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...comuns, uTrem: { value: new Array<number>(C.trens).fill(0) } },
    })
    matC.name = "manifesto-rollercoaster-carros"
    const carros = new THREE.InstancedMesh(gc, matC, nC)
    carros.frustumCulled = false // a posição é feita no shader
    return { trilho, matT, carros, matC, gc, comuns }
  }, [mundo, C.trens, C.carros])
  useEffect(() => () => { mundo.g.dispose(); mundo.tex.dispose(); obj.matT.dispose(); obj.gc.dispose(); obj.matC.dispose(); obj.carros.dispose() }, [mundo, obj])

  const st = useRef({
    i: -1, E: 0.2, trens: [] as number[], braco: -99, frio: 0, emp: novoEmpurrao(), reduz: reduzMovimento(),
  }).current
  if (st.trens.length !== C.trens) {
    const r = semente(10_4104 + k)
    st.trens = Array.from({ length: C.trens }, (_, t) => 60 + ((mundo.L - 120) * (t + r() * 0.3)) / C.trens)
  }
  useEffect(() => () => soltarCamera(camera, st.emp), [camera, st])

  useFrame((_, dtCru) => {
    const dt = Math.min(0.1, dtCru)
    const t = ctx.relogio
    const L = mundo.L
    // a energia da faixa agora (suavizada): a altura dos morros
    st.E += (energiaEm(ctx.prog) - st.E) * Math.min(1, dt * 1.6)
    const E = st.E
    // os trens: devagar nos topos, rápido nas descidas
    const topoAlt = 2 + 8 + 42 * E
    const U = obj.matC.uniforms.uTrem.value as number[]
    for (let j = 0; j < st.trens.length; j++) {
      const h = altura(st.trens[j], E, L)
      st.trens[j] += dt * (9 + 3 * Math.sqrt(Math.max(0, topoAlt - h)))
      if (st.trens[j] > L - 20) st.trens[j] = 20
      U[j] = st.trens[j]
    }
    // a Kombi no trilho: a amostra da ida mais perto, o sentido, o morro
    const v = M.vias[M.pistas[k].ida]
    const vi = M.vias[ctx.via]
    let frio = 0
    if (vi && vi.n > 0) {
      const ii = Math.max(0, Math.min(vi.n - 1, Math.round(ctx.u / PASSO)))
      st.i = amostraPerto(v, vi.px[ii], vi.pz[ii], st.i)
      const s = st.i * PASSO
      const sen = ctx.via === M.pistas[k].volta ? -1 : 1
      // a descida: o trilho ao lado (à frente) ou a própria pista
      const dTrilho = (altura(s + 10 * sen, E, L) - altura(s - 4 * sen, E, L)) / 14
      const dPista = vi.ty[ii] ?? 0
      frio = Math.max(ss(-dTrilho, 0.25, 0.9), ss(-dPista, 0.03, 0.12))
      // o braço pra cima: o propulsor num topo
      if (ctx.turbo && morro(s) > C.topo && E > 0.2 && t - st.braco > 1.2 && ctx.dentro > 0.5) {
        st.braco = t
        obj.comuns.uBracoT.value = t
        obj.comuns.uBracoS.value = s
      }
    }
    st.frio += (frio - st.frio) * Math.min(1, dt * (frio > st.frio ? 2.5 : 1.2))
    const K = obj.comuns
    K.uE.value = E
    K.uT.value = t
    K.uBat.value = ctx.batida
    K.uDentro.value = ctx.dentro
    // o frio na barriga: o campo de visão abre e o horizonte inclina pro lado do trilho
    const f = st.reduz ? 0 : st.frio * ctx.dentro
    empurrarCamera(camera, st.emp, -f * C.roll * (0.75 + 0.25 * Math.sin(ctx.batida * Math.PI * 0.25)), f * C.fovDescida)
  })

  return (
    <>
      <primitive object={obj.trilho} />
      <primitive object={obj.carros} />
    </>
  )
}
