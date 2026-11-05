// OS VEÍCULOS POR ZONA (05/11, o dono; bíblia §8). Uma tabela só: em que zona
// o jogador está e com o que ele pode andar ali. Quem lê: a Corrida (os botões
// de trocar e a troca sozinha ao mudar de zona) e as trincheiras (os túneis).
//   - cidade (lá em cima, as pistas): tudo. Anda pelas vias como quiser
//   - deserto (o chão fora do subúrbio): só motorizado, a Kombi ou a moto.
//     No deserto não se sai da Kombi
//   - subúrbio e túneis (lá embaixo): só a pé / patins (e bmx, skate nas
//     trincheiras), mais a moto. A Kombi para na entrada
// A moto anda no deserto e nos túneis. Ela ainda está trancada (T14): a regra
// já conta com ela; o botão aparece com o cadeado até MOTO_LIBERADA.
// Leve: só contas de distância, sem three.js.

import { SUBURBIO, type HistoriaDisco } from "../disco/historia"

export type Zona = "cidade" | "deserto" | "suburbio" | "tuneis"
// "carro": o veículo escolhido no lugar da Kombi (o opala, a picape, o buggy)
export type Modo = "kombi" | "carro" | "moto" | "pe" | "patins" | "bmx" | "skate"

export const ZONA_VEICULOS: Record<Zona, readonly Modo[]> = {
  cidade: ["kombi", "carro", "moto", "pe", "patins", "bmx", "skate"],
  deserto: ["kombi", "carro", "moto"],
  suburbio: ["moto", "pe", "patins", "bmx", "skate"],
  tuneis: ["moto", "pe", "patins", "bmx", "skate"],
}

// (T14) as motos chegam depois: até lá, o botão com o cadeado
export const MOTO_LIBERADA = false
// (moto, 05/11) A REGRA DA MOTO: ela é o prêmio da missão dos túneis (a porta
// "motos" abre junto com "corridas", disco/portas.ts). Correu nas trincheiras,
// a moto é sua e mora guardada na Kombi. No fim do jogo (fase "livre") tudo abre.
// Antes disso, o botão com o cadeado e esta frase
export const TRANCA_MOTO = "ganha na missão dos túneis: correr nas trincheiras"
export function motoLiberada(h: Pick<HistoriaDisco, "fase" | "portas"> | null | undefined): boolean {
  if (!h) return false
  return h.fase === "livre" || (h.portas ?? []).includes("motos")
}

export const permitido = (z: Zona, m: Modo) => ZONA_VEICULOS[z].includes(m)
export const motorizado = (m: Modo) => m === "kombi" || m === "carro" || m === "moto"

// a borda do subúrbio: entra no raio dele; só sai uns metros depois (pra não
// ficar trocando em cima da linha)
export const BORDA_SUBURBIO = 20

// a zona de quem está no jogo aberto (a Corrida). Na pista (sem `voo`), a
// cidade; no chão ou voando livre, o subúrbio ou o deserto. Os túneis são as
// trincheiras (outra cena)
export function zonaDoJogo(voo: boolean | undefined, wx: number | undefined, wz: number | undefined, antes: Zona): Zona {
  if (!voo || wx === undefined || wz === undefined) return "cidade"
  const d = Math.hypot(wx - SUBURBIO.x, wz - SUBURBIO.z)
  const r = SUBURBIO.r + (antes === "suburbio" ? BORDA_SUBURBIO : 0)
  return d < r ? "suburbio" : "deserto"
}

// a frase do Nexo quando a zona troca o veículo
export const FALA_ZONA = {
  descer: "o subúrbio é a pé: a Kombi fica aqui na entrada",
  subir: "o deserto é de Kombi: sobe nela",
}
