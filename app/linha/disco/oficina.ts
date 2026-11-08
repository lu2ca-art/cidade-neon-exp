// A MISSÃO DA OFICINA (T09, 28/10): a missão 2 do subúrbio. Decidido 27/10
// (retomar-mundo.md, "As 13 portas" e "Arte e jogo em cada missão"):
//
//   o Criador chega só com o PLANO (água + painel solar = a energia pra subir)
//   a ARTE  = a reciclagem: pegar lixo e transformar em tecnologia (a bancada)
//   o JOGO  = achar um painel solar velho no lixão e depois uma goteira pra
//             coletar a água do motor
//
// (T57, o dono 28/10: "as coisas acontecem no mundo, de verdade") a reciclagem
// saiu da bancada de menu: o lixo (o ventilador, a máquina de lavar, o rádio
// velho e o painel solar) fica ESPALHADO no lixão, e ele pega cada um no mundo,
// de Kombi ou de patins (a coluna de luz e o GPS mostram onde). Com as quatro, a
// oficina monta (a arte). O jogo fica a goteira; o resto do T09 segue igual
//   a PORTA = as melhorias de desempenho da Kombi (o mecânico, pago em água)
//
// Das jogadas (J2: 18, 19): o mecânico é pago em água, a que a D-Bee deu (ela
// não precisava); o contador desce na tela e, a cada 10, faz um som de água.
//
// [gosto] QUEM É O MECÂNICO ainda é do dono: o nome, a cor e as falas moram
// aqui (MECANICO) e são provisórios. Tudo que é texto é RASCUNHO.
// As funções são puras (recebem a história do save): a page.tsx só chama.

import type { Cena } from "../cenas"
import { PECAS_CHAO, type PecaChao } from "./achados"
import type { HistoriaDisco, LugarChao } from "./historia"
import { feita13, pecaFeita } from "./portas"
import { MARCOS } from "./episodios"

// ── [gosto] quem é o mecânico: PROVISÓRIO (troca aqui; o resto segue sozinho) ──
export const MECANICO = {
  // (08/11) o mecânico é o Mubarak (episodios.md): conhecer ele é a cena da oficina (ep. 1)
  nome: "Mubarak",
  cor: "#ffc857",
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
  // o contador do pagamento: um passo a cada tantos ms; o som de água a cada 10
  passoMs: 45,
  somACada: 10,
}

// ── a arte: a reciclagem (RASCUNHO) ──
// o lixo espalhado no lixão (a ordem é a da rota que o GPS sugere) e a peça do
// plano que sai de cada um. Os lugares moram em historia.ts (CHAO_LUGARES)
export interface LixoChao { id: PecaChao; nome: string; vira: string; cor: string }
export const LIXO: LixoChao[] = [
  { id: "painel", nome: "um painel solar velho", vira: "a célula do sol", cor: "#4fc3ff" },
  { id: "lavadora", nome: "uma máquina de lavar", vira: "a bomba d'água", cor: "#c9d3e6" },
  { id: "ventilador", nome: "um ventilador quebrado", vira: "a bobina", cor: "#4fc3ff" },
  { id: "radio", nome: "um rádio velho", vira: "a fiação", cor: "#ff6a35" },
]
export const PLANO = LIXO.map((l) => l.vira)
export const lixoDe = (id: string) => LIXO.find((l) => l.id === id)
// as que ele já catou (só as que existem) e as que faltam, na ordem da rota
export const pecasCatadas = (h: HistoriaDisco) => PECAS_CHAO.filter((id) => (h.oficina?.pecas ?? []).includes(id) || (id === "painel" && !!h.oficina?.painel))
export const pecasFaltando = (h: HistoriaDisco) => LIXO.map((l) => l.id).filter((id) => !pecasCatadas(h).includes(id))

// ── as falas (RASCUNHO) ──
export const FALAS_OFICINA = {
  // a D-Bee ao dar a água (no fim da cena da casa)
  dbeeAgua: "leva essa água. eu não preciso dela. vc vai",
  // (T57) depois da cena: o lixo bom está lá fora, espalhado no lixão
  catar: "o que presta tá no lixão, pro leste: um painel solar velho, uma máquina de lavar, um ventilador e um rádio. vai de kombi ou de patins. a luz mostra onde",
  // pegou uma (o nome do lixo entra no começo) e pegou a última
  pegou: "isso serve",
  catou: "tudo aí? traz pra oficina que eu monto",
  // a oficina monta: o lixo vira as peças do motor (a arte)
  monta: "segura aí. o ventilador tem bobina, a máquina tem bomba, o rádio tem fio. e o sol, a gente pega do painel",
  // montou: agora a água
  goteira: "o motor tá aí. agora a água dele: tem uma goteira embaixo da pista, aqui pertinho. enche o tanque",
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
// (T57) catar = pegar o lixo espalhado no lixão; reciclar = com as quatro, a oficina monta
export type PassoOficina = "chegar" | "show" | "catar" | "reciclar" | "goteira" | "montar" | "feita"
export function passoOficina(h: HistoriaDisco): PassoOficina {
  if (feita13(h, "oficina")) return "feita"
  if (!h.oficina?.cena) return "chegar"
  // (08/11) o show da Nectar no palco do bar fecha o ep. 1, antes da oficina do ep. 2
  if (!MARCOS["show-nectar"].feito(h)) return "show"
  if (!pecaFeita(h, "oficina", "arte")) return pecasFaltando(h).length ? "catar" : "reciclar"
  if (!pecaFeita(h, "oficina", "jogo")) return "goteira"
  return "montar"
}
// pra onde ir no chão do subúrbio (a coluna de luz, o drone, a chegada): catando, a próxima peça da rota
export function alvoOficina(h: HistoriaDisco): LugarChao | null {
  const p = passoOficina(h)
  return p === "feita" ? null : p === "show" ? "bar" : p === "catar" ? pecasFaltando(h)[0] : p === "goteira" ? "goteira" : "oficina"
}
// o objetivo no topo da tela
export const OBJETIVO_OFICINA: Record<PassoOficina, string> = {
  chegar: "a oficina · o subúrbio",
  show: "o palco do bar · a Nectar",
  catar: "o lixo bom · o lixão",
  reciclar: "volta pra oficina · ela monta",
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
    { t: "fala", de: M, texto: "mubarak. a oficina é minha, o resto é de ninguém" },
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
    { t: "fala", de: M, texto: "bora. o lixo que presta não tá aqui dentro. tá lá fora, jogado no lixão" },
    { t: "fim" },
  ],
}
