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
// 120 divisões por pista — curvas MUITO suaves. InstancedMesh compensa.
const SEGMENT_DIVISIONS = 120
// Overlap entre lajes consecutivas (10%) — mata gaps visuais E colliders
// desalinhados que criavam "trancos" no carro nas junções das lajes.
const LAJE_OVERLAP = 1.10

// Circuitos inspirados em pistas reais (aproximações simbólicas, não
// medidas geograficamente exatas — LU2CA pode refinar via /pistas-editor).
// Magenta = Monaco (irregular, curvas apertadas, forma quadrada).
// Ciano   = Suzuka (única figura-8 real no calendário F1 — cruzamento
//           natural que vira viaduto graças aos Y diferentes).
// Amarela = Interlagos (oval alongado com S do Senna e Junção).
// Pistas ESPALHADAS pela cidade inteira (grid -256..+256). Escalas grandes
// pra cobrir toda a área com espaçamento decente entre elas. Alturas por
// terço da altura dos prédios (5, 22, 38) — cada pista em um patamar.
// Rampas conectam as pistas em pontos específicos onde ficam próximas.
const MAGENTA_Y = 6
const CYAN_Y = 22
const YELLOW_Y = 38
const CIRCUITS = {
  magenta: { color: "#ff00ff", points: makeMonaco(200, MAGENTA_Y) },
  cyan:    { color: "#00ffff", points: makeSuzuka(180, CYAN_Y) },
  yellow:  { color: "#ffcc00", points: makeInterlagos(210, YELLOW_Y) },
  // Rampas — circuitos ABERTOS (spline não fechada) que conectam patamares
  // em pontos específicos. Sobem/descem em Y de forma progressiva.
  rampaMC: { color: "#ff8800", points: makeRampaLinear(200, 6, MAGENTA_Y, CYAN_Y, "north"), closed: false },
  rampaCY: { color: "#88ff00", points: makeRampaLinear(210, 6, CYAN_Y, YELLOW_Y, "south"), closed: false },
} as const

// Monaco (simplificado). Retangular apertado, largada reta na "Boulevard
// Albert 1er", curva Ste-Devote (norte-leste), subida Beau Rivage/Massenet,
// Casino Square, descida Mirabeau + Loews Hairpin (ferradura), Portier,
// Túnel, Nouvelle Chicane, Tabac, Piscine, La Rascasse, Anthony Noghes.
// MONACO — traçado real (sentido horário, referência: aerial map do
// Circuit de Monaco). Norte = -Z, Sul = +Z. Reta principal Boulevard
// Albert I no sul; Casino Square no norte; Loews Hairpin ferradura
// no leste; Piscine/Tabac no oeste.
function makeMonaco(scale: number, y: number): THREE.Vector3[] {
  const pts: [number, number][] = [
    // Reta principal (Boulevard Albert I) — sul, indo pra oeste
    [ 0.9,  0.85], // grid de largada
    [ 0.5,  0.9],
    [ 0.1,  0.92],
    [-0.25, 0.9],
    // Sainte Dévote (curva 1 — direita cerrada)
    [-0.55, 0.82],
    [-0.7,  0.7],
    // Beau Rivage — subida norte
    [-0.75, 0.5],
    [-0.75, 0.25],
    [-0.7,  0.0],
    // Massenet / Casino Square (norte, curva esquerda→direita)
    [-0.6, -0.2],
    [-0.35,-0.35],
    [-0.05,-0.4],  // Casino Square (topo)
    // Descida pro Mirabeau
    [ 0.2, -0.32],
    [ 0.4, -0.15],
    // Mirabeau Haute (direita)
    [ 0.55, 0.0],
    [ 0.6,  0.15],
    // Loews / Grand Hôtel Hairpin — a curva mais famosa (ferradura 180° leste)
    [ 0.72, 0.25],
    [ 0.78, 0.3],
    [ 0.72, 0.38],
    [ 0.55, 0.4],
    // Mirabeau Bas / Portier (direita descendo)
    [ 0.4,  0.35],
    [ 0.25, 0.3],
    // Túnel (curva longa passando por baixo do hotel)
    [ 0.1,  0.35],
    [-0.05, 0.45],
    [-0.15, 0.55],
    // Saída túnel / Nouvelle Chicane (chicane rápido esquerda-direita)
    [-0.15, 0.65],
    [-0.05, 0.7],
    [ 0.05, 0.6],  // apex chicane 2
    // Tabac (esquerda rápida)
    [ 0.15, 0.55],
    [ 0.3,  0.45],
    // Piscine — chicane duplo Louis Chiron
    [ 0.45, 0.5],
    [ 0.55, 0.6],
    [ 0.5,  0.72],
    [ 0.4,  0.78],
    // La Rascasse (direita cerrada)
    [ 0.55, 0.85],
    [ 0.7,  0.88],
    // Anthony Noghès (última curva, direita — volta pra reta)
    [ 0.85, 0.88],
    [ 0.95, 0.85],
  ]
  return pts.map(([x, z]) => new THREE.Vector3(x * scale, y, z * scale))
}

