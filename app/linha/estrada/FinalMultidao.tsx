"use client"

// a multidão de sempre (interior/comum.tsx) no mundo aberto, em cima da rua. Fica
// num arquivo à parte pra entrar por lazy: os corpos só baixam quando o final abre.
// PovoAndando: a plateia do deserto saindo a pé pros focos (09/11, FinalPovo.tsx), o
// mesmo corpo e a mesma cor da Multidao, uma malha só e 1/4 dela mexe por quadro.
import { useGLTF } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { GLB_LEVE, Multidao, type Pessoa } from "../interior/comum"
import { FINAL_VIVO } from "../disco/final"

export default function FinalMultidao({ gente, fatia = 1 }: { gente: Pessoa[]; fatia?: number }) {
  return <Multidao gente={gente} fatia={fatia} />
}

export type Andante = Pessoa & { ax: number; az: number; bx: number; bz: number; vel: number }

export function PovoAndando({ povo, chao }: { povo: Andante[]; chao: (x: number, z: number) => number }) {
  const { scene } = useGLTF(GLB_LEVE)
  const geo = useMemo(() => {
    let g: THREE.BufferGeometry | null = null
    scene.traverse((o) => { const m = o as THREE.Mesh; if (!g && m.isMesh) g = m.geometry })
    return g as unknown as THREE.BufferGeometry
  }, [scene])
  const malha = useRef<THREE.InstancedMesh>(null)
  const tmp = useMemo(() => new THREE.Object3D(), [])
  const vez = useRef(-1)
  useEffect(() => {
    const m = malha.current
    if (!m) return
    const c = new THREE.Color(), pele = new THREE.Color("#2a2636")
    povo.forEach((p, i) => m.setColorAt(i, c.set(p.cor).lerp(pele, 0.55)))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [povo])
  useFrame((s) => {
    const m = malha.current
    if (!m) return
    const v = vez.current < 0 ? -1 : vez.current
    vez.current = (vez.current < 0 ? 0 : vez.current + 1) % 4
    const t = performance.now() / 1000 - FINAL_VIVO.t0, rel = s.clock.elapsedTime
    for (let i = 0; i < povo.length; i++) {
      if (v >= 0 && i % 4 !== v) continue
      const p = povo[i], L = Math.hypot(p.bx - p.ax, p.bz - p.az) || 1
      const f = Math.min(1, (t * p.vel) / L)
      if (f >= 1) { tmp.position.set(0, -200, 0); tmp.scale.setScalar(0); tmp.updateMatrix(); m.setMatrixAt(i, tmp.matrix); continue }
      const x = p.ax + (p.bx - p.ax) * f, z = p.az + (p.bz - p.az) * f
      tmp.position.set(x, chao(x, z) + Math.abs(Math.sin(rel * 7 + i)) * 0.14, z)
      tmp.rotation.set(0, Math.atan2(p.bx - p.ax, p.bz - p.az), 0)
      tmp.scale.setScalar(1)
      tmp.updateMatrix()
      m.setMatrixAt(i, tmp.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={malha} args={[geo, undefined, povo.length]} frustumCulled={false}>
      <meshStandardMaterial color="#ffffff" roughness={0.8} emissive="#1a1424" emissiveIntensity={0.4} />
    </instancedMesh>
  )
}
