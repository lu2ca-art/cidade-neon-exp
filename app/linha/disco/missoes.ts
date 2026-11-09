// (T02, 28/10) SUBSTITUÍDO por disco/portas.ts: as 13 missões (arte → jogo →
// a porta → a recompensa), sem o show obrigatório no fim. Ninguém mais importa
// este arquivo; fica como referência do modelo das 4 peças e do Golpe (o
// modelo dos golpes estilo GTA ainda não tem lugar no jogo novo).
//
// AS MISSÕES VARIÁVEIS: O ESQUELETO DAS 4 PEÇAS (LU2CA 19/10, DIREÇÃO).
// Cada missão de linha tem quatro peças:
//   1. destreza  — um item interativo de aprendizado, foco (ping pong, cama
//                  elástica, xadrez, basquete)
//   2. consumo   — o comércio com a moeda do jogo (peças da Kombi, roupas,
//                  discos); nada de dinheiro real
//   3. musical   — B4TIDA, Guitar Driver, violão, escola de música
//   4. real      — a conexão com a música no mundo real
// e, no fim de cada uma, o show (tocar OU cantar: Show.tsx) e o jornal.
// Os personagens e objetos vêm de pistas.ts. Tudo aqui é RASCUNHO de
// distribuição (quem tem qual destreza etc.): o LU2CA redistribui.
//
// AS MISSÕES "GOLPE" (estilo GTA 6, LU2CA 19/10): planejar, coletar
// informações e itens que fazem o plano dar certo; modo stealth OU agressivo;
// TODO plano dá certo, só começa por caminhos diferentes; o fim é sempre o
// mesmo: a alegria de volta no rosto das pessoas, música tocando pela cidade.
// O modelo de dados (Golpe) está pronto; nenhum golpe jogável ainda.

import type { PistaId } from "../estrada/pistas"

export type TipoPeca = "destreza" | "consumo" | "musical" | "real"
export interface Peca {
  tipo: TipoPeca
  id: string // o jogo/a coisa (ex.: "pingpong", "brecho", "batida")
  nome: string // como aparece no holo
  // onde acontece: um lugar (lugares.ts), uma página (paginas.ts) ou um app do holo
  onde?: { lugar?: string; pagina?: string; app?: string }
  // o que vale (RASCUNHO): popularidade, Água$, água
  rende?: { pop?: number; neon?: number; agua?: number }
  // já existe jogável?
  pronto?: boolean
}

// um golpe: os planos possíveis (cada um num modo), e os passos de cada plano
export type PassoGolpe =
  | { t: "info"; id: string; de: string; texto: string } // descobrir (alguém conta, um letreiro, o rádio)
  | { t: "item"; id: string; nome: string; onde: string } // pegar uma coisa num lugar
  | { t: "ir"; lugar: string } // estar num lugar (a vaga)
  | { t: "fazer"; peca: string } // uma peça (destreza/musical) como etapa
export interface Golpe {
  id: string
  titulo: string
  // os planos: todos chegam no mesmo fim, cada um começa diferente
  planos: { modo: "stealth" | "agressivo"; nome: string; passos: PassoGolpe[] }[]
  // o fim é sempre o mesmo (a alegria de volta, a música na cidade)
  fim: { texto: string; rende: { pop: number; neon: number } }
}

// (B18) as 4 peças: a missão 2 (a oficina do subúrbio) ganhou as dela tirando
// uma peça de outras 3 missões (Nectar, DopaminA, Copo Americano ficam com 3)
export interface MissaoLinha { pista: PistaId; pecas: Peca[]; golpe?: Golpe }

const P = (tipo: TipoPeca, id: string, nome: string, extra: Partial<Peca> = {}): Peca => ({ tipo, id, nome, ...extra })

