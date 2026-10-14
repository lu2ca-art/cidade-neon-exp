"use client"
/* eslint-disable react-hooks/immutability -- three.js: câmera e luzes são do motor, mexidas a cada quadro */

// O SHOW (a casa de shows por dentro): o palco com o amigo da 222 tocando no
// meio, as luzes varrendo, o telão com o nome, e a pista com o tanto de gente
// que a popularidade da 222 trouxe — todo mundo pulando no tempo da música.

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Suspense, useMemo, useRef } from "react"
import * as THREE from "three"
import { Caixa, Multidao, Neon, Npc, type Pessoa } from "../linha/interior/comum"
import { texTexto } from "../linha/estrada/geo"

export interface Atracao { nome: string; faixa: string; cor: string; bpm: number }

const MAX = 90

// a pista: fileiras na frente do palco, os primeiros a chegar ficam colados no palco
function montarPublico(n: number, cor: string): Pessoa[] {
  const out: Pessoa[] = []
  let seed = 7
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const cores = [cor, "#ff3fb0", "#2fe8ff", "#ffc857", "#5dffa0", "#b38cff"]
  for (let i = 0; i < n; i++) {
    const fila = Math.floor(i / 12), k = i % 12
    const x = (k - 5.5) * 0.95 + (r() - 0.5) * 0.4 + (fila % 2) * 0.45
    const z = -2.2 + fila * 0.95 + (r() - 0.5) * 0.3
    out.push({ x, z, vira: Math.PI + (r() - 0.5) * 0.5, cor: cores[Math.floor(r() * cores.length)] })
  }
  return out
}

function Luzes({ cor }: { cor: string }) {
  const a = useRef<THREE.SpotLight>(null), b = useRef<THREE.SpotLight>(null)
  const alvoA = useMemo(() => new THREE.Object3D(), []), alvoB = useMemo(() => new THREE.Object3D(), [])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    alvoA.position.set(Math.sin(t * 0.9) * 5, 0, Math.cos(t * 0.7) * 3)
    alvoB.position.set(Math.sin(t * 1.1 + 2) * 5, 0, Math.cos(t * 0.8 + 1) * 3)
    alvoA.updateMatrixWorld(); alvoB.updateMatrixWorld()
    if (a.current) a.current.target = alvoA
    if (b.current) b.current.target = alvoB
  })
  return (
    <>
      <spotLight ref={a} position={[-4, 7, -6]} angle={0.35} penumbra={0.6} intensity={180} distance={30} color={cor} />
      <spotLight ref={b} position={[4, 7, -6]} angle={0.35} penumbra={0.6} intensity={180} distance={30} color="#ff3fb0" />
    </>
  )
}

function Camera() {
  const camera = useThree((s) => s.camera)
  useFrame((s) => {
    const t = s.clock.elapsedTime
    camera.position.set(Math.sin(t * 0.08) * 3, 3.2 + Math.sin(t * 0.13) * 0.4, 9.5 + Math.cos(t * 0.1) * 0.8)
    camera.lookAt(0, 1.6, -5)
  })
  return null
}

// o pulso da música: a cada batida a pista pula
function Batida({ bpm, pulso }: { bpm: number; pulso: React.RefObject<number> }) {
  const ultima = useRef(-1)
  useFrame((s) => {
    const b = Math.floor((s.clock.elapsedTime * bpm) / 60)
    if (b !== ultima.current) { ultima.current = b; pulso.current = performance.now() / 1000 }
  })
  return null
}

export function Show({ atracao, popularidade }: { atracao: Atracao; popularidade: number }) {
  const n = Math.max(3, Math.min(MAX, Math.round(3 + popularidade * 0.87)))
  const gente = useMemo(() => montarPublico(n, atracao.cor), [n, atracao.cor])
  const telao = useMemo(() => texTexto([{ txt: atracao.nome.toUpperCase(), tam: 150, cor: atracao.cor }, { txt: atracao.faixa, tam: 60, cor: "#ffffff" }], 1024, 320), [atracao])
  const pulso = useRef(-9)
  return (
    <Canvas dpr={[1, 1.75]} camera={{ fov: 58, near: 0.1, far: 80, position: [0, 3, 10] }} gl={{ antialias: true }}>
      <color attach="background" args={["#060508"]} />
      <fog attach="fog" args={["#060508", 12, 34]} />
      <ambientLight intensity={0.18} color="#b8a8ff" />
      <Suspense fallback={null}>
        {/* o salão: chão, paredes e o palco */}
        <mesh rotation-x={-Math.PI / 2}><planeGeometry args={[30, 30]} /><meshStandardMaterial color="#110e14" roughness={0.6} /></mesh>
        <Caixa pos={[0, 0.6, -6.5]} tam={[14, 1.2, 5]} cor="#1c1820" />
        <Caixa pos={[0, 4, -9.2]} tam={[14, 8, 0.4]} cor="#0d0b10" />
        <mesh position={[0, 4.6, -8.95]}><planeGeometry args={[10, 3.1]} /><meshBasicMaterial map={telao} transparent toneMapped={false} /></mesh>
        <Neon pos={[0, 1.22, -4.05]} comp={14} cor={atracao.cor} luz={6} />
        <Neon pos={[-7, 4, -6.5]} comp={8} cor="#ff3fb0" vertical />
        <Neon pos={[7, 4, -6.5]} comp={8} cor="#ff3fb0" vertical />
        <Luzes cor={atracao.cor} />
        <pointLight position={[0, 4, -5]} color={atracao.cor} intensity={40} distance={14} decay={2} />
        {/* a banda: o amigo da 222 no meio, dois do lado */}
        <group>
          <Npc cor={atracao.cor} pos={[0, 1.2, -6.2]} vira={0} dancando />
          <Npc cor="#8a8f9e" pos={[-3, 1.2, -7]} vira={0.3} dancando />
          <Npc cor="#8a8f9e" pos={[3, 1.2, -7]} vira={-0.3} dancando />
        </group>
        <Multidao gente={gente} copiam={gente.length} pulso={pulso} />
        <Batida bpm={atracao.bpm} pulso={pulso} />
      </Suspense>
      <Camera />
    </Canvas>
  )
}
