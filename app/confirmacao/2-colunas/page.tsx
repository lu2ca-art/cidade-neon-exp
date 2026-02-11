"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"

interface Connection {
  music: string
  word: string
  color: string
}

const TRACKS = [
  { id: "nectar", name: "NECTAR", color: "#FF6B9D" },
  { id: "ojala", name: "OJALA", color: "#6B9DFF" },
  { id: "chuva", name: "CHUVA", color: "#9DFF6B" },
  { id: "sabeontem", name: "SABE ONTEM?", color: "#FFD93D" },
  { id: "dopamina", name: "DOPAMINA", color: "#FF9D6B" },
]

const WORD_SETS: Record<string, string[]> = {
  nectar: ["DESEJO", "TENTACAO", "DOCE", "VICIO", "SEDE", "PELE"],
  ojala: ["SAUDADE", "ESPERANCA", "DISTANTE", "SONHO", "TALVEZ", "FE"],
  chuva: ["MELANCOLIA", "LIMPEZA", "RENOVACAO", "LAGRIMA", "CINZA", "PAZ"],
  sabeontem: ["DUVIDA", "MEMORIA", "PASSADO", "ARREPENDIMENTO", "CONFUSAO", "TEMPO"],
  dopamina: ["EUFORIA", "RUSH", "VICIO", "PRAZER", "INTENSO", "MAIS"],
}

