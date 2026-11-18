// OS TEXTOS DO FINAL ANTES DO SHOW (16/11). Tudo RASCUNHO: o dono reescreve.
import type { MissaoId } from "./portas"

// Só as palavras dele em episodios.md ("A entrega e as incubadoras", "A ordem do final")
// ou a descrição da mecânica. Nunca dizer quem é o jogador.

export const TEXTOS_FINAL = {
  // a captura, no palco do deserto (RASCUNHO: "visto andando com um veículo desconhecido pela cidade")
  captura: "vistos andando com um veículo desconhecido pela cidade",
  // o chamado no corredor: sem quem chama, a D-Bee também está numa incubadora
  // (RASCUNHO: "salvar todo mundo e quebrar todas as incubadoras pra resgatar os amigos")
  chamado: "quebra todas as incubadoras. todo mundo tá numa delas",
  // todas quebradas: o elevador no fim da sala (mecânica)
  elevador: "toque no elevador",
  // a sala de controle do Núcleo: o plano se revela, uma frase por vez
  // (RASCUNHO: "a gente está bolando esse plano desde o início e todo mundo já sabia:
  // eles foram parar lá de propósito")
  // (18/11, o dono) cada frase é dita por um amigo diferente, em volta do painel, com o
  // nome e a cor de quem fala. `quem` = a missão do amigo (o nome e a cor vêm de lá).
  // RASCUNHO: quem diz cada frase (D-Bee, Mubarak, LU2CA) é escolha nossa; o dono troca aqui
  controle: [
    { quem: "dbee", texto: "a gente tá bolando esse plano desde o início" },
    { quem: "oficina", texto: "todo mundo já sabia" },
    { quem: "lu2ca", texto: "a gente veio parar aqui de propósito" },
  ] as { quem: MissaoId; texto: string }[],
}
