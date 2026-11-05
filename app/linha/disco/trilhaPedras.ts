// A TRILHA DE PEDRAS (notas 03/11, 16:09, o dono: "quero que o tutorial pareça
// uma trilha de pedras feita pra seguir e não errar o caminho"). O roteiro
// ÚNICO do tutorial vivo: uma lista ordenada de pedras. Cada pedra diz
//   - quando aparece (uma condição no estado do jogo),
//   - onde ancora (a coisa de verdade da tela: o mapa, o anel, o notch, o turbo…),
//   - o texto, curtíssimo (no máximo 6 palavras),
//   - quando conta como feita (a ação real do jogador, nunca um "ok").
// Uma pedra por vez, nunca duas. Sem tela preta, sem fundo escurecido: um balão
// pequeno preso no alvo, o alvo pulsando de leve (disco/TrilhaPedras.tsx).
// O "?" do notch é a própria trilha: mostra a pedra de agora e as que já passaram.
//
// O que já foi feito fica no save (historia.tutorial, os mesmos ids do tutorial
// antigo: "mapa", "rota", "gps", "drift", "anel", "voo", "turbo"; quem já passou
// por eles não vê de novo). A lista em ordem: docs/trilha-pedras.md.
// Os textos são RASCUNHO (o LU2CA reescreve aqui; o resto segue).

import type { FaseDisco, HistoriaDisco } from "./historia"
import { POSE_TUT } from "./tutorialConf"

export type PedraId =
  | "mapa" | "rota" | "gps" | "drift" | "anel" | "ajuda"
  | "voo" | "turbo" | "pousa"
  | "escolhe" | "linha" | "chegou" | "liberou" | "radio" | "salvar" | "veiculo"

// o que o jogo sabe agora (a page monta o que vem do save; o resto a trilha lê ao vivo)
export interface CtxTrilha {
  fase: FaseDisco
  holo: boolean
  feitos: readonly string[]
  // a missão pegada (das 13), quantas dá pra pegar, quantas da cidade já foram feitas
  missao: string | null
  ofertas: number
  feitasCidade: number
  // o passo de agora da missão pegada (muda quando ele avança)
  passo: string
  // ao vivo
  drone: boolean
  painel: boolean
  metros: number
  dica: string
  ajuda: boolean
  toque: boolean
  pose: typeof POSE_TUT
  poseViva: boolean
  tem: (sel: string) => boolean
}

// a memória de uma pedra enquanto ela está na tela (zera quando troca)
export interface MemPedra { acc: number; ini: number; metros0: number; passo0: string; drone: boolean; cliques: Set<string> }

export type Mexe = "mapa" | "icone" | "notch"
export interface Pedra {
  id: PedraId
  fases: readonly FaseDisco[]
  // só depois destas (feitas ou já passadas)
  depois?: readonly PedraId[]
  quando: (c: CtxTrilha) => boolean
  // um seletor da coisa real (null: o balão fica no meio, embaixo, sem alvo)
  ancora: string | null | ((c: CtxTrilha) => string | null)
  texto: string
  toque?: string
  // enquanto falta algo pra dar (o turbo vazio), o texto de espera
  espera?: { se: (c: CtxTrilha) => boolean; texto: string }
  // o que mais mexe na tela, de leve (o mapa balança, o ícone da missão pisca)
  mexe?: Mexe
  feita: (c: CtxTrilha, m: MemPedra, dt: number) => boolean
  // quem já passou daqui (save antigo, já fez missões): pula sem mostrar e entra
  // no save como vista (só regras que não voltam atrás: as missões feitas só crescem)
  passou?: (c: CtxTrilha) => boolean
}

