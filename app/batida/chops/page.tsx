"use client"

// CHOPS — sampler da cidade. 8 pads com pedaços das faixas do LU2CA
// (kits gerados por scripts/batida-kits.py). Toca o pad pra ouvir, liga os
// quadradinhos pra sequenciar. Mesmo esquema da bateria: colcheias, 1/2/4
// compassos, os outros instrumentos da música tocam junto.

import { useCallback, useEffect, useMemo, useState } from "react"
import { useCurrentSong } from "../lib/CurrentSongContext"
import { PhoneShell } from "../components/PhoneShell"
import { InstrumentHeader } from "../components/InstrumentHeader"
import { BarLengthPicker } from "../components/BarLengthPicker"
import { BarPager } from "../components/BarPager"
import { StepGrid } from "../components/StepGrid"
import { AddTrackBar } from "../components/AddTrackBar"
import { listarKits, type Kit } from "../lib/amostras"
import { INSTRUMENT_COLOR, MAX_TRACKS, defaultFx, newTrackId, type BarLength } from "../lib/types"

const ACCENT = INSTRUMENT_COLOR.chops
const PASSOS = 8

function vazia(bars: number) {
  return Array.from({ length: 8 }, () => Array(bars * PASSOS).fill(false) as boolean[])
}

export default function ChopsPage() {
  const { song, engine, addTrack } = useCurrentSong()
  const [kits, setKits] = useState<Kit[]>([])
  const [kitId, setKitId] = useState("chuva")
  const [bars, setBars] = useState<BarLength>(1)
  const [activeBar, setActiveBar] = useState(0)
  const [cells, setCells] = useState<boolean[][]>(() => vazia(1))
  const [playing, setPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState<number | null>(null)
  const [playingBar, setPlayingBar] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [aceso, setAceso] = useState<number | null>(null)

  useEffect(() => { listarKits().then(setKits) }, [])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- motor de áudio é externo
  useEffect(() => { if (engine) setPlaying(engine.isPlaying) }, [engine])
  useEffect(() => {
    if (!engine) return
    engine.setOnTick((tick, bar) => {
      if (tick % 2 === 0) setCurrentStep(tick / 2)
      setPlayingBar(bar % bars)
    })
    return () => engine.setOnTick(undefined)
  }, [engine, bars])

  const kit = kits.find((k) => k.id === kitId)
  const cor = kit?.cor ?? ACCENT

  const draft = useMemo(() => ({
    id: "draft-chops",
    instrument: "chops" as const,
    fx: defaultFx(),
    data: { kind: "chops" as const, kit: kitId, bars, cells },
  }), [kitId, bars, cells])

  useEffect(() => { engine?.setTracks([...song.tracks, draft]) }, [engine, song.tracks, draft])

  const togglePlay = useCallback(() => {
    if (!engine) return
    if (playing) engine.stop(); else engine.play()
    setPlaying(!playing)
  }, [engine, playing])

  const tocarPad = (n: number) => {
    void engine?.previewChop(kitId, n)
    setAceso(n)
    setTimeout(() => setAceso((a) => (a === n ? null : a)), 180)
  }

  const linhas = (kit?.pads ?? Array.from({ length: 8 }, (_, n) => ({ n, rotulo: `pad ${n + 1}` }))).map((p) => ({
    id: String(p.n),
    label: p.rotulo.toUpperCase().slice(0, 6),
    color: cor,
  }))
  const recorte: Record<string, boolean[]> = {}
  cells.forEach((row, i) => { recorte[String(i)] = row.slice(activeBar * PASSOS, activeBar * PASSOS + PASSOS) })

  const handleAdd = async () => {
    if (!cells.some((r) => r.some(Boolean))) { setFeedback("liga pelo menos um quadradinho antes"); return }
    const ok = await addTrack({ id: newTrackId(), instrument: "chops", fx: defaultFx(), data: { kind: "chops", kit: kitId, bars, cells } })
    if (ok) { setCells(vazia(bars)); setFeedback("chops adicionado — salvo automaticamente") }
    else setFeedback("limite de 5 faixas atingido")
    window.setTimeout(() => setFeedback(null), 2600)
  }

  return (
    <PhoneShell accent={ACCENT}>
      <InstrumentHeader accent={ACCENT} label="CHOPS" playing={playing} onTogglePlay={togglePlay} />
      <p className="text-white/40 text-xs text-center mb-2 flex-shrink-0">
        pedaços das músicas da cidade. toca os pads pra ouvir, liga os quadradinhos pra criar.
      </p>

      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2 flex-shrink-0" style={{ scrollbarWidth: "none" }}>
        {kits.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKitId(k.id)}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wide"
            style={{
              background: kitId === k.id ? `${k.cor}25` : "rgba(255,255,255,0.04)",
              border: `1px solid ${kitId === k.id ? k.cor : "rgba(255,255,255,0.1)"}`,
              color: kitId === k.id ? k.cor : "rgba(255,255,255,0.5)",
            }}
          >
            {k.nome}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-1.5 mb-2 flex-shrink-0">
        {linhas.map((l, i) => (
          <button
            key={l.id}
            type="button"
            onPointerDown={() => tocarPad(i)}
            className="aspect-square rounded-xl text-[9px] font-mono uppercase transition-transform active:scale-95"
            style={{
              background: aceso === i ? cor : `${cor}18`,
              border: `1px solid ${cor}66`,
              color: aceso === i ? "#050510" : cor,
              boxShadow: aceso === i ? `0 0 24px ${cor}` : "none",
            }}
          >
            {l.label}
          </button>
        ))}
      </div>

      <BarLengthPicker value={bars} onChange={(n) => { setBars(n); setActiveBar(0); setCells(vazia(n)) }} accent={ACCENT} />
      <BarPager bars={bars} activeBar={activeBar} onChange={setActiveBar} playingBar={playing ? playingBar : null} accent={ACCENT} />

      <StepGrid
        rows={linhas}
        steps={PASSOS}
        cells={recorte}
        currentStep={currentStep}
        playing={playing && playingBar === activeBar}
        onToggle={(rowId, stepIdx) => {
          const pad = Number(rowId)
          const abs = activeBar * PASSOS + stepIdx
          setCells((prev) => prev.map((row, r) => (r === pad ? row.map((v, i) => (i === abs ? !v : v)) : row)))
        }}
        onPreviewRow={(rowId) => tocarPad(Number(rowId))}
        accent={ACCENT}
      />

      <AddTrackBar accent={ACCENT} trackCount={song.tracks.length} maxTracks={MAX_TRACKS} canAdd={song.tracks.length < MAX_TRACKS} onAdd={handleAdd} addLabel="adicionar faixa de chops" />
      {feedback && <p className="text-center text-[10px] font-mono mt-1.5" style={{ color: ACCENT }}>{feedback}</p>}
    </PhoneShell>
  )
}
