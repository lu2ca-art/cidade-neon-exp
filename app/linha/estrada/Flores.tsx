"use client"

// AS FLORES DA ELLA (CN-17, a cidade de dia): ela plantou canteiros na beira
// das ruas. De dia, parando a Kombi do lado de um, dá pra regar (a prova do
// regar do fliperama, agora no mundo). Regado, o canteiro abre e fica aceso
// até o dia seguinte. A cor é a dela (ciano).

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import type { Mundo } from "./mundo"
import { MEIA, PASSO, pontoI } from "./pista"

const CIANO = "#2fe8ff"
const PETALAS = ["#2fe8ff", "#ff3fb0", "#ffc857", "#b38cff", "#5dffa0"]

export interface Canteiro { id: string; area: "linha" | "suburbio" | "crypto" | "live"; u: number; lado: 1 | -1 }

// longe das portas dos lugares (lugares.ts), no acostamento (a pista é
// elevada em vários trechos: do lado de fora da mureta ninguém vê)
export const CANTEIROS: Canteiro[] = [
  { id: "sub-1", area: "suburbio", u: 300, lado: 1 },
  { id: "sub-2", area: "suburbio", u: 900, lado: -1 },
  { id: "sub-3", area: "suburbio", u: 1700, lado: 1 },
  { id: "linha-1", area: "linha", u: 800, lado: -1 },
  { id: "linha-2", area: "linha", u: 2700, lado: 1 },
  { id: "crypto-1", area: "crypto", u: 520, lado: -1 },
]

// o canteiro conta de 70 m antes até 12 m depois (dá tempo de frear)
const ANTES = 70, DEPOIS = 12

// o canteiro logo à frente da Kombi (u em metros na via)
export function canteiroPerto(M: Mundo, via: number, u: number): Canteiro | null {
  const V = M.vias[via]
  for (const c of CANTEIROS) {
    if (M.circuito[c.area] !== via) continue
    let d = c.u - u
    if (V.fechada) d = ((d % V.L) + V.L * 1.5) % V.L - V.L / 2
    if (d > -DEPOIS && d < ANTES) return c
  }
  return null
}

function UmCanteiro({ M, c, regado }: { M: Mundo; c: Canteiro; regado: boolean }) {
  const { pos, rumo } = useMemo(() => {
    const C = M.vias[M.circuito[c.area]]
    const i = C.fechada ? ((Math.round(c.u / PASSO) % C.n) + C.n) % C.n : Math.max(0, Math.min(C.n - 1, Math.round(c.u / PASSO)))
    return { pos: pontoI(C, i, c.lado * (MEIA - 1.4), 0, new THREE.Vector3()), rumo: Math.atan2(C.tx[i], C.tz[i]) }
  }, [M, c])
  const flores = useRef<THREE.Group>(null)
  const abre = useRef(regado ? 1 : 0)
  useFrame((s, dt) => {
    abre.current += ((regado ? 1 : 0) - abre.current) * Math.min(1, dt * 1.5)
    const g = flores.current; if (!g) return
    const k = abre.current, t = s.clock.elapsedTime
    g.children.forEach((f, i) => {
      // murcha = caída pro lado; regada = em pé, balançando com o vento
      f.rotation.z = (1 - k) * 0.9 * (i % 2 ? 1 : -1) + Math.sin(t * 1.3 + i) * 0.06 * k
      f.scale.setScalar(0.65 + k * 0.45)
    })
  })
  const n = 7
  return (
    <group position={pos} rotation-y={rumo} scale={2}>
      {/* o canteiro: a caixa de madeira e a terra */}
      <mesh position={[0, 0.22, 0]}><boxGeometry args={[1.1, 0.44, 3.4]} /><meshStandardMaterial color="#3a2a22" roughness={0.9} /></mesh>
      <mesh position={[0, 0.45, 0]}><boxGeometry args={[0.95, 0.04, 3.25]} /><meshStandardMaterial color="#1e1612" roughness={1} /></mesh>
      <mesh position={[0, 0.47, 0]}><boxGeometry args={[1.12, 0.03, 3.42]} /><meshBasicMaterial color={CIANO} transparent opacity={regado ? 0.7 : 0.18} /></mesh>
      <group ref={flores}>
        {Array.from({ length: n }, (_, i) => {
          const z = -1.4 + (i / (n - 1)) * 2.8, x = (i % 2 ? 0.18 : -0.18)
          const cor = PETALAS[i % PETALAS.length]
          return (
            <group key={i} position={[x, 0.46, z]}>
              <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.03, 0.04, 1.2, 5]} /><meshStandardMaterial color="#2c6a3c" /></mesh>
              <mesh position={[0, 1.24, 0]}>
                <sphereGeometry args={[0.2, 8, 6]} />
                <meshStandardMaterial color={regado ? cor : "#5a5560"} emissive={cor} emissiveIntensity={regado ? 0.9 : 0.05} />
              </mesh>
            </group>
          )
        })}
      </group>
    </group>
  )
}

export function Flores({ M, regadas }: { M: Mundo; regadas: string[] }) {
  return <group>{CANTEIROS.map((c) => <UmCanteiro key={c.id} M={M} c={c} regado={regadas.includes(c.id)} />)}</group>
}
