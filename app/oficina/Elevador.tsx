"use client"

// A Kombi no elevador da oficina: o mesmo modelo da estrada, girando, com o
// neon de baixo batendo no chão de cimento e a parede de ferramentas atrás.

import { Canvas, useFrame } from "@react-three/fiber"
import { Suspense, useMemo, useRef } from "react"
import * as THREE from "three"
import { KombiHerbal } from "../linha/estrada/KombiHerbal"

function Giro({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (g.current) g.current.rotation.y += dt * 0.35 })
  return <group ref={g}>{children}</group>
}

function Galpao() {
  const parede = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 512; c.height = 256; const g = c.getContext("2d")!
    g.fillStyle = "#3a3438"; g.fillRect(0, 0, 512, 256)
    // o painel de ferramentas e o grafite 222
    g.fillStyle = "#2a2428"; g.fillRect(30, 40, 200, 120)
    g.strokeStyle = "#8a8a98"; g.lineWidth = 4
    for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(50 + i * 26, 60); g.lineTo(50 + i * 26, 60 + 40 + (i % 3) * 20); g.stroke() }
    g.font = "900 110px Arial Black, sans-serif"; g.fillStyle = "#ff9000"; g.strokeStyle = "#14121c"; g.lineWidth = 8
    g.strokeText("222", 260, 160); g.fillText("222", 260, 160)
    return new THREE.CanvasTexture(c)
  }, [])
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2}><planeGeometry args={[30, 30]} /><meshStandardMaterial color="#5a5658" roughness={0.85} /></mesh>
      <mesh position={[0, 4, -6]}><planeGeometry args={[30, 8]} /><meshStandardMaterial map={parede} /></mesh>
      {/* o elevador: duas rampas amarelas */}
      {[-0.75, 0.75].map((x) => <mesh key={x} position={[x, 0.08, 0]}><boxGeometry args={[0.5, 0.16, 5]} /><meshStandardMaterial color="#ffc21a" /></mesh>)}
      <mesh position={[0, 6.5, 0]}><boxGeometry args={[6, 0.1, 0.4]} /><meshBasicMaterial color="#e8f0ff" toneMapped={false} /></mesh>
    </group>
  )
}

export function Elevador({ tinta, neon }: { tinta: string; neon: string }) {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ fov: 46, position: [8, 3.4, 10] }} className="of-cvs" onCreated={({ camera }) => camera.lookAt(0, 0.9, 0)}>
      <color attach="background" args={["#1a1618"]} />
      <fog attach="fog" args={["#1a1618", 10, 28]} />
      <hemisphereLight args={["#dfe6ff", "#3a3030", 0.9]} />
      <directionalLight position={[0, 8, 2]} intensity={1.4} color="#e8f0ff" />
      <Galpao />
      <Giro>
        <Suspense fallback={null}><KombiHerbal tinta={tinta} /></Suspense>
        <pointLight position={[0, 0.3, 0]} color={neon} intensity={45} distance={8} decay={2} />
      </Giro>
    </Canvas>
  )
}
