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
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { Cabine, DESLOCA, ESCALA, OLHO } from "../linha/estrada/Cabine"
import { KOMBI_LAYOUT } from "@/lib/kombi-layout"
import { RadioPainel3D, type RadioPainelProps } from "./RadioPainel3D"
import { curvaHiper } from "./hiper"

// o rádio do layout, no espaço da Kombi (a Cabine escala o layout por ESCALA e DESLOCA)
const R = KOMBI_LAYOUT.radio.position
export const POS_RADIO: [number, number, number] = [R[0] * ESCALA[0] + DESLOCA[0], R[1] * ESCALA[1] + DESLOCA[1], R[2] * ESCALA[2] + DESLOCA[2]]

export type EstadoKombi = { partida: boolean; tocando: boolean; foco?: boolean; hiper?: number }


// o rádio: um pouco à frente do rádio do layout (cobre o pequeno), virado pra cabeça
const CENTRO_RADIO = new THREE.Vector3(POS_RADIO[0] - 0.02, POS_RADIO[1] + 0.02, POS_RADIO[2] + 0.05)
const PARA_OLHO = new THREE.Vector3().subVectors(OLHO, CENTRO_RADIO).normalize()
// o foco: a cabeça inclina até ficar a ~40 cm da tela
const OLHO_FOCO = CENTRO_RADIO.clone().addScaledVector(PARA_OLHO, 0.4)

// ── o olhar: arrasta pra olhar em volta; solta e, depois de um tempo, volta pra frente ──
function Olhar({ estado, sairFoco }: { estado: React.RefObject<EstadoKombi>; sairFoco: () => void }) {
  const { camera, gl, size } = useThree()
  // em pé (celular): a lente abre (o mesmo campo na horizontal) e o olhar desce pro painel
  const emPe = size.width < size.height
  const base = emPe ? -0.2 : -0.12
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera, asp = size.width / size.height
    cam.fov = asp < 1 ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(72) / 2) / asp)) : 64
    cam.fov = Math.min(cam.fov, 118)
    cam.updateProjectionMatrix()
    o.current.fov0 = cam.fov
  }, [camera, size])
  const o = useRef({ yaw: 0, pitch: base, alvoYaw: 0, alvoPitch: base, arrasta: false, soltou: 0, x: 0, y: 0, x0: 0, y0: 0, f: 0, fov0: 0 })
  useEffect(() => { o.current.alvoPitch = base }, [base])
  useEffect(() => {
    const el = gl.domElement
    const desce = (e: PointerEvent) => { o.current.arrasta = true; o.current.x = e.clientX; o.current.y = e.clientY; o.current.x0 = e.clientX; o.current.y0 = e.clientY }
    const move = (e: PointerEvent) => {
      const s = o.current
      if (!s.arrasta) return
      // arrastou com o rádio em foco: a cabeça volta pro banco
      if (estado.current?.foco) { if (Math.hypot(e.clientX - s.x0, e.clientY - s.y0) > 10) sairFoco(); else return }
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
  }, [gl, estado, sairFoco])
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
    const hi = estado.current?.hiper ?? 0
    const treme = partida ? 0.006 + hi * 0.012 : 0.0016
    // a lente abre com a velocidade (o hiperlapso)
    const cam = camera as THREE.PerspectiveCamera
    if (!s.fov0) s.fov0 = cam.fov
    const fovAlvo = (s.fov0 ?? cam.fov) + hi * 34
    if (Math.abs(cam.fov - fovAlvo) > 0.05) { cam.fov = fovAlvo; cam.updateProjectionMatrix() }
    const fx = (Math.sin(t * 47) + Math.sin(t * 83.3) * 0.5) * treme
    const fy = (Math.sin(t * 59.1 + 1.3) + Math.sin(t * 97.7) * 0.5) * treme
    // respirar: a cabeça mexe um tiquinho (ninguém fica parado feito câmera)
    const resp = Math.sin(t * 0.9) * 0.004
    // o foco no rádio: a cabeça vai até ele (e volta), suave
    s.f += ((estado.current?.foco && !partida ? 1 : 0) - s.f) * Math.min(1, dt * 4)
    const cp = Math.cos(s.pitch)
    tmpA.set(OLHO.x + fx, OLHO.y + fy + resp, OLHO.z).lerp(OLHO_FOCO, s.f)
    camera.position.copy(tmpA)
    tmpB.set(OLHO.x - Math.sin(s.yaw) * cp * 10, OLHO.y + Math.sin(s.pitch) * 10, OLHO.z - Math.cos(s.yaw) * cp * 10).lerp(CENTRO_RADIO, s.f)
    camera.lookAt(tmpB)
  })
  return null
}
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3()

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
  const cidade = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    const hi = estado.current?.hiper ?? 0
    // a estrada: de parada a um borrão
    const v = estado.current?.partida ? 8 + hi * 420 : 0
    if (chao.current) chao.current.position.z = (chao.current.position.z + v * dt) % 24
    // a cidade vem correndo (no fim do hiperlapso ela está em cima)
    if (cidade.current) cidade.current.position.z = -420 + hi * 380
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
      <group ref={cidade} position={[0, -1, -420]}>
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