export default function Confirmacao2Page() {
  const router = useRouter()
  const { completeConfirmation, updateCinematicStep, state } = useGameFunnel()
  const audioRef = useRef<HTMLAudioElement>(null)
  
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null)
  const [currentWords, setCurrentWords] = useState<string[]>([])
  const [connections, setConnections] = useState<Connection[]>(state.confirmations.c2.connections || [])
  const [showResult, setShowResult] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    updateCinematicStep("confirmation-2")
  }, [updateCinematicStep])

  // If already completed, show result
  useEffect(() => {
    if (state.confirmations.c2.done && state.confirmations.c2.connections) {
      setShowResult(true)
      setConnections(state.confirmations.c2.connections)
    }
  }, [state.confirmations.c2])

  const handleTrackSelect = (trackId: string) => {
    // Don't allow selecting tracks already connected
    if (connections.some((c) => c.music === trackId)) return
    
    setSelectedTrack(trackId)
    setCurrentWords(WORD_SETS[trackId] || [])
    setIsPlaying(true)
    
    // Simulate audio playing
    // In production, would use actual audio files from /public/audio/c2/
  }

  const handleWordSelect = (word: string) => {
    if (!selectedTrack) return
    
    const track = TRACKS.find((t) => t.id === selectedTrack)
    if (!track) return
    
    const newConnection: Connection = {
      music: selectedTrack,
      word,
      color: track.color,
    }
    
    const newConnections = [...connections, newConnection]
    setConnections(newConnections)
    setSelectedTrack(null)
    setCurrentWords([])
    setIsPlaying(false)
    
    // Check if complete
    if (newConnections.length >= 5) {
      setShowResult(true)
    }
  }

  const handleComplete = () => {
    completeConfirmation(2, { connections })
    router.push("/whatsapp/grupo")
  }

  const getTrackColor = (trackId: string) => {
    return TRACKS.find((t) => t.id === trackId)?.color || "#fff"
  }

  if (showResult) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col p-6 relative">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f23]" />
          
          {/* Header */}
          <div className="relative z-10 pt-8 mb-6 text-center">
            <p className="text-white/40 text-xs mb-2">Confirmacao 2/3</p>
            <h1 className="text-white text-xl font-bold">Suas Conexoes</h1>
          </div>
          
          {/* Connections Display */}
          <div className="relative z-10 flex-1 flex flex-col justify-center">
            <div className="space-y-3">
              {connections.map((conn, index) => {
                const track = TRACKS.find((t) => t.id === conn.music)
                return (
                  <div 
                    key={index}
                    className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10"
                    style={{ borderColor: `${conn.color}40` }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: conn.color, boxShadow: `0 0 10px ${conn.color}` }}
                      />
                      <span className="text-white font-medium">{track?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-[2px] bg-gradient-to-r" style={{ background: `linear-gradient(90deg, ${conn.color}80, ${conn.color})` }} />
                      <span 
                        className="font-bold"
                        style={{ color: conn.color, textShadow: `0 0 10px ${conn.color}50` }}
                      >
                        {conn.word}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Screenshot hint */}
            <div className="mt-8 text-center">
              <p className="text-white/60 text-sm mb-6">Tira um print dessa tela</p>
              <button
                type="button"
                onClick={handleComplete}
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold py-4 px-6 rounded-xl transition-all hover:from-purple-500 hover:to-cyan-500 min-h-[44px]"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col relative">
        {/* Background with current track color */}
        <div 
          className="absolute inset-0 transition-colors duration-500"
          style={{ 
            background: selectedTrack 
              ? `linear-gradient(180deg, ${getTrackColor(selectedTrack)}20 0%, #000 50%, #000 100%)` 
              : "linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)" 
          }}
        />
        
        {/* Header */}
        <div className="relative z-10 pt-8 px-6 mb-4">
          <p className="text-white/40 text-xs text-center mb-2">Confirmacao 2/3</p>
          <h1 className="text-white text-xl font-bold text-center mb-2">Conecte Musica e Emocao</h1>
          <p className="text-white/60 text-sm text-center">Conexoes: {connections.length}/5</p>
        </div>
        
        {/* Connections progress */}
        {connections.length > 0 && (
          <div className="relative z-10 px-6 mb-4">
            <div className="flex flex-wrap gap-2">
              {connections.map((conn, i) => (
                <div 
                  key={i}
                  className="px-2 py-1 rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: `${conn.color}20`, 
                    color: conn.color,
                    border: `1px solid ${conn.color}40`
                  }}
                >
                  {TRACKS.find((t) => t.id === conn.music)?.name} → {conn.word}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Two columns layout */}
        <div className="relative z-10 flex-1 flex gap-4 px-4 pb-6 overflow-hidden">
          {/* Column 1: Tracks */}
          <div className="flex-1 flex flex-col">
            <p className="text-white/40 text-xs mb-3 text-center">FAIXAS</p>
            <div className="space-y-2 overflow-y-auto flex-1">
              {TRACKS.map((track) => {
                const isConnected = connections.some((c) => c.music === track.id)
                const isSelected = selectedTrack === track.id
                
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => handleTrackSelect(track.id)}
                    disabled={isConnected}
                    className={`w-full py-3 px-3 rounded-xl text-left transition-all min-h-[44px] text-sm ${
                      isConnected 
                        ? "opacity-30 cursor-not-allowed bg-white/5" 
                        : isSelected 
                          ? "ring-2" 
                          : "bg-white/5 hover:bg-white/10"
                    }`}
                    style={{ 
                      borderColor: isSelected ? track.color : "transparent",
                      ringColor: track.color,
                      color: isSelected ? track.color : "#fff"
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: track.color }}
                      />
                      <span className="font-medium truncate">{track.name}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          
          {/* Column 2: Words */}
          <div className="flex-1 flex flex-col">
            <p className="text-white/40 text-xs mb-3 text-center">PALAVRAS</p>
            <div className="space-y-2 overflow-y-auto flex-1">
              {selectedTrack ? (
                currentWords.map((word) => (
                  <button
                    key={word}
                    type="button"
                    onClick={() => handleWordSelect(word)}
                    className="w-full py-3 px-3 rounded-xl text-left transition-all min-h-[44px] text-sm bg-white/5 hover:bg-white/10"
                    style={{ 
                      color: getTrackColor(selectedTrack),
                      textShadow: `0 0 10px ${getTrackColor(selectedTrack)}30`
                    }}
                  >
                    {word}
                  </button>
                ))
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-white/30 text-sm text-center px-4">
                    Selecione uma faixa para ver as palavras
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Playing indicator */}
        {isPlaying && selectedTrack && (
          <div 
            className="absolute bottom-4 left-4 right-4 z-10 rounded-xl p-3 flex items-center gap-3"
            style={{ backgroundColor: `${getTrackColor(selectedTrack)}20` }}
          >
            <div className="flex items-end gap-0.5 h-4">
              <div className="w-1 bg-white animate-eq-1 rounded-full" style={{ backgroundColor: getTrackColor(selectedTrack) }} />
              <div className="w-1 bg-white animate-eq-2 rounded-full" style={{ backgroundColor: getTrackColor(selectedTrack) }} />
              <div className="w-1 bg-white animate-eq-3 rounded-full" style={{ backgroundColor: getTrackColor(selectedTrack) }} />
            </div>
            <span className="text-white text-sm">
              Tocando: <span style={{ color: getTrackColor(selectedTrack) }}>{TRACKS.find((t) => t.id === selectedTrack)?.name}</span>
            </span>
          </div>
        )}
        
        <audio ref={audioRef} />
      </div>
      
      <style jsx>{`
        @keyframes eq-1 {
          0%, 100% { height: 4px; }
          50% { height: 12px; }
        }
        @keyframes eq-2 {
          0%, 100% { height: 8px; }
          50% { height: 4px; }
        }
        @keyframes eq-3 {
          0%, 100% { height: 6px; }
          50% { height: 14px; }
        }
        .animate-eq-1 { animation: eq-1 0.8s ease-in-out infinite; }
        .animate-eq-2 { animation: eq-2 0.6s ease-in-out infinite; }
        .animate-eq-3 { animation: eq-3 0.9s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
