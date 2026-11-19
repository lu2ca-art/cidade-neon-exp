// OS ATRIBUTOS (LU2CA 20/10: "rico do quê?"; bíblia §15, 08/11: tudo vale Água$).
//   Água$ compra tudo: a loja (T03) e as melhorias de desempenho da Kombi (o mecânico)
//   popularidade abre o que não tem preço: tocar no ginásio cheio
// Preços e efeitos: RASCUNHO.

// (T03) as melhorias e os preços moram em economia-rascunho.ts
import { MELHORIAS, type MelhoriaId } from "../economia-rascunho"
export type ModId = MelhoriaId
export const MODS: { id: ModId; nome: string; preco: number; faz: string }[] = MELHORIAS.map((m) => ({ id: m.id, nome: m.nome, preco: m.agua, faz: m.faz }))
// o que só a popularidade abre (sem preço)
export const PALCOS_POP: { nome: string; pop: number }[] = [
  { nome: "o ginásio cheio", pop: 60 },
  { nome: "a casa de shows", pop: 35 },
]
