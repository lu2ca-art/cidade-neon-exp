// O fio entre o minijogo do tambor (Tambor.tsx, o tempo e o som) e os
// tambores em 3D na casa da D-Bee (interior/salas/Djembe.tsx). Sem React e sem
// setState: a sala lê isto por quadro e o minijogo escreve só quando alguém bate.
//
// O relógio é o do áudio (AudioContext.currentTime): as batidas dela são
// agendadas antes e a sala mostra cada uma quando o relógio passa por ela, então
// a mão dela e o som chegam juntos.

export type Toque = { quando: number; r: number; ang: number; forca: number }

export const TAMBOR_VIVO = {
  // o minijogo está valendo
  ativo: false,
  // tem tambor em 3D na tela (o minijogo esconde os dois círculos)
  em3d: 0,
  // o relógio do áudio
  agora: () => 0,
  // as batidas dela, em ordem (agendadas), e as dele (a última no fim)
  dela: [] as Toque[],
  seu: [] as Toque[],
  // a sala chama quando a mão dele bate na pele: r 0 (centro) a 1 (borda), ang em radianos, forca 0–1
  tocar: null as null | ((r: number, ang: number, forca: number) => void),
}

export function lembrarSeu(t: Toque) {
  const s = TAMBOR_VIVO.seu
  s.push(t)
  if (s.length > 8) s.shift()
}

// ── a força do toque ──
// caneta e tela com pressão: a pressão; dedo no Android: o tamanho do contato;
// mouse: a velocidade com que a mão chegou (rápido = forte). Sem nada disso,
// uma força média com uma variação de mão humana.
const mov = { v: 0, t: 0, x: 0, y: 0 }
export function seguirMovimento(e: PointerEvent) {
  const t = e.timeStamp
  const dt = t - mov.t
  if (dt > 0 && dt < 100) {
    const v = Math.hypot(e.clientX - mov.x, e.clientY - mov.y) / dt
    mov.v = mov.v * 0.5 + v * 0.5
  } else mov.v = 0
  mov.t = t; mov.x = e.clientX; mov.y = e.clientY
}
const lim = (x: number) => Math.min(1, Math.max(0.12, x))
export function forcaDoToque(e: Pick<PointerEvent, "pressure" | "pointerType" | "width" | "timeStamp">): number {
  if (e.pointerType === "pen" || (e.pressure > 0 && e.pressure < 1 && Math.abs(e.pressure - 0.5) > 0.01)) return lim(0.15 + e.pressure)
  if (e.pointerType === "touch" && e.width > 2) return lim((e.width - 6) / 28)
  if (e.pointerType === "mouse") return lim(0.5 + (e.timeStamp - mov.t < 90 ? mov.v : 0) * 0.3)
  return lim(0.72 + (Math.random() - 0.5) * 0.14)
}
