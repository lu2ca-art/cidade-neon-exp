// Os sons das peças das missões (T15–T25, T16): sintetizados no Web Audio, pelo
// mesmo mestre do jogo (respeitam o volume e o mudo); a música da faixa toca
// num <audio> no volume da música, e o jogo embaixo fica em silêncio.

import { useEffect, useMemo, useRef } from "react"
import { audioCtx, fonteSom, pistaSom, player, saidaSom, silenciar } from "../../som"
import { ligarElemento } from "@/lib/mesa"

export function bip(f: number, dur = 0.08, tipo: OscillatorType = "square", vol = 0.12, quando = 0, fFim?: number) {
  const c = audioCtx(), out = saidaSom()
  if (!c || !out || f <= 0) return
  const t = c.currentTime + quando
  const o = c.createOscillator(), g = c.createGain()
  o.type = tipo
  o.frequency.setValueAtTime(f, t)
  if (fFim) o.frequency.exponentialRampToValueAtTime(Math.max(20, fFim), t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(out)
  o.start(t); o.stop(t + dur + 0.02)
}

let buf: AudioBuffer | null = null
export function ruido(dur = 0.08, vol = 0.12, quando = 0, corte = 4000) {
  const c = audioCtx(), out = saidaSom()
  if (!c || !out) return
  if (!buf || buf.sampleRate !== c.sampleRate) {
    buf = c.createBuffer(1, Math.floor(c.sampleRate * 1.5), c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const t = c.currentTime + quando
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
  s.buffer = buf
  f.type = "lowpass"; f.frequency.value = corte
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  s.connect(f).connect(g).connect(out)
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02)
}

export const bumbo = (quando = 0, vol = 0.5) => bip(140, 0.22, "sine", vol, quando, 40)
export const caixa = (quando = 0) => { ruido(0.12, 0.22, quando, 3500); bip(220, 0.06, "triangle", 0.08, quando) }
export const palma = (quando = 0) => { ruido(0.05, 0.18, quando, 6000); ruido(0.08, 0.14, quando + 0.012, 5000) }

// a música da faixa num <audio> (o volume da música). `tempo()` é o relógio da
// peça em segundos: o do áudio quando ele toca; senão, o do bpm (aparelho mudo,
// navegador sem som): nada trava.
let elP: HTMLAudioElement | null = null
function elPeca() {
  if (elP) return elP
  const a = new Audio()
  a.preload = "auto"
  a.crossOrigin = "anonymous"
  a.volume = 0.9
  ligarElemento(a, "musica")
  return (elP = a)
}

// (trilha sonora, 05/11; bíblia 9: a trilha não para) peça de ritmo com `sync`
// (a dança, o clipe): se a faixa que toca na rua É a da peça, ela não corta nada:
// o relógio da peça vira o da faixa da rua (que já passou pro instrumental no
// mesmo ponto), alinhado na batida. Só fora da pista dela a peça toca a própria
// faixa (o ritmo precisa da música certa). Sem `sync` (o disco antigo do Mubarak:
// escolher o disco É a peça), a peça toca o dela como antes
export type SyncPeca = { faixa: string; bpm: number }
export function useMusica(src: string | null, ligado = true, sync?: SyncPeca) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const t0 = useRef(0)
  // decidido uma vez, ao abrir: a faixa da rua é a da peça?
  const naRua = useRef<boolean | null>(null)
  if (naRua.current === null) naRua.current = !!sync && pistaSom.tocando && pistaSom.faixa?.id === sync.faixa && !(fonteSom.get() === "radio" && player.tocando)
  const rua = useRef({ t0: 0, ult: 0 })
  useEffect(() => {
    if (naRua.current) return
    silenciar(true)
    return () => silenciar(false)
  }, [])
  useEffect(() => {
    if (!ligado) return
    t0.current = performance.now()
    if (naRua.current) {
      const e = pistaSom.el, beat = 60 / (sync?.bpm || 120)
      rua.current = { t0: e ? Math.floor(e.currentTime / beat) * beat : 0, ult: 0 }
      return
    }
    if (!src) return
    // (T40b) um <audio> só pra todas as peças, ligado no canal da música da
    // mesa (antes: um novo por peça, fora do grafo, surdo ao mudo e ao volume)
    const a = elPeca()
    a.src = src
    a.currentTime = 0
    audio.current = a
    a.play().catch(() => { audio.current = null })
    return () => { a.pause(); audio.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, ligado])
  return useMemo(() => ({
    tempo: () => {
      if (naRua.current) {
        const e = pistaSom.el, r = rua.current
        if (e && !e.paused) {
          let t = e.currentTime - r.t0
          // a faixa voltou pro começo (a completa acabou, entrou o instrumental do 0): segue contando na batida
          if (t < r.ult - 0.5) { const beat = 60 / (sync?.bpm || 120); r.t0 = e.currentTime - Math.ceil(r.ult / beat) * beat; t = e.currentTime - r.t0 }
          r.ult = t
          return t
        }
        return r.ult // parada: segura o tempo
      }
      const a = audio.current
      if (a && !a.paused && a.currentTime > 0) return a.currentTime
      return (performance.now() - t0.current) / 1000
    },
    parar: () => { const a = audio.current; if (a) { a.pause() } },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])
}
