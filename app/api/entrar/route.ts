// A senha da cidade (lib/entrada.ts): confere no servidor e, no acerto, deixa a
// ficha no cookie (httpOnly, 60 dias). Devolve só sim/não.
// Limite: 8 tentativas por minuto por IP (em memória, por instância).

import { NextResponse, type NextRequest } from "next/server"
import { COOKIE_ENTRADA, DIAS_ENTRADA, fichaDaEntrada, normalizarSenha } from "@/lib/entrada"

const JANELA = 60_000
const MAX = 8
const tentativas = new Map<string, number[]>()

function liberado(ip: string) {
  const agora = Date.now()
  const rec = (tentativas.get(ip) ?? []).filter((t) => agora - t < JANELA)
  if (rec.length >= MAX) { tentativas.set(ip, rec); return false }
  rec.push(agora)
  tentativas.set(ip, rec)
  if (tentativas.size > 5000) for (const [k, v] of tentativas) if (!v.some((t) => agora - t < JANELA)) tentativas.delete(k)
  return true
}

export async function POST(req: NextRequest) {
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "?"
  if (!liberado(ip)) return NextResponse.json({ ok: false, espere: true }, { status: 429, headers })
  let senha = ""
  try {
    const corpo = (await req.json()) as { senha?: unknown }
    if (typeof corpo.senha === "string") senha = corpo.senha.slice(0, 200)
  } catch { /* corpo inválido: não confere */ }
  const certa = process.env.JOGO_SENHA
  // sem senha na Vercel a cidade está aberta: qualquer coisa entra
  if (!certa) return NextResponse.json({ ok: true }, { headers })
  if (!senha || normalizarSenha(senha) !== normalizarSenha(certa)) return NextResponse.json({ ok: false }, { status: 401, headers })
  const res = NextResponse.json({ ok: true }, { headers })
  res.cookies.set(COOKIE_ENTRADA, await fichaDaEntrada(certa), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: DIAS_ENTRADA * 24 * 3600,
  })
  return res
}
