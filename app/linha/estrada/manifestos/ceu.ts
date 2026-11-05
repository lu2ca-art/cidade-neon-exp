// O CÉU DE UMA RUA-MANIFESTO: uma rua pode pedir outra hora pro céu enquanto a
// Kombi está nela ("Sabe Ontem?": um dia inteiro passa na volta). A hora do
// JOGO (horaRef, relogio.ts) segue andando por baixo: só o céu, a névoa e a
// luz do sol/lua (Corrida.tsx, o bloco "A HORA DO JOGO") usam esta.
// k = 0: o céu do jogo; k = 1: a hora da rua. Escrito pelo manifesto, lido 1×/quadro.

export const CEU_MANIFESTO = { hora: 18, k: 0 }

/** a hora que o céu mostra: a do jogo, puxada pela da rua (pelo caminho mais curto do relógio) */
export function horaDoCeu(hJogo: number): number {
  const k = CEU_MANIFESTO.k
  if (k <= 0.001) return hJogo
  let d = CEU_MANIFESTO.hora - hJogo
  d -= Math.round(d / 24) * 24
  return (((hJogo + d * Math.min(1, k)) % 24) + 24) % 24
}
