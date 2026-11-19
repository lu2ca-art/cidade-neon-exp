// A D-BEE SUGERE (05/11, bíblia §5: "a D-Bee é a narradora [...] ela ajuda a
// pessoa a saber o que deve fazer e, principalmente, o que pode fazer fora do
// eixo narrativo. No momento presente, sem cronologia").
//
// O CATÁLOGO ÚNICO do que dá pra fazer agora. Cada entrada diz:
//   - quando vale (a fase, a zona, a hora, o veículo, o que ele já fez, o que está perto)
//   - o que a D-Bee fala (RASCUNHO: o LU2CA reescreve; a voz dela é carinhosa,
//     gíria leve, curta)
//   - o alvo no mapa (se houver): tocar na frase marca ele no GPS
//
// Aqui é só a regra (função pura, sem React e sem áudio). Quem decide a hora de
// falar e marca o alvo é `DbeeSugere.tsx`. Ver docs/dbee-sugere.md.

import type { PistaId } from "../estrada/pistas"
import type { LugarId } from "../lugares"
import type { ZonaSom } from "./radioAntiga"
import { CHAO_LUGARES, type FaseDisco, type HistoriaDisco, type LugarChao } from "./historia"
import { PORTOES_RUA, type PlacarRua } from "./corridaRua"
import { MISSOES13, feita13, type MissaoId } from "./portas"
import { MARCOS, episodioDaMissao } from "./episodios"
import { aoOuvirCompleta } from "./musicaContinua"
import { ENTRADAS, IDS_ABERTOS, type LugarAberto } from "./abertos"
import { INSTRUMENTOS_ANCESTRAIS } from "./instrumentos"
import { metroFeitoNaHistoria } from "./metro"

// ── os números (o dono afina) ──
export const DBEE_CFG = {
  cadaMs: 3000, // a cada quanto o DbeeSugere olha o jogo (nada por quadro)
  intervaloMs: 45000, // (09/11, bíblia §14: mais frequentes) no máximo uma mensagem a cada isso, somando os amigos
  paradoMs: 45000, // sem missão e sem nada acontecendo há isso: ela sugere
  depoisDeAlgoMs: 8000, // acabou alguma coisa (corrida, peça, sala): ela sugere depois disso
  primeiraMs: 45000, // a primeira fala, contando de quando a estrada abre
  ficaMs: 4500, // quanto tempo a frase respira parada no notch (além de entrar e rolar)
  pertoM: 450, // o alvo a menos disso pesa mais (o que está perto)
  chegouM: 45, // chegou no alvo marcado: conta como feito e a marca some
  cor: "#3d7bff", // a cor da D-Bee (roteiros.ts VOZES)
}

// ── a memória (fica no save, em `dbee`) ──
export interface MemoriaDbee {
  // quantas vezes cada sugestão já passou (a chave da opção: "rua:chuva", "missao:drew")
  n: Record<string, number>
  // o que ele já fez (chegou no alvo, ou o jogo viu: subiu na moto, ligou a rádio…)
  feitas: string[]
  // a última que passou (não repete a mesma seguida)
  ultima?: string
  // as ruas cuja faixa completa ele já ouviu inteira (musicaContinua.ts)
  ouvidas: string[]
  // (06/11) os lugares do chão em que ele já entrou (o id do CHAO_LUGARES:
  // "palco", "quadra", "bar"…). Opcional: save antigo lê `?? []`
  visitados?: string[]
}
export const MEMORIA_VAZIA: MemoriaDbee = { n: {}, feitas: [], ouvidas: [] }

// ── o alvo: onde fica (quem resolve em metros do mundo é o DbeeSugere, com o mapa) ──
export type AlvoDbee =
  | { t: "chao"; chao: LugarChao } // um lugar do chão do subúrbio (CHAO_LUGARES)
  | { t: "lugar"; lugar: LugarId } // um lugar das pistas (lugares.ts)
  | { t: "pagina"; id: "fliperama" | "ginasio" | "galeria" | "shows" } // um lugar que é página (paginas.ts)
  | { t: "pista"; pista: PistaId } // o começo de uma rua (a ida dela)
  | { t: "ponto"; x: number; z: number } // um ponto solto do chão (a largada da corrida)

