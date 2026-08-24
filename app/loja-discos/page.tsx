"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { Text, OrbitControls, Float } from "@react-three/drei"
import { Suspense, useState, useRef, useEffect, useMemo } from "react"
import * as THREE from "three"

type Disc = {
  id: string
  file: string
  titulo: string
  autor: string
  categoria: string
  cor: string // cor do label — por categoria
}

const CAT_COLORS: Record<string, string> = {
  "Blues": "#3b82f6",              // azul elétrico
  "Musica Contemporanea": "#eab308", // dourado
}

// Loja de discos = SÓ MÚSICA. Programas educativos (Radio Escola, Tome Ciência,
// Ler e Escrever) foram movidos pra rádio 222 FM.
const DISCOS: Disc[] = [
  { id: "disco-01", file: "/loja-discos/disco-01.mp3", titulo: "12-tone blues",                autor: "Radan Papezik",         categoria: "Blues",                cor: CAT_COLORS["Blues"] },
  { id: "disco-02", file: "/loja-discos/disco-02.mp3", titulo: 'Johnson "Jass" Blues',         autor: "Band Friscoe Jass",     categoria: "Blues",                cor: CAT_COLORS["Blues"] },
  { id: "disco-03", file: "/loja-discos/disco-03.mp3", titulo: "Lonesome Road Blues",          autor: "Anônimo",               categoria: "Blues",                cor: CAT_COLORS["Blues"] },
  { id: "disco-04", file: "/loja-discos/disco-04.mp3", titulo: "New York Blues",               autor: "Pietro Frosini",        categoria: "Blues",                cor: CAT_COLORS["Blues"] },
  { id: "disco-05", file: "/loja-discos/disco-05.mp3", titulo: "The St. Louis Blues",          autor: "W. C. Handy",           categoria: "Blues",                cor: CAT_COLORS["Blues"] },
  { id: "disco-09", file: "/loja-discos/disco-09.mp3", titulo: "Comentários — musicalidade",   autor: "César M. Borges (USP)", categoria: "Musica Contemporanea", cor: CAT_COLORS["Musica Contemporanea"] },
  { id: "disco-10", file: "/loja-discos/disco-10.mp3", titulo: "Ein Musikalischer Spass Mv.1", autor: "W. A. Mozart",          categoria: "Musica Contemporanea", cor: CAT_COLORS["Musica Contemporanea"] },
  { id: "disco-11", file: "/loja-discos/disco-11.mp3", titulo: "Musikalisches Opfer — Ricercare",     autor: "J. S. Bach",     categoria: "Musica Contemporanea", cor: CAT_COLORS["Musica Contemporanea"] },
  { id: "disco-12", file: "/loja-discos/disco-12.mp3", titulo: "Musikalisches Opfer — Ricercare a 6", autor: "J. S. Bach",     categoria: "Musica Contemporanea", cor: CAT_COLORS["Musica Contemporanea"] },
]

