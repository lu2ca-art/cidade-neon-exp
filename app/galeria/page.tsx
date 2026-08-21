"use client"

import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { PointerLockControls, Text, useTexture } from "@react-three/drei"
import { Suspense, useState, useRef, useEffect } from "react"
import * as THREE from "three"

type Artwork = {
  id: string
  title: string
  artist: string
  file: string
  aspect: number // width / height (do arquivo original)
  accent: string
}

const H = 2.5 // altura padrão do quadro (world units)

const ARTWORKS: Artwork[] = [
  { id: "starry-night", title: "A Noite Estrelada", artist: "Van Gogh · 1889", file: "/galeria/starry-night.jpg", aspect: 500 / 396, accent: "#f9d000" },
  { id: "mona-lisa",    title: "Mona Lisa",         artist: "Da Vinci · 1503", file: "/galeria/mona-lisa.jpg",    aspect: 500 / 756, accent: "#c9a961" },
  { id: "the-scream",   title: "O Grito",           artist: "Munch · 1893",    file: "/galeria/the-scream.jpg",   aspect: 500 / 637, accent: "#d97706" },
  { id: "great-wave",   title: "A Grande Onda",     artist: "Hokusai · 1831",  file: "/galeria/great-wave.jpg",   aspect: 500 / 342, accent: "#00ffff" },
  { id: "the-kiss",     title: "O Beijo",           artist: "Klimt · 1908",    file: "/galeria/the-kiss.jpg",     aspect: 500 / 502, accent: "#ff00ff" },
]

function Painting({
  artwork,
  position,
  rotation = [0, 0, 0],
}: {
  artwork: Artwork
  position: [number, number, number]
  rotation?: [number, number, number]
}) {
  const [hovered, setHovered] = useState(false)
  const texture = useTexture(artwork.file)
  const w = H * artwork.aspect
  const border = 0.15

  return (
    <group
      position={position}
      rotation={rotation}
      scale={hovered ? 1.05 : 1}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[w + border * 2 + 0.05, H + border * 2 + 0.05, 0.1]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[w + border * 2, H + border * 2]} />
        <meshStandardMaterial
          color={artwork.accent}
          emissive={artwork.accent}
          emissiveIntensity={hovered ? 0.9 : 0.35}
        />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[w, H]} />
        {/* meshBasicMaterial: quadro não escurece com pouca luz da sala —
            os quadros ficam sempre no brilho real da textura. */}
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <Text
        position={[0, -(H / 2 + 0.25), 0.02]}
        fontSize={0.14}
        color="#ffffff"
        anchorX="center"
        outlineWidth={0.006}
        outlineColor="#000000"
      >
        {artwork.title}
      </Text>
      <Text
        position={[0, -(H / 2 + 0.45), 0.02]}
        fontSize={0.09}
        color="#a0a0a0"
        anchorX="center"
      >
        {artwork.artist}
      </Text>
    </group>
  )
}

function Room() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0f0f1e" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 8, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#050510" />
      </mesh>
      <mesh position={[0, 4, -10]}>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <mesh position={[-15, 4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[20, 8]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <mesh position={[15, 4, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[20, 8]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
    </>
  )
}

// Navegação primeira-pessoa: WASD move + PointerLockControls olha com o mouse.
// Câmera fica travada em altura de olho (1.7) e clampeada dentro das paredes.
function WASDMovement() {
  const { camera } = useThree()
  const keys = useRef({ w: false, a: false, s: false, d: false })

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === "w" || k === "a" || k === "s" || k === "d") keys.current[k] = true
    }
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === "w" || k === "a" || k === "s" || k === "d") keys.current[k] = false
    }
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
    }
  }, [])

  useFrame((_, delta) => {
    const speed = 4
    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    const right = new THREE.Vector3()
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

    if (keys.current.w) camera.position.addScaledVector(forward, speed * delta)
    if (keys.current.s) camera.position.addScaledVector(forward, -speed * delta)
    if (keys.current.d) camera.position.addScaledVector(right, speed * delta)
    if (keys.current.a) camera.position.addScaledVector(right, -speed * delta)

    camera.position.x = Math.max(-14, Math.min(14, camera.position.x))
    camera.position.z = Math.max(-9, Math.min(14, camera.position.z))
    camera.position.y = 1.7
  })

  return null
}

export default function GaleriaPage() {
  return (
    <div className="h-screen w-screen bg-black">
      <div className="pointer-events-none absolute left-6 top-6 z-10 text-white">
        <h1 className="text-xl font-light tracking-widest">GALERIA</h1>
        <p className="mt-1 text-xs text-neutral-400">
          clique pra caminhar · WASD movimenta · mouse olha · ESC sai
        </p>
      </div>
      <Canvas shadows camera={{ position: [0, 1.7, 6], fov: 65 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <pointLight position={[0, 6, 4]} intensity={0.9} color="#ff00ff" />
          <pointLight position={[-8, 4, 3]} intensity={0.6} color="#00ffff" />
          <pointLight position={[8, 4, 3]} intensity={0.6} color="#ff00ff" />
          {/* Spots direcionados nos quadros da parede de fundo pra ganhar
              destaque museu-like sem lavar a estética neon. */}
          <spotLight position={[0, 7, -2]} target-position={[0, 3, -10]} intensity={0.8} angle={0.8} penumbra={0.5} color="#ffffff" />
          <spotLight position={[-10, 6, 0]} target-position={[-15, 3, 0]} intensity={0.7} angle={0.9} penumbra={0.6} color="#ffffff" />

          <Room />

          {ARTWORKS.slice(0, 3).map((art, i) => (
            <Painting
              key={art.id}
              artwork={art}
              position={[(i - 1) * 5, 3, -9.9]}
            />
          ))}

          {ARTWORKS.slice(3, 5).map((art, i) => (
            <Painting
              key={art.id}
              artwork={art}
              position={[-14.9, 3, (i - 0.5) * 5]}
              rotation={[0, Math.PI / 2, 0]}
            />
          ))}

          <PointerLockControls />
          <WASDMovement />
        </Suspense>
      </Canvas>
    </div>
  )
}
