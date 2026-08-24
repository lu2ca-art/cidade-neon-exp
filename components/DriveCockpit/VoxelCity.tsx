"use client"

// Voxel Cyberpunk City — usa o pack Monogon (13 prefabs GLB) distribuídos
// em grid procedural.
//
// Categorias e escala relativa:
// - Buildings (6): BuildingBlock_1/2/18/19/24 + Building_3 — normalizados a
//   tamanho médio, colocados no grid principal.
// - Advertising (3): Advertising_5/6/7 — placas neon suspensas em alturas
//   médias entre buildings.
// - Roads/Sidewalks (3): Road_Chunk_5, Sidewalk_Chunk_2, Sidewalk_Tile_1 —
//   ladrilhos decorativos no chão base da cidade.
// - Props (1): SateliteDish — em topos de alguns edifícios.

import { useGLTF } from "@react-three/drei"
import { RigidBody, CuboidCollider } from "@react-three/rapier"
import { useMemo } from "react"
import * as THREE from "three"
import { computeAllRoadPoints } from "./CyberpunkCity"

// Todos os 13 prefabs pré-listados por categoria
const BUILDING_URLS = [
  "/models/voxel-city/BuildingBlock_1.glb",
  "/models/voxel-city/BuildingBlock_2.glb",
  "/models/voxel-city/BuildingBlock_18.glb",
  "/models/voxel-city/BuildingBlock_19.glb",
  "/models/voxel-city/BuildingBlock_24.glb",
  "/models/voxel-city/Building_3.glb",
] as const

const ADVERTISING_URLS = [
  "/models/voxel-city/Advertising_5.glb",
  "/models/voxel-city/Advertising_6.glb",
  "/models/voxel-city/Advertising_7.glb",
] as const

const SIDEWALK_URLS = [
  "/models/voxel-city/Sidewalk_Chunk_2.glb",
  "/models/voxel-city/Sidewalk_Tile_1.glb",
  "/models/voxel-city/Road_Chunk_5.glb",
] as const

const PROP_URLS = ["/models/voxel-city/SateliteDish.glb"] as const

// PRNG determinístico
function makeRand(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

// Componente que renderiza uma instância de prefab normalizada ao tamanho
// alvo, com collider baseado no bounding box.
interface PrefabProps {
  url: string
  position: [number, number, number]
  rotationY?: number
  targetHeight?: number
  addCollider?: boolean
}

function Prefab({ url, position, rotationY = 0, targetHeight = 12, addCollider = true }: PrefabProps) {
  const { scene } = useGLTF(url)
  // Clone pra permitir múltiplas instâncias (useGLTF retorna referência única)
  const cloned = useMemo(() => scene.clone(true), [scene])
  const { scale, half, yOffset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned)
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const s = maxDim > 0 ? targetHeight / maxDim : 1
    return {
      scale: s,
      half: [size.x * s * 0.5, size.y * s * 0.5, size.z * s * 0.5] as [number, number, number],
      yOffset: -box.min.y * s, // apoia no chão (Y=0)
    }
  }, [cloned, targetHeight])

  const content = (
    <group position={[0, yOffset, 0]} scale={scale}>
      <primitive object={cloned} />
    </group>
  )

  if (!addCollider) {
    return (
      <group position={position} rotation={[0, rotationY, 0]}>
        {content}
      </group>
    )
  }

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, rotationY, 0]}>
      <CuboidCollider args={half} position={[0, half[1], 0]} />
      {content}
    </RigidBody>
  )
}

// ─── Componente principal ───────────────────────────────────────────────────
export interface VoxelCityProps {
  seed?: number
}

interface Placement {
  url: string
  pos: [number, number, number]
  rotY: number
  height: number
  collider: boolean
}

