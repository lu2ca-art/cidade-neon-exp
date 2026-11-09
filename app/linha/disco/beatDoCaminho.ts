// O BEAT DO CAMINHO (ep. 3, episodios.md, 08/11): a música que a pessoa fez no B4TIDA
// a caminho do ginásio toca em loop até o fim da missão (chega lá ouvindo o beat e joga
// com ele). A trilha fica pausada enquanto isso (fazerMusica, bíblia §9: "a música só
// para quando é hora de fazer música"). O render usa o exportar do estúdio, que só
// carrega aqui, e roda fora da thread principal (OfflineAudioContext).

import { canal } from "@/lib/mesa"
import type { Musica } from "../../batida/estudio/tipos"
import { ac } from "../../neon-tiles/som"
import { fazerMusica } from "../som"

// o tanto de silêncio que o render deixa no fim (o eco do último compasso): o loop pula
const CAUDA = 2.5
const VOLUME = 0.9
const FADE = 0.4

let atual: { src: AudioBufferSourceNode; vol: GainNode } | null = null
let segurando = false

function soltar() {
  if (!segurando) return
  segurando = false
  fazerMusica(false)
}

/** renderiza e deixa tocando em loop; sem som (áudio bloqueado, render falhou), só devolve */
export async function tocarBeat(m: Musica): Promise<void> {
  pararBeat()
  const ctx = ac()
  if (!ctx) return
  segurando = true
  fazerMusica(true)
  try {
    const { renderizar } = await import("../../batida/estudio/exportar")
    const buf = await renderizar(m)
    if (!segurando) return
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    src.loopStart = 0.05
    src.loopEnd = Math.max(0.1, buf.duration - CAUDA)
    const vol = ctx.createGain()
    vol.gain.setValueAtTime(0, ctx.currentTime)
    vol.gain.linearRampToValueAtTime(VOLUME, ctx.currentTime + FADE)
    src.connect(vol).connect(canal("musica") ?? ctx.destination)
    src.start()
    atual = { src, vol }
  } catch {
    soltar()
  }
}

/** para o beat e devolve a trilha (acabou a missão, trocou de missão, saiu do jogo) */
export function pararBeat(): void {
  const a = atual
  atual = null
  if (a) {
    const ctx = a.vol.context as AudioContext
    a.vol.gain.setTargetAtTime(0, ctx.currentTime, FADE / 3)
    setTimeout(() => { try { a.src.stop() } catch {} }, FADE * 1000 + 100)
  }
  soltar()
}
