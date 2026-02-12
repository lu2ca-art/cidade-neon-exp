"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"

/* ───────────── VISUAL EXPERIMENT BANKS ───────────── */

// Bank A: Pattern matrix - find the missing piece in a 3x3 grid
const MATRIX_BANK = [
  {
    // Shapes rotate 90deg each cell
    label: "Qual padrao completa a matriz?",
    grid: [
      ["circle", "square", "triangle"],
      ["square", "triangle", "circle"],
      ["triangle", "circle", "?"],
    ],
    answer: 0, // square
    options: ["square", "diamond", "circle", "triangle"],
  },
  {
    label: "Qual figura falta?",
    grid: [
      ["filled-circle", "half-circle", "empty-circle"],
      ["filled-square", "half-square", "empty-square"],
      ["filled-triangle", "half-triangle", "?"],
    ],
    answer: 2, // empty-triangle
    options: ["filled-triangle", "half-triangle", "empty-triangle", "empty-circle"],
  },
  {
    label: "Complete o padrao visual.",
    grid: [
      ["1-dot", "2-dots", "3-dots"],
      ["2-dots", "3-dots", "4-dots"],
      ["3-dots", "4-dots", "?"],
    ],
    answer: 1, // 5-dots
    options: ["4-dots", "5-dots", "6-dots", "3-dots"],
  },
]

// Bank B: Visual sequence - what comes next
const SEQUENCE_BANK = [
  {
    label: "O que vem a seguir?",
    shapes: ["small-circle", "medium-circle", "large-circle", "small-square", "medium-square", "?"],
    answer: 2, // large-square
    options: ["small-square", "medium-circle", "large-square", "large-circle"],
  },
  {
    label: "Qual e o proximo?",
    shapes: ["rotate-0", "rotate-90", "rotate-180", "rotate-270", "?"],
    answer: 0, // rotate-0 (cycle restarts)
    options: ["rotate-0", "rotate-90", "rotate-360", "rotate-45"],
  },
  {
    label: "Complete a sequencia.",
    shapes: ["1-line", "2-lines-cross", "3-lines-star", "?"],
    answer: 3, // 4-lines
    options: ["2-lines-cross", "3-lines-star", "1-line", "4-lines"],
  },
]

// Bank C: Odd one out
const ODD_BANK = [
  {
    label: "Qual figura e diferente?",
    items: [
      { shape: "circle", color: "#06B6D4", size: 40 },
      { shape: "circle", color: "#06B6D4", size: 40 },
      { shape: "circle", color: "#06B6D4", size: 40 },
      { shape: "circle", color: "#EF4444", size: 40 },
    ],
    answer: 3,
  },
  {
    label: "Identifique o intruso.",
    items: [
      { shape: "square-rotated", color: "#A78BFA", size: 36 },
      { shape: "square-rotated", color: "#A78BFA", size: 36 },
      { shape: "square", color: "#A78BFA", size: 36 },
      { shape: "square-rotated", color: "#A78BFA", size: 36 },
    ],
    answer: 2,
  },
  {
    label: "Qual nao pertence?",
    items: [
      { shape: "triangle-up", color: "#F59E0B", size: 36 },
      { shape: "triangle-up", color: "#F59E0B", size: 36 },
      { shape: "triangle-down", color: "#F59E0B", size: 36 },
      { shape: "triangle-up", color: "#F59E0B", size: 36 },
    ],
    answer: 2,
  },
]

// Bank D: Mirror / Symmetry
const MIRROR_BANK = [
  {
    label: "Qual e o reflexo correto?",
    source: "L-shape",
    answer: 1,
    options: ["L-mirror-wrong", "L-mirror-correct", "L-rotated", "L-same"],
  },
  {
    label: "Qual completa a simetria?",
    source: "half-star",
    answer: 0,
    options: ["half-star-mirror", "half-star-rotated", "half-star-flipped", "half-circle"],
  },
  {
    label: "Escolha o espelho.",
    source: "arrow-right",
    answer: 2,
    options: ["arrow-right", "arrow-up", "arrow-left", "arrow-down"],
  },
]

