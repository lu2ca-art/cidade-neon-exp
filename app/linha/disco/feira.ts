// A FEIRA DO TONY GORDO (ep. 5 · Swav; episodios.md §5): a regra da barganha.
// Sem three.js e sem React: a tela (FeiraTela) e o 3D (FeiraBanca) leem daqui.
//
//   chega com o bolso de um saco só; quer levar 4 sacos
//   cada legume cortado = 12% naquele item, até 72% (6 cortes)
//   o desconto conquistado vale pros próximos que aparecem
//   a conta coube no bolso: fecha e paga em água (save.agua)
//
// Números de gosto: tudo em FEIRA, num lugar só.

import { CHAO_LUGARES, CRATERA } from "./historia"

export type ItemFeiraId = "cogumelo" | "pimentao" | "abobrinha" | "cenoura"

export interface ItemFeira {
  id: ItemFeiraId
  nome: string // na etiqueta e no cartaz
  saco: string // o que vai pro save e pra cozinha
  preco: number // Água$ por unidade (o preço cheio da etiqueta)
  quantidade: number // quantos enchem o saco; o barato vem em mais quantidade e aparece mais
}

export const FEIRA = {
  // o bolso de quem chega: dá pra um saco só (o saco mais caro, sem desconto)
  bolso: 40,
  corte: 0.12,
  cortesMax: 6,
  itens: [
    { id: "cogumelo", nome: "COGUMELO", saco: "cogumelos", preco: 2, quantidade: 14 },
    { id: "cenoura", nome: "CENOURA", saco: "cenouras", preco: 3, quantidade: 11 },
    { id: "abobrinha", nome: "ABOBRINHA", saco: "abobrinhas verdes", preco: 4, quantidade: 9 },
    { id: "pimentao", nome: "PIMENTÃO", saco: "pimentões coloridos", preco: 5, quantidade: 8 },
  ] as ItemFeira[],
  // os legumes no ar
  leva: { minS: 0.75, maxS: 1.25, tamanhoMax: 3, intervaloS: 0.13, noArMax: 9 },
  subidaS: [0.62, 0.9] as [number, number], // quanto tempo sobe até o alto
  // o corte: rastro de pincel (px da tela), velocidade mínima e a folga do dedo
  corteRaioMinPx: 26,
  corteVelMin: 180, // px/s: encostar devagar não corta
  // a câmera na frente da banca
  cam: { dist: 2.6, alturaOlho: 1.55, entradaS: 0.8 },
}

export const ITENS_FEIRA = FEIRA.itens
export const nomesDosSacos = FEIRA.itens.map((i) => i.saco)

export type Cortes = Record<ItemFeiraId, number>
export const cortesZero = (): Cortes => ({ cogumelo: 0, pimentao: 0, abobrinha: 0, cenoura: 0 })

export const descontoDe = (cortes: number) => Math.min(cortes, FEIRA.cortesMax) * FEIRA.corte
/** o preço na etiqueta de uma unidade, com o desconto já conquistado (duas casas) */
export const precoUnidade = (it: ItemFeira, cortes: number) => it.preco * (1 - descontoDe(cortes))
/** o saco inteiro (arredondado no fim, pra conta fechar inteira em água) */
export const precoSaco = (it: ItemFeira, cortes: number) => Math.round(it.preco * it.quantidade * (1 - descontoDe(cortes)))
export const contaDe = (c: Cortes) => FEIRA.itens.reduce((a, it) => a + precoSaco(it, c[it.id]), 0)
export const contaMinima = () => FEIRA.itens.reduce((a, it) => a + precoSaco(it, FEIRA.cortesMax), 0)
export const podeFechar = (c: Cortes) => contaDe(c) <= FEIRA.bolso
export const noMaximo = (c: Cortes, id: ItemFeiraId) => c[id] >= FEIRA.cortesMax
export const fmtPreco = (n: number) => n.toFixed(2).replace(".", ",")

/** Água$ que faltam pra chegar na feira com o bolso de um saco (0 = pode) */
export const faltaProBolso = (agua: number) => Math.max(0, FEIRA.bolso - Math.floor(agua || 0))
/** o aviso do cadeado: só o que falta, sem dizer onde tem água (a pessoa descobre sozinha) */
export const avisoSemAgua = (agua: number) => `faltam ${faltaProBolso(agua)} Água$ pra chegar com o dinheiro de um saco`

