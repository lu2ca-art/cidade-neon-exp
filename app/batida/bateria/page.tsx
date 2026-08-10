"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useCurrentSong } from "../lib/CurrentSongContext"
import { PhoneShell } from "../components/PhoneShell"
import { InstrumentHeader } from "../components/InstrumentHeader"
import { TimbrePicker } from "../components/TimbrePicker"
import { StepGrid } from "../components/StepGrid"
import { AddTrackBar } from "../components/AddTrackBar"
import { DRUM_TIMBRES, DRUM_TIMBRE_LABEL, DRUM_TIMBRE_EFFECT } from "../lib/synths"
import { DRUM_ROWS, INSTRUMENT_COLOR, MAX_TRACKS, defaultFx, newTrackId, type DrumRow, type DrumTimbre } from "../lib/types"

const ACCENT = INSTRUMENT_COLOR.bateria
const STEPS = 8

function emptyCells(): Record<DrumRow, boolean[]> {
  return { kick: Array(STEPS).fill(false), snare: Array(STEPS).fill(false), hat: Array(STEPS).fill(false), perc: Array(STEPS).fill(false) }
}

export default function BateriaPage() {
  const { song, engine, addTrack } = useCurrentSong()
  const [timbreIdx, setTimbreIdx] = useState(0)
  const [cells, setCells] = useState<Record<DrumRow, boolean[]>>(emptyCells)
  const [playing, setPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const timbre: DrumTimbre = DRUM_TIMBRES[timbreIdx]

  useEffect(() => { if (engine) setPlaying(engine.isPlaying) }, [engine])

  useEffect(() => {
    if (!engine) return
    engine.setOnTick((tick) => { if (tick % 2 === 0) setCurrentStep(tick / 2) })
    return () => engine.setOnTick(undefined)
  }, [engine])

  const draftTrack = useMemo(() => ({
    id: "draft-bateria",
    instrument: "bateria" as const,
    fx: defaultFx(),
    data: { kind: "drum" as const, timbre, cells },
  }), [timbre, cells])

  useEffect(() => { engine?.setTracks([...song.tracks, draftTrack]) }, [engine, song.tracks, draftTrack])

  const togglePlay = useCallback(() => {
    if (!engine) return
    if (playing) engine.stop(); else engine.play()
    setPlaying(!playing)
  }, [engine, playing])

  const toggleCell = (rowId: DrumRow, stepIdx: number) => {
    setCells((prev) => ({ ...prev, [rowId]: prev[rowId].map((v, i) => (i === stepIdx ? !v : v)) }))
  }

  const canAdd = song.tracks.length < MAX_TRACKS

  const handleAdd = async () => {
    const hasNotes = Object.values(cells).some((row) => row.some(Boolean))
    if (!hasNotes) { setFeedback("marque pelo menos uma célula antes de adicionar"); return }
    const ok = await addTrack({ id: newTrackId(), instrument: "bateria", fx: defaultFx(), data: { kind: "drum", timbre, cells } })
    if (ok) { setCells(emptyCells()); setFeedback("faixa de bateria adicionada — salvo automaticamente") }
    else setFeedback("limite de 5 faixas atingido")
    window.setTimeout(() => setFeedback(null), 2600)
  }

  return (
    <PhoneShell accent={ACCENT}>
      <InstrumentHeader accent={ACCENT} label="BATERIA" playing={playing} onTogglePlay={togglePlay} />
      <p className="text-white/40 text-xs text-center mb-2 flex-shrink-0">
        escolha um kit e monte o ritmo — os outros instrumentos da música tocam junto.
      </p>

      <TimbrePicker
        labels={DRUM_TIMBRES.map((t) => DRUM_TIMBRE_LABEL[t])}
        effects={DRUM_TIMBRES.map((t) => DRUM_TIMBRE_EFFECT[t])}
        value={timbreIdx}
        onChange={setTimbreIdx}
        accent={ACCENT}
      />

      <StepGrid
        rows={DRUM_ROWS}
        steps={STEPS}
        cells={cells}
        currentStep={currentStep}
        playing={playing}
        onToggle={(rowId, stepIdx) => toggleCell(rowId as DrumRow, stepIdx)}
        onPreviewRow={(rowId) => engine?.previewDrum(rowId as DrumRow, timbre)}
        accent={ACCENT}
      />

      <button
        type="button"
        onClick={() => setCells(emptyCells())}
        className="mt-2 py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all active:scale-[0.97] flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)" }}
      >
        limpar grade
      </button>

      <AddTrackBar accent={ACCENT} trackCount={song.tracks.length} maxTracks={MAX_TRACKS} canAdd={canAdd} onAdd={handleAdd} addLabel="adicionar faixa de bateria" />
      {feedback && <p className="text-center text-[10px] font-mono mt-1.5" style={{ color: ACCENT }}>{feedback}</p>}
    </PhoneShell>
  )
}
