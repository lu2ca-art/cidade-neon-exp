"use client"

// A VIAGEM PRA FORA (ep. 3, arco lugar 10): pela primeira vez a estrada
// acaba e a cidade fica no retrovisor. É uma viagem quieta, só dirigir:
// segura pra andar, solta e a Kombi vai parando. Sem rádio (a 222 saiu do
// ar), sem HUD, sem missão piscando. Primeiro a câmera olha pra trás (a
// cidade cinza ficando pequena); depois corta pra frente (a luz que a Notti
// viu do terraço crescendo). Chegou: a cena da casa (cenas.ts).
//
// O mundo anda, a Kombi fica parada no meio: a terra, os postes e as marcas
// da estrada correm por baixo dela.

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { Cinema } from "./estrada/Cinema"
import { Kombi222 } from "./estrada/Kombi222"
import { KombiHerbal } from "./estrada/KombiHerbal"
import { Seguro } from "./estrada/Seguro"

const DIST = 1300 // m até a casa
const VMAX = 24 // m/s
const POSTE = 38 // um poste a cada tantos metros
const MARCA = 12 // marcas no meio da estrada

// as legendas da viagem, pelo caminho (fração da distância)
const LEGENDAS: { em: number; texto: string }[] = [
  { em: 0.02, texto: "a pista acaba. começa a terra" },
  { em: 0.16, texto: "no retrovisor, a cidade cinza. sem a 222, nenhum letreiro pisca" },
  { em: 0.34, texto: "o celular sem sinal. pela primeira vez, ninguém te chama" },
  { em: 0.58, texto: "lá na frente, uma luz. a mesma" },
  { em: 0.86, texto: "uma casa" },
]

interface Estado { d: number; v: number; segura: boolean; fim: boolean; virou: boolean }

export function Viagem({ onFim }: { onFim: () => void }) {
  const st = useRef<Estado>({ d: 0, v: 0, segura: false, fim: false, virou: false })
  const [legenda, setLegenda] = useState<string | null>(null)
  const [plano, setPlano] = useState<"tras" | "frente">("tras")
  const [corte, setCorte] = useState(false)
  const [parado, setParado] = useState(true)
  const [saindo, setSaindo] = useState(false)
  const fim = useRef(onFim)
  useEffect(() => { fim.current = onFim }, [onFim])

  // o que muda devagar (legenda, plano, fim) sai do estado da física
  // num relógio separado, pra não re-renderizar a cada frame
  useEffect(() => {
    const iv = setInterval(() => {
      const s = st.current
      const p = s.d / DIST
      const l = [...LEGENDAS].reverse().find((x) => p >= x.em && p < x.em + 0.12)
      setLegenda(l ? l.texto : null)
      setParado(s.v < 0.5 && !s.segura)
      if (p >= 0.45 && !s.virou) {
        s.virou = true
        setPlano("frente")
        setCorte(true)
        setTimeout(() => setCorte(false), 380)
      }
      if (p >= 1 && !s.fim) {
        s.fim = true
        setSaindo(true)
        setTimeout(() => fim.current(), 1600)
      }
    }, 200)
    return () => clearInterval(iv)
  }, [])

  // atalho de desenvolvimento: __viagem(1200) pula pra perto da casa
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    const w = window as unknown as Record<string, unknown>
    w.__viagem = (d: number) => { st.current.d = d }
    return () => { delete w.__viagem }
  }, [])

  const segurar = (v: boolean) => { st.current.segura = v }

  return (
    <div
      className={`l-estrada-fora ${saindo ? "is-saindo" : ""}`}
      onPointerDown={() => segurar(true)}
      onPointerUp={() => segurar(false)}
      onPointerLeave={() => segurar(false)}
      onPointerCancel={() => segurar(false)}
      onKeyDown={(e) => { if (e.key === " " || e.key === "ArrowUp" || e.key === "w") segurar(true) }}
      onKeyUp={() => segurar(false)}
      tabIndex={0}
    >
      <Canvas className="l-estrada-fora-cvs" dpr={[1, 1.5]} gl={{ antialias: false, powerPreference: "high-performance", stencil: false }} camera={{ fov: 50, near: 0.1, far: 2400 }}>
        <Mundo st={st} plano={plano} />
      </Canvas>
      <div className="l-cena-tarja is-cima" />
      <div className="l-cena-tarja is-baixo" />
      {corte && <div className="l-estrada-fora-corte" />}
      {legenda && <p key={legenda} className="l-estrada-fora-legenda">{legenda}</p>}
      {parado && !saindo && <small className="l-estrada-fora-dica">segura pra dirigir</small>}
    </div>
  )
}

