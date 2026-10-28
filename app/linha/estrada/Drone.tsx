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
  // (v2, 27/10 (2)) a câmera fica PARADA mostrando a cidade inteira, olhando pro norte (como o mapa 2D)
  inclinacao: 81, // graus abaixo do horizonte (90 = de cima)
  fov: 50,
  margemX: 0.92, // quanto da tela (NDC) a cidade ocupa na largura
  margemY: 0.8, // e na altura (sobra pros botões e pro holo em cima/embaixo)
  transicao: 1, // s (sobe/desce)
  // voar pelo mapa (a mão): arrastar desloca, pinça/roda aproxima
  zoomMin: 0.14, // × a distância da cidade inteira (o mais perto)
  suavizar: 9, // 1/s: a vista corre atrás do dedo
  // a primeira vez (no deserto, quando a D-Bee dá): sobe devagar, um pouco mais alto, e volta
  primeiraSubida: 2.6, // s
  primeiraAlto: 1.12, // × a distância normal no começo da mostra
  primeiraAltoAte: 5.5, // s: depois assenta na cidade inteira
  primeiraFim: 10, // s: volta pra câmera da rua
  // o ícone da Kombi (tamanho constante na tela)
  iconePx: 54, // px (a cara); a seta do rumo em volta é 1,55×
  // a cidade religada: as pistas da rota acendem, as outras apagam (× a cor delas)
  apagadoNeon: 0.07,
  acesoNeon: 1.5,
  apagadoChao: 0.16,
  pintaChao: 0.7, // o asfalto da rota toma a cor da pista (0 = só as bordas acendem)
  // desempenho: lá de cima some o miúdo (raio < miudoFrac × distância, e só o que tem raio < miudoMax m)
  miudoFrac: 0.004,
  miudoMax: 30,
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
  rumoOk: false, // (a caixa desta subida já foi feita)
  extra: 1, // × distância (a mostra da primeira vez)
  mostra: -1, // s desde o começo da primeira vez (-1: não está mostrando)
  alt: 0, // a distância atual da câmera (m), pra névoa acompanhar
  metros: -1, // até o destino (a rota), -1 sem destino
  metros0: -1, // no começo dessa ida (a barrinha)
  // a cidade (os limites das vias; HoloDrone preenche) e a desta subida (com a Kombi, se ela estiver fora)
  caixa: null as null | { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number },
  cj: { x0: 0, x1: 0, z0: 0, z1: 0, y0: 0, y1: 0 },
  fit: { key: "", d: 1000, cx: 0, cz: 0, cy: 0, wpp: 1 },
  // voar pelo mapa: o alvo (ox, oz, zoom) e o suavizado
  px: 0, pz: 0, zoom: 1, ox: 0, oz: 0, zs: 1,
  far0: 0,
  // onde está a Kombi (o ícone lê)
  carro: new THREE.Vector3(), frente: new THREE.Vector3(0, 0, 1),
  ouvir: null as ((ligado: boolean) => void) | null,
}
export function ligarDrone(on: boolean) {
  if (!!DRONE.alvo === on) return
  DRONE.alvo = on ? 1 : 0
  if (!on) centrarDrone()
  DRONE.ouvir?.(on)
}
// a primeira vez: a câmera sai do carro e sobe, mostra o trajeto e volta
export function mostrarDrone() { DRONE.mostra = 0; DRONE.extra = 1; ligarDrone(true) }

// ── voar pelo mapa ──
// arrastar (px na tela): o mapa segue o dedo
export function arrastarDrone(dx: number, dy: number) {
  const D = DRONE, c = D.cj, w = D.fit.wpp * D.zs
  D.px = Math.max(c.x0 - D.fit.cx, Math.min(c.x1 - D.fit.cx, D.px - dx * w))
  D.pz = Math.max(c.z0 - D.fit.cz, Math.min(c.z1 - D.fit.cz, D.pz - dy * w / Math.sin((DRONE_CFG.inclinacao * Math.PI) / 180)))
}
// f > 1 afasta, < 1 aproxima (nunca mais longe que a cidade inteira)
export function zoomDrone(f: number) { DRONE.zoom = Math.max(DRONE_CFG.zoomMin, Math.min(1, DRONE.zoom * f)) }
export function centrarDrone() { DRONE.px = DRONE.pz = 0; DRONE.zoom = 1 }
export const droneMovido = () => DRONE.zoom < 0.999 || Math.abs(DRONE.px) + Math.abs(DRONE.pz) > 1

