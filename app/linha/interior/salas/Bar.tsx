"use client"

// O COPO por dentro (lugar 1, noir). Um bar comprido e baixo: o balcão no
// fundo com as garrafas acesas, o Mubarak no banco de sempre, ELA atrás do
// balcão, gente nas mesas. O gesto é com as mãos: os seis copos em fila no
// balcão. Beber um é um loop — a noite volta pro começo, o bar fica mais
// bonito (o neon sobe, dourado) e mais vazio (uma mesa some). Negar a oferta
// tira os copos do balcão, e no lugar deles nasce a muda.

import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { COPOS } from "../../cenas"
import { texTexto } from "../../estrada/geo"
import { gota } from "../../som"
import { vib } from "../../som-carro"
import { sinalizar } from "../bus"
import { Caixa, Neon, Npc, Sala, Toque, type V3 } from "../comum"
import { Camera, type Plano, type SalaProps } from "../Interior"

const LARANJA = "#ff6a35"
const OURO = "#ffc857"
const ELA = "#ff3f7a"

const PLANOS: Record<string, Plano> = {
  entrada: { pos: [0.6, 1.7, 3.8], olha: [-0.4, 1.35, -3], fov: 60 },
  balcao: { pos: [-0.1, 1.5, -0.3], olha: [0.1, 1.45, -3.8], fov: 56 },
  mubarak: { pos: [0.5, 1.5, -0.2], olha: [-1.4, 1.15, -1.8], fov: 46 },
  ela: { pos: [-0.2, 1.5, -0.6], olha: [0.6, 1.5, -3.6], fov: 44 },
  copos: { pos: [-0.1, 2.05, -0.55], olha: [-0.1, 1.08, -2.45], fov: 50 },
}

// as cores dos líquidos: cada promessa brilha de um jeito
const LIQ = ["#ffd166", "#7fe8ff", "#b38cff", "#ff3f7a", "#ffc857", "#5dffa0"]

// quem está nas mesas (some um a cada copo bebido)
const MESAS: { pos: V3; vira: number; cor: string }[] = [
  { pos: [3.4, 0.0, 1.0], vira: -1.6, cor: "#7a6a8c" },
  { pos: [4.6, 0.0, 1.0], vira: 1.6, cor: "#6a7a8c" },
  { pos: [-3.9, 0.0, 1.6], vira: 1.5, cor: "#8c6a6a" },
  { pos: [-2.7, 0.0, 1.6], vira: -1.5, cor: "#6a8c7a" },
  { pos: [3.8, 0.0, -0.9], vira: Math.PI, cor: "#8c7a6a" },
  { pos: [-4.6, 0.0, -0.4], vira: 0.4, cor: "#7a7a8c" },
]

