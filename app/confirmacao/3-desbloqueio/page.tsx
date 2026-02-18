"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"

/* ───────────── NEON PUZZLE DEFINITIONS ───────────── */

interface NeonPuzzle {
  type: "neon-pipes" | "neon-dots" | "neon-cube" | "logic"
  label: string
  options: string[]
  answer: number
  sequence?: string
}

const ALL_PUZZLES: NeonPuzzle[] = [
  {
    type: "neon-pipes",
    label: "Qual torneira enche o balde?",
    options: ["Torneira 1", "Torneira 2", "Torneira 3", "Torneira 4"],
    answer: 1,
  },
  {
    type: "neon-dots",
    label: "Quantas bolinhas mais claras voce consegue contar?",
    options: ["20", "24", "28", "32"],
    answer: 1,
  },
  {
    type: "neon-cube",
    label: "Qual cubo completa o padrao?",
    options: ["Cubo 1", "Cubo 2", "Cubo 3", "Cubo 4"],
    answer: 0,
  },
  {
    type: "logic",
    label: "Qual numero completa a sequencia?",
    sequence: "2, 6, 12, 20, 30, ?",
    options: ["36", "40", "42", "44"],
    answer: 2,
  },
  {
    type: "logic",
    label: "Se todos os A sao B, e alguns B sao C, qual afirmacao e verdadeira?",
    sequence: "A \u2192 B \u2192 C (parcial)",
    options: [
      "Todos os A sao C",
      "Alguns A podem ser C",
      "Nenhum A e C",
      "Todos os C sao A",
    ],
    answer: 1,
  },
]

const TIME_PER_Q = 25
const MIN_SCORE = 3
const TOTAL_QUESTIONS = 5

