// Teoria do violão (acordes, desenhos, campo harmônico). Veio do branch
// feature/game/t08-violao (violao-teoria.ts) pra o violão do mundo (disco/Violao.tsx).
export const NOMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
export const AFINACAO = [40, 45, 50, 55, 59, 64] // E A D G B E (MIDI), grave → agudo
export const CASAS = 12
export const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

export type Q = "" | "m" | "7" | "°"
export type Acorde = { r: number; q: Q }
export const nomeAc = (a: Acorde) => `${NOMES[a.r]}${a.q}`

// desenhos de verdade (grave → agudo; null = não toca)
const ABERTOS: Record<string, (number | null)[]> = {
  C: [null, 3, 2, 0, 1, 0], D: [null, null, 0, 2, 3, 2], E: [0, 2, 2, 1, 0, 0], F: [1, 3, 3, 2, 1, 1],
  G: [3, 2, 0, 0, 0, 3], A: [null, 0, 2, 2, 2, 0], B: [null, 2, 4, 4, 4, 2],
  Cm: [null, 3, 5, 5, 4, 3], Dm: [null, null, 0, 2, 3, 1], Em: [0, 2, 2, 0, 0, 0], Fm: [1, 3, 3, 1, 1, 1],
  Gm: [3, 5, 5, 3, 3, 3], Am: [null, 0, 2, 2, 1, 0], Bm: [null, 2, 4, 4, 3, 2],
  C7: [null, 3, 2, 3, 1, 0], D7: [null, null, 0, 2, 1, 2], E7: [0, 2, 0, 1, 0, 0], G7: [3, 2, 0, 0, 0, 1],
  A7: [null, 0, 2, 0, 2, 0], B7: [null, 2, 1, 2, 0, 2],
}
export function desenho(a: Acorde): (number | null)[] {
  const pronto = ABERTOS[nomeAc(a)]
  if (pronto) return pronto
  if (a.q === "°") {
    // diminuto: formato fechado na 5ª corda
    const c = (a.r - 9 + 12) % 12 || 12
    return [null, c, c + 1, c + 2, c + 1, null]
  }
  // pestana: formato de Mi (6ª corda) ou de Lá (5ª), o que ficar mais baixo
  const e = (a.r - 4 + 12) % 12 || 12
  const l = (a.r - 9 + 12) % 12 || 12
  if (e <= l) {
    if (a.q === "m") return [e, e + 2, e + 2, e, e, e]
    if (a.q === "7") return [e, e + 2, e, e + 1, e, e]
    return [e, e + 2, e + 2, e + 1, e, e]
  }
  if (a.q === "m") return [null, l, l + 2, l + 2, l + 1, l]
  if (a.q === "7") return [null, l, l + 2, l, l + 2, l]
  return [null, l, l + 2, l + 2, l + 2, l]
}

// campo harmônico e cadências
export const GRAUS_MAIOR: [number, Q, string][] = [[0, "", "I"], [2, "m", "ii"], [4, "m", "iii"], [5, "", "IV"], [7, "", "V"], [9, "m", "vi"], [11, "°", "vii°"]]
export const GRAUS_MENOR: [number, Q, string][] = [[0, "m", "i"], [2, "°", "ii°"], [3, "", "III"], [5, "m", "iv"], [7, "", "V"], [8, "", "VI"], [10, "", "VII"]]
export const CADENCIAS_MAIOR: { nome: string; dica: string; graus: string[] }[] = [
  { nome: "I – V – vi – IV", dica: "a do pop: dá pra cantar quase tudo em cima", graus: ["I", "V", "vi", "IV"] },
  { nome: "I – IV – V – I", dica: "a do rock e do forró: sai e volta pra casa", graus: ["I", "IV", "V", "I"] },
  { nome: "vi – IV – I – V", dica: "a mesma do pop, começando triste", graus: ["vi", "IV", "I", "V"] },
  { nome: "ii – V – I", dica: "a do jazz e da bossa: tensão que resolve", graus: ["ii", "V", "I"] },
]
export const CADENCIAS_MENOR: { nome: string; dica: string; graus: string[] }[] = [
  { nome: "i – iv – V – i", dica: "resolve forte: o V puxa pra casa", graus: ["i", "iv", "V", "i"] },
  { nome: "i – VI – III – VII", dica: "épica, de trilha de filme", graus: ["i", "VI", "III", "VII"] },
  { nome: "i – VII – VI – V", dica: "andaluza: desce até o flamenco", graus: ["i", "VII", "VI", "V"] },
  { nome: "i – VI – VII – i", dica: "a do rap e do trap melancólico", graus: ["i", "VI", "VII", "i"] },
]
export const COMUNS: Acorde[] = [{ r: 0, q: "" }, { r: 2, q: "" }, { r: 4, q: "" }, { r: 5, q: "" }, { r: 7, q: "" }, { r: 9, q: "" }, { r: 9, q: "m" }, { r: 2, q: "m" }, { r: 4, q: "m" }]

