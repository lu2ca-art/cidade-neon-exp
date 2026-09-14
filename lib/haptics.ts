// Vibration API — só existe em navegadores mobile (principalmente Android;
// Safari iOS não suporta). Sempre feature-detectada, nunca falha em
// desktop/navegadores sem suporte.
const PATTERNS = {
  // toque leve de confirmação (ex: abrir um app, navegar)
  tap: 15,
  // uma missão ou confirmação do funil fechou
  unlock: [20, 40, 20],
  // recompensa colhida (momento de maior peso emocional)
  reward: [15, 30, 15, 30, 40],
} as const

export type HapticPattern = keyof typeof PATTERNS

export function vibrate(pattern: HapticPattern) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return
  try {
    navigator.vibrate(PATTERNS[pattern] as number | number[])
  } catch {}
}
