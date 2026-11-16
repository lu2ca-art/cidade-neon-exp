// OS 9 EPISÓDIOS (08/11, bíblia §10): a SEQUÊNCIA do jogo, numa tabela só.
// Fonte: projetos/cidade-neon/episodios.md. "A ordem é modificável": mudar a
// ordem é editar EPISODIOS (a ordem das linhas e o campo `etapa`), nada mais.
//
//   linha        = um episódio: a música, quem apresenta e as PEÇAS dele
//   `etapa`      = a posição na sequência; episódios com a MESMA etapa podem ser
//                  feitos em qualquer ordem (o dono quer que a pessoa escolha
//                  entre o 4 e o 5). O número do episódio é a posição da linha
//   peça "missao" = uma missão de portas.ts (MISSOES13): arte → jogo → porta
//   peça "marco"  = algo que a própria história do save já diz (MARCOS)
//   as peças de um episódio se fazem NA ORDEM em que estão na linha
//
// O que conta como feito é DERIVADO do save (as missões feitas e os marcos):
// por isso o save antigo abre sem migração (docs/episodios.md). O Xeriff fica
// fora da sequência (LIVRES): continua solto no jogo e não conta.
//
// As músicas do Guitar Driver e do MP3 abrem por episódio feito
// (`musicasLiberadas`); as ruas acendem pelo mesmo critério (`luzDosEpisodios`).
// Funções puras: recebem a história do save.

import type { PistaId } from "../estrada/pistas"
import { PISTAS } from "../estrada/pistas"
import { luzDasPistas, pistasFeitas, type Luz } from "../estrada/atos"
import type { EstacaoId } from "../data"
import type { HistoriaDisco } from "./historia"
import { feita13, type MissaoId } from "./portas"

export type MarcoId = "copos" | "mubarak" | "show-nectar" | "perseguicao" | "fuga"
export type PecaEp = { t: "missao"; id: MissaoId } | { t: "marco"; id: MarcoId }

export interface Episodio {
  /** a chave do episódio (o id da música: não mude, o resto lê por ela) */
  id: PistaId
  musica: PistaId
  quem: string
  cor: string
  etapa: number
  pecas: PecaEp[]
}

const m = (id: MissaoId): PecaEp => ({ t: "missao", id })
const k = (id: MarcoId): PecaEp => ({ t: "marco", id })

// ═══ A TABELA DA SEQUÊNCIA ═══
export const EPISODIOS: Episodio[] = [
  { id: "nectar", musica: "nectar", quem: "D-Bee", cor: "#3d7bff", etapa: 1, pecas: [m("dbee"), k("copos"), k("mubarak"), k("show-nectar")] },
  { id: "dopamina", musica: "dopamina", quem: "Mubarak", cor: "#ffc857", etapa: 2, pecas: [m("oficina"), m("notti")] },
  { id: "copo", musica: "copo", quem: "Alohan", cor: "#ff6a35", etapa: 3, pecas: [m("quadra")] },
  // 4 e 5: a mesma etapa, a pessoa escolhe a ordem
  { id: "ojala", musica: "ojala", quem: "Nizzy", cor: "#ff2436", etapa: 4, pecas: [m("mubarak")] },
  { id: "swav", musica: "swav", quem: "Tony Gordo", cor: "#ff3fb0", etapa: 4, pecas: [m("tony")] },
  { id: "sexta", musica: "sexta", quem: "Drew", cor: "#6d7bff", etapa: 5, pecas: [m("drew"), m("tuneis")] },
  { id: "ontem", musica: "ontem", quem: "Ella", cor: "#4fc3ff", etapa: 6, pecas: [m("ella")] },
  { id: "rollercoaster", musica: "rollercoaster", quem: "Notti", cor: "#5dffa0", etapa: 7, pecas: [m("nizzy")] },
  { id: "chuva", musica: "chuva", quem: "LU2CA", cor: "#e0ff4f", etapa: 8, pecas: [k("perseguicao"), k("fuga"), m("lu2ca")] },
]

/** as missões que ficam fora da sequência: livres no jogo, sem contar nos episódios */
export const LIVRES: MissaoId[] = ["xeriff"]

// ── os marcos: o que o save já diz (h; sem 3D, sem React) ──
const DEPOIS_DO_BAR = ["oficina", "subir", "nectar", "carreira", "livre"]
const DEPOIS_DO_SHOW = ["subir", "nectar", "carreira", "livre"]
export const MARCOS: Record<MarcoId, { nome: string; feito: (h: HistoriaDisco) => boolean }> = {
  // o loop dos copos: recusou e saiu do bar
  copos: { nome: "o bar · o loop dos copos", feito: (h) => DEPOIS_DO_BAR.includes(h.fase) },
  // conhecer o Mubarak: no bar, antes do show (ep. 1); no save antigo, a cena da oficina (ele é o mecânico)
  mubarak: { nome: "conhecer o Mubarak", feito: (h) => !!h.mubarakBar || !!h.oficina?.cena || DEPOIS_DO_SHOW.includes(h.fase) },
  // o show da Nectar no palco do bar (assistir ou tocar); sinuca livre depois
  "show-nectar": { nome: "o show da Nectar no bar", feito: (h) => DEPOIS_DO_SHOW.includes(h.fase) || (h.palcos?.["bar:nectar"] ?? 0) > 0 },
  // a polícia pegou a Kombi
  perseguicao: { nome: "a perseguição e a captura da Kombi", feito: (h) => h.perseguicao?.fase === "escolher" || h.perseguicao?.fase === "feita" },
  // a fuga pelo metrô
  fuga: { nome: "a fuga pelo metrô", feito: (h) => (h as HistoriaDisco & { metro?: { fase: string } }).metro?.fase === "feita" },
}

