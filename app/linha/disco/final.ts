// O FINAL (T29, bloco 4): a 13ª missão. A BASE DAS AÇÕES, dentro do jogo.
//
// Fonte (nada aqui é inventado; o que é proposta está marcado):
//   - lista-mestra.md, T29: "Os nove nos pontos, a D-bee chega e o CHUVA é
//     acionado. O Criador se despede da D-bee, sem prometer voltar, e parte
//     para outro espaço-tempo. A D-bee fica como ponte entre robôs e humanos.
//     A Kombi aparece no quintal da D-bee, com o deserto reflorestado. Nada
//     explicado em diálogo (regra de ouro 6)."
//   - retomar-mundo.md: "Os nove pontos e os nove personagens", "O protocolo
//     CHUVA", "O final" e "A memória da Kombi (28/10)".
//   - a regra do dono: a cena do DIÁLOGO é vídeo de IA; a base das AÇÕES fica
//     dentro do jogo (câmera roteirizada, sem tela preta).
//
// Como destrava (a regra que já existe, portas.ts MISSOES13.final.requer): as
// 10 missões da feira feitas (a D-Bee e a oficina são o começo). Aí o final
// aparece no mapa, e o lugar dele é a casa da D-Bee (lugar: { chao: "casa" }).
// Chegou na casa com o final pegado: a sequência começa (page.tsx, chegouNaMissao).
//
// A sequência (cada momento tem um link de teste: ?parte=final.<momento>):
//   1. sinal   (jogo)  a casa da D-Bee: a música dela é o sinal (PROPOSTA)
//   2. nove    (jogo)  a câmera passa pelos nove pontos: cada um no ponto da faixa
//   3. chuva   (jogo)  o CHUVA: a rede acende e a chuva toma a cidade
//   4. criador (VÍDEO) a despedida do Criador e da D-Bee (o gancho do filme)
//   5. quintal (jogo)  a Kombi no quintal da D-Bee, o deserto verde
// Acabou: as duas peças do final ficam feitas e a porta "o mundo depois" abre.
//
// Desempenho: nada de luz nova. A câmera roteirizada é só um ponto e um olhar
// por quadro (CAM_ROTEIRO, lido pela câmera do Corrida.tsx). O 3D do final
// (estrada/FinalNove.tsx): 2 malhas instanciadas (as nove pessoas e os fachos),
// o mato do deserto (1 instanciada) e a Kombi do quintal; a chuva é a que o
// jogo já desenha (manifestos/ceu.ts CHUVA_MANIFESTO).
//
// Tudo que é texto aqui é RASCUNHO (o dono reescreve).

import type { Filme } from "../estrada/ganchoCena"
import type { LugarId } from "../lugares"
import type { PistaId } from "../estrada/pistas"
import { MISSOES13, type MissaoId } from "./portas"

export type MomentoFinal = "sinal" | "nove" | "chuva" | "criador" | "quintal"
export const MOMENTOS: MomentoFinal[] = ["sinal", "nove", "chuva", "criador", "quintal"]
export const ehMomentoFinal = (x: string | null | undefined): x is MomentoFinal => !!x && (MOMENTOS as string[]).includes(x)

// os tempos (s) de cada momento de jogo. O "criador" dura o filme (FILME_DESPEDIDA)
export const FINAL_CFG = {
  sinal: 8,
  porPonto: 2.6, // cada um dos nove na tela
  chuva: 15,
  quintal: 14,
  // a força da chuva (1 = a pancada do clima; a rua CHUVA vai até 1,8)
  chuvaMax: 1.8,
  chuvaDespedida: 0.9,
  chuvaQuintal: 0.25,
  // o mato que volta no deserto (o reflorestar): quantos e até onde, em volta da casa
  mato: 520,
  matoRaio: 260,
}

