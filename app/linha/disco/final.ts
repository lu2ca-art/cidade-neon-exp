// O FINAL (T29; refeito pelo dono em 09/11): a 13ª missão. A revolta popular, dentro do jogo.
//
// Fonte: projetos/cidade-neon/episodios.md, "Pra decidir no final" (09/11, palavras
// do dono): o último show é no centro do deserto com o povo todo unido; depois o povo
// se espalha pelas torres, os personagens lideram as multidões e há focos da revolução
// com muita gente em cada lugar; desligam o abastecimento e o Núcleo frita de dentro
// pra fora, sem a água que o arrefece; a água chega nos canais e o deserto vira
// floresta. Do final antigo fica só a chuva caindo.
//
// Como destrava: as missões dos 9 episódios feitas (portas.ts, MISSOES13.final.requer;
// o Xeriff é livre e não conta). Quem acaba o show da CHUVA (ep. 9) com tudo feito
// segue direto, ali no palco (page.tsx, abrirPortaDe). Save antigo que já tinha o show
// feito pega o final no mapa e vai até o palco (lugar: chao palcoDeserto).
//
// A sequência (cada momento tem um link de teste: ?parte=final.<momento>):
//   1. palco    o show lotado acabou. O jogador convoca o povo: o ÚNICO gesto do final
//   2. andar    a pessoa dirige livre até as torres, com o povo saindo do deserto; em cada
//               torre, os focos da revolução (FOCOS). Sem tempo: vale chegar em qualquer torre
//   3. nucleo   dali em diante só se assiste: o abastecimento é desligado e o Núcleo frita
//   4. agua     a câmera segue a água do Núcleo pela rua até o deserto
//   5. chuva    a chuva cai de verdade no deserto
//   6. floresta o deserto vira floresta
// A CHUVA toca do gesto até o fim, sem reiniciar (FinalTela.tsx). Acabou: as duas
// peças do final ficam feitas, a porta "o mundo depois" abre e a floresta fica.
//
// Desempenho: nada de luz nova. A câmera roteirizada é só um ponto e um olhar por
// quadro (CAM_ROTEIRO, lido pela câmera do Corrida.tsx); o 3D (estrada/FinalPovo.tsx,
// estrada/Floresta.tsx) só existe com o final passando ou feito; a chuva é a que o
// jogo já desenha (manifestos/ceu.ts CHUVA_MANIFESTO). Os focos só montam durante o
// final e perto da câmera, com as multidões instanciadas.
//
// Texto na tela: só o do gesto (TEXTO_GESTO). Nenhuma legenda, nenhuma fala.

import { EPISODIOS } from "./episodios"

export type MomentoFinal = "palco" | "andar" | "nucleo" | "agua" | "chuva" | "floresta"
export const MOMENTOS: MomentoFinal[] = ["palco", "andar", "nucleo", "agua", "chuva", "floresta"]
export const ehMomentoFinal = (x: string | null | undefined): x is MomentoFinal => !!x && (MOMENTOS as string[]).includes(x)

// RASCUNHO: o único texto do final na tela (o dono troca)
export const TEXTO_GESTO = "convocar o povo"

