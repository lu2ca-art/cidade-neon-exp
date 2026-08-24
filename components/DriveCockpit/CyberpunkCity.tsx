"use client"

// Cidade cyberpunk com ESTRADAS EM SPLINES (curvas suaves ao estilo Horizon Drive).
// - Cada circuito é uma CatmullRomCurve3 fechada, discretizada em segmentos.
// - 3 circuitos coloridos (magenta oval externo, cyan oval interno,
//   amarelo figura-8 conectando os dois).
// - Guardrails neon acompanham a curva nos dois lados.
// - Prédios distribuídos nas áreas livres (fora dos circuitos).

import { RigidBody, CuboidCollider } from "@react-three/rapier"
import React, { useLayoutEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { useEditedCircuits } from "@/hooks/useEditedCircuits"

export const ROAD_Y = 2
export const ROAD_WIDTH = 16     // pista MUITO mais larga — arcade Horizon
export const ROAD_THICKNESS = 0.4
const RAIL_H = 0.9
const RAIL_VISUAL_H = 0.7
// 60 é suficiente com CatmullRom chordal — curvas visualmente suaves sem
// explodir em 3.600 RigidBody (bottleneck #1 identificado pelos agentes).
const SEGMENT_DIVISIONS = 60

const CIRCUITS = {
  magenta: { color: "#ff00ff", points: makeOval(80, 60) },
  cyan:    { color: "#00ffff", points: makeOval(45, 35) },
  yellow:  { color: "#ffcc00", points: makeFigure8(50, 25) },
} as const

// Gera pontos de uma elipse (rx, rz) com N pontos.
function makeOval(rx: number, rz: number, n = 12): THREE.Vector3[] {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    pts.push(new THREE.Vector3(Math.cos(a) * rx, ROAD_Y, Math.sin(a) * rz))
  }
  return pts
}

// Gera pontos de uma figura em 8 (∞) — dois loops conectados no centro.
function makeFigure8(size: number, thin: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = []
  const n = 20
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const x = Math.sin(a * 2) * size
    const z = Math.sin(a) * thin
    pts.push(new THREE.Vector3(x, ROAD_Y, z))
  }
  return pts
}

// ─── Segmento de estrada (visual + collider) ────────────────────────────────
interface SegmentProps {
  from: THREE.Vector3
  to: THREE.Vector3
  color: string
}

function RoadSegment({ from, to, color, y = ROAD_Y }: SegmentProps & { y?: number }) {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const length = Math.sqrt(dx * dx + dz * dz)
  const cx = (from.x + to.x) / 2
  const cz = (from.z + to.z) / 2
  const angle = Math.atan2(dx, dz)
  return (
    <group position={[cx, y, cz]} rotation={[0, angle, 0]}>
      {/* laje + collider (chão) */}
      <RigidBody type="fixed" colliders={false} friction={1.0}>
        <CuboidCollider args={[ROAD_WIDTH / 2, ROAD_THICKNESS / 2, length / 2]} />
        <mesh >
          <boxGeometry args={[ROAD_WIDTH, ROAD_THICKNESS, length]} />
          <meshStandardMaterial color="#1a0533" roughness={0.6} metalness={0.3} />
        </mesh>
      </RigidBody>
      {/* Guard rails DESLIZANTES — friction baixa + restitution alta pra
          Kombi escorregar contra a parede em vez de travar (feel Horizon). */}
      <RigidBody type="fixed" colliders={false} friction={0.02} restitution={0.4}>
        <CuboidCollider
          args={[0.1, RAIL_H / 2, length / 2]}
          position={[-ROAD_WIDTH / 2, RAIL_H / 2, 0]}
        />
      </RigidBody>
      <RigidBody type="fixed" colliders={false} friction={0.02} restitution={0.4}>
        <CuboidCollider
          args={[0.1, RAIL_H / 2, length / 2]}
          position={[ROAD_WIDTH / 2, RAIL_H / 2, 0]}
        />
      </RigidBody>
      {/* Faixa central neon */}
      <mesh position={[0, ROAD_THICKNESS / 2 + 0.005, 0]}>
        <boxGeometry args={[0.35, 0.03, length]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* Guard rails VISÍVEIS — alto (0.7u), neon vibrante nas duas laterais.
          Barra sólida no meio + topo brilhante + linha luminosa em baixo. */}
      {/* ESQUERDO */}
      <mesh position={[-ROAD_WIDTH / 2 + 0.08, ROAD_THICKNESS / 2 + RAIL_VISUAL_H / 2, 0]}>
        <boxGeometry args={[0.12, RAIL_VISUAL_H, length]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.9}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>
      {/* topo neon do rail esquerdo (mais brilhante) */}
      <mesh position={[-ROAD_WIDTH / 2 + 0.08, ROAD_THICKNESS / 2 + RAIL_VISUAL_H + 0.02, 0]}>
        <boxGeometry args={[0.16, 0.04, length]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* DIREITO */}
      <mesh position={[ROAD_WIDTH / 2 - 0.08, ROAD_THICKNESS / 2 + RAIL_VISUAL_H / 2, 0]}>
        <boxGeometry args={[0.12, RAIL_VISUAL_H, length]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.9}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>
      <mesh position={[ROAD_WIDTH / 2 - 0.08, ROAD_THICKNESS / 2 + RAIL_VISUAL_H + 0.02, 0]}>
        <boxGeometry args={[0.16, 0.04, length]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* brilho por baixo (efeito flutuante) */}
      <mesh position={[0, -ROAD_THICKNESS / 2 - 0.02, 0]}>
        <boxGeometry args={[ROAD_WIDTH + 0.6, 0.04, length + 0.6]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.35} />
      </mesh>
    </group>
  )
}

