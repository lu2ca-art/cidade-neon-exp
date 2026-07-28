// Análise de áudio pra gerar os padrões de notas do GUITAR DRIVER a partir do
// som real da faixa, em vez de sorteio: detecta as batidas de verdade (onset,
// via energia/spectral flux), encaixa o tempo no grid do BPM, e escolhe a
// coluna pela faixa de frequência dominante naquele instante (grave→col 0,
// agudo→col 3) usando uma FFT compacta. Sem dependências externas.

export interface AnalyzedTile {
  col: number
  beatTime: number
  hold: boolean
  holdDuration: number
}

const FFT_SIZE = 1024
const RMS_WINDOW = 1024
const RMS_HOP = 512
const BAND_EDGES_HZ = [300, 900, 2500] // grave · médio-grave · médio-agudo · agudo

// FFT radix-2 iterativa, in-place, sobre arrays reais/imaginários de tamanho
// potência de 2 (aceita só o necessário pra classificar a coluna do onset).
function fft(re: Float64Array, im: Float64Array) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr
      const ti = im[i]; im[i] = im[j]; im[j] = ti
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wr = Math.cos(ang)
    const wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let curWr = 1
      let curWi = 0
      const half = len / 2
      for (let k = 0; k < half; k++) {
        const ur = re[i + k]
        const ui = im[i + k]
        const vr = re[i + k + half] * curWr - im[i + k + half] * curWi
        const vi = re[i + k + half] * curWi + im[i + k + half] * curWr
        re[i + k] = ur + vr
        im[i + k] = ui + vi
        re[i + k + half] = ur - vr
        im[i + k + half] = ui - vi
        const nextWr = curWr * wr - curWi * wi
        const nextWi = curWr * wi + curWi * wr
        curWr = nextWr
        curWi = nextWi
      }
    }
  }
}

function mixdownMono(buffer: AudioBuffer): Float32Array {
  const channels = buffer.numberOfChannels
  const mono = new Float32Array(buffer.length)
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < data.length; i++) mono[i] += data[i] / channels
  }
  return mono
}

function rmsEnvelope(mono: Float32Array): Float32Array {
  const frames = Math.max(0, Math.floor((mono.length - RMS_WINDOW) / RMS_HOP) + 1)
  const rms = new Float32Array(frames)
  for (let f = 0; f < frames; f++) {
    const start = f * RMS_HOP
    let sum = 0
    for (let i = 0; i < RMS_WINDOW; i++) {
      const s = mono[start + i]
      sum += s * s
    }
    rms[f] = Math.sqrt(sum / RMS_WINDOW)
  }
  return rms
}

// "spectral flux" simplificado: energia crescente entre janelas consecutivas —
// picos aqui marcam ataques/batidas reais do áudio.
function onsetStrength(rms: Float32Array): Float32Array {
  const flux = new Float32Array(rms.length)
  for (let i = 1; i < rms.length; i++) flux[i] = Math.max(0, rms[i] - rms[i - 1])
  const smoothed = new Float32Array(flux.length)
  for (let i = 0; i < flux.length; i++) {
    const a = flux[Math.max(0, i - 1)]
    const b = flux[i]
    const c = flux[Math.min(flux.length - 1, i + 1)]
    smoothed[i] = (a + b + c) / 3
  }
  return smoothed
}

// Peak-picking com limiar adaptativo (média + desvio local) e espaçamento
// mínimo derivado do BPM real da faixa — não deixa dois onsets colarem no
// mesmo transiente nem irem mais rápido que uma semicolcheia.
function pickOnsetFrames(flux: Float32Array, hopSeconds: number, bpm: number): number[] {
  const localWindow = Math.max(4, Math.round(1 / hopSeconds))
  const minSpacingFrames = Math.max(1, (15 / bpm) / hopSeconds)
  const onsets: number[] = []
  let lastFrame = -Infinity
  for (let i = 1; i < flux.length - 1; i++) {
    if (flux[i] <= flux[i - 1] || flux[i] < flux[i + 1]) continue // só máximos locais
    const lo = Math.max(0, i - localWindow)
    const hi = Math.min(flux.length, i + localWindow)
    let mean = 0
    for (let k = lo; k < hi; k++) mean += flux[k]
    mean /= hi - lo
    let variance = 0
    for (let k = lo; k < hi; k++) variance += (flux[k] - mean) ** 2
    variance /= hi - lo
    const threshold = mean + 1.4 * Math.sqrt(variance)
    if (flux[i] < threshold || flux[i] < 0.0025) continue
    if (i - lastFrame < minSpacingFrames) continue
    onsets.push(i)
    lastFrame = i
  }
  return onsets
}

// Energia por faixa de frequência (grave/médio-grave/médio-agudo/agudo) numa
// janela de FFT_SIZE amostras centrada no onset — usada pra decidir a coluna
// pelo timbre real do trecho, não por sorteio.
function bandEnergies(mono: Float32Array, sampleRate: number, centerSample: number): number[] {
  const half = FFT_SIZE / 2
  const start = Math.max(0, Math.min(mono.length - FFT_SIZE, centerSample - half))
  const re = new Float64Array(FFT_SIZE)
  const im = new Float64Array(FFT_SIZE)
  for (let i = 0; i < FFT_SIZE; i++) {
    const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1))
    re[i] = (mono[start + i] ?? 0) * hann
  }
  fft(re, im)
  const energy = [0, 0, 0, 0]
  const binHz = sampleRate / FFT_SIZE
  for (let k = 1; k < half; k++) {
    const freq = k * binHz
    const mag = Math.hypot(re[k], im[k])
    let band = 3
    if (freq < BAND_EDGES_HZ[0]) band = 0
    else if (freq < BAND_EDGES_HZ[1]) band = 1
    else if (freq < BAND_EDGES_HZ[2]) band = 2
    energy[band] += mag
  }
  return energy
}

export function analyzeAudioForTiles(buffer: AudioBuffer, bpm: number, durationMs: number): AnalyzedTile[] {
  const mono = mixdownMono(buffer)
  const rms = rmsEnvelope(mono)
  if (rms.length < 4) return []

  const flux = onsetStrength(rms)
  const hopSeconds = RMS_HOP / buffer.sampleRate
  const onsetFrames = pickOnsetFrames(flux, hopSeconds, bpm)

  const gridMs = 60000 / bpm / 8 // grid de 32ª nota — trava a batida real no compasso
  // mesmo warm-up mínimo do gerador procedural (generateTiles começa em
  // 2000ms) — um onset real logo no início da faixa dava tempo de reação
  // quase nulo (~100-500ms), bem menor que o fallback
  const startMs = 2000
  const endMs = durationMs - 400

  const tiles: AnalyzedTile[] = []
  let lastCol = -1

  for (const frame of onsetFrames) {
    const sampleIndex = frame * RMS_HOP
    let timeMs = (sampleIndex / buffer.sampleRate) * 1000
    timeMs = Math.round(timeMs / gridMs) * gridMs
    if (timeMs < startMs || timeMs > endMs) continue

    const energies = bandEnergies(mono, buffer.sampleRate, sampleIndex)
    const order = [0, 1, 2, 3].sort((a, b) => energies[b] - energies[a])
    const col = order[0] === lastCol ? order[1] : order[0]
    lastCol = col

    // uma nota curta por onset real, sempre — nada de nota longa nem de
    // rajada extra: cada batida detectada vira exatamente 1 tile
    tiles.push({ col, beatTime: timeMs, hold: false, holdDuration: 0 })
  }

  return tiles.sort((a, b) => a.beatTime - b.beatTime)
}
