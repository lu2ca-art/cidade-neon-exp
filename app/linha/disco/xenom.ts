// OS 4 SHOWS DO SUBÚRBIO "XENOM" (T21, 28/10). retomar-mundo.md (decidido 28/10):
// "São quatro shows do subúrbio, em que ele toca essas músicas. Cada faixa tem
// um tema bem específico e vira uma missão bem diferente, como outro multiverso
// que ele está conhecendo na cidade. É uma missão para ganhar dinheiro. No
// final, o álbum é liberado no untitled para o jogador." E: "Cada uma das 4
// missões do subúrbio libera, no Guitar Driver, o show-missão daquela faixa. É
// a recompensa pelo corre que vai além dele mesmo, paga com prestígio e grana."
//
//   - as 4 faixas do Subúrbio Xenom (o lado C: gata mia, tédio, boom boom k,
//     10 D3 10), uma pra cada missão do subúrbio (a D-Bee, a oficina, a quadra,
//     os túneis). A missão feita libera o show dela no menu dos palcos
//   - cada show é um multiverso: o palco, a cor, o prelúdio e UMA REGRA que muda
//     o jogo (o braço espelhado, as explosões, o mundo cinza, os jurados no escuro)
//   - cada um tem um objetivo (a missão). Cumprir a primeira vez paga o bônus
//     de grana e o prestígio (a popularidade); tocar de novo paga o cachê
//   - as 4 cumpridas: o álbum Subúrbio Xenom liberado no untitled
//
// [gosto] PROPOSTA DO CLAUDE: qual faixa vai com qual missão, o tema (o
// multiverso), a regra, o objetivo e os números. Tudo aqui, num lugar só.
// As notas: public/gd2/xenom-<id>.json (scripts/gd2/xenom.ts, charter automático).

import type { HistoriaDisco } from "./historia"
import { MISSOES13, feita13, type MissaoId } from "./portas"
import { estrelasDaNota } from "./palcos"
import { TIER_META } from "@/lib/radio-tiers"

export type XenomId = "gata" | "tedio" | "boom" | "dez"
// o id da faixa no show (o chart em /gd2/<faixa>.json)
export type FaixaXenom = `xenom-${XenomId}`

// a regra do multiverso (o que muda no Guitar Driver)
export type RegraXenom =
  // o braço espelhado: as cores trocam de lado (as teclas também)
  | { t: "espelho" }
  // cada acerto explode (faíscas ×3, a tela treme); cada erro treme mais
  | { t: "explosao" }
  // o mundo começa cinza; a galera acesa traz a cor de volta
  | { t: "cinza" }
  // no escuro (só se vê perto do pé) e os jurados dão a nota de 0 a 10
  | { t: "jurados" }

// o objetivo (a missão do show): a nota, a maior sequência ou a galera no fim
export type ObjetivoXenom = { t: "nota" | "seq" | "galera"; min: number; texto: string }

export interface ShowXenom {
  id: XenomId
  faixa: string // o nome da música
  src: string // o arquivo (o corte de 22 s do lado C)
  missao: MissaoId // a missão do subúrbio que libera
  multiverso: string // "o multiverso dos gatos"
  tema: string // uma linha: o que é este mundo
  preludio: string // o letreiro do prelúdio
  cor: string
  gd: string // o palco desenhado do Guitar Driver (neon-tiles/dados.ts PALCOS) que vira o fundo
  regra: RegraXenom
  objetivo: ObjetivoXenom
  paga: number // o cachê de cada show: vezes o cachê do T03
  bonus: number // Água$ na primeira vez que cumpre
  prestigio: number // popularidade na primeira vez que cumpre
}

// RASCUNHO (proposta do Claude). A ordem é a das missões do subúrbio
export const SHOWS_XENOM: ShowXenom[] = [
  {
    id: "gata", faixa: "Gata Mia", src: "/audio/tracks/gata-mia.mp3", missao: "dbee",
    multiverso: "o multiverso dos gatos", tema: "aqui tudo cai de pé, mas do lado errado: o braço da guitarra é espelhado",
    preludio: "você caiu num mundo onde os gatos mandam", cor: "#ff5fae", gd: "casa-dbee",
    regra: { t: "espelho" }, objetivo: { t: "nota", min: 0.5, texto: "acerte metade das notas com o mundo do avesso" },
    paga: 1.6, bonus: 120, prestigio: 4,
  },
  {
    id: "boom", faixa: "Boom Boom K", src: "/audio/tracks/boom-boom-k.mp3", missao: "oficina",
    multiverso: "o multiverso que explode", tema: "o lixo virou tecnologia e a tecnologia virou bomba: cada nota explode",
    preludio: "a oficina do outro lado: tudo aqui faz boom", cor: "#ff9000", gd: "beco",
    regra: { t: "explosao" }, objetivo: { t: "seq", min: 15, texto: "faça 15 notas seguidas sem deixar explodir errado" },
    paga: 1.6, bonus: 120, prestigio: 4,
  },
  {
    id: "tedio", faixa: "Tédio", src: "/audio/tracks/tedio.mp3", missao: "quadra",
    multiverso: "o multiverso cinza", tema: "um mundo onde nada acontece: a galera acesa traz a cor de volta",
    preludio: "a quadra do outro lado: ninguém lembra o que é cor", cor: "#c9d3e6", gd: "casa-shows",
    regra: { t: "cinza" }, objetivo: { t: "galera", min: 0.6, texto: "termine com a galera acesa (60%) e o mundo colorido" },
    paga: 1.6, bonus: 120, prestigio: 4,
  },
  {
    id: "dez", faixa: "10 D3 10", src: "/audio/tracks/10de10.mp3", missao: "tuneis",
    multiverso: "o multiverso dos jurados", tema: "embaixo das raízes, no escuro, três jurados dão nota pra tudo",
    preludio: "os túneis do outro lado: aqui tudo vale nota", cor: "#9b8cff", gd: "plataforma",
    regra: { t: "jurados" }, objetivo: { t: "nota", min: 0.7, texto: "tire nota 7 ou mais dos jurados, quase no escuro" },
    paga: 1.6, bonus: 120, prestigio: 4,
  },
]

