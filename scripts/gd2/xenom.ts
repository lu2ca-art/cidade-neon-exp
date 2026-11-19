// O CHARTER DOS SHOWS XENOM (T21, 28/10). As 4 faixas do Subúrbio Xenom não
// têm stems (o charter.py do GD2 precisa da banda separada no SSD), e cada uma
// já é um corte de ~22 s em public/audio/tracks. Este é um charter leve, sem
// dependência: o ffmpeg decodifica, uma FFT mede o fluxo espectral em 3 faixas
// de frequência (grave, meio, agudo), acha o BPM e a grade, e põe as notas
// em cima dos ataques reais, com a cor seguindo o contorno do brilho do som.
// Sai no mesmo formato do GD2 (public/gd2/xenom-<id>.json), sem a voz.
//
//   bun scripts/gd2/xenom.ts            (as 4)
//   bun scripts/gd2/xenom.ts gata       (uma)
//
// RASCUNHO automático: quando houver stems das 4, o charter.py faz melhor.

import { spawnSync } from "node:child_process"
import { writeFileSync } from "node:fs"

const SR = 22050
const N = 1024
const HOP = 256
const FAIXAS: Record<string, string> = { gata: "gata-mia", tedio: "tedio", boom: "boom-boom-k", dez: "10de10" }

function decodificar(arq: string): Float32Array {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", arq, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 28 })
  if (r.status !== 0) throw new Error(`ffmpeg: ${r.stderr}`)
  const b = r.stdout as Buffer
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))
}

// FFT in-place (raiz 2)
function fft(re: Float64Array, im: Float64Array) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]] }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k), wi = Math.sin(ang * k)
        const a = i + k, b = a + len / 2
        const xr = re[b] * wr - im[b] * wi, xi = re[b] * wi + im[b] * wr
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi
      }
    }
  }
}

type Bandas = { grave: number[]; meio: number[]; agudo: number[]; tudo: number[]; brilho: number[] }
function espectro(y: Float32Array): Bandas {
  const quadros = Math.floor((y.length - N) / HOP)
  const jan = new Float64Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N))
  const hz = (k: number) => (k * SR) / N
  let ant: Float64Array | null = null
  const out: Bandas = { grave: [], meio: [], agudo: [], tudo: [], brilho: [] }
  for (let q = 0; q < quadros; q++) {
    const re = new Float64Array(N), im = new Float64Array(N)
    for (let i = 0; i < N; i++) re[i] = y[q * HOP + i] * jan[i]
    fft(re, im)
    const mag = new Float64Array(N / 2)
    for (let k = 0; k < N / 2; k++) mag[k] = Math.log1p(10 * Math.hypot(re[k], im[k]))
    let g = 0, m = 0, a = 0, num = 0, den = 0
    for (let k = 1; k < N / 2; k++) {
      const d = ant ? Math.max(0, mag[k] - ant[k]) : 0
      const f = hz(k)
      if (f < 160) g += d
      else if (f < 2200) m += d
      else a += d
      num += f * mag[k]; den += mag[k]
    }
    out.grave.push(g); out.meio.push(m); out.agudo.push(a); out.tudo.push(g + m + a); out.brilho.push(den ? num / den : 0)
    ant = mag
  }
  return out
}

const tempoDoQuadro = (q: number) => (q * HOP + N / 2) / SR

// os picos: acima da média local + um tanto do desvio
function picos(env: number[], k = 1.2): number[] {
  const out: number[] = []
  const W = 20
  for (let i = 1; i < env.length - 1; i++) {
    if (env[i] < env[i - 1] || env[i] < env[i + 1]) continue
    let s = 0, s2 = 0, n = 0
    for (let j = Math.max(0, i - W); j < Math.min(env.length, i + W); j++) { s += env[j]; s2 += env[j] * env[j]; n++ }
    const med = s / n, dp = Math.sqrt(Math.max(0, s2 / n - med * med))
    if (env[i] > med + k * dp && (!out.length || i - out[out.length - 1] > 5)) out.push(i)
  }
  return out
}

// o BPM: a autocorrelação do fluxo (70–170) e a fase que mais cai em cima dos ataques
function grade(env: number[]): { bpm: number; t0: number } {
  const fps = SR / HOP
  let melhor = 0, bpm = 100
  for (let b = 70; b <= 170; b += 0.5) {
    const lag = (60 / b) * fps
    let s = 0
    for (let i = 0; i + lag * 2 < env.length; i++) {
      const j = Math.round(i + lag), j2 = Math.round(i + lag * 2)
      s += env[i] * (env[j] + 0.5 * env[j2])
    }
    // leve preferência pelo meio (90–130), como os charters de verdade
    s *= 1 - Math.abs(b - 110) / 400
    if (s > melhor) { melhor = s; bpm = b }
  }
  const passo = 60 / bpm
  let mf = -1, t0 = 0
  for (let f = 0; f < passo; f += 0.005) {
    let s = 0
    for (let t = f; t < tempoDoQuadro(env.length - 1); t += passo) s += env[Math.min(env.length - 1, Math.round(((t * SR) - N / 2) / HOP))] ?? 0
    if (s > mf) { mf = s; t0 = f }
  }
  return { bpm: Math.round(bpm * 2) / 2, t0: Math.round(t0 * 1000) / 1000 }
}

