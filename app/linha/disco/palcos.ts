// OS PALCOS COMO GUITAR HERO (T20, 28/10). "O jogo trata as músicas como um
// Guitar Hero de verdade, com o menu de músicas. Cada palco tem a sua lista, e
// o jogador vai cantando as músicas e subindo de nível até chegar ao topo."
// "Nenhum show é obrigatório, mas eles pagam uma grana boa."
//
//   - cada palco tem o seu menu (o setlist). As músicas que as missões ainda não
//     liberaram no Guitar Driver aparecem com o cadeado ("abre na missão de X")
//   - cada show dá estrelas (1 a 5, pela nota; terminar já vale 1). Fica a
//     melhor de cada música em cada palco
//   - as estrelas somadas abrem o palco de cima: o NÍVEL é quantos palcos estão
//     abertos (1 a 5), até o topo
//   - o cachê é o do T03 (economia.ts: a nota e a fama) vezes o palco: quanto
//     mais alto, mais paga
//
// [gosto] PROPOSTA DO CLAUDE: os palcos sobem a cidade de verdade (o primeiro na
// rua, o último no alto das torres; a carreira é a subida da árvore). Liga e
// desliga em PALCOS_CONFIG.sobem: desligado, todos ficam no chão (os mesmos
// níveis, com os nomes de rua).
//
// Tudo que é número ou nome aqui é RASCUNHO pro dono ajustar.

import { ehAoVivo } from "../../neon-tiles/dados"
import { PISTAS, type PistaId } from "../estrada/pistas"
import type { HistoriaDisco } from "./historia"
import { musicasDoGuitar, portaAberta } from "./portas"

export const PALCOS_CONFIG = {
  // [gosto, proposta] os palcos sobem a cidade (rua → torres). false = todos na rua
  sobem: true,
  // os palcos acima do primeiro só abrem depois da missão do LU2CA (a que
  // apresenta os shows: a porta "os 5 shows do LIVE"). false = abrem só com estrelas
  precisaDoLive: true,
  // (08/11, bíblia §11) a pessoa escolhe o nível (o palco) desde o primeiro play: as
  // estrelas e a missão do LU2CA não trancam mais. false = a subida de antes
  nivelLivre: true,
  // a nota mínima (0–1) de cada estrela: [1★, 2★, 3★, 4★, 5★]. Terminar já dá 1
  estrelas: [0, 0.35, 0.55, 0.75, 0.9],
}

export type Altura = "rua" | "predios" | "terracos" | "torres"
export const NOME_ALTURA: Record<Altura, string> = { rua: "na rua", predios: "nos prédios", terracos: "nos terraços", torres: "no alto das torres" }

export interface PalcoCarreira {
  id: string
  nome: string // "o bar"
  no: string // "no bar"
  // a altura na cidade (com PALCOS_CONFIG.sobem) e os metros (pra escada do menu)
  altura: Altura
  metros: number
  // o palco desenhado do Guitar Driver (neon-tiles/dados.ts PALCOS) que vira o fundo do show
  gd: string
  cor: string
  // o menu de músicas deste palco
  musicas: PistaId[]
  // quantas estrelas (somadas, de todos os palcos) abrem este palco
  abreCom: number
  // o cachê: vezes o cachê do T03
  paga: number
  // com PALCOS_CONFIG.sobem = false: o nome dele no chão
  chao?: { nome: string; no: string }
}

// RASCUNHO. A Nectar (a música dele) está em todos: dá pra subir até o topo só
// com ela, cantando bem (nenhuma missão é obrigatória pra subir)
export const PALCOS_CARREIRA: PalcoCarreira[] = [
  { id: "calcada", nome: "a calçada", no: "na calçada", altura: "rua", metros: 0, gd: "posto", cor: "#ff9000", musicas: ["nectar", "ojala", "chuva"], abreCom: 0, paga: 1 },
  { id: "bar", nome: "o bar", no: "no bar", altura: "rua", metros: 0, gd: "bar", cor: "#ff6a35", musicas: ["nectar", "copo", "ontem"], abreCom: 3, paga: 1.4 },
  { id: "balada", nome: "a balada", no: "na balada", altura: "predios", metros: 45, gd: "balada", cor: "#b38cff", musicas: ["nectar", "sexta", "dopamina", "copo"], abreCom: 7, paga: 2 },
  { id: "terraco", nome: "o terraço", no: "no terraço", altura: "terracos", metros: 140, gd: "topo", cor: "#2fe8ff", musicas: ["nectar", "dopamina", "swav", "chuva"], abreCom: 12, paga: 2.8, chao: { nome: "a praça", no: "na praça" } },
  { id: "torres", nome: "o alto das torres", no: "no alto das torres", altura: "torres", metros: 320, gd: "arena", cor: "#ff3fb0", musicas: ["nectar", "rollercoaster", "sexta", "swav", "ontem", "ojala"], abreCom: 18, paga: 4, chao: { nome: "o festival da avenida", no: "no festival da avenida" } },
]

