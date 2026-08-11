"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useCurrentSong } from "../lib/CurrentSongContext"
import { PhoneShell } from "../components/PhoneShell"
import { InstrumentHeader } from "../components/InstrumentHeader"
import { TimbrePicker } from "../components/TimbrePicker"
import { BarLengthPicker } from "../components/BarLengthPicker"
import { BarPager } from "../components/BarPager"
import { StepGrid, type StepGridRow } from "../components/StepGrid"
import { AddTrackBar } from "../components/AddTrackBar"
import { keyDegrees, NOTE_NAMES } from "../lib/theory"
import { BASS_TIMBRE_LABEL, BASS_TIMBRE_EFFECT } from "../lib/synths"
import { INSTRUMENT_COLOR, MAX_TRACKS, defaultFx, newTrackId, type BarLength, type MusicMode } from "../lib/types"

const ACCENT = INSTRUMENT_COLOR.baixo
const STEPS_PER_BAR = 16

function emptyCells(bars: number): boolean[][] { return Array.from({ length: 7 }, () => Array(bars * STEPS_PER_BAR).fill(false)) }
function sliceBarToRecord(cells: boolean[][], bar: number): Record<string, boolean[]> {
  const start = bar * STEPS_PER_BAR
  const rec: Record<string, boolean[]> = {}
  cells.forEach((row, i) => { rec[String(i)] = row.slice(start, start + STEPS_PER_BAR) })
  return rec
}

export default function BaixoPage() {
  const { song, engine, addTrack, patchSong } = useCurrentSong()
  const [timbreIdx, setTimbreIdx] = useState(0)
  const [bars, setBars] = useState<BarLength>(1)
  const [activeBar, setActiveBar] = useState(0)
  const [cells, setCells] = useState<boolean[][]>(() => emptyCells(1))
  const [playing, setPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState<number | null>(null)
  const [playingBar, setPlayingBar] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => { if (engine) setPlaying(engine.isPlaying) }, [engine])
  useEffect(() => {
    if (!engine) return
    engine.setOnTick((tick, bar) => { setCurrentStep(tick); setPlayingBar(bar % bars) })
    return () => engine.setOnTick(undefined)
  }, [engine, bars])

  const degrees = keyDegrees(song.rootNote, song.mode)
  const rows: StepGridRow[] = degrees.map((d) => ({ id: String(d.degree), label: `${d.romanNumeral} ${d.rootName}`, color: ACCENT }))

  const draftTrack = useMemo(() => ({
    id: "draft-baixo",
    instrument: "baixo" as const,
    fx: defaultFx(),
    data: { kind: "bass" as const, timbre: timbreIdx as 0 | 1 | 2 | 3, bars, cells },
  }), [timbreIdx, bars, cells])

  useEffect(() => { engine?.setTracks([...song.tracks, draftTrack]) }, [engine, song.tracks, draftTrack])

  const togglePlay = useCallback(() => {
    if (!engine) return
    if (playing) engine.stop(); else engine.play()
    setPlaying(!playing)
  }, [engine, playing])

  const changeBars = (n: BarLength) => {
    setBars(n)
    setActiveBar(0)
    setCells(emptyCells(n))
  }

  const toggleCell = (rowId: string, localIdx: number) => {
    const degree = Number(rowId)
    const abs = activeBar * STEPS_PER_BAR + localIdx
    setCells((prev) => prev.map((row, i) => (i === degree ? row.map((v, s) => (s === abs ? !v : v)) : row)))
  }

  const setRoot = (root: number) => patchSong((prev) => ({ ...prev, rootNote: root, keySetBy: "baixo" }))
  const setMode = (mode: MusicMode) => patchSong((prev) => ({ ...prev, mode, keySetBy: "baixo" }))

  const canAdd = song.tracks.length < MAX_TRACKS

  const handleAdd = async () => {
    const hasNotes = cells.some((row) => row.some(Boolean))
    if (!hasNotes) { setFeedback("marque pelo menos uma nota antes de adicionar"); return }
    const ok = await addTrack({ id: newTrackId(), instrument: "baixo", fx: defaultFx(), data: { kind: "bass", timbre: timbreIdx as 0 | 1 | 2 | 3, bars, cells } })
    if (ok) { setCells(emptyCells(bars)); setFeedback("faixa de baixo adicionada — os acordes dela já valem pra guitarra/piano") }
    else setFeedback("limite de 5 faixas atingido")
    window.setTimeout(() => setFeedback(null), 3200)
  }

  return (
    <PhoneShell accent={ACCENT}>
      <InstrumentHeader accent={ACCENT} label="BAIXO" playing={playing} onTogglePlay={togglePlay} />
      <p className="text-white/40 text-xs text-center mb-2 flex-shrink-0">
        escolha a tonalidade e os graus que o baixo usa viram os acordes disponíveis na guitarra e no piano.
      </p>

      <div className="mb-2 flex-shrink-0">
        <div className="grid grid-cols-6 gap-1 mb-1">
          {NOTE_NAMES.map((n, i) => (
            <button
              key={n}
              type="button"
              onClick={() => setRoot(i)}
              className="py-1.5 rounded-md text-[9px] font-mono transition-all active:scale-95"
              style={{
                background: song.rootNote === i ? `${ACCENT}30` : "rgba(255,255,255,0.04)",
                border: `1px solid ${song.rootNote === i ? ACCENT : "rgba(255,255,255,0.1)"}`,
                color: song.rootNote === i ? ACCENT : "rgba(255,255,255,0.4)",
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(["major", "minor"] as MusicMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="flex-1 py-1.5 rounded-md text-[9px] font-mono uppercase tracking-wide transition-all active:scale-95"
              style={{
                background: song.mode === m ? `${ACCENT}25` : "rgba(255,255,255,0.04)",
                border: `1px solid ${song.mode === m ? ACCENT : "rgba(255,255,255,0.1)"}`,
                color: song.mode === m ? ACCENT : "rgba(255,255,255,0.4)",
              }}
            >
              {m === "major" ? "maior" : "menor"}
            </button>
          ))}
        </div>
      </div>

      <TimbrePicker
        labels={[...BASS_TIMBRE_LABEL]}
        effects={[...BASS_TIMBRE_EFFECT]}
        value={timbreIdx}
        onChange={setTimbreIdx}
        accent={ACCENT}
      />
      <BarLengthPicker value={bars} onChange={changeBars} accent={ACCENT} />
      <BarPager bars={bars} activeBar={activeBar} onChange={setActiveBar} playingBar={playing ? playingBar : null} accent={ACCENT} />

      <StepGrid
        rows={rows}
        steps={STEPS_PER_BAR}
        cells={sliceBarToRecord(cells, activeBar)}
        currentStep={currentStep}
        playing={playing && playingBar === activeBar}
        onToggle={toggleCell}
        onPreviewRow={(rowId) => engine?.previewBass(Number(rowId), timbreIdx)}
        accent={ACCENT}
      />

      <button
        type="button"
        onClick={() => setCells(emptyCells(bars))}
        className="mt-2 py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all active:scale-[0.97] flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)" }}
      >
        limpar grade
      </button>

      <AddTrackBar accent={ACCENT} trackCount={song.tracks.length} maxTracks={MAX_TRACKS} canAdd={canAdd} onAdd={handleAdd} addLabel="adicionar faixa de baixo" />
      {feedback && <p className="text-center text-[10px] font-mono mt-1.5" style={{ color: ACCENT }}>{feedback}</p>}
    </PhoneShell>
  )
}
