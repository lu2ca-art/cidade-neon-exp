// O replay do caderno (22/10): com o caderno ligado, o jogo grava a cena 3D sem parar,
// em pedaços de 1 s, e guarda só o cabeçalho do vídeo e os últimos ~8 s. O ⏪
// congela o jogo e mostra de novo esses segundos. Um gravador só, que nunca
// reinicia enquanto o canvas é o mesmo (reiniciar travava o jogo ~0,35 s).
// Grava o canvas (a cena); os textos e botões em HTML por cima dele não entram.

const GUARDA_MS = 8000
const FPS = 12

const tipo = (() => {
  if (typeof MediaRecorder === "undefined") return ""
  for (const t of ["video/webm;codecs=vp8", "video/webm;codecs=vp9", "video/webm", "video/mp4"]) if (MediaRecorder.isTypeSupported(t)) return t
  return ""
})()

let rec: MediaRecorder | null = null
let canvasAtual: HTMLCanvasElement | null = null
let cabeca: Blob | null = null
let pedacos: { t: number; b: Blob }[] = []
let ligado = false
let vigia = 0

function canvasPrincipal(): HTMLCanvasElement | null {
  const cvs = [...document.querySelectorAll("canvas")].filter((c) => c.width > 0 && c.getBoundingClientRect().width > 100)
  return cvs.sort((a, b) => b.width * b.height - a.width * a.height)[0] ?? null
}

function gravar(c: HTMLCanvasElement) {
  try { if (rec?.state === "recording") rec.stop() } catch { /* já parou */ }
  try {
    const r = new MediaRecorder(c.captureStream(FPS), { mimeType: tipo, videoBitsPerSecond: 900_000 })
    cabeca = null
    pedacos = []
    r.ondataavailable = (e) => {
      if (!e.data.size || rec !== r) return
      if (!cabeca) { cabeca = e.data; return }
      const agora = Date.now()
      pedacos.push({ t: agora, b: e.data })
      while (pedacos.length && agora - pedacos[0].t > GUARDA_MS) pedacos.shift()
    }
    r.start(1000)
    rec = r
    canvasAtual = c
  } catch { rec = null; canvasAtual = null }
}

// a cada 2 s confere se a cena trocou de canvas (corrida, viagem, sala): só aí recomeça
function conferir() {
  if (!ligado || document.hidden) return
  const c = canvasPrincipal()
  if (c && (c !== canvasAtual || !c.isConnected || rec?.state !== "recording")) gravar(c)
}

export const replaySuportado = () => !!tipo

export function ligarReplay() {
  if (ligado || !tipo) return
  ligado = true
  conferir()
  vigia = window.setInterval(conferir, 2000)
  document.addEventListener("visibilitychange", () => { if (document.hidden && rec?.state === "recording") rec.pause(); else if (!document.hidden && rec?.state === "paused") rec.resume() })
}

// os últimos segundos: o cabeçalho + os pedaços guardados (pede o pedaço em andamento antes)
export async function ultimosSegundos(): Promise<Blob[]> {
  const r = rec
  if (r && r.state === "recording") {
    await new Promise<void>((ok) => {
      const antes = r.ondataavailable
      r.ondataavailable = (e) => { antes?.call(r, e); r.ondataavailable = antes; ok() }
      r.requestData()
      setTimeout(ok, 600)
    })
  }
  if (!cabeca || !pedacos.length) return []
  return [new Blob([cabeca, ...pedacos.map((p) => p.b)], { type: tipo })]
}

export function retomarReplay() { /* o gravador não para: nada a fazer */ }
