"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import { ConfirmationOverlay } from "@/components/ConfirmationOverlay"

interface Message {
  id: number
  text: string
  sender: string
  time: string
  isSystem?: boolean
  isUser?: boolean
}

const PARTICIPANTS = {
  "D-Bee": { color: "#6B7FD7", avatar: "/images/avatar-dbee.jpg" },
  "Nizzy": { color: "#FF6B6B", avatar: "/images/avatar-nizzy.jpg" },
  "Alohan": { color: "#4ECDC4", avatar: "/images/avatar-alohan.jpg" },
}

const INITIAL_SCRIPT: Message[] = [
  { id: 1, text: "Voce foi adicionado ao grupo", sender: "system", time: "21:47", isSystem: true },
  { id: 2, text: "Voce chegou.", sender: "D-Bee", time: "21:47" },
  { id: 3, text: "Sem barulho. A Cidade Neon ouve.", sender: "Nizzy", time: "21:47" },
  { id: 4, text: "Fica aqui. Observa.", sender: "Alohan", time: "21:48" },
  { id: 5, text: "Antes: diz uma coisa. Qual pergunta voce faz primeiro?", sender: "D-Bee", time: "21:48" },
]

const QUESTION_OPTIONS = [
  "Quem esta me chamando?",
  "O que aconteceu com o sistema?",
  "O que voces querem de mim?",
]

const POST_QUESTION_SCRIPT: Message[] = [
  { id: 100, text: "Resposta depois.", sender: "Nizzy", time: "21:49" },
  { id: 101, text: "Primeiro, prova que e humano.", sender: "Alohan", time: "21:49" },
  { id: 102, text: "Clica em 'Entrar na experiencia de confirmacao'. A gente espera.", sender: "D-Bee", time: "21:49" },
]

const POST_CONFIRMATION_1: Message[] = [
  { id: 200, text: "Ok. Um padrao humano.", sender: "D-Bee", time: "21:52" },
  { id: 201, text: "1/3 confirmado.", sender: "Nizzy", time: "21:52" },
  { id: 202, text: "Continua.", sender: "Alohan", time: "21:52" },
]

const POST_CONFIRMATION_2: Message[] = [
  { id: 300, text: "2/3 confirmado.", sender: "Nizzy", time: "21:55" },
  { id: 301, text: "Agora fica serio.", sender: "Alohan", time: "21:55" },
  { id: 302, text: "A Cidade Neon caca falhas. E voce... brilha.", sender: "D-Bee", time: "21:56" },
  { id: 303, text: "Tem ameaca rodando nos becos.", sender: "Nizzy", time: "21:56" },
  { id: 304, text: "E tem gente ouvindo esse chat.", sender: "Alohan", time: "21:56" },
  { id: 305, text: "So falta um ultimo passo.", sender: "D-Bee", time: "21:57" },
]

const POST_CONFIRMATION_3: Message[] = [
  { id: 400, text: "3/3 confirmado. Identidade validada.", sender: "D-Bee", time: "22:00" },
  { id: 401, text: "Voce e real.", sender: "Nizzy", time: "22:00" },
  { id: 402, text: "Bem-vindo a Cidade Neon.", sender: "Alohan", time: "22:00" },
  { id: 403, text: "So desbloqueia depois de falar com um amigo especial", sender: "D-Bee", time: "22:01" },
]

