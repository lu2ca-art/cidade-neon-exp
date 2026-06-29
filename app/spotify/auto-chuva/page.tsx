"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import { useAudioPlayer, ALBUM_TRACKS } from "@/app/providers/AudioPlayerProvider"

const ACCENT = "#E8FF3A" // untitled yellow playhead

/* ---------- WAVEFORM (module-level: tipo estável, não remonta) ---------- */
function Waveform({
  bars,
  progress,
  seekFromRatio,
  compact = false,
}: {
  bars: number[]
  progress: number
  seekFromRatio: (ratio: number) => void
  compact?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onClick = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    seekFromRatio(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)))
  }
  const playedIdx = Math.floor(progress * bars.length)
  return (
    <div
      ref={ref}
      onClick={onClick}
      className="relative flex items-center gap-[2px] cursor-pointer w-full"
      style={{ height: compact ? 22 : 56 }}
    >
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-full"
          style={{
            height: `${h * 100}%`,
            minWidth: 1,
            background: i <= playedIdx ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.22)",
          }}
        />
      ))}
      <div
        className="absolute top-0 bottom-0 w-[2px] rounded-full"
        style={{ left: `${progress * 100}%`, background: ACCENT, boxShadow: `0 0 6px ${ACCENT}` }}
      />
    </div>
  )
}

