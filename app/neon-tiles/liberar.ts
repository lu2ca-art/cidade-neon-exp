// A SENHA DE TESTE do GUITAR DRIVER (LU2CA, 02/11): digitada em OPÇÕES, abre
// o jogo inteiro desde o início — todos os palcos, todas as faixas (inclusive
// as que ainda não lançaram) e todos os duelos — sem precisar jogar a cidade.
// Vale só neste aparelho (localStorage) e não mexe no save de verdade: travar
// de novo volta tudo como estava. No código fica só o hash da senha.

const CHAVE = "cn-gd-tudo"
const HASH = "92cc1f3625c668c0d069e6600d2b21497b7700826ff7b61259339ecd6cfd47cb"

export function tudoLiberado(): boolean {
  if (typeof window === "undefined") return false
  try { return localStorage.getItem(CHAVE) === HASH } catch { return false }
}

async function sha256(t: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t))
  return Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("")
}

export async function tentarSenha(senha: string): Promise<boolean> {
  try {
    const h = await sha256(senha.trim().toLowerCase())
    if (h !== HASH) return false
    localStorage.setItem(CHAVE, h)
    return true
  } catch {
    return false
  }
}

export function travarDeNovo() {
  try { localStorage.removeItem(CHAVE) } catch {}
}
