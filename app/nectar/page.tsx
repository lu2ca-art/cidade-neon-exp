"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"

// ─── Perguntas ───────────────────────────────────────────────────────────────

const QUESTIONS = [
  {
    q: "voce ta entediado agora?",
    opts: [
      { text: "sim, ja faz tipo 3 horas", color: "#6B7280" },
      { text: "entediado nao, so vazio", color: "#4B5563" },
      { text: "eu sou o entedio", color: "#374151" },
      { text: "nunca, minha vida e intensa", color: "#F59E0B" },
    ],
  },
  {
    q: "voce ve um gato de rua. o que voce faz?",
    opts: [
      { text: "chamo e ele ignora, normal", color: "#A78BFA" },
      { text: "fotografo secretamente", color: "#6B7FD7" },
      { text: "sento no chao ate ele vir", color: "#4ECDC4" },
      { text: "passo reto, compromisso", color: "#6B7280" },
    ],
  },
  {
    q: "academia: preguica ou viciado?",
    opts: [
      { text: "preguica cronica", color: "#EF4444" },
      { text: "vou 2x por semana e finjo que e o suficiente", color: "#F59E0B" },
      { text: "viciado, academia e terapia", color: "#10B981" },
      { text: "academia e pra quem?", color: "#6B7280" },
    ],
  },
  {
    q: "qual e a sua raca (de vibe)?",
    opts: [
      { text: "gato de rua que come bem", color: "#A78BFA" },
      { text: "cachorro leal demais", color: "#F59E0B" },
      { text: "planta que sobrevive em qualquer solo", color: "#10B981" },
      { text: "fungo — cresce no escuro", color: "#6B7280" },
    ],
  },
  {
    q: "quando voce chega em algum lugar novo, o que acontece?",
    opts: [
      { text: "fico na parede avaliando", color: "#6B7280" },
      { text: "finjo que conhoco todo mundo", color: "#F59E0B" },
      { text: "acho o banheiro e fico la", color: "#6B7FD7" },
      { text: "sou o lugar", color: "#FF6B6B" },
    ],
  },
]

// Resultado baseado na cor que mais apareceu nas respostas
const NECTAR_RESULTS: Record<string, { name: string; color: string; desc: string }> = {
  "#6B7280": { name: "NECTAR SOMBRA",   color: "#6B7280", desc: "voce e observador, calculista, guarda tudo. sua forca ta no silencio." },
  "#4B5563": { name: "NECTAR VAZIO",    color: "#8B9DB0", desc: "voce sente profundo. nao e tristeza — e volume interno." },
  "#374151": { name: "NECTAR NOITE",    color: "#A0A0B0", desc: "voce virou o proprio entedio e isso e uma qualidade rara." },
  "#F59E0B": { name: "NECTAR SOLAR",    color: "#F59E0B", desc: "sua energia irradia calor. voce ilumina qualquer ambiente." },
  "#A78BFA": { name: "NECTAR NEBULOSA", color: "#A78BFA", desc: "misterio e intuicao. voce percebe o que os outros nao veem." },
  "#6B7FD7": { name: "NECTAR OCEANO",   color: "#6B7FD7", desc: "profundidade e calma. voce e a ancora que estabiliza o caos." },
  "#4ECDC4": { name: "NECTAR CRISTAL",  color: "#4ECDC4", desc: "clareza e harmonia. voce busca verdade em tudo." },
  "#EF4444": { name: "NECTAR FOGO",     color: "#EF4444", desc: "paixao e intensidade. voce sente tudo com forca total." },
  "#10B981": { name: "NECTAR NATUREZA", color: "#10B981", desc: "voce cresce em qualquer condicao. resiliente sem esforco." },
  "#FF6B6B": { name: "NECTAR CHAMA",    color: "#FF6B6B", desc: "voce nao chega num lugar — voce cria ele. presenca total." },
  default:   { name: "NECTAR LIVRE",    color: "#A78BFA", desc: "voce nao cabe em uma categoria. isso e bom." },
}

