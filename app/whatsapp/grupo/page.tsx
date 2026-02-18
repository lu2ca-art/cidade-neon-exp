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
  isConfirmDivider?: boolean
  confirmNum?: 1 | 2 | 3
  confirmDone?: boolean
}

interface ChoiceSet {
  options: string[]
}

const CONFIRM_LABELS: Record<number, string> = {
  1: "CONFIRMACAO 1/3 - TESTE DAS MUSICAS",
  2: "CONFIRMACAO 2/3 - TESTE DE QI",
  3: "CONFIRMACAO 3/3 - TESTE AURA",
}

const CONFIRM_DIVIDER_IDS: Record<number, number> = {
  1: 9001,
  2: 9002,
  3: 9003,
}

const PARTICIPANTS: Record<string, { color: string }> = {
  "D-Bee": { color: "#6B7FD7" },
  "Nizzy": { color: "#FF6B6B" },
  "Alohan": { color: "#4ECDC4" },
  "LU2CA": { color: "#1DB954" },
}

const STORAGE_KEY = "cidade-neon-grupo-msgs"

// Phase 1: Initial conversation
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

const TRANSITION_TO_CONFIRM: Message[] = [
  { id: 20, text: "Antes de qualquer coisa, precisamos saber se voce e de verdade.", sender: "Alohan", time: "21:49" },
  { id: 21, text: "Sao 3 confirmacoes. Cada uma te leva mais fundo.", sender: "D-Bee", time: "21:49" },
]

const CHOICE_2: ChoiceSet = {
  options: ["To pronto. Bora.", "Que tipo de prova?", "E se eu recusar?"],
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
  { id: 40, text: "Primeira confirmacao: Conecta as faixas com as emocoes.", sender: "Alohan", time: "21:50" },
]

// After C1 returns (confirmCount === 1) - talk about Cidade Neon, NO redirect
const POST_CONFIRM_1: Message[] = [
  { id: 100, text: "Passaste. 1/3 confirmado.", sender: "D-Bee", time: "21:53" },
  { id: 101, text: "Voce sente a musica de verdade. Poucos chegam aqui sentindo assim.", sender: "Nizzy", time: "21:53" },
  { id: 102, text: "mano a cidade neon ta ficando mais viva com gente como voce", sender: "Alohan", time: "21:54" },
  { id: 103, text: "tipo, a gente tava falando aqui sobre como a musica conecta as pessoas nesse lugar", sender: "D-Bee", time: "21:54" },
  { id: 104, text: "nem todo mundo que chega aqui consegue sentir de verdade sabe", sender: "Nizzy", time: "21:54" },
  { id: 105, text: "por isso existe o segundo teste. pra gente ver se voce enxerga alem do obvio.", sender: "Alohan", time: "21:55" },
]

// After C2 returns (confirmCount === 2) - talk about going deeper
const POST_CONFIRM_2: Message[] = [
  { id: 200, text: "2/3 confirmado. Mente afiada.", sender: "D-Bee", time: "21:56" },
  { id: 201, text: "a cidade neon so se revela pra quem tem coragem de ir ate o fundo", sender: "Nizzy", time: "21:56" },
  { id: 202, text: "agora falta a ultima confirmacao. essa e sobre quem voce e de verdade.", sender: "Alohan", time: "21:57" },
  { id: 203, text: "abre o AURA quando tiver pronto. e na tela inicial.", sender: "D-Bee", time: "21:57" },
]

// After C3 returns (confirmCount === 3) -> LU2CA enters
const POST_CONFIRM_3: Message[] = [
  { id: 300, text: "3/3 confirmado. Identidade validada.", sender: "D-Bee", time: "22:00" },
  { id: 301, text: "Voce e real. Parabens.", sender: "Nizzy", time: "22:00" },
  { id: 302, text: "Bem-vindo a Cidade Neon de verdade.", sender: "Alohan", time: "22:00" },
]

const MEMBERS_LEAVE: Message[] = [
  { id: 310, text: "Nizzy saiu do grupo", sender: "system", time: "22:01", isSystem: true },
  { id: 311, text: "Alohan saiu do grupo", sender: "system", time: "22:01", isSystem: true },
  { id: 312, text: "D-Bee saiu do grupo", sender: "system", time: "22:01", isSystem: true },
  { id: 313, text: "LU2CA entrou no grupo", sender: "system", time: "22:02", isSystem: true },
]

const LU2CA_MESSAGES: Message[] = [
  { id: 320, text: "Eae. Cheguei.", sender: "LU2CA", time: "22:02" },
  { id: 321, text: "Voce passou pelas 3 confirmacoes. Poucos chegam aqui.", sender: "LU2CA", time: "22:02" },
  { id: 322, text: "A Cidade Neon e sua agora.", sender: "LU2CA", time: "22:03" },
  { id: 323, text: "Fica de olho no celular. Tem mais vindo.", sender: "LU2CA", time: "22:03" },
]