// ── o que o catálogo lê do jogo (o DbeeSugere monta a cada olhada) ──
export interface CtxDbee {
  fase: FaseDisco | null
  h: HistoriaDisco | null
  zona: ZonaSom
  hora: number // 0–24
  veiculo: "kombi" | "moto" | "patins"
  motoLiberada: boolean
  radioLigada: boolean
  tvAberta: boolean
  piloto: boolean // o piloto do volante ligado
  // a rua (faixa) em que a Kombi está agora, se está numa
  naRua: PistaId | null
  // as ruas acesas (dá pra andar nelas)
  ruas: PistaId[]
  // as missões que dá pra pegar agora (as do mapa, sem a pegada e sem as feitas)
  disponiveis: MissaoId[]
  // a largada da corrida de rua já está no mapa
  corridaRua: boolean
  ruaSuburbio?: PlacarRua
  mem: MemoriaDbee
  // a distância (m) até um alvo; -1 = não sabe (o DbeeSugere resolve com o mapa)
  distancia: (a: AlvoDbee) => number
}

export interface OpcaoDbee {
  chave: string // única ("rua:chuva"); a memória conta por ela
  texto: string // sem o nome (quem mostra põe)
  quem?: string // (09/11) quem manda, se não é a D-Bee sugerindo (disco/amigos.ts); aí `cor` é a dele
  alvo: AlvoDbee | null
  nome?: string // o nome curto do alvo no GPS ("a corrida de rua")
  cor?: string
  peso: number
  repete?: boolean // continua valendo depois de feita (com peso menor)
}

export interface SugestaoDbee {
  id: string
  sobre: string // pra quem lê o código e o doc
  opcoes: (c: CtxDbee) => OpcaoDbee[]
}

const noite = (h: number) => h >= 19 || h < 5
const depoisDoPrologo = (f: FaseDisco | null) => f === "carreira" || f === "livre"
const feita = (c: CtxDbee, chave: string) => c.mem.feitas.includes(chave)
const um = (o: OpcaoDbee | null | false | undefined): OpcaoDbee[] => (o ? [o] : [])
const fmtTempo = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

// (RASCUNHO) o que a D-Bee diz de cada rua: a ideia do manifesto dela (docs/ruas-manifesto.md)
// `noite`: a rua fica mais bonita de noite (pesa mais)
export const RUAS_DBEE: Record<PistaId, { texto: string; noite?: boolean }> = {
  chuva: { texto: "já ouviu a CHUVA inteira? vai pela rua dela, de noite. segura o freio que vira guarda-chuva", noite: true },
  dopamina: { texto: "a rua da DopaminA pede sempre mais um. anda ela inteira e vê o que acontece quando você solta", noite: true },
  ontem: { texto: "na rua da Sabe Ontem? um dia inteiro cabe numa faixa. ouve até o fim, sem pressa" },
  copo: { texto: "Copo Americano enche e esvazia. pega a rua dela e deixa a faixa tocar inteira" },
  nectar: { texto: "a rua da Nectar escreve a letra nas flores. vai devagar que dá pra ler" },
  ojala: { texto: "Ojalá passa rápido que nem vento. pega a rua dela e não tira o pé" },
  swav: { texto: "a rua da Swav é salto de fé. confia e pula, que o chão aparece" },
  sexta: { texto: "a rua da Sexta-Feira tá de balada. passa por ela com a faixa inteira", noite: true },
  rollercoaster: { texto: "Rollercoaster é sobe e desce. a rua dela inteira, sem pular nenhum pedaço" },
}

