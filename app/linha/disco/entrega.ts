// A ENTREGA E AS INCUBADORAS (16/11, episodios.md "A entrega e as incubadoras").
// O cartão da missão (o mapa ilustrado, outra frente) tem duas ações: liberar ou
// ENTREGAR o personagem. Aqui mora só o caminho da entrega:
//
//   1. entregar   a pessoa ganha a recompensa (Água$, RASCUNHO) e o personagem
//                 fica "entregue" no save (h.entregues)
//   2. o hack     logo em seguida: propagandas invadem o holo, a visão turva,
//                 e ela vai parar no corredor das incubadoras (EntregaCena.tsx)
//   3. quebrar    quebra todas as incubadoras procurando o amigo; a D-Bee manda
//                 o chamado depois do terror. Achou: ele volta (sai de entregues)
//
// COMO O CARTÃO LIGA: `pedirEntrega(id)` (só isso; o page.tsx ouve, mexe no save
// e monta a cena). Pra saber se o personagem está entregue: `entregue(h, id)`.
// Docs: docs/entrega-incubadoras.md
//
// A quebra (`novaQuebra` / `quebrarCapsula`) já serve pra MUITOS amigos de uma
// vez (o final, com todos capturados, é decisão do dono e fica pra outra frente).
// Funções puras, sem three.js. Save antigo: os campos novos são opcionais.

import type { Save } from "../estado"
import { ganhar } from "../economia"
import { comHistoria, historiaDe, type HistoriaDisco } from "./historia"
import { MISSOES13, type MissaoId } from "./portas"

// ═══ RASCUNHO: os números (o dono mexe aqui) ═══
export const ENTREGA_CFG = {
  // a recompensa por entregar, em Água$ (RASCUNHO). (16/11, o dono) bem mais alta, entre
  // 1.000 e 2.000 conforme o personagem, pra tentar de verdade (a missão paga 120–150,
  // PAGA.missao). O cartão mostra este mesmo número (cartoes.ts, entregaDoEp).
  // Sem o LU2CA e a D-Bee: ver NUNCA_ENTREGAR. As chaves são as MISSÕES (portas.ts):
  // "notti" é a do Mubarak (ep. 2), "mubarak" a da Nizzy (ep. 4), "nizzy" a do Notti (ep. 8)
  agua: { quadra: 1000, notti: 2000, mubarak: 1400, tony: 1200, drew: 1600, ella: 1800, nizzy: 1300, xeriff: 1000 } as Partial<Record<MissaoId, number>>,
  // (16/11, o dono) depois do resgate o botão some: entregou uma vez, nunca mais (podeEntregar)
  pagaUmaVez: true,
  // o hack (s): as propagandas aparecendo, a visão turvando, o escuro antes do corredor
  hack: { invade: 6.5, turva: 2.2, escuro: 1.4, primeiraMs: 900, ultimaMs: 90, maxNaTela: 26 },
  // o corredor: quantas incubadoras (as duas fileiras), o espaço entre elas (m)
  // e a largura do corredor; o escuro do terror antes do chamado da D-Bee (s)
  corredor: { incubadoras: 12, espaco: 2.4, largura: 5.2, escuro: 3.2, nevoa: 16 },
}

/** (16/11, o dono) nunca dão pra entregar: o LU2CA está sempre fazendo o show e a D-Bee
 *  é a guia da missão do jogo. Os outros podem */
export const NUNCA_ENTREGAR: readonly MissaoId[] = ["lu2ca", "dbee"]
/** quem dá pra entregar: as missões com uma pessoa no cartão (sem o prólogo, os túneis, o final, o LU2CA e a D-Bee) */
export const ENTREGAVEIS = (Object.keys(ENTREGA_CFG.agua) as MissaoId[]).filter((id) => !MISSOES13[id].prologo && !NUNCA_ENTREGAR.includes(id))
/** dá pra entregar agora? Não: quem não é entregável, quem está nas incubadoras e (16/11, o
 *  dono) quem já foi entregue uma vez e resgatado (entreguesPagos guarda toda entrega feita) */
export const podeEntregar = (h: HistoriaDisco, id: MissaoId) => ENTREGAVEIS.includes(id) && !entregue(h, id) && !(h.entreguesPagos ?? []).includes(id)
export const nomeDe = (id: MissaoId) => MISSOES13[id].quem
export const corDe = (id: MissaoId) => MISSOES13[id].cor

