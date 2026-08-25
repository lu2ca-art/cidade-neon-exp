"use client"

import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { OrbitControls, Grid, Text } from "@react-three/drei"
import { Suspense, useState, useEffect, useCallback, useRef } from "react"
import * as THREE from "three"

// Editor da Kombi Hippie — interior + exterior. LU2CA edita cada peça
// (position/rotation/size/color) e exporta o JSON pra colar em
// lib/kombi-layout.ts. O jogo depois carrega esse layout no /drive-v2.

type CubeObject = {
  id: string
  name: string
  position: [number, number, number]
  rotation: [number, number, number]
  size: [number, number, number]
  color: string
  renderOrder: number
  locked: boolean
}

const STORAGE_KEY = "kombi-editor-objects-v1"

// Espelhado do lib/kombi-layout.ts (estado atual do jogo). Se você exportar
// JSON novo daqui, cole lá; sempre que kombi-layout.ts mudar, atualize aqui.
const DEFAULT_OBJECTS: CubeObject[] = [
  // ── CÂMERA (referência de POV motorista) ──
  { id: "camera-motorista",  name: "camera-motorista",   position: [-0.4, 1.15, -0.5],  rotation: [0.05, 0, 0], size: [0.12, 0.12, 0.12], color: "#ffffff", renderOrder: 20, locked: true },

  // ── EXTERIOR da Kombi ──
  { id: "carroceria",        name: "carroceria (base)",  position: [0, 0.8, 0.25],   rotation: [0, 0, 0], size: [1.76, 1.4, 3.11],  color: "#7fb2d4", renderOrder: 1,  locked: true },
  { id: "capo-dianteiro",    name: "capô dianteiro",     position: [0, 0.35, -1.4],  rotation: [0, 0, 0], size: [1.61, 0.66, 0.11], color: "#7fb2d4", renderOrder: 1,  locked: true },
  { id: "para-choque-fr",    name: "para-choque frente", position: [0, 0.28, -1.45], rotation: [0, 0, 0], size: [1.7, 0.15, 0.1],   color: "#c0c0c8", renderOrder: 1,  locked: true },
  { id: "para-choque-tr",    name: "para-choque trás",   position: [0, 0.28, 1.8],   rotation: [0, 0, 0], size: [1.7, 0.15, 0.06],  color: "#c0c0c8", renderOrder: 1,  locked: true },
  { id: "farol-esq",         name: "farol esquerdo",     position: [-0.55, 0.6, -1.47], rotation: [0, 0, 0], size: [0.22, 0.22, 0.03], color: "#fff8c0", renderOrder: 2,  locked: true },
  { id: "farol-dir",         name: "farol direito",      position: [0.55, 0.6, -1.47],  rotation: [0, 0, 0], size: [0.22, 0.22, 0.03], color: "#fff8c0", renderOrder: 2,  locked: true },
  { id: "lanterna-esq",      name: "lanterna esquerda",  position: [-0.55, 0.7, 1.8],   rotation: [0, 0, 0], size: [0.22, 0.14, 0.03], color: "#ff6b35", renderOrder: 2,  locked: true },
  { id: "lanterna-dir",      name: "lanterna direita",   position: [0.55, 0.7, 1.8],    rotation: [0, 0, 0], size: [0.22, 0.14, 0.03], color: "#ff6b35", renderOrder: 2,  locked: true },
  { id: "emblema-frontal",   name: "emblema Kombi (V)",  position: [0, 0.55, -1.47], rotation: [0, 0, 0], size: [0.18, 0.18, 0.02], color: "#ffcc00", renderOrder: 3,  locked: true },
  { id: "roda-frente-esq",   name: "roda frente esq",    position: [-0.95, 0.25, -1.15], rotation: [0, 0, 0], size: [0.15, 0.5, 0.5], color: "#0a0a0a", renderOrder: 3,  locked: true },
  { id: "roda-frente-dir",   name: "roda frente dir",    position: [0.95, 0.25, -1.15],  rotation: [0, 0, 0], size: [0.15, 0.5, 0.5], color: "#0a0a0a", renderOrder: 3,  locked: true },
  { id: "roda-tras-esq",     name: "roda trás esq",      position: [-0.95, 0.25, 1.15],  rotation: [0, 0, 0], size: [0.15, 0.5, 0.5], color: "#0a0a0a", renderOrder: 3,  locked: true },
  { id: "roda-tras-dir",     name: "roda trás dir",      position: [0.95, 0.25, 1.15],   rotation: [0, 0, 0], size: [0.15, 0.5, 0.5], color: "#0a0a0a", renderOrder: 3,  locked: true },
  { id: "teto-externo",      name: "teto externo",       position: [0, 1.45, 0.4],  rotation: [0, 0, 0], size: [1.65, 0.05, 3.2], color: "#e8e8f0", renderOrder: 1,  locked: true },
  { id: "faixa-hippie",      name: "faixa hippie lateral", position: [0, 0.2, 0.2], rotation: [0, 0, 0], size: [1.71, 0.15, 3.36], color: "#ff5fae", renderOrder: 2,  locked: true },

  // ── INTERIOR da Kombi ──
  { id: "parabrisa",         name: "parabrisa",          position: [0, 1.1, -1.35], rotation: [0.1, 0, 0], size: [1.51, 0.56, 0.02], color: "#88ddff", renderOrder: 4,  locked: true },
  { id: "vidro-tras",        name: "vidro traseiro",     position: [0, 1.1, 1.8],   rotation: [0, 0, 0], size: [1.6, 0.46, 0.02], color: "#88ddff", renderOrder: 4,  locked: true },
  { id: "janela-esq",        name: "janela lateral esq", position: [-0.9, 1.05, 0.25], rotation: [0, 1.5708, 0], size: [2.86, 0.46, 0.02], color: "#88ddff", renderOrder: 4,  locked: true },
  { id: "janela-dir",        name: "janela lateral dir", position: [0.9, 1.05, 0.25],  rotation: [0, -1.5708, 0], size: [2.86, 0.46, 0.02], color: "#88ddff", renderOrder: 4,  locked: true },
  { id: "porta-dir",         name: "porta direita",      position: [0.87, 0.55, -0.4], rotation: [0, 0, 0], size: [0.03, 0.75, 1.0], color: "#5a9ac0", renderOrder: 5,  locked: true },
  { id: "painel",            name: "painel bege",        position: [0, 0.75, -0.95], rotation: [0, 0, 0], size: [1.51, 0.06, 0.16], color: "#c9a97a", renderOrder: 6,  locked: true },
  { id: "volante",           name: "volante hippie",     position: [-0.42, 0.85, -0.85], rotation: [-0.25, 0, 0], size: [0.42, 0.4, 0.05], color: "#e8e8f0", renderOrder: 7,  locked: true },
  { id: "cambio",            name: "câmbio T-bar",       position: [0, 0.5, -1],    rotation: [0, 0, 0], size: [0.06, 0.21, 0.08], color: "#3a2410", renderOrder: 7,  locked: true },
  { id: "radio",             name: "rádio sintonizador", position: [0.05, 0.75, -0.82], rotation: [0, 0, 0], size: [0.28, 0.06, 0.04], color: "#3a2410", renderOrder: 8,  locked: true },
  { id: "toca-discos",       name: "toca-discos vintage", position: [0.45, 0.83, -0.92], rotation: [0, 0.15, 0], size: [0.31, 0.06, 0.16], color: "#3a2410", renderOrder: 8,  locked: true },
  { id: "pads-mpc",          name: "pads MPC (batida)",  position: [0.7, 0.72, -0.65], rotation: [0.1, 0, 0], size: [0.3, 0.06, 0.3], color: "#ffcc00", renderOrder: 8,  locked: true },
  { id: "pedestal-mpc",      name: "pedestal MPC",       position: [0.6, 0.485, -0.65], rotation: [0, 0, 0], size: [0.04, 0.45, 0.04], color: "#2a1f10", renderOrder: 7,  locked: true },
  { id: "retrovisor",        name: "retrovisor + dado",  position: [0, 1.28, -1.05], rotation: [0, 0, 0], size: [0.24, 0.08, 0.04], color: "#8a6a3a", renderOrder: 9,  locked: true },
  { id: "porta-luvas",       name: "porta-luvas (baú)",  position: [0.2, 0.48, -0.95], rotation: [0, -0.3, 0], size: [0.4, 0.4, 0.28], color: "#5a3010", renderOrder: 7,  locked: true },
  { id: "banco-motorista",   name: "banco motorista",    position: [-0.25, 0.4, -0.05], rotation: [0, 0, 0], size: [1.11, 0.36, 0.55], color: "#4a2510", renderOrder: 5,  locked: true },
  { id: "banco-passageira",  name: "banco passageira",   position: [0.55, 0.4, -0.05],  rotation: [0, 0, 0], size: [0.55, 0.36, 0.55], color: "#4a2510", renderOrder: 5,  locked: true },
  { id: "piso-interno",      name: "piso interno",       position: [0, 0.25, 0.4],  rotation: [0, 0, 0], size: [1.55, 0.02, 3.0], color: "#2a1f10", renderOrder: 2,  locked: true },
  { id: "cortina-esq",       name: "cortina esquerda",   position: [-0.86, 1.15, 0.5], rotation: [0, 1.5708, 0], size: [1.6, 0.3, 0.005], color: "#ff5fae", renderOrder: 10, locked: true },
  { id: "cortina-dir",       name: "cortina direita",    position: [0.86, 1.15, 0.5], rotation: [0, -1.5708, 0], size: [1.6, 0.3, 0.005], color: "#a855f7", renderOrder: 10, locked: true },
  { id: "guirlanda-frente",  name: "guirlanda LED frente", position: [0, 1.42, -1.0], rotation: [0, 0, 0], size: [1.5, 0.03, 0.03], color: "#00ffff", renderOrder: 11, locked: true },
  { id: "guirlanda-tras",    name: "guirlanda LED trás",   position: [0, 1.42, 1.85],  rotation: [0, 0, 0], size: [1.5, 0.03, 0.03], color: "#ff00ff", renderOrder: 11, locked: true },
]

