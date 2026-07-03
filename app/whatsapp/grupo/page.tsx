"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
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
}

const STORAGE_KEY = "cidade-neon-grupo-msgs"

// Conversa de abertura — puro registro/flavor. As missões e confirmações de
// verdade acontecem nos apps do celular (NECTAR, FEEL.GOOD, GUITAR DRIVER) e
// nas conversas privadas com Alohan/Nizzy/D-Bee, não aqui.
const INITIAL_SCRIPT: Message[] = [
  { id: 1, text: "Voce foi adicionado ao grupo", sender: "system", time: "21:47", isSystem: true },
  { id: 2, text: "Chegou.", sender: "D-Bee", time: "21:47" },
  { id: 3, text: "Sem barulho. A Cidade Neon ouve.", sender: "Nizzy", time: "21:47" },
  { id: 4, text: "Fica aqui. Observa.", sender: "Alohan", time: "21:48" },
]

const CHOICE_1: ChoiceSet = {
  options: ["Quem sao voces?", "O que aconteceu com o sistema?", "O que voces querem de mim?"],
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

const PRE_CLOSING: Message[] = [
  { id: 20, text: "voce ta aqui. isso ja diz algo.", sender: "Alohan", time: "21:49" },
  { id: 21, text: "mas a gente nao confirma nada por aqui.", sender: "D-Bee", time: "21:49" },
]

const CHOICE_2: ChoiceSet = {
  options: ["To pronto. Bora.", "Que tipo de prova?", "E se eu recusar?"],
}

const AFTER_CHOICE_2: Record<string, Message[]> = {
  "To pronto. Bora.": [
    { id: 30, text: "Esse sim.", sender: "Nizzy", time: "21:49" },
    { id: 31, text: "Entao vai. Ta tudo no teu celular.", sender: "D-Bee", time: "21:49" },
  ],
  "Que tipo de prova?": [
    { id: 30, text: "Uma que so voce pode dar.", sender: "Alohan", time: "21:49" },
    { id: 31, text: "Confia. Vai chegar por la.", sender: "D-Bee", time: "21:49" },
  ],
  "E se eu recusar?": [
    { id: 30, text: "Voce nao chegou ate aqui pra voltar.", sender: "Nizzy", time: "21:49" },
    { id: 31, text: "Vai la.", sender: "D-Bee", time: "21:49" },
  ],
}

const CLOSING_SCRIPT: Message[] = [
  { id: 40, text: "fica de olho no celular a partir de agora.", sender: "Alohan", time: "21:50" },
  { id: 41, text: "vai chegar coisa por la.", sender: "D-Bee", time: "21:50" },
]

type ConversationPhase = "initial" | "choice-1" | "choice-2" | "done"

function saveMessages(msgs: Message[]) {
  if (typeof window === "undefined") return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs)) } catch {}
}

function loadMessages(): Message[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch { return [] }
}

