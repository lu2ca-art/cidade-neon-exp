"use client"

import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { Stars, Float, Text, useTexture, PointerLockControls } from "@react-three/drei"
import { Suspense, useState, useRef, useEffect } from "react"
import * as THREE from "three"

type Piece = {
  file: string
  title: string
  artist: string
  aspect: number
}

// Obras antigas — 5 pinturas ocidentais + 13 recortes escandinavos (Odense City Museums)
const PINTURAS: Piece[] = [
  { file: "/galeria/starry-night.jpg", title: "A Noite Estrelada",  artist: "Van Gogh · 1889",   aspect: 500 / 396 },
  { file: "/galeria/mona-lisa.jpg",    title: "Mona Lisa",          artist: "Da Vinci · 1503",   aspect: 500 / 756 },
  { file: "/galeria/the-scream.jpg",   title: "O Grito",            artist: "Munch · 1893",      aspect: 500 / 637 },
  { file: "/galeria/great-wave.jpg",   title: "A Grande Onda",      artist: "Hokusai · 1831",    aspect: 500 / 342 },
  { file: "/galeria/the-kiss.jpg",     title: "O Beijo",            artist: "Klimt · 1908",      aspect: 500 / 502 },
]

const RECORTES: Piece[] = [
  { file: "/museu/recorte-1.jpg",  title: "Clown with tray",        artist: "Odense", aspect: 1 },
  { file: "/museu/recorte-2.jpg",  title: "Fantasy for Dorothea",   artist: "Odense", aspect: 1 },
  { file: "/museu/recorte-3.jpg",  title: "Four girls with wreath", artist: "Odense", aspect: 1 },
  { file: "/museu/recorte-4.jpg",  title: "Green cut",              artist: "Odense", aspect: 1 },
  { file: "/museu/recorte-5.jpg",  title: "Jumping pierrot",        artist: "Odense", aspect: 1 },
  { file: "/museu/recorte-6.jpg",  title: "Lady in black skirt",    artist: "Odense", aspect: 1 },
  { file: "/museu/recorte-7.jpg",  title: "Mirrored cut · swans",   artist: "Odense", aspect: 1 },
  { file: "/museu/recorte-8.jpg",  title: "Oriental castle",        artist: "Odense", aspect: 1 },
  { file: "/museu/recorte-9.jpg",  title: "Pierrot & angel",        artist: "Odense", aspect: 1 },
  { file: "/museu/recorte-10.jpg", title: "Pierrots & swans",       artist: "Odense", aspect: 1 },
  { file: "/museu/recorte-11.jpg", title: "Sunhead",                artist: "Odense", aspect: 1 },
  { file: "/museu/recorte-12.jpg", title: "Tightrope walkers",      artist: "Odense", aspect: 1 },
  { file: "/museu/recorte-13.jpg", title: "Wine leaves & grapes",   artist: "Odense", aspect: 1 },
]

function ArtworkFloating({
  artwork,
  position,
  rotation,
  size = 2,
}: {
  artwork: Piece
  position: [number, number, number]
  rotation: [number, number, number]
  size?: number
}) {
  const [hovered, setHovered] = useState(false)
  const texture = useTexture(artwork.file)
  const w = size * artwork.aspect
  const h = size

  return (
    <Float speed={0.4} rotationIntensity={0.15} floatIntensity={0.4}>
      <group
        position={position}
        rotation={rotation}
        scale={hovered ? 1.12 : 1}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
      >
        {/* halo neon atrás — sempre visível de leve, brilha no hover */}
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[w + 0.25, h + 0.25]} />
          <meshBasicMaterial
            color={hovered ? "#ff00ff" : "#4c1a8a"}
            toneMapped={false}
            transparent
            opacity={hovered ? 1 : 0.7}
          />
        </mesh>
        {/* a obra */}
        <mesh>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        {/* legenda só no hover, mantém a leitura visual limpa */}
        {hovered && (
          <>
            <Text
              position={[0, -h / 2 - 0.3, 0]}
              fontSize={0.16}
              color="#ffffff"
              anchorX="center"
              outlineWidth={0.008}
              outlineColor="#000000"
            >
              {artwork.title}
            </Text>
            <Text
              position={[0, -h / 2 - 0.55, 0]}
              fontSize={0.1}
              color="#a0a0a0"
              anchorX="center"
            >
              {artwork.artist}
            </Text>
          </>
        )}
      </group>
    </Float>
  )
}

