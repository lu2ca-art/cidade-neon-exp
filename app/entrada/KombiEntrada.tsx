"use client"

// A PÁGINA INICIAL DENTRO DA KOMBI (22/11, o dono: "a página inicial do jogo vai ser
// dentro da kombi... que o usuário se sinta de verdade dentro do veículo. E a rádio tem
// que estar ligada ao painel do carro").
//
// A cabine é a MESMA do jogo em primeira pessoa (estrada/Cabine.tsx: o interior do
// Blender, o painel, o volante, o toca-discos), com a cabeça no mesmo ponto (OLHO).
// A Kombi está parada no deserto, de noite, de frente pra cidade lá longe. O motor em
// marcha lenta treme a cabine de leve; dá pra olhar em volta arrastando (e o olhar volta
// pra frente sozinho, como no jogo). O display do rádio fica preso no painel, no lugar
// do rádio do layout. A senha é a partida: certa, o motor pega e a Kombi entra na cidade.

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Stars } from "@react-three/drei"
import { Suspense, useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { Cabine, DESLOCA, ESCALA, OLHO } from "../linha/estrada/Cabine"
import { KOMBI_LAYOUT } from "@/lib/kombi-layout"

// o rádio do layout, no espaço da Kombi (a Cabine escala o layout por ESCALA e DESLOCA)
const R = KOMBI_LAYOUT.radio.position
export const POS_RADIO: [number, number, number] = [R[0] * ESCALA[0] + DESLOCA[0], R[1] * ESCALA[1] + DESLOCA[1], R[2] * ESCALA[2] + DESLOCA[2]]

export type EstadoKombi = { partida: boolean; tocando: boolean }

// ── o olhar: arrasta pra olhar em volta; solta e, depois de um tempo, volta pra frente ──
function Olhar({ estado }: { estado: React.RefObject<EstadoKombi> }) {
  const { camera, gl, size } = useThree()
  // em pé (celular): a lente abre (o mesmo campo na horizontal) e o olhar desce pro painel
  const emPe = size.width < size.height
  const base = emPe ? -0.2 : -0.12
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera, asp = size.width / size.height
    cam.fov = asp < 1 ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(72) / 2) / asp)) : 64
    cam.fov = Math.min(cam.fov, 118)
    cam.updateProjectionMatrix()
  }, [camera, size])
  const o = useRef({ yaw: 0, pitch: base, alvoYaw: 0, alvoPitch: base, arrasta: false, soltou: 0, x: 0, y: 0 })
  useEffect(() => { o.current.alvoPitch = base }, [base])
  useEffect(() => {
    const el = gl.domElement
    const desce = (e: PointerEvent) => { o.current.arrasta = true; o.current.x = e.clientX; o.current.y = e.clientY }
    const move = (e: PointerEvent) => {
      const s = o.current
      if (!s.arrasta) return
      const k = 2.4 / Math.max(320, el.clientWidth)
      s.alvoYaw = Math.max(-1.9, Math.min(1.9, s.alvoYaw + (e.clientX - s.x) * k * 1.6))
      s.alvoPitch = Math.max(-0.7, Math.min(0.45, s.alvoPitch + (e.clientY - s.y) * k))
      s.x = e.clientX; s.y = e.clientY
    }
    const sobe = () => { if (o.current.arrasta) { o.current.arrasta = false; o.current.soltou = performance.now() } }
    el.addEventListener("pointerdown", desce)
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", sobe)
    window.addEventListener("pointercancel", sobe)
    return () => { el.removeEventListener("pointerdown", desce); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", sobe); window.removeEventListener("pointercancel", sobe) }
  }, [gl])
  useFrame((st, dtRaw) => {
    const dt = Math.min(0.05, dtRaw), s = o.current, t = st.clock.elapsedTime
    if (!s.arrasta && s.soltou && performance.now() - s.soltou > 7000) { s.alvoYaw = 0; s.alvoPitch = base; s.soltou = 0 }
    // a partida: o olhar volta pra frente (a estrada andando, a cidade chegando)
    if (estado.current?.partida) { s.arrasta = false; s.alvoYaw = 0; s.alvoPitch = base }
    const r = s.arrasta ? 14 : 3
    s.yaw += (s.alvoYaw - s.yaw) * Math.min(1, dt * r)
    s.pitch += (s.alvoPitch - s.pitch) * Math.min(1, dt * r)
    // o motor: marcha lenta treme de leve; a partida sacode e a Kombi anda
    const partida = !!estado.current?.partida
    const treme = partida ? 0.012 : 0.0016
    const fx = (Math.sin(t * 47) + Math.sin(t * 83.3) * 0.5) * treme
    const fy = (Math.sin(t * 59.1 + 1.3) + Math.sin(t * 97.7) * 0.5) * treme
    // respirar: a cabeça mexe um tiquinho (ninguém fica parado feito câmera)
    const resp = Math.sin(t * 0.9) * 0.004
    camera.position.set(OLHO.x + fx, OLHO.y + fy + resp, OLHO.z)
    const cp = Math.cos(s.pitch)
    camera.lookAt(OLHO.x - Math.sin(s.yaw) * cp * 10, OLHO.y + Math.sin(s.pitch) * 10, OLHO.z - Math.cos(s.yaw) * cp * 10)
  })
  return null
}