// ─── Cubo 3D com label ────────────────────────────────────────────────────────
function CubeMesh({ obj, onSelect }: { obj: CubeObject; onSelect: () => void }) {
  const active = !obj.locked
  return (
    <group position={obj.position} rotation={obj.rotation}>
      <mesh
        renderOrder={obj.renderOrder}
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      >
        <boxGeometry args={obj.size} />
        <meshStandardMaterial
          color={obj.color}
          transparent
          opacity={active ? 0.85 : 0.55}
          emissive={active ? "#ff00ff" : "#000000"}
          emissiveIntensity={active ? 0.5 : 0}
        />
      </mesh>
      {/* wireframe outline destacado se editando */}
      {active && (
        <mesh renderOrder={obj.renderOrder + 100}>
          <boxGeometry args={[obj.size[0] * 1.05, obj.size[1] * 1.05, obj.size[2] * 1.05]} />
          <meshBasicMaterial color="#ff00ff" wireframe />
        </mesh>
      )}
      {/* label 3D flutuando em cima */}
      <Text
        position={[0, obj.size[1] / 2 + 0.1, 0]}
        fontSize={0.06}
        color={active ? "#ff00ff" : "#a0a0b0"}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.005}
        outlineColor="#000000"
      >
        {obj.name}
      </Text>
    </group>
  )
}

