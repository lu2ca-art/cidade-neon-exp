"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import "../../linha/linha.css"
import { Jornal } from "../../linha/disco/Jornal"
import type { Manchete } from "../../linha/disco/historia"

// ?publico=40 (plateia) · ?imagem=/images/album-cover.jpg (foto de arquivo ou URL do Blob)
function Cena() {
  const q = useSearchParams()
  const m: Manchete = {
    id: 7, missao: "nectar", titulo: "40 pessoas: o show na quadra que ninguém esperava", linha: "as máquinas registraram o barulho como falha elétrica",
    pop: 6, neon: 12, modo: "tocar", nota: 62, publico: Number(q.get("publico") ?? 40),
    ...(q.get("imagem") ? { imagem: q.get("imagem")! } : {}),
  }
  return <div style={{ position: "fixed", inset: 0 }}><Jornal m={m} cor="#ff4fa3" onFechar={() => {}} /></div>
}

export function Vitrine() {
  return <Suspense><Cena /></Suspense>
}
