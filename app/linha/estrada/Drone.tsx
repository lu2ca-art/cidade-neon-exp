"use client"

// O DRONE GPS (LU2CA 27/10, mapa-disco-decisoes.md "27/10: o drone GPS, a
// câmera por região, a fluidez"). A D-Bee dá o drone: o mapa vira a própria
// cidade vista do alto, AO VIVO (o jogo não para, o carro segue respondendo:
// "tipo autorama"). O drone fica sempre numa linha reta com o carro, a ~81°
// (quase de cima, inclinado pra traseira). Na vista dele, o caminho até o
// destino (a mesma rota do calcularRota/automático) se pinta nas ruas como um
// holograma, e os lugares acendem de longe (um feixe; o destino mais forte).
//
// Desempenho: sem luz nova (tudo emissivo/aditivo); a faixa é UMA geometria,
// reescrita só quando a rota muda (1x/s no máximo, buffers pré-alocados); por
// quadro só uniforms. Fora do drone, nada disso desenha.

import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { Mundo } from "./mundo"
import { PASSO } from "./pista"
import { calcularRota } from "./rota"
import { blipsDo, noMundo, type IconeMapa, type Marca } from "./Mapa"
import { CHAO_LUGARES, type LugarChao } from "../disco/historia"
import type { LugarId } from "../lugares"

// ── os números (tudo que o designer ajusta mora aqui) ──
export const DRONE_CFG = {
  inclinacao: 81, // graus abaixo do horizonte (90 = de cima)
  altura: 240, // m acima do carro na tela deitada; na tela em pé sobe (ver alturaDrone)
  avanco: 0.06, // o ponto olhado fica um pouco à frente do carro (× altura; menor que altura/tan(81°): o drone fica ATRÁS)
  fov: 50,
  transicao: 1, // s (sobe/desce)
  seguirRumo: 2.2, // 1/s: quão rápido o drone gira atrás do rumo do carro
  // a primeira vez (no deserto, quando a D-Bee dá): sobe devagar, bem alto, mostra o trajeto e volta
  primeiraSubida: 2.6, // s
  primeiraAlto: 2.4, // × a altura normal no começo da mostra
  primeiraAltoAte: 5.5, // s: depois desce pra altura normal
  primeiraFim: 10, // s: volta pra câmera da rua
  // a faixa do caminho
  faixaLarg: 3.4, // meia largura (m)
  faixaAlt: 0.5, // m acima da rua (sem z-fighting vista de longe)
  faixaPasso: 4, // m entre amostras
  faixaVel: 34, // m/s: o brilho correndo pro destino
  faixaPer: 26, // m entre as setas
  marco: 100, // m: uma faixa clara a cada 100 m contados do destino (a noção da distância)
  refazer: 30, // m andados: refaz a faixa (fora isso, só quando a rota muda)
  // os feixes dos lugares
  feixeAlt: 220,
  feixeRaio: 2.6,
  destinoRaio: 6,
  destinoAlt: 340,
}

// o estado do drone (mutável, fora do React: a câmera lê por quadro)
export const DRONE = {
  alvo: 0, // 0 rua, 1 drone
  k: 0, // a transição (0..1)
  e: 0, // a transição suavizada (a que mistura a câmera)
  rumo: 0,
  rumoOk: false,
  extra: 1, // × altura (a mostra da primeira vez)
  mostra: -1, // s desde o começo da primeira vez (-1: não está mostrando)
  alt: 0, // a altura atual (m), pra névoa acompanhar
  metros: -1, // até o destino (a rota), -1 sem destino
  metros0: -1, // no começo dessa ida (a barrinha)
  ouvir: null as ((ligado: boolean) => void) | null,
}
export function ligarDrone(on: boolean) {
  if (!!DRONE.alvo === on) return
  DRONE.alvo = on ? 1 : 0
  DRONE.ouvir?.(on)
}
// a primeira vez: a câmera sai do carro e sobe, mostra o trajeto e volta
export function mostrarDrone() { DRONE.mostra = 0; DRONE.extra = 1; ligarDrone(true) }

export function alturaDrone(aspecto: number) {
  // na tela em pé o campo é estreito: sobe mais pra caber um pedaço bom da cidade
  return DRONE_CFG.altura * (aspecto < 1 ? 1 / Math.sqrt(Math.max(0.45, aspecto)) : 1)
}

