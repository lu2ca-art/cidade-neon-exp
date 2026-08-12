"use client"

// ─── página PRO — guitarra/piano ────────────────────────────────────────────
// Toque livre no braço/teclado grava cada som na esteira; arraste um chip da
// esteira pro grid pra colocar aquela voicing exata num passo. Sem "acorde
// armado" nem paleta de graus — aqui quem decide as notas é a pessoa, não a
// tonalidade da música.
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useCurrentSong } from "../lib/CurrentSongContext"
import { PhoneShell } from "./PhoneShell"
import { InstrumentHeader } from "./InstrumentHeader"
import { ModeToggle } from "./ModeToggle"
import { TimbrePicker } from "./TimbrePicker"
import { BarLengthPicker } from "./BarLengthPicker"
import { BarPager } from "./BarPager"
import { GuitarFretboard } from "./GuitarFretboard"
import { PianoKeyboard } from "./PianoKeyboard"
import { ChordTray } from "./ChordTray"
import { VoicingStepGrid, stepIndexAtX } from "./VoicingStepGrid"
import { AddTrackBar } from "./AddTrackBar"
import { useNoteTray, type TrayItem } from "../lib/useNoteTray"
import { MAX_TRACKS, defaultFx, newTrackId, type BarLength, type ChordStepEntry, type InstrumentId } from "../lib/types"

const STEPS_PER_BAR = 16
const MAX_FRET = 15
const MIN_BASE_MIDI = 24
const MAX_BASE_MIDI = 84

