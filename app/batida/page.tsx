"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import { useCurrentSong } from "./lib/CurrentSongContext"
import { PhoneShell } from "./components/PhoneShell"
import { keyDegrees, NOTE_NAMES } from "./lib/theory"
import { INSTRUMENT_COLOR, INSTRUMENT_LABEL, MAX_SLOTS, MAX_TRACKS, type InstrumentId } from "./lib/types"
import { timbreLabel } from "./lib/format"

const ACCENT = "#FF6B6B"

const INSTRUMENT_ROUTES: { id: InstrumentId; href: string; icon: string }[] = [
  { id: "bateria", href: "/batida/bateria", icon: "🥁" },
  { id: "baixo", href: "/batida/baixo", icon: "🎸" },
  { id: "guitarra", href: "/batida/guitarra", icon: "🎼" },
  { id: "piano", href: "/batida/piano", icon: "🎹" },
  { id: "voz", href: "/batida/voz", icon: "🎤" },
]

export default function BatidaHubPage() {
  const router = useRouter()
  const { completeConfirmation, updateCinematicStep, state } = useGameFunnel()
  const { song, slotIndex, slots, slotsLoaded, openSlot, startNewSong, deleteSlot, patchSong, removeTrack } = useCurrentSong()
  const [justCompleted, setJustCompleted] = useState(false)

  useEffect(() => { updateCinematicStep("confirmation-2") }, [updateCinematicStep])

  // completa a missão quando os 4 slots têm pelo menos 1 faixa cada
  useEffect(() => {
    if (!slotsLoaded) return
    const filled = slots.filter((s) => s && s.tracks.length > 0).length
    if (filled >= MAX_SLOTS && !state.confirmations.c2.done) {
      completeConfirmation(2, { savedCount: MAX_SLOTS })
      setJustCompleted(true)
    }
  }, [slots, slotsLoaded, state.confirmations.c2.done, completeConfirmation])

  const degrees = keyDegrees(song.rootNote, song.mode)
  const keyLabel = `${NOTE_NAMES[song.rootNote]}${song.mode === "minor" ? "m" : ""}`

  return (
    <PhoneShell accent={ACCENT}>
      <div className="flex items-center justify-between mb-1 flex-shrink-0">
        <div className="w-8 h-8" />
        <p className="text-white/20 text-[9px] tracking-[0.3em] uppercase font-mono">B4TIDA</p>
        <button
          type="button"
          onClick={() => router.push("/?screen=home")}
          aria-label="Inicio"
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.12)" }}
        >
          <svg className="w-3.5 h-3.5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <rect x="5" y="3" width="14" height="18" rx="3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none" />
          </svg>
        </button>
      </div>

      <p className="text-white/40 text-xs text-center mb-3 flex-shrink-0">
        monte sua música por camadas — bateria, baixo, harmonia e voz. salve até 4 músicas.
      </p>

      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-3 pr-0.5">
        {/* slots de música */}
        <div>
          <p className="text-white/25 text-[9px] font-mono tracking-widest mb-1.5">SUAS MÚSICAS</p>
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: MAX_SLOTS }, (_, i) => {
              const s = slots[i]
              const active = slotIndex === i
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => openSlot(i)}
                  className="relative py-2.5 rounded-xl text-[9px] font-mono uppercase tracking-wide transition-all active:scale-95"
                  style={{
                    background: active ? `${ACCENT}25` : s ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${active ? ACCENT : s ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)"}`,
                    color: active ? ACCENT : s ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)",
                  }}
                >
                  {s ? `#${i + 1}` : "vazio"}
                  {s && <span className="block text-[7px] text-white/30 mt-0.5">{s.tracks.length} faixas</span>}
                  {s && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); deleteSlot(i) }}
                      aria-label={`Apagar música ${i + 1}`}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: "#1a0a0e", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.6)", fontSize: 9, lineHeight: 1 }}
                    >
                      ×
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={startNewSong}
            className="w-full mt-1.5 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest transition-all active:scale-95"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.35)" }}
          >
            + nova música (sem salvar ainda)
          </button>
        </div>

        {/* tonalidade + bpm */}
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-mono text-white/30 tracking-widest">TONALIDADE</span>
            <span className="text-[11px] font-mono" style={{ color: ACCENT }}>
              {keyLabel} {song.mode === "major" ? "maior" : "menor"}
            </span>
          </div>
          <p className="text-white/25 text-[8px] font-mono mb-2">
            {song.keySetBy === "baixo" ? "definida na página do baixo" : "padrão — defina de verdade na página do baixo"}
          </p>
          <div className="flex flex-wrap gap-1">
            {degrees.map((d) => (
              <span key={d.degree} className="px-1.5 py-0.5 rounded text-[8px] font-mono" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}>
                {d.chordName}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[9px] font-mono text-white/30 tracking-widest flex-shrink-0">BPM</span>
            <input
              type="range"
              min={70}
              max={160}
              value={song.bpm}
              onChange={(e) => patchSong((prev) => ({ ...prev, bpm: Number(e.target.value) }))}
              className="flex-1 accent-[#FF6B6B]"
            />
            <span className="text-[11px] font-mono text-white/60 w-8 text-right flex-shrink-0">{song.bpm}</span>
          </div>
        </div>

        {/* faixas da música atual */}
        <div>
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-[9px] font-mono text-white/30 tracking-widest">FAIXAS ({song.tracks.length}/{MAX_TRACKS})</span>
          </div>
          {song.tracks.length === 0 ? (
            <p className="text-white/25 text-[10px] font-mono text-center py-3">nenhuma faixa ainda — comece pela bateria</p>
          ) : (
            <div className="flex flex-col gap-1">
              {song.tracks.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${INSTRUMENT_COLOR[t.instrument]}30` }}>
                  <span className="text-[10px] font-mono" style={{ color: INSTRUMENT_COLOR[t.instrument] }}>{INSTRUMENT_LABEL[t.instrument]}</span>
                  <span className="text-[9px] font-mono text-white/35">{timbreLabel(t)}</span>
                  <button type="button" onClick={() => removeTrack(t.id)} aria-label="Remover faixa" className="text-white/30 text-[11px] px-1">×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* navegação por instrumento */}
        <div>
          <p className="text-white/25 text-[9px] font-mono tracking-widest mb-1.5">FASES</p>
          <div className="grid grid-cols-2 gap-1.5">
            {INSTRUMENT_ROUTES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => router.push(r.href)}
                className="py-3 rounded-xl flex flex-col items-center gap-1 transition-all active:scale-95"
                style={{ background: `${INSTRUMENT_COLOR[r.id]}14`, border: `1px solid ${INSTRUMENT_COLOR[r.id]}40` }}
              >
                <span className="text-base">{r.icon}</span>
                <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: INSTRUMENT_COLOR[r.id] }}>{INSTRUMENT_LABEL[r.id]}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => router.push("/batida/mixagem")}
              className="py-3 rounded-xl flex flex-col items-center gap-1 transition-all active:scale-95"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.18)" }}
            >
              <span className="text-base">🎚️</span>
              <span className="text-[9px] font-mono uppercase tracking-widest text-white/60">MIXAGEM</span>
            </button>
          </div>
        </div>
      </div>

      {justCompleted && (
        <div
          className="absolute left-5 right-5 z-20 rounded-xl px-4 py-3 text-center"
          style={{ bottom: "6%", background: "rgba(10,2,6,0.95)", border: `1px solid ${ACCENT}60`, boxShadow: `0 0 20px ${ACCENT}40` }}
        >
          <p className="text-sm font-bold" style={{ color: ACCENT }}>4 MÚSICAS SALVAS</p>
          <p className="text-white/40 text-[10px] mt-1">missão completa — descubra na conversa com Nizzy, pelo N3XO. o estúdio continua liberado.</p>
          <button type="button" onClick={() => setJustCompleted(false)} className="mt-2 text-[10px] font-mono uppercase tracking-widest" style={{ color: ACCENT }}>
            fechar
          </button>
        </div>
      )}
    </PhoneShell>
  )
}
