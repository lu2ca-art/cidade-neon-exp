// Desenhos da leitura — traço neon em SVG (nada baixado), tudo em
// currentColor pra herdar a aura. viewBox 0 0 100 100.

import type { ReactNode } from "react"

const T = { fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
const F = { fill: "currentColor" }

const ROSTO = (
  <>
    <circle cx="50" cy="44" r="24" {...T} />
    <path d="M30 88c4-14 14-20 20-20s16 6 20 20" {...T} />
  </>
)

const ARTES: Record<string, ReactNode> = {
  cama: (
    <>
      <path d="M10 70V40M90 70V58M10 58h80M10 70h80" {...T} />
      <rect x="16" y="46" width="20" height="10" rx="4" {...T} />
      <path d="M38 58c8-8 20-8 28-2s14 4 22 2" {...T} />
      <path d="M62 22h10l-10 10h10M76 12h7l-7 7h7" {...T} strokeWidth={2.2} className="v-zz" />
    </>
  ),
  celular: (
    <>
      <rect x="32" y="14" width="36" height="70" rx="7" {...T} />
      <rect x="38" y="24" width="24" height="44" rx="2" {...F} opacity={0.25} />
      <circle cx="50" cy="76" r="2.5" {...F} />
      <path d="M20 36c-4 6-4 14 0 20M13 30c-7 10-7 22 0 32M80 36c4 6 4 14 0 20M87 30c7 10 7 22 0 32" {...T} strokeWidth={2.2} className="v-vibra" />
    </>
  ),
  janela: (
    <>
      <rect x="18" y="12" width="64" height="76" rx="3" {...T} />
      <path d="M50 12v76M18 50h64" {...T} />
      <path d="M28 20l-3 9M40 26l-3 9M62 18l-3 9M74 28l-3 9M30 58l-3 9M44 64l-3 9M64 58l-3 9M72 70l-3 9" {...T} strokeWidth={2} className="v-chuva" />
    </>
  ),
  caderno: (
    <>
      <rect x="24" y="12" width="56" height="76" rx="4" {...T} />
      <path d="M24 22h-6M24 34h-6M24 46h-6M24 58h-6M24 70h-6M24 82h-6" {...T} />
      <path d="M34 30h36M34 42h36M34 54h28M34 66h20" {...T} strokeWidth={2} opacity={0.6} />
    </>
  ),
  festa: (
    <>
      <path d="M6 22c14 16 30 16 44 6s30-10 44 6" {...T} strokeWidth={2} />
      {[14, 26, 38, 50, 62, 74, 86].map((x, i) => <circle key={x} cx={x} cy={28 + Math.sin(i) * 5} r="3.5" {...F} className="v-pisca" style={{ animationDelay: `${i * 0.2}s` }} />)}
      <circle cx="50" cy="66" r="16" {...T} />
      <path d="M34 66h32M50 50v32M38 56c8 4 16 4 24 0M38 76c8-4 16-4 24 0" {...T} strokeWidth={1.6} />
    </>
  ),
  partida: (
    <>
      <path d="M14 88V16h30v72" {...T} />
      <circle cx="40" cy="54" r="2" {...F} />
      <circle cx="72" cy="30" r="7" {...T} />
      <path d="M72 38v22l-8 24M72 60l8 24M72 46l-10 8M72 46l9 6" {...T} className="v-anda" />
    </>
  ),
  broto: (
    <>
      <path d="M12 82h76" {...T} />
      <path d="M50 82V46" {...T} />
      <path d="M50 58c-16 0-22-10-22-20 12 0 22 6 22 20zM50 50c0-16 10-24 22-24 0 14-8 24-22 24z" {...T} className="v-cresce" />
    </>
  ),
  copo: (
    <>
      <path d="M26 16h48l-6 70H32z" {...T} />
      <path d="M34 16l3 70M42 16l2 70M50 16v70M58 16l-2 70M66 16l-3 70" {...T} strokeWidth={1.6} opacity={0.55} />
    </>
  ),
  descer: (
    <>
      <path d="M12 20h18v16h18v16h18v16h18" {...T} />
      <path d="M78 22l-8 8M78 22h-8M78 22v8" {...T} transform="rotate(180 74 26)" />
    </>
  ),
  camera: (
    <>
      <rect x="12" y="30" width="76" height="50" rx="8" {...T} />
      <path d="M34 30l6-10h20l6 10" {...T} />
      <circle cx="50" cy="55" r="14" {...T} />
      <circle cx="76" cy="40" r="3" {...F} className="v-pisca" />
    </>
  ),
  ampulheta: (
    <>
      <path d="M28 12h44M28 88h44M32 12c0 22 36 22 36 38S32 66 32 88M68 12c0 22-36 22-36 38s36 16 36 38" {...T} />
      <path d="M50 52v14" {...T} strokeWidth={2} className="v-pisca" />
      <path d="M40 84c4-6 16-6 20 0z" {...F} />
    </>
  ),
  lagrima: (
    <>
      <path d="M10 44c20-22 60-22 80 0-20 22-60 22-80 0z" {...T} />
      <circle cx="50" cy="44" r="10" {...T} />
      <path d="M58 62c-5 8-5 12 0 14 5-2 5-6 0-14z" {...F} className="v-cai" />
    </>
  ),
  relogio: (
    <>
      <circle cx="50" cy="52" r="32" {...T} />
      <path d="M50 52V32M50 52l14 8" {...T} />
      <path d="M40 14h20M50 14v6" {...T} />
    </>
  ),
  mp3: (
    <>
      <rect x="30" y="12" width="40" height="62" rx="8" {...T} />
      <circle cx="50" cy="52" r="11" {...T} />
      <rect x="37" y="20" width="26" height="16" rx="2" {...F} opacity={0.25} />
      <path d="M40 74c-2 10-14 10-18 4M60 74c2 10 14 10 18 4" {...T} strokeWidth={2} />
      <path d="M66 22h-6" {...T} strokeWidth={2} opacity={0.4} />
    </>
  ),
  lanterna: (
    <>
      <path d="M12 58l30-12 4 12-30 12z" {...T} />
      <path d="M46 46l40-26M46 58l40 26" {...T} strokeWidth={1.6} opacity={0.7} />
      <path d="M48 44l38-20v60L48 60z" {...F} opacity={0.14} className="v-pisca" />
    </>
  ),
  cansado: (
    <>
      {ROSTO}
      <path d="M38 44h8M54 44h8M42 56c4-2 12-2 16 0" {...T} />
      <path d="M37 38l9-3M63 38l-9-3" {...T} strokeWidth={2} />
    </>
  ),
  brilho: (
    <>
      {ROSTO}
      <circle cx="42" cy="42" r="2.5" {...F} />
      <circle cx="58" cy="42" r="2.5" {...F} />
      <path d="M42 54c4 4 12 4 16 0" {...T} />
      <path d="M82 16v12M76 22h12M16 28v8M12 32h8M84 60v8M80 64h8" {...T} strokeWidth={2} className="v-pisca" />
    </>
  ),
  mascara: (
    <>
      {ROSTO}
      <circle cx="42" cy="42" r="2.5" {...F} />
      <circle cx="58" cy="42" r="2.5" {...F} />
      <path d="M44 55h12" {...T} />
      <path d="M62 60c10-4 22 0 26 10-8 8-22 6-28-2z" {...T} className="v-cai" />
    </>
  ),
  glitch: (
    <>
      <g transform="translate(-5 0)" opacity={0.5}>{ROSTO}</g>
      <g transform="translate(5 2)" opacity={0.5}>{ROSTO}</g>
      <path d="M20 40h60M14 52h36M56 62h30" {...T} strokeWidth={2} className="v-pisca" />
    </>
  ),
}

// `caixa`: posição dentro de outro SVG (o quarto)
export function Arte({ id, className, caixa }: { id: string; className?: string; caixa?: { x: number; y: number; w: number; h: number } }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden {...(caixa ? { x: caixa.x, y: caixa.y, width: caixa.w, height: caixa.h } : {})}>
      {ARTES[id] ?? null}
    </svg>
  )
}

// o quarto das 3h da manhã: cada objeto é uma resposta
// (viewBox do quarto: 300 × 300; mesa em y = 190, chão em y = 292)
export const QUARTO: Record<string, { x: number; y: number; w: number; h: number; rotulo: string; acima?: boolean }> = {
  janela: { x: 40, y: 6, w: 130, h: 130, rotulo: "a janela" },
  celular: { x: 178, y: 122, w: 64, h: 68, rotulo: "o celular" },
  caderno: { x: 236, y: 132, w: 58, h: 58, rotulo: "o caderno", acima: true },
  cama: { x: 4, y: 196, w: 160, h: 100, rotulo: "virar pro lado" },
}