/* eslint-disable react-hooks/immutability -- three.js: cena, névoa e geradores são do motor, não estado do React (o mesmo da Corrida) */
function Mundo({ st, plano }: { st: React.MutableRefObject<Estado>; plano: "tras" | "frente" }) {
  const { camera, scene } = useThree()
  const vel = useRef(0)
  const turbo = useRef(false)
  const esterco = useRef(0)
  const kombi = useRef<THREE.Group>(null)
  const postes = useRef<THREE.InstancedMesh>(null)
  const marcas = useRef<THREE.InstancedMesh>(null)
  const casa = useRef<THREE.Group>(null)
  const luzLonge = useRef<THREE.Mesh>(null)
  const cidade = useRef<THREE.Group>(null)
  const nPostes = 24
  const nMarcas = 60
  const tmp = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => {
    scene.background = new THREE.Color("#04050b")
    scene.fog = new THREE.Fog("#04050b", 40, 460)
    return () => { scene.fog = null }
  }, [scene])

  // a cidade lá atrás: prédios sem cor (apagão), uma janela ou outra acesa
  const predios = useMemo(() => {
    const out: { x: number; h: number; w: number; z: number; acesa: boolean }[] = []
    let seed = 7
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 70; i++) out.push({ x: -520 + i * 15 + r() * 8, h: 20 + r() * 110, w: 8 + r() * 10, z: 1300 + r() * 160, acesa: r() < 0.18 })
    return out
  }, [])

  // as estrelas: um céu de verdade, longe das luzes da cidade
  const estrelas = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const n = 900
    const pos = new Float32Array(n * 3)
    let seed = 3
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < n; i++) {
      const th = r() * Math.PI * 2
      const ph = Math.acos(0.15 + r() * 0.85)
      pos[i * 3] = Math.sin(ph) * Math.cos(th) * 1800
      pos[i * 3 + 1] = Math.cos(ph) * 1800
      pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * 1800
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    return g
  }, [])

  useFrame((s, dtBruto) => {
    const dt = Math.min(dtBruto, 0.05)
    const e = st.current
    // só dirigir: segura acelera, solta vai parando (na chegada, freia sozinha)
    const falta = DIST - e.d
    const alvo = e.fim ? 0 : e.segura ? (falta < 60 ? Math.max(4, falta * 0.3) : VMAX) : 0
    e.v += (alvo - e.v) * Math.min(1, dt * (e.segura ? 0.55 : 0.35))
    e.d = Math.min(DIST, e.d + e.v * dt)
    vel.current = e.v
    const t = s.clock.elapsedTime
    // a Kombi balança na terra
    if (kombi.current) {
      kombi.current.position.y = Math.sin(t * 9) * 0.012 * Math.min(1, e.v / 8)
      kombi.current.rotation.z = Math.sin(t * 1.3) * 0.006 * Math.min(1, e.v / 8)
    }
    // os postes e as marcas passam
    if (postes.current) {
      for (let i = 0; i < nPostes; i++) {
        tmp.position.set(6.5, 3, 120 - i * POSTE + (e.d % POSTE))
        tmp.rotation.set(0, 0, 0)
        tmp.updateMatrix()
        postes.current.setMatrixAt(i, tmp.matrix)
      }
      postes.current.instanceMatrix.needsUpdate = true
    }
    if (marcas.current) {
      for (let i = 0; i < nMarcas; i++) {
        tmp.position.set(0, 0.03, 120 - i * MARCA + (e.d % MARCA))
        tmp.rotation.set(-Math.PI / 2, 0, 0)
        tmp.updateMatrix()
        marcas.current.setMatrixAt(i, tmp.matrix)
      }
      marcas.current.instanceMatrix.needsUpdate = true
    }
    // a casa vem chegando; a luz longe cresce; a cidade some no retrovisor
    if (casa.current) casa.current.position.z = -(DIST - e.d) - 14
    if (luzLonge.current) {
      const p = e.d / DIST
      luzLonge.current.scale.setScalar(1 + p * 3)
      luzLonge.current.visible = DIST - e.d > 380
    }
    if (cidade.current) cidade.current.position.z = e.d * 0.35
    // a câmera: primeiro olhando pra trás (a cidade), depois pra frente
    if (plano === "tras") {
      camera.position.set(-3.4 + Math.sin(t * 0.3) * 0.15, 1.35, -8.5)
      camera.lookAt(0.4, 1.4, 6)
    } else {
      camera.position.set(0.6 + Math.sin(t * 0.25) * 0.2, 2.5, 8.2)
      camera.lookAt(0, 1.6, -30)
    }
  })

  return (
    <>
      <ambientLight intensity={0.18} color="#8090c0" />
      <directionalLight position={[-30, 60, -40]} intensity={0.35} color="#b8c8ff" />
      <points geometry={estrelas}>
        <pointsMaterial size={2.2} sizeAttenuation={false} color="#dfe6ff" fog={false} transparent opacity={0.85} />
      </points>
      {/* a lua */}
      <mesh position={[-500, 520, -1200]}>
        <sphereGeometry args={[34, 24, 16]} />
        <meshBasicMaterial color="#f1f0e6" fog={false} />
      </mesh>
      {/* o chão de terra e a estrada */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, -400]}>
        <planeGeometry args={[3000, 3000]} />
        <meshStandardMaterial color="#17141a" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, -400]}>
        <planeGeometry args={[7, 3000]} />
        <meshStandardMaterial color="#26232a" roughness={0.95} />
      </mesh>
      <instancedMesh ref={marcas} args={[undefined, undefined, nMarcas]} frustumCulled={false}>
        <planeGeometry args={[0.18, 3.2]} />
        <meshStandardMaterial color="#a89d86" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={postes} args={[undefined, undefined, nPostes]} frustumCulled={false}>
        <boxGeometry args={[0.16, 6, 0.16]} />
        <meshStandardMaterial color="#2a2530" roughness={1} />
      </instancedMesh>
      {/* a cidade lá atrás, cinza, ficando pequena */}
      <group ref={cidade}>
        {predios.map((p, i) => (
          <mesh key={i} position={[p.x, p.h / 2, p.z]}>
            <boxGeometry args={[p.w, p.h, p.w]} />
            <meshBasicMaterial color={p.acesa ? "#3a3c46" : "#15161c"} fog={false} />
          </mesh>
        ))}
      </group>
      {/* a luz que a Notti viu do terraço */}
      <mesh ref={luzLonge} position={[1.5, 3, -1500]}>
        <sphereGeometry args={[1.6, 10, 8]} />
        <meshBasicMaterial color="#ffcf8a" fog={false} toneMapped={false} />
      </mesh>
      {/* a casa: uma só, no fim da estrada */}
      <group ref={casa} position={[0, 0, -DIST]}>
        <group position={[9, 0, 0]}>
          <mesh position={[0, 2.4, 0]}>
            <boxGeometry args={[9, 4.8, 7]} />
            <meshStandardMaterial color="#2c2730" roughness={0.9} />
          </mesh>
          <mesh position={[0, 5.8, 0]} rotation-z={Math.PI / 4} scale={[1, 1, 1]}>
            <boxGeometry args={[5.2, 5.2, 7.4]} />
            <meshStandardMaterial color="#1d1a22" roughness={0.9} />
          </mesh>
          {/* a janela acesa e a porta aberta */}
          <mesh position={[-4.52, 2.6, 1.6]} rotation-y={-Math.PI / 2}>
            <planeGeometry args={[1.6, 1.3]} />
            <meshBasicMaterial color="#ffcf8a" toneMapped={false} />
          </mesh>
          <mesh position={[-4.52, 1.1, -1.4]} rotation-y={-Math.PI / 2}>
            <planeGeometry args={[1.1, 2.2]} />
            <meshBasicMaterial color="#ffb867" toneMapped={false} />
          </mesh>
          <pointLight position={[-6, 3, 0]} color="#ffcf8a" intensity={40} distance={22} decay={2} />
        </group>
      </group>
      {/* a Kombi, parada no meio do mundo que anda */}
      <group ref={kombi}>
        <Seguro nome="kombi-viagem" reserva={<Kombi222 turbo={turbo} velocidade={vel} esterco={esterco} />}>
          <Suspense fallback={<Kombi222 turbo={turbo} velocidade={vel} esterco={esterco} />}>
            <KombiHerbal />
            <Kombi222 turbo={turbo} velocidade={vel} esterco={esterco} soEfeitos />
          </Suspense>
        </Seguro>
        <pointLight position={[0, 1, -4]} color="#fff1d6" intensity={60} distance={30} decay={2} />
        <pointLight position={[0, 3, 3]} color="#9fb4ff" intensity={14} distance={9} decay={2} />
      </group>
      <Seguro nome="lente-viagem"><Cinema /></Seguro>
    </>
  )
}
/* eslint-enable react-hooks/immutability */
