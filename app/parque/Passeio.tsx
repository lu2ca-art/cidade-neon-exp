"use client"
/* eslint-disable react-hooks/immutability -- three.js: corpos, brinquedos e câmera são do motor, mexidos a cada quadro */

// O PARQUE A PÉ (referências do LU2CA: Planet Coaster — gente circulando
// como gente, vários brinquedos, a água — e o GTA pra andar em terceira
// pessoa). A orla de noite: o lago no meio, o mar de um lado e a cidade
// acesa do outro. Você anda (joystick no celular, WASD no computador),
// arrasta a tela pra girar a câmera e chega perto de um brinquedo pra andar.

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { montarTrilho, CORRENTE, VEL_CORRENTE, G } from "./trilho"
import { CARROSSEL, MONTANHA_XZ, PERTO, RODA, type Brinquedo, type Controle } from "./lugares"


// onde fica cada coisa (metros; o portão no sul, o mar depois dele)
const LAGO = { x: 18, z: 2, rx: 17, rz: 12 }
const MONTANHA = new THREE.Vector3(MONTANHA_XZ[0], 0, MONTANHA_XZ[1])
const COLISORES: { x: number; z: number; r: number }[] = [
  { x: RODA.x, z: RODA.z, r: 5 }, { x: CARROSSEL.x, z: CARROSSEL.z, r: CARROSSEL.r + 0.6 },
  // a estação da montanha-russa
  { x: MONTANHA_XZ[0], z: MONTANHA_XZ[1] - 1, r: 4.2 }, { x: MONTANHA_XZ[0], z: MONTANHA_XZ[1] - 7, r: 4.2 }, { x: MONTANHA_XZ[0], z: MONTANHA_XZ[1] - 13, r: 4.2 },
]

// o caminho principal: um laço em volta do lago, com uma perna até a montanha-russa
const LACO = new THREE.CatmullRomCurve3([
  [0, 58], [24, 44], [46, 34], [62, 0], [56, -32], [40, -40], [16, -40], [-8, -30], [-30, -14], [-22, 18], [-8, 40],
].map(([x, z]) => new THREE.Vector3(x, 0, z)), true, "centripetal")
const PERNA = new THREE.CatmullRomCurve3([[-30, -14], [-50, -10], [MONTANHA.x + 8, MONTANHA.z - 6]].map(([x, z]) => new THREE.Vector3(x, 0, z)), false)

let semente = 11
const rnd = () => { semente = (semente * 16807) % 2147483647; return semente / 2147483647 }

