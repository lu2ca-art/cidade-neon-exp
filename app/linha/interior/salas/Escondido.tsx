"use client"

// (06/10: virou a casa da Ella, um grow indoor — ver o comentário da cena.)
// O LUGAR ESCONDIDO (subúrbio, lugar 4, drama íntimo). Em cima de uma laje,
// atrás da caixa d'água: um pedaço de asfalto rachado e, no meio da rachadura,
// uma flor murcha. Chove (a chuva de três anos, que é dela). A Ella agachada.
// Lá em cima passa o trilho da Linha 9.
//
// O gesto: regar. Dez gotas do cantil boiando em volta da flor; cada toque
// numa gota, a flor levanta um pouco e a chuva diminui só ali.

import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { gota } from "../../som"
import { sinalizar } from "../bus"
import { Caixa, Chuva, Npc, Sala, Toque, type V3 } from "../comum"
import { Camera, type Plano, type SalaProps } from "../motor"

const CIANO = "#2fe8ff"
const VERDE = "#5dffa0"
const GOTAS = 10

const PLANOS: Record<string, Plano> = {
  chegada: { pos: [1.9, 1.7, 2.5], olha: [-0.2, 1.0, -0.6], fov: 58 },
  ella: { pos: [0.7, 1.3, 1.7], olha: [-1.25, 0.75, 0.1], fov: 50 },
  flor: { pos: [0.15, 1.25, 1.05], olha: [0, 1.0, -0.6], fov: 50 },
}

