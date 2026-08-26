"use client"

// Editor de PISTAS — top-down 2D. LU2CA edita as splines dos 3 circuitos
// (magenta/cyan/amarelo) e exporta o JSON pra colar em lib/road-circuits.ts.
//
// Como usar:
// - Escolhe circuito ativo (chips no topo)
// - Clica no canvas pra adicionar ponto
// - Arrasta ponto existente pra mover
// - SHIFT + clique num ponto pra deletar
// - Slider "Y" ao lado do ponto selecionado pra ajustar altura (montanha russa)
// - Preview da spline em tempo real (CatmullRomCurve3)

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"

type Vec3 = [number, number, number]

interface Point {
  x: number
  y: number
  z: number
}

interface Circuit {
  id: string
  color: string
  points: Point[]
}

const STORAGE_KEY = "pistas-editor-v1"

// Helper: constrói circuito a partir de pontos [-1,1] normalizados + escala.
// Y=2 é a base (o useEditedCircuits força altura real por circuito depois).
function circuitFromNormalized(id: string, color: string, scale: number, pts: [number, number][]): Circuit {
  return {
    id,
    color,
    points: pts.map(([x, z]) => ({ x: x * scale, y: 2, z: z * scale })),
  }
}

// PISTAS REAIS (F1). Coordenadas fiéis ao traçado geográfico visto de cima
// (norte=-Z, sul=+Z). Escala pensada pro editor: aplicada * SCALE=1.5 vira
// o tamanho final no jogo (~200-315u de diâmetro cobrindo a cidade).
const DEFAULT_CIRCUITS: Circuit[] = [
  // MAGENTA = MONACO (sentido horário)
  circuitFromNormalized("magenta", "#ff00ff", 133, [
    [ 0.9,  0.85], [ 0.5,  0.9], [ 0.1,  0.92], [-0.25, 0.9],   // reta Boulevard Albert I
    [-0.55, 0.82], [-0.7,  0.7],                                 // Sainte Dévote
    [-0.75, 0.5], [-0.75, 0.25], [-0.7,  0.0],                   // Beau Rivage
    [-0.6, -0.2], [-0.35,-0.35], [-0.05,-0.4],                   // Massenet + Casino Square
    [ 0.2, -0.32], [ 0.4, -0.15], [ 0.55, 0.0], [ 0.6,  0.15],   // Mirabeau
    [ 0.72, 0.25], [ 0.78, 0.3], [ 0.72, 0.38], [ 0.55, 0.4],    // Loews Hairpin 180°
    [ 0.4,  0.35], [ 0.25, 0.3],                                 // Portier
    [ 0.1,  0.35], [-0.05, 0.45], [-0.15, 0.55],                 // Túnel
    [-0.15, 0.65], [-0.05, 0.7], [ 0.05, 0.6],                   // Nouvelle Chicane
    [ 0.15, 0.55], [ 0.3,  0.45],                                // Tabac
    [ 0.45, 0.5], [ 0.55, 0.6], [ 0.5,  0.72], [ 0.4,  0.78],    // Piscine (Louis Chiron)
    [ 0.55, 0.85], [ 0.7,  0.88],                                // La Rascasse
    [ 0.85, 0.88], [ 0.95, 0.85],                                // Anthony Noghès
  ]),
  // CIANO = SUZUKA (figura-8, sentido horário)
  circuitFromNormalized("cyan", "#00ffff", 120, [
    [-0.8,  0.85], [-0.5,  0.85], [-0.15, 0.85],                 // reta principal
    [ 0.15, 0.75], [ 0.25, 0.55],                                // curvas 1-2
    [ 0.15, 0.35], [ 0.0,  0.2], [-0.15, 0.05], [-0.05,-0.1], [ 0.15,-0.15],  // S curves
    [ 0.25,-0.3], [ 0.2, -0.5],                                  // Dunlop
    [ 0.05,-0.6], [-0.15,-0.6],                                  // Degner 1+2
    [-0.35,-0.5],                                                 // aproximação hairpin
    [-0.55,-0.35], [-0.75,-0.35], [-0.85,-0.25], [-0.85,-0.1], [-0.75, 0.05],  // Hairpin
    [-0.55, 0.15], [-0.35, 0.15], [-0.15, 0.05], [-0.1, -0.1], [-0.25,-0.25],  // Spoon
    [-0.2, -0.4], [ 0.05,-0.4], [ 0.3, -0.35],                   // 130R
    [ 0.55,-0.25], [ 0.7, -0.1], [ 0.75, 0.1],                   // Casio Triangle
    [ 0.7,  0.35], [ 0.55, 0.55], [ 0.3,  0.7], [ 0.0,  0.8], [-0.4,  0.85], [-0.7, 0.85],  // pit straight
  ]),
  // AMARELA = INTERLAGOS (anti-horário)
  circuitFromNormalized("yellow", "#ffcc00", 140, [
    [ 0.95, 0.55], [ 0.95, 0.3], [ 0.9,  0.1],                   // reta dos boxes
    [ 0.75, 0.0], [ 0.55,-0.05], [ 0.35, 0.0],                   // S do Senna
    [ 0.15, 0.1], [ 0.0,  0.2], [-0.15, 0.25],                   // Curva do Sol
    [-0.35, 0.15], [-0.5,  0.05], [-0.6, -0.1],                  // reta oposta
    [-0.65,-0.3], [-0.6, -0.5],                                  // Descida do Lago
    [-0.5, -0.65], [-0.35,-0.7], [-0.15,-0.7],                   // Ferradura
    [ 0.0, -0.65],                                               // Laranjinha
    [ 0.15,-0.55],                                               // Pinheirinho
    [ 0.25,-0.4], [ 0.15,-0.3], [ 0.05,-0.15],                   // Bico de Pato
    [ 0.1,  0.0], [ 0.25, 0.1],                                  // Mergulho
    [ 0.4,  0.2], [ 0.55, 0.35],                                 // Junção
    [ 0.65, 0.5], [ 0.75, 0.6], [ 0.85, 0.6], [ 0.95, 0.6],      // Subida dos Boxes
  ]),
]

