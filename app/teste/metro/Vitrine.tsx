"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { Metro } from "@/app/linha/metro/Metro"

function Dentro() {
  const q = useSearchParams()
  const a = q.get("auto")
  const auto = a === null ? null : Math.max(0, Math.min(1, Number(a) || 0))
  const s = Number(q.get("semente"))
  return <Metro expor auto={auto} semente={Number.isFinite(s) && s > 0 ? s : 222} semIntro={q.has("direto")} />
}

export function Vitrine() {
  return <Suspense fallback={null}><Dentro /></Suspense>
}