export const MISSOES_DISCO: Record<PistaId, MissaoLinha> = {
  // ato 1
  nectar: { pista: "nectar", pecas: [P("destreza", "patins", "patins entre as flores"), P("musical", "violao", "o violão", { onde: { app: "violao" } }), P("real", "ouvir-nectar", "ouvir a Nectar lá fora", { onde: { app: "ouvir" } })] },
  sexta: {
    pista: "sexta", pecas: [P("destreza", "pingpong", "ping pong com o robô", { onde: { lugar: "casa-drewboy" }, rende: { pop: 3, neon: 10 }, pronto: true }), P("consumo", "brecho", "a roupa da sexta", { rende: { neon: -20 } }), P("musical", "batida", "um beat no B4TIDA", { onde: { app: "batida" } }), P("real", "clipe-sexta", "o clipe da Sexta-Feira", { onde: { app: "stream" } })],
    // (exemplo do modelo: um golpe pronto no papel, não jogável)
    golpe: {
      id: "sexta-som", titulo: "o som da balada",
      planos: [
        { modo: "stealth", nome: "pela porta dos fundos", passos: [{ t: "info", id: "senha", de: "Drew", texto: "a senha muda toda sexta. a moça do bar sabe" }, { t: "item", id: "crachá", nome: "o crachá de técnico", onde: "lugar:bar" }, { t: "ir", lugar: "balada" }] },
        { modo: "agressivo", nome: "pela pista", passos: [{ t: "item", id: "caixa", nome: "a caixa de som do palco do bar", onde: "lugar:bar" }, { t: "fazer", peca: "pingpong" }, { t: "ir", lugar: "balada" }] },
      ],
      fim: { texto: "a música volta pra pista. ninguém filma. todo mundo dança", rende: { pop: 8, neon: 30 } },
    },
  },
  dopamina: { pista: "dopamina", pecas: [P("consumo", "fliperama", "o fliperama", { onde: { pagina: "fliperama" } }), P("musical", "guitar", "a batalha no Guitar Driver"), P("real", "ouvir-dopamina", "ouvir a DopaminA lá fora", { onde: { app: "ouvir" } })] },
  // ato 2
  ojala: { pista: "ojala", pecas: [P("destreza", "xadrez", "o xadrez"), P("consumo", "loja", "o disco da loja", { onde: { app: "loja" } }), P("musical", "escola", "a escola de música"), P("real", "ouvir-ojala", "ouvir a Ojalá lá fora", { onde: { app: "ouvir" } })] },
  swav: { pista: "swav", pecas: [P("destreza", "basquete", "o basquete"), P("consumo", "guitarra", "a guitarra nova"), P("musical", "batida-swav", "o beat da Swav", { onde: { app: "batida" } }), P("real", "ouvir-swav", "ouvir a Swav lá fora", { onde: { app: "ouvir" } })] },
  copo: { pista: "copo", pecas: [P("destreza", "pingpong-2", "a revanche no ping pong"), P("consumo", "copo", "o copo americano"), P("real", "ouvir-copo", "ouvir a Copo Americano lá fora", { onde: { app: "ouvir" } })] },
  // ato 3
  ontem: { pista: "ontem", pecas: [P("destreza", "caderno", "o caderno"), P("consumo", "ingresso", "o ingresso"), P("musical", "guitar-ontem", "o show no Guitar Driver"), P("real", "ouvir-ontem", "ouvir a Sabe Ontem? lá fora", { onde: { app: "ouvir" } })] },
  rollercoaster: { pista: "rollercoaster", pecas: [P("destreza", "montanha", "a montanha-russa"), P("consumo", "parque", "o parque"), P("musical", "batida-roller", "o beat da Rollercoaster", { onde: { app: "batida" } }), P("real", "ouvir-roller", "ouvir a Rollercoaster lá fora", { onde: { app: "ouvir" } })] },
  chuva: { pista: "chuva", pecas: [P("destreza", "regar", "a chuva que rega"), P("consumo", "jardim", "o jardim"), P("musical", "violao-chuva", "o violão na chuva"), P("real", "ouvir-chuva", "ouvir a CHUVA lá fora", { onde: { app: "ouvir" } })] },
}

// (B18) a missão 2, a oficina do subúrbio (não abre faixa): as peças que vieram de 3 outras
export const MISSAO_OFICINA: Peca[] = [
  P("consumo", "oficina", "a oficina: o sol, o turbo e a propulsão", { pronto: true }), // (era da Nectar)
  P("destreza", "cama-elastica", "a cama elástica do subúrbio"), // (era da DopaminA)
  P("musical", "violao-copo", "o violão na garagem"), // (era do Copo Americano)
  P("real", "show-oficina", "o show na oficina", { pronto: true }),
]