function faixa(curva: THREE.Curve<THREE.Vector3>, n: number, larg: number) {
  const pos: number[] = [], idx: number[] = []
  for (let i = 0; i <= n; i++) {
    const p = curva.getPointAt(i / n), t = curva.getTangentAt(i / n)
    const lx = -t.z, lz = t.x, k = larg / 2 / Math.hypot(lx, lz)
    pos.push(p.x + lx * k, 0.02, p.z + lz * k, p.x - lx * k, 0.02, p.z - lz * k)
    if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
  return g
}

// ── o chão, os caminhos, o lago e o mar ──
function Chao() {
  const caminho = useMemo(() => faixa(LACO, 220, 5), [])
  const perna = useMemo(() => faixa(PERNA, 60, 4), [])
  const lago = useMemo(() => {
    const g = new THREE.PlaneGeometry(LAGO.rx * 2, LAGO.rz * 2, 40, 30); g.rotateX(-Math.PI / 2); return g
  }, [])
  const base = useMemo(() => Float32Array.from(lago.attributes.position.array), [lago])
  const mar = useMemo(() => { const g = new THREE.PlaneGeometry(900, 300, 60, 20); g.rotateX(-Math.PI / 2); return g }, [])
  const baseMar = useMemo(() => Float32Array.from(mar.attributes.position.array), [mar])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    // a água mexe: o lago de leve, o mar em ondas compridas
    const p = lago.attributes.position as THREE.BufferAttribute
    for (let k = 0; k < p.count; k++) { const x = base[k * 3], z = base[k * 3 + 2]; const fora = (x / LAGO.rx) ** 2 + (z / LAGO.rz) ** 2 > 1; p.setY(k, fora ? -3 : Math.sin(x * 0.5 + t * 1.2) * 0.05 + Math.cos(z * 0.6 + t) * 0.05) }
    p.needsUpdate = true; lago.computeVertexNormals()
    const m = mar.attributes.position as THREE.BufferAttribute
    for (let k = 0; k < m.count; k++) { const x = baseMar[k * 3], z = baseMar[k * 3 + 2]; m.setY(k, Math.sin(z * 0.08 + t * 0.9) * 0.5 + Math.sin(x * 0.03 + t * 0.4) * 0.3) }
    m.needsUpdate = true; mar.computeVertexNormals()
  })
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -40]}><planeGeometry args={[420, 300]} /><meshStandardMaterial color="#2c5a36" roughness={1} /></mesh>
      <mesh geometry={caminho}><meshStandardMaterial color="#d8c49a" roughness={0.9} /></mesh>
      <mesh geometry={perna}><meshStandardMaterial color="#d8c49a" roughness={0.9} /></mesh>
      {/* a praia e o mar da orla, depois do portão */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 92]}><planeGeometry args={[420, 26]} /><meshStandardMaterial color="#c9b48a" roughness={1} /></mesh>
      <mesh geometry={mar} position={[0, -0.4, 250]}><meshStandardMaterial color="#0d2f4a" roughness={0.15} metalness={0.55} /></mesh>
      <mesh geometry={lago} position={[LAGO.x, 0.05, LAGO.z]}><meshStandardMaterial color="#123c5a" roughness={0.1} metalness={0.6} /></mesh>
      {/* a borda de pedra do lago */}
      <mesh position={[LAGO.x, 0.1, LAGO.z]} scale={[1, 1, LAGO.rz / LAGO.rx]} rotation-x={-Math.PI / 2}><ringGeometry args={[LAGO.rx, LAGO.rx + 0.8, 60]} /><meshStandardMaterial color="#7d7a74" /></mesh>
    </group>
  )
}

// a cidade acesa no horizonte (o parque é na orla)
function Cidade() {
  const { geo, mat, n, mats } = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 64; c.height = 128; const g = c.getContext("2d")!
    g.fillStyle = "#0b0a18"; g.fillRect(0, 0, 64, 128)
    for (let y = 4; y < 128; y += 8) for (let x = 4; x < 64; x += 8) if (rnd() > 0.45) { g.fillStyle = ["#ffd9a0", "#9fd8ff", "#ff9fd8"][Math.floor(rnd() * 3)]; g.fillRect(x, y, 4, 5) }
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: "#8a8ab8", fog: false })
    const n = 70, mats: THREE.Matrix4[] = []
    for (let i = 0; i < n; i++) {
      const a = Math.PI * 0.9 + (i / n) * Math.PI * 1.2, r = 330 + rnd() * 80, h = 20 + rnd() * 80, w = 12 + rnd() * 18
      mats.push(new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * r, h / 2, Math.sin(a) * r - 40), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a), new THREE.Vector3(w, h, w)))
    }
    return { geo: new THREE.BoxGeometry(1, 1, 1), mat, n, mats }
  }, [])
  const ref = useRef<THREE.InstancedMesh>(null)
  useEffect(() => { const m = ref.current; if (!m) return; mats.forEach((x, i) => m.setMatrixAt(i, x)); m.instanceMatrix.needsUpdate = true }, [mats])
  return <instancedMesh ref={ref} args={[geo, mat, n]} />
}

