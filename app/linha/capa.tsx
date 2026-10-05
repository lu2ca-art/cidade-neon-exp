"use client"

// As capas dos discos da loja, desenhadas em código (leves, nítidas em
// qualquer tela). Cada gênero tem um motivo próprio; as cores vêm do disco.

export type Motivo = "letras" | "circulos" | "lua" | "raio" | "ondas-fortes" | "grade" | "sol" | "mar" | "mandala" | "duna" | "vinil"

export function Capa({ motivo, a, b, titulo, size = 160 }: { motivo: Motivo; a: string; b: string; titulo: string; size?: number }) {
  const id = `c-${motivo}-${a.slice(1)}`
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`capa: ${titulo}`} style={{ display: "block", width: "100%", height: "auto", borderRadius: 4 }}>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="#0b0a12" />
      <Desenho motivo={motivo} a={a} b={b} g={`url(#${id}-g)`} />
      <text x="7" y="93" fill="#fff" fontFamily="var(--cond, 'Barlow Condensed', sans-serif)" fontWeight="800" fontSize="11" letterSpacing="0.5">{titulo.toUpperCase()}</text>
    </svg>
  )
}

function Desenho({ motivo, a, b, g }: { motivo: Motivo; a: string; b: string; g: string }) {
  switch (motivo) {
    case "letras":
      return (
        <g>
          <rect width="100" height="100" fill={g} opacity="0.9" />
          {["NO", "IZ", "E!"].map((t, i) => <text key={t} x="6" y={30 + i * 22} fill="#0b0a12" fontWeight="900" fontSize="26" fontFamily="sans-serif" opacity={0.85 - i * 0.2}>{t}</text>)}
          {Array.from({ length: 18 }, (_, i) => <circle key={i} cx={(i * 37) % 100} cy={(i * 53) % 80} r={0.8 + (i % 3) * 0.6} fill="#fff" opacity="0.7" />)}
        </g>
      )
    case "circulos":
      return <g>{[46, 38, 30, 22, 14, 6].map((r, i) => <circle key={r} cx="50" cy="44" r={r} fill={i % 2 ? b : a} />)}</g>
    case "lua":
      return (
        <g>
          <rect width="100" height="100" fill={g} opacity="0.35" />
          <circle cx="56" cy="40" r="24" fill={a} />
          <circle cx="66" cy="34" r="22" fill="#0b0a12" opacity="0.92" />
        </g>
      )
    case "raio":
      return (
        <g>
          <rect width="100" height="100" fill={b} opacity="0.25" />
          <path d="M58 4 L30 52 L48 52 L36 96 L74 40 L54 40 L68 4 Z" fill={a} />
        </g>
      )
    case "ondas-fortes":
      return <g>{Array.from({ length: 7 }, (_, i) => <path key={i} d={`M-5 ${12 + i * 11} Q 20 ${2 + i * 11} 45 ${12 + i * 11} T 105 ${12 + i * 11}`} stroke={i % 2 ? a : b} strokeWidth="5" fill="none" />)}</g>
    case "grade":
      return (
        <g>
          <rect width="100" height="56" fill={g} opacity="0.5" />
          <circle cx="50" cy="56" r="20" fill={a} />
          <rect y="56" width="100" height="44" fill="#0b0a12" />
          {Array.from({ length: 9 }, (_, i) => <line key={`v${i}`} x1="50" y1="56" x2={-40 + i * 22.5} y2="100" stroke={b} strokeWidth="0.8" />)}
          {[60, 66, 74, 84, 96].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke={b} strokeWidth="0.8" />)}
        </g>
      )
    case "sol":
      return (
        <g>
          <rect width="100" height="100" fill={b} opacity="0.3" />
          {Array.from({ length: 16 }, (_, i) => { const t = (i / 16) * Math.PI * 2; return <line key={i} x1="50" y1="46" x2={50 + Math.cos(t) * 60} y2={46 + Math.sin(t) * 60} stroke={a} strokeWidth="3" opacity="0.7" /> })}
          <circle cx="50" cy="46" r="16" fill={a} />
        </g>
      )
    case "mar":
      return (
        <g>
          <rect width="100" height="50" fill={b} opacity="0.35" />
          <circle cx="70" cy="30" r="10" fill={a} />
          {Array.from({ length: 6 }, (_, i) => <path key={i} d={`M0 ${52 + i * 7} Q 12 ${48 + i * 7} 25 ${52 + i * 7} T 50 ${52 + i * 7} T 75 ${52 + i * 7} T 100 ${52 + i * 7}`} stroke={i % 2 ? a : "#e8f4ff"} strokeWidth="1.6" fill="none" opacity={0.9 - i * 0.1} />)}
        </g>
      )
    case "mandala":
      return (
        <g transform="translate(50 44)">
          {Array.from({ length: 12 }, (_, i) => <ellipse key={i} rx="7" ry="24" fill={i % 2 ? a : b} opacity="0.75" transform={`rotate(${i * 30}) translate(0 -16)`} />)}
          <circle r="9" fill={a} />
          <circle r="4" fill="#0b0a12" />
        </g>
      )
    case "duna":
      return (
        <g>
          <rect width="100" height="100" fill={g} opacity="0.3" />
          <circle cx="34" cy="28" r="12" fill={a} />
          <circle cx="40" cy="24" r="11" fill="#0b0a12" opacity="0.9" />
          <path d="M0 70 Q 30 50 60 66 T 100 60 L100 100 L0 100 Z" fill={b} />
          <path d="M0 82 Q 40 66 70 80 T 100 76 L100 100 L0 100 Z" fill={a} opacity="0.85" />
        </g>
      )
    default:
      return (
        <g>
          <circle cx="50" cy="44" r="36" fill="#111" />
          {[32, 26, 20].map((r) => <circle key={r} cx="50" cy="44" r={r} fill="none" stroke="#2a2a2a" strokeWidth="0.6" />)}
          <circle cx="50" cy="44" r="10" fill={a} />
        </g>
      )
  }
}
