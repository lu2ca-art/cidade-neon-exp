"use client"

// AS FLORES DA ELLA (CN-17, a cidade de dia): ela plantou canteiros pela
// cidade inteira, cada um de uma espécie (a referência do LU2CA é o Garden
// Life: as espécies parecendo de verdade). De dia, chegando perto, dá pra
// regar (a prova do regar, agora no mundo). Regado, o canteiro se ergue e
// abre até o dia seguinte. Regar todos os canteiros da cidade é uma conquista.

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import type { Mundo } from "./mundo"
import { MEIA, PASSO, pontoI } from "./pista"

const CIANO = "#2fe8ff"
import { CANTEIROS, ESPECIES, type Canteiro, type Especie } from "./canteiros"

export { CANTEIROS, ESPECIES, canteiroPerto, canteiroPorId } from "./canteiros"

// uma flor de cada espécie (primitivas leves); murcha = cinza e caída
function Flor({ e, regado }: { e: Especie; regado: boolean }) {
  const d = ESPECIES[e]
  const cor = regado ? d.cor : "#6a6470", miolo = regado ? d.miolo : "#4a4650"
  const brilho = regado ? 0.35 : 0
  const m = (c: string, b = brilho) => <meshStandardMaterial color={c} emissive={c} emissiveIntensity={b} roughness={0.7} />
  const h = d.altura
  return (
    <>
      <mesh position={[0, h / 2, 0]}><cylinderGeometry args={[0.02, 0.03, h, 5]} /><meshStandardMaterial color="#2c6a3c" /></mesh>
      <mesh position={[0.07, h * 0.4, 0]} rotation-z={-0.8}><boxGeometry args={[0.14, 0.02, 0.07]} /><meshStandardMaterial color="#357a45" /></mesh>
      <group position={[0, h, 0]}>
        {e === "girassol" && <group rotation-x={-1.2}>
          <mesh>{<cylinderGeometry args={[0.3, 0.3, 0.03, 16]} />}{m(cor)}</mesh>
          <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.14, 0.14, 0.05, 12]} />{m(miolo, 0)}</mesh>
        </group>}
        {e === "rosa" && <><mesh><sphereGeometry args={[0.11, 8, 6]} />{m(cor)}</mesh><mesh position={[0, 0.05, 0]} scale={[1, 0.6, 1]}><sphereGeometry args={[0.08, 8, 6]} />{m(miolo)}</mesh></>}
        {e === "lavanda" && <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.035, 0.05, 0.3, 6]} />{m(cor)}</mesh>}
        {e === "hortensia" && <mesh scale={[1, 0.8, 1]}><dodecahedronGeometry args={[0.24, 0]} />{m(cor)}</mesh>}
        {e === "margarida" && <group rotation-x={-1.1}>
          <mesh><cylinderGeometry args={[0.16, 0.16, 0.02, 12]} />{m(cor)}</mesh>
          <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.06, 0.06, 0.03, 10]} />{m(miolo)}</mesh>
        </group>}
        {e === "tulipa" && <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.1, 0.06, 0.16, 8, 1, true]} />{m(cor)}</mesh>}
        {e === "orquidea" && <group position={[0.12, -0.05, 0]} rotation-z={-0.5}>
          <mesh scale={[1.3, 0.5, 1]}><sphereGeometry args={[0.1, 8, 6]} />{m(cor)}</mesh>
          <mesh position={[0, 0.03, 0.04]}><sphereGeometry args={[0.04, 6, 5]} />{m(miolo)}</mesh>
        </group>}
      </group>
    </>
  )
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
  const d = ESPECIES[c.especie]
  const n = d.n
  return (
    <group position={pos} rotation-y={rumo} scale={2}>
      {/* o canteiro: a caixa de madeira e a terra */}
      <mesh position={[0, 0.22, 0]}><boxGeometry args={[1.1, 0.44, 3.4]} /><meshStandardMaterial color="#3a2a22" roughness={0.9} /></mesh>
      <mesh position={[0, 0.45, 0]}><boxGeometry args={[0.95, 0.04, 3.25]} /><meshStandardMaterial color="#1e1612" roughness={1} /></mesh>
      <mesh position={[0, 0.47, 0]}><boxGeometry args={[1.12, 0.03, 3.42]} /><meshBasicMaterial color={CIANO} transparent opacity={regado ? 0.7 : 0.18} /></mesh>
      <group ref={flores}>
        {Array.from({ length: n }, (_, i) => {
          const z = -1.4 + (i / Math.max(1, n - 1)) * 2.8, x = (i % 2 ? 0.2 : -0.2) + ((i * 37) % 7 - 3) * 0.02
          return <group key={i} position={[x, 0.46, z]}><Flor e={c.especie} regado={regado} /></group>
        })}
      </group>
    </group>
  )
}

export function Flores({ M, regadas }: { M: Mundo; regadas: string[] }) {
  return <group>{CANTEIROS.map((c) => <UmCanteiro key={c.id} M={M} c={c} regado={regadas.includes(c.id)} />)}</group>
}