// Planeta gigante ao fundo — foto de satélite envolvida numa esfera.
// Rotação sutil pra sugerir vida.
function CosmicPlanet({
  url,
  position,
  scale,
  rotationSpeed = 0.03,
}: {
  url: string
  position: [number, number, number]
  scale: number
  rotationSpeed?: number
}) {
  const texture = useTexture(url)
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * rotationSpeed
  })
  return (
    <mesh ref={ref} position={position} scale={scale}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        map={texture}
        emissive="#111133"
        emissiveIntensity={0.35}
        roughness={0.9}
      />
    </mesh>
  )
}

// Controles de voo — WASD move no plano de visão, Q/E sobe/desce.
// Sem clamp (é cosmos, não tem chão nem paredes).
function FlyControls() {
  const { camera } = useThree()
  const keys = useRef({ w: false, a: false, s: false, d: false, q: false, e: false })

  useEffect(() => {
    const isKey = (k: string) => k === "w" || k === "a" || k === "s" || k === "d" || k === "q" || k === "e"
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (isKey(k)) (keys.current as Record<string, boolean>)[k] = true
    }
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (isKey(k)) (keys.current as Record<string, boolean>)[k] = false
    }
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
    }
  }, [])

  useFrame((_, delta) => {
    const speed = 7
    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward) // não zera Y — voo em 3D pleno
    forward.normalize()
    const right = new THREE.Vector3()
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()
    const up = new THREE.Vector3(0, 1, 0)

    if (keys.current.w) camera.position.addScaledVector(forward, speed * delta)
    if (keys.current.s) camera.position.addScaledVector(forward, -speed * delta)
    if (keys.current.d) camera.position.addScaledVector(right, speed * delta)
    if (keys.current.a) camera.position.addScaledVector(right, -speed * delta)
    if (keys.current.e) camera.position.addScaledVector(up, speed * delta)
    if (keys.current.q) camera.position.addScaledVector(up, -speed * delta)
  })

  return null
}

export default function MuseuPage() {
  return (
    <div className="h-screen w-screen bg-black">
      <div className="pointer-events-none absolute left-6 top-6 z-10 text-white">
        <h1 className="text-xl font-light tracking-widest">MUSEU</h1>
        <p className="mt-1 text-xs text-neutral-400">
          5 pinturas · 13 recortes de Odense · flutuando no cosmos
        </p>
        <p className="mt-3 text-[10px] text-neutral-500">
          clique pra entrar · W A S D move · Q/E sobe e desce · mouse olha · ESC sai
        </p>
      </div>

      <Canvas camera={{ position: [0, 0, 30], fov: 60 }}>
        <Suspense fallback={null}>
          <color attach="background" args={["#000000"]} />

          {/* fundo estelar */}
          <Stars radius={200} depth={80} count={8000} factor={4} fade speed={0.3} />

          {/* luzes: base neutra + acentos magenta/ciano */}
          <ambientLight intensity={0.4} />
          <pointLight position={[20, 20, 20]} intensity={0.6} color="#ffffff" />
          <pointLight position={[-30, 10, -30]} intensity={0.4} color="#ff00ff" />
          <pointLight position={[30, -10, -20]} intensity={0.3} color="#00ffff" />

          {/* planetas — satélites reciclados como corpos celestes */}
          <CosmicPlanet url="/museu/satelite-1.jpg" position={[45, 8, -75]} scale={22} rotationSpeed={0.02} />
          <CosmicPlanet url="/museu/satelite-3.jpg" position={[-40, -14, -55]} scale={11} rotationSpeed={-0.045} />
          <CosmicPlanet url="/museu/satelite-4.jpg" position={[18, -22, -110]} scale={9} rotationSpeed={0.035} />

          {/* pinturas — anel interno, imponentes */}
          {PINTURAS.map((p, i) => {
            const angle = (i / PINTURAS.length) * Math.PI * 2
            const r = 14
            return (
              <ArtworkFloating
                key={p.file}
                artwork={p}
                position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]}
                rotation={[0, -angle - Math.PI / 2, 0]}
                size={3.2}
              />
            )
          })}

          {/* recortes — anel externo espalhado em altura variada */}
          {RECORTES.map((r, i) => {
            const angle = (i / RECORTES.length) * Math.PI * 2 + 0.3
            const radius = 24
            const y = Math.sin(i * 1.7) * 4.5
            return (
              <ArtworkFloating
                key={r.file}
                artwork={r}
                position={[Math.cos(angle) * radius, y, Math.sin(angle) * radius]}
                rotation={[0, -angle - Math.PI / 2, 0]}
                size={1.6}
              />
            )
          })}

          <PointerLockControls />
          <FlyControls />
        </Suspense>
      </Canvas>
    </div>
  )
}