// ── a roda-gigante ──
function RodaGigante({ girando, gondola }: { girando: React.RefObject<number>; gondola: React.RefObject<THREE.Object3D | null> }) {
  const roda = useRef<THREE.Group>(null)
  const gondolas = useRef<(THREE.Group | null)[]>([])
  const luzes = useRef<THREE.InstancedMesh>(null)
  const N = 12, NL = 48
  const cores = useMemo(() => [new THREE.Color("#ff3fb0"), new THREE.Color("#2fe8ff"), new THREE.Color("#ffc857")], [])
  useEffect(() => {
    const m = luzes.current; if (!m) return
    const o = new THREE.Object3D()
    for (let i = 0; i < NL; i++) { const a = (i / NL) * Math.PI * 2; o.position.set(Math.cos(a) * RODA.r, Math.sin(a) * RODA.r, 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix) }
    m.instanceMatrix.needsUpdate = true
  }, [])
  useFrame(({ clock }, dt) => {
    if (!roda.current) return
    roda.current.rotation.z += dt * (girando.current ?? 0.08)
    gondolas.current.forEach((g) => { if (g) g.rotation.z = -roda.current!.rotation.z })
    const m = luzes.current; if (m) { const k = Math.floor(clock.elapsedTime * 3); for (let i = 0; i < NL; i++) m.setColorAt(i, cores[(i + k) % 3]); if (m.instanceColor) m.instanceColor.needsUpdate = true }
  })
  return (
    <group position={[RODA.x, 0, RODA.z]}>
      {[-1.6, 1.6].map((z) => [-1, 1].map((l) => <mesh key={`${z}${l}`} position={[l * 4, RODA.h / 2, z]} rotation-z={-l * 0.24}><boxGeometry args={[0.5, RODA.h + 1.5, 0.5]} /><meshStandardMaterial color="#e8e4ee" /></mesh>))}
      <group ref={roda} position={[0, RODA.h, 0]}>
        <mesh><torusGeometry args={[RODA.r, 0.22, 8, 64]} /><meshStandardMaterial color="#f2eefa" /></mesh>
        <mesh><torusGeometry args={[RODA.r * 0.55, 0.14, 8, 48]} /><meshStandardMaterial color="#f2eefa" /></mesh>
        {Array.from({ length: N }, (_, i) => <mesh key={i} rotation-z={(i / N) * Math.PI * 2}><boxGeometry args={[RODA.r * 2, 0.12, 0.12]} /><meshStandardMaterial color="#d8d4e0" /></mesh>)}
        <instancedMesh ref={luzes} args={[undefined, undefined, NL]}><sphereGeometry args={[0.28, 8, 6]} /><meshBasicMaterial toneMapped={false} /></instancedMesh>
        {Array.from({ length: N }, (_, i) => {
          const a = (i / N) * Math.PI * 2
          return (
            <group key={i} position={[Math.cos(a) * RODA.r, Math.sin(a) * RODA.r, 0]}>
              <group ref={(g) => { gondolas.current[i] = g; if (i === 0 && gondola) gondola.current = g }}>
                <mesh position={[0, -1.4, 0]}><boxGeometry args={[2, 1.6, 1.8]} /><meshStandardMaterial color={["#ff3fb0", "#2fe8ff", "#ffc857", "#5dffa0"][i % 4]} /></mesh>
                <mesh position={[0, -0.4, 0]}><cylinderGeometry args={[0.05, 0.05, 0.9]} /><meshStandardMaterial color="#888" /></mesh>
              </group>
            </group>
          )
        })}
      </group>
    </group>
  )
}