// (RASCUNHO) como a D-Bee chama cada missão que dá pra pegar
export const MISSOES_DBEE: Partial<Record<MissaoId, string>> = {
  // (08/11) quem apresenta é o do episódio (disco/episodios.ts); a chave é o id antigo da peça
  notti: "o Mubarak acendeu o fliperama. diz que é o vício em forma de máquina. passa lá?",
  quadra: "o Alohan te espera no ginásio, e falta o beat. faz um no caminho?",
  mubarak: "a Nizzy tá na loja de discos com um disco antigo pra você. passa lá?",
  tony: "o Tony Gordo tá com a feira armada. leva um tempero?",
  tuneis: "embaixo das raízes tem corrida rolando. desce pelos túneis?",
  drew: "o Drew tá em casa de novo numa sexta. vai lá tirar ele do sofá?",
  xeriff: "o Xeriff tá caçando uma frequência que ninguém pega. ajuda ele? (fora da fila, quando quiser)",
  ella: "a Ella pinta e ninguém vê. vai lá ver os quadros dela?",
  nizzy: "o Notti te leva num passeio na Rollercoaster. bora?",
  lu2ca: "tem um palco esperando o LU2CA tocar a CHUVA. bora?",
}

// ── O CATÁLOGO ──
export const SUGESTOES_DBEE: SugestaoDbee[] = [
  {
    id: "missao",
    sobre: "as missões que dá pra pegar agora (uma opção por missão)",
    opcoes: (c) => c.disponiveis.map((id) => {
      const m = MISSOES13[id]
      return {
        chave: `missao:${id}`,
        texto: MISSOES_DBEE[id] ?? `${m.quem} falou: "${m.pedido}". passa lá?`,
        alvo: m.lugar.chao ? { t: "chao", chao: m.lugar.chao } : m.lugar.lugar ? { t: "lugar", lugar: m.lugar.lugar } : null,
        nome: m.quem,
        cor: m.cor,
        // (08/11) a missão de episódio (a sequência) pesa mais que a livre; o 4 e o 5 abrem juntos e pesam igual
        peso: episodioDaMissao(id) ? 3 : 1.4,
        repete: true,
      }
    }),
  },
  {
    id: "corrida-rua",
    sobre: "a corrida de rua do subúrbio (de moto ou de patins, o arco perto do bar)",
    opcoes: (c) => {
      if (!c.corridaRua || !depoisDoPrologo(c.fase)) return []
      const p = c.ruaSuburbio ?? {}
      const melhor = Math.min(p.melhor?.moto ?? Infinity, p.melhor?.patins ?? Infinity)
      const deRoda = c.veiculo !== "kombi"
      const texto = !p.corridas
        ? deRoda ? "tem corrida de rua aqui no subúrbio, perto do bar. de moto ou de patins vale. bora?" : "tem corrida de rua lá no subúrbio, perto do bar. desce de moto ou de patins"
        : !p.vitorias ? "a corrida de rua tá te devendo uma vitória. revanche?"
        : Number.isFinite(melhor) ? `teu melhor na corrida de rua é ${fmtTempo(melhor)}. dá pra baixar, hein` : "a corrida de rua tá chamando de novo"
      return [{ chave: "corrida-rua", texto, alvo: { t: "ponto", x: PORTOES_RUA[0].x, z: PORTOES_RUA[0].z }, nome: "a corrida de rua", cor: "#2fe8ff", peso: deRoda || c.zona === "suburbio" ? 1.6 : 1, repete: true }]
    },
  },
  {
    id: "sinuca",
    sobre: "a sinuca do bar O COPO (treino livre; a partida com o Mubarak é da missão)",
    opcoes: (c) => um(depoisDoPrologo(c.fase) && {
      chave: "sinuca",
      texto: c.h && MARCOS["show-nectar"].feito(c.h) ? "bora uma sinuca no Copo? só pra relaxar a mão" : "o Copo tá aberto e a mesa de sinuca tá lá, livre. vai treinar uma tacada?",
      alvo: { t: "chao", chao: "bar" }, nome: "o Copo", cor: CHAO_LUGARES.bar.cor,
      peso: noite(c.hora) ? 1.3 : 0.8, repete: true,
    }),
  },
  {
    id: "fliperama",
    sobre: "o fliperama da cidade (abre de noite; trancado até a missão do Notti, mas dá pra ver)",
    opcoes: (c) => um(depoisDoPrologo(c.fase) && {
      chave: "fliperama",
      texto: c.h && feita13(c.h, "notti") ? "o fliperama tá aceso. bora bater uns recordes?" : "dá uma olhada no fliperama da cidade. as máquinas tão lá, esperando acender",
      alvo: { t: "pagina", id: "fliperama" }, nome: "o fliperama", cor: "#ff6a35",
      peso: noite(c.hora) ? 1.4 : 0.6, repete: true,
    }),
  },
  {
    id: "radio-xenom",
    sobre: "a Rádio Xenom (69.9): no subúrbio, com a rádio desligada",
    opcoes: (c) => um((c.zona === "suburbio" || c.zona === "tuneis") && !c.radioLigada && !feita(c, "radio-xenom") && {
      chave: "radio-xenom",
      texto: "liga a rádio: a Xenom fala de tudo que rola aqui embaixo",
      alvo: null, peso: 1.2,
    }),
  },
  {
    id: "rua",
    sobre: "uma rua-manifesto cuja faixa ele ainda não ouviu inteira (uma opção por rua acesa)",
    opcoes: (c) => !depoisDoPrologo(c.fase) ? [] : c.ruas.filter((id) => !c.mem.ouvidas.includes(id) && id !== c.naRua).map((id) => ({
      chave: `rua:${id}`,
      texto: RUAS_DBEE[id].texto,
      alvo: { t: "pista", pista: id } as AlvoDbee,
      peso: (c.zona === "cidade" ? 1.2 : 0.7) * (RUAS_DBEE[id].noite && noite(c.hora) ? 1.6 : 1),
    })),
  },
  {
    id: "tv",
    sobre: "a TV do holo (o ♪ do notch): o clipe da faixa que toca",
    opcoes: (c) => um(c.veiculo === "kombi" && c.zona === "cidade" && !!c.naRua && !c.tvAberta && !feita(c, "tv") && {
      chave: "tv", texto: "toca no ♪ lá em cima: a TV mostra o clipe da faixa que tá tocando", alvo: null, peso: 1,
    }),
  },
  {
    id: "piloto",
    sobre: "o piloto automático (o volante do lado do GPS) pra só curtir a faixa",
    opcoes: (c) => um(c.veiculo === "kombi" && c.zona === "cidade" && !!c.naRua && !c.piloto && {
      chave: "piloto", texto: "solta o volante um pouco: liga o piloto do lado do GPS e só curte a faixa",
      alvo: null, peso: feita(c, "piloto") ? 0.4 : 1, repete: true,
    }),
  },
  {
    id: "grafite",
    sobre: "o salão do grafite nos túneis (a boca no chão do subúrbio)",
    opcoes: (c) => um(depoisDoPrologo(c.fase) && {
      chave: "grafite", texto: "lá embaixo nos túneis tem um salão inteirinho de grafite. vai deixar tua assinatura?",
      alvo: { t: "chao", chao: "tuneis" }, nome: "os túneis", cor: CHAO_LUGARES.tuneis.cor,
      peso: c.zona === "suburbio" ? 1.2 : 0.7, repete: true,
    }),
  },
  {
    id: "casa",
    sobre: "a casa da D-Bee com os instrumentos (no deserto)",
    opcoes: (c) => {
      if (!depoisDoPrologo(c.fase) || !c.h) return []
      const tem = c.h.instrumentos ?? [], vistos = c.h.instrumentosVistos ?? []
      const novos = tem.filter((i) => !vistos.includes(i)).length
      return um({
        chave: novos ? `casa:novo:${tem.length}` : "casa",
        texto: novos ? (() => { const x = INSTRUMENTOS_ANCESTRAIS[tem.filter((i) => !vistos.includes(i))[0]]; return `ganhou ${x.artigo} ${x.nome}: passa lá em casa pra gente tocar junto` })() : tem.length ? "minha casa tá aberta, os instrumentos tão lá. vem tocar quando quiser" : "passa lá em casa um dia. o deserto de noite é outra coisa",
        alvo: { t: "chao", chao: "casa" }, nome: "a casa da D-Bee", cor: CHAO_LUGARES.casa.cor,
        peso: novos ? 1.8 : c.zona === "deserto" ? 1 : 0.5, repete: true,
      })
    },
  },
  {
    id: "moto",
    sobre: "a moto guardada na Kombi (depois da missão dos túneis)",
    opcoes: (c) => um(c.motoLiberada && c.veiculo === "kombi" && !feita(c, "moto") && {
      chave: "moto", texto: "a moto tá guardadinha na Kombi. toca em \"moto\" e vai dar um rolê pelo subúrbio",
      alvo: null, peso: 1.5,
    }),
  },
]

