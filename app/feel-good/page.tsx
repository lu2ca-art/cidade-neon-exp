"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import { useAudioPlayer } from "@/app/providers/AudioPlayerProvider"

interface Connection {
  music: string
  word: string
  color: string
}

const TRACKS = [
  {
    id: "chuva",
    name: "CH**A",
    fullName: "CHUVA",
    color: "#9DFF6B",
    audioUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/CHUVA%20%28MASTER%29-gjxdvkaY9bF5PpjHELCGqT3NrahEsG.mp3",
  },
  {
    id: "copo",
    name: "C*P* AM*R*C*N*",
    fullName: "COPO AMERICANO",
    color: "#FF6B9D",
    audioUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/COPO%20AMERICANO%20%28MASTER%29-jPjZxju7Z5bxrhmi3XF7pgqkoZGajw.mp3",
  },
  {
    id: "dopamina",
    name: "D*P*M*N*",
    fullName: "DOPAMINA",
    color: "#FF9D6B",
    audioUrl: "",
  },
  {
    id: "ojala",
    name: "OJ*L*",
    fullName: "OJALA",
    color: "#6B9DFF",
    audioUrl: "",
  },
  {
    id: "sabeontem",
    name: "S*B* ONT*M?",
    fullName: "SABE ONTEM?",
    color: "#FFD93D",
    audioUrl: "",
  },
]

const WORD_SETS: Record<string, string[]> = {
  chuva:     ["MELANCOLIA", "LIMPEZA", "RENOVACAO", "LAGRIMA", "CINZA", "PAZ"],
  copo:      ["DESEJO", "TENTACAO", "DOCE", "VICIO", "SEDE", "PELE"],
  dopamina:  ["EUFORIA", "RUSH", "VICIO", "PRAZER", "INTENSO", "MAIS"],
  ojala:     ["SAUDADE", "ESPERANCA", "DISTANTE", "SONHO", "TALVEZ", "FE"],
  sabeontem: ["DUVIDA", "MEMORIA", "PASSADO", "ARREPENDIMENTO", "CONFUSAO", "TEMPO"],
}