// SUZUKA — traçado real (única figura-8 do calendário F1). Sentido horário
// (japonês). Reta principal ao sul; S curves subindo pra NE; Dunlop
// pro oeste; Degner 1+2 (esquerda-direita); hairpin; Spoon (ferradura);
// 130R; Casio Triangle; volta cruzando sobre a reta principal.
function makeSuzuka(scale: number, y: number): THREE.Vector3[] {
  const pts: [number, number][] = [
    // Reta principal (grid, sentido oeste→leste na parte sul)
    [-0.8,  0.85],
    [-0.5,  0.85],
    [-0.15, 0.85],
    // Curva 1 (direita) + Curva 2 (esquerda, primeira parte do S)
    [ 0.15, 0.75],
    [ 0.25, 0.55],
    // S curves 3-4-5-6-7 (Esses do Suzuka — série de esquerda-direita)
    [ 0.15, 0.35],
    [ 0.0,  0.2],
    [-0.15, 0.05],
    [-0.05,-0.1],
    [ 0.15,-0.15],
    // Dunlop curve (curva 7, esquerda longa)
    [ 0.25,-0.3],
    [ 0.2, -0.5],
    // Degner 1 (curva 8 — direita cerrada)
    [ 0.05,-0.6],
    // Degner 2 (curva 9 — direita cerrada, o cruzamento acima virá aqui)
    [-0.15,-0.6],
    // Passagem sob a ponte (o cruzamento em 8 nasce aqui)
    [-0.35,-0.5],
    // Hairpin (curva 11 — esquerda 180°, extremo oeste)
    [-0.55,-0.35],
    [-0.75,-0.35],
    [-0.85,-0.25],
    [-0.85,-0.1],
    [-0.75, 0.05],
    // Curva 200R e Spoon (curva 13-14 — ferradura esquerda longa, oeste)
    [-0.55, 0.15],
    [-0.35, 0.15],
    [-0.15, 0.05],
    [-0.1, -0.1],
    [-0.25,-0.25],
    // 130R (curva 15 — esquerda rápida, muito famosa)
    [-0.2, -0.4],
    [ 0.05,-0.4],
    [ 0.3, -0.35],
    // Casio Triangle (chicane final, curva 16-17)
    [ 0.55,-0.25],
    [ 0.7, -0.1],
    [ 0.75, 0.1],
    // Curva 18 pro pit straight
    [ 0.7,  0.35],
    [ 0.55, 0.55],
    [ 0.3,  0.7],
    [ 0.0,  0.8],
    [-0.4,  0.85],
    [-0.7,  0.85],
  ]
  return pts.map(([x, z]) => new THREE.Vector3(x * scale, y, z * scale))
}