export const FINAL_CFG = {
  // os tempos (s) de cada momento. O "palco" espera o gesto e o "andar" espera a pessoa chegar
  nucleo: 26,
  agua: 24,
  chuva: 12,
  floresta: 18,
  gestoEspera: 0.7, // s no palco antes do gesto valer (o toque que fechou o show não dispara)
  // a força da chuva (1 = a pancada do clima; a rua CHUVA vai até 1,8)
  chuvaMax: 1.8,
  chuvaFloresta: 0.9,
  // a plateia do palco do deserto, em meia-lua na frente dele (por qualidade: densidadeRua)
  plateia: 1000,
  plateiaDe: 18, // m do palco à primeira fila
  plateiaAte: 105, // m do palco à última
  plateiaAbre: 1.3, // radianos pra cada lado
  // o povo que se junta em volta do Núcleo
  povoNucleo: 480,
  // o povo saindo do deserto: vai a pé até o foco dele (m/s; rápido pra se ver na estrada)
  andarVel: [14, 24] as [number, number],
  // chegou nas torres: distância (m, no plano) da borda do anel, em qualquer altura
  chegadaTorre: 90,
  aquecerNucleo: 900, // m: a câmera perto de uma torre já aquece a cidade em volta do Núcleo
  // o Núcleo: o abastecimento corta aqui (s) e a fritura vai de "fritaDe" até "fritaAte"
  corte: 6,
  corteDura: 1.8,
  fritaDe: 7.5,
  fritaAte: 20,
  aguaSai: 19, // s: a água sai do Núcleo
  // a câmera e a água começam na rua, um pouco antes do palco (m desde o Núcleo)
  aguaDe: 1500,
  aguaMeia: 7, // m de meia largura da água na pista (a pista tem 8,4)
  aguaPasso: 10, // m entre os pontos da fita
  aguaOnda: 18, // m por volta da textura
  aguaVel: 9, // m/s da textura
  camAtras: 60, // m atrás da frente da água
  // a frente verde que sai da casa da D-Bee (m/s): as plantas crescem e a areia fica verde
  florestaVel: 90,
}

// ── os nove (09/11, o dono: "os 9 donos das músicas"; episodios.md) ──
// A lista é a própria sequência (EPISODIOS). No show eles são gente da plateia; nos
// focos, um à frente de cada multidão (FOCOS), corpo da multidão na cor dele: sem nome
// na tela, sem luz, sem câmera neles (FinalMultidao.tsx)
export const NOVE: { quem: string; cor: string; musica: string }[] = EPISODIOS.map((e) => ({ quem: e.quem, cor: e.cor, musica: e.musica }))

// quanto dura cada momento (s); null = espera o gesto
export function duracao(m: MomentoFinal): number | null {
  return m === "palco" || m === "andar" ? null : FINAL_CFG[m]
}
export const proximo = (m: MomentoFinal): MomentoFinal | null => MOMENTOS[MOMENTOS.indexOf(m) + 1] ?? null

// ── O FINAL AO VIVO: uma loja fora do React (a tela escreve; o 3D lê por quadro) ──
// momento: o que está passando (null = nada); t0: quando começou (performance.now, s);
// feito: o final já foi visto neste save (a floresta e o mundo depois ficam);
// lotado: a missão do show da CHUVA ou o final pegados (a plateia cheia na frente do palco);
// chegou: no "andar", a pessoa chegou numa torre (FinalPovo.tsx escreve, a tela segue)
export const FINAL_VIVO = { momento: null as MomentoFinal | null, t0: 0, feito: false, lotado: false, chegou: false }
type Foto = { momento: MomentoFinal | null; feito: boolean; lotado?: boolean; chegou?: boolean }
let foto: Foto = { momento: null, feito: false, lotado: false, chegou: false }
const ouvintes = new Set<() => void>()
export const ouvirFinal = (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f) } }
export const lerFinal = () => foto
const avisar = () => { foto = { momento: FINAL_VIVO.momento, feito: FINAL_VIVO.feito, lotado: FINAL_VIVO.lotado, chegou: FINAL_VIVO.chegou }; ouvintes.forEach((f) => f()) }
export function definirMomento(m: MomentoFinal | null) {
  FINAL_VIVO.momento = m
  FINAL_VIVO.chegou = false
  FINAL_VIVO.t0 = typeof performance === "undefined" ? 0 : performance.now() / 1000
  avisar()
}
export function definirFinalFeito(sim: boolean) {
  if (FINAL_VIVO.feito === sim) return
  FINAL_VIVO.feito = sim
  avisar()
}
export function marcarChegouNasTorres() {
  if (FINAL_VIVO.chegou) return
  FINAL_VIVO.chegou = true
  avisar()
}
export function definirLotado(sim: boolean) {
  if (FINAL_VIVO.lotado === sim) return
  FINAL_VIVO.lotado = sim
  avisar()
}