// ── os nove (retomar-mundo.md, "Os nove (decidido 27/10)") ──
// Cada um no ponto da missão dele (retomar-mundo.md: "Cada missão deixa um dos
// nove personagens num ponto estratégico do mapa"). O ponto, no jogo: o
// monumento da faixa da pessoa (Monumentos.tsx, em cima do lugar da missão
// daquela pista). O Xeriff não tem faixa (portas.ts: faixaSituacao "em
// aberto"): fica no lugar da missão dele (a plataforma). O DONO DECIDE.
export interface UmDosNove { missao: MissaoId; quem: string; cor: string; faixa: PistaId | null; lugar: LugarId | null }
const ORDEM_NOVE: MissaoId[] = ["ella", "mubarak", "notti", "drew", "quadra", "lu2ca", "tony", "nizzy", "xeriff"]
export const NOVE: UmDosNove[] = ORDEM_NOVE.map((id) => {
  const m = MISSOES13[id]
  return { missao: id, quem: m.quem, cor: m.cor, faixa: m.faixa, lugar: m.faixa ? null : m.lugar.lugar ?? null }
})

// ── as legendas dos momentos de jogo (tipo "acao": o que se vê; nunca explica) ──
// `rascunho`: proposta dos docs ainda sem o ok do dono (aparece marcado)
export type LegendaFinal = { texto: string; de?: string; rascunho?: true }
export const LEGENDAS: Record<Exclude<MomentoFinal, "criador">, LegendaFinal[]> = {
  // retomar-mundo.md: "Proposta: a música dela é o sinal que faz os nove começarem juntos"
  sinal: [{ texto: "a D-Bee toca. a música dela é o sinal", rascunho: true }],
  // retomar-mundo.md: "nove pessoas em nove pontos esperando o mesmo sinal"
  nove: [{ texto: "nove pontos. nove pessoas. o mesmo sinal" }],
  // retomar-mundo.md: "o protocolo CHUVA devolve a água ao seu curso natural"
  chuva: [{ texto: "o CHUVA. a água volta pro curso dela" }],
  // lista-mestra.md T29 e retomar-mundo.md ("A memória da Kombi", "A missão da D-bee")
  quintal: [
    { texto: "a kombi no quintal da D-Bee. o deserto, verde" },
    { texto: "ela fica. a ponte entre robôs e humanos" },
  ],
}

// ── 4. A DESPEDIDA: o FILME (o diálogo vira vídeo de IA, T70) ──
// O provisório toca as legendas sobre a cena parada (CenaFilme.tsx). As ações
// vêm dos docs (retomar-mundo.md, "O final"); as falas não existem nos docs:
// ficam "RASCUNHO" até o dono escrever. Regra 6: o final não é explicado em diálogo.
export const FILME_DESPEDIDA: Filme = {
  id: "final-despedida",
  // ── O VÍDEO (T70) ENTRA AQUI: "/cenas/final-despedida.mp4" (public/cenas/) ──
  video: null,
  abertura: 2,
  fecho: 2,
  falas: [
    { texto: "dessa vez ele se despede. e sabe do que se trata", seg: 5, tipo: "acao" },
    { de: "RASCUNHO", texto: "a fala do Criador (o dono escreve). ele não promete que volta", seg: 5 },
    { de: "RASCUNHO", texto: "a resposta da D-Bee (o dono escreve)", seg: 4 },
    { texto: "a primeira partida foi um sumiço. a segunda é um adeus", seg: 5, tipo: "acao" },
    { texto: "ela não vai com ele. fica, cuidando do mundo novo", seg: 5, tipo: "acao" },
    { texto: "ele parte pra outro espaço-tempo", seg: 4, tipo: "acao" },
  ],
}

// quanto dura cada momento de jogo (s); null = quem manda é o filme
export function duracao(m: MomentoFinal): number | null {
  if (m === "sinal") return FINAL_CFG.sinal
  if (m === "nove") return FINAL_CFG.porPonto * NOVE.length
  if (m === "chuva") return FINAL_CFG.chuva
  if (m === "quintal") return FINAL_CFG.quintal
  return null
}
export const proximo = (m: MomentoFinal): MomentoFinal | null => MOMENTOS[MOMENTOS.indexOf(m) + 1] ?? null