// INTERLAGOS (Autódromo José Carlos Pace) — traçado real anti-horário.
// Reta dos boxes (largada) no leste, sobe pro S do Senna (curvas 1-2),
// Curva do Sol (3), reta oposta longa até o Bico de Pato / Descida do Lago
// (4-5), Ferradura (6-7 esquerda longa), Laranjinha (8), Pinheirinho (9),
// Bico de Pato (10-11), Mergulho (12), Junção (13), subida dos boxes.
function makeInterlagos(scale: number, y: number): THREE.Vector3[] {
  const pts: [number, number][] = [
    // Reta dos boxes (largada) — leste, sentido norte
    [ 0.95, 0.55],
    [ 0.95, 0.3],
    [ 0.9,  0.1],
    // S do Senna (curva 1 esquerda cerrada + curva 2 direita)
    [ 0.75, 0.0],
    [ 0.55,-0.05],
    [ 0.35, 0.0],
    // Curva do Sol (esquerda longa)
    [ 0.15, 0.1],
    [ 0.0,  0.2],
    [-0.15, 0.25],
    // Reta oposta (esquerda→norte, quase reta com leve curva)
    [-0.35, 0.15],
    [-0.5,  0.05],
    [-0.6, -0.1],
    // Descida do Lago (esquerda longa)
    [-0.65,-0.3],
    [-0.6, -0.5],
    // Ferradura (esquerda 180°, oeste extremo)
    [-0.5, -0.65],
    [-0.35,-0.7],
    [-0.15,-0.7],
    // Laranjinha (direita)
    [ 0.0, -0.65],
    // Pinheirinho (esquerda)
    [ 0.15,-0.55],
    // Bico de Pato (chicane esquerda-direita)
    [ 0.25,-0.4],
    [ 0.15,-0.3],
    [ 0.05,-0.15],
    // Mergulho (direita descendo)
    [ 0.1,  0.0],
    [ 0.25, 0.1],
    // Junção (esquerda 180° na parte SE)
    [ 0.4,  0.2],
    [ 0.55, 0.35],
    // Subida dos Boxes (longa reta em subida à esquerda voltando pra grid)
    [ 0.65, 0.5],
    [ 0.75, 0.6],
    [ 0.85, 0.6],
    [ 0.95, 0.6],
  ]
  return pts.map(([x, z]) => new THREE.Vector3(x * scale, y, z * scale))
}