// a vista da cidade inteira: a distância e o ponto olhado que enquadram a caixa
// (8 cantos projetados, umas voltas de ajuste). Só refaz quando muda a tela/caixa
const _cam = new THREE.PerspectiveCamera(), _v = new THREE.Vector3()
function vistaCidade(aspecto: number) {
  const D = DRONE, C = DRONE_CFG, c = D.cj, F = D.fit
  const key = `${aspecto.toFixed(3)}|${c.x0}|${c.x1}|${c.z0}|${c.z1}`
  if (F.key === key) return F
  F.key = key
  _cam.fov = C.fov; _cam.aspect = aspecto; _cam.near = 1; _cam.far = 1e6; _cam.updateProjectionMatrix()
  const th = (C.inclinacao * Math.PI) / 180, sy = Math.sin(th), sz = Math.cos(th), tg = Math.tan((C.fov * Math.PI) / 360)
  let cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2, d = Math.max(c.x1 - c.x0, c.z1 - c.z0)
  const cy = c.y0
  for (let it = 0; it < 8; it++) {
    _cam.position.set(cx, cy + d * sy, cz + d * sz); _cam.up.set(0, 1, 0); _cam.lookAt(cx, cy, cz); _cam.updateMatrixWorld(true)
    let a = Infinity, b = -Infinity, e = Infinity, f = -Infinity
    for (let k = 0; k < 8; k++) {
      _v.set(k & 1 ? c.x1 : c.x0, k & 2 ? c.y1 : c.y0, k & 4 ? c.z1 : c.z0).project(_cam)
      a = Math.min(a, _v.x); b = Math.max(b, _v.x); e = Math.min(e, _v.y); f = Math.max(f, _v.y)
    }
    cx += ((a + b) / 2) * d * tg * aspecto
    cz -= ((e + f) / 2) * d * tg / sy
    d *= Math.max((b - a) / 2 / C.margemX, (f - e) / 2 / C.margemY)
  }
  F.d = d; F.cx = cx; F.cz = cz; F.cy = cy
  F.wpp = (2 * d * tg) / Math.max(1, typeof window !== "undefined" ? window.innerHeight : 800)
  return F
}

const _p = new THREE.Vector3(), _l = new THREE.Vector3(), _o = new THREE.Vector3()
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
  if (D.k <= 0) {
    D.rumoOk = false; D.e = 0; D.alt = 0
    if (D.far0 && cam.far !== D.far0) { cam.far = D.far0; cam.updateProjectionMatrix() }
    return 0
  }
  D.carro.copy(car); D.frente.copy(frente)
  if (!D.rumoOk) {
    // a caixa desta subida: a cidade, e a Kombi se ela estiver fora (nas dunas)
    D.rumoOk = true
    const c = D.caixa ?? { x0: car.x - 400, x1: car.x + 400, z0: car.z - 400, z1: car.z + 400, y0: car.y, y1: car.y }, m = 60
    D.cj.x0 = Math.min(c.x0, car.x - m); D.cj.x1 = Math.max(c.x1, car.x + m); D.cj.z0 = Math.min(c.z0, car.z - m); D.cj.z1 = Math.max(c.z1, car.z + m)
    D.cj.y0 = Math.min(c.y0, car.y); D.cj.y1 = Math.max(c.y1, car.y)
  }
  const e = D.k * D.k * (3 - 2 * D.k)
  D.e = e
  const F = vistaCidade(cam.aspect), s = Math.min(1, dt * C.suavizar)
  D.ox += (D.px - D.ox) * s; D.oz += (D.pz - D.oz) * s; D.zs += (D.zoom - D.zs) * s
  const h = F.d * D.zs * D.extra
  D.alt = h
  const th = (C.inclinacao * Math.PI) / 180
  _o.set(F.cx + D.ox, F.cy, F.cz + D.oz)
  _p.set(_o.x, _o.y + h * Math.sin(th), _o.z + h * Math.cos(th))
  cam.position.lerp(_p, e)
  _l.copy(olhar).lerp(_o, e)
  cam.up.set(0, 1, 0)
  cam.lookAt(_l)
  // o plano do fundo vai até a cidade inteira (só no drone; na rua volta pro de antes)
  if (!D.far0) D.far0 = cam.far
  cam.far = D.far0 + (Math.max(D.far0, h * 1.8) - D.far0) * e
  return e
}

