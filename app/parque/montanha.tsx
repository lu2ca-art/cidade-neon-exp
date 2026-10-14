"use client"

// A MONTANHA-RUSSA (CN-19, protótipo): primeira pessoa no carrinho da frente.
// Sobe na corrente, despenca, faz a curva, o looping e volta pra estação.
// Segurar o botão levanta os braços; arrastar pro lado olha em volta.

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { Cidade } from "../linha/interior/comum"
import { CORRENTE, ESTACAO, G, VEL_CORRENTE, montarTrilho, quadro, type Trilho } from "./trilho"
import { criarVento, estalo, sino } from "./sons"

export interface Volta { velMax: number; gMax: number; gMin: number; bracos: number }

// o que o carrinho mede durante a volta, lido pelo HUD
interface Medida { v: number; g: number; fase: "estacao" | "corrente" | "solto" | "freio" | "fim" }

const DESCIDA = { ini: CORRENTE.fim, fim: 0.3 }

function Trilhos({ tr }: { tr: Trilho }) {
  const { trilhos, dormentes, pilares } = useMemo(() => {
    const passo = 2
    const lados = [-0.55, 0.55].map((d) => {
      const pts: THREE.Vector3[] = []
      for (let i = 0; i < tr.n; i += passo) pts.push(tr.pontos[i].clone().addScaledVector(tr.lado[i], d))
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), tr.n / passo, 0.07, 6, true)
    })
    const espinha: THREE.Vector3[] = []
    for (let i = 0; i < tr.n; i += passo) espinha.push(tr.pontos[i].clone().addScaledVector(tr.cima[i], -0.35))
    lados.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(espinha, true), tr.n / passo, 0.14, 6, true))
    const dorm: THREE.Matrix4[] = []
    const o = new THREE.Object3D(), m = new THREE.Matrix4()
    for (let i = 0; i < tr.n; i += 3) {
      m.makeBasis(tr.lado[i], tr.cima[i], tr.frente[i].clone().negate())
      o.quaternion.setFromRotationMatrix(m)
      o.position.copy(tr.pontos[i]).addScaledVector(tr.cima[i], -0.15)
      o.scale.set(1.3, 0.08, 0.16); o.updateMatrix()
      dorm.push(o.matrix.clone())
    }
    const pil: { x: number; z: number; h: number }[] = []
    for (let i = 0; i < tr.n; i += 22) {
      const p = tr.pontos[i]
      if (tr.cima[i].y < 0.6 || p.y < 1.5) continue
      pil.push({ x: p.x, z: p.z, h: p.y - 0.5 })
    }
    return { trilhos: lados, dormentes: dorm, pilares: pil }
  }, [tr])
  const dormRef = useRef<THREE.InstancedMesh>(null)
  const pilRef = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    dormentes.forEach((mm, i) => dormRef.current?.setMatrixAt(i, mm))
    const o = new THREE.Object3D()
    pilares.forEach((p, i) => { o.position.set(p.x, p.h / 2, p.z); o.scale.set(1, p.h, 1); o.updateMatrix(); pilRef.current?.setMatrixAt(i, o.matrix) })
    for (const r of [dormRef.current, pilRef.current]) if (r) { r.instanceMatrix.needsUpdate = true; r.computeBoundingSphere() }
  }, [dormentes, pilares])
  return (
    <group>
      {trilhos.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color={i < 2 ? "#d9dde8" : "#ff3fb0"} emissive={i < 2 ? "#2fe8ff" : "#ff3fb0"} emissiveIntensity={i < 2 ? 0.35 : 0.6} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      <instancedMesh ref={dormRef} args={[undefined, undefined, dormentes.length]}>
        <boxGeometry />
        <meshStandardMaterial color="#3a3446" roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={pilRef} args={[undefined, undefined, pilares.length]}>
        <cylinderGeometry args={[0.18, 0.25, 1, 6]} />
        <meshStandardMaterial color="#2a2836" metalness={0.5} roughness={0.5} />
      </instancedMesh>
    </group>
  )
}