// Rampa reta com curva suave — sobe de yFrom até yTo em N pontos, posicionada
// numa borda cardinal ("north"=+Z, "south"=-Z) da cidade em distância `dist`.
// Comprimento total ~ 60u no eixo cardinal. Suave (curva de Bezier no meio).
function makeRampaLinear(
  dist: number,
  n: number,
  yFrom: number,
  yTo: number,
  side: "north" | "south" | "east" | "west",
): THREE.Vector3[] {
  const pts: THREE.Vector3[] = []
  const rampLength = 60
  // Direção do eixo principal e offset perpendicular pra ficar "adjacente"
  // sem cruzar as pistas circulares
  const cardinal: Record<typeof side, [number, number]> = {
    north: [0, dist],
    south: [0, -dist],
    east: [dist, 0],
    west: [-dist, 0],
  }
  const [cx, cz] = cardinal[side]
  // Distribui pontos ao longo do eixo perpendicular ao cardinal
  const axis: [number, number] = side === "north" || side === "south" ? [1, 0] : [0, 1]
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    // Curva de altura EASE-IN-OUT (mais orgânico que linear)
    const yEase = 0.5 - 0.5 * Math.cos(t * Math.PI)
    const y = yFrom + (yTo - yFrom) * yEase
    const off = (t - 0.5) * rampLength
    pts.push(new THREE.Vector3(cx + axis[0] * off, y, cz + axis[1] * off))
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
      <RigidBody type="fixed" colliders={false} friction={0.005} restitution={0.7}>
        <CuboidCollider
          args={[0.1, RAIL_H / 2, length / 2]}
          position={[-ROAD_WIDTH / 2, RAIL_H / 2, 0]}
        />
      </RigidBody>
      <RigidBody type="fixed" colliders={false} friction={0.005} restitution={0.7}>
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
function Circuit({ color, points, closed = true }: { color: string; points: THREE.Vector3[]; closed?: boolean }) {
  const { segData, colliderData, arrows } = useMemo(() => {
    // tension 0.5 (era 0.3) — curvas MAIS SUAVES, orgânicas, sem quinas
    const curve = new THREE.CatmullRomCurve3(points, closed, "chordal", 0.5)
    const disc = curve.getPoints(SEGMENT_DIVISIONS)
    // Pra cada segmento: matriz completa (position + rotation + scale).
    // Cada laje INCLINA (pitch) seguindo a rampa entre os dois pontos —
    // sem isso, apareciam degraus onde Y variava entre segmentos.
    const segs: { matrix: THREE.Matrix4; length: number; cx: number; cy: number; cz: number; angle: number; pitch: number }[] = []
    const tmpPos = new THREE.Vector3()
    const tmpQuat = new THREE.Quaternion()
    const tmpEuler = new THREE.Euler()
    const tmpScale = new THREE.Vector3(1, 1, 1)
    for (let i = 0; i < disc.length - 1; i++) {
      const from = disc[i]
      const to = disc[i + 1]
      const dx = to.x - from.x
      const dy = to.y - from.y
      const dz = to.z - from.z
      const horizLen = Math.sqrt(dx * dx + dz * dz)
      // Comprimento 3D real (inclui componente vertical)
      const length = Math.sqrt(horizLen * horizLen + dy * dy)
      const cx = (from.x + to.x) / 2
      const cy = (from.y + to.y) / 2
      const cz = (from.z + to.z) / 2
      const angle = Math.atan2(dx, dz)
      // Pitch: inclina a laje pra cima/baixo seguindo a rampa. Sinal negativo
      // pra que dy>0 (segmento sobe) resulte em pitch negativo (frente sobe).
      const pitch = -Math.atan2(dy, horizLen)
      tmpPos.set(cx, cy, cz)
      tmpEuler.set(pitch, angle, 0, "YXZ")
      tmpQuat.setFromEuler(tmpEuler)
      const matrix = new THREE.Matrix4().compose(tmpPos, tmpQuat, tmpScale)
      segs.push({ matrix, length, cx, cy, cz, angle, pitch })
    }

    // Colliders em batch (um RigidBody por circuito, N colliders filhos)
    const cols = segs.map((s) => ({
      pos: [s.cx, s.cy, s.cz] as [number, number, number],
      rot: [s.pitch, s.angle, 0] as [number, number, number],
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
  }, [points, closed])

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
    const upLocal = new THREE.Vector3(0, 1, 0)
    const downLocal = new THREE.Vector3(0, -1, 0)
    const worldUp = new THREE.Vector3()
    const worldDown = new THREE.Vector3()
    for (let i = 0; i < segData.length; i++) {
      const s = segData[i]
      // Rotação AGORA inclui pitch — laje inclina seguindo a rampa entre
      // pontos consecutivos, sem degraus.
      tmpEuler.set(s.pitch, s.angle, 0, "YXZ")
      tmpQuat.setFromEuler(tmpEuler)
      // Vetor "up" e "down" DA LAJE em coordenadas world (pra offsetar
      // faixa central, underglow e rails perpendiculares corretamente
      // à laje inclinada, não ao mundo).
      worldUp.copy(upLocal).applyQuaternion(tmpQuat)
      worldDown.copy(downLocal).applyQuaternion(tmpQuat)

      // Laje: scale Z=length3D * overlap (comprimento real da rampa).
      tmpPos.set(s.cx, s.cy, s.cz)
      tmpScale.set(1, 1, s.length * LAJE_OVERLAP)
      tmp.compose(tmpPos, tmpQuat, tmpScale)
      lajeRef.current?.setMatrixAt(i, tmp)

      // Faixa central — offset no eixo UP LOCAL da laje (não no Y mundo)
      const faixaOff = ROAD_THICKNESS / 2 + 0.005
      tmpPos.set(
        s.cx + worldUp.x * faixaOff,
        s.cy + worldUp.y * faixaOff,
        s.cz + worldUp.z * faixaOff,
      )
      tmp.compose(tmpPos, tmpQuat, tmpScale)
      faixaRef.current?.setMatrixAt(i, tmp)

      // Rails — offset LATERAL no eixo X local + UP local pra ficarem
      // sempre perpendiculares à laje, mesmo inclinada. Pra achar o eixo
      // X world local, uso um vetor auxiliar.
      const rightLocal = new THREE.Vector3(1, 0, 0).applyQuaternion(tmpQuat)
      const offX = ROAD_WIDTH / 2 - 0.08
      const railUpOff = ROAD_THICKNESS / 2 + RAIL_VISUAL_H / 2
      // ESQUERDO
      tmpPos.set(
        s.cx - rightLocal.x * offX + worldUp.x * railUpOff,
        s.cy - rightLocal.y * offX + worldUp.y * railUpOff,
        s.cz - rightLocal.z * offX + worldUp.z * railUpOff,
      )
      tmp.compose(tmpPos, tmpQuat, tmpScale)
      railLRef.current?.setMatrixAt(i, tmp)
      // DIREITO
      tmpPos.set(
        s.cx + rightLocal.x * offX + worldUp.x * railUpOff,
        s.cy + rightLocal.y * offX + worldUp.y * railUpOff,
        s.cz + rightLocal.z * offX + worldUp.z * railUpOff,
      )
      tmp.compose(tmpPos, tmpQuat, tmpScale)
      railRRef.current?.setMatrixAt(i, tmp)

      // Underglow — DOWN local da laje
      const glowOff = ROAD_THICKNESS / 2 + 0.02
      tmpPos.set(
        s.cx + worldDown.x * glowOff,
        s.cy + worldDown.y * glowOff,
        s.cz + worldDown.z * glowOff,
      )
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
          friction 0.4 na laje (era 1.0) — carro DESLIZA fluido, arcade-style.
          Sem isso a Kombi "grudava" ao curvar. */}
      <RigidBody type="fixed" colliders={false} friction={0.4}>
        {colliderData.map((c, i) => (
          <CuboidCollider
            key={i}
            args={[ROAD_WIDTH / 2, ROAD_THICKNESS / 2, c.length / 2]}
            position={c.pos}
            rotation={c.rot}
          />
        ))}
      </RigidBody>
      <RigidBody type="fixed" colliders={false} friction={0.005} restitution={0.7}>
        {colliderData.map((c, i) => {
          // Rails alinhados com a laje INCLINADA — usa quaternion pra pegar
          // eixos LOCAIS right/up (pitch inclui rampa). Sem isso, em rampas
          // íngremes os rails ficavam soltos no ar/enterrados.
          const q = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(c.rot[0], c.rot[1], c.rot[2], "YXZ")
          )
          const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q)
          const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q)
          const offX = ROAD_WIDTH / 2
          const upOff = RAIL_H / 2
          return (
            <React.Fragment key={i}>
              <CuboidCollider
                args={[0.1, RAIL_H / 2, c.length / 2]}
                position={[
                  c.pos[0] - right.x * offX + up.x * upOff,
                  c.pos[1] - right.y * offX + up.y * upOff,
                  c.pos[2] - right.z * offX + up.z * upOff,
                ]}
                rotation={c.rot}
              />
              <CuboidCollider
                args={[0.1, RAIL_H / 2, c.length / 2]}
                position={[
                  c.pos[0] + right.x * offX + up.x * upOff,
                  c.pos[1] + right.y * offX + up.y * upOff,
                  c.pos[2] + right.z * offX + up.z * upOff,
                ]}
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

// (NEON e BUILDING_BASE antigos removidos — cores agora vêm dos BAIRROS abaixo)

// BAIRROS — a cidade dividida em 4 quadrantes cardinais + centro, cada um
// com paleta neon dominante. Assim ao dirigir você percebe claramente onde
// está: "distrito rosa" (NE), "distrito ciano" (NW), "distrito amarelo" (SW),
// "distrito verde" (SE), "centro violeta".
interface Bairro {
  id: string
  base: string[]         // cor da fachada dos prédios
  neon: string[]         // paleta de neon (letreiro + rooftop)
}
const BAIRROS: Record<string, Bairro> = {
  NE: { id: "NE", base: ["#1a0020", "#2a0033", "#22001a"], neon: ["#ff2d78", "#ff00ff", "#ff5fae"] },   // rosa/magenta
  NW: { id: "NW", base: ["#001a2a", "#002033", "#00121e"], neon: ["#00ffff", "#00c8ff", "#66eaff"] },   // ciano/azul-elétrico
  SW: { id: "SW", base: ["#2a1a00", "#332000", "#1a1000"], neon: ["#ffcc00", "#ff9500", "#ffee55"] },   // amarelo/laranja
  SE: { id: "SE", base: ["#002a1a", "#003321", "#001a12"], neon: ["#00ff88", "#22ff22", "#88ff00"] },   // verde/lima
  CENTRO: { id: "CENTRO", base: ["#150015", "#25002a", "#0f001f"], neon: ["#cc00ff", "#a855f7", "#ff00cc"] }, // violeta
}
// Retorna o bairro baseado em (x, z). Centro se |x|+|z| < 90.
function bairroDe(x: number, z: number): Bairro {
  if (Math.abs(x) + Math.abs(z) < 90) return BAIRROS.CENTRO
  if (x >= 0 && z <= 0) return BAIRROS.NE
  if (x < 0 && z <= 0) return BAIRROS.NW
  if (x < 0 && z > 0) return BAIRROS.SW
  return BAIRROS.SE
}

// Testa se um ponto (x, z) está a menos de `margin` unidades de qualquer
// segmento discretizado de qualquer circuito — usado pra impedir prédios
// sobre as estradas. Exportada pra outros componentes (VoxelCity) usarem.
export function computeAllRoadPoints(): [number, number][] {
  const out: [number, number][] = []
  for (const c of Object.values(CIRCUITS)) {
    const closed = "closed" in c ? c.closed : true
    const curve = new THREE.CatmullRomCurve3(c.points as THREE.Vector3[], closed, "chordal", 0.3)
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
  closed?: boolean
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
    // Rampas SEMPRE vêm dos defaults hardcoded (o editor só cobre as 3 pistas
    // circulares principais). Sem isso, editar magenta/cyan/yellow no
    // /pistas-editor apagaria as rampas de conexão entre patamares.
    const rampas: RenderCircuit[] = Object.entries(CIRCUITS)
      .filter(([, c]) => "closed" in c && c.closed === false)
      .map(([id, c]) => ({
        id: `ramp-${id}`,
        color: c.color,
        points: c.points as THREE.Vector3[],
        closed: false,
      }))

    if (edited) {
      const editedRender = edited.map((c) => ({
        id: c.id,
        color: c.color,
        points: c.points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
      }))
      return [...editedRender, ...rampas]
    }
    const defaults = Object.entries(CIRCUITS)
      .filter(([, c]) => !("closed" in c) || c.closed !== false)
      .map(([id, c]) => ({
        id,
        color: c.color,
        points: c.points as THREE.Vector3[],
        closed: true,
      }))
    return [...defaults, ...rampas]
  }, [edited])

  // Recalcula pontos de estrada com base nos circuitos ATUAIS (editados)
  const roadPoints = useMemo(() => {
    const out: [number, number][] = []
    for (const c of renderCircuits) {
      if (c.points.length < 2) continue
      const curve = new THREE.CatmullRomCurve3(c.points, c.closed !== false, "chordal", 0.3)
      const disc = curve.getPoints(SEGMENT_DIVISIONS)
      for (const p of disc) out.push([p.x, p.z])
    }
    return out
  }, [renderCircuits])
  const buildings = useMemo(() => {
    const rand = makeRand(seed)
    const list: Building[] = []
    const MARGIN = ROAD_WIDTH / 2 + 20
    const MARGIN_SQ = MARGIN * MARGIN
    // Grid EXPANDIDO pra cobrir cidade até os limites das pistas gigantes.
    // RANGE 14 * CELL 26 = 364u de raio; deserto começa em 360.
    const CELL = 26
    const RANGE = 14
    for (let gx = -RANGE; gx <= RANGE; gx++) {
      for (let gz = -RANGE; gz <= RANGE; gz++) {
        const bx = gx * CELL + (rand() - 0.5) * 8
        const bz = gz * CELL + (rand() - 0.5) * 8
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
        // Cor pela paleta do bairro — dominante em ~75% dos prédios; ~25%
        // pega cor de OUTRO bairro (variação, evita monotonia sem quebrar
        // a leitura do distrito).
        const localBairro = bairroDe(bx, bz)
        const useForeign = rand() < 0.25
        const bairro = useForeign
          ? Object.values(BAIRROS)[Math.floor(rand() * 5)]
          : localBairro
        const color = bairro.base[Math.floor(rand() * bairro.base.length)]
        const neonColor = bairro.neon[Math.floor(rand() * bairro.neon.length)]
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
        <Circuit key={c.id} color={c.color} points={c.points} closed={c.closed} />
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