// ── o carrossel ──
function Carrossel() {
  const g = useRef<THREE.Group>(null)
  const cavalos = useRef<(THREE.Mesh | null)[]>([])
  const toldo = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 16; const x = c.getContext("2d")!
    for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? "#ff3fb0" : "#f2eefa"; x.fillRect(i * 16, 0, 16, 16) }
    return new THREE.CanvasTexture(c)
  }, [])
  useFrame(({ clock }, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.5
    cavalos.current.forEach((m, i) => { if (m) m.position.y = 1.4 + Math.sin(clock.elapsedTime * 2.4 + i) * 0.35 })
  })
  return (
    <group position={[CARROSSEL.x, 0, CARROSSEL.z]}>
      <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[CARROSSEL.r, CARROSSEL.r, 0.5, 32]} /><meshStandardMaterial color="#5a2a5a" /></mesh>
      <group ref={g}>
        <mesh position={[0, 5.4, 0]}><coneGeometry args={[CARROSSEL.r + 0.6, 2.4, 32, 1, true]} /><meshStandardMaterial map={toldo} side={THREE.DoubleSide} emissive="#ff3fb0" emissiveIntensity={0.15} /></mesh>
        <mesh position={[0, 2.6, 0]}><cylinderGeometry args={[0.6, 0.6, 4.4, 16]} /><meshStandardMaterial color="#ffc857" emissive="#ffc857" emissiveIntensity={0.3} /></mesh>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2, r = CARROSSEL.r * 0.72
          return (
            <group key={i} position={[Math.cos(a) * r, 0, Math.sin(a) * r]} rotation-y={-a}>
              <mesh position={[0, 2.6, 0]}><cylinderGeometry args={[0.05, 0.05, 4.4]} /><meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.3} /></mesh>
              <mesh ref={(m) => { cavalos.current[i] = m }} position={[0, 1.4, 0]}><boxGeometry args={[0.35, 0.7, 1.3]} /><meshStandardMaterial color={i % 2 ? "#f2eefa" : "#2fe8ff"} /></mesh>
            </group>
          )
        })}
      </group>
    </group>
  )
}

// ── a montanha-russa (o mesmo trilho da volta em primeira pessoa), com o trem rodando ──
function MontanhaRussa() {
  const tr = useMemo(() => montarTrilho(700), [])
  const tubo = useMemo(() => new THREE.TubeGeometry(tr.curva, 600, 0.35, 6, true), [tr])
  const pilares = useMemo(() => tr.pontos.filter((_, i) => i % 14 === 0 && tr.pontos[i].y > 1.5), [tr])
  const trem = useRef<THREE.Group>(null)
  const s = useRef({ u: 0.5, v: 8 })
  useFrame((_, dtReal) => {
    const dt = Math.min(dtReal, 0.05), e = s.current
    const p = tr.curva.getPointAt(e.u)
    if (e.u > CORRENTE.ini && e.u < CORRENTE.fim) e.v = VEL_CORRENTE
    else e.v = Math.max(3, Math.sqrt(Math.max(1, 2 * G * (tr.alturaTopo + 1 - p.y))))
    e.u = (e.u + (e.v * dt) / tr.comp) % 1
    if (!trem.current) return
    const q = tr.curva.getPointAt(e.u), t = tr.curva.getTangentAt(e.u)
    trem.current.position.copy(q)
    trem.current.lookAt(q.clone().add(t))
  })
  return (
    <group position={MONTANHA}>
      <mesh geometry={tubo}><meshStandardMaterial color="#ff3fb0" emissive="#ff3fb0" emissiveIntensity={0.25} /></mesh>
      {pilares.map((p, i) => <mesh key={i} position={[p.x, p.y / 2, p.z]}><cylinderGeometry args={[0.18, 0.25, p.y, 6]} /><meshStandardMaterial color="#d8d4e0" /></mesh>)}
      <group ref={trem}>{[0, 1, 2, 3].map((k) => <mesh key={k} position={[0, 0.7, -k * 2.1]}><boxGeometry args={[1.6, 0.9, 1.9]} /><meshStandardMaterial color="#2fe8ff" emissive="#2fe8ff" emissiveIntensity={0.3} /></mesh>)}</group>
      {/* a estação */}
      <mesh position={[0, 1.5, -6]}><boxGeometry args={[6, 3, 18]} /><meshStandardMaterial color="#2a1a3a" /></mesh>
      <mesh position={[0, 3.2, -6]}><boxGeometry args={[7, 0.3, 19]} /><meshStandardMaterial color="#ff3fb0" emissive="#ff3fb0" emissiveIntensity={0.6} /></mesh>
    </group>
  )
}