// a peça jogável agora na carreira (a primeira pronta e não feita das linhas acesas)
export function pecaAgora(acesas: PistaId[], feitas: string[]): { pista: PistaId; peca: Peca } | null {
  for (const pista of acesas) for (const peca of MISSOES_DISCO[pista].pecas) if (peca.pronto && !feitas.includes(`${pista}:${peca.id}`)) return { pista, peca }
  return null
}

// ── A MISSÃO DE AGORA NA CARREIRA (B19, o bug "depois de uma missão não
// aparece a outra"): a linha acesa que ainda não foi feita (na ordem dos atos),
// com a checklist das 4 peças (feita / agora / em breve) e, no fim, o show no
// palco da linha (tocar ou cantar); o show fecha a missão (o objeto da faixa
// no save) e a próxima linha acende. Peça que ainda não tem jogo fica "em breve"
// e não trava nada ──
export const PALCO: Record<PistaId, string> = {
  nectar: "palco-nectar", sexta: "balada", dopamina: "topo", ojala: "casa-dbee", swav: "palco-swav", copo: "palco-copo",
  ontem: "casa-shows", rollercoaster: "palco-rollercoaster", chuva: "escondido",
}
export type EstadoPasso = "feita" | "agora" | "depois" | "em breve"
export interface MissaoAgora { pista: PistaId; passos: { nome: string; estado: EstadoPasso }[]; alvo: { tipo: "peca" | "show"; lugar: string; peca?: Peca } }
export function missaoAgora(acesas: PistaId[], pecasFeitas: string[]): MissaoAgora | null {
  const pista = acesas[0]
  if (!pista) return null
  const m = MISSOES_DISCO[pista]
  let alvo: MissaoAgora["alvo"] | null = null
  const passos = m.pecas.map((p) => {
    const feita = pecasFeitas.includes(`${pista}:${p.id}`)
    let estado: EstadoPasso = feita ? "feita" : p.pronto && p.onde?.lugar ? "depois" : "em breve"
    if (!feita && p.pronto && p.onde?.lugar && !alvo) { alvo = { tipo: "peca", lugar: p.onde.lugar, peca: p }; estado = "agora" }
    return { nome: p.nome, estado }
  })
  if (!alvo) alvo = { tipo: "show", lugar: PALCO[pista] }
  passos.push({ nome: "o show (tocar ou cantar)", estado: alvo.tipo === "show" ? "agora" : "depois" })
  return { pista, passos, alvo }
}

// ── A FEIRA DE MISSÕES (LU2CA 21/10: "as missões aparecem sempre como
// oportunidades, em widgets que você pode pegar ou largar: uma feira de missões
// que a cidade precisa, e você se dispõe"). Cada linha acesa e ainda não feita
// é uma oferta; pegou, ela vira a missão de agora (a checklist, a coluna de luz
// e, parado, a Kombi vai sozinha); largou, volta pra feira. Toda oferta leva
// pra uma música (a faixa da linha) ──
// o que a cidade pede, na boca de quem pede (RASCUNHO: o LU2CA reescreve)
export const PEDIDO: Record<PistaId, string> = {
  nectar: "as flores do subúrbio tão secando",
  sexta: "a balada perdeu o som. a sexta não pode ficar muda",
  dopamina: "o fliperama apagou. ninguém joga mais nada",
  ojala: "a casa da D-Bee precisa de música de novo",
  swav: "a quadra tá vazia. falta o beat",
  copo: "o bar quer o copo de volta. e a revanche",
  ontem: "a casa de shows esqueceu como era ontem",
  rollercoaster: "a montanha-russa parou no meio",
  chuva: "o jardim escondido espera a chuva",
}
export interface Oferta { pista: PistaId; pedido: string; primeiro: string; feitas: number; total: number }
export function ofertasDaFeira(acesas: PistaId[], pecasFeitas: string[]): Oferta[] {
  return acesas.map((pista) => {
    const m = missaoAgora([pista], pecasFeitas)!
    const prox = m.passos.find((p) => p.estado === "agora") ?? m.passos[m.passos.length - 1]
    return { pista, pedido: PEDIDO[pista], primeiro: prox.nome, feitas: m.passos.filter((p) => p.estado === "feita").length, total: m.passos.length }
  })
}
