// (T57) A BOCA DO TÚNEL leva às trincheiras. As trincheiras (T11, T13) ainda
// moram na página delas (/teste/trincheiras): trazer o túnel inteiro pra dentro
// do mapa é grande (outra cena, outro chão, outra física). Então a boca é de
// verdade no subúrbio (a rampa, a porta escura com o neon; estrada/chao.ts e
// LugaresChao) e, lá embaixo, ele desce pra página das trincheiras; de lá, "subir
// pro subúrbio" volta pro mapa, saindo da boca. Se correu, a volta conta pra
// missão dos túneis (o jogo dela).

import { BOCA } from "../estrada/chao"

export const ROTA_TRINCHEIRAS = "/teste/trincheiras"
// a volta: pro mapa-disco, saindo da boca do túnel
export const VOLTA_TRINCHEIRAS = "/linha?mapa=disco&de=tuneis"

export function irTrincheiras(missao: string | null) {
  // a página inteira (e não o router): o mapa sai da memória antes das trincheiras entrarem
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  location.assign(`${ROTA_TRINCHEIRAS}?volta=disco${missao ? `&missao=${missao}` : ""}`)
}

// voltou das trincheiras? (e correu uma volta inteira lá embaixo?)
export function voltaDasTrincheiras(busca = typeof location === "undefined" ? "" : location.search) {
  const q = new URLSearchParams(busca)
  return q.get("de") === "tuneis" ? { corrida: q.has("corrida") } : null
}
// tira o "de=tuneis" da barra (recarregar não repete a volta)
export function limparVoltaDasTrincheiras() {
  const u = new URL(location.href)
  u.searchParams.delete("de"); u.searchParams.delete("corrida")
  history.replaceState(history.state, "", u.pathname + u.search + u.hash)
}
// onde a Kombi reaparece na volta: no alto da rampa, de frente pro subúrbio
export function saidaDoTunel() {
  const s = -BOCA.comp - 8
  return { x: BOCA.x + BOCA.ax * s, z: BOCA.z + BOCA.az * s, rumo: Math.atan2(-BOCA.ax, -BOCA.az) }
}