// ── as barracas e os postes com o varal de luzes ──
const BARRACAS = [{ u: 0.08, nome: "PIPOCA", cor: "#ffc857" }, { u: 0.22, nome: "ALGODÃO DOCE", cor: "#ff9fd8" }, { u: 0.41, nome: "CHURROS", cor: "#ff6a35" }, { u: 0.63, nome: "TIRO AO ALVO", cor: "#2fe8ff" }, { u: 0.83, nome: "222", cor: "#5dffa0" }]
function letreiro(txt: string, cor: string) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 64; const g = c.getContext("2d")!
  g.fillStyle = "#14121c"; g.fillRect(0, 0, 256, 64); g.font = "900 34px Arial Black, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = cor; g.shadowColor = cor; g.shadowBlur = 12; g.fillText(txt, 128, 34)
  return new THREE.CanvasTexture(c)
}
function Barracas() {
  const lista = useMemo(() => BARRACAS.map((b) => {
    const p = LACO.getPointAt(b.u), t = LACO.getTangentAt(b.u)
    const fora = new THREE.Vector3(t.z, 0, -t.x).normalize()
    return { ...b, pos: p.clone().addScaledVector(fora, 5.5), rot: Math.atan2(-fora.x, -fora.z), tex: letreiro(b.nome, b.cor) }
  }), [])
  return (
    <>
      {lista.map((b) => (
        <group key={b.nome} position={b.pos} rotation-y={b.rot}>
          <mesh position={[0, 1.1, 0]}><boxGeometry args={[3.4, 2.2, 2.4]} /><meshStandardMaterial color="#f2eee6" /></mesh>
          <mesh position={[0, 2.5, 0.4]} rotation-x={0.25}><boxGeometry args={[3.8, 0.12, 3]} /><meshStandardMaterial color={b.cor} /></mesh>
          <mesh position={[0, 3.1, 1.2]}><planeGeometry args={[3.2, 0.8]} /><meshBasicMaterial map={b.tex} toneMapped={false} /></mesh>
          <mesh position={[0, 1.6, 1.21]}><planeGeometry args={[2.6, 0.9]} /><meshBasicMaterial color="#ffe8b0" toneMapped={false} /></mesh>
        </group>
      ))}
    </>
  )
}
function Postes() {
  const { postes, lampadas } = useMemo(() => {
    const postes: THREE.Vector3[] = [], lampadas: THREE.Vector3[] = []
    const n = 34
    for (let i = 0; i < n; i++) {
      const p = LACO.getPointAt(i / n), t = LACO.getTangentAt(i / n), dentro = new THREE.Vector3(-t.z, 0, t.x).normalize()
      postes.push(p.clone().addScaledVector(dentro, 3.2))
    }
    // o varal: lâmpadas em catenária entre um poste e o próximo
    for (let i = 0; i < n; i++) {
      const a = postes[i], b = postes[(i + 1) % n]
      for (let k = 1; k < 8; k++) { const f = k / 8; const p = a.clone().lerp(b, f); p.y = 4.2 - Math.sin(f * Math.PI) * 0.8; lampadas.push(p) }
    }
    return { postes, lampadas }
  }, [])
  const lamp = useRef<THREE.InstancedMesh>(null)
  const cores = useMemo(() => ["#ffd9a0", "#ff9fd8", "#9fd8ff", "#ffc857"].map((c) => new THREE.Color(c)), [])
  useEffect(() => {
    const m = lamp.current; if (!m) return
    const o = new THREE.Object3D()
    lampadas.forEach((p, i) => { o.position.copy(p); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, cores[i % 4]) })
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [lampadas, cores])
  return (
    <>
      {postes.map((p, i) => (
        <group key={i} position={p}>
          <mesh position={[0, 2.2, 0]}><cylinderGeometry args={[0.07, 0.09, 4.4, 6]} /><meshStandardMaterial color="#2a2a34" /></mesh>
          <mesh position={[0, 4.5, 0]}><sphereGeometry args={[0.22, 10, 8]} /><meshBasicMaterial color="#fff1d0" toneMapped={false} /></mesh>
        </group>
      ))}
      <instancedMesh ref={lamp} args={[undefined, undefined, lampadas.length]}><sphereGeometry args={[0.09, 6, 4]} /><meshBasicMaterial toneMapped={false} /></instancedMesh>
    </>
  )
}

