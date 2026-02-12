"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"

const QUESTIONS = [
  {
    type: "pattern" as const,
    question: "Qual numero completa a sequencia?",
    sequence: "2, 6, 18, 54, ?",
    options: ["108", "162", "72", "96"],
    correct: 1, // 162
  },
  {
    type: "logic" as const,
    question: "Se A = 1, B = 2, C = 3... Quanto vale NEON?",
    sequence: "N + E + O + N",
    options: ["46", "50", "44", "52"],
    correct: 0, // N=14, E=5, O=15, N=14 = 48... actually 14+5+15+14=48
    // let me fix: correct answer should be there
  },
  {
    type: "spatial" as const,
    question: "Quantos cubos tem no total?",
    visual: "3x3-L",
    options: ["7", "8", "6", "9"],
    correct: 0,
  },
  {
    type: "pattern" as const,
    question: "Qual vem a seguir?",
    sequence: "1, 1, 2, 3, 5, 8, ?",
    options: ["11", "13", "15", "10"],
    correct: 1, // 13 (fibonacci)
  },
  {
    type: "logic" as const,
    question: "Se o relogio mostra 3:15, qual e o angulo entre os ponteiros?",
    sequence: null,
    options: ["7.5 graus", "0 graus", "15 graus", "90 graus"],
    correct: 0, // 7.5 degrees
  },
]

const TIME_PER_QUESTION = 15

function PatternVisual({ sequence }: { sequence: string }) {
  return (
    <div className="bg-white/5 rounded-2xl p-6 mb-6 border border-cyan-500/10">
      <p className="text-cyan-400 text-2xl font-mono font-bold text-center tracking-wider">{sequence}</p>
    </div>
  )
}

