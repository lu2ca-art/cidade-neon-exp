"use client"

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import { ALBUM_TRACKS, useAudioPlayer, type Track } from "@/app/providers/AudioPlayerProvider"
import { sendToParent, type BridgeState } from "@/app/providers/AudioBridge"
import { ALL_TIERS, TIER_META, missionDoneForTier } from "@/lib/radio-tiers"

// Painel de monitor vital, não um clone de Spotify: verde de EKG, não o
// verde da marca. CHUVA (index 12) é a única prévia sempre liberada — o
// resto do álbum só toca de verdade depois de unlocked.finalCompleted (a
// recompensa por terminar toda a experiência no /drive: as 3 frequências +
// chegar no final que libera a CIDADE NEON 222.4 FM).
const ACCENT = "#00ff9c"
const CHUVA_INDEX = 12

// Detecta se está dentro de um iframe do drive
const isInIframe = () => typeof window !== "undefined" && window.self !== window.top

// ─── Hook que unifica: usa bridge quando iframe, provider quando standalone ───
function usePlayer() {
  const direct = useAudioPlayer()
  const [bridgeState, setBridgeState] = useState<{ trackIdx: number; playing: boolean; elapsed: number } | null>(null)
  const inFrame = useRef(isInIframe())

  useEffect(() => {
    if (!inFrame.current) return
    const handler = (e: MessageEvent) => {
      const msg = e.data as BridgeState
      if (msg?.type === "AUDIO_STATE") {
        setBridgeState({ trackIdx: msg.trackIdx, playing: msg.playing, elapsed: msg.elapsed })
      }
    }
    window.addEventListener("message", handler)
    // pede estado inicial
    sendToParent({ type: "REQUEST_STATE" })
    return () => window.removeEventListener("message", handler)
  }, [])

  if (!inFrame.current) return direct

  // API usando bridge para o pai
  const bs = bridgeState ?? { trackIdx: direct.trackIdx, playing: direct.playing, elapsed: direct.elapsed }
  return {
    currentTrack: ALBUM_TRACKS[bs.trackIdx] ?? null,
    trackIdx:     bs.trackIdx,
    playing:      bs.playing,
    elapsed:      bs.elapsed,
    play:    (i: number)  => sendToParent({ type: "PLAY", index: i }),
    pause:   ()           => sendToParent({ type: "PAUSE" }),
    resume:  ()           => sendToParent({ type: "RESUME" }),
    toggle:  ()           => sendToParent({ type: "TOGGLE" }),
    seekTo:  (s: number)  => sendToParent({ type: "SEEK", seconds: s }),
    next:    ()           => sendToParent({ type: "NEXT" }),
    prev:    ()           => sendToParent({ type: "PREV" }),
    stopAndClear: ()      => sendToParent({ type: "PAUSE" }),
  }
}

// ─── WAVEFORM — escopo do módulo: tipo estável, nunca remonta ─────────────────
function Waveform({
  bars, progress, seekFromRatio, compact = false,
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
    <div ref={ref} onClick={onClick}
      className="relative flex items-center gap-[1px] cursor-pointer w-full"
      style={{ height: compact ? 22 : 56 }}
    >
      {bars.map((h, i) => (
        <div key={i} className="flex-1 rounded-full" style={{
          height: `${h * 100}%`, minWidth: 1,
          background: i <= playedIdx ? ACCENT : "rgba(0,255,156,0.18)",
          boxShadow: i <= playedIdx ? `0 0 3px ${ACCENT}99` : "none",
        }} />
      ))}
      <div className="absolute top-0 bottom-0 w-[2px] rounded-full"
        style={{ left: `${progress * 100}%`, background: "#fff", boxShadow: `0 0 8px ${ACCENT}` }} />
    </div>
  )
}

// ─── COVER — moldura de monitor (não a capinha redonda do Spotify): borda
// verde de EKG, scanlines por cima da foto, brilho pulsante ao redor ────────
function AlbumCover({ circular, size }: { circular: boolean; size: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className={`absolute inset-0 ${circular ? "rounded-full" : "rounded-xl"}`}
        style={{ boxShadow: `0 0 0 1px ${ACCENT}55, 0 0 30px ${ACCENT}33`, animation: "pulse-glow 1.8s ease-in-out infinite" }} />
      <div className={`relative overflow-hidden ${circular ? "rounded-full" : "rounded-xl"}`}
        style={{ width: size, height: size, border: `1px solid ${ACCENT}66` }}
      >
        <Image
          src="/images/album-cover.jpg"
          alt="Cidade Neon"
          width={size}
          height={size}
          priority
          className="w-full h-full object-cover grayscale"
        />
        <div className="absolute inset-0 pointer-events-none" style={{
          opacity: 0.25,
          backgroundImage: "repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,0.5) 2px 3px)",
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: `${ACCENT}14` }} />
      </div>
    </div>
  )
}