// Bank E: Count / Spatial
const COUNT_BANK = [
  {
    label: "Quantos triangulos existem na figura?",
    visual: "nested-triangles",
    answer: 2, // 5
    options: ["3", "4", "5", "6"],
  },
  {
    label: "Quantos quadrados voce ve?",
    visual: "overlapping-squares",
    answer: 1, // 5
    options: ["4", "5", "6", "3"],
  },
  {
    label: "Quantos circulos se sobrepoem?",
    visual: "venn-circles",
    answer: 0, // 3
    options: ["3", "4", "2", "5"],
  },
]

const TIME_PER_Q = 20
const MIN_SCORE = 3
const TOTAL_QUESTIONS = 5

/* ───── SHAPE RENDERER ───── */
function ShapeIcon({ shape, size = 32, color = "#06B6D4" }: { shape: string; size?: number; color?: string }) {
  const s = size
  const half = s / 2

  switch (shape) {
    case "circle":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><circle cx={half} cy={half} r={half - 2} fill="none" stroke={color} strokeWidth="2" /></svg>
    case "filled-circle":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><circle cx={half} cy={half} r={half - 2} fill={color} /></svg>
    case "half-circle":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><circle cx={half} cy={half} r={half - 2} fill="none" stroke={color} strokeWidth="2" /><path d={`M${half},2 A${half - 2},${half - 2} 0 0,1 ${half},${s - 2}`} fill={color} /></svg>
    case "empty-circle":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><circle cx={half} cy={half} r={half - 2} fill="none" stroke={color} strokeWidth="1" strokeDasharray="3,3" /></svg>
    case "square":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><rect x="3" y="3" width={s - 6} height={s - 6} fill="none" stroke={color} strokeWidth="2" /></svg>
    case "filled-square":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><rect x="3" y="3" width={s - 6} height={s - 6} fill={color} /></svg>
    case "half-square":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><rect x="3" y="3" width={s - 6} height={s - 6} fill="none" stroke={color} strokeWidth="2" /><rect x="3" y="3" width={(s - 6) / 2} height={s - 6} fill={color} /></svg>
    case "empty-square":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><rect x="3" y="3" width={s - 6} height={s - 6} fill="none" stroke={color} strokeWidth="1" strokeDasharray="3,3" /></svg>
    case "triangle":
    case "triangle-up":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><polygon points={`${half},3 ${s - 3},${s - 3} 3,${s - 3}`} fill="none" stroke={color} strokeWidth="2" /></svg>
    case "filled-triangle":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><polygon points={`${half},3 ${s - 3},${s - 3} 3,${s - 3}`} fill={color} /></svg>
    case "half-triangle":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><polygon points={`${half},3 ${s - 3},${s - 3} 3,${s - 3}`} fill="none" stroke={color} strokeWidth="2" /><polygon points={`${half},3 ${half},${s - 3} 3,${s - 3}`} fill={color} /></svg>
    case "empty-triangle":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><polygon points={`${half},3 ${s - 3},${s - 3} 3,${s - 3}`} fill="none" stroke={color} strokeWidth="1" strokeDasharray="3,3" /></svg>
    case "triangle-down":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><polygon points={`3,3 ${s - 3},3 ${half},${s - 3}`} fill="none" stroke={color} strokeWidth="2" /></svg>
    case "diamond":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><polygon points={`${half},3 ${s - 3},${half} ${half},${s - 3} 3,${half}`} fill="none" stroke={color} strokeWidth="2" /></svg>
    case "square-rotated":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><rect x="3" y="3" width={s - 6} height={s - 6} fill="none" stroke={color} strokeWidth="2" transform={`rotate(45,${half},${half})`} /></svg>
    case "small-circle":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><circle cx={half} cy={half} r={6} fill="none" stroke={color} strokeWidth="2" /></svg>
    case "medium-circle":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><circle cx={half} cy={half} r={10} fill="none" stroke={color} strokeWidth="2" /></svg>
    case "large-circle":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><circle cx={half} cy={half} r={14} fill="none" stroke={color} strokeWidth="2" /></svg>
    case "small-square":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><rect x={half - 6} y={half - 6} width={12} height={12} fill="none" stroke={color} strokeWidth="2" /></svg>
    case "medium-square":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><rect x={half - 10} y={half - 10} width={20} height={20} fill="none" stroke={color} strokeWidth="2" /></svg>
    case "large-square":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><rect x={half - 14} y={half - 14} width={28} height={28} fill="none" stroke={color} strokeWidth="2" /></svg>
    case "rotate-0":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><rect x="3" y={half - 4} width={s - 6} height="8" fill={color} rx="2" /><circle cx={s - 8} cy={half} r="3" fill={color} /></svg>
    case "rotate-90":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><rect x={half - 4} y="3" width="8" height={s - 6} fill={color} rx="2" /><circle cx={half} cy={s - 8} r="3" fill={color} /></svg>
    case "rotate-180":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><rect x="3" y={half - 4} width={s - 6} height="8" fill={color} rx="2" /><circle cx={8} cy={half} r="3" fill={color} /></svg>
    case "rotate-270":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><rect x={half - 4} y="3" width="8" height={s - 6} fill={color} rx="2" /><circle cx={half} cy={8} r="3" fill={color} /></svg>
    case "rotate-360":
    case "rotate-45":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><rect x="3" y={half - 4} width={s - 6} height="8" fill={color} rx="2" transform={`rotate(45,${half},${half})`} /><circle cx={half + 8} cy={half - 8} r="3" fill={color} /></svg>
    case "arrow-right":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><path d={`M3,${half} L${s - 8},${half} L${s - 12},${half - 6} M${s - 8},${half} L${s - 12},${half + 6}`} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>
    case "arrow-left":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><path d={`M${s - 3},${half} L8,${half} L12,${half - 6} M8,${half} L12,${half + 6}`} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>
    case "arrow-up":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><path d={`M${half},${s - 3} L${half},8 L${half - 6},12 M${half},8 L${half + 6},12`} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>
    case "arrow-down":
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><path d={`M${half},3 L${half},${s - 8} L${half - 6},${s - 12} M${half},${s - 8} L${half + 6},${s - 12}`} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>
    default:
      // Dot patterns
      if (shape.endsWith("-dot") || shape.endsWith("-dots")) {
        const count = parseInt(shape) || 1
        const positions: [number, number][] = []
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 - Math.PI / 2
          const r = count === 1 ? 0 : Math.min(10, 4 + count)
          positions.push([half + r * Math.cos(angle), half + r * Math.sin(angle)])
        }
        return (
          <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
            {positions.map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r={3} fill={color} />
            ))}
          </svg>
        )
      }
      // Mirror shapes
      if (shape.startsWith("L-") || shape.startsWith("half-star")) {
        return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><text x={half} y={half + 4} textAnchor="middle" fill={color} fontSize="10">?</text></svg>
      }
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><circle cx={half} cy={half} r={half - 4} fill="none" stroke={color} strokeWidth="1" strokeDasharray="2,2" /></svg>
  }
}

