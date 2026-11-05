"use client"

// NECTAR (o LU2CA, "as flores"): a letra e as flores,
// tentativa e erro.
//
// - palavras soltas da letra (letras.ts: a estrofe da missão de escrever a
//   letra da Nectar; se não houver, palavras curtas neutras) flutuam como
//   pétalas ao longo da rua, girando e virando
// - de tempos em tempos (a cada 4 compassos, cada grupo no seu tempo) as
//   palavras de um grupo se juntam num verso. Às vezes o verso dá certo (fica
//   reto e acende quente) e às vezes não (torto, tremendo, apagado). Dando certo
//   ou não, ele se desfaz, e elas voltam a ser pétalas (tentativa e erro)
// - flores abrem e murcham no compasso, numa onda que corre a rua; perto de um
//   verso que deu certo, elas abrem mais
// - tocar numa palavra a prende no céu: ela sobe e vira parte de um verso lá
//   em cima, que fica até o fim da volta (quando a faixa recomeça, ele se apaga)
//
// Custo: 2 desenhos (palavras ~150 quads, flores ~300 quads; os dois sempre de
// frente pra câmera), 2 ShaderMaterial, 1 textura pequena (as palavras
// escritas uma vez num canvas de 1024 px), sem luz. Por quadro só uniforms (e
// o ponto do céu: 2 vetores). O toque calcula as palavras só no momento do toque.

import { useEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { LETRAS } from "../../disco/letras"
import type { PropsManifesto } from "./tipos"
import { MEIA_PISTA, NEVOA_FRAG, NEVOA_FRAG_PARS, NEVOA_VERT_PARS, aoLado, semente } from "./comum"

export const NECTAR_CFG = {
  passoVerso: 30, // m entre os grupos de palavras
  passoFlor: 7, // m entre as flores
  cicloVerso: 16, // batidas: juntar, tentar, desfazer
  erro: 0.55, // a chance de um verso não dar certo
  tamCeu: 6, // m: a altura de uma palavra presa no céu
  larguraCeu: 9, // palavras de largura (em alturas) por linha no céu
  presasMax: 12,
  raioToque: 90, // px
  maxPalavras: 40,
}

/** palavras curtas neutras, se a letra não estiver no código */
const NEUTRAS = ["flor", "chuva", "néctar", "raiz", "semente", "mel", "gota", "verso", "luz", "abre", "cai", "tenta", "erra", "de novo", "cresce", "noite", "cedo", "tarde", "volta", "fica"]

function palavrasDaLetra(max: number): string[] {
  const conf = LETRAS.nectar
  const vistas = new Set<string>()
  const out: string[] = []
  const todas = conf ? conf.versos.flatMap((v) => v.opcoes.join(" ").split(/\s+/)) : []
  for (const cru of [...todas, ...NEUTRAS]) {
    const p = cru.toLowerCase().replace(/[^\p{L}\s-]/gu, "")
    if (p.length < 3 || p.length > 10 || vistas.has(p)) continue
    vistas.add(p)
    out.push(p)
    if (out.length >= max) break
  }
  return out
}

/** as palavras escritas num canvas (2 colunas de 512 × 64 px) */
function atlasDas(palavras: string[]) {
  const LIN = 64, COL = 512
  const linhas = Math.ceil(palavras.length / 2)
  const H = THREE.MathUtils.ceilPowerOfTwo(Math.max(64, linhas * LIN))
  const cv = document.createElement("canvas")
  cv.width = 1024; cv.height = H
  const g = cv.getContext("2d")!
  g.fillStyle = "#fff"
  g.textBaseline = "middle"
  g.font = "600 44px system-ui, -apple-system, 'Segoe UI', sans-serif"
  const uv: number[][] = [] // u0, v0, du, dv, aspecto
  palavras.forEach((p, i) => {
    const col = i % 2, lin = Math.floor(i / 2)
    const w = Math.min(COL - 16, Math.ceil(g.measureText(p).width) + 12)
    g.fillText(p, col * COL + 6, lin * LIN + LIN / 2 + 2, COL - 20)
    uv.push([(col * COL) / 1024, 1 - ((lin + 1) * LIN) / H, w / 1024, LIN / H, w / LIN])
  })
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.anisotropy = 4
  return { tex, uv }
}

const COMUM_GLSL = /* glsl */ `
float h11(float x) { return fract(sin(x * 91.345) * 47453.5453); }
// o verso do grupo g agora: junta (0–1) e erro (0/1)
vec2 verso(float g, float bat) {
  float ciclo = (bat + g * 5.0) / ${NECTAR_CFG.cicloVerso.toFixed(1)};
  float f = fract(ciclo);
  float erro = step(1.0 - ${NECTAR_CFG.erro.toFixed(2)}, h11(floor(ciclo) + g * 17.0));
  float junta = smoothstep(0.08, 0.3, f) * (1.0 - smoothstep(mix(0.62, 0.45, erro), mix(0.8, 0.6, erro), f));
  return vec2(junta * mix(1.0, 0.85, erro), erro);
}`

// ── as palavras ──
const VERT_PAL = /* glsl */ `
attribute vec4 aCasa;   // onde ela flutua (xyz) e o tamanho (m)
attribute vec4 aUV;     // o retângulo dela no canvas
attribute vec4 aD;      // semente, grupo, posição no verso (em alturas, centro), aspecto
attribute vec3 aCentro; // o centro do verso do grupo
attribute vec4 aCeu;    // presa no céu: x, y (m), quando, presa (1)
uniform float uT; uniform float uBat; uniform float uDentro; uniform float uSoltaT; uniform float uTamCeu;
uniform vec3 uCeuC; uniform vec3 uCeuR;
varying vec2 vUv; varying float vA; varying float vCerto; varying float vErro; varying float vCeu;
${NEVOA_VERT_PARS}
${COMUM_GLSL}
void main() {
  float s = aD.x;
  float tam = aCasa.w;
  // a pétala: deriva, gira e vira
  vec3 wp = aCasa.xyz + vec3(sin(uT * 0.5 + s * 6.3) * 1.4, sin(uT * 0.37 + s * 9.1) * 0.9, cos(uT * 0.43 + s * 4.7) * 1.4);
  float rot = sin(uT * 1.3 + s * 7.0) * 0.45;
  float vira = 0.3 + 0.7 * abs(cos(uT * 0.9 + s * 5.0));
  // o verso: tentativa e erro
  vec2 vs = verso(aD.y, uBat);
  float junta = vs.x, erro = vs.y;
  vec4 mvCasa = viewMatrix * vec4(wp, 1.0);
  vec4 mvVerso = viewMatrix * vec4(aCentro, 1.0) + vec4(aD.z * tam, erro * (h11(s * 31.0) - 0.5) * tam * 0.9, 0.0, 0.0);
  mvVerso.xy += erro * 0.07 * tam * vec2(sin(uT * 40.0 + s * 50.0), cos(uT * 37.0 + s * 20.0));
  vec4 mv = mix(mvCasa, mvVerso, junta);
  rot *= 1.0 - junta * (1.0 - 0.6 * erro);
  vira = mix(vira, 1.0, junta);
  // presa no céu
  float ceu = 0.0, solta = 1.0;
  if (aCeu.w > 0.5) {
    ceu = smoothstep(0.0, 1.8, uT - aCeu.z);
    vec4 mvc = viewMatrix * vec4(uCeuC + uCeuR * aCeu.x + vec3(0.0, aCeu.y, 0.0), 1.0);
    mv = mix(mv, mvc, ceu);
    mv.y += sin(ceu * 3.14159) * 6.0; // sobe num arco
    tam = mix(tam, uTamCeu, ceu);
    rot *= 1.0 - ceu;
    vira = mix(vira, 1.0, ceu);
    if (uSoltaT > aCeu.z) solta = 1.0 - smoothstep(0.0, 2.0, uT - uSoltaT);
  }
  vec2 c = position.xy * vec2(aD.w * vira, 1.0) * tam;
  c = mat2(cos(rot), sin(rot), -sin(rot), cos(rot)) * c;
  mv.xy += c * uDentro;
  vUv = vec2(aUV.x + uv.x * aUV.z, aUV.y + uv.y * aUV.w);
  vCerto = junta * (1.0 - erro);
  vErro = junta * erro;
  vCeu = ceu;
  vA = uDentro * solta;
  vec4 mvPosition = mv;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const FRAG_PAL = /* glsl */ `
uniform sampler2D uAtlas; uniform float uBat; uniform float uT;
varying vec2 vUv; varying float vA; varying float vCerto; varying float vErro; varying float vCeu;
${NEVOA_FRAG_PARS}
void main() {
  float a = texture2D(uAtlas, vUv).a * vA;
  if (a < 0.04) discard;
  float bat = exp(-fract(uBat) * 4.0);
  vec3 petala = vec3(1.0, 0.78, 0.9);
  vec3 cor = petala * 0.9;
  cor = mix(cor, vec3(1.0, 0.82, 0.4) * (1.5 + 0.6 * bat), vCerto);                       // deu certo: o mel
  cor = mix(cor, vec3(0.55, 0.5, 0.7) * (0.6 + 0.3 * sin(uT * 23.0)), vErro);            // não deu: apaga e treme
  cor = mix(cor, vec3(1.0, 0.95, 0.8) * (1.6 + 0.4 * bat), vCeu);                         // no céu
  gl_FragColor = vec4(cor, a * mix(0.85, 1.0, max(vCerto, vCeu)));
  ${NEVOA_FRAG}
}`

// ── as flores ──
const VERT_FLOR = /* glsl */ `
attribute vec4 aF; // onde (xyz) e o tamanho (m)
attribute vec4 aD; // semente, fase no compasso, matiz, grupo mais perto
uniform float uBat; uniform float uDentro;
varying vec2 vUv; varying float vAbre; varying float vMurcha; varying vec4 vD;
${NEVOA_VERT_PARS}
${COMUM_GLSL}
void main() {
  vUv = uv; vD = aD;
  // abre e murcha no compasso (4 batidas), numa onda que corre a rua
  float c = fract(uBat / 4.0 + aD.y);
  float abre = pow(sin(3.14159 * clamp(c / 0.55, 0.0, 1.0)), 0.6) * step(c, 0.55);
  float murcha = smoothstep(0.35, 0.75, c);
  // perto de um verso que deu certo, abre mais
  vec2 vs = verso(aD.w, uBat);
  float certo = vs.x * (1.0 - vs.y) * step(-50.0, aD.w);
  vAbre = max(abre, certo);
  vMurcha = murcha * (1.0 - certo);
  float t = aF.w * uDentro * (1.0 + 0.25 * certo);
  vec4 mvPosition = viewMatrix * vec4(aF.xyz + vec3(0.0, aF.w * 0.5, 0.0), 1.0);
  mvPosition.xy += position.xy * t;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const FRAG_FLOR = /* glsl */ `
uniform float uBat;
varying vec2 vUv; varying float vAbre; varying float vMurcha; varying vec4 vD;
${NEVOA_FRAG_PARS}
void main() {
  vec2 q = vUv * 2.0 - 1.0;
  float s = vD.x;
  vec3 c = vD.z < 0.4 ? vec3(1.0, 0.75, 0.25) : vD.z < 0.75 ? vec3(1.0, 0.35, 0.65) : vec3(0.7, 0.45, 1.0);
  float cor_a = 0.0; vec3 cor = vec3(0.0);
  // a haste
  float haste = (1.0 - smoothstep(0.02, 0.04, abs(q.x - 0.06 * sin(q.y * 3.0 + s * 9.0)))) * step(q.y, 0.1) * step(-1.0, q.y);
  cor += vec3(0.3, 0.9, 0.5) * haste * 0.7; cor_a = max(cor_a, haste * 0.8);
  // a cabeça: pétalas que abrem e, murchando, caem pra baixo
  vec2 p = q - vec2(0.0, 0.25);
  p.y += vMurcha * 0.9 * dot(p, p);
  float r = length(p), an = atan(p.y, p.x);
  float n = 7.0 + floor(s * 3.0);
  float R = 0.12 + 0.55 * vAbre;
  float forma = R * (0.55 + 0.45 * abs(cos(an * n * 0.5 + s * 6.0)));
  float petala = 1.0 - smoothstep(forma - 0.02, forma + 0.02, r);
  float miolo = 1.0 - smoothstep(0.05, 0.09, r);
  float bat = exp(-fract(uBat) * 4.0);
  vec3 cp = mix(c * (1.0 + 0.5 * bat), c * vec3(0.5, 0.35, 0.3), vMurcha) * (0.7 + 0.5 * r / max(R, 0.01));
  cor = mix(cor, cp, petala); cor_a = max(cor_a, petala * mix(0.92, 0.55, vMurcha));
  cor = mix(cor, vec3(1.0, 0.85, 0.4) * 1.6, miolo); cor_a = max(cor_a, miolo);
  // uma pétala caindo
  float queda = fract(uBat / 4.0 + vD.y + 0.3);
  vec2 pq = q - vec2(0.35 * sin(queda * 6.0 + s * 9.0), 0.25 - queda * 1.2);
  float caindo = (1.0 - smoothstep(0.0, 0.03, length(pq * vec2(1.0, 1.8)) - 0.06)) * vMurcha;
  cor = mix(cor, c * 0.8, caindo); cor_a = max(cor_a, caindo * 0.7);
  float halo = exp(-r * 4.0) * vAbre * 0.25;
  cor += c * halo; cor_a = max(cor_a, halo);
  if (cor_a < 0.03) discard;
  gl_FragColor = vec4(cor, cor_a);
  ${NEVOA_FRAG}
}`

export function Nectar({ M, k, ctx }: PropsManifesto) {
  const C = NECTAR_CFG
  const { camera, gl } = useThree()

  // as palavras, os grupos (versos) e as flores: escritos uma vez
  const mundo = useMemo(() => {
    const palavras = palavrasDaLetra(C.maxPalavras)
    const atlas = atlasDas(palavras)
    const v = M.vias[M.pistas[k].ida]
    const r = semente(9_7979 + k)
    const casa: number[] = [], uvs: number[] = [], dados: number[] = [], centro: number[] = []
    const centros: THREE.Vector3[] = []
    const pos = new THREE.Vector3()
    const passoV = Math.max(1, Math.round(C.passoVerso / 2))
    let g = 0
    for (let i = 10; i < v.n - 10; i += passoV + Math.floor(r() * 6), g++) {
      const lado = r() < 0.5 ? -1 : 1
      aoLado(v, i, (MEIA_PISTA + 3 + r() * 10) * lado, 4 + r() * 9, pos)
      const cx = pos.x, cy = pos.y, cz = pos.z
      centros.push(pos.clone())
      const tam = 1 + r() * 0.6
      const n = 4 + Math.floor(r() * 3)
      const esc: number[] = []
      for (let j = 0; j < n; j++) esc.push(Math.floor(r() * palavras.length))
      // a posição de cada palavra no verso (em alturas, centradas)
      const larg = esc.map((p) => atlas.uv[p][4] + 0.4)
      const total = larg.reduce((a, b) => a + b, 0)
      let x = -total / 2
      for (let j = 0; j < n; j++) {
        const p = esc[j], u = atlas.uv[p]
        casa.push(cx + (r() - 0.5) * 9, cy + (r() - 0.5) * 5, cz + (r() - 0.5) * 9, tam)
        uvs.push(u[0], u[1], u[2], u[3])
        dados.push(r(), g, x + larg[j] / 2, u[4])
        centro.push(cx, cy, cz)
        x += larg[j]
      }
    }
    // as flores: canteiros e um pouco de fachada; a fase corre a rua (a onda)
    const flores: number[] = [], dFlor: number[] = []
    const passoF = Math.max(1, Math.round(C.passoFlor / 2))
    for (let i = 6; i < v.n - 6; i += passoF + Math.floor(r() * 3)) {
      const lado = r() < 0.5 ? -1 : 1
      const fach = r() < 0.3
      aoLado(v, i, (MEIA_PISTA + (fach ? 6 + r() * 12 : 1.2 + r() * 3.5)) * lado, fach ? 3 + r() * 18 : 0, pos)
      flores.push(pos.x, pos.y, pos.z, fach ? 2 + r() * 1.6 : 1.1 + r() * 1.5)
      // o grupo mais perto
      let gm = 0, dm = Infinity
      for (let c = 0; c < centros.length; c++) { const d = centros[c].distanceToSquared(pos); if (d < dm) { dm = d; gm = c } }
      dFlor.push(r(), ((i / v.n) * 3 + r() * 0.15) % 1, r(), dm < 40 * 40 ? gm : -100)
    }
    return { palavras, atlas, casa, uvs, dados, centro, flores, dFlor }
  }, [M, k, C.passoVerso, C.passoFlor, C.maxPalavras])

  const pal = useMemo(() => {
    const n = mundo.dados.length / 4
    const base = new THREE.PlaneGeometry(1, 1)
    const g = new THREE.InstancedBufferGeometry()
    g.index = base.index
    g.setAttribute("position", base.getAttribute("position"))
    g.setAttribute("uv", base.getAttribute("uv"))
    g.setAttribute("aCasa", new THREE.InstancedBufferAttribute(new Float32Array(mundo.casa), 4))
    g.setAttribute("aUV", new THREE.InstancedBufferAttribute(new Float32Array(mundo.uvs), 4))
    g.setAttribute("aD", new THREE.InstancedBufferAttribute(new Float32Array(mundo.dados), 4))
    g.setAttribute("aCentro", new THREE.InstancedBufferAttribute(new Float32Array(mundo.centro), 3))
    const ceu = new Float32Array(n * 4)
    const aCeu = new THREE.InstancedBufferAttribute(ceu, 4).setUsage(THREE.DynamicDrawUsage)
    g.setAttribute("aCeu", aCeu)
    g.instanceCount = n
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT_PAL, fragmentShader: FRAG_PAL, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uT: { value: 0 }, uBat: { value: 0 }, uDentro: { value: 0 }, uSoltaT: { value: -99 }, uTamCeu: { value: C.tamCeu },
        uCeuC: { value: new THREE.Vector3() }, uCeuR: { value: new THREE.Vector3(1, 0, 0) },
      }]),
    })
    mat.uniforms.uAtlas = { value: mundo.atlas.tex } // fora do merge (ele clonaria a textura)
    mat.name = "manifesto-nectar-palavras"
    const m = new THREE.Mesh(g, mat)
    m.frustumCulled = false
    m.renderOrder = 4
    return { m, mat, g, base, ceu, aCeu, n }
  }, [mundo, C.tamCeu])
  useEffect(() => () => { pal.g.dispose(); pal.base.dispose(); pal.mat.dispose(); mundo.atlas.tex.dispose() }, [pal, mundo])

  const flor = useMemo(() => {
    const base = new THREE.PlaneGeometry(1, 1)
    const g = new THREE.InstancedBufferGeometry()
    g.index = base.index
    g.setAttribute("position", base.getAttribute("position"))
    g.setAttribute("uv", base.getAttribute("uv"))
    g.setAttribute("aF", new THREE.InstancedBufferAttribute(new Float32Array(mundo.flores), 4))
    g.setAttribute("aD", new THREE.InstancedBufferAttribute(new Float32Array(mundo.dFlor), 4))
    g.instanceCount = mundo.flores.length / 4
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT_FLOR, fragmentShader: FRAG_FLOR, transparent: true, depthWrite: false, toneMapped: false, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uBat: { value: 0 }, uDentro: { value: 0 } }]),
    })
    mat.name = "manifesto-nectar-flores"
    const m = new THREE.Mesh(g, mat)
    m.frustumCulled = false
    m.renderOrder = 3
    return { m, mat, g, base }
  }, [mundo])
  useEffect(() => () => { flor.g.dispose(); flor.base.dispose(); flor.mat.dispose() }, [flor])

  // as presas (na ordem do toque), o fim da volta e o ponto do céu
  const st = useRef({ presas: [] as number[], tAnt: -1, limparEm: -1, ceuOk: false, f: new THREE.Vector3(), rr: new THREE.Vector3() }).current

  /** arruma as presas em linhas centradas no céu (em metros) */
  const arrumar = (agora: number, nova: number) => {
    const T = C.tamCeu
    const linhas: number[][] = [[]]
    let w = 0
    for (const i of st.presas) {
      const a = mundo.dados[i * 4 + 3] + 0.4
      if (w + a > C.larguraCeu && linhas[linhas.length - 1].length) { linhas.push([]); w = 0 }
      linhas[linhas.length - 1].push(i)
      w += a
    }
    linhas.forEach((l, li) => {
      const total = l.reduce((s, i) => s + mundo.dados[i * 4 + 3] + 0.4, 0)
      let x = -total / 2
      for (const i of l) {
        const a = mundo.dados[i * 4 + 3] + 0.4
        pal.ceu[i * 4] = (x + a / 2) * T
        pal.ceu[i * 4 + 1] = -li * 1.5 * T
        if (i === nova) pal.ceu[i * 4 + 2] = agora
        pal.ceu[i * 4 + 3] = 1
        x += a
      }
    })
    pal.aCeu.needsUpdate = true
  }

  // tocar numa palavra: ela sobe e fica no céu até o fim da volta
  useEffect(() => {
    const el = gl.domElement
    const v = new THREE.Vector3()
    const tocar = (ev: PointerEvent) => {
      if (ctx.dentro < 0.5) return
      const rc = el.getBoundingClientRect()
      const px = ev.clientX - rc.left, py = ev.clientY - rc.top
      const t = ctx.relogio
      let melhor = -1, dMin = C.raioToque * C.raioToque
      for (let i = 0; i < pal.n; i++) {
        if (pal.ceu[i * 4 + 3] > 0.5) continue
        const s = mundo.dados[i * 4]
        // a mesma deriva do shader (o verso junto fica perto disso)
        v.set(
          mundo.casa[i * 4] + Math.sin(t * 0.5 + s * 6.3) * 1.4,
          mundo.casa[i * 4 + 1] + Math.sin(t * 0.37 + s * 9.1) * 0.9,
          mundo.casa[i * 4 + 2] + Math.cos(t * 0.43 + s * 4.7) * 1.4,
        ).project(camera)
        if (v.z < -1 || v.z > 1) continue
        const sx = (v.x * 0.5 + 0.5) * rc.width, sy = (-v.y * 0.5 + 0.5) * rc.height
        const d = (sx - px) ** 2 + (sy - py) ** 2
        if (d < dMin) { dMin = d; melhor = i }
      }
      if (melhor < 0) return
      // cheio: a mais velha volta a ser pétala
      if (st.presas.length >= C.presasMax) { const velha = st.presas.shift()!; pal.ceu[velha * 4 + 3] = 0 }
      st.presas.push(melhor)
      arrumar(t, melhor)
    }
    el.addEventListener("pointerdown", tocar)
    return () => el.removeEventListener("pointerdown", tocar)
  }, [gl, camera, pal, mundo, ctx, st, C.raioToque, C.presasMax])

  useFrame((_, dtCru) => {
    const dt = Math.min(0.1, dtCru)
    const t = ctx.relogio
    const U = pal.mat.uniforms
    // o fim da volta (a faixa recomeçou): o verso do céu se apaga e as palavras voltam
    if (st.tAnt >= 0 && ctx.t < st.tAnt - 2 && st.presas.length) { U.uSoltaT.value = t; st.limparEm = t + 2.2 }
    st.tAnt = ctx.t
    if (st.limparEm > 0 && t > st.limparEm) {
      st.limparEm = -1
      for (const i of st.presas) pal.ceu[i * 4 + 3] = 0
      st.presas.length = 0
      pal.aCeu.needsUpdate = true
    }
    // o ponto do céu: à frente da câmera, alto, sem seguir cada tremida
    camera.getWorldDirection(st.f)
    st.f.y = 0
    if (st.f.lengthSq() > 1e-4) {
      st.f.normalize()
      const cc = U.uCeuC.value as THREE.Vector3, cr = U.uCeuR.value as THREE.Vector3
      const x = camera.position.x + st.f.x * 120, y = camera.position.y + 42, z = camera.position.z + st.f.z * 120
      st.rr.set(-st.f.z, 0, st.f.x)
      const a = st.ceuOk ? Math.min(1, dt * 1.5) : 1
      cc.set(cc.x + (x - cc.x) * a, cc.y + (y - cc.y) * a, cc.z + (z - cc.z) * a)
      cr.lerp(st.rr, a).normalize()
      st.ceuOk = true
    }
    U.uT.value = t
    U.uBat.value = ctx.batida
    U.uDentro.value = ctx.dentro
    const F = flor.mat.uniforms
    F.uBat.value = ctx.batida
    F.uDentro.value = ctx.dentro
  })

  return (
    <>
      <primitive object={flor.m} />
      <primitive object={pal.m} />
    </>
  )
}