export const palcoPorId = (id: string) => PALCOS_CARREIRA.find((p) => p.id === id) ?? null
// o nome de agora (no chão, com a proposta desligada)
export const nomeDoPalco = (p: PalcoCarreira) => (!PALCOS_CONFIG.sobem && p.chao ? p.chao : { nome: p.nome, no: p.no })
export const alturaDe = (p: PalcoCarreira): { altura: Altura; metros: number } => (PALCOS_CONFIG.sobem ? { altura: p.altura, metros: p.metros } : { altura: "rua", metros: 0 })

// ── as estrelas ──
const chave = (palco: string, faixa: string) => `${palco}:${faixa}`
export function estrelasDaNota(nota: number): number {
  const n = Math.max(0, Math.min(1, nota || 0))
  let e = 0
  PALCOS_CONFIG.estrelas.forEach((min, i) => { if (n >= min) e = i + 1 })
  return Math.max(1, e)
}
export const melhorDe = (h: HistoriaDisco, palco: string, faixa: string) => h.palcos?.[chave(palco, faixa)] ?? 0
export const estrelasTotais = (h: HistoriaDisco) => Object.values(h.palcos ?? {}).reduce((a, n) => a + n, 0)
export const estrelasDoPalco = (h: HistoriaDisco, palco: string) => Object.entries(h.palcos ?? {}).filter(([k]) => k.startsWith(`${palco}:`)).reduce((a, [, n]) => a + n, 0)

// ── os palcos abertos e o nível ──
export type Trava = { t: "aberto" } | { t: "estrelas"; faltam: number } | { t: "live" }
export function travaDo(h: HistoriaDisco, p: PalcoCarreira): Trava {
  const i = PALCOS_CARREIRA.indexOf(p)
  if (PALCOS_CONFIG.nivelLivre) return { t: "aberto" }
  if (i > 0 && PALCOS_CONFIG.precisaDoLive && !portaAberta(h, "shows-live")) return { t: "live" }
  const faltam = p.abreCom - estrelasTotais(h)
  return faltam > 0 ? { t: "estrelas", faltam } : { t: "aberto" }
}
export const palcoAberto = (h: HistoriaDisco, p: PalcoCarreira) => travaDo(h, p).t === "aberto"
// o nível: quantos palcos estão abertos, em ordem (1 = só a calçada; 5 = o topo)
export function nivelDe(h: HistoriaDisco): number {
  let n = 0
  for (const p of PALCOS_CARREIRA) { if (!palcoAberto(h, p)) break; n++ }
  return Math.max(1, n)
}
export const NIVEL_MAX = PALCOS_CARREIRA.length

// as músicas do menu: as do palco, com as liberadas tocando
export function menuDo(h: HistoriaDisco, p: PalcoCarreira): { faixa: PistaId; nome: string; livre: boolean; estrelas: number }[] {
  const livres = musicasDoGuitar(h)
  return p.musicas.filter(ehAoVivo).map((f) => ({ faixa: f, nome: PISTAS.find((x) => x.id === f)?.faixa ?? f, livre: livres.includes(f), estrelas: melhorDe(h, p.id, f) }))
}

// ── o show de um palco: o id no save (hist.show) ──
export const showDoPalco = (palco: string, faixa: string) => `palco:${palco}:${faixa}`
export function lerShowDoPalco(id: string): { palco: PalcoCarreira; faixa: PistaId } | null {
  if (!id.startsWith("palco:")) return null
  const [, pid, f] = id.split(":")
  const p = palcoPorId(pid)
  return p && PISTAS.some((x) => x.id === f) ? { palco: p, faixa: f as PistaId } : null
}

// o cachê do palco: o do T03 (economia.ts cacheDoShow) vezes o palco
export const cacheNoPalco = (cacheBase: number, p: PalcoCarreira) => Math.round(cacheBase * p.paga)

// o show acabou: guarda a melhor estrela e diz se subiu de nível
export function registrarShow(h: HistoriaDisco, palco: string, faixa: string, nota: number): { h: HistoriaDisco; estrelas: number; recorde: boolean; nivelAntes: number; nivel: number } {
  const e = estrelasDaNota(nota)
  const antes = melhorDe(h, palco, faixa)
  const nivelAntes = nivelDe(h)
  const novo: HistoriaDisco = e > antes ? { ...h, palcos: { ...(h.palcos ?? {}), [chave(palco, faixa)]: e } } : h
  return { h: novo, estrelas: e, recorde: e > antes, nivelAntes, nivel: nivelDe(novo) }
}