// ─── Vinil na prateleira ──────────────────────────────────────────────────────
// Meia-face visível (perfil), gira devagar quando hovered ou tocando.
function ShelfVinyl({
  disc,
  position,
  isPlaying,
  isSelected,
  onSelect,
}: {
  disc: Disc
  position: [number, number, number]
  isPlaying: boolean
  isSelected: boolean
  onSelect: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const ref = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (ref.current && (hovered || isSelected)) {
      const speed = isPlaying ? 2 : 0.5
      ref.current.rotation.z += delta * speed
    }
  })

  const highlight = isSelected || hovered

  return (
    <group
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      {/* halo de destaque quando selecionado */}
      {isSelected && (
        <mesh position={[0, 0, -0.15]}>
          <ringGeometry args={[0.95, 1.15, 32]} />
          <meshBasicMaterial color={disc.cor} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* elevação sutil quando hovered/selected */}
      <group
        ref={ref}
        position={[0, highlight ? 0.15 : 0, 0]}
        scale={highlight ? 1.08 : 1}
      >
        {/* disco preto — cilindro fininho, usa Basic pra ser visível sem luz forte */}
        <mesh castShadow>
          <cylinderGeometry args={[0.9, 0.9, 0.04, 64]} />
          <meshBasicMaterial color="#1a1a1a" toneMapped={false} />
        </mesh>
        {/* ranhuras — anel externo com brilho sutil da cor do label */}
        <mesh position={[0, 0.021, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.35, 0.85, 64]} />
          <meshBasicMaterial color={disc.cor} toneMapped={false} transparent opacity={0.15} />
        </mesh>
        {/* anel de ranhuras cinza pra dar leitura de vinil */}
        <mesh position={[0, 0.022, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.36, 0.84, 64]} />
          <meshBasicMaterial color="#2a2a2a" toneMapped={false} transparent opacity={0.5} />
        </mesh>
        {/* label central colorido */}
        <mesh position={[0, 0.022, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.32, 32]} />
          <meshBasicMaterial color={disc.cor} toneMapped={false} />
        </mesh>
        {/* furo central */}
        <mesh position={[0, 0.023, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.04, 16]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        {/* número do disco no label */}
        <Text
          position={[0, 0.025, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.15}
          color="#000000"
          anchorX="center"
          anchorY="middle"
        >
          {disc.id.replace("disco-", "")}
        </Text>
      </group>
    </group>
  )
}

// ─── Toca-discos central ──────────────────────────────────────────────────────
// Base + prato + braço. Recebe o disco selecionado tocando.
function Turntable({
  currentDisc,
  isPlaying,
}: {
  currentDisc: Disc | null
  isPlaying: boolean
}) {
  const plateRef = useRef<THREE.Group>(null)
  const armRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (plateRef.current && isPlaying) {
      plateRef.current.rotation.y += delta * 3 // 33 RPM-ish visual
    }
  })

  // braço se move pra dentro quando tocando
  useEffect(() => {
    if (!armRef.current) return
    armRef.current.rotation.y = isPlaying ? -0.6 : -0.2
  }, [isPlaying])

  return (
    <group position={[0, 0.5, -3]}>
      {/* base retangular */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[3.5, 0.2, 2.8]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.4} metalness={0.5} />
      </mesh>
      {/* prato metálico */}
      <mesh position={[-0.4, 0.22, 0]}>
        <cylinderGeometry args={[1.05, 1.05, 0.04, 64]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* disco atual (se houver) girando no prato */}
      {currentDisc && (
        <group ref={plateRef} position={[-0.4, 0.245, 0]}>
          <mesh>
            <cylinderGeometry args={[1.0, 1.0, 0.02, 64]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.011, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.4, 0.95, 64]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.012, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.35, 32]} />
            <meshBasicMaterial color={currentDisc.cor} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.013, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.04, 16]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
        </group>
      )}

      {/* braço com base */}
      <group position={[0.95, 0.22, 0.9]}>
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.15, 0.18, 0.3, 16]} />
          <meshStandardMaterial color="#2a2a3e" metalness={0.7} roughness={0.3} />
        </mesh>
        <group ref={armRef}>
          <mesh position={[-0.7, 0.28, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 1.6, 8]} />
            <meshStandardMaterial color="#c0c0c8" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[-1.4, 0.26, 0]}>
            <boxGeometry args={[0.15, 0.05, 0.05]} />
            <meshStandardMaterial color="#e0e0e8" metalness={0.9} />
          </mesh>
        </group>
      </group>

      {/* LED indicando play */}
      <mesh position={[1.5, 0.22, -1.2]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color={isPlaying ? "#ff0055" : "#442222"} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ─── Sala ─────────────────────────────────────────────────────────────────────
function Room() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 20]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.8} />
      </mesh>
      <mesh position={[0, 4, -8]}>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#0f0f1e" />
      </mesh>
      <mesh position={[-15, 4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[16, 8]} />
        <meshStandardMaterial color="#12122e" />
      </mesh>
      <mesh position={[15, 4, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[16, 8]} />
        <meshStandardMaterial color="#12122e" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 8, 0]}>
        <planeGeometry args={[30, 20]} />
        <meshStandardMaterial color="#050510" />
      </mesh>
    </>
  )
}

