// AS RUAS-MANIFESTO (05/11, bíblia §2): "a narrativa vem colada com as músicas,
// de forma artística. Uma crítica velada em animações e, mais que isso, em
// interações que traduzem a experiência da música e uma parte da psique do
// LU2CA" (vícios, escolhas erradas, confiança, tempo).
//
// Cada rua (pista) é uma faixa do vol. 1; a volta na rua dura a faixa. O
// manifesto é uma camada visual/interativa ao longo da rua, presa no tempo da
// faixa (o currentTime da música contínua, som.ts PistaSom). Sem texto
// explicando: sentido enquanto a faixa toca.
//
// Regra de desempenho (memória do dono: "desempenho é prioridade"):
//   - só MONTA com o jogador NAQUELA rua; some fora (Manifestos.tsx)
//   - instanciado, 1–3 desenhos por manifesto, sem luz pontual nova
//   - nada pesado por quadro na CPU: o host lê o estado UMA vez por quadro
//     (CtxManifesto) e cada manifesto só escreve uniforms

import type * as THREE from "three"
import type { ComponentType } from "react"
import type { MundoDisco } from "../mundoDisco"
import type { Pista, PistaId } from "../pistas"

/** o que o host lê do jogo a cada quadro (um pedaço do Jogo de Corrida.tsx) */
export interface PoseManifesto {
  via: number
  u: number
  v: number
  vBase?: number
  turboT: number
  voo?: boolean
  ar?: boolean
  /** o drift (0 = reto, ±1 = o lado) */
  drift?: number
}
/** os botões (um pedaço do Input de Corrida.tsx) */
export interface ComandosManifesto { gas: boolean; freio: boolean; turbo: boolean }

/** o estado vivo, escrito pelo host UMA vez por quadro, lido pelos manifestos */
export interface CtxManifesto {
  /** segundos dentro da faixa (o currentTime do toca-discos da pista) */
  t: number
  /** duração da faixa que soa (s) */
  dur: number
  /** t / dur (0–1): o andamento da faixa */
  prog: number
  /** a fase da batida (t × BPM / 60): a parte inteira conta as batidas */
  batida: number
  /** 0–1: entra em fade quando chega na rua, sai em fade quando deixa */
  dentro: number
  /** segundos desde que montou */
  idade: number
  /** a velocidade (m/s) e a razão pela velocidade da pista (1 = no ritmo) */
  v: number
  mult: number
  /** a aceleração (m/s², suavizada): negativa = desacelerando */
  acel: number
  gas: boolean
  freio: boolean
  /** turbo ligado agora (botão ou turbo correndo) */
  turbo: boolean
  /** de lado (drift) agora */
  drift: boolean
  /** no ar (pulo, rampa) agora */
  ar: boolean
  /** onde a Kombi está */
  via: number
  u: number
  /** o relógio do jogo (s, contínuo) pra animação no shader */
  relogio: number
}

export interface PropsManifesto {
  M: MundoDisco
  /** o índice da pista em M.pistas (ida, volta, cor) */
  k: number
  pista: Pista
  ctx: CtxManifesto
  /** o grupo da Kombi (a pose dela, pra quem precisar: os fantasmas de "Sabe Ontem?") */
  carro: React.RefObject<THREE.Group | null>
}

export interface Manifesto {
  id: PistaId
  /** a ideia em uma linha (de nova-ordem.md / bíblia): o que a rua diz */
  ideia: string
  /** null = ainda é só ideia (a rua segue sem manifesto) */
  Componente: ComponentType<PropsManifesto> | null
}
