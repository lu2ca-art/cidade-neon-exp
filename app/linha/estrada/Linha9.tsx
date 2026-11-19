"use client"
/* eslint-disable react-hooks/immutability -- three.js: trem, câmera e matrizes são do motor, mexidos a cada quadro */

// A LINHA 9 NA CIDADE (09/11, bíblia §13 e §14).
// Por fora (Linha9Fora): só a viga com os pórticos, as estações e um trem. Tudo sem
// luz, em trechos de ~800 m (só os perto da câmera vão pra placa) e uma malha por
// trecho; o trem longe da câmera não mexe em matriz nenhuma.
// Por dentro (ViagemNaLinha9): só existe enquanto a pessoa viaja. O interior e a gente
// do vagão (metro/cena.ts, metro/jogo.ts) baixam e nascem ao entrar e são destruídos
// ao sair: fora do trem o custo é zero. O interior entra NA cena do mundo, preso
// ao trilho, então o que passa nas janelas é a cidade de verdade, sem tela separada.

import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import type { HospedeMetro } from "../metro/Metro"
import type { Cena as CenaMetro } from "../metro/cena"
import type { Fuga } from "../metro/jogo"
import { CarroModelado } from "./MetroModelo"
import { ModeloSeguro } from "./Seguro"
import { CONFIG_LINHA9 as C, novoPonto, pontoLinha9, type Linha9, type PontoTrilho } from "./trilho9"

// a câmera da viagem, pro resto do quadro (a névoa e os cortes por distância do Corrida)
export const CAM_LINHA9 = { ativa: false, pos: new THREE.Vector3(), quat: new THREE.Quaternion() }

// ── a viagem: quem hospeda o metrô (metro/Metro.tsx) e leva o trem pelo trilho ──
export class ViagemLinha9 implements HospedeMetro {
  cena: CenaMetro | null = null
  quadro: ((t: number) => void) | null = null
  fuga: Fuga | null = null
  v = 0
  chegou = false
  constructor(public s: number, public falta: number | null) {}
  entrar(cena: CenaMetro, quadro: (t: number) => void, fuga: Fuga) { this.cena = cena; this.quadro = quadro; this.fuga = fuga }
  sair() { this.cena = null; this.quadro = null; this.fuga = null }
}

const P = novoPonto()
const eixoX = new THREE.Vector3(), eixoY = new THREE.Vector3(), eixoZ = new THREE.Vector3()
const CIMA = new THREE.Vector3(0, 1, 0)

// (no Canvas do mundo, só durante a viagem)
export function ViagemNaLinha9({ linha, viagem, zerarEntrada, onChegou }: { linha: Linha9; viagem: ViagemLinha9; zerarEntrada: () => void; onChegou: () => void }) {
  useEffect(() => { CAM_LINHA9.ativa = true; return () => { CAM_LINHA9.ativa = false } }, [])
  // este useFrame nasce depois do da cena do mundo: roda depois e fica com a câmera
  useFrame((state, dtRaw) => {
    const h = viagem, cena = h.cena, f = h.fuga
    if (!cena || !f || !h.quadro) return
    if (cena.cena.parent !== state.scene) state.scene.add(cena.cena)
    const dt = Math.min(0.1, dtRaw)
    zerarEntrada()
    // sentado: a viagem rápida (2x), freando até a estação. Na fuga, o trem segue no normal
    let alvo = C.vel * (f.sentado ? C.fatorViagem : 1)
    if (f.sentado && h.falta !== null) {
      h.falta -= h.v * dt
      alvo = Math.min(alvo, Math.max(3, Math.sqrt(2 * C.freio * Math.max(0, h.falta))))
    }
    const lim = C.acel * dt
    h.v += Math.max(-lim * 2, Math.min(lim, alvo - h.v))
    h.s = (h.s + h.v * dt) % linha.L
    f.vTrem = h.v
    pontoLinha9(linha, h.s, P)
    // o vagão preso no trilho pelo ponto onde a pessoa está (+Z é o rumo do trem)
    eixoZ.set(P.tx, P.ty, P.tz)
    eixoX.crossVectors(CIMA, eixoZ).normalize()
    eixoY.crossVectors(eixoZ, eixoX)
    const m = cena.cena.matrix.makeBasis(eixoX, eixoY, eixoZ)
    const e = m.elements, zr = f.voce.z
    e[12] = P.x - P.tx * zr + eixoY.x * C.piso
    e[13] = P.y - P.ty * zr + eixoY.y * C.piso
    e[14] = P.z - P.tz * zr + eixoY.z * C.piso
    cena.cena.matrixWorldNeedsUpdate = true
    h.quadro(performance.now())
    const cam = state.camera as THREE.PerspectiveCamera
    cam.position.copy(cena.posMundo)
    cam.quaternion.copy(cena.quatMundo)
    cam.up.set(0, 1, 0)
    if (Math.abs(cam.fov - cena.cam.fov) > 0.01) { cam.fov = cena.cam.fov; cam.updateProjectionMatrix() }
    CAM_LINHA9.pos.copy(cam.position); CAM_LINHA9.quat.copy(cam.quaternion)
    if (f.sentado && h.falta !== null && h.falta <= 0.4 && !h.chegou) { h.chegou = true; onChegou() }
  })
  return null
}

