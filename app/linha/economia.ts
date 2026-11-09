// A ECONOMIA (T03, 28/10): as regras de quem ganha, quem gasta e com o quê.
// Os números e os itens (preços, quais roupas, quais carros) são [gosto] e
// moram num arquivo só: economia-rascunho.ts.
//
//   Água$ (save.agua)   (bíblia §15, 08/11) a moeda, uma só: a gota. Ganha: as
//                       gotas da pista (e do deserto, bem mais raras), a porta
//                       de cada missão e o show na rua (o trampo). Gasta: a
//                       loja (discos, instrumentos, carros, roupas), o posto e
//                       o mecânico, que só faz melhoria de DESEMPENHO na Kombi.
//   popularidade        não se gasta. Sobe com o show e aumenta o cachê.
//
// Tudo que mexe em dinheiro passa por aqui (ganhar, gastar, comprar), e o
// save antigo é acertado no carregar (migrarEconomia), sem perder nada.

import type { Save } from "./estado"
import { DISCOS } from "./discos"
import { comHistoria, historiaDe } from "./disco/historia"
import { CARROS, INSTRUMENTOS, MELHORIAS, PAGA, PRECO_DISCO, ROUPAS, naLoja, type Categoria, type ItemRascunho, type MelhoriaId } from "./economia-rascunho"

export type Moeda = "agua" // (§15) uma moeda só; o neon$ de save antigo soma na migração

export interface ItemLoja { id: string; cat: Categoria; nome: string; preco: number; desc: string; cor: string; soDepois?: ItemRascunho["soDepois"] }

export const CATEGORIAS: { id: Categoria; nome: string }[] = [
  { id: "disco", nome: "discos" },
  { id: "instrumento", nome: "instrumentos" },
  { id: "carro", nome: "carros" },
  { id: "roupa", nome: "roupas" },
]

// o catálogo da loja: o id é "categoria:nome" ("disco:rock", "roupa:bone")
export const CATALOGO: ItemLoja[] = [
  ...DISCOS.map((d) => ({ id: `disco:${d.id}`, cat: "disco" as const, nome: d.titulo, preco: PRECO_DISCO, desc: `${d.faixas.length} faixas`, cor: d.a })),
  ...INSTRUMENTOS.map((i) => ({ ...i, id: `instrumento:${i.id}`, cat: "instrumento" as const })),
  ...CARROS.map((i) => ({ ...i, id: `carro:${i.id}`, cat: "carro" as const })),
  ...ROUPAS.map((i) => ({ ...i, id: `roupa:${i.id}`, cat: "roupa" as const })),
]
export const itemPorId = (id: string) => CATALOGO.find((i) => i.id === id) ?? null
// (A8, lote D) com o save, só o que já aparece na loja (a guitarra, depois de perder o violão)
export const daCategoria = (cat: Categoria, s?: Save) => CATALOGO.filter((i) => i.cat === cat && (!s || naLoja(i, historiaDe(s))))

// ── o saldo ──
const inteiro = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0)
export const saldo = (s: Save, m: Moeda = "agua") => inteiro(s[m])

// ganha (n > 0). Nunca deixa o saldo quebrado nem negativo
export function ganhar(s: Save, n: number, m: Moeda = "agua"): Save {
  const d = Math.round(n)
  if (!Number.isFinite(d) || d <= 0) return s
  return { ...s, [m]: saldo(s, m) + d }
}
export const podePagar = (s: Save, preco: number, m: Moeda = "agua") => saldo(s, m) >= preco
// gasta: sem saldo, devolve null (e nada muda)
export function gastar(s: Save, preco: number, m: Moeda = "agua"): Save | null {
  const p = Math.max(0, Math.round(preco))
  if (!podePagar(s, p, m)) return null
  return { ...s, [m]: saldo(s, m) - p }
}