export function SalaBar({ estado }: SalaProps) {
  const [bebidos, setBebidos] = useState<number[]>([])
  const [posGesto, setPosGesto] = useState<number | null>(null)
  if (estado.gesto === "copos" && posGesto === null) setPosGesto(estado.pos)
  const negou = posGesto !== null && estado.pos > posGesto
  const n = bebidos.length

  // a câmera segue a cena: quem fala, o gesto, o que ganhou
  const plano = useMemo(() => {
    if (estado.gesto === "copos" || estado.ganha) return PLANOS.copos
    if (estado.falando === "Mubarak") return PLANOS.mubarak
    if (estado.falando === "ela") return PLANOS.ela
    if (estado.pos === 0) return PLANOS.entrada
    return PLANOS.balcao
  }, [estado])

  const beber = (i: number) => {
    if (bebidos.includes(i) || estado.gesto !== "copos") return
    vib([20, 40, 20]); gota(1)
    const novo = [...bebidos, i]
    setBebidos(novo)
    const c = COPOS[i]
    sinalizar({ t: "fala", de: "ela", texto: c.promessa })
    sinalizar({ t: "fala", tipo: "acao", texto: `você bebe ${c.nome}. a noite volta pro começo. noite ${novo.length + 1}. o bar tá mais bonito. e mais vazio` })
    if (novo.length < COPOS.length) sinalizar({ t: "fala", de: "Mubarak", texto: "chegou. senta aí" })
    else sinalizar({ t: "fala", de: "ela", texto: "agora que você encontrou todas as respostas, o que mais poderia querer?" })
    sinalizar({ t: "bebeu", n: novo.length })
  }

  // atalho de desenvolvimento: __beber(i) bebe o copo i
  const beberRef = useRef(beber)
  useEffect(() => { beberRef.current = beber })
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    const w = window as unknown as Record<string, unknown>
    w.__beber = (i: number) => beberRef.current(i)
    return () => { delete w.__beber }
  }, [])

  return (
    <>
      <color attach="background" args={["#07060a"]} />
      <fog attach="fog" args={["#07060a", 6, 18]} />
      <ambientLight intensity={0.3} color="#ffd9b0" />
      <hemisphereLight args={["#ffcf9a", "#1a0c10", 0.35]} />
      {/* luz de preenchimento vinda da porta (a rua lá fora) */}
      <directionalLight position={[2, 3, 6]} intensity={0.55} color="#9fb4ff" />
      <Luzes n={n} />
      <Sala larg={12} fundo={10} alto={3.8} parede="#22161a" chao="#140d0d" teto="#0c0809" />
      <Letreiro />
      {/* o balcão: madeira escura, tampo claro, frisos de neon embaixo */}
      <Caixa pos={[-0.5, 0.55, -2.65]} tam={[7.4, 1.1, 0.8]} cor="#2b1a14" rough={0.6} />
      <Caixa pos={[-0.5, 1.12, -2.6]} tam={[7.6, 0.06, 0.95]} cor="#5a3a26" rough={0.25} metal={0.3} />
      <Neon pos={[-0.5, 0.1, -2.22]} comp={7.2} cor={LARANJA} luz={2} />
      {/* atrás do balcão: prateleiras com garrafas acesas e o espelho */}
      <Garrafas />
      <Caixa pos={[-0.5, 2.25, -4.92]} tam={[7, 1.1, 0.05]} cor="#2a2a34" rough={0.05} metal={0.9} />
      {/* os bancos */}
      {[-2.6, -1.4, -0.2, 1.0, 2.2].map((x) => (
        <group key={x} position={[x, 0, -1.75]}>
          <Caixa pos={[0, 0.38, 0]} tam={[0.06, 0.76, 0.06]} cor="#3a3036" metal={0.6} rough={0.4} />
          <mesh position={[0, 0.77, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.07, 16]} />
            <meshStandardMaterial color="#5a1f22" roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* as mesas */}
      {[[4, 1], [-3.3, 1.6], [4.2, -0.9], [-4.6, -0.4]].map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <Caixa pos={[0, 0.36, 0]} tam={[0.08, 0.72, 0.08]} cor="#2a2024" />
          <mesh position={[0, 0.74, 0]}>
            <cylinderGeometry args={[0.45, 0.45, 0.04, 20]} />
            <meshStandardMaterial color="#3b2a22" roughness={0.4} />
          </mesh>
          <pointLight position={[0, 1.9, 0]} color={OURO} intensity={1.4} distance={3} decay={2} />
        </group>
      ))}
      {/* a gente */}
      <Npc cor={LARANJA} pos={[-1.4, 0.27, -1.75]} vira={Math.PI} pose="sentada" falando={estado.falando === "Mubarak"} />
      <Npc cor={ELA} pos={[0.6, 0, -3.65]} vira={0} pele="#3a2430" falando={estado.falando === "ela"} />
      {MESAS.map((m, i) => (
        <Npc key={i} cor={m.cor} pos={m.pos} vira={m.vira} pose="sentada" some={i < n} />
      ))}
      {/* os seis copos no balcão (o gesto) */}
      {!negou && COPOS.map((c, i) => (
        <Copo key={c.id} pos={[-0.85 + i * 0.3, 1.15, -2.42]} cor={LIQ[i]} bebido={bebidos.includes(i)} ativo={estado.gesto === "copos"} onToque={() => beber(i)} />
      ))}
      {/* negou: no lugar dos copos, a muda */}
      {negou && <Muda pos={[-0.1, 1.15, -2.42]} />}
      <Camera plano={plano} />
    </>
  )
}

// a luz do bar: lâmpadas pendentes quentes. A cada copo o bar fica mais
// bonito: mais dourado, mais forte (e mais vazio)
function Luzes({ n }: { n: number }) {
  const ls = useRef<THREE.PointLight[]>([])
  useFrame((_, dt) => {
    const alvo = 4 + n * 1.6
    for (const l of ls.current) if (l) l.intensity += (alvo - l.intensity) * Math.min(1, dt * 1.5)
  })
  return (
    <>
      {[-3, -0.5, 2].map((x, i) => (
        <group key={x} position={[x, 2.9, -2.2]}>
          <Caixa pos={[0, 0.45, 0]} tam={[0.01, 0.9, 0.01]} cor="#222" />
          <mesh>
            <coneGeometry args={[0.22, 0.25, 16, 1, true]} />
            <meshStandardMaterial color="#1a1212" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -0.08, 0]}>
            <sphereGeometry args={[0.07, 10, 8]} />
            <meshBasicMaterial color="#ffe0a8" toneMapped={false} />
          </mesh>
          <pointLight ref={(el) => { if (el) ls.current[i] = el }} position={[0, -0.2, 0]} color="#ffcf8a" intensity={4} distance={5} decay={2} />
        </group>
      ))}
    </>
  )
}

