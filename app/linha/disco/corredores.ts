// OS RACHAS (T44, 28/10; J2: 16, 17): os carros mexidos pelo mecânico.
//
// "Uma comunidade de carros mexidos pelo mecânico; esses carros são de
// habitantes do subúrbio que também transitam pelo mapa em seus carros
// diferentes e style, e aí sempre que trombar um deles na cidade já começa a
// piscar na tela um botão de tirar um racha." E o mecânico fala deles (a cena
// da oficina, T09): "os meninos", que rodam a cidade a noite inteira, amigos
// corredores, viajantes, "quem sabe até no tempo".
//
// Como funciona:
//   - uns poucos carros de estilo rodam pelas pistas acesas lá em cima, perto
//     da Kombi (Rachas.tsx: uma malha instanciada por parte, 4 draws no total);
//   - emparelhou com um (mesma pista, colado), pisca "tirar um racha";
//   - aceitou: a largada é andando, lado a lado; a chegada é um ponto mais pra
//     frente na mesma pista (o GPS do T42 aponta pra ela);
//   - o rival é uma IA leve, de elástico: corre no ritmo da Kombi, alivia
//     quando abre vantagem e aperta quando fica pra trás;
//   - ganhou: Água$ e prestígio (a popularidade, o que aumenta o cachê do show).
//
// [gosto] QUEM SÃO os corredores (nome, carro, cor, falas) é do dono: tudo em
// CORREDORES é RASCUNHO. Os números (RACHA_CFG) também.

import type { Save } from "../estado"
import { ganhar } from "../economia"

// ── [gosto] os corredores: RASCUNHO (o dono escolhe quem são) ──
export interface Corredor {
  id: string
  nome: string
  carro: string // o nome do carro (o que aparece no botão)
  cor: string // a lataria
  neon: string // o neon de baixo (e as faixas)
  nivel: number // o ritmo dele em relação à Kombi (1 = igual; abaixo de 1 dá pra ganhar mantendo o pé)
  premio: number // Água$ se você ganhar
  prestigio: number // quanto a fama sobe se você ganhar
  desafio: string // a fala no botão, emparelhado
  ganhou: string // a fala quando ele ganha
  perdeu: string // a fala quando você ganha
}

export const CORREDORES: Corredor[] = [
  { id: "faisca", nome: "Faísca", carro: "o rebaixado cromado", cor: "#c9ced8", neon: "#ff3fb0", nivel: 0.93, premio: 60, prestigio: 2, desafio: "kombi?? kkkk bora", ganhou: "volta quando ela crescer", perdeu: "respeito. o mecânico caprichou nessa aí" },
  { id: "dona-lua", nome: "Dona Lua", carro: "a perua de asa", cor: "#3a2a6a", neon: "#7fe8ff", nivel: 0.96, premio: 80, prestigio: 3, desafio: "tô voltando da feira. corre comigo?", ganhou: "a feira não espera, meu filho", perdeu: "essa kombi tem alma. cuida dela" },
  { id: "tic-tac", nome: "Tic-Tac", carro: "o relógio de 1987", cor: "#ffc21a", neon: "#5dffa0", nivel: 0.98, premio: 100, prestigio: 3, desafio: "eu já te vi correr. só que amanhã", ganhou: "eu sabia. eu já tinha visto", perdeu: "isso não tava no que eu vi. interessante" },
  { id: "gota", nome: "Gota", carro: "o tanque d'água", cor: "#1a6ad8", neon: "#2fe8ff", nivel: 0.95, premio: 70, prestigio: 2, desafio: "quem chegar primeiro bebe", ganhou: "seca, né? fica pra próxima", perdeu: "toma. água de verdade se ganha assim" },
  { id: "brasa", nome: "Brasa", carro: "o esportivo remendado", cor: "#d8202a", neon: "#ff9000", nivel: 1.0, premio: 120, prestigio: 4, desafio: "só os que já ganharam de alguém. vc já?", ganhou: "o subúrbio inteiro vai saber", perdeu: "...de novo. de novo!" },
]