export const XENOM_CONFIG = {
  // o álbum inteiro no untitled quando os 4 forem cumpridos
  album: { nome: "Subúrbio Xenom", link: TIER_META.suburbio.projectLink },
  // [gosto] o show só abre com a missão do subúrbio feita (false = os 4 abertos desde o começo)
  precisaDaMissao: true,
}

export const faixaXenom = (id: XenomId): FaixaXenom => `xenom-${id}`
export const ehFaixaXenom = (f: string): f is FaixaXenom => f.startsWith("xenom-") && SHOWS_XENOM.some((x) => `xenom-${x.id}` === f)
export const xenomPorId = (id: string) => SHOWS_XENOM.find((x) => x.id === id) ?? null
export const xenomDaFaixa = (f: string) => (ehFaixaXenom(f) ? xenomPorId(f.slice(6)) : null)
export const xenomDaMissao = (m: MissaoId) => SHOWS_XENOM.find((x) => x.missao === m) ?? null

// ── aberto? (a missão do subúrbio feita) ──
export const xenomAberto = (h: HistoriaDisco, x: ShowXenom) => !XENOM_CONFIG.precisaDaMissao || feita13(h, x.missao)
export const travaXenom = (x: ShowXenom) => `abre na missão ${x.missao === "dbee" ? "da" : x.missao === "tuneis" ? "dos" : "do"} ${MISSOES13[x.missao].quem.replace(/^(o|os) /, "")}`

// ── o show no save (hist.show) ──
export const showXenom = (id: XenomId) => `xenom:${id}`
export const lerShowXenom = (show: string) => (show.startsWith("xenom:") ? xenomPorId(show.slice(6)) : null)

// ── o objetivo ──
export interface FimXenom { nota: number; maxSeq: number; galera: number }
export function cumpriu(x: ShowXenom, f: FimXenom): boolean {
  const o = x.objetivo
  return o.t === "nota" ? f.nota >= o.min : o.t === "seq" ? f.maxSeq >= o.min : f.galera >= o.min
}
// a nota dos jurados (0 a 10, de meio em meio): a nota do show
export const notaDosJurados = (nota: number) => Math.round(Math.max(0, Math.min(1, nota)) * 20) / 2

export const xenomFeito = (h: HistoriaDisco, id: XenomId) => !!h.xenom?.[id]?.cumprida
export const xenomCumpridos = (h: HistoriaDisco) => SHOWS_XENOM.filter((x) => xenomFeito(h, x.id)).length
export const albumLiberado = (h: HistoriaDisco) => xenomCumpridos(h) === SHOWS_XENOM.length

// o show acabou: as estrelas, se cumpriu, quanto paga (o cachê do T03 vezes o
// multiverso; na primeira vez que cumpre, o bônus e o prestígio) e se o álbum abriu
export function registrarXenom(h: HistoriaDisco, id: XenomId, f: FimXenom, cacheBase: number): { h: HistoriaDisco; estrelas: number; cumpriu: boolean; primeira: boolean; neon: number; prestigio: number; album: boolean } {
  const x = xenomPorId(id)!
  const ok = cumpriu(x, f)
  const antes = h.xenom?.[id]
  const primeira = ok && !antes?.cumprida
  const estrelas = estrelasDaNota(f.nota)
  const novo: HistoriaDisco = { ...h, xenom: { ...(h.xenom ?? {}), [id]: { melhor: Math.max(antes?.melhor ?? 0, estrelas), cumprida: !!antes?.cumprida || ok, vezes: (antes?.vezes ?? 0) + 1 } } }
  const neon = Math.round(cacheBase * x.paga) + (primeira ? x.bonus : 0)
  return { h: novo, estrelas, cumpriu: ok, primeira, neon, prestigio: primeira ? x.prestigio : 0, album: primeira && albumLiberado(novo) && !albumLiberado(h) }
}