// (06/11, RASCUNHO) o que a D-Bee diz de cada lugar do chão que abre uma
// experiência (disco/abertos.ts). `fechado`: a porta ainda não abriu (tudo
// visitável: ela chama pra ver o cadeado e o que libera)
// (09/11) sem o palco do deserto: ele é o lugar do último show e não tem fala escrita pelo dono
export const ABERTOS_DBEE: Record<Exclude<LugarAberto, "palcoDeserto">, { texto: string; fechado?: string }> = {
  ginasio: { texto: "conhece o ginásio lá no fundo do subúrbio? entra e joga uma", fechado: "o ginásio do subúrbio tá fechado, mas passa lá pra ver o que abre ele" },
  galeria: { texto: "tem uma galeria perto da oficina. entra pra ver os quadros", fechado: "a galeria do subúrbio tá trancada. dá uma olhada na porta, ela diz o que falta" },
  batida: { texto: "o estúdio da batida tá ali no subúrbio. bora fazer um beat?", fechado: "o estúdio da batida tá esperando. cola lá e vê o que destrava" },
  palco: { texto: "o palco do subúrbio tem show hoje. sobe lá" },
  discos: { texto: "a loja de discos é a do vinil gigante. passa lá, garimpa um" },
  brecho: { texto: "o brechó tem roupa nova na arara. bora trocar o visu?" },
  flores: { texto: "os canteiros de flores ficam no oeste. passa lá e cuida delas" },
  quadra: { texto: "a quadra tá liberada. vai lá arremessar umas", fechado: "passa na quadra: o Alohan tá lá e ela ainda não abriu" },
  feira: { texto: "tem feira no subúrbio, bem colorida. passa lá?" }, // RASCUNHO
}

