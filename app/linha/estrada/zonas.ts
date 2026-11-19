// OS VEÍCULOS POR ZONA (05/11, o dono; bíblia §8). Uma tabela só: em que zona
// o jogador está e com o que ele pode andar ali. Quem lê: a Corrida (os botões
// de trocar e a troca sozinha ao mudar de zona) e as trincheiras (os túneis).
//   - cidade (lá em cima, as pistas): tudo. Anda pelas vias como quiser
//   - deserto (o chão fora do subúrbio): só motorizado, a Kombi ou a moto.
//     No deserto não se sai da Kombi
//   - subúrbio e túneis (lá embaixo): só a pé / patins (e bmx, skate nas
//     trincheiras), mais a moto. A Kombi para na entrada
// A moto anda no deserto, no subúrbio, nos túneis e na cidade. Ela vem guardada
// na Kombi e libera na missão dos túneis (motoLiberada, abaixo); antes disso o
// botão aparece com o cadeado e o aviso (TRANCA_MOTO). Ver docs/moto.md
// Leve: só contas de distância, sem three.js.

import { foraDoSuburbio, type HistoriaDisco } from "../disco/historia"

export type Zona = "cidade" | "deserto" | "suburbio" | "tuneis"
// "carro": o veículo escolhido no lugar da Kombi (o opala, a picape, o buggy)
export type Modo = "kombi" | "carro" | "moto" | "pe" | "patins" | "bmx" | "skate"

export const ZONA_VEICULOS: Record<Zona, readonly Modo[]> = {
  cidade: ["kombi", "carro", "moto", "pe", "patins", "bmx", "skate"],
  deserto: ["kombi", "carro", "moto"],
  suburbio: ["moto", "pe", "patins", "bmx", "skate"],
  tuneis: ["moto", "pe", "patins", "bmx", "skate"],
}

// (moto, 05/11) A REGRA DA MOTO: ela é o prêmio da missão dos túneis (a porta
// "motos" abre junto com "corridas", disco/portas.ts). Correu nas trincheiras,
// a moto é sua e mora guardada na Kombi. No fim do jogo (fase "livre") tudo abre.
// Antes disso, o botão com o cadeado e esta frase
export const TRANCA_MOTO = "ganha na missão dos túneis: correr nas trincheiras"
// de moto agora no mundo aberto? A Corrida marca; as trincheiras leem ao descer
// (desceu de moto, passeia de moto lá embaixo)
export const naMoto = { agora: false }
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
  // (18/11) o subúrbio é o anel na beira da cratera (historia.ts, CRATERA)
  return foraDoSuburbio(wx, wz) <= (antes === "suburbio" ? BORDA_SUBURBIO : 0) ? "suburbio" : "deserto"
}

// (09/11, o dono; bíblia §13 e §15) A ÁGUA PAGA A SUBIDA: no deserto o propulsor segue na
// energia solar, de graça. Só subir voando do chão até a cidade custa, um preço único,
// cobrado quando a Kombi (ou os patins) pousa na pista. Sem água pra pagar, voa baixo (TETO_SEM_AGUA,
// abaixo da pista mais baixa, que passa a 15 m do chão) e o Nexo avisa. A 1ª subida (fase
// "subir") é grátis: a oficina leva toda a água. O jato dos patins paga igual (09/11).
// Quem está sem água sobe de graça pela porta do elevador (disco/elevadores.ts)
export const PRECO_SUBIDA_AGUA = 20 // Água$ (RASCUNHO do preço)
export const TETO_SEM_AGUA = 10 // m acima do chão
export const propulsorCobra = (fase: string | null | undefined) => fase === "carreira" || fase === "livre"

// a frase do Nexo quando a zona troca o veículo
export const FALA_ZONA = {
  semAgua: `subir voando custa ${PRECO_SUBIDA_AGUA} de água. a porta do elevador leva de graça`,
  gabarito: "a Kombi não desce pros túneis: daqui, só de patins ou de moto",
  descer: "o subúrbio é a pé: a Kombi fica aqui na entrada",
  subir: "o deserto é de Kombi: sobe nela",
  // (moto) com a moto liberada
  descerMoto: "a Kombi fica na entrada: segue de moto",
  moto: "sem Kombi, o deserto é de moto",
}
