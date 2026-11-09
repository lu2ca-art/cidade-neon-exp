// O METRÔ (T26): a planta do trem. Tudo em metros; o trem anda pro +Z (o
// trem fica parado, o túnel é que passa). Cinco vagões ligados por passagens
// estreitas, cada uma com a portinha de correr. A porta de fora que abre na
// curva fica no último vagão: é ali que você pula.
//
// Puro (sem three, sem DOM): o jogo (jogo.ts) usa pra colisão, a cena
// (cena.ts) usa pra desenhar. A semente decide onde ficam os passageiros.

export const NV = 5 // vagões
export const WL = 15 // comprimento do vagão
export const GANG = 1.2 // a passagem entre dois vagões
export const MEIA = 1.3 // meia largura por dentro
export const BANCO = 0.85 // até onde vai o corredor onde tem banco
export const PASSAGEM = 0.65 // meia largura da passagem (o trem do Núcleo é aberto de ponta a ponta)
export const ALTURA = 2.3
export const RAIO = 0.24 // você e o guarda (círculo no chão)
// as duas baias de porta de cada vagão (z local)
export const BAIAS: [number, number][] = [[3, 4.4], [10.6, 12]]

export const inicioVagao = (i: number) => i * (WL + GANG)
export const Z_FIM = inicioVagao(NV - 1) + WL
// a porta que abre na curva: a 2ª baia do último vagão, do lado direito (+x)
export const Z_PORTA = inicioVagao(NV - 1) + (BAIAS[1][0] + BAIAS[1][1]) / 2
export const Z_SAIDA = Z_PORTA - 0.7 // passou daqui: pula

export interface Caixa { x0: number; x1: number; z0: number; z1: number }
export interface Poste { x: number; z: number; r: number }
export interface Passageiro { x: number; z: number; tom: number; roupa: number; fase: number }
export interface Sentado { x: number; z: number; lado: 1 | -1; roupa: number; tom: number; jeito: number }

export interface Planta {
  caixas: Caixa[] // bancos e paredes do fim de cada vagão (fixas)
  postes: Poste[]
  portinhas: number[] // z de cada portinha de passagem (NV-1)
  em_pe: Passageiro[]
  sentados: Sentado[]
}

// número pseudo-aleatório com semente (mulberry32)
export function sorteio(semente: number) {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const naBaia = (zl: number) => BAIAS.some(([a, b]) => zl >= a && zl <= b)
// os trechos de banco de um vagão (z local)
export const TRECHOS_BANCO: [number, number][] = [[0.3, BAIAS[0][0]], [BAIAS[0][1], BAIAS[1][0]], [BAIAS[1][1], WL - 0.3]]

export function montarPlanta(semente: number): Planta {
  const r = sorteio(semente)
  const caixas: Caixa[] = []
  const postes: Poste[] = []
  const portinhas: number[] = []
  const em_pe: Passageiro[] = []
  const sentados: Sentado[] = []
  for (let i = 0; i < NV; i++) {
    const z0 = inicioVagao(i)
    // os bancos, dos dois lados
    for (const [a, b] of TRECHOS_BANCO) for (const s of [1, -1]) caixas.push(s > 0 ? { x0: BANCO, x1: MEIA + 1, z0: z0 + a, z1: z0 + b } : { x0: -MEIA - 1, x1: -BANCO, z0: z0 + a, z1: z0 + b })
    // as paredes do fundo e da frente (com o vão da passagem no meio)
    const fundo = i === 0, frente = i === NV - 1
    for (const [za, zb, cheia] of [[z0 - 0.4, z0, fundo], [z0 + WL, z0 + WL + 0.4, frente]] as [number, number, boolean][]) {
      if (cheia) caixas.push({ x0: -MEIA - 1, x1: MEIA + 1, z0: za, z1: zb })
      else { caixas.push({ x0: -MEIA - 1, x1: -PASSAGEM, z0: za, z1: zb }); caixas.push({ x0: PASSAGEM, x1: MEIA + 1, z0: za, z1: zb }) }
    }
    if (i < NV - 1) {
      // a passagem: paredes dos lados até o próximo vagão
      caixas.push({ x0: -MEIA - 1, x1: -PASSAGEM, z0: z0 + WL, z1: z0 + WL + GANG })
      caixas.push({ x0: PASSAGEM, x1: MEIA + 1, z0: z0 + WL, z1: z0 + WL + GANG })
      portinhas.push(z0 + WL + GANG / 2)
    }
    // (09/11, bíblia §13) sem os ferros de apoio no meio do vagão: na fuga só se desvia de pessoas.
    // A lista `postes` fica (vazia), pra o desenho e a colisão não mudarem de forma
    // quem está em pé no corredor. No 1º vagão, ninguém entre você e a frente
    // nos primeiros metros (o começo é pra pegar o embalo)
    const n = i === 0 ? 2 : 3 + (r() < 0.5 ? 1 : 0)
    const zs: number[] = []
    for (let k = 0, tent = 0; k < n && tent < 60; tent++) {
      const zl = (i === 0 ? 7.5 : 1.6) + r() * ((i === 0 ? WL - 9 : WL - 3.2))
      if (zs.some((z) => Math.abs(z - zl) < 2.4)) continue
      // não fica colado num poste do meio da baia (senão fecha a passagem)
      if (naBaia(zl) && Math.abs(zl - BAIAS[zl < 7 ? 0 : 1][0] - 0.7) < 0.6) continue
      if (frente && zl > BAIAS[1][0] - 1.5) continue // a porta da saída fica livre
      zs.push(zl)
      // nunca bem no meio: sempre sobra um lado pra passar (o poste da beira come um pouco)
      const lado = r() < 0.5 ? -1 : 1
      const x = naBaia(zl) ? lado * (0.3 + r() * 0.65) : lado * (0.15 + r() * 0.35)
      em_pe.push({ x, z: z0 + zl, tom: r(), roupa: r(), fase: r() * 6.28 })
      k++
    }
    // os sentados: artistas, ou o que sobrou deles (ninguém olha pra fora)
    for (const [a, b] of TRECHOS_BANCO) for (let z = a + 0.4; z < b - 0.3; z += 0.62) for (const s of [1, -1] as const) {
      if (r() < 0.42) sentados.push({ x: s * 1.05, z: z0 + z, lado: s, roupa: r(), tom: r(), jeito: Math.floor(r() * 3) })
    }
  }
  return { caixas, postes, portinhas, em_pe, sentados }
}

// em que vagão está (−1 = numa passagem)
export function vagaoDe(z: number) {
  for (let i = 0; i < NV; i++) { const a = inicioVagao(i); if (z >= a && z <= a + WL) return i }
  return -1
}

// (09/11) o violão tocado com a pessoa sentada no trem: o botão fica fora do jogo do
// metrô (disco/Violao.tsx), então o aviso passa por aqui. Vazio fora do trem (custo zero)
const OUVINDO_VIOLAO = new Set<() => void>()
export function ouvirViolaoNoTrem(f: () => void) { OUVINDO_VIOLAO.add(f); return () => { OUVINDO_VIOLAO.delete(f) } }
export function tocouViolaoNoTrem() { OUVINDO_VIOLAO.forEach((f) => f()) }