// ── por fora ──
const COR = { viga: new THREE.Color("#7c86a0"), pilar: new THREE.Color("#596278"), piso: new THREE.Color("#a7b1c6"), cobertura: new THREE.Color("#e8eefb"), luz: new THREE.Color("#cfe6ff") }

// uma caixa girada no Y (rumo = pra onde o +Z aponta), empilhada nas listas
function caixa(pos: number[], cor: number[], cx: number, cy: number, cz: number, rumo: number, mx: number, my: number, mz: number, c: THREE.Color) {
  const sn = Math.sin(rumo), cs = Math.cos(rumo)
  const v = (a: number, b: number, d: number) => { pos.push(cx + a * mx * cs + d * mz * sn, cy + b * my, cz - a * mx * sn + d * mz * cs) }
  const tri = (a: number[], b: number[], d: number[], k: number) => {
    v(a[0], a[1], a[2]); v(b[0], b[1], b[2]); v(d[0], d[1], d[2])
    for (let i = 0; i < 3; i++) cor.push(c.r * k, c.g * k, c.b * k)
  }
  const q = (a: number[], b: number[], c2: number[], d: number[], k: number) => { tri(a, b, c2, k); tri(a, c2, d, k) }
  q([-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1], 1) // cima
  q([-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1], 0.5) // baixo
  q([1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1], 0.8)
  q([-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1], 0.7)
  q([-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1], 0.75)
  q([1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1], 0.65)
}

const TRECHO = 800
type Trecho = { geo: THREE.BufferGeometry; x: number; z: number }
const MALHAS = new WeakMap<Linha9, Trecho[]>()
function trechosDe(l: Linha9): Trecho[] {
  const pronto = MALHAS.get(l)
  if (pronto) return pronto
  const n = Math.ceil(l.L / TRECHO), pos: number[][] = [], cor: number[][] = []
  for (let i = 0; i < n; i++) { pos.push([]); cor.push([]) }
  const de = (s: number) => Math.min(n - 1, Math.floor(((s % l.L) + l.L) % l.L / TRECHO))
  // a viga, a cada 8 m, e a linha de luz em cima dela
  const a = novoPonto(), b = novoPonto()
  for (let s = 0; s < l.L; s += 8) {
    pontoLinha9(l, s, a); pontoLinha9(l, s + 8, b)
    const dx = b.x - a.x, dz = b.z - a.z, c = Math.hypot(dx, dz), r = Math.atan2(dx, dz), t = de(s)
    caixa(pos[t], cor[t], (a.x + b.x) / 2, (a.y + b.y) / 2 - 0.8, (a.z + b.z) / 2, r, 0.65, 0.8 + Math.abs(a.y - b.y) / 2, c / 2 + 0.3, COR.viga)
  }
  // os pórticos: a coluna na beira da rua e o braço até a viga
  for (const p of l.pilares) {
    const t = de(p.s), base = p.base
    caixa(pos[t], cor[t], p.x, (p.topo + base) / 2, p.z, 0, 0.5, (p.topo - base) / 2, 0.5, COR.pilar)
    const dx = p.rx - p.x, dz = p.rz - p.z, c = Math.hypot(dx, dz)
    if (c > 1) caixa(pos[t], cor[t], (p.x + p.rx) / 2, p.topo - 0.3, (p.z + p.rz) / 2, Math.atan2(dx, dz), 0.4, 0.4, c / 2, COR.pilar)
  }
  // as estações
  for (const p of l.paradas) {
    const t = de(p.s)
    for (const k of [-1, 1]) {
      const ox = Math.cos(p.rumo) * k * 3.4, oz = -Math.sin(p.rumo) * k * 3.4
      caixa(pos[t], cor[t], p.x + ox, p.y + 0.1, p.z + oz, p.rumo, 1.6, 0.25, 15, COR.piso)
      caixa(pos[t], cor[t], p.x + ox * 1.53, p.y + 2.6, p.z + oz * 1.53, p.rumo, 0.1, 2.6, 15, COR.pilar)
    }
    caixa(pos[t], cor[t], p.x, p.y + 5.4, p.z, p.rumo, 5.5, 0.18, 16, COR.cobertura)
    caixa(pos[t], cor[t], p.x, p.y + 5.15, p.z, p.rumo, 4.6, 0.06, 15.5, COR.luz)
  }
  const saida: Trecho[] = []
  for (let i = 0; i < n; i++) {
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos[i], 3))
    g.setAttribute("color", new THREE.Float32BufferAttribute(cor[i], 3))
    g.computeBoundingSphere()
    const c = g.boundingSphere!.center
    saida.push({ geo: g, x: c.x, z: c.z })
  }
  MALHAS.set(l, saida)
  return saida
}

