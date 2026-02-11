"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"

interface Message {
  id: number
  text: string
  sender: string
  time: string
  isSystem?: boolean
  isUser?: boolean
}

interface ChoiceSet {
  options: string[]
}

const PARTICIPANTS: Record<string, { color: string }> = {
  "D-Bee": { color: "#6B7FD7" },
  "Nizzy": { color: "#FF6B6B" },
  "Alohan": { color: "#4ECDC4" },
  "LU2CA": { color: "#1DB954" },
}

// Phase 1: Initial conversation
const INITIAL_SCRIPT: Message[] = [
  { id: 1, text: "Voce foi adicionado ao grupo", sender: "system", time: "21:47", isSystem: true },
  { id: 2, text: "Chegou.", sender: "D-Bee", time: "21:47" },
  { id: 3, text: "Sem barulho. A Cidade Neon ouve.", sender: "Nizzy", time: "21:47" },
  { id: 4, text: "Fica aqui. Observa.", sender: "Alohan", time: "21:48" },
]

const CHOICE_1: ChoiceSet = {
  options: [
    "Quem sao voces?",
    "O que aconteceu com o sistema?",
    "O que voces querem de mim?",
  ],
}

const AFTER_CHOICE_1: Record<string, Message[]> = {
  "Quem sao voces?": [
    { id: 10, text: "A gente faz parte da rede.", sender: "D-Bee", time: "21:48" },
    { id: 11, text: "Nao importa quem somos. Importa o que voce vai fazer agora.", sender: "Nizzy", time: "21:48" },
  ],
  "O que aconteceu com o sistema?": [
    { id: 10, text: "O sistema travou. E a gente encontrou voce no meio do ruido.", sender: "D-Bee", time: "21:48" },
    { id: 11, text: "Sorte ou destino. Voce decide.", sender: "Nizzy", time: "21:48" },
  ],
  "O que voces querem de mim?": [
    { id: 10, text: "Nada que voce nao queira dar.", sender: "D-Bee", time: "21:48" },
    { id: 11, text: "Mas a Cidade Neon precisa de gente real.", sender: "Nizzy", time: "21:48" },
  ],
}

const TRANSITION_TO_CONFIRM: Message[] = [
  { id: 20, text: "Antes de qualquer coisa, precisamos saber se voce e de verdade.", sender: "Alohan", time: "21:49" },
]

const CHOICE_2: ChoiceSet = {
  options: [
    "To pronto. Bora.",
    "Que tipo de prova?",
    "E se eu recusar?",
  ],
}

const AFTER_CHOICE_2: Record<string, Message[]> = {
  "To pronto. Bora.": [
    { id: 30, text: "Esse sim.", sender: "Nizzy", time: "21:49" },
    { id: 31, text: "Entao vai. Confirma tua identidade.", sender: "D-Bee", time: "21:49" },
  ],
  "Que tipo de prova?": [
    { id: 30, text: "Uma que so voce pode dar.", sender: "Alohan", time: "21:49" },
    { id: 31, text: "Confia. Clica.", sender: "D-Bee", time: "21:49" },
  ],
  "E se eu recusar?": [
    { id: 30, text: "Voce nao chegou ate aqui pra voltar.", sender: "Nizzy", time: "21:49" },
    { id: 31, text: "Vai la.", sender: "D-Bee", time: "21:49" },
  ],
}

const FINAL_PRE_CONFIRM: Message[] = [
  { id: 40, text: "Primeira confirmacao. Vai.", sender: "Alohan", time: "21:50" },
]

const CHOICE_3: ChoiceSet = {
  options: [
    "Confirmar identidade",
  ],
}

// After confirmation 0/3 returns: TikTok notif arrives
const POST_CONFIRM_0: Message[] = [
  { id: 100, text: "Passaste.", sender: "D-Bee", time: "21:53" },
  { id: 101, text: "Primeiro teste feito.", sender: "Nizzy", time: "21:53" },
  { id: 102, text: "A cidade ta de olho.", sender: "Alohan", time: "21:53" },
]

