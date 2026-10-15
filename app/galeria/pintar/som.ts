// O SOM DA TELA (pintar com música, referência do LU2CA: um app de desenhar
// que toca). Uma linha varre a tela da esquerda pra direita, em loop, e toca
// tudo que cruza: a cor é o instrumento, a altura é a nota (pentatônica, o
// agudo em cima). O fundo não toca.

export const CORES = ["#f2eefa", "#14121c", "#ff3fb0", "#2fe8ff", "#ffc857", "#5dffa0", "#b38cff", "#ff6a35", "#ff3b3b", "#3a4cff", "#8a6a4a", "#ffe0a8"]
// o instrumento de cada cor, na mesma ordem
export const INSTRUMENTOS = ["sino", "bumbo", "dedilhado", "piano elétrico", "marimba", "baixo", "pad", "lead", "caixa", "grave", "bloco", "chimbal"] as const
type Inst = (typeof INSTRUMENTOS)[number]

const ESCALA = [0, 3, 5, 7, 10]  // pentatônica menor
const BASE = 45                   // lá grave (MIDI)
const DEGRAUS = 15                // 3 oitavas de cima a baixo

const rgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
const PALETA = CORES.map(rgb)

// a cor mais perto da paleta (ou -1 se for longe de todas)
export function corDaPaleta(r: number, g: number, b: number): number {
  let melhor = -1, dist = 70
  for (let i = 0; i < PALETA.length; i++) { const [pr, pg, pb] = PALETA[i]; const d = Math.abs(r - pr) + Math.abs(g - pg) + Math.abs(b - pb); if (d < dist) { dist = d; melhor = i } }
  return melhor
}

// a altura na tela (0 em cima, 1 embaixo) vira a frequência
export function freqDaAltura(y01: number): number {
  const d = Math.max(0, Math.min(DEGRAUS - 1, Math.floor((1 - y01) * DEGRAUS)))
  const midi = BASE + Math.floor(d / 5) * 12 + ESCALA[d % 5]
  return 440 * Math.pow(2, (midi - 69) / 12)
}

let ruido: AudioBuffer | null = null
function bufRuido(ac: AudioContext) {
  if (ruido) return ruido
  ruido = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate)
  const d = ruido.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return ruido
}

// uma nota de um instrumento, em t, na saída `out`
export function tocar(ac: AudioContext, out: AudioNode, inst: Inst, f: number, t: number, vol = 0.5) {
  const env = ac.createGain(); env.connect(out)
  const osc = (tipo: OscillatorType, fr: number, dur: number, g = 1) => { const o = ac.createOscillator(); o.type = tipo; o.frequency.value = fr; const gg = ac.createGain(); gg.gain.value = g; o.connect(gg).connect(env); o.start(t); o.stop(t + dur); return o }
  const curva = (pico: number, ataque: number, dur: number) => { env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(pico * vol, t + ataque); env.gain.exponentialRampToValueAtTime(0.0001, t + dur) }
  const barulho = (dur: number, filtro: BiquadFilterType, fr: number) => { const s = ac.createBufferSource(); s.buffer = bufRuido(ac); const bq = ac.createBiquadFilter(); bq.type = filtro; bq.frequency.value = fr; s.connect(bq).connect(env); s.start(t); s.stop(t + dur) }
  switch (inst) {
    case "sino": curva(0.35, 0.005, 1.6); osc("sine", f * 2, 1.6); osc("sine", f * 5.4, 0.5, 0.25); break
    case "bumbo": { curva(0.9, 0.002, 0.35); const o = osc("sine", 120, 0.35); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.25); break }
    case "dedilhado": curva(0.4, 0.004, 0.5); osc("triangle", f * 2, 0.5); osc("sine", f * 4, 0.2, 0.2); break
    case "piano elétrico": curva(0.35, 0.006, 0.9); osc("sine", f * 2, 0.9); osc("sine", f * 2.01, 0.9, 0.5); osc("sine", f * 8, 0.12, 0.15); break
    case "marimba": curva(0.5, 0.003, 0.35); osc("sine", f * 2, 0.35); osc("sine", f * 8, 0.08, 0.3); break
    case "baixo": { curva(0.5, 0.01, 0.45); const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600; env.disconnect(); env.connect(lp).connect(out); osc("sawtooth", f / 2, 0.45); break }
    case "pad": curva(0.16, 0.25, 1.8); osc("sawtooth", f, 1.8, 0.5); osc("sawtooth", f * 1.007, 1.8, 0.5); osc("triangle", f * 2, 1.8, 0.4); break
    case "lead": curva(0.14, 0.01, 0.3); osc("square", f * 2, 0.3); break
    case "caixa": curva(0.45, 0.002, 0.2); barulho(0.2, "bandpass", 1800); osc("triangle", 190, 0.1, 0.6); break
    case "grave": curva(0.6, 0.01, 0.6); osc("sine", f / 2, 0.6); break
    case "bloco": curva(0.4, 0.001, 0.07); osc("sine", 900 + f * 0.3, 0.07); break
    case "chimbal": curva(0.22, 0.001, 0.06); barulho(0.06, "highpass", 7000); break
  }
}

// o eco (reverb) gerado na hora
export function criarEco(ac: AudioContext) {
  const c = ac.createConvolver(), n = ac.sampleRate * 2.2, b = ac.createBuffer(2, n, ac.sampleRate)
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6) }
  c.buffer = b
  return c
}

// lê uma coluna da tela e devolve as notas: um trecho contínuo da mesma cor = uma nota
export function notasDaColuna(px: Uint8ClampedArray, alt: number, fundo: number, max = 8): { cor: number; y01: number }[] {
  const out: { cor: number; y01: number }[] = []
  let atual = -1, ini = 0
  const PASSO = 4
  for (let y = 0; y <= alt; y += PASSO) {
    const c = y < alt ? corDaPaleta(px[y * 4], px[y * 4 + 1], px[y * 4 + 2]) : -1
    const cor = c === fundo ? -1 : c
    if (cor !== atual) {
      if (atual >= 0) out.push({ cor: atual, y01: (ini + y) / 2 / alt })
      atual = cor; ini = y
    }
  }
  // as mais agudas primeiro, até o limite
  return out.slice(0, max)
}
