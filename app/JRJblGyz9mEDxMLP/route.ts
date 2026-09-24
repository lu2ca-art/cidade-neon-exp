import { PANEL_HTML } from "./content"

// Painel interno "Central Cidade Neon" — sem link em nenhum lugar do site,
// só acessível por quem tem esta URL. Não é proteção por senha, é
// obscuridade: cabeçalho noindex/nofollow reforça que não deve aparecer
// em buscadores nem ser referenciado de outra página.
export async function GET() {
  return new Response(PANEL_HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Cache-Control": "no-store",
    },
  })
}
