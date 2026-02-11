"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import { Heart, MessageCircle, Share2, Music2, ChevronUp, X } from "lucide-react"

const VIDEOS = [
  {
    id: 1,
    type: "live",
    title: "AO VIVO - Cidade Neon",
    description: "A energia da cidade em tempo real. Voces estao aqui comigo.",
    likes: "42.3K",
    comments: "1.2K",
    shares: "890",
    music: "som original - LU2CA",
    username: "@lu2ca.mp3",
    caption: "quando a cidade acorda, a gente ta la #cidadeneon #aovivo",
  },
  {
    id: 2,
    type: "videoclipe",
    title: "CHUVA - Videoclipe Oficial",
    description: "Visuals que traduzem o som em imagem.",
    likes: "128K",
    comments: "4.5K",
    shares: "2.1K",
    music: "CHUVA - LU2CA",
    username: "@lu2ca.mp3",
    caption: "quando chove na cidade neon tudo fica mais real #chuva #videoclipe",
  },
  {
    id: 3,
    type: "cta",
    title: "O DISCO TA PRONTO",
    description: "LU2CA olha pra camera e fala diretamente com voce.",
    likes: "89.7K",
    comments: "6.8K",
    shares: "3.2K",
    music: "som original - LU2CA",
    username: "@lu2ca.mp3",
    caption: "e ai, voce veio ate aqui. agora so falta uma coisa. #cidadeneon #album",
    isCTA: true,
  },
]

