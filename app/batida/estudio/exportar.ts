// B4TIDA estúdio — sair com a música pronta.
//
// Renderiza a música inteira (o arranjo, seção por seção) com a mesma mesa
// de som do estúdio, masteriza (volume no padrão do streaming, ~-14 LUFS, e
// um limitador que segura o pico em -1 dB) e gera WAV e MP3 com a marca
// "feito na B4TIDA · Cidade Neon · LU2CA" nos metadados.

import { createMixBus } from "../lib/mixgraph"
import { montarMesa, swingDe, tocarPasso } from "./motor"
import { precarregar } from "./sons"
import { audiveis, passosDa, segPorPasso, type Musica } from "./tipos"
import { lerVoz } from "./armazem"
import { paraWav } from "./voz"

const SR = 44100
export const MARCA = "feito na B4TIDA · Cidade Neon · LU2CA (lu2ca.art)"

export async function renderizar(m: Musica, so?: string /* id de uma seção só */, vozesExtra?: Record<string, string> /* data URLs (biblioteca) */): Promise<AudioBuffer> {
  const blocos = (so ? [so] : m.arranjo).map((id) => m.secoes.find((s) => s.id === id)!).filter(Boolean)
  const spp = segPorPasso(m.bpm)
  const dur = blocos.reduce((a, s) => a + passosDa(s) * spp, 0) + 2.5
  const off = new OfflineAudioContext(2, Math.ceil(dur * SR), SR)
  const bus = createMixBus(off)
  await precarregar(off, m.faixas)
  const faixas = audiveis(m)
  const mesas = new Map(faixas.map((f) => [f.id, montarMesa(off, bus, f)]))
  // as vozes
  const vozes = new Map<string, AudioBuffer>()
  for (const s of blocos) for (const [fid, c] of Object.entries(s.voz)) {
    if (vozes.has(c.chave) || !faixas.some((f) => f.id === fid)) continue
    const b = vozesExtra?.[c.chave] ? await (await fetch(vozesExtra[c.chave])).blob() : await lerVoz(c.chave)
    if (b) { try { vozes.set(c.chave, await off.decodeAudioData(await b.arrayBuffer())) } catch {} }
  }
  let t = 0.05
  for (const s of blocos) {
    const n = passosDa(s)
    for (const f of faixas) {
      const c = s.voz[f.id]
      const b = c && vozes.get(c.chave)
      if (!b) continue
      const src = off.createBufferSource()
      src.buffer = b
      src.connect(mesas.get(f.id)!.entrada)
      src.start(t)
      src.stop(t + n * spp + 0.05)
    }
    for (let p = 0; p < n; p++) {
      const tt = t + p * spp + swingDe(p, m.swing, m.bpm)
      for (const f of faixas) tocarPasso(off, mesas.get(f.id)!.entrada, f, s.eventos[f.id], p, tt, m.bpm)
    }
    t += n * spp
  }
  return masterizar(await off.startRendering())
}

/* ─── masterização ─────────────────────────────────────── */
// loudness integrado (ITU-R BS.1770: filtro K + blocos de 400 ms com porta)
async function loudness(b: AudioBuffer) {
  const off = new OfflineAudioContext(b.numberOfChannels, b.length, b.sampleRate)
  const src = off.createBufferSource()
  src.buffer = b
  const shelf = off.createBiquadFilter()
  shelf.type = "highshelf"; shelf.frequency.value = 1681; shelf.gain.value = 4
  const hp = off.createBiquadFilter()
  hp.type = "highpass"; hp.frequency.value = 38; hp.Q.value = 0.5
  src.connect(shelf).connect(hp).connect(off.destination)
  src.start()
  const k = await off.startRendering()
  const bloco = Math.round(0.4 * b.sampleRate), passo = Math.round(0.1 * b.sampleRate)
  const ms: number[] = []
  for (let i = 0; i + bloco <= k.length; i += passo) {
    let s = 0
    for (let c = 0; c < k.numberOfChannels; c++) { const d = k.getChannelData(c); for (let j = i; j < i + bloco; j += 2) s += d[j] * d[j] }
    ms.push(s / (bloco / 2))
  }
  const L = (x: number) => -0.691 + 10 * Math.log10(x + 1e-12)
  const abs = ms.filter((x) => L(x) > -70)
  if (!abs.length) return -70
  const media = abs.reduce((a, x) => a + x, 0) / abs.length
  const rel = abs.filter((x) => L(x) > L(media) - 10)
  return L(rel.reduce((a, x) => a + x, 0) / Math.max(1, rel.length))
}

