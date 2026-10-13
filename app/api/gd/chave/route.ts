// A chave do áudio do GUITAR DRIVER (13/10, CN-39). As camadas (a guitarra e
// o baixo separados, o resto da banda) ficam CIFRADAS no armazenamento: quem
// baixar pelo link recebe um arquivo inútil. O jogo pede a chave aqui e abre
// o áudio na memória. Só responde pra páginas do próprio site.
// O firewall da Vercel já limita /api a 30 pedidos/min por IP.

import { NextResponse, type NextRequest } from "next/server"

const PERMITIDOS = ["lu2ca.art", "www.lu2ca.art", "localhost"]

function doSite(req: NextRequest) {
  // o navegador diz de onde veio o pedido (não dá pra uma página de fora fingir)
  if (req.headers.get("sec-fetch-site") === "same-origin") return true
  const de = req.headers.get("origin") ?? req.headers.get("referer")
  if (!de) return false
  try {
    const host = new URL(de).hostname
    return PERMITIDOS.includes(host) || host.endsWith("-luccaminibal-7179s-projects.vercel.app")
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  const k = process.env.GD_CHAVE
  if (!k) return NextResponse.json({ erro: "sem chave" }, { status: 503 })
  if (!doSite(req)) return NextResponse.json({ erro: "não" }, { status: 403 })
  return NextResponse.json({ k }, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } })
}
