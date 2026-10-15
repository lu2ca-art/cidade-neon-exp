// O estilo da Kombi (a oficina, referências do LU2CA: CarX e Drift Max —
// personalizar o carro). Dados leves: a estrada lê daqui sem puxar a oficina.
// A pintura tinge a Kombi escaneada; o neon é a luz de baixo dela.

export const PINTURAS = [
  { id: "original", nome: "a de fábrica", cor: "#ffffff", preco: 0 },
  { id: "rosa", nome: "rosa 222", cor: "#ffb0d8", preco: 15 },
  { id: "ciano", nome: "ciano", cor: "#a8f0ff", preco: 15 },
  { id: "ambar", nome: "âmbar", cor: "#ffe08a", preco: 15 },
  { id: "menta", nome: "menta", cor: "#b4ffd0", preco: 15 },
  { id: "lilas", nome: "lilás", cor: "#d4c0ff", preco: 15 },
  { id: "grafite", nome: "grafite", cor: "#8a8a9a", preco: 20 },
] as const
export const NEONS = [
  { id: "rosa", nome: "rosa", cor: "#ff3fb0", preco: 0 },
  { id: "ciano", nome: "ciano", cor: "#2fe8ff", preco: 10 },
  { id: "verde", nome: "verde", cor: "#5dffa0", preco: 10 },
  { id: "ambar", nome: "âmbar", cor: "#ffc857", preco: 10 },
  { id: "roxo", nome: "roxo", cor: "#b38cff", preco: 10 },
  { id: "branco", nome: "branco", cor: "#f2eefa", preco: 10 },
] as const

export interface Estilo { pintura: string; neon: string; comprados: string[] }
const CHAVE = "cn-kombi-estilo"
const PADRAO: Estilo = { pintura: "original", neon: "rosa", comprados: ["pintura:original", "neon:rosa"] }

export function lerEstilo(): Estilo {
  try { return { ...PADRAO, ...JSON.parse(localStorage.getItem(CHAVE) || "{}") } } catch { return PADRAO }
}
export function guardarEstilo(e: Estilo) {
  try { localStorage.setItem(CHAVE, JSON.stringify(e)) } catch {}
}
export const corPintura = (e: Estilo) => PINTURAS.find((p) => p.id === e.pintura)?.cor ?? "#ffffff"
export const corNeon = (e: Estilo) => NEONS.find((p) => p.id === e.neon)?.cor ?? "#ff3fb0"