/** a próxima leva: o barato vem em mais quantidade (pesa pela quantidade do item) */
export function sortearLeva(rand: () => number, c: Cortes, n: number): ItemFeiraId[] {
  const vivos = FEIRA.itens.filter((it) => !noMaximo(c, it.id))
  if (!vivos.length || n <= 0) return []
  const total = vivos.reduce((a, it) => a + it.quantidade, 0)
  const out: ItemFeiraId[] = []
  for (let k = 0; k < n; k++) {
    let r = rand() * total
    for (const it of vivos) { r -= it.quantidade; if (r <= 0) { out.push(it.id); break } }
    if (out.length === k) out.push(vivos[vivos.length - 1].id)
  }
  return out
}

// ── onde fica: a rua da feira no mundo ──
const F = CHAO_LUGARES.feira
// o corredor aponta pro bar (por onde se chega): local +X ao longo da rua, +Z pra banca
// (18/11) a rua corre no rumo da cratera (o subúrbio é o anel em volta dela; CHAO_PONTAS igual)
export const FEIRA_RUMO = Math.atan2(-(F.z - CRATERA.z), F.x - CRATERA.x)
const SEN = Math.sin(FEIRA_RUMO), COS = Math.cos(FEIRA_RUMO)
export const naFeira = (lx: number, lz: number) => ({ x: F.x + lx * COS + lz * SEN, z: F.z - lx * SEN + lz * COS })
// a banca da barganha: a frente do tampo; o plano do jogo fica 0,4 m antes
export const BANCA_FEIRA = { lx: 0, lz: 4.6 }
export const FEIRA_EM_VOLTA = { meiaRua: 24, meiaLado: 8 }

// ── o que vai e volta entre a tela e o 3D (nada aqui é por quadro em React) ──
export interface SegmentoCorte { x0: number; y0: number; x1: number; y1: number; vel: number }
export const FEIRA_VIVO = {
  aberta: false,
  cortes: cortesZero(),
  conta: 0,
  // os riscos do dedo desde o último quadro (a tela escreve, o 3D consome)
  riscos: [] as SegmentoCorte[],
  // a tela pinta o rastro de pincel neste gancho (o 3D chama uma vez por quadro)
  desenhar: null as ((agora: number) => void) | null,
  // o 3D avisa que montou (a tela confere; ver FeiraTela)
  pronto3D: false,
}
const ouvintes = new Set<() => void>()
export function ouvirFeira(f: () => void) { ouvintes.add(f); return () => { ouvintes.delete(f) } }
export function avisarFeira() { ouvintes.forEach((f) => f()) }
export const lerFeira = () => FEIRA_VIVO.conta

export function abrirFeiraViva() {
  FEIRA_VIVO.aberta = true
  FEIRA_VIVO.cortes = cortesZero()
  FEIRA_VIVO.conta = contaDe(FEIRA_VIVO.cortes)
  FEIRA_VIVO.riscos.length = 0
  avisarFeira()
}
export function fecharFeiraViva() {
  FEIRA_VIVO.aberta = false
  FEIRA_VIVO.riscos.length = 0
  avisarFeira()
}
export function cortarLegume(id: ItemFeiraId): number {
  if (noMaximo(FEIRA_VIVO.cortes, id)) return FEIRA_VIVO.cortes[id]
  FEIRA_VIVO.cortes = { ...FEIRA_VIVO.cortes, [id]: FEIRA_VIVO.cortes[id] + 1 }
  FEIRA_VIVO.conta = contaDe(FEIRA_VIVO.cortes)
  avisarFeira()
  return FEIRA_VIVO.cortes[id]
}

// (09/11, decisão do dono) a cozinha do Tony, na barraca do fogão da feira: a peça
// (pecas/Cozinhar.tsx) escreve aqui e o 3D (CozinhaTony) desenha
export const LOCAL_COZINHA = { lx: -19, lz: -4.6 }
export const COZINHA_POS = [-0.66, -0.22, 0.22, 0.66] // onde cada saco fica, em fração da meia tela
export const COZINHA_Y = -0.28
export const COZINHA_VIVA = { aberta: false, ingr: [] as number[], fase: "escolher" as "escolher" | "fogo" | "provar", ponto: 0, segura: false }
export function abrirCozinhaViva() {
  COZINHA_VIVA.aberta = true; COZINHA_VIVA.ingr = []; COZINHA_VIVA.fase = "escolher"; COZINHA_VIVA.ponto = 0; COZINHA_VIVA.segura = false
  avisarFeira()
}
export function fecharCozinhaViva() { COZINHA_VIVA.aberta = false; avisarFeira() }

// a câmera na banca (a Corrida lê aqui, como o CAM_ROTEIRO do final)
export const CAM_FEIRA = { ativo: false, px: 0, py: 0, pz: 0, ox: 0, oy: 0, oz: 0 }
