"use client"

// ─── Mapa da página 3 do painel do carro ────────────────────────────────────
// Substitui o mini-mapa redondo/elíptico antigo (components/CityMap.tsx,
// agora removido) por uma rota com curvas de verdade — não é geografia real,
// é ilustrativo (mesma lógica de antes: só visualiza o progresso 0..1 do
// odômetro da missão), mas parece um mapa, não um loop perfeito.
// Também mostra a "chegada estimada", que na verdade é sempre os mesmos 45s
// de rádio ouvido que a próxima missão exige — só que fantasiado de relógio,
// como se fossem horas de viagem em vez de segundos reais.

export interface DriveMapMission {
  id: string
  letter: string
  name: string
  color: string
}

// pontos de interesse decorativos (mesmos da versão antiga, agora sem
// emoji — ícone de vetor simples, no mesmo estilo do resto do app)
const POIS: { id: string; label: string; x: number; y: number; icon: "fuel" | "disc" | "coffee" | "food" }[] = [
  { id: "posto",   label: "Posto",       x: 46,  y: 24, icon: "fuel" },
  { id: "discos",  label: "Loja de discos", x: 168, y: 30, icon: "disc" },
  { id: "coffee",  label: "Coffeeshop",  x: 232, y: 108, icon: "coffee" },
  { id: "fast",    label: "Fast food",   x: 70,  y: 150, icon: "food" },
]

function poiIcon(icon: string) {
  const s = "rgba(255,255,255,0.55)"
  if (icon === "fuel") return <><rect x="-4" y="-6" width="7" height="12" rx="1" stroke={s} strokeWidth="1.3" fill="none" /><path d="M3 -2h2a1.5 1.5 0 011.5 1.5V3" stroke={s} strokeWidth="1.3" fill="none" strokeLinecap="round" /></>
  if (icon === "disc") return <><circle r="6" stroke={s} strokeWidth="1.3" fill="none" /><circle r="1.6" fill={s} /></>
  if (icon === "coffee") return <><path d="M-5 -3h8v5a4 4 0 01-4 4 4 4 0 01-4-4v-5z" stroke={s} strokeWidth="1.3" fill="none" /><path d="M3 -2h1.5a2 2 0 010 4H3" stroke={s} strokeWidth="1.2" fill="none" /></>
  return <><rect x="-6" y="-4" width="12" height="8" rx="2" stroke={s} strokeWidth="1.3" fill="none" /><path d="M-3 -4v-2M3 -4v-2" stroke={s} strokeWidth="1.2" strokeLinecap="round" /></>
}

// rota fixa em 3 curvas (bezier cúbica) — ilustrativa, não geografia real.
// Amostrada em pontos pra poder posicionar o "você está aqui" por índice,
// sem precisar de DOM (getPointAtLength) pra funcionar no primeiro paint.
const ROUTE_D = "M22,168 C55,150 60,80 108,66 C150,54 150,118 186,132 C222,146 232,80 278,36"
function cubicPoint(p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], t: number) {
  const mt = 1 - t
  const x = mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0]
  const y = mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1]
  return { x, y }
}
const ROUTE_SEGMENTS: [[number, number], [number, number], [number, number], [number, number]][] = [
  [[22, 168], [55, 150], [60, 80], [108, 66]],
  [[108, 66], [150, 54], [150, 118], [186, 132]],
  [[186, 132], [222, 146], [232, 80], [278, 36]],
]
const ROUTE_POINTS: { x: number; y: number }[] = ROUTE_SEGMENTS.flatMap((seg) =>
  Array.from({ length: 40 }, (_, i) => cubicPoint(seg[0], seg[1], seg[2], seg[3], i / 39))
)

function pointAt(progress: number) {
  const idx = Math.max(0, Math.min(ROUTE_POINTS.length - 1, Math.round(progress * (ROUTE_POINTS.length - 1))))
  return ROUTE_POINTS[idx]
}

const DEST = ROUTE_POINTS[ROUTE_POINTS.length - 1]
const START = ROUTE_POINTS[0]

