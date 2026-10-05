// OS DISCOS da loja (05/10, LU2CA): cada gênero é um disco, todos pelo mesmo
// preço em NEON (a moeda do povo, fictícia). O que a pessoa compra vai pro
// toca-discos da Kombi e toca o disco inteiro, faixa por faixa. Os arquivos
// moram no Vercel Blob (comprimidos a 96 kbps), a lista em discos.json.
// O acervo antigo (domínio público) é de todo mundo, de graça.

import faixasJson from "./discos.json"
import vinis from "./vinis.json"
import type { Motivo } from "./capa"

export const PRECO_DISCO = 100

export interface Faixa { titulo: string; autor: string; src: string; dur: number }
export interface DiscoLoja { id: string; titulo: string; motivo: Motivo; a: string; b: string; faixas: Faixa[]; gratis?: boolean }

const META: Record<string, { titulo: string; motivo: Motivo; a: string; b: string }> = {
  "hip-hop": { titulo: "Hip Hop", motivo: "letras", a: "#ffc857", b: "#ff3fb0" },
  pop: { titulo: "Pop", motivo: "circulos", a: "#ff7ad9", b: "#7fe8ff" },
  rnb: { titulo: "R&B", motivo: "lua", a: "#ffd9a0", b: "#7a3cff" },
  rock: { titulo: "Rock", motivo: "raio", a: "#ff5b3a", b: "#ffe14d" },
  funky: { titulo: "Funky", motivo: "ondas-fortes", a: "#ff9f1c", b: "#b38cff" },
  eletronic: { titulo: "Eletrônica", motivo: "grade", a: "#ff3fb0", b: "#2fe8ff" },
  latin: { titulo: "Latina", motivo: "sol", a: "#ffc857", b: "#ff4d4d" },
  bossa: { titulo: "Bossa", motivo: "mar", a: "#ffd166", b: "#3aa0ff" },
  hindi: { titulo: "Hindi", motivo: "mandala", a: "#ff8a3d", b: "#e8318a" },
  "middle-east": { titulo: "Oriente Médio", motivo: "duna", a: "#ffe0a8", b: "#c97b3a" },
}

const dados = faixasJson as Record<string, { genero: string; faixas: Faixa[] }>
// títulos como vieram da biblioteca: limpa o que é ruído de catálogo
const limpar = (f: Faixa): Faixa => ({
  ...f,
  titulo: f.titulo.replace(/\s*\(Clean Version\)/i, "").replace(/\(Instrumental Version\)/i, "(instrumental)").trim(),
  autor: f.autor.replace(/\s+/g, " ").trim(),
})
export const DISCOS: DiscoLoja[] = Object.keys(META)
  .filter((id) => dados[id]?.faixas.length)
  .map((id) => ({ id, ...META[id], faixas: dados[id].faixas.map(limpar) }))

export const ACERVO: DiscoLoja = {
  id: "acervo",
  titulo: "Acervo antigo",
  motivo: "vinil",
  a: "#e6d3a3",
  b: "#5a4630",
  gratis: true,
  faixas: (vinis as { titulo: string; autor: string; src: string }[]).map((v) => ({ titulo: v.titulo, autor: v.autor, src: v.src, dur: 0 })),
}

export const TODOS = [ACERVO, ...DISCOS]
export function discoPorId(id: string) { return TODOS.find((d) => d.id === id) ?? null }
// os discos que tocam na Kombi: o acervo (sempre) + os comprados
export function discosDaKombi(comprados: string[]) { return [ACERVO, ...DISCOS.filter((d) => comprados.includes(d.id))] }
export function duracao(s: number) { return s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "" }