export default function TikTokFinalPage() {
  const router = useRouter()
  const { state, updateCinematicStep, updateTikTokState } = useGameFunnel()
  
  const [currentVideo, setCurrentVideo] = useState(state.perAppState.tiktok.currentVideo)
  const [liked, setLiked] = useState<Record<number, boolean>>({})
  const [showComments, setShowComments] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    updateCinematicStep("tiktok-final")
  }, [updateCinematicStep])

  const handleNext = () => {
    if (isAnimating) return
    if (currentVideo < VIDEOS.length - 1) {
      setIsAnimating(true)
      setTimeout(() => {
        const next = currentVideo + 1
        setCurrentVideo(next)
        updateTikTokState({ currentVideo: next, videosWatched: [...state.perAppState.tiktok.videosWatched, VIDEOS[currentVideo].id] })
        setIsAnimating(false)
      }, 300)
    }
  }

  const handlePrev = () => {
    if (isAnimating) return
    if (currentVideo > 0) {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentVideo((prev) => prev - 1)
        setIsAnimating(false)
      }, 300)
    }
  }

  const handleLike = (videoId: number) => {
    setLiked((prev) => ({ ...prev, [videoId]: !prev[videoId] }))
  }

  const handleGoToSalaBranca = () => {
    updateCinematicStep("sala-branca")
    router.push("/final/sala-branca")
  }

  const handleClose = () => {
    router.push("/")
  }

  const video = VIDEOS[currentVideo]

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
      <div 
        className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] relative"
        onTouchStart={(e) => {
          const startY = e.touches[0].clientY
          const handleTouchEnd = (endE: TouchEvent) => {
            const endY = endE.changedTouches[0].clientY
            const diff = startY - endY
            if (diff > 50) handleNext()
            else if (diff < -50) handlePrev()
            document.removeEventListener("touchend", handleTouchEnd)
          }
          document.addEventListener("touchend", handleTouchEnd)
        }}
      >
        {/* Video background (simulated) */}
        <div 
          className={`absolute inset-0 transition-all duration-300 ${isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
          style={{
            background: video.type === "live" 
              ? "linear-gradient(180deg, #FF6B6B 0%, #1a1a2e 50%, #000 100%)"
              : video.type === "videoclipe"
                ? "linear-gradient(180deg, #6B9DFF 0%, #1a1a2e 50%, #000 100%)"
                : "linear-gradient(180deg, #9DFF6B 0%, #1a1a2e 50%, #000 100%)"
          }}
        >
          {/* Simulated video content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center px-8">
              {video.type === "live" && (
                <div className="mb-4">
                  <div className="inline-flex items-center gap-2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full" />
                    AO VIVO
                  </div>
                </div>
              )}
              <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                <Image 
                  src="/images/avatar-dbee.jpg" 
                  alt="LU2CA" 
                  width={120} 
                  height={120} 
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <h2 className="text-white text-xl font-bold mb-2">{video.title}</h2>
              <p className="text-white/60 text-sm">{video.description}</p>
            </div>
          </div>
        </div>

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 left-4 z-30 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center min-h-[44px] min-w-[44px]"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Progress dots */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex gap-1">
          {VIDEOS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === currentVideo ? "w-6 bg-white" : "w-1 bg-white/30"
              }`}
            />
          ))}
        </div>

        {/* Side actions */}
        <div className="absolute right-4 bottom-32 z-20 flex flex-col items-center gap-6">
          {/* Profile */}
          <div className="relative">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white">
              <Image 
                src="/images/avatar-dbee.jpg" 
                alt="LU2CA" 
                width={48} 
                height={48} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
              <span className="text-white text-xs">+</span>
            </div>
          </div>

          {/* Like */}
          <button
            type="button"
            onClick={() => handleLike(video.id)}
            className="flex flex-col items-center gap-1 min-h-[44px]"
          >
            <Heart 
              className={`w-8 h-8 transition-all ${liked[video.id] ? "fill-red-500 text-red-500 scale-110" : "text-white"}`}
            />
            <span className="text-white text-xs">{video.likes}</span>
          </button>

          {/* Comments */}
          <button
            type="button"
            onClick={() => setShowComments(true)}
            className="flex flex-col items-center gap-1 min-h-[44px]"
          >
            <MessageCircle className="w-8 h-8 text-white" />
            <span className="text-white text-xs">{video.comments}</span>
          </button>

          {/* Share */}
          <button
            type="button"
            className="flex flex-col items-center gap-1 min-h-[44px]"
          >
            <Share2 className="w-8 h-8 text-white" />
            <span className="text-white text-xs">{video.shares}</span>
          </button>

          {/* Music */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-gray-600 flex items-center justify-center animate-spin-slow">
            <Music2 className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-4 left-4 right-20 z-20">
          <p className="text-white font-bold mb-1">{video.username}</p>
          <p className="text-white text-sm mb-2 break-words">{video.caption}</p>
          <div className="flex items-center gap-2">
            <Music2 className="w-4 h-4 text-white" />
            <p className="text-white text-xs truncate">{video.music}</p>
          </div>
        </div>

        {/* CTA Button for last video */}
        {video.isCTA && (
          <div className="absolute bottom-24 left-4 right-4 z-20">
            <button
              type="button"
              onClick={handleGoToSalaBranca}
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold py-4 px-6 rounded-full shadow-lg shadow-purple-500/30 transition-all hover:scale-105 min-h-[44px]"
            >
              Ir para a Sala Branca
            </button>
          </div>
        )}

        {/* Swipe hint */}
        {currentVideo < VIDEOS.length - 1 && (
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center animate-bounce">
            <ChevronUp className="w-6 h-6 text-white/50" />
            <p className="text-white/50 text-xs">Deslize para cima</p>
          </div>
        )}

        {/* Comments modal */}
        {showComments && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-end">
            <div className="w-full bg-[#1a1a1a] rounded-t-3xl max-h-[70vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <span className="text-white font-bold">{video.comments} comentarios</span>
                <button type="button" onClick={() => setShowComments(false)} className="min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
              <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(70vh-60px)]">
                {["isso e demais!", "quando sai o album?", "cidade neon ja", "voce e incrivel", "finalmente!"].map((comment, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10" />
                    <div>
                      <p className="text-white/60 text-xs">@usuario{i + 1}</p>
                      <p className="text-white text-sm">{comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow { animation: spin-slow 3s linear infinite; }
      `}</style>
    </div>
  )
}