// ── O FINAL AO VIVO: uma loja fora do React (a tela escreve; o 3D lê por quadro) ──
// momento: o que está passando (null = nada); t0: quando começou (performance.now, s);
// feito: o final já foi visto neste save (o quintal fica com a Kombi e o mato)
export const FINAL_VIVO = { momento: null as MomentoFinal | null, t0: 0, feito: false }
type Foto = { momento: MomentoFinal | null; feito: boolean }
let foto: Foto = { momento: null, feito: false }
const ouvintes = new Set<() => void>()
export const ouvirFinal = (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f) } }
export const lerFinal = () => foto
const avisar = () => { foto = { momento: FINAL_VIVO.momento, feito: FINAL_VIVO.feito }; ouvintes.forEach((f) => f()) }
export function definirMomento(m: MomentoFinal | null) {
  FINAL_VIVO.momento = m
  FINAL_VIVO.t0 = typeof performance === "undefined" ? 0 : performance.now() / 1000
  avisar()
}
export function definirFinalFeito(sim: boolean) {
  if (FINAL_VIVO.feito === sim) return
  FINAL_VIVO.feito = sim
  avisar()
}

// a CÂMERA ROTEIRIZADA: FinalNove.tsx escreve (ponto e olhar) e a câmera do
// Corrida.tsx obedece enquanto `ativo`. Só números: nada aloca por quadro
export const CAM_ROTEIRO = { ativo: false, px: 0, py: 0, pz: 0, ox: 0, oy: 0, oz: 0 }

// ── O MUNDO DEPOIS (06/11): o que muda depois do final, sem tela explicando ──
// retomar-mundo.md, "Como mostrar sem explicar": "Cabines e elevadores andando
// nos dois sentidos, o rio correndo pelas trincheiras (...) sob o vidro, plantas
// nas janelas dos prédios altos." Só monta com FINAL_VIVO.feito (antes: custo zero).
// O 3D: estrada/MundoDepois.tsx (plantas e cabines) e trincheiras/RioDepois.tsx (o rio).
export const MUNDO_DEPOIS = {
  // as plantas nos prédios (2 instanciadas: os tufos nas janelas e as trepadeiras)
  alturaMin: 30, // m: só os prédios altos
  tufosPorPredio: 6,
  maxTufos: 2600,
  trepadeiraChance: 0.6, // por prédio (até 2)
  maxTrepadeiras: 1400,
  // (06/11, modeladas no Blender: public/models/mundo-depois.glb) a trepadeira é
  // base + N módulos do meio (6 m cada, esticados até caber) + topo
  maxModulos: 2400, // módulos do meio no total (~260 tri cada)
  // (06/11, desempenho) as plantas vão por quadra e só as perto ficam montadas
  quadra: 200, // m de lado
  raioPerto: 300, // m do centro da quadra (desmonta a 345, a folga do <Perto>)
  triQuadra: 12000, // triângulos de planta por quadra, no máximo: 12 quadras perto × 12 mil = 144 mil
  trepChao: 3.6, // m acima da base do prédio (ele nasce enterrado 4 m): o pé da trepadeira
  brotoTufo: 0.6, // chance de um cacho de flores acesas em cada tufo
  brotoModulo: 0.7, // e em cada módulo do meio da trepadeira
  maxBrotos: 5000,
  // as cabines das torres: poços em volta do núcleo, uma cabine subindo e outra descendo em cada
  pocos: 6,
  velCabine: 7, // m/s
  // o rio nas trincheiras: uma fita de água no leito dos rios (a rampa da descida fica seca)
  rioMeia: 10, // m de meia largura (o leito tem 13)
  rioAltura: 0.15, // m acima do chão
  rioOnda: 18, // m por volta da textura
  rioVel: 3.2, // m/s
}
