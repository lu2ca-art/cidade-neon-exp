// A SENHA DA CIDADE (22/11, o dono): até o lançamento, o jogo (/linha e as páginas
// de teste dele) só abre com a senha. A senha é o gatilho dos vídeos: quem engaja
// recebe. A conferência é no servidor (app/api/entrar) e a porta é o proxy.ts.
//
// - O valor vem de JOGO_SENHA (variável de ambiente na Vercel), nunca do código.
// - Sem JOGO_SENHA (no Mac, nos testes, na CI): a cidade fica aberta.
// - Quem acerta ganha um cookie com uma ficha (HMAC da senha). Trocar a senha na
//   Vercel invalida todas as fichas: todo mundo precisa da senha nova.
// - A senha aceita espaço, maiúscula e acento: "Bem me quer, mal me quer" vale.

export const COOKIE_ENTRADA = "cn-entrada"
export const DIAS_ENTRADA = 60

export const normalizarSenha = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "")

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("")

/** a ficha do cookie pra esta senha (a mesma conta no proxy e na API) */
export async function fichaDaEntrada(senha: string): Promise<string> {
  const enc = new TextEncoder()
  const chave = await crypto.subtle.importKey("raw", enc.encode(normalizarSenha(senha)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  return hex(await crypto.subtle.sign("HMAC", chave, enc.encode("cidade-neon:entrada:v1")))
}

/** o "volta" do link: só caminhos daqui (nunca outro site) */
export function voltaSegura(v: string | null | undefined): string {
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return "/linha"
  return v
}
