// A senha dos outros álbuns (CN, vol.2, live, xenom, crypto). A conferência
// mora aqui, no servidor: o valor vem de ALBUM_SENHA (variável de ambiente) e
// nunca vai pro navegador. Devolve só sim/não (e, no sim, o convite do
// untitled, que também não fica mais no código do cliente).
// Sem ALBUM_SENHA definida: falha fechada (nunca confere).
// Limite: 5 tentativas por minuto por IP (em memória; cada instância conta a
// sua, e o firewall da Vercel limita /api por cima).

import { NextResponse, type NextRequest } from "next/server"
import { createHash, timingSafeEqual } from "node:crypto"

const CONVITE = "https://untitled.stream/invite/CPq7Z1J2Og32UEDsFfK9k"
const JANELA = 60_000
const MAX = 5
const tentativas = new Map<string, number[]>()

const hash = (s: string) => createHash("sha256").update(s.trim().toLowerCase()).digest()

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
  const certa = process.env.ALBUM_SENHA
  if (!certa || !senha) return NextResponse.json({ ok: false }, { status: 401, headers })
  const ok = timingSafeEqual(hash(senha), hash(certa))
  return ok ? NextResponse.json({ ok: true, url: CONVITE }, { headers }) : NextResponse.json({ ok: false }, { status: 401, headers })
}
