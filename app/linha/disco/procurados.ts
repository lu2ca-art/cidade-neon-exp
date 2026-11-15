// OS PROCURADOS (14/11, o dono): no mapa, as missões viram os cartazes do Núcleo.
// Quem pede ajuda é "criminoso": foi condenado por fazer as coisas mais humanas.
// O Núcleo começou a perseguir a própria natureza humana, do jeito mais absurdo.
// A recompensa pela cabeça é em Água$ (a mesma que a missão paga: economia-rascunho.ts PAGA).
//
// [gosto] TUDO AQUI É RASCUNHO: o "crime" de cada um é do dono. Troca a linha, o cartaz segue.
// O Xeriff não é procurado (é da polícia dos robôs): o cartaz dele é outro.

import type { MissaoId } from "./portas"

export interface Procurado {
  // a manchete do cartaz: pelo que o Núcleo condenou (sempre uma coisa humana)
  crime: string
  // o selo em cima do nome (o padrão é "PROCURADO")
  selo?: string
  // a linha inteira no lugar de "condenado por …" (quem não é condenado: o Xeriff)
  frase?: string
}

export const PROCURADOS: Partial<Record<MissaoId, Procurado>> = {
  dbee: { crime: "dar água a um desconhecido, de graça" },
  oficina: { crime: "consertar o que o Núcleo mandou jogar fora" },
  quadra: { crime: "jogar bola com as crianças do subúrbio depois do toque de recolher" },
  tuneis: { crime: "correr por diversão, sem destino", selo: "PROCURADOS" },
  drew: { crime: "dançar na rua numa sexta à noite" },
  mubarak: { crime: "guardar discos de antes, que ainda tocam" },
  xeriff: { crime: "", selo: "INFORMANTE", frase: "da polícia dos robôs. ouve tudo o que eles falam" },
  lu2ca: { crime: "cantar em público sem permissão" },
  ella: { crime: "pintar um quadro e mostrar pra alguém" },
  notti: { crime: "consertar máquina velha pra todo mundo poder jogar" },
  nizzy: { crime: "andar de metrô só pra olhar a cidade" },
  tony: { crime: "cozinhar com fogo de verdade pra quem tinha fome" },
  final: { crime: "se juntar", selo: "PROCURADOS" },
}

export const procuradoDe = (id: MissaoId): Procurado => PROCURADOS[id] ?? { crime: "ser gente" }
/** a linha do cartaz: "condenado por …" (ou a frase própria) */
export const linhaDoCartaz = (id: MissaoId) => { const p = procuradoDe(id); return p.frase ?? `condenado por ${p.crime}` }