export type RadioDaKombi = Omit<RadioPainelProps, "focado" | "onFoco">

export function KombiEntrada({ estado, radio }: { estado: React.RefObject<EstadoKombi>; radio: RadioDaKombi }) {
  // a cabine pede refs da estrada: parada, sem curva, volante reto
  const zero = useRef(0), volante = useRef(0), vel = useRef(0)
  const [focado, setFocado] = useState(false)
  const foco = (sim: boolean) => { estado.current.foco = sim; setFocado(sim) }
  const sairFoco = useRef(() => foco(false)).current
  return (
    <Canvas className="en-canvas" onPointerMissed={() => { if (estado.current.foco) foco(false) }} dpr={[1, 2]} camera={{ fov: 64, near: 0.03, far: 2000, position: [OLHO.x, OLHO.y, OLHO.z] }} gl={{ antialias: true, powerPreference: "high-performance" }}>
      <Velocimetro estado={estado} vel={vel} />
      <hemisphereLight args={["#8f7dff", "#0b1a3a", 1.2]} />
      <ambientLight intensity={0.35} color="#7f8cff" />
      {/* a luz de dentro: quente em cima, o rosa do neon por baixo do painel */}
      <pointLight position={[0, OLHO.y + 0.35, OLHO.z + 0.2]} intensity={1.4} distance={3.2} color="#ffd6a0" />
      <pointLight position={[POS_RADIO[0], POS_RADIO[1] - 0.15, POS_RADIO[2] + 0.25]} intensity={0.9} distance={1.6} color="#ff3fb0" />
      <Suspense fallback={null}>
        <Cabine balanco={zero} disco={false} objetos={[]} carona={null} volante={volante} vel={vel} tinta="#ffffff" neon="#ff3fb0" />
      </Suspense>
      <RadioNoPainel>
        <RadioPainel3D {...radio} focado={focado} onFoco={() => foco(true)} />
      </RadioNoPainel>
      <LaFora estado={estado} />
      <Hiperlapso estado={estado} />
      <Olhar estado={estado} sairFoco={sairFoco} />
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

// o rádio no centro do painel, de frente pra cabeça do motorista
function RadioNoPainel({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null)
  useLayoutEffect(() => { g.current?.position.copy(CENTRO_RADIO); g.current?.lookAt(OLHO) }, [])
  return <group ref={g}>{children}</group>
}

// ── o hiperlapso: os riscos de luz (cada luz do deserto vira um traço que passa) ──
const N_RISCOS = 420
function Hiperlapso({ estado }: { estado: React.RefObject<EstadoKombi> }) {
  const malha = useRef<THREE.InstancedMesh>(null)
  const inicio = useRef<number | null>(null)
  const riscos = useMemo(() => { let s = 222; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }; return Array.from({ length: N_RISCOS }, (_, i) => {
    const a = rnd() * Math.PI * 2, r = 4 + Math.pow(rnd(), 0.6) * 70
    return { x: Math.cos(a) * r, y: Math.abs(Math.sin(a)) * r * 0.55 + 0.5, z: -20 - rnd() * 600, cor: i % 5 === 0 ? "#ff3fb0" : i % 3 === 0 ? "#ffc857" : "#7df9ff" }
  }) }, [])
  const tmp = useMemo(() => new THREE.Object3D(), [])
  const cor = useMemo(() => new THREE.Color(), [])
  useLayoutEffect(() => {
    const m = malha.current
    if (!m) return
    riscos.forEach((r, i) => m.setColorAt(i, cor.set(r.cor)))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [riscos, cor])
  useFrame((st, dt) => {
    const e = estado.current
    if (!e?.partida) { inicio.current = null; e && (e.hiper = 0); if (malha.current) malha.current.visible = false; return }
    if (inicio.current === null) inicio.current = st.clock.elapsedTime
    const hi = curvaHiper(st.clock.elapsedTime - inicio.current)
    e.hiper = hi
    const m = malha.current
    if (!m) return
    m.visible = hi > 0.01
    const v = 30 + hi * 900, comp = 0.5 + hi * 60
    riscos.forEach((r, i) => {
      r.z += v * dt
      if (r.z > 4) r.z -= 620
      tmp.position.set(r.x, r.y, r.z)
      tmp.scale.set(1, 1, comp)
      tmp.updateMatrix()
      m.setMatrixAt(i, tmp.matrix)
    })
    m.instanceMatrix.needsUpdate = true
    ;(m.material as THREE.MeshBasicMaterial).opacity = Math.min(1, hi * 2)
  })
  return (
    <instancedMesh ref={malha} args={[undefined, undefined, N_RISCOS]} visible={false} frustumCulled={false}>
      <boxGeometry args={[0.06, 0.06, 1]} />
      <meshBasicMaterial transparent opacity={0} toneMapped={false} depthWrite={false} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  )
}