// (atalho de teste) ?parte=final… nasce na frente do palco do deserto (só no carregamento)
let nasceNoPalco = false
export function pedirNascerNoPalco() { nasceNoPalco = true }
export const nascerNoPalcoDeserto = () => nasceNoPalco && typeof performance !== "undefined" && performance.now() < 30000

// a CÂMERA ROTEIRIZADA: FinalPovo.tsx escreve (ponto e olhar) e a câmera do
// Corrida.tsx obedece enquanto `ativo`. Só números: nada aloca por quadro
export const CAM_ROTEIRO = { ativo: false, px: 0, py: 0, pz: 0, ox: 0, oy: 0, oz: 0 }

// ── OS FOCOS DA REVOLUÇÃO (09/11, o dono): em cada torre das pontas, três focos, um por
// rua que chega nela; quem lidera é o dono da música da rua (FinalPovo.tsx). Por foco,
// vezes densidadeRua. A Multidao de sempre, instanciada, uma por torre e só perto ──
export const FOCOS = {
  noChao: 170, // gente em volta do líder, no chão
  noAnel: 50, // gente na rotatória de cima, na direção da rua dele
  raio: 28, // m até a última fila
  folgaTorre: 14, // m além do anel até o líder
  primeiraFila: 4.5, // m entre o líder e a primeira fila
  abre: 1.2, // radianos pra cada lado do líder
  corDoLider: 0.55, // a parte da multidão que veste a cor do líder
  raioMonta: 620, // m da câmera até a torre: daí pra longe a multidão desmonta
}

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

// ── A FLORESTA (09/11, o dono: "o deserto vira floresta"): estrada/Floresta.tsx ──
// Malhas instanciadas, montadas uma vez e paradas, por grade e por distância. Só
// existem com o final passando ou feito. Quantidades por célula, vezes densidadeRua
export const FLORESTA = {
  // perto: as peças do mundo-depois.glb (o tronco é a trepadeira; a moita, o tufo_b)
  celula: 260, // m de lado
  raioPerto: 420, // m do centro da célula (desmonta a 483, a folga do <Perto>)
  arvores: 4, // ~1.420 triângulos cada (a trepadeira em cruz)
  moitas: 10, // ~190 triângulos cada
  // longe: um cone por planta, em células maiores
  celulaLonge: 780,
  raioLonge: 1500,
  cones: 200, // 6 triângulos cada
  furoLonge: 260, // m: dentro disto em volta da câmera os cones somem (quem aparece é o perto)
  // onde nasce
  extensao: 4400, // m pra cada lado do centro do mapa
  alemDaCidade: 1250, // m (raioCidade.ts): o começo do deserto, o mesmo das gotas
  folgaSuburbio: 60,
  folgaCasa: 34,
  // pior caso: 14 células perto × 7,6 mil + 22 longe × 1,2 mil = ~133 mil triângulos, ~50 desenhos
}

// ── A PLANTA DA ELLA (09/11, o dono): o que foi deixado pra trás volta a prosperar
// quando a água volta, e fica por todo o subúrbio. Hoje é a forma simples, a mesma
// silhueta da planta do Escondido.tsx em poucos triângulos. A FORMA REALISTA ENTRA
// AQUI: url do .glb em public/models, o nó dele e o sufixo da malha (como em
// mundo-depois.glb: <no>_<grupo>). url null = a forma simples ──
export const PLANTA_ELLA = {
  url: null as string | null,
  no: "planta_ella",
  grupo: "solido",
  quantas: 500, // vezes densidadeRua
  escala: [1.1, 1.9] as [number, number],
}