// ─── Placa de seta neon (chevron) — marca curvas fortes ─────────────────────
function CurveArrow({ position, angle }: { position: [number, number, number]; angle: number }) {
  return (
    <group position={position} rotation={[0, angle, 0]}>
      {/* haste em painel vertical baixo */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[0.06, 1.4, 0.06]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* placa: 3 chevrons empilhados */}
      {[0, 0.35, 0.7].map((offset, i) => (
        <group key={i} position={[offset, 1.6, 0]}>
          <mesh rotation={[0, 0, Math.PI / 6]}>
            <planeGeometry args={[0.6, 0.14]} />
            <meshBasicMaterial color="#ffcc00" toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ─── Circuito com InstancedMesh (perf otimizado) ────────────────────────────
// 5 InstancedMesh por circuito (laje, faixa central, rail-esq, rail-dir,
// underglow) em vez de N × 5 meshes separados. 24 draw calls totais em vez
// de 9.600. Colliders agrupados em 1 RigidBody por circuito.
function Circuit({ color, points }: { color: string; points: THREE.Vector3[] }) {
  const { segData, colliderData, arrows } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points, true, "chordal", 0.3)
    const disc = curve.getPoints(SEGMENT_DIVISIONS)
    // Pra cada segmento: matriz completa (position + rotation + scale)
    const segs: { matrix: THREE.Matrix4; length: number; cx: number; cy: number; cz: number; angle: number }[] = []
    const tmpPos = new THREE.Vector3()
    const tmpQuat = new THREE.Quaternion()
    const tmpEuler = new THREE.Euler()
    const tmpScale = new THREE.Vector3(1, 1, 1)
    for (let i = 0; i < disc.length - 1; i++) {
      const from = disc[i]
      const to = disc[i + 1]
      const dx = to.x - from.x
      const dz = to.z - from.z
      const length = Math.sqrt(dx * dx + dz * dz)
      const cx = (from.x + to.x) / 2
      const cy = (from.y + to.y) / 2
      const cz = (from.z + to.z) / 2
      const angle = Math.atan2(dx, dz)
      // Matrix4 base do segmento (rotação + posição, sem scale — cada mesh
      // instanciado escala em Z pelo próprio comprimento via matrix própria)
      tmpPos.set(cx, cy, cz)
      tmpEuler.set(0, angle, 0)
      tmpQuat.setFromEuler(tmpEuler)
      const matrix = new THREE.Matrix4().compose(tmpPos, tmpQuat, tmpScale)
      segs.push({ matrix, length, cx, cy, cz, angle })
    }

    // Colliders em batch (um RigidBody por circuito, N colliders filhos)
    const cols = segs.map((s) => ({
      pos: [s.cx, s.cy, s.cz] as [number, number, number],
      rot: [0, s.angle, 0] as [number, number, number],
      length: s.length,
    }))

    // Setas em curvas fortes (mantém como estava)
    const arr: { pos: [number, number, number]; angle: number }[] = []
    for (let i = 2; i < disc.length - 2; i += 6) {
      const prev = disc[i - 2]
      const cur = disc[i]
      const next = disc[i + 2]
      const v1x = cur.x - prev.x, v1z = cur.z - prev.z
      const v2x = next.x - cur.x, v2z = next.z - cur.z
      const l1 = Math.sqrt(v1x * v1x + v1z * v1z) || 1
      const l2 = Math.sqrt(v2x * v2x + v2z * v2z) || 1
      const cos = (v1x * v2x + v1z * v2z) / (l1 * l2)
      const ang = Math.acos(Math.max(-1, Math.min(1, cos)))
      if (ang > 0.18) {
        const tangX = v2x / l2, tangZ = v2z / l2
        const perpX = -tangZ, perpZ = tangX
        const cross = v1x * v2z - v1z * v2x
        const side = cross > 0 ? -1 : 1
        const offset = (ROAD_WIDTH / 2 + 0.8) * side
        arr.push({
          pos: [cur.x + perpX * offset, 0, cur.z + perpZ * offset],
          angle: Math.atan2(tangX, tangZ),
        })
      }
    }

    return { segData: segs, colliderData: cols, arrows: arr }
  }, [points])

  // Refs pros InstancedMesh: precisamos atualizar matriz de cada instância
  const lajeRef = useRef<THREE.InstancedMesh>(null!)
  const faixaRef = useRef<THREE.InstancedMesh>(null!)
  const railLRef = useRef<THREE.InstancedMesh>(null!)
  const railRRef = useRef<THREE.InstancedMesh>(null!)
  const glowRef = useRef<THREE.InstancedMesh>(null!)

  // Aplica matrizes por instância (posição/rotação/scale-Z do segmento).
  // useLayoutEffect roda no commit — depois que refs são atribuídos.
  // (useMemo aqui rodava antes do ref ser populado → matrizes identity)
  useLayoutEffect(() => {
    const tmp = new THREE.Matrix4()
    const tmpPos = new THREE.Vector3()
    const tmpQuat = new THREE.Quaternion()
    const tmpScale = new THREE.Vector3()
    const tmpEuler = new THREE.Euler()
    for (let i = 0; i < segData.length; i++) {
      const s = segData[i]
      tmpEuler.set(0, s.angle, 0)
      tmpQuat.setFromEuler(tmpEuler)

      // Laje: scale Z=length, Y=1 (ROAD_THICKNESS), X=1 (ROAD_WIDTH), pos = centro
      tmpPos.set(s.cx, s.cy, s.cz)
      tmpScale.set(1, 1, s.length)
      tmp.compose(tmpPos, tmpQuat, tmpScale)
      lajeRef.current?.setMatrixAt(i, tmp)

      // Faixa central: mesmo centro + Y ligeiramente acima da laje
      tmpPos.set(s.cx, s.cy + ROAD_THICKNESS / 2 + 0.005, s.cz)
      tmp.compose(tmpPos, tmpQuat, tmpScale)
      faixaRef.current?.setMatrixAt(i, tmp)

      // Rails esquerdo/direito — offset local ±ROAD_WIDTH/2 - 0.08 no eixo X local
      // Aplicando rotação Y = angle, offset local (X_local, 0, 0) vira world (X_local*cos, 0, -X_local*sin)... esperado com Matrix4 compose com escala.
      // Como já compomos com angle=quat, precisamos aplicar offset após:
      // solução mais simples: pré-calcular offset world = rotateY(offsetLocal)
      const cos = Math.cos(s.angle)
      const sin = Math.sin(s.angle)
      const offX = ROAD_WIDTH / 2 - 0.08
      // ESQUERDO
      tmpPos.set(s.cx + cos * -offX, s.cy + ROAD_THICKNESS / 2 + RAIL_VISUAL_H / 2, s.cz - sin * -offX)
      tmp.compose(tmpPos, tmpQuat, tmpScale)
      railLRef.current?.setMatrixAt(i, tmp)
      // DIREITO
      tmpPos.set(s.cx + cos * offX, s.cy + ROAD_THICKNESS / 2 + RAIL_VISUAL_H / 2, s.cz - sin * offX)
      tmp.compose(tmpPos, tmpQuat, tmpScale)
      railRRef.current?.setMatrixAt(i, tmp)

      // Underglow (brilho embaixo)
      tmpPos.set(s.cx, s.cy - ROAD_THICKNESS / 2 - 0.02, s.cz)
      tmp.compose(tmpPos, tmpQuat, tmpScale)
      glowRef.current?.setMatrixAt(i, tmp)
    }
    ;[lajeRef, faixaRef, railLRef, railRRef, glowRef].forEach((r) => {
      if (r.current) {
        r.current.instanceMatrix.needsUpdate = true
        r.current.computeBoundingSphere()
      }
    })
  }, [segData])

  const N = segData.length
  if (N === 0) return null

  return (
    <>
      {/* 5 InstancedMesh por circuito (24 draw calls totais pra cidade toda
          em vez de 9.600). Cada instância representa 1 segmento; sua matriz
          contém posição/rotação/scale-Z próprios. */}
      <instancedMesh ref={lajeRef} args={[undefined, undefined, N]}>
        <boxGeometry args={[ROAD_WIDTH, ROAD_THICKNESS, 1]} />
        <meshStandardMaterial color="#1a0533" roughness={0.6} metalness={0.3} />
      </instancedMesh>
      <instancedMesh ref={faixaRef} args={[undefined, undefined, N]}>
        <boxGeometry args={[0.35, 0.03, 1]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={railLRef} args={[undefined, undefined, N]}>
        <boxGeometry args={[0.12, RAIL_VISUAL_H, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.9}
          roughness={0.3}
          metalness={0.6}
        />
      </instancedMesh>
      <instancedMesh ref={railRRef} args={[undefined, undefined, N]}>
        <boxGeometry args={[0.12, RAIL_VISUAL_H, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.9}
          roughness={0.3}
          metalness={0.6}
        />
      </instancedMesh>
      <instancedMesh ref={glowRef} args={[undefined, undefined, N]}>
        <boxGeometry args={[ROAD_WIDTH + 0.6, 0.04, 1]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.35} />
      </instancedMesh>

      {/* Colliders — um RigidBody por circuito, com N CuboidCollider filhos.
          Laje (chão) + 2 rails por segmento — mas todos no MESMO RigidBody. */}
      <RigidBody type="fixed" colliders={false} friction={1.0}>
        {colliderData.map((c, i) => (
          <CuboidCollider
            key={i}
            args={[ROAD_WIDTH / 2, ROAD_THICKNESS / 2, c.length / 2]}
            position={c.pos}
            rotation={c.rot}
          />
        ))}
      </RigidBody>
      <RigidBody type="fixed" colliders={false} friction={0.02} restitution={0.4}>
        {colliderData.map((c, i) => {
          const cos = Math.cos(c.rot[1])
          const sin = Math.sin(c.rot[1])
          const offX = ROAD_WIDTH / 2
          return (
            <React.Fragment key={i}>
              <CuboidCollider
                args={[0.1, RAIL_H / 2, c.length / 2]}
                position={[c.pos[0] + cos * -offX, c.pos[1] + RAIL_H / 2, c.pos[2] - sin * -offX]}
                rotation={c.rot}
              />
              <CuboidCollider
                args={[0.1, RAIL_H / 2, c.length / 2]}
                position={[c.pos[0] + cos * offX, c.pos[1] + RAIL_H / 2, c.pos[2] - sin * offX]}
                rotation={c.rot}
              />
            </React.Fragment>
          )
        })}
      </RigidBody>

      {arrows.map((a, i) => (
        <CurveArrow key={`arrow-${i}`} position={a.pos} angle={a.angle} />
      ))}
    </>
  )
}

// ─── PRNG ───────────────────────────────────────────────────────────────────
function makeRand(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

interface Building {
  x: number
  z: number
  w: number
  d: number
  h: number
  color: string
  neonColor: string
  neonSide: 0 | 1 | 2 | 3
}

const NEON = ["#ff00ff", "#00ffff", "#ff2d78", "#cc00ff", "#ff6b35", "#ffcc00", "#00ff88"]
const BUILDING_BASE = ["#0a0a1a", "#12122a", "#1a1a2e", "#151530"]

// Testa se um ponto (x, z) está a menos de `margin` unidades de qualquer
// segmento discretizado de qualquer circuito — usado pra impedir prédios
// sobre as estradas. Exportada pra outros componentes (VoxelCity) usarem.
export function computeAllRoadPoints(): [number, number][] {
  const out: [number, number][] = []
  for (const c of Object.values(CIRCUITS)) {
    const curve = new THREE.CatmullRomCurve3(c.points as THREE.Vector3[], true, "chordal", 0.3)
    const disc = curve.getPoints(SEGMENT_DIVISIONS)
    for (const p of disc) out.push([p.x, p.z])
  }
  return out
}

// Interface interna do circuito renderizável (após normalização do editor)
interface RenderCircuit {
  id: string
  color: string
  points: THREE.Vector3[]
}

// ─── Componente principal ───────────────────────────────────────────────────
export interface CyberpunkCityProps {
  seed?: number
}

export function CyberpunkCity({ seed = 42 }: CyberpunkCityProps) {
  // Lê circuitos do /pistas-editor via localStorage. Se não houver, usa
  // os DEFAULTS (magenta/cyan/yellow hardcoded).
  const edited = useEditedCircuits()
  const renderCircuits: RenderCircuit[] = useMemo(() => {
    if (edited) {
      return edited.map((c) => ({
        id: c.id,
        color: c.color,
        points: c.points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
      }))
    }
    return Object.values(CIRCUITS).map((c) => ({
      id: c.color, // fallback id
      color: c.color,
      points: c.points as THREE.Vector3[],
    }))
  }, [edited])

  // Recalcula pontos de estrada com base nos circuitos ATUAIS (editados)
  const roadPoints = useMemo(() => {
    const out: [number, number][] = []
    for (const c of renderCircuits) {
      if (c.points.length < 2) continue
      const curve = new THREE.CatmullRomCurve3(c.points, true, "chordal", 0.3)
      const disc = curve.getPoints(SEGMENT_DIVISIONS)
      for (const p of disc) out.push([p.x, p.z])
    }
    return out
  }, [renderCircuits])
  const buildings = useMemo(() => {
    const rand = makeRand(seed)
    const list: Building[] = []
    // Margem GENEROSA pra pistas CERCAREM os prédios (não passar em cima).
    // Estradas ficam livres, prédios ficam nos vazios entre elas.
    const MARGIN = ROAD_WIDTH / 2 + 12
    const MARGIN_SQ = MARGIN * MARGIN
    for (let gx = -16; gx <= 16; gx++) {
      for (let gz = -16; gz <= 16; gz++) {
        const bx = gx * 16 + (rand() - 0.5) * 5
        const bz = gz * 16 + (rand() - 0.5) * 5
        // rejeita se próximo demais de qualquer trecho de estrada
        let tooClose = false
        for (const [rx, rz] of roadPoints) {
          const dx = bx - rx
          const dz = bz - rz
          if (dx * dx + dz * dz < MARGIN_SQ) {
            tooClose = true
            break
          }
        }
        if (tooClose) continue
        const w = 3 + rand() * 5
        const d = 3 + rand() * 5
        const h = 8 + rand() * 42
        const color = BUILDING_BASE[Math.floor(rand() * BUILDING_BASE.length)]
        const neonColor = NEON[Math.floor(rand() * NEON.length)]
        const neonSide = Math.floor(rand() * 4) as 0 | 1 | 2 | 3
        list.push({ x: bx, z: bz, w, d, h, color, neonColor, neonSide })
      }
    }
    return list
  }, [seed, roadPoints])

  return (
    <group>
      {/* Chão base */}
      <RigidBody type="fixed" colliders={false} friction={0.9}>
        <CuboidCollider args={[500, 0.1, 500]} position={[0, -0.1, 0]} />
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} >
          <planeGeometry args={[1000, 1000]} />
          <meshStandardMaterial color="#050510" roughness={0.9} metalness={0.1} />
        </mesh>
      </RigidBody>

      {/* Circuitos em splines — usa dados do editor (localStorage) ou defaults */}
      {renderCircuits.map((c) => (
        <Circuit key={c.id} color={c.color} points={c.points} />
      ))}

      {/* Prédios — colliders em chunks + InstancedMesh */}
      <BuildingChunks buildings={buildings} />
    </group>
  )
}

// Renderiza todos os prédios como 3 InstancedMesh globais (box, sign, rooftop)
// e agrupa colliders em ~16 RigidBody (chunks 4×4 na grid -16..16).
function BuildingChunks({ buildings }: { buildings: Building[] }) {
  const boxRef = useRef<THREE.InstancedMesh>(null)
  const signRef = useRef<THREE.InstancedMesh>(null)
  const roofRef = useRef<THREE.InstancedMesh>(null)

  const chunks = useMemo(() => {
    // 4×4 chunks cobrindo grid -16..16 (chunk size = 8 células = ~128 unidades)
    const map = new Map<string, Building[]>()
    for (const b of buildings) {
      const cx = Math.floor(b.x / 128)
      const cz = Math.floor(b.z / 128)
      const key = `${cx},${cz}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(b)
    }
    return Array.from(map.values())
  }, [buildings])

  useLayoutEffect(() => {
    if (!boxRef.current || !signRef.current || !roofRef.current) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const p = new THREE.Vector3()
    const s = new THREE.Vector3()
    const c = new THREE.Color()
    const SIGN_ROT_Y = [0, Math.PI / 2, Math.PI, -Math.PI / 2]

    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i]
      // Box
      p.set(b.x, b.h / 2, b.z)
      q.identity()
      s.set(b.w, b.h, b.d)
      m.compose(p, q, s)
      boxRef.current.setMatrixAt(i, m)
      c.set(b.color)
      boxRef.current.setColorAt(i, c)

      // Sign (posição relativa ao prédio + rotação por lado)
      const eps = 0.02
      const rotY = SIGN_ROT_Y[b.neonSide]
      const half = [b.d / 2 + eps, b.w / 2 + eps, b.d / 2 + eps, b.w / 2 + eps][b.neonSide]
      const cos = Math.cos(rotY)
      const sin = Math.sin(rotY)
      p.set(b.x + sin * half, b.h / 2 + 0.05, b.z + cos * half)
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY)
      s.set(b.w * 0.55, b.h * 0.35, 1)
      m.compose(p, q, s)
      signRef.current.setMatrixAt(i, m)
      c.set(b.neonColor)
      signRef.current.setColorAt(i, c)

      // Rooftop neon
      p.set(b.x, b.h + 0.05, b.z)
      q.identity()
      s.set(b.w + 0.1, 0.06, b.d + 0.1)
      m.compose(p, q, s)
      roofRef.current.setMatrixAt(i, m)
      roofRef.current.setColorAt(i, c)
    }
    boxRef.current.instanceMatrix.needsUpdate = true
    signRef.current.instanceMatrix.needsUpdate = true
    roofRef.current.instanceMatrix.needsUpdate = true
    if (boxRef.current.instanceColor) boxRef.current.instanceColor.needsUpdate = true
    if (signRef.current.instanceColor) signRef.current.instanceColor.needsUpdate = true
    if (roofRef.current.instanceColor) roofRef.current.instanceColor.needsUpdate = true
  }, [buildings])

  return (
    <>
      <instancedMesh ref={boxRef} args={[undefined, undefined, buildings.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.7} metalness={0.3} />
      </instancedMesh>
      <instancedMesh ref={signRef} args={[undefined, undefined, buildings.length]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={roofRef} args={[undefined, undefined, buildings.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={0.55} />
      </instancedMesh>

      {chunks.map((chunk, ci) => (
        <RigidBody key={ci} type="fixed" colliders={false} friction={0.4}>
          {chunk.map((b, i) => (
            <CuboidCollider
              key={i}
              args={[b.w / 2, b.h / 2, b.d / 2]}
              position={[b.x, b.h / 2, b.z]}
            />
          ))}
        </RigidBody>
      ))}
    </>
  )
}

// ─── Helpers exportados pra spawn ───────────────────────────────────────────
/** Retorna um ponto seguro na estrada magenta pra spawnar o carro. */
export function magentaSpawn(): [number, number, number] {
  // Ponto (rx, 0) do oval magenta = ponto mais à direita do circuito
  return [80, ROAD_Y + 1.5, 0]
}
