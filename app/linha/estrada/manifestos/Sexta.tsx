"use client"

// SEXTA-FEIRA (o Drew, "o espelho"): a balada. Multidão vazia, aceita e dança.
//
// - silhuetas de gente dançando no BPM nas calçadas e nos terraços, de longe
//   cheias de cor... e, quando você chega perto, ocas: só o contorno, nada dentro
// - holofotes de balada varrendo o céu, saindo dos terraços
// - as três campanhas: Multidão Vazia (o começo: ocas de perto), Bateria
//   Esgotada (a dança cansa, a luz pisca de bateria fraca), Aceita e Dança
//   (o fim: dançam com tudo, as luzes no máximo e o oco encolhe)
// - dar o drift: a multidão perto pula junto, numa onda que sai da Kombi, e por
//   um instante elas ficam cheias (cor sólida); os holofotes perto viram pra ela
//
// Custo: 2 desenhos (a multidão ~2 mil quads de frente pra câmera; os holofotes
// ~50 cones abertos, aditivos), 2 ShaderMaterial, sem textura, sem luz. Por
// quadro só uniforms (a Kombi só no drift).

import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { PropsManifesto } from "./tipos"
import { MEIA_PISTA, NEVOA_FRAG, NEVOA_FRAG_PARS, NEVOA_VERT_PARS, aoLado, densidadeRua, semente } from "./comum"

export const SEXTA_CFG = {
  passo: 18, // m entre as rodas de gente
  roda: [4, 10] as [number, number], // gente por roda
  terraco: 0.4, // chance de a roda estar num terraço
  passoHolofote: 90, // m entre os holofotes
  ocoPerto: 28, // m: de perto, oca
  ocoLonge: 70, // m: de longe, cheia
  raioPulo: 55, // m: quem pula junto no drift
  cheia: 2.6, // s cheia depois do drift
}

const ENERGIA_GLSL = /* glsl */ `
uniform float uEnergia; uniform float uBateria; uniform float uBat; uniform float uT; uniform vec3 uPulaP; uniform float uPulaT;
// o pulo do drift: onda que sai da Kombi
float pulo(vec3 p) {
  float d = distance(p.xz, uPulaP.xz);
  float e = uT - uPulaT - d / 35.0;
  return e > 0.0 ? (1.0 - smoothstep(${(SEXTA_CFG.cheia - 0.8).toFixed(1)}, ${SEXTA_CFG.cheia.toFixed(1)}, e)) * (1.0 - smoothstep(${(SEXTA_CFG.raioPulo * 0.7).toFixed(1)}, ${SEXTA_CFG.raioPulo.toFixed(1)}, d)) : 0.0;
}`

// ── a multidão ──
const VERT_GENTE = /* glsl */ `
attribute vec4 aP; // os pés (xyz) e a altura (m)
attribute vec4 aD; // semente, jeito de dançar (0, 1, 2), matiz, fase
varying vec2 vUv; varying vec4 vD; varying float vOco; varying float vCheia; varying float vDanca; varying float vPulo;
${NEVOA_VERT_PARS}
${ENERGIA_GLSL}
uniform float uDentro; uniform float uOcoPerto; uniform float uOcoLonge;
void main() {
  vUv = uv; vD = aD;
  float bat = uBat + aD.w * 0.25;
  float pl = pulo(aP.xyz);
  vPulo = pl;
  // a dança: o quique na batida (cansa no meio da faixa)
  float quique = abs(sin(3.14159 * bat)) * 0.12 * uEnergia;
  float salto = pl * abs(sin(3.14159 * uBat)) * 0.9; // pulando juntos, na mesma batida
  vec3 pe = aP.xyz + vec3(0.0, (quique + salto) * aP.w, 0.0);
  vDanca = bat;
  // de perto, oca
  float d = distance(aP.xyz, cameraPosition);
  vOco = 1.0 - smoothstep(uOcoPerto, uOcoLonge, d);
  vCheia = pl;
  vec4 mvPosition = viewMatrix * vec4(pe + vec3(0.0, aP.w * 0.5, 0.0), 1.0);
  mvPosition.xy += position.xy * vec2(0.62, 1.0) * aP.w * uDentro;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const FRAG_GENTE = /* glsl */ `
