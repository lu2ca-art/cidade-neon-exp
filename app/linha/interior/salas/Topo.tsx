"use client"

// O TERRAÇO (mirante, lugar 2, drama silencioso). O topo do prédio mais alto:
// mureta baixa, a caixa d'água, a antena piscando vermelho, a chuva, e a
// cidade inteira lá embaixo. A Notti sentada na mureta, de costas pro vão.
// Nos 15 segundos de silêncio a câmera vira devagar pro horizonte; depois,
// fora da cidade, onde a estrada acaba, aparece uma luz acesa.

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { Caixa, Chuva, Cidade, Npc } from "../comum"
import { Camera, type Plano, type SalaProps } from "../Interior"

const VERDE = "#5dffa0"

const PLANOS: Record<string, Plano> = {
  chegada: { pos: [0, 1.7, 5], olha: [0, 1.2, -1], fov: 60 },
  notti: { pos: [1.6, 1.5, 1.4], olha: [0, 1.0, -2.2], fov: 54 },
  horizonte: { pos: [0.2, 1.6, 0.5], olha: [-30, 0, -90], fov: 55 },
  cidade: { pos: [0.6, 1.8, 2.5], olha: [0, -6, -40], fov: 62 },
}

export function SalaTopo({ estado }: SalaProps) {
  const [viuLuz, setViuLuz] = useState(false)
  const silencio = estado.gesto === "silencio"
  if (!viuLuz && estado.pos >= 8 && !silencio) setViuLuz(true)
  const plano = useMemo(() => {
    if (silencio || estado.pos === 7 || estado.pos === 8) return PLANOS.horizonte
    if (estado.falando === "Notti" || estado.falando === "você") return PLANOS.notti
    if (estado.pos === 0) return PLANOS.chegada
    return PLANOS.cidade
  }, [estado, silencio])
  return (
    <>
      <color attach="background" args={["#0b0a1c"]} />
      <fog attach="fog" args={["#140e28", 40, 190]} />
      <ambientLight intensity={0.3} color="#a8c0ff" />
      <hemisphereLight args={["#7f9ccf", "#1a1020", 0.5]} />
      {/* a luz que sobe da cidade e a luz da escada do terraço */}
      <pointLight position={[0, -4, -8]} color="#ff3fb0" intensity={40} distance={30} decay={2} />
      <pointLight position={[2.5, 2.6, 2]} color="#ffe0a8" intensity={6} distance={9} decay={2} />
      {/* o chão do terraço e a mureta */}
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#1e2026" roughness={0.2} metalness={0.4} />
      </mesh>
      <Caixa pos={[0, 0.5, -2.5]} tam={[10, 1, 0.3]} cor="#2a2c34" />
      <Caixa pos={[-5, 0.5, 2.5]} tam={[0.3, 1, 10]} cor="#2a2c34" />
      <Caixa pos={[5, 0.5, 2.5]} tam={[0.3, 1, 10]} cor="#2a2c34" />
      {/* a caixa d'água e a antena */}
      <Caixa pos={[3.2, 1.2, 2.5]} tam={[2, 2.4, 2]} cor="#3a3e48" />
      <mesh position={[-3.5, 3, 3]}>
        <cylinderGeometry args={[0.05, 0.08, 6, 6]} />
        <meshStandardMaterial color="#5a5e68" metalness={0.7} />
      </mesh>
      <Pisca pos={[-3.5, 6.05, 3]} />
      {/* a Notti na mureta */}
      <Npc cor={VERDE} pos={[0, 0.55, -2.45]} vira={0} pose="sentada" falando={estado.falando === "Notti"} />
      {/* a cidade lá embaixo, e a chuva */}
      <Cidade raio={70} n={110} alt={-28} cor={VERDE} brilho={0.3} />
      <Chuva n={500} larg={14} alto={10} fundo={14} />
      {/* a luz lá longe (a casa da D-Bee): só depois do silêncio */}
      {viuLuz && (
        <mesh position={[-60, -8, -180]}>
          <sphereGeometry args={[1.2, 10, 8]} />
          <meshBasicMaterial color="#ffcf8a" toneMapped={false} fog={false} />
        </mesh>
      )}
      <Camera plano={plano} />
    </>
  )
}

function Pisca({ pos }: { pos: [number, number, number] }) {
  const m = useRef<THREE.MeshBasicMaterial>(null)
  useFrame((s) => { if (m.current) m.current.color.set(Math.sin(s.clock.elapsedTime * 3) > 0.6 ? "#ff2a2a" : "#300808") })
  return (
    <mesh position={pos}>
      <sphereGeometry args={[0.1, 8, 6]} />
      <meshBasicMaterial ref={m} color="#ff2a2a" toneMapped={false} />
    </mesh>
  )
}
