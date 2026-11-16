// O SHOW NOS TÚNEIS (16/11, episodios.md "Dos túneis pra cima", palavras do dono): "a
// revolução acontece dos túneis pra cima. As torneiras foram encontradas nos túneis.
// Temos que adicionar um show nos túneis [...] nos túneis o show vai ser bem colorido:
// quem estiver lá vai curtir muito a vista."
//
// O palco fica no SALÃO DO METRÔ das trincheiras (o maior salão; o trem fica do lado
// de fora, o palco no arco livre entre a boca do RIO SECO A e o trem). Na escada dos
// shows (escadaShows.ts) ele é o degrau logo abaixo do final.
// Quem desenha: trincheiras/PalcoTuneis.tsx (o 3D, só montado perto). Quem abre o
// show: disco/ShowTuneis.tsx (o botão perto do palco). Função pura aqui, sem 3D.

import { SALAO_METRO, CURVA } from "../trincheiras/mapa"
import type { PistaId } from "../estrada/pistas"
import { EPISODIOS, episodioFeito, rotuloDoEpisodio, type Episodio } from "./episodios"
import type { HistoriaDisco } from "./historia"
import { musicasDoGuitar } from "./portas"

export const SHOW_TUNEIS_CFG = {
  // ═══ QUANDO ABRE (fácil de mudar) ═══
  // o show dos túneis abre com este episódio feito: (16/11, o dono) o do Mubarak
  // (DopaminA, ep. 2), cedo no jogo. Trocar o id troca o ponto do jogo (null =
  // aberto desde o começo)
  abreDepoisDe: "dopamina" as PistaId | null,
  // o palco: o ângulo no salão a partir do lado de fora (onde está o trem), em graus,
  // e a distância do centro. -70°: no arco livre entre o trem e a boca do RIO SECO A
  angulo: -70,
  distancia: SALAO_METRO.r - CURVA - 14,
  // RASCUNHO: as cores das luzes e da projeção (o túnel é o show mais colorido)
  cores: ["#ff3fb0", "#2fe8ff", "#ffc857", "#7dffb0", "#c08cff", "#ff7a3c"],
  cor: "#2fe8ff",
  // o menu do palco (só as que já abriram no Guitar Driver tocam). RASCUNHO
  musicas: ["nectar", "dopamina", "copo", "ojala", "swav", "sexta", "ontem", "rollercoaster"] as PistaId[],
  // o cachê: vezes o cachê do T03 (como os palcos da carreira; o alto das torres paga 4)
  paga: 4.5,
  // perto do palco (m): o botão aparece
  perto: 34,
  // a câmera da plateia (quem assiste): atrás da plateia, olhando o palco
  plateia: { recuo: 46, altura: 7 },
  nome: "o palco dos túneis",
  no: "nos túneis",
}

// onde está o palco (o centro da frente) e pra onde ele olha (pro meio do salão)
const a0 = Math.atan2(SALAO_METRO.fora.z, SALAO_METRO.fora.x) + (SHOW_TUNEIS_CFG.angulo * Math.PI) / 180
export const PALCO_TUNEIS = {
  x: SALAO_METRO.c.x + Math.cos(a0) * SHOW_TUNEIS_CFG.distancia,
  z: SALAO_METRO.c.z + Math.sin(a0) * SHOW_TUNEIS_CFG.distancia,
  // a direção da frente do palco (aponta pro centro do salão)
  fx: -Math.cos(a0),
  fz: -Math.sin(a0),
  // o giro em y pro grupo do palco (o +z local olha pra plateia)
  giro: Math.atan2(-Math.cos(a0), -Math.sin(a0)),
}

const epAbre = (): Episodio | null => EPISODIOS.find((e) => e.id === SHOW_TUNEIS_CFG.abreDepoisDe) ?? null

/** aberto? (o fim do jogo, "livre", sempre) */
export function tuneisAberto(h: HistoriaDisco | null | undefined): boolean {
  if (!h) return false
  if (h.fase === "livre") return true
  const ep = epAbre()
  return !ep || episodioFeito(h, ep)
}
/** o cadeado: o que libera */
export function travaTuneis(): string {
  const ep = epAbre()
  return ep ? `o show dos túneis abre depois do ${rotuloDoEpisodio(ep)} (${ep.quem})` : ""
}
/** as músicas do palco, com as que já tocam */
export const menuTuneis = (h: HistoriaDisco) => {
  const livres = musicasDoGuitar(h)
  return SHOW_TUNEIS_CFG.musicas.map((f) => ({ faixa: f, livre: livres.includes(f) }))
}
/** perto do palco (no chão do salão)? */
export const pertoDoPalcoTuneis = (x: number, z: number) => Math.hypot(x - PALCO_TUNEIS.x, z - PALCO_TUNEIS.z) < SHOW_TUNEIS_CFG.perto

// assistindo da plateia: o 3D (PalcoTuneis) leva a câmera pro meio da plateia e a
// festa sobe. Um objeto de módulo (sem React): lido a cada quadro só perto do palco
// publico: a gente no degrau dos túneis (0–100), posto pela página (ShowTuneis) ao descer
export const SHOW_TUNEIS_AGORA = { assistindo: false, energia: 0, publico: 30 }