// os números
export const TRILHA_CFG = {
  ligada: true,
  driftS: 0.7, // s de drift pra contar
  vooS: 0.9, // s no ar com o propulsor
  gpsS: 1, // s andando com o ícone do GPS no meio
  gpsV: 8, // m/s
  perto: 60, // m: "chegou"
  andou: 150, // m mais perto do alvo: "segue a linha" feita
  longe: 250, // m: saiu do lugar sem fazer (a pedra "chegou" se dá por vista)
  respiroMs: 900, // o ✓ antes da próxima
  pollMs: 140, // de quanto em quanto a trilha olha (só com pedra na tela)
}

const DEPOIS_DA_CASA: FaseDisco[] = ["dunas", "bar", "oficina", "subir", "nectar", "carreira"]
const CIDADE: FaseDisco[] = ["subir", "nectar", "carreira"]
const clicou = (m: MemPedra, ...ids: string[]) => ids.some((i) => m.cliques.has(i))
// quem já fez missão na cidade não precisa do começo da trilha
const veterano = (c: CtxTrilha) => c.feitasCidade > 0

// os seletores das coisas reais (o "?" usa os mesmos)
export const ALVO = {
  mapa: '[data-info="mapa"]',
  anel: '[data-info="anel"]',
  notch: ".l-ilha",
  ajuda: '[data-info="ajuda"]',
  turbo: '[data-info="turbo"]',
  propulsor: '[data-info="propulsor"]',
  radio: '[data-info="radio"]',
  // (revisão 05/11) o ♥ do notch mora no menu ♪: a pedra aponta pro ♪ (com link), ou pro ♥ da rádio
  salvar: '.l-nexo-musica.tem-salvar, [data-info="salvar"]',
  sair: '[data-info="sair"]',
  veiculo: '[data-trilha="veiculo"]',
  voltarRua: '.l-drone-botoes [aria-label="voltar pra rua"]',
  missoesDrone: '.l-drone-botoes [aria-label="as missões"]',
  pegar: ".l-mapa-missoes li button[data-fecha-mapa]",
} as const

