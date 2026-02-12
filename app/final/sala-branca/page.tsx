"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import { ExternalLink } from "lucide-react"

const ALBUM_LINK = "https://untitled.stream/buy/project/cwGIXvpY419u7v6UDOHQz"

export default function SalaBrancaPage() {
  const router = useRouter()
  const { state, setState, updateCinematicStep } = useGameFunnel()
  
  const [colorPhase, setColorPhase] = useState(0)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    updateCinematicStep("sala-branca")
    
    // Fade in content
    setTimeout(() => setShowContent(true), 500)
  }, [updateCinematicStep])

  // Aurora color cycle (10-20s per phase)
  useEffect(() => {
    const interval = setInterval(() => {
      setColorPhase((prev) => (prev + 1) % 6)
    }, 15000)
    
    return () => clearInterval(interval)
  }, [])

  const auroraColors = [
    "linear-gradient(180deg, #E8F4F8 0%, #B4E4D3 25%, #89CFF0 50%, #F8E8F0 75%, #FFFFFF 100%)",
    "linear-gradient(180deg, #F0E8F8 0%, #D3B4E4 25%, #F089CF 50%, #E8F0F8 75%, #FFFFFF 100%)",
    "linear-gradient(180deg, #F8F0E8 0%, #E4D3B4 25%, #CFF089 50%, #F8E8F0 75%, #FFFFFF 100%)",
    "linear-gradient(180deg, #E8F8F0 0%, #B4E4D3 25%, #89F0CF 50%, #F0E8F8 75%, #FFFFFF 100%)",
    "linear-gradient(180deg, #F8E8F8 0%, #E4B4D3 25%, #F0CF89 50%, #E8F8F0 75%, #FFFFFF 100%)",
    "linear-gradient(180deg, #E8F0F8 0%, #D3E4B4 25%, #89CFF0 50%, #F8F0E8 75%, #FFFFFF 100%)",
  ]

  const handleBuyAlbum = () => {
    // Mark as completed
    setState((prev) => ({
      ...prev,
      unlocked: {
        ...prev.unlocked,
        finalCompleted: true,
        deviceUnlocked: true,
        easterEggsEnabled: true,
      },
      cinematicStep: "completed",
    }))
    
    // Open link
    window.open(ALBUM_LINK, "_blank")
  }

  const handleReturn = () => {
    setState((prev) => ({
      ...prev,
      unlocked: {
        ...prev.unlocked,
        finalCompleted: true,
        deviceUnlocked: true,
        easterEggsEnabled: true,
      },
      cinematicStep: "completed",
    }))
    router.push("/")
  }

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden">
      {/* Aurora background */}
      <div 
        className="absolute inset-0 transition-all duration-[10000ms] ease-linear"
        style={{ background: auroraColors[colorPhase] }}
      />
      
      {/* Animated aurora waves */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] opacity-30 animate-aurora-1"
          style={{
            background: "radial-gradient(ellipse at center, rgba(180,228,211,0.4) 0%, transparent 70%)",
          }}
        />
        <div 
          className="absolute -top-1/2 -right-1/2 w-[200%] h-[200%] opacity-20 animate-aurora-2"
          style={{
            background: "radial-gradient(ellipse at center, rgba(137,207,240,0.4) 0%, transparent 70%)",
          }}
        />
        <div 
          className="absolute -bottom-1/2 left-1/4 w-[150%] h-[150%] opacity-25 animate-aurora-3"
          style={{
            background: "radial-gradient(ellipse at center, rgba(248,232,240,0.5) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* iPhone Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-full max-w-[100vw] md:max-w-[400px] h-[54px] flex items-center justify-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[126px] h-[34px] bg-black rounded-b-[18px]" />
      </div>

      {/* Home button */}
      <button type="button" onClick={() => router.push("/")} className="absolute top-[42px] left-3 z-40 w-9 h-9 rounded-full bg-black/20 backdrop-blur flex items-center justify-center" aria-label="Voltar para inicio">
        <svg className="w-5 h-5 text-black/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
      </button>

      {/* Main content */}
      <div 
        className={`relative z-10 w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col items-center justify-center p-8 transition-all duration-1000 ${
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* Album cover */}
        <div className="relative mb-8">
          <div className="w-64 h-64 rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border border-white/20">
            <Image 
              src="/images/album-cover.jpg" 
              alt="CIDADE NEON - Album" 
              fill 
              className="object-cover"
            />
          </div>
          
          {/* Glow effect */}
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 blur-xl -z-10" />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-800 mb-2 text-center tracking-tight">
          CIDADE NEON
        </h1>
        <p className="text-gray-500 text-lg mb-8">LU2CA</p>

        {/* CTA Button */}
        <button
          type="button"
          onClick={handleBuyAlbum}
          className="group w-full max-w-[280px] bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 px-8 rounded-full shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-3 min-h-[56px]"
        >
          <span className="text-lg">ALBUM &quot;CIDADE NEON&quot;</span>
          <ExternalLink className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Return link */}
        <button
          type="button"
          onClick={handleReturn}
          className="mt-6 text-gray-400 hover:text-gray-600 text-sm transition-colors min-h-[44px]"
        >
          Voltar ao iPhone
        </button>

        {/* Subtle footer */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <p className="text-gray-400/60 text-xs">
            Voce completou a experiencia Cidade Neon
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes aurora-1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(5%, -5%) rotate(5deg); }
          50% { transform: translate(-5%, 5%) rotate(-5deg); }
          75% { transform: translate(3%, 3%) rotate(3deg); }
        }
        @keyframes aurora-2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(-5%, 5%) rotate(-3deg); }
          66% { transform: translate(5%, -3%) rotate(5deg); }
        }
        @keyframes aurora-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-3%, -3%) scale(1.05); }
        }
        .animate-aurora-1 { animation: aurora-1 30s ease-in-out infinite; }
        .animate-aurora-2 { animation: aurora-2 25s ease-in-out infinite; }
        .animate-aurora-3 { animation: aurora-3 20s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