// ── os números (RASCUNHO) ──
export const RACHA_CFG = {
  quantos: 5, // carros de estilo rodando ao mesmo tempo (no máximo CORREDORES.length)
  // rodando pela cidade
  velPasseio: [24, 32] as [number, number], // m/s, quando não estão correndo
  nascerDe: 160, // m: renasce entre essa distância e `nascerAte` da Kombi
  nascerAte: 480,
  longe: 650, // m: mais longe que isso da Kombi, renasce perto
  desenhaAte: 420, // m: além disso não desenha (some)
  // emparelhar (o botão pisca)
  emparelhaFrente: 16, // m pra frente/trás, na mesma pista
  emparelhaLado: 7.5, // m de lado
  piscaS: 7, // s que o botão fica piscando
  esperaS: 25, // s até o mesmo corredor oferecer de novo
  // o racha
  distancia: 900, // m até a chegada (na mesma pista, pra frente)
  minimo: 380, // m: a pista acaba antes disso? ele não oferece
  contagemS: 3, // a largada andando: 3, 2, 1
  chegadaRaio: 38, // m: a Kombi perto disso da chegada = chegou
  tempoMax: 80, // s: passou disso, ele ganha (você ficou pra trás)
  // a IA de elástico: v = ritmo × nível − folga × k (folga > 0 = ele na frente)
  ritmoMin: 26, // m/s: o ritmo de referência nunca cai abaixo disso (a Kombi parada não para ele)
  elastico: 0.12, // m/s por metro de folga
  vMin: 20,
  vMax: 95,
  acel: 14, // m/s² (ele não troca de velocidade de uma vez)
  mostraS: 5, // s que o resultado fica na tela
}

// ── as contas (puras) ──
// a velocidade que o rival quer agora: o ritmo da Kombi × o nível dele, menos o elástico
// folga = (o que falta pra Kombi) − (o que falta pra ele): positivo = ele na frente
export function velRival(c: Pick<Corredor, "nivel">, vKombi: number, folga: number, cfg = RACHA_CFG) {
  const ritmo = Math.max(cfg.ritmoMin, Math.abs(vKombi))
  return Math.max(cfg.vMin, Math.min(cfg.vMax, ritmo * c.nivel - folga * cfg.elastico))
}

// onde fica a chegada na pista (u) a partir de onde a largada é; null = a pista acaba antes do mínimo
export function chegadaNaPista(u: number, L: number, cfg = RACHA_CFG): number | null {
  const ate = Math.min(u + cfg.distancia, L - 40)
  return ate - u >= cfg.minimo ? ate : null
}

export interface ResultadoRacha { corredor: string; venceu: boolean; neon: number; prestigio: number; tempo: number }
export function premioRacha(c: Corredor, venceu: boolean, tempo: number): ResultadoRacha {
  return { corredor: c.id, venceu, neon: venceu ? c.premio : 0, prestigio: venceu ? c.prestigio : 0, tempo: Math.round(tempo * 10) / 10 }
}

// o save depois do racha: a grana (pela porta do dinheiro), a fama e o placar
export function registrarRacha(s: Save, r: ResultadoRacha): Save {
  const placar = s.rachas ?? {}
  const antes = placar[r.corredor] ?? { v: 0, d: 0 }
  const out = ganhar(s, r.neon)
  return {
    ...out,
    popularidade: Math.min(100, Math.max(0, Math.round(out.popularidade ?? 0)) + r.prestigio),
    rachas: { ...placar, [r.corredor]: r.venceu ? { ...antes, v: antes.v + 1 } : { ...antes, d: antes.d + 1 } },
  }
}

export const corredorPorId = (id: string) => CORREDORES.find((c) => c.id === id) ?? null
