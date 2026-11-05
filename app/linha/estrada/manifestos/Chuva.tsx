"use client"

// CHUVA (a Ella, "a flor"): a chuva que rega a cidade.
//
// - a chuva começa fina e engrossa com a faixa. Não há gota nova: a rua puxa a
//   chuva que o jogo já desenha (ceu.ts CHUVA_MANIFESTO → Corrida.tsx)
// - onde as gotas caem na pista nascem anéis de luz, cada vez mais, no tempo da
//   batida; e nos prédios, nos canteiros e na beira da pista, uma gota desce e
//   uma flor de luz nasce, crescendo um degrau a cada batida (a cidade-disco
//   sendo regada). As flores respiram no compasso
// - segurar o propulsor ou o freio abre um guarda-chuva de luz sobre a Kombi:
//   as gotas batem nele e o trecho que ele cobre floresce mais (e fica assim
//   até o fim da volta)
//
// Custo: 3 desenhos (flores ~600 instâncias de 8 vértices, anéis ~500 quads
// deitados, o guarda-chuva de 1 cúpula), 3 ShaderMaterial, sem textura, sem
// luz. Matrizes escritas UMA vez na montagem; por quadro só uniforms (e a
// posição do guarda-chuva). A chuva em si: as linhas que já existiam.

import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { PropsManifesto } from "./tipos"
import { CHUVA_MANIFESTO } from "./ceu"
import { MEIA_PISTA, NEVOA_FRAG, NEVOA_FRAG_PARS, NEVOA_VERT_PARS, aoLado, densidadeRua, semente, viradoPraRua } from "./comum"

export const CHUVA_CFG = {
  passoFlor: 7, // m entre os pontos de flor ao longo da rua
  passoAnel: 9, // m entre os anéis na pista
  chuvaFina: 0.3, // a força da chuva no começo (1 = a pancada do clima)
  chuvaGrossa: 1.8, // e no fim da faixa
  nasceAte: 0.92, // as flores nascem ao longo desta fração da faixa
  degraus: 6, // batidas pra uma flor crescer inteira
  raioGuarda: 4.6, // m, o guarda-chuva
  raioRega: 24, // m: até onde o trecho coberto floresce mais
  trechos: 8, // trechos regados lembrados (o mais velho dá lugar)
}

// ── as flores (dois quads cruzados, base no chão, 1 × 1) ──
const VERT_FLOR = /* glsl */ `
attribute vec4 aD; // semente, nasce (0–1 da faixa), tipo (0 chão, 1 fachada), matiz
uniform float uBatT; uniform float uBatTot; uniform float uBat; uniform float uDentro; uniform float uDegraus;
uniform vec4 uRega[8];
varying vec2 vUv; varying float vCres; varying float vAbre; varying float vGota; varying vec4 vD; varying float vRega;
${NEVOA_VERT_PARS}
void main() {
  vUv = uv; vD = aD;
  vec3 base = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  // o trecho regado pelo guarda-chuva floresce mais
  float rega = 0.0;
  for (int i = 0; i < 8; i++) rega += uRega[i].w * (1.0 - smoothstep(6.0, ${CHUVA_CFG.raioRega.toFixed(1)}, distance(base, uRega[i].xyz)));
  rega = min(rega, 1.5);
  vRega = rega;
  // batidas desde que a gota caiu: cresce um degrau por batida
  float desde = uBatT - aD.y * uBatTot;
  float cres = desde > 0.0 ? clamp((floor(desde) + smoothstep(0.0, 0.35, fract(desde))) / uDegraus, 0.0, 1.0) : 0.0;
  vCres = cres;
  // a gota descendo nas 2 batidas antes de nascer
  vGota = desde > -2.0 && desde < 0.4 ? clamp((desde + 2.0) / 2.2, 0.0, 1.0) : 0.0;
  float bat = exp(-fract(uBat) * 4.0);
  // respira no compasso (4 batidas), cada uma no seu tempo
  float comp = 0.5 + 0.5 * sin(uBat * 1.5708 + aD.x * 6.2832);
  vAbre = cres * (0.5 + 0.3 * comp + 0.4 * rega);
  float vivo = step(-2.0, desde) * uDentro;
  float esc = vivo * (1.0 + 0.45 * rega) * (1.0 + 0.07 * bat * cres);
  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position * esc, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const FRAG_FLOR = /* glsl */ `