// ── a cidade religada (v2): as pistas da rota acendem, as outras apagam ──
// Uma textura 1×N (uma via por texel: 1 acesa) e um uniform de força; os
// materiais das pistas multiplicam a cor (onBeforeCompile). Sem geometria nova
// e sem trocar nada por quadro além do uniform.
const NV = 256
const _acTex = new THREE.DataTexture(new Uint8Array(NV * 4), NV, 1)
_acTex.magFilter = _acTex.minFilter = THREE.NearestFilter
export const ACESO = { k: { value: 0 }, tex: { value: _acTex }, n: { value: NV } }
function acender(apagado: number, aceso: number, pinta = 0) {
  // (o texel: rgb = a cor da pista, a = acesa). pinta > 0: o chão da rota vira a cor dela (de longe a rua toda acende)
  return (sh: { uniforms: Record<string, THREE.IUniform>; vertexShader: string; fragmentShader: string }) => {
    sh.uniforms.uAcK = ACESO.k; sh.uniforms.uAcTex = ACESO.tex; sh.uniforms.uAcN = ACESO.n
    sh.uniforms.uAcApag = { value: apagado }; sh.uniforms.uAcAces = { value: aceso }; sh.uniforms.uAcPinta = { value: pinta }
    sh.vertexShader = "attribute float aVia;\nuniform sampler2D uAcTex;\nuniform float uAcN;\nvarying vec4 vAc;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvAc = texture2D(uAcTex, vec2((aVia + 0.5) / uAcN, 0.5));")
    sh.fragmentShader = "uniform float uAcK;\nuniform float uAcApag;\nuniform float uAcAces;\nuniform float uAcPinta;\nvarying vec4 vAc;\n" + sh.fragmentShader
      .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb *= mix(1.0, mix(uAcApag, uAcAces, vAc.a), uAcK);")
      .replace("#include <dithering_fragment>", "#include <dithering_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, vAc.rgb * 1.15, uAcK * vAc.a * uAcPinta);")
  }
}
export const ACENDE = {
  neon: acender(DRONE_CFG.apagadoNeon, DRONE_CFG.acesoNeon),
  branco: acender(DRONE_CFG.apagadoNeon, 1),
  chao: acender(DRONE_CFG.apagadoChao, 1, DRONE_CFG.pintaChao),
}
// as vias da rota (a volta do disco é desenhada pela ida: acende as duas)
const _ac = new THREE.Color()
function acenderVias(M: Mundo, vias: number[] | null) {
  const d = _acTex.image.data as Uint8Array
  d.fill(0)
  if (vias) {
    const par = new Map<number, number>()
    for (const p of (M as unknown as { pistas?: { ida: number; volta: number }[] }).pistas ?? []) { par.set(p.volta, p.ida); par.set(p.ida, p.volta) }
    const marca = (v: number) => {
      if (v >= NV) return
      _ac.set((M.vias[v] as { cor?: string }).cor ?? "#2fe8ff")
      d[v * 4] = _ac.r * 255; d[v * 4 + 1] = _ac.g * 255; d[v * 4 + 2] = _ac.b * 255; d[v * 4 + 3] = 255
    }
    for (const v of vias) { marca(v); const o = par.get(v); if (o !== undefined) marca(o) }
  }
  _acTex.needsUpdate = true
}

