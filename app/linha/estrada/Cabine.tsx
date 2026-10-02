"use client"

// A Kombi por dentro (primeira pessoa). O interior é o MESMO da drive-v2
// (o layout que o LU2CA desenhou no /kombi-editor: cúpula de vidro, painel,
// rádio, toca-discos, MPC, porta-luvas dourado, bancos, guirlandas), em
// escala com a estrada. Dentro dele: quem você já ajudou viaja junto (cada
// um na cor da sua estação) e os objetos das missões ficam pendurados no
// retrovisor. Frente pra -Z.

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import { Kombi as KombiHippie } from "@/components/DriveCockpit/Kombi"
import { KOMBI_LAYOUT } from "@/lib/kombi-layout"
import { estacao as getEstacao, type EstacaoId, type ObjetoId } from "../data"

// o interior da drive-v2 encaixado na Kombi da estrada (cúpula panorâmica):
// um pouco mais estreito, mais alto, puxado pra frente (painel perto do
// para-brisa) e subido (assim quem viaja aparece pelo vidro, de fora)
export const ESCALA: [number, number, number] = [0.98, 1.3, 1.3]
export const DESLOCA: [number, number, number] = [0, 0.3, -0.35]
const cam = KOMBI_LAYOUT.cameraMotorista.position
// a cabeça: no banco do motorista, um pouco pro meio
export const OLHO = new THREE.Vector3(
  (cam[0] + 0.22) * ESCALA[0] + DESLOCA[0],
  (cam[1] + 0.3) * ESCALA[1] + DESLOCA[1],
  0.12 * ESCALA[2] + DESLOCA[2],
)

type Props = {
  balanco: React.MutableRefObject<number> // aceleração lateral (pro pêndulo)
  disco: boolean // tocando vinil (o toca-discos gira)
  objetos: EstacaoId[]
  carona: EstacaoId | null // alguém de carona agora (o BBX na missão dele)
  onTocaDiscos?: () => void // tocou no toca-discos: abre a estante de discos
}

// cada objeto pendurado com uma forma simples que lembra ele
function Pingente({ id, cor }: { id: ObjetoId; cor: string }) {
  const mat = <meshStandardMaterial color={cor} emissive={cor} emissiveIntensity={0.6} roughness={0.4} />
  switch (id) {
    case "flor":
      return <group>{[0, 1, 2, 3, 4].map((k) => <mesh key={k} position={[Math.cos(k * 1.26) * 0.022, Math.sin(k * 1.26) * 0.022, 0]}><sphereGeometry args={[0.016, 8, 6]} />{mat}</mesh>)}<mesh><sphereGeometry args={[0.012, 8, 6]} /><meshBasicMaterial color="#fff6d8" /></mesh></group>
    case "mp3":
      return <mesh><boxGeometry args={[0.035, 0.055, 0.01]} />{mat}</mesh>
    case "relogio":
      return <mesh><torusGeometry args={[0.025, 0.007, 8, 16]} />{mat}</mesh>
    case "espelho":
      return <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.028, 0.028, 0.006, 16]} />{mat}</mesh>
    case "caderno":
      return <mesh><boxGeometry args={[0.045, 0.055, 0.012]} />{mat}</mesh>
    case "violao":
      return <group><mesh position={[0, -0.015, 0]}><sphereGeometry args={[0.022, 10, 8]} />{mat}</mesh><mesh position={[0, 0.025, 0]}><boxGeometry args={[0.007, 0.05, 0.005]} />{mat}</mesh></group>
    case "camisa":
      return <mesh><boxGeometry args={[0.05, 0.045, 0.008]} />{mat}</mesh>
    case "lanterna":
      return <mesh rotation-z={Math.PI / 2}><cylinderGeometry args={[0.01, 0.014, 0.06, 10]} />{mat}</mesh>
    default:
      return <mesh><octahedronGeometry args={[0.025, 0]} />{mat}</mesh>
  }
}

