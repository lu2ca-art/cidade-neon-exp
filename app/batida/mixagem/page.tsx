"use client"

import { useCallback, useEffect, useState } from "react"
import { useCurrentSong } from "../lib/CurrentSongContext"
import { PhoneShell } from "../components/PhoneShell"
import { InstrumentHeader } from "../components/InstrumentHeader"
import { renderSongOffline, audioBufferToWav, downloadBlob } from "../lib/render"
import { timbreLabel } from "../lib/format"
import { INSTRUMENT_COLOR, INSTRUMENT_LABEL, type Track } from "../lib/types"

const ACCENT = "#A78BFA"

export default function MixagemPage() {
  const { song, engine, updateTrackFx, removeTrack } = useCurrentSong()
  const [playing, setPlaying] = useState(false)
  const [masterVolume, setMasterVolume] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState<string | null>(null)

  useEffect(() => { if (engine) setPlaying(engine.isPlaying) }, [engine])
  useEffect(() => { engine?.setTracks(song.tracks) }, [engine, song.tracks])

  const togglePlay = useCallback(() => {
    if (!engine) return
    if (playing) engine.stop(); else engine.play()
    setPlaying(!playing)
  }, [engine, playing])

  const handleMasterVolume = (v: number) => {
    setMasterVolume(v)
    engine?.setMasterVolume(v)
  }

  const handleExport = async () => {
    if (song.tracks.length === 0) { setExportMsg("adicione pelo menos uma faixa antes de exportar"); return }
    setExporting(true)
    setExportMsg("renderizando o mixdown...")
    try {
      const buffer = await renderSongOffline(song)
      const blob = audioBufferToWav(buffer)
      const filename = `${(song.name || "b4tida-mix").replace(/\s+/g, "-").toLowerCase()}.wav`
      downloadBlob(blob, filename)
      setExportMsg("áudio exportado — confira os downloads")
    } catch {
      setExportMsg("não consegui renderizar o áudio agora, tenta de novo")
    } finally {
      setExporting(false)
      window.setTimeout(() => setExportMsg(null), 4000)
    }
  }

  return (
    <PhoneShell accent={ACCENT}>
      <InstrumentHeader accent={ACCENT} label="MIXAGEM" playing={playing} onTogglePlay={togglePlay} />
      <p className="text-white/40 text-xs text-center mb-2 flex-shrink-0">
        ajuste volume, reverb e delay de cada faixa, depois exporte o áudio final.
      </p>

      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-2 pr-0.5">
        {song.tracks.length === 0 && (
          <p className="text-white/25 text-[10px] font-mono text-center py-6">nenhuma faixa pra mixar ainda</p>
        )}
        {song.tracks.map((t) => (
          <TrackStrip key={t.id} track={t} onChangeFx={(fx) => updateTrackFx(t.id, fx)} onRemove={() => removeTrack(t.id)} />
        ))}
      </div>

      <div className="mt-2 flex-shrink-0 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[9px] font-mono text-white/30 tracking-widest w-16 flex-shrink-0">MASTER</span>
          <input type="range" min={0} max={1.3} step={0.01} value={masterVolume} onChange={(e) => handleMasterVolume(Number(e.target.value))} className="flex-1" style={{ accentColor: ACCENT }} />
          <span className="text-[9px] font-mono text-white/40 w-8 text-right flex-shrink-0">{Math.round(masterVolume * 100)}%</span>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="w-full py-2.5 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all active:scale-[0.97] disabled:opacity-50"
          style={{ background: `${ACCENT}22`, border: `1px solid ${ACCENT}70`, color: ACCENT }}
        >
          {exporting ? "renderizando..." : "salvar áudio (.wav)"}
        </button>
        {exportMsg && <p className="text-center text-[9px] font-mono mt-1.5 text-white/40">{exportMsg}</p>}
      </div>
    </PhoneShell>
  )
}

function TrackStrip({ track, onChangeFx, onRemove }: { track: Track; onChangeFx: (fx: Partial<Track["fx"]>) => void; onRemove: () => void }) {
  const color = INSTRUMENT_COLOR[track.instrument]
  return (
    <div className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${color}30` }}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-[10px] font-mono" style={{ color }}>{INSTRUMENT_LABEL[track.instrument]}</span>
          <span className="text-[9px] font-mono text-white/30 ml-2">{timbreLabel(track)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChangeFx({ muted: !track.fx.muted })}
            className="text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded"
            style={{ background: track.fx.muted ? "rgba(255,80,80,0.2)" : "rgba(255,255,255,0.06)", color: track.fx.muted ? "#ff8080" : "rgba(255,255,255,0.4)" }}
          >
            {track.fx.muted ? "mudo" : "audível"}
          </button>
          <button type="button" onClick={onRemove} aria-label="Remover faixa" className="text-white/30 text-[12px] px-1">×</button>
        </div>
      </div>
      <MiniSlider label="VOL" value={track.fx.volume} onChange={(v) => onChangeFx({ volume: v })} color={color} />
      <MiniSlider label="REV" value={track.fx.reverb} onChange={(v) => onChangeFx({ reverb: v })} color={color} />
      <MiniSlider label="DLY" value={track.fx.delay} onChange={(v) => onChangeFx({ delay: v })} color={color} />
    </div>
  )
}

function MiniSlider({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-mono text-white/25 tracking-widest w-8 flex-shrink-0">{label}</span>
      <input type="range" min={0} max={1} step={0.01} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 h-3" style={{ accentColor: color }} />
      <span className="text-[8px] font-mono text-white/30 w-7 text-right flex-shrink-0">{Math.round(value * 100)}%</span>
    </div>
  )
}