uniform float uBat; uniform float uT;
varying vec2 vUv; varying float vCres; varying float vAbre; varying float vGota; varying vec4 vD; varying float vRega;
${NEVOA_FRAG_PARS}
vec3 matiz(float h) {
  // rosa, ciano, âmbar, lima: o neon da cidade
  vec3 a = vec3(1.0, 0.3, 0.7), b = vec3(0.25, 0.9, 1.0), c = vec3(1.0, 0.75, 0.3), d = vec3(0.6, 1.0, 0.4);
  return h < 0.25 ? a : h < 0.5 ? b : h < 0.75 ? c : d;
}
void main() {
  vec2 q = vec2(vUv.x - 0.5, vUv.y);
  float sem = vD.x;
  vec3 cor = vec3(0.0); float a = 0.0;
  // a gota descendo até o broto
  if (vGota > 0.0) {
    float y = mix(1.0, 0.05, vGota);
    float g = length((q - vec2(0.0, y)) * vec2(1.0, 0.45));
    float gota = (1.0 - smoothstep(0.0, 0.035, g)) + 0.5 * (1.0 - smoothstep(0.0, 0.012, abs(q.x))) * step(y, q.y) * step(q.y, y + 0.25) * (1.0 - (q.y - y) / 0.25);
    cor += vec3(0.7, 0.85, 1.0) * gota * 1.6; a = max(a, gota * (1.0 - vCres));
  }
  if (vCres > 0.0) {
    float h = 0.62 * vCres;
    // a haste, com uma curva de quem cresceu na chuva
    float x = q.x - 0.035 * sin(q.y * 9.0 + sem * 20.0) * q.y;
    float haste = (1.0 - smoothstep(0.012, 0.024, abs(x))) * step(q.y, h);
    // as folhas
    vec2 pf = vec2(abs(x) - 0.07 * vCres, q.y - 0.28 * h);
    pf = mat2(0.8, -0.6, 0.6, 0.8) * pf;
    float folha = 1.0 - smoothstep(0.0, 0.01, length(pf * vec2(1.0, 2.6)) - 0.07 * vCres);
    vec3 verde = vec3(0.3, 1.0, 0.55);
    cor += verde * (haste + folha * 0.8) * 0.9; a = max(a, max(haste, folha * 0.85));
    // a flor: 5 ou 6 pétalas, abre no compasso
    vec2 p = q - vec2(0.035 * sin(h * 9.0 + sem * 20.0) * h, h);
    float r = length(p), an = atan(p.y, p.x);
    float n = sem < 0.5 ? 5.0 : 6.0;
    float R = (0.06 + 0.22 * vAbre) * smoothstep(0.25, 0.6, vCres);
    float rosa = R * (0.5 + 0.5 * abs(cos(an * n * 0.5 + sem * 6.0 + uT * 0.15)));
    float petala = 1.0 - smoothstep(rosa - 0.012, rosa + 0.012, r);
    float miolo = 1.0 - smoothstep(0.02, 0.04, r - 0.01 * vAbre);
    vec3 c = matiz(vD.w);
    float bat = exp(-fract(uBat) * 4.0);
    vec3 cp = c * (1.1 + 0.6 * bat + 0.8 * vRega) * (0.6 + 0.4 * r / max(R, 0.01));
    cor = mix(cor, cp, petala); a = max(a, petala * 0.92);
    cor = mix(cor, vec3(1.0, 0.95, 0.7) * 1.5, miolo * step(0.01, R)); a = max(a, miolo * step(0.01, R));
    // o halo (o que o bloom pega)
    float halo = exp(-r * 9.0) * vAbre * 0.35;
    cor += c * halo; a = max(a, halo);
  }
  if (a < 0.02) discard;
  gl_FragColor = vec4(cor, a);
  ${NEVOA_FRAG}
}`

// ── os anéis na pista (onde as gotas caem) ──
const VERT_ANEL = /* glsl */ `
attribute vec4 aD; // semente, limiar (a chuva precisa estar desta força), ritmo, matiz
varying vec2 vUv; varying vec4 vD;
uniform float uChuva; uniform float uDentro;
${NEVOA_VERT_PARS}
void main() {
  vUv = uv; vD = aD;
  float on = step(aD.y, uChuva) * uDentro;
  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position * on, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const FRAG_ANEL = /* glsl */ `
uniform float uBat; uniform float uChuva;
varying vec2 vUv; varying vec4 vD;
${NEVOA_FRAG_PARS}
void main() {
  vec2 q = vUv * 2.0 - 1.0;
  float r = length(q);
  if (r > 1.0) discard;
  // cada anel cai numa batida (ou a cada 2, ou meia), abre e some
  float f = fract(uBat * vD.z + vD.x * 7.0);
  float anel = exp(-abs(r - f) * 28.0) * (1.0 - f) + 0.5 * exp(-abs(r - f * 0.6) * 34.0) * (1.0 - f);
  vec3 c = mix(vec3(0.55, 0.8, 1.0), vec3(0.6, 1.0, 0.7), vD.w);
  float a = anel * (0.35 + 0.4 * uChuva);
  if (a < 0.01) discard;
  gl_FragColor = vec4(c * a * 1.6, a);
  ${NEVOA_FRAG}
}`

// ── o guarda-chuva de luz ──
const VERT_GUARDA = /* glsl */ `
varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main() {
  vP = position;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
}`
const FRAG_GUARDA = /* glsl */ `
uniform float uAbre; uniform float uT; uniform float uBat; uniform float uR;
varying vec3 vN; varying vec3 vV; varying vec3 vP;
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  float borda = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
  // as gotas batendo: respingos em células da cúpula
  vec2 uv = vec2(atan(vP.z, vP.x) * 3.0, vP.y * 2.2);
  vec2 cel = floor(uv), fc = fract(uv) - 0.5;
  float h = h21(cel);
  float f = fract(uT * (0.8 + h) + h * 9.0);
  float resp = exp(-abs(length(fc) - f * 0.45) * 30.0) * (1.0 - f);
  // as varetas
  float vareta = 1.0 - smoothstep(0.0, 0.05, abs(fract(atan(vP.z, vP.x) / 6.2832 * 8.0) - 0.5) - 0.46);
  float bat = exp(-fract(uBat) * 4.0);
  float pe = smoothstep(0.0, 0.25, vP.y / uR);
  vec3 c = vec3(0.6, 0.85, 1.0) * (0.12 + 0.9 * borda + 0.6 * resp + 0.25 * vareta * pe) + vec3(1.0, 0.5, 0.8) * 0.2 * bat * borda;
  gl_FragColor = vec4(c * uAbre, 1.0);
}`

/** os dois quads cruzados de uma flor: base em y = 0, 1 × 1 */
function geoFlor() {
  const g = new THREE.BufferGeometry()
  const P = [-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0, 0, 0, -0.5, 0, 0, 0.5, 0, 1, 0.5, 0, 1, -0.5]
  const U = [0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1]
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3))
  g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2))
  g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7])
  return g
}

