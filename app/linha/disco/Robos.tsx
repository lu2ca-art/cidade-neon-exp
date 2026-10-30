"use client"

// AS MÁQUINAS E O CAOS (LU2CA 19/10): "a cidade está tomada por máquinas";
// "carros vazios despencados (carros que não carregam ninguém e ocupam a
// cidade sem motivo) — por isso a gente adora espatifar robôs no deserto".
//   - os ROBÔS do deserto: andam devagar pelas dunas, sem rumo. A Kombi pega e
//     eles saem voando igual aos carros da cidade (estrada/atropelo.ts): pro
//     lado, girando, quicam e ficam caídos um tempo. Não dão nada (o dono,
//     30/10: "pura diversão"). Depois voltam a aparecer longe
//   - os CARROS VAZIOS despencando: de vez em quando um cai lá de cima, longe
//     da Kombi (nunca nela), levanta areia e fica ali um tempo
// Leve: tudo instanciado (4 malhas pros robôs, 1 pros carros); nada alocado por quadro.

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"

import { ATROPELO, lancar, voar, type Voo } from "../estrada/atropelo"

/* eslint-disable react-hooks/immutability --
   cena R3F: o estado dos robôs, das peças e dos carros muda a cada quadro
   (useFrame), como as instâncias do three.js; nada disso é estado do React */
type JogoMin = { voo?: boolean; ar: boolean; wx?: number; wz?: number; rumo?: number; y: number; v: number; shake: number; flash: number }
const N = 16, CARROS = 3
// onde os robôs estão (o Corrida lê pra D-Bee falar deles)
// (fixo: um por robô, mexido no lugar; nada alocado por quadro)
export const ROBOS: { x: number; z: number; vivo: boolean }[] = Array.from({ length: N }, () => ({ x: 0, z: 0, vivo: false }))

function sorteio(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647) }

