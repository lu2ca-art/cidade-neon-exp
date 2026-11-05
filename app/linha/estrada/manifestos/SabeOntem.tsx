"use client"

// SABE ONTEM? (faixa 7, o tempo): a rua do tempo que não volta.
//
// - um dia inteiro passa durante a volta, só nessa rua: o céu sai do amanhecer
//   no começo da faixa e chega na noite no fim dela (ceu.ts puxa o céu do jogo)
// - relógios nos prédios ao longo da rua (uns adiantados, uns atrasados, uns
//   andando pra trás) e três relógios enormes no céu, com a hora da rua
// - a Kombi deixa "ontens" no ar: a cada poucos segundos um fantasma dela fica
//   parado onde ela estava, translúcido, e vai desbotando
// - frear forte SEGURA o tempo: os ponteiros param, o céu para e os fantasmas
//   param de desbotar. Só por um instante (segurar demais não adianta: ~4 s e
//   o tempo escapa); soltou, o tempo cobra: o céu e os ponteiros correm pra
//   alcançar a faixa
//
// Custo: 2 InstancedMesh (relógios ~55 + 3 no céu; fantasmas 14), 2
// ShaderMaterial, sem textura, sem luz nova. Matrizes dos relógios escritas
// uma vez; um fantasma novo = 1 matriz + 1 número a cada ~3 s. Por quadro,
// só uniforms (e a hora do céu: 2 números).

import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { ceuNaHora } from "../../ceu"
import type { PropsManifesto } from "./tipos"
import { CEU_MANIFESTO } from "./ceu"
import { MEIA_PISTA, NEVOA_FRAG, NEVOA_FRAG_PARS, NEVOA_VERT_PARS, aoLado, semente, viradoPraRua } from "./comum"

export const ONTEM_CFG = {
  amanhecer: 5, // a hora do céu no começo da faixa
  anoitecer: 22, // e no fim
  passoRelogio: 85, // m entre os relógios dos prédios
  ceu: 3, // relógios no céu
  fantasmas: 14,
  cadaFantasma: 3.2, // s entre um "ontem" e o próximo
  desbota: 16, // s até o fantasma quase sumir
  segurarMax: 4, // s: o tempo escapa da mão
  cobra: 0.6, // por segundo: o tempo segurado volta correndo
}