function Letreiro() {
  const tex = useMemo(() => texTexto([{ txt: "O COPO", tam: 170, cor: LARANJA }], 1024, 256), [])
  return (
    <group position={[-0.5, 3.15, -4.95]}>
      <mesh>
        <planeGeometry args={[3.2, 0.8]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
      </mesh>
      <pointLight position={[0, 0, 0.6]} color={LARANJA} intensity={4} distance={5} decay={2} />
    </group>
  )
}

function Garrafas() {
  const garrafas = useMemo(() => {
    const out: { x: number; y: number; cor: string; h: number }[] = []
    let seed = 11
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const cores = ["#5dffa0", "#ffc857", "#ff6a35", "#7fe8ff", "#b38cff", "#ff3f7a"]
    for (const y of [1.45, 2.95]) for (let i = 0; i < 18; i++) out.push({ x: -3.8 + i * 0.38 + r() * 0.1, y, cor: cores[Math.floor(r() * cores.length)], h: 0.28 + r() * 0.12 })
    return out
  }, [])
  return (
    <group position={[0, 0, -4.7]}>
      {[1.4, 2.9].map((y) => <Caixa key={y} pos={[-0.5, y - 0.03, 0]} tam={[7.4, 0.04, 0.35]} cor="#3a2a22" />)}
      {[1.4, 2.9].map((y) => <Neon key={`n${y}`} pos={[-0.5, y - 0.07, 0.12]} comp={7} cor={OURO} luz={1.2} />)}
      {garrafas.map((g, i) => (
        <mesh key={i} position={[g.x, g.y + g.h / 2, 0]}>
          <cylinderGeometry args={[0.05, 0.06, g.h, 8]} />
          <meshStandardMaterial color={g.cor} emissive={g.cor} emissiveIntensity={0.35} transparent opacity={0.8} roughness={0.1} />
        </mesh>
      ))}
    </group>
  )
}

function Copo({ pos, cor, bebido, ativo, onToque }: { pos: V3; cor: string; bebido: boolean; ativo: boolean; onToque: () => void }) {
  const liq = useRef<THREE.Mesh>(null)
  useFrame((s, dt) => {
    if (!liq.current) return
    const alvo = bebido ? 0.001 : 1
    liq.current.scale.y += (alvo - liq.current.scale.y) * Math.min(1, dt * 3)
    const m = liq.current.material as THREE.MeshStandardMaterial
    m.emissiveIntensity = 0.6 + Math.sin(s.clock.elapsedTime * 3 + pos[0] * 5) * 0.3
  })
  return (
    <Toque pos={pos} raio={0.13} cor={cor} ativo={ativo && !bebido} onToque={onToque}>
      {/* o copo americano: vidro com gomos */}
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.065, 0.05, 0.14, 12, 1, true]} />
        <meshStandardMaterial color="#dfe9ff" transparent opacity={0.28} roughness={0.05} metalness={0.2} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={liq} position={[0, 0.005, 0]}>
        <cylinderGeometry args={[0.058, 0.047, 0.11, 12]} />
        <meshStandardMaterial color={cor} emissive={cor} emissiveIntensity={0.7} transparent opacity={0.85} />
      </mesh>
      {!bebido && <pointLight position={[0, 0.12, 0]} color={cor} intensity={0.3} distance={0.6} decay={2} />}
    </Toque>
  )
}

// a muda: um vasinho com três folhas crescendo devagar
function Muda({ pos }: { pos: V3 }) {
  const g = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (g.current) g.current.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, dt * 1.2)) })
  return (
    <group position={pos}>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.08, 0.06, 0.12, 14]} />
        <meshStandardMaterial color="#8a4a2c" roughness={0.9} />
      </mesh>
      <group ref={g} scale={0.01} position={[0, 0.12, 0]}>
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.008, 0.01, 0.2, 6]} />
          <meshStandardMaterial color="#3fa060" />
        </mesh>
        {[0, 2.1, 4.2].map((a) => (
          <mesh key={a} position={[Math.cos(a) * 0.05, 0.15 + a * 0.01, Math.sin(a) * 0.05]} rotation={[0.6, a, 0]}>
            <sphereGeometry args={[0.05, 10, 6]} />
            <meshStandardMaterial color="#5dffa0" emissive="#5dffa0" emissiveIntensity={0.4} />
          </mesh>
        ))}
      </group>
      <pointLight position={[0, 0.4, 0.2]} color="#5dffa0" intensity={2} distance={1.5} decay={2} />
    </group>
  )
}
