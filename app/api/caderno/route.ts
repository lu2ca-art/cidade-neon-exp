// O caderno do dono: cada observação que o LU2CA anota jogando (texto, etiquetas
// e o estado do jogo naquele momento) chega aqui.
// Cada nota vira um arquivo no Vercel Blob (caderno/AAAA-MM-DD/<id>.json: o mesmo id
// sobrescreve, então reenviar não duplica) — funciona na prévia e na produção.
// Também vai pro PostHog como "caderno_nota" onde a chave existir (só produção), e
// rodando no Mac (dev) grava em RELATORIOS/caderno/AAAA-MM-DD.jsonl.
// Limites: 120 notas por minuto por IP (o "enviar todas" manda dezenas de uma vez), texto até 4000.

import { NextResponse, type NextRequest } from "next/server"
import { list, put } from "@vercel/blob"

const JANELA = 60_000
const MAX = 120
const envios = new Map<string, number[]>()

function liberado(ip: string) {
  const agora = Date.now()
  const rec = (envios.get(ip) ?? []).filter((t) => agora - t < JANELA)
  if (rec.length >= MAX) { envios.set(ip, rec); return false }
  rec.push(agora)
  envios.set(ip, rec)
  if (envios.size > 2000) for (const [k, v] of envios) if (!v.some((t) => agora - t < JANELA)) envios.delete(k)
  return true
}

type Nota = { id: string; quando: string; texto: string; tags: string[]; estado?: Record<string, unknown> }

function limpar(c: unknown): Nota | null {
  if (!c || typeof c !== "object") return null
  const o = c as Record<string, unknown>
  const texto = typeof o.texto === "string" ? o.texto.slice(0, 4000) : ""
  const tags = Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === "string").slice(0, 10).map((t) => t.slice(0, 30)) : []
  if (!texto.trim() && !tags.length) return null
  const estado = o.estado && typeof o.estado === "object" && JSON.stringify(o.estado).length < 20_000 ? (o.estado as Record<string, unknown>) : undefined
  return {
    id: typeof o.id === "string" && /^[\w-]{8,60}$/.test(o.id) ? o.id : crypto.randomUUID(),
    quando: typeof o.quando === "string" ? o.quando.slice(0, 40) : new Date().toISOString(),
    texto, tags, estado,
  }
}

export async function POST(req: NextRequest) {
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "?"
  if (!liberado(ip)) return NextResponse.json({ ok: false, espere: true }, { status: 429, headers })
  let nota: Nota | null = null
  try { nota = limpar(await req.json()) } catch { /* corpo inválido */ }
  if (!nota) return NextResponse.json({ ok: false }, { status: 400, headers })

  const destinos: string[] = []

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await put(`caderno/${nota.quando.slice(0, 10)}/${nota.id}.json`, JSON.stringify(nota), { access: "public", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true })
      destinos.push("blob")
    } catch { /* segue pros outros */ }
  }

  if (process.env.NODE_ENV === "development") {
    try {
      const { appendFile, mkdir } = await import("node:fs/promises")
      const pasta = `${process.cwd()}/RELATORIOS/caderno`
      await mkdir(pasta, { recursive: true })
      await appendFile(`${pasta}/${nota.quando.slice(0, 10)}.jsonl`, JSON.stringify(nota) + "\n")
      destinos.push("arquivo")
    } catch { /* segue pro PostHog */ }
  }

  const chave = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (chave) {
    try {
      const r = await fetch("https://eu.i.posthog.com/capture/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: chave,
          event: "caderno_nota",
          distinct_id: "lu2ca-dono",
          timestamp: nota.quando,
          properties: { nota_id: nota.id, texto: nota.texto, tags: nota.tags, estado: nota.estado, $process_person_profile: false },
        }),
      })
      if (r.ok) destinos.push("posthog")
    } catch { /* fica só no arquivo / no aparelho */ }
  }

  return destinos.length
    ? NextResponse.json({ ok: true, destinos }, { headers })
    : NextResponse.json({ ok: false }, { status: 502, headers })
}

// (03/11) o Claude lê as últimas notas pela prévia (protegida pela Vercel):
// GET /api/caderno?n=50 → as N mais novas, da mais nova pra mais velha.
// Na produção não responde (as notas não ficam públicas).
export async function GET(req: NextRequest) {
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }
  if (process.env.VERCEL_ENV === "production" || !process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ ok: false }, { status: 404, headers })
  const n = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get("n")) || 50))
  const blobs: { url: string; uploadedAt: Date }[] = []
  let cursor: string | undefined
  do {
    const r = await list({ prefix: "caderno/", limit: 1000, cursor })
    blobs.push(...r.blobs)
    cursor = r.hasMore ? r.cursor : undefined
  } while (cursor)
  blobs.sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))
  const notas = await Promise.all(blobs.slice(0, n).map(async (b) => { try { return await (await fetch(b.url, { cache: "no-store" })).json() } catch { return null } }))
  return NextResponse.json({ ok: true, total: blobs.length, notas: notas.filter(Boolean) }, { headers })
}