export function Robos({ jogo, chao, onAtropelou }: { jogo: React.RefObject<JogoMin>; chao: (x: number, z: number) => number; onAtropelou?: () => void }) {
  const r = useMemo(() => sorteio(4242), [])
  const st = useMemo(() => {
    // (voo.fora > 0: atropelado, voando/caído)
    const robos = Array.from({ length: N }, () => ({ x: 0, z: 0, rumo: 0, fase: r() * 10, voo: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, giro: 0, vgiro: 0, fora: 0 } as Voo }))
    const carros = Array.from({ length: CARROS }, () => ({ p: new THREE.Vector3(), vy: 0, vida: 0, caiu: false, rot: 0 }))
    return { robos, carros, prox: 18 }
  }, [r])
  // (re)nasce longe do centro, num anel do deserto (e perto do caminho da casa até a cidade)
  const nascer = (k: number, perto?: { x: number; z: number }) => {
    const b = st.robos[k]
    if (perto) { const a = r() * Math.PI * 2, d = 160 + r() * 260; b.x = perto.x + Math.cos(a) * d; b.z = perto.z + Math.sin(a) * d }
    else { const a = -2.4 + (r() - 0.5) * 1.6, d = 1350 + r() * 1500; b.x = Math.cos(a) * d; b.z = Math.sin(a) * d }
    if (Math.hypot(b.x, b.z) < 1300) { const m = 1300 / Math.hypot(b.x, b.z); b.x *= m; b.z *= m }
    b.rumo = r() * Math.PI * 2; b.voo.fora = 0
  }
  useMemo(() => { for (let k = 0; k < N; k++) nascer(k) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const malhas = useMemo(() => {
    const metal = new THREE.MeshStandardMaterial({ color: "#8d96a6", metalness: 0.7, roughness: 0.35 })
    const escuro = new THREE.MeshStandardMaterial({ color: "#2a2e36", metalness: 0.6, roughness: 0.5 })
    const olho = new THREE.MeshBasicMaterial({ color: "#ff3b3b", toneMapped: false })
    const corpo = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 1.5, 0.7), metal, N)
    const cabeca = new THREE.InstancedMesh(new THREE.BoxGeometry(0.75, 0.55, 0.6), escuro, N)
    const olhos = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.1, 0.05), olho, N)
    const pernas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 0.9, 0.35), escuro, N)
    const carro = new THREE.InstancedMesh(new THREE.BoxGeometry(2, 1.3, 4.4), new THREE.MeshStandardMaterial({ color: "#5a5f6c", metalness: 0.5, roughness: 0.5 }), CARROS)
    for (const m of [corpo, cabeca, olhos, pernas, carro]) { m.frustumCulled = false; m.count = 0 }
    return { corpo, cabeca, olhos, pernas, carro, robo: [corpo, cabeca, olhos, pernas] }
  }, [])
  const d = useMemo(() => new THREE.Object3D(), [])
  const t0 = useRef(0)
  useFrame((state, dtRaw) => {
    const dt = Math.min(0.05, dtRaw)
    t0.current += dt
    const t = t0.current
    const j = jogo.current
    const kx = j?.voo && j.wx !== undefined ? j.wx : null, kz = j?.wz ?? null
    // os robôs andando à toa
    let n = 0
    const pode = kx !== null && j && !j.ar && Math.abs(j.v) > ATROPELO.vMinRobo
    const fx = Math.sin(j?.rumo ?? 0), fz = Math.cos(j?.rumo ?? 0)
    for (let k = 0; k < N; k++) {
      const b = st.robos[k], o = b.voo
      let giro = 0, tombo = 0
      if (o.fora > 0) {
        // atropelado: voa igual aos carros; depois de um tempo volta a aparecer longe
        if (!voar(o, dt, chao(o.x, o.z))) { nascer(k, kx !== null ? { x: kx, z: kz! } : undefined); ROBOS[k].vivo = false; continue }
        b.x = o.x; b.z = o.z; giro = o.giro; tombo = Math.sin(o.giro) * ATROPELO.tombo
      } else {
        b.rumo += Math.sin(t * 0.3 + b.fase) * dt * 0.4
        b.x += Math.sin(b.rumo) * 1.1 * dt; b.z += Math.cos(b.rumo) * 1.1 * dt
        if (Math.hypot(b.x, b.z) < 1300) b.rumo += Math.PI
      }
      const y = o.fora > 0 ? o.y : chao(b.x, b.z)
      const rb = ROBOS[k]; rb.x = b.x; rb.z = b.z; rb.vivo = o.fora <= 0
      // a Kombi pegou (no chão das dunas, andando): voa pro lado, girando
      if (pode && o.fora <= 0 && Math.hypot(b.x - kx!, b.z - kz!) < 3.2 && Math.abs(j!.y - y) < 3) {
        o.x = b.x; o.z = b.z; o.y = y; o.giro = 0
        lancar(o, kx!, kz!, fx, fz, j!.v)
        j!.v *= ATROPELO.freioKombiDisco
        j!.shake = Math.max(j!.shake, ATROPELO.shake); j!.flash = Math.max(j!.flash, ATROPELO.flash)
        onAtropelou?.()
      }
      const passo = o.fora > 0 ? 0 : Math.sin(t * 5 + b.fase)
      const ry = b.rumo + giro
      d.position.set(b.x, y + 1.6 + Math.abs(passo) * 0.08, b.z); d.rotation.set(0, ry, passo * 0.04 + tombo); d.scale.set(1, 1, 1); d.updateMatrix(); malhas.corpo.setMatrixAt(n, d.matrix)
      d.position.set(b.x, y + 2.65, b.z); d.updateMatrix(); malhas.cabeca.setMatrixAt(n, d.matrix)
      d.position.set(b.x + Math.sin(ry) * 0.31, y + 2.7, b.z + Math.cos(ry) * 0.31); d.updateMatrix(); malhas.olhos.setMatrixAt(n, d.matrix)
      d.position.set(b.x, y + 0.45, b.z); d.updateMatrix(); malhas.pernas.setMatrixAt(n, d.matrix)
      n++
    }
    for (const m of malhas.robo) { m.count = n; m.instanceMatrix.needsUpdate = true }
    // um carro vazio despenca de vez em quando, longe da Kombi
    st.prox -= dt
    const kp = state.camera.position
    if (st.prox <= 0) {
      st.prox = 22 + Math.random() * 25
      const c = st.carros.find((x) => x.vida <= 0)
      if (c) { const a = Math.random() * Math.PI * 2, dd = 140 + Math.random() * 160; c.p.set(kp.x + Math.cos(a) * dd, kp.y + 140, kp.z + Math.sin(a) * dd); c.vy = 0; c.vida = 30; c.caiu = false; c.rot = Math.random() * Math.PI }
    }
    let nc = 0
    for (const c of st.carros) {
      if (c.vida <= 0) continue
      c.vida -= dt
      if (!c.caiu) {
        c.vy -= 24 * dt; c.p.y += c.vy * dt
        const ch = chao(c.p.x, c.p.z) + 0.6
        if (c.p.y <= ch) { c.p.y = ch; c.caiu = true; if (Math.hypot(c.p.x - kp.x, c.p.z - kp.z) < 260 && j) j.shake = Math.max(j.shake, 0.25) }
      }
      d.position.copy(c.p); d.rotation.set(c.caiu ? 0.25 : t * 2, c.rot, c.caiu ? 0.4 : t * 1.3); d.scale.set(1, 1, 1); d.updateMatrix()
      malhas.carro.setMatrixAt(nc++, d.matrix)
    }
    malhas.carro.count = nc; malhas.carro.instanceMatrix.needsUpdate = true
  })
  return (
    <>
      <primitive object={malhas.corpo} />
      <primitive object={malhas.cabeca} />
      <primitive object={malhas.olhos} />
      <primitive object={malhas.pernas} />
      <primitive object={malhas.carro} />
    </>
  )
}
