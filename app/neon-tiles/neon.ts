// A grana do GUITAR DRIVER é o NEON do jogo (uma moeda só).
//
// Dentro do celular (/linha abre o app numa janela), quem guarda o saldo é o
// jogo: o app pede pra somar/gastar por mensagem e o jogo responde com o
// saldo novo. Aberto sozinho (lu2ca.art/neon-tiles), mexe direto no save do
// jogo no aparelho.

const CHAVE = "cn-linha-222"

function lerLocal(): number {
  try {
    const s = JSON.parse(localStorage.getItem(CHAVE) || "{}")
    return Math.max(0, Math.round(s.neon ?? 0))
  } catch {
    return 0
  }
}

function gravarLocal(delta: number): { ok: boolean; neon: number } {
  try {
    const raw = localStorage.getItem(CHAVE)
    const s = raw ? JSON.parse(raw) : null
    const atual = Math.max(0, Math.round(s?.neon ?? 0))
    if (delta < 0 && atual + delta < 0) return { ok: false, neon: atual }
    // sem save do jogo ainda: guarda numa conta própria até o jogo existir
    if (!s) {
      const n = Math.max(0, Number(localStorage.getItem("cn-gd-neon") || 0) + delta)
      localStorage.setItem("cn-gd-neon", String(n))
      return { ok: true, neon: n }
    }
    s.neon = atual + delta
    localStorage.setItem(CHAVE, JSON.stringify(s))
    return { ok: true, neon: s.neon }
  } catch {
    return { ok: false, neon: 0 }
  }
}

const dentroDoJogo = () => typeof window !== "undefined" && window.parent !== window

export function saldoInicial(): number {
  if (typeof window === "undefined") return 0
  const n = lerLocal()
  return n || Number(localStorage.getItem("cn-gd-neon") || 0)
}

let seq = 0
// muda o saldo (positivo ganha, negativo gasta). Resolve com o saldo novo e se deu certo.
export function mudarNeon(delta: number): Promise<{ ok: boolean; neon: number }> {
  if (!dentroDoJogo()) return Promise.resolve(gravarLocal(delta))
  const id = `gd-${Date.now()}-${seq++}`
  return new Promise((res) => {
    const fim = setTimeout(() => { window.removeEventListener("message", h); res({ ok: false, neon: lerLocal() }) }, 2500)
    const h = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.tipo !== "cn-neon-saldo" || e.data.id !== id) return
      clearTimeout(fim)
      window.removeEventListener("message", h)
      res({ ok: !!e.data.ok, neon: Number(e.data.neon) || 0 })
    }
    window.addEventListener("message", h)
    window.parent.postMessage({ tipo: "cn-neon", delta, id }, window.location.origin)
  })
}

/* ─── a popularidade (o quanto a cidade te conhece, 0–100) ─── */
// mora no save do jogo; o Guitar Driver lê dali e pede pra mudar como o NEON
export function lerLinha(): { casa?: boolean; tutorial?: string[]; objetos?: string[]; reliquias?: string[]; popularidade?: number } {
  try { return JSON.parse(localStorage.getItem(CHAVE) || "{}") } catch { return {} }
}

export function mudarPopularidade(delta: number): Promise<number> {
  if (!dentroDoJogo()) {
    try {
      const raw = localStorage.getItem(CHAVE)
      if (!raw) return Promise.resolve(0)
      const s = JSON.parse(raw)
      s.popularidade = Math.max(0, Math.min(100, (s.popularidade ?? 0) + delta))
      localStorage.setItem(CHAVE, JSON.stringify(s))
      return Promise.resolve(s.popularidade)
    } catch { return Promise.resolve(0) }
  }
  return new Promise((res) => {
    const id = `pop-${Date.now()}`
    const fim = setTimeout(() => { window.removeEventListener("message", h); res(lerLinha().popularidade ?? 0) }, 2500)
    const h = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.tipo !== "cn-pop-ok" || e.data.id !== id) return
      clearTimeout(fim)
      window.removeEventListener("message", h)
      res(Number(e.data.popularidade) || 0)
    }
    window.addEventListener("message", h)
    window.parent.postMessage({ tipo: "cn-pop", delta, id }, window.location.origin)
  })
}
