"use client"
/* eslint-disable react-hooks/immutability -- three.js: câmera, luzes e materiais mexidos a cada quadro */

// O VAGÃO DA LINHA 9 por dentro (lugar 8, thriller de fuga). Começa na
// plataforma da estação 6 (o LU2CA fica), as portas abrem e você entra num
// trem branco, limpo demais: artistas sentados de cabeça baixa (um com a
// câmera no colo, uma com o caderno fechado, um com o fone sem música), e no
// fundo um policial. Lá fora, a cidade passando rápido pelas janelas.
//
// Dois gestos, os dois na sala: TOCAR (o violão na sua mão; cada batida
// certa, um artista levanta a cabeça) e FUGIR (cada toque é um passo pelo
// corredor até a porta, o policial vindo atrás).

import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { gota } from "../../som"
import { vib } from "../../som-carro"
import { sinalizar } from "../bus"
import { AnelRitmo, Caixa, Npc, Sala, useRitmo, type V3 } from "../comum"
import { Camera, useToqueLivre, type Plano, type SalaProps } from "../Interior"

const BRANCO = "#eef2fb"
const LILAS = "#b38cff"
const META = 8
const PASSOS = 14

// o vagão vai de z −9 a z 9; a porta da plataforma fica no lado +x, em z 0
const PLANOS: Record<string, Plano> = {
  plataforma: { pos: [5.2, 1.65, 3.4], olha: [2.2, 1.45, 0.4], fov: 56 },
  dentro: { pos: [0, 1.62, 4.5], olha: [0, 1.3, -6], fov: 60 },
  artistas: { pos: [0.4, 1.45, 1.6], olha: [-1.1, 0.9, -1.2], fov: 52 },
  policial: { pos: [0.2, 1.65, 3], olha: [0, 1.55, -8.4], fov: 46 },
  tocar: { pos: [0, 1.5, 3.2], olha: [0, 1.0, -3], fov: 58 },
  moca: { pos: [0.6, 1.4, 0.2], olha: [-1.1, 0.95, -2.2], fov: 46 },
}

// quem está no vagão (sentado nos bancos dos dois lados)
const ARTISTAS: { pos: V3; lado: 1 | -1; cor: string; quem?: string; coisa?: "camera" | "caderno" | "fone" }[] = [
  { pos: [-1.1, 0.02, -1.2], lado: -1, cor: "#ffc857", quem: "a moça do caderno", coisa: "caderno" },
  { pos: [1.1, 0.02, -0.4], lado: 1, cor: "#2fe8ff", coisa: "camera" },
  { pos: [-1.1, 0.02, 1.8], lado: -1, cor: "#ff3fb0", coisa: "fone" },
  { pos: [1.1, 0.02, 2.6], lado: 1, cor: "#5dffa0" },
  { pos: [-1.1, 0.02, -3.6], lado: -1, cor: "#ff6a35" },
  { pos: [1.1, 0.02, -2.8], lado: 1, cor: LILAS },
  { pos: [-1.1, 0.02, -5.6], lado: -1, cor: "#7fe8ff" },
  { pos: [1.1, 0.02, -5.0], lado: 1, cor: "#ffd166" },
  { pos: [1.1, 0.02, 4.6], lado: 1, cor: "#ff9fe0" },
]