const MAT_FORA = () => new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })

const estadoTrem = { s: 0, v: 0, espera: C.espera, prox: 0 }
/** a viagem acabou: o trem de fora continua de onde ela parou */
export function tremEm(l: Linha9, s: number) {
  const e = estadoTrem
  e.s = s; e.v = 0; e.espera = C.espera
  let i = 0
  while (i < l.paradas.length && l.paradas[i].s <= s + 1) i++
  e.prox = i % l.paradas.length
}

const a0 = novoPonto(), b0 = novoPonto()
function posicionar(g: THREE.Group, l: Linha9, s: number, p: PontoTrilho, q: PontoTrilho) {
  pontoLinha9(l, s, p); pontoLinha9(l, s + 2, q)
  g.position.set(p.x, p.y, p.z)
  g.lookAt(q.x, q.y, q.z)
}

export function Linha9Fora({ linha, escondeTrem }: { linha: Linha9; escondeTrem: boolean }) {
  const trechos = useMemo(() => trechosDe(linha), [linha])
  const mat = useMemo(MAT_FORA, [])
  useEffect(() => () => mat.dispose(), [mat])
  const malhas = useRef<(THREE.Mesh | null)[]>([])
  const vagoes = useRef<(THREE.Group | null)[]>([])
  const raiz = useRef<THREE.Group>(null)
  const tique = useRef(0)
  useFrame((state, dtRaw) => {
    const dt = Math.min(0.05, dtRaw), cam = state.camera.position, l = linha
    // quais trechos vão pra placa (5x por segundo, sem alocar)
    if (tique.current++ % 12 === 0) for (let i = 0; i < trechos.length; i++) {
      const m = malhas.current[i]
      if (m) m.visible = Math.hypot(trechos[i].x - cam.x, trechos[i].z - cam.z) < C.verViga
    }
    if (escondeTrem) { if (raiz.current) raiz.current.visible = false; return }
    const e = estadoTrem, n = l.paradas.length
    if (!n) return
    if (e.espera > 0) e.espera -= dt
    else {
      const falta = (l.paradas[e.prox].s - e.s + l.L) % l.L
      const alvo = Math.min(C.vel, Math.max(2.5, Math.sqrt(2 * C.freio * falta)))
      e.v = alvo > e.v ? Math.min(alvo, e.v + C.acel * dt) : alvo
      e.s = (e.s + Math.max(e.v, 0.5) * dt) % l.L
      if (falta < 0.6) { e.s = l.paradas[e.prox].s; e.espera = C.espera; e.v = 0; e.prox = (e.prox + 1) % n }
    }
    pontoLinha9(l, e.s, a0)
    const perto = Math.hypot(a0.x - cam.x, a0.z - cam.z) < C.verTrem
    if (raiz.current) raiz.current.visible = perto
    if (!perto) return
    for (let k = 0; k < C.vagoes; k++) {
      const g = vagoes.current[k]
      if (g) posicionar(g, l, e.s - k * C.vagao, a0, b0)
    }
  })
  return (
    <group>
      {trechos.map((t, i) => <mesh key={i} ref={(m) => { malhas.current[i] = m }} geometry={t.geo} material={mat} visible={false} />)}
      <group ref={raiz} visible={false}>
        {Array.from({ length: C.vagoes }, (_, k) => (
          <group key={k} ref={(g) => { vagoes.current[k] = g }}>
            <ModeloSeguro nome="linha 9 carro" enquanto={null}><CarroModelado farol={k === 0} /></ModeloSeguro>
          </group>
        ))}
      </group>
    </group>
  )
}