// ── o save (h.entregues / h.entreguesPagos; opcionais: o save antigo só abre) ──
export const entregues = (h: HistoriaDisco | null | undefined): MissaoId[] => h?.entregues ?? []
export const entregue = (h: HistoriaDisco | null | undefined, id: MissaoId) => entregues(h).includes(id)

/** entregou: a grana (uma vez por personagem) e o "entregue" no save */
export function entregar(s: Save, id: MissaoId): { save: Save; agua: number } {
  const h = historiaDe(s)
  if (!podeEntregar(h, id)) return { save: s, agua: 0 }
  const jaPago = (h.entreguesPagos ?? []).includes(id)
  const agua = ENTREGA_CFG.pagaUmaVez && jaPago ? 0 : ENTREGA_CFG.agua[id] ?? 0
  const save = comHistoria(ganhar(s, agua), (x) => ({
    ...x,
    entregues: [...entregues(x), id],
    entreguesPagos: jaPago ? x.entreguesPagos : [...(x.entreguesPagos ?? []), id],
  }))
  return { save, agua }
}

/** achou nas incubadoras: volta, deixa de estar entregue e segue nos episódios */
export function recuperar(s: Save, ids: readonly MissaoId[]): Save {
  if (!ids.some((id) => entregue(historiaDe(s), id))) return s
  return comHistoria(s, (x) => {
    const resto = entregues(x).filter((id) => !ids.includes(id))
    const { entregues: _e, ...sem } = x
    void _e
    return resto.length ? { ...sem, entregues: resto } : sem
  })
}

// ── a quebra das incubadoras (reutilizável: 1 amigo ou todos de uma vez) ──
// Os amigos não ficam em incubadoras sorteadas: aparecem espalhados pelas
// quebras, e o último sempre na última incubadora. Assim a pessoa quebra TODAS
// (a missão) e a busca não acaba cedo. Com 1 amigo: ele está na última.
export interface Quebra {
  total: number
  quebradas: boolean[]
  amigos: MissaoId[] // na ordem em que aparecem
  achados: { capsula: number; id: MissaoId }[]
}
export function novaQuebra(amigos: readonly MissaoId[], total = ENTREGA_CFG.corredor.incubadoras): Quebra {
  const n = Math.max(total, amigos.length)
  return { total: n, quebradas: Array(n).fill(false), amigos: [...amigos], achados: [] }
}
/** em que quebra (1…total) o amigo j aparece: espalhados, o último na última */
export const quebraDoAmigo = (q: Pick<Quebra, "total" | "amigos">, j: number) => Math.round(((j + 1) * q.total) / q.amigos.length)
export const quantasQuebradas = (q: Quebra) => q.quebradas.reduce((a, b) => a + (b ? 1 : 0), 0)
export const quebraAcabou = (q: Quebra) => quantasQuebradas(q) >= q.total

/** quebrou a incubadora i: devolve o estado novo e quem estava nela (null = vazia) */
export function quebrarCapsula(q: Quebra, i: number): { q: Quebra; achou: MissaoId | null } {
  if (i < 0 || i >= q.total || q.quebradas[i]) return { q, achou: null }
  const quebradas = q.quebradas.slice()
  quebradas[i] = true
  const n = quantasQuebradas(q) + 1
  const j = q.amigos.findIndex((_, k) => quebraDoAmigo(q, k) === n)
  const achou = j >= 0 ? q.amigos[j] : null
  return { q: { ...q, quebradas, achados: achou ? [...q.achados, { capsula: i, id: achou }] : q.achados }, achou }
}

// ── o pedido (o cartão chama; o page.tsx ouve). Sem React, sem custo parado ──
export type PedidoEntrega = { t: "entregar"; id: MissaoId } | { t: "incubadoras"; amigos: MissaoId[] }
const ouvintes = new Set<(p: PedidoEntrega) => void>()
/** O CARTÃO CHAMA ISTO no botão "entregar" */
export function pedirEntrega(id: MissaoId) { ouvintes.forEach((f) => f({ t: "entregar", id })) }
/** abre o corredor direto pra estes amigos (o teste; e, depois, o final com todos capturados) */
export function pedirIncubadoras(amigos: MissaoId[]) { ouvintes.forEach((f) => f({ t: "incubadoras", amigos })) }
export function ouvirEntrega(f: (p: PedidoEntrega) => void) { ouvintes.add(f); return () => { ouvintes.delete(f) } }
