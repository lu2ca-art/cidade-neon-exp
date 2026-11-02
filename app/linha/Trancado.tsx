// O AVISO DE TRANCADO (modo vitrine, 02/11): um cadeado e o que libera, curto.
// O mesmo em todo lugar (o fliperama, o ginásio, a corrida das trincheiras, o
// Guitar Driver, a sinuca do bar). Só HTML e um CSS pequeno: as páginas de fora
// do /linha importam sem puxar o linha.css.

import "./trancado.css"

export function Cadeado({ size = 12 }: { size?: number }) {
  return (
    <svg className="cn-cadeado" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2.5" y="7" width="11" height="8" rx="1.6" fill="currentColor" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

// a faixa do aviso: "(cadeado) trancado · faça a missão do Notti pra jogar"
export function Trancado({ texto, className = "" }: { texto: string; className?: string }) {
  return (
    <p className={`cn-trancado ${className}`} role="note">
      <Cadeado /><b>trancado</b><span>{texto}</span>
    </p>
  )
}

// o aviso vai junto pra página do lugar (/fliperama, /ginasio): ?tranca=<texto>
export const PARAM_TRANCA = "tranca"
export function lerTranca(): string | null {
  if (typeof location === "undefined") return null
  const t = new URLSearchParams(location.search).get(PARAM_TRANCA)
  return t ? t.slice(0, 120) : null
}

// (vitrine, parte 2) o app aberto ainda trancado (o violão, o jardim): dá pra
// ver tudo, mas os toques param aqui (menos o "início" e o aviso)
export function travarToques(tranca: string | null | undefined) {
  if (!tranca) return {}
  const parar = (e: React.SyntheticEvent) => {
    if ((e.target as HTMLElement).closest?.(".l-app-topo, .cn-trancado")) return
    e.stopPropagation()
    e.preventDefault()
  }
  return { onPointerDownCapture: parar, onPointerMoveCapture: parar, onClickCapture: parar }
}