// ── a loja (Água$) ──
const nomeDe = (id: string) => id.slice(id.indexOf(":") + 1)
export function tem(s: Save, id: string): boolean {
  if (id.startsWith("disco:")) return (s.discos ?? []).includes(nomeDe(id))
  return (s.compras ?? []).includes(id)
}
export type Compra = { ok: true; save: Save } | { ok: false; motivo: "nao-existe" | "ja-tem" | "sem-grana" }
export function comprar(s: Save, id: string): Compra {
  const it = itemPorId(id)
  if (!it || !naLoja(it, historiaDe(s))) return { ok: false, motivo: "nao-existe" }
  if (tem(s, id)) return { ok: false, motivo: "ja-tem" }
  const pago = gastar(s, it.preco)
  if (!pago) return { ok: false, motivo: "sem-grana" }
  // o disco vai pro toca-discos da Kombi (save.discos, que a Kombi lê); o resto, pras compras
  if (it.cat === "disco") return { ok: true, save: { ...pago, discos: [...(pago.discos ?? []), nomeDe(id)] } }
  return { ok: true, save: { ...pago, compras: [...(pago.compras ?? []), id] } }
}

// ── a oficina (água): só desempenho ──
export const melhoriaPorId = (id: string) => MELHORIAS.find((m) => m.id === id) ?? null
export function comprarMelhoria(s: Save, id: string): Compra {
  const m = melhoriaPorId(id)
  if (!m) return { ok: false, motivo: "nao-existe" }
  if ((historiaDe(s).mods ?? []).includes(id)) return { ok: false, motivo: "ja-tem" }
  const pago = gastar(s, m.agua, "agua")
  if (!pago) return { ok: false, motivo: "sem-grana" }
  return { ok: true, save: comHistoria(pago, (h) => ({ ...h, mods: [...new Set([...(h.mods ?? []), m.id as MelhoriaId])] })) }
}

// ── o que entra ──
// o cachê do show na rua: um fixo, a nota (0–1) e a fama vezes a nota
export function cacheDoShow(nota: number, popularidade: number): number {
  const n = Math.max(0, Math.min(1, nota || 0)), pop = Math.max(0, Math.min(100, popularidade || 0))
  return Math.round(PAGA.show.fixo + n * PAGA.show.porNota + pop * PAGA.show.porFama * n)
}

// ── o save antigo (chamado no carregar) ──
// 1: (T03) os saldos viram inteiros ≥ 0; a grana que o Guitar Driver guardou
// fora do jogo (cn-gd-neon, quando ainda não tinha save) entra no saldo; os
// discos sem repetição e só os que existem; as compras novas começam vazias
// 2: (§15, 08/11) o neon$ soma na água e o campo sai do save: sem o campo, não
// tem como somar duas vezes
export const VERSAO_ECONOMIA = 2
const DISCOS_IDS = new Set(DISCOS.map((d) => d.id))

function juntarNeon(s: Save): Save {
  if (!("neon" in s)) return s
  const { neon, ...resto } = s
  return { ...resto, agua: inteiro(s.agua) + inteiro(neon) }
}

export function migrarEconomia(bruto: Save, guardadoFora = 0): Save {
  // (fora do teste de versão: um save já na 2 que ainda tenha neon, de uma aba velha, também soma)
  const s = juntarNeon(bruto)
  const v = s.economia ?? 0
  if (v >= VERSAO_ECONOMIA) return guardadoFora > 0 ? ganhar(s, guardadoFora) : s
  if (v === 1) return { ...s, agua: inteiro(s.agua) + inteiro(guardadoFora), economia: VERSAO_ECONOMIA }
  return {
    ...s,
    agua: inteiro(s.agua) + inteiro(guardadoFora),
    popularidade: Math.min(100, inteiro(s.popularidade)),
    discos: [...new Set((s.discos ?? []).filter((d) => DISCOS_IDS.has(d)))],
    compras: [...new Set((s.compras ?? []).filter((c) => typeof c === "string" && c.includes(":")))],
    economia: VERSAO_ECONOMIA,
  }
}