export default function WhatsAppGrupoPage() {
  const router = useRouter()
  const { state, updateCinematicStep } = useGameFunnel()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasInitialized = useRef(false)

  const [messages, setMessages] = useState<Message[]>([])
  const [convPhase, setConvPhase] = useState<ConversationPhase>("initial")
  const [currentChoices, setCurrentChoices] = useState<string[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [typingUser, setTypingUser] = useState<string | null>(null)

  useEffect(() => { updateCinematicStep("whatsapp-group") }, [updateCinematicStep])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, isTyping])

  // Save messages whenever they change
  useEffect(() => {
    if (messages.length > 0) saveMessages(messages)
  }, [messages])

  const addMessages = useCallback((msgs: Message[], onDone?: () => void) => {
    let i = 0
    const next = () => {
      if (i >= msgs.length) { onDone?.(); return }
      const msg = msgs[i]
      if (!msg.isSystem) { setIsTyping(true); setTypingUser(msg.sender) }
      setTimeout(() => {
        setIsTyping(false); setTypingUser(null)
        setMessages(prev => {
          const exists = prev.some(m => m.id === msg.id)
          return exists ? prev : [...prev, msg]
        })
        i++
        if (i < msgs.length) setTimeout(next, 600 + Math.random() * 500)
        else onDone?.()
      }, msg.isSystem ? 300 : 800 + Math.random() * 600)
    }
    setTimeout(next, 400)
  }, [])

  // Essa conversa é só o registro de abertura (flavor) — não guia mais o
  // progresso do jogo. Se já foi conversada antes, só mostra o histórico.
  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    const saved = loadMessages()
    if (saved.length > 0) {
      setMessages(saved)
      setConvPhase("done")
    } else {
      addMessages(INITIAL_SCRIPT, () => {
        setCurrentChoices(CHOICE_1.options)
        setConvPhase("choice-1")
      })
    }
  }, [addMessages])

  const handleChoice = (choice: string) => {
    setCurrentChoices([])
    const userMsg: Message = { id: Date.now(), text: choice, sender: "Voce", time: "21:49", isUser: true }
    setMessages(prev => [...prev, userMsg])

    if (convPhase === "choice-1") {
      const responses = AFTER_CHOICE_1[choice] || AFTER_CHOICE_1[CHOICE_1.options[0]]
      addMessages(responses, () => {
        addMessages(PRE_CLOSING, () => {
          setCurrentChoices(CHOICE_2.options)
          setConvPhase("choice-2")
        })
      })
    } else if (convPhase === "choice-2") {
      const responses = AFTER_CHOICE_2[choice] || AFTER_CHOICE_2[CHOICE_2.options[0]]
      addMessages(responses, () => {
        addMessages(CLOSING_SCRIPT, () => { setConvPhase("done") })
      })
    }
  }

  const cc = state.confirmationCount
  const participantsText = cc >= 3 ? "LU2CA, Voce" : "D-Bee, Nizzy, Alohan"

  return (
    <div className="min-h-screen bg-[#0B141A] flex items-center justify-center touch-manipulation">
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] flex flex-col relative"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Cpath fill='%23182229' d='M0 0h80v80H0z'/%3E%3Cpath fill='%231F2C34' opacity='0.3' d='M20 20h2v2h-2zm40 0h2v2h-2zm-20 20h2v2h-2zm40 0h2v2h-2zm-60 20h2v2h-2zm40 0h2v2h-2z'/%3E%3C/svg%3E")` }}>

        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />

        {/* Status bar */}
        <div className="relative z-20 h-[50px] flex items-end justify-between px-6 pb-1 text-white text-xs bg-[#1F2C34]">
          <span className="font-semibold w-12">9:41</span>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-3" fill="white" viewBox="0 0 16 12"><rect x="0" y="6" width="3" height="6" rx="0.5" /><rect x="4.5" y="4" width="3" height="8" rx="0.5" /><rect x="9" y="1" width="3" height="11" rx="0.5" /><rect x="13" y="0" width="3" height="12" rx="0.5" opacity="0.3" /></svg>
            <svg className="w-6 h-3" fill="white" viewBox="0 0 25 12"><rect x="0" y="1" width="22" height="10" rx="2" stroke="white" strokeWidth="1" fill="none" /><rect x="1.5" y="2.5" width="16" height="7" rx="1" fill="white" /><rect x="23" y="4" width="2" height="4" rx="0.5" fill="white" opacity="0.4" /></svg>
          </div>
        </div>

        {/* Header */}
        <div className="bg-[#1F2C34] px-2 py-2 flex items-center gap-2">
          <button type="button" onClick={() => router.push("/whatsapp")} className="p-2 text-[#AEBAC1] min-h-[44px] min-w-[44px] flex items-center justify-center">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6B7FD7] to-[#4ECDC4] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
          </div>
          <div className="flex-1">
            <h1 className="text-white font-medium text-sm">Cidade Neon</h1>
            <p className="text-[#8696A0] text-xs">{participantsText}</p>
          </div>
          <button type="button" onClick={() => router.push("/?screen=home")} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Voltar para inicio">
            <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
          </button>
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
                        <svg className="w-4 h-3 text-[#53BDEB]" fill="currentColor" viewBox="0 0 24 24"><path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z" /></svg>
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
              <button key={choice} type="button" onClick={() => handleChoice(choice)} className="w-full bg-[#005C4B] hover:bg-[#006C5B] text-white text-sm py-3 px-4 rounded-full text-left transition-colors min-h-[44px] active:scale-[0.98]">
                {choice}
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div className="bg-[#1F2C34] px-3 py-2 flex items-center gap-2" style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}>
          <div className="flex-1 bg-[#2A3942] rounded-full px-4 py-2">
            <input type="text" placeholder="Mensagem" className="w-full bg-transparent text-white text-sm outline-none placeholder-[#8696A0]" disabled />
          </div>
          <button type="button" className="p-2 text-[#8696A0]">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