// ── A ORDEM DAS PEDRAS (troca a ordem aqui; tirar uma linha tira a pedra) ──
export const PEDRAS: Pedra[] = [
  // saiu da casa da D-Bee com o holo: o mapa mexe e pede o toque
  { id: "mapa", fases: DEPOIS_DA_CASA, quando: (c) => !c.drone, ancora: ALVO.mapa, texto: "toca no mapa", mexe: "mapa",
    feita: (c) => c.drone, passou: veterano },
  // o drone no alto: a linha acesa é o caminho; volta pra rua
  { id: "rota", fases: DEPOIS_DA_CASA, depois: ["mapa"], quando: (c) => c.drone, ancora: ALVO.voltarRua, texto: "viu a linha? volta pra rua",
    feita: (c, m) => { if (c.drone) m.drone = true; return m.drone && !c.drone }, passou: veterano },
  // a rua: o rumo mora no notch (o ícone no meio, acelera)
  { id: "gps", fases: ["dunas"], depois: ["rota"], quando: (c) => !c.drone, ancora: ALVO.notch, texto: "ícone no meio: acelera", mexe: "notch",
    feita: (c, m, dt) => {
      const mira = c.tem(".l-gps-alvo.is-mira")
      m.acc = mira && c.poseViva && c.pose.v > TRILHA_CFG.gpsV ? m.acc + dt : mira ? m.acc : 0
      return m.acc >= TRILHA_CFG.gpsS
    } },
  // a areia solta
  { id: "drift", fases: ["dunas"], depois: ["mapa"], quando: (c) => !c.drone, ancora: null, texto: "vira forte e solta: drift", toque: "toca fora, vira dentro: drift",
    feita: (c, m, dt) => { if (c.poseViva && c.pose.drift) m.acc += dt; return m.acc >= TRILHA_CFG.driftS } },
  // o anel em volta do mapa: a missão de agora, o próximo passo
  { id: "anel", fases: DEPOIS_DA_CASA, depois: ["rota"], quando: (c) => !c.drone && c.tem(ALVO.anel), ancora: ALVO.anel, texto: "o anel: o próximo passo", mexe: "icone",
    feita: (_c, m) => clicou(m, "anel", "mapa"), passou: veterano },
  // o "?" é a trilha: quem esqueceu, toca nele
  { id: "ajuda", fases: DEPOIS_DA_CASA, depois: ["anel"], quando: (c) => !c.drone && c.tem(ALVO.ajuda), ancora: ALVO.ajuda, texto: "esqueceu? toca no ?",
    feita: (c, m) => c.ajuda || clicou(m, "ajuda"), passou: veterano },
  // depois da oficina a Kombi voa
  { id: "voo", fases: CIDADE, quando: (c) => !c.drone && c.tem(ALVO.propulsor), ancora: ALVO.propulsor, texto: "segura: a Kombi voa",
    feita: (c, m, dt) => { if (c.poseViva && c.pose.ar && c.pose.propulsor) m.acc += dt; return m.acc >= TRILHA_CFG.vooS } },
  // (a primeira vez na cidade, se ainda não usou) o turbo
  { id: "turbo", fases: CIDADE, quando: (c) => !c.drone && c.tem(ALVO.turbo), ancora: ALVO.turbo, texto: "turbo cheio: toca",
    espera: { se: (c) => c.poseViva && c.pose.carga < 1 && !c.pose.turbo, texto: "drift e voo enchem o turbo" },
    feita: (c) => c.poseViva && c.pose.turbo },
  // lá em cima: onde descer
  // (passou da subida sem pousar: a fase troca e ela some sozinha, sem ir pro save)
  { id: "pousa", fases: ["subir"], depois: ["voo"], quando: (c) => !c.drone, ancora: ALVO.notch, texto: "pousa numa pista acesa",
    feita: (c, m) => { if (c.poseViva && c.pose.ar) m.acc = 1; return m.acc === 1 && c.poseViva && !c.pose.ar && c.pose.v > 3 } },
  // a cidade: sem missão, o ícone da missão pisca; o mapa abre e a lista diz qual
  { id: "escolhe", fases: ["carreira"], quando: (c) => !c.missao && c.ofertas > 0,
    ancora: (c) => (c.painel ? ALVO.pegar : c.drone ? ALVO.missoesDrone : ALVO.anel), texto: "escolhe a missão", mexe: "icone",
    feita: (c) => !!c.missao, passou: veterano },
  // pegou: a linha acesa leva até lá (a distância e a seta moram no notch)
  { id: "linha", fases: ["carreira"], quando: (c) => !!c.missao && !c.drone && !c.dica && c.metros > TRILHA_CFG.perto, ancora: ALVO.notch, texto: "segue a linha até lá", mexe: "notch",
    feita: (c, m) => { if (m.metros0 < 0) m.metros0 = c.metros; return c.metros >= 0 && (m.metros0 - c.metros >= TRILHA_CFG.andou || c.metros <= TRILHA_CFG.perto || !!c.dica) }, passou: veterano },
  // perto: desce (de patins, ou só entra; a peça começa ali)
  { id: "chegou", fases: ["carreira"], quando: (c) => !!c.missao && !c.drone && (!!c.dica || (c.metros >= 0 && c.metros <= TRILHA_CFG.perto)),
    ancora: (c) => (c.tem(ALVO.sair) ? ALVO.sair : ALVO.notch), texto: "chegou: desce aqui",
    feita: (c, m) => clicou(m, "sair") || c.passo !== m.passo0 || !c.missao || c.metros > TRILHA_CFG.longe, passou: veterano },
  // a primeira missão da cidade feita: o que abriu brilha no próprio mapa (sem lista)
  { id: "liberou", fases: ["carreira"], quando: (c) => c.feitasCidade >= 1 && !c.drone, ancora: ALVO.mapa, texto: "abriu coisa nova: olha", mexe: "mapa",
    feita: (c) => c.drone, passou: (c) => c.feitasCidade >= 2 },
  // a rádio da região
  { id: "radio", fases: ["carreira"], depois: ["liberou"], quando: (c) => !c.drone && c.tem(ALVO.radio), ancora: ALVO.radio, texto: "toca: o menu da rádio",
    feita: (_c, m) => clicou(m, "radio") },
  // a música que toca, no app da pessoa
  { id: "salvar", fases: ["carreira", "nectar"], depois: ["liberou"], quando: (c) => !c.drone && c.tem(ALVO.salvar), ancora: ALVO.salvar, texto: "curtiu? ♥ salva a música",
    feita: (_c, m) => clicou(m, "salvar") },
  // sem a Kombi (a perseguição): os veículos na pista
  { id: "veiculo", fases: ["carreira"], quando: (c) => !c.drone && c.tem(ALVO.veiculo), ancora: ALVO.veiculo, texto: "pega um veículo",
    feita: (_c, m) => clicou(m, "veiculo") },
]