// (06/11) o que entrou hoje e ninguém apontava: os lugares do chão, o grafite
// livre, o metrô de revanche, o violão na rua e o mundo depois do final
SUGESTOES_DBEE.push(
  {
    id: "aberto",
    sobre: "o lugar do chão do subúrbio mais perto que ele ainda não visitou (uma opção só)",
    opcoes: (c) => {
      if (!depoisDoPrologo(c.fase) || !c.h) return []
      const portas = c.h.portas ?? []
      let melhor: OpcaoDbee | null = null, dMelhor = Infinity
      for (const id of IDS_ABERTOS) {
        if (id === "palcoDeserto") continue
        const chave = `aberto:${id}`
        if (feita(c, chave) || visitou(c.mem, id)) continue
        const e = ENTRADAS[id], fala = ABERTOS_DBEE[id]
        const fechado = "porta" in e && !portas.includes(e.porta)
        const d = c.distancia({ t: "chao", chao: id })
        const dd = d < 0 ? 1e9 : d
        if (dd >= dMelhor) continue
        dMelhor = dd
        melhor = {
          chave, texto: fechado && fala.fechado ? fala.fechado : fala.texto,
          alvo: { t: "chao", chao: id }, nome: e.nome, cor: CHAO_LUGARES[id].cor,
          peso: (c.zona === "suburbio" ? 1.5 : 0.6) * (fechado ? 0.6 : 1),
        }
      }
      return um(melhor)
    },
  },
  {
    id: "grafite-livre",
    sobre: "o grafite livre (o desenho à mão) nas paredes dos túneis, depois da missão dos túneis e enquanto não pintou nenhuma",
    opcoes: (c) => um(!!c.h && feita13(c.h, "tuneis") && !c.h.tagLivre && !c.h.paredesLivres?.some(Boolean) && {
      chave: "grafite-livre",
      texto: c.zona === "tuneis" ? "achou uma parede livre? toca em pintar e faz o teu desenho" : "tem tinta sobrando nos túneis. desce e faz a tua tag na parede",
      alvo: c.zona === "tuneis" ? null : { t: "chao", chao: "tuneis" }, nome: "os túneis", cor: CHAO_LUGARES.tuneis.cor,
      peso: c.zona === "tuneis" ? 1.6 : c.zona === "suburbio" ? 1.3 : 0.7,
    }),
  },
  {
    id: "metro-revanche",
    sobre: "o metrô de revanche: o trem parado no salão do metrô dos túneis (depois da fuga da história)",
    opcoes: (c) => um(metroFeitoNaHistoria(c.h) && {
      chave: "metro-revanche",
      texto: c.zona === "tuneis" ? "o trem branco tá parado no salão do metrô. entra e foge de novo, agora sabendo o caminho" : "o trem que te levou o violão tá parado lá nos túneis. bora uma revanche?",
      alvo: c.zona === "tuneis" ? null : { t: "chao", chao: "tuneis" }, nome: "o metrô dos túneis", cor: "#c9d3e6",
      peso: c.zona === "tuneis" ? 1.4 : 0.8, repete: true,
    }),
  },
  {
    id: "violao-rua",
    sobre: "o violão na rua (o botão à direita com música tocando); sem ele depois do metrô",
    opcoes: (c) => um(depoisDoPrologo(c.fase) && !!c.h && !c.h.perdeuViolao && (c.radioLigada || !!c.naRua) && !c.piloto && {
      chave: "violao-rua",
      texto: "tá tocando música? abre o violão ali do lado e toca junto, no tom da faixa",
      alvo: null, peso: 0.9,
    }),
  },
  {
    id: "mundo-depois",
    sobre: "o mundo depois do final: as plantas nos prédios, as cabines nas torres, o rio nos túneis",
    opcoes: (c) => {
      if (!c.h || !feita13(c.h, "final")) return []
      return [
        { chave: "depois:plantas", texto: "olha os prédios altos: tem planta saindo das janelas. a chuva pegou", alvo: null, peso: c.zona === "cidade" ? 1.2 : 0.5 },
        { chave: "depois:cabines", texto: "repara nas torres: as cabines sobem e descem de novo. dá pra ver da pista", alvo: null, peso: c.zona === "cidade" ? 1 : 0.4 },
        { chave: "depois:rio", texto: "desce nos túneis: o rio seco voltou a correr", alvo: c.zona === "tuneis" ? null : { t: "chao", chao: "tuneis" } as AlvoDbee, nome: "o rio dos túneis", cor: "#4fc3ff", peso: c.zona === "tuneis" ? 0.6 : 1 },
      ]
    },
  },
)

