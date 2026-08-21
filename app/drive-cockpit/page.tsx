"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { Text } from "@react-three/drei"
import { Suspense, useState, useRef, useEffect, useMemo } from "react"
import * as THREE from "three"

// Faixa demo que roda no toca-discos embutido do painel.
// (Integração completa com a loja de discos vem em v2.)
const DEMO_TRACK = {
  file: "/loja-discos/disco-05.mp3",
  titulo: "The St. Louis Blues",
  autor: "W. C. Handy",
}

// ─── Cidade cyberpunk ao fundo ────────────────────────────────────────────────
// Prédios são apenas box neon fininhos que se movem em -Z pra dar sensação de
// velocidade. Aleatoriedade fixa via seed pra look consistente.
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function CityBackdrop() {
  const groupRef = useRef<THREE.Group>(null)
  const rand = useMemo(() => seededRandom(42), [])
  const buildings = useMemo(() => {
    const arr: {
      pos: [number, number, number]
      size: [number, number, number]
      color: string
      windows: number
    }[] = []
    const colors = ["#ff00ff", "#00ffff", "#ff2d78", "#cc00ff", "#ff6b35", "#ffcc00"]
    for (let i = 0; i < 80; i++) {
      const x = (rand() - 0.5) * 40
      const z = -10 - rand() * 60
      const h = 6 + rand() * 14
      const w = 1.5 + rand() * 2
      const c = colors[Math.floor(rand() * colors.length)]
      arr.push({
        pos: [x, h / 2 - 1, z],
        size: [w, h, w],
        color: c,
        windows: Math.floor(rand() * 3),
      })
    }
    return arr
  }, [rand])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    groupRef.current.position.z += delta * 4
    // recicla: quando passa da câmera, volta pro fundo
    if (groupRef.current.position.z > 20) groupRef.current.position.z = -30
  })

  return (
    <group ref={groupRef}>
      {buildings.map((b, i) => (
        <group key={i} position={b.pos}>
          {/* silhueta do prédio (base escura, quase preta) */}
          <mesh>
            <boxGeometry args={b.size} />
            <meshStandardMaterial color="#050510" />
          </mesh>
          {/* "letreiro" neon numa face — plane fininho iluminado */}
          <mesh position={[0, b.size[1] * 0.25, b.size[2] / 2 + 0.02]}>
            <planeGeometry args={[b.size[0] * 0.7, b.size[1] * 0.15]} />
            <meshBasicMaterial color={b.color} toneMapped={false} />
          </mesh>
          {b.windows > 0 && (
            <mesh position={[0, -b.size[1] * 0.15, b.size[2] / 2 + 0.02]}>
              <planeGeometry args={[b.size[0] * 0.5, b.size[1] * 0.08]} />
              <meshBasicMaterial color={b.color} toneMapped={false} transparent opacity={0.6} />
            </mesh>
          )}
        </group>
      ))}
      {/* rua molhada — plane no chão */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, -30]}>
        <planeGeometry args={[60, 100]} />
        <meshStandardMaterial color="#0a0a1a" roughness={0.2} metalness={0.8} />
      </mesh>
    </group>
  )
}

// ─── Toca-discos embutido no painel ───────────────────────────────────────────
function DashTurntable({ isPlaying, color = "#ff2d78" }: { isPlaying: boolean; color?: string }) {
  const plateRef = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (plateRef.current && isPlaying) plateRef.current.rotation.y += delta * 4
  })

  return (
    <group>
      {/* base circular embutida no painel */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.03, 32]} />
        <meshStandardMaterial color="#0a0a12" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* prato + disco girando */}
      <group ref={plateRef} position={[0, 0, 0.02]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.24, 0.24, 0.01, 48]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.5} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.006]}>
          <ringGeometry args={[0.09, 0.23, 48]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.007]}>
          <circleGeometry args={[0.08, 32]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      </group>
      {/* LED play indicator ao lado */}
      <mesh position={[0.35, 0, 0.02]}>
        <sphereGeometry args={[0.02, 12, 12]} />
        <meshBasicMaterial color={isPlaying ? "#00ff88" : "#332222"} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ─── Mostrador luminoso (agulha simples) ──────────────────────────────────────
function Gauge({
  value = 0.5,
  label,
  color = "#ff2d78",
}: {
  value?: number
  label: string
  color?: string
}) {
  const needleAngle = -Math.PI * 0.75 + value * Math.PI * 1.5
  return (
    <group>
      {/* base */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.02, 32]} />
        <meshStandardMaterial color="#0a0a12" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* face iluminada */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.011]}>
        <ringGeometry args={[0.14, 0.17, 32]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* agulha */}
      <mesh position={[0, 0, 0.02]} rotation={[0, 0, needleAngle]}>
        <boxGeometry args={[0.12, 0.008, 0.008]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.025]}>
        <sphereGeometry args={[0.02, 12, 12]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      {/* label abaixo */}
      <Text
        position={[0, -0.24, 0.01]}
        fontSize={0.05}
        color="#a0a0b0"
        anchorX="center"
      >
        {label}
      </Text>
    </group>
  )
}