const _p = new THREE.Vector3(), _o = new THREE.Vector3(), _l = new THREE.Vector3()
// mistura a câmera da rua (já calculada no quadro) com a do drone. Devolve a mistura (0..1)
export function cameraDrone(cam: THREE.PerspectiveCamera, car: THREE.Vector3, frente: THREE.Vector3, olhar: THREE.Vector3, dt: number) {
  const D = DRONE, C = DRONE_CFG
  if (D.mostra >= 0) {
    D.mostra += dt
    if (D.mostra >= C.primeiraFim) { D.mostra = -1; ligarDrone(false) }
  }
  const dur = D.mostra >= 0 ? C.primeiraSubida : C.transicao
  D.k = D.alvo ? Math.min(1, D.k + dt / dur) : Math.max(0, D.k - dt / C.transicao)
  const extraAlvo = D.mostra >= 0 && D.mostra < C.primeiraAltoAte ? C.primeiraAlto : 1
  D.extra += (extraAlvo - D.extra) * Math.min(1, dt * 0.9)
  if (D.k <= 0) { D.rumoOk = false; D.e = 0; D.alt = 0; return 0 }
  const fr = Math.atan2(frente.x, frente.z)
  if (!D.rumoOk) { D.rumo = fr; D.rumoOk = true }
  let dr = fr - D.rumo
  dr -= Math.round(dr / (Math.PI * 2)) * Math.PI * 2
  D.rumo += dr * Math.min(1, dt * C.seguirRumo)
  const e = D.k * D.k * (3 - 2 * D.k)
  D.e = e
  const h = alturaDrone(cam.aspect) * D.extra
  D.alt = h
  const fx = Math.sin(D.rumo), fz = Math.cos(D.rumo)
  // o ponto olhado (à frente do carro) e o drone atrás dele, na mesma reta
  const av = h * C.avanco, atras = h / Math.tan((C.inclinacao * Math.PI) / 180)
  _o.set(car.x + fx * av, car.y, car.z + fz * av)
  _p.set(_o.x - fx * atras, car.y + h, _o.z - fz * atras)
  cam.position.lerp(_p, e)
  _l.copy(olhar).lerp(_o, e)
  cam.up.set(0, 1, 0)
  cam.lookAt(_l)
  return e
}

