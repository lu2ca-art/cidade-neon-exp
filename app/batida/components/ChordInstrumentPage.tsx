"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useCurrentSong } from "../lib/CurrentSongContext"
import { PhoneShell } from "./PhoneShell"
import { InstrumentHeader } from "./InstrumentHeader"
import { TimbrePicker } from "./TimbrePicker"
import { ChordSteps } from "./ChordSteps"
import { AddTrackBar } from "./AddTrackBar"
import { keyDegrees } from "../lib/theory"
import { MAX_TRACKS, defaultFx, newTrackId, unlockedDegrees, type InstrumentId } from "../lib/types"

const STEPS = 16

export function ChordInstrumentPage({
  instrument,
  label,
  accent,
  timbreLabels,
  timbreEffects,
  intro,
}: {
  instrument: "guitarra" | "piano"
  label: string
  accent: string
  timbreLabels: readonly string[]
  timbreEffects: readonly string[]
  intro: string
}) {
  const { song, engine, addTrack } = useCurrentSong()
  const [timbreIdx, setTimbreIdx] = useState(0)
  const [steps, setSteps] = useState<(number | null)[]>(() => Array(STEPS).fill(null))
  const [playing, setPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => { if (engine) setPlaying(engine.isPlaying) }, [engine])
  useEffect(() => {
    if (!engine) return
    engine.setOnTick((tick) => setCurrentStep(tick))
    return () => engine.setOnTick(undefined)
  }, [engine])

  const allDegrees = keyDegrees(song.rootNote, song.mode)
  const unlocked = unlockedDegrees(song)
  const chordChoices = unlocked.size > 0 ? allDegrees.filter((d) => unlocked.has(d.degree)) : allDegrees

  const draftTrack = useMemo(() => ({
    id: `draft-${instrument}`,
    instrument: instrument as InstrumentId,
    fx: defaultFx(),
    data: { kind: "chord" as const, timbre: timbreIdx as 0 | 1 | 2 | 3, steps },
  }), [instrument, timbreIdx, steps])

  useEffect(() => { engine?.setTracks([...song.tracks, draftTrack]) }, [engine, song.tracks, draftTrack])

  const togglePlay = useCallback(() => {
    if (!engine) return
    if (playing) engine.stop(); else engine.play()
    setPlaying(!playing)
  }, [engine, playing])

  const setStep = (stepIdx: number, degree: number | null) => {
    setSteps((prev) => prev.map((v, i) => (i === stepIdx ? degree : v)))
  }

  const canAdd = song.tracks.length < MAX_TRACKS

  const handleAdd = async () => {
    if (!steps.some((s) => s !== null)) { setFeedback("preencha pelo menos um passo com um acorde"); return }
    const ok = await addTrack({ id: newTrackId(), instrument, fx: defaultFx(), data: { kind: "chord", timbre: timbreIdx as 0 | 1 | 2 | 3, steps } })
    if (ok) { setSteps(Array(STEPS).fill(null)); setFeedback(`faixa de ${label.toLowerCase()} adicionada`) }
    else setFeedback("limite de 5 faixas atingido")
    window.setTimeout(() => setFeedback(null), 2600)
  }

  return (
    <PhoneShell accent={accent}>
      <InstrumentHeader accent={accent} label={label} playing={playing} onTogglePlay={togglePlay} />
      <p className="text-white/40 text-xs text-center mb-2 flex-shrink-0">{intro}</p>

      {unlocked.size === 0 && (
        <p className="text-white/25 text-[9px] font-mono text-center mb-2 flex-shrink-0">
          o baixo ainda não definiu graus — mostrando todos os acordes da tonalidade.
        </p>
      )}

      <TimbrePicker labels={timbreLabels} effects={timbreEffects} value={timbreIdx} onChange={setTimbreIdx} accent={accent} />

      <ChordSteps
        steps={steps}
        chords={chordChoices}
        currentStep={currentStep}
        playing={playing}
        onSetStep={setStep}
        onPreviewChord={(degree) => engine?.previewChord(instrument, degree, timbreIdx)}
        accent={accent}
      />

      <button
        type="button"
        onClick={() => setSteps(Array(STEPS).fill(null))}
        className="mt-2 py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all active:scale-[0.97] flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)" }}
      >
        limpar
      </button>

      <AddTrackBar accent={accent} trackCount={song.tracks.length} maxTracks={MAX_TRACKS} canAdd={canAdd} onAdd={handleAdd} addLabel={`adicionar faixa de ${label.toLowerCase()}`} />
      {feedback && <p className="text-center text-[10px] font-mono mt-1.5" style={{ color: accent }}>{feedback}</p>}
    </PhoneShell>
  )
}
