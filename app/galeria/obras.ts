// As obras que você pinta (CN-21): ficam no aparelho e as últimas vão pra
// parede da galeria. Imagem pequena em JPEG pra caber no localStorage.

export interface Obra { id: string; nome: string; img: string; quando: number }

const CHAVE = "cn-galeria-obras"
export const MAX_OBRAS = 9

export function lerObras(): Obra[] {
  try { return JSON.parse(localStorage.getItem(CHAVE) || "[]") } catch { return [] }
}

export function guardarObra(o: Obra): boolean {
  const todas = [o, ...lerObras()].slice(0, MAX_OBRAS)
  try { localStorage.setItem(CHAVE, JSON.stringify(todas)); return true } catch { return false }
}

export function apagarObra(id: string) {
  try { localStorage.setItem(CHAVE, JSON.stringify(lerObras().filter((o) => o.id !== id))) } catch {}
}
