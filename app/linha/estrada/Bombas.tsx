"use client"

// As bombas de rua no mapa (postos.ts): o toldo aceso, a bomba e a vaga.
// (06/11) O posto vem do Blender (public/models/posto.glb, blender/scripts/posto.py,
// ~3,5 mil triângulos, a AO assada na cor do vértice): o toldo com o neon e os
// painéis, a bomba de combustível/recarga com a mangueira, a vaga pintada, a
// lixeira e o totem com o preço. Todos os postos montados viram UMA malha por
// material (2 desenhos no total), materiais compartilhados, nada por quadro.
// A luz é a mesma de antes (LuzPonto, do pool). Se o glb falhar, as caixas.

import { useEffect, useMemo } from "react"
import { useGLTF } from "@react-three/drei"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import type { Mundo } from "./mundo"
import { poseLugar } from "./Lugares"
import { BOMBAS, type Bomba } from "./postos"
import type { Lugar } from "../lugares"
import { LuzPonto } from "./luzes"
import { ModeloSeguro } from "./Seguro"

const COR = "#ffc857"
const URL_POSTO = "/models/posto.glb"
type Pose = ReturnType<typeof poseLugar>

function poseBomba(M: Mundo, b: Bomba) {
  return poseLugar(M, { area: b.area, u: b.u, lado: b.lado } as Lugar, `bomba:${b.id}`)
}

// as caixas de antes (a reserva enquanto o glb baixa ou se ele falhar)
function UmaBomba({ b, p }: { b: Bomba; p: Pose }) {
  return (
    <group position={[p.vaga.x, p.chao, p.vaga.z]} rotation-y={p.rumo}>
      <group position={[b.lado * 4.5, 0, 0]}>
        {/* o toldo em duas colunas, a faixa de luz e a bomba */}
        {[-3.5, 3.5].map((z) => <mesh key={z} position={[0, 2.6, z]}><boxGeometry args={[0.3, 5.2, 0.3]} /><meshStandardMaterial color="#2a2632" /></mesh>)}
        <mesh position={[0, 5.3, 0]}><boxGeometry args={[4, 0.4, 9]} /><meshStandardMaterial color="#1c1922" /></mesh>
        <mesh position={[0, 5.05, 0]}><boxGeometry args={[4.05, 0.12, 9.05]} /><meshStandardMaterial color={COR} emissive={COR} emissiveIntensity={1.1} /></mesh>
        <mesh position={[0, 0.9, 0]}><boxGeometry args={[0.8, 1.8, 0.6]} /><meshStandardMaterial color="#d23a3a" emissive="#d23a3a" emissiveIntensity={0.25} /></mesh>
        <mesh position={[b.lado * -0.41, 1.3, 0]}><boxGeometry args={[0.02, 0.5, 0.4]} /><meshBasicMaterial color={COR} /></mesh>
      </group>
    </group>
  )
}

// a luz de cada posto (a mesma nos dois casos: não muda o número de luzes)
function Luz({ b, p }: { b: Bomba; p: Pose }) {
  return (
    <group position={[p.vaga.x, p.chao, p.vaga.z]} rotation-y={p.rumo}>
      <LuzPonto position={[b.lado * 4.5, 4.6, 0]} color={COR} intensity={30} distance={14} decay={2} />
    </group>
  )
}

let MATS: { solido: THREE.Material; brilho: THREE.Material } | null = null
function mats() {
  return (MATS ??= {
    solido: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.15 }),
    brilho: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
  })
}

