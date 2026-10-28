// ═══════════════════════════════════════════════════════════════════════════
//  RASCUNHO · A ECONOMIA (T03, 28/10): os números e os itens que são [gosto]
// ═══════════════════════════════════════════════════════════════════════════
// Tudo aqui é RASCUNHO pro dono ajustar: os preços, quanto cada coisa paga,
// quais instrumentos, quais carros, quais roupas. Mudar aqui muda o jogo todo
// (a loja, a oficina, o posto, a recompensa das missões, o cachê do show).
// As regras (quem paga com o quê, a migração do save) moram em economia.ts.
//
//   neon$  = a grana. Entra pelas missões (a porta) e pelos shows na rua.
//            Sai na loja (discos, instrumentos, carros, roupas) e no posto.
//   água   = a gota. Entra pela pista (as gotas) e pela D-Bee. Paga o
//            mecânico: as melhorias de DESEMPENHO da Kombi (nada estético).
//   popularidade = não se gasta. Sobe com o show e aumenta o cachê.

import type { MissaoId } from "./disco/portas"

export type Categoria = "disco" | "instrumento" | "carro" | "roupa"

// ── o que entra (neon$) ── RASCUNHO
export const PAGA = {
  // a porta de cada missão (a recompensa grande). O subúrbio paga menos (é
  // o começo, e lá a moeda que vale é a água); a cidade paga mais
  missao: {
    dbee: 40, oficina: 40, quadra: 60, tuneis: 60,
    drew: 120, mubarak: 120, xeriff: 120, lu2ca: 150, ella: 120, notti: 120, nizzy: 120, tony: 150,
    final: 0,
  } satisfies Record<MissaoId, number>,
  // o show na rua (o trampo): um fixo, mais a nota (0–1), mais a fama
  // (popularidade 0–100) vezes a nota. Nota boa com a cidade te conhecendo
  // paga bem: 0 de fama ≈ 20–60; 50 de fama ≈ 20–120; 100 de fama ≈ 20–180
  show: { fixo: 20, porNota: 40, porFama: 1.2 },
  // as coisas pequenas que já existiam
  regarCanteiro: 2,
  itemTutorial: 10,
  pessoaAcordada: 50, // (o mapa antigo, fora do mapa-disco)
}

// ── o posto (neon$) ── RASCUNHO
export const POSTO = { tanque: 25, galao: 10 }

// ── a oficina: o mecânico é pago em ÁGUA ── RASCUNHO
// Só desempenho. A Kombi não compra nada estético (decidido 27/10).
export type MelhoriaId = "mangueira" | "tanque" | "turbo2"
export const MELHORIAS: { id: MelhoriaId; nome: string; agua: number; faz: string }[] = [
  // (LU2CA 19/10) "a mangueira de bombeiro, uma modificação comprada na oficina, acelera muito o crescimento"
  { id: "mangueira", nome: "mangueira de bombeiro", agua: 30, faz: "rega da Kombi, sem descer: as flores perto da pista bebem sozinhas" },
  { id: "tanque", nome: "tanque de ar maior", agua: 20, faz: "o propulsor dura mais no ar" },
  { id: "turbo2", nome: "turbo duplo", agua: 25, faz: "o drift e o voo enchem o turbo mais rápido" },
]

// ── a loja (neon$) ── RASCUNHO
// os discos: todos pelo mesmo preço (quais discos vendem mora em discos.json)
export const PRECO_DISCO = 100

export interface ItemRascunho { id: string; nome: string; preco: number; desc: string; cor: string }

// os instrumentos. O violão vem da D-Bee (não se compra). Quando ele perde o
// violão no metrô, "logo ele junta grana pra comprar uma guitarra" (28/10)
export const INSTRUMENTOS: ItemRascunho[] = [
  { id: "guitarra", nome: "guitarra", preco: 250, desc: "a que ele junta grana pra comprar depois de perder o violão", cor: "#ff5b3a" },
  { id: "baixo", nome: "baixo", preco: 300, desc: "quatro cordas grossas, o chão do show", cor: "#b38cff" },
  { id: "teclado", nome: "teclado", preco: 350, desc: "um sintetizador de lata, remendado no subúrbio", cor: "#2fe8ff" },
  { id: "sampler", nome: "sampler", preco: 400, desc: "a máquina de beat: leva o B4TIDA pro palco", cor: "#ffc857" },
  { id: "tambor", nome: "tambor", preco: 180, desc: "igual ao da D-Bee, feito de tonel", cor: "#ff9f1c" },
]

// os carros. Os nomes são de rascunho: o dono escolhe quais (e o T44, os
// rachas, usa os do mecânico). Ainda só ficam guardados; dirigir vem depois
export const CARROS: ItemRascunho[] = [
  { id: "moto-leve", nome: "motocross leve", preco: 600, desc: "a moto do subúrbio, leve como as de corrida de celular", cor: "#e0ff4f" },
  { id: "popular", nome: "o popular rebaixado", preco: 900, desc: "um carro velho que o mecânico mexeu", cor: "#ff7ad9" },
  { id: "esportivo", nome: "o esportivo de pista", preco: 1500, desc: "feito pra correr nas pistas acesas", cor: "#2fe8ff" },
  { id: "luxo", nome: "o carro de luxo", preco: 2500, desc: "o dos ricos da cidade (o Tony Gordo tem um)", cor: "#ffc857" },
]

// as roupas. Também de rascunho: o dono escolhe o estilo
export const ROUPAS: ItemRascunho[] = [
  { id: "bone", nome: "boné", preco: 30, desc: "aba reta, a cara do subúrbio", cor: "#ff3fb0" },
  { id: "oculos", nome: "óculos escuros", preco: 40, desc: "pra luz das torres", cor: "#7fe8ff" },
  { id: "camisa-222", nome: "camisa da 222", preco: 50, desc: "a rádio no peito", cor: "#ffc857" },
  { id: "tenis", nome: "tênis", preco: 60, desc: "pra pedalar, patinar e andar de skate", cor: "#5dffa0" },
  { id: "jaqueta", nome: "jaqueta de couro", preco: 120, desc: "a do palco", cor: "#ff5b3a" },
]