// ── o holograma ──
const MAXP = 4096
const VERT_FAIXA = /* glsl */ `
attribute float aD; attribute float aL; attribute vec3 aCor;
varying float vD; varying float vL; varying vec3 vC;
void main() { vD = aD; vL = aL; vC = aCor; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const FRAG_FAIXA = /* glsl */ `
uniform float uT; uniform float uIni; uniform float uK; uniform float uTot; uniform float uVel; uniform float uPer; uniform float uMarco; uniform float uLarg;
varying float vD; varying float vL; varying vec3 vC;
void main() {
  float d = vD - uIni;
  if (d < 0.0) discard;
  float borda = smoothstep(0.6, 0.95, abs(vL));
  // as setas correndo pro destino (o meio vai na frente: um V)
  float f = fract((vD - abs(vL) * uLarg * 0.9 - uT * uVel) / uPer);
  float seta = smoothstep(0.0, 0.08, f) * (1.0 - smoothstep(0.08, 0.32, f));
  // a cada 100 m (contados do destino), uma faixa clara: a noção da distância
  float m = mod(uTot - vD, uMarco);
  float marco = 1.0 - smoothstep(0.6, 2.2, min(m, uMarco - m));
  float ini = smoothstep(0.0, 10.0, d);
  float a = (0.22 + 0.7 * borda + 0.6 * seta * (1.0 - borda) + 0.55 * marco) * ini * uK;
  gl_FragColor = vec4(mix(vC, vec3(1.0), 0.35 * seta + 0.4 * marco) * a, 1.0);
}`
const VERT_FEIXE = /* glsl */ `
varying float vY; varying vec3 vC;
void main() {
  vY = uv.y;
  #ifdef USE_INSTANCING_COLOR
  vC = instanceColor;
  #else
  vC = vec3(1.0);
  #endif
  vec4 p = vec4(position, 1.0);
  #ifdef USE_INSTANCING
  p = instanceMatrix * p;
  #endif
  gl_Position = projectionMatrix * modelViewMatrix * p;
}`
const FRAG_FEIXE = /* glsl */ `
uniform float uK; uniform float uForca; uniform vec3 uCor; uniform float uT;
varying float vY; varying vec3 vC;
void main() {
  float a = pow(1.0 - vY, 1.6) * (0.55 + 0.45 * sin(uT * 3.0 - vY * 14.0)) + 0.25 * (1.0 - vY);
  gl_FragColor = vec4(vC * uCor * a * uForca * uK, 1.0);
}`

function matAditivo(vertexShader: string, fragmentShader: string, uniforms: Record<string, THREE.IUniform>) {
  return new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, fog: false })
}

interface PoseJogo { via: number; u: number; v: number; voo?: boolean; wx?: number; wz?: number }
type MundoChao = Mundo & { chaoEm?: (x: number, z: number) => number }

function pontoVia(M: Mundo, via: number, u: number) {
  const v = M.vias[via]
  const i = v.fechada ? ((Math.round(u / PASSO) % v.n) + v.n) % v.n : Math.max(0, Math.min(v.n - 1, Math.round(u / PASSO)))
  return i
}

export function HoloDrone({ M, jogo, marcaRef, vagaRef, alvoChao, lugarAlvo, alvoLivre, apagada, missoes }: {
  M: Mundo
  jogo: React.RefObject<PoseJogo>
  marcaRef: React.RefObject<Marca | null>
  vagaRef: React.RefObject<{ via: number; u: number; cor: string } | null>
  alvoChao: LugarChao | null
  lugarAlvo: LugarId | null
  // sem rua (as dunas): um ponto do mundo
  alvoLivre?: { x: number; z: number; cor: string } | null
  apagada?: boolean[] | null
  missoes?: IconeMapa[] | null
}) {
  const chao = (M as MundoChao).chaoEm
  const yChao = (x: number, z: number, y0: number) => (chao ? chao(x, z) : y0)
  // a faixa: buffers do tamanho máximo, escritos só quando a rota muda
  const faixa = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(MAXP * 2 * 3), d = new Float32Array(MAXP * 2), l = new Float32Array(MAXP * 2), cor = new Float32Array(MAXP * 2 * 3)
    for (let i = 0; i < MAXP; i++) { l[i * 2] = -1; l[i * 2 + 1] = 1 }
    const idx = new Uint32Array((MAXP - 1) * 6)
    for (let i = 0; i < MAXP - 1; i++) { const a = i * 2; idx.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], i * 6) }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute("aD", new THREE.BufferAttribute(d, 1).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute("aL", new THREE.BufferAttribute(l, 1))
    g.setAttribute("aCor", new THREE.BufferAttribute(cor, 3).setUsage(THREE.DynamicDrawUsage))
    g.setIndex(new THREE.BufferAttribute(idx, 1))
    g.setDrawRange(0, 0)
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5) // (a faixa cobre a cidade: nunca some por culling)
    const C = DRONE_CFG
    const mat = matAditivo(VERT_FAIXA, FRAG_FAIXA, { uT: { value: 0 }, uIni: { value: 0 }, uK: { value: 0 }, uTot: { value: 0 }, uVel: { value: C.faixaVel }, uPer: { value: C.faixaPer }, uMarco: { value: C.marco }, uLarg: { value: C.faixaLarg } })
    return { g, mat, pos, d, cor }
  }, [])
  const feixes = useMemo(() => {
    const geo = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true).translate(0, 0.5, 0)
    const mat = matAditivo(VERT_FEIXE, FRAG_FEIXE, { uK: { value: 0 }, uForca: { value: 0.55 }, uCor: { value: new THREE.Color(1, 1, 1) }, uT: { value: 0 } })
    const matD = matAditivo(VERT_FEIXE, FRAG_FEIXE, { uK: { value: 0 }, uForca: { value: 1.6 }, uCor: { value: new THREE.Color("#ff3fb0") }, uT: { value: 0 } })
    const inst = new THREE.InstancedMesh(geo, mat, 64)
    inst.count = 0; inst.frustumCulled = false
    inst.setColorAt(0, new THREE.Color(1, 1, 1))
    const dest = new THREE.Mesh(geo, matD)
    dest.frustumCulled = false
    // o anel no chão do destino
    const anelM = matAditivo(VERT_FEIXE, /* glsl */ `uniform float uK; uniform vec3 uCor; uniform float uT; varying float vY; varying vec3 vC;
      void main() { float r = vY; float a = (0.4 + 0.6 * sin(uT * 4.0)) * smoothstep(0.0, 0.3, r) * (1.0 - smoothstep(0.7, 1.0, r)); gl_FragColor = vec4(uCor * a * 1.4 * uK, 1.0); }`, { uK: { value: 0 }, uCor: matD.uniforms.uCor, uT: { value: 0 } })
    const anel = new THREE.Mesh(new THREE.RingGeometry(10, 22, 40, 1).rotateX(-Math.PI / 2), anelM)
    // (o RingGeometry não tem uv.y radial; usa o raio normalizado no uv)
    const uv = anel.geometry.getAttribute("uv") as THREE.BufferAttribute, pa = anel.geometry.getAttribute("position") as THREE.BufferAttribute
    for (let i = 0; i < uv.count; i++) uv.setY(i, (Math.hypot(pa.getX(i), pa.getZ(i)) - 10) / 12)
    anel.frustumCulled = false
    return { inst, dest, anel, mat, matD, anelM }
  }, [])
  useEffect(() => () => { faixa.g.dispose(); faixa.mat.dispose(); feixes.inst.geometry.dispose(); feixes.mat.dispose(); feixes.matD.dispose(); feixes.anel.geometry.dispose(); feixes.anelM.dispose() }, [faixa, feixes])

  const grupo = useRef<THREE.Group>(null)
  const st = useRef({ sig: "", ini: 0, total: 0, pois: "", destKey: "" })
  const props = useRef({ alvoChao, lugarAlvo, alvoLivre, apagada, missoes })
  props.current = { alvoChao, lugarAlvo, alvoLivre, apagada, missoes }

  useEffect(() => {
    const blips = blipsDo(M).filter((b) => b.tipo !== "flor")
    const cor = new THREE.Color(), mtx = new THREE.Matrix4()
    // os pontos de interesse (feixes suaves): refeitos só quando muda o que aparece
    const pontosDeInteresse = () => {
      const pr = props.current, ap = pr.apagada
      const key = `${ap?.map((x) => (x ? 1 : 0)).join("") ?? ""}|${pr.missoes?.map((m) => m.id).join(",") ?? ""}`
      if (key === st.current.pois) return
      st.current.pois = key
      const C = DRONE_CFG, I = feixes.inst
      let n = 0
      const por = (x: number, y: number, z: number, c: string, alto = 1) => {
        if (n >= 64) return
        mtx.makeScale(C.feixeRaio, C.feixeAlt * alto, C.feixeRaio).setPosition(x, y, z)
        I.setMatrixAt(n, mtx); I.setColorAt(n, cor.set(c)); n++
      }
      for (const b of blips) { if (ap?.[b.via]) continue; const i = pontoVia(M, b.via, b.u), v = M.vias[b.via]; por(v.px[i], v.py[i], v.pz[i], b.cor) }
      if ("disco" in M) for (const c of Object.values(CHAO_LUGARES)) por(c.x, yChao(c.x, c.z, 0), c.z, c.cor, 0.8)
      if (pr.missoes && "disco" in M) {
        const D = M as unknown as { pistas: { nome: string; ida: number }[] }
        for (const m of pr.missoes) {
          const p = D.pistas.find((x) => x.nome === m.faixa)
          if (!p || ap?.[p.ida]) continue
          const v = M.vias[p.ida], i = pontoVia(M, p.ida, (v.n - 1) * PASSO * 0.55)
          por(v.px[i], v.py[i], v.pz[i], m.cor, 1.3)
        }
      }
      I.count = n
      I.instanceMatrix.needsUpdate = true
      if (I.instanceColor) I.instanceColor.needsUpdate = true
    }
    // o destino e a rota (a mesma escolha do automático: a marca, a vaga, o lugar do chão)
    const refazer = () => {
      const D = DRONE
      if (D.k <= 0 && !D.alvo) return
      pontosDeInteresse()
      const j = jogo.current, pr = props.current
      if (!j) return
      const mk = marcaRef.current, vg = vagaRef.current
      let destVia: { via: number; u: number } | null = null, dx = 0, dz = 0, corD = "#ff3fb0", key = ""
      if (mk) { destVia = mk; corD = mk.cor; key = `m${mk.via}:${Math.round(mk.u)}` }
      else if (vg) { destVia = vg; corD = vg.cor; key = `v${vg.via}:${Math.round(vg.u)}` }
      else if (pr.alvoChao && "disco" in M) { const c = CHAO_LUGARES[pr.alvoChao]; dx = c.x; dz = c.z; corD = c.cor; key = `c${pr.alvoChao}` }
      else if (pr.lugarAlvo) { const b = blips.find((x) => x.id === pr.lugarAlvo); if (b) { destVia = b; corD = b.cor; key = `l${b.id}` } }
      else if (pr.alvoLivre) { dx = pr.alvoLivre.x; dz = pr.alvoLivre.z; corD = pr.alvoLivre.cor; key = "livre" }
      const s = st.current
      if (!key) { faixa.g.setDrawRange(0, 0); feixes.dest.visible = feixes.anel.visible = false; D.metros = D.metros0 = -1; s.sig = ""; atualizarBarra(); return }
      if (destVia) { const w = noMundo(M, destVia); dx = w.x; dz = w.z }
      const iD = destVia ? pontoVia(M, destVia.via, destVia.u) : -1
      const dy = destVia ? M.vias[destVia.via].py[iD] : yChao(dx, dz, 0)
      // o feixe forte e o anel do destino
      feixes.dest.visible = feixes.anel.visible = true
      feixes.dest.position.set(dx, dy, dz); feixes.dest.scale.set(DRONE_CFG.destinoRaio, DRONE_CFG.destinoAlt, DRONE_CFG.destinoRaio)
      feixes.anel.position.set(dx, dy + 0.6, dz)
      ;(feixes.matD.uniforms.uCor.value as THREE.Color).set(corD)
      // no chão (fora das pistas) ou sem rua: uma reta do carro ao destino (é o que o automático faz)
      const livre = !!j.voo && j.wx !== undefined
      const rota = !livre && destVia ? calcularRota(M, { via: j.via, u: j.u }, destVia) : null
      const sig = rota ? `${key}|${rota.trechos.map((t) => t.via).join(",")}` : `${key}|reta`
      if (sig !== s.sig || s.ini > DRONE_CFG.refazer) {
        const novoDest = key !== s.destKey
        s.sig = sig; s.destKey = key
        const w0 = livre ? null : noMundo(M, { via: j.via, u: j.u })
        const n = rota ? escreverRota(M, rota, faixa) : escreverReta(w0 ? w0.x : j.wx!, w0 ? w0.z : j.wz!, dx, dz, dy, livre, faixa, yChao)
        s.total = faixa.d[(n - 1) * 2] ?? 0
        s.ini = 0
        faixa.g.setDrawRange(0, Math.max(0, n - 1) * 6)
        if (novoDest || D.metros0 < 0) D.metros0 = s.total
        faixa.mat.uniforms.uTot.value = s.total
        faixa.mat.uniforms.uIni.value = 0
        corFaixa(M, rota, faixa, n, corD)
      }
      D.metros = Math.max(0, s.total - s.ini)
      if (D.metros < 40 && mk) D.metros0 = -1
      atualizarBarra()
    }
    refazer()
    if (process.env.NODE_ENV !== "production") (window as unknown as Record<string, unknown>).__drone = { D: DRONE, st: st.current, faixa }
    const t = setInterval(refazer, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [M, faixa, feixes, jogo, marcaRef, vagaRef])
  // mudou o que aparece (pista acesa, missão nova): os feixes se refazem na próxima volta
  useEffect(() => { st.current.pois = "" }, [apagada, missoes])

  useFrame((_, dt) => {
    const g = grupo.current, D = DRONE
    if (!g) return
    const on = D.e > 0.01
    if (g.visible !== on) g.visible = on
    if (!on) return
    const j = jogo.current, s = st.current
    if (j) { s.ini += Math.abs(j.v) * dt; faixa.mat.uniforms.uIni.value = Math.max(0, s.ini - 6) }
    const k = D.e
    faixa.mat.uniforms.uT.value += dt; faixa.mat.uniforms.uK.value = k
    feixes.mat.uniforms.uK.value = k; feixes.matD.uniforms.uK.value = k; feixes.anelM.uniforms.uK.value = k
    feixes.mat.uniforms.uT.value = feixes.matD.uniforms.uT.value = feixes.anelM.uniforms.uT.value = faixa.mat.uniforms.uT.value
  })

  return (
    <group ref={grupo} visible={false}>
      <mesh geometry={faixa.g} material={faixa.mat} frustumCulled={false} renderOrder={5} />
      <primitive object={feixes.inst} />
      <primitive object={feixes.dest} />
      <primitive object={feixes.anel} />
    </group>
  )
}

type Faixa = { pos: Float32Array; d: Float32Array; cor: Float32Array; g: THREE.BufferGeometry }
function ponto(F: Faixa, n: number, x: number, y: number, z: number, tx: number, tz: number, dist: number) {
  if (n >= MAXP) return n
  const W = DRONE_CFG.faixaLarg, a = n * 6
  // a normal (pro lado) no plano
  F.pos[a] = x - tz * W; F.pos[a + 1] = y; F.pos[a + 2] = z + tx * W
  F.pos[a + 3] = x + tz * W; F.pos[a + 4] = y; F.pos[a + 5] = z - tx * W
  F.d[n * 2] = F.d[n * 2 + 1] = dist
  return n + 1
}
function subir(F: Faixa) {
  for (const k of ["position", "aD", "aCor"]) (F.g.getAttribute(k) as THREE.BufferAttribute).needsUpdate = true
}
function escreverRota(M: Mundo, r: NonNullable<ReturnType<typeof calcularRota>>, F: Faixa) {
  const C = DRONE_CFG
  let n = 0, dist = 0, ax = NaN, az = NaN
  for (const t of r.trechos) {
    const v = M.vias[t.via]
    for (let u = t.u0; ; u += C.faixaPasso) {
      const uu = Math.min(u, t.u1), i = pontoVia(M, t.via, uu)
      const x = v.px[i], z = v.pz[i]
      if (!Number.isNaN(ax)) dist += Math.hypot(x - ax, z - az)
      ax = x; az = z
      n = ponto(F, n, x, v.py[i] + C.faixaAlt, z, v.tx[i], v.tz[i], dist)
      if (uu >= t.u1 || n >= MAXP) break
    }
  }
  subir(F)
  return n
}
function escreverReta(x0: number, z0: number, dx: number, dz: number, dy: number, livre: boolean, F: Faixa, yChao: (x: number, z: number, y0: number) => number) {
  const C = DRONE_CFG
  const L = Math.hypot(dx - x0, dz - z0), N = Math.min(MAXP, Math.max(2, Math.ceil(L / (C.faixaPasso * 1.5)) + 1))
  const tx = L > 0 ? (dx - x0) / L : 0, tz = L > 0 ? (dz - z0) / L : 1
  let n = 0
  for (let k = 0; k < N; k++) {
    const f = k / (N - 1), x = x0 + (dx - x0) * f, z = z0 + (dz - z0) * f
    n = ponto(F, n, x, (livre ? yChao(x, z, dy) : dy) + C.faixaAlt, z, tx, tz, L * f)
  }
  subir(F)
  return n
}
const _c = new THREE.Color()
function corFaixa(M: Mundo, r: ReturnType<typeof calcularRota>, F: Faixa, n: number, corD: string) {
  // (21/10) cada trecho na cor da pista por onde passa; sem pista, a cor do destino
  _c.set(corD)
  let ti = 0, acc = 0
  const lens = r?.trechos.map((t) => t.u1 - t.u0) ?? []
  for (let i = 0; i < n; i++) {
    if (r) {
      const d = F.d[i * 2]
      while (ti < lens.length - 1 && d > acc + lens[ti]) { acc += lens[ti]; ti++ }
      const cv = (M.vias[r.trechos[ti].via] as { cor?: string }).cor
      _c.set(cv ?? corD)
    }
    F.cor.set([_c.r, _c.g, _c.b, _c.r, _c.g, _c.b], i * 6)
  }
  ;(F.g.getAttribute("aCor") as THREE.BufferAttribute).needsUpdate = true
}

// a distância, sem texto: uma linha fininha em cima, enchendo até o destino
function atualizarBarra() {
  if (typeof document === "undefined") return
  const el = document.querySelector<HTMLElement>(".l-drone-dist")
  if (!el) return
  const D = DRONE
  const tem = D.metros >= 0 && D.metros0 > 0
  el.style.opacity = tem ? "1" : "0"
  if (tem) el.style.setProperty("--feito", String(Math.max(0, Math.min(1, 1 - D.metros / D.metros0))))
}
