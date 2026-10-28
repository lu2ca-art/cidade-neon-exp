// AS TRÊS MOEDAS = OS TRÊS ATRIBUTOS (LU2CA 20/10: "rico do quê?").
//   neon$ compra o que é ANALÓGICO: discos, instrumentos, carros, roupas (T03: a loja)
//   água compra o que é TECNOLOGIA: as melhorias de desempenho da Kombi (o mecânico)
//   popularidade abre o que não tem preço: tocar no ginásio cheio
// A oficina vende com água; a loja de discos, com neon$. Preços e efeitos: RASCUNHO.

// (T03) as melhorias e os preços moram em economia-rascunho.ts (o mecânico é pago em água)
import { MELHORIAS, type MelhoriaId } from "../economia-rascunho"
export type ModId = MelhoriaId
export const MODS: { id: ModId; nome: string; preco: number; faz: string }[] = MELHORIAS.map((m) => ({ id: m.id, nome: m.nome, preco: m.agua, faz: m.faz }))
// o que só a popularidade abre (sem preço)
export const PALCOS_POP: { nome: string; pop: number }[] = [
  { nome: "o ginásio cheio", pop: 60 },
  { nome: "a casa de shows", pop: 35 },
]
