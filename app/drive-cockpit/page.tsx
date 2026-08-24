"use client"

import { Canvas } from "@react-three/fiber"
import { PointerLockControls } from "@react-three/drei"
import { Suspense, useEffect, useRef, useState } from "react"
import { COCKPIT_LAYOUT } from "@/lib/cockpit-layout"
import { CockpitScene, CockpitLighting } from "@/components/DriveCockpit/CockpitScene"
import { CockpitFreeLook } from "@/components/DriveCockpit/CockpitFreeLook"

// Faixa demo que roda no toca-discos embutido do painel.
// (Integração completa com a loja de discos vem em v2.)
const DEMO_TRACK = {
  file: "/loja-discos/disco-05.mp3",
  titulo: "The St. Louis Blues",
  autor: "W. C. Handy",
}

const L = COCKPIT_LAYOUT

export default function DriveCockpitPage() {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
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
        <p className="mt-1 text-xs text-neutral-400">POV motorista · layout do editor</p>
        <p className="mt-3 text-[10px] text-neutral-500">
          clique pra andar · <kbd className="rounded border border-white/20 px-1.5">WASD</kbd> move · <kbd className="rounded border border-white/20 px-1.5">Q/E</kbd> sobe/desce · mouse olha · <kbd className="rounded border border-white/20 px-1.5">ESC</kbd> sai
        </p>
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

      <Canvas
        camera={{
          position: L.camera.position as [number, number, number],
          rotation: L.camera.rotation as [number, number, number],
          fov: 72,
        }}
      >
        <Suspense fallback={null}>
          <color attach="background" args={["#050510"]} />
          <fog attach="fog" args={["#1a0533", 15, 60]} />

          <CockpitLighting />
          <CockpitScene isPlaying={isPlaying} speed={speed} />

          <PointerLockControls />
          <CockpitFreeLook />
        </Suspense>
      </Canvas>
    </div>
  )
}