type NotaGd = [number, number, number]
// encaixa os ataques de uma faixa na grade (fração do tempo), uma nota por casa,
// no máximo `porTempo` por tempo; a cor segue o contorno do brilho (sobe = direita)
function chartear(env: number[], brilho: number[], g: { bpm: number; t0: number }, fr: number, cores: number, k: number, dur: number): NotaGd[] {
  const passo = (60 / g.bpm) * fr
  const casas = new Map<number, { t: number; f: number; b: number }>()
  for (const q of picos(env, k)) {
    const t = tempoDoQuadro(q)
    const c = Math.round((t - g.t0) / passo)
    const tq = g.t0 + c * passo
    if (Math.abs(tq - t) > passo * 0.45 || tq < 0.3 || tq > dur - 0.3) continue
    const atual = casas.get(c)
    if (!atual || env[q] > atual.f) casas.set(c, { t: tq, f: env[q], b: brilho[q] })
  }
  const lista = [...casas.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v)
  // cor: o contorno relativo (o brilho comparado com a nota de antes)
  const out: NotaGd[] = []
  let lane = Math.floor(cores / 2), bAnt = lista[0]?.b ?? 0
  for (const n of lista) {
    const d = n.b - bAnt
    if (Math.abs(d) > 60) lane += d > 0 ? 1 : -1
    if (lane < 0) lane = 1
    if (lane > cores - 1) lane = cores - 2
    bAnt = n.b
    out.push([Math.round(n.t * 1000) / 1000, lane, 0])
  }
  // um sustain quando a próxima nota está longe (2 tempos ou mais)
  for (let i = 0; i < out.length - 1; i++) {
    const vao = out[i + 1][0] - out[i][0]
    if (vao >= (60 / g.bpm) * 2) out[i][2] = Math.round((vao - 60 / g.bpm) * 1000) / 1000
  }
  return out
}

function bateria(b: Bandas, g: { bpm: number; t0: number }, fr: number, dur: number): NotaGd[] {
  // bumbo = 0, caixa = 1 ou 2 (meio), prato = 3 (agudo)
  const partes: [number[], number][] = [[b.grave, 0], [b.meio, 1], [b.agudo, 3]]
  const passo = (60 / g.bpm) * fr
  const casas = new Map<number, NotaGd>()
  for (const [env, lane] of partes) {
    for (const q of picos(env, 1.4)) {
      const t = tempoDoQuadro(q)
      const c = Math.round((t - g.t0) / passo)
      const tq = g.t0 + c * passo
      if (Math.abs(tq - t) > passo * 0.45 || tq < 0.3 || tq > dur - 0.3) continue
      const l = lane === 1 && c % 2 ? 2 : lane
      if (!casas.has(c) || (l !== 0 && c % 2 === 1)) casas.set(c, [Math.round(tq * 1000) / 1000, l, 0])
    }
  }
  return [...casas.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v)
}

const NIVEIS = { facil: { fr: 1, cores: 3, k: 1.6 }, medio: { fr: 0.5, cores: 4, k: 1.2 }, dificil: { fr: 0.25, cores: 4, k: 1.0 }, expert: { fr: 0.25, cores: 4, k: 0.7 } } as const

function gerar(id: string) {
  const arq = `public/audio/tracks/${FAIXAS[id]}.mp3`
  const y = decodificar(arq)
  const dur = y.length / SR
  const b = espectro(y)
  const g = grade(b.tudo)
  const inst = (env: number[]) => Object.fromEntries(Object.entries(NIVEIS).map(([n, v]) => [n, chartear(env, b.brilho, g, v.fr, v.cores, v.k, dur)]))
  const meioAgudo = b.meio.map((x, i) => x + 0.5 * b.agudo[i])
  const chart = {
    versao: 2, xenom: true, bpm: g.bpm, t0: g.t0, dur: Math.round(dur * 100) / 100,
    janelas: { guitarra: 0, baixo: 0, teclado: 0, bateria: 0 },
    guitarra: inst(meioAgudo),
    baixo: inst(b.grave),
    teclado: inst(b.agudo.map((x, i) => x + 0.3 * b.meio[i])),
    bateria: Object.fromEntries(Object.entries(NIVEIS).map(([n, v]) => [n, bateria(b, g, v.fr, dur)])),
  }
  writeFileSync(`public/gd2/xenom-${id}.json`, JSON.stringify(chart))
  const m = chart.guitarra.medio as NotaGd[]
  let buraco = 0
  for (let i = 1; i < m.length; i++) buraco = Math.max(buraco, m[i][0] - m[i - 1][0])
  console.log(`${id}: ${dur.toFixed(1)} s · ${g.bpm} bpm · t0 ${g.t0} · guitarra médio ${m.length} notas (maior buraco ${buraco.toFixed(2)} s)`)
}

const alvo = process.argv.slice(2)
for (const id of alvo.length ? alvo : Object.keys(FAIXAS)) gerar(id)
