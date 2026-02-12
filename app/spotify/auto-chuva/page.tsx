"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"

const TRACKS = [
  { id: 1, title: "CHUVA", duration: "3:24", durationSec: 204, playable: true },
  { id: 2, title: "Copo Americano", duration: "2:58", durationSec: 178, playable: true },
  { id: 3, title: null, duration: "3:12", durationSec: 192, playable: false },
  { id: 4, title: null, duration: "2:45", durationSec: 165, playable: false },
  { id: 5, title: null, duration: "3:01", durationSec: 181, playable: false },
]

export default function SpotifyAutoPage() {
  const router = useRouter()
  const { updateCinematicStep, updateSpotifyState, state } = useGameFunnel()

  const [view, setView] = useState<"now-playing" | "album">("now-playing")
  const [trackIdx, setTrackIdx] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const [showNotif, setShowNotif] = useState(false)
  const [liked, setLiked] = useState(false)
  const notifSent = useRef(false)
  const isFirst = useRef(!state.perAppState.spotifyAuto.completed)

  const track = TRACKS[trackIdx]
  const progress = track.durationSec > 0 ? (elapsed / track.durationSec) * 100 : 0

  useEffect(() => { updateCinematicStep("spotify-auto") }, [updateCinematicStep])

  /* timer */
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      setElapsed(p => {
        const next = p + 1
        if (next === 13 && isFirst.current && !notifSent.current) {
          notifSent.current = true
          setShowNotif(true)
        }
        if (next >= track.durationSec) {
          setPlaying(false)
          return track.durationSec
        }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [playing, track.durationSec])

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
    if (!TRACKS[i].playable) return
    setTrackIdx(i)
    setElapsed(0)
    setPlaying(true)
    setView("now-playing")
  }

  const prev = () => {
    if (elapsed > 3) { setElapsed(0) }
    else if (trackIdx > 0 && TRACKS[trackIdx - 1].playable) { setTrackIdx(i => i - 1); setElapsed(0) }
  }
  const next = () => {
    if (trackIdx < TRACKS.length - 1 && TRACKS[trackIdx + 1].playable) { setTrackIdx(i => i + 1); setElapsed(0); setPlaying(true) }
  }

  /* ── NOW PLAYING ─────────────────────────────── */
  const NowPlaying = () => (
    <div className="flex-1 flex flex-col overflow-y-auto overscroll-contain">
      {/* gradient bg from album art colors */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#4a2c6a] via-[#1a1030] to-[#121212]" />

      {/* top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3">
        <button type="button" onClick={handleBack} className="p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div className="text-center">
          <p className="text-[10px] text-white/60 uppercase tracking-widest">Tocando do album</p>
          <p className="text-[12px] text-white font-medium">Cidade Neon</p>
        </div>
        <button type="button" onClick={() => router.push("/")} className="p-2 -mr-2 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Voltar para inicio">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
        </button>
      </div>

      {/* cover */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 min-h-0">
        <div className="w-full max-w-[300px] aspect-square rounded-lg overflow-hidden shadow-2xl">
          <Image src="/images/album-cover.jpg" alt="Cidade Neon" width={300} height={300} className="w-full h-full object-cover" priority />
        </div>
      </div>

      {/* controls section */}
      <div className="relative z-10 px-6 pb-6 pt-4">
        {/* title row */}
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-white text-lg font-bold truncate">{track.title ?? "Faixa bloqueada"}</h2>
            <p className="text-white/60 text-sm">LU2CA</p>
          </div>
          <button type="button" onClick={() => setLiked(l => !l)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
            {liked
              ? <svg width="24" height="24" viewBox="0 0 24 24" fill="#1DB954"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            }
          </button>
        </div>

        {/* progress */}
        <div className="mb-4">
          <div className="relative h-1 bg-white/20 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-white rounded-full transition-[width] duration-1000 ease-linear" style={{ width: `${progress}%` }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md transition-[left] duration-1000 ease-linear" style={{ left: `calc(${progress}% - 6px)` }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[11px] text-white/50 tabular-nums">{fmt(elapsed)}</span>
            <span className="text-[11px] text-white/50 tabular-nums">{track.duration}</span>
          </div>
        </div>

        {/* playback buttons */}
        <div className="flex items-center justify-between">
          <button type="button" className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center opacity-60">
            <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
          </button>
          <button type="button" onClick={prev} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <svg width="28" height="28" fill="white" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
          </button>
          <button type="button" onClick={() => setPlaying(p => !p)} className="w-14 h-14 rounded-full bg-white flex items-center justify-center active:scale-95 transition-transform">
            {playing
              ? <svg width="28" height="28" viewBox="0 0 24 24" fill="black"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
              : <svg width="28" height="28" viewBox="0 0 24 24" fill="black"><path d="M8 5v14l11-7z"/></svg>
            }
          </button>
          <button type="button" onClick={next} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <svg width="28" height="28" fill="white" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
          <button type="button" className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center opacity-60">
            <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
          </button>
        </div>
      </div>
    </div>
  )

  /* ── ALBUM VIEW ──────────────────────────────── */
  const AlbumView = () => (
    <div className="flex-1 flex flex-col overflow-y-auto overscroll-contain">
      <div className="absolute inset-0 bg-gradient-to-b from-[#4a2c6a] via-[#1a1030] to-[#121212]" />

      {/* top bar */}
      <div className="relative z-10 flex items-center px-4 py-3">
        <button type="button" onClick={() => router.push("/")} className="p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M15 19l-7-7 7-7"/></svg>
        </button>
      </div>

      {/* album header */}
      <div className="relative z-10 px-6 pb-4 flex flex-col items-center">
        <div className="w-48 h-48 rounded-md overflow-hidden shadow-2xl mb-4">
          <Image src="/images/album-cover.jpg" alt="Cidade Neon" width={192} height={192} className="w-full h-full object-cover" />
        </div>
        <h1 className="text-white text-xl font-bold">Cidade Neon</h1>
        <p className="text-white/60 text-sm">LU2CA</p>
        <p className="text-white/40 text-xs mt-1">Album &middot; 2026 &middot; 5 faixas</p>
        <button type="button" onClick={() => { setTrackIdx(0); setElapsed(0); setPlaying(true); setView("now-playing") }} className="mt-4 w-12 h-12 rounded-full bg-[#1DB954] flex items-center justify-center active:scale-95 transition-transform">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="black"><path d="M8 5v14l11-7z"/></svg>
        </button>
      </div>

      {/* track list */}
      <div className="relative z-10 flex-1 overflow-y-auto overscroll-contain px-4 pb-24" style={{ WebkitOverflowScrolling: "touch" }}>
        {TRACKS.map((t, i) => (
          <button key={t.id} type="button" onClick={() => selectTrack(i)} disabled={!t.playable}
            className={`w-full flex items-center gap-3 py-3 px-2 rounded-md text-left ${i === trackIdx && playing ? "bg-white/5" : ""} ${!t.playable ? "opacity-40" : "active:bg-white/10"}`}
          >
            <span className="w-6 text-center text-sm text-white/40 flex-shrink-0">
              {i === trackIdx && playing
                ? <span className="inline-flex gap-[2px] items-end h-4">{[1,2,3].map(b=><span key={b} className="w-[3px] bg-[#1DB954] rounded-sm animate-bounce" style={{height:`${8+Math.random()*8}px`,animationDelay:`${b*0.15}s`}}/>)}</span>
                : i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${i === trackIdx && playing ? "text-[#1DB954]" : "text-white"}`}>
                {t.playable ? t.title : <span className="flex items-center gap-2"><svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/></svg>Faixa bloqueada</span>}
              </p>
              <p className="text-xs text-white/40">LU2CA</p>
            </div>
            <span className="text-xs text-white/30 flex-shrink-0">{t.duration}</span>
          </button>
        ))}
      </div>

      {/* mini player */}
      {trackIdx >= 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <button type="button" onClick={() => setView("now-playing")} className="w-full bg-[#282828] border-t border-white/5 px-4 py-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
              <Image src="/images/album-cover.jpg" alt="" width={40} height={40} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-white text-sm font-medium truncate">{track.title ?? "Bloqueada"}</p>
              <p className="text-white/50 text-xs">LU2CA</p>
            </div>
            <button type="button" onClick={e => { e.stopPropagation(); setPlaying(p => !p) }} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
              {playing
                ? <svg width="24" height="24" fill="white" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                : <svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              }
            </button>
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-black flex items-center justify-center touch-manipulation select-none">
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] relative flex flex-col bg-[#121212]">
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

        {view === "now-playing" ? <NowPlaying /> : <AlbumView />}
      </div>

      <style jsx>{`
        @keyframes slide-down{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}
        .animate-slide-down{animation:slide-down .35s ease-out forwards}
      `}</style>
    </div>
  )
}