// After TikTok + confirm 1/3 returns
const POST_CONFIRM_1: Message[] = [
  { id: 200, text: "Segundo teste confirmado.", sender: "D-Bee", time: "21:56" },
  { id: 201, text: "Voce ta evoluindo.", sender: "Nizzy", time: "21:56" },
  { id: 202, text: "Agora volta pro inicio. Tem algo te esperando.", sender: "Alohan", time: "21:57" },
]

// After YouTube + confirm 2/3 returns -> 2 more replies needed
const POST_YOUTUBE: Message[] = [
  { id: 300, text: "Viu o filme?", sender: "D-Bee", time: "22:00" },
  { id: 301, text: "Pesado, ne.", sender: "Nizzy", time: "22:00" },
]

const CHOICE_POST_YOUTUBE: ChoiceSet = {
  options: [
    "Foi insano.",
    "Nao entendi tudo, mas senti.",
    "Quero mais.",
  ],
}

const AFTER_CHOICE_POST_YOUTUBE: Record<string, Message[]> = {
  "Foi insano.": [
    { id: 310, text: "E so o comeco.", sender: "Alohan", time: "22:01" },
  ],
  "Nao entendi tudo, mas senti.": [
    { id: 310, text: "Sentir e o bastante.", sender: "Alohan", time: "22:01" },
  ],
  "Quero mais.": [
    { id: 310, text: "Calma. Ja vem.", sender: "Alohan", time: "22:01" },
  ],
}

const PRE_UNLOCK: Message[] = [
  { id: 320, text: "Pra terceira confirmacao, voce vai precisar de uma senha.", sender: "D-Bee", time: "22:02" },
  { id: 321, text: "Desbloqueia uma faixa. O nome e a chave.", sender: "Nizzy", time: "22:02" },
]

const CHOICE_PRE_UNLOCK: ChoiceSet = {
  options: ["Desbloquear faixa"],
}

// After unlock
const POST_UNLOCK: Message[] = [
  { id: 400, text: "3/3 confirmado. Identidade validada.", sender: "D-Bee", time: "22:05" },
  { id: 401, text: "Voce e real. Parabens.", sender: "Nizzy", time: "22:05" },
  { id: 402, text: "Bem-vindo a Cidade Neon de verdade.", sender: "Alohan", time: "22:05" },
  { id: 403, text: "Nizzy saiu do grupo", sender: "system", time: "22:06", isSystem: true },
  { id: 404, text: "Alohan saiu do grupo", sender: "system", time: "22:06", isSystem: true },
  { id: 405, text: "LU2CA entrou no grupo", sender: "system", time: "22:06", isSystem: true },
  { id: 406, text: "Eae. Cheguei.", sender: "LU2CA", time: "22:06" },
  { id: 407, text: "A gente se ve na Cidade Neon.", sender: "LU2CA", time: "22:07" },
  { id: 408, text: "Fica de olho no celular.", sender: "D-Bee", time: "22:07" },
]

type ConversationPhase = 
  | "initial" | "choice-1" | "after-choice-1" | "choice-2" | "after-choice-2" | "choice-3"
  | "confirming-0" | "post-confirm-0" | "tiktok-notif"
  | "confirming-1" | "post-confirm-1" | "youtube-redirect"
  | "post-youtube" | "choice-post-youtube" | "after-choice-post-youtube"
  | "pre-unlock" | "choice-pre-unlock" | "confirming-2"
  | "post-unlock" | "final-notifications" | "done"

