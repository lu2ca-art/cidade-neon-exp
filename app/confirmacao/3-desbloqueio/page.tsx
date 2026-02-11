"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import { Lock, Unlock, ExternalLink } from "lucide-react"

const TRACKS = [
  { 
    id: "nectar", 
    masked: "nt** = nectar**", 
    full: "NECTAR",
    link: "https://untitled.stream/library/project/qbbl7HZHxEaRfG6iW5mf4",
    color: "#FF6B9D"
  },
  { 
    id: "dopamina", 
    masked: "d**A = dopaminA", 
    full: "DOPAMINA",
    link: "https://untitled.stream/library/project/AoAia3NdQ7564mBpPXSfw",
    color: "#FF9D6B"
  },
  { 
    id: "ojala", 
    masked: "*j**a = ojala", 
    full: "OJALA",
    link: "https://untitled.stream/library/project/wsn7nQN3Q1TWA6ay2BfEx",
    color: "#6B9DFF"
  },
  { 
    id: "sabeontem", 
    masked: "s* o****? = sabeontem?", 
    full: "SABE ONTEM?",
    link: "https://untitled.stream/library/project/giWLdakvCtHYgcTPtPH6w",
    color: "#FFD93D"
  },
  { 
    id: "chuva", 
    masked: "CA = CHUVA*", 
    full: "CHUVA",
    link: "https://untitled.stream/library/project/KA60BruMe9ARHEhU9g7h9",
    color: "#9DFF6B"
  },
]

// Generate deterministic password based on track
const generatePassword = (trackId: string): string => {
  const seeds: Record<string, string> = {
    nectar: "NEON-7392",
    dopamina: "NEON-4581",
    ojala: "NEON-2847",
    sabeontem: "NEON-6194",
    chuva: "NEON-8253",
  }
  return seeds[trackId] || "NEON-0000"
}

export default function Confirmacao3Page() {
  const router = useRouter()
  const { completeConfirmation, updateCinematicStep, state } = useGameFunnel()
  
  const [selectedTrack, setSelectedTrack] = useState<string | null>(state.confirmations.c3.selectedTrack || null)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState<string | null>(state.confirmations.c3.password || null)
  const [revealedChars, setRevealedChars] = useState(0)

  useEffect(() => {
    updateCinematicStep("confirmation-3")
  }, [updateCinematicStep])

  // If already completed, show password screen
  useEffect(() => {
    if (state.confirmations.c3.done && state.confirmations.c3.selectedTrack) {
      setSelectedTrack(state.confirmations.c3.selectedTrack)
      setPassword(state.confirmations.c3.password || generatePassword(state.confirmations.c3.selectedTrack))
      setShowPassword(true)
      setRevealedChars(password?.length || 9)
    }
  }, [state.confirmations.c3, password])

  const handleTrackSelect = (trackId: string) => {
    setSelectedTrack(trackId)
    const pwd = generatePassword(trackId)
    setPassword(pwd)
    setShowPassword(true)
    
    // Typewriter reveal effect
    let charIndex = 0
    const interval = setInterval(() => {
      charIndex++
      setRevealedChars(charIndex)
      if (charIndex >= pwd.length) {
        clearInterval(interval)
      }
    }, 100)
  }

  const handleOpenLink = () => {
    const track = TRACKS.find((t) => t.id === selectedTrack)
    if (track) {
      window.open(track.link, "_blank")
    }
  }

  const handleComplete = () => {
    completeConfirmation(3, { selectedTrack, password })
    router.push("/whatsapp/grupo")
  }

  const track = TRACKS.find((t) => t.id === selectedTrack)

  if (showPassword && selectedTrack && password) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col items-center justify-center p-8 relative">
          {/* Background */}
          <div 
            className="absolute inset-0 transition-colors duration-500"
            style={{ background: `linear-gradient(180deg, ${track?.color}20 0%, #000 50%, #000 100%)` }}
          />
          
          {/* Unlocked icon */}
          <div className="relative z-10 mb-8 animate-bounce-slow">
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ 
                background: `linear-gradient(135deg, ${track?.color}40, ${track?.color}10)`,
                boxShadow: `0 0 40px ${track?.color}30`
              }}
            >
              <Unlock className="w-12 h-12" style={{ color: track?.color }} />
            </div>
          </div>
          
          {/* Track name */}
          <h1 
            className="relative z-10 text-3xl font-bold mb-2"
            style={{ color: track?.color, textShadow: `0 0 20px ${track?.color}50` }}
          >
            {track?.full}
          </h1>
          <p className="relative z-10 text-white/60 text-sm mb-8">Faixa desbloqueada</p>
          
          {/* Password reveal */}
          <div className="relative z-10 bg-white/5 rounded-2xl p-6 border border-white/10 mb-8 w-full max-w-[280px]">
            <p className="text-white/40 text-xs text-center mb-3">SUA SENHA</p>
            <div className="flex justify-center gap-1 font-mono text-2xl">
              {password.split("").map((char, i) => (
                <span 
                  key={i}
                  className={`transition-all duration-200 ${i < revealedChars ? "opacity-100" : "opacity-0"}`}
                  style={{ 
                    color: track?.color,
                    textShadow: `0 0 10px ${track?.color}50`
                  }}
                >
                  {char}
                </span>
              ))}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="relative z-10 w-full max-w-[280px] space-y-3">
            <button
              type="button"
              onClick={handleOpenLink}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-bold transition-all min-h-[44px]"
              style={{ 
                background: `linear-gradient(135deg, ${track?.color}, ${track?.color}80)`,
                color: "#000"
              }}
            >
              <span>Ouvir {track?.full}</span>
              <ExternalLink className="w-5 h-5" />
            </button>
            
            <button
              type="button"
              onClick={handleComplete}
              className="w-full bg-white/10 hover:bg-white/20 text-white py-4 px-6 rounded-xl font-medium transition-all min-h-[44px]"
            >
              Concluir
            </button>
          </div>
          
          {/* Footer note */}
          <p className="relative z-10 text-white/30 text-xs text-center mt-8 px-4">
            A senha e unica para voce. Guarde-a bem.
          </p>
        </div>
        
        <style jsx>{`
          @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
        `}</style>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col p-6 relative">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f23]" />
        
        {/* Header */}
        <div className="relative z-10 pt-8 mb-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <Lock className="w-8 h-8 text-white/60" />
          </div>
          <p className="text-white/40 text-xs mb-2">Confirmacao 3/3</p>
          <h1 className="text-white text-xl font-bold mb-2">Escolha uma faixa para desbloquear</h1>
          <p className="text-white/60 text-sm">Voce recebera uma senha unica</p>
        </div>
        
        {/* Track selection */}
        <div className="relative z-10 flex-1 space-y-3">
          {TRACKS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTrackSelect(t.id)}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-4 text-left transition-all min-h-[44px] group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${t.color}20` }}
                  >
                    <Lock className="w-5 h-5 transition-transform group-hover:scale-110" style={{ color: t.color }} />
                  </div>
                  <div>
                    <p className="text-white/50 text-xs font-mono mb-0.5">{t.masked}</p>
                    <p className="text-white font-medium">{t.full}</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 17l5-5-5-5v10z"/>
                </svg>
              </div>
            </button>
          ))}
        </div>
        
        {/* Footer */}
        <div className="relative z-10 pb-8">
          <p className="text-white/30 text-xs text-center">
            Escolha com cuidado. So pode desbloquear uma.
          </p>
        </div>
      </div>
    </div>
  )
}
