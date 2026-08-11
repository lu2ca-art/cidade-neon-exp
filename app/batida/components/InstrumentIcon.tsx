"use client"

// ─── ícones das fases do B4TIDA ─────────────────────────────────────────────
// Vetor puro (viewBox 24x24, currentColor), mesma convenção do resto do app
// (ver components/AppIcon.tsx e o botão "voltar" em InstrumentHeader) — sem
// emoji em nenhum lugar da interface.

import type { InstrumentId } from "../lib/types"

type IconId = InstrumentId | "mixagem"

const PATHS: Record<IconId, React.ReactNode> = {
  bateria: (
    <>
      <rect x="2.5" y="2.5" width="8" height="8" rx="2" fill="currentColor" />
      <rect x="13.5" y="2.5" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2.5" y="13.5" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13.5" y="13.5" width="8" height="8" rx="2" fill="currentColor" />
    </>
  ),
  baixo: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M7 7v10M11.3 7v10M14.7 7v10M18 7v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
    </>
  ),
  guitarra: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M6 7v10M8.6 7v10M11.2 7v10M13.8 7v10M16.4 7v10M19 7v10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.85" />
    </>
  ),
  piano: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M7 5v14M11 5v14M15 5v14M19 5v14" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <rect x="5.2" y="5" width="2.6" height="8" fill="currentColor" />
      <rect x="9.7" y="5" width="2.6" height="8" fill="currentColor" />
      <rect x="16.2" y="5" width="2.6" height="8" fill="currentColor" />
    </>
  ),
  voz: (
    <>
      <rect x="9" y="2.5" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M5.5 11a6.5 6.5 0 0013 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M12 17.5v4M8.5 21.5h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  mixagem: (
    <>
      <path d="M6 4v16M12 4v16M18 4v16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
      <rect x="3.5" y="13" width="5" height="3" rx="1.5" fill="currentColor" />
      <rect x="9.5" y="6" width="5" height="3" rx="1.5" fill="currentColor" />
      <rect x="15.5" y="15" width="5" height="3" rx="1.5" fill="currentColor" />
    </>
  ),
}

export function InstrumentIcon({
  icon,
  size = 22,
  className,
  style,
}: {
  icon: IconId
  size?: number
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style}>
      {PATHS[icon]}
    </svg>
  )
}
