"use client"

// COPO AMERICANO (faixa 2 do disco, o Mubarak): o que enche e esvazia.
//
// - copos americanos gigantes (o clássico do bar, facetado embaixo e liso na
//   boca) nos canteiros e nos prédios ao longo da rua, enchendo de líquido
//   luminoso: o nível sobe ao longo da faixa e respira no compasso; bolhas sobem
// - acelerar muito (turbo, bem acima do ritmo, pé no fundo) enche além da
//   conta: os copos transbordam, o líquido escorre pelo vidro e a rua fica
//   "embriagada" (a câmera balança de leve, o horizonte oscila, bem sutil)
// - desacelerar / frear esvazia (e a rua volta a ficar sóbria, devagar)
// - tocar num copo faz um brinde: os copos perto se inclinam pra ele, tilintam
//   e brilham juntos, numa onda que sai do copo tocado
//
// Custo: 1 InstancedMesh (~180 copos × ~70 vértices; a superfície do líquido é
// a tampa do cilindro, descida no vertex shader), 1 ShaderMaterial, sem
// textura, sem luz. Matrizes escritas UMA vez; por quadro só uniforms (e, no
// porre, 2 rotações na câmera, desfeitas se ninguém mais mexer nela). O toque
// projeta os copos só no momento do toque.

import { useEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { PropsManifesto } from "./tipos"
import { MEIA_PISTA, NEVOA_FRAG, NEVOA_FRAG_PARS, NEVOA_VERT_PARS, aoLado, semente } from "./comum"

export const COPO_CFG = {
  passo: 15, // m entre os pontos de copo
  altura: 2.6, // altura ÷ raio da boca (o copo americano: 9 cm × 3,5 cm)
  encheFaixa: [0.3, 0.75] as [number, number], // o nível no começo e no fim da faixa (só no ritmo)
  enche: 0.16, // por segundo, acelerando muito
  esvazia: 0.4, // por segundo, freando/desacelerando
  porreSobe: 0.45, // por segundo transbordando
  porreDesce: 0.1, // por segundo sóbrio
  roll: 0.014, // rad: o horizonte no porre cheio (sutil)
  raioToque: 80, // px
  raioBrinde: 48, // m: os copos que entram no brinde
}

const VERT = /* glsl */ `
attribute vec4 aD; // semente, matiz (0 âmbar, 1 rosa, 2 ciano), fase, sede (quanto ele enche a mais)
uniform float uCheio; uniform float uBat; uniform float uT; uniform float uDentro;
uniform vec3 uBrindeP; uniform float uBrindeT;
varying vec3 vVista; varying vec3 vN; varying float vY; varying float vAng; varying float vTampa; varying float vNivel; varying float vBrinde; varying vec4 vD;
${NEVOA_VERT_PARS}
void main() {
  vD = aD;
  // o nível deste copo: o da rua, a sede dele e a respiração no compasso
  float nivel = uCheio * (0.8 + 0.45 * aD.w) + 0.07 * sin(uBat * 1.5708 + aD.z * 6.2832) + 0.03 * exp(-fract(uBat) * 4.0);
  vNivel = nivel;
  vec3 p = position;
  vTampa = 0.0;
  if (normal.y > 0.5) {
    // a tampa vira a superfície do líquido: desce até o nível e encolhe com o vidro
    float l = clamp(nivel, 0.0, 1.0);
    p.y = l;
    p.xz *= mix(0.8, 1.0, l) * 0.97;
    vTampa = 1.0;
  }
  vY = p.y;
  vAng = atan(position.z, position.x);
  vec3 base = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float alt = length(instanceMatrix[1].xyz);
  vec4 wp = instanceMatrix * vec4(p * uDentro, 1.0);
  // o brinde: uma onda sai do copo tocado; os copos perto se inclinam pra ele e tilintam
  vec3 dP = uBrindeP - base;
  float d = length(dP.xz);
  float e = uT - uBrindeT - d / 40.0;
  float bk = e > 0.0 ? exp(-e * 2.2) * smoothstep(0.0, 0.3, e) * (1.0 - smoothstep(10.0, ${COPO_CFG.raioBrinde.toFixed(1)}, d)) : 0.0;
  vBrinde = bk;
  vec2 dir = d > 0.5 ? dP.xz / d : vec2(0.0);
  float h = (wp.y - base.y) / max(alt, 0.01);
  wp.xz += dir * h * alt * 0.22 * bk;
  wp.x += sin(uT * 55.0 + aD.x * 30.0) * 0.02 * alt * h * bk;
  vec4 mvPosition = viewMatrix * modelMatrix * wp;
  vVista = mvPosition.xyz;
  vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`

const FRAG = /* glsl */ `
uniform float uBat; uniform float uT; uniform float uPorre;
varying vec3 vVista; varying vec3 vN; varying float vY; varying float vAng; varying float vTampa; varying float vNivel; varying float vBrinde; varying vec4 vD;
${NEVOA_FRAG_PARS}
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  float bat = exp(-fract(uBat) * 4.0);
  vec3 liq = vD.y < 0.5 ? vec3(1.0, 0.68, 0.22) : vD.y < 1.5 ? vec3(1.0, 0.3, 0.6) : vec3(0.3, 0.85, 1.0);
  vec3 V = normalize(-vVista);
  if (vTampa > 0.5) {
    // a superfície do líquido: pisca na batida, mais agitada no porre
    if (vNivel < 0.03) discard;
    float onda = 0.5 + 0.5 * sin(uT * 3.0 + vD.x * 20.0 + uPorre * sin(uT * 7.0) * 3.0);
    vec3 c = liq * (0.9 + 0.5 * bat + 0.25 * onda) + vec3(1.0) * vBrinde * 0.8;
    gl_FragColor = vec4(c, 0.85);
    ${NEVOA_FRAG}
    return;
  }
  // o vidro: facetado embaixo (a normal do triângulo), liso na boca
  vec3 nf = normalize(cross(dFdx(vVista), dFdy(vVista)));
  vec3 n = vY < 0.72 ? nf : normalize(vN);
  float fres = pow(1.0 - abs(dot(n, V)), 2.0);
  float fac = fract(vAng / 6.28318 * 16.0);
  float aresta = (1.0 - smoothstep(0.0, 0.06, min(fac, 1.0 - fac))) * step(vY, 0.72);
  float boca = 1.0 - smoothstep(0.0, 0.02, abs(vY - 0.985));
  float faixa = 1.0 - smoothstep(0.0, 0.012, abs(vY - 0.72));
  float fundo = 1.0 - smoothstep(0.06, 0.1, vY);
  vec3 vidro = vec3(0.75, 0.9, 1.0);
  vec3 cor = vidro * (0.06 + 0.7 * fres + 0.45 * aresta + 0.8 * boca + 0.35 * faixa + 0.2 * fundo);
  float a = 0.1 + 0.55 * fres + 0.4 * max(aresta, max(boca, faixa));
  // o líquido: até o nível, com a superfície balançando e bolhas subindo
  float sup = vNivel + 0.012 * sin(vAng * 3.0 + uT * 2.2) * (1.0 + 3.0 * uPorre);
  if (vY < sup) {
    vec2 g = vec2(vAng * 4.0, vY * 9.0 - uT * (0.8 + vD.x));
    vec2 cel = floor(g), f = fract(g) - 0.5;
    float h = h21(cel + vD.x * 13.0);
    float bolha = step(0.72, h) * (1.0 - smoothstep(0.05, 0.11, length(f + vec2(0.0, (h - 0.86) * 0.6))));
    float topo = 1.0 - smoothstep(0.0, 0.04, sup - vY);
    vec3 c = liq * (0.55 + 0.45 * bat + 0.8 * topo + 0.6 * bolha);
    cor = mix(cor, c, 0.8); a = max(a, 0.72);
  }
  // transbordou: o líquido escorre por fora do vidro
  float transb = clamp(vNivel - 1.0, 0.0, 0.4) / 0.4;
  if (transb > 0.0) {
    float col = floor(vAng / 6.28318 * 22.0);
    float hc = h21(vec2(col, vD.x * 7.0));
    float fx = fract(vAng / 6.28318 * 22.0);
    float compr = transb * (0.3 + 0.7 * hc);
    float fio = (1.0 - smoothstep(0.08, 0.2, abs(fx - 0.5))) * step(1.0 - compr, vY) * step(0.35, hc);
    float pulso = 0.6 + 0.4 * sin(vY * 30.0 + uT * 6.0);
    cor = mix(cor, liq * (1.2 + bat) * pulso, fio); a = max(a, fio * 0.9);
  }
  // o brinde: tudo acende e a boca tilinta
  cor += (vidro * 0.5 + liq * 0.4) * vBrinde * (0.6 + 1.5 * boca);
  a = min(1.0, a + 0.3 * vBrinde);
  gl_FragColor = vec4(cor, a);
  ${NEVOA_FRAG}
}`

const reduzMovimento = () => {
  try { return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches } catch { return false }
}

export function CopoAmericano({ M, k, ctx }: PropsManifesto) {
  const C = COPO_CFG
  const { camera, gl } = useThree()

  // os copos: escritos uma vez, ao longo da ida
  const copos = useMemo(() => {
    const v = M.vias[M.pistas[k].ida]
    const r = semente(8_0174 + k)
    const mats: THREE.Matrix4[] = [], dados: number[] = [], centros: THREE.Vector3[] = []
    const pos = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler(), esc = new THREE.Vector3()
    const passoI = Math.max(1, Math.round(C.passo / 2))
    for (let i = 8; i < v.n - 8; i += passoI + Math.floor(r() * 4)) {
      const lado = r() < 0.5 ? -1 : 1
      const predio = r() < 0.55
      const raio = predio ? 1.8 + r() * 2.8 : 0.5 + r() * 0.5
      const lat = predio ? MEIA_PISTA + 7 + r() * 18 : MEIA_PISTA + 1.6 + r() * 2
      aoLado(v, i, lat * lado, predio ? 6 + r() * 26 : 0, pos)
      e.set(0, r() * Math.PI * 2, 0)
      q.setFromEuler(e)
      esc.set(raio, raio * C.altura, raio)
      mats.push(new THREE.Matrix4().compose(pos, q, esc))
      centros.push(pos.clone().setY(pos.y + raio * C.altura * 0.5))
      const m = r()
      dados.push(r(), m < 0.6 ? 0 : m < 0.8 ? 1 : 2, r(), r())
    }
    return { mats, dados, centros }
  }, [M, k, C.passo, C.altura])

  const obj = useMemo(() => {
    const n = copos.mats.length
    // o copo: boca raio 1, fundo 0,8, altura 1 (a escala dá a altura), com tampas
    const g = new THREE.CylinderGeometry(1, 0.8, 1, 16, 1, false)
    g.translate(0, 0.5, 0)
    g.setAttribute("aD", new THREE.InstancedBufferAttribute(new Float32Array(copos.dados), 4))
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uCheio: { value: 0 }, uBat: { value: 0 }, uT: { value: 0 }, uDentro: { value: 0 }, uPorre: { value: 0 },
        uBrindeP: { value: new THREE.Vector3(0, -1e5, 0) }, uBrindeT: { value: -99 },
      }]),
    })
    mat.name = "manifesto-copo"
    const m = new THREE.InstancedMesh(g, mat, n)
    for (let i = 0; i < n; i++) m.setMatrixAt(i, copos.mats[i])
    m.instanceMatrix.needsUpdate = true
    m.frustumCulled = false
    m.renderOrder = 3
    return { m, mat }
  }, [copos])
  useEffect(() => () => { obj.m.geometry.dispose(); obj.mat.dispose(); obj.m.dispose() }, [obj])

  // o nível da rua, o porre e a rotação que a rua pôs na câmera no quadro passado
  const st = useRef({ cheio: 0.2, porre: 0, roll: 0, yaw: 0, qDepois: new THREE.Quaternion(), reduz: reduzMovimento() }).current

  // o brinde: no toque, o copo mais perto do dedo (projeção só agora)
  useEffect(() => {
    const el = gl.domElement
    const v = new THREE.Vector3()
    const tocar = (ev: PointerEvent) => {
      if (ctx.dentro < 0.5) return
      const rc = el.getBoundingClientRect()
      const px = ev.clientX - rc.left, py = ev.clientY - rc.top
      let melhor = -1, dMin = C.raioToque * C.raioToque
      for (let i = 0; i < copos.centros.length; i++) {
        v.copy(copos.centros[i]).project(camera)
        if (v.z < -1 || v.z > 1) continue
        const sx = (v.x * 0.5 + 0.5) * rc.width, sy = (-v.y * 0.5 + 0.5) * rc.height
        const d = (sx - px) ** 2 + (sy - py) ** 2
        if (d < dMin) { dMin = d; melhor = i }
      }
      if (melhor < 0) return
      const U = obj.mat.uniforms
      const me = copos.mats[melhor].elements
      ;(U.uBrindeP.value as THREE.Vector3).set(me[12], me[13], me[14])
      U.uBrindeT.value = ctx.relogio
    }
    el.addEventListener("pointerdown", tocar)
    return () => el.removeEventListener("pointerdown", tocar)
  }, [gl, camera, copos, obj, ctx, C.raioToque])

  // saiu da rua: devolve a câmera (se ninguém mexeu nela depois)
  useEffect(() => () => {
    if (camera.quaternion.equals(st.qDepois)) { camera.rotateY(-st.yaw); camera.rotateZ(-st.roll) }
  }, [camera, st])

  useFrame((_, dtCru) => {
    const dt = Math.min(0.1, dtCru)
    // no ritmo: o nível vai subindo com a faixa
    const ritmo = C.encheFaixa[0] + (C.encheFaixa[1] - C.encheFaixa[0]) * ctx.prog
    const muito = ctx.turbo || ctx.mult > 1.2 || ctx.acel > 3.5
    const solta = ctx.freio || ctx.acel < -2 || ctx.mult < 0.75
    if (muito) st.cheio = Math.min(1.4, st.cheio + dt * (C.enche + 0.25 * Math.max(0, ctx.mult - 1.2)))
    else if (solta) st.cheio = Math.max(0.03, st.cheio - dt * C.esvazia)
    else st.cheio += (ritmo - st.cheio) * Math.min(1, dt * 0.25)
    // transbordou: a rua fica embriagada; sóbria devagar
    const transb = st.cheio > 1.02
    st.porre = transb ? Math.min(1, st.porre + dt * C.porreSobe) : Math.max(0, st.porre - dt * C.porreDesce)

    const U = obj.mat.uniforms
    U.uCheio.value = st.cheio
    U.uBat.value = ctx.batida
    U.uT.value = ctx.relogio
    U.uDentro.value = ctx.dentro
    U.uPorre.value = st.porre

    // o horizonte embriagado: o jogo põe a câmera no lugar todo quadro (lookAt);
    // se não pôs (a câmera é a mesma do quadro passado), desfaz o nosso antes
    if (camera.quaternion.equals(st.qDepois)) { camera.rotateY(-st.yaw); camera.rotateZ(-st.roll) }
    const p = st.reduz ? 0 : st.porre * ctx.dentro
    const b = ctx.batida * Math.PI
    st.roll = p * C.roll * Math.sin(b / 4)
    st.yaw = p * C.roll * 0.4 * Math.sin(b / 6 + 1.3)
    if (st.roll !== 0 || st.yaw !== 0) { camera.rotateZ(st.roll); camera.rotateY(st.yaw) }
    st.qDepois.copy(camera.quaternion)
  })

  return <primitive object={obj.m} />
}