// ── lá fora: o deserto de noite e a cidade no horizonte (a cidade chama) ──
function LaFora({ estado }: { estado: React.RefObject<EstadoKombi> }) {
  const chao = useRef<THREE.Group>(null)
  const predios = useMemo(() => {
    const l: { x: number; h: number; w: number; cor: string }[] = []
    const cores = ["#ff3fb0", "#2fe8ff", "#ffc857", "#9b8cff", "#ff6a35"]
    let s = 7
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
    for (let i = 0; i < 46; i++) l.push({ x: (rnd() - 0.5) * 520, h: 18 + rnd() * rnd() * 150, w: 6 + rnd() * 16, cor: cores[Math.floor(rnd() * cores.length)] })
    return l
  }, [])
  // a partida: o chão anda (a Kombi sai), cada vez mais rápido
  const vel = useRef(0)
  useFrame((_, dt) => {
    const alvo = estado.current?.partida ? 40 : 0
    vel.current += (alvo - vel.current) * Math.min(1, dt * 0.8)
    if (chao.current) chao.current.position.z = (chao.current.position.z + vel.current * dt) % 24
  })
  return (
    <>
      <color attach="background" args={["#05040b"]} />
      <fog attach="fog" args={["#120a22", 120, 1400]} />
      <Stars radius={600} depth={120} count={2600} factor={7} saturation={0.4} fade speed={0.4} />
      {/* o brilho da cidade no céu, atrás dos prédios */}
      <mesh position={[0, 30, -470]}>
        <planeGeometry args={[1400, 160]} />
        <meshBasicMaterial color="#ff3fb0" transparent opacity={0.22} depthWrite={false} toneMapped={false} />
      </mesh>
      <group position={[0, -1, -420]}>
        {predios.map((p, i) => (
          <group key={i} position={[p.x, p.h / 2, (i % 5) * -14]}>
            <mesh><boxGeometry args={[p.w, p.h, p.w]} /><meshBasicMaterial color="#0a0814" /></mesh>
            {/* a coroa de neon de cada prédio */}
            <mesh position={[0, p.h / 2 - 1.2, p.w / 2 + 0.05]}><planeGeometry args={[p.w * 0.9, 2.6]} /><meshBasicMaterial color={p.cor} toneMapped={false} /></mesh>
            <mesh position={[0, p.h * 0.1, p.w / 2 + 0.05]}><planeGeometry args={[p.w * 0.12, p.h * 0.6]} /><meshBasicMaterial color={p.cor} transparent opacity={0.7} toneMapped={false} /></mesh>
          </group>
        ))}
      </group>
      {/* a areia e a estrada de terra, com marcas que passam quando a Kombi anda */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, -400]}>
        <planeGeometry args={[2400, 900]} />
        <meshStandardMaterial color="#2a1a2e" roughness={1} />
      </mesh>
      <group ref={chao}>
        {Array.from({ length: 30 }, (_, i) => (
          <mesh key={i} rotation-x={-Math.PI / 2} position={[0, 0, 6 - i * 24]}>
            <planeGeometry args={[0.25, 6]} />
            <meshBasicMaterial color="#ffc857" transparent opacity={0.35} />
          </mesh>
        ))}
      </group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, -400]}>
        <planeGeometry args={[7, 900]} />
        <meshStandardMaterial color="#1a1220" roughness={1} />
      </mesh>
    </>
  )
}

