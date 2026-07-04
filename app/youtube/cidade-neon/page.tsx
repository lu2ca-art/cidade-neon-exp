"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"

export default function YouTubeCidadeNeonPage() {
  const router = useRouter()
  const { updateCinematicStep } = useGameFunnel()

  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [liked, setLiked] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showDescription, setShowDescription] = useState(false)
  const totalDuration = 240 // 4 min video
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    updateCinematicStep("tiktok-notification") // reuse step
  }, [updateCinematicStep])

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setElapsed((p) => {
        if (p >= totalDuration) {
          setIsPlaying(false)
          return p
        }
        return p + 1
      })
      setProgress((p) => {
        if (p >= 100) return 100
        return p + 100 / totalDuration
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isPlaying])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  const handleBack = () => {
    router.push("/?screen=home")
  }

  const handleVideoEnd = () => {
    // After video, go back to home where WhatsApp messages will arrive
    router.push("/?screen=home")
  }

  const COMMENTS = [
    { user: "neon_kid", text: "esse filme mudou minha vida", time: "2h", likes: "1.2K" },
    { user: "cidadeneonbr", text: "a fotografia e absurda", time: "5h", likes: "890" },
    { user: "musicaboa", text: "LU2CA nunca decepciona", time: "1d", likes: "2.3K" },
    { user: "rua.neon", text: "a cena do carro e insana", time: "3d", likes: "456" },
    { user: "arte.urbana", text: "precisamos de mais artistas assim", time: "5d", likes: "1.8K" },
  ]

  return (
    <div className="min-h-screen bg-black flex items-center justify-center touch-manipulation">
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] relative flex flex-col bg-[#0f0f0f]" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Roboto, sans-serif' }}>
        
  {/* Notch */}
  <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />

  {/* Home button */}
  <button type="button" onClick={() => router.push("/?screen=home")} className="absolute top-[42px] left-3 z-40 w-9 h-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center" aria-label="Voltar para inicio">
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
  </button>
  
  {/* Status bar */}
        <div className="relative z-20 h-[50px] flex items-end justify-between px-6 pb-1 text-white text-xs bg-black">
          <span className="font-semibold w-12">9:41</span>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-3" fill="white" viewBox="0 0 16 12"><rect x="0" y="6" width="3" height="6" rx="0.5"/><rect x="4.5" y="4" width="3" height="8" rx="0.5"/><rect x="9" y="1" width="3" height="11" rx="0.5"/><rect x="13" y="0" width="3" height="12" rx="0.5" opacity="0.3"/></svg>
            <svg className="w-6 h-3" fill="white" viewBox="0 0 25 12"><rect x="0" y="1" width="22" height="10" rx="2" stroke="white" strokeWidth="1" fill="none"/><rect x="1.5" y="2.5" width="16" height="7" rx="1" fill="white"/><rect x="23" y="4" width="2" height="4" rx="0.5" fill="white" opacity="0.4"/></svg>
          </div>
        </div>

        {/* Video Player Area */}
        <div className="relative bg-black w-full aspect-video flex-shrink-0">
          <Image
            src="/images/album-cover.jpg"
            alt="Cidade Neon - Filme Oficial"
            fill
            className="object-cover"
          />
          {/* Play overlay */}
          <button type="button" onClick={() => setIsPlaying(!isPlaying)} className="absolute inset-0 flex items-center justify-center z-10">
            {!isPlaying && (
              <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center">
                <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              </div>
            )}
          </button>
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 z-20">
            <div className="h-[3px] bg-white/20">
              <div className="h-full bg-red-600 transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }} />
            </div>
          </div>
          {/* Time overlay */}
          <div className="absolute bottom-2 right-2 z-20 bg-black/70 px-1.5 py-0.5 rounded text-white text-[10px] tabular-nums">
            {formatTime(elapsed)} / {formatTime(totalDuration)}
          </div>
          {/* Back button */}
          <button type="button" onClick={handleBack} className="absolute top-2 left-2 z-20 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center min-h-[44px] min-w-[44px]">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </button>
        </div>

        {/* Video Info */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-3">
            <h1 className="text-white font-semibold text-[15px] leading-tight mb-1">LU2CA - Cidade Neon (Filme Oficial)</h1>
            <button type="button" onClick={() => setShowDescription(!showDescription)} className="text-[#aaa] text-xs flex items-center gap-1">
              <span>892K visualizacoes - 3 dias atras</span>
              <svg className={`w-3 h-3 transition-transform ${showDescription ? "rotate-180" : ""}`} fill="currentColor" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
            </button>
            {showDescription && (
              <div className="mt-2 p-3 bg-[#272727] rounded-xl">
                <p className="text-white/80 text-xs leading-relaxed">Um filme sobre as ruas, sobre a noite, sobre o que acontece quando a cidade acorda e ninguem mais ta prestando atencao. Dirigido por LU2CA. Fotografia: equipe Cidade Neon.</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {["#cidadeneon", "#lu2ca", "#filmeoficial", "#musica"].map(tag => (
                    <span key={tag} className="text-[#3ea6ff] text-xs">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons row */}
          <div className="flex items-center justify-around px-2 py-2 border-b border-white/10">
            <button type="button" onClick={() => setLiked(!liked)} className="flex flex-col items-center gap-1 min-h-[44px] justify-center">
              {liked ? (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM4 15H2v7h2v-7z"/></svg>
              )}
              <span className="text-white text-[10px]">{liked ? "43K" : "42K"}</span>
            </button>
            <button type="button" className="flex flex-col items-center gap-1 min-h-[44px] justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 15V9a3 3 0 013-3l4 9v-11H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10zM20 9h2v-7h-2v7z"/></svg>
              <span className="text-white text-[10px]">Nao gostei</span>
            </button>
            <button type="button" onClick={() => setShowShare(true)} className="flex flex-col items-center gap-1 min-h-[44px] justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M14 9V3L22 12 14 21v-6c-5 0-8.5 1.6-11 5.1C4 14 7.5 9 14 9z"/></svg>
              <span className="text-white text-[10px]">Compartilhar</span>
            </button>
            <button type="button" className="flex flex-col items-center gap-1 min-h-[44px] justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              <span className="text-white text-[10px]">Download</span>
            </button>
          </div>

          {/* Channel info */}
          <div className="flex items-center gap-3 px-3 py-3 border-b border-white/10">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
              <Image src="/images/avatar-dbee.jpg" alt="LU2CA" width={40} height={40} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium">LU2CA</p>
              <p className="text-[#aaa] text-xs">24.5K inscritos</p>
            </div>
            <button
              type="button"
              onClick={() => setSubscribed(!subscribed)}
              className={`px-4 py-2 rounded-full text-sm font-medium min-h-[36px] transition-colors ${subscribed ? "bg-[#272727] text-white/60" : "bg-white text-black"}`}
            >
              {subscribed ? "Inscrito" : "Inscrever-se"}
            </button>
          </div>

          {/* Comments section */}
          <button type="button" onClick={() => setShowComments(true)} className="w-full px-3 py-3 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-medium">Comentarios</span>
              <span className="text-[#aaa] text-xs">1.2K</span>
            </div>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
          </button>

          {/* Related / end CTA */}
          {progress >= 95 && (
            <div className="px-3 py-4">
              <button type="button" onClick={handleVideoEnd} className="w-full bg-white text-black font-bold py-3 rounded-full text-sm active:scale-95 transition-transform">
                Voltar para a experiencia
              </button>
            </div>
          )}

          {/* Suggested videos */}
          <div className="px-3 py-3 space-y-3">
            <p className="text-white/60 text-xs font-medium">A seguir</p>
            {["CHUVA - Clipe Oficial", "Copo Americano (Lyric Video)", "Cidade Neon - Making Of"].map((title, i) => (
              <div key={i} className="flex gap-3 opacity-60">
                <div className="w-[140px] h-[80px] bg-[#272727] rounded-lg flex-shrink-0 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white/30" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium line-clamp-2">{title}</p>
                  <p className="text-[#aaa] text-[10px] mt-1">LU2CA</p>
                  <p className="text-[#aaa] text-[10px]">Em breve</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* YouTube bottom nav */}
        <div className="bg-[#0f0f0f] border-t border-white/10 flex items-center justify-around py-1.5 pb-[env(safe-area-inset-bottom,6px)]">
          <button type="button" className="flex flex-col items-center gap-0.5 text-white min-h-[40px] justify-center">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span className="text-[9px]">Inicio</span>
          </button>
          <button type="button" className="flex flex-col items-center gap-0.5 text-white/40 min-h-[40px] justify-center">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.53 11.2c-.23-.3-.5-.56-.76-.82-.65-.6-1.4-1.03-2.03-1.66-1.46-1.46-1.78-3.87-.85-5.72-.78.14-1.53.53-2.18 1.11-.97.88-1.52 2.01-1.65 3.21-.02.21-.03.41-.03.62 0 .07 0 .14-.01.21-.14.01-.27-.02-.39-.09-.08-.05-.14-.12-.18-.2-.12-.23-.15-.5-.06-.76.1-.28.32-.51.58-.62-.38-.51-.53-1.19-.38-1.78.03-.13.07-.26.13-.39-.65.12-1.26.46-1.67.97-.44.55-.64 1.26-.56 1.96.02.17.06.33.12.49.05.13.11.26.19.38-.18-.05-.35-.13-.5-.24-.12-.09-.22-.2-.3-.33-.21-.33-.29-.72-.22-1.1.02-.12.05-.24.1-.36-.66.49-1.1 1.23-1.16 2.05-.07.96.32 1.92.98 2.63.5.54 1.18.92 1.88 1.12l-.06.06c-.3.29-.67.49-1.07.59-.28.07-.57.1-.86.08.4.58 1 1.02 1.69 1.21.69.2 1.44.14 2.09-.16l.14-.07c-.02.08-.04.16-.08.24-.17.38-.46.71-.82.94-.17.11-.36.2-.55.26.56.34 1.22.49 1.87.41.69-.09 1.33-.44 1.79-.97.03-.04.07-.08.1-.13.46-.56.75-1.28.75-2.03 0-.04 0-.07-.01-.11.68-.06 1.3-.38 1.76-.86.62-.65.95-1.55.89-2.46-.03-.42-.14-.84-.33-1.22z"/></svg>
            <span className="text-[9px]">Shorts</span>
          </button>
          <button type="button" className="flex flex-col items-center min-h-[40px] justify-center">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
              <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
            </div>
          </button>
          <button type="button" className="flex flex-col items-center gap-0.5 text-white/40 min-h-[40px] justify-center">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z"/></svg>
            <span className="text-[9px]">Inscricoes</span>
          </button>
          <button type="button" className="flex flex-col items-center gap-0.5 text-white/40 min-h-[40px] justify-center">
            <div className="w-6 h-6 rounded-full bg-[#272727] flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">V</span>
            </div>
            <span className="text-[9px]">Voce</span>
          </button>
        </div>

        {/* Comments modal */}
        {showComments && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-end">
            <div className="w-full bg-[#212121] rounded-t-2xl max-h-[70vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <span className="text-white font-medium text-sm">Comentarios</span>
                <button type="button" onClick={() => setShowComments(false)} className="min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {COMMENTS.map((c, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#383838] flex-shrink-0 flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">{c.user[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white/60 text-xs">@{c.user}</span>
                        <span className="text-white/30 text-[10px]">{c.time}</span>
                      </div>
                      <p className="text-white text-sm mt-0.5">{c.text}</p>
                      <div className="flex items-center gap-4 mt-1.5">
                        <button type="button" className="flex items-center gap-1 text-white/40 text-xs">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM4 15H2v7h2v-7z"/></svg>
                          {c.likes}
                        </button>
                        <button type="button" className="text-white/40">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 15V9a3 3 0 013-3l4 9v-11H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Share modal */}
        {showShare && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-end">
            <div className="w-full bg-[#212121] rounded-t-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white font-medium">Compartilhar</span>
                <button type="button" onClick={() => setShowShare(false)} className="min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {["WhatsApp", "Instagram", "Twitter", "Copiar Link"].map(app => (
                  <button key={app} type="button" className="flex flex-col items-center gap-2 min-w-[60px]">
                    <div className="w-12 h-12 rounded-full bg-[#383838] flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{app[0]}</span>
                    </div>
                    <span className="text-white text-[10px]">{app}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
