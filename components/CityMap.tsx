"use client"

import { useState } from "react"

export interface CityMapMission {
  id: string
  letter: string
  name: string
  color: string
}

// Pontos de interesse decorativos — sempre visíveis, sem função de jogo,
// só pra dar a sensação de "um mundo" ao redor do loop de pista.
const POIS = [
  { id: "posto",    label: "Posto de gasolina", angle: 20,  icon: "⛽" },
  { id: "discos",   label: "Loja de discos",    angle: 100, icon: "💿" },
  { id: "coffee",   label: "Coffeeshop",        angle: 140, icon: "☕" },
  { id: "izakaya",  label: "Izakaya",           angle: 200, icon: "🍜" },
  { id: "fastfood", label: "Fast food",         angle: 300, icon: "🍔" },
  { id: "taqueria", label: "Taqueria",          angle: 340, icon: "🌮" },
]

// ângulo fixo de cada missão no mini-mapa — ilustrativo, não é posição
// geográfica real. A distância de verdade é o odômetro do /drive
// (activeMission/missionDistRef); aqui só visualizamos o progresso (0..1)
// como um ponto andando do início até o marcador da missão.
const MISSION_ANGLES: Record<string, number> = {
  nectar: 60,
  batida: 160,
  guitarDriver: 260,
}

const START_ANGLE = -90

function pointOnLoop(angleDeg: number, rx: number, ry: number, cx: number, cy: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + rx * Math.cos(rad), y: cy + ry * Math.sin(rad) }
}

function MapSvg({ mission, progress, size }: { mission?: CityMapMission; progress: number; size: number }) {
  const cx = size / 2
  const cy = size / 2
  const rx = size * 0.36
  const ry = size * 0.36
  const missionAngle = mission ? (MISSION_ANGLES[mission.id] ?? 0) : START_ANGLE
  // interpola pelo arco mais curto entre o início e o marcador da missão
  let delta = missionAngle - START_ANGLE
  delta = (((delta + 180) % 360) + 360) % 360 - 180
  const hereAngle = START_ANGLE + delta * progress
  const here = pointOnLoop(hereAngle, rx, ry, cx, cy)
  const dest = mission ? pointOnLoop(missionAngle, rx, ry, cx, cy) : null

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[[0.12, 0.14, 0.18, 0.14], [0.7, 0.1, 0.2, 0.16], [0.1, 0.68, 0.2, 0.18], [0.66, 0.66, 0.22, 0.2]].map(([x, y, w, h], i) => (
        <rect key={i} x={x * size} y={y * size} width={w * size} height={h * size} rx={3}
          fill="rgba(255,255,255,0.035)" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      ))}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={2.5} strokeDasharray="1 5" strokeLinecap="round" />
      {POIS.map(poi => {
        const p = pointOnLoop(poi.angle, rx, ry, cx, cy)
        return (
          <text key={poi.id} x={p.x} y={p.y} fontSize={size * 0.05} textAnchor="middle" dominantBaseline="central">{poi.icon}</text>
        )
      })}
      {dest && mission && (
        <g>
          <circle cx={dest.x} cy={dest.y} r={size * 0.062} fill={`${mission.color}33`} stroke={mission.color} strokeWidth={1.5} />
          <text x={dest.x} y={dest.y} fontSize={size * 0.07} fontWeight={800} fill={mission.color} textAnchor="middle" dominantBaseline="central" fontFamily="monospace">{mission.letter}</text>
        </g>
      )}
      <circle cx={here.x} cy={here.y} r={size * 0.03} fill="#fff">
        <animate attributeName="opacity" values="1;0.4;1" dur="1.6s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

// Botão do mini-mapa (thumbnail) — só o gatilho, sem o modal expandido
// embutido. Precisa ficar assim (controlado por fora) porque o modal
// expandido usa position:fixed com zIndex alto pra cobrir a tela toda, e
// isso só funciona de verdade se ele for renderizado como um irmão de
// topo no app/drive/page.tsx — se ficasse aninhado dentro da caixa do HUB
// (que tem seu próprio zIndex/stacking context), o zIndex do modal só
// venceria os outros elementos DENTRO do HUB, não o rádio/DJ deck que
// ficam fora dele (foi exatamente esse bug que aconteceu antes).
export function CityMapButton({ mission, progress, onOpen, size = 64 }: { mission?: CityMapMission; progress: number; onOpen: () => void; size?: number }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Abrir mini-mapa"
      style={{
        width: size, height: size, borderRadius: 14,
        background: "rgba(10,0,20,0.8)", padding: 4,
        border: "1.5px solid rgba(255,255,255,0.25)",
        boxShadow: "0 0 12px rgba(255,255,255,0.12)",
        cursor: "pointer", WebkitTapHighlightColor: "transparent",
      }}
    >
      <MapSvg mission={mission} progress={progress} size={size - 8} />
    </button>
  )
}

// Modal expandido — renderizar como irmão de topo (fora de qualquer zona
// do painel), nunca aninhado dentro de outra caixa posicionada.
export function CityMapModal({ mission, progress, onClose }: { mission?: CityMapMission; progress: number; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(2,0,12,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 340, borderRadius: 20, padding: "20px 18px",
          background: "linear-gradient(160deg, #12081f 0%, #06030d 100%)",
          border: "1px solid rgba(255,255,255,0.18)",
          boxShadow: "0 0 30px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <p style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.5)" }}>MAPA DA CIDADE</p>
          <button type="button" onClick={onClose} aria-label="Fechar"
            style={{ color: "rgba(255,255,255,0.6)", fontSize: 18, lineHeight: 1, background: "none", border: "none", cursor: "pointer" }}>×</button>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <MapSvg mission={mission} progress={progress} size={220} />
        </div>
        {mission ? (
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <p style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: mission.color, letterSpacing: 1 }}>
              {mission.letter} · {mission.name}
            </p>
            <div style={{ height: 4, borderRadius: 4, background: "rgba(255,255,255,0.1)", marginTop: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.round(progress * 100)}%`, background: mission.color, transition: "width .3s" }} />
            </div>
            <p style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
              dirija até o marcador pra encontrar {mission.name}
            </p>
          </div>
        ) : (
          <p style={{ textAlign: "center", fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 14 }}>
            nenhuma missão ativa no momento
          </p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {POIS.map(poi => (
            <div key={poi.id} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.55)" }}>
              <span>{poi.icon}</span><span>{poi.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Wrapper não-controlado (mantém o próprio estado) — usar só quando o
// modal expandido puder mesmo ficar no topo da árvore (sem nenhum
// ancestro posicionado por perto). Pra casos aninhados (como o HUB do
// carro), usar CityMapButton + CityMapModal controlados por fora.
export default function CityMap({ mission, progress }: { mission?: CityMapMission; progress: number }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <>
      <CityMapButton mission={mission} progress={progress} onOpen={() => setExpanded(true)} />
      {expanded && <CityMapModal mission={mission} progress={progress} onClose={() => setExpanded(false)} />}
    </>
  )
}