/* ───── VISUAL QUESTION COMPONENTS ───── */

function CountVisual({ visual }: { visual: string }) {
  if (visual === "nested-triangles") {
    return (
      <div className="bg-white/5 rounded-2xl p-8 mb-4 border border-cyan-500/10 flex items-center justify-center">
        <svg width="120" height="110" viewBox="0 0 120 110">
          <polygon points="60,5 115,105 5,105" fill="none" stroke="#06B6D4" strokeWidth="2" />
          <polygon points="60,35 90,90 30,90" fill="none" stroke="#06B6D4" strokeWidth="2" />
          <line x1="35" y1="60" x2="85" y2="60" stroke="#06B6D4" strokeWidth="1.5" />
          <line x1="60" y1="5" x2="60" y2="105" stroke="#06B6D4" strokeWidth="0.5" opacity="0.3" />
        </svg>
      </div>
    )
  }
  if (visual === "overlapping-squares") {
    return (
      <div className="bg-white/5 rounded-2xl p-8 mb-4 border border-cyan-500/10 flex items-center justify-center">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <rect x="10" y="10" width="50" height="50" fill="none" stroke="#06B6D4" strokeWidth="2" />
          <rect x="35" y="35" width="50" height="50" fill="none" stroke="#06B6D4" strokeWidth="2" />
          <rect x="60" y="60" width="50" height="50" fill="none" stroke="#06B6D4" strokeWidth="2" />
        </svg>
      </div>
    )
  }
  // venn-circles
  return (
    <div className="bg-white/5 rounded-2xl p-8 mb-4 border border-cyan-500/10 flex items-center justify-center">
      <svg width="140" height="100" viewBox="0 0 140 100">
        <circle cx="45" cy="50" r="30" fill="none" stroke="#06B6D4" strokeWidth="2" />
        <circle cx="75" cy="50" r="30" fill="none" stroke="#06B6D4" strokeWidth="2" />
        <circle cx="95" cy="50" r="30" fill="none" stroke="#06B6D4" strokeWidth="2" />
      </svg>
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

  // Build a randomized set of 5 questions from banks
  const buildQuestions = useCallback(() => {
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
    return [
      { type: "matrix" as const, data: pick(MATRIX_BANK) },
      { type: "sequence" as const, data: pick(SEQUENCE_BANK) },
      { type: "odd" as const, data: pick(ODD_BANK) },
      { type: "mirror" as const, data: pick(MIRROR_BANK) },
      { type: "count" as const, data: pick(COUNT_BANK) },
    ]
  }, [])

  const [questions, setQuestions] = useState(() => buildQuestions())
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
    let isCorrect = false
    if (q.type === "odd") {
      isCorrect = idx === (q.data as typeof ODD_BANK[number]).answer
    } else {
      isCorrect = idx === (q.data as { answer: number }).answer
    }
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
          // Finished all 5 questions
          if (newScore < MIN_SCORE) {
            setShowFailed(true)
            setTransitioning(false)
          } else {
            setShowResult(true)
            if (!isRevisit) {
              completeConfirmation(2, { iqScore: newScore, total: TOTAL_QUESTIONS, rank: getRank(newScore) })
              setTimeout(() => router.push("/whatsapp"), 3500)
            }
          }
        }
      }, 300)
    }, 1000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ, showFeedback, score, questions])

  const getRank = (s: number) => {
    const iq = Math.round(80 + (s / TOTAL_QUESTIONS) * 55)
    return iq >= 130 ? "Genio de Neon" : iq >= 115 ? "Mente Afiada" : iq >= 100 ? "Equilibrado" : "Em Evolucao"
  }

  const handleRestart = () => {
    setQuestions(buildQuestions())
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

  /* ─── RESULT SCREEN ─── */
  if (showResult) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col items-center justify-center p-8 relative">
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

            {isRevisit ? (
              <button type="button" onClick={() => router.push("/")} className="px-8 py-3 rounded-xl bg-white/10 text-white text-sm font-medium active:scale-95 transition-transform">
                Voltar ao Inicio
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                <p className="text-white/30 text-xs">Voltando ao WhatsApp...</p>
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              </div>
            )}
          </div>
        </div>
        <style jsx>{`
          @keyframes fade-in { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
          .animate-fade-in{animation:fade-in .6s ease-out forwards}
        `}</style>
      </div>
    )
  }

  /* ─── FAILED SCREEN (score < 3) ─── */
  if (showFailed) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col items-center justify-center p-8 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-[#280a0a] via-black to-[#280a0a]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />

          <div className="relative z-10 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-red-500/30 flex items-center justify-center">
              <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
            </div>
            <h1 className="text-white text-xl font-bold mb-2">Percepcao Insuficiente</h1>
            <p className="text-white/40 text-sm mb-2">Voce acertou {score}/{TOTAL_QUESTIONS}</p>
            <p className="text-white/30 text-xs mb-8">Minimo necessario: {MIN_SCORE} acertos. Novos exercicios serao gerados.</p>

            <button type="button" onClick={handleRestart} className="px-8 py-3 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-sm font-medium active:scale-95 transition-transform">
              Tentar Novamente (Tentativa {attempt + 1})
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ─── QUESTION SCREEN ─── */
  const q = questions[currentQ]

  const renderQuestion = () => {
    if (q.type === "matrix") {
      const data = q.data as typeof MATRIX_BANK[number]
      return (
        <>
          <h2 className="text-white text-lg font-semibold mb-4 text-balance">{data.label}</h2>
          <div className="bg-white/5 rounded-2xl p-4 mb-4 border border-cyan-500/10">
            <div className="grid grid-cols-3 gap-3 place-items-center">
              {data.grid.flat().map((cell, i) => (
                <div key={i} className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
                  {cell === "?" ? (
                    <span className="text-cyan-400 text-xl font-bold">?</span>
                  ) : (
                    <ShapeIcon shape={cell} size={32} color="#06B6D4" />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 mt-auto mb-8">
            {data.options.map((opt, i) => renderOptionButton(i, <ShapeIcon shape={opt} size={36} color={getOptionColor(i)} />, data.answer))}
          </div>
        </>
      )
    }

    if (q.type === "sequence") {
      const data = q.data as typeof SEQUENCE_BANK[number]
      return (
        <>
          <h2 className="text-white text-lg font-semibold mb-4 text-balance">{data.label}</h2>
          <div className="bg-white/5 rounded-2xl p-4 mb-4 border border-cyan-500/10">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {data.shapes.map((s, i) => (
                <div key={i} className="w-11 h-11 rounded-lg bg-white/5 flex items-center justify-center">
                  {s === "?" ? (
                    <span className="text-cyan-400 text-lg font-bold">?</span>
                  ) : (
                    <ShapeIcon shape={s} size={32} color="#06B6D4" />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 mt-auto mb-8">
            {data.options.map((opt, i) => renderOptionButton(i, <ShapeIcon shape={opt} size={36} color={getOptionColor(i)} />, data.answer))}
          </div>
        </>
      )
    }

    if (q.type === "odd") {
      const data = q.data as typeof ODD_BANK[number]
      return (
        <>
          <h2 className="text-white text-lg font-semibold mb-4 text-balance">{data.label}</h2>
          <div className="grid grid-cols-2 gap-3 mt-auto mb-8">
            {data.items.map((item, i) => {
              let bg = "rgba(255,255,255,0.03)"
              let border = "rgba(255,255,255,0.08)"
              if (showFeedback) {
                if (i === data.answer) {
                  bg = "rgba(34,197,94,0.15)"
                  border = "#22C55E"
                } else if (i === selected && i !== data.answer) {
                  bg = "rgba(239,68,68,0.15)"
                  border = "#EF4444"
                }
              }
              return (
                <button key={i} type="button" onClick={() => { if (!showFeedback) handleAnswer(i) }} disabled={showFeedback}
                  className="h-24 rounded-xl flex items-center justify-center transition-all active:scale-95"
                  style={{ backgroundColor: bg, border: `1.5px solid ${border}` }}
                >
                  <ShapeIcon shape={item.shape} size={item.size} color={item.color} />
                </button>
              )
            })}
          </div>
        </>
      )
    }

    if (q.type === "mirror") {
      const data = q.data as typeof MIRROR_BANK[number]
      return (
        <>
          <h2 className="text-white text-lg font-semibold mb-4 text-balance">{data.label}</h2>
          <div className="bg-white/5 rounded-2xl p-6 mb-4 border border-cyan-500/10 flex items-center justify-center">
            <ShapeIcon shape={data.source} size={64} color="#06B6D4" />
          </div>
          <div className="grid grid-cols-2 gap-2.5 mt-auto mb-8">
            {data.options.map((opt, i) => renderOptionButton(i, <ShapeIcon shape={opt} size={36} color={getOptionColor(i)} />, data.answer))}
          </div>
        </>
      )
    }

    if (q.type === "count") {
      const data = q.data as typeof COUNT_BANK[number]
      return (
        <>
          <h2 className="text-white text-lg font-semibold mb-4 text-balance">{data.label}</h2>
          <CountVisual visual={data.visual} />
          <div className="grid grid-cols-2 gap-2.5 mt-auto mb-8">
            {data.options.map((opt, i) => {
              let bg = "rgba(255,255,255,0.03)"
              let border = "rgba(255,255,255,0.08)"
              let textColor = "rgba(255,255,255,0.8)"
              if (showFeedback) {
                if (i === data.answer) { bg = "rgba(34,197,94,0.15)"; border = "#22C55E"; textColor = "#22C55E" }
                else if (i === selected && i !== data.answer) { bg = "rgba(239,68,68,0.15)"; border = "#EF4444"; textColor = "#EF4444" }
              }
              return (
                <button key={opt} type="button" onClick={() => { if (!showFeedback) handleAnswer(i) }} disabled={showFeedback}
                  className="py-4 rounded-xl text-center text-lg font-bold transition-all active:scale-95"
                  style={{ backgroundColor: bg, border: `1.5px solid ${border}`, color: textColor }}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </>
      )
    }

    return null
  }

  const getOptionColor = (i: number) => {
    if (!showFeedback) return "#06B6D4"
    const correctIdx = (q.data as { answer: number }).answer
    if (i === correctIdx) return "#22C55E"
    if (i === selected && i !== correctIdx) return "#EF4444"
    return "rgba(6,182,212,0.3)"
  }

  const renderOptionButton = (i: number, content: React.ReactNode, correctIdx: number) => {
    let bg = "rgba(255,255,255,0.03)"
    let border = "rgba(255,255,255,0.08)"
    if (showFeedback) {
      if (i === correctIdx) { bg = "rgba(34,197,94,0.15)"; border = "#22C55E" }
      else if (i === selected && i !== correctIdx) { bg = "rgba(239,68,68,0.15)"; border = "#EF4444" }
    }
    return (
      <button key={i} type="button" onClick={() => { if (!showFeedback) handleAnswer(i) }} disabled={showFeedback}
        className="h-20 rounded-xl flex items-center justify-center transition-all active:scale-95"
        style={{ backgroundColor: bg, border: `1.5px solid ${border}` }}
      >
        {content}
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628] via-[#0d1b2a] to-[#0a1628]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />

        {/* Home button */}
        <button type="button" onClick={() => router.push("/")} className="absolute top-[42px] left-3 z-20 w-9 h-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center" aria-label="Voltar para inicio">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
        </button>

        <div className={`relative z-10 flex flex-col h-full pt-[50px] px-5 transition-all duration-300 ${transitioning ? "opacity-0 translate-x-4" : "opacity-100"}`}>
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
          <div className="flex items-center gap-2 mb-4">
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

          <p className="text-white/50 text-[11px] uppercase tracking-wider mb-2">Exercicio Visual {currentQ + 1}/{TOTAL_QUESTIONS}</p>

          {renderQuestion()}
        </div>
      </div>
    </div>
  )
}
