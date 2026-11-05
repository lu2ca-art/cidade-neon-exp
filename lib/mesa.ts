// A MESA DE MIXAGEM (T40b, 30/10; o dono: "a parte sonora ainda tá uma bagunça").
//
// UM AudioContext pro jogo inteiro (antes eram seis: o jogo, o Guitar Driver, o
// fliperama, o parque, o ginásio e a galeria da Ella, cada um direto na caixa,
// fora do mudo e dos volumes). Todo som passa por um dos 4 canais:
//
//   música   (rádio, toca-discos, a pista, a trilha da missão, as faixas dos jogos)
//   ambiente (o vento, a chuva: o fundo que não é música)
//   efeitos  (motor, patins, notas, bipes, tambor, sinuca…)
//   vozes    (notas de voz, ligação)
//
//   fonte → canal.volume → canal.prioridade → GERAL → mudo → LIMITADOR → caixa
//
// Prioridade: alguém falando abaixa a música e o ambiente (vozAbaixa). "Nunca
// duas músicas": quem toca uma música própria (um jogo, uma prévia) chama
// segurarMusica(true) e o jogo cala a dele (o som.ts do /linha registra como).
// O limitador no fim segura os picos (nada estoura quando tudo soa junto).
//
// Desempenho: os nós da mesa são criados uma vez; cada <audio> ligado na mesa
// ganha o seu MediaElementSource uma vez só (guardado num WeakMap).
//
// Sem import de nada do jogo: os apps soltos (/neon-tiles, /fliperama…) usam
// a mesma mesa e continuam funcionando sozinhos.

export type Canal = "musica" | "ambiente" | "efeitos" | "vozes"
export type CanalVolume = "geral" | Canal
export const CANAIS: readonly Canal[] = ["musica", "ambiente", "efeitos", "vozes"]

// os números da mesa (afinar aqui, num lugar só)
export const MESA = {
  // quanto a música e o ambiente descem enquanto alguém fala
  duckMusica: 0.25,
  duckAmbiente: 0.5,
  // tempo pra descer / voltar (constante de tempo do setTargetAtTime, s)
  duckDesce: 0.12,
  duckVolta: 0.6,
  // folga antes do limitador (o compressor do navegador sobe um tiquinho o ganho)
  folga: 0.9,
  // o limitador: só pega o pico (abaixo do limiar, passa igual)
  limiar: -1.5, // dB
  joelho: 1,
  razao: 20,
  ataque: 0.002,
  soltura: 0.15,
}

const CHAVE_VOL = "cn-volumes"
export const VOLUMES: Record<CanalVolume, number> = { geral: 1, musica: 1, ambiente: 1, efeitos: 1, vozes: 1 }
try {
  const v = typeof localStorage !== "undefined" ? JSON.parse(localStorage.getItem(CHAVE_VOL) ?? "null") : null
  if (v) for (const k of Object.keys(VOLUMES) as CanalVolume[]) if (typeof v[k] === "number") VOLUMES[k] = Math.max(0, Math.min(1, v[k]))
} catch {}

let ctx: AudioContext | null = null
let geral: GainNode | null = null
let mudoG: GainNode | null = null
let limitador: DynamicsCompressorNode | null = null
const vol: Partial<Record<Canal, GainNode>> = {}
const prio: Partial<Record<Canal, GainNode>> = {}
let estaMudoAgora = false

export function mesaCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    const c = new AC()
    ctx = c
    limitador = c.createDynamicsCompressor()
    limitador.threshold.value = MESA.limiar
    limitador.knee.value = MESA.joelho
    limitador.ratio.value = MESA.razao
    limitador.attack.value = MESA.ataque
    limitador.release.value = MESA.soltura
    limitador.connect(c.destination)
    mudoG = c.createGain()
    mudoG.gain.value = estaMudoAgora ? 0 : MESA.folga
    mudoG.connect(limitador)
    geral = c.createGain()
    geral.gain.value = VOLUMES.geral
    geral.connect(mudoG)
    for (const k of CANAIS) {
      const p = c.createGain()
      p.connect(geral)
      const g = c.createGain()
      g.gain.value = VOLUMES[k]
      g.connect(p)
      vol[k] = g
      prio[k] = p
    }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {})
  return ctx
}

// a entrada de um canal (onde a fonte se liga)
export function canal(k: Canal): AudioNode | null {
  mesaCtx()
  return vol[k] ?? null
}

export function definirVolume(k: CanalVolume, v: number) {
  VOLUMES[k] = Math.max(0, Math.min(1, v))
  const g = k === "geral" ? geral : vol[k]
  if (g && ctx) g.gain.setTargetAtTime(VOLUMES[k], ctx.currentTime, 0.05)
  try { localStorage.setItem(CHAVE_VOL, JSON.stringify(VOLUMES)) } catch {}
}

export function mudo(m: boolean) {
  estaMudoAgora = m
  if (mudoG && ctx) mudoG.gain.setTargetAtTime(m ? 0 : MESA.folga, ctx.currentTime, 0.1)
}
export const estaMudo = () => estaMudoAgora

// o volume que sai de verdade num canal (pra o que não passa pelo grafo: a voz do navegador)
export function volumeEfetivo(k: Canal) {
  return estaMudoAgora ? 0 : VOLUMES.geral * VOLUMES[k]
}

// PRIORIDADE: a voz abaixa a música e o ambiente. Conta quem pediu (a nota de
// voz, a ligação inteira): só volta quando todos soltam
let falando = 0
export function vozAbaixa(sim: boolean) {
  falando = Math.max(0, falando + (sim ? 1 : -1))
  const c = mesaCtx()
  if (!c) return
  const baixo = falando > 0
  const tc = baixo ? MESA.duckDesce : MESA.duckVolta
  prio.musica?.gain.setTargetAtTime(baixo ? MESA.duckMusica : 1, c.currentTime, tc)
  prio.ambiente?.gain.setTargetAtTime(baixo ? MESA.duckAmbiente : 1, c.currentTime, tc)
}
export const alguemFalando = () => falando > 0

// "nunca duas músicas": quem toca uma música própria segura a do jogo
let aoSegurar: ((sim: boolean) => void) | null = null
export function registrarSegurar(f: (sim: boolean) => void) { aoSegurar = f }
export function segurarMusica(sim: boolean) { aoSegurar?.(sim) }
// (trilha sonora, 05/11) a música do jogo está tocando? (o som.ts do /linha registra).
// Um jogo com laço próprio (o fliperama) não toca o dele por cima: a trilha do jogo
// segue e faz parte do cenário. Sem registro (um app solto), false
let musicaTocando: (() => boolean) | null = null
export function registrarMusicaTocando(f: () => boolean) { musicaTocando = f }
export const musicaDoJogoTocando = () => !!musicaTocando?.()

// liga um <audio> num canal (uma vez por elemento). false = sem grafo (fica no el.volume)
const fontes = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>()
export function ligarElemento(el: HTMLMediaElement, k: Canal): boolean {
  const ja = fontes.get(el)
  if (ja) return true
  const c = mesaCtx(), out = canal(k)
  if (!c || !out) { el.volume = volumeEfetivo(k); return false }
  try {
    const s = c.createMediaElementSource(el)
    s.connect(out)
    fontes.set(el, s)
    return true
  } catch { return false }
}
