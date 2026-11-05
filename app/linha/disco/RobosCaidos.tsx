"use client"

// (T39) OS ROBÔS CAÍDOS DO DESERTO (jogada 2, nota 27: "robôs meio zumbis que
// caíram, os que não quebraram de vez"; o dono, 29/10: "não dão nada e não
// interagem: são só diversão"). Espalhados pela areia, meio enterrados, de
// bruços, de costas, de lado: uns tremem (um tranco de vez em quando), uns se
// arrastam devagar, o olho vermelho falhando. A Kombi passa por cima e eles
// voam e rolam (física leve) e ficam onde caíram, ainda tremendo. Sem prêmio,
// sem fala, sem missão. (30/10, o dono: "é só atropelar e eles saem voando
// igual aos carros": o voo é o mesmo dos carros, em estrada/atropelo.ts)
// PROVISÓRIO (regra 10): caixas em código; os de verdade vêm do Tripo 3D. A
// lógica fica: troca só a geometria (corpo e olhos usam a mesma matriz).
// Leve: 2 malhas instanciadas pra todos (2 chamadas de desenho); só os que estão
// perto da Kombi (< 260 m) se mexem; os outros nem são tocados no quadro.

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"

import { ATROPELO, lancar, voar, type Voo } from "../estrada/atropelo"
import { alemDaCidade, cresceuNoRumo } from "../estrada/raioCidade"
import { CASA, SAIDA_CASA } from "./historia"

/* eslint-disable react-hooks/immutability --
   cena R3F: o estado dos robôs muda a cada quadro (useFrame), como as
   instâncias do three.js; nada disso é estado do React */
type JogoMin = { voo?: boolean; ar: boolean; wx?: number; wz?: number; rumo?: number; y: number; v: number; shake: number; flash: number }

export const N_CAIDOS = 44
const PERTO = 260 // m: daqui pra perto eles se mexem
const ALTURA = 0.33 // o centro do tronco deitado, acima do chão
const MEDIR = typeof window !== "undefined" && /[?&]medir/.test(location.search)

function sorteio(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647) }

type Caido = {
  x: number; z: number; y: number
  q: THREE.Quaternion // a pose (deitado, no rumo)
  enterrado: number
  tipo: 0 | 1 | 2 // 0 treme, 1 se arrasta, 2 quieto (só o olho)
  fase: number; tranco: number; trancoAmp: number; espera: number
  ox: number; oz: number // onde nasceu (o que se arrasta não vai longe)
  // o atropelo (o voo dos carros: fora > 0 = voando)
  voo: Voo
  sujo: boolean
}

// a peça provisória: tronco, cabeça, um braço esticado (o zumbi que tenta
// alcançar), o outro do lado, uma perna inteira e uma quebrada. A origem é o
// meio do tronco; o rosto olha pra +z
function geoCaido() {
  const parte = (w: number, h: number, d: number, x: number, y: number, z: number, cor: string) => {
    const g = new THREE.BoxGeometry(w, h, d).translate(x, y, z)
    const c = new THREE.Color(cor), n = g.attributes.position.count, a = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b }
    g.setAttribute("color", new THREE.BufferAttribute(a, 3))
    return g
  }
  const corpo = mergeGeometries([
    parte(1.05, 1.35, 0.62, 0, 0, 0, "#7d776c"), // o tronco
    parte(0.8, 0.22, 0.66, 0, -0.5, 0, "#4f4b45"), // a cintura
    parte(0.7, 0.55, 0.58, 0, 0.98, 0.02, "#3b3d44"), // a cabeça
    parte(0.26, 1.15, 0.26, 0.66, 1.05, 0.08, "#5b574f"), // o braço esticado (por cima da cabeça)
    parte(0.3, 0.3, 0.3, 0.66, 1.68, 0.1, "#3b3d44"), // a mão
    parte(0.26, 1.0, 0.26, -0.68, -0.2, 0, "#5b574f"), // o outro braço, do lado
    parte(0.32, 1.0, 0.32, 0.26, -1.15, 0, "#55524c"), // a perna
    parte(0.32, 0.5, 0.32, -0.26, -0.9, 0, "#55524c"), // a perna quebrada
    parte(0.14, 0.16, 0.14, -0.26, -1.22, 0.02, "#c9a24a"), // os fios pra fora
  ], false)!
  const olhos = mergeGeometries([
    new THREE.BoxGeometry(0.16, 0.09, 0.05).translate(-0.15, 1.02, 0.32),
    new THREE.BoxGeometry(0.16, 0.09, 0.05).translate(0.15, 1.02, 0.32),
  ], false)!
  return { corpo, olhos }
}