// a roda-gigante girando devagar, com as lâmpadas dos raios
function RodaGigante({ pos }: { pos: [number, number, number] }) {
  const roda = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (roda.current) roda.current.rotation.z += dt * 0.08 })
  const R = 20, raios = 16
  return (
    <group position={pos} rotation-y={0.5}>
      <mesh position={[0, R / 2 + 1, 0]}>
        <boxGeometry args={[1, R + 2, 1]} />
        <meshStandardMaterial color="#26222f" />
      </mesh>
      <group ref={roda} position={[0, R + 2, 0]}>
        <mesh><torusGeometry args={[R, 0.25, 6, 64]} /><meshStandardMaterial color="#ffc857" emissive="#ffc857" emissiveIntensity={1.2} /></mesh>
        <mesh><torusGeometry args={[R * 0.55, 0.15, 6, 48]} /><meshStandardMaterial color="#b38cff" emissive="#b38cff" emissiveIntensity={1} /></mesh>
        {Array.from({ length: raios }, (_, i) => {
          const a = (i / raios) * Math.PI * 2
          return (
            <group key={i} rotation-z={a}>
              <mesh position={[R / 2, 0, 0]}><boxGeometry args={[R, 0.12, 0.12]} /><meshStandardMaterial color="#2fe8ff" emissive="#2fe8ff" emissiveIntensity={0.8} /></mesh>
              <mesh position={[R, -1.2, 0]}><boxGeometry args={[1.4, 1.4, 1.4]} /><meshStandardMaterial color={i % 2 ? "#ff3fb0" : "#5dffa0"} emissive={i % 2 ? "#ff3fb0" : "#5dffa0"} emissiveIntensity={0.5} /></mesh>
            </group>
          )
        })}
      </group>
    </group>
  )
}

// varais de lâmpadas entre postes, o chão do parque
function Lampadas() {
  const pts = useMemo(() => {
    const out: [number, number, number][] = []
    for (let k = 0; k < 6; k++) {
      const x0 = -30 + k * 14, z0 = 22
      for (let i = 0; i <= 10; i++) out.push([x0 + i * 1.4, 5 - Math.sin((i / 10) * Math.PI) * 1.2, z0])
    }
    return out
  }, [])
  return (
    <group>
      {pts.map((p, i) => (
        <mesh key={i} position={p}><sphereGeometry args={[0.12, 6, 6]} /><meshBasicMaterial color={["#ffc857", "#ff3fb0", "#2fe8ff"][i % 3]} /></mesh>
      ))}
    </group>
  )
}

