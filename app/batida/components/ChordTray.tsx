"use client"

// ─── esteira de acordes (modo PRO) ──────────────────────────────────────────
// Cada chip é um som gravado — toque rápido audiciona, arrastar pro grid
// abaixo coloca a voicing exata naquele passo. Sem lib de drag-and-drop no
// projeto: pointer capture manual + threshold de posição pra distinguir
// toque de arrasto, igual ao padrão já usado em app/drive/page.tsx e no
// próprio strum-drag do GuitarFretboard.
import { useRef } from "react"
import { midiToNoteName } from "../lib/theory"
import type { TrayItem } from "../lib/useNoteTray"

const DRAG_THRESHOLD = 8

export function ChordTray({
  items,
  accent,
  onPreview,
  onDragStart,
  onDragMove,
  onDragEnd,
  onClear,
}: {
  items: TrayItem[]
  accent: string
  onPreview: (item: TrayItem) => void
  onDragStart: (item: TrayItem, clientX: number, clientY: number) => void
  onDragMove: (clientX: number, clientY: number) => void
  onDragEnd: (clientX: number, clientY: number) => void
  onClear: () => void
}) {
  const gestureRef = useRef<{ item: TrayItem | null; startX: number; startY: number; dragging: boolean }>({
    item: null,
    startX: 0,
    startY: 0,
    dragging: false,
  })

  return (
    <div className="mb-2 flex-shrink-0">
      <div className="flex items-center justify-between mb-1 px-0.5">
        <span className="text-[9px] font-mono text-white/30 tracking-widest">ESTEIRA</span>
        {items.length > 0 && (
          <button type="button" onClick={onClear} className="text-[9px] font-mono text-white/30 active:text-white/60">
            limpar
          </button>
        )}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {items.length === 0 && (
          <p className="text-white/20 text-[9px] font-mono py-2 px-1 flex-shrink-0">
            toque no braço/teclado pra gravar um som aqui — depois arraste pro grid
          </p>
        )}
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="flex-shrink-0 px-2.5 py-2 rounded-lg text-[9px] font-mono touch-none select-none transition-transform"
            style={{ background: `${accent}18`, border: `1px solid ${accent}60`, color: accent }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              gestureRef.current = { item, startX: e.clientX, startY: e.clientY, dragging: false }
            }}
            onPointerMove={(e) => {
              const g = gestureRef.current
              if (!g.item || g.item.id !== item.id) return
              if (!g.dragging) {
                const dx = e.clientX - g.startX
                const dy = e.clientY - g.startY
                if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
                g.dragging = true
                onDragStart(item, e.clientX, e.clientY)
              }
              onDragMove(e.clientX, e.clientY)
            }}
            onPointerUp={(e) => {
              const g = gestureRef.current
              if (g.item?.id === item.id) {
                if (g.dragging) onDragEnd(e.clientX, e.clientY)
                else onPreview(item)
              }
              gestureRef.current = { item: null, startX: 0, startY: 0, dragging: false }
            }}
          >
            {item.notes.map((n) => midiToNoteName(n.midi)).join(" ")}
          </button>
        ))}
      </div>
    </div>
  )
}