export default function FeelGoodPage() {
  const router = useRouter()
  const { completeConfirmation, updateCinematicStep, state } = useGameFunnel()
  const globalAudio = useAudioPlayer()
  const audioRef = useRef<HTMLAudioElement>(null)

  const [selectedTrack, setSelectedTrack] = useState<string | null>(null)
  const [currentWords, setCurrentWords] = useState<string[]>([])
  const [connections, setConnections] = useState<Connection[]>(state.confirmations.c2.connections || [])
  const [showResult, setShowResult] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    updateCinematicStep("confirmation-2")
  }, [updateCinematicStep])

  useEffect(() => {
    if (state.confirmations.c2.done && state.confirmations.c2.connections) {
      setShowResult(true)
      setConnections(state.confirmations.c2.connections)
    }
  }, [state.confirmations.c2])

  const handleTrackSelect = (trackId: string) => {
    if (connections.some((c) => c.music === trackId)) return
    setSelectedTrack(trackId)
    setCurrentWords(WORD_SETS[trackId] || [])
    setIsPlaying(true)
    globalAudio.pause()

    // toca o audio real da faixa se disponivel; se nao, continua sem audio
    const track = TRACKS.find(t => t.id === trackId)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
    }
    if (track?.audioUrl) {
      const audio = new Audio(track.audioUrl)
      audio.volume = 0.7
      audioRef.current = audio
      audio.play().catch(() => {})
    }
    // sem audio = apenas seleciona a faixa normalmente, palavras aparecem igual
  }

  const handleWordSelect = (word: string) => {
    if (!selectedTrack) return
    const track = TRACKS.find((t) => t.id === selectedTrack)
    if (!track) return

    const newConnection: Connection = { music: selectedTrack, word, color: track.color }
    const newConnections = [...connections, newConnection]
    setConnections(newConnections)
    setSelectedTrack(null)
    setCurrentWords([])
    setIsPlaying(false)
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = "" }

    if (newConnections.length >= 5) {
      setShowResult(true)
    }
  }

  const handleComplete = () => {
    completeConfirmation(2, { connections })
    router.push("/whatsapp/privado/nizzy")
  }

  const getTrackColor = (trackId: string) => TRACKS.find((t) => t.id === trackId)?.color || "#fff"

  // ── RESULTADO ────────────────────────────────────────────────────────────
  if (showResult) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col p-6 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f23]" />

          <div className="relative z-10 pt-8 mb-6 text-center">
            <p className="text-white/40 text-xs mb-2">FEEL.GOOD</p>
            <h1 className="text-white text-xl font-bold">Suas Conexoes</h1>
          </div>

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
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: conn.color, boxShadow: `0 0 10px ${conn.color}` }} />
                      <span className="text-white font-medium">{track?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-[2px]" style={{ background: `linear-gradient(90deg, ${conn.color}80, ${conn.color})` }} />
                      <span className="font-bold" style={{ color: conn.color, textShadow: `0 0 10px ${conn.color}50` }}>
                        {conn.word}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-8 text-center">
              <p className="text-white/60 text-sm mb-6">Tira um print dessa tela</p>
              <button
                type="button"
                onClick={handleComplete}
                className="w-full bg-gradient-to-r from-[#0F3460] to-[#6B9DFF] text-white font-bold py-4 px-6 rounded-xl transition-all hover:opacity-90 min-h-[44px]"
              >
                Concluir — Voltar pra Nizzy
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── GAME ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col relative">
        <div
          className="absolute inset-0 transition-colors duration-500"
          style={{
            background: selectedTrack
              ? `linear-gradient(180deg, ${getTrackColor(selectedTrack)}20 0%, #000 50%, #000 100%)`
              : "linear-gradient(180deg, #0F3460 0%, #16213e 50%, #0f0f23 100%)",
          }}
        />

        {/* Home button */}
        <button
          type="button"
          onClick={() => router.push("/?screen=home")}
          aria-label="Inicio"
          className="absolute top-[42px] left-3 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.14)" }}
        >
          <svg className="w-4 h-4 text-white/35" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <rect x="5" y="3" width="14" height="18" rx="3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none" />
          </svg>
        </button>

        {/* Header */}
        <div className="relative z-10 pt-8 px-6 mb-4">
          <p className="text-white/40 text-xs text-center mb-2">FEEL.GOOD</p>
          <h1 className="text-white text-xl font-bold text-center mb-2">Conecte Musica e Emocao</h1>
          <p className="text-white/60 text-sm text-center">Conexoes: {connections.length}/5</p>
        </div>

        {/* Progresso */}
        {connections.length > 0 && (
          <div className="relative z-10 px-6 mb-4">
            <div className="flex flex-wrap gap-2">
              {connections.map((conn, i) => (
                <div
                  key={i}
                  className="px-2 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: `${conn.color}20`, color: conn.color, border: `1px solid ${conn.color}40` }}
                >
                  {TRACKS.find((t) => t.id === conn.music)?.name} → {conn.word}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Duas colunas */}
        <div className="relative z-10 flex-1 flex gap-4 px-4 pb-6 overflow-hidden">
          {/* Faixas */}
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
                    className={`w-full py-3 px-3 rounded-xl text-left transition-all min-h-[44px] text-sm ${isConnected ? "opacity-30 cursor-not-allowed bg-white/5" : isSelected ? "ring-2 bg-white/10" : "bg-white/5 hover:bg-white/10"}`}
                    style={{ outlineColor: isSelected ? track.color : "transparent", color: isSelected ? track.color : "#fff" }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: track.color }} />
                      <span className="font-mono font-medium truncate tracking-wider">{track.name}</span>
                      {!track.audioUrl && (
                        <svg className="w-3 h-3 ml-auto opacity-30 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.59-.79-1.59-1.77V6.77c0-.98.71-1.77 1.59-1.77h2.74z" /></svg>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Palavras */}
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
                    style={{ color: getTrackColor(selectedTrack), textShadow: `0 0 10px ${getTrackColor(selectedTrack)}30` }}
                  >
                    {word}
                  </button>
                ))
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-white/30 text-sm text-center px-4">Selecione uma faixa para ver as palavras</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Indicador tocando */}
        {isPlaying && selectedTrack && (
          <div className="absolute bottom-4 left-4 right-4 z-10 rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: `${getTrackColor(selectedTrack)}20` }}>
            <div className="flex items-end gap-0.5 h-4">
              <div className="w-1 rounded-full animate-eq-1" style={{ backgroundColor: getTrackColor(selectedTrack) }} />
              <div className="w-1 rounded-full animate-eq-2" style={{ backgroundColor: getTrackColor(selectedTrack) }} />
              <div className="w-1 rounded-full animate-eq-3" style={{ backgroundColor: getTrackColor(selectedTrack) }} />
            </div>
            <span className="text-white text-sm">
              Tocando: <span style={{ color: getTrackColor(selectedTrack) }}>{TRACKS.find((t) => t.id === selectedTrack)?.name}</span>
            </span>
          </div>
        )}

        <audio ref={audioRef} />
      </div>

      <style jsx>{`
        @keyframes eq-1 { 0%,100%{height:4px} 50%{height:12px} }
        @keyframes eq-2 { 0%,100%{height:8px} 50%{height:4px} }
        @keyframes eq-3 { 0%,100%{height:6px} 50%{height:14px} }
        .animate-eq-1{animation:eq-1 .8s ease-in-out infinite}
        .animate-eq-2{animation:eq-2 .6s ease-in-out infinite}
        .animate-eq-3{animation:eq-3 .9s ease-in-out infinite}
      `}</style>
    </div>
  )
}