// ─── Player HUD ───────────────────────────────────────────────────────────────
function PlayerHUD({
  disc,
  isPlaying,
  onToggle,
  onNext,
  onPrev,
  time,
  duration,
}: {
  disc: Disc | null
  isPlaying: boolean
  onToggle: () => void
  onNext: () => void
  onPrev: () => void
  time: number
  duration: number
}) {
  const fmt = (s: number) => {
    if (!isFinite(s)) return "--:--"
    const m = Math.floor(s / 60)
    const ss = Math.floor(s % 60).toString().padStart(2, "0")
    return `${m}:${ss}`
  }
  const pct = duration > 0 ? (time / duration) * 100 : 0

  return (
    <div className="pointer-events-auto absolute bottom-6 left-1/2 z-10 w-[520px] max-w-[92vw] -translate-x-1/2 rounded-lg border border-white/10 bg-black/80 p-4 text-white backdrop-blur-md">
      <div className="flex items-center gap-4">
        <button
          onClick={onPrev}
          className="rounded-md border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
          disabled={!disc}
        >
          ◀
        </button>
        <button
          onClick={onToggle}
          className="rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          disabled={!disc}
        >
          {isPlaying ? "❚❚ pausar" : "▶ tocar"}
        </button>
        <button
          onClick={onNext}
          className="rounded-md border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
          disabled={!disc}
        >
          ▶
        </button>
        <div className="min-w-0 flex-1">
          {disc ? (
            <>
              <div className="truncate text-sm font-medium">{disc.titulo}</div>
              <div className="truncate text-xs text-neutral-400">
                {disc.autor} · <span style={{ color: disc.cor }}>{disc.categoria}</span>
              </div>
            </>
          ) : (
            <div className="text-sm text-neutral-500">clique num disco pra tocar</div>
          )}
        </div>
        <div className="text-right font-mono text-xs text-neutral-400">
          {fmt(time)} / {fmt(duration)}
        </div>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded bg-white/10">
        <div
          className="h-full bg-white/70 transition-[width] duration-100"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function LojaDiscosPage() {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const current = selectedIdx !== null ? DISCOS[selectedIdx] : null

  // troca de faixa
  useEffect(() => {
    if (!audioRef.current || !current) return
    audioRef.current.src = current.file
    audioRef.current.load()
    if (isPlaying) audioRef.current.play().catch(() => setIsPlaying(false))
  }, [selectedIdx])

  // play/pause sync
  useEffect(() => {
    if (!audioRef.current) return
    if (isPlaying) audioRef.current.play().catch(() => setIsPlaying(false))
    else audioRef.current.pause()
  }, [isPlaying])

  const handleSelect = (i: number) => {
    if (i === selectedIdx) {
      setIsPlaying((p) => !p)
    } else {
      setSelectedIdx(i)
      setIsPlaying(true)
    }
  }

  const next = () => setSelectedIdx((i) => (i === null ? 0 : (i + 1) % DISCOS.length))
  const prev = () => setSelectedIdx((i) => (i === null ? 0 : (i - 1 + DISCOS.length) % DISCOS.length))

  // posições dos discos — grade 3x3 curvada em arco (9 discos)
  const shelfPositions = useMemo<[number, number, number][]>(() => {
    return DISCOS.map((_, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const x = (col - 1) * 1.8
      const y = 3.2 - row * 1.7
      const z = 1.5 + Math.abs(col - 1) * 0.2
      return [x, y, z]
    })
  }, [])

  return (
    <div className="h-screen w-screen bg-black">
      {/* elemento de áudio invisível */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={next}
      />

      {/* HUD superior */}
      <div className="pointer-events-none absolute left-6 top-6 z-10 text-white">
        <h1 className="text-xl font-light tracking-widest">LOJA DE DISCOS</h1>
        <p className="mt-1 text-xs text-neutral-400">
          13 obras de domínio público · Blues, Bach, Mozart e mais
        </p>
        <p className="mt-3 text-[10px] text-neutral-500">
          clique num disco pra tocar · arraste pra girar câmera
        </p>
      </div>

      <Canvas shadows camera={{ position: [0, 2, 7], fov: 55 }}>
        <Suspense fallback={null}>
          {/* Iluminação forte porque discos e paredes estavam escuros demais */}
          <ambientLight intensity={1.2} />
          <pointLight position={[0, 6, 4]} intensity={2.5} color="#ff00ff" distance={20} />
          <pointLight position={[-8, 4, 4]} intensity={1.8} color="#00ffff" distance={20} />
          <pointLight position={[8, 4, 4]} intensity={1.8} color="#ffaa00" distance={20} />
          <pointLight position={[0, 3, 5]} intensity={1.5} color="#ffffff" distance={12} />
          <spotLight
            position={[0, 6, 0]}
            target-position={[0, 0.5, -3]}
            intensity={2.0}
            angle={0.7}
            penumbra={0.5}
            color="#ffffff"
            castShadow
          />

          <Room />

          {/* discos na prateleira */}
          <group position={[0, 0, 0]}>
            {DISCOS.map((disc, i) => (
              <ShelfVinyl
                key={disc.id}
                disc={disc}
                position={shelfPositions[i]}
                isPlaying={isPlaying && selectedIdx === i}
                isSelected={selectedIdx === i}
                onSelect={() => handleSelect(i)}
              />
            ))}
          </group>

          {/* toca-discos central com disco atual */}
          <Turntable currentDisc={current} isPlaying={isPlaying} />

          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            minDistance={4}
            maxDistance={12}
            maxPolarAngle={Math.PI / 2 - 0.1}
            target={[0, 1.5, 0]}
          />
        </Suspense>
      </Canvas>

      <PlayerHUD
        disc={current}
        isPlaying={isPlaying}
        onToggle={() => setIsPlaying((p) => !p)}
        onNext={next}
        onPrev={prev}
        time={time}
        duration={duration}
      />
    </div>
  )
}