function getResult(answers: number[]): typeof NECTAR_RESULTS[string] {
  const colorCount: Record<string, number> = {}
  answers.forEach((ansIdx, qIdx) => {
    const c = QUESTIONS[qIdx]?.opts[ansIdx]?.color
    if (c) colorCount[c] = (colorCount[c] || 0) + 1
  })
  const top = Object.entries(colorCount).sort((a, b) => b[1] - a[1])[0]?.[0]
  return NECTAR_RESULTS[top] || NECTAR_RESULTS.default
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NectarPage() {
  const router = useRouter()
  const { completeConfirmation, state } = useGameFunnel()

  const alreadyDone = state.confirmations.c1.done
  const [step, setStep] = useState(alreadyDone ? QUESTIONS.length : 0)
  const [answers, setAnswers] = useState<number[]>(
    alreadyDone
      ? (state.confirmations.c1.data as { nectarAnswers?: number[] })?.nectarAnswers || []
      : []
  )
  const [showResult, setShowResult] = useState(alreadyDone)
  const [chosen, setChosen] = useState<number | null>(null)

  const handleAnswer = useCallback((idx: number) => {
    if (chosen !== null) return
    setChosen(idx)
    const newAnswers = [...answers, idx]

    setTimeout(() => {
      setAnswers(newAnswers)
      setChosen(null)
      if (step < QUESTIONS.length - 1) {
        setStep(s => s + 1)
      } else {
        setTimeout(() => {
          setShowResult(true)
          if (!alreadyDone) completeConfirmation(1, { nectarAnswers: newAnswers })
        }, 300)
      }
    }, 380)
  }, [chosen, answers, step, alreadyDone, completeConfirmation])

  const result = showResult ? getResult(answers) : null

  // ── TELA DE RESULTADO ────────────────────────────────────────────────────
  if (showResult && result) {
    return (
      <div className="min-h-screen flex items-center justify-center overflow-hidden" style={{ background: "#0a0a0a" }}>
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] flex flex-col relative">
          {/* Glow de fundo */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl opacity-20" style={{ backgroundColor: result.color }} />
          </div>

          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
            {/* Orb */}
            <div className="relative w-28 h-28 mb-8">
              <div className="absolute inset-0 rounded-full animate-pulse" style={{ backgroundColor: `${result.color}18`, boxShadow: `0 0 60px ${result.color}40` }} />
              <div className="absolute inset-3 rounded-full" style={{ backgroundColor: `${result.color}12` }} />
              <div className="absolute inset-7 rounded-full flex items-center justify-center" style={{ backgroundColor: `${result.color}10` }}>
                <span className="text-3xl font-black" style={{ color: result.color }}>N</span>
              </div>
            </div>

            <p className="text-white/30 text-[10px] tracking-[0.35em] uppercase mb-3">seu nectar</p>
            <h1 className="text-2xl font-black tracking-wide mb-4 text-balance" style={{ color: result.color }}>
              {result.name}
            </h1>
            <p className="text-white/50 text-sm leading-relaxed mb-10 max-w-[260px]">{result.desc}</p>

            <p className="text-white/20 text-xs mb-6">missao 1 completa — volta pra conversa do Alohan</p>

            <button
              type="button"
              onClick={() => router.push("/whatsapp/privado/alohan")}
              className="w-full py-4 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98]"
              style={{ background: `${result.color}22`, color: result.color, border: `1px solid ${result.color}40` }}
            >
              Voltar para Alohan
            </button>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-3 py-3 text-white/20 text-xs tracking-widest"
            >
              INICIO
            </button>
          </div>
        </div>

        <style jsx>{`
          @keyframes nectar-in { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
          .animate-nectar-in { animation: nectar-in 0.5s ease-out forwards; }
        `}</style>
      </div>
    )
  }

  // ── QUIZ ─────────────────────────────────────────────────────────────────
  const q = QUESTIONS[step]

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden" style={{ background: "#0a0a0a" }}>
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] flex flex-col relative">
        {/* Background sutil */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(167,139,250,0.07) 0%, transparent 60%)" }} />

        <div className="relative z-10 flex flex-col h-full px-6 pt-14 pb-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-5">
              <button type="button" onClick={() => router.push("/")} className="text-white/20 text-xs tracking-widest uppercase">voltar</button>
              <p className="text-white/20 text-xs font-mono">{step + 1}/{QUESTIONS.length}</p>
            </div>
            {/* Barra de progresso */}
            <div className="flex gap-1.5">
              {QUESTIONS.map((_, i) => (
                <div key={i} className="flex-1 h-0.5 rounded-full transition-all duration-500"
                  style={{ backgroundColor: i < step ? "#A78BFA" : i === step ? "rgba(167,139,250,0.4)" : "rgba(255,255,255,0.06)" }} />
              ))}
            </div>
            <p className="text-white/20 text-[9px] tracking-[0.3em] uppercase mt-4 mb-2">NECTAR</p>
          </div>

          {/* Pergunta */}
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-white text-xl font-medium leading-snug mb-10 text-balance">
              {q.q}
            </h2>

            <div className="space-y-3">
              {q.opts.map((opt, i) => (
                <button
                  key={opt.text}
                  type="button"
                  onClick={() => handleAnswer(i)}
                  className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-left transition-all duration-200 active:scale-[0.97] min-h-[52px]"
                  style={{
                    background: chosen === i ? `${opt.color}22` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${chosen === i ? opt.color + "60" : "rgba(255,255,255,0.06)"}`,
                    opacity: chosen !== null && chosen !== i ? 0.4 : 1,
                  }}
                >
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all" style={{ backgroundColor: chosen === i ? opt.color : "rgba(255,255,255,0.15)" }} />
                  <span className="text-white/70 text-sm">{opt.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