// ── um corpo que anda (o jogador e os visitantes) ──
function Corpo({ cor, pele, refs }: { cor: string; pele: string; refs: { pernas: (THREE.Object3D | null)[]; bracos: (THREE.Object3D | null)[] } }) {
  return (
    <>
      <mesh position={[0, 1.2, 0]}><boxGeometry args={[0.42, 0.6, 0.26]} /><meshStandardMaterial color={cor} /></mesh>
      <mesh position={[0, 1.66, 0]}><sphereGeometry args={[0.15, 12, 8]} /><meshStandardMaterial color={pele} /></mesh>
      {[-1, 1].map((l, i) => <group key={i} ref={(b) => { refs.bracos[i] = b }} position={[l * 0.28, 1.46, 0]}><mesh position={[0, -0.27, 0]}><boxGeometry args={[0.1, 0.54, 0.1]} /><meshStandardMaterial color={cor} /></mesh></group>)}
      {[-1, 1].map((l, i) => <group key={i} ref={(p) => { refs.pernas[i] = p }} position={[l * 0.11, 0.9, 0]}><mesh position={[0, -0.44, 0]}><boxGeometry args={[0.15, 0.88, 0.16]} /><meshStandardMaterial color="#1b1530" /></mesh></group>)}
    </>
  )
}
const animarPasso = (refs: { pernas: (THREE.Object3D | null)[]; bracos: (THREE.Object3D | null)[] }, fase: number, amp: number) => {
  refs.pernas.forEach((p, i) => { if (p) p.rotation.x = Math.sin(fase + i * Math.PI) * 0.6 * amp })
  refs.bracos.forEach((b, i) => { if (b) b.rotation.x = -Math.sin(fase + i * Math.PI) * 0.5 * amp })
}

// ── os visitantes: andam pelo laço, param nas barracas, voltam a andar ──
const PELES = ["#5a3a26", "#c89a74", "#8a5a3a", "#e8c4a0", "#3a2418"]
const ROUPAS = ["#3a6ad8", "#d8a03a", "#2f9a6a", "#8a3ad8", "#d84a6a", "#e8e0d0", "#3a3a48", "#c86a3a", "#2fe8ff", "#ff3fb0"]
function Visitantes({ n = 30 }: { n?: number }) {
  const gs = useRef<(THREE.Group | null)[]>([])
  const partes = useMemo(() => Array.from({ length: n }, () => ({ pernas: [] as (THREE.Object3D | null)[], bracos: [] as (THREE.Object3D | null)[] })), [n])
  const vs = useMemo(() => Array.from({ length: n }, (_, i) => ({ s: rnd(), vel: (0.9 + rnd() * 0.7) * (rnd() < 0.5 ? 1 : -1), lado: (rnd() - 0.5) * 3.2, para: 0, fase: rnd() * 6, cor: ROUPAS[i % ROUPAS.length], pele: PELES[i % PELES.length], balao: rnd() < 0.25 })), [n])
  const L = useMemo(() => LACO.getLength(), [])
  useFrame(({ clock }, dtReal) => {
    const dt = Math.min(dtReal, 0.05), t = clock.elapsedTime
    vs.forEach((v, i) => {
      const g = gs.current[i]; if (!g) return
      if (v.para > t) animarPasso(partes[i], 0, 0)
      else {
        v.s = (v.s + (v.vel * dt) / L + 1) % 1
        v.fase += dt * Math.abs(v.vel) * 5
        animarPasso(partes[i], v.fase, 1)
        // de vez em quando para (uma barraca, a vista do lago)
        if (rnd() < dt * 0.04) v.para = t + 2 + rnd() * 5
      }
      const p = LACO.getPointAt(v.s), tg = LACO.getTangentAt(v.s)
      g.position.set(p.x - tg.z * v.lado, Math.abs(Math.sin(v.fase)) * 0.04, p.z + tg.x * v.lado)
      g.rotation.y = Math.atan2(tg.x * Math.sign(v.vel), tg.z * Math.sign(v.vel))
    })
  })
  return (
    <>
      {vs.map((v, i) => (
        <group key={i} ref={(g) => { gs.current[i] = g }}>
          <Corpo cor={v.cor} pele={v.pele} refs={partes[i]} />
          {v.balao && <><mesh position={[0.35, 2.9, 0]}><sphereGeometry args={[0.3, 10, 8]} /><meshStandardMaterial color={ROUPAS[(i + 3) % ROUPAS.length]} emissive={ROUPAS[(i + 3) % ROUPAS.length]} emissiveIntensity={0.3} /></mesh><mesh position={[0.32, 2.05, 0]}><cylinderGeometry args={[0.005, 0.005, 1.3]} /><meshBasicMaterial color="#ddd" /></mesh></>}
        </group>
      ))}
    </>
  )
}

