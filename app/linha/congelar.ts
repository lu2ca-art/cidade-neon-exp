// Congelar o jogo inteiro enquanto o caderno do dono está aberto (22/10): não só
// a corrida — as cenas, os shows, os minijogos, o som e as animações de tela.
// Um relógio de jogo: enquanto congelado, performance.now() para, os quadros
// (requestAnimationFrame) ficam guardados e os sons e animações CSS pausam. Ao
// descongelar, tudo segue de onde parou, sem salto (o tempo congelado é
// descontado do relógio). Só é instalado no aparelho com o caderno ligado.

import { audioCtx } from "./som"

let real = () => performance.now()

const r = {
  instalado: false,
  congelado: false,
  desde: 0,
  total: 0,
  n: 0,
  fila: new Map<number, FrameRequestCallback>(),
  midias: new Set<HTMLMediaElement>(),
  pausadas: [] as HTMLMediaElement[],
  animacoes: [] as Animation[],
}

export function instalarRelogio() {
  if (r.instalado || typeof window === "undefined") return
  r.instalado = true
  real = performance.now.bind(performance)
  performance.now = () => (r.congelado ? r.desde : real()) - r.total
  const raf = window.requestAnimationFrame.bind(window)
  const caf = window.cancelAnimationFrame.bind(window)
  window.requestAnimationFrame = (cb) => {
    if (r.congelado) { const id = -++r.n; r.fila.set(id, cb); return id }
    return raf((t) => cb(t - r.total))
  }
  window.cancelAnimationFrame = (id) => { if (id < 0) r.fila.delete(id); else caf(id) }
  // os sons tocados com new Audio() não estão no DOM: guarda cada um que toca
  const play = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) { r.midias.add(this); return play.call(this) }
}

export function congelar() {
  if (!r.instalado || r.congelado) return
  r.desde = real()
  r.congelado = true
  for (const m of [...r.midias, ...document.querySelectorAll("audio, video")] as HTMLMediaElement[]) {
    if (!m.paused) { m.pause(); r.pausadas.push(m) }
  }
  try { void audioCtx()?.suspend().catch(() => {}) } catch { /* sem som */ }
  try {
    r.animacoes = document.getAnimations().filter((a) => a.playState === "running" && !((a.effect as KeyframeEffect | null)?.target as Element | null)?.closest?.("[data-caderno]"))
    for (const a of r.animacoes) a.pause()
  } catch { r.animacoes = [] }
}

export function descongelar() {
  if (!r.congelado) return
  r.total += real() - r.desde
  r.congelado = false
  // os quadros primeiro: se algo abaixo falhar, o jogo não fica parado
  const fila = [...r.fila.values()]
  r.fila.clear()
  for (const cb of fila) window.requestAnimationFrame(cb)
  try { void audioCtx()?.resume().catch(() => {}) } catch { /* sem som */ }
  for (const m of r.pausadas) { try { void m.play().catch(() => {}) } catch { /* removido */ } }
  r.pausadas = []
  for (const a of r.animacoes) { try { a.play() } catch { /* a animação já acabou */ } }
  r.animacoes = []
}
