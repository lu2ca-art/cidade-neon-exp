"use client"

// OJALÁ (o D-Bee, "a camisa da seleção"): fugaz como o vento.
//
// - rajadas de vento visíveis: fitas de luz e confete (o amarelo, o verde e o
//   azul da camisa, o rosa do carnaval) passam pela Kombi a cada compasso, um
//   grupo por batida; o vento engrossa com a faixa (Amor de Carnaval → Fugaz
//   como o Vento) e com a pressa
// - coisas bonitas aparecem ao lado da rua lá na frente (um coração, uma
//   estrela, uma pipa, uma bola, uma lua) e o vento as leva antes de você
//   chegar: os desejos ("ojalá")
// - tocar num desejo que está sumindo o segura por um instante: ele vem pro
//   lado da janela e fica... e vai embora mesmo assim (e não volta mais)
//
// Custo: 2 desenhos (o vento ~230 fitas/confetes de 26 vértices que seguem a
// Kombi; os desejos ~1 quad a cada ~45 m, de frente pra câmera), 2
// ShaderMaterial, sem textura, sem luz. Por quadro só uniforms (a Kombi, o rumo
// da rua). O toque projeta os desejos só no momento do toque.

import { useEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { PropsManifesto } from "./tipos"
import { MEIA_PISTA, NEVOA_FRAG, NEVOA_FRAG_PARS, NEVOA_VERT_PARS, aoLado, amostraPerto, semente } from "./comum"

export const OJALA_CFG = {
  fitas: 70,
  confete: 160,
  caixa: 150, // m: o comprimento da caixa de vento que segue a Kombi
  passoDesejo: 45, // m entre os desejos
  aparece: 170, // m: o desejo aparece a esta distância
  some: [40, 95] as [number, number], // m: e o vento o leva entre estas (antes de você chegar)
  segura: 2.6, // s que o toque segura
  raioToque: 90, // px
}

// ── o vento (fitas e confete) ──
const VERT_VENTO = /* glsl */ `
attribute vec4 aW;  // ao longo (0–1), de lado (-1..1), altura (0–1), semente
attribute vec4 aW2; // tipo (0 fita, 1 confete), grupo (a batida do compasso), matiz, comprimento
uniform vec3 uC; uniform vec3 uF; uniform float uAv; uniform float uBat; uniform float uT; uniform float uVento; uniform float uDentro;
varying vec2 vUv; varying float vA; varying float vM; varying float vTipo;
${NEVOA_VERT_PARS}
void main() {
  vUv = uv; vM = aW2.z; vTipo = aW2.x;
  float s = aW.w;
  // a rajada do grupo: nasce na batida dele e passa
  float fase = fract((uBat - aW2.y) / 4.0);
  float vida = pow(sin(3.14159 * fase), 0.7);
  float liga = step(s, uVento * 1.05);
  vA = vida * liga * uDentro;
  vec3 R = vec3(-uF.z, 0.0, uF.x);
  float L = ${OJALA_CFG.caixa.toFixed(1)};
  float al = mod(aW.x * L + uAv * (0.8 + 0.4 * s) + fase * 30.0, L) - 40.0;
  vec3 base = uC + uF * al + R * (aW.y * 24.0) + vec3(0.0, 1.0 + aW.z * (aW2.x > 0.5 ? 9.0 : 13.0), 0.0);
  vec3 p;
  if (aW2.x < 0.5) {
    // a fita: comprida no rumo do vento, ondulando e torcendo
    float x = position.x;
    float comp = aW2.w;
    float tw = x * 3.0 + uT * 4.0 + s * 20.0;
    vec3 larg = (vec3(0.0, 1.0, 0.0) * cos(tw) + R * sin(tw)) * position.y * 0.45;
    p = base + uF * x * comp + vec3(0.0, sin(x * 5.0 + uT * 7.0 + s * 30.0) * 0.9, 0.0) + R * cos(x * 4.0 + uT * 5.0 + s * 9.0) * 0.8 + larg;
  } else {
    // o confete: cai rodopiando no vento
    float a = uT * (3.0 + 4.0 * s) + s * 50.0;
    vec3 eixoA = normalize(vec3(sin(s * 31.0), cos(s * 17.0), sin(s * 7.0 + 1.0)));
    vec3 u1 = normalize(cross(eixoA, vec3(0.3, 1.0, 0.2)));
    vec3 u2 = cross(eixoA, u1);
    vec2 q = position.xy * vec2(0.22, 0.32);
    p = base + vec3(0.0, -mod(uT * (0.6 + s) + s * 9.0, 4.0), 0.0) + (u1 * cos(a) + eixoA * sin(a)) * q.x + u2 * q.y;
  }
  vec4 mvPosition = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const FRAG_VENTO = /* glsl */ `
uniform float uBat;
varying vec2 vUv; varying float vA; varying float vM; varying float vTipo;
${NEVOA_FRAG_PARS}
vec3 matiz(float h) {
  // a camisa: amarelo, verde, azul; o carnaval: rosa; e o branco
  return h < 0.3 ? vec3(1.0, 0.85, 0.15) : h < 0.5 ? vec3(0.2, 0.95, 0.45) : h < 0.68 ? vec3(0.25, 0.5, 1.0) : h < 0.88 ? vec3(1.0, 0.3, 0.7) : vec3(1.0);
}
void main() {
  if (vA < 0.01) discard;
  float a;
  if (vTipo < 0.5) {
    float ponta = smoothstep(0.0, 0.25, vUv.x) * (1.0 - smoothstep(0.55, 1.0, vUv.x));
    float meio = 1.0 - abs(vUv.y - 0.5) * 2.0;
    a = ponta * (0.35 + 0.65 * meio) * 0.75;
  } else a = 0.9;
  vec3 c = matiz(vM) * (1.0 + 0.4 * exp(-fract(uBat) * 4.0));
  gl_FragColor = vec4(c * a * vA, a * vA);
  ${NEVOA_FRAG}
}`

// ── os desejos ──
const VERT_DESEJO = /* glsl */ `
attribute vec4 aP;   // onde (xyz) e o tamanho (m)
attribute vec4 aD;   // semente, tipo, some a (m), matiz
attribute float aSeg; // quando foi segurado (0 = nunca)
uniform vec3 uC; uniform vec3 uF; uniform float uT; uniform float uDentro; uniform vec3 uSegP; uniform vec3 uSegR;
varying vec2 vUv; varying float vVis; varying float vDis; varying vec4 vD; varying float vSeg;
${NEVOA_VERT_PARS}
void main() {
  vUv = uv; vD = aD;
  vec3 p = aP.xyz;
  vec3 dP = p - uC;
  float d = length(dP.xz);
  float frente = step(-4.0, dot(dP, uF));
  // aparece lá na frente; o vento leva antes de você chegar
  float dis = 1.0 - smoothstep(aD.z - 25.0, aD.z, d);
  float vis = (1.0 - smoothstep(${(OJALA_CFG.aparece - 50).toFixed(1)}, ${OJALA_CFG.aparece.toFixed(1)}, d)) * frente;
  float tam = aP.w;
  vSeg = 0.0;
  if (aSeg > 0.0) {
    // segurado: vem pra janela, fica um instante e vai mesmo assim
    float e = uT - aSeg;
    float vem = smoothstep(0.0, 0.7, e);
    p = mix(p, uSegP + uSegR * (aD.x - 0.5) * 4.0, vem);
    tam = mix(tam, 3.2, vem);
    dis = smoothstep(${OJALA_CFG.segura.toFixed(1)}, ${(OJALA_CFG.segura + 1.6).toFixed(1)}, e);
    vis = 1.0 - step(${(OJALA_CFG.segura + 1.7).toFixed(1)}, e);
    vSeg = 1.0 - dis;
  }
  // levado pelo vento: sobe e vai junto, se espalhando
  p += (uF * 9.0 + vec3(0.0, 4.0, 0.0)) * dis * dis;
  tam *= 1.0 + 0.6 * dis;
  vVis = vis * uDentro; vDis = dis;
  vec4 mvPosition = viewMatrix * vec4(p, 1.0);
  mvPosition.xy += position.xy * tam * step(0.001, vVis) * (1.0 + 0.04 * sin(uT * 3.0 + aD.x * 9.0));
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const FRAG_DESEJO = /* glsl */ `
uniform float uBat; uniform float uT;
varying vec2 vUv; varying float vVis; varying float vDis; varying vec4 vD; varying float vSeg;
${NEVOA_FRAG_PARS}
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float coracao(vec2 p) {
  p.y += 0.45; p.x = abs(p.x);
  if (p.y + p.x > 1.0) return length(p - vec2(0.25, 0.75)) - 0.3536;
  vec2 a = p - vec2(0.0, 1.0), b = p - 0.5 * max(p.x + p.y, 0.0);
  return sqrt(min(dot(a, a), dot(b, b))) * sign(p.x - p.y);
}
float estrela(vec2 p) {
  float an = atan(p.x, p.y), r = length(p);
  float k = 0.5 + 0.5 * cos(an * 5.0);
  return r - mix(0.32, 0.75, pow(k, 3.0));
}
void main() {
  vec2 q = (vUv - 0.5) * 2.0;
  float tipo = vD.y;
  float d;
  if (tipo < 0.5) d = coracao(q * 1.15);
  else if (tipo < 1.5) d = estrela(q);
  else if (tipo < 2.5) { // a pipa (e a rabiola)
    vec2 r = vec2(abs(q.x), q.y - 0.25);
    d = (r.x * 1.0 + abs(r.y) * 0.75) - 0.5;
    float rab = abs(q.x - 0.12 * sin(q.y * 9.0 + uT * 6.0)) - 0.025;
    d = min(d, max(rab, max(q.y + 0.25, -q.y - 0.95)));
  } else if (tipo < 3.5) d = length(q) - 0.7; // a bola
  else d = max(length(q) - 0.72, -(length(q - vec2(0.32, 0.18)) - 0.62)); // a lua
  float corpo = 1.0 - smoothstep(-0.02, 0.02, d);
  float linha = 1.0 - smoothstep(0.0, 0.05, abs(d + 0.04));
  float halo = exp(-max(d, 0.0) * 6.0) * 0.45;
  if (tipo > 2.5 && tipo < 3.5) { // os gomos da bola
    float an = atan(q.y, q.x);
    linha = max(linha, (1.0 - smoothstep(0.0, 0.04, abs(length(q) - 0.32))) * corpo);
    linha = max(linha, (1.0 - smoothstep(0.0, 0.05, abs(fract(an / 6.2832 * 5.0) - 0.5) - 0.44)) * step(0.32, length(q)) * corpo);
  }
  vec3 c = vD.w < 0.3 ? vec3(1.0, 0.82, 0.25) : vD.w < 0.55 ? vec3(0.3, 1.0, 0.55) : vD.w < 0.8 ? vec3(1.0, 0.35, 0.7) : vec3(0.45, 0.65, 1.0);
  float bat = exp(-fract(uBat) * 4.0);
  vec3 cor = c * (0.35 * corpo + 1.4 * linha + halo) * (1.0 + 0.3 * bat + 0.8 * vSeg);
  float a = max(corpo * 0.55, max(linha, halo));
  // o vento leva: a imagem se desfaz em grãos
  float g = h21(floor(vUv * 26.0) + vD.x * 31.0);
  if (g < vDis * 1.15) discard;
  a *= vVis * (1.0 - vDis * 0.5);
  if (a < 0.02) discard;
  gl_FragColor = vec4(cor * vVis, a);
  ${NEVOA_FRAG}
}`

export function Ojala({ M, k, ctx, carro }: PropsManifesto) {
  const C = OJALA_CFG
  const { camera, gl } = useThree()

  // o vento: sorteado uma vez (posições relativas à caixa que segue a Kombi)
  const vento = useMemo(() => {
    const r = semente(1_1800 + k)
    const n = C.fitas + C.confete
    const aW = new Float32Array(n * 4), aW2 = new Float32Array(n * 4)
    for (let i = 0; i < n; i++) {
      const fita = i < C.fitas
      aW.set([r(), (r() * 2 - 1) * (fita ? 1 : 0.8), r(), r()], i * 4)
      aW2.set([fita ? 0 : 1, Math.floor(r() * 4), r(), 6 + r() * 12], i * 4)
    }
    const base = new THREE.PlaneGeometry(1, 1, 12, 1)
    const g = new THREE.InstancedBufferGeometry()
    g.index = base.index
    g.setAttribute("position", base.getAttribute("position"))
    g.setAttribute("uv", base.getAttribute("uv"))
    g.setAttribute("aW", new THREE.InstancedBufferAttribute(aW, 4))
    g.setAttribute("aW2", new THREE.InstancedBufferAttribute(aW2, 4))
    g.instanceCount = n
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT_VENTO, fragmentShader: FRAG_VENTO, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: true,
      blending: THREE.AdditiveBlending,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uC: { value: new THREE.Vector3() }, uF: { value: new THREE.Vector3(1, 0, 0) }, uAv: { value: 0 }, uBat: { value: 0 }, uT: { value: 0 }, uVento: { value: 0 }, uDentro: { value: 0 },
      }]),
    })
    mat.name = "manifesto-ojala-vento"
    const m = new THREE.Mesh(g, mat)
    m.frustumCulled = false
    m.renderOrder = 4
    return { m, mat, g, base }
  }, [k, C.fitas, C.confete])
  useEffect(() => () => { vento.g.dispose(); vento.base.dispose(); vento.mat.dispose() }, [vento])

  // os desejos: ao longo da ida, escritos uma vez
  const desejos = useMemo(() => {
    const v = M.vias[M.pistas[k].ida]
    const r = semente(3_0118 + k)
    const aP: number[] = [], aD: number[] = []
    const pos = new THREE.Vector3()
    const passoI = Math.max(1, Math.round(C.passoDesejo / 2))
    for (let i = 10; i < v.n - 10; i += passoI + Math.floor(r() * 8)) {
      const lado = r() < 0.5 ? -1 : 1
      aoLado(v, i, (MEIA_PISTA + 4 + r() * 14) * lado, 5 + r() * 15, pos)
      aP.push(pos.x, pos.y, pos.z, 3.5 + r() * 5)
      aD.push(r(), Math.floor(r() * 5), C.some[0] + r() * (C.some[1] - C.some[0]), r())
    }
    const n = aP.length / 4
    const base = new THREE.PlaneGeometry(1, 1)
    const g = new THREE.InstancedBufferGeometry()
    g.index = base.index
    g.setAttribute("position", base.getAttribute("position"))
    g.setAttribute("uv", base.getAttribute("uv"))
    g.setAttribute("aP", new THREE.InstancedBufferAttribute(new Float32Array(aP), 4))
    g.setAttribute("aD", new THREE.InstancedBufferAttribute(new Float32Array(aD), 4))
    const seg = new Float32Array(n)
    const aSeg = new THREE.InstancedBufferAttribute(seg, 1).setUsage(THREE.DynamicDrawUsage)
    g.setAttribute("aSeg", aSeg)
    g.instanceCount = n
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT_DESEJO, fragmentShader: FRAG_DESEJO, transparent: true, depthWrite: false, toneMapped: false, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uC: { value: new THREE.Vector3() }, uF: { value: new THREE.Vector3(1, 0, 0) }, uT: { value: 0 }, uBat: { value: 0 }, uDentro: { value: 0 },
        uSegP: { value: new THREE.Vector3() }, uSegR: { value: new THREE.Vector3(1, 0, 0) },
      }]),
    })
    mat.name = "manifesto-ojala-desejos"
    const m = new THREE.Mesh(g, mat)
    m.frustumCulled = false
    m.renderOrder = 3
    return { m, mat, g, base, aP, aD, seg, aSeg, n }
  }, [M, k, C.passoDesejo, C.some])
  useEffect(() => () => { desejos.g.dispose(); desejos.base.dispose(); desejos.mat.dispose() }, [desejos])

  const st = useRef({ i: -1, av: 0, c: new THREE.Vector3(), f: new THREE.Vector3(1, 0, 0), ok: false, cf: new THREE.Vector3(), cr: new THREE.Vector3() }).current

  // tocar num desejo que está sumindo: segura por um instante
  useEffect(() => {
    const el = gl.domElement
    const v = new THREE.Vector3()
    const tocar = (ev: PointerEvent) => {
      if (ctx.dentro < 0.5 || !st.ok) return
      const rc = el.getBoundingClientRect()
      const px = ev.clientX - rc.left, py = ev.clientY - rc.top
      const P = desejos.aP, D = desejos.aD
      let melhor = -1, dMin = C.raioToque * C.raioToque
      for (let i = 0; i < desejos.n; i++) {
        if (desejos.seg[i] > 0) continue
        const dx = P[i * 4] - st.c.x, dz = P[i * 4 + 2] - st.c.z
        const d = Math.hypot(dx, dz)
        // só os que estão à vista (o mesmo do shader, sem o grão)
        if (d > C.aparece - 10 || d < D[i * 4 + 2] - 25 || dx * st.f.x + dz * st.f.z < -4) continue
        v.set(P[i * 4], P[i * 4 + 1], P[i * 4 + 2]).project(camera)
        if (v.z < -1 || v.z > 1) continue
        const sx = (v.x * 0.5 + 0.5) * rc.width, sy = (-v.y * 0.5 + 0.5) * rc.height
        const dd = (sx - px) ** 2 + (sy - py) ** 2
        if (dd < dMin) { dMin = dd; melhor = i }
      }
      if (melhor < 0) return
      desejos.seg[melhor] = Math.max(0.001, ctx.relogio)
      desejos.aSeg.needsUpdate = true
    }
    el.addEventListener("pointerdown", tocar)
    return () => el.removeEventListener("pointerdown", tocar)
  }, [gl, camera, desejos, ctx, st, C.raioToque, C.aparece])

  useFrame((_, dtCru) => {
    const dt = Math.min(0.1, dtCru)
    const car = carro.current
    if (car) {
      const me = car.matrixWorld.elements
      st.c.set(me[12], me[13], me[14])
      // o rumo: a tangente da ida perto da Kombi, no sentido em que ela anda
      const v = M.vias[M.pistas[k].ida]
      st.i = amostraPerto(v, st.c.x, st.c.z, st.i)
      const sen = ctx.via === M.pistas[k].volta ? -1 : 1
      st.f.set(v.tx[st.i] * sen, 0, v.tz[st.i] * sen)
      st.ok = true
    }
    // o vento corre mais que a Kombi: a caixa avança no vento relativo
    st.av += dt * (12 + 0.4 * ctx.v)
    const forca = (0.3 + 0.7 * THREE.MathUtils.smoothstep(ctx.prog, 0, 0.9)) * (0.7 + 0.3 * Math.min(1.5, ctx.mult))
    const V = vento.mat.uniforms
    V.uC.value.copy(st.c)
    V.uF.value.copy(st.f)
    V.uAv.value = st.av
    V.uBat.value = ctx.batida
    V.uT.value = ctx.relogio
    V.uVento.value = forca
    V.uDentro.value = ctx.dentro
    const D = desejos.mat.uniforms
    D.uC.value.copy(st.c)
    D.uF.value.copy(st.f)
    D.uT.value = ctx.relogio
    D.uBat.value = ctx.batida
    D.uDentro.value = ctx.dentro
    // a janela: ao lado e à frente da câmera, onde o desejo segurado fica
    camera.getWorldDirection(st.cf)
    st.cr.set(-st.cf.z, 0, st.cf.x).normalize()
    ;(D.uSegP.value as THREE.Vector3).copy(camera.position).addScaledVector(st.cf, 16).addScaledVector(st.cr, 5).add(UP)
    ;(D.uSegR.value as THREE.Vector3).copy(st.cr)
  })

  return (
    <>
      <primitive object={desejos.m} />
      <primitive object={vento.m} />
    </>
  )
}

const UP = new THREE.Vector3(0, 2.5, 0)
