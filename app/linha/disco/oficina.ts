// A MISSÃO DA OFICINA (T09, 28/10): a missão 2 do subúrbio. Decidido 27/10
// (retomar-mundo.md, "As 13 portas" e "Arte e jogo em cada missão"):
//
//   o Criador chega só com o PLANO (água + painel solar = a energia pra subir)
//   a ARTE  = a reciclagem: pegar lixo e transformar em tecnologia (a bancada)
//   o JOGO  = achar um painel solar velho no lixão e depois uma goteira pra
//             coletar a água do motor
//   a PORTA = as melhorias de desempenho da Kombi (o mecânico, pago em água)
//
// Das jogadas (J2: 18, 19): o mecânico é pago em água, a que a D-Bee deu (ela
// não precisava); o contador desce na tela e, a cada 10, faz um som de água.
//
// [gosto] QUEM É O MECÂNICO ainda é do dono: o nome, a cor e as falas moram
// aqui (MECANICO) e são provisórios. Tudo que é texto é RASCUNHO.
// As funções são puras (recebem a história do save): a page.tsx só chama.

import type { Cena } from "../cenas"
import type { HistoriaDisco, LugarChao } from "./historia"
import { feita13, pecaFeita } from "./portas"

// ── [gosto] quem é o mecânico: PROVISÓRIO (troca aqui; o resto segue sozinho) ──
export const MECANICO = {
  nome: "o mecânico",
  cor: "#ff9000",
}

// ── os números (RASCUNHO) ──
export const OFICINA_CFG = {
  // a água que a D-Bee dá ao sair da casa dela (J2: 18, "deu pra pagar a kombi")
  aguaDaDbee: 60,
  // o serviço do mecânico (montar o motor), em água. Se faltar, ele monta com o
  // que tiver (nada trava)
  precoMotor: 60,
  // quantas gotas a goteira enche no tanque do motor
  gotasDaGoteira: 10,
  // quantas vezes cavar até o painel aparecer
  cavadas: 4,
  // o contador do pagamento: um passo a cada tantos ms; o som de água a cada 10
  passoMs: 45,
  somACada: 10,
}

// ── a arte: a bancada da reciclagem (RASCUNHO) ──
// o plano tem 3 peças; o lixo da bancada tem as 3 escondidas e uns que não servem
export interface LixoBancada { id: string; nome: string; vira: string | null; cor: string }
export const PLANO = ["a bobina", "a bomba d'água", "a fiação"] as const
export const BANCADA: LixoBancada[] = [
  { id: "ventilador", nome: "um ventilador quebrado", vira: "a bobina", cor: "#4fc3ff" },
  { id: "lata", nome: "uma lata amassada", vira: null, cor: "#8a7d6a" },
  { id: "lavadora", nome: "uma máquina de lavar", vira: "a bomba d'água", cor: "#c9d3e6" },
  { id: "pneu", nome: "um pneu careca", vira: null, cor: "#3a3440" },
  { id: "radio", nome: "um rádio velho", vira: "a fiação", cor: "#ff6a35" },
  { id: "tenis", nome: "um tênis sem par", vira: null, cor: "#ff3fb0" },
]

// ── as falas (RASCUNHO) ──
export const FALAS_OFICINA = {
  // a D-Bee ao dar a água (no fim da cena da casa)
  dbeeAgua: "leva essa água. eu não preciso dela. vc vai",
  // depois da bancada: o motor montado; falta o painel
  painel: "o motor tá aí. falta o que faz ele andar: um painel. tem um velho enterrado no lixão, pro lado das carcaças",
  // achou o painel: agora a água
  goteira: "isso aí. agora a água do motor: tem uma goteira embaixo da pista, aqui pertinho. enche o tanque",
  // a goteira encheu: de volta pra oficina
  voltar: "tanque cheio. traz pra cá que eu monto",
  // na hora de pagar
  pagar: "aqui embaixo ninguém paga com neon. é água. a que a D-Bee te deu paga o serviço",
  pago: "pago. agora deixa comigo",
  // faltou água (nada trava: ele monta e fica fiado)
  fiado: "faltou um pouco. fica fiado: vc volta com mais",
  // depois da porta: a Kombi voa
  voa: "agora ela voa. segura o espaço. a cidade é lá em cima: pousa numa pista acesa",
  // na oficina, depois da missão (a lojinha das melhorias)
  sempre: "voltou? aqui embaixo a gente paga em água. só o que faz ela andar melhor",
}