// (começo novo, 05/11) a pedra que está na tela agora (a TrilhaPedras escreve; a D-Bee
// sugere lê: não fala por cima de uma pedra). Antes ela lia lerNexoTutorial(), que
// ninguém mais escreve desde a trilha: a D-Bee falava com a pedra "escolhe" na tela
export const TRILHA_NA_TELA: { pedra: PedraId | null } = { pedra: null }
export const pedraDe = (id: string) => PEDRAS.find((p) => p.id === id) ?? null
const feita = (c: Pick<CtxTrilha, "feitos">, id: PedraId) => c.feitos.includes(id)
export const pulada = (c: CtxTrilha, p: Pedra) => !!p.passou?.(c)
const ok = (c: CtxTrilha, id: PedraId) => { const p = pedraDe(id); return feita(c, id) || (!!p && pulada(c, p)) }

// A PEDRA DE AGORA: a primeira (na ordem) que ainda não foi feita, vale nesta
// fase, tem as de antes feitas e cuja condição está de pé. Uma só.
export function pedraAgora(c: CtxTrilha): Pedra | null {
  if (!TRILHA_CFG.ligada || !c.holo) return null
  for (const p of PEDRAS) {
    if (feita(c, p.id) || !p.fases.includes(c.fase) || pulada(c, p)) continue
    if (p.depois && !p.depois.every((d) => ok(c, d))) continue
    if (p.quando(c)) return p
  }
  return null
}
// (6) as que esse save já passou sem precisar ver (vão pro save de uma vez)
export const pedrasPuladas = (c: CtxTrilha) => PEDRAS.filter((p) => !c.feitos.includes(p.id) && pulada(c, p)).map((p) => p.id)
// as que já passaram (feitas), na ordem: o "?" volta por elas
export const pedrasFeitas = (feitos: readonly string[]) => PEDRAS.filter((p) => feitos.includes(p.id))
export const ancoraDe = (p: Pedra, c: CtxTrilha) => (typeof p.ancora === "function" ? p.ancora(c) : p.ancora)
export const textoDaPedra = (p: Pedra, c: Pick<CtxTrilha, "toque">) => (c.toque && p.toque ? p.toque : p.texto)

// a Corrida escreve a pose da Kombi (POSE_TUT) só enquanto alguma pedra precisa dela
const DE_POSE: PedraId[] = ["gps", "drift", "voo", "turbo", "pousa"]
export function trilhaEnsina(h: Pick<HistoriaDisco, "fase" | "holo" | "tutorial"> | null | undefined): boolean {
  if (!h || !TRILHA_CFG.ligada || !h.holo || !DEPOIS_DA_CASA.includes(h.fase)) return false
  const f = h.tutorial ?? []
  return DE_POSE.some((id) => !f.includes(id) && pedraDe(id)!.fases.includes(h.fase))
}