function Passeio({ tr, rodando, bracos, olhar, onMedida, onFim }: {
  tr: Trilho; rodando: boolean; bracos: React.RefObject<boolean>; olhar: React.RefObject<number>
  onMedida: (m: Medida) => void; onFim: (v: Volta) => void
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const carro = useRef<THREE.Group>(null)
  const st = useRef({ u: 0, v: 0, E: 0, fase: "estacao" as Medida["fase"], vel: new THREE.Vector3(), g: 1, velMax: 0, gMax: 1, gMin: 1, bracoT: 0, descidaT: 0, tique: 0, hud: 0, yaw: 0 })
  const som = useRef<ReturnType<typeof criarVento>>(null)
  const alvo = useMemo(() => new THREE.Vector3(), [])
  const mat = useMemo(() => new THREE.Matrix4(), [])

  useEffect(() => {
    if (!rodando) return
    som.current = criarVento()
    sino()
    return () => { som.current?.parar(); som.current = null }
  }, [rodando])

  useFrame((_, dtReal) => {
    const s = st.current
    const dt = Math.min(dtReal, 1 / 30)
    let q = quadro(tr, s.u)
    if (rodando && s.fase !== "fim") {
      // a física: estação empurra, corrente puxa, depois é só energia
      if (s.fase === "estacao") {
        s.v = Math.min(2.5, s.v + dt * 1.5)
        if (s.u >= CORRENTE.ini) s.fase = "corrente"
      } else if (s.fase === "corrente") {
        s.v += (VEL_CORRENTE - s.v) * Math.min(1, dt * 2)
        s.tique += dt * s.v
        if (s.tique > 0.9) { s.tique = 0; estalo() }
        if (s.u >= CORRENTE.fim) { s.fase = "solto"; s.E = q.p.y + (s.v * s.v) / (2 * G) }
      } else if (s.fase === "solto") {
        s.E -= 0.009 * s.v * dt
        s.v = Math.sqrt(Math.max(2.2 * 2.2, 2 * G * (s.E - q.p.y)))
        if (s.u >= ESTACAO) s.fase = "freio"
      } else if (s.fase === "freio") {
        s.v = Math.max(0.6, s.v - dt * 7)
      }
      const du = (s.v * dt) / tr.comp
      s.u += du
      if (s.fase === "freio" && s.u >= 1) {
        s.u = 0; s.v = 0; s.fase = "fim"
        sino()
        onFim({ velMax: s.velMax, gMax: s.gMax, gMin: s.gMin, bracos: s.descidaT > 0 ? s.bracoT / s.descidaT : 0 })
      }
      q = quadro(tr, s.u)
      // a força g que o corpo sente (no "cima" do carrinho)
      const vNova = q.t.clone().multiplyScalar(s.v)
      const a = vNova.clone().sub(s.vel).divideScalar(Math.max(dt, 1e-3))
      s.vel.copy(vNova)
      const gAgora = (a.y + G) * q.up.y / G + (a.x * q.up.x + a.z * q.up.z) / G
      s.g += (gAgora - s.g) * Math.min(1, dt * 6)
      if (s.fase === "solto") { s.velMax = Math.max(s.velMax, s.v); s.gMax = Math.max(s.gMax, s.g); s.gMin = Math.min(s.gMin, s.g) }
      if (s.u >= DESCIDA.ini && s.u <= DESCIDA.fim) { s.descidaT += dt; if (bracos.current) s.bracoT += dt }
      som.current?.vel(s.v)
      s.hud += dt
      if (s.hud > 0.1) { s.hud = 0; onMedida({ v: s.v, g: s.g, fase: s.fase }) }
    }
    // a câmera sentada no carrinho, o olhar solto pro lado
    s.yaw += ((olhar.current ?? 0) - s.yaw) * Math.min(1, dt * 8)
    const olho = q.p.clone().addScaledVector(q.up, 1.45)
    camera.position.copy(olho)
    camera.up.copy(q.up)
    const frente = quadro(tr, s.u + 6 / tr.comp)
    alvo.copy(frente.p).addScaledVector(frente.up, 1.0)
    const dir = alvo.clone().sub(olho).normalize().applyAxisAngle(q.up, s.yaw)
    camera.lookAt(olho.clone().add(dir))
    // o carrinho embaixo da câmera
    if (carro.current) {
      mat.makeBasis(q.l, q.up, q.t.clone().negate())
      carro.current.quaternion.setFromRotationMatrix(mat)
      carro.current.position.copy(q.p)
    }
  })

  return (
    <group ref={carro}>
      {/* o carrinho da frente: banco, laterais e a barra de segurança */}
      <mesh position={[0, 0.2, 0.2]}><boxGeometry args={[1.5, 0.3, 2]} /><meshStandardMaterial color="#ff3fb0" emissive="#ff3fb0" emissiveIntensity={0.25} metalness={0.4} roughness={0.4} /></mesh>
      <mesh position={[0, 0.45, -0.95]} rotation-x={-0.5}><boxGeometry args={[1.5, 0.08, 0.5]} /><meshStandardMaterial color="#ff3fb0" emissive="#ff3fb0" emissiveIntensity={0.25} metalness={0.4} roughness={0.4} /></mesh>
      <mesh position={[0, 0.85, -0.35]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.035, 0.035, 1.1, 8]} /><meshStandardMaterial color="#e8e8f0" metalness={0.9} roughness={0.2} /></mesh>
      <mesh position={[0, 0.56, -1.12]}><boxGeometry args={[1.2, 0.04, 0.02]} /><meshBasicMaterial color="#2fe8ff" /></mesh>
    </group>
  )
}

