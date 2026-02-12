"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAudioPlayer } from "@/app/providers/AudioPlayerProvider"

const VIDEOS = [
  {
    id: 1,
    caption: "CHUVA ao vivo no studio. a energia tava diferente nesse dia.",
    likes: 12400,
    comments: 847,
    shares: 2100,
    songName: "LU2CA - CHUVA (Studio Session)",
    gradient: "from-[#0a1628] via-[#1e3a5f] to-[#0c1f3d]",
    accentColor: "#9DFF6B",
    visualType: "rain" as const,
  },
  {
    id: 2,
    caption: "POV: voce descobriu a Cidade Neon e nunca mais voltou",
    likes: 8700,
    comments: 523,
    shares: 1800,
    songName: "LU2CA - NECTAR (Original Sound)",
    gradient: "from-[#1a0a2e] via-[#2d1b69] to-[#110720]",
    accentColor: "#FF6B9D",
    visualType: "neon" as const,
  },
  {
    id: 3,
    caption: "making of do clipe de NECTAR. nos bastidores o caos e lindo.",
    likes: 15200,
    comments: 1200,
    shares: 3400,
    songName: "LU2CA - NECTAR (Behind The Scenes)",
    gradient: "from-[#1a0f0f] via-[#3d1a1a] to-[#1a0a0a]",
    accentColor: "#FF9D6B",
    visualType: "fire" as const,
  },
  {
    id: 4,
    caption: "DOPAMINA no repeat. quantas vezes voce ja ouviu? comenta ai",
    likes: 9300,
    comments: 634,
    shares: 1500,
    songName: "LU2CA - DOPAMINA (Lyric Video)",
    gradient: "from-[#0f1a0a] via-[#1a3d1a] to-[#0a1a08]",
    accentColor: "#6B9DFF",
    visualType: "wave" as const,
  },
  {
    id: 5,
    caption: "ultima faixa desbloqueada. SABE ONTEM? o disco ta completo. CIDADE NEON.",
    likes: 21100,
    comments: 2300,
    shares: 5200,
    songName: "LU2CA - SABE ONTEM? (Official Audio)",
    gradient: "from-[#1a1a0a] via-[#3d3d1a] to-[#1a1808]",
    accentColor: "#FFD93D",
    visualType: "stars" as const,
  },
]

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

/* ── Animated visual backgrounds per video ── */
function VideoVisual({ type, color, active }: { type: string; color: string; active: boolean }) {
  if (!active) return null

  if (type === "rain") {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array(20).fill(0).map((_, i) => (
          <div
            key={i}
            className="absolute w-[1px] bg-gradient-to-b from-transparent via-white/20 to-transparent"
            style={{
              left: `${Math.random() * 100}%`,
              height: `${30 + Math.random() * 40}px`,
              animation: `rain-fall ${1.5 + Math.random() * 2}s linear infinite`,
              animationDelay: `${Math.random() * 3}s`,
              top: "-40px",
            }}
          />
        ))}
      </div>
    )
  }

  if (type === "neon") {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${100 + i * 60}px`,
              height: `${100 + i * 60}px`,
              left: `${20 + i * 10}%`,
              top: `${20 + i * 15}%`,
              border: `1px solid ${color}${15 + i * 5}`,
              animation: `pulse-glow ${3 + i}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>
    )
  }

  if (type === "fire") {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array(8).fill(0).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              backgroundColor: `${color}60`,
              left: `${10 + Math.random() * 80}%`,
              bottom: "10%",
              animation: `float-ember ${2 + Math.random() * 3}s ease-out infinite`,
              animationDelay: `${i * 0.3}s`,
              boxShadow: `0 0 6px ${color}40`,
            }}
          />
        ))}
      </div>
    )
  }

  if (type === "wave") {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div className="flex items-end gap-[3px] h-20">
          {Array(30).fill(0).map((_, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full"
              style={{
                backgroundColor: `${color}30`,
                animation: `wave-bar 1.5s ease-in-out infinite`,
                animationDelay: `${i * 0.05}s`,
                height: "100%",
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  // stars
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array(15).fill(0).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            backgroundColor: `${color}80`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
            boxShadow: `0 0 4px ${color}60`,
          }}
        />
      ))}
    </div>
  )
}

