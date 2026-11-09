// O SAMPLE DE UM INSTRUMENTO ANCESTRAL (bíblia §13, 09/11): cada nota desenhada uma
// vez num OfflineAudioContext, com a MESMA receita do jogo (instrumentos.ts soarTimbre)
// e, no djembê, o tambor gravado. O B4TIDA (batida/estudio/sons.ts, "anc:<id>") usa o
// AudioBuffer como um som: um AudioBuffer serve em qualquer contexto, ao vivo e no render.

import { bufferViolao } from "../som"
import { INSTRUMENTOS_ANCESTRAIS, soarTimbre, type InstrumentoId, type Sintese, type Timbre } from "./instrumentos"

const SR = 44100
// quanto dura cada desenho (s)
const DURACAO: Record<Timbre, number> = { tambor: 0.7, agua: 0.5, pote: 0.6, chocalho: 0.3, corda: 2.6, "sopro-grave": 1.8, arco: 2.6, sopro: 0.7, metal: 2, lamela: 1.2 }

function sinteseOffline(c: OfflineAudioContext): Sintese {
  const out = c.destination
  const ruidoBuf = c.createBuffer(1, Math.floor(SR * 1.5), SR)
  const d = ruidoBuf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return {
    bip(f, dur = 0.08, tipo = "square", vol = 0.12, quando = 0, fFim) {
      const o = c.createOscillator(), g = c.createGain()
      o.type = tipo
      o.frequency.setValueAtTime(f, quando)
      if (fFim) o.frequency.exponentialRampToValueAtTime(Math.max(20, fFim), quando + dur)
      g.gain.setValueAtTime(0.0001, quando)
      g.gain.exponentialRampToValueAtTime(vol, quando + 0.005)
      g.gain.exponentialRampToValueAtTime(0.0001, quando + dur)
      o.connect(g).connect(out)
      o.start(quando); o.stop(quando + dur + 0.02)
    },
    ruido(dur = 0.08, vol = 0.12, quando = 0, corte = 4000) {
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
      s.buffer = ruidoBuf
      f.type = "lowpass"; f.frequency.value = corte
      g.gain.setValueAtTime(vol, quando)
      g.gain.exponentialRampToValueAtTime(0.0001, quando + dur)
      s.connect(f).connect(g).connect(out)
      s.start(quando, Math.random() * 0.5); s.stop(quando + dur + 0.02)
    },
    corda(freq, vol = 0.35) {
      const dur = 2.4, n = Math.floor(SR * dur), buf = c.createBuffer(1, n, SR), b = buf.getChannelData(0)
      const periodo = Math.max(2, Math.round(SR / freq))
      for (let i = 0; i < periodo; i++) b[i] = Math.random() * 2 - 1
      for (let i = periodo; i < n; i++) b[i] = (b[i - periodo] + b[i - periodo + 1]) * 0.4985
      const s = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain()
      s.buffer = buf
      lp.type = "lowpass"; lp.frequency.value = 3200
      g.gain.value = vol
      s.connect(lp).connect(g).connect(out)
      s.start(0)
    },
    violao(freq, vol = 0.32) {
      const s = c.createBufferSource(), ar = c.createBiquadFilter(), tampo = c.createBiquadFilter(), brilho = c.createBiquadFilter(), g = c.createGain()
      s.buffer = bufferViolao(c, freq)
      ar.type = "peaking"; ar.frequency.value = 105; ar.Q.value = 2.2; ar.gain.value = 5
      tampo.type = "peaking"; tampo.frequency.value = 230; tampo.Q.value = 1.6; tampo.gain.value = 3.5
      brilho.type = "lowpass"; brilho.frequency.value = 4200
      g.gain.value = vol
      s.connect(ar).connect(tampo).connect(brilho).connect(g).connect(out)
      s.start(0)
    },
  }
}

// o djembê é o tambor gravado de verdade (public/tambor): grave, tom e tapa
const GOLPE_DJEMBE = ["/tambor/grave-1.mp3", "/tambor/tom-1.mp3", "/tambor/tapa-1.mp3"]
async function djembeGravado(i: number): Promise<AudioBuffer | null> {
  try {
    const r = await fetch(GOLPE_DJEMBE[i % GOLPE_DJEMBE.length])
    if (!r.ok) return null
    const c = new OfflineAudioContext(1, Math.floor(SR * 0.9), SR)
    const b = await c.decodeAudioData(await r.arrayBuffer())
    // o mp3 põe um silêncio no começo: pula ele
    const ch = b.getChannelData(0)
    let ini = 0
    while (ini < Math.min(ch.length, 8000) && Math.abs(ch[ini]) <= 0.01) ini++
    const s = c.createBufferSource()
    s.buffer = b
    s.connect(c.destination)
    s.start(0, Math.max(0, ini - 16) / b.sampleRate)
    return c.startRendering()
  } catch { return null }
}

function normalizar(b: AudioBuffer) {
  let pico = 0
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) pico = Math.max(pico, Math.abs(d[i]))
  if (pico > 0.0001) { const k = 0.9 / pico; for (let i = 0; i < d.length; i++) d[i] *= k }
  return b
}

async function desenhar(id: InstrumentoId, i: number): Promise<AudioBuffer> {
  const x = INSTRUMENTOS_ANCESTRAIS[id]
  const f = x.notas[((i % x.notas.length) + x.notas.length) % x.notas.length]
  if (x.timbre === "tambor") { const g = await djembeGravado(i); if (g) return normalizar(g) }
  const c = new OfflineAudioContext(1, Math.floor(SR * DURACAO[x.timbre]), SR)
  soarTimbre(sinteseOffline(c), x.timbre, f, 1)
  return normalizar(await c.startRendering())
}

const prontos = new Map<string, AudioBuffer>()
const fazendo = new Map<string, Promise<AudioBuffer | null>>()
const chave = (id: InstrumentoId, i: number) => `${id}:${i}`

/** desenha (uma vez só) a nota i do instrumento */
export function amostraInstrumento(id: InstrumentoId, i: number): Promise<AudioBuffer | null> {
  const k = chave(id, i)
  let p = fazendo.get(k)
  if (!p) {
    p = desenhar(id, i).then((b) => { prontos.set(k, b); return b }).catch(() => null)
    fazendo.set(k, p)
  }
  return p
}
export const amostraPronta = (id: InstrumentoId, i: number) => prontos.get(chave(id, i)) ?? null
