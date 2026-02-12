"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"

const VIDEOS = [
  { id: 1, caption: "CHUVA ao vivo no studio. a energia tava diferente nesse dia.", likes: "12.4K", comments: "847", shares: "2.1K", gradient: "from-[#0f172a] via-[#1e3a5f] to-[#0f172a]" },
  { id: 2, caption: "POV: voce descobriu a Cidade Neon e nunca mais voltou", likes: "8.7K", comments: "523", shares: "1.8K", gradient: "from-[#1a0a2e] via-[#2d1b69] to-[#0f0a1e]" },
  { id: 3, caption: "making of do clipe de NECTAR. nos bastidores o caos e lindo.", likes: "15.2K", comments: "1.2K", shares: "3.4K", gradient: "from-[#1a0f0f] via-[#3d1a1a] to-[#0f0a0a]" },
  { id: 4, caption: "DOPAMINA no repeat. quantas vezes voce ja ouviu? comenta ai", likes: "9.3K", comments: "634", shares: "1.5K", gradient: "from-[#0f1a0a] via-[#1a3d1a] to-[#0a0f0a]" },
  { id: 5, caption: "ultima faixa desbloqueada. SABE ONTEM? o disco ta completo.", likes: "21.1K", comments: "2.3K", shares: "5.2K", gradient: "from-[#1a1a0a] via-[#3d3d1a] to-[#0f0f0a]" },
]

function VideoSlide({ video, isActive }: { video: typeof VIDEOS[0]; isActive: boolean }) {
  const [liked, setLiked] = useState(false)

  return (
    <div className="h-full w-full relative flex-shrink-0 snap-start snap-always">
      {/* Background gradient (simulated video) */}
      <div className={`absolute inset-0 bg-gradient-to-b ${video.gradient}`} />

      {/* Animated visual overlay */}
      {isActive && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Floating particles */}
          {Array(6).fill(0).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/20 rounded-full"
              style={{
                left: `${15 + i * 15}%`,
                animation: `float-up ${3 + i * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.4}s`,
                bottom: "20%",
              }}
            />
          ))}
          {/* LU2CA branding center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-white/10 text-5xl font-bold tracking-[0.3em]">LU2CA</p>
              <p className="text-white/5 text-sm tracking-[0.5em] mt-1">CIDADE NEON</p>
            </div>
          </div>
        </div>
      )}

      {/* Right sidebar - actions */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
        {/* Profile */}
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B9D] to-[#6B9DFF] flex items-center justify-center border-2 border-white">
            <span className="text-white text-xs font-bold">L</span>
          </div>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#FF2D55] rounded-full flex items-center justify-center">
            <span className="text-white text-[8px]">+</span>
          </div>
        </div>

        {/* Like */}
        <button type="button" onClick={() => setLiked(!liked)} className="flex flex-col items-center gap-0.5">
          <svg className={`w-7 h-7 ${liked ? "text-[#FF2D55]" : "text-white"}`} fill={liked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={liked ? 0 : 2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
          <span className="text-white text-[10px]">{liked ? `${Number.parseFloat(video.likes) + 0.1}K` : video.likes}</span>
        </button>

        {/* Comment */}
        <div className="flex flex-col items-center gap-0.5">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>
          <span className="text-white text-[10px]">{video.comments}</span>
        </div>

        {/* Share */}
        <div className="flex flex-col items-center gap-0.5">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
          <span className="text-white text-[10px]">{video.shares}</span>
        </div>

        {/* Music disc */}
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br from-[#333] to-[#111] border-2 border-white/10 flex items-center justify-center ${isActive ? "animate-spin-slow" : ""}`}>
          <div className="w-3 h-3 rounded-full bg-white/30" />
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-5 left-3 right-16 z-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white font-bold text-sm">@lu2ca.mp3</span>
          <button type="button" className="px-2.5 py-0.5 border border-white rounded text-[10px] text-white font-medium">Seguir</button>
        </div>
        <p className="text-white text-xs leading-relaxed mb-3">{video.caption}</p>
        {/* Music ticker */}
        <div className="flex items-center gap-2">
          <svg className="w-3 h-3 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
          <div className="overflow-hidden flex-1">
            <p className="text-white text-[11px] whitespace-nowrap animate-ticker">LU2CA - Cidade Neon (Original Sound) &nbsp;&nbsp;&nbsp; LU2CA - Cidade Neon (Original Sound)</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TikTokFeedPage() {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
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

        {/* Close button */}
        <button type="button" onClick={() => router.push("/")} className="absolute top-[42px] left-3 z-20 w-9 h-9 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* "For You" / "Seguindo" tabs */}
        <div className="absolute top-[42px] left-0 right-0 z-20 flex items-center justify-center gap-4">
          <span className="text-white/50 text-sm font-medium">Seguindo</span>
          <span className="text-white text-sm font-bold border-b-2 border-white pb-0.5">Para voce</span>
        </div>

        {/* Scrollable video container */}
        <div ref={scrollRef} className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none">
          {VIDEOS.map((video, i) => (
            <div key={video.id} className="h-full">
              <VideoSlide video={video} isActive={i === activeIdx} />
            </div>
          ))}
        </div>

        {/* Bottom nav */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/80 backdrop-blur-sm py-2 px-6 flex items-center justify-between">
          <div className="flex flex-col items-center gap-0.5">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
            <span className="text-white text-[9px]">Inicio</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            <span className="text-white/40 text-[9px]">Buscar</span>
          </div>
          <div className="w-10 h-7 bg-white rounded-lg flex items-center justify-center">
            <span className="text-black text-lg font-bold leading-none">+</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
            <span className="text-white/40 text-[9px]">Inbox</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-5 h-5 rounded-full bg-white/20" />
            <span className="text-white/40 text-[9px]">Perfil</span>
          </div>
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-30 pb-0.5"><div className="w-32 h-1 bg-white/20 rounded-full" /></div>
      </div>
      <style jsx>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes float-up { 0%{transform:translateY(0) scale(1);opacity:0.3} 50%{opacity:0.6} 100%{transform:translateY(-200px) scale(0.5);opacity:0} }
        @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .animate-ticker{animation:ticker 8s linear infinite}
        .animate-spin-slow{animation:spin 4s linear infinite}
      `}</style>
    </div>
  )
}
