// ─── autoplay — padrões rítmicos prontos (modo PLAY) ────────────────────────
// Cada padrão só diz QUAIS dos 16 passos de um compasso recebem o acorde
// armado — aplicar um padrão escreve o mesmo grau (number) em várias
// posições de `steps`, então não precisa de nenhuma mudança no modelo de
// dados nem no ChordStepStrip: continua sendo o mecanismo de sempre (grau
// puro, sem voicing customizada), só que preenchido de uma vez em vez de
// passo a passo.

export interface StrumPattern {
  id: string
  label: string
  instrument: "guitarra" | "piano"
  hitsPerBar: number[] // índices 0-15 dentro de UM compasso
}

export const GUITAR_PATTERNS: StrumPattern[] = [
  { id: "simples", label: "BATIDA SIMPLES", instrument: "guitarra", hitsPerBar: [0, 4, 8, 12] },
  { id: "reggae", label: "REGGAE", instrument: "guitarra", hitsPerBar: [2, 6, 10, 14] },
  { id: "balada", label: "BALADA", instrument: "guitarra", hitsPerBar: [0, 3, 6, 8, 11, 12, 14] },
  { id: "rasgado", label: "RASGADO", instrument: "guitarra", hitsPerBar: [0, 2, 4, 6, 8, 10, 12, 14] },
]

export const PIANO_PATTERNS: StrumPattern[] = [
  { id: "bloco", label: "ACORDE INTEIRO", instrument: "piano", hitsPerBar: [0, 8] },
  { id: "sincopado", label: "SINCOPADO", instrument: "piano", hitsPerBar: [0, 3, 6, 10, 12] },
  { id: "valsa", label: "VALSA", instrument: "piano", hitsPerBar: [0, 5, 10] },
]

export function patternsFor(instrument: "guitarra" | "piano"): StrumPattern[] {
  return instrument === "guitarra" ? GUITAR_PATTERNS : PIANO_PATTERNS
}

// preenche UM compasso de `steps` (array completo da faixa) com o grau
// armado nas posições do padrão — apaga o que já estava nesse compasso
export function applyPatternToBar(
  steps: (number | null)[],
  barStart: number,
  pattern: StrumPattern,
  degree: number,
): (number | null)[] {
  const next = [...steps]
  for (let i = 0; i < 16; i++) {
    next[barStart + i] = pattern.hitsPerBar.includes(i) ? degree : null
  }
  return next
}