// uma pessoa sentada: corpo, cabeça e um brilho na cor da estação
function Pessoa({ cor, pos, vira = 0 }: { cor: string; pos: [number, number, number]; vira?: number }) {
  const cabeca = useRef<THREE.Mesh>(null)
  const fase = pos[0] * 3.1 + pos[2] * 5.7 // cada um no seu tempo
  useFrame((st) => {
    // balança de leve com a estrada, cada um no seu tempo
    if (cabeca.current) cabeca.current.position.y = 0.42 + Math.sin(st.clock.elapsedTime * 1.7 + fase) * 0.008
  })
  return (
    <group position={pos} rotation-y={vira}>
      <mesh position={[0, 0.2, 0]}>
        <capsuleGeometry args={[0.13, 0.2, 6, 12]} />
        <meshStandardMaterial color="#1c1e34" emissive={cor} emissiveIntensity={0.12} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.27, -0.12]}>
        <boxGeometry args={[0.2, 0.02, 0.01]} />
        <meshBasicMaterial color={cor} toneMapped={false} />
      </mesh>
      <mesh ref={cabeca} position={[0, 0.42, 0]}>
        <sphereGeometry args={[0.1, 16, 12]} />
        <meshStandardMaterial color="#c99b76" emissive="#3a2418" emissiveIntensity={0.5} roughness={0.6} />
      </mesh>
    </group>
  )
}

// onde cada um senta (espaço do layout da drive-v2): banco do passageiro e
// o fundo da Kombi
const LUGARES: [number, number, number][] = [
  [0.55, 0.42, -0.05], // passageiro da frente
  [-0.45, 0.42, 0.9], [0.45, 0.42, 0.9],
  [-0.45, 0.42, 1.45], [0.45, 0.42, 1.45], [0, 0.42, 1.2],
]

export function Cabine({ balanco, disco, objetos, carona, onTocaDiscos }: Props) {
  const pendulo = useRef<THREE.Group>(null)
  const ang = useRef({ a: 0, w: 0 })

  const pendurados = useMemo(() => objetos.map((o) => {
    const e = getEstacao(o)
    return { id: o, objeto: e.objeto, cor: e.cor }
  }), [objetos])

  // quem viaja junto: a carona primeiro (no banco da frente), depois quem
  // você já ajudou (menos o LU2CA, que tá na estação 6)
  const gente = useMemo(() => {
    const ids = [...(carona ? [carona] : []), ...objetos.filter((o) => o !== carona && o !== "nectar")]
    return ids.slice(0, LUGARES.length).map((o, i) => ({ id: o, cor: getEstacao(o).cor, pos: LUGARES[i] }))
  }, [objetos, carona])

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw)
    const p = ang.current
    p.w += (-p.a * 22 - p.w * 2.2 + balanco.current * 0.9) * dt
    p.a += p.w * dt
    if (pendulo.current) pendulo.current.rotation.z = Math.max(-0.9, Math.min(0.9, p.a))
  })

  const rv = KOMBI_LAYOUT.retrovisor.position
  return (
    <group scale={ESCALA} position={DESLOCA}>
      {/* banco de trás (quem vem atrás senta nele) */}
      <mesh position={[0, 0.34, 1.2]}>
        <boxGeometry args={[1.4, 0.16, 0.75]} />
        <meshStandardMaterial color="#5a2a3a" roughness={0.8} />
      </mesh>
      <KombiHippie isPlaying={disco} hideExterior semTeto onItemClick={(item) => { if (item === "toca") onTocaDiscos?.() }} />
      {gente.map((g) => <Pessoa key={g.id} cor={g.cor} pos={g.pos} vira={g.pos[2] > 0.5 ? 0 : 0} />)}
      <group ref={pendulo} position={[rv[0], rv[1] - 0.05, rv[2] + 0.02]}>
        {pendurados.map((o, i) => {
          const n = pendurados.length
          const x = (i - (n - 1) / 2) * 0.05
          const fio = 0.08 + (i % 2) * 0.04
          return (
            <group key={o.id} position={[x, 0, 0]}>
              <mesh position={[0, -fio / 2, 0]}>
                <boxGeometry args={[0.003, fio, 0.003]} />
                <meshBasicMaterial color="#ddd" />
              </mesh>
              <group position={[0, -fio - 0.025, 0]} scale={0.8}>
                <Pingente id={o.objeto} cor={o.cor} />
              </group>
            </group>
          )
        })}
      </group>
    </group>
  )
}