// ── o miúdo some lá de cima (v2, desempenho) ──
// Na subida: uma volta no grafo guarda as malhas soltas pequenas (raio < miudoMax)
// que estavam visíveis. Enquanto o drone está no alto, some o que fica abaixo de
// miudoFrac × a distância (≈ 1–2 px); aproximando (voar), elas voltam. Na
// descida, devolve tudo. As linhas de contorno somem todas. Só o flag visible (sem geometria, sem alocar por quadro)
const MIUDO = { lista: [] as { o: THREE.Object3D; r: number }[], ativo: false, alt: 0 }
function miudos(cena: THREE.Object3D, meu: THREE.Object3D, alt: number) {
  const M_ = MIUDO, C = DRONE_CFG
  if (!alt) {
    if (M_.ativo) { for (const x of M_.lista) x.o.visible = true; M_.lista.length = 0; M_.ativo = false; M_.alt = 0 }
    return
  }
  if (!M_.ativo) {
    M_.ativo = true
    cena.traverse((o) => {
      const m = o as THREE.Mesh
      if (!(m.isMesh || (o as THREE.Line).isLine) || (o as THREE.InstancedMesh).isInstancedMesh || !o.visible) return
      for (let p: THREE.Object3D | null = o; p; p = p.parent) { if (p === meu) return; if (!p.visible) return }
      const geo = m.geometry
      if (!geo) return
      if (!geo.boundingSphere) geo.computeBoundingSphere()
      const r = (geo.boundingSphere?.radius ?? 1e9) * o.matrixWorld.getMaxScaleOnAxis()
      // (v2 desempenho) as linhas de contorno somem lá de cima a qualquer tamanho
      // (r = -1: nunca passam do limite). Nenhuma delas é da pista acesa (ACENDE é só malha)
      if ((o as THREE.Line).isLine) M_.lista.push({ o, r: -1 })
      else if (r < C.miudoMax) M_.lista.push({ o, r })
    })
  }
  if (Math.abs(alt - M_.alt) < M_.alt * 0.08) return
  M_.alt = alt
  const lim = alt * C.miudoFrac
  for (const x of M_.lista) x.o.visible = x.r >= lim
}

