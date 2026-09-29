// Os bairros da cidade, um por gás nobre. INSPIRAÇÃO INTERNA: o gás/elemento
// nunca aparece na tela (decisão do LU2CA) — só o nome do lugar.
// Neon e Xenom (do Subúrbio Xenom)
// já vinham dos gases; o resto da família virou lugar. A cor de cada bairro
// é a cor real da descarga do gás num tubo de neon:
//
//   He  hélio      pêssego / rosa pálido   → o mirante (mais leve que o ar)
//   Ne  neônio     vermelho-laranja        → cidade neon vol.1, o centro
//   Ar  argônio    lavanda / violeta       → vol.2 em obra
//   Kr  criptônio  branco-lilás gelado     → território do NÚCLEO
//   Xe  xenônio    azul-violeta            → subúrbio xenom
//   Rn  radônio    vermelho (radioativo)   → o túnel abandonado
//
// Regra de cor (skill world-design): a cor do gás é o AMBIENTE do bairro;
// cores de estação/personagem continuam como acento (portais, colunas).

export type DistritoId = "neonio" | "helio" | "xenonio" | "radonio" | "criptonio" | "argonio"

export interface Distrito {
  id: DistritoId
  simbolo: string
  numero: number
  gas: string
  lugar: string
  de: number // fração do loop (0..1)
  ate: number
  nevoa: string // cor do ar
  ceu: string // tinta do horizonte
  luz: string[] // postes
  janela: string // tinta das janelas
  trilho: [string, string] // bordas esquerda/direita
  predio: "torres" | "casas" | "aberto" | "tunel" | "brancas" | "obra"
}

export const DISTRITOS: Distrito[] = [
  {
    id: "neonio", simbolo: "Ne", numero: 10, gas: "neônio", lugar: "cidade neon · vol.1", de: 0, ate: 0.5,
    nevoa: "#1a0f24", ceu: "#4a1a30", luz: ["#ff6a35", "#ff3fb0", "#2fe8ff", "#ffc857"], janela: "#ffcf8a",
    trilho: ["#2fe8ff", "#ff6a35"], predio: "torres",
  },
  {
    id: "helio", simbolo: "He", numero: 2, gas: "hélio", lugar: "o mirante", de: 0.5, ate: 0.6,
    nevoa: "#241722", ceu: "#6a3848", luz: ["#ffc2a8", "#ffe1c8"], janela: "#ffd9bf",
    trilho: ["#ffc2a8", "#ffe1c8"], predio: "aberto",
  },
  {
    id: "xenonio", simbolo: "Xe", numero: 54, gas: "xenônio", lugar: "subúrbio xenom", de: 0.6, ate: 0.74,
    nevoa: "#0c0f2e", ceu: "#1f2a78", luz: ["#6d7bff", "#8f9dff", "#b3a6ff"], janela: "#9aa8ff",
    trilho: ["#6d7bff", "#ff2d78"], predio: "casas",
  },
  {
    id: "radonio", simbolo: "Rn", numero: 86, gas: "radônio", lugar: "o túnel", de: 0.74, ate: 0.83,
    nevoa: "#1a0406", ceu: "#3a0a0c", luz: ["#ff2436", "#ff5b3d"], janela: "#ff4a3d",
    trilho: ["#ff2436", "#ff2436"], predio: "tunel",
  },
  {
    id: "criptonio", simbolo: "Kr", numero: 36, gas: "criptônio", lugar: "território do núcleo", de: 0.83, ate: 0.93,
    nevoa: "#15161f", ceu: "#3a3a52", luz: ["#e6f0ff", "#d7d2ff"], janela: "#eef3ff",
    trilho: ["#e6f0ff", "#e6f0ff"], predio: "brancas",
  },
  {
    id: "argonio", simbolo: "Ar", numero: 18, gas: "argônio", lugar: "vol.2 · em obra", de: 0.93, ate: 1,
    nevoa: "#150f28", ceu: "#3c2a6a", luz: ["#b38cff", "#9b8cff"], janela: "#c8b6ff",
    trilho: ["#b38cff", "#9b8cff"], predio: "obra",
  },
]

export function distritoEm(fracao: number): Distrito {
  const f = ((fracao % 1) + 1) % 1
  return DISTRITOS.find((d) => f >= d.de && f < d.ate) ?? DISTRITOS[0]
}

export function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}