export function SalaVagao({ estado }: SalaProps) {
  const [fase, setFase] = useState<"plataforma" | "dentro" | "tocou" | "fugindo" | "pulou">("plataforma")
  const [passos, setPassos] = useState(0)
  // a fase sai do andamento da cena
  if (fase === "plataforma" && estado.pos >= 2) setFase("dentro")
  if (fase !== "fugindo" && fase !== "pulou" && estado.gesto === "fuga") setFase("fugindo")
  if (fase === "fugindo" && estado.gesto !== "fuga" && passos >= PASSOS) setFase("pulou")

  const tocando = estado.gesto === "tocar"
  const { acertos, tocar, fase: faseRitmo } = useRitmo(tocando, META, () => { setFase("tocou"); sinalizar({ t: "fim-gesto" }) })
  const acordados = fase === "tocou" || fase === "fugindo" || fase === "pulou" ? ARTISTAS.length : Math.round((Math.min(acertos, META) / META) * ARTISTAS.length)

  useToqueLivre(() => {
    if (tocando) { if (tocar()) { vib(18); gota(5) } return }
    if (estado.gesto === "fuga" && passos < PASSOS) {
      vib(10)
      const n = passos + 1
      setPassos(n)
      if (n >= PASSOS) setTimeout(() => sinalizar({ t: "fim-gesto" }), 500)
    }
  })
  // atalho de teste: __gesto() faz um passo do gesto valendo
  const passoRef = useRef(() => {})
  useEffect(() => {
    passoRef.current = () => {
      if (tocando) { setFase("tocou"); setTimeout(() => sinalizar({ t: "fim-gesto" }), 300) }
      else if (estado.gesto === "fuga") { setPassos(PASSOS); setTimeout(() => sinalizar({ t: "fim-gesto" }), 300) }
    }
  })
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    const w = window as unknown as Record<string, unknown>
    w.__gesto = () => passoRef.current()
    return () => { delete w.__gesto }
  }, [])

  const plano = useMemo<Plano>(() => {
    if (fase === "pulou" || (fase === "plataforma")) return PLANOS.plataforma
    if (estado.falando === "LU2CA") return PLANOS.plataforma
    if (fase === "fugindo") {
      // o corredor: cada toque um passo até a porta (z 0, lado +x)
      const k = passos / PASSOS
      return { pos: [k * 1.1, 1.6, 4.5 - k * 4.3], olha: [1.6 * k + 0.2, 1.4, -3 + k * 3], fov: 62 }
    }
    if (tocando) return PLANOS.tocar
    if (estado.falando === "a moça do caderno" || estado.ganha) return PLANOS.moca
    if (estado.falando === "NÚCLEO" || estado.pos === 4 || estado.pos === 10) return PLANOS.policial
    if (estado.pos === 6 || estado.pos === 7 || estado.pos === 9) return PLANOS.artistas
    return PLANOS.dentro
  }, [estado, fase, passos, tocando])

  // o policial: no fundo; levanta depois do toque e vem vindo na fuga
  const zPolicia = fase === "fugindo" ? -8.4 + (passos / PASSOS) * 7.5 : -8.4

  return (
    <>
      <color attach="background" args={["#05060b"]} />
      <ambientLight intensity={0.45} color="#e6f0ff" />
      <hemisphereLight args={["#ffffff", "#20222c", 0.4]} />
      {/* o vagão: branco, limpo, frio */}
      <group>
        <Sala larg={3} fundo={18} alto={2.5} parede="#d8dce8" chao="#8a8e9a" teto="#e8ecf4" sem={["dir"]} />
        <ParedeComPorta />
        <Janelas />
        {/* os bancos dos dois lados */}
        {[-1, 1].map((l) => <Caixa key={l} pos={[l * 1.15, 0.22, -1]} tam={[0.6, 0.44, 15]} cor="#9aa3b8" rough={0.5} />)}
        {/* os ferros de segurar */}
        {[-6, -2, 2, 6].map((z) => (
          <mesh key={z} position={[0, 1.25, z]}>
            <cylinderGeometry args={[0.025, 0.025, 2.5, 8]} />
            <meshStandardMaterial color="#c8ccd8" metalness={0.8} roughness={0.25} />
          </mesh>
        ))}
        {/* as luzes do teto, frias */}
        {[-6, -2, 2, 6].map((z) => (
          <group key={`l${z}`} position={[0, 2.46, z]}>
            <Caixa pos={[0, 0, 0]} tam={[0.8, 0.03, 2]} cor="#ffffff" brilho={1.2} />
            <pointLight position={[0, -0.3, 0]} color="#e8f0ff" intensity={2.2} distance={5} decay={2} />
          </group>
        ))}
      </group>
      {/* a plataforma da estação 6, do lado de fora da porta */}
      <Caixa pos={[4, 0.05, 0]} tam={[5, 0.1, 18]} cor="#2a2c38" />
      <Caixa pos={[1.62, 0.2, 0]} tam={[0.12, 0.08, 18]} cor="#ffc857" brilho={0.6} />
      <pointLight position={[4, 3, 1]} color={LILAS} intensity={5} distance={9} decay={2} />
      {(fase === "plataforma" || fase === "pulou") && <Npc cor={LILAS} pos={[3, 0.1, 1.2]} vira={-1.4} falando={estado.falando === "LU2CA"} />}
      {/* quem está no vagão */}
      {ARTISTAS.map((a, i) => (
        <Artista key={i} a={a} acordado={i < acordados} falando={!!a.quem && estado.falando === a.quem} />
      ))}
      <Npc cor={BRANCO} pos={[0, 0, zPolicia]} vira={0} pele="#c8ccd8" falando={estado.falando === "NÚCLEO"} />
      {/* o violão na sua mão (enquanto ele é seu) */}
      {fase !== "pulou" && fase !== "fugindo" && (fase !== "plataforma") && <ViolaoNaMao tocando={tocando} />}
      <AnelRitmo pos={[0, 0.05, 1.4]} cor={LILAS} fase={faseRitmo} raio={0.9} ativo={tocando && acertos < META} />
      <Camera plano={plano} rapido={fase === "fugindo"} />
    </>
  )
}