// ── os relógios ──
const VERT_REL = /* glsl */ `
attribute vec4 aD; // semente, sentido (+1/-1), atraso (h), céu (1)
uniform float uDentro;
varying vec2 vUv; varying vec4 vD;
${NEVOA_VERT_PARS}
void main() {
  vUv = uv; vD = aD;
  vec4 mvPosition;
  if (aD.w > 0.5) {
    // no céu: sempre de frente pra câmera
    vec3 c = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    float s = length(instanceMatrix[0].xyz);
    mvPosition = modelViewMatrix * vec4(c, 1.0) + vec4(position.xy * s * uDentro, 0.0, 0.0);
  } else {
    mvPosition = modelViewMatrix * instanceMatrix * vec4(position * uDentro, 1.0);
  }
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const FRAG_REL = /* glsl */ `
uniform float uHora; uniform float uNoite; uniform float uSeg; uniform float uT;
varying vec2 vUv; varying vec4 vD;
${NEVOA_FRAG_PARS}
float traco(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
vec2 ang(float a) { return vec2(sin(a), cos(a)); }
void main() {
  vec2 q = vUv * 2.0 - 1.0;
  float r = length(q);
  if (r > 1.0) discard;
  bool ceu = vD.w > 0.5;
  // a hora deste relógio: a da rua (no céu) ou a dele (adiantado, atrasado, ao contrário)
  float h = ceu ? uHora : uHora * vD.y + vD.z;
  float aH = h / 12.0 * 6.28318, aM = fract(h) * 6.28318;
  // o mostrador: vidro apagado de dia, âmbar aceso de noite
  vec3 ambar = vec3(1.0, 0.72, 0.38), vidro = vec3(0.85, 0.88, 0.95);
  vec3 face = mix(vidro * 0.18, ambar * 0.12, uNoite);
  float aro = 1.0 - smoothstep(0.0, 0.04, abs(r - 0.94));
  // os 12 traços
  float a = atan(q.x, q.y);
  float arco = abs(fract(a / 6.28318 * 12.0 + 0.5) - 0.5) * 6.28318 / 12.0 * r; // distância (no arco) até o traço mais perto
  float marca = (1.0 - smoothstep(0.015, 0.035, arco)) * step(0.76, r) * step(r, 0.9);
  float pH = traco(q, vec2(0.0), ang(aH) * 0.5), pM = traco(q, vec2(0.0), ang(aM) * 0.78);
  float ponteiros = max(1.0 - smoothstep(0.035, 0.06, pH), 1.0 - smoothstep(0.02, 0.04, pM));
  // segurando o tempo: os ponteiros tremem de leve, o aro acende
  vec3 linha = mix(vec3(0.9), ambar * 1.6, uNoite);
  vec3 cor = face + linha * (aro * (0.6 + 0.8 * uSeg) + marca * 0.8 + ponteiros);
  float alfa = mix(0.35, 0.6, uNoite) + 0.5 * max(aro, max(marca, ponteiros));
  if (ceu) alfa *= 0.55 + 0.15 * uNoite;
  gl_FragColor = vec4(cor, clamp(alfa, 0.0, 1.0));
  if (!ceu) {
    ${NEVOA_FRAG}
  }
}`

// ── os fantasmas (os "ontens" da Kombi) ──
const VERT_FAN = /* glsl */ `
attribute float aNasc;
uniform float uDesb;
varying float vIdade; varying vec3 vN; varying vec3 vV; varying float vY;
${NEVOA_VERT_PARS}
void main() {
  vIdade = uDesb - aNasc;
  vY = position.y;
  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
  vV = normalize(-mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const FRAG_FAN = /* glsl */ `
uniform float uDesbota; uniform float uSeg; uniform float uT; uniform float uDentro;
varying float vIdade; varying vec3 vN; varying vec3 vV; varying float vY;
${NEVOA_FRAG_PARS}
void main() {
  if (vIdade < 0.0) discard;
  float vivo = exp(-vIdade / uDesbota * 2.3) * smoothstep(0.0, 0.5, vIdade) * uDentro;
  if (vivo < 0.01) discard;
  float borda = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
  // a linha de varredura de fita velha subindo
  float fita = 0.75 + 0.25 * sin(vY * 22.0 - uT * 3.0);
  vec3 cor = mix(vec3(1.0, 0.78, 0.5), vec3(0.75, 0.85, 1.0), 0.35 + 0.3 * uSeg);
  float a = (0.08 + 0.9 * borda) * fita * vivo * (1.0 + 0.6 * uSeg);
  gl_FragColor = vec4(cor * a, 1.0);
  ${NEVOA_FRAG}
}`

// uma Kombi de poucos polígonos (o perfil extrudado), no sistema do carro (frente = -z)
function geoKombi() {
  const s = new THREE.Shape()
  // x do perfil = -z do carro (o nariz em +2,15); y = altura
  const P: [number, number][] = [[2.12, 0.42], [2.2, 1.05], [2.02, 1.72], [1.62, 1.98], [-1.9, 1.98], [-2.1, 1.78], [-2.12, 0.42]]
  s.moveTo(P[0][0], P[0][1])
  for (let i = 1; i < P.length; i++) s.lineTo(P[i][0], P[i][1])
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: 1.62, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 2, curveSegments: 3 })
  g.translate(0, 0, -0.81)
  g.rotateY(Math.PI / 2) // (x, y, z) → (z, y, -x): a extrusão vira a largura, o perfil vira o comprimento
  g.translate(-0.2, 0, 0)
  g.computeVertexNormals()
  return g
}

export function SabeOntem({ M, k, ctx, carro }: PropsManifesto) {
  const C = ONTEM_CFG

  // ── os relógios: escritos uma vez ──
  const relogios = useMemo(() => {
    const v = M.vias[M.pistas[k].ida]
    const r = semente(7_0707 + k)
    const mats: THREE.Matrix4[] = [], dados: number[] = []
    const pos = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler(), esc = new THREE.Vector3()
    const passoI = Math.max(1, Math.round(C.passoRelogio / 2))
    for (let i = 10; i < v.n - 10; i += passoI + Math.floor(r() * 12)) {
      const lado = r() < 0.5 ? -1 : 1
      const raio = 2.5 + r() * 5.5
      aoLado(v, i, (MEIA_PISTA + 6 + r() * 24) * lado, 6 + r() * 30, pos)
      e.set(0, viradoPraRua(v, i, lado) + (r() - 0.5) * 0.6, 0)
      q.setFromEuler(e)
      esc.set(raio, raio, 1)
      mats.push(new THREE.Matrix4().compose(pos, q, esc))
      // uns andam certo, uns atrasados/adiantados, uns (poucos) pra trás
      const sentido = r() < 0.18 ? -1 : 1
      const atraso = r() < 0.4 ? 0 : (r() - 0.5) * 6
      dados.push(r(), sentido, atraso, 0)
    }
    // os do céu: em cima da rua, enormes, de frente pra câmera
    for (let c = 0; c < C.ceu; c++) {
      const i = Math.floor(((c + 0.5) / C.ceu) * (v.n - 1))
      aoLado(v, i, (c % 2 ? 1 : -1) * 120, 170 + c * 25, pos)
      esc.setScalar(55 + c * 10)
      mats.push(new THREE.Matrix4().compose(pos, q.identity(), esc))
      dados.push(r(), 1, 0, 1)
    }
    return { mats, dados }
  }, [M, k, C.passoRelogio, C.ceu])

  const rel = useMemo(() => {
    const n = relogios.mats.length
    const g = new THREE.PlaneGeometry(2, 2)
    g.setAttribute("aD", new THREE.InstancedBufferAttribute(new Float32Array(relogios.dados), 4))
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT_REL, fragmentShader: FRAG_REL, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uHora: { value: C.amanhecer }, uNoite: { value: 0 }, uSeg: { value: 0 }, uT: { value: 0 }, uDentro: { value: 0 } }]),
    })
    mat.name = "manifesto-ontem-relogios"
    const m = new THREE.InstancedMesh(g, mat, n)
    for (let i = 0; i < n; i++) m.setMatrixAt(i, relogios.mats[i])
    m.instanceMatrix.needsUpdate = true
    m.frustumCulled = false
    m.renderOrder = 2
    return { m, mat }
  }, [relogios, C.amanhecer])
  useEffect(() => () => { rel.m.geometry.dispose(); rel.mat.dispose(); rel.m.dispose() }, [rel])

  // ── os fantasmas: um anel de N poses; o mais velho dá lugar ao novo ──
  const fan = useMemo(() => {
    const n = C.fantasmas
    const g = geoKombi()
    const nasc = new Float32Array(n).fill(-1e4)
    const aNasc = new THREE.InstancedBufferAttribute(nasc, 1).setUsage(THREE.DynamicDrawUsage)
    g.setAttribute("aNasc", aNasc)
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT_FAN, fragmentShader: FRAG_FAN, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uDesb: { value: 0 }, uDesbota: { value: C.desbota }, uSeg: { value: 0 }, uT: { value: 0 }, uDentro: { value: 0 } }]),
    })
    mat.name = "manifesto-ontem-fantasmas"
    const m = new THREE.InstancedMesh(g, mat, n)
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    m.frustumCulled = false
    m.renderOrder = 4
    return { m, mat, aNasc, nasc }
  }, [C.fantasmas, C.desbota])
  useEffect(() => () => { fan.m.geometry.dispose(); fan.mat.dispose(); fan.m.dispose() }, [fan])

  // o tempo da rua: o segurado (atraso, s da faixa), o relógio do desbotar e a hora vista
  const st = useRef({ seg: 0, segT: 0, atraso: 0, desb: 0, hora: -1, prox: 1.5, i: 0 }).current
  useEffect(() => () => { CEU_MANIFESTO.k = 0 }, [])

  useFrame((_, dtCru) => {
    const dt = Math.min(0.1, dtCru)
    // frear forte segura o tempo, só por um instante
    const freando = ctx.freio && ctx.v > 4
    st.segT = freando ? st.segT + dt : 0
    const quer = freando && st.segT < C.segurarMax ? 1 : 0
    st.seg += (quer - st.seg) * Math.min(1, dt * (quer ? 8 : 2))
    // segurado, a hora da rua não anda; soltou, ela corre pra alcançar a faixa
    st.atraso = Math.min(ctx.t, st.atraso + dt * st.seg)
    if (st.seg < 0.5) st.atraso = Math.max(0, st.atraso - st.atraso * C.cobra * dt)
    const prog = Math.min(1, Math.max(0, (ctx.t - st.atraso) / ctx.dur))
    const alvo = C.amanhecer + (C.anoitecer - C.amanhecer) * prog
    // a hora vista anda pelo caminho curto do relógio (a faixa que recomeça vira uma madrugada rápida)
    if (st.hora < 0) st.hora = alvo
    else { let d = alvo - st.hora; d -= Math.round(d / 24) * 24; st.hora = (((st.hora + d * Math.min(1, dt * 2.5)) % 24) + 24) % 24 }
    CEU_MANIFESTO.hora = st.hora
    CEU_MANIFESTO.k = ctx.dentro
    const noite = ceuNaHora(st.hora).noite

    // o relógio do desbotar para enquanto segura
    st.desb += dt * (1 - st.seg)
    const U = rel.mat.uniforms
    U.uHora.value = st.hora
    U.uNoite.value = noite
    U.uSeg.value = st.seg
    U.uT.value = ctx.relogio
    U.uDentro.value = ctx.dentro
    const F = fan.mat.uniforms
    F.uDesb.value = st.desb
    F.uSeg.value = st.seg
    F.uT.value = ctx.relogio
    F.uDentro.value = ctx.dentro

    // um "ontem" novo a cada ~3 s, andando e sem segurar o tempo
    st.prox -= dt * (1 - st.seg)
    const car = carro.current
    if (st.prox <= 0 && car && ctx.dentro > 0.5 && ctx.v > 3 && st.seg < 0.2) {
      st.prox = C.cadaFantasma
      const i = st.i
      st.i = (st.i + 1) % C.fantasmas
      fan.m.setMatrixAt(i, car.matrixWorld)
      fan.m.instanceMatrix.needsUpdate = true
      fan.nasc[i] = st.desb
      fan.aNasc.needsUpdate = true
    }
  })

  return (
    <>
      <primitive object={rel.m} />
      <primitive object={fan.m} />
    </>
  )
}