// ── leitura da tabela ──
export const numeroDe = (ep: Episodio) => EPISODIOS.indexOf(ep) + 1
export const episodioPorId = (id: string | null | undefined) => EPISODIOS.find((e) => e.id === id) ?? null
export const episodioDaMusica = (musica: string) => EPISODIOS.find((e) => e.musica === musica) ?? null
export const episodioDaMissao = (id: MissaoId) => EPISODIOS.find((e) => e.pecas.some((p) => p.t === "missao" && p.id === id)) ?? null
export const nomeDaMusica = (ep: Episodio) => PISTAS.find((x) => x.id === ep.musica)?.faixa ?? ep.musica
/** "ep. 3 · Copo Americano" */
export const rotuloDoEpisodio = (ep: Episodio) => `ep. ${numeroDe(ep)} · ${nomeDaMusica(ep)}`

// ── o que está feito ──
export const pecaDoEpFeita = (h: HistoriaDisco, p: PecaEp) => (p.t === "missao" ? feita13(h, p.id) : MARCOS[p.id].feito(h))
export const episodioFeito = (h: HistoriaDisco, ep: Episodio) => ep.pecas.every((p) => pecaDoEpFeita(h, p))
/** a etapa em que a sequência está (a menor com episódio por fazer); null = acabou */
export function etapaAgora(h: HistoriaDisco): number | null {
  const falta = EPISODIOS.filter((e) => !episodioFeito(h, e)).map((e) => e.etapa)
  return falta.length ? Math.min(...falta) : null
}
/** os episódios que dá pra fazer agora (os da etapa de agora; 4 e 5 vêm juntos) */
export const episodiosAbertos = (h: HistoriaDisco): Episodio[] => {
  const et = etapaAgora(h)
  return et === null ? [] : EPISODIOS.filter((e) => e.etapa === et && !episodioFeito(h, e))
}
export const episodioAberto = (h: HistoriaDisco, id: string) => episodiosAbertos(h).some((e) => e.id === id)
/** a próxima peça de um episódio (as peças vão na ordem da linha) */
export const proximaPecaDe = (h: HistoriaDisco, ep: Episodio): PecaEp | null => ep.pecas.find((p) => !pecaDoEpFeita(h, p)) ?? null

/** a missão pode aparecer na feira agora? (episódio aberto e as peças de antes feitas; as livres sempre).
 *  null = a missão não é de nenhum episódio (o final): quem decide é o `requer` dela */
export function missaoLiberada(h: HistoriaDisco, id: MissaoId): boolean | null {
  // (16/11) entregue e ainda nas incubadoras: some da sequência até a pessoa achar (disco/entrega.ts)
  if ((h.entregues ?? []).includes(id)) return false
  if (LIVRES.includes(id)) return true
  const ep = episodioDaMissao(id)
  if (!ep) return null
  if (!episodioAberto(h, ep.id)) return false
  const i = ep.pecas.findIndex((p) => p.t === "missao" && p.id === id)
  return ep.pecas.slice(0, i).every((p) => pecaDoEpFeita(h, p))
}

/** a próxima coisa a fazer na sequência: o primeiro episódio aberto que tem missão liberada (a sugestão da D-Bee, o Nexo) */
export function proximaDaSequencia(h: HistoriaDisco): { ep: Episodio; missao: MissaoId } | null {
  for (const ep of episodiosAbertos(h)) {
    const p = proximaPecaDe(h, ep)
    if (p?.t === "missao") return { ep, missao: p.id }
  }
  return null
}

/** as músicas liberadas pelos episódios feitos (o Guitar Driver e o MP3) */
export const musicasLiberadas = (h: HistoriaDisco): PistaId[] => EPISODIOS.filter((e) => episodioFeito(h, e)).map((e) => e.musica)

/** o aviso do cadeado: "abre no ep. 3 · Copo Americano (Alohan)" */
export const quemAbre = (ep: Episodio) => `abre no ${rotuloDoEpisodio(ep)} (${ep.quem})`

/** a luz de cada rua (pelo nome da faixa): feita = episódio feito; aberta = da etapa de agora; o resto, apagada.
 *  Fora da carreira (o prólogo e o jogo livre), a regra antiga das torres (atos.ts) */
export function luzDosEpisodios(h: HistoriaDisco | null | undefined, objetos: readonly EstacaoId[]): Record<string, Luz> {
  if (!h || h.fase !== "carreira") return luzDasPistas(pistasFeitas([...objetos]))
  const r: Record<string, Luz> = {}
  for (const p of PISTAS) r[p.faixa] = "apagada"
  const abertos = new Set(episodiosAbertos(h).map((e) => e.id))
  for (const e of EPISODIOS) r[nomeDaMusica(e)] = episodioFeito(h, e) ? "feita" : abertos.has(e.id) ? "aberta" : "apagada"
  return r
}