// ─── NAV COMPARTILHADA — as 3 telas do app (now-playing/album/gallery) ────────
type SpotifyView = "now-playing" | "album" | "gallery"

function BottomNav({ active, onSelect }: { active: SpotifyView; onSelect: (v: SpotifyView) => void }) {
  const items: Array<{ id: SpotifyView; label: string; icon: React.ReactNode }> = [
    { id: "now-playing", label: "monitor", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
    { id: "album", label: "faixas", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
    { id: "gallery", label: "projetos", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> },
  ]
  return (
    <div className="flex flex-shrink-0" style={{ borderTop: `1px solid ${ACCENT}22`, background: "#040a08" }}>
      {items.map(it => (
        <button key={it.id} type="button" onClick={() => onSelect(it.id)}
          className="flex-1 flex flex-col items-center gap-1 py-4 active:bg-white/5"
          style={{ color: active === it.id ? ACCENT : `${ACCENT}bb` }}>
          {it.icon}
          <span className="text-[11px] tracking-wide font-mono">{it.label}</span>
        </button>
      ))}
    </div>
  )
}

// ─── TELA NOW PLAYING ─────────────────────────────────────────────────────────
function NowPlayingView({
  track, audio, bars, progress, seekFromRatio, onNav, unlocked,
}: {
  track: Track
  audio: ReturnType<typeof usePlayer>
  bars: number[]
  progress: number
  seekFromRatio: (r: number) => void
  onNav: (v: SpotifyView) => void
  unlocked: boolean
}) {
  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`
  // mesma regra da AlbumView: sem unlocked, só a faixa CHUVA é reproduzível —
  // sem isso as setas aqui deixavam ouvir/ver qualquer faixa antes da hora
  const playable = unlocked || audio.trackIdx === CHUVA_INDEX
  const title = playable ? (track.title ?? track.masked ?? "Faixa") : (track.masked ?? "Faixa")
  return (
    <div className="flex-1 flex flex-col" style={{ background: "#040a08" }}>
      <div className="px-6 pt-8 pb-2 text-center">
        <h1 className="text-white text-2xl font-medium tracking-tight">{title}</h1>
        <p className="text-sm mt-1 tracking-wide font-mono" style={{ color: `${ACCENT}99` }}>CIDADE NEON &middot; SINAL VITAL</p>
      </div>
      <div className="flex-1 flex items-center justify-center px-10 min-h-0">
        <AlbumCover circular size={260} />
      </div>
      <div className="px-7 pt-4">
        <Waveform bars={bars} progress={progress} seekFromRatio={seekFromRatio} />
        <p className="text-center text-sm tabular-nums mt-3 font-mono" style={{ color: `${ACCENT}88` }}>
          {fmt(audio.elapsed)} <span style={{ color: `${ACCENT}44` }}>/</span> {track.duration}
        </p>
      </div>
      <div className="px-8 pt-5 pb-5 flex items-center justify-between">
        <button type="button" aria-label="Compartilhar"
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-90 transition-transform" style={{ color: `${ACCENT}bb` }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        </button>
        <button type="button" onClick={audio.prev} disabled={!unlocked} aria-label="Anterior"
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white active:scale-90 transition-transform disabled:opacity-30">
          <svg width="30" height="30" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
        </button>
        <button type="button" onClick={audio.toggle} aria-label={audio.playing ? "Pausar" : "Tocar"}
          className="w-16 h-16 rounded-full flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: ACCENT, boxShadow: `0 0 24px ${ACCENT}66` }}>
          {audio.playing
            ? <svg width="30" height="30" viewBox="0 0 24 24" fill="black"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            : <svg width="30" height="30" viewBox="0 0 24 24" fill="black"><path d="M8 5v14l11-7z"/></svg>}
        </button>
        <button type="button" onClick={audio.next} disabled={!unlocked} aria-label="Proxima"
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white active:scale-90 transition-transform disabled:opacity-30">
          <svg width="30" height="30" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
        </button>
        <button type="button" aria-label="Repetir"
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-90 transition-transform" style={{ color: `${ACCENT}bb` }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
        </button>
      </div>
      <BottomNav active="now-playing" onSelect={onNav} />
    </div>
  )
}

// ─── TELA ALBUM ───────────────────────────────────────────────────────────────
function AlbumView({
  audio, bars, progress, seekFromRatio, onNowPlaying, onHome, onNav, unlocked,
}: {
  audio: ReturnType<typeof usePlayer>
  bars: number[]
  progress: number
  seekFromRatio: (r: number) => void
  onNowPlaying: () => void
  onHome: () => void
  onNav: (v: SpotifyView) => void
  unlocked: boolean
}) {
  const isPlayable = (i: number) => unlocked || i === CHUVA_INDEX
  const selectTrack = (i: number) => {
    if (!isPlayable(i)) return
    audio.play(i)
    onNowPlaying()
  }
  return (
    <div className="flex-1 flex flex-col overflow-y-auto overscroll-contain" style={{ background: "#040a08" }}>
      <div className="sticky top-0 z-10 backdrop-blur flex items-center justify-between px-3 py-3" style={{ background: "#040a08f2" }}>
        <button type="button" onClick={onHome} aria-label="Voltar"
          className="w-10 h-10 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform" style={{ background: `${ACCENT}14` }}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7"/></svg>
        </button>
        <p className="font-mono text-xs tracking-[0.2em]" style={{ color: `${ACCENT}99` }}>
          {unlocked ? "SINAL ESTÁVEL" : "MONITORANDO"}
        </p>
      </div>
      <div className="px-5 pt-2 pb-4">
        <div className="w-full max-w-[280px] mx-auto mb-5">
          <AlbumCover circular={false} size={280} />
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-white text-3xl font-bold tracking-tight">CIDADE NEON</h1>
            <p className="text-sm mt-1 font-mono" style={{ color: `${ACCENT}88` }}>LU2CA &middot; {ALBUM_TRACKS.length} faixas</p>
          </div>
          <button type="button" onClick={() => { audio.play(unlocked ? 0 : CHUVA_INDEX); onNowPlaying() }} aria-label="Tocar"
            className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
            style={{ background: ACCENT, boxShadow: `0 0 20px ${ACCENT}55` }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="black"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>
      </div>
      <div className="px-2 pb-28">
        {ALBUM_TRACKS.map((t, i) => {
          const isActive = i === audio.trackIdx && audio.playing
          const playable = isPlayable(i)
          return (
            <button key={t.id} type="button" onClick={() => selectTrack(i)} disabled={!playable}
              className={`w-full flex items-center gap-3 py-3 px-3 rounded-lg text-left ${!playable ? "opacity-45" : "active:bg-white/5"}`}>
              <span className="w-5 text-center text-sm flex-shrink-0 tabular-nums font-mono" style={{ color: `${ACCENT}55` }}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium truncate" style={{ color: isActive ? ACCENT : "white" }}>
                  {playable ? t.title : <span className="font-mono opacity-70">{t.masked}</span>}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={`${ACCENT}66`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 6-4-12-3 6H2"/></svg>
                  <span className="text-xs font-mono" style={{ color: `${ACCENT}55` }}>
                    {playable ? "prévia · 22s" : i === CHUVA_INDEX ? "prévia · 22s" : "libera no final do /drive"}
                  </span>
                </div>
              </div>
              {!playable
                ? <svg width="15" height="15" fill={`${ACCENT}55`} viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-3.1 0H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={`${ACCENT}88`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 5v14l11-7z"/></svg>}
            </button>
          )
        })}
      </div>
      <div className="sticky bottom-0 z-10" style={{ background: "#040a08" }}>
        <BottomNav active="album" onSelect={onNav} />
      </div>
      {audio.currentTrack && (
        <div className="absolute bottom-[88px] left-3 right-3 z-20">
          <div className="rounded-2xl px-2 py-2 flex items-center gap-3 shadow-2xl" style={{ background: "#0a1512", border: `1px solid ${ACCENT}33` }}>
            <button type="button" onClick={audio.toggle} aria-label={audio.playing ? "Pausar" : "Tocar"}
              className="w-10 h-10 rounded-xl overflow-hidden relative flex-shrink-0">
              <Image src="/images/album-cover.jpg" alt="" width={40} height={40} className="w-full h-full object-cover grayscale" />
              <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
                {audio.playing
                  ? <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                  : <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
              </span>
            </button>
            <button type="button" onClick={onNowPlaying} className="flex-1 min-w-0 text-left">
              <p className="text-white text-sm font-medium truncate">{audio.currentTrack.title ?? "Bloqueada"}</p>
              <p className="text-xs truncate font-mono" style={{ color: `${ACCENT}77` }}>CIDADE NEON &middot; SINAL VITAL</p>
            </button>
            <div className="w-16 flex-shrink-0 pr-1">
              <Waveform compact bars={bars} progress={progress} seekFromRatio={seekFromRatio} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── TELA GALERIA — estilo UNTITLED: os 4 projetos que a missão libera ────────
function GalleryView({
  confirmationCount, finalCompleted, onHome, onNav,
}: {
  confirmationCount: number
  finalCompleted: boolean
  onHome: () => void
  onNav: (v: SpotifyView) => void
}) {
  const nextLocked = ALL_TIERS.find(t => !missionDoneForTier(t, confirmationCount, finalCompleted))
  return (
    <div className="flex-1 flex flex-col overflow-y-auto overscroll-contain" style={{ background: "#040a08" }}>
      <div className="sticky top-0 z-10 backdrop-blur flex items-center justify-between px-3 py-3" style={{ background: "#040a08f2" }}>
        <button type="button" onClick={onHome} aria-label="Voltar"
          className="w-10 h-10 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform" style={{ background: `${ACCENT}14` }}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7"/></svg>
        </button>
        <p className="font-mono text-xs tracking-[0.2em]" style={{ color: `${ACCENT}99` }}>PROJETOS</p>
        <div className="w-10" />
      </div>
      <div className="px-5 pt-4 pb-2">
        <h1 className="text-white text-2xl font-bold tracking-tight">GALERIA</h1>
        <p className="text-sm mt-1 font-mono" style={{ color: `${ACCENT}77` }}>
          cada frequência sintonizada libera o projeto correspondente
        </p>
      </div>
      <div className="px-4 pt-3 pb-8 flex flex-col gap-3">
        {ALL_TIERS.map(tier => {
          const meta = TIER_META[tier]
          const unlockedTier = missionDoneForTier(tier, confirmationCount, finalCompleted)
          return (
            <div key={tier} className="rounded-2xl overflow-hidden border" style={{ borderColor: unlockedTier ? `${meta.color}55` : `${ACCENT}18`, background: "#0a1512" }}>
              <div className="h-20 flex items-center justify-center relative" style={{ background: unlockedTier ? `${meta.color}18` : "rgba(255,255,255,0.02)" }}>
                <span className="font-mono text-2xl font-bold tracking-tight" style={{ color: unlockedTier ? meta.color : `${ACCENT}33` }}>
                  {meta.freq} FM
                </span>
                {!unlockedTier && (
                  <div className="absolute top-2 right-3">
                    <svg width="16" height="16" fill={`${ACCENT}55`} viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-3.1 0H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/></svg>
                  </div>
                )}
              </div>
              <div className="px-4 py-3">
                <p className="text-white text-[15px] font-semibold">{unlockedTier ? meta.projectName : "??????????"}</p>
                <p className="text-xs font-mono mt-0.5" style={{ color: `${ACCENT}55` }}>
                  {unlockedTier ? "untitled.stream" : tier === nextLocked ? "libera na próxima sintonia" : "bloqueado"}
                </p>
                {unlockedTier ? (
                  <a href={meta.projectLink} target="_blank" rel="noopener noreferrer"
                    className="mt-3 flex items-center gap-1.5 text-sm font-semibold" style={{ color: meta.color }}>
                    {meta.projectKind === "buy" ? "comprar no [UNTITLED]" : "ouvir no [UNTITLED]"}
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                  </a>
                ) : (
                  <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: `${ACCENT}14` }}>
                    <div className="h-full rounded-full" style={{ width: "0%", background: meta.color }} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="sticky bottom-0 z-10" style={{ background: "#040a08" }}>
        <BottomNav active="gallery" onSelect={onNav} />
      </div>
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function UntitledPlayerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <FrequenciaPlayer />
    </Suspense>
  )
}

function FrequenciaPlayer() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { updateCinematicStep, updateSpotifyState, state } = useGameFunnel()
  const audio = usePlayer()

  // ?view=gallery — usado pelas recompensas do NEXO, que agora abrem direto
  // na galeria de projetos em vez de linkar pro untitled.stream externo
  const initialView: SpotifyView = searchParams.get("view") === "gallery" ? "gallery" : "now-playing"
  const [view, setView] = useState<SpotifyView>(initialView)
  const [showNotif, setShowNotif] = useState(false)
  const notifSent   = useRef(false)
  const isFirst     = useRef(!state.perAppState.spotifyAuto.completed)

  // completar a missão 3 (GUITAR DRIVER) já libera todas as prévias aqui —
  // antes disso, só CHUVA toca (a amostra oficial). Antes essa liberação
  // dependia de finalCompleted (só depois do fim de TODA a experiência),
  // deixando as prévias travadas pra sempre na prática
  const unlocked = state.confirmationCount >= 3

  const track    = audio.currentTrack ?? ALBUM_TRACKS[CHUVA_INDEX]
  const progress = track.durationSec > 0 ? Math.min(audio.elapsed / track.durationSec, 1) : 0

  useEffect(() => { updateCinematicStep("spotify-auto") }, [updateCinematicStep])

  // Auto-play CHUVA ao montar, só se nada estiver tocando — é a única prévia
  // sempre liberada, antes mesmo do resto do álbum destravar
  useEffect(() => {
    if (!audio.playing && audio.elapsed === 0) audio.play(CHUVA_INDEX)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Notificação WhatsApp aos 13s (primeira visita)
  useEffect(() => {
    if (audio.elapsed >= 13 && isFirst.current && !notifSent.current) {
      notifSent.current = true
      setShowNotif(true)
    }
  }, [audio.elapsed])

  const handleNotifClick = () => {
    setShowNotif(false)
    isFirst.current = false
    updateSpotifyState({ completed: true })
    updateCinematicStep("whatsapp-notification")
    router.push("/whatsapp/grupo")
  }

  // padrão de EKG: linha de base quase plana com um "complexo QRS" (o
  // batimento) se repetindo — não é mais um equalizador de música genérico
  const bars = useMemo(() => {
    const n = 72
    const cycle = [0.08, 0.09, 0.07, 0.1, 0.12, 0.22, 0.95, 0.15, 0.5, 0.28, 0.09, 0.08]
    return Array.from({ length: n }, (_, i) => {
      const base = cycle[i % cycle.length]
      return Math.min(1, base + (Math.random() * 0.03))
    })
  }, [])

  const seekFromRatio = useCallback((ratio: number) => {
    audio.seekTo(Math.round(ratio * track.durationSec))
  }, [audio, track.durationSec])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center touch-manipulation select-none">
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] relative flex flex-col overflow-hidden" style={{ background: "#040a08" }}>
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

        {/* notificação WhatsApp */}
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

        {/* views — montadas uma vez, ocultadas com display */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div style={{ display: view === "now-playing" ? "flex" : "none" }} className="flex-col flex-1 min-h-0">
            <NowPlayingView
              track={track}
              audio={audio}
              bars={bars}
              progress={progress}
              seekFromRatio={seekFromRatio}
              onNav={setView}
              unlocked={unlocked}
            />
          </div>
          <div style={{ display: view === "album" ? "flex" : "none" }} className="flex-col flex-1 min-h-0 relative">
            <AlbumView
              audio={audio}
              bars={bars}
              progress={progress}
              seekFromRatio={seekFromRatio}
              onNowPlaying={() => setView("now-playing")}
              onHome={() => router.push("/?screen=home")}
              onNav={setView}
              unlocked={unlocked}
            />
          </div>
          <div style={{ display: view === "gallery" ? "flex" : "none" }} className="flex-col flex-1 min-h-0 relative">
            <GalleryView
              confirmationCount={state.confirmationCount}
              finalCompleted={state.unlocked.finalCompleted}
              onHome={() => router.push("/?screen=home")}
              onNav={setView}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-down { from { opacity:0; transform:translateY(-20px) } to { opacity:1; transform:translateY(0) } }
        .animate-slide-down { animation: slide-down .35s ease-out forwards }
      `}</style>
    </div>
  )
}
