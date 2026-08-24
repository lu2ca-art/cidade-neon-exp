"use client"

// Modal do porta-luvas — inventário do usuário. Galeria de itens
// (discos + props). Selecionar mostra mini-page com descrição + botão
// de ação específico.

import { useState } from "react"
import { INVENTORY, type InventoryItem, type InventoryAction } from "@/lib/inventory-items"

export interface PortaLuvasModalProps {
  open: boolean
  onClose: () => void
  onAction: (action: InventoryAction) => void
}

export function PortaLuvasModal({ open, onClose, onAction }: PortaLuvasModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? INVENTORY.find((i) => i.id === selectedId) : null

  if (!open) return null

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative flex overflow-hidden rounded-2xl border border-white/15 shadow-2xl"
        style={{
          width: "min(720px, 94vw)",
          height: "min(560px, 84vh)",
          background: "linear-gradient(135deg, #3a2410 0%, #1a0f05 100%)",
          boxShadow: "0 20px 80px rgba(255, 107, 53, 0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-5 pt-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#c9a97a]">porta-luvas</div>
            <div className="text-lg font-bold uppercase tracking-widest text-white">inventário</div>
          </div>
          <button
            onClick={onClose}
            className="pointer-events-auto rounded-full bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
          >
            ✕ fechar
          </button>
        </div>

        {/* Galeria (esquerda) */}
        <div className="flex-1 overflow-y-auto p-5 pt-16">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {INVENTORY.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                selected={selectedId === item.id}
                onClick={() => setSelectedId(item.id)}
              />
            ))}
          </div>
        </div>

        {/* Mini-page (direita) — só aparece se algo selecionado */}
        {selected && (
          <div
            className="flex w-[280px] flex-col border-l border-white/10 p-5 pt-16"
            style={{ background: "rgba(0,0,0,0.35)" }}
          >
            {/* capa grande do item */}
            <div
              className="mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-lg"
              style={{
                background: `radial-gradient(circle at 30% 30%, ${selected.color}, #0a0a0a)`,
                boxShadow: `0 8px 24px ${selected.color}55`,
              }}
            >
              <span className="text-5xl">{selected.icon}</span>
            </div>
            <div className="text-center text-[9px] font-mono uppercase tracking-widest text-[#c9a97a]">
              {selected.categoria}
            </div>
            <div className="mt-1 text-center text-base font-bold text-white">{selected.titulo}</div>
            {selected.autor && (
              <div className="mt-0.5 text-center text-xs text-white/70">{selected.autor}</div>
            )}
            <p className="mt-3 flex-1 text-xs leading-relaxed text-white/60">{selected.desc}</p>
            <button
              onClick={() => {
                onAction(selected.action)
                onClose()
              }}
              className="mt-4 w-full rounded-lg px-4 py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:brightness-110"
              style={{
                background: `linear-gradient(90deg, ${selected.color}, ${selected.color}dd)`,
                boxShadow: `0 4px 16px ${selected.color}55`,
              }}
            >
              {selected.actionLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ItemCard({
  item,
  selected,
  onClick,
}: {
  item: InventoryItem
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-lg text-left transition"
      style={{
        border: selected ? `2px solid ${item.color}` : "2px solid transparent",
        boxShadow: selected ? `0 0 16px ${item.color}88` : "none",
      }}
    >
      <div
        className="flex aspect-square items-center justify-center"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${item.color}, #0a0a0a)`,
        }}
      >
        <span className="text-3xl">{item.icon}</span>
      </div>
      <div className="px-2 py-1.5" style={{ background: "rgba(0,0,0,0.5)" }}>
        <div className="truncate text-[9px] font-mono uppercase tracking-widest text-[#c9a97a]/80">
          {item.categoria}
        </div>
        <div className="truncate text-[10px] font-bold text-white">{item.titulo}</div>
      </div>
    </button>
  )
}