function VideoSlide({ video, isActive }: { video: typeof VIDEOS[0]; isActive: boolean }) {
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(video.likes)
  const [showHeart, setShowHeart] = useState(false)
  const [following, setFollowing] = useState(false)
  const lastTap = useRef(0)

  const handleDoubleTap = useCallback(() => {
    const now = Date.now()
    if (now - lastTap.current < 300) {
      if (!liked) {
        setLiked(true)
        setLikeCount((c) => c + 1)
      }
      setShowHeart(true)
      setTimeout(() => setShowHeart(false), 800)
    }
    lastTap.current = now
  }, [liked])

  const toggleLike = () => {
    setLiked((l) => !l)
    setLikeCount((c) => (liked ? c - 1 : c + 1))
  }

  return (
    <div className="h-full w-full relative flex-shrink-0 snap-start snap-always" onClick={handleDoubleTap}>
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-b ${video.gradient}`} />

      {/* Visual effect overlay */}
      <VideoVisual type={video.visualType} color={video.accentColor} active={isActive} />

      {/* Double-tap heart animation */}
      {showHeart && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <svg className="w-24 h-24 text-white animate-heart-pop" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
      )}

      {/* LU2CA watermark center */}
      {isActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-white/[0.06] text-6xl font-bold tracking-[0.3em]">LU2CA</p>
            <p className="text-white/[0.04] text-sm tracking-[0.5em] mt-1">CIDADE NEON</p>
          </div>
        </div>
      )}

      {/* Right sidebar actions */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-10">
        {/* Profile */}
        <div className="relative">
          <div className="w-11 h-11 rounded-full flex items-center justify-center border-[2.5px] border-white overflow-hidden" style={{ background: `linear-gradient(135deg, ${video.accentColor}, #6B9DFF)` }}>
            <span className="text-white text-sm font-bold">L</span>
          </div>
          {!following && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFollowing(true) }}
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-[#FF2D55] rounded-full flex items-center justify-center border border-black"
            >
              <span className="text-white text-[10px] font-bold">+</span>
            </button>
          )}
        </div>

        {/* Like */}
        <button type="button" onClick={(e) => { e.stopPropagation(); toggleLike() }} className="flex flex-col items-center gap-0.5 active:scale-110 transition-transform">
          <svg className={`w-8 h-8 transition-colors ${liked ? "text-[#FF2D55]" : "text-white"}`} fill={liked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={liked ? 0 : 1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          <span className="text-white text-[10px] font-medium">{formatCount(likeCount)}</span>
        </button>

        {/* Comment */}
        <button type="button" onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-0.5">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
          </svg>
          <span className="text-white text-[10px] font-medium">{formatCount(video.comments)}</span>
        </button>

        {/* Share */}
        <button type="button" onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-0.5">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
          <span className="text-white text-[10px] font-medium">{formatCount(video.shares)}</span>
        </button>

        {/* Music disc */}
        <div className={`w-10 h-10 rounded-full border-2 border-white/10 flex items-center justify-center ${isActive ? "animate-spin-slow" : ""}`} style={{ background: `conic-gradient(from 0deg, ${video.accentColor}30, #111, ${video.accentColor}30)` }}>
          <div className="w-3 h-3 rounded-full bg-white/40" />
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-16 left-3 right-16 z-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white font-bold text-[15px]">@lu2ca.mp3</span>
          {!following ? (
            <button type="button" onClick={(e) => { e.stopPropagation(); setFollowing(true) }} className="px-2.5 py-0.5 border border-white/60 rounded text-[10px] text-white font-medium active:bg-white/10 transition-colors">
              Seguir
            </button>
          ) : (
            <span className="text-white/40 text-[10px]">Seguindo</span>
          )}
        </div>
        <p className="text-white/90 text-[13px] leading-relaxed mb-3">{video.caption}</p>
        {/* Music ticker */}
        <div className="flex items-center gap-2 bg-black/20 rounded-full py-1.5 px-3">
          <svg className="w-3 h-3 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
          <div className="overflow-hidden flex-1">
            <p className="text-white text-[11px] whitespace-nowrap animate-ticker">{video.songName} &nbsp;&nbsp;&nbsp;&nbsp; {video.songName}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TikTokFeedPage() {
  const router = useRouter()
  const globalAudio = useAudioPlayer()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Pause global Spotify audio on TikTok
  useEffect(() => { globalAudio.pause() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleScroll = () => {
      const idx = Math.round(el.scrollTop / el.clientHeight)
      setActiveIdx(idx)
    }
    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] relative overflow-hidden">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />

        {/* Close button - goes back to phone home */}
        <button
          type="button"
          onClick={() => router.push("/")}
          className="absolute top-[42px] left-3 z-30 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center active:bg-black/60 transition-colors"
          aria-label="Voltar para inicio"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* "Para voce" / "Seguindo" tabs */}
        <div className="absolute top-[42px] left-0 right-0 z-20 flex items-center justify-center gap-5">
          <span className="text-white/40 text-sm font-medium">Seguindo</span>
          <span className="text-white text-sm font-bold relative">
            Para voce
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-[2px] bg-white rounded-full" />
          </span>
        </div>

        {/* Video progress dots */}
        <div className="absolute top-[68px] left-0 right-0 z-20 flex justify-center gap-1.5">
          {VIDEOS.map((_, i) => (
            <div key={i} className={`h-[3px] rounded-full transition-all duration-300 ${i === activeIdx ? "w-4 bg-white" : "w-1.5 bg-white/20"}`} />
          ))}
        </div>

        {/* Scrollable video container */}
        <div ref={scrollRef} className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none">
          {VIDEOS.map((video, i) => (
            <div key={video.id} className="h-full">
              <VideoSlide video={video} isActive={i === activeIdx} />
            </div>
          ))}
        </div>

        {/* Bottom nav bar */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-black py-2 px-4 flex items-center justify-around">
          <button type="button" onClick={() => router.push("/")} className="flex flex-col items-center gap-0.5">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
            <span className="text-white text-[9px] font-medium">Inicio</span>
          </button>
          <div className="flex flex-col items-center gap-0.5">
            <svg className="w-6 h-6 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            <span className="text-white/30 text-[9px]">Buscar</span>
          </div>
          <div className="relative">
            <div className="w-12 h-8 rounded-lg overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-[#00f2ea] rounded-lg translate-x-[2px]" />
              <div className="absolute inset-0 bg-[#ff0050] rounded-lg -translate-x-[2px]" />
              <div className="absolute inset-[2px] bg-white rounded-md flex items-center justify-center">
                <span className="text-black text-lg font-bold leading-none">+</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <svg className="w-6 h-6 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
            <span className="text-white/30 text-[9px]">Inbox</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-white/60 text-[8px] font-bold">L</span>
            </div>
            <span className="text-white/30 text-[9px]">Perfil</span>
          </div>
        </div>
      </div>
      <style jsx>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes rain-fall { 0%{transform:translateY(-40px);opacity:0} 20%{opacity:0.6} 100%{transform:translateY(calc(100vh + 40px));opacity:0} }
        @keyframes pulse-glow { 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.05)} }
        @keyframes float-ember { 0%{transform:translateY(0) scale(1);opacity:0.8} 100%{transform:translateY(-300px) translateX(30px) scale(0);opacity:0} }
        @keyframes wave-bar { 0%,100%{transform:scaleY(0.3)} 50%{transform:scaleY(1)} }
        @keyframes twinkle { 0%,100%{opacity:0.2;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }
        @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes heart-pop { 0%{transform:scale(0);opacity:1} 50%{transform:scale(1.3);opacity:0.8} 100%{transform:scale(1);opacity:0} }
        .animate-ticker{animation:ticker 8s linear infinite}
        .animate-spin-slow{animation:spin 4s linear infinite}
        .animate-heart-pop{animation:heart-pop 0.8s ease-out forwards}
      `}</style>
    </div>
  )
}