export default function UntitledPlayerPage() {
  const router = useRouter()
  const { updateCinematicStep, updateSpotifyState, state } = useGameFunnel()
  const audio = useAudioPlayer()

  const [view, setView] = useState<"now-playing" | "album">("now-playing")
  const [showNotif, setShowNotif] = useState(false)
  const notifSent = useRef(false)
  const isFirst = useRef(!state.perAppState.spotifyAuto.completed)

  const track = audio.currentTrack ?? ALBUM_TRACKS[0]
  const progress = track.durationSec > 0 ? Math.min(audio.elapsed / track.durationSec, 1) : 0

  useEffect(() => { updateCinematicStep("spotify-auto") }, [updateCinematicStep])

  // Auto-play CHUVA (index 8) on mount only if nothing is playing
  useEffect(() => {
    if (!audio.playing && audio.elapsed === 0) audio.play(8)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // WhatsApp notification at 13s on first visit
  useEffect(() => {
    if (audio.elapsed >= 13 && isFirst.current && !notifSent.current) {
      notifSent.current = true
      setShowNotif(true)
    }
  }, [audio.elapsed])

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    return `${m}:${(s % 60).toString().padStart(2, "0")}`
  }

  const handleNotifClick = () => {
    setShowNotif(false)
    isFirst.current = false
    updateSpotifyState({ completed: true })
    updateCinematicStep("whatsapp-notification")
    router.push("/whatsapp/grupo")
  }

  const handleBack = useCallback(() => {
    if (view === "now-playing") setView("album")
    else router.push("/")
  }, [view, router])

  const selectTrack = (i: number) => {
    if (!ALBUM_TRACKS[i].playable) return
    audio.play(i)
    setView("now-playing")
  }

  // Deterministic waveform bar heights
  const bars = useMemo(() => {
    const n = 72
    return Array.from({ length: n }, (_, i) => {
      const v = Math.abs(Math.sin(i * 0.7) * 0.6 + Math.sin(i * 1.9 + 1) * 0.4)
      return 0.18 + v * 0.82
    })
  }, [])

  const seekFromRatio = (ratio: number) => {
    audio.seekTo(Math.round(ratio * track.durationSec))
  }

  /* ---------- NOW PLAYING ---------- */
  const nowPlaying = (
    <div className="flex-1 flex flex-col bg-[#161616]">
      {/* title */}
      <div className="px-6 pt-8 pb-2 text-center">
        <h1 className="text-white text-2xl font-medium tracking-tight">{track.title ?? track.masked ?? "Faixa"}</h1>
        <p className="text-white/45 text-sm mt-1 tracking-wide">CIDADE NEON &middot; LU2CA</p>
      </div>

      {/* circular cover */}
      <div className="flex-1 flex items-center justify-center px-10 min-h-0">
        <div className="aspect-square w-full max-w-[260px] rounded-full overflow-hidden ring-1 ring-white/10 shadow-2xl">
          <Image src="/images/album-cover.jpg" alt={track.title ?? "Cidade Neon"} width={260} height={260} priority className="w-full h-full object-cover grayscale" />
        </div>
      </div>

      {/* waveform + time */}
      <div className="px-7 pt-4">
        <Waveform bars={bars} progress={progress} seekFromRatio={seekFromRatio} />
        <p className="text-center text-white/50 text-sm tabular-nums mt-3">
          {fmt(audio.elapsed)} <span className="text-white/25">/</span> {track.duration}
        </p>
      </div>

      {/* controls */}
      <div className="px-8 pt-5 pb-5 flex items-center justify-between">
        <button type="button" aria-label="Compartilhar" className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80 active:scale-90 transition-transform">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        </button>
        <button type="button" onClick={audio.prev} aria-label="Anterior" className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white active:scale-90 transition-transform">
          <svg width="30" height="30" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
        </button>
        <button type="button" onClick={audio.toggle} aria-label={audio.playing ? "Pausar" : "Tocar"} className="w-16 h-16 rounded-full bg-white flex items-center justify-center active:scale-95 transition-transform">
          {audio.playing
            ? <svg width="30" height="30" viewBox="0 0 24 24" fill="black"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            : <svg width="30" height="30" viewBox="0 0 24 24" fill="black"><path d="M8 5v14l11-7z"/></svg>}
        </button>
        <button type="button" onClick={audio.next} aria-label="Proxima" className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white active:scale-90 transition-transform">
          <svg width="30" height="30" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
        </button>
        <button type="button" aria-label="Repetir" className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80 active:scale-90 transition-transform">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
        </button>
      </div>

      {/* notes / edit footer */}
      <div className="border-t border-white/8 flex">
        <button type="button" onClick={handleBack} className="flex-1 flex flex-col items-center gap-1 py-4 text-white/70 active:bg-white/5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/></svg>
          <span className="text-[11px] tracking-wide">notes</span>
        </button>
        <button type="button" onClick={() => setView("album")} className="flex-1 flex flex-col items-center gap-1 py-4 text-white/70 active:bg-white/5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="16" x2="20" y2="16"/><circle cx="9" cy="8" r="2" fill="#161616"/><circle cx="15" cy="16" r="2" fill="#161616"/></svg>
          <span className="text-[11px] tracking-wide">edit</span>
        </button>
      </div>
    </div>
  )

  /* ---------- ALBUM / TRACK LIST ---------- */
  const albumView = (
    <div className="flex-1 flex flex-col bg-[#161616] overflow-y-auto overscroll-contain">
      {/* top bar */}
      <div className="sticky top-0 z-10 bg-[#161616]/95 backdrop-blur flex items-center justify-between px-3 py-3">
        <button type="button" onClick={() => router.push("/")} aria-label="Voltar" className="w-10 h-10 rounded-full bg-white/8 flex items-center justify-center text-white active:scale-90 transition-transform">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Link" className="w-10 h-10 rounded-full bg-white/8 flex items-center justify-center text-white/80"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg></button>
          <button type="button" aria-label="Buscar" className="w-10 h-10 rounded-full bg-white/8 flex items-center justify-center text-white/80"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button>
          <button type="button" aria-label="Mais" className="w-10 h-10 rounded-full bg-white/8 flex items-center justify-center text-white/80"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></button>
        </div>
      </div>

      {/* header */}
      <div className="px-5 pt-2 pb-4">
        <div className="w-full aspect-square max-w-[280px] mx-auto rounded-xl overflow-hidden ring-1 ring-white/10 mb-5">
          <Image src="/images/album-cover.jpg" alt="Cidade Neon" width={280} height={280} className="w-full h-full object-cover grayscale" />
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-white text-3xl font-bold tracking-tight">CIDADE NEON</h1>
            <p className="text-white/45 text-sm mt-1">LU2CA &middot; 9 faixas</p>
          </div>
          <button type="button" onClick={() => { audio.play(8); setView("now-playing") }} aria-label="Tocar" className="w-14 h-14 rounded-full bg-white flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="black"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>
      </div>

      {/* track list */}
      <div className="px-2 pb-28">
        {ALBUM_TRACKS.map((t, i) => {
          const isActive = i === audio.trackIdx && audio.playing
          return (
            <button key={t.id} type="button" onClick={() => selectTrack(i)} disabled={!t.playable}
              className={`w-full flex items-center gap-3 py-3 px-3 rounded-lg text-left ${!t.playable ? "opacity-45" : "active:bg-white/5"}`}
            >
              <span className="w-5 text-center text-sm text-white/35 flex-shrink-0 tabular-nums">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-[15px] font-medium truncate ${isActive ? "" : "text-white"}`} style={isActive ? { color: ACCENT } : undefined}>
                  {t.playable ? t.title : <span className="font-mono opacity-70">{t.masked}</span>}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>
                  <span className="text-xs text-white/35">{t.playable ? "21 Jan" : "bloqueada"}</span>
                </div>
              </div>
              {!t.playable
                ? <svg width="15" height="15" fill="rgba(255,255,255,0.35)" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-3.1 0H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>}
            </button>
          )
        })}
      </div>

      {/* mini player pill */}
      {audio.currentTrack && (
        <div className="absolute bottom-4 left-3 right-3 z-20">
          <div className="bg-[#262626] rounded-2xl px-2 py-2 flex items-center gap-3 shadow-2xl ring-1 ring-white/8">
            <button type="button" onClick={() => audio.toggle()} aria-label={audio.playing ? "Pausar" : "Tocar"} className="w-10 h-10 rounded-xl overflow-hidden relative flex-shrink-0">
              <Image src="/images/album-cover.jpg" alt="" width={40} height={40} className="w-full h-full object-cover grayscale" />
              <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
                {audio.playing
                  ? <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                  : <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
              </span>
            </button>
            <button type="button" onClick={() => setView("now-playing")} className="flex-1 min-w-0 text-left">
              <p className="text-white text-sm font-medium truncate">{audio.currentTrack.title ?? "Bloqueada"}</p>
              <p className="text-white/45 text-xs truncate">CIDADE NEON &middot; LU2CA</p>
            </button>
            <div className="w-16 flex-shrink-0 pr-1"><Waveform compact bars={bars} progress={progress} seekFromRatio={seekFromRatio} /></div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-black flex items-center justify-center touch-manipulation select-none">
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] relative flex flex-col bg-[#161616] overflow-hidden">
        {/* notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />
        {/* status bar */}
        <div className="relative z-20 h-[50px] flex items-end justify-between px-6 pb-1 text-white text-xs flex-shrink-0">
          <span className="font-semibold w-12">9:41</span>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-3" fill="white" viewBox="0 0 16 12"><rect x="0" y="6" width="3" height="6" rx="0.5"/><rect x="4.5" y="4" width="3" height="8" rx="0.5"/><rect x="9" y="1" width="3" height="11" rx="0.5"/><rect x="13" y="0" width="3" height="12" rx="0.5" opacity="0.3"/></svg>
            <svg className="w-6 h-3" fill="white" viewBox="0 0 25 12"><rect x="0" y="1" width="22" height="10" rx="2" stroke="white" strokeWidth="1" fill="none"/><rect x="1.5" y="2.5" width="16" height="7" rx="1" fill="white"/><rect x="23" y="4" width="2" height="4" rx="0.5" fill="white" opacity="0.4"/></svg>
          </div>
        </div>

        {/* WhatsApp notification */}
        {showNotif && (
          <button type="button" onClick={handleNotifClick} className="absolute top-[52px] left-2 right-2 z-50 animate-slide-down">
            <div className="bg-[#f2f2f7]/95 backdrop-blur-xl rounded-2xl p-3 flex items-center gap-3 shadow-2xl">
              <div className="w-10 h-10 rounded-[10px] bg-[#25D366] flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <p className="text-black font-semibold text-sm">WhatsApp</p>
                  <span className="text-[#8e8e93] text-xs">agora</span>
                </div>
                <p className="text-black font-medium text-xs">Cidade Neon</p>
                <p className="text-[#8e8e93] text-xs truncate">D-Bee: Voce chegou.</p>
              </div>
            </div>
          </button>
        )}

        <div style={{ display: view === "now-playing" ? "flex" : "none" }} className="flex-1 flex-col min-h-0">{nowPlaying}</div>
        <div style={{ display: view === "album" ? "flex" : "none" }} className="flex-1 flex-col min-h-0">{albumView}</div>
      </div>

      <style jsx>{`
        @keyframes slide-down{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}
        .animate-slide-down{animation:slide-down .35s ease-out forwards}
      `}</style>
    </div>
  )
}