// ─── Cartão de objeto na sidebar ──────────────────────────────────────────────
function ObjectCard({
  obj, collapsed, onToggleCollapse, onUpdate, onToggleLock, onBringForward, onSendBackward, onDelete,
}: {
  obj: CubeObject
  collapsed: boolean
  onToggleCollapse: () => void
  onUpdate: (patch: Partial<CubeObject>) => void
  onToggleLock: () => void
  onBringForward: () => void
  onSendBackward: () => void
  onDelete: () => void
}) {
  const active = !obj.locked
  return (
    <div
      className={`rounded border p-2 text-xs transition-colors ${
        active ? "border-[#ff00ff] bg-[#ff00ff]/5" : "border-white/10 bg-white/[0.02]"
      }`}
    >
      {/* header: cadeado + nome + collapse */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleLock}
          className="text-base leading-none"
          title={obj.locked ? "destravar pra editar" : "travar"}
        >
          {obj.locked ? "🔒" : "🔓"}
        </button>
        <input
          type="text"
          value={obj.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-white outline-none focus:border-white/20 focus:bg-white/5"
        />
        <button onClick={onToggleCollapse} className="text-xs text-white/50 hover:text-white">
          {collapsed ? "▶" : "▼"}
        </button>
      </div>

      {!collapsed && (
        <div className="mt-2 space-y-1.5">
          {/* posição XYZ */}
          <div className="flex items-center gap-1">
            <span className="w-8 text-[10px] text-neutral-500">pos</span>
            {[0, 1, 2].map((i) => (
              <input
                key={i}
                type="number"
                step="0.05"
                value={obj.position[i]}
                onChange={(e) => {
                  const v = parseFloat(e.target.value) || 0
                  const p = [...obj.position] as [number, number, number]
                  p[i] = v
                  onUpdate({ position: p })
                }}
                className="w-full min-w-0 rounded bg-white/5 px-1 py-0.5 text-[10px] text-white"
              />
            ))}
          </div>
          {/* rotação XYZ */}
          <div className="flex items-center gap-1">
            <span className="w-8 text-[10px] text-neutral-500">rot</span>
            {[0, 1, 2].map((i) => (
              <input
                key={i}
                type="number"
                step="0.1"
                value={obj.rotation[i]}
                onChange={(e) => {
                  const v = parseFloat(e.target.value) || 0
                  const r = [...obj.rotation] as [number, number, number]
                  r[i] = v
                  onUpdate({ rotation: r })
                }}
                className="w-full min-w-0 rounded bg-white/5 px-1 py-0.5 text-[10px] text-white"
              />
            ))}
          </div>
          {/* size XYZ */}
          <div className="flex items-center gap-1">
            <span className="w-8 text-[10px] text-neutral-500">size</span>
            {[0, 1, 2].map((i) => (
              <input
                key={i}
                type="number"
                step="0.05"
                min="0.01"
                value={obj.size[i]}
                onChange={(e) => {
                  const v = Math.max(0.01, parseFloat(e.target.value) || 0.01)
                  const s = [...obj.size] as [number, number, number]
                  s[i] = v
                  onUpdate({ size: s })
                }}
                className="w-full min-w-0 rounded bg-white/5 px-1 py-0.5 text-[10px] text-white"
              />
            ))}
          </div>
          {/* cor + camadas + delete */}
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={obj.color}
              onChange={(e) => onUpdate({ color: e.target.value })}
              className="h-6 w-8 cursor-pointer rounded border border-white/10 bg-transparent"
            />
            <button
              onClick={onBringForward}
              className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-white hover:bg-white/10"
              title="camada +1 (aparece por cima)"
            >
              ▲ {obj.renderOrder}
            </button>
            <button
              onClick={onSendBackward}
              className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-white hover:bg-white/10"
              title="camada -1 (fica atrás)"
            >
              ▼
            </button>
            <button
              onClick={() => {
                if (confirm(`deletar ${obj.name}?`)) onDelete()
              }}
              className="ml-auto rounded border border-red-500/40 bg-red-950/30 px-1.5 py-0.5 text-[10px] text-red-300 hover:bg-red-950/50"
            >
              🗑
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Snapshot da câmera do orbit — captura pos + target do OrbitControls antes
// de sair pro FP. Não faz sentido restaurar aqui (isso rola no OrbitControls
// ao remontar, via defaultTarget/defaultCameraPosition passados por props).
function OrbitCameraSnapshot({
  viewMode,
  snapshotRef,
  orbitControlsRef,
}: {
  viewMode: "orbit" | "fp"
  snapshotRef: React.MutableRefObject<{ pos: [number, number, number]; target: [number, number, number] } | null>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orbitControlsRef: React.MutableRefObject<any>
}) {
  const { camera } = useThree()
  const prev = useRef(viewMode)
  useEffect(() => {
    const was = prev.current
    prev.current = viewMode
    if (viewMode === "fp" && was === "orbit") {
      const t = orbitControlsRef.current?.target
      snapshotRef.current = {
        pos: [camera.position.x, camera.position.y, camera.position.z],
        target: t ? [t.x, t.y, t.z] : [0, 0.7, 0],
      }
    } else if (viewMode === "orbit" && was === "fp" && snapshotRef.current) {
      // Restaura assim que OrbitControls remontar
      const { pos, target } = snapshotRef.current
      camera.position.set(...pos)
      // Aguarda 1 frame pra OrbitControls existir, aí seta target
      requestAnimationFrame(() => {
        const c = orbitControlsRef.current
        if (c?.target) {
          c.target.set(...target)
          c.update?.()
        }
      })
    }
  }, [viewMode, camera, snapshotRef, orbitControlsRef])
  return null
}

// ─── Câmera 1ª pessoa (mesmo comportamento do drive-v2 pra o editor) ────────
// Fixa a câmera na posição da "camera-motorista" do editor + free-look com
// drag do mouse. Sem física — só posição/rotação diretas.
function CockpitFPView({ headPos }: { headPos: [number, number, number] }) {
  const { camera, gl } = useThree()
  const yaw = useRef(0)
  const pitch = useRef(0)
  const targetYaw = useRef(0)
  const targetPitch = useRef(0)
  const dragging = useRef(false)

  useEffect(() => {
    const el = gl.domElement
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      dragging.current = true
      el.style.cursor = "grabbing"
    }
    const onUp = () => {
      dragging.current = false
      el.style.cursor = "grab"
      // NÃO reseta target — no EDITOR a câmera fica travada onde LU2CA soltar
      // (diferente do jogo /drive-v2 onde volta suave pra frente).
    }
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const YAW_LIMIT = (150 * Math.PI) / 180
      const PITCH_LIMIT = (60 * Math.PI) / 180
      targetYaw.current = Math.max(-YAW_LIMIT, Math.min(YAW_LIMIT, targetYaw.current - e.movementX * 0.0025))
      targetPitch.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, targetPitch.current - e.movementY * 0.0025))
    }
    el.style.cursor = "grab"
    el.addEventListener("mousedown", onDown)
    window.addEventListener("mouseup", onUp)
    window.addEventListener("mousemove", onMove)
    return () => {
      el.style.cursor = ""
      el.removeEventListener("mousedown", onDown)
      window.removeEventListener("mouseup", onUp)
      window.removeEventListener("mousemove", onMove)
    }
  }, [gl])

  useFrame((_, delta) => {
    const rate = dragging.current ? 14 : 3
    const l = 1 - Math.exp(-delta * rate)
    yaw.current += (targetYaw.current - yaw.current) * l
    pitch.current += (targetPitch.current - pitch.current) * l
    camera.position.set(headPos[0], headPos[1], headPos[2])
    camera.quaternion.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, "YXZ"))
  })

  return null
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function CockpitEditorPage() {
  const [objects, setObjects] = useState<CubeObject[]>(DEFAULT_OBJECTS)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [hydrated, setHydrated] = useState(false)
  // Modo de visualização: "orbit" (padrão do editor) ou "fp" (mesma câmera
  // do jogo /drive-v2). No FP, LU2CA vê exatamente como fica dentro do carro.
  const [viewMode, setViewMode] = useState<"orbit" | "fp">("orbit")
  // Snapshot da câmera do orbit antes de trocar pra FP — pra restaurar
  // exatamente o mesmo enquadramento ao voltar.
  const orbitSnapshot = useRef<{ pos: [number, number, number]; target: [number, number, number] } | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orbitControlsRef = useRef<any>(null)

  // Posição da câmera FP = posição atual da peça "camera-motorista" no editor
  const cameraMotorista = objects.find((o) => o.id === "camera-motorista")
  const headPos: [number, number, number] = cameraMotorista?.position ?? [-0.35, 1.05, 0.6]

  // Carrega de localStorage no mount (client-only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setObjects(parsed.map((o: CubeObject) => ({ ...o, locked: true })))
        }
      }
    } catch {
      /* mantém defaults */
    }
    setHydrated(true)
  }, [])

  // Salva no localStorage sempre que muda (só após hidratar)
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(objects))
    } catch {
      /* ignora quota */
    }
  }, [objects, hydrated])

  const unlockedObj = objects.find((o) => !o.locked) ?? null
  const unlockedId = unlockedObj?.id ?? null

  const updateObject = useCallback((id: string, patch: Partial<CubeObject>) => {
    setObjects((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  }, [])

  // Cadeado exclusivo: destravar um trava todos os outros
  const toggleLock = useCallback((id: string) => {
    setObjects((prev) => {
      const target = prev.find((o) => o.id === id)
      if (!target) return prev
      if (!target.locked) {
        // já destravado → trava
        return prev.map((o) => (o.id === id ? { ...o, locked: true } : o))
      }
      // travado → destrava só ele, trava todos os outros
      return prev.map((o) => (o.id === id ? { ...o, locked: false } : { ...o, locked: true }))
    })
  }, [])

  const lockAll = useCallback(() => {
    setObjects((prev) => prev.map((o) => ({ ...o, locked: true })))
  }, [])

  const addObject = useCallback(() => {
    const nextId = `objeto-${Date.now()}`
    const nextName = `objeto-${objects.length + 1}`
    const nextRenderOrder = Math.max(...objects.map((o) => o.renderOrder), 0) + 1
    const novo: CubeObject = {
      id: nextId,
      name: nextName,
      position: [0, 0.5, 0],
      rotation: [0, 0, 0],
      size: [0.3, 0.3, 0.3],
      color: "#ffffff",
      renderOrder: nextRenderOrder,
      locked: false, // já vem destravado pra editar imediatamente
    }
    setObjects((prev) => [...prev.map((o) => ({ ...o, locked: true })), novo])
  }, [objects])

  const deleteObject = useCallback((id: string) => {
    setObjects((prev) => prev.filter((o) => o.id !== id))
  }, [])

  const bringForward = useCallback(
    (id: string) => {
      const obj = objects.find((o) => o.id === id)
      if (!obj) return
      updateObject(id, { renderOrder: obj.renderOrder + 1 })
    },
    [objects, updateObject]
  )
  const sendBackward = useCallback(
    (id: string) => {
      const obj = objects.find((o) => o.id === id)
      if (!obj) return
      updateObject(id, { renderOrder: obj.renderOrder - 1 })
    },
    [objects, updateObject]
  )

  const exportJSON = useCallback(() => {
    const clean = objects.map((o) => ({ ...o, locked: true }))
    const s = JSON.stringify(clean, null, 2)
    navigator.clipboard.writeText(s).then(
      () => alert(`✓ ${objects.length} objetos copiados pro clipboard como JSON`),
      () => alert("❌ não deu pra copiar. veja no console")
    )
    console.log("=== kombi-editor export ===\n" + s)
  }, [objects])

  const importJSON = useCallback(() => {
    const s = prompt("cole o JSON do layout:")
    if (!s) return
    try {
      const parsed = JSON.parse(s)
      if (!Array.isArray(parsed)) throw new Error("não é array")
      setObjects(parsed.map((o: CubeObject) => ({ ...o, locked: true })))
    } catch {
      alert("❌ JSON inválido")
    }
  }, [])

  const resetDefaults = useCallback(() => {
    if (confirm("resetar tudo pros defaults? você perde as alterações locais.")) {
      setObjects(DEFAULT_OBJECTS)
    }
  }, [])

  // Setas do teclado movem o objeto destravado
  useEffect(() => {
    if (!unlockedId) return
    const handler = (e: KeyboardEvent) => {
      // ignora se digitando em input
      const t = e.target as HTMLElement
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return

      const step = e.shiftKey ? 0.5 : 0.1
      let dx = 0
      let dy = 0
      let dz = 0

      if (e.key === "ArrowLeft") dx = -step
      else if (e.key === "ArrowRight") dx = step
      else if (e.key === "ArrowUp") dz = -step
      else if (e.key === "ArrowDown") dz = step
      else if (e.key === "PageUp" || e.key === "q" || e.key === "Q") dy = step
      else if (e.key === "PageDown" || e.key === "e" || e.key === "E") dy = -step
      else return

      e.preventDefault()
      setObjects((prev) =>
        prev.map((o) =>
          o.id === unlockedId
            ? {
                ...o,
                position: [
                  parseFloat((o.position[0] + dx).toFixed(3)),
                  parseFloat((o.position[1] + dy).toFixed(3)),
                  parseFloat((o.position[2] + dz).toFixed(3)),
                ] as [number, number, number],
              }
            : o
        )
      )
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [unlockedId])

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0a0518]">
      {/* Canvas 3D — cena editorial */}
      <div className="absolute inset-0">
        <Canvas camera={{ position: [3.5, 2.8, 3.5], fov: 55 }}>
          <Suspense fallback={null}>
            <color attach="background" args={["#0a0518"]} />
            <ambientLight intensity={0.7} />
            <directionalLight position={[5, 8, 5]} intensity={0.6} />
            <directionalLight position={[-3, 4, -3]} intensity={0.3} color="#ff00ff" />

            {/* Grid de referência no chão */}
            <Grid
              args={[10, 10]}
              cellSize={0.25}
              cellThickness={0.6}
              cellColor="#4c1a8a"
              sectionSize={1}
              sectionThickness={1.2}
              sectionColor="#ff00ff"
              fadeDistance={20}
              fadeStrength={1}
              infiniteGrid
              followCamera={false}
            />

            {/* Eixos XYZ na origem — vermelho=X verde=Y azul=Z */}
            <axesHelper args={[1.5]} />

            {/* Cubos */}
            {objects.map((obj) => (
              <CubeMesh key={obj.id} obj={obj} onSelect={() => toggleLock(obj.id)} />
            ))}

            <OrbitCameraSnapshot
              viewMode={viewMode}
              snapshotRef={orbitSnapshot}
              orbitControlsRef={orbitControlsRef}
            />
            {viewMode === "orbit" ? (
              <OrbitControls ref={orbitControlsRef} makeDefault enableDamping dampingFactor={0.1} />
            ) : (
              <CockpitFPView headPos={headPos} />
            )}
          </Suspense>
        </Canvas>
      </div>

      {/* Toggle de câmera — orbit (padrão editor) vs 1ª pessoa (POV motorista) */}
      <div className="pointer-events-auto absolute right-4 top-4 z-20 flex flex-col items-end gap-2">
        <button
          onClick={() => setViewMode((m) => (m === "orbit" ? "fp" : "orbit"))}
          className="rounded border border-white/20 bg-black/85 px-4 py-2 text-xs font-mono uppercase tracking-widest text-white backdrop-blur-md hover:bg-white/10"
        >
          {viewMode === "orbit" ? "🎥 orbit" : "👁 1ª pessoa"} · trocar
        </button>
        <button
          onClick={() => {
            if (!confirm("Descarta edições locais e volta aos defaults (kombi-layout.ts atual)?")) return
            localStorage.removeItem(STORAGE_KEY)
            setObjects(DEFAULT_OBJECTS)
          }}
          className="rounded border border-orange-400/40 bg-orange-950/60 px-4 py-2 text-xs font-mono uppercase tracking-widest text-orange-200 backdrop-blur-md hover:bg-orange-900/60"
        >
          ↺ reset defaults
        </button>
        {viewMode === "fp" && (
          <div className="rounded border border-white/15 bg-black/85 p-2 text-[10px] font-mono text-cyan-300 backdrop-blur">
            arrasta o mouse pra olhar em volta<br/>
            (câmera segue a peça &quot;camera-motorista&quot;)
          </div>
        )}
      </div>

      {/* HUD topo esquerdo — instruções */}
      <div className="pointer-events-none absolute left-4 top-4 max-w-md text-white">
        <div className="rounded border border-white/10 bg-black/80 p-3 text-xs backdrop-blur-md">
          <div className="mb-1 font-mono">
            editando:{" "}
            <span className="text-[#ff00ff]">
              {unlockedObj ? unlockedObj.name : "nenhum · click num cubo pra destravar"}
            </span>
          </div>
          <div className="text-[10px] leading-relaxed text-neutral-400">
            🔒 destrava um objeto por vez.{" "}
            <kbd className="rounded border border-white/20 px-1">← →</kbd> X ·{" "}
            <kbd className="rounded border border-white/20 px-1">↑ ↓</kbd> Z ·{" "}
            <kbd className="rounded border border-white/20 px-1">Q/E</kbd> Y ·{" "}
            <kbd className="rounded border border-white/20 px-1">shift</kbd> passo 5×
          </div>
          <div className="mt-1.5 text-[10px] text-neutral-500">
            arrasta pra girar câmera · scroll pra zoom · botão direito pra pan
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="pointer-events-auto absolute right-0 top-0 flex h-full w-80 flex-col border-l border-white/10 bg-black/90 backdrop-blur-md">
        <div className="border-b border-white/10 p-3">
          <h1 className="mb-2 text-lg font-bold text-white">Kombi Editor</h1>
          <button
            onClick={addObject}
            className="mb-2 w-full rounded border border-[#ff00ff] bg-[#ff00ff]/10 py-2 text-sm text-white hover:bg-[#ff00ff]/20"
          >
            + novo objeto
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={exportJSON}
              className="rounded border border-white/20 bg-white/5 py-1.5 text-xs text-white hover:bg-white/10"
            >
              exportar JSON
            </button>
            <button
              onClick={importJSON}
              className="rounded border border-white/20 bg-white/5 py-1.5 text-xs text-white hover:bg-white/10"
            >
              importar JSON
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={lockAll}
              className="rounded border border-white/10 bg-white/5 py-1 text-[10px] text-white/70 hover:bg-white/10"
            >
              🔒 travar tudo
            </button>
            <button
              onClick={resetDefaults}
              className="rounded border border-red-500/50 bg-red-950/40 py-1 text-[10px] text-red-300 hover:bg-red-950/60"
            >
              resetar defaults
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase text-neutral-500">
            <span>objetos ({objects.length})</span>
            <span>renderOrder</span>
          </div>
          <div className="space-y-2">
            {objects.map((obj) => (
              <ObjectCard
                key={obj.id}
                obj={obj}
                collapsed={collapsedIds.has(obj.id)}
                onToggleCollapse={() =>
                  setCollapsedIds((prev) => {
                    const s = new Set(prev)
                    if (s.has(obj.id)) s.delete(obj.id)
                    else s.add(obj.id)
                    return s
                  })
                }
                onUpdate={(patch) => updateObject(obj.id, patch)}
                onToggleLock={() => toggleLock(obj.id)}
                onBringForward={() => bringForward(obj.id)}
                onSendBackward={() => sendBackward(obj.id)}
                onDelete={() => deleteObject(obj.id)}
              />
            ))}
            {objects.length === 0 && (
              <div className="rounded border border-white/10 bg-white/[0.02] p-4 text-center text-xs text-neutral-500">
                nenhum objeto ainda. clica "+ novo objeto" pra começar.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
