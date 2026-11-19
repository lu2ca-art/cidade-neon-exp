"use client"

// O desenho das flores do asfalto (floresDaRua.ts): o brotinho com um
// brilho leve onde ainda falta água, a água caindo e a flor crescendo quando
// você rega, e as que já foram regadas abertas pra sempre. Só aparecem pra
// quem está de patins.

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import type { Mundo } from "./mundo"
import { pontoI } from "./pista"
import { ESPECIES } from "./canteiros"
import { geoFlor } from "./floresGeo"
import type { FlorAsfalto } from "./floresDaRua"
import type { Especie } from "./canteiros"

const GEOS = new Map<Especie, THREE.BufferGeometry>()
const geo = (e: Especie) => { let g = GEOS.get(e); if (!g) { const d = ESPECIES[e]; g = geoFlor(e, d.cor, d.miolo, d.altura); GEOS.set(e, g) } return g }
const VIVA = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide, emissive: "#ffffff", emissiveIntensity: 0.08 })

// a flor na rachadura, na beira do asfalto
function onde(M: Mundo, f: FlorAsfalto) {
  const C = M.vias[f.via], i = Math.max(0, Math.min(C.n - 1, Math.floor(f.u / 2)))
  const borda = (f.lado > 0 ? C.dir[i] : -C.esq[i]) - 0.6
  return { pos: pontoI(C, i, f.lado * borda, 0, new THREE.Vector3()), rumo: Math.atan2(C.tx[i], C.tz[i]) }
}

function Aberta({ M, f, escala = 1.5 }: { M: Mundo; f: FlorAsfalto; escala?: number }) {
  const p = useMemo(() => onde(M, f), [M, f])
  return (
    <group position={p.pos} rotation-y={p.rumo}>
      {[-0.35, 0, 0.35].map((dz, k) => <mesh key={k} geometry={geo(f.especie)} material={VIVA} position={[(k - 1) * 0.25, 0, dz]} rotation-y={k * 2.1} scale={escala * (0.85 + k * 0.12)} />)}
    </group>
  )
}

// a que ainda espera água: o brotinho e o anel de brilho; regando, a água cai e ela cresce
function Broto({ M, f, regandoDesde }: { M: Mundo; f: FlorAsfalto; regandoDesde: number | null }) {
  const p = useMemo(() => onde(M, f), [M, f])
  const flor = useRef<THREE.Group>(null), anel = useRef<THREE.Mesh>(null), gotas = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const k = regandoDesde === null ? 0 : Math.min(1, (performance.now() - regandoDesde) / 1600)
    const ease = 1 - Math.pow(1 - k, 3)
    if (flor.current) flor.current.scale.setScalar(0.45 + ease * 1.05)
    if (anel.current) { const s = 1 + Math.sin(t * 3) * 0.15; anel.current.scale.set(s, s, 1); (anel.current.material as THREE.MeshBasicMaterial).opacity = (1 - k) * (0.35 + Math.sin(t * 3) * 0.15) }
    if (gotas.current) {
      gotas.current.visible = regandoDesde !== null && k < 1
      const gs = gotas.current.children
      for (let n = 0; n < gs.length; n++) { const y = 2.6 - (((t * 3 + n * 0.37) % 1) * 2.4); gs[n].position.set(Math.sin(n * 2.3) * 0.5, y, Math.cos(n * 1.7) * 0.5) }
    }
  })
  return (
    <group position={p.pos} rotation-y={p.rumo}>
      <group ref={flor}>
        {[-0.35, 0, 0.35].map((dz, k) => <mesh key={k} geometry={geo(f.especie)} material={VIVA} position={[(k - 1) * 0.25, 0, dz]} rotation-y={k * 2.1} />)}
      </group>
      <mesh ref={anel} rotation-x={-Math.PI / 2} position={[0, 0.06, 0]}><ringGeometry args={[0.9, 1.35, 28]} /><meshBasicMaterial color="#5dffa0" transparent opacity={0.5} depthWrite={false} toneMapped={false} /></mesh>
      <group ref={gotas} visible={false}>
        {Array.from({ length: 14 }, (_, n) => <mesh key={n}><sphereGeometry args={[0.05, 6, 4]} /><meshBasicMaterial color="#9fe8ff" /></mesh>)}
      </group>
    </group>
  )
}

export function FloresAsfalto({ M, leva, regadas, regando, visivel }: { M: Mundo; leva: FlorAsfalto[]; regadas: FlorAsfalto[]; regando: { id: string; desde: number } | null; visivel: boolean }) {
  const feitas = useMemo(() => new Set(regadas.map((f) => f.id)), [regadas])
  return (
    <group visible={visivel}>
      {regadas.map((f) => (regando?.id === f.id ? null : <Aberta key={f.id} M={M} f={f} />))}
      {leva.filter((f) => !feitas.has(f.id) || regando?.id === f.id).map((f) => <Broto key={f.id} M={M} f={f} regandoDesde={regando?.id === f.id ? regando.desde : null} />)}
    </group>
  )
}