export function Chuva({ M, k, pista, ctx, carro }: PropsManifesto) {
  const C = CHUVA_CFG

  // ── as flores e os anéis: escritos uma vez, ao longo da ida ──
  const lugares = useMemo(() => {
    const v = M.vias[M.pistas[k].ida]
    const r = semente(7_7979 + k)
    const flores: THREE.Matrix4[] = [], dFlor: number[] = []
    const aneis: THREE.Matrix4[] = [], dAnel: number[] = []
    const pos = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler(), esc = new THREE.Vector3()
    const nI = Math.max(1, v.n - 16)
    const dens = densidadeRua() // (revisão 2) no leve, metade das flores e dos anéis
    const passoF = Math.max(1, Math.round(C.passoFlor / dens / 2))
    for (let i = 8; i < v.n - 8; i += passoF + Math.floor(r() * 3)) {
      const lado = r() < 0.5 ? -1 : 1
      const x = r()
      let lat: number, alt: number, tam: number, tipo: number
      if (x < 0.35) { lat = MEIA_PISTA - 0.5 - r() * 0.6; alt = 0; tam = 0.8 + r() * 0.8; tipo = 0 } // a beira da pista
      else if (x < 0.6) { lat = MEIA_PISTA + 1.5 + r() * 3; alt = 0; tam = 1.2 + r() * 1.4; tipo = 0 } // o canteiro
      else { lat = MEIA_PISTA + 5 + r() * 16; alt = 3 + r() * 26; tam = 1.6 + r() * 2.8; tipo = 1 } // os prédios
      aoLado(v, i, lat * lado, alt, pos)
      e.set(0, viradoPraRua(v, i, lado) + r() * 1.5, 0)
      q.setFromEuler(e)
      esc.set(tam, tam * (1.1 + r() * 0.5), tam)
      flores.push(new THREE.Matrix4().compose(pos, q, esc))
      // nasce quando a chuva chega ali: mais cedo perto do começo da rua, com sorteio
      const nasce = Math.min(1, Math.max(0, ((i - 8) / nI) * 0.55 + r() * 0.45))
      dFlor.push(r(), nasce, tipo, r())
    }
    const passoA = Math.max(1, Math.round(C.passoAnel / dens / 2))
    q.setFromEuler(e.set(-Math.PI / 2, 0, 0))
    for (let i = 6; i < v.n - 6; i += passoA + Math.floor(r() * 3)) {
      for (let c = 0; c < 2; c++) {
        aoLado(v, i + Math.floor(r() * 3), (r() * 2 - 1) * (MEIA_PISTA - 1), 0.06, pos)
        esc.setScalar(1.2 + r() * 2.2)
        aneis.push(new THREE.Matrix4().compose(pos, q, esc))
        const ritmo = [0.5, 1, 1, 0.25][Math.floor(r() * 4)]
        dAnel.push(r(), r() * 0.95, ritmo, r())
      }
    }
    return { flores, dFlor, aneis, dAnel }
  }, [M, k, C.passoFlor, C.passoAnel])

  const flor = useMemo(() => {
    const n = lugares.flores.length
    const g = geoFlor()
    g.setAttribute("aD", new THREE.InstancedBufferAttribute(new Float32Array(lugares.dFlor), 4))
    const rega = Array.from({ length: 8 }, () => new THREE.Vector4(0, -1e5, 0, 0))
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT_FLOR, fragmentShader: FRAG_FLOR, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uBatT: { value: 0 }, uBatTot: { value: 1 }, uBat: { value: 0 }, uDentro: { value: 0 }, uDegraus: { value: C.degraus }, uT: { value: 0 },
      }]),
    })
    mat.uniforms.uRega = { value: rega } // fora do merge (ele clona os vetores)
    mat.name = "manifesto-chuva-flores"
    const m = new THREE.InstancedMesh(g, mat, n)
    for (let i = 0; i < n; i++) m.setMatrixAt(i, lugares.flores[i])
    m.instanceMatrix.needsUpdate = true
    m.frustumCulled = false
    m.renderOrder = 3
    return { m, mat, rega }
  }, [lugares, C.degraus])
  useEffect(() => () => { flor.m.geometry.dispose(); flor.mat.dispose(); flor.m.dispose() }, [flor])

  const anel = useMemo(() => {
    const n = lugares.aneis.length
    const g = new THREE.PlaneGeometry(1, 1)
    g.setAttribute("aD", new THREE.InstancedBufferAttribute(new Float32Array(lugares.dAnel), 4))
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT_ANEL, fragmentShader: FRAG_ANEL, transparent: true, depthWrite: false, toneMapped: false, fog: true,
      blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uBat: { value: 0 }, uChuva: { value: 0 }, uDentro: { value: 0 } }]),
    })
    mat.name = "manifesto-chuva-aneis"
    const m = new THREE.InstancedMesh(g, mat, n)
    for (let i = 0; i < n; i++) m.setMatrixAt(i, lugares.aneis[i])
    m.instanceMatrix.needsUpdate = true
    m.frustumCulled = false
    m.renderOrder = 2
    return { m, mat }
  }, [lugares])
  useEffect(() => () => { anel.m.geometry.dispose(); anel.mat.dispose(); anel.m.dispose() }, [anel])

  const guarda = useMemo(() => {
    const g = new THREE.SphereGeometry(C.raioGuarda, 20, 6, 0, Math.PI * 2, 0, Math.PI * 0.42)
    g.translate(0, -C.raioGuarda * Math.cos(Math.PI * 0.42), 0) // a borda da cúpula em y = 0
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT_GUARDA, fragmentShader: FRAG_GUARDA, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, toneMapped: false,
      uniforms: { uAbre: { value: 0 }, uT: { value: 0 }, uBat: { value: 0 }, uR: { value: C.raioGuarda } },
    })
    mat.name = "manifesto-chuva-guarda"
    const m = new THREE.Mesh(g, mat)
    m.frustumCulled = false
    m.visible = false
    m.renderOrder = 5
    return { m, mat }
  }, [C.raioGuarda])
  useEffect(() => () => { guarda.m.geometry.dispose(); guarda.mat.dispose() }, [guarda])

  // o tempo "chovido" (não volta quando a faixa recomeça: a cidade fica regada),
  // o guarda-chuva aberto (0–1) e o trecho que ele está regando agora
  const st = useRef({ base: 0, tAnt: -1, abre: 0, trecho: -1, prox: 0 }).current
  useEffect(() => () => { CHUVA_MANIFESTO.k = 0 }, [])

  useFrame((_, dtCru) => {
    const dt = Math.min(0.1, dtCru)
    // a faixa recomeçou (o instrumental em loop): o que choveu fica
    if (st.tAnt >= 0 && ctx.t < st.tAnt - 2) st.base += st.tAnt
    st.tAnt = ctx.t
    const tChov = st.base + ctx.t
    const bps = pista.bpm / 60
    const forca = THREE.MathUtils.smoothstep(tChov / ctx.dur, 0, 0.85) // 0 fina → 1 grossa
    CHUVA_MANIFESTO.k = ctx.dentro * (C.chuvaFina + (C.chuvaGrossa - C.chuvaFina) * forca)

    const F = flor.mat.uniforms
    F.uBatT.value = tChov * bps
    F.uBatTot.value = ctx.dur * bps * C.nasceAte
    F.uBat.value = ctx.batida
    F.uDentro.value = ctx.dentro
    F.uT.value = ctx.relogio
    const A = anel.mat.uniforms
    A.uBat.value = ctx.batida
    A.uChuva.value = 0.15 + 0.85 * forca
    A.uDentro.value = ctx.dentro

    // o guarda-chuva: segurando o propulsor ou o freio
    const quer = (ctx.turbo || ctx.freio) && ctx.dentro > 0.5 ? 1 : 0
    st.abre += (quer - st.abre) * Math.min(1, dt * (quer ? 6 : 3))
    const car = carro.current
    guarda.m.visible = st.abre > 0.01 && !!car
    if (!car || st.abre <= 0.01) { st.trecho = -1; return }
    const me = car.matrixWorld.elements
    guarda.m.position.set(me[12], me[13] + 2.7 + 0.5 * st.abre, me[14])
    guarda.m.scale.setScalar(0.3 + 0.7 * st.abre)
    const G = guarda.mat.uniforms
    G.uAbre.value = st.abre
    G.uT.value = ctx.relogio
    G.uBat.value = ctx.batida
    // o trecho coberto: fica onde abriu; a Kombi andou pra longe dele, abre um trecho novo
    const rega = flor.rega
    if (st.abre > 0.5) {
      const r0 = st.trecho >= 0 ? rega[st.trecho] : null
      if (!r0 || (me[12] - r0.x) ** 2 + (me[14] - r0.z) ** 2 > (C.raioRega * 0.8) ** 2) {
        st.trecho = st.prox
        st.prox = (st.prox + 1) % C.trechos
        rega[st.trecho].set(me[12], me[13], me[14], 0.3)
      }
      const r = rega[st.trecho]
      r.w = Math.min(1, r.w + dt * 2.5)
    }
  })

  return (
    <>
      <primitive object={flor.m} />
      <primitive object={anel.m} />
      <primitive object={guarda.m} />
    </>
  )
}
