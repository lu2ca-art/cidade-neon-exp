"use client"

// SWAV (o Tony Gordo, "a lanterna"): reflexos e salto de fé.
//
// - Criatividade Eminente: prismas de vidro aceso brotam dos dois lados da rua
//   e crescem com a faixa, pulsando na batida
// - Reflexos: a pista vira espelho. O espelho é de verdade pra o que é da rua:
//   o shader do asfalto reflete o raio da câmera e acha os prismas pela mesma
//   tabela que os põe no mundo (a cidade de cabeça pra baixo embaixo da Kombi);
//   o resto é céu refletido
// - Salto de Fé: vãos onde a pista some (o espelho vira abismo, com setas de
//   luz antes) e reaparece mais à frente. Os vãos abrem mais com a faixa
// - acelerar no vão (turbo, pé no fundo, ou já no ar) é o salto de fé: o campo
//   de visão abre e o reflexo vira céu aberto por um instante; os prismas acendem
//
// Custo: 2 desenhos (o espelho: 1 fita ao longo da ida, 2 vértices a cada 2 m;
// os prismas: 1 InstancedMesh de caixas), 2 ShaderMaterial, 1 textura de dados
// pequena (a tabela das células: ~L/16 × 2 texels), sem luz. Por quadro só
// uniforms, a busca da Kombi na via (±24 amostras) e o empurrão do fov.

import { useEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { PropsManifesto } from "./tipos"
import { PASSO } from "../pista"
import {
  MEIA_PISTA, NEVOA_FRAG, NEVOA_FRAG_PARS, NEVOA_VERT_PARS, amostraPerto, empurrarCamera, novoEmpurrao, reduzMovimento, semente, soltarCamera, yNaPista,
} from "./comum"

export const SWAV_CFG = {
  celula: 16, // m: uma célula de prisma de cada lado
  lateral: MEIA_PISTA + 5, // m do eixo: a face dos prismas que dá pra rua
  densidade: 0.62, // chance de ter prisma numa célula
  altura: [6, 42] as [number, number],
  vaoCada: [260, 380] as [number, number], // m entre os vãos
  vaoCelulas: [2, 3] as [number, number], // o comprimento do vão (em células)
  setas: 56, // m de setas antes do vão
  fovSalto: 22, // graus a mais no salto
  salto: 2.6, // s
}

const COMUM_GLSL = /* glsl */ `
uniform sampler2D uCel; uniform float uNCel; uniform float uCresce;
// a célula c: (altura esq, largura esq, altura dir, largura dir) e o vão (dentro, centro, comprimento)
vec4 celula(float c) { return texelFetch(uCel, ivec2(int(clamp(c, 0.0, uNCel - 1.0)), 0), 0); }
vec4 vao(float c) { return texelFetch(uCel, ivec2(int(clamp(c, 0.0, uNCel - 1.0)), 1), 0); }
vec3 prismaCor(float c, float y) {
  float h = fract(c * 0.137 + y * 0.012);
  return 0.55 + 0.45 * cos(6.2832 * (h + vec3(0.0, 0.33, 0.67)));
}`

// ── o espelho (e os vãos) ──
const VERT_ESP = /* glsl */ `
attribute float aS; attribute float aLat; attribute vec3 aT;
varying float vS; varying float vLat; varying vec3 vT; varying vec3 vW;
${NEVOA_VERT_PARS}
void main() {
  vS = aS; vLat = aLat; vT = aT;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vec4 mvPosition = viewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const FRAG_ESP = /* glsl */ `
uniform float uEspelho; uniform float uVaoK; uniform float uBat; uniform float uT; uniform float uSalto; uniform float uDentro;
varying float vS; varying float vLat; varying vec3 vT; varying vec3 vW;
${NEVOA_FRAG_PARS}
${COMUM_GLSL}
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 ceu(vec3 r, float aberto) {
  // o céu refletido: a noite com o horizonte aceso; no salto, o céu aberto do amanhecer
  float up = max(r.y, 0.0);
  vec3 noite = mix(vec3(0.55, 0.2, 0.75), vec3(0.02, 0.02, 0.08), pow(up, 0.45));
  vec2 st = floor(r.xz / max(r.y, 0.05) * 40.0);
  noite += vec3(0.9) * step(0.996, h21(st)) * up;
  vec3 dia = mix(vec3(1.0, 0.72, 0.5), vec3(0.35, 0.65, 1.0), pow(up, 0.6));
  float nuvem = smoothstep(0.55, 0.9, h21(floor(r.xz / max(r.y, 0.08) * 3.0 + uT * 0.05)));
  dia = mix(dia, vec3(1.0, 0.95, 0.92), nuvem * 0.6);
  return mix(noite, dia * 1.3, aberto);
}
void main() {
  vec3 V = normalize(vW - cameraPosition);
  vec3 R = reflect(V, vec3(0.0, 1.0, 0.0));
  vec3 T = normalize(vec3(vT.x, 0.0, vT.z));
  vec3 D = vec3(-T.z, 0.0, T.x);
  float rAl = dot(R, T), rLat = dot(R, D), rUp = R.y;
  float bat = exp(-fract(uBat) * 4.0);
  // o vão: o espelho vira abismo (e, no salto, céu)
  float c0 = floor(vS / ${SWAV_CFG.celula.toFixed(1)});
  vec4 vv = vao(c0);
  float meio = vv.z * 0.5 * uVaoK;
  float dV = vS - vv.y;
  float noVao = vv.z > 0.0 ? 1.0 - smoothstep(meio - 1.0, meio + 1.0, abs(dV)) : 0.0;
  // a reflexão dos prismas: o raio sobe até a face do lado pra onde ele vai
  vec3 cor = ceu(R, uSalto);
  float lado = rLat > 0.0 ? 1.0 : -1.0;
  if (abs(rLat) > 0.02) {
    float t = (lado * ${SWAV_CFG.lateral.toFixed(1)} - vLat) / rLat;
    float h = t * rUp;
    float sH = vS + t * rAl;
    float c = floor(sH / ${SWAV_CFG.celula.toFixed(1)});
    vec4 ce = celula(c);
    float alt = (lado > 0.0 ? ce.z : ce.x) * uCresce;
    float larg = lado > 0.0 ? ce.w : ce.y;
    float fx = abs(fract(sH / ${SWAV_CFG.celula.toFixed(1)}) - 0.5) * ${SWAV_CFG.celula.toFixed(1)};
    if (alt > 0.0 && h > 0.0 && h < alt && fx < larg * 0.5 && t < 260.0) {
      float borda = max(1.0 - smoothstep(0.0, 0.5, larg * 0.5 - fx), 1.0 - smoothstep(0.0, 0.8, alt - h));
      vec3 pc = prismaCor(c, h) * (0.35 + 1.2 * borda) * (0.8 + 0.5 * bat);
      cor = mix(cor, mix(pc, vec3(1.0, 0.95, 0.8) * 1.4, uSalto * 0.6), 0.85 * (1.0 - smoothstep(120.0, 260.0, t)));
    }
  }
  // o espelho ondula um pouco (vidro, não aço)
  float fres = 0.55 + 0.45 * pow(1.0 - abs(V.y), 3.0);
  float a = uEspelho * (0.45 + 0.35 * fres);
  // o abismo: escuro que desce, as bordas acesas; no salto, céu
  if (noVao > 0.0) {
    float fundo = 0.5 + 0.5 * sin(vS * 0.3 + uT * 2.0);
    vec3 abismo = vec3(0.01, 0.0, 0.04) + vec3(0.25, 0.1, 0.5) * fundo * 0.15;
    abismo += vec3(0.9) * step(0.993, h21(floor(vec2(vS * 1.5 + uT * 9.0, vLat * 2.0)))) * 0.7;
    vec3 aberto = ceu(vec3(R.x, abs(R.y), R.z), 1.0);
    cor = mix(cor, mix(abismo, aberto, uSalto), noVao);
    a = mix(a, 0.96, noVao);
  }
  // a borda do vão e as setas antes dele (dos dois lados)
  if (vv.z > 0.0) {
    float b = 1.0 - smoothstep(0.0, 0.6, abs(abs(dV) - meio));
    float dist = abs(dV) - meio;
    float seta = 0.0;
    if (dist > 2.0 && dist < ${SWAV_CFG.setas.toFixed(1)}) {
      float y = fract((dist - uBat * 2.0) / 8.0);
      seta = (1.0 - smoothstep(0.04, 0.09, abs(y - 0.4 - abs(vLat) * 0.025))) * (1.0 - smoothstep(4.0, 6.5, abs(vLat)));
      seta *= 1.0 - dist / ${SWAV_CFG.setas.toFixed(1)};
    }
    vec3 ac = vec3(0.6, 0.9, 1.0) * (1.2 + bat);
    cor = mix(cor, ac, max(b, seta)); a = max(a, max(b, seta * 0.9) * uEspelho);
  }
  a *= uDentro;
  if (a < 0.01) discard;
  gl_FragColor = vec4(cor, a);
  ${NEVOA_FRAG}
}`

// ── os prismas ──
const VERT_PRI = /* glsl */ `
attribute vec4 aD; // célula, altura, semente, —
uniform float uDentro; uniform float uBat;
varying vec2 vUv; varying vec3 vN; varying vec3 vVista; varying vec4 vD; varying float vY;
${NEVOA_VERT_PARS}
${COMUM_GLSL}
void main() {
  vUv = uv; vD = aD;
  vec3 p = position;
  // o prisma tem 30 m de pé abaixo da rua; o que fica acima cresce com a faixa
  float base = 30.0 / (30.0 + aD.y);
  float y = p.y < base + 1e-3 ? p.y : base + (p.y - base) * uCresce;
  p.y = y;
  vY = (y - base) * (30.0 + aD.y);
  p.xz *= uDentro;
  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
  vVista = mvPosition.xyz;
  vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const FRAG_PRI = /* glsl */ `
uniform float uBat; uniform float uSalto; uniform float uT;
varying vec2 vUv; varying vec3 vN; varying vec3 vVista; varying vec4 vD; varying float vY;
${NEVOA_FRAG_PARS}
${COMUM_GLSL}
void main() {
  vec3 V = normalize(-vVista);
  float fres = pow(1.0 - abs(dot(normalize(vN), V)), 2.0);
  float bx = min(vUv.x, 1.0 - vUv.x);
  float borda = 1.0 - smoothstep(0.0, 0.04, bx);
  float topo = vY > 0.0 ? 1.0 - smoothstep(0.0, 0.8, abs(vY - vD.y * uCresce)) : 0.0;
  float bat = exp(-fract(uBat) * 4.0);
  // a luz sobe pelo prisma na batida (a lanterna)
  float corre = exp(-abs(fract(vY / 24.0 - uBat * 0.25 - vD.z) - 0.5) * 18.0);
  vec3 c = prismaCor(vD.x, vY);
  vec3 cor = c * (0.08 + 0.6 * fres + 1.2 * borda + 1.5 * topo + 0.6 * corre) * (0.8 + 0.5 * bat);
  cor = mix(cor, vec3(1.0, 0.95, 0.85) * (1.0 + 2.0 * borda), uSalto * 0.55);
  float a = clamp(0.12 + 0.5 * fres + borda + topo + 0.4 * corre, 0.0, 1.0) * step(-28.0, vY);
  a *= smoothstep(-28.0, -6.0, vY);
  if (a < 0.02) discard;
  gl_FragColor = vec4(cor, a);
  ${NEVOA_FRAG}
}`

export function Swav({ M, k, ctx }: PropsManifesto) {
  const C = SWAV_CFG
  const { camera } = useThree()

  // a tabela das células (prismas e vãos) e as matrizes dos prismas: uma vez
  const mundo = useMemo(() => {
    const v = M.vias[M.pistas[k].ida]
    const r = semente(13_5135 + k)
    const L = (v.n - 1) * PASSO
    const nC = Math.max(1, Math.ceil(L / C.celula))
    const dados = new Float32Array(nC * 2 * 4)
    const mats: THREE.Matrix4[] = [], dPri: number[] = []
    const dir = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), fr = new THREE.Vector3(), pos = new THREE.Vector3(), m = new THREE.Matrix4()
    // os vãos: longe das pontas
    const vaos: { c0: number; nc: number }[] = []
    for (let s = 220 + r() * 100; s < L - 200; s += C.vaoCada[0] + r() * (C.vaoCada[1] - C.vaoCada[0])) {
      vaos.push({ c0: Math.floor(s / C.celula), nc: C.vaoCelulas[0] + Math.floor(r() * (C.vaoCelulas[1] - C.vaoCelulas[0] + 1)) })
    }
    for (const g of vaos) {
      const len = g.nc * C.celula, centro = (g.c0 + g.nc / 2) * C.celula
      const alcance = Math.ceil((C.setas + 8) / C.celula)
      for (let c = g.c0 - alcance; c < g.c0 + g.nc + alcance; c++) {
        if (c < 0 || c >= nC) continue
        const o = (nC + c) * 4
        dados[o] = c >= g.c0 && c < g.c0 + g.nc ? 1 : 0
        dados[o + 1] = centro
        dados[o + 2] = len
      }
    }
    for (let c = 2; c < nC - 2; c++) {
      for (const lado of [-1, 1]) {
        if (r() > C.densidade) continue
        const alt = C.altura[0] + Math.pow(r(), 1.4) * (C.altura[1] - C.altura[0])
        const larg = 3 + r() * 6
        dados[c * 4 + (lado < 0 ? 0 : 2)] = alt
        dados[c * 4 + (lado < 0 ? 1 : 3)] = larg
        const i = Math.min(v.n - 1, Math.round(((c + 0.5) * C.celula) / PASSO))
        const lat = (C.lateral + 1) * lado
        dir.set(-v.tz[i], 0, v.tx[i]) // à direita
        fr.set(-v.tx[i], 0, -v.tz[i])
        pos.set(v.px[i] + dir.x * lat, yNaPista(v, i, lat) - 30, v.pz[i] + dir.z * lat)
        m.makeBasis(dir, up, fr).scale(new THREE.Vector3(2, 30 + alt, larg)).setPosition(pos)
        mats.push(m.clone())
        dPri.push(c, alt, r(), 0)
      }
    }
    const tex = new THREE.DataTexture(dados, nC, 2, THREE.RGBAFormat, THREE.FloatType)
    tex.minFilter = tex.magFilter = THREE.NearestFilter
    tex.needsUpdate = true
    // a fita do espelho: 2 vértices por amostra, na altura do asfalto (deitado na curva)
    const P = new Float32Array(v.n * 2 * 3), S = new Float32Array(v.n * 2), LA = new Float32Array(v.n * 2), T = new Float32Array(v.n * 2 * 3)
    const idx: number[] = []
    for (let i = 0; i < v.n; i++) {
      for (let j = 0; j < 2; j++) {
        const lat = (j ? 1 : -1) * MEIA_PISTA
        const o = i * 2 + j
        P.set([v.px[i] - v.tz[i] * lat, yNaPista(v, i, lat) + 0.05, v.pz[i] + v.tx[i] * lat], o * 3)
        S[o] = i * PASSO
        LA[o] = lat
        T.set([v.tx[i], v.ty[i], v.tz[i]], o * 3)
      }
      if (i < v.n - 1) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(P, 3))
    g.setAttribute("aS", new THREE.BufferAttribute(S, 1))
    g.setAttribute("aLat", new THREE.BufferAttribute(LA, 1))
    g.setAttribute("aT", new THREE.BufferAttribute(T, 3))
    g.setIndex(idx)
    return { tex, nC, dados, mats, dPri, g }
  }, [M, k, C.celula, C.densidade, C.lateral, C.altura, C.vaoCada, C.vaoCelulas, C.setas])

  const obj = useMemo(() => {
    const comuns = { uCel: { value: mundo.tex }, uNCel: { value: mundo.nC }, uCresce: { value: 0.2 } }
    const matE = new THREE.ShaderMaterial({
      vertexShader: VERT_ESP, fragmentShader: FRAG_ESP, transparent: true, depthWrite: false, toneMapped: false, fog: true, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...comuns,
        uEspelho: { value: 0 }, uVaoK: { value: 0.5 }, uBat: { value: 0 }, uT: { value: 0 }, uSalto: { value: 0 }, uDentro: { value: 0 },
      },
    })
    matE.name = "manifesto-swav-espelho"
    const esp = new THREE.Mesh(mundo.g, matE)
    esp.frustumCulled = false
    esp.renderOrder = 2
    const n = mundo.mats.length
    const gp = new THREE.BoxGeometry(1, 1, 1)
    gp.translate(0, 0.5, 0)
    gp.setAttribute("aD", new THREE.InstancedBufferAttribute(new Float32Array(mundo.dPri), 4))
    const matP = new THREE.ShaderMaterial({
      vertexShader: VERT_PRI, fragmentShader: FRAG_PRI, transparent: true, depthWrite: false, toneMapped: false, fog: true, side: THREE.DoubleSide,
      uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...comuns, uBat: { value: 0 }, uSalto: { value: 0 }, uT: { value: 0 }, uDentro: { value: 0 } },
    })
    matP.name = "manifesto-swav-prismas"
    const pri = new THREE.InstancedMesh(gp, matP, n)
    for (let i = 0; i < n; i++) pri.setMatrixAt(i, mundo.mats[i])
    pri.instanceMatrix.needsUpdate = true
    pri.frustumCulled = false
    pri.renderOrder = 3
    return { esp, matE, pri, matP, gp, comuns }
  }, [mundo])
  useEffect(() => () => {
    obj.matE.dispose(); mundo.g.dispose(); obj.gp.dispose(); obj.matP.dispose(); obj.pri.dispose(); mundo.tex.dispose()
  }, [obj, mundo])

  const st = useRef({ i: -1, saltoT: -99, vaoUsado: -1, emp: novoEmpurrao(), reduz: reduzMovimento() }).current
  useEffect(() => () => soltarCamera(camera, st.emp), [camera, st])

  useFrame(() => {
    const t = ctx.relogio
    // a Kombi na tabela: a amostra da ida mais perto dela, a célula, o vão
    const v = M.vias[M.pistas[k].ida]
    const vi = M.vias[ctx.via]
    let noVao = false, centro = -1
    if (vi && vi.n > 0) {
      const ii = Math.max(0, Math.min(vi.n - 1, Math.round(ctx.u / PASSO)))
      st.i = amostraPerto(v, vi.px[ii], vi.pz[ii], st.i)
      const s = st.i * PASSO
      const c = Math.min(mundo.nC - 1, Math.floor(s / C.celula))
      const o = (mundo.nC + c) * 4
      const len = mundo.dados[o + 2]
      centro = mundo.dados[o + 1]
      const vaoK = obj.matE.uniforms.uVaoK.value as number
      noVao = len > 0 && Math.abs(s - centro) < len * 0.5 * vaoK + 2
    }
    // o salto de fé: acelerar no vão (uma vez por vão)
    const acelera = ctx.turbo || ctx.acel > 1.2 || ctx.ar || ctx.mult > 1.15
    if (noVao && acelera && centro !== st.vaoUsado && ctx.dentro > 0.5) { st.vaoUsado = centro; st.saltoT = t }
    const e = t - st.saltoT
    const salto = e < 0 ? 0 : THREE.MathUtils.smoothstep(e, 0, 0.3) * (1 - THREE.MathUtils.smoothstep(e, C.salto - 0.9, C.salto))
    // as três campanhas: os prismas crescem, o espelho chega, os vãos abrem
    const p = ctx.prog
    obj.comuns.uCresce.value = 0.25 + 0.75 * THREE.MathUtils.smoothstep(p, 0, 0.33)
    const E = obj.matE.uniforms
    E.uEspelho.value = 0.35 + 0.65 * THREE.MathUtils.smoothstep(p, 0.2, 0.5)
    E.uVaoK.value = 0.45 + 0.55 * THREE.MathUtils.smoothstep(p, 0.55, 0.75)
    E.uBat.value = ctx.batida
    E.uT.value = t
    E.uSalto.value = salto
    E.uDentro.value = ctx.dentro
    const P = obj.matP.uniforms
    P.uBat.value = ctx.batida
    P.uSalto.value = salto
    P.uT.value = t
    P.uDentro.value = ctx.dentro
    // o campo de visão abre no salto
    empurrarCamera(camera, st.emp, 0, st.reduz ? 0 : salto * C.fovSalto * ctx.dentro)
  })

  return (
    <>
      <primitive object={obj.esp} />
      <primitive object={obj.pri} />
    </>
  )
}
