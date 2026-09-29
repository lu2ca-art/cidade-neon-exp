// ─── CHOPS: kits de amostras da cidade ──────────────────────────────────────
// Pedaços cortados das faixas do LU2CA (scripts/batida-kits.py gera os
// arquivos em public/batida/kits). Os AudioBuffers são decodificados uma vez
// e reaproveitados — inclusive no render offline (AudioBuffer não pertence a
// um contexto específico).

export interface KitPad { n: number; rotulo: string }
export interface Kit { id: string; nome: string; bpm: number; cor: string; pads: KitPad[] }

let indice: Promise<Kit[]> | null = null
const buffers = new Map<string, AudioBuffer>()
const carregando = new Map<string, Promise<void>>()

export function listarKits(): Promise<Kit[]> {
  if (!indice) {
    indice = fetch("/batida/kits/index.json")
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
  }
  return indice
}

export function carregarKit(ctx: BaseAudioContext, kit: string): Promise<void> {
  if (carregando.has(kit)) return carregando.get(kit)!
  const p = (async () => {
    await Promise.all(
      Array.from({ length: 8 }, async (_, n) => {
        const chave = `${kit}/${n}`
        if (buffers.has(chave)) return
        try {
          const r = await fetch(`/batida/kits/${kit}/${n}.mp3`)
          const buf = await ctx.decodeAudioData(await r.arrayBuffer())
          buffers.set(chave, buf)
        } catch {}
      }),
    )
  })()
  carregando.set(kit, p)
  return p
}

export function tocarChop(ctx: BaseAudioContext, out: AudioNode, time: number, kit: string, pad: number, maxSec?: number) {
  const buf = buffers.get(`${kit}/${pad}`)
  if (!buf) return
  const src = ctx.createBufferSource()
  src.buffer = buf
  const g = ctx.createGain()
  g.gain.value = 0.9
  src.connect(g).connect(out)
  src.start(time)
  if (maxSec && maxSec < buf.duration) {
    // corta com um fade curtinho pra não estalar
    g.gain.setValueAtTime(0.9, time + maxSec - 0.01)
    g.gain.linearRampToValueAtTime(0, time + maxSec)
    src.stop(time + maxSec + 0.01)
  }
}
