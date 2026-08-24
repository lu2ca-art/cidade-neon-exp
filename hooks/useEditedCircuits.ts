"use client"

// Lê os circuitos do /pistas-editor via localStorage. Reativo — escuta
// evento `storage` (dispara em outras abas) + polling leve pra pegar
// atualizações da MESMA aba.

import { useEffect, useRef, useState } from "react"

export interface EditedCircuit {
  id: string
  color: string
  points: [number, number, number][]  // [x, y, z]
}

const STORAGE_KEY = "pistas-editor-v1"

// Regras aplicadas automaticamente ao JSON do editor:
// 1. Escala 1.5x em X/Z (pistas passam DENTRO e FORA da cidade)
// 2. Alturas diferentes por circuito pra evitar cruzamento visual
//    (magenta Y=2, cyan Y=8, yellow Y=14) — só se Y ainda no default
// 3. Deduplicação de pontos idênticos ou muito próximos
// 4. Ordenação por nearest-neighbor (TSP simples) pra evitar curvas
//    "voltando pra trás" que cruzam a própria pista
const SCALE = 1.5
const DEDUP_DIST_SQ = 400  // pontos a <20u são considerados o mesmo (era 5u)
const MAX_POINTS_PER_CIRCUIT = 16 // limite pra pistas não ficarem hiperlotadas
const CIRCUIT_HEIGHT: Record<string, number> = {
  magenta: 2,
  cyan: 8,
  yellow: 14,
}

function dedupePoints(points: [number, number, number][]): [number, number, number][] {
  const out: [number, number, number][] = []
  for (const p of points) {
    let dup = false
    for (const q of out) {
      const dx = p[0] - q[0]
      const dz = p[2] - q[2]
      if (dx * dx + dz * dz < DEDUP_DIST_SQ) {
        dup = true
        break
      }
    }
    if (!dup) out.push(p)
  }
  return out
}

// Ordena via "convex-hull-like": ordena pontos pelo ÂNGULO em torno do
// centroide. Isso GARANTE um loop sem cruzamento consigo mesmo (varredura
// radial), muito melhor que nearest-neighbor pra pistas fechadas.
function orderByAngleFromCentroid(points: [number, number, number][]): [number, number, number][] {
  if (points.length < 3) return points
  // centroide
  let cx = 0, cz = 0
  for (const p of points) { cx += p[0]; cz += p[2] }
  cx /= points.length; cz /= points.length
  // ordena por ângulo (varredura radial)
  return [...points].sort((a, b) => {
    const angA = Math.atan2(a[2] - cz, a[0] - cx)
    const angB = Math.atan2(b[2] - cz, b[0] - cx)
    return angA - angB
  })
}

// Remove pontos que geram ângulos MUITO agudos (>150°) — significa
// "curva voltando pra trás" ou dobra impossível. Deixa a spline suave.
function removeSharpAngles(points: [number, number, number][]): [number, number, number][] {
  if (points.length < 4) return points
  const n = points.length
  const kept: boolean[] = new Array(n).fill(true)
  const MIN_COS = -0.85 // cos(150°) ≈ -0.87. Se dot > MIN_COS, ângulo é suave; se < MIN_COS, remove.
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n]
    const cur = points[i]
    const next = points[(i + 1) % n]
    const v1x = cur[0] - prev[0]
    const v1z = cur[2] - prev[2]
    const v2x = next[0] - cur[0]
    const v2z = next[2] - cur[2]
    const l1 = Math.sqrt(v1x * v1x + v1z * v1z) || 1
    const l2 = Math.sqrt(v2x * v2x + v2z * v2z) || 1
    const cos = (v1x * v2x + v1z * v2z) / (l1 * l2)
    if (cos < MIN_COS) kept[i] = false // ângulo >150°, remove
  }
  return points.filter((_, i) => kept[i])
}

// Limita quantidade máxima de pontos, amostrando uniformemente (mantém shape).
function decimate(points: [number, number, number][], maxN: number): [number, number, number][] {
  if (points.length <= maxN) return points
  const stride = points.length / maxN
  const out: [number, number, number][] = []
  for (let i = 0; i < maxN; i++) {
    out.push(points[Math.floor(i * stride)])
  }
  return out
}

// Pipeline de simplificação: dedup 20u → limita a 16 pontos → ordena
// radialmente (loop garantido sem cruzamento próprio) → remove ângulos
// >150° (dobras impossíveis). Altura Y = base do circuito + offset editor.
function applyRules(circuit: EditedCircuit): EditedCircuit {
  const baseY = CIRCUIT_HEIGHT[circuit.id] ?? 2
  const scaled: [number, number, number][] = circuit.points.map((p) => [
    p[0] * SCALE,
    baseY + (p[1] - 2),
    p[2] * SCALE,
  ])
  const deduped = dedupePoints(scaled)
  const decimated = decimate(deduped, MAX_POINTS_PER_CIRCUIT)
  const ordered = orderByAngleFromCentroid(decimated)
  const smoothed = removeSharpAngles(ordered)
  return { ...circuit, points: smoothed }
}

// Formato salvo pelo editor tem `points` como objeto { x, y, z }.
// Convertimos aqui pra tuple [x, y, z] pra combinar com CatmullRomCurve3.
function normalize(raw: unknown): EditedCircuit[] | null {
  if (!Array.isArray(raw)) return null
  const out: EditedCircuit[] = []
  for (const c of raw) {
    if (!c || typeof c !== "object") continue
    const id = (c as { id?: string }).id
    const color = (c as { color?: string }).color
    const points = (c as { points?: unknown[] }).points
    if (!id || !color || !Array.isArray(points)) continue
    const pts: [number, number, number][] = []
    for (const p of points) {
      if (Array.isArray(p) && p.length === 3) {
        pts.push([Number(p[0]), Number(p[1]), Number(p[2])])
      } else if (p && typeof p === "object") {
        const px = (p as { x?: number }).x
        const py = (p as { y?: number }).y
        const pz = (p as { z?: number }).z
        if (typeof px === "number" && typeof py === "number" && typeof pz === "number") {
          pts.push([px, py, pz])
        }
      }
    }
    if (pts.length > 0) out.push(applyRules({ id, color, points: pts }))
  }
  return out.length > 0 ? out : null
}

export function useEditedCircuits(): EditedCircuit[] | null {
  const [data, setData] = useState<EditedCircuit[] | null>(() => {
    if (typeof window === "undefined") return null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      return normalize(JSON.parse(raw))
    } catch {
      return null
    }
  })

  // Guarda o último raw lido pra evitar setState quando localStorage não mudou.
  // Sem esse dedup, o polling dispara rebuild completo da cidade a cada 2s.
  const lastRawRef = useRef<string>("")
  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw || raw === lastRawRef.current) return
        lastRawRef.current = raw
        const norm = normalize(JSON.parse(raw))
        if (norm) setData(norm)
      } catch {}
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) read()
    }
    window.addEventListener("storage", onStorage)
    const id = setInterval(read, 2000)
    return () => {
      window.removeEventListener("storage", onStorage)
      clearInterval(id)
    }
  }, [])

  return data
}