// copia a malha do glb (quantizada pelo meshopt) em Float32, já no mundo; sem cor = o neon (a cor do posto)
function emFloat(g: THREE.BufferGeometry, m: THREE.Matrix4, cor: THREE.Color | null) {
  const pos = g.attributes.position, nor = g.attributes.normal, col = g.attributes.color, n = pos.count
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    P[i * 3] = pos.getX(i); P[i * 3 + 1] = pos.getY(i); P[i * 3 + 2] = pos.getZ(i)
    if (nor) { N[i * 3] = nor.getX(i); N[i * 3 + 1] = nor.getY(i); N[i * 3 + 2] = nor.getZ(i) }
    if (col && !cor) { C[i * 3] = col.getX(i); C[i * 3 + 1] = col.getY(i); C[i * 3 + 2] = col.getZ(i) }
    else { C[i * 3] = cor?.r ?? 1; C[i * 3 + 1] = cor?.g ?? 1; C[i * 3 + 2] = cor?.b ?? 1 }
  }
  const o = new THREE.BufferGeometry()
  o.setAttribute("position", new THREE.BufferAttribute(P, 3))
  o.setAttribute("normal", new THREE.BufferAttribute(N, 3))
  o.setAttribute("color", new THREE.BufferAttribute(C, 3))
  o.setIndex(g.index ? Array.from(g.index.array as ArrayLike<number>) : Array.from({ length: n }, (_, i) => i))
  o.applyMatrix4(m)
  if (!nor) o.computeVertexNormals()
  return o
}

function PostosGlb({ lista }: { lista: { b: Bomba; p: Pose }[] }) {
  const { nodes } = useGLTF(URL_POSTO) as unknown as { nodes: Record<string, THREE.Object3D> }
  const d = useMemo(() => {
    const no = nodes.posto
    if (!no) throw new Error("posto.glb sem o nó posto")
    const solido: THREE.BufferGeometry[] = [], brilho: THREE.BufferGeometry[] = []
    const neon = new THREE.Color(COR)
    const inv = new THREE.Matrix4(), rel = new THREE.Matrix4(), q = new THREE.Matrix4()
    no.updateWorldMatrix(true, true)
    inv.copy(no.matrixWorld).invert()
    for (const { b, p } of lista) {
      // a vaga → o rumo da pista → 4,5 m pra fora → do outro lado, vira (a pista fica no -X do modelo)
      const base = new THREE.Matrix4().makeRotationY(p.rumo).setPosition(p.vaga.x, p.chao, p.vaga.z)
      base.multiply(q.makeTranslation(b.lado * 4.5, 0, 0))
      if (b.lado < 0) base.multiply(q.makeRotationY(Math.PI))
      no.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        const g = m.name.slice(m.name.lastIndexOf("_") + 1)
        rel.multiplyMatrices(inv, m.matrixWorld)
        const mm = base.clone().multiply(rel)
        if (g === "solido") solido.push(emFloat(m.geometry, mm, null))
        else brilho.push(emFloat(m.geometry, mm, g === "neon" ? neon : null))
      })
    }
    const juntar = (gs: THREE.BufferGeometry[]) => {
      if (!gs.length) return null
      const r = gs.length === 1 ? gs[0] : mergeGeometries(gs, false)
      if (gs.length > 1) for (const g of gs) g.dispose()
      if (!r) throw new Error("posto.glb: não deu pra juntar")
      return r
    }
    return { solido: juntar(solido), brilho: juntar(brilho) }
  }, [nodes, lista])
  useEffect(() => () => { d.solido?.dispose(); d.brilho?.dispose() }, [d])
  const M = mats()
  return (
    <group>
      {d.solido && <mesh geometry={d.solido} material={M.solido} name="postos" />}
      {d.brilho && <mesh geometry={d.brilho} material={M.brilho} />}
    </group>
  )
}

export function Bombas({ M }: { M: Mundo }) {
  const lista = useMemo(() => BOMBAS.map((b) => ({ b, p: poseBomba(M, b) })), [M])
  const reserva = <group>{lista.map(({ b, p }) => <UmaBomba key={b.id} b={b} p={p} />)}</group>
  return (
    <group>
      <ModeloSeguro nome="posto-glb" reserva={reserva}>
        <PostosGlb lista={lista} />
      </ModeloSeguro>
      {lista.map(({ b, p }) => <Luz key={b.id} b={b} p={p} />)}
    </group>
  )
}