export function VoxelCity({ seed = 1 }: VoxelCityProps) {
  const roadPoints = useMemo(() => computeAllRoadPoints(), [])
  const placements = useMemo(() => {
    const rand = makeRand(seed)
    const list: Placement[] = []

    // Grid principal: 14x14 células de 22u.
    // Cada célula ganha 1 building — SE não estiver na spline das estradas.
    // Margin generoso (14u) pra buildings não bloquearem/ficarem tangenciando pista.
    const CELL = 22
    const RADIUS = 7
    const ROAD_MARGIN = 14
    const ROAD_MARGIN_SQ = ROAD_MARGIN * ROAD_MARGIN
    for (let gx = -RADIUS; gx <= RADIUS; gx++) {
      for (let gz = -RADIUS; gz <= RADIUS; gz++) {
        const bx = gx * CELL + (rand() - 0.5) * 4
        const bz = gz * CELL + (rand() - 0.5) * 4
        // Deixa área central livre pro spawn
        if (Math.abs(bx) < 12 && Math.abs(bz) < 12) continue
        // Fora do perímetro externo do circuito magenta
        const distToCenter = Math.sqrt(bx * bx + bz * bz)
        if (distToCenter > 150) continue
        // ── FILTRO ESSENCIAL: distância mínima às splines das estradas ──
        let onRoad = false
        for (const [rx, rz] of roadPoints) {
          const dx = bx - rx
          const dz = bz - rz
          if (dx * dx + dz * dz < ROAD_MARGIN_SQ) {
            onRoad = true
            break
          }
        }
        if (onRoad) continue
        // Escolhe building
        const idx = Math.floor(rand() * BUILDING_URLS.length)
        const url = BUILDING_URLS[idx]
        const height = 10 + rand() * 15
        const rotY = Math.floor(rand() * 4) * (Math.PI / 2)
        list.push({ url, pos: [bx, 0, bz], rotY, height, collider: true })

        // 15% de chance de spawnar Advertising acima do prédio
        if (rand() < 0.15) {
          const adIdx = Math.floor(rand() * ADVERTISING_URLS.length)
          list.push({
            url: ADVERTISING_URLS[adIdx],
            pos: [bx + (rand() - 0.5) * 2, height + 3, bz + (rand() - 0.5) * 2],
            rotY: rand() * Math.PI * 2,
            height: 4 + rand() * 3,
            collider: false, // ads não têm colisão
          })
        }

        // 10% de chance de SateliteDish no topo
        if (rand() < 0.1) {
          list.push({
            url: PROP_URLS[0],
            pos: [bx, height, bz],
            rotY: rand() * Math.PI * 2,
            height: 4,
            collider: false,
          })
        }
      }
    }

    // Sidewalks/road decorativos — 20 tiles espalhados (também filtrados
    // pra não caírem em cima da pista das estradas splines).
    let placedSidewalks = 0
    let attempts = 0
    while (placedSidewalks < 20 && attempts < 200) {
      attempts++
      const bx = (rand() - 0.5) * 240
      const bz = (rand() - 0.5) * 240
      let onRoad = false
      for (const [rx, rz] of roadPoints) {
        const dx = bx - rx
        const dz = bz - rz
        if (dx * dx + dz * dz < 40) { // 6.3u margin (mais folgada — só decoração)
          onRoad = true
          break
        }
      }
      if (onRoad) continue
      const idx = Math.floor(rand() * SIDEWALK_URLS.length)
      list.push({
        url: SIDEWALK_URLS[idx],
        pos: [bx, 0.02, bz],
        rotY: Math.floor(rand() * 4) * (Math.PI / 2),
        height: 3,
        collider: false,
      })
      placedSidewalks++
    }

    return list
  }, [seed, roadPoints])

  return (
    <group>
      {placements.map((p, i) => (
        <Prefab
          key={i}
          url={p.url}
          position={p.pos}
          rotationY={p.rotY}
          targetHeight={p.height}
          addCollider={p.collider}
        />
      ))}
    </group>
  )
}

// Preload de todos os prefabs pra evitar pop-in
BUILDING_URLS.forEach((u) => useGLTF.preload(u))
ADVERTISING_URLS.forEach((u) => useGLTF.preload(u))
SIDEWALK_URLS.forEach((u) => useGLTF.preload(u))
PROP_URLS.forEach((u) => useGLTF.preload(u))