// o ícone da Kombi (a cara dela, de frente) e a seta do rumo, desenhados uma vez num canvas
function texIcone(seta: boolean) {
  const c = document.createElement("canvas"); c.width = c.height = 256
  const g = c.getContext("2d")!
  const R = 256 / 2
  if (seta) {
    // o anel com a ponta (aponta pra cima; o sprite gira pro rumo)
    g.strokeStyle = "#2fe8ff"; g.lineWidth = 10; g.shadowColor = "#2fe8ff"; g.shadowBlur = 14
    g.beginPath(); g.arc(R, R + 6, 78, 0, Math.PI * 2); g.stroke()
    g.fillStyle = "#2fe8ff"
    g.beginPath(); g.moveTo(R, 8); g.lineTo(R + 34, 66); g.lineTo(R - 34, 66); g.closePath(); g.fill()
  } else {
    // a placa redonda escura com a borda magenta
    g.fillStyle = "#0b0716"; g.beginPath(); g.arc(R, R, 118, 0, Math.PI * 2); g.fill()
    g.strokeStyle = "#ff3fb0"; g.lineWidth = 12; g.beginPath(); g.arc(R, R, 112, 0, Math.PI * 2); g.stroke()
    // a Kombi de frente: a metade de cima clara, o V no nariz, os faróis redondos, o emblema
    const x0 = 58, x1 = 198, y0 = 62, y1 = 196, r = 34
    g.beginPath(); g.moveTo(x0 + r, y0); g.arcTo(x1, y0, x1, y1, r); g.arcTo(x1, y1, x0, y1, 18); g.arcTo(x0, y1, x0, y0, 18); g.arcTo(x0, y0, x1, y0, r); g.closePath()
    g.fillStyle = "#ff3fb0"; g.fill()
    g.save(); g.clip()
    g.fillStyle = "#f4efe2"
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y0); g.lineTo(x1, 128); g.lineTo(R + 12, 128); g.lineTo(R, 150); g.lineTo(R - 12, 128); g.lineTo(x0, 128); g.closePath(); g.fill()
    g.restore()
    // o para-brisa (duas folhas)
    g.fillStyle = "#2fe8ff"
    g.fillRect(x0 + 14, y0 + 14, 50, 34); g.fillRect(R + 6, y0 + 14, 50, 34)
    // os faróis
    g.fillStyle = "#fff6c8"; g.shadowColor = "#fff6c8"; g.shadowBlur = 10
    g.beginPath(); g.arc(x0 + 26, 166, 13, 0, Math.PI * 2); g.arc(x1 - 26, 166, 13, 0, Math.PI * 2); g.fill()
    g.shadowBlur = 0
    // o emblema
    g.strokeStyle = "#0b0716"; g.lineWidth = 6; g.beginPath(); g.arc(R, 156, 15, 0, Math.PI * 2); g.stroke()
    // o para-choque
    g.fillStyle = "#0b0716"; g.fillRect(x0 - 6, y1 - 12, x1 - x0 + 12, 10)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
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
  // (v2) a caixa da cidade (os limites das vias): a câmera do drone enquadra ela inteira
  useEffect(() => {
    const c = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity, y0: Infinity, y1: -Infinity }
    for (const v of M.vias) for (let i = 0; i < v.n; i += 4) {
      c.x0 = Math.min(c.x0, v.px[i]); c.x1 = Math.max(c.x1, v.px[i]); c.z0 = Math.min(c.z0, v.pz[i]); c.z1 = Math.max(c.z1, v.pz[i]); c.y0 = Math.min(c.y0, v.py[i]); c.y1 = Math.max(c.y1, v.py[i])
    }
    DRONE.caixa = c; DRONE.fit.key = ""; DRONE.rumoOk = false
    return () => { DRONE.caixa = null; acenderVias(M, null); ACESO.k.value = 0; miudos(M as unknown as THREE.Object3D, M as unknown as THREE.Object3D, 0) }
  }, [M])
  // (v2) o ícone da Kombi: a cara (de pé) e a seta do rumo (gira), tamanho constante na tela
  const icone = useMemo(() => {
    const mk = (seta: boolean) => {
      const m = new THREE.SpriteMaterial({ map: texIcone(seta), sizeAttenuation: false, depthTest: false, depthWrite: false, transparent: true, toneMapped: false, fog: false })
      const sp = new THREE.Sprite(m); sp.renderOrder = 30; sp.frustumCulled = false
      return sp
    }
    return { cara: mk(false), seta: mk(true) }
  }, [])
  useEffect(() => () => { for (const sp of [icone.cara, icone.seta]) { sp.material.map?.dispose(); sp.material.dispose() } }, [icone])
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
  const st = useRef({ sig: "", ini: 0, total: 0, pois: "", destKey: "", temRota: false })
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
      if (!key) { if (s.temRota) { s.temRota = false; acenderVias(M, null) } faixa.g.setDrawRange(0, 0); feixes.dest.visible = feixes.anel.visible = false; D.metros = D.metros0 = -1; s.sig = ""; atualizarBarra(); return }
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
        // (v2) a cidade religada: acendem as vias da rota (sem rota nas ruas, a cidade fica normal)
        s.temRota = !!rota
        acenderVias(M, rota ? rota.trechos.map((t) => t.via) : null)
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

  useFrame((state, dt) => {
    const g = grupo.current, D = DRONE
    if (!g) return
    const on = D.e > 0.01
    if (g.visible !== on) g.visible = on
    // (v2, desempenho) lá de cima a cidade inteira cabe na tela: o detalhe menor que
    // uns pixels (placas, postes, peças soltas) some enquanto o drone está no alto
    miudos(state.scene, g, D.e > 0.6 ? D.alt : 0)
    // (v2) a força do apaga/acende das pistas (só um uniform)
    const kAc = on && st.current.temRota ? D.e : 0
    if (ACESO.k.value !== kAc) ACESO.k.value = kAc
    if (!on) return
    // o ícone em cima da Kombi: tamanho fixo em px, a seta no rumo (a câmera olha pro norte: −z é pra cima)
    const cam = state.camera as THREE.PerspectiveCamera, C = DRONE_CFG
    const esc = ((C.iconePx / Math.max(1, state.size.height)) * 2 * Math.tan((cam.fov * Math.PI) / 360))
    const op = Math.max(0, Math.min(1, (D.e - 0.4) / 0.4))
    icone.cara.position.set(D.carro.x, D.carro.y + 3, D.carro.z); icone.seta.position.copy(icone.cara.position)
    icone.cara.scale.setScalar(esc); icone.seta.scale.setScalar(esc * 1.55)
    icone.seta.material.rotation = Math.atan2(-D.frente.x, -D.frente.z)
    icone.cara.material.opacity = icone.seta.material.opacity = op
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
      <primitive object={icone.seta} />
      <primitive object={icone.cara} />
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