// ── você: anda pra onde a câmera aponta (GTA), corre com o joystick no fundo ──
function Jogador({ ctl, pos, onPerto, montado, gondola }: { ctl: React.RefObject<Controle>; pos: React.RefObject<THREE.Vector3>; onPerto: (b: Brinquedo | null) => void; montado: boolean; gondola: React.RefObject<THREE.Object3D | null> }) {
  const g = useRef<THREE.Group>(null)
  const partes = useMemo(() => ({ pernas: [] as (THREE.Object3D | null)[], bracos: [] as (THREE.Object3D | null)[] }), [])
  const camera = useThree((s) => s.camera)
  const st = useRef({ rot: Math.PI, fase: 0, perto: null as Brinquedo | null, olhar: new THREE.Vector3(), alvo: new THREE.Vector3(), tmp: new THREE.Vector3() })
  useFrame((_, dtReal) => {
    const dt = Math.min(dtReal, 0.05), c = ctl.current, s = st.current, p = pos.current
    if (montado && gondola.current) {
      // na roda-gigante: a câmera sentada na gôndola, olhando a orla e a cidade
      gondola.current.visible = false
      gondola.current.getWorldPosition(s.tmp); s.tmp.y -= 1.2
      camera.position.lerp(s.tmp, Math.min(1, dt * 6))
      s.olhar.set(s.tmp.x + Math.sin(c.yaw) * 10, s.tmp.y - 2 + c.pitch * 8, s.tmp.z + Math.cos(c.yaw) * 10)
      camera.lookAt(s.olhar)
      if (g.current) g.current.visible = false
      return
    }
    if (g.current) g.current.visible = true
    if (gondola.current) gondola.current.visible = true
    const mag = Math.min(1, Math.hypot(c.mx, c.my))
    const vel = mag * (c.corre || mag > 0.92 ? 6.5 : 2.6)
    if (mag > 0.05) {
      // a direção do joystick é relativa à câmera
      const ang = c.yaw - Math.atan2(c.mx, -c.my)
      p.x += Math.sin(ang) * vel * dt; p.z += Math.cos(ang) * vel * dt
      let d = ang - s.rot; d = ((d + Math.PI * 3) % (Math.PI * 2)) - Math.PI
      s.rot += d * Math.min(1, dt * 10)
      s.fase += dt * vel * 2.6
    }
    // não entra no lago nem nos brinquedos; fica dentro do parque
    const lx = (p.x - LAGO.x) / (LAGO.rx + 0.6), lz = (p.z - LAGO.z) / (LAGO.rz + 0.6), dl = Math.hypot(lx, lz)
    if (dl < 1) { p.x = LAGO.x + (lx / dl) * (LAGO.rx + 0.6); p.z = LAGO.z + (lz / dl) * (LAGO.rz + 0.6) }
    for (const k of COLISORES) { const dx = p.x - k.x, dz = p.z - k.z, d = Math.hypot(dx, dz); if (d < k.r) { p.x = k.x + (dx / d) * k.r; p.z = k.z + (dz / d) * k.r } }
    p.x = Math.max(-110, Math.min(90, p.x)); p.z = Math.max(-130, Math.min(80, p.z))
    if (g.current) { g.current.position.set(p.x, mag > 0.05 ? Math.abs(Math.sin(s.fase)) * 0.05 : 0, p.z); g.current.rotation.y = s.rot }
    animarPasso(partes, s.fase, mag > 0.05 ? Math.min(1.3, vel / 3) : 0)
    // perto de um brinquedo
    let perto: Brinquedo | null = null
    for (const b of PERTO) if (Math.hypot(p.x - b.x, p.z - b.z) < 6) perto = b.id
    if (perto !== s.perto) { s.perto = perto; onPerto(perto) }
    // a câmera: atrás e um pouco acima, girando com o dedo
    const dist = 6, alt = 2.4 + c.pitch * 3
    s.alvo.set(p.x - Math.sin(c.yaw) * dist, alt, p.z - Math.cos(c.yaw) * dist)
    camera.position.lerp(s.alvo, Math.min(1, dt * 6))
    s.olhar.set(p.x, 1.5, p.z)
    camera.lookAt(s.olhar)
  })
  return <group ref={g}><Corpo cor="#ff3fb0" pele="#5a3a26" refs={partes} /><mesh position={[0, 1.8, 0.04]}><cylinderGeometry args={[0.16, 0.16, 0.07, 12]} /><meshStandardMaterial color="#14121c" /></mesh></group>
}

