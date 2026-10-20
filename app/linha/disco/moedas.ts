// AS TRÊS MOEDAS = OS TRÊS ATRIBUTOS (LU2CA 20/10: "rico do quê?").
//   neon$ compra o que é ANALÓGICO: discos, roupas, guitarras (carros de luxo depois)
//   água compra o que é TECNOLOGIA: modificações da Kombi e do player, evoluções do holo
//   popularidade abre o que não tem preço: tocar no ginásio cheio
// A oficina vende com água; a loja de discos, com neon$. Preços e efeitos: RASCUNHO.

export type ModId = "mangueira" | "tanque" | "turbo2"
export const MODS: { id: ModId; nome: string; preco: number; faz: string }[] = [
  // (LU2CA 19/10) "a mangueira de bombeiro, uma modificação comprada na oficina, acelera muito o crescimento"
  { id: "mangueira", nome: "mangueira de bombeiro", preco: 30, faz: "rega da Kombi, sem descer: as flores perto da pista bebem sozinhas" },
  { id: "tanque", nome: "tanque de ar maior", preco: 20, faz: "o propulsor dura mais no ar" },
  { id: "turbo2", nome: "turbo duplo", preco: 25, faz: "o drift e o voo enchem o turbo mais rápido" },
]
// o que só a popularidade abre (sem preço)
export const PALCOS_POP: { nome: string; pop: number }[] = [
  { nome: "o ginásio cheio", pop: 60 },
  { nome: "a casa de shows", pop: 35 },
]