// ─── Painel completo ──────────────────────────────────────────────────────────
function Dashboard({ isPlaying, speed }: { isPlaying: boolean; speed: number }) {
  return (
    <group position={[0, 0.05, -0.85]}>
      {/* base do painel — box curvo estilizado */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[3.2, 0.8, 0.6]} />
        <meshStandardMaterial color="#12121e" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* strip de LED superior magenta */}
      <mesh position={[0, 0.32, 0.31]}>
        <planeGeometry args={[3.0, 0.03]} />
        <meshBasicMaterial color="#ff00ff" toneMapped={false} />
      </mesh>
      {/* strip de LED superior cyan */}
      <mesh position={[0, 0.28, 0.31]}>
        <planeGeometry args={[3.0, 0.015]} />
        <meshBasicMaterial color="#00ffff" toneMapped={false} />
      </mesh>

      {/* dois mostradores centrais (ref 1:38) */}
      <group position={[-0.7, 0.05, 0.31]}>
        <Gauge value={speed} label="VELOCIDADE" color="#ff2d78" />
      </group>
      <group position={[0.7, 0.05, 0.31]}>
        <Gauge value={isPlaying ? 0.8 : 0.05} label="BPM" color="#00ffff" />
      </group>

      {/* toca-discos central embutido */}
      <group position={[0, 0.05, 0.32]}>
        <DashTurntable isPlaying={isPlaying} color="#ffcc00" />
      </group>

      {/* botões laterais (só decoração por enquanto) */}
      {[-1.35, -1.2, -1.05].map((x, i) => (
        <mesh key={`l${i}`} position={[x, -0.15, 0.31]}>
          <cylinderGeometry args={[0.04, 0.04, 0.02, 12]} />
          <meshBasicMaterial color={["#ff6b35", "#00ffff", "#ffcc00"][i]} toneMapped={false} />
        </mesh>
      ))}
      {[1.05, 1.2, 1.35].map((x, i) => (
        <mesh key={`r${i}`} position={[x, -0.15, 0.31]}>
          <cylinderGeometry args={[0.04, 0.04, 0.02, 12]} />
          <meshBasicMaterial color={["#cc00ff", "#ff2d78", "#00ff88"][i]} toneMapped={false} />
        </mesh>
      ))}

      {/* "222 FM" texto na tela central baixa */}
      <mesh position={[0, -0.28, 0.31]}>
        <planeGeometry args={[0.6, 0.12]} />
        <meshBasicMaterial color="#050510" />
      </mesh>
      <Text position={[0, -0.28, 0.32]} fontSize={0.08} color="#00ffff" anchorX="center">
        222 FM
      </Text>
    </group>
  )
}

// ─── Volante ──────────────────────────────────────────────────────────────────
function SteeringWheel() {
  const ref = useRef<THREE.Group>(null)
  // oscila levemente pra parecer "vivo"
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.6) * 0.08
  })
  return (
    <group ref={ref} position={[0, -0.35, -0.3]} rotation={[Math.PI * 0.15, 0, 0]}>
      {/* aro */}
      <mesh>
        <torusGeometry args={[0.45, 0.05, 16, 48]} />
        <meshStandardMaterial color="#1a1a2a" roughness={0.5} metalness={0.6} />
      </mesh>
      {/* aro externo cromado fino */}
      <mesh>
        <torusGeometry args={[0.47, 0.008, 8, 48]} />
        <meshStandardMaterial color="#e0e0e8" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* 3 raios (spokes) — cima, esquerda-baixo, direita-baixo */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.06, 0.28, 0.04]} />
        <meshStandardMaterial color="#1a1a2a" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[-0.18, -0.12, 0]} rotation={[0, 0, Math.PI / 3]}>
        <boxGeometry args={[0.06, 0.28, 0.04]} />
        <meshStandardMaterial color="#1a1a2a" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0.18, -0.12, 0]} rotation={[0, 0, -Math.PI / 3]}>
        <boxGeometry args={[0.06, 0.28, 0.04]} />
        <meshStandardMaterial color="#1a1a2a" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* buzina/emblema central com brilho magenta */}
      <mesh>
        <cylinderGeometry args={[0.12, 0.12, 0.04, 24]} />
        <meshStandardMaterial
          color="#ff00ff"
          emissive="#ff00ff"
          emissiveIntensity={0.6}
          metalness={0.4}
        />
      </mesh>
      {/* letra "L" no emblema */}
      <Text position={[0, 0, 0.03]} fontSize={0.09} color="#ffffff" anchorX="center" anchorY="middle">
        L
      </Text>
    </group>
  )
}