// ── A ESCOLHA: todas as opções que valem agora, sem a última, pesadas pelo
// que já passou (a que passou menos vem mais), pelo que já fez (feita só volta
// se repete, mais fraca) e pelo que está perto ──
export const comecoDaCarreira = (c: Pick<CtxDbee, "fase" | "h">) =>
  c.fase === "carreira" && !!c.h && (c.h.feitas13 ?? []).filter((id) => !MISSOES13[id]?.prologo).length < 2
export function escolherDbee(c: CtxDbee, sorteio = Math.random()): OpcaoDbee | null {
  const todas: OpcaoDbee[] = []
  for (const s of SUGESTOES_DBEE) for (const o of s.opcoes(c)) {
    if (o.chave === c.mem.ultima) continue
    // (jogador novo 2) até a 2ª missão da cidade, só as missões (o próximo passo)
    if (comecoDaCarreira(c) && !o.chave.startsWith("missao:")) continue
    const fez = feita(c, o.chave)
    if (fez && !o.repete) continue
    let p = o.peso / (1 + (c.mem.n[o.chave] ?? 0))
    if (fez) p *= 0.35
    if (o.alvo) {
      const d = c.distancia(o.alvo)
      if (d >= 0 && d < DBEE_CFG.pertoM) p *= d < 60 ? 0.2 : 1.6 // já está em cima: não tem graça
    }
    if (p > 0) todas.push({ ...o, peso: p })
  }
  if (!todas.length) return null
  const total = todas.reduce((a, o) => a + o.peso, 0)
  let r = sorteio * total
  for (const o of todas) { r -= o.peso; if (r <= 0) return o }
  return todas[todas.length - 1]
}

