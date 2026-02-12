"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import { useAudioPlayer } from "@/app/providers/AudioPlayerProvider"

const TRACKS = [
  { id: "nectar", name: "NECTAR", masked: "1. n**t**", color: "#FF6B9D", audio: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/NECTAR%20%28INSTRUMENTAL%29-cpc97l75aiwhXeJ2h2qbZ0Lhos0GmK.mp3" },
  { id: "dopamina", name: "DOPAMINA", masked: "2. d******A", color: "#FF9D6B", audio: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/DOPAMINA%20%28INSTRUMENTAL%29-RMoTXZGA59MUwGLVHT1MqGjNCeseSv.mp3" },
  { id: "ojala", name: "OJALA", masked: "4. *j**a", color: "#6B9DFF", audio: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/OJALA%CC%81%20%28INSTRUMENTAL%29-JRyOmaJg7ZCx8wQLwBNcmq7kglrRvb.mp3" },
  { id: "sabeontem", name: "SABE ONTEM?", masked: "7. s*** o****?", color: "#FFD93D", audio: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SABE%20ONTEM_%20%28%29.mp3.mp3%20%28online-audio-converter.com%29%20%281%29%20%281%29-mqjcc03wIYdjfEMqPZ2fXU1OOXOGD6.mp3" },
  { id: "chuva", name: "CHUVA", masked: "9. C***A", color: "#9DFF6B", audio: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/CHUVA%20%28INSTRUMENTAL%29-vixjoBQT7YX5HzJKTUfrSULZeLY7vF.mp3" },
]

const EMOTIONS: Record<string, string[]> = {
  nectar:    ["DESEJO", "TENTACAO", "PELE", "SEDE", "DOCE"],
  dopamina:  ["EUFORIA", "RUSH", "PRAZER", "INTENSO", "VICIO"],
  ojala:     ["SAUDADE", "ESPERANCA", "DISTANTE", "SONHO", "FE"],
  sabeontem: ["DUVIDA", "MEMORIA", "ARREPENDIMENTO", "CONFUSAO", "TEMPO"],
  chuva:     ["MELANCOLIA", "RENOVACAO", "LAGRIMA", "PAZ", "LIMPEZA"],
}

export default function Confirmacao1Page() {
  const router = useRouter()
  const { completeConfirmation, updateCinematicStep, state } = useGameFunnel()

  const alreadyDone = state.confirmations.c1.done
  const savedData = state.confirmations.c1.data as Record<string, string> | undefined
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null)
  const [matches, setMatches] = useState<Record<string, string>>(
    alreadyDone && savedData ? (savedData.trackEmotions as unknown as Record<string, string>) || {} : {}
  )
  const [showResult, setShowResult] = useState(alreadyDone)
  const [animatingOut, setAnimatingOut] = useState(false)
  const [isRevisit] = useState(alreadyDone)
  const [playingTrack, setPlayingTrack] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const globalAudio = useAudioPlayer()

  useEffect(() => {
    updateCinematicStep("confirmation-1")
    // Pause global Spotify audio on this page (it has its own track audio)
    globalAudio.pause()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Play track audio instantly on selection
  const playTrack = (trackId: string) => {
    const track = TRACKS.find(t => t.id === trackId)
    if (!track?.audio) return

    // Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    const audio = new Audio(track.audio)
    audio.volume = 0.6
    audio.loop = true
    audio.play().catch(() => {})
    audioRef.current = audio
    setPlayingTrack(trackId)
  }

  // Stop audio when leaving or showing result
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const matchedCount = Object.keys(matches).length
  const allMatched = matchedCount === 5

  const handleEmotionPick = (emotion: string) => {
    if (!selectedTrack || matches[selectedTrack]) return
    const newMatches = { ...matches, [selectedTrack]: emotion }
    setMatches(newMatches)

    if (Object.keys(newMatches).length === 5) {
      // All matched - stop audio, show result
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
      setPlayingTrack(null)
      setTimeout(() => {
        setShowResult(true)
        completeConfirmation(1, { trackEmotions: newMatches })
      }, 600)
    } else {
      // Auto-select next unmatched track and play its audio
      setTimeout(() => {
        const next = TRACKS.find(t => !newMatches[t.id])
        if (next) { setSelectedTrack(next.id); playTrack(next.id) }
      }, 400)
    }
  }

  if (showResult) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col items-center justify-center p-8 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-black to-[#0f0f23]" />

          {/* Animated color ring from all track colors */}
          <div className="absolute inset-0 flex items-center justify-center">
            {TRACKS.map((t, i) => (
              <div
                key={t.id}
                className="absolute rounded-full border-2 animate-pulse"
                style={{
                  width: `${180 + i * 40}px`,
                  height: `${180 + i * 40}px`,
                  borderColor: `${t.color}40`,
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: `${2 + i * 0.3}s`,
                }}
              />
            ))}
          </div>

          <div className="relative z-10 text-center space-y-6 animate-fade-in">
            <p className="text-white/40 text-xs uppercase tracking-[0.3em]">Confirmacao 1/3 Completa</p>

            {/* Matched pairs visual */}
            <div className="space-y-2 my-6">
              {TRACKS.map(t => (
                <div key={t.id} className="flex items-center justify-center gap-3">
                  <span className="text-sm font-bold w-28 text-right" style={{ color: t.color }}>{t.name}</span>
                  <div className="w-6 h-[2px] rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="text-sm w-28 text-left" style={{ color: `${t.color}CC` }}>{matches[t.id]}</span>
                </div>
              ))}
            </div>

            <p className="text-white/50 text-sm">A musica reflete quem voce e.</p>

            <div className="mt-4 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-white font-bold text-sm uppercase tracking-widest">TIRE UM PRINT DO RESULTADO</p>
            </div>

            <button type="button" onClick={() => router.push("/")} className="mt-6 px-8 py-3 rounded-xl bg-white/10 text-white text-sm font-medium active:scale-95 transition-transform">
              Voltar ao Inicio
            </button>
          </div>
        </div>
        <style jsx>{`
          @keyframes fade-in { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
          .animate-fade-in{animation:fade-in .5s ease-out forwards}
          @keyframes eq1 { 0%,100%{height:8px} 50%{height:14px} }
          @keyframes eq2 { 0%,100%{height:14px} 50%{height:6px} }
          @keyframes eq3 { 0%,100%{height:6px} 50%{height:12px} }
          .animate-eq1{animation:eq1 .4s ease-in-out infinite}
          .animate-eq2{animation:eq2 .5s ease-in-out infinite}
          .animate-eq3{animation:eq3 .35s ease-in-out infinite}
        `}</style>
      </div>
    )
  }

  const activeTrack = TRACKS.find(t => t.id === selectedTrack)
  const activeEmotions = selectedTrack ? EMOTIONS[selectedTrack] : []
  const isTrackMatched = (id: string) => !!matches[id]

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f23]" />

        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />

        {/* Home button */}
        <button type="button" onClick={() => router.push("/")} className="absolute top-[42px] left-3 z-20 w-9 h-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center" aria-label="Voltar para inicio">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
        </button>

        <div className="relative z-10 flex flex-col h-full pt-[50px] px-5">
          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex gap-1 mb-2">
              {TRACKS.map((t, i) => (
                <div
                  key={t.id}
                  className="flex-1 h-1.5 rounded-full transition-all duration-500"
                  style={{
                    backgroundColor: matches[t.id] ? t.color : "rgba(255,255,255,0.08)",
                  }}
                />
              ))}
            </div>
            <p className="text-white/60 text-[12px] text-center font-bold tracking-wide">
              Conecte cada faixa a uma emocao &middot; {matchedCount}/5
            </p>
            <p className="text-white/25 text-[10px] text-center mt-1">CONFIRMACAO 1/3</p>
          </div>

          {/* Track list */}
          <div className="space-y-2 mb-5">
            <p className="text-white/50 text-[11px] uppercase tracking-wider mb-2">Faixas</p>
            {TRACKS.map((t) => {
              const matched = isTrackMatched(t.id)
              const active = selectedTrack === t.id && !matched
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { if (!matched) { setSelectedTrack(t.id); playTrack(t.id) } }}
                  disabled={matched}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-left
                    ${active ? "ring-2 scale-[1.02]" : ""}
                    ${matched ? "opacity-60" : "active:scale-[0.98]"}
                  `}
                  style={{
                    backgroundColor: active ? `${t.color}15` : matched ? `${t.color}08` : "rgba(255,255,255,0.03)",
                    borderColor: active ? t.color : "transparent",
                    ringColor: active ? t.color : undefined,
                    // @ts-expect-error ring color override
                    "--tw-ring-color": active ? t.color : undefined,
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                    style={{ backgroundColor: `${t.color}${matched ? "40" : active ? "CC" : "30"}` }}
                  >
                    {matched ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={t.color} strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={t.color} strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" /></svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm font-mono tracking-wide" style={{ color: matched ? `${t.color}80` : t.color }}>{t.masked}</p>
                    {matched && <p className="text-[11px] mt-0.5" style={{ color: `${t.color}60` }}>{matches[t.id]}</p>}
                  </div>
                  {playingTrack === t.id && !matched && (
                    <div className="flex items-center gap-[2px]">
                      <div className="w-[3px] h-3 rounded-full animate-eq1" style={{ backgroundColor: t.color }} />
                      <div className="w-[3px] h-4 rounded-full animate-eq2" style={{ backgroundColor: t.color }} />
                      <div className="w-[3px] h-2 rounded-full animate-eq3" style={{ backgroundColor: t.color }} />
                    </div>
                  )}
                  {active && !matched && playingTrack !== t.id && (
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: t.color }} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Emotions panel (shown when a track is selected) */}
          <div className="flex-1 flex flex-col">
            {selectedTrack && !isTrackMatched(selectedTrack) ? (
              <div className={`transition-all duration-300 ${animatingOut ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}>
                <p className="text-white/50 text-[11px] uppercase tracking-wider mb-2">
                  Qual emocao define <span className="font-mono" style={{ color: activeTrack?.color }}>{activeTrack?.masked}</span>?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {activeEmotions.map((emotion) => {
                    const alreadyUsed = Object.values(matches).includes(emotion)
                    return (
                      <button
                        key={emotion}
                        type="button"
                        onClick={() => { if (!alreadyUsed) handleEmotionPick(emotion) }}
                        disabled={alreadyUsed}
                        className={`
                          py-3 px-3 rounded-xl text-sm font-semibold transition-all duration-200
                          ${alreadyUsed ? "opacity-20 cursor-not-allowed" : "active:scale-95 hover:scale-[1.02]"}
                        `}
                        style={{
                          backgroundColor: alreadyUsed ? "rgba(255,255,255,0.03)" : `${activeTrack?.color}18`,
                          color: activeTrack?.color,
                          border: `1px solid ${alreadyUsed ? "transparent" : `${activeTrack?.color}30`}`,
                        }}
                      >
                        {emotion}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : !allMatched ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-white/20 text-sm text-center">Selecione uma faixa acima</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