export function KombiEntrada({ estado, radio }: { estado: React.RefObject<EstadoKombi>; radio: React.RefObject<HTMLDivElement | null> }) {
  // a cabine pede refs da estrada: parada, sem curva, volante reto
  const zero = useRef(0), volante = useRef(0), vel = useRef(0)
  return (
    <Canvas className="en-canvas" dpr={[1, 2]} camera={{ fov: 64, near: 0.03, far: 2000, position: [OLHO.x, OLHO.y, OLHO.z] }} gl={{ antialias: true, powerPreference: "high-performance" }}>
      <Velocimetro estado={estado} vel={vel} />
      <hemisphereLight args={["#8f7dff", "#0b1a3a", 1.2]} />
      <ambientLight intensity={0.35} color="#7f8cff" />
      {/* a luz de dentro: quente em cima, o rosa do neon por baixo do painel */}
      <pointLight position={[0, OLHO.y + 0.35, OLHO.z + 0.2]} intensity={1.4} distance={3.2} color="#ffd6a0" />
      <pointLight position={[POS_RADIO[0], POS_RADIO[1] - 0.15, POS_RADIO[2] + 0.25]} intensity={0.9} distance={1.6} color="#ff3fb0" />
      <Suspense fallback={null}>
        <Cabine balanco={zero} disco={false} objetos={[]} carona={null} volante={volante} vel={vel} tinta="#ffffff" neon="#ff3fb0" />
      </Suspense>
      <AncoraRadio el={radio} />
      <LaFora estado={estado} />
      <Olhar estado={estado} />
    </Canvas>
  )
}

// o velocímetro do painel sobe na partida
function Velocimetro({ estado, vel }: { estado: React.RefObject<EstadoKombi>; vel: React.RefObject<number> }) {
  useFrame((_, dt) => {
    const alvo = estado.current?.partida ? 22 : 0
    vel.current = (vel.current ?? 0) + (alvo - (vel.current ?? 0)) * Math.min(1, dt * 0.8)
  })
  return null
}

// ── o rádio preso no painel: a cada quadro, o display (DOM, fora do canvas) vai pro
// ponto do rádio na tela, no tamanho que o painel tem àquela distância ──
const LARGURA_RADIO = 0.27 // m: a frente do rádio no painel
function AncoraRadio({ el }: { el: React.RefObject<HTMLDivElement | null> }) {
  const { camera, size } = useThree()
  const v = useMemo(() => new THREE.Vector3(), [])
  const p = useMemo(() => new THREE.Vector3(...POS_RADIO), [])
  useFrame(() => {
    const d = el.current
    if (!d) return
    v.copy(p).project(camera)
    const atras = v.z > 1 || Math.abs(v.x) > 1.4 || Math.abs(v.y) > 1.4
    d.style.visibility = atras ? "hidden" : "visible"
    if (atras) return
    const x = ((v.x + 1) / 2) * size.width, y = ((1 - v.y) / 2) * size.height
    const dist = camera.position.distanceTo(p)
    const cam = camera as THREE.PerspectiveCamera
    const pxPorMetro = size.height / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * dist)
    // nunca menor que o dedo consegue usar (os botões com ~34 px)
    const esc = Math.max(0.68, (LARGURA_RADIO * pxPorMetro) / (d.offsetWidth || 300))
    d.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${esc.toFixed(3)})`
  })
  return null
}
