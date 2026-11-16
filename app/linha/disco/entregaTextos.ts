// OS TEXTOS DA ENTREGA E DAS INCUBADORAS (16/11). Tudo RASCUNHO: o dono reescreve.
// Só o que ele escreveu em episodios.md ("A entrega e as incubadoras") ou a
// descrição da mecânica; {quem} vira o nome (ou os nomes) de quem foi entregue.

export const TEXTOS_ENTREGA = {
  // a recompensa, no começo do hack (a descrição da mecânica)
  recompensa: "+{agua} Água$",
  // o chamado da D-Bee, depois do terror (RASCUNHO: das palavras do dono, "quebrar
  // todas as incubadoras em busca do amigo que ele entregou")
  chamado: "quebra todas as incubadoras. {quem} tá numa delas",
  quemChama: "D-Bee",
  // a dica de tela (mecânica)
  dica: "toque numa incubadora pra quebrar",
  vazia: "vazia",
  achou: "{quem} voltou",
  // quantas faltam (mecânica)
  faltam: "{n} incubadoras",
}

/** "Drew", "Drew e Ella", "Drew, Ella e Tony Gordo" */
export function juntarNomes(nomes: string[]): string {
  if (nomes.length <= 1) return nomes[0] ?? ""
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`
}