/* ───── NEON PIPE PUZZLE SVG ───── */
function NeonPipesPuzzle() {
  const COLORS = ["#06B6D4", "#D946EF", "#22C55E", "#F59E0B"]
  // Tangled paths: pipe 2 (magenta) reaches the bucket
  // Layout: 4 nodes at top (y=20), bucket target at bottom-left (x=50, y=275)
  // Other 3 drip to dead ends
  const paths = [
    // Pipe 1 (cyan) -> dead end bottom-right
    "M 60 35 C 60 80, 200 60, 160 110 C 120 160, 260 150, 240 200 C 220 250, 280 270, 280 275",
    // Pipe 2 (magenta) -> bucket at x=50
    "M 140 35 C 140 70, 40 90, 100 130 C 160 170, 20 180, 60 220 C 100 260, 40 260, 50 275",
    // Pipe 3 (green) -> dead end bottom-center
    "M 220 35 C 220 80, 120 100, 180 140 C 240 180, 140 200, 170 240 C 200 270, 160 275, 165 275",
    // Pipe 4 (amber) -> dead end far right
    "M 300 35 C 300 70, 240 110, 280 150 C 320 190, 200 220, 250 250 C 300 270, 320 275, 325 275",
  ]

  return (
    <div className="relative w-full rounded-2xl bg-[#0a1628] border border-cyan-500/10 overflow-hidden p-2">
      <svg viewBox="0 0 360 310" className="w-full h-auto" style={{ maxHeight: "220px" }}>
        <defs>
          {COLORS.map((c, i) => (
            <filter key={`glow-${i}`} id={`pipe-glow-${i}`}>
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
          <filter id="bucket-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Subtle grid */}
        {Array.from({ length: 18 }).map((_, i) => (
          <line key={`vg-${i}`} x1={i * 20} y1="0" x2={i * 20} y2="310" stroke="rgba(6,182,212,0.04)" strokeWidth="0.5" />
        ))}
        {Array.from({ length: 16 }).map((_, i) => (
          <line key={`hg-${i}`} x1="0" y1={i * 20} x2="360" y2={i * 20} stroke="rgba(6,182,212,0.04)" strokeWidth="0.5" />
        ))}

        {/* Pipe paths */}
        {paths.map((d, i) => (
          <g key={i}>
            <path d={d} fill="none" stroke={COLORS[i]} strokeWidth="3" strokeLinecap="round" opacity="0.15" strokeDasharray="none" />
            <path d={d} fill="none" stroke={COLORS[i]} strokeWidth="2" strokeLinecap="round" filter={`url(#pipe-glow-${i})`} />
          </g>
        ))}

        {/* Top nodes (faucets) */}
        {COLORS.map((c, i) => {
          const x = 60 + i * 80
          return (
            <g key={`node-${i}`}>
              <circle cx={x} cy="20" r="14" fill={c} opacity="0.15" />
              <circle cx={x} cy="20" r="10" fill="transparent" stroke={c} strokeWidth="2" filter={`url(#pipe-glow-${i})`} />
              <text x={x} y="24" textAnchor="middle" fill={c} fontSize="11" fontWeight="bold" fontFamily="monospace">{i + 1}</text>
            </g>
          )
        })}

        {/* Bucket at bottom (where pipe 2 leads) */}
        <g filter="url(#bucket-glow)">
          <rect x="32" y="270" width="36" height="28" rx="3" fill="transparent" stroke="#D946EF" strokeWidth="2" />
          <rect x="28" y="266" width="44" height="6" rx="2" fill="transparent" stroke="#D946EF" strokeWidth="1.5" />
          {/* Water inside bucket */}
          <rect x="35" y="282" width="30" height="13" rx="2" fill="#D946EF" opacity="0.2" />
        </g>

        {/* Dead-end drip indicators */}
        {[[280, 275], [165, 275], [325, 275]].map(([x, y], i) => (
          <g key={`drip-${i}`} opacity="0.3">
            <circle cx={x} cy={y} r="3" fill={[COLORS[0], COLORS[2], COLORS[3]][i]} />
            <circle cx={x} cy={(y as number) + 8} r="1.5" fill={[COLORS[0], COLORS[2], COLORS[3]][i]} opacity="0.5" />
          </g>
        ))}
      </svg>
    </div>
  )
}

/* ───── NEON DOTS PUZZLE ───── */
function NeonDotsPuzzle() {
  // 10x10 grid, 24 lighter dots at specific positions
  const LIGHTER_POSITIONS = new Set([
    2, 7, 11, 15, 18, 23, 26, 30, 34, 39,
    42, 46, 51, 55, 58, 63, 67, 71, 74, 79,
    83, 88, 92, 97
  ])

  return (
    <div className="relative w-full rounded-2xl bg-[#0a1628] border border-[#D946EF]/10 overflow-hidden p-3">
      <div className="grid grid-cols-10 gap-[5px] mx-auto" style={{ maxWidth: "280px" }}>
        {Array.from({ length: 100 }).map((_, i) => {
          const isLight = LIGHTER_POSITIONS.has(i)
          return (
            <div
              key={i}
              className="aspect-square rounded-full transition-all"
              style={{
                backgroundColor: isLight ? "#E879F9" : "#7C3AED",
                opacity: isLight ? 0.95 : 0.55,
                boxShadow: isLight ? "0 0 6px 1px rgba(232,121,249,0.4)" : "none",
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

/* ───── NEON CUBE PUZZLE ───── */
function NeonCubePuzzle() {
  // Isometric cube with 3 visible faces, each with a neon symbol
  // Missing piece on the right face
  // 4 answer options below the main cube

  const FaceStar = ({ color }: { color: string }) => (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <path d="M20 5 L24 15 L35 15 L26 22 L29 33 L20 26 L11 33 L14 22 L5 15 L16 15 Z" fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  )
  const FaceCross = ({ color }: { color: string }) => (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <line x1="10" y1="10" x2="30" y2="30" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="10" x2="10" y2="30" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
  const FaceCircle = ({ color }: { color: string }) => (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <circle cx="20" cy="20" r="12" fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx="20" cy="20" r="4" fill={color} opacity="0.4" />
    </svg>
  )
  const FaceTriangle = ({ color }: { color: string }) => (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <path d="M20 8 L33 32 L7 32 Z" fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  )
  const FaceDiamond = ({ color }: { color: string }) => (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <path d="M20 6 L34 20 L20 34 L6 20 Z" fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  )
  const FaceHash = ({ color }: { color: string }) => (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <line x1="15" y1="8" x2="15" y2="32" stroke={color} strokeWidth="1.5" />
      <line x1="25" y1="8" x2="25" y2="32" stroke={color} strokeWidth="1.5" />
      <line x1="8" y1="16" x2="32" y2="16" stroke={color} strokeWidth="1.5" />
      <line x1="8" y1="24" x2="32" y2="24" stroke={color} strokeWidth="1.5" />
    </svg>
  )

  // Main cube: top=star(cyan), left=cross(magenta), right=?(missing)
  // Answer options: 1=circle(green) CORRECT, 2=triangle(amber), 3=diamond(cyan), 4=hash(magenta)

  return (
    <div className="relative w-full rounded-2xl bg-[#0a1628] border border-cyan-500/10 overflow-hidden py-4 px-2">
      {/* Main isometric cube */}
      <div className="flex justify-center mb-4">
        <div className="relative" style={{ width: "160px", height: "160px" }}>
          {/* Top face */}
          <div className="absolute" style={{
            width: "90px", height: "52px",
            left: "35px", top: "10px",
            transform: "rotateX(60deg) rotateZ(-45deg)",
            transformOrigin: "center",
            border: "1.5px solid #06B6D4",
            background: "rgba(6,182,212,0.06)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ width: "36px", height: "36px", transform: "rotateZ(45deg) rotateX(-60deg)" }}>
              <FaceStar color="#06B6D4" />
            </div>
          </div>

          {/* Left face */}
          <div className="absolute" style={{
            width: "80px", height: "80px",
            left: "10px", top: "55px",
            transform: "skewY(30deg)",
            transformOrigin: "top left",
            border: "1.5px solid #D946EF",
            background: "rgba(217,70,239,0.06)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ width: "36px", height: "36px" }}>
              <FaceCross color="#D946EF" />
            </div>
          </div>

          {/* Right face (missing piece) */}
          <div className="absolute" style={{
            width: "80px", height: "80px",
            right: "10px", top: "55px",
            transform: "skewY(-30deg)",
            transformOrigin: "top right",
            border: "1.5px dashed rgba(34,197,94,0.5)",
            background: "rgba(34,197,94,0.03)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span className="text-[#22C55E]/40 text-2xl font-light">?</span>
          </div>
        </div>
      </div>

      {/* Answer option cubes */}
      <div className="grid grid-cols-4 gap-2 px-2">
        {[
          { Symbol: FaceCircle, color: "#22C55E", label: "1" },
          { Symbol: FaceTriangle, color: "#F59E0B", label: "2" },
          { Symbol: FaceDiamond, color: "#06B6D4", label: "3" },
          { Symbol: FaceHash, color: "#D946EF", label: "4" },
        ].map(({ Symbol, color, label }) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <div className="w-full aspect-square rounded-lg flex items-center justify-center" style={{
              border: `1px solid ${color}33`,
              background: `${color}08`,
            }}>
              <div style={{ width: "28px", height: "28px" }}>
                <Symbol color={color} />
              </div>
            </div>
            <span className="text-white/30 text-[10px]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ───── MAIN COMPONENT ───── */
export default function IQTestPage() {
  const router = useRouter()
  const { completeConfirmation, updateCinematicStep, state } = useGameFunnel()

  const alreadyDone = state.confirmations.c2.done
  const savedData = state.confirmations.c2.data as { iqScore?: number; total?: number; rank?: string } | undefined
  const [isRevisit] = useState(alreadyDone)

  const [questions] = useState(() => [...ALL_PUZZLES])
  const [currentQ, setCurrentQ] = useState(0)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q)
  const [selected, setSelected] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showResult, setShowResult] = useState(alreadyDone)
  const [showFailed, setShowFailed] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [attempt, setAttempt] = useState(1)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    updateCinematicStep("confirmation-2")
  }, [updateCinematicStep])

  // Timer
  useEffect(() => {
    if (showResult || showFeedback || showFailed || alreadyDone) return
    setTimeLeft(TIME_PER_Q)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          handleAnswer(-1)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ, showResult, showFailed, attempt])

  const handleAnswer = useCallback((idx: number) => {
    if (showFeedback) return
    if (timerRef.current) clearInterval(timerRef.current)
    setSelected(idx)
    setShowFeedback(true)

    const q = questions[currentQ]
    const isCorrect = idx === q.answer
    const newScore = isCorrect ? score + 1 : score
    if (isCorrect) setScore(s => s + 1)

    setTimeout(() => {
      setTransitioning(true)
      setTimeout(() => {
        if (currentQ < TOTAL_QUESTIONS - 1) {
          setCurrentQ(q => q + 1)
          setSelected(null)
          setShowFeedback(false)
          setTransitioning(false)
        } else {
          if (newScore < MIN_SCORE) {
            setShowFailed(true)
            setTransitioning(false)
          } else {
            setShowResult(true)
            if (!isRevisit) {
              completeConfirmation(2, { iqScore: newScore, total: TOTAL_QUESTIONS, rank: getRank(newScore) })
            }
          }
        }
      }, 300)
    }, 1200)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ, showFeedback, score, questions])

  const getRank = (s: number) => {
    const iq = Math.round(80 + (s / TOTAL_QUESTIONS) * 55)
    return iq >= 130 ? "Genio de Neon" : iq >= 115 ? "Mente Afiada" : iq >= 100 ? "Equilibrado" : "Em Evolucao"
  }

  const handleRestart = () => {
    setCurrentQ(0)
    setScore(0)
    setSelected(null)
    setShowFeedback(false)
    setShowResult(false)
    setShowFailed(false)
    setTransitioning(false)
    setAttempt(a => a + 1)
  }

  const finalIQ = useMemo(() => Math.round(80 + ((savedData?.iqScore ?? score) / TOTAL_QUESTIONS) * 55), [savedData, score])
  const finalRank = savedData?.rank || getRank(savedData?.iqScore ?? score)

  /* --- RESULT SCREEN --- */
  if (showResult) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] flex flex-col items-center justify-center p-8 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628] via-black to-[#0a1628]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />

          <div className="relative z-10 text-center animate-fade-in">
            <p className="text-cyan-400/60 text-xs uppercase tracking-[0.3em] mb-6">Confirmacao 2/3 Completa</p>

            <div className="relative w-36 h-36 mx-auto mb-6">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(6,182,212,0.1)" strokeWidth="6" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#06B6D4" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${((savedData?.iqScore ?? score) / TOTAL_QUESTIONS) * 314} 314`} className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-cyan-400 text-3xl font-bold">{finalIQ}</span>
                <span className="text-white/30 text-[10px]">QI VISUAL</span>
              </div>
            </div>

            <h1 className="text-white text-xl font-bold mb-1">{finalRank}</h1>
            <p className="text-white/40 text-sm mb-2">{savedData?.iqScore ?? score}/{TOTAL_QUESTIONS} corretas</p>
            <p className="text-white/30 text-xs mb-6">Sua percepcao esta afiada para Cidade Neon.</p>

            <button type="button" onClick={() => router.push("/")} className="px-8 py-3 rounded-xl bg-white/10 text-white text-sm font-medium active:scale-95 transition-transform">
              Voltar ao Inicio
            </button>
          </div>
        </div>
        <style jsx>{`
          @keyframes fade-in { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
          .animate-fade-in{animation:fade-in .6s ease-out forwards}
        `}</style>
      </div>
    )
  }

  /* --- FAILED SCREEN --- */
  if (showFailed) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] flex flex-col items-center justify-center p-8 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-[#280a0a] via-black to-[#280a0a]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />

          <div className="relative z-10 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-red-500/30 flex items-center justify-center">
              <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
            </div>
            <h1 className="text-white text-xl font-bold mb-2">Percepcao Insuficiente</h1>
            <p className="text-white/40 text-sm mb-2">Voce acertou {score}/{TOTAL_QUESTIONS}</p>
            <p className="text-white/30 text-xs mb-8">Minimo necessario: {MIN_SCORE} acertos.</p>

            <button type="button" onClick={handleRestart} className="px-8 py-3 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-sm font-medium active:scale-95 transition-transform">
              Tentar Novamente (Tentativa {attempt + 1})
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* --- QUESTION SCREEN --- */
  const q = questions[currentQ]

  const getOptionStyle = (i: number) => {
    let bg = "rgba(255,255,255,0.04)"
    let border = "rgba(255,255,255,0.10)"
    let textColor = "rgba(255,255,255,0.85)"
    if (showFeedback) {
      if (i === q.answer) { bg = "rgba(34,197,94,0.15)"; border = "#22C55E"; textColor = "#22C55E" }
      else if (i === selected && i !== q.answer) { bg = "rgba(239,68,68,0.15)"; border = "#EF4444"; textColor = "#EF4444" }
      else { bg = "rgba(255,255,255,0.02)"; textColor = "rgba(255,255,255,0.3)" }
    }
    return { backgroundColor: bg, border: `1.5px solid ${border}`, color: textColor }
  }

  return (
    <div className="min-h-[100dvh] bg-black flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] flex flex-col relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628] via-[#0d1b2a] to-[#0a1628]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />

        {/* Home button */}
        <button type="button" onClick={() => router.push("/")} className="absolute top-[42px] left-3 z-20 w-9 h-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center" aria-label="Voltar para inicio">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
        </button>

        <div className={`relative z-10 flex flex-col h-full pt-[50px] px-5 pb-4 transition-all duration-300 ${transitioning ? "opacity-0 translate-x-4" : "opacity-100"}`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1.5">
              {questions.map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full transition-all"
                  style={{
                    backgroundColor: i < currentQ ? "#06B6D4" : i === currentQ ? "#06B6D4" : "rgba(255,255,255,0.1)",
                    opacity: i <= currentQ ? 1 : 0.3,
                    transform: i === currentQ ? "scale(1.3)" : "scale(1)",
                  }}
                />
              ))}
            </div>
            <p className="text-white/30 text-xs">QI VISUAL {attempt > 1 ? `(#${attempt})` : ""}</p>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000 ease-linear"
                style={{
                  width: `${(timeLeft / TIME_PER_Q) * 100}%`,
                  backgroundColor: timeLeft <= 5 ? "#EF4444" : timeLeft <= 10 ? "#F59E0B" : "#06B6D4",
                }}
              />
            </div>
            <span className={`text-xs font-mono w-6 text-right ${timeLeft <= 5 ? "text-red-400" : "text-white/40"}`}>{timeLeft}</span>
          </div>

          <p className="text-white/50 text-[11px] uppercase tracking-wider mb-2">Exercicio {currentQ + 1}/{TOTAL_QUESTIONS}</p>

          {/* Question label */}
          <h2 className="text-white text-sm font-semibold mb-3 text-balance leading-relaxed">{q.label}</h2>

          {/* Puzzle visual */}
          <div className="flex-shrink min-h-0 mb-3">
            {q.type === "neon-pipes" && <NeonPipesPuzzle />}
            {q.type === "neon-dots" && <NeonDotsPuzzle />}
            {q.type === "neon-cube" && <NeonCubePuzzle />}
            {q.type === "logic" && (
              <div className="bg-[#0a1628] rounded-2xl p-5 border border-cyan-500/10 flex items-center justify-center">
                <p className="text-cyan-400 text-lg font-mono text-center font-bold tracking-wider">
                  {q.sequence}
                </p>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-2 mt-auto">
            {q.options.map((opt, i) => (
              <button
                key={opt}
                type="button"
                onClick={() => { if (!showFeedback) handleAnswer(i) }}
                disabled={showFeedback}
                className="py-3 px-3 rounded-xl text-center text-sm font-semibold transition-all active:scale-95"
                style={getOptionStyle(i)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
