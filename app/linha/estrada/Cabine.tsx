"use client"

// A Kombi por dentro (visão de primeira pessoa). Coordenadas no espaço da
// Kombi: frente pra -Z, motorista do lado esquerdo (Kombi brasileira).
// O painel tem o toca-discos (o disco gira quando tá tocando vinil) e no
// retrovisor ficam pendurados os objetos que você ganhou nas missões,
// balançando com a curva e com a freada.

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import { estacao as getEstacao, type EstacaoId, type ObjetoId } from "../data"

// a cabeça do motorista: um pouco pro meio (no celular em pé o quadro é
// estreito — assim cabem o volante, o toca-discos e os pingentes)
export const OLHO = new THREE.Vector3(-0.2, 1.66, -1.28)

type Props = {
  esterco: React.MutableRefObject<number> // -1..1
  balanco: React.MutableRefObject<number> // aceleração lateral (pro pêndulo)
  disco: React.MutableRefObject<boolean> // tocando vinil
  objetos: EstacaoId[]
}

const MADEIRA = "#5a3a22"
const PAINEL = "#262a52"

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

export function Cabine({ esterco, balanco, disco, objetos }: Props) {
  const volante = useRef<THREE.Group>(null)
  const prato = useRef<THREE.Mesh>(null)
  const braco = useRef<THREE.Group>(null)
  const pendulo = useRef<THREE.Group>(null)
  const ang = useRef({ a: 0, w: 0 })

  const pendurados = useMemo(() => objetos.map((o) => {
    const e = getEstacao(o)
    return { id: o, objeto: e.objeto, cor: e.cor }
  }), [objetos])

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw)
    // o volante gira até ~1 volta e meia de cada lado
    if (volante.current) volante.current.rotation.z = -esterco.current * 2.4
    // o disco gira a 33⅓ rpm quando tem vinil tocando; a agulha desce
    if (prato.current && disco.current) prato.current.rotation.y -= dt * 3.49
    if (braco.current) braco.current.rotation.y += ((disco.current ? -0.42 : 0) - braco.current.rotation.y) * Math.min(1, dt * 4)
    // pêndulo amortecido: a curva empurra pro lado
    const p = ang.current
    p.w += (-p.a * 22 - p.w * 2.2 + balanco.current * 0.9) * dt
    p.a += p.w * dt
    if (pendulo.current) pendulo.current.rotation.z = Math.max(-0.9, Math.min(0.9, p.a))
  })

  return (
    <group>
      {/* painel de ponta a ponta, com o friso de luz */}
      <mesh position={[0, 1.13, -2.02]}>
        <boxGeometry args={[1.84, 0.3, 0.42]} />
        <meshStandardMaterial color={PAINEL} emissive="#1a1d40" emissiveIntensity={0.5} roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.285, -1.83]}>
        <boxGeometry args={[1.84, 0.012, 0.012]} />
        <meshBasicMaterial color="#2fe8ff" toneMapped={false} />
      </mesh>
      {/* quadro de instrumentos atrás do volante */}
      <mesh position={[-0.3, 1.32, -1.98]} rotation-x={-0.35}>
        <boxGeometry args={[0.42, 0.16, 0.06]} />
        <meshStandardMaterial color="#0b0c1c" />
      </mesh>
      <mesh position={[-0.3, 1.33, -1.948]} rotation-x={-0.35}>
        <circleGeometry args={[0.055, 24]} />
        <meshBasicMaterial color="#ffc857" toneMapped={false} transparent opacity={0.7} />
      </mesh>

      {/* moldura do para-brisa bipartido */}
      {[-0.93, 0, 0.93].map((x) => (
        <mesh key={x} position={[x, 1.62, -2.13]} rotation-x={-0.2}>
          <boxGeometry args={[x === 0 ? 0.03 : 0.09, 0.78, 0.04]} />
          <meshStandardMaterial color={x === 0 ? "#6f6a60" : "#b9b2a2"} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 2.02, -2.05]}>
        <boxGeometry args={[1.95, 0.1, 0.12]} />
        <meshStandardMaterial color="#d9d2c2" roughness={0.6} />
      </mesh>
      {/* teto e laterais (o escuro em volta que faz parecer de dentro) */}
      <mesh position={[0, 2.08, -1.2]}>
        <boxGeometry args={[1.95, 0.05, 1.8]} />
        <meshStandardMaterial color="#1a1b2c" side={THREE.DoubleSide} />
      </mesh>
      {[-1, 1].map((l) => (
        <mesh key={l} position={[l * 0.97, 0.95, -1.4]}>
          <boxGeometry args={[0.05, 0.6, 1.4]} />
          <meshStandardMaterial color="#1a3fa0" roughness={0.7} />
        </mesh>
      ))}

      {/* volante: coluna + aro + raios */}
      <group position={[-0.3, 1.18, -1.8]} rotation-x={-1.05}>
        <mesh position={[0, 0, -0.12]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.02, 0.025, 0.24, 8]} />
          <meshStandardMaterial color="#0d0e1a" />
        </mesh>
        <group ref={volante}>
          <mesh>
            <torusGeometry args={[0.16, 0.018, 10, 36]} />
            <meshStandardMaterial color="#efe7d6" roughness={0.5} />
          </mesh>
          {[0, 2.09, 4.19].map((r) => (
            <mesh key={r} rotation-z={r} position={[Math.sin(r) * 0.08, Math.cos(r) * 0.08, 0]}>
              <boxGeometry args={[0.018, 0.16, 0.012]} />
              <meshStandardMaterial color="#efe7d6" />
            </mesh>
          ))}
          <mesh>
            <cylinderGeometry args={[0.04, 0.04, 0.03, 16]} />
            <meshStandardMaterial color="#1a3fa0" />
          </mesh>
        </group>
      </group>

      {/* o toca-discos no meio do painel */}
      <group position={[0.16, 1.3, -1.9]} rotation-x={0.25}>
        <mesh>
          <boxGeometry args={[0.38, 0.05, 0.3]} />
          <meshStandardMaterial color={MADEIRA} roughness={0.7} />
        </mesh>
        <mesh ref={prato} position={[-0.04, 0.035, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.012, 32]} />
          <meshStandardMaterial color="#0c0c10" roughness={0.3} metalness={0.2} />
        </mesh>
        <mesh position={[-0.04, 0.043, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.004, 24]} />
          <meshBasicMaterial color="#ff3fb0" toneMapped={false} />
        </mesh>
        <group ref={braco} position={[0.13, 0.05, -0.1]}>
          <mesh position={[-0.05, 0, 0.06]} rotation-y={0.7}>
            <boxGeometry args={[0.012, 0.012, 0.16]} />
            <meshStandardMaterial color="#c9ccd6" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      </group>

      {/* retrovisor com os objetos pendurados */}
      <mesh position={[0, 1.97, -2.04]}>
        <boxGeometry args={[0.18, 0.05, 0.02]} />
        <meshStandardMaterial color="#20223a" metalness={0.6} roughness={0.25} />
      </mesh>
      <group ref={pendulo} position={[0, 1.94, -2.02]}>
        {pendurados.map((o, i) => {
          const n = pendurados.length
          const x = (i - (n - 1) / 2) * 0.055
          const fio = 0.1 + (i % 2) * 0.05
          return (
            <group key={o.id} position={[x, 0, 0]}>
              <mesh position={[0, -fio / 2, 0]}>
                <boxGeometry args={[0.003, fio, 0.003]} />
                <meshBasicMaterial color="#ddd" />
              </mesh>
              <group position={[0, -fio - 0.03, 0]}>
                <Pingente id={o.objeto} cor={o.cor} />
              </group>
            </group>
          )
        })}
      </group>
      <pointLight position={[0, 1.7, -1.6]} color="#b8c4ff" intensity={0.6} distance={2.5} decay={2} />
    </group>
  )
}