export default function WhatsAppGrupoPage() {
  const router = useRouter()
  const { state, updateCinematicStep, updateWhatsAppState, completeConfirmation } = useGameFunnel()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasInitialized = useRef(false)

  const [messages, setMessages] = useState<Message[]>([])
  const [convPhase, setConvPhase] = useState<ConversationPhase>("initial")
  const [currentChoices, setCurrentChoices] = useState<string[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [typingUser, setTypingUser] = useState<string | null>(null)
  const [showTikTokNotif, setShowTikTokNotif] = useState(false)
  const [showYouTubeNotif, setShowYouTubeNotif] = useState(false)
  const [showConfirmBtn, setShowConfirmBtn] = useState(false)
  const [confirmNumber, setConfirmNumber] = useState(0)

  useEffect(() => {
    updateCinematicStep("whatsapp-group")
  }, [updateCinematicStep])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const addMessages = useCallback((msgs: Message[], onDone?: () => void) => {
    let i = 0
    const next = () => {
      if (i >= msgs.length) { onDone?.(); return }
      const msg = msgs[i]
      if (!msg.isSystem) {
        setIsTyping(true)
        setTypingUser(msg.sender)
      }
      setTimeout(() => {
        setIsTyping(false)
        setTypingUser(null)
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        i++
        if (i < msgs.length) setTimeout(next, 600 + Math.random() * 500)
        else onDone?.()
      }, msg.isSystem ? 300 : 800 + Math.random() * 600)
    }
    setTimeout(next, 400)
  }, [])

  // Initialize conversation
  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    // Check state to resume if needed
    const confirmCount = state.confirmationCount

    if (confirmCount === 0 && state.perAppState.whatsapp.currentStep === 0) {
      // Fresh start
      addMessages(INITIAL_SCRIPT, () => {
        setCurrentChoices(CHOICE_1.options)
        setConvPhase("choice-1")
      })
    } else if (confirmCount === 1) {
      // Returning after confirm 0/3 + TikTok + confirm 1/3
      setConvPhase("post-confirm-1")
      addMessages(POST_CONFIRM_1, () => {
        // Go back to home for YouTube notification
        setConvPhase("youtube-redirect")
        setTimeout(() => router.push("/"), 2000)
      })
    } else if (confirmCount === 2) {
      // Returning after YouTube
      setConvPhase("post-youtube")
      addMessages(POST_YOUTUBE, () => {
        setCurrentChoices(CHOICE_POST_YOUTUBE.options)
        setConvPhase("choice-post-youtube")
      })
    } else if (confirmCount >= 3) {
      // After unlock
      setConvPhase("post-unlock")
      addMessages(POST_UNLOCK, () => {
        setConvPhase("final-notifications")
        // Trigger final notifications after delay
        setTimeout(() => router.push("/"), 4000)
      })
    } else {
      // Default fresh start
      addMessages(INITIAL_SCRIPT, () => {
        setCurrentChoices(CHOICE_1.options)
        setConvPhase("choice-1")
      })
    }
  }, [addMessages, state.confirmationCount, state.perAppState.whatsapp.currentStep, router])

  const handleChoice = (choice: string) => {
    setCurrentChoices([])
    const userMsg: Message = { id: Date.now(), text: choice, sender: "Voce", time: "21:49", isUser: true }
    setMessages(prev => [...prev, userMsg])

    if (convPhase === "choice-1") {
      const responses = AFTER_CHOICE_1[choice] || AFTER_CHOICE_1[CHOICE_1.options[0]]
      addMessages(responses, () => {
        addMessages(TRANSITION_TO_CONFIRM, () => {
          setCurrentChoices(CHOICE_2.options)
          setConvPhase("choice-2")
        })
      })
    } else if (convPhase === "choice-2") {
      const responses = AFTER_CHOICE_2[choice] || AFTER_CHOICE_2[CHOICE_2.options[0]]
      addMessages(responses, () => {
        addMessages(FINAL_PRE_CONFIRM, () => {
          setShowConfirmBtn(true)
          setConfirmNumber(0)
          setConvPhase("choice-3")
        })
      })
    } else if (convPhase === "choice-3") {
      // Go to confirmation 1 (0/3)
      setShowConfirmBtn(false)
      router.push("/confirmacao/1-arquetipos")
    } else if (convPhase === "choice-post-youtube") {
      const responses = AFTER_CHOICE_POST_YOUTUBE[choice] || AFTER_CHOICE_POST_YOUTUBE[CHOICE_POST_YOUTUBE.options[0]]
      addMessages(responses, () => {
        addMessages(PRE_UNLOCK, () => {
          setShowConfirmBtn(true)
          setConfirmNumber(2)
          setConvPhase("choice-pre-unlock")
          setCurrentChoices(CHOICE_PRE_UNLOCK.options)
        })
      })
    } else if (convPhase === "choice-pre-unlock") {
      // Go to unlock page
      setShowConfirmBtn(false)
      router.push("/confirmacao/3-desbloqueio")
    }
  }

  const handleConfirm = () => {
    setShowConfirmBtn(false)
    if (confirmNumber === 0) {
      router.push("/confirmacao/1-arquetipos")
    } else if (confirmNumber === 1) {
      router.push("/confirmacao/2-colunas")
    } else if (confirmNumber === 2) {
      router.push("/confirmacao/3-desbloqueio")
    }
  }

  const handleTikTokNotifClick = () => {
    setShowTikTokNotif(false)
    router.push("/tiktok/final")
  }

  const handleYouTubeNotifClick = () => {
    setShowYouTubeNotif(false)
    router.push("/youtube/cidade-neon")
  }

  const handleBack = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-[#0B141A] flex items-center justify-center touch-manipulation">
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] flex flex-col relative"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Cpath fill='%23182229' d='M0 0h80v80H0z'/%3E%3Cpath fill='%231F2C34' opacity='0.3' d='M20 20h2v2h-2zm40 0h2v2h-2zm-20 20h2v2h-2zm40 0h2v2h-2zm-60 20h2v2h-2zm40 0h2v2h-2z'/%3E%3C/svg%3E")` }}>

        {/* Notch - Apple floating pill */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />

        {/* Status bar */}
        <div className="relative z-20 h-[50px] flex items-end justify-between px-6 pb-1 text-white text-xs bg-[#1F2C34]">
          <span className="font-semibold w-12">9:41</span>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-3" fill="white" viewBox="0 0 16 12"><rect x="0" y="6" width="3" height="6" rx="0.5"/><rect x="4.5" y="4" width="3" height="8" rx="0.5"/><rect x="9" y="1" width="3" height="11" rx="0.5"/><rect x="13" y="0" width="3" height="12" rx="0.5" opacity="0.3"/></svg>
            <svg className="w-6 h-3" fill="white" viewBox="0 0 25 12"><rect x="0" y="1" width="22" height="10" rx="2" stroke="white" strokeWidth="1" fill="none"/><rect x="1.5" y="2.5" width="16" height="7" rx="1" fill="white"/><rect x="23" y="4" width="2" height="4" rx="0.5" fill="white" opacity="0.4"/></svg>
          </div>
        </div>

        {/* TikTok Notification */}
        {showTikTokNotif && (
          <button type="button" onClick={handleTikTokNotifClick} className="absolute top-[50px] left-2 right-2 z-50 animate-slide-down">
            <div className="bg-[#f2f2f7]/95 backdrop-blur-xl rounded-2xl p-3 flex items-center gap-3 shadow-2xl">
              <div className="w-10 h-10 rounded-[10px] bg-black flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between"><p className="text-black font-semibold text-sm">TikTok</p><span className="text-[#8e8e93] text-xs">agora</span></div>
                <p className="text-[#8e8e93] text-xs">LU2CA publicou um novo video</p>
              </div>
            </div>
          </button>
        )}

        {/* YouTube Notification */}
        {showYouTubeNotif && (
          <button type="button" onClick={handleYouTubeNotifClick} className="absolute top-[50px] left-2 right-2 z-50 animate-slide-down">
            <div className="bg-[#f2f2f7]/95 backdrop-blur-xl rounded-2xl p-3 flex items-center gap-3 shadow-2xl">
              <div className="w-10 h-10 rounded-[10px] bg-[#FF0000] flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between"><p className="text-black font-semibold text-sm">YouTube</p><span className="text-[#8e8e93] text-xs">agora</span></div>
                <p className="text-[#8e8e93] text-xs">Novo video: LU2CA - Cidade Neon (Filme Oficial)</p>
              </div>
            </div>
          </button>
        )}

        {/* Header */}
        <div className="bg-[#1F2C34] px-2 py-2 flex items-center gap-2">
          <button type="button" onClick={handleBack} className="p-2 text-[#AEBAC1] min-h-[44px] min-w-[44px] flex items-center justify-center">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6B7FD7] to-[#4ECDC4] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
          </div>
          <div className="flex-1">
            <h1 className="text-white font-medium text-sm">Cidade Neon</h1>
            <p className="text-[#8696A0] text-xs">D-Bee, Nizzy, Alohan</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-1.5">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}>
                {msg.isSystem ? (
                  <div className="bg-[#182229] rounded-lg px-3 py-1 text-[11px] text-[#8696A0] mx-auto my-1">{msg.text}</div>
                ) : (
                  <div className={`max-w-[80%] rounded-lg px-3 py-1.5 ${msg.isUser ? "bg-[#005C4B] rounded-tr-none" : "bg-[#202C33] rounded-tl-none"}`}>
                    {!msg.isUser && (
                      <p className="text-[11px] font-medium mb-0.5" style={{ color: PARTICIPANTS[msg.sender]?.color || "#8696A0" }}>{msg.sender}</p>
                    )}
                    <p className="text-[#E9EDEF] text-[14px] leading-[1.4]">{msg.text}</p>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <span className="text-[#667781] text-[10px]">{msg.time}</span>
                      {msg.isUser && (
                        <svg className="w-4 h-3 text-[#53BDEB]" fill="currentColor" viewBox="0 0 24 24"><path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/></svg>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isTyping && typingUser && (
              <div className="flex justify-start">
                <div className="bg-[#202C33] rounded-lg rounded-tl-none px-3 py-2">
                  <p className="text-[11px] font-medium mb-0.5" style={{ color: PARTICIPANTS[typingUser]?.color || "#8696A0" }}>{typingUser}</p>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[#8696A0] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-[#8696A0] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-[#8696A0] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </div>

        {/* Choice options */}
        {currentChoices.length > 0 && (
          <div className="px-3 pb-2 space-y-1.5">
            {currentChoices.map(choice => (
              <button
                key={choice}
                type="button"
                onClick={() => handleChoice(choice)}
                className="w-full bg-[#005C4B] hover:bg-[#006C5B] text-white text-sm py-3 px-4 rounded-full text-left transition-colors min-h-[44px] active:scale-[0.98]"
              >
                {choice}
              </button>
            ))}
          </div>
        )}

        {/* Confirm button */}
        {showConfirmBtn && (
          <div className="px-3 pb-2">
            <button type="button" onClick={handleConfirm} className="w-full bg-gradient-to-r from-[#6B7FD7] to-[#4ECDC4] text-white font-bold py-3 rounded-xl text-sm active:scale-[0.98] transition-transform min-h-[44px]">
              CONFIRMACAO {confirmNumber}/3
            </button>
          </div>
        )}

        {/* Input bar (visual only) */}
        <div className="bg-[#1F2C34] px-3 py-2 flex items-center gap-2" style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}>
          <div className="flex-1 bg-[#2A3942] rounded-full px-4 py-2">
            <input type="text" placeholder="Mensagem" className="w-full bg-transparent text-white text-sm outline-none placeholder-[#8696A0]" disabled />
          </div>
          <button type="button" className="p-2 text-[#8696A0]">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes slide-down { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-down { animation: slide-down 0.3s ease-out; }
      `}</style>
    </div>
  )
}