export function Montanha({ onFim, onSair }: { onFim: (v: Volta) => void; onSair: () => void }) {
  const tr = useMemo(() => montarTrilho(), [])
  const [rodando, setRodando] = useState(false)
  const [m, setM] = useState<Medida>({ v: 0, g: 1, fase: "estacao" })
  const [maos, setMaos] = useState(false)
  const [dica, setDica] = useState(true)
  const bracos = useRef(false)
  const olhar = useRef(0)
  const arrasto = useRef<{ x: number; yaw: number } | null>(null)

  const levantar = (v: boolean) => { bracos.current = v; setMaos(v); if (v) setDica(false) }

  return (
    <div className="pq-jogo">
      <Canvas
        className="pq-cvs"
        dpr={[1, 1.75]}
        camera={{ fov: 72, near: 0.1, far: 600 }}
        gl={{ antialias: true }}
        onPointerDown={(e) => { arrasto.current = { x: e.clientX, yaw: olhar.current } }}
        onPointerMove={(e) => {
          if (!arrasto.current) return
          const w = (e.currentTarget as HTMLElement).clientWidth || 400
          olhar.current = Math.max(-1.7, Math.min(1.7, arrasto.current.yaw - ((e.clientX - arrasto.current.x) / w) * 2.6))
        }}
        onPointerUp={() => { arrasto.current = null; olhar.current = 0 }}
        onPointerLeave={() => { arrasto.current = null; olhar.current = 0 }}
      >
        <color attach="background" args={["#0a0818"]} />
        <fog attach="fog" args={["#140c26", 60, 340]} />
        <ambientLight intensity={0.35} color="#b8a8ff" />
        <hemisphereLight args={["#6f6cff", "#1a0f1c", 0.45]} />
        <pointLight position={[0, 34, -64]} color="#ff3fb0" intensity={120} distance={60} decay={2} />
        <pointLight position={[58, 24, -86]} color="#2fe8ff" intensity={120} distance={50} decay={2} />
        <mesh rotation-x={-Math.PI / 2} position={[0, 0, -50]}>
          <planeGeometry args={[700, 700]} />
          <meshStandardMaterial color="#120f1a" roughness={0.95} />
        </mesh>
        <Trilhos tr={tr} />
        <RodaGigante pos={[-38, 0, -70]} />
        <Lampadas />
        <Cidade raio={230} n={90} cor="#ff3fb0" brilho={0.08} />
        <Passeio tr={tr} rodando={rodando} bracos={bracos} olhar={olhar} onMedida={setM} onFim={(v) => { setRodando(false); onFim(v) }} />
      </Canvas>

      <div className="pq-hud">
        <span><b>{Math.round(m.v * 3.6)}</b><small>km/h</small></span>
        <span><b>{m.g.toFixed(1)}</b><small>g</small></span>
      </div>
      {maos && <div className="pq-bracos" aria-hidden><i /><i /></div>}
      {!rodando && m.fase === "estacao" && (
        <div className="pq-embarque">
          <button type="button" className="pq-sair" onClick={onSair}>‹ voltar</button>
          <button type="button" className="pq-partir" onClick={() => setRodando(true)}>partir</button>
          <p>arrasta pro lado pra olhar em volta</p>
        </div>
      )}
      {rodando && (
        <>
          {dica && m.fase === "corrente" && <p className="pq-dica">segura o botão pra levantar os braços</p>}
          <button
            type="button"
            className={`pq-maos${maos ? " is-on" : ""}`}
            onPointerDown={(e) => { e.stopPropagation(); levantar(true) }}
            onPointerUp={() => levantar(false)}
            onPointerLeave={() => levantar(false)}
            onPointerCancel={() => levantar(false)}
          >
            braços
          </button>
        </>
      )}
    </div>
  )
}
