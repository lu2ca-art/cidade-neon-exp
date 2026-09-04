"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useCurrentSong } from "../lib/CurrentSongContext"
import { PhoneShell } from "../components/PhoneShell"
import { InstrumentHeader } from "../components/InstrumentHeader"
import { AddTrackBar } from "../components/AddTrackBar"
import { INSTRUMENT_COLOR, MAX_TRACKS, MAX_VOICE_BARS, newTrackId, type TrackFx } from "../lib/types"

const ACCENT = INSTRUMENT_COLOR.voz
const BAR_CHOICES = [1, 2, 4, 8, 16]

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
  return candidates.find((c) => MediaRecorder.isTypeSupported?.(c))
}

type RecState = "idle" | "counting" | "recording" | "reviewing"

// Compassos de count-in ANTES de começar a gravar de verdade — dá tempo
// pro artista se preparar. Configurável se quiser mais/menos.
const COUNT_IN_BARS = 2
// MediaRecorder tem latência interna de ~80-150ms entre .start() e o áudio
// realmente começar a ser capturado. Antecipar chama .start() antes do
// compasso alvo pra compensar, garantindo que o compasso 1 do blob
// corresponde ao compasso 1 do metronomo.
const RECORDER_START_LEAD_MS = 120

export default function VozPage() {
  const { song, engine, addTrack } = useCurrentSong()
  const [barsChoice, setBarsChoice] = useState(4)
  const [recState, setRecState] = useState<RecState>("idle")
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedBars, setRecordedBars] = useState<number | null>(null)
  const [draftFx, setDraftFx] = useState<TrackFx>({ volume: 0.9, reverb: 0.12, delay: 0, muted: false })
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0) // 0..1 durante a gravação
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  // Countdown visível 0..COUNT_IN_BARS (mostra "1", "2" antes de gravar)
  const [countInBeat, setCountInBeat] = useState(0)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timeoutsRef = useRef<number[]>([])
  const progressRafRef = useRef<number | null>(null)

  useEffect(() => { if (engine) setPlaying(engine.isPlaying) }, [engine])

  useEffect(() => () => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id))
    if (progressRafRef.current) cancelAnimationFrame(progressRafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }, [])

  const draftTrack = useMemo(() => {
    if (!recordedBlob || recordedBars === null) return null
    return { id: "draft-voz", instrument: "voz" as const, fx: draftFx, data: { kind: "voice" as const, bars: recordedBars, blob: recordedBlob } }
    // fx muda ao vivo via setTrackFx (abaixo) — não precisa recompor o draft
    // inteiro (e redecodificar o blob) a cada arraste de slider
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordedBlob, recordedBars])

  // registra o áudio decodificado no motor e junta ao mix ao vivo pra prévia
  // — só quando o BLOB muda (nova gravação), não a cada ajuste de fx
  useEffect(() => {
    if (!engine || !recordedBlob || recordedBars === null) return
    let cancelled = false
    engine.decodeVoiceBlob("draft-voz", recordedBlob).then(() => {
      if (!cancelled && draftTrack) engine.setTracks([...song.tracks, draftTrack])
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, recordedBlob, recordedBars])

  useEffect(() => {
    if (!engine || draftTrack) return
    engine.setTracks(song.tracks)
  }, [engine, song.tracks, draftTrack])

  useEffect(() => {
    if (!engine || !draftTrack) return
    engine.setTrackFx("draft-voz", draftFx)
  }, [engine, draftFx, draftTrack])

  const togglePlay = useCallback(() => {
    if (!engine) return
    if (playing) engine.stop(); else engine.play()
    setPlaying(!playing)
  }, [engine, playing])

  const clearTimeouts = () => { timeoutsRef.current.forEach((id) => window.clearTimeout(id)); timeoutsRef.current = [] }

  const startRecording = useCallback(async () => {
    if (!engine) return
    setError(null)
    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      }
    } catch {
      setError("não consegui acessar o microfone — verifique a permissão do navegador")
      return
    }

    if (!engine.isPlaying) { engine.play(); setPlaying(true) }

    setRecState("counting")
    setCountInBeat(0)
    const nextBar = engine.getNextBarStartTime()
    const secPerBar = engine.getSecPerBar()
    // Target = próximo compasso + N compassos de count-in
    const targetTime = nextBar + COUNT_IN_BARS * secPerBar
    const nowCtx = engine.ctx.currentTime
    const msUntilTarget = Math.max(30, (targetTime - nowCtx) * 1000)
    const durationMs = barsChoice * secPerBar * 1000

    // Countdown visível — dispara "1", "2" a cada compasso ANTES do target
    for (let i = 0; i < COUNT_IN_BARS; i++) {
      const beatTime = nextBar + i * secPerBar
      const msUntilBeat = Math.max(0, (beatTime - nowCtx) * 1000)
      const beatId = window.setTimeout(() => setCountInBeat(i + 1), msUntilBeat)
      timeoutsRef.current.push(beatId)
    }

    // Antecipa .start() do MediaRecorder pra compensar latência interna
    // (o áudio real começa ~120ms depois do .start()).
    const recorderStartMs = Math.max(30, msUntilTarget - RECORDER_START_LEAD_MS)

    const startId = window.setTimeout(() => {
      const mimeType = pickMimeType()
      const stream = streamRef.current
      if (!stream) return
      chunksRef.current = []
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
        setRecordedBlob(blob)
        setRecordedBars(barsChoice)
        setRecState("reviewing")
        setCountInBeat(0)
        setProgress(0)
        if (progressRafRef.current) cancelAnimationFrame(progressRafRef.current)
      }
      recorderRef.current = recorder
      recorder.start()
    }, recorderStartMs)
    timeoutsRef.current.push(startId)

    // No tempo EXATO do compasso alvo, muda pra "recording" + inicia progresso
    const targetId = window.setTimeout(() => {
      setRecState("recording")
      setCountInBeat(0)
      const recStart = performance.now()
      const tick = () => {
        const elapsed = performance.now() - recStart
        setProgress(Math.min(1, elapsed / durationMs))
        if (elapsed < durationMs) progressRafRef.current = requestAnimationFrame(tick)
      }
      progressRafRef.current = requestAnimationFrame(tick)
    }, msUntilTarget)
    timeoutsRef.current.push(targetId)

    // Stop: target + duração dos compassos gravados. Antecipa STOP também
    // pra compensar latência (áudio real termina ~120ms após .stop()).
    const stopId = window.setTimeout(() => {
      try { recorderRef.current?.stop() } catch {}
    }, msUntilTarget + durationMs - RECORDER_START_LEAD_MS)
    timeoutsRef.current.push(stopId)
  }, [engine, barsChoice])

  const cancelRecording = () => {
    clearTimeouts()
    if (progressRafRef.current) cancelAnimationFrame(progressRafRef.current)
    try { recorderRef.current?.stop() } catch {}
    setRecState("idle")
    setProgress(0)
  }

  const discardTake = () => {
    setRecordedBlob(null)
    setRecordedBars(null)
    setRecState("idle")
  }

  const canAdd = song.tracks.length < MAX_TRACKS

  const handleAdd = async () => {
    if (!recordedBlob || recordedBars === null) return
    const id = newTrackId()
    if (engine) await engine.decodeVoiceBlob(id, recordedBlob)
    const ok = await addTrack({ id, instrument: "voz", fx: draftFx, data: { kind: "voice", bars: recordedBars, blob: recordedBlob } })
    if (ok) {
      setRecordedBlob(null)
      setRecordedBars(null)
      setRecState("idle")
      setFeedback("faixa de voz adicionada — salvo automaticamente")
    } else {
      setFeedback("limite de 5 faixas atingido")
    }
    window.setTimeout(() => setFeedback(null), 2800)
  }

  return (
    <PhoneShell accent={ACCENT}>
      <InstrumentHeader accent={ACCENT} label="VOZ" playing={playing} onTogglePlay={togglePlay} />
      <p className="text-white/40 text-xs text-center mb-2 flex-shrink-0">
        grave por cima da música (overdub) — até {MAX_VOICE_BARS} compassos por gravação.
      </p>

      <div className="flex-1 flex flex-col justify-center gap-3 min-h-0">
        {/* duração */}
        <div>
          <p className="text-white/25 text-[9px] font-mono tracking-widest mb-1.5">COMPASSOS</p>
          <div className="grid grid-cols-5 gap-1.5">
            {BAR_CHOICES.map((b) => (
              <button
                key={b}
                type="button"
                disabled={recState !== "idle"}
                onClick={() => setBarsChoice(b)}
                className="py-2 rounded-lg text-[10px] font-mono transition-all active:scale-95 disabled:opacity-40"
                style={{
                  background: barsChoice === b ? `${ACCENT}25` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${barsChoice === b ? ACCENT : "rgba(255,255,255,0.12)"}`,
                  color: barsChoice === b ? ACCENT : "rgba(255,255,255,0.4)",
                }}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* transporte de gravação */}
        <div className="rounded-xl p-4 flex flex-col items-center gap-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
          {recState === "idle" && (
            <button
              type="button"
              onClick={startRecording}
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{ background: `${ACCENT}20`, border: `2px solid ${ACCENT}` }}
              aria-label="Gravar"
            >
              <span className="w-6 h-6 rounded-full" style={{ background: ACCENT }} />
            </button>
          )}
          {recState === "counting" && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                {Array.from({ length: COUNT_IN_BARS }).map((_, i) => (
                  <span
                    key={i}
                    className="flex h-10 w-10 items-center justify-center rounded-full font-mono text-lg font-bold transition-all"
                    style={{
                      background: countInBeat > i ? ACCENT : "rgba(255,255,255,0.05)",
                      color: countInBeat > i ? "#000" : "rgba(255,255,255,0.35)",
                      transform: countInBeat === i + 1 ? "scale(1.15)" : "scale(1)",
                      boxShadow: countInBeat === i + 1 ? `0 0 16px ${ACCENT}` : "none",
                    }}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
              <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: ACCENT }}>
                count-in · começa no compasso {COUNT_IN_BARS + 1}
              </p>
              <button type="button" onClick={cancelRecording} className="text-[9px] font-mono uppercase tracking-widest text-white/40">cancelar</button>
            </div>
          )}
          {recState === "recording" && (
            <>
              <p className="text-[11px] font-mono animate-pulse" style={{ color: ACCENT }}>gravando...</p>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, background: ACCENT }} />
              </div>
              <button type="button" onClick={cancelRecording} className="text-[9px] font-mono uppercase tracking-widest text-white/40">cancelar</button>
            </>
          )}
          {recState === "reviewing" && (
            <>
              <p className="text-[11px] font-mono text-white/60">take gravado — {recordedBars} compassos</p>
              <div className="flex gap-2 w-full">
                <button type="button" onClick={discardTake} className="flex-1 py-2 rounded-lg text-[9px] font-mono uppercase tracking-widest" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)" }}>
                  descartar
                </button>
                <button type="button" onClick={startRecording} className="flex-1 py-2 rounded-lg text-[9px] font-mono uppercase tracking-widest" style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}60`, color: ACCENT }}>
                  regravar
                </button>
              </div>
              <p className="text-white/25 text-[8px] font-mono text-center">toque em play no topo pra ouvir o take junto com a música</p>
            </>
          )}
          {error && <p className="text-red-400 text-[9px] font-mono text-center">{error}</p>}
        </div>

        {/* fx do take */}
        {recState === "reviewing" && (
          <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <FxSlider label="VOLUME" value={draftFx.volume} onChange={(v) => setDraftFx((f) => ({ ...f, volume: v }))} accent={ACCENT} />
            <FxSlider label="REVERB" value={draftFx.reverb} onChange={(v) => setDraftFx((f) => ({ ...f, reverb: v }))} accent={ACCENT} />
            <FxSlider label="DELAY" value={draftFx.delay} onChange={(v) => setDraftFx((f) => ({ ...f, delay: v }))} accent={ACCENT} />
          </div>
        )}
      </div>

      <AddTrackBar
        accent={ACCENT}
        trackCount={song.tracks.length}
        maxTracks={MAX_TRACKS}
        canAdd={canAdd && recState === "reviewing"}
        onAdd={handleAdd}
        addLabel="adicionar faixa de voz"
        disabledReason={recState !== "reviewing" ? "grave um take pra poder adicionar" : undefined}
      />
      {feedback && <p className="text-center text-[10px] font-mono mt-1.5" style={{ color: ACCENT }}>{feedback}</p>}
    </PhoneShell>
  )
}

function FxSlider({ label, value, onChange, accent }: { label: string; value: number; onChange: (v: number) => void; accent: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-mono text-white/30 tracking-widest w-14 flex-shrink-0">{label}</span>
      <input type="range" min={0} max={1} step={0.01} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1" style={{ accentColor: accent }} />
      <span className="text-[9px] font-mono text-white/40 w-8 text-right flex-shrink-0">{Math.round(value * 100)}%</span>
    </div>
  )
}
