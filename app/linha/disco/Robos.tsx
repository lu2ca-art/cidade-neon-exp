"use client"

// AS MÁQUINAS E O CAOS (LU2CA 19/10): "a cidade está tomada por máquinas";
// "carros vazios despencados (carros que não carregam ninguém e ocupam a
// cidade sem motivo) — por isso a gente adora espatifar robôs no deserto".
//   - os ROBÔS do deserto: andam devagar pelas dunas, sem rumo. Bateu de Kombi
//     (rápido), eles espatifam: as peças voam e caem na areia; um prêmio
//     pequeno (água: a tecnologia dele). Voltam a aparecer longe, depois
//   - os CARROS VAZIOS despencando: de vez em quando um cai lá de cima, longe
//     da Kombi (nunca nela), levanta areia e fica ali um tempo
// Leve: tudo instanciado (4 malhas pros robôs, 1 pras peças, 1 pros carros).

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"

/* eslint-disable react-hooks/immutability --
   cena R3F: o estado dos robôs, das peças e dos carros muda a cada quadro
   (useFrame), como as instâncias do three.js; nada disso é estado do React */
type JogoMin = { voo?: boolean; ar: boolean; wx?: number; wz?: number; y: number; v: number; shake: number; flash: number }
const N = 16, PECAS = 7, CARROS = 3
// onde os robôs estão (o Corrida lê pra D-Bee falar deles)
export const ROBOS: { x: number; z: number; vivo: boolean }[] = []

function sorteio(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647) }

export function Robos({ jogo, chao, onEspatifou }: { jogo: React.RefObject<JogoMin>; chao: (x: number, z: number) => number; onEspatifou: () => void }) {
  const r = useMemo(() => sorteio(4242), [])
  const st = useMemo(() => {
    const robos = Array.from({ length: N }, () => ({ x: 0, z: 0, rumo: 0, fase: r() * 10, morto: 0 }))
    const pecas = Array.from({ length: N * PECAS }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), rot: new THREE.Euler(), vr: new THREE.Vector3(), vida: 0 }))
    const carros = Array.from({ length: CARROS }, () => ({ p: new THREE.Vector3(), vy: 0, vida: 0, caiu: false, rot: 0 }))
    return { robos, pecas, carros, prox: 18 }
  }, [r])
  // (re)nasce longe do centro, num anel do deserto (e perto do caminho da casa até a cidade)
  const nascer = (k: number, perto?: { x: number; z: number }) => {
    const b = st.robos[k]
    if (perto) { const a = r() * Math.PI * 2, d = 160 + r() * 260; b.x = perto.x + Math.cos(a) * d; b.z = perto.z + Math.sin(a) * d }
    else { const a = -2.4 + (r() - 0.5) * 1.6, d = 1350 + r() * 1500; b.x = Math.cos(a) * d; b.z = Math.sin(a) * d }
    if (Math.hypot(b.x, b.z) < 1300) { const m = 1300 / Math.hypot(b.x, b.z); b.x *= m; b.z *= m }
    b.rumo = r() * Math.PI * 2; b.morto = 0
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
    const pecas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), metal, N * PECAS)
    const carro = new THREE.InstancedMesh(new THREE.BoxGeometry(2, 1.3, 4.4), new THREE.MeshStandardMaterial({ color: "#5a5f6c", metalness: 0.5, roughness: 0.5 }), CARROS)
    for (const m of [corpo, cabeca, olhos, pernas, pecas, carro]) { m.frustumCulled = false; m.count = 0 }
    return { corpo, cabeca, olhos, pernas, pecas, carro }
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
    ROBOS.length = 0
    for (let k = 0; k < N; k++) {
      const b = st.robos[k]
      if (b.morto > 0) { b.morto -= dt; if (b.morto <= 0) nascer(k, kx !== null ? { x: kx, z: kz! } : undefined); ROBOS.push({ x: b.x, z: b.z, vivo: false }); continue }
      b.rumo += Math.sin(t * 0.3 + b.fase) * dt * 0.4
      b.x += Math.sin(b.rumo) * 1.1 * dt; b.z += Math.cos(b.rumo) * 1.1 * dt
      if (Math.hypot(b.x, b.z) < 1300) b.rumo += Math.PI
      const y = chao(b.x, b.z)
      ROBOS.push({ x: b.x, z: b.z, vivo: true })
      // bateu de Kombi (rápido, no chão das dunas): espatifa
      if (kx !== null && j && !j.ar && Math.abs(j.v) > 9 && Math.hypot(b.x - kx, b.z - kz!) < 3.2 && Math.abs(j.y - y) < 3) {
        b.morto = 25
        for (let q = 0; q < PECAS; q++) {
          const pc = st.pecas[k * PECAS + q]
          pc.p.set(b.x, y + 1 + q * 0.2, b.z)
          pc.v.set((Math.random() - 0.5) * 16 + Math.sin(Math.atan2(b.x - kx, b.z - kz!)) * 8, 7 + Math.random() * 9, (Math.random() - 0.5) * 16)
          pc.vr.set(Math.random() * 10, Math.random() * 10, Math.random() * 10); pc.vida = 6
        }
        j.shake = Math.max(j.shake, 0.6); j.flash = Math.max(j.flash, 0.25)
        try { navigator.vibrate?.([30, 20, 50]) } catch {}
        onEspatifou()
        continue
      }
      const passo = Math.sin(t * 5 + b.fase)
      d.position.set(b.x, y + 1.6 + Math.abs(passo) * 0.08, b.z); d.rotation.set(0, b.rumo, passo * 0.04); d.scale.set(1, 1, 1); d.updateMatrix(); malhas.corpo.setMatrixAt(n, d.matrix)
      d.position.set(b.x, y + 2.65, b.z); d.updateMatrix(); malhas.cabeca.setMatrixAt(n, d.matrix)
      d.position.set(b.x + Math.sin(b.rumo) * 0.31, y + 2.7, b.z + Math.cos(b.rumo) * 0.31); d.updateMatrix(); malhas.olhos.setMatrixAt(n, d.matrix)
      d.position.set(b.x, y + 0.45, b.z); d.updateMatrix(); malhas.pernas.setMatrixAt(n, d.matrix)
      n++
    }
    for (const m of [malhas.corpo, malhas.cabeca, malhas.olhos, malhas.pernas]) { m.count = n; m.instanceMatrix.needsUpdate = true }
    // as peças voando e caindo na areia
    let np = 0
    for (const pc of st.pecas) {
      if (pc.vida <= 0) continue
      pc.vida -= dt
      pc.v.y -= 24 * dt
      pc.p.addScaledVector(pc.v, dt)
      const ch = chao(pc.p.x, pc.p.z) + 0.17
      if (pc.p.y < ch) { pc.p.y = ch; pc.v.multiplyScalar(0.4); pc.v.y = Math.abs(pc.v.y) * 0.3; pc.vr.multiplyScalar(0.5) }
      pc.rot.x += pc.vr.x * dt; pc.rot.y += pc.vr.y * dt; pc.rot.z += pc.vr.z * dt
      d.position.copy(pc.p); d.rotation.copy(pc.rot); const s = Math.min(1, pc.vida); d.scale.set(s, s, s); d.updateMatrix()
      malhas.pecas.setMatrixAt(np++, d.matrix)
    }
    malhas.pecas.count = np; malhas.pecas.instanceMatrix.needsUpdate = true
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
      <primitive object={malhas.pecas} />
      <primitive object={malhas.carro} />
    </>
  )
}
