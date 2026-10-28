"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { Sinuca } from "@/app/linha/sinuca/Sinuca"
import type { Modo } from "@/app/linha/sinuca/regras"

function Dentro() {
  const q = useSearchParams()
  const m = q.get("modo")
  const modo: Modo | undefined = m === "mubarak" || m === "pratica" ? m : undefined
  return <Sinuca modo={modo} expor />
}

export function Vitrine() {
  return <Suspense fallback={null}><Dentro /></Suspense>
}
