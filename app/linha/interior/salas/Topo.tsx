"use client"

// O TERRAÇO (mirante, lugar 2, drama silencioso). O topo do prédio mais alto:
// mureta baixa, a caixa d'água, a antena piscando vermelho, a chuva, e a
// cidade inteira lá embaixo. A Notti sentada na mureta, de costas pro vão.
// Nos 15 segundos de silêncio a câmera vira devagar pro horizonte; depois,
// fora da cidade, onde a estrada acaba, aparece uma luz acesa.

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { useGLTF } from "@react-three/drei"
import { ModeloSeguro } from "../../estrada/Seguro"
import { Caixa, Chuva, Cidade, Npc } from "../comum"
import { SalaGlb } from "../modelo"
import { Camera, type Plano, type SalaProps } from "../motor"

const VERDE = "#5dffa0"
const URL_TOPO = "/models/topo.glb"

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
      {/* (06/11) o terraço modelado no Blender (blender/scripts/topo.py, public/models/topo.glb):
          piso cerâmico molhado com poças, a mureta com a faixa DOPAMINA, a casa de
          máquinas com a porta da escada acesa e a caixa d'água, a antena de treliça
          (acaba em 6 m, o Pisca fica em cima), as luzes de festa, a máquina do
          fliperama em destaque ([-1.5, 0, -1.2], tela de 8 bits, marquise DOPAMINA),
          a máquina morta e o pinball, o sofá virado pra cidade, as TVs de tubo e os
          consoles nos engradados, o sequenciador da trilha de 8 bits e a fachada
          descendo. ~16,5 mil triângulos, 160 KB. Enquanto baixa, ou se falhar, as caixas */}
      <ModeloSeguro nome="topo-glb" reserva={<TopoCaixas />}>
        <SalaGlb url={URL_TOPO} />
      </ModeloSeguro>
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
  const cores = useMemo(() => ({ on: new THREE.Color("#ff2a2a"), off: new THREE.Color("#300808") }), [])
  useFrame((s) => { if (m.current) m.current.color.copy(Math.sin(s.clock.elapsedTime * 3) > 0.6 ? cores.on : cores.off) })
  return (
    <mesh position={pos}>
      <sphereGeometry args={[0.1, 8, 6]} />
      <meshBasicMaterial ref={m} color="#ff2a2a" toneMapped={false} />
    </mesh>
  )
}

// as caixas de antes (enquanto o modelo baixa, ou se ele falhar)
function TopoCaixas() {
  return (
    <>
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
    </>
  )
}
useGLTF.preload(URL_TOPO)
