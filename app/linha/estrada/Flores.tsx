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
import { geoFlor } from "./floresGeo"

export { CANTEIROS, ESPECIES, canteiroPerto, canteiroPorId } from "./canteiros"

// uma flor de cada espécie: a geometria de verdade (floresGeo.ts), uma só por
// espécie, guardada; viva = as cores dela, murcha = acinzentada e caída
const GEOS = new Map<Especie, THREE.BufferGeometry>()
const geoDe = (e: Especie) => {
  let g = GEOS.get(e)
  if (!g) { const d = ESPECIES[e]; g = geoFlor(e, d.cor, d.miolo, d.altura); GEOS.set(e, g) }
  return g
}
const VIVA = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65, side: THREE.DoubleSide })
const MURCHA = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, color: "#a49ca8", side: THREE.DoubleSide })

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
          // cada flor um pouco diferente: virada, altura e tamanho
          const giro = ((i * 53) % 17) / 17 * Math.PI * 2, esc = 0.85 + ((i * 29) % 11) / 11 * 0.3
          return <group key={i} position={[x, 0.46, z]}><mesh geometry={geoDe(c.especie)} material={regado ? VIVA : MURCHA} rotation-y={giro} scale={esc} /></group>
        })}
      </group>
    </group>
  )
}

export function Flores({ M, regadas }: { M: Mundo; regadas: string[] }) {
  return <group>{CANTEIROS.map((c) => <UmCanteiro key={c.id} M={M} c={c} regado={regadas.includes(c.id)} />)}</group>
}