async function masterizar(b: AudioBuffer): Promise<AudioBuffer> {
  const alvo = -14
  const l = await loudness(b)
  const ganho = Math.min(Math.pow(10, (alvo - l) / 20), 8) // no máximo +18 dB
  const teto = Math.pow(10, -1 / 20)
  const n = b.length
  const chs = Array.from({ length: b.numberOfChannels }, (_, c) => b.getChannelData(c))
  // limitador com olhar à frente de 5 ms e soltura de 80 ms
  const la = Math.round(0.005 * b.sampleRate)
  const rel = Math.exp(-1 / (0.08 * b.sampleRate))
  const pico = new Float32Array(n)
  for (let i = 0; i < n; i++) { let p = 0; for (const d of chs) p = Math.max(p, Math.abs(d[i] * ganho)); pico[i] = p }
  // máximo móvel à frente
  const alvoG = new Float32Array(n)
  let env = 1
  for (let i = n - 1; i >= 0; i--) {
    let mx = 0
    for (let j = i; j < Math.min(n, i + la); j += 8) mx = Math.max(mx, pico[j])
    alvoG[i] = mx > teto ? teto / mx : 1
  }
  for (let i = 0; i < n; i++) {
    const g = alvoG[i]
    env = g < env ? g : g + (env - g) * rel
    for (const d of chs) d[i] = Math.max(-teto, Math.min(teto, d[i] * ganho * env))
  }
  return b
}

/* ─── arquivos ─────────────────────────────────────────── */
export function wav(b: AudioBuffer, titulo: string, autor: string) {
  return paraWav(b, { INAM: titulo || "sem nome", IART: autor || "B4TIDA", ICMT: MARCA, ISFT: "B4TIDA (Cidade Neon)" })
}

function id3(titulo: string, autor: string) {
  const latin = (s: string) => Uint8Array.from([...s].map((c) => (c.charCodeAt(0) < 256 ? c.charCodeAt(0) : 63)))
  const quadro = (id: string, corpo: Uint8Array) => {
    const q = new Uint8Array(10 + corpo.length)
    q.set(latin(id), 0)
    new DataView(q.buffer).setUint32(4, corpo.length)
    q.set(corpo, 10)
    return q
  }
  const txt = (s: string) => Uint8Array.from([0, ...latin(s)])
  const com = Uint8Array.from([0, ...latin("por"), 0, ...latin(MARCA)])
  const qs = [quadro("TIT2", txt(titulo || "sem nome")), quadro("TPE1", txt(autor || "B4TIDA")), quadro("TSSE", txt("B4TIDA (Cidade Neon)")), quadro("COMM", com)]
  const tam = qs.reduce((a, q) => a + q.length, 0)
  const h = new Uint8Array(10 + tam)
  h.set(latin("ID3"), 0)
  h[3] = 3
  // tamanho "synchsafe" (7 bits por byte)
  h[6] = (tam >> 21) & 127; h[7] = (tam >> 14) & 127; h[8] = (tam >> 7) & 127; h[9] = tam & 127
  let o = 10
  for (const q of qs) { h.set(q, o); o += q.length }
  return h
}

export async function mp3(b: AudioBuffer, titulo: string, autor: string, kbps = 192): Promise<Blob> {
  const { Mp3Encoder } = await import("@breezystack/lamejs")
  const enc = new Mp3Encoder(2, b.sampleRate, kbps)
  const toI16 = (d: Float32Array) => { const o = new Int16Array(d.length); for (let i = 0; i < d.length; i++) { const x = Math.max(-1, Math.min(1, d[i])); o[i] = x < 0 ? x * 0x8000 : x * 0x7fff } return o }
  const L = toI16(b.getChannelData(0)), R = toI16(b.getChannelData(b.numberOfChannels > 1 ? 1 : 0))
  const partes: BlobPart[] = [id3(titulo, autor)]
  const bloco = 1152 * 20
  for (let i = 0; i < L.length; i += bloco) {
    partes.push(enc.encodeBuffer(L.subarray(i, i + bloco), R.subarray(i, i + bloco)) as unknown as BlobPart)
    // deixa a tela respirar em músicas longas
    if (i % (bloco * 40) === 0) await new Promise((r) => setTimeout(r, 0))
  }
  partes.push(enc.flush() as unknown as BlobPart)
  return new Blob(partes, { type: "audio/mpeg" })
}

// compartilhar o arquivo direto (zap, stories…) quando o aparelho deixa; senão baixa
export async function compartilharOuBaixar(arq: Blob, nome: string, compartilhar = true) {
  const file = new File([arq], nome, { type: arq.type })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (compartilhar && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], title: nome, text: "fiz na B4TIDA · lu2ca.art" }); return "compartilhado" }
    catch (e) { if ((e as Error).name === "AbortError") return "cancelado" }
  }
  const url = URL.createObjectURL(arq)
  const a = document.createElement("a")
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
  return "baixado"
}