export function ProChordPage({
  instrument,
  label,
  accent,
  timbreLabels,
  timbreEffects,
}: {
  instrument: "guitarra" | "piano"
  label: string
  accent: string
  timbreLabels: readonly string[]
  timbreEffects: readonly string[]
}) {
  const { song, engine, addTrack } = useCurrentSong()
  const [timbreIdx, setTimbreIdx] = useState(0)
  const [bars, setBars] = useState<BarLength>(1)
  const [activeBar, setActiveBar] = useState(0)
  const [steps, setSteps] = useState<ChordStepEntry[]>(() => Array(STEPS_PER_BAR).fill(null))
  const [playing, setPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState<number | null>(null)
  const [playingBar, setPlayingBar] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [baseFret, setBaseFret] = useState(0)
  const [baseMidi, setBaseMidi] = useState(60)

  const tray = useNoteTray()
  const [dragItem, setDragItem] = useState<TrayItem | null>(null)
  const [dragOverStep, setDragOverStep] = useState<number | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (engine) setPlaying(engine.isPlaying) }, [engine])
  useEffect(() => {
    if (!engine) return
    engine.setOnTick((tick, bar) => { setCurrentStep(tick); setPlayingBar(bar % bars) })
    return () => engine.setOnTick(undefined)
  }, [engine, bars])

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

  const setStep = (localIdx: number, entry: ChordStepEntry) => {
    const abs = activeBar * STEPS_PER_BAR + localIdx
    setSteps((prev) => {
      const next = prev.length === bars * STEPS_PER_BAR ? [...prev] : Array(bars * STEPS_PER_BAR).fill(null)
      next[abs] = entry
      return next
    })
  }

  const handleNote = (midi: number, info?: { string: number; fret: number }) => {
    if (instrument === "guitarra") engine?.previewGuitarNote(midi, timbreIdx)
    else engine?.previewPianoNote(midi, timbreIdx)
    tray.registerNote({ midi, meta: info })
  }

  const updateDragOver = (clientX: number) => {
    const el = gridRef.current
    if (!el) { setDragOverStep(null); return }
    setDragOverStep(stepIndexAtX(el.getBoundingClientRect(), STEPS_PER_BAR, clientX))
  }

  const handleDragStart = (item: TrayItem, clientX: number) => {
    setDragItem(item)
    updateDragOver(clientX)
  }
  const handleDragMove = (clientX: number) => updateDragOver(clientX)
  const handleDragEnd = () => {
    if (dragItem && dragOverStep !== null) {
      setStep(dragOverStep, { midi: dragItem.notes.map((n) => n.midi) })
    }
    setDragItem(null)
    setDragOverStep(null)
  }
  const handlePreviewItem = (item: TrayItem) => {
    engine?.previewVoicing(instrument, item.notes.map((n) => n.midi), timbreIdx)
  }

  const canAdd = song.tracks.length < MAX_TRACKS

  const handleAdd = async () => {
    if (!steps.some((s) => s !== null)) { setFeedback("arraste pelo menos um som da esteira pro grid"); return }
    const ok = await addTrack({ id: newTrackId(), instrument, fx: defaultFx(), data: { kind: "chord", timbre: timbreIdx as 0 | 1 | 2 | 3, bars, steps } })
    if (ok) { setSteps(Array(bars * STEPS_PER_BAR).fill(null)); setFeedback(`faixa de ${label.toLowerCase()} adicionada`) }
    else setFeedback("limite de 5 faixas atingido")
    window.setTimeout(() => setFeedback(null), 2600)
  }

  const activeSteps = steps.slice(activeBar * STEPS_PER_BAR, activeBar * STEPS_PER_BAR + STEPS_PER_BAR)

  return (
    <PhoneShell accent={accent}>
      <InstrumentHeader accent={accent} label={`${label} · PRO`} playing={playing} onTogglePlay={togglePlay} />
      <ModeToggle mode="pro" instrument={instrument} accent={accent} />
      <p className="text-white/40 text-xs text-center mb-2 flex-shrink-0">
        {instrument === "guitarra"
          ? "toque em qualquer corda e casa — cada som vira um item na esteira."
          : "toque em qualquer tecla — cada som vira um item na esteira."}
      </p>

      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-2 pr-0.5">
        {instrument === "guitarra" ? (
          <>
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[9px] font-mono text-white/30 tracking-widest">
                {baseFret === 0 ? "SOLTA" : `${baseFret + 1}ª`}–{baseFret + 5}ª CASA
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setBaseFret((f) => Math.max(0, f - 1))}
                  className="w-6 h-6 rounded-md text-[11px] font-mono active:scale-90"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)" }}
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => setBaseFret((f) => Math.min(MAX_FRET, f + 1))}
                  className="w-6 h-6 rounded-md text-[11px] font-mono active:scale-90"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)" }}
                >
                  +
                </button>
              </div>
            </div>
            <GuitarFretboard chord={null} accent={accent} onNote={handleNote} mode="free" baseFret={baseFret} />
          </>
        ) : (
          <>
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[9px] font-mono text-white/30 tracking-widest">OITAVA {Math.floor(baseMidi / 12) - 1}</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setBaseMidi((m) => Math.max(MIN_BASE_MIDI, m - 12))}
                  className="w-6 h-6 rounded-md text-[11px] font-mono active:scale-90"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)" }}
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => setBaseMidi((m) => Math.min(MAX_BASE_MIDI, m + 12))}
                  className="w-6 h-6 rounded-md text-[11px] font-mono active:scale-90"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)" }}
                >
                  +
                </button>
              </div>
            </div>
            <PianoKeyboard chord={null} accent={accent} onNote={handleNote} baseMidi={baseMidi} />
          </>
        )}

        <ChordTray
          items={tray.items}
          accent={accent}
          onPreview={handlePreviewItem}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onClear={tray.clear}
        />

        <TimbrePicker labels={timbreLabels} effects={timbreEffects} value={timbreIdx} onChange={setTimbreIdx} accent={accent} />
        <BarLengthPicker value={bars} onChange={changeBars} accent={accent} />
        <BarPager bars={bars} activeBar={activeBar} onChange={setActiveBar} playingBar={playing ? playingBar : null} accent={accent} />

        <VoicingStepGrid
          steps={activeSteps}
          currentStep={currentStep}
          playing={playing && playingBar === activeBar}
          dragOverStep={dragOverStep}
          accent={accent}
          onClearStep={(idx) => setStep(idx, null)}
          gridRef={gridRef}
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
