// O ATROPELO (06/10, LU2CA: "o carro da cidade voa pro lado, a Kombi segue").
// Uma regra só pra tudo o que a Kombi pega no chão: os carros da cidade
// (estrada/Corrida.tsx) e os robôs do deserto (disco/Robos.tsx, os que andam,
// e disco/RobosCaidos.tsx, os zumbis). O dono, 30/10: "não dão água, não dão
// nada. É só atropelar e eles saem voando igual aos carros. Pura diversão."
// O que foi pego voa pro lado girando, cai, quica baixinho e fica um tempo
// fora. A Kombi treme, pisca e quase não freia. Os números ficam aqui pra
// afinar sem mexer no código.

// a gravidade do mapa-disco (a mesma da Kombi lá)
export const G_DISCO = 12.5

export const ATROPELO = {
  fora: 7, // s: quanto tempo o que foi pego fica voando/caído antes de voltar
  // a força da batida: base + velocidade relativa / vel, até o máximo
  forcaBase: 0.5, forcaVel: 25, forcaMax: 1.6,
  lateral: 9, lateralForca: 8, // m/s pro lado
  subida: 3, subidaForca: 4, // m/s pra cima
  giro: 3, giroForca: 4, // rad/s
  freioLateral: 1.6, // por segundo (some aos poucos)
  freioFrente: 2, // por segundo (o que já andava, os carros)
  quique: 0.25, // quanto sobra da queda no quique
  quiqueGiro: 0.6, // quanto sobra do giro no quique
  tombo: 0.3, // o quanto ele tomba de lado enquanto gira (rad)
  // a Kombi
  freioKombiDisco: 0.94, freioKombi: 0.82,
  empurraKombi: 4, empurraKombiForca: 4, // m/s pro outro lado (na pista do disco)
  shake: 1.1, flash: 0.3,
  // os robôs: a Kombi parada (ou quase) só encosta
  vMinRobo: 3,
} as const

export const VIB_ATROPELO = [50, 30, 80]

// a força (0,5 a 1,6) pela velocidade com que a Kombi pega o outro
export function forcaAtropelo(vRel: number) {
  return Math.min(ATROPELO.forcaMax, ATROPELO.forcaBase + Math.abs(vRel) / ATROPELO.forcaVel)
}

// o voo de um robô no deserto, no mundo (x, z): a mesma conta do carro, que
// voa pela lateral da pista. Mexe no objeto e devolve se ainda está voando.
export type Voo = { x: number; y: number; z: number; vx: number; vy: number; vz: number; giro: number; vgiro: number; fora: number }

// lança: (fx, fz) é o rumo da Kombi; o lado sai de onde ele está em relação a ela
export function lancar(o: Voo, kx: number, kz: number, fx: number, fz: number, vKombi: number) {
  const px = fz, pz = -fx // a lateral da Kombi
  const lado = Math.sign((o.x - kx) * px + (o.z - kz) * pz) || (Math.random() < 0.5 ? -1 : 1)
  const f = forcaAtropelo(vKombi)
  const vl = lado * (ATROPELO.lateral + ATROPELO.lateralForca * f)
  o.vx = px * vl; o.vz = pz * vl
  o.vy = ATROPELO.subida + ATROPELO.subidaForca * f
  o.vgiro = (Math.random() < 0.5 ? -1 : 1) * (ATROPELO.giro + ATROPELO.giroForca * f)
  o.fora = ATROPELO.fora
  return f
}

// um passo do voo; chao = a altura do chão em (x, z)
export function voar(o: Voo, dt: number, chao: number) {
  o.fora -= dt
  o.x += o.vx * dt; o.z += o.vz * dt
  const fr = Math.exp(-dt * ATROPELO.freioLateral)
  o.vx *= fr; o.vz *= fr
  o.vy -= G_DISCO * dt
  o.y = Math.max(chao, o.y + o.vy * dt)
  if (o.y === chao) { o.vy = Math.abs(o.vy) * ATROPELO.quique; o.vgiro *= ATROPELO.quiqueGiro }
  o.giro += o.vgiro * dt
  return o.fora > 0
}