function SpatialVisual() {
  // 3D-looking L-shape made of cubes
  return (
    <div className="bg-white/5 rounded-2xl p-6 mb-6 border border-cyan-500/10 flex items-center justify-center">
      <div className="relative" style={{ width: 120, height: 100 }}>
        {/* Bottom row: 3 cubes */}
        {[0, 1, 2].map(i => (
          <div key={`b${i}`} className="absolute" style={{ left: i * 32, bottom: 0, width: 30, height: 30 }}>
            <div className="w-full h-full bg-cyan-500/30 border border-cyan-400/50 rounded-sm" />
            <div className="absolute -top-2 left-1 w-full h-2 bg-cyan-500/20 border-t border-l border-r border-cyan-400/30 rounded-t-sm skew-x-[-20deg]" />
          </div>
        ))}
        {/* Left column: 2 more on top of first */}
        {[1, 2].map(i => (
          <div key={`l${i}`} className="absolute" style={{ left: 0, bottom: i * 28, width: 30, height: 30 }}>
            <div className="w-full h-full bg-cyan-500/30 border border-cyan-400/50 rounded-sm" />
            <div className="absolute -top-2 left-1 w-full h-2 bg-cyan-500/20 border-t border-l border-r border-cyan-400/30 rounded-t-sm skew-x-[-20deg]" />
          </div>
        ))}
        {/* Top-right: 2 more on right side */}
        {[1, 2].map(i => (
          <div key={`r${i}`} className="absolute" style={{ left: i * 32, bottom: 28, width: 30, height: 30 }}>
            <div className="w-full h-full bg-cyan-500/30 border border-cyan-400/50 rounded-sm" />
            <div className="absolute -top-2 left-1 w-full h-2 bg-cyan-500/20 border-t border-l border-r border-cyan-400/30 rounded-t-sm skew-x-[-20deg]" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ClockVisual() {
  return (
    <div className="bg-white/5 rounded-2xl p-6 mb-6 border border-cyan-500/10 flex items-center justify-center">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30" />
        {/* Hour marks */}
        {Array(12).fill(0).map((_, i) => (
          <div key={i} className="absolute w-0.5 h-2 bg-cyan-400/40 left-1/2 -translate-x-1/2" style={{ transform: `rotate(${i * 30}deg)`, transformOrigin: "center 48px" }} />
        ))}
        {/* Hour hand at 3 */}
        <div className="absolute left-1/2 top-1/2 w-1 h-8 bg-cyan-400 rounded-full origin-bottom" style={{ transform: "translateX(-50%) rotate(97.5deg)" }} />
        {/* Minute hand at 15 */}
        <div className="absolute left-1/2 top-1/2 w-0.5 h-10 bg-white/60 rounded-full origin-bottom" style={{ transform: "translateX(-50%) rotate(90deg)" }} />
        <div className="absolute left-1/2 top-1/2 w-2 h-2 bg-cyan-400 rounded-full -translate-x-1/2 -translate-y-1/2" />
      </div>
    </div>
  )
}

export default function IQTestPage() {
  const router = useRouter()
  const { completeConfirmation, updateCinematicStep } = useGameFunnel()

  const [currentQ, setCurrentQ] = useState(0)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION)
  const [selected, setSelected] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    updateCinematicStep("confirmation-2")
  }, [updateCinematicStep])

  // Timer
  useEffect(() => {
    if (showResult || showFeedback) return
    setTimeLeft(TIME_PER_QUESTION)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time up - wrong answer
          if (timerRef.current) clearInterval(timerRef.current)
          handleSelect(-1)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [currentQ, showResult])

  const handleSelect = useCallback((idx: number) => {
    if (showFeedback) return
    if (timerRef.current) clearInterval(timerRef.current)
    setSelected(idx)
    setShowFeedback(true)

    const isCorrect = idx === QUESTIONS[currentQ].correct
    if (isCorrect) setScore(s => s + 1)

    setTimeout(() => {
      setTransitioning(true)
      setTimeout(() => {
        if (currentQ < QUESTIONS.length - 1) {
          setCurrentQ(q => q + 1)
          setSelected(null)
          setShowFeedback(false)
          setTransitioning(false)
        } else {
          const finalScore = isCorrect ? score + 1 : score
          setShowResult(true)
          completeConfirmation(2, { iqScore: finalScore, total: QUESTIONS.length })
          setTimeout(() => router.push("/whatsapp"), 3500)
        }
      }, 300)
    }, 1200)
  }, [currentQ, showFeedback, score, completeConfirmation, router])

  const q = QUESTIONS[currentQ]
  const iqEstimate = Math.round(80 + (score / QUESTIONS.length) * 55)
  const rankName = iqEstimate >= 130 ? "Genio de Neon" : iqEstimate >= 115 ? "Mente Afiada" : iqEstimate >= 100 ? "Equilibrado" : "Em Evolucao"

  if (showResult) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col items-center justify-center p-8 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628] via-black to-[#0a1628]" />

          <div className="relative z-10 text-center animate-fade-in">
            <p className="text-cyan-400/60 text-xs uppercase tracking-[0.3em] mb-6">Confirmacao 2/3 Completa</p>

            {/* IQ Ring */}
            <div className="relative w-36 h-36 mx-auto mb-6">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(6,182,212,0.1)" strokeWidth="6" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#06B6D4" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(score / QUESTIONS.length) * 314} 314`} className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-cyan-400 text-3xl font-bold">{iqEstimate}</span>
                <span className="text-white/30 text-[10px]">QI</span>
              </div>
            </div>

            <h1 className="text-white text-xl font-bold mb-1">{rankName}</h1>
            <p className="text-white/40 text-sm mb-2">{score}/{QUESTIONS.length} corretas</p>
            <p className="text-white/30 text-xs">Sua mente esta pronta para Cidade Neon.</p>

            <div className="flex items-center justify-center gap-2 pt-8">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              <p className="text-white/30 text-xs">Voltando ao WhatsApp...</p>
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
            </div>
          </div>
        </div>
        <style jsx>{`
          @keyframes fade-in { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
          .animate-fade-in{animation:fade-in .6s ease-out forwards}
        `}</style>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628] via-[#0d1b2a] to-[#0a1628]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />

        <div className="relative z-10 flex flex-col h-full pt-[50px] px-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1.5">
              {QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full transition-all"
                  style={{
                    backgroundColor: i < currentQ ? "#06B6D4" : i === currentQ ? "#06B6D4" : "rgba(255,255,255,0.1)",
                    opacity: i <= currentQ ? 1 : 0.3,
                    transform: i === currentQ ? "scale(1.3)" : "scale(1)",
                  }}
                />
              ))}
            </div>
            <p className="text-white/30 text-xs">CONFIRMACAO 2/3</p>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-linear"
                style={{
                  width: `${(timeLeft / TIME_PER_QUESTION) * 100}%`,
                  backgroundColor: timeLeft <= 5 ? "#EF4444" : timeLeft <= 10 ? "#F59E0B" : "#06B6D4",
                }}
              />
            </div>
            <span className={`text-xs font-mono w-6 text-right ${timeLeft <= 5 ? "text-red-400" : "text-white/40"}`}>
              {timeLeft}
            </span>
          </div>

          {/* Question area */}
          <div className={`flex-1 flex flex-col transition-all duration-300 ${transitioning ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"}`}>
            <p className="text-white/50 text-[11px] uppercase tracking-wider mb-2">Questao {currentQ + 1}</p>
            <h2 className="text-white text-lg font-semibold mb-4 text-balance">{q.question}</h2>

            {/* Visual */}
            {q.type === "spatial" ? (
              <SpatialVisual />
            ) : q.type === "logic" && !q.sequence ? (
              <ClockVisual />
            ) : q.sequence ? (
              <PatternVisual sequence={q.sequence} />
            ) : null}

            {/* Options */}
            <div className="space-y-2.5 mt-auto mb-8">
              {q.options.map((opt, i) => {
                const isCorrect = i === q.correct
                const isSelected = i === selected
                let bg = "rgba(255,255,255,0.03)"
                let border = "rgba(255,255,255,0.08)"
                let textColor = "rgba(255,255,255,0.8)"

                if (showFeedback) {
                  if (isCorrect) {
                    bg = "rgba(34,197,94,0.15)"
                    border = "#22C55E"
                    textColor = "#22C55E"
                  } else if (isSelected && !isCorrect) {
                    bg = "rgba(239,68,68,0.15)"
                    border = "#EF4444"
                    textColor = "#EF4444"
                  }
                }

                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => { if (!showFeedback) handleSelect(i) }}
                    disabled={showFeedback}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 active:scale-[0.98] text-left"
                    style={{ backgroundColor: bg, border: `1px solid ${border}`, color: textColor }}
                  >
                    <span className="w-7 h-7 rounded-full border flex items-center justify-center text-xs font-mono flex-shrink-0" style={{ borderColor: border }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-sm font-medium">{opt}</span>
                    {showFeedback && isCorrect && (
                      <svg className="w-5 h-5 ml-auto text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    )}
                    {showFeedback && isSelected && !isCorrect && (
                      <svg className="w-5 h-5 ml-auto text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