// ─── Interior do carro (teto, laterais, colunas) ─────────────────────────────
function CockpitInterior() {
  return (
    <group>
      {/* teto curvo com padronagem "space" (estrelas leves nos ombros) */}
      <mesh position={[0, 1.5, -0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4, 2.2]} />
        <meshStandardMaterial color="#0a0a20" side={THREE.DoubleSide} />
      </mesh>
      {/* estrelas no teto — só decoração */}
      {Array.from({ length: 30 }).map((_, i) => {
        const x = (Math.random() - 0.5) * 3.5
        const z = -1.4 + Math.random() * 1.8
        return (
          <mesh key={i} position={[x, 1.49, z]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.008 + Math.random() * 0.012, 6]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
        )
      })}

      {/* coluna esquerda */}
      <mesh position={[-1.9, 0.6, -0.3]}>
        <boxGeometry args={[0.15, 1.8, 0.15]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.7} />
      </mesh>
      {/* coluna direita */}
      <mesh position={[1.9, 0.6, -0.3]}>
        <boxGeometry args={[0.15, 1.8, 0.15]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.7} />
      </mesh>

      {/* painel lateral esquerdo (porta) */}
      <mesh position={[-2.0, 0.2, 0.4]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2, 1.2]} />
        <meshStandardMaterial color="#151530" side={THREE.DoubleSide} />
      </mesh>
      {/* painel lateral direito (porta) */}
      <mesh position={[2.0, 0.2, 0.4]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[2, 1.2]} />
        <meshStandardMaterial color="#151530" side={THREE.DoubleSide} />
      </mesh>

      {/* moldura do para-brisa — leve borda escura */}
      <mesh position={[0, 0.75, -0.55]}>
        <boxGeometry args={[3.6, 0.06, 0.04]} />
        <meshStandardMaterial color="#0a0a15" />
      </mesh>
    </group>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function DriveCockpitPage() {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // "velocidade" sobe conforme tocando pra dar vida
  const [speed, setSpeed] = useState(0.15)

  useEffect(() => {
    if (!audioRef.current) return
    if (isPlaying) audioRef.current.play().catch(() => setIsPlaying(false))
    else audioRef.current.pause()
  }, [isPlaying])

  useEffect(() => {
    const t = setInterval(() => {
      setSpeed((s) => {
        const target = isPlaying ? 0.75 + Math.sin(Date.now() * 0.001) * 0.15 : 0.15
        return s + (target - s) * 0.1
      })
    }, 60)
    return () => clearInterval(t)
  }, [isPlaying])

  return (
    <div className="h-screen w-screen bg-black">
      <audio ref={audioRef} src={DEMO_TRACK.file} loop />

      {/* HUD */}
      <div className="pointer-events-none absolute left-6 top-6 z-10 text-white">
        <h1 className="text-xl font-light tracking-widest">DRIVE · COCKPIT</h1>
        <p className="mt-1 text-xs text-neutral-400">POV motorista · retro-futurista</p>
      </div>

      {/* Player mínimo */}
      <div className="pointer-events-auto absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
        <div className="flex items-center gap-4 rounded-lg border border-white/10 bg-black/80 px-5 py-3 backdrop-blur-md">
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            {isPlaying ? "❚❚ pausar" : "▶ tocar"}
          </button>
          <div>
            <div className="text-sm text-white">{DEMO_TRACK.titulo}</div>
            <div className="text-xs text-neutral-400">{DEMO_TRACK.autor}</div>
          </div>
        </div>
      </div>

      <Canvas camera={{ position: [0, 1.15, 0.35], fov: 78 }}>
        <Suspense fallback={null}>
          <color attach="background" args={["#050510"]} />
          {/* céu / atmosfera */}
          <fog attach="fog" args={["#1a0533", 6, 50]} />

          {/* iluminação: fraca ambient + luz do painel + neon lateral */}
          <ambientLight intensity={0.2} />
          <pointLight position={[0, 0.3, -0.8]} intensity={0.6} color="#ff00ff" distance={3} />
          <pointLight position={[-0.6, 0.3, -0.7]} intensity={0.3} color="#00ffff" distance={2} />
          <pointLight position={[0.6, 0.3, -0.7]} intensity={0.3} color="#ffcc00" distance={2} />
          <spotLight
            position={[0, 1.4, 0]}
            target-position={[0, -0.3, -0.8]}
            intensity={0.5}
            angle={0.8}
            penumbra={0.7}
            color="#ffffff"
          />

          {/* cidade cyberpunk ao fundo, pelo para-brisa */}
          <CityBackdrop />

          {/* cockpit em torno da câmera */}
          <CockpitInterior />
          <Dashboard isPlaying={isPlaying} speed={speed} />
          <SteeringWheel />
        </Suspense>
      </Canvas>
    </div>
  )
}
