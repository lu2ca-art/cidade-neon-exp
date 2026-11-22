// A porta da cidade (lib/entrada.ts): sem a ficha da senha no cookie, quem tenta
// abrir o jogo volta pra rádio da página inicial, com o caminho guardado em ?volta=
// (os links de teste, ?parte=..., seguem funcionando depois da senha).
import { NextResponse, type NextRequest } from "next/server"
import { COOKIE_ENTRADA, fichaDaEntrada } from "@/lib/entrada"

export async function proxy(req: NextRequest) {
  const senha = process.env.JOGO_SENHA
  if (!senha) return NextResponse.next()
  const ficha = req.cookies.get(COOKIE_ENTRADA)?.value
  if (ficha && ficha === (await fichaDaEntrada(senha))) return NextResponse.next()
  const u = new URL("/", req.url)
  u.search = ""
  u.searchParams.set("volta", req.nextUrl.pathname + req.nextUrl.search)
  return NextResponse.redirect(u)
}

export const config = {
  matcher: ["/linha", "/linha/:path*", "/teste", "/teste/:path*", "/mapa-ilustrado", "/mapa-ilustrado/:path*"],
}
