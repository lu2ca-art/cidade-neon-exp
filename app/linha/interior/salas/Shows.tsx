"use client"

// A CASA DE SHOWS (arena, lugar 7, mistério). O lugar do último show antes
// do apagão: o palco vazio com a cortina pesada, a pista sem ninguém e, no
// meio da pista, um poste de luz piscando (não devia estar ali). O Alohan
// sentado na beira do palco com o caderno. No fim, o poste pisca três vezes
// e apaga (o ensaio do apagão do ep. 4).

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import { texTexto } from "../../estrada/geo"
import { Caixa, Neon, Npc, Sala } from "../comum"
import { Camera, type Plano, type SalaProps } from "../Interior"

const OURO = "#ffc857"

const PLANOS: Record<string, Plano> = {
  entrada: { pos: [0, 2, 7.5], olha: [0, 1.6, -5], fov: 62 },
  alohan: { pos: [1.4, 1.5, -1.6], olha: [0, 1.25, -4.4], fov: 46 },
  poste: { pos: [2.5, 1.4, 4.5], olha: [0, 2.2, 1], fov: 54 },
  palco: { pos: [0, 1.7, 2.5], olha: [0, 1.6, -6], fov: 58 },
}

export function SalaShows({ estado }: SalaProps) {
  const apagou = estado.pos >= 14
  const plano = useMemo(() => {
    if (apagou || estado.pos === 1) return PLANOS.poste
    if (estado.falando === "Alohan" || estado.falando === "você") return PLANOS.alohan
    if (estado.pos === 0) return PLANOS.entrada
    return PLANOS.palco
  }, [estado, apagou])
  return (
    <>
      <color attach="background" args={["#060508"]} />
      <fog attach="fog" args={["#060508", 8, 26]} />
      <ambientLight intensity={0.26} color="#ffd9a0" />
      <hemisphereLight args={["#ffcf8a", "#0a0806", 0.3]} />
      <Sala larg={16} fundo={18} alto={8} parede="#16120e" chao="#120e0c" teto="#08070a" />
      {/* o palco e a cortina */}
      <Caixa pos={[0, 0.5, -6.5]} tam={[12, 1, 5]} cor="#24180e" rough={0.6} />
      <Caixa pos={[0, 4.5, -8.8]} tam={[12, 7, 0.2]} cor="#4a0e14" rough={1} />
      {[-5.5, 5.5].map((x) => <Caixa key={x} pos={[x, 4.5, -8.4]} tam={[1.2, 7, 0.4]} cor="#3a0a10" rough={1} />)}
      {/* a ribalta: luz baixa na beira do palco (apaga junto com o poste) */}
      <Neon pos={[0, 1.04, -4.02]} comp={11.6} cor={OURO} luz={apagou ? 0 : 3} />
      {/* o foco em cima de onde ele senta */}
      <pointLight position={[0.3, 3.4, -3.2]} color="#ffe0a8" intensity={apagou ? 0 : 7} distance={6} decay={2} />
      {/* um pedestal de microfone sozinho */}
      <mesh position={[0, 1.75, -6]}>
        <cylinderGeometry args={[0.015, 0.015, 1.5, 6]} />
        <meshStandardMaterial color="#888" metalness={0.8} />
      </mesh>
      <pointLight position={[0, 6, -5]} color={OURO} intensity={apagou ? 0 : 6} distance={9} decay={2} />
      <Letreiro />
      {/* o Alohan na beira do palco, o caderno do lado */}
      <Npc cor={OURO} pos={[0, 0.55, -4.25]} vira={0} pose="sentada" falando={estado.falando === "Alohan"} />
      <Caixa pos={[0.55, 1.02, -4.3]} tam={[0.3, 0.03, 0.22]} cor="#f4efe2" />
      <Poste apagou={apagou} />
      <Camera plano={plano} />
    </>
  )
}

// o poste no meio da pista: pisca sempre; no fim, três piscadas e apaga
function Poste({ apagou }: { apagou: boolean }) {
  const luz = useRef<THREE.PointLight>(null)
  const bulbo = useRef<THREE.MeshBasicMaterial>(null)
  const t0 = useRef<number | null>(null)
  useFrame((s) => {
    const t = s.clock.elapsedTime
    let on = Math.sin(t * 7) > -0.85 && Math.sin(t * 1.3) > -0.95
    if (apagou) {
      if (t0.current === null) t0.current = t
      const d = t - t0.current
      on = d < 1.8 ? Math.floor(d / 0.3) % 2 === 0 : false
    }
    if (luz.current) luz.current.intensity = on ? 10 : 0
    if (bulbo.current) bulbo.current.color.set(on ? "#fff0c8" : "#201a10")
  })
  return (
    <group position={[0, 0, 1]}>
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 4, 8]} />
        <meshStandardMaterial color="#2a2a30" metalness={0.6} />
      </mesh>
      <mesh position={[0, 4.05, 0]}>
        <sphereGeometry args={[0.18, 12, 8]} />
        <meshBasicMaterial ref={bulbo} color="#fff0c8" toneMapped={false} />
      </mesh>
      <pointLight ref={luz} position={[0, 3.8, 0]} color="#ffe0a8" intensity={10} distance={9} decay={2} />
    </group>
  )
}

function Letreiro() {
  // ONTEM com uma letra apagada
  const tex = useMemo(() => texTexto([{ txt: "ONT M", tam: 170, cor: OURO }], 1024, 256), [])
  return (
    <mesh position={[0, 7, -8.6]}>
      <planeGeometry args={[3.6, 0.9]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  )
}