uniform float uBat; uniform float uEnergia; uniform float uBateria; uniform float uT;
varying vec2 vUv; varying vec4 vD; varying float vOco; varying float vCheia; varying float vDanca; varying float vPulo;
${NEVOA_FRAG_PARS}
float cap(vec2 p, vec2 a, vec2 b, float r) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }
void main() {
  // o corpo em 0–1 (x centrado), 1 = a altura da pessoa
  vec2 p = vec2((vUv.x - 0.5) * 0.62, vUv.y);
  float b = vDanca;
  float jeito = vD.y;
  float e = uEnergia;
  float bw = sin(3.14159 * b);
  float sway = sin(3.14159 * b * 0.5) * 0.05 * e * (jeito > 0.5 && jeito < 1.5 ? 1.0 : 0.4);
  vec2 q = p - vec2(sway * (p.y), 0.0);
  float d = length(q - vec2(0.0, 0.88)) - 0.075;                     // a cabeça
  d = min(d, cap(q, vec2(0.0, 0.5), vec2(0.0, 0.76), 0.085));       // o tronco
  // os braços: pra cima na batida (jeito 0), balançando (1), soco no ar (2); no pulo, todos pra cima
  float up = jeito < 0.5 ? abs(bw) : jeito < 1.5 ? 0.3 + 0.3 * bw : step(0.0, bw) * abs(bw);
  up = mix(up * e, 1.0, vPulo);
  vec2 om = vec2(0.09, 0.74);
  vec2 maoE = om + vec2(0.13 - 0.06 * up, mix(-0.24, 0.3, up));
  d = min(d, cap(q, vec2(-om.x, om.y), vec2(-maoE.x, maoE.y), 0.03));
  vec2 maoD = om + vec2(0.13 - 0.05 * up * (jeito > 1.5 ? 0.0 : 1.0), mix(-0.24, 0.3, jeito > 1.5 ? 1.0 - up : up));
  d = min(d, cap(q, om, maoD, 0.03));
  // as pernas: abrem um pouco no quique
  float ab = 0.05 + 0.03 * abs(bw) * e;
  d = min(d, cap(q, vec2(-0.04, 0.48), vec2(-ab, 0.02), 0.045));
  d = min(d, cap(q, vec2(0.04, 0.48), vec2(ab, 0.02), 0.045));
  float px = fwidth(d);
  float corpo = 1.0 - smoothstep(-px, px, d);
  float contorno = 1.0 - smoothstep(0.0, px * 1.6 + 0.004, abs(d + 0.006));
  // as cores da balada: o contorno aceso; o miolo cheio de longe, vazio de perto
  vec3 c = vD.z < 0.33 ? vec3(1.0, 0.25, 0.75) : vD.z < 0.66 ? vec3(0.3, 0.85, 1.0) : vec3(0.75, 0.4, 1.0);
  float bat = exp(-fract(uBat) * 4.0);
  // a bateria fraca: a luz cai e pisca
  float pisca = 1.0 - uBateria * (0.5 + 0.5 * step(0.7, fract(sin(floor(uT * 7.0) + vD.x * 13.0) * 4375.5)));
  float cheio = (1.0 - vOco) * 0.85;
  cheio = max(cheio, vCheia);
  vec3 miolo = mix(vec3(0.03, 0.02, 0.06), c * 0.9, max(0.25, vCheia));
  vec3 cor = miolo * corpo * cheio + c * contorno * (1.2 + 0.6 * bat + 1.0 * vCheia);
  float a = max(corpo * cheio, contorno * 0.95);
  a *= pisca;
  if (a < 0.03) discard;
  gl_FragColor = vec4(cor * pisca, a);
  ${NEVOA_FRAG}
}`

// ── os holofotes ──
const VERT_LUZ = /* glsl */ `
attribute vec4 aB; // a base (xyz) e o comprimento (m)
attribute vec4 aD; // semente, matiz, velocidade, —
uniform float uDentro;
varying float vY; varying float vF; varying vec4 vD; varying float vPulo;
${NEVOA_VERT_PARS}
${ENERGIA_GLSL}
void main() {
  vD = aD;
  vY = position.y;
  // varre o céu: a inclinação e o rumo dançam no compasso (8 batidas)
  float fase = uBat * 3.14159 / 4.0 * aD.z + aD.x * 6.2832;
  float incl = 0.3 + 0.35 * sin(fase * 0.7 + aD.x * 3.0);
  float rumo = fase;
  vec3 dir = vec3(sin(incl) * cos(rumo), cos(incl), sin(incl) * sin(rumo));
  // no drift, os perto viram pra Kombi
  float pl = pulo(aB.xyz);
  vPulo = pl;
  vec3 praK = normalize(uPulaP + vec3(0.0, 1.5, 0.0) - aB.xyz);
  dir = normalize(mix(dir, praK, pl));
  vec3 eixoX = normalize(cross(dir, abs(dir.y) > 0.95 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0)));
  vec3 eixoZ = cross(eixoX, dir);
  vec3 lp = position * vec3(1.0, aB.w, 1.0);
  vec3 w = aB.xyz + (eixoX * lp.x + dir * lp.y + eixoZ * lp.z) * uDentro;
  vec3 n = normalize(eixoX * normal.x + eixoZ * normal.z);
  vF = abs(dot(n, normalize(cameraPosition - w)));
  vec4 mvPosition = viewMatrix * vec4(w, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const FRAG_LUZ = /* glsl */ `
uniform float uBat; uniform float uEnergia; uniform float uBateria; uniform float uT;
varying float vY; varying float vF; varying vec4 vD; varying float vPulo;
${NEVOA_FRAG_PARS}
void main() {
  vec3 c = vD.y < 0.25 ? vec3(1.0, 0.2, 0.7) : vD.y < 0.5 ? vec3(0.2, 0.8, 1.0) : vD.y < 0.75 ? vec3(0.65, 0.3, 1.0) : vec3(1.0, 0.7, 0.3);
  float bat = exp(-fract(uBat) * 3.0);
  float pisca = 1.0 - uBateria * step(0.55, fract(sin(floor(uT * 5.0) + vD.x * 31.0) * 4375.5));
  float a = pow(vF, 2.5) * pow(1.0 - vY, 1.6) * (0.1 + 0.12 * bat) * (0.5 + 0.6 * uEnergia + 0.8 * vPulo) * pisca;
  gl_FragColor = vec4(c * a, a);
  ${NEVOA_FRAG}
}`

export function Sexta({ M, k, ctx, carro }: PropsManifesto) {
  const C = SEXTA_CFG

  const mundo = useMemo(() => {
    const v = M.vias[M.pistas[k].ida]
    const r = semente(8_8088 + k)
    const gP: number[] = [], gD: number[] = [], lB: number[] = [], lD: number[] = []
    const pos = new THREE.Vector3()
    const dens = densidadeRua() // (revisão 2) no leve, metade da multidão e dos holofotes
    const passoI = Math.max(1, Math.round(C.passo / dens / 2))
    for (let i = 6; i < v.n - 6; i += passoI + Math.floor(r() * 4)) {
      const lado = r() < 0.5 ? -1 : 1
      const terraco = r() < C.terraco
      const lat = terraco ? MEIA_PISTA + 10 + r() * 22 : MEIA_PISTA + 1.6 + r() * 3
      const alt = terraco ? 8 + r() * 24 : 0
      const n = C.roda[0] + Math.floor(r() * (C.roda[1] - C.roda[0] + 1))
      const jeitoRoda = Math.floor(r() * 3)
      for (let j = 0; j < n; j++) {
        aoLado(v, i, lat * lado + (r() - 0.5) * (terraco ? 8 : 3), alt, pos)
        const ang = r() * Math.PI * 2, rr = r() * (terraco ? 4 : 5)
        gP.push(pos.x + Math.cos(ang) * rr, pos.y, pos.z + Math.sin(ang) * rr, 1.9 + r() * 0.5)
        gD.push(r(), r() < 0.6 ? jeitoRoda : Math.floor(r() * 3), r(), Math.floor(r() * 4) * 0.5 + r() * 0.15)
      }
    }
    const passoL = Math.max(1, Math.round(C.passoHolofote / dens / 2))
    let lado = 1
    for (let i = 20; i < v.n - 20; i += passoL + Math.floor(r() * 10)) {
      lado = -lado
      aoLado(v, i, (MEIA_PISTA + 14 + r() * 16) * lado, 10 + r() * 20, pos)
      lB.push(pos.x, pos.y, pos.z, 140 + r() * 80)
      lD.push(r(), r(), 0.6 + r() * 0.8, 0)
    }
    return { gP, gD, lB, lD }
  }, [M, k, C.passo, C.roda, C.terraco, C.passoHolofote])

  const obj = useMemo(() => {
    const comuns = {
      uEnergia: { value: 0.6 }, uBateria: { value: 0 }, uBat: { value: 0 }, uT: { value: 0 },
      uPulaP: { value: new THREE.Vector3(0, -1e5, 0) }, uPulaT: { value: -99 }, uDentro: { value: 0 },
    }
    // a multidão
    const base = new THREE.PlaneGeometry(1, 1)
    const g = new THREE.InstancedBufferGeometry()
    g.index = base.index
    g.setAttribute("position", base.getAttribute("position"))
    g.setAttribute("uv", base.getAttribute("uv"))
    g.setAttribute("aP", new THREE.InstancedBufferAttribute(new Float32Array(mundo.gP), 4))
    g.setAttribute("aD", new THREE.InstancedBufferAttribute(new Float32Array(mundo.gD), 4))
    g.instanceCount = mundo.gP.length / 4
    const matG = new THREE.ShaderMaterial({
      vertexShader: VERT_GENTE, fragmentShader: FRAG_GENTE, transparent: true, depthWrite: false, toneMapped: false, fog: true,
      uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...comuns, uOcoPerto: { value: C.ocoPerto }, uOcoLonge: { value: C.ocoLonge } },
    })
    matG.name = "manifesto-sexta-multidao"
    const gente = new THREE.Mesh(g, matG)
    gente.frustumCulled = false
    gente.renderOrder = 3
    // os holofotes: cones abertos, a ponta na base
    const bl = new THREE.CylinderGeometry(5, 0.25, 1, 14, 1, true)
    bl.translate(0, 0.5, 0)
    const gl2 = new THREE.InstancedBufferGeometry()
    gl2.index = bl.index
    gl2.setAttribute("position", bl.getAttribute("position"))
    gl2.setAttribute("normal", bl.getAttribute("normal"))
    gl2.setAttribute("aB", new THREE.InstancedBufferAttribute(new Float32Array(mundo.lB), 4))
    gl2.setAttribute("aD", new THREE.InstancedBufferAttribute(new Float32Array(mundo.lD), 4))
    gl2.instanceCount = mundo.lB.length / 4
    const matL = new THREE.ShaderMaterial({
      vertexShader: VERT_LUZ, fragmentShader: FRAG_LUZ, transparent: true, depthWrite: false, toneMapped: false, fog: true,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...comuns },
    })
    matL.name = "manifesto-sexta-holofotes"
    const luz = new THREE.Mesh(gl2, matL)
    luz.frustumCulled = false
    luz.renderOrder = 4
    return { gente, matG, g, base, luz, matL, gl2, bl, comuns }
  }, [mundo, C.ocoPerto, C.ocoLonge])
  useEffect(() => () => {
    obj.g.dispose(); obj.base.dispose(); obj.matG.dispose(); obj.gl2.dispose(); obj.bl.dispose(); obj.matL.dispose()
  }, [obj])

  const st = useRef({ driftAnt: false, ultimo: -99 }).current

  useFrame(() => {
    const t = ctx.relogio
    const U = obj.comuns
    // as três campanhas: vazia (0,6) → bateria esgotada (0,3, piscando) → aceita e dança (1)
    const p = ctx.prog
    const s = THREE.MathUtils.smoothstep
    const energia = 0.6 - 0.3 * s(p, 0.28, 0.4) + 0.7 * s(p, 0.62, 0.72)
    const bateria = s(p, 0.3, 0.42) * (1 - s(p, 0.6, 0.68))
    U.uEnergia.value = energia
    U.uBateria.value = bateria * 0.6
    U.uBat.value = ctx.batida
    U.uT.value = t
    U.uDentro.value = ctx.dentro
    // aceita e dança: o oco encolhe
    obj.matG.uniforms.uOcoPerto.value = C.ocoPerto * (1 - 0.6 * s(p, 0.66, 0.85))
    obj.matG.uniforms.uOcoLonge.value = C.ocoLonge * (1 - 0.5 * s(p, 0.66, 0.85))
    // o drift: a multidão perto pula junto (de novo a cada 2 s de drift seguido)
    const car = carro.current
    if (ctx.drift && car && ctx.dentro > 0.5 && (!st.driftAnt || t - st.ultimo > 2)) {
      const me = car.matrixWorld.elements
      ;(U.uPulaP.value as THREE.Vector3).set(me[12], me[13], me[14])
      U.uPulaT.value = t
      st.ultimo = t
    }
    st.driftAnt = ctx.drift
  })

  return (
    <>
      <primitive object={obj.gente} />
      <primitive object={obj.luz} />
    </>
  )
}
