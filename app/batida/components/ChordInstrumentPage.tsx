"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useCurrentSong } from "../lib/CurrentSongContext"
import { PhoneShell } from "./PhoneShell"
import { InstrumentHeader } from "./InstrumentHeader"
import { TimbrePicker } from "./TimbrePicker"
import { BarLengthPicker } from "./BarLengthPicker"
import { BarPager } from "./BarPager"
import { ChordPalette } from "./ChordPalette"
import { ChordStepStrip } from "./ChordStepStrip"
import { GuitarFretboard } from "./GuitarFretboard"
import { PianoKeyboard } from "./PianoKeyboard"
import { AddTrackBar } from "./AddTrackBar"
import { keyDegrees, type ArmedChord } from "../lib/theory"
import { MAX_TRACKS, defaultFx, newTrackId, unlockedDegrees, type BarLength, type InstrumentId } from "../lib/types"

const STEPS_PER_BAR = 16

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
  const [bars, setBars] = useState<BarLength>(1)
  const [activeBar, setActiveBar] = useState(0)
  const [steps, setSteps] = useState<(number | null)[]>(() => Array(STEPS_PER_BAR).fill(null))
  const [armedDegree, setArmedDegree] = useState<number | null>(null)
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

  const allDegrees = keyDegrees(song.rootNote, song.mode)
  const unlocked = unlockedDegrees(song)
  const chordChoices = unlocked.size > 0 ? allDegrees.filter((d) => unlocked.has(d.degree)) : allDegrees

  // mantém um acorde armado sempre que possível — reseta só se o armado
  // atual deixou de ser uma opção válida (tonalidade ou baixo mudou)
  useEffect(() => {
    if (armedDegree !== null && chordChoices.some((c) => c.degree === armedDegree)) return
    setArmedDegree(chordChoices[0]?.degree ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.rootNote, song.mode, unlocked.size])

  const armedInfo = chordChoices.find((c) => c.degree === armedDegree)
  const armedChord: ArmedChord | null = armedInfo ? { rootPc: armedInfo.rootPc, quality: armedInfo.quality, chordName: armedInfo.chordName } : null

  const draftTrack = useMemo(() => ({
    id: `draft-${instrument}`,
    instrument: instrument as InstrumentId,
    fx: defaultFx(),
    data: { kind: "chord" as const, timbre: timbreIdx as 0 | 1 | 2 | 3, bars, steps },
  }), [instrument, timbreIdx, bars, steps])

  useEffect(() => { engine?.setTracks([...song.tracks, draftTrack]) }, [engine, song.tracks, draftTrack])

  const togglePlay = useCallback(() => {
    if (!engine) return
    if (playing) engine.stop(); else engine.play()
    setPlaying(!playing)
  }, [engine, playing])

  const changeBars = (n: BarLength) => {
    setBars(n)
    setActiveBar(0)
    setSteps(Array(n * STEPS_PER_BAR).fill(null))
  }

  const setStep = (localIdx: number, degree: number | null) => {
    const abs = activeBar * STEPS_PER_BAR + localIdx
    setSteps((prev) => {
      const next = prev.length === bars * STEPS_PER_BAR ? [...prev] : Array(bars * STEPS_PER_BAR).fill(null)
      next[abs] = degree
      return next
    })
  }

  const handleNote = (midi: number) => {
    if (instrument === "guitarra") engine?.previewGuitarNote(midi, timbreIdx)
    else engine?.previewPianoNote(midi, timbreIdx)
  }

  const canAdd = song.tracks.length < MAX_TRACKS

  const handleAdd = async () => {
    if (!steps.some((s) => s !== null)) { setFeedback("coloque pelo menos um acorde no trilho"); return }
    const ok = await addTrack({ id: newTrackId(), instrument, fx: defaultFx(), data: { kind: "chord", timbre: timbreIdx as 0 | 1 | 2 | 3, bars, steps } })
    if (ok) { setSteps(Array(bars * STEPS_PER_BAR).fill(null)); setFeedback(`faixa de ${label.toLowerCase()} adicionada`) }
    else setFeedback("limite de 5 faixas atingido")
    window.setTimeout(() => setFeedback(null), 2600)
  }

  const activeSteps = steps.slice(activeBar * STEPS_PER_BAR, activeBar * STEPS_PER_BAR + STEPS_PER_BAR)

  return (
    <PhoneShell accent={accent}>
      <InstrumentHeader accent={accent} label={label} playing={playing} onTogglePlay={togglePlay} />
      <p className="text-white/40 text-xs text-center mb-2 flex-shrink-0">{intro}</p>

      {unlocked.size === 0 && (
        <p className="text-white/25 text-[9px] font-mono text-center mb-2 flex-shrink-0">
          o baixo ainda não definiu graus — mostrando todos os acordes da tonalidade.
        </p>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-2 pr-0.5">
        {instrument === "guitarra" ? (
          <GuitarFretboard chord={armedChord} accent={accent} onNote={handleNote} />
        ) : (
          <PianoKeyboard chord={armedChord} accent={accent} onNote={handleNote} />
        )}

        <ChordPalette chords={chordChoices} armedDegree={armedDegree} onArm={setArmedDegree} accent={accent} />

        <TimbrePicker labels={timbreLabels} effects={timbreEffects} value={timbreIdx} onChange={setTimbreIdx} accent={accent} />
        <BarLengthPicker value={bars} onChange={changeBars} accent={accent} />
        <BarPager bars={bars} activeBar={activeBar} onChange={setActiveBar} playingBar={playing ? playingBar : null} accent={accent} />

        <ChordStepStrip
          steps={activeSteps}
          chords={chordChoices}
          armedDegree={armedDegree}
          currentStep={currentStep}
          playing={playing && playingBar === activeBar}
          onSetStep={setStep}
          accent={accent}
        />

        <button
          type="button"
          onClick={() => setSteps(Array(bars * STEPS_PER_BAR).fill(null))}
          className="py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all active:scale-[0.97] flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)" }}
        >
          limpar
        </button>
      </div>

      <AddTrackBar accent={accent} trackCount={song.tracks.length} maxTracks={MAX_TRACKS} canAdd={canAdd} onAdd={handleAdd} addLabel={`adicionar faixa de ${label.toLowerCase()}`} />
      {feedback && <p className="text-center text-[10px] font-mono mt-1.5" style={{ color: accent }}>{feedback}</p>}
    </PhoneShell>
  )
}