export function SalaEscondido({ estado }: SalaProps) {
  const regando = estado.gesto === "prova:regar"
  const [regadas, setRegadas] = useState<number[]>([])
  const [posGesto, setPosGesto] = useState<number | null>(null)
  if (regando && posGesto === null) setPosGesto(estado.pos)
  const regou = posGesto !== null && estado.pos > posGesto
  const k = regou ? 1 : regadas.length / GOTAS

  const gotasPos = useMemo<V3[]>(() => Array.from({ length: GOTAS }, (_, i) => {
    const a = (i / GOTAS) * Math.PI * 2
    return [Math.cos(a) * (0.42 + (i % 2) * 0.12), 0.35 + (i % 3) * 0.15, Math.sin(a) * (0.42 + (i % 2) * 0.12)]
  }), [])
  const regar = (i: number) => {
    if (!regando || regadas.includes(i)) return
    gota(2)
    const n = [...regadas, i]
    setRegadas(n)
    if (n.length >= GOTAS) setTimeout(() => sinalizar({ t: "fim-gesto" }), 700)
  }
  // atalho de teste
  const regarRef = useRef(regar)
  useEffect(() => { regarRef.current = regar })
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    const w = window as unknown as Record<string, unknown>
    w.__gesto = () => { for (let i = 0; i < GOTAS; i++) setTimeout(() => regarRef.current(i), i * 30) }
    return () => { delete w.__gesto }
  }, [])

  const plano = useMemo(() => {
    if (regando || estado.ganha) return PLANOS.flor
    if (estado.falando === "Ella" || estado.falando === "você") return PLANOS.ella
    return PLANOS.chegada
  }, [estado, regando])

  return (
    <>
      {/* A CASA DA ELLA (06/10, LU2CA): um grow indoor com estilo rastafári —
          o quarto quente, a tenda prateada com a luz roxa, a planta verde
          cheia de tricomas, a bandeira na parede. Lá fora, a chuva na janela */}
      <color attach="background" args={["#0a0706"]} />
      <fog attach="fog" args={["#0a0706", 6, 16]} />
      <ambientLight intensity={0.28} color="#ffd9b0" />
      <hemisphereLight args={["#ffcf9a", "#120a06", 0.35]} />
      <Sala larg={6} fundo={6} alto={2.8} parede="#3a2618" chao="#4a3020" teto="#1c120c" />
      {/* a bandeira: verde, amarelo, vermelho */}
      {["#1f9a3a", "#f2c230", "#d4302a"].map((c, i) => (
        <Caixa key={c} pos={[1.2, 1.95 - i * 0.42, -2.97]} tam={[2.2, 0.42, 0.02]} cor={c} rough={1} brilho={0.08} />
      ))}
      <mesh position={[1.2, 1.53, -2.95]}><circleGeometry args={[0.28, 24]} /><meshStandardMaterial color="#1a120c" /></mesh>
      {/* a tenda de cultivo: prateada por dentro, a luz roxa em cima */}
      <group position={[0, 0, -0.6]}>
        {[[-0.85, 0], [0.85, 0]].map(([x]) => <Caixa key={x} pos={[x, 1.1, 0]} tam={[0.02, 2.2, 1.7]} cor="#c8c8d0" rough={0.15} metal={0.9} />)}
        <Caixa pos={[0, 1.1, -0.85]} tam={[1.7, 2.2, 0.02]} cor="#c8c8d0" rough={0.15} metal={0.9} />
        <Caixa pos={[0, 2.2, 0]} tam={[1.72, 0.02, 1.72]} cor="#1a1a20" />
        <Caixa pos={[0, 2.08, 0]} tam={[1.1, 0.06, 0.7]} cor="#d070ff" brilho={1.6} />
        <pointLight position={[0, 1.8, 0]} color="#c070ff" intensity={6} distance={4} decay={2} />
        <pointLight position={[0, 0.9, 0.6]} color="#ff70d0" intensity={1.5} distance={2.5} decay={2} />
        {/* o vaso */}
        <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.28, 0.22, 0.4, 16]} /><meshStandardMaterial color="#2a1a10" roughness={0.9} /></mesh>
        <group position={[0, 0.4, 0]}><Planta k={k} /></group>
      </group>
      {/* a janela com a chuva lá fora */}
      <group position={[-2.97, 1.5, 0.6]}>
        <Caixa pos={[0, 0, 0]} tam={[0.04, 1.1, 1.3]} cor="#0c1626" brilho={0.1} />
        <Chuva n={Math.round(160 - k * 110)} larg={0.1} alto={1.1} fundo={1.2} centro={[0.05, -0.55, 0]} />
      </group>
      {/* almofadas, o incenso */}
      {[[-1.6, 0.12, 1.2, "#d4302a"], [-1.0, 0.12, 1.5, "#f2c230"], [-1.9, 0.12, 0.5, "#1f9a3a"]].map(([x, y, z, c]) => (
        <mesh key={c as string} position={[x as number, y as number, z as number]} scale={[1, 0.45, 1]}><sphereGeometry args={[0.32, 14, 10]} /><meshStandardMaterial color={c as string} roughness={1} /></mesh>
      ))}
      <group position={[1.8, 0, 1.4]}>
        <Caixa pos={[0, 0.25, 0]} tam={[0.4, 0.5, 0.4]} cor="#2a1a10" />
        <mesh position={[0, 0.7, 0]} rotation-z={0.15}><cylinderGeometry args={[0.006, 0.006, 0.35, 4]} /><meshStandardMaterial color="#5a3a20" /></mesh>
        <mesh position={[0.03, 0.88, 0]}><sphereGeometry args={[0.012, 6, 4]} /><meshBasicMaterial color="#ff7a3a" toneMapped={false} /></mesh>
      </group>
      {/* a Ella, sentada do lado da tenda */}
      <Npc cor={CIANO} pos={[-1.25, 0, 0.1]} vira={0.9} pose="sentada" falando={estado.falando === "Ella"} />
      {/* as gotas do cantil, em volta do vaso */}
      {!regou && gotasPos.map((p, i) => (
        <Toque key={i} pos={[p[0] * 0.7, p[1] + 0.25, p[2] * 0.7 - 0.6]} raio={0.08} cor={CIANO} ativo={regando && !regadas.includes(i)} onToque={() => regar(i)}>
          {!regadas.includes(i) && regando && (
            <mesh>
              <sphereGeometry args={[0.035, 10, 8]} />
              <meshStandardMaterial color={CIANO} emissive={CIANO} emissiveIntensity={0.8} transparent opacity={0.85} />
            </mesh>
          )}
        </Toque>
      ))}
      <Camera plano={plano} />
    </>
  )
}