export function Passeio({ ctl, onPerto, montado }: { ctl: React.RefObject<Controle>; onPerto: (b: Brinquedo | null) => void; montado: boolean }) {
  const pos = useRef(new THREE.Vector3(0, 0, 62))
  const girando = useRef(0.08)
  const gondola = useRef<THREE.Object3D | null>(null)
  useEffect(() => { girando.current = montado ? 0.18 : 0.08 }, [montado])
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    const w = window as unknown as { __pq?: (x: number, z: number) => void; __pqPos?: () => number[] }
    w.__pq = (x, z) => pos.current.set(x, 0, z)
    w.__pqPos = () => [pos.current.x, pos.current.z]
  }, [])
  return (
    <Canvas dpr={[1, 1.6]} camera={{ fov: 62, near: 0.1, far: 900, position: [0, 3, 70] }} className="pq-cvs">
      <color attach="background" args={["#0b0a24"]} />
      <fog attach="fog" args={["#141236", 60, 330]} />
      <hemisphereLight args={["#7a7ad0", "#2a4a2a", 1.6]} />
      <ambientLight intensity={0.35} color="#9a9ad8" />
      <directionalLight position={[-60, 80, 40]} intensity={0.5} color="#b9ccff" />
      <pointLight position={[RODA.x, 10, RODA.z + 8]} color="#ff3fb0" intensity={120} distance={40} />
      <pointLight position={[CARROSSEL.x, 6, CARROSSEL.z]} color="#ffc857" intensity={90} distance={26} />
      <pointLight position={[0, 6, 40]} color="#ffd9a0" intensity={80} distance={40} />
      <Chao />
      <Cidade />
      <RodaGigante girando={girando} gondola={gondola} />
      <Carrossel />
      <MontanhaRussa />
      <Barracas />
      <Postes />
      <Visitantes />
      <Jogador ctl={ctl} pos={pos} onPerto={onPerto} montado={montado} gondola={gondola} />
    </Canvas>
  )
}