// ── a memória: as contas puras (o DbeeSugere guarda) ──
export const comSugerida = (m: MemoriaDbee, chave: string): MemoriaDbee => ({ ...m, ultima: chave, n: { ...m.n, [chave]: (m.n[chave] ?? 0) + 1 } })
export const comFeita = (m: MemoriaDbee, chave: string): MemoriaDbee => (m.feitas.includes(chave) ? m : { ...m, feitas: [...m.feitas, chave] })
export const comVisitado = (m: MemoriaDbee, id: string): MemoriaDbee => ((m.visitados ?? []).includes(id) ? m : { ...m, visitados: [...(m.visitados ?? []), id] })
export const visitou = (m: MemoriaDbee, id: string) => (m.visitados ?? []).includes(id)
export const comOuvida = (m: MemoriaDbee, pista: string): MemoriaDbee => (m.ouvidas.includes(pista) ? m : { ...m, ouvidas: [...m.ouvidas, pista] })

// ── a memória viva (uma loja fora do React): o DbeeSugere muda, a página grava no save ──
let MEM: MemoriaDbee = MEMORIA_VAZIA
const ouvintesMem = new Set<(m: MemoriaDbee) => void>()
export const lerMemoriaDbee = () => MEM
/** a página põe a memória do save (ao carregar); não avisa ninguém */
export function definirMemoriaDbee(m: Partial<MemoriaDbee> | null | undefined) {
  MEM = { ...MEMORIA_VAZIA, ...(m ?? {}) }
}
export function mudarMemoriaDbee(f: (m: MemoriaDbee) => MemoriaDbee) {
  const n = f(MEM)
  if (n === MEM) return
  MEM = n
  ouvintesMem.forEach((o) => o(MEM))
}
/** (06/11) entrou num lugar do chão: fica no save (dbee.visitados); a D-Bee para de sugerir e o mapa põe o ✓ */
export const marcarVisitaDbee = (id: string) => mudarMemoriaDbee((m) => comVisitado(m, id))
/** (06/11) o jogo viu ele fazer (o violão tocou uma vez…): a sugestão sem `repete` some */
export const marcarFeitaDbee = (chave: string) => mudarMemoriaDbee((m) => comFeita(m, chave))
export const ouvirMemoriaDbee = (o: (m: MemoriaDbee) => void) => { ouvintesMem.add(o); return () => { ouvintesMem.delete(o) } }
// a faixa completa de uma rua tocou inteira: a D-Bee não sugere mais aquela rua
aoOuvirCompleta((id) => mudarMemoriaDbee((m) => comOuvida(m, id)))