// os tricomas: os pontinhos brancos em volta das flores (semente fixa)
function criarTricomas() {
  const geo = new THREE.BufferGeometry()
  const n = 260
  const p = new Float32Array(n * 3)
  let semente = 5
  const r = () => ((semente = (semente * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < n; i++) {
    const COLAS = [[0, 1.18, 0, 1.5], [0.1, 0.95, 0.04, 1], [-0.09, 0.82, -0.05, 0.9], [0.06, 0.7, -0.08, 0.8]]
    const [cx, cy, cz, e] = COLAS[Math.floor(r() * COLAS.length)]
    const rr = (0.03 + r() * 0.04) * e, th = r() * Math.PI * 2
    p.set([cx + Math.cos(th) * rr, cy + (r() - 0.5) * 0.18 * e, cz + Math.sin(th) * rr], i * 3)
  }
  geo.setAttribute("position", new THREE.BufferAttribute(p, 3))
  return geo
}

// a planta: verde, as folhas recortadas em leque, as flores cheias de
// tricomas (pontinhos brancos que brilham na luz roxa). Murcha → de pé
function Planta({ k }: { k: number }) {
  const g = useRef<THREE.Group>(null)
  const kk = useRef(0)
  // os nós: folhas grandes em leque (7 folíolos), alternando a volta
  const nos = useMemo(() => Array.from({ length: 8 }, (_, i) => ({ y: 0.12 + i * 0.12, a: i * 2.2, s: 1.15 - i * 0.08 })), [])
  const tricomas = useMemo(() => criarTricomas(), [])
  const murcha = useRef<THREE.Group[]>([])
  useFrame((st, dt) => {
    kk.current += (k - kk.current) * Math.min(1, dt * 2)
    if (g.current) {
      g.current.rotation.z = (1 - kk.current) * 0.22 + Math.sin(st.clock.elapsedTime * 1.2) * 0.015
      g.current.scale.setScalar(0.9 + kk.current * 0.2)
    }
    // as folhas caídas levantam conforme rega
    for (const f of murcha.current) if (f) f.rotation.z = -0.9 * (1 - kk.current) - 0.15
  })
  const verde = new THREE.Color("#6a7a48").lerp(new THREE.Color("#2fa84a"), k)
  return (
    <group ref={g}>
      <mesh position={[0, 0.55, 0]}><cylinderGeometry args={[0.016, 0.03, 1.1, 6]} /><meshStandardMaterial color="#4a7a3a" /></mesh>
      {nos.map((n, i) => (
        <group key={i} position={[0, n.y, 0]} rotation-y={n.a}>
          <group ref={(el) => { if (el) murcha.current[i] = el }}>
            {[-1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2].map((d) => (
              <group key={d} rotation-y={d * 0.55}>
                <mesh position={[0.17 * n.s * (1 - Math.abs(d) * 0.25), 0, 0]} scale={[1, 0.05, 0.2]}>
                  <sphereGeometry args={[0.17 * n.s * (1 - Math.abs(d) * 0.25), 8, 5]} />
                  <meshStandardMaterial color={verde} roughness={0.7} side={THREE.DoubleSide} />
                </mesh>
              </group>
            ))}
          </group>
        </group>
      ))}
      {/* as colas (flores) no alto, cheias de tricomas */}
      {[[0, 1.18, 0, 1.5], [0.1, 0.95, 0.04, 1], [-0.09, 0.82, -0.05, 0.9], [0.06, 0.7, -0.08, 0.8]].map(([x, y, z, e], c) => (
        <mesh key={c} position={[x, y, z]} scale={[0.75 * e, 1.6 * e, 0.75 * e]}>
          <sphereGeometry args={[0.065, 12, 10]} />
          <meshStandardMaterial color="#7ac85a" emissive="#2a6a2a" emissiveIntensity={0.2 + k * 0.4} roughness={0.6} />
        </mesh>
      ))}
      <points geometry={tricomas}>
        <pointsMaterial size={0.014} color="#f4f0ff" transparent opacity={0.45 + k * 0.55} toneMapped={false} />
      </points>
    </group>
  )
}
