"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useCurrentSong } from "../lib/CurrentSongContext"
import { PhoneShell } from "./PhoneShell"
import { InstrumentHeader } from "./InstrumentHeader"
import { ModeToggle } from "./ModeToggle"
import { TimbrePicker } from "./TimbrePicker"
import { BarLengthPicker } from "./BarLengthPicker"
import { BarPager } from "./BarPager"
import { ChordPalette } from "./ChordPalette"
import { AutoplayPicker } from "./AutoplayPicker"
import { ChordStepStrip } from "./ChordStepStrip"
import { GuitarFretboard } from "./GuitarFretboard"
import { PianoKeyboard } from "./PianoKeyboard"
import { AddTrackBar } from "./AddTrackBar"
import { keyDegrees, type ArmedChord } from "../lib/theory"
import { patternsFor, applyPatternToBar, type StrumPattern } from "../lib/patterns"
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

  const handleNote = useCallback((midi: number) => {
    if (instrument === "guitarra") engine?.previewGuitarNote(midi, timbreIdx)
    else engine?.previewPianoNote(midi, timbreIdx)
  }, [engine, instrument, timbreIdx])

  // ── TECLADO DESKTOP como MIDI controller ──
  // Layout FL Studio: linhas Z-M (oitava baixa) + Q-P (oitava alta).
  // Números 1-7 armam graus do acorde. Shift+↑/↓ transpõem oitava.
  const [octaveShift, setOctaveShift] = useState(0)
  const octaveShiftRef = useRef(octaveShift)
  useEffect(() => { octaveShiftRef.current = octaveShift }, [octaveShift])

  useEffect(() => {
    // Mapa de tecla → semitom relativo a C4 (MIDI 60)
    // Linha baixa (Z/X/C/V/B/N/M são teclas brancas, S/D/G/H/J pretas)
    const KEY_TO_SEMITONE: Record<string, number> = {
      // Oitava baixa (C4 = 60)
      "z": 0, "s": 1, "x": 2, "d": 3, "c": 4, "v": 5, "g": 6,
      "b": 7, "h": 8, "n": 9, "j": 10, "m": 11,
      ",": 12, "l": 13, ".": 14, ";": 15, "/": 16,
      // Oitava alta (C5 = 72)
      "q": 12, "2": 13, "w": 14, "3": 15, "e": 16, "r": 17, "5": 18,
      "t": 19, "6": 20, "y": 21, "7": 22, "u": 23,
      "i": 24, "9": 25, "o": 26, "0": 27, "p": 28,
    }
    const heldKeys = new Set<string>()

    const onDown = (e: KeyboardEvent) => {
      // Ignora quando digitando em input/textarea
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return
      const k = e.key.toLowerCase()

      // Graus do acorde: 1-7 armam
      if (["1", "2", "3", "4", "5", "6", "7"].includes(k) && !e.shiftKey) {
        const deg = parseInt(k, 10)
        if (chordChoices.some((c) => c.degree === deg)) {
          e.preventDefault()
          setArmedDegree(deg)
          return
        }
      }

      // Shift + seta ↑/↓ transpõe oitava
      if (e.shiftKey && k === "arrowup") { e.preventDefault(); setOctaveShift((v) => Math.min(3, v + 1)); return }
      if (e.shiftKey && k === "arrowdown") { e.preventDefault(); setOctaveShift((v) => Math.max(-2, v - 1)); return }

      // Notas
      const semi = KEY_TO_SEMITONE[k]
      if (semi === undefined || e.repeat || heldKeys.has(k)) return
      e.preventDefault()
      heldKeys.add(k)
      const midi = 60 + semi + octaveShiftRef.current * 12
      handleNote(midi)
    }
    const onUp = (e: KeyboardEvent) => {
      heldKeys.delete(e.key.toLowerCase())
    }
    window.addEventListener("keydown", onDown)
    window.addEventListener("keyup", onUp)
    return () => {
      window.removeEventListener("keydown", onDown)
      window.removeEventListener("keyup", onUp)
    }
  }, [handleNote, chordChoices])

  const canAdd = song.tracks.length < MAX_TRACKS

  const handleAdd = async () => {
    if (!steps.some((s) => s !== null)) { setFeedback("coloque pelo menos um acorde no trilho"); return }
    const ok = await addTrack({ id: newTrackId(), instrument, fx: defaultFx(), data: { kind: "chord", timbre: timbreIdx as 0 | 1 | 2 | 3, bars, steps } })
    if (ok) { setSteps(Array(bars * STEPS_PER_BAR).fill(null)); setFeedback(`faixa de ${label.toLowerCase()} adicionada`) }
    else setFeedback("limite de 5 faixas atingido")
    window.setTimeout(() => setFeedback(null), 2600)
  }

  const activeSteps = steps.slice(activeBar * STEPS_PER_BAR, activeBar * STEPS_PER_BAR + STEPS_PER_BAR)

  const patterns = useMemo(() => patternsFor(instrument), [instrument])
  const handleApplyPattern = (pattern: StrumPattern) => {
    if (armedDegree === null) { setFeedback("arme um acorde antes de aplicar o padrão"); return }
    setSteps((prev) => {
      const base = prev.length === bars * STEPS_PER_BAR ? prev : Array(bars * STEPS_PER_BAR).fill(null)
      return applyPatternToBar(base, activeBar * STEPS_PER_BAR, pattern, armedDegree)
    })
  }

  return (
    <PhoneShell accent={accent}>
      <InstrumentHeader accent={accent} label={label} playing={playing} onTogglePlay={togglePlay} />
      <ModeToggle mode="play" instrument={instrument} accent={accent} />
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
        <p className="text-white/30 text-[8px] font-mono text-center leading-tight flex-shrink-0 hidden md:block">
          teclado: <span style={{ color: accent }}>Z-M</span> / <span style={{ color: accent }}>Q-P</span> tocam · <span style={{ color: accent }}>1-7</span> armam grau · <span style={{ color: accent }}>Shift+↑↓</span> oitava{octaveShift !== 0 ? ` (${octaveShift > 0 ? "+" : ""}${octaveShift})` : ""}
        </p>

        <ChordPalette chords={chordChoices} armedDegree={armedDegree} onArm={setArmedDegree} accent={accent} />

        <AutoplayPicker patterns={patterns} onApply={handleApplyPattern} accent={accent} />

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