// Viewport 2D top-down: 600x600px representando ±160 unidades do mundo
const VIEW = 720
const WORLD = 320 // ±160
const scale = VIEW / WORLD // px per world unit
const worldToScreen = (v: number) => v * scale + VIEW / 2
const screenToWorld = (px: number) => (px - VIEW / 2) / scale

export default function PistasEditorPage() {
  const [circuits, setCircuits] = useState<Circuit[]>(DEFAULT_CIRCUITS)
  const [activeCircuit, setActiveCircuit] = useState<string>("magenta")
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragIdxRef = useRef<number | null>(null)

  // Carrega/salva localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Circuit[]
        if (Array.isArray(parsed) && parsed.length > 0) setCircuits(parsed)
      }
    } catch {}
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(circuits))
    } catch {}
  }, [circuits])

  const active = circuits.find((c) => c.id === activeCircuit)!
  const activeIdx = circuits.findIndex((c) => c.id === activeCircuit)

  // Add point on click
  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (dragIdxRef.current !== null) {
        dragIdxRef.current = null
        return
      }
      const rect = e.currentTarget.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const wx = screenToWorld(px)
      const wz = screenToWorld(py)
      setCircuits((prev) => {
        const copy = [...prev]
        copy[activeIdx] = {
          ...copy[activeIdx],
          points: [...copy[activeIdx].points, { x: wx, y: 2, z: wz }],
        }
        return copy
      })
      setSelectedIdx(active.points.length)
    },
    [active.points.length, activeIdx]
  )

  const handlePointMouseDown = useCallback(
    (i: number, e: React.MouseEvent) => {
      e.stopPropagation()
      if (e.shiftKey) {
        // delete
        setCircuits((prev) => {
          const copy = [...prev]
          copy[activeIdx] = {
            ...copy[activeIdx],
            points: copy[activeIdx].points.filter((_, idx) => idx !== i),
          }
          return copy
        })
        setSelectedIdx(null)
        return
      }
      dragIdxRef.current = i
      setSelectedIdx(i)
    },
    [activeIdx]
  )

  const handleSvgMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (dragIdxRef.current === null) return
      const rect = e.currentTarget.getBoundingClientRect()
      const wx = screenToWorld(e.clientX - rect.left)
      const wz = screenToWorld(e.clientY - rect.top)
      setCircuits((prev) => {
        const copy = [...prev]
        const pts = [...copy[activeIdx].points]
        pts[dragIdxRef.current!] = { ...pts[dragIdxRef.current!], x: wx, z: wz }
        copy[activeIdx] = { ...copy[activeIdx], points: pts }
        return copy
      })
    },
    [activeIdx]
  )

  const handleSvgMouseUp = useCallback(() => {
    dragIdxRef.current = null
  }, [])

  const updateSelectedY = useCallback(
    (newY: number) => {
      if (selectedIdx === null) return
      setCircuits((prev) => {
        const copy = [...prev]
        const pts = [...copy[activeIdx].points]
        pts[selectedIdx] = { ...pts[selectedIdx], y: newY }
        copy[activeIdx] = { ...copy[activeIdx], points: pts }
        return copy
      })
    },
    [activeIdx, selectedIdx]
  )

  const exportJSON = useCallback(() => {
    // Formato pronto pra colar em lib/road-circuits.ts
    const js = circuits.map((c) => ({
      id: c.id,
      color: c.color,
      points: c.points.map((p) => [p.x, p.y, p.z] as Vec3),
    }))
    const s = JSON.stringify(js, null, 2)
    navigator.clipboard.writeText(s).then(
      () => alert(`✓ ${circuits.reduce((sum, c) => sum + c.points.length, 0)} pontos copiados pro clipboard`),
      () => alert("❌ não copiou. veja no console")
    )
    console.log("=== pistas-editor export ===\n" + s)
  }, [circuits])

  const resetDefaults = useCallback(() => {
    if (confirm("carregar traçados F1 reais (Monaco / Suzuka / Interlagos)?\nsobrescreve tudo que você editou.")) {
      setCircuits(DEFAULT_CIRCUITS)
      setSelectedIdx(null)
    }
  }, [])

  const clearActive = useCallback(() => {
    if (confirm(`limpar todos os pontos do circuito ${activeCircuit}?`)) {
      setCircuits((prev) => {
        const copy = [...prev]
        copy[activeIdx] = { ...copy[activeIdx], points: [] }
        return copy
      })
      setSelectedIdx(null)
    }
  }, [activeCircuit, activeIdx])

  // Interpolação spline via CatmullRomCurve3
  const splinePaths = useMemo(() => {
    return circuits.map((c) => {
      if (c.points.length < 2) return { id: c.id, color: c.color, d: "" }
      const vs = c.points.map((p) => new THREE.Vector3(p.x, p.y, p.z))
      const curve = new THREE.CatmullRomCurve3(vs, true, "catmullrom", 0.5)
      const disc = curve.getPoints(200)
      const parts: string[] = []
      disc.forEach((p, i) => {
        const sx = worldToScreen(p.x)
        const sz = worldToScreen(p.z)
        parts.push(`${i === 0 ? "M" : "L"} ${sx.toFixed(1)} ${sz.toFixed(1)}`)
      })
      parts.push("Z")
      return { id: c.id, color: c.color, d: parts.join(" ") }
    })
  }, [circuits])

  const selectedPoint = selectedIdx !== null ? active.points[selectedIdx] : null

  return (
    <div className="flex h-screen w-screen bg-[#050510] text-white">
      {/* Canvas central */}
      <div className="flex flex-1 items-center justify-center p-4">
        <svg
          ref={svgRef}
          width={VIEW}
          height={VIEW}
          onClick={handleSvgClick}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
          onMouseLeave={handleSvgMouseUp}
          style={{
            background: "#0a0518",
            border: "1px solid #333",
            cursor: dragIdxRef.current !== null ? "grabbing" : "crosshair",
          }}
        >
          {/* grid */}
          <defs>
            <pattern id="grid" width={20} height={20} patternUnits="userSpaceOnUse">
              <path d={`M ${20} 0 L 0 0 0 ${20}`} fill="none" stroke="#1a0533" strokeWidth={0.5} />
            </pattern>
          </defs>
          <rect width={VIEW} height={VIEW} fill="url(#grid)" />
          {/* eixos */}
          <line x1={0} y1={VIEW / 2} x2={VIEW} y2={VIEW / 2} stroke="#3a1a5e" strokeWidth={1} />
          <line x1={VIEW / 2} y1={0} x2={VIEW / 2} y2={VIEW} stroke="#3a1a5e" strokeWidth={1} />
          {/* marca central */}
          <circle cx={VIEW / 2} cy={VIEW / 2} r={4} fill="#ff2d78" />
          <text x={VIEW / 2 + 8} y={VIEW / 2 - 4} fontSize={10} fill="#c9a97a" fontFamily="monospace">
            (0,0)
          </text>

          {/* splines de todos os circuitos */}
          {splinePaths.map((sp) => (
            <path
              key={sp.id}
              d={sp.d}
              fill="none"
              stroke={sp.color}
              strokeWidth={sp.id === activeCircuit ? 3 : 1.5}
              strokeOpacity={sp.id === activeCircuit ? 1 : 0.4}
              style={{ filter: sp.id === activeCircuit ? `drop-shadow(0 0 6px ${sp.color})` : "none" }}
            />
          ))}

          {/* pontos do circuito ativo */}
          {active.points.map((p, i) => (
            <g key={i}>
              <circle
                cx={worldToScreen(p.x)}
                cy={worldToScreen(p.z)}
                r={selectedIdx === i ? 8 : 6}
                fill={selectedIdx === i ? "#ffcc00" : active.color}
                stroke="#fff"
                strokeWidth={1.5}
                onMouseDown={(e) => handlePointMouseDown(i, e)}
                style={{ cursor: "grab" }}
              />
              <text
                x={worldToScreen(p.x) + 10}
                y={worldToScreen(p.z) - 8}
                fontSize={9}
                fill="#fff"
                fontFamily="monospace"
                pointerEvents="none"
              >
                {i} · y={p.y.toFixed(1)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Painel lateral direito */}
      <aside className="flex w-80 flex-col gap-3 overflow-y-auto border-l border-white/10 bg-[#0a0518] p-4">
        <h1 className="text-lg font-bold">Pistas Editor</h1>
        <p className="text-[10px] text-neutral-400">
          click adiciona ponto · arraste move · shift+click deleta · use Y pra montanha russa
        </p>

        <div className="flex gap-2">
          <button
            onClick={exportJSON}
            className="flex-1 rounded bg-green-600 px-3 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-green-500"
          >
            exportar JSON
          </button>
          <button
            onClick={resetDefaults}
            className="rounded border border-red-400/50 bg-red-950 px-3 py-2 text-xs font-bold uppercase tracking-widest text-red-200 hover:bg-red-900"
            title="Monaco (magenta) · Suzuka (ciano) · Interlagos (amarela)"
          >
            🏁 F1
          </button>
        </div>

        {/* Selector de circuito ativo */}
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-widest text-neutral-500">circuito ativo</div>
          <div className="flex gap-1">
            {circuits.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveCircuit(c.id)
                  setSelectedIdx(null)
                }}
                className="flex-1 rounded px-2 py-1.5 text-xs font-bold uppercase tracking-widest transition"
                style={{
                  background: c.id === activeCircuit ? c.color : "rgba(255,255,255,0.05)",
                  color: c.id === activeCircuit ? "#000" : "#fff",
                  boxShadow: c.id === activeCircuit ? `0 0 12px ${c.color}88` : "none",
                }}
              >
                {c.id}
              </button>
            ))}
          </div>
        </div>

        <div className="text-[10px] text-neutral-500">
          {active.points.length} pontos · circuito {active.id}
        </div>

        <button
          onClick={clearActive}
          className="rounded border border-red-800 bg-red-950 px-2 py-1.5 text-[10px] text-red-300 hover:bg-red-900"
        >
          limpar circuito {active.id}
        </button>

        {/* Painel do ponto selecionado */}
        {selectedPoint !== null && selectedIdx !== null && (
          <div className="rounded border border-yellow-600 bg-yellow-950/30 p-3">
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-yellow-400">
              ponto #{selectedIdx}
            </div>
            <div className="mb-2 font-mono text-[10px] text-white/70">
              X: {selectedPoint.x.toFixed(2)} · Z: {selectedPoint.z.toFixed(2)}
            </div>
            <label className="mb-1 block text-[10px] uppercase tracking-widest text-yellow-300">
              altura Y (0 = chão · 6 = alto)
            </label>
            <input
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={selectedPoint.y}
              onChange={(e) => updateSelectedY(parseFloat(e.target.value))}
              className="w-full accent-yellow-500"
            />
            <div className="text-center text-xs font-mono text-yellow-300">
              y = {selectedPoint.y.toFixed(1)}
            </div>
            <button
              onClick={() => {
                setCircuits((prev) => {
                  const copy = [...prev]
                  copy[activeIdx] = {
                    ...copy[activeIdx],
                    points: copy[activeIdx].points.filter((_, idx) => idx !== selectedIdx),
                  }
                  return copy
                })
                setSelectedIdx(null)
              }}
              className="mt-3 w-full rounded border border-red-700 bg-red-950/50 py-1.5 text-[10px] text-red-300 hover:bg-red-900"
            >
              deletar ponto
            </button>
          </div>
        )}

        {/* Lista de pontos */}
        <div className="border-t border-white/10 pt-3">
          <div className="mb-2 text-[10px] uppercase tracking-widest text-neutral-500">pontos do circuito</div>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {active.points.map((p, i) => (
              <div
                key={i}
                onClick={() => setSelectedIdx(i)}
                className="flex cursor-pointer items-center justify-between rounded px-2 py-1 text-[10px] transition"
                style={{
                  background: selectedIdx === i ? "rgba(255,204,0,0.2)" : "transparent",
                  border: selectedIdx === i ? "1px solid #ffcc00" : "1px solid transparent",
                }}
              >
                <span className="font-mono text-white/70">#{i}</span>
                <span className="font-mono text-white/50">
                  x:{p.x.toFixed(0)} y:{p.y.toFixed(1)} z:{p.z.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