function MapSvg({ mission, progress }: { mission?: DriveMapMission; progress: number }) {
  const here = pointAt(progress)
  return (
    <svg viewBox="0 0 300 200" width="100%" height="100%" style={{ display: "block" }}>
      {/* quarteirões — textura de cidade, não interativos */}
      {[[6, 8, 30, 34], [244, 12, 46, 30], [10, 60, 34, 40], [190, 4, 40, 24], [6, 176, 40, 20], [240, 154, 50, 40]].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx={2.5} fill="rgba(255,255,255,0.035)" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      ))}

      {/* rota — asfalto com curvas de verdade, não um loop perfeito */}
      <path d={ROUTE_D} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={9} strokeLinecap="round" />
      <path d={ROUTE_D} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1.4} strokeDasharray="5 6" strokeLinecap="round" />

      {POIS.map((poi) => (
        <g key={poi.id} transform={`translate(${poi.x},${poi.y})`}>{poiIcon(poi.icon)}</g>
      ))}

      {/* partida */}
      <circle cx={START.x} cy={START.y} r={4} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} />

      {/* destino — marcador da missão ativa */}
      {mission && (
        <g transform={`translate(${DEST.x},${DEST.y})`}>
          <circle r={11} fill={`${mission.color}33`} stroke={mission.color} strokeWidth={1.8} />
          <text y={4} fontSize={11} fontWeight={800} fill={mission.color} textAnchor="middle" fontFamily="monospace">{mission.letter}</text>
        </g>
      )}

      {/* você está aqui */}
      <circle cx={here.x} cy={here.y} r={5} fill="#fff">
        <animate attributeName="opacity" values="1;0.4;1" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <circle cx={here.x} cy={here.y} r={9} fill="none" stroke="#fff" strokeOpacity={0.3} strokeWidth={1.5} />
    </svg>
  )
}

// relógio de "chegada" — os 45s reais de rádio ouvido fantasiados de horas
// de viagem: a pessoa vê um relógio contando 3h -> 0h em vez de "45s"
const FAKE_TOTAL_MIN = 180

function ArrivalClock({ remainFrac, accent }: { remainFrac: number; accent: string }) {
  const fakeMin = Math.round(FAKE_TOTAL_MIN * remainFrac)
  const hourAngle = 360 * (1 - remainFrac)
  const minuteAngle = 360 * ((fakeMin % 60) / 60)
  const label = `${Math.floor(fakeMin / 60)}h${String(fakeMin % 60).padStart(2, "0")}`
  const arrived = fakeMin <= 0
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width={40} height={40} viewBox="0 0 40 40">
        <circle cx={20} cy={20} r={18} fill="rgba(255,255,255,0.04)" stroke={arrived ? accent : "rgba(255,255,255,0.25)"} strokeWidth={1.5} />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * 30 * Math.PI) / 180
          return <line key={i} x1={20 + Math.sin(a) * 15} y1={20 - Math.cos(a) * 15} x2={20 + Math.sin(a) * 17} y2={20 - Math.cos(a) * 17} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
        })}
        <line x1={20} y1={20} x2={20 + Math.sin((hourAngle * Math.PI) / 180) * 9} y2={20 - Math.cos((hourAngle * Math.PI) / 180) * 9} stroke={accent} strokeWidth={2} strokeLinecap="round" />
        <line x1={20} y1={20} x2={20 + Math.sin((minuteAngle * Math.PI) / 180) * 13} y2={20 - Math.cos((minuteAngle * Math.PI) / 180) * 13} stroke="rgba(255,255,255,0.75)" strokeWidth={1.4} strokeLinecap="round" />
        <circle cx={20} cy={20} r={1.6} fill={accent} />
      </svg>
      <div>
        <p style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 1.5, color: "rgba(255,255,255,0.4)" }}>{arrived ? "CHEGANDO" : "CHEGADA ESTIMADA"}</p>
        <p style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700, color: arrived ? accent : "#fff", letterSpacing: 0.5 }}>{arrived ? "agora" : label}</p>
      </div>
    </div>
  )
}

export function DriveRouteMap({
  mission,
  progress,
  listenedMs,
  requiredMs,
}: {
  mission?: DriveMapMission
  progress: number
  listenedMs: number
  requiredMs: number
}) {
  const remainFrac = requiredMs > 0 ? Math.max(0, Math.min(1, (requiredMs - listenedMs) / requiredMs)) : 0
  const accent = mission?.color ?? "#00e5ff"
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "linear-gradient(160deg, #0d1420 0%, #060a10 100%)" }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <MapSvg mission={mission} progress={progress} />
      </div>
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.25)" }}>
        {mission ? (
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 1, color: `${mission.color}bb` }}>PRÓXIMA MISSÃO</p>
            <p style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{mission.letter} · {mission.name}</p>
          </div>
        ) : (
          <p style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.4)" }}>sem destino ativo</p>
        )}
        <ArrivalClock remainFrac={remainFrac} accent={accent} />
      </div>
    </div>
  )
}