// a parede do lado da plataforma, com o vão da porta aberta em z 0
function ParedeComPorta() {
  return (
    <group>
      <Caixa pos={[1.5, 1.25, -5.25]} tam={[0.05, 2.5, 7.5]} cor="#d8dce8" />
      <Caixa pos={[1.5, 1.25, 5.25]} tam={[0.05, 2.5, 7.5]} cor="#d8dce8" />
      <Caixa pos={[1.5, 2.3, 0]} tam={[0.05, 0.4, 3]} cor="#d8dce8" />
    </group>
  )
}

// lá fora, a cidade passando rápido (faixas de luz correndo nas janelas)
function Janelas() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 32
    const g = c.getContext("2d")!
    g.fillStyle = "#05060b"; g.fillRect(0, 0, 256, 32)
    const cores = ["#ff3fb0", "#2fe8ff", "#ffc857", "#b38cff"]
    for (let i = 0; i < 14; i++) { g.fillStyle = cores[i % cores.length]; g.fillRect(i * 19, 6 + (i % 3) * 8, 6 + (i % 4) * 3, 2) }
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1)
    return t
  }, [])
  useFrame((_, dt) => { tex.offset.x += dt * 1.8 })
  return (
    <group>
      {[-6.5, -3, 3, 6.5].map((z) => (
        <mesh key={z} position={[-1.48, 1.5, z]} rotation-y={Math.PI / 2}>
          <planeGeometry args={[2.6, 0.8]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function Artista({ a, acordado, falando }: { a: (typeof ARTISTAS)[number]; acordado: boolean; falando: boolean }) {
  // de cabeça baixa (olhando pro chão/colo) → acordado: vira pra janela/pra você
  const vira = a.lado > 0 ? -Math.PI / 2 : Math.PI / 2
  const rec = useRef<THREE.MeshBasicMaterial>(null)
  useFrame((s) => { if (rec.current) rec.current.opacity = acordado ? (Math.sin(s.clock.elapsedTime * 6) > 0 ? 1 : 0.2) : 0 })
  return (
    <group>
      <group position={a.pos} rotation-x={acordado ? 0 : 0.18}>
        <Npc cor={a.cor} pos={[0, 0, 0]} vira={vira + (acordado ? (a.lado > 0 ? -0.5 : 0.5) : 0)} pose="sentada" falando={falando} pele={acordado ? "#3a3448" : "#24222c"} />
      </group>
      {a.coisa === "camera" && (
        <group position={[a.pos[0] - 0.25 * a.lado, 0.62, a.pos[2]]}>
          <Caixa pos={[0, 0, 0]} tam={[0.18, 0.12, 0.1]} cor="#1a1a22" />
          <mesh position={[-0.06 * a.lado, 0.05, 0.03]}>
            <sphereGeometry args={[0.012, 6, 4]} />
            <meshBasicMaterial ref={rec} color="#ff2a2a" transparent toneMapped={false} />
          </mesh>
        </group>
      )}
      {a.coisa === "caderno" && (
        <group position={[a.pos[0] + 0.3, 0.6, a.pos[2]]} rotation-z={acordado ? -0.1 : 0}>
          <Caixa pos={[0, 0, 0]} tam={acordado ? [0.36, 0.01, 0.24] : [0.18, 0.03, 0.24]} cor={acordado ? "#f4efe2" : "#3a2f2a"} />
        </group>
      )}
      {a.coisa === "fone" && !acordado && (
        <mesh position={[a.pos[0], 1.18, a.pos[2]]} rotation-y={Math.PI / 2}>
          <torusGeometry args={[0.13, 0.02, 6, 16, Math.PI]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      )}
    </group>
  )
}

// o violão na frente da câmera (primeira pessoa), balança quando você toca
function ViolaoNaMao({ tocando }: { tocando: boolean }) {
  const g = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (!g.current) return
    const cam = s.camera
    g.current.position.copy(cam.position)
    g.current.quaternion.copy(cam.quaternion)
    g.current.translateX(0.18); g.current.translateY(-0.42); g.current.translateZ(-0.7)
    g.current.rotateZ(0.9)
    if (tocando) g.current.rotateZ(Math.sin(s.clock.elapsedTime * 11.2) * 0.015)
  })
  return (
    <group ref={g}>
      <mesh scale={[1, 1.2, 0.35]}>
        <sphereGeometry args={[0.16, 18, 12]} />
        <meshStandardMaterial color="#8a5a2c" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.17, 0]} scale={[0.82, 0.9, 0.35]}>
        <sphereGeometry args={[0.13, 18, 12]} />
        <meshStandardMaterial color="#8a5a2c" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.05, 0.06]}>
        <circleGeometry args={[0.04, 16]} />
        <meshBasicMaterial color="#1a0f08" />
      </mesh>
      <Caixa pos={[0, 0.55, 0.02]} tam={[0.045, 0.55, 0.03]} cor="#3a2414" />
      <Caixa pos={[0, 0.86, 0.02]} tam={[0.07, 0.1, 0.035]} cor="#2a1a0e" />
    </group>
  )
}
