"use client"

// O PARQUE MODELADO NO BLENDER (blender/scripts/parque.py, public/models/parque.glb):
// o carrinho (2 lugares, barra de segurança, neon), o dormente, o módulo de
// treliça dos pilares (3 m, empilhado) e a sela, a roda-gigante (base, aro que
// gira e a cabine instanciada 16×) e a estação com o portão e a bilheteria.
// O trilho continua gerado pelo código (Parque.tsx). Dois materiais
// compartilhados (sólido com a AO na cor do vértice, luz sem iluminação),
// nenhuma luz nova; as geometrias saem do glb uma vez (a transformação do nó
// assada numa cópia) e nada é criado por quadro.

import { useGLTF } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"

export const URL_PARQUE = "/models/parque.glb"

let MATS: { solido: THREE.MeshStandardMaterial; luz: THREE.MeshBasicMaterial } | null = null
function matsParque() {
  if (!MATS) MATS = {
    solido: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.3 }),
    luz: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
  }
  return MATS
}

type Parte = { k: string; geo: THREE.BufferGeometry; mat: THREE.Material }
const CACHE = new Map<string, Parte[]>()
function useParte(no: string): Parte[] {
  const { nodes } = useGLTF(URL_PARQUE) as unknown as { nodes: Record<string, THREE.Object3D> }
  return useMemo(() => {
    const c = CACHE.get(no)
    if (c) return c
    const mats = matsParque()
    const out: Parte[] = []
    for (const g of ["solido", "luz"] as const) {
      const o = nodes[`${no}_${g}`] as THREE.Mesh | undefined
      if (!o?.geometry) continue
      o.updateWorldMatrix(true, false)
      const geo = o.geometry.clone().applyMatrix4(o.matrixWorld)
      geo.computeBoundingSphere()
      out.push({ k: `${no}_${g}`, geo, mat: mats[g] })
    }
    if (!out.length) throw new Error(`parque.glb sem ${no}`)
    CACHE.set(no, out)
    return out
  }, [nodes, no])
}

export function PecaParque({ no }: { no: string }) {
  const partes = useParte(no)
  return <>{partes.map((p) => <mesh key={p.k} geometry={p.geo} material={p.mat} />)}</>
}

// uma peça repetida: um InstancedMesh por grupo (sólido, luz), as matrizes uma vez
export function Instancias({ geo, mat, mats }: { geo: THREE.BufferGeometry; mat: THREE.Material; mats: THREE.Matrix4[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    const r = ref.current
    if (!r) return
    mats.forEach((m, i) => r.setMatrixAt(i, m))
    r.instanceMatrix.needsUpdate = true
    r.computeBoundingSphere()
  }, [mats])
  return <instancedMesh ref={ref} args={[geo, mat, mats.length]} />
}

export function PecaRepetida({ no, mats }: { no: string; mats: THREE.Matrix4[] }) {
  const partes = useParte(no)
  return <>{partes.map((p) => <Instancias key={p.k} geo={p.geo} mat={p.mat} mats={mats} />)}</>
}

// a roda-gigante: a base parada, o aro girando (a mesma velocidade de antes) e
// as 16 cabines penduradas em pé (a cor da janela alterna rosa e verde)
const CORES_CABINE = [new THREE.Color("#5dffa0"), new THREE.Color("#ff3fb0")]
export function RodaModelo({ R }: { R: number }) {
  const cab = useParte("cabine")
  const aro = useRef<THREE.Group>(null)
  const refs = useRef<(THREE.InstancedMesh | null)[]>([])
  const m = useMemo(() => new THREE.Matrix4(), [])
  useEffect(() => {
    for (const r of refs.current) {
      if (!r) continue
      if (r.material === matsParque().luz) for (let i = 0; i < 16; i++) r.setColorAt(i, CORES_CABINE[i % 2])
      if (r.instanceColor) r.instanceColor.needsUpdate = true
    }
  }, [cab])
  useFrame((_, dt) => {
    const g = aro.current
    if (!g) return
    g.rotation.z += dt * 0.08
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + g.rotation.z
      m.makeTranslation(R * Math.cos(a), R * Math.sin(a), 0) // uma conta por cabine, vale pra todas as malhas
      for (const r of refs.current) r?.setMatrixAt(i, m)
    }
    for (const r of refs.current) {
      if (!r) continue
      r.instanceMatrix.needsUpdate = true
      if (!r.boundingSphere) r.computeBoundingSphere()
    }
  })
  return (
    <group>
      <PecaParque no="roda" />
      <group position={[0, R + 2, 0]}>
        <group ref={aro}><PecaParque no="aro" /></group>
        {cab.map((p, k) => <instancedMesh key={p.k} ref={(r) => { refs.current[k] = r }} args={[p.geo, p.mat, 16]} />)}
      </group>
    </group>
  )
}

useGLTF.preload(URL_PARQUE)
