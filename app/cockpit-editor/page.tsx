"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, Grid, Text } from "@react-three/drei"
import { Suspense, useState, useEffect, useCallback } from "react"

// Editor de blocking pro cockpit — cubos rotulados que você posiciona no
// espaço 3D. O layout aqui vira o guia pra construir o cockpit real depois.

type CubeObject = {
  id: string
  name: string
  position: [number, number, number]
  rotation: [number, number, number]
  size: [number, number, number]
  color: string
  renderOrder: number
  locked: boolean // se locked: false, é o objeto sendo editado (só 1 por vez)
}

const STORAGE_KEY = "cockpit-editor-objects-v1"

const DEFAULT_OBJECTS: CubeObject[] = [
  { id: "camera-cockpit",   name: "camera-cockpit",   position: [0, 1.0, 0.7],  rotation: [0, 0, 0], size: [0.15, 0.15, 0.15], color: "#ffffff", renderOrder: 20, locked: true },
  { id: "parabrisa",         name: "parabrisa",         position: [0, 0.9, -1.0], rotation: [0.1, 0, 0], size: [1.5, 0.9, 0.02], color: "#7a1d99", renderOrder: 1,  locked: true },
  { id: "teto-panoramico",  name: "teto-panoramico",  position: [0, 1.4, -0.3], rotation: [0, 0, 0], size: [1.0, 0.02, 1.2],  color: "#4c1a8a", renderOrder: 2,  locked: true },
  { id: "painel",            name: "painel",            position: [0, 0.4, -0.8], rotation: [0, 0, 0], size: [1.4, 0.25, 0.3], color: "#12121e", renderOrder: 5,  locked: true },
  { id: "volante",           name: "volante",           position: [0.35, 0.35, -0.5], rotation: [1.0, 0, 0], size: [0.35, 0.35, 0.05], color: "#1a1a2a", renderOrder: 6,  locked: true },
  { id: "retrovisor",        name: "retrovisor",        position: [0, 1.3, -0.85], rotation: [0, 0, 0], size: [0.22, 0.06, 0.03], color: "#4c1a8a", renderOrder: 7,  locked: true },
  { id: "radio",             name: "radio",             position: [0, 0.5, -0.65], rotation: [0, 0, 0], size: [0.24, 0.14, 0.02], color: "#00e5ff", renderOrder: 8,  locked: true },
  { id: "batida",            name: "batida",            position: [-0.45, 0.5, -0.65], rotation: [0, 0, 0], size: [0.15, 0.15, 0.02], color: "#ff6b6b", renderOrder: 8,  locked: true },
  { id: "toca-discos",       name: "toca-discos",       position: [0.45, 0.5, -0.65], rotation: [0, 0, 0], size: [0.16, 0.02, 0.16], color: "#ffcc00", renderOrder: 8,  locked: true },
  { id: "banco-motorista",   name: "banco-motorista",   position: [0.35, 0.15, 0.5],  rotation: [0, 0, 0], size: [0.5, 0.9, 0.5],  color: "#151525", renderOrder: 4,  locked: true },
  { id: "banco-passageiro",  name: "banco-passageiro",  position: [-0.35, 0.15, 0.5], rotation: [0, 0, 0], size: [0.5, 0.9, 0.5],  color: "#151525", renderOrder: 4,  locked: true },
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

// ─── Página principal ────────────────────────────────────────────────────────
export default function CockpitEditorPage() {
  const [objects, setObjects] = useState<CubeObject[]>(DEFAULT_OBJECTS)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [hydrated, setHydrated] = useState(false)

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
    console.log("=== cockpit-editor export ===\n" + s)
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

            <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
          </Suspense>
        </Canvas>
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
          <h1 className="mb-2 text-lg font-bold text-white">Cockpit Editor</h1>
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
