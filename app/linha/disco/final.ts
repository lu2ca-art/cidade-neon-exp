// O FINAL (T29; refeito pelo dono em 09/11): a 13ª missão. A revolta popular, dentro do jogo.
//
// Fonte: projetos/cidade-neon/episodios.md, "Pra decidir no final" (09/11, palavras
// do dono): depois do último show a popularidade está no auge e o subúrbio foi atrás;
// convoca-se o povo pra derrubar o Núcleo; a derrubada é redistribuir a água e fazer
// ela chegar nos canais; o que hoje é deserto vira floresta. Os nove ficam no meio do
// povo, sem cena pra eles. Do final antigo fica só a chuva caindo: saíram os feixes,
// a cena dos nove sob os monumentos, a despedida do Criador e a Kombi no quintal.
//
// Como destrava: as missões dos 9 episódios feitas (portas.ts, MISSOES13.final.requer;
// o Xeriff é livre e não conta). Quem acaba o show da CHUVA (ep. 9) com tudo feito
// segue direto, ali no palco (page.tsx, abrirPortaDe). Save antigo que já tinha o show
// feito pega o final no mapa e vai até o palco (lugar: palco-nectar).
//
// A sequência (cada momento tem um link de teste: ?parte=final.<momento>):
//   1. palco    o show lotado acabou. O jogador convoca o povo: o ÚNICO gesto do final
//   2. povo     dali em diante só se assiste: o povo se junta, os nove misturados nele
//   3. agua     a câmera segue a água do Núcleo pela rua até o deserto
//   4. chuva    a chuva cai de verdade no deserto
//   5. floresta o deserto vira floresta
// A CHUVA toca do gesto até o fim, sem reiniciar (FinalTela.tsx). Acabou: as duas
// peças do final ficam feitas, a porta "o mundo depois" abre e a floresta fica.
//
// Desempenho: nada de luz nova. A câmera roteirizada é só um ponto e um olhar por
// quadro (CAM_ROTEIRO, lido pela câmera do Corrida.tsx); o 3D (estrada/FinalPovo.tsx,
// estrada/Floresta.tsx) só existe com o final passando ou feito; a chuva é a que o
// jogo já desenha (manifestos/ceu.ts CHUVA_MANIFESTO).
//
// Texto na tela: só o do gesto (TEXTO_GESTO). Nenhuma legenda, nenhuma fala.

import { EPISODIOS } from "./episodios"

export type MomentoFinal = "palco" | "povo" | "agua" | "chuva" | "floresta"
export const MOMENTOS: MomentoFinal[] = ["palco", "povo", "agua", "chuva", "floresta"]
export const ehMomentoFinal = (x: string | null | undefined): x is MomentoFinal => !!x && (MOMENTOS as string[]).includes(x)

// RASCUNHO: o único texto do final na tela (o dono troca)
export const TEXTO_GESTO = "convocar o povo"

export const FINAL_CFG = {
  // os tempos (s) de cada momento depois do gesto. O "palco" espera o gesto
  povo: 16,
  agua: 24,
  chuva: 12,
  floresta: 18,
  gestoEspera: 0.7, // s no palco antes do gesto valer (o toque que fechou o show não dispara)
  // a força da chuva (1 = a pancada do clima; a rua CHUVA vai até 1,8)
  chuvaMax: 1.8,
  chuvaFloresta: 0.9,
  // a plateia e o povo na rua (por qualidade: densidadeRua)
  plateia: 220,
  plateiaMeio: 48, // m pra cada lado do palco
  povoRua: 560,
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
// A lista é a própria sequência (EPISODIOS). No final eles são gente da plateia,
// iguais aos outros: sem nome na tela, sem luz, sem câmera neles (FinalMultidao.tsx)
export const NOVE: { quem: string; cor: string }[] = EPISODIOS.map((e) => ({ quem: e.quem, cor: e.cor }))

// quanto dura cada momento (s); null = espera o gesto
export function duracao(m: MomentoFinal): number | null {
  return m === "palco" ? null : FINAL_CFG[m]
}
export const proximo = (m: MomentoFinal): MomentoFinal | null => MOMENTOS[MOMENTOS.indexOf(m) + 1] ?? null

// ── O FINAL AO VIVO: uma loja fora do React (a tela escreve; o 3D lê por quadro) ──
// momento: o que está passando (null = nada); t0: quando começou (performance.now, s);
// feito: o final já foi visto neste save (a floresta e o mundo depois ficam);
// lotado: a missão do show da CHUVA ou o final pegados (a plateia cheia na frente do palco)
export const FINAL_VIVO = { momento: null as MomentoFinal | null, t0: 0, feito: false, lotado: false }
type Foto = { momento: MomentoFinal | null; feito: boolean; lotado?: boolean }
let foto: Foto = { momento: null, feito: false, lotado: false }
const ouvintes = new Set<() => void>()
export const ouvirFinal = (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f) } }
export const lerFinal = () => foto
const avisar = () => { foto = { momento: FINAL_VIVO.momento, feito: FINAL_VIVO.feito, lotado: FINAL_VIVO.lotado }; ouvintes.forEach((f) => f()) }
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
export function definirLotado(sim: boolean) {
  if (FINAL_VIVO.lotado === sim) return
  FINAL_VIVO.lotado = sim
  avisar()
}

// a CÂMERA ROTEIRIZADA: FinalPovo.tsx escreve (ponto e olhar) e a câmera do
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
