"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"

// 64 archetypes (4^3 combinations)
const ARCHETYPES = [
  "O Firewall Errante", "A Sacerdotisa do Ruido", "O Mago de Neon", "A Torre em Loop",
  "O Hermitao Digital", "O Louco dos Becos", "A Imperatriz Glitch", "O Imperador Sombra",
  "A Roda do Codigo", "A Forca do Sinal", "O Enforcado em Rede", "A Morte do Sistema",
  "A Temperanca Neon", "O Diabo de Pixels", "A Estrela Binaria", "A Lua em Estatica",
  "O Sol de Circuitos", "O Julgamento Final", "O Mundo Virtual", "O Guardiao do Void",
  "O Hacker Solitario", "A Bruxa do Wi-Fi", "O Cavaleiro de Dados", "A Rainha do Caos",
  "O Rei das Sombras", "O Bufao Eletrico", "A Sacerdotisa Neon", "O Alquimista Digital",
  "O Profeta do Glitch", "A Sibila dos Becos", "O Eremita do Codigo", "A Justica Hackeada",
  "O Amante de Pixels", "O Carro em Fuga", "A Forca Oculta", "O Pendurado em Loop",
  "A Morte Renascida", "O Anjo de Neon", "O Demonio do Sistema", "A Torre Caida",
  "A Estrela Cadente", "A Lua Invertida", "O Sol Escuro", "O Mensageiro do Fim",
  "O Criador do Void", "O Destruidor de Redes", "O Guardiao do Portal", "A Vidente do Caos",
  "O Fantasma Digital", "A Sombra Luminosa", "O Eco do Passado", "O Futuro em Ruinas",
  "O Presente Eterno", "O Viajante do Tempo", "O Sonhador Acordado", "O Pesadelo Vivo",
  "A Aurora de Neon", "O Crepusculo Eterno", "O Meio-Dia Sombrio", "A Meia-Noite Clara",
  "O Infinito Finito", "O Zero Absoluto", "O Um Primordial", "O Todo e o Nada",
]

const QUESTIONS = [
  {
    question: "Quando a cidade apaga, voce...",
    options: ["acende por dentro", "vira sombra", "procura o sinal", "ri do caos"],
  },
  {
    question: "Seu instinto te puxa para...",
    options: ["decifrar", "proteger", "fugir", "provocar"],
  },
  {
    question: "O que voce confia primeiro?",
    options: ["no toque", "no som", "no padrao", "no silencio"],
  },
]

export default function Confirmacao1Page() {
  const router = useRouter()
  const { completeConfirmation, updateCinematicStep, state } = useGameFunnel()
  
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<number[]>(state.confirmations.c1.answers || [])
  const [showResult, setShowResult] = useState(false)
  const [archetype, setArchetype] = useState<string | null>(state.confirmations.c1.archetype || null)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    updateCinematicStep("confirmation-1")
  }, [updateCinematicStep])

  // If already completed, show result
  useEffect(() => {
    if (state.confirmations.c1.done && state.confirmations.c1.archetype) {
      setShowResult(true)
      setArchetype(state.confirmations.c1.archetype)
    }
  }, [state.confirmations.c1])

  const handleAnswer = (answerIndex: number) => {
    if (isAnimating) return
    
    setIsAnimating(true)
    const newAnswers = [...answers, answerIndex]
    setAnswers(newAnswers)
    
    setTimeout(() => {
      if (currentQuestion < QUESTIONS.length - 1) {
        setCurrentQuestion((prev) => prev + 1)
        setIsAnimating(false)
      } else {
        // Calculate archetype index: a*16 + b*4 + c
        const index = newAnswers[0] * 16 + newAnswers[1] * 4 + newAnswers[2]
        const result = ARCHETYPES[index]
        setArchetype(result)
        setShowResult(true)
        
        // Complete confirmation after showing result
        setTimeout(() => {
          completeConfirmation(1, { archetype: result, answers: newAnswers })
          
          // Return to WhatsApp
          setTimeout(() => {
            router.push("/whatsapp/grupo")
          }, 2500)
        }, 500)
      }
    }, 300)
  }

  if (showResult && archetype) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col items-center justify-center p-8 relative">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-black to-cyan-900/20" />
          
          {/* Animated rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 rounded-full border border-purple-500/30 animate-pulse" />
            <div className="absolute w-48 h-48 rounded-full border border-cyan-500/30 animate-ping" style={{ animationDuration: "2s" }} />
          </div>
          
          {/* Result */}
          <div className="relative z-10 text-center animate-fade-in">
            <p className="text-purple-400 text-sm uppercase tracking-widest mb-4">Seu Arquetipo</p>
            
            {/* Seal */}
            <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-purple-500/50">
              <div className="w-28 h-28 rounded-full bg-black flex items-center justify-center">
                <svg className="w-12 h-12 text-purple-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
            </div>
            
            <h1 className="text-white text-2xl font-bold mb-2 text-balance">{archetype}</h1>
            <p className="text-white/60 text-sm mb-8">A Cidade Neon te reconhece.</p>
            
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <p className="text-purple-400 text-xs">Retornando ao grupo...</p>
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            </div>
          </div>
        </div>
        
        <style jsx>{`
          @keyframes fade-in {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
        `}</style>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col p-6 relative">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f23]" />
        
        {/* Progress */}
        <div className="relative z-10 pt-8 mb-8">
          <div className="flex gap-2 mb-2">
            {QUESTIONS.map((_, i) => (
              <div 
                key={i}
                className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                  i < currentQuestion ? "bg-purple-500" : 
                  i === currentQuestion ? "bg-purple-500/50" : "bg-white/10"
                }`}
              />
            ))}
          </div>
          <p className="text-white/40 text-xs text-center">Confirmacao 1/3 - Pergunta {currentQuestion + 1}/{QUESTIONS.length}</p>
        </div>
        
        {/* Question */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
          <div className={`text-center transition-all duration-300 ${isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}`}>
            <h1 className="text-white text-xl md:text-2xl font-medium mb-8 text-balance px-4">
              {QUESTIONS[currentQuestion].question}
            </h1>
            
            <div className="space-y-3 px-4">
              {QUESTIONS[currentQuestion].options.map((option, index) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleAnswer(index)}
                  disabled={isAnimating}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 text-white py-4 px-6 rounded-xl text-left transition-all duration-200 min-h-[44px] active:scale-98"
                >
                  <span className="text-purple-400 mr-2">{String.fromCharCode(65 + index)}.</span>
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="relative z-10 pb-8">
          <p className="text-white/30 text-xs text-center">Todas as respostas sao validas</p>
        </div>
      </div>
    </div>
  )
}