type ConversationPhase =
  | "initial" | "choice-1" | "after-choice-1" | "choice-2" | "after-choice-2" | "pre-confirm"
  | "waiting-confirm-1" | "waiting-confirm-2" | "waiting-confirm-3"
  | "post-confirm-1" | "post-confirm-2" | "post-confirm-3"
  | "members-leave" | "lu2ca-entry" | "done"

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
  const lastProcessedCC = useRef<number>(-1)

  const [messages, setMessages] = useState<Message[]>([])
  const [convPhase, setConvPhase] = useState<ConversationPhase>("initial")
  const [currentChoices, setCurrentChoices] = useState<string[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [typingUser, setTypingUser] = useState<string | null>(null)
  const [showConfirmBtn, setShowConfirmBtn] = useState(false)
  const [activeConfirmNum, setActiveConfirmNum] = useState<1 | 2 | 3>(1)

  useEffect(() => { updateCinematicStep("whatsapp-group") }, [updateCinematicStep])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, isTyping])

  // Save messages whenever they change
  useEffect(() => {
    if (messages.length > 0) saveMessages(messages)
  }, [messages])

  // Insert a confirm divider into the message flow (active or done)
  const insertConfirmDivider = useCallback((num: 1 | 2 | 3, done: boolean) => {
    const dividerMsg: Message = {
      id: CONFIRM_DIVIDER_IDS[num],
      text: CONFIRM_LABELS[num],
      sender: "system",
      time: "",
      isConfirmDivider: true,
      confirmNum: num,
      confirmDone: done,
    }
    setMessages(prev => {
      const exists = prev.some(m => m.id === dividerMsg.id)
      if (exists) {
        // Update existing divider to done
        return prev.map(m => m.id === dividerMsg.id ? { ...m, confirmDone: done } : m)
      }
      return [...prev, dividerMsg]
    })
  }, [])

  // Mark a divider as completed (grayed out)
  const markDividerDone = useCallback((num: 1 | 2 | 3) => {
    setMessages(prev => prev.map(m =>
      m.id === CONFIRM_DIVIDER_IDS[num] ? { ...m, confirmDone: true } : m
    ))
  }, [])

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

  // Initialize conversation or resume from saved state
  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    const cc = state.confirmationCount
    const saved = loadMessages()

    // If we have saved messages, load them first
    if (saved.length > 0) {
      setMessages(saved)
      lastProcessedCC.current = cc

      // Determine what state to be in based on cc
      if (cc === 0) {
        // Check if user was mid-conversation
        const hasConfirmMsg = saved.some(m => m.id === 40)
        if (hasConfirmMsg) {
          setActiveConfirmNum(1)
          // Re-insert divider if not present
          if (!saved.some(m => m.id === CONFIRM_DIVIDER_IDS[1])) {
            insertConfirmDivider(1, false)
          }
          setShowConfirmBtn(true)
          setConvPhase("waiting-confirm-1")
        }
      } else if (cc === 1) {
        // Mark C1 divider as done
        markDividerDone(1)
        const hasPostC1 = saved.some(m => m.id === 100)
        if (!hasPostC1) {
          addMessages(POST_CONFIRM_1, () => {
            setActiveConfirmNum(2)
            insertConfirmDivider(2, false)
            setConvPhase("waiting-confirm-2")
            setTimeout(() => setShowConfirmBtn(true), 2000)
          })
        } else {
          setActiveConfirmNum(2)
          if (!saved.some(m => m.id === CONFIRM_DIVIDER_IDS[2])) {
            insertConfirmDivider(2, false)
          }
          setShowConfirmBtn(true)
          setConvPhase("waiting-confirm-2")
        }
      } else if (cc === 2) {
        markDividerDone(1)
        markDividerDone(2)
        const hasPostC2 = saved.some(m => m.id === 200)
        if (!hasPostC2) {
          addMessages(POST_CONFIRM_2, () => {
            setActiveConfirmNum(3)
            insertConfirmDivider(3, false)
            setConvPhase("waiting-confirm-3")
            setTimeout(() => setShowConfirmBtn(true), 2000)
          })
        } else {
          setActiveConfirmNum(3)
          if (!saved.some(m => m.id === CONFIRM_DIVIDER_IDS[3])) {
            insertConfirmDivider(3, false)
          }
          setShowConfirmBtn(true)
          setConvPhase("waiting-confirm-3")
        }
      } else if (cc >= 3) {
        markDividerDone(1)
        markDividerDone(2)
        markDividerDone(3)
        const hasPostC3 = saved.some(m => m.id === 300)
        if (!hasPostC3) {
          addMessages(POST_CONFIRM_3, () => {
            setTimeout(() => {
              addMessages(MEMBERS_LEAVE, () => {
                setConvPhase("lu2ca-entry")
                setTimeout(() => {
                  addMessages(LU2CA_MESSAGES, () => { setConvPhase("done") })
                }, 1000)
              })
            }, 1500)
          })
        } else {
          setConvPhase("done")
        }
      }
    } else {
      // Fresh start
      lastProcessedCC.current = 0
      addMessages(INITIAL_SCRIPT, () => {
        setCurrentChoices(CHOICE_1.options)
        setConvPhase("choice-1")
      })
    }
  }, [addMessages, state.confirmationCount, insertConfirmDivider, markDividerDone])

  // Watch for confirmationCount changes AFTER initial load (user returns from a test)
  useEffect(() => {
    if (!hasInitialized.current) return
    const cc = state.confirmationCount
    if (cc <= lastProcessedCC.current) return
    lastProcessedCC.current = cc

    if (cc === 1 && !messages.some(m => m.id === 100)) {
      setShowConfirmBtn(false)
      markDividerDone(1)
      addMessages(POST_CONFIRM_1, () => {
        setActiveConfirmNum(2)
        insertConfirmDivider(2, false)
        setConvPhase("waiting-confirm-2")
        setTimeout(() => setShowConfirmBtn(true), 2000)
      })
    } else if (cc === 2 && !messages.some(m => m.id === 200)) {
      setShowConfirmBtn(false)
      markDividerDone(2)
      addMessages(POST_CONFIRM_2, () => {
        setActiveConfirmNum(3)
        insertConfirmDivider(3, false)
        setConvPhase("waiting-confirm-3")
        setTimeout(() => setShowConfirmBtn(true), 2000)
      })
    } else if (cc >= 3 && !messages.some(m => m.id === 300)) {
      setShowConfirmBtn(false)
      markDividerDone(3)
      addMessages(POST_CONFIRM_3, () => {
        setTimeout(() => {
          addMessages(MEMBERS_LEAVE, () => {
            setConvPhase("lu2ca-entry")
            setTimeout(() => {
              addMessages(LU2CA_MESSAGES, () => { setConvPhase("done") })
            }, 1000)
          })
        }, 1500)
      })
    }
  }, [state.confirmationCount, addMessages, messages, markDividerDone, insertConfirmDivider])

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
          setActiveConfirmNum(1)
          insertConfirmDivider(1, false)
          setShowConfirmBtn(true)
          setConvPhase("waiting-confirm-1")
        })
      })
    }
  }

  const handleConfirm = () => {
    setShowConfirmBtn(false)
    const cc = state.confirmationCount
    if (cc === 0) router.push("/confirmacao/1-arquetipos")
    else if (cc === 1) router.push("/confirmacao/3-desbloqueio")
    else if (cc === 2) router.push("/")  // AURA is on the home screen
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
          <button type="button" onClick={() => router.push("/")} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Voltar para inicio">
            <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-1.5">
            {messages.map(msg => {
              // Render confirm dividers inline
              if (msg.isConfirmDivider) {
                const isDone = msg.confirmDone
                const isActive = !isDone && showConfirmBtn && msg.confirmNum === activeConfirmNum
                return (
                  <div key={msg.id} className="my-2">
                    {isActive ? (
                      <button type="button" onClick={handleConfirm} className="w-full text-left">
                        <div className="rounded-xl p-3 flex items-center gap-3 border bg-[#182229] border-[#00A884]/30 shadow-lg animate-pulse">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6B7FD7] to-[#4ECDC4] flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[#00A884] font-bold text-xs uppercase tracking-wider">{msg.text}</p>
                            <p className="text-[#8696A0] text-[11px] mt-0.5">Toque para iniciar</p>
                          </div>
                          <svg className="w-5 h-5 text-[#00A884]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                        </div>
                      </button>
                    ) : (
                      <div className={`rounded-xl p-3 flex items-center gap-3 border ${isDone ? "bg-[#182229]/50 border-[#2A3942] opacity-50" : "bg-[#182229]/30 border-[#2A3942]/50 opacity-30"}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? "bg-[#2A3942]" : "bg-[#2A3942]/50"}`}>
                          {isDone ? (
                            <svg className="w-5 h-5 text-[#00A884]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                          ) : (
                            <svg className="w-5 h-5 text-[#667781]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-xs uppercase tracking-wider ${isDone ? "text-[#667781] line-through" : "text-[#667781]"}`}>{msg.text}</p>
                          <p className="text-[#667781] text-[11px] mt-0.5">
                            {isDone ? "Completo" : "Aguardando..."}
                          </p>
                        </div>
                        {isDone && (
                          <svg className="w-5 h-5 text-[#00A884]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                        )}
                      </div>
                    )}
                  </div>
                )
              }

              return (
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
              )
            })}
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