export default function WhatsAppGrupoPage() {
  const router = useRouter()
  const { state, updateCinematicStep, updateWhatsAppState } = useGameFunnel()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [messages, setMessages] = useState<Message[]>(state.perAppState.whatsapp.messages.length > 0 
    ? state.perAppState.whatsapp.messages 
    : []
  )
  const [currentStep, setCurrentStep] = useState(state.perAppState.whatsapp.currentStep)
  const [showOptions, setShowOptions] = useState(false)
  const [userChoice, setUserChoice] = useState<string | null>(state.perAppState.whatsapp.userChoice)
  const [isTyping, setIsTyping] = useState(false)
  const [typingUser, setTypingUser] = useState<string | null>(null)

  useEffect(() => {
    updateCinematicStep("whatsapp-group")
  }, [updateCinematicStep])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Initial script animation
  useEffect(() => {
    if (messages.length > 0 || currentStep > 0) return
    
    let index = 0
    const showNextMessage = () => {
      if (index < INITIAL_SCRIPT.length) {
        const msg = INITIAL_SCRIPT[index]
        
        // Show typing indicator before message
        if (!msg.isSystem) {
          setIsTyping(true)
          setTypingUser(msg.sender)
        }
        
        setTimeout(() => {
          setIsTyping(false)
          setTypingUser(null)
          setMessages((prev) => [...prev, msg])
          index++
          
          // Show options after last initial message
          if (index === INITIAL_SCRIPT.length) {
            setTimeout(() => {
              setShowOptions(true)
              setCurrentStep(1)
              updateWhatsAppState({ currentStep: 1 })
            }, 500)
          } else {
            setTimeout(showNextMessage, 800 + Math.random() * 400)
          }
        }, msg.isSystem ? 300 : 1200 + Math.random() * 800)
      }
    }
    
    setTimeout(showNextMessage, 500)
  }, [messages.length, currentStep, updateWhatsAppState])

  // Handle returning from confirmations
  useEffect(() => {
    const { confirmationCount } = state
    const { currentStep: step } = state.perAppState.whatsapp
    
    // After confirmation 1 (step should be 2 but confirmationCount is 1)
    if (confirmationCount === 1 && step >= 2 && step < 3) {
      addMessagesSequentially(POST_CONFIRMATION_1, () => {
        setCurrentStep(3)
        updateWhatsAppState({ currentStep: 3 })
      })
    }
    
    // After confirmation 2
    if (confirmationCount === 2 && step >= 3 && step < 4) {
      addMessagesSequentially(POST_CONFIRMATION_2, () => {
        setCurrentStep(4)
        updateWhatsAppState({ currentStep: 4 })
      })
    }
    
    // After confirmation 3
    if (confirmationCount === 3 && step >= 4 && step < 5) {
      addMessagesSequentially(POST_CONFIRMATION_3, () => {
        setCurrentStep(5)
        updateWhatsAppState({ 
          currentStep: 5, 
          messages: [...messages, ...POST_CONFIRMATION_3] 
        })
        updateCinematicStep("private-notifications")
        
        // Transition to TikTok after messages
        setTimeout(() => {
          router.push("/tiktok/final")
        }, 3000)
      })
    }
  }, [state.confirmationCount, state.perAppState.whatsapp])

  const addMessagesSequentially = (msgs: Message[], onComplete?: () => void) => {
    let index = 0
    const addNext = () => {
      if (index < msgs.length) {
        const msg = msgs[index]
        setIsTyping(true)
        setTypingUser(msg.sender)
        
        setTimeout(() => {
          setIsTyping(false)
          setTypingUser(null)
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === msg.id)) return prev
            return [...prev, msg]
          })
          index++
          setTimeout(addNext, 800 + Math.random() * 400)
        }, 1000 + Math.random() * 500)
      } else if (onComplete) {
        onComplete()
      }
    }
    addNext()
  }

  const handleOptionClick = (option: string) => {
    setShowOptions(false)
    setUserChoice(option)
    updateWhatsAppState({ userChoice: option })
    
    // Add user message
    const userMsg: Message = {
      id: 50,
      text: option,
      sender: "Voce",
      time: "21:49",
      isUser: true,
    }
    setMessages((prev) => [...prev, userMsg])
    
    // Add post-question script
    setTimeout(() => {
      addMessagesSequentially(POST_QUESTION_SCRIPT, () => {
        setCurrentStep(2)
        updateWhatsAppState({ 
          currentStep: 2, 
          messages: [...messages, userMsg, ...POST_QUESTION_SCRIPT] 
        })
      })
    }, 800)
  }

  const handleBack = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-[#0B141A] flex items-center justify-center overflow-hidden">
      <div 
        className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col relative"
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Cpath fill='%23182229' d='M0 0h80v80H0z'/%3E%3Cpath fill='%231F2C34' opacity='0.3' d='M20 20h2v2h-2zm40 0h2v2h-2zm-20 20h2v2h-2zm40 0h2v2h-2zm-60 20h2v2h-2zm40 0h2v2h-2z'/%3E%3C/svg%3E")` 
        }}
      >
        {/* iPhone Notch */}
        <div className="relative z-20 h-[54px] flex items-center justify-center flex-shrink-0 bg-[#1F2C34]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[126px] h-[34px] bg-black rounded-b-[18px]" />
        </div>

        {/* Header */}
        <div className="bg-[#1F2C34] px-2 py-2 flex items-center gap-2">
          <button type="button" onClick={handleBack} className="p-2 text-[#AEBAC1] min-h-[44px] min-w-[44px] flex items-center justify-center">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6B7FD7] to-[#4ECDC4] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
            </svg>
          </div>
          <div className="flex-1">
            <h1 className="text-white font-medium">Cidade Neon</h1>
            <p className="text-[#8696A0] text-xs">D-Bee, Nizzy, Alohan</p>
          </div>
          <button type="button" className="p-2 text-[#AEBAC1]">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.5 12c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5 1.5.67 1.5 1.5zm-5 0c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5 1.5.67 1.5 1.5zm-5 0c0 .83-.67 1.5-1.5 1.5S4.5 12.83 4.5 12s.67-1.5 1.5-1.5 1.5.67 1.5 1.5z"/></svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-2">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}>
                {msg.isSystem ? (
                  <div className="bg-[#182229] rounded-lg px-3 py-1 text-xs text-[#8696A0] mx-auto">
                    {msg.text}
                  </div>
                ) : (
                  <div 
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      msg.isUser 
                        ? "bg-[#005C4B] rounded-tr-none" 
                        : "bg-[#202C33] rounded-tl-none"
                    }`}
                  >
                    {!msg.isUser && (
                      <p 
                        className="text-xs font-medium mb-1"
                        style={{ color: PARTICIPANTS[msg.sender as keyof typeof PARTICIPANTS]?.color || "#8696A0" }}
                      >
                        {msg.sender}
                      </p>
                    )}
                    <p className="text-white text-sm break-words hyphens-auto">{msg.text}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[#667781] text-[10px]">{msg.time}</span>
                      {msg.isUser && (
                        <svg className="w-4 h-4 text-[#34B7F1]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
                        </svg>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* Typing indicator */}
            {isTyping && typingUser && (
              <div className="flex justify-start">
                <div className="bg-[#202C33] rounded-lg rounded-tl-none px-3 py-2">
                  <p 
                    className="text-xs font-medium mb-1"
                    style={{ color: PARTICIPANTS[typingUser as keyof typeof PARTICIPANTS]?.color || "#8696A0" }}
                  >
                    {typingUser}
                  </p>
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

        {/* Quick Reply Options */}
        {showOptions && (
          <div className="px-3 pb-2 space-y-2">
            {QUESTION_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleOptionClick(option)}
                className="w-full bg-[#005C4B] hover:bg-[#006C5B] text-white text-sm py-3 px-4 rounded-full text-left transition-colors min-h-[44px]"
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar (disabled) */}
        <div className="bg-[#1F2C34] px-3 py-2 flex items-center gap-2" style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}>
          <button type="button" className="p-2 text-[#8696A0]">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
          </button>
          <div className="flex-1 bg-[#2A3942] rounded-full px-4 py-2">
            <input 
              type="text" 
              placeholder="Mensagem" 
              className="w-full bg-transparent text-white text-sm outline-none placeholder-[#8696A0]"
              disabled
            />
          </div>
          <button type="button" className="p-2 text-[#8696A0]">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
          </button>
        </div>

        {/* Confirmation Overlay */}
        <ConfirmationOverlay />
      </div>
    </div>
  )
}
