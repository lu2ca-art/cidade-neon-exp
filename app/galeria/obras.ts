// As obras que você pinta (CN-21): ficam no aparelho e as últimas vão pra
// parede da galeria. Imagem pequena em JPEG pra caber no localStorage.
// Na parede elas ficam à venda (o mercado da cidade): o preço é seu, e a
// vendida ganha a bolinha vermelha.

export interface Obra { id: string; nome: string; img: string; quando: number; preco?: number; vendida?: number }

const CHAVE = "cn-galeria-obras"
export const MAX_OBRAS = 9
export const PRECO_INICIAL = 20

export function lerObras(): Obra[] {
  try { return JSON.parse(localStorage.getItem(CHAVE) || "[]") } catch { return [] }
}

export function guardarObra(o: Obra): boolean {
  const todas = [o, ...lerObras()].slice(0, MAX_OBRAS)
  try { localStorage.setItem(CHAVE, JSON.stringify(todas)); return true } catch { return false }
}

export function atualizarObra(id: string, mud: Partial<Obra>): Obra[] {
  const todas = lerObras().map((o) => (o.id === id ? { ...o, ...mud } : o))
  try { localStorage.setItem(CHAVE, JSON.stringify(todas)) } catch {}
  return todas
}

export function apagarObra(id: string) {
  try { localStorage.setItem(CHAVE, JSON.stringify(lerObras().filter((o) => o.id !== id))) } catch {}
}