export function RobosCaidos({ jogo, chao, livre, onAtropelou }: { jogo: React.RefObject<JogoMin>; chao: (x: number, z: number) => number; livre: (x: number, z: number) => boolean; onAtropelou?: () => void }) {
  const st = useMemo(() => {
    const r = sorteio(3939)
    const lista: Caido[] = []
    const yaw = new THREE.Quaternion(), lie = new THREE.Quaternion(), eixo = new THREE.Vector3()
    const POSES: [number, number, number][] = [[1, 0, 0], [-1, 0, 0], [0, 0, 1]] // de bruços, de costas, de lado
    const por = (x: number, z: number) => {
      if (alemDaCidade(x, z) < 1380 || !livre(x, z)) return false
      if (Math.hypot(x - CASA.x, z - CASA.z) < 120) return false // o quintal da D-Bee fica limpo
      if (lista.some((b) => Math.hypot(b.x - x, b.z - z) < 14)) return false
      const p = POSES[Math.floor(r() * 3)]
      eixo.set(p[0], p[1], p[2])
      lie.setFromAxisAngle(eixo, Math.PI / 2 + (r() - 0.5) * 0.25)
      yaw.setFromAxisAngle(eixo.set(0, 1, 0), r() * Math.PI * 2)
      const q = yaw.clone().multiply(lie)
      const t = r()
      lista.push({
        x, z, y: chao(x, z), q, enterrado: r() * 0.22, tipo: t < 0.5 ? 0 : t < 0.72 ? 1 : 2,
        fase: r() * 10, tranco: 0, trancoAmp: 0, espera: r() * 4, ox: x, oz: z,
        voo: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, giro: 0, vgiro: 0, fora: 0 }, sujo: true,
      })
      return true
    }
    // um punhado no caminho da casa pra cidade (os primeiros que se vê, antes do primeiro pulo)
    const dx = -SAIDA_CASA.x, dz = -SAIDA_CASA.z, d = Math.hypot(dx, dz), ax = dx / d, az = dz / d
    for (let k = 0, n = 0; n < 9 && k < 200; k++) {
      const s = 170 + r() * 420, lado = (r() < 0.5 ? -1 : 1) * (14 + r() * 90)
      if (por(CASA.x + ax * s - az * lado, CASA.z + az * s + ax * lado)) n++
    }
    // o resto espalhado no anel do deserto
    for (let k = 0; lista.length < N_CAIDOS && k < 2000; k++) {
      const a = r() * Math.PI * 2, rr = Math.min(3850, 1500 + cresceuNoRumo(Math.cos(a), Math.sin(a)) + r() * 2400)
      por(Math.cos(a) * rr, Math.sin(a) * rr)
    }
    return { lista }
  }, [chao, livre])

  const malhas = useMemo(() => {
    const g = geoCaido()
    const corpo = new THREE.InstancedMesh(g.corpo, new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.55, roughness: 0.62, emissive: "#3a2c22", emissiveIntensity: 0.6 }) /* (a mesma luz própria fraquinha do chão: de noite eles não somem) */, N_CAIDOS)
    const olhos = new THREE.InstancedMesh(g.olhos, new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }), N_CAIDOS)
    const tinta = new THREE.Color(), olho = new THREE.Color("#ff2a2a")
    const r = sorteio(77)
    for (let i = 0; i < N_CAIDOS; i++) {
      // a poeira de areia por cima: cada um um pouco mais claro, mais ruivo ou mais escuro
      const p = r()
      tinta.setRGB(0.85 + p * 0.3, 0.8 + p * 0.25, 0.72 + p * 0.15)
      corpo.setColorAt(i, tinta)
      olhos.setColorAt(i, olho)
    }
    for (const m of [corpo, olhos]) { m.frustumCulled = false; m.count = st.lista.length }
    return { corpo, olhos }
  }, [st])

  const aux = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), qt: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(1, 1, 1), up: new THREE.Vector3(0, 1, 0), v: new THREE.Vector3(), c: new THREE.Color(), dq: new THREE.Quaternion(), tq: new THREE.Quaternion(), fw: new THREE.Vector3() }), [])
  const t0 = useRef(0)

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw)
    t0.current += dt
    const t = t0.current
    const j = jogo.current
    // (?medir: os testes acham os robôs)
    if (MEDIR) (window as unknown as { __caidos: Caido[] }).__caidos = st.lista
    const kx = j?.voo && j.wx !== undefined ? j.wx : null, kz = j?.wz ?? null
    const pode = kx !== null && j && !j.ar && Math.abs(j.v) > ATROPELO.vMinRobo
    const fx = Math.sin(j?.rumo ?? 0), fz = Math.cos(j?.rumo ?? 0)
    let mudouCorpo = false, mudouOlho = false
    for (let i = 0; i < st.lista.length; i++) {
      const b = st.lista[i], o = b.voo
      const voando = o.fora > 0
      const dk = kx !== null ? Math.hypot(b.x - kx, b.z - kz!) : Infinity
      if (dk > PERTO && !voando && !b.sujo) continue
      // a Kombi passou por cima (no chão, andando): voa pro lado, igual aos carros
      if (pode && !voando && dk < 2.7 && Math.abs(j!.y - b.y) < 2.5) {
        o.x = b.x; o.z = b.z; o.y = b.y; o.giro = 0
        lancar(o, kx!, kz!, fx, fz, j!.v)
        j!.v *= ATROPELO.freioKombiDisco
        j!.shake = Math.max(j!.shake, ATROPELO.shake); j!.flash = Math.max(j!.flash, ATROPELO.flash)
        b.enterrado = 0.05
        onAtropelou?.()
      }
      let gira = 0, tombo = 0
      if (o.fora > 0) {
        const ch = chao(o.x, o.z)
        const segue = voar(o, dt, ch)
        b.x = o.x; b.z = o.z; b.y = o.y
        gira = o.giro; tombo = Math.sin(o.giro) * ATROPELO.tombo
        if (!segue) {
          // parou: fica deitado onde caiu, no rumo em que o giro parou, e volta a tremer
          b.y = ch; b.ox = b.x; b.oz = b.z
          b.q.premultiply(aux.dq.setFromAxisAngle(aux.up, o.giro))
          gira = 0; tombo = 0
        }
      }
      const noAr = o.fora > 0
      // o zumbi: o tranco de vez em quando; o que se arrasta, aos puxões
      let ang = 0
      if (!noAr && dk < PERTO) {
        b.espera -= dt
        if (b.espera <= 0 && b.tipo !== 2) { b.tranco = 0.28; b.trancoAmp = (0.06 + Math.random() * 0.14) * (Math.random() < 0.5 ? -1 : 1); b.espera = 1 + Math.random() * 4.5 }
        if (b.tranco > 0) { b.tranco = Math.max(0, b.tranco - dt); ang = b.trancoAmp * Math.sin((1 - b.tranco / 0.28) * Math.PI) }
        if (b.tipo === 1) {
          // pra onde a cabeça aponta (o eixo do corpo, deitado)
          aux.v.set(0, 1, 0).applyQuaternion(b.q)
          const hl = Math.hypot(aux.v.x, aux.v.z)
          if (hl > 0.3) {
            const puxa = Math.pow(Math.max(0, Math.sin(t * 2.1 + b.fase)), 3) * 0.9 * dt
            b.x += (aux.v.x / hl) * puxa; b.z += (aux.v.z / hl) * puxa
            ang += Math.max(0, Math.sin(t * 2.1 + b.fase)) * 0.05
            // não vai longe: volta virando o rumo
            if (Math.hypot(b.x - b.ox, b.z - b.oz) > 30) { b.q.premultiply(aux.dq.setFromAxisAngle(aux.up, Math.PI)); }
            b.y = chao(b.x, b.z)
          }
        }
        // o olho falhando (o que está quieto pisca mais devagar)
        const fl = Math.sin(t * (b.tipo === 2 ? 1.3 : 7.0) + b.fase * 3) + Math.sin(t * 17.0 + b.fase) * 0.6
        const k = fl > 0.9 ? 1 : fl > -0.2 ? 0.35 : 0.08
        malhas.olhos.setColorAt(i, aux.c.setRGB(1.4 * k, 0.12 * k, 0.12 * k))
        mudouOlho = true
      }
      aux.qt.setFromAxisAngle(aux.up, ang)
      aux.q.copy(b.q).multiply(aux.qt)
      if (noAr) {
        // o giro do voo (em volta do alto do mundo) e o tombo de lado, como o carro
        // (o eixo do tombo: a frente do voo, de lado pra Kombi)
        aux.fw.set(-b.voo.vz, 0, b.voo.vx); if (aux.fw.lengthSq() > 1e-6) aux.fw.normalize(); else aux.fw.set(fx, 0, fz)
        aux.q.premultiply(aux.tq.setFromAxisAngle(aux.fw, tombo)).premultiply(aux.dq.setFromAxisAngle(aux.up, gira))
      }
      aux.p.set(b.x, b.y + (noAr ? ALTURA : ALTURA - b.enterrado) + Math.abs(ang) * 0.3, b.z)
      aux.m.compose(aux.p, aux.q, aux.s)
      malhas.corpo.setMatrixAt(i, aux.m); malhas.olhos.setMatrixAt(i, aux.m)
      b.sujo = false
      mudouCorpo = true
    }
    if (mudouCorpo) { malhas.corpo.instanceMatrix.needsUpdate = true; malhas.olhos.instanceMatrix.needsUpdate = true }
    if (mudouOlho && malhas.olhos.instanceColor) malhas.olhos.instanceColor.needsUpdate = true
  })

  return (
    <>
      <primitive object={malhas.corpo} />
      <primitive object={malhas.olhos} />
    </>
  )
}