// ── o passo da missão (o que a história pede agora) ──
export type PassoOficina = "chegar" | "reciclar" | "painel" | "goteira" | "montar" | "feita"
export function passoOficina(h: HistoriaDisco): PassoOficina {
  if (feita13(h, "oficina")) return "feita"
  if (!h.oficina?.cena) return "chegar"
  if (!pecaFeita(h, "oficina", "arte")) return "reciclar"
  if (!h.oficina?.painel) return "painel"
  if (!pecaFeita(h, "oficina", "jogo")) return "goteira"
  return "montar"
}
// pra onde ir no chão do subúrbio (a coluna de luz, o drone, a chegada)
export function alvoOficina(h: HistoriaDisco): LugarChao | null {
  const p = passoOficina(h)
  return p === "feita" ? null : p === "painel" ? "painel" : p === "goteira" ? "goteira" : "oficina"
}
// o objetivo no topo da tela
export const OBJETIVO_OFICINA: Record<PassoOficina, string> = {
  chegar: "a oficina · o subúrbio",
  reciclar: "a bancada · a oficina",
  painel: "o painel solar · o lixão",
  goteira: "a goteira · embaixo da pista",
  montar: "volta pra oficina",
  feita: "a cidade · lá em cima",
}

// o pagamento: quanto sai (nunca mais do que tem) e os pontos do contador
export function pagamentoMotor(agua: number, preco = OFICINA_CFG.precoMotor) {
  const tem = Math.max(0, Math.floor(agua || 0))
  const pago = Math.min(tem, preco)
  return { de: tem, para: tem - pago, pago, falta: preco - pago }
}
// quantos sons de água o contador faz descendo de `de` até `para` (cada vez que passa por um múltiplo de 10)
export function sonsDoContador(de: number, para: number, cada = OFICINA_CFG.somACada) {
  let n = 0
  for (let v = de - 1; v >= para; v--) if (v % cada === 0) n++
  return n
}

// ── A CENA (RASCUNHO): ele chega só com o plano; o mecânico fala dos corredores
// do subúrbio (o gancho dos rachas, T44; J2: 16, 17). Depois dela, a bancada ──
const M = MECANICO.nome
export const CENA_OFICINA: Cena = {
  lugar: "oficina",
  titulo: "a oficina",
  missao: "nectar",
  passos: [
    { t: "acao", texto: "uma garagem no chão, embaixo das pistas. carcaças penduradas no teto, um rádio velho chiando. a kombi entra tossindo" },
    { t: "fala", de: M, texto: "uma kombi. faz uns duzentos anos que ninguém vê uma dessas" },
    { t: "acao", texto: "você não traz peça nenhuma. só um papel dobrado: o desenho de um motor. a água de um lado, o sol do outro" },
    { t: "fala", de: M, texto: "isso aí é o quê?" },
    {
      t: "escolha",
      opcoes: [
        { label: "um motor a água", tom: "dormindo", resposta: [{ de: M, texto: "água? aqui embaixo a água vale mais que o motor" }] },
        { label: "o sol e a água juntos: dá pra subir", tom: "acordando", resposta: [{ de: M, texto: "subir? ninguém sobe daqui faz tempo" }] },
        { label: "é só o plano. não tenho peça", tom: "acordado", resposta: [{ de: M, texto: "plano todo mundo tem. peça é que ninguém tem" }] },
      ],
    },
    { t: "fala", de: M, texto: "peça nova não existe aqui embaixo. tudo que a gente tem caiu lá de cima" },
    { t: "fala", de: M, texto: "a gente pega o lixo deles e faz virar coisa" },
    // o gancho dos rachas (T44): RASCUNHO
    { t: "acao", texto: "na parede, fotos de carros que você nunca viu: rebaixados, cromados, uns com asa" },
    { t: "fala", de: M, texto: "esses aí são os meninos. passaram tudo por aqui. rodam a cidade a noite inteira" },
    { t: "fala", de: M, texto: "de vez em quando se trombam lá em cima e tiram um racha. ninguém sabe de onde eles vêm" },
    { t: "fala", de: M, texto: "um deles jura que veio de outro tempo. igual vc, né? vai saber" },
    { t: "fala", de: M, texto: "bora. primeiro a bancada: me ajuda a achar o que presta nesse lixo" },
    { t: "fim" },
  ],
}
