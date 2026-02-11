"use client"

import type { ReactElement } from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"

/* ─── TYPES ──────────────────────────────────────────── */
type Phase =
  | "incoming-call"
  | "active-call"
  | "hacker"
  | "spotify"
  | "phone-home"
  | "whatsapp-group"
  | "confirmation-1"
  | "confirmation-2"
  | "confirmation-3"
  | "post-confirm-group"
  | "final-notifications"
  | "aura-login"

interface Msg {
  id: number
  text: string
  sender: string
  time: string
  isSystem?: boolean
}

/* ─── CONSTANTS ──────────────────────────────────────── */
const HACKER_LINES = [
  "> conexao estabelecida",
  "> interceptando stream...",
  "> [0x7F4E2D9A] bypass ativo",
  "> IP: 192.168.███.███",
  "> PORT: 443 >> REDIRECT",
  "> ssh root@cidade-neon",
  "> AUTH_TOKEN: ██████████",
  "> decrypting packets...",
  "> kernel32.dll injected",
  "> FIREWALL: DISABLED",
  "> sudo rm -rf /system/security/*",
  "> CHMOD 777 /all/access",
  "> voce ta ouvindo?",
  "> isso nao e aleatorio",
  "> tem gente aqui",
  "> procurando",
  "> .",
  "> ..",
  "> ...",
  "",
  "ACESSO GARANTIDO",
]

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!?<>{}[]|/\\~^"

const TRACKS = [
  { id: 1, masked: "N**T**", full: "nectar", color: "#FF6B9D" },
  { id: 2, masked: "D******A", full: "dopamina", color: "#FF9D6B" },
  { id: 3, masked: "*J**A", full: "ojala", color: "#6B9DFF" },
  { id: 4, masked: "S*** O****?", full: "sabe ontem?", color: "#FFD93D" },
  { id: 5, masked: "C***A", full: "chuva", color: "#9DFF6B" },
]

const EMOTIONS = [
  { id: 1, label: "DESEJO", color: "#FF6B9D" },
  { id: 2, label: "EUFORIA", color: "#FF9D6B" },
  { id: 3, label: "SAUDADE", color: "#6B9DFF" },
  { id: 4, label: "DUVIDA", color: "#FFD93D" },
  { id: 5, label: "MELANCOLIA", color: "#9DFF6B" },
]

const CORRECT_CONNECTIONS: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }

const ARCHETYPE_QUESTIONS = [
  {
    question: "QUANDO A CIDADE APAGA, VOCE...",
    options: ["ACENDE POR DENTRO", "VIRA SOMBRA", "PROCURA O SINAL", "RI DO CAOS"],
  },
  {
    question: "SEU INSTINTO TE PUXA PARA...",
    options: ["DECIFRAR", "PROTEGER", "FUGIR", "PROVOCAR"],
  },
  {
    question: "O QUE VOCE CONFIA PRIMEIRO?",
    options: ["NO TOQUE", "NO SOM", "NO PADRAO", "NO SILENCIO"],
  },
]

const ARCHETYPES = [
  "O FIREWALL ERRANTE", "A SACERDOTISA DO RUIDO", "O MAGO DE NEON", "A TORRE EM LOOP",
  "O HERMITAO DIGITAL", "O LOUCO DOS BECOS", "A IMPERATRIZ GLITCH", "O IMPERADOR SOMBRA",
  "A RODA DO CODIGO", "A FORCA DO SINAL", "O ENFORCADO EM REDE", "A MORTE DO SISTEMA",
  "A TEMPERANCA NEON", "O DIABO DE PIXELS", "A ESTRELA BINARIA", "A LUA EM ESTATICA",
  "O SOL DE CIRCUITOS", "O JULGAMENTO FINAL", "O MUNDO VIRTUAL", "O GUARDIAO DO VOID",
  "O HACKER SOLITARIO", "A BRUXA DO WI-FI", "O CAVALEIRO DE DADOS", "A RAINHA DO CAOS",
  "O REI DAS SOMBRAS", "O BUFAO ELETRICO", "A SACERDOTISA NEON", "O ALQUIMISTA DIGITAL",
  "O PROFETA DO GLITCH", "A SIBILA DOS BECOS", "O EREMITA DO CODIGO", "A JUSTICA HACKEADA",
  "O AMANTE DE PIXELS", "O CARRO EM FUGA", "A FORCA OCULTA", "O PENDURADO EM LOOP",
  "A MORTE RENASCIDA", "O ANJO DE NEON", "O DEMONIO DO SISTEMA", "A TORRE CAIDA",
  "A ESTRELA CADENTE", "A LUA INVERTIDA", "O SOL ESCURO", "O MENSAGEIRO DO FIM",
  "O CRIADOR DO VOID", "O DESTRUIDOR DE REDES", "O GUARDIAO DO PORTAL", "A VIDENTE DO CAOS",
  "O FANTASMA DIGITAL", "A SOMBRA LUMINOSA", "O ECO DO PASSADO", "O FUTURO EM RUINAS",
  "O PRESENTE ETERNO", "O VIAJANTE DO TEMPO", "O SONHADOR ACORDADO", "O PESADELO VIVO",
  "A AURORA DE NEON", "O CREPUSCULO ETERNO", "O MEIO-DIA SOMBRIO", "A MEIA-NOITE CLARA",
  "O INFINITO FINITO", "O ZERO ABSOLUTO", "O UM PRIMORDIAL", "O TODO E O NADA",
]

const participants: Record<string, { color: string; avatar: string }> = {
  "D-Bee": { color: "#6B7FD7", avatar: "/images/avatar-dbee.jpg" },
  Nizzy: { color: "#FF6B6B", avatar: "/images/avatar-nizzy.jpg" },
  Alohan: { color: "#4ECDC4", avatar: "/images/avatar-alohan.jpg" },
}

/* ─── MATRIX RAIN COMPONENT ─────────────────────────── */
function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    
    const cols = Math.floor(canvas.width / 14)
    const drops: number[] = Array(cols).fill(1).map(() => Math.random() * -50)
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*アイウエオカキクケコ"
    
    const draw = () => {
      ctx.fillStyle = "rgba(0,0,0,0.05)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = "#00FF66"
      ctx.font = "12px monospace"
      
      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)]
        const x = i * 14
        const y = drops[i] * 14
        
        ctx.globalAlpha = Math.random() * 0.5 + 0.5
        ctx.fillText(char, x, y)
        
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i]++
      }
      ctx.globalAlpha = 1
    }
    
    const interval = setInterval(draw, 33)
    return () => clearInterval(interval)
  }, [])
  
  return <canvas ref={canvasRef} className="w-full h-full" />
}

/* ─── HACKER LINE WITH SCRAMBLE EFFECT ──────────────── */
function HackerLine({ text, delay, isFinal }: { text: string; delay: number; isFinal: boolean }) {
  const [display, setDisplay] = useState("")
  const [done, setDone] = useState(false)
  
  useEffect(() => {
    if (!text) { setDisplay(""); setDone(true); return }
    
    const length = text.length
    let iteration = 0
    const maxIterations = isFinal ? length * 4 : length * 2
    
    const scramble = () => {
      const revealed = Math.floor((iteration / maxIterations) * length)
      let result = ""
      for (let i = 0; i < length; i++) {
        if (i < revealed) {
          result += text[i]
        } else if (text[i] === " ") {
          result += " "
        } else {
          result += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
        }
      }
      setDisplay(result)
      iteration++
      if (iteration > maxIterations) {
        setDisplay(text)
        setDone(true)
      }
    }
    
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        scramble()
        if (iteration > maxIterations) clearInterval(interval)
      }, isFinal ? 40 : 25)
      return () => clearInterval(interval)
    }, delay)
    
    return () => clearTimeout(timer)
  }, [text, delay, isFinal])
  
  if (isFinal) {
    return (
      <div className="text-center py-6">
        <span
          className={`text-2xl font-bold tracking-[0.3em] transition-all duration-500 ${done ? "opacity-100" : "opacity-90"}`}
          style={{
            color: "#00FF66",
            textShadow: done
              ? "0 0 30px rgba(0,255,102,.9), 0 0 60px rgba(0,255,102,.6), 0 0 90px rgba(0,255,102,.3)"
              : "0 0 10px rgba(0,255,102,.5)",
          }}
        >
          {display}
        </span>
        {done && (
          <div className="mt-2 h-[2px] mx-auto bg-gradient-to-r from-transparent via-[#00FF66] to-transparent animate-pulse" style={{ width: "60%" }} />
        )}
      </div>
    )
  }
  
  return (
    <span
      className="text-[13px] tracking-wide block"
      style={{ color: "#00FF66", textShadow: "0 0 8px rgba(0,255,102,.4)" }}
    >
      {display}
    </span>
  )
}

/* ─── COMPONENT ──────────────────────────────────────── */
export default function CidadeNeonExperience() {
  const { state: gameFunnelState } = useGameFunnel()

  // Determine initial phase based on GameFunnel state
  const getInitialPhase = (): Phase => {
    const step = gameFunnelState.cinematicStep
    if (step === "idle" || step === "incoming-call") return "incoming-call"
    if (step === "active-call") return "active-call"
    if (step === "hacker-takeover") return "hacker"
    // All post-hacker steps now go to phone-home, since WhatsApp/Spotify/YouTube/TikTok/confirmations are separate pages
    if (step === "spotify-auto" || step === "whatsapp-notification") return "phone-home"
    if (step === "whatsapp-group") return "phone-home"
    if (step === "confirmation-1" || step === "confirmation-2" || step === "confirmation-3") return "phone-home"
    if (step === "private-notifications" || step === "tiktok-notification" || step === "tiktok-final") return "phone-home"
    if (step === "completed" || step === "sala-branca") return "phone-home"
    // Default: if flow has progressed past hacker, show phone-home
    if (gameFunnelState.perAppState.hacker.completed) return "phone-home"
    return "incoming-call"
  }

  /* ── Phase ────────── */
  const [phase, setPhase] = useState<Phase>(getInitialPhase)

  /* ── Call ────────── */
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(false)
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ── Hacker ────────── */
  const [hackerLines, setHackerLines] = useState<string[]>([])
  const [hackerIdx, setHackerIdx] = useState(0)
  const [showMatrix, setShowMatrix] = useState(true)
  const [matrixFading, setMatrixFading] = useState(false)
  const hackerScrollRef = useRef<HTMLDivElement>(null)

  /* ── Spotify ────────── */
  const [spotifyProgress, setSpotifyProgress] = useState(0)
  const [spotifyElapsed, setSpotifyElapsed] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [spotifyVolume, setSpotifyVolume] = useState(70)
  const [showVolume, setShowVolume] = useState(false)
  const [isGlitching] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  /* ── WhatsApp Group ────────── */
  const [groupMessages, setGroupMessages] = useState<Msg[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [groupInteractions, setGroupInteractions] = useState(0)
  const [inputValue, setInputValue] = useState("")
  const [confirmationsDone, setConfirmationsDone] = useState(0)
  const [showConfirmBtn, setShowConfirmBtn] = useState(false)
  const [currentTime] = useState("21:47")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const groupScriptSent = useRef(false)
  const postConfirmScriptSent = useRef(false)

  /* ── Confirmation 1: Archetypes ────────── */
  const [c1Question, setC1Question] = useState(0)
  const [c1Answers, setC1Answers] = useState<number[]>([])
  const [c1Result, setC1Result] = useState<string | null>(null)
  const [c1Animating, setC1Animating] = useState(false)

  /* ── Confirmation 2: Columns ────────── */
  const [selectedTrack, setSelectedTrack] = useState<number | null>(null)
  const [connections, setConnections] = useState<Record<number, number>>({})

  /* ── Confirmation 3: Unlock ────────── */
  const [c3SelectedTrack, setC3SelectedTrack] = useState<number | null>(null)
  const [c3Password, setC3Password] = useState("")
  const [c3Revealed, setC3Revealed] = useState(0)

  /* ── Phone Home ────────── */
  const [showNotification, setShowNotification] = useState(false)
  const [showYouTubeNotif, setShowYouTubeNotif] = useState(false)
  const [showTikTokNotif, setShowTikTokNotif] = useState(false)
  const [appBadges, setAppBadges] = useState<Record<string, boolean>>({})

  /* ── Final Notifications ────────── */
  const [finalNotifs, setFinalNotifs] = useState<Array<{ app: string; text: string }>>([])

  /* ── AURA ────────── */
  const [auraEmail, setAuraEmail] = useState("")
  const [auraPass, setAuraPass] = useState("")
  const [auraTab, setAuraTab] = useState<"signin" | "signup">("signin")

  const phoneApps = [
    { id: "untitled", name: "[UNTITLED]", icon: "untitled", color: "#8B5CF6", link: "https://untitled.stream/buy/project/cwGIXvpY419u7v6UDOHQz" },
    { id: "spotify", name: "Spotify", icon: "spotify", color: "#1DB954" },
    { id: "tiktok", name: "TikTok", icon: "tiktok", color: "#000000", link: "https://tiktok.com/@lu2ca.mp3" },
    { id: "youtube", name: "YouTube", icon: "youtube", color: "#FF0000", link: "https://www.youtube.com/@LU222CA" },
    { id: "instagram", name: "Instagram", icon: "instagram", color: "#E1306C", link: "https://instagram.com/lu2ca.mp3/" },
    { id: "whatsapp", name: "WhatsApp", icon: "whatsapp", color: "#25D366" },
    { id: "notes", name: "BLOCO DE NOTAS", icon: "notes", color: "#FFCC00" },
    { id: "safari", name: "Safari", icon: "safari", color: "#007AFF", link: "https://lu2ca.me" },
    { id: "photos", name: "Fotos", icon: "photos", color: "#FF9500", link: "https://lu2ca.me/galeria" },
    { id: "music", name: "Musica", icon: "music", color: "#FF2D55", link: "https://lu2ca.me/musicaporlu2ca" },
    { id: "phone", name: "Telefone", icon: "phone", color: "#34C759", link: "https://lu2ca.me/contacto-social" },
    { id: "aura", name: "AURA", icon: "aura", color: "#E0E7FF" },
  ]

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  /* ─── CALL LOGIC ───────────────────────────── */
  useEffect(() => {
    if (phase !== "active-call") return
    callTimerRef.current = setInterval(() => {
      setCallDuration((d) => {
        if (d >= 14) {
          if (callTimerRef.current) clearInterval(callTimerRef.current)
          setPhase("hacker")
          return d
        }
        return d + 1
      })
    }, 1000)
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current) }
  }, [phase])

  /* ─── HACKER LOGIC ─────────────────────────── */
  useEffect(() => {
    if (phase !== "hacker") return
    const t = setTimeout(() => { setMatrixFading(true); setTimeout(() => setShowMatrix(false), 1500) }, 2000)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (phase !== "hacker" || showMatrix || hackerIdx >= HACKER_LINES.length) return
    const delay = hackerIdx === HACKER_LINES.length - 1 ? 1500 : 80 + Math.random() * 120
    const t = setTimeout(() => {
      setHackerLines((p) => [...p, HACKER_LINES[hackerIdx]])
      setHackerIdx((i) => i + 1)
    }, delay)
    return () => clearTimeout(t)
  }, [phase, showMatrix, hackerIdx])

  useEffect(() => {
    if (hackerScrollRef.current) hackerScrollRef.current.scrollTop = hackerScrollRef.current.scrollHeight
  }, [hackerLines])

  useEffect(() => {
    if (phase === "hacker" && hackerIdx >= HACKER_LINES.length) {
      const t = setTimeout(() => {
        window.location.href = "/spotify/auto-chuva"
      }, 1500)
      return () => clearTimeout(t)
    }
  }, [phase, hackerIdx])

  /* ─── SPOTIFY LOGIC ────────────────────────── */
  useEffect(() => {
    if (phase !== "spotify" || !isPlaying) return
    const interval = setInterval(() => {
      setSpotifyElapsed((p) => {
        if (p >= 10) {
          setPhase("phone-home")
          setTimeout(() => setShowNotification(true), 2000)
          return p
        }
        return p + 1
      })
      setSpotifyProgress((p) => Math.min(p + (100 / 204), 100))
    }, 1000)
    return () => clearInterval(interval)
  }, [phase, isPlaying])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = spotifyVolume / 100
  }, [spotifyVolume])

  /* ─── WHATSAPP GROUP LOGIC ─────────────────── */
  const addBotMessages = useCallback((msgs: Msg[], onDone?: () => void) => {
    let i = 0
    const add = () => {
      if (i >= msgs.length) { onDone?.(); return }
      if (i > 0) setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        setGroupMessages((p) => [...p, { ...msgs[i], id: Date.now() + i }])
        i++
        if (i < msgs.length) setTimeout(add, 1200 + Math.random() * 800)
        else onDone?.()
      }, 600 + Math.random() * 400)
    }
    add()
  }, [])

  // Initial group script
  useEffect(() => {
    if (phase !== "whatsapp-group" || groupScriptSent.current) return
    groupScriptSent.current = true
    const script: Msg[] = [
      { id: 1, text: "Voce foi adicionado ao grupo", sender: "system", time: currentTime, isSystem: true },
      { id: 2, text: "EAEEE CHEGOU O CONVIDADO!", sender: "D-Bee", time: currentTime },
      { id: 3, text: "BEM VINDO A CIDADE MANO", sender: "Nizzy", time: currentTime },
      { id: 4, text: "ALOHA! JA TAVA TE ESPERANDO", sender: "Alohan", time: currentTime },
      { id: 5, text: "MANDA UMA MENSAGEM AI PRA GENTE TE CONHECER", sender: "D-Bee", time: currentTime },
    ]
    addBotMessages(script)
  }, [phase, addBotMessages, currentTime])

  // Post-confirmation return to group
  useEffect(() => {
    if (phase !== "post-confirm-group" || postConfirmScriptSent.current) return
    postConfirmScriptSent.current = true
    setGroupMessages([])
    setGroupInteractions(0)

    if (confirmationsDone === 1) {
      addBotMessages([
        { id: 1, text: "VOLTOUUU!", sender: "D-Bee", time: currentTime },
        { id: 2, text: "E AI COMO FOI LA?", sender: "Nizzy", time: currentTime },
        { id: 3, text: "SABIA QUE IA CONSEGUIR IRMAO", sender: "Alohan", time: currentTime },
        { id: 4, text: "MANDA MAIS UMA AI", sender: "D-Bee", time: currentTime },
      ], () => { setPhase("whatsapp-group") })
    } else if (confirmationsDone === 2) {
      addBotMessages([
        { id: 1, text: "OLHA ISSOO PASSOUUU!", sender: "D-Bee", time: currentTime },
        { id: 2, text: "MAIS UMA PERGUNTA E TU TA DENTRO", sender: "Nizzy", time: currentTime },
        { id: 3, text: "FALTA POUQUINHO MANO", sender: "Alohan", time: currentTime },
      ], () => { setPhase("whatsapp-group") })
    } else if (confirmationsDone >= 3) {
      addBotMessages([
        { id: 1, text: "MANO TU PASSOU EM TUDO!", sender: "D-Bee", time: currentTime },
        { id: 2, text: "AGORA VOCE E UM DE NOS", sender: "Nizzy", time: currentTime },
        { id: 3, text: "PRONTO PRA PROXIMA FASE", sender: "Alohan", time: currentTime },
        { id: 4, text: "LU2CA entrou no grupo", sender: "system", time: currentTime, isSystem: true },
        { id: 5, text: "EAEEE MANO! BOA SORTE NA JORNADA", sender: "D-Bee", time: currentTime },
        { id: 6, text: "VAMO ENTRAR EM CONTATO COM VOCE EM BREVE", sender: "Nizzy", time: currentTime },
        { id: 7, text: "ATE A PROXIMA! ALOHA!", sender: "Alohan", time: currentTime },
      ], () => {
        setTimeout(() => setPhase("final-notifications"), 2000)
      })
    }
  }, [phase, confirmationsDone, addBotMessages, currentTime])

  // Scroll to bottom on messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [groupMessages, isTyping])

  // Track interactions to show confirmation button
  const neededInteractions = confirmationsDone === 0 ? 3 : confirmationsDone === 1 ? 2 : 1

  useEffect(() => {
    if (phase === "whatsapp-group" && groupInteractions >= neededInteractions && confirmationsDone < 3) {
      const t = setTimeout(() => setShowConfirmBtn(true), 1500)
      return () => clearTimeout(t)
    }
  }, [phase, groupInteractions, neededInteractions, confirmationsDone])

  const handleGroupSend = () => {
    if (!inputValue.trim()) return
    const userMsg: Msg = { id: Date.now(), text: inputValue, sender: "Voce", time: currentTime }
    setGroupMessages((p) => [...p, userMsg])
    setInputValue("")
    setGroupInteractions((p) => p + 1)

    // Bot response
    const responses = [
      ["KKKKK BOA MANO", "MANDA MAIS AI", "CONTA MAIS"],
      ["SHOW DE BOLA", "E NOIS POW", "ISSO AI"],
      ["CURTI ISSO", "MASSA DEMAIS", "TU E DAHORA"],
      ["HAHAHA", "CERTEZA", "VALEU MANO"],
      ["SIMMM", "TOTAL", "SAC0U"],
    ]
    const group = responses[Math.floor(Math.random() * responses.length)]
    const responders = ["D-Bee", "Nizzy", "Alohan"]
    const picked = responders[Math.floor(Math.random() * responders.length)]

    setTimeout(() => {
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        setGroupMessages((p) => [...p, { id: Date.now() + 1, text: group[Math.floor(Math.random() * group.length)], sender: picked, time: currentTime }])
      }, 600 + Math.random() * 400)
    }, 800)
  }

  const handleConfirmation = () => {
    setShowConfirmBtn(false)
    if (confirmationsDone === 0) setPhase("confirmation-1")
    else if (confirmationsDone === 1) setPhase("confirmation-2")
    else if (confirmationsDone === 2) setPhase("confirmation-3")
  }

  /* ─── CONFIRMATION 1 ───────────────────────── */
  const handleC1Answer = (idx: number) => {
    if (c1Animating) return
    setC1Animating(true)
    const answers = [...c1Answers, idx]
    setC1Answers(answers)
    setTimeout(() => {
      if (c1Question < ARCHETYPE_QUESTIONS.length - 1) {
        setC1Question((q) => q + 1)
        setC1Animating(false)
      } else {
        const archIdx = answers[0] * 16 + answers[1] * 4 + answers[2]
        setC1Result(ARCHETYPES[archIdx])
        setTimeout(() => {
          setConfirmationsDone(1)
          postConfirmScriptSent.current = false
          setPhase("post-confirm-group")
        }, 3000)
      }
    }, 300)
  }

  /* ─── CONFIRMATION 2 ───────────────────────── */
  const handleTrackSelect = (trackId: number) => setSelectedTrack(trackId)

  const handleEmotionConnect = (emotionId: number) => {
    if (selectedTrack === null) return
    const newConn = { ...connections, [selectedTrack]: emotionId }
    setConnections(newConn)
    setSelectedTrack(null)
    if (Object.keys(newConn).length === 5) {
      setTimeout(() => {
        setConfirmationsDone(2)
        postConfirmScriptSent.current = false
        setPhase("post-confirm-group")
      }, 1500)
    }
  }

  /* ─── CONFIRMATION 3 ───────────────────────── */
  const handleC3Select = (trackId: number) => {
    const track = TRACKS.find((t) => t.id === trackId)
    if (!track) return
    setC3SelectedTrack(trackId)
    const pwd = track.full
    setC3Password(pwd)
    let i = 0
    const interval = setInterval(() => {
      i++
      setC3Revealed(i)
      if (i >= pwd.length) clearInterval(interval)
    }, 100)
  }

  const handleC3Complete = () => {
    setConfirmationsDone(3)
    postConfirmScriptSent.current = false
    setPhase("post-confirm-group")
  }

  /* ─── NOTIFICATIONS BASED ON CONFIRM COUNT ── */
  useEffect(() => {
    if (phase !== "phone-home") return
    const cc = gameFunnelState.confirmationCount
    // After confirm 1 (returning from WhatsApp -> TikTok -> confirm 1/3), show YouTube notif
    if (cc === 2 && !showYouTubeNotif && !showNotification) {
      const t = setTimeout(() => {
        setShowYouTubeNotif(true)
        setAppBadges(p => ({ ...p, youtube: true }))
      }, 1500)
      return () => clearTimeout(t)
    }
    // After all 3 confirms done, show all badges
    if (cc >= 3) {
      setAppBadges({ youtube: true, instagram: true, tiktok: true, untitled: true, whatsapp: true, spotify: true })
    }
  }, [phase, gameFunnelState.confirmationCount, showYouTubeNotif, showNotification])

  /* ─── FINAL NOTIFICATIONS ──────────────────── */
  useEffect(() => {
    if (phase !== "final-notifications") return
    const notifs = [
      { app: "youtube", text: "CIDADE NEON (FILME OFICIAL)" },
      { app: "instagram", text: "@LU2CA.MP3 POSTOU UM NOVO REEL" },
      { app: "tiktok", text: "LU2CA POSTOU 5 NOVOS VIDEOS" },
      { app: "untitled", text: "ALBUM CIDADE NEON" },
    ]
    let i = 0
    const show = () => {
      if (i >= notifs.length) {
        setTimeout(() => {
          setAppBadges({ youtube: true, instagram: true, tiktok: true, untitled: true, whatsapp: true, spotify: true })
          setPhase("phone-home")
        }, 2000)
        return
      }
      setTimeout(() => {
        setFinalNotifs((p) => [...p, notifs[i]])
        i++
        show()
      }, 1200)
    }
    show()
  }, [phase])

  /* ─── ICON RENDERER ────────────────────────── */
  const renderAppIcon = (icon: string, color: string) => {
    const iconMap: Record<string, ReactElement> = {
      aura: <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="aur" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stopColor="#a78bfa" /><stop offset="50%" stopColor="#67e8f9" /><stop offset="100%" stopColor="#a78bfa" /></linearGradient></defs><circle cx="12" cy="12" r="10" stroke="url(#aur)" strokeWidth="1.5" fill="none" /><text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">A</text></svg>,
      untitled: <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" fill="currentColor"/><circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.5"/></svg>,
      phone: <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>,
      safari: <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" /></svg>,
      whatsapp: <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>,
      instagram: <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>,
      youtube: <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>,
      tiktok: <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" /></svg>,
      spotify: <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" /></svg>,
      notes: <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>,
      photos: <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" /></svg>,
      music: <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>,
    }
    return (
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center relative" style={{ backgroundColor: color }}>
        {iconMap[icon] || <div className="w-8 h-8 bg-white/20 rounded" />}
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════ */
  /* ─── RENDER: INCOMING CALL ──────────────────────── */
  /* ═══════════════════════════════════════════════════ */
  if (phase === "incoming-call") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] bg-gradient-to-b from-[#1C1C1E] to-black flex flex-col animate-vibrate relative" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
          {/* iPhone Notch - floating pill */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />
          <div className="h-[50px] flex-shrink-0" />
          <div className="flex-1 flex flex-col items-center justify-start pt-6">
            <div className="relative">
              <div className="w-[120px] h-[120px] rounded-full overflow-hidden mb-4 animate-pulse-slow ring-4 ring-white/20">
                <Image src="/images/avatar-dbee.jpg" alt="D-Bee" width={120} height={120} className="w-full h-full object-cover" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping-slow" />
            </div>
            <h1 className="text-white text-[32px] font-semibold mb-1">D-Bee</h1>
            <p className="text-[#A0A0A0] text-[18px]">mobile</p>
            <p className="text-[#A0A0A0] text-[16px] mt-2">Chamada recebida...</p>
          </div>
          <div className="px-8 pb-12">
            <div className="flex justify-center gap-12 mb-8">
              <button type="button" className="flex flex-col items-center gap-2"><div className="w-16 h-16 rounded-full bg-[#48484A] flex items-center justify-center"><svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 9.5c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5-2.5-1.12-2.5-2.5 1.12-2.5 2.5-2.5m0-2c-2.48 0-4.5 2.02-4.5 4.5s2.02 4.5 4.5 4.5 4.5-2.02 4.5-4.5-2.02-4.5-4.5-4.5z" /></svg></div><span className="text-white text-xs">Lembrar</span></button>
              <button type="button" className="flex flex-col items-center gap-2"><div className="w-16 h-16 rounded-full bg-[#48484A] flex items-center justify-center"><svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg></div><span className="text-white text-xs">Mensagem</span></button>
            </div>
            <div className="flex justify-center gap-16">
              <button type="button" onClick={() => setTimeout(() => setPhase("incoming-call"), 800)} className="flex flex-col items-center gap-2"><div className="w-[72px] h-[72px] rounded-full bg-[#FF3B30] flex items-center justify-center active:scale-95 transition-transform"><svg className="w-8 h-8 text-white rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg></div><span className="text-white text-xs">Recusar</span></button>
              <button type="button" onClick={() => setPhase("active-call")} className="flex flex-col items-center gap-2"><div className="w-[72px] h-[72px] rounded-full bg-[#34C759] flex items-center justify-center active:scale-95 transition-transform"><svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg></div><span className="text-white text-xs">Aceitar</span></button>
            </div>
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2"><div className="w-32 h-1 bg-white/30 rounded-full" /></div>
        </div>
        <style jsx>{`
          @keyframes vibrate { 0%,100%{transform:translateX(0)} 10%,30%,50%,70%,90%{transform:translateX(-2px)} 20%,40%,60%,80%{transform:translateX(2px)} }
          @keyframes pulse-slow { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.8;transform:scale(1.02)} }
          @keyframes ping-slow { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(1.5);opacity:0} }
          .animate-vibrate{animation:vibrate .3s linear infinite}
          .animate-pulse-slow{animation:pulse-slow 2s ease-in-out infinite}
          .animate-ping-slow{animation:ping-slow 2s ease-out infinite}
        `}</style>
      </div>
    )
  }

  /* ─── RENDER: ACTIVE CALL ────────────────────────── */
  if (phase === "active-call") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] bg-gradient-to-b from-[#1C1C1E] to-black flex flex-col relative" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
          {/* iPhone Notch - floating pill */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />
          <div className="h-[50px] flex-shrink-0" />
          <div className="flex-1 flex flex-col items-center justify-start pt-6">
            <div className="w-[120px] h-[120px] rounded-full overflow-hidden mb-4">
              <Image src="/images/avatar-dbee.jpg" alt="D-Bee" width={120} height={120} className="w-full h-full object-cover" />
            </div>
            <h1 className="text-white text-[32px] font-semibold mb-1">D-Bee</h1>
            <p className="text-[#34C759] text-[18px] font-medium tabular-nums">{formatTime(callDuration)}</p>
          </div>
          <div className="px-8 pb-8">
            <div className="flex justify-center gap-8 mb-8">
              <button type="button" onClick={() => setIsMuted(!isMuted)} className="flex flex-col items-center gap-2"><div className={`w-16 h-16 rounded-full flex items-center justify-center ${isMuted ? "bg-white" : "bg-[#48484A]"}`}><svg className={`w-7 h-7 ${isMuted ? "text-black" : "text-white"}`} fill="currentColor" viewBox="0 0 24 24"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" /></svg></div><span className="text-white text-xs">Mudo</span></button>
              <button type="button" className="flex flex-col items-center gap-2"><div className="w-16 h-16 rounded-full bg-[#48484A] flex items-center justify-center"><svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 19c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM6 1c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12-8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-6 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg></div><span className="text-white text-xs">Teclado</span></button>
              <button type="button" onClick={() => setIsSpeakerOn(!isSpeakerOn)} className="flex flex-col items-center gap-2"><div className={`w-16 h-16 rounded-full flex items-center justify-center ${isSpeakerOn ? "bg-white" : "bg-[#48484A]"}`}><svg className={`w-7 h-7 ${isSpeakerOn ? "text-black" : "text-white"}`} fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg></div><span className="text-white text-xs">Audio</span></button>
            </div>
            <div className="flex justify-center">
              <button type="button" onClick={() => setPhase("hacker")} className="w-[72px] h-[72px] rounded-full bg-[#FF3B30] flex items-center justify-center active:scale-95 transition-transform"><svg className="w-8 h-8 text-white rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg></button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ─── RENDER: HACKER ─────────────────────────────── */
  if (phase === "hacker") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono">
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] bg-black flex flex-col relative overflow-hidden">
          {/* Scanlines */}
          <div className="absolute inset-0 pointer-events-none z-10" style={{ background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.3) 2px,rgba(0,0,0,.3) 4px)" }} />
          <div className="absolute inset-0 pointer-events-none z-10" style={{ boxShadow: "inset 0 0 100px rgba(0,255,102,.1)" }} />
          {/* Matrix rain background */}
          {showMatrix && (
            <div className={`absolute inset-0 z-0 transition-opacity duration-1500 ${matrixFading ? "opacity-0" : "opacity-100"}`}>
              <MatrixRain />
            </div>
          )}
          {/* iPhone Notch - sits on top, content flows behind it on sides */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" style={{ boxShadow: "0 0 0 1px rgba(0,255,102,0.1)" }} />
          {!showMatrix && (
            <div ref={hackerScrollRef} className="flex-1 flex flex-col justify-end px-4 pb-6 pt-[40px] overflow-y-auto relative z-20">
              {hackerLines.map((line, i) => (
                <div key={i} className="mb-2">
                  <HackerLine text={line} delay={i * 50} isFinal={line === "ACESSO GARANTIDO"} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ─── RENDER: SPOTIFY ────────────────────────────── */
  if (phase === "spotify") {
    return (
      <div className={`min-h-screen bg-[#121212] flex items-center justify-center ${isGlitching ? "animate-glitch" : ""}`}>
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] bg-gradient-to-b from-[#2A1F4E] via-[#1A1030] to-[#121212] flex flex-col">
          {/* iPhone Notch */}
          <div className="relative z-20 h-[54px] flex items-center justify-center flex-shrink-0">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[126px] h-[34px] bg-black rounded-b-[18px]" />
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <button type="button" className="p-2"><svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg></button>
            <span className="text-white text-sm font-medium uppercase tracking-widest">TOCANDO DA PLAYLIST</span>
            <button type="button" className="p-2"><svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg></button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-8">
            <div className="w-[280px] h-[280px] rounded-lg overflow-hidden shadow-2xl mb-8">
              <Image src="/images/album-cover.jpg" alt="Cidade Neon" width={280} height={280} className="w-full h-full object-cover" />
            </div>
            <div className="w-full flex items-center justify-between mb-4">
              <div><h2 className="text-white text-xl font-bold">CHUVA</h2><p className="text-[#B3B3B3] text-sm">LU2CA</p></div>
              <button type="button" className="p-2"><svg className="w-6 h-6 text-[#1DB954]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg></button>
            </div>
            <div className="w-full mb-4">
              <div className="h-1 bg-[#4D4D4D] rounded-full overflow-hidden"><div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${spotifyProgress}%` }} /></div>
              <div className="flex justify-between mt-2 text-[#B3B3B3] text-xs"><span>{formatTime(spotifyElapsed)}</span><span>3:24</span></div>
            </div>
            <div className="w-full flex items-center justify-between px-4">
              <button type="button" className="p-2 text-white"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" /></svg></button>
              <button type="button" className="p-2 text-white"><svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg></button>
              <button type="button" onClick={() => setIsPlaying(!isPlaying)} className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                {isPlaying
                  ? <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                  : <svg className="w-8 h-8 text-black ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
              </button>
              <button type="button" className="p-2 text-white"><svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg></button>
              <button type="button" className="p-2 text-white"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" /></svg></button>
            </div>
            {/* Volume slider */}
            <div className="w-full mt-6 px-4">
              <button type="button" onClick={() => setShowVolume(!showVolume)} className="text-[#B3B3B3] text-xs mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" /></svg>
                Volume
              </button>
              {showVolume && (
                <input type="range" min="0" max="100" value={spotifyVolume} onChange={(e) => setSpotifyVolume(Number(e.target.value))} className="w-full h-1 bg-[#4D4D4D] rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white" />
              )}
            </div>
          </div>
          <audio ref={audioRef} src="/images/chuva-20final-20-28video.mp4" />
        </div>
      </div>
    )
  }

  /* ─── RENDER: WHATSAPP GROUP ─────────────────────── */
  if (phase === "whatsapp-group" || phase === "post-confirm-group") {
    return (
      <div className="min-h-screen bg-[#0B141A] flex items-center justify-center">
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 80 80\"%3E%3Cpath fill=\"%23182229\" d=\"M0 0h80v80H0z\"/%3E%3C/svg%3E')" }}>
          {/* iPhone Notch */}
          <div className="relative z-20 h-[54px] flex items-center justify-center flex-shrink-0 bg-[#1F2C34]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[126px] h-[34px] bg-black rounded-b-[18px]" />
          </div>
          <div className="bg-[#1F2C34] px-2 py-2 flex items-center gap-2">
            <button type="button" onClick={() => setPhase("phone-home")} className="p-2 text-[#AEBAC1]"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg></button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6B7FD7] to-[#4ECDC4] flex items-center justify-center"><svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg></div>
            <div className="flex-1"><p className="text-white font-medium">CIDADE NEON</p><p className="text-[#8696A0] text-xs">D-Bee, Nizzy, Alohan</p></div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {groupMessages.map((msg) => (
              <div key={msg.id} className={`mb-2 ${msg.isSystem ? "flex justify-center" : msg.sender === "Voce" ? "flex justify-end" : "flex justify-start"}`}>
                {msg.isSystem ? (
                  <div className="bg-[#182229] rounded-lg px-3 py-1"><p className="text-[#8696A0] text-xs text-center">{msg.text}</p></div>
                ) : (
                  <div className={`rounded-lg px-3 py-2 max-w-[80%] ${msg.sender === "Voce" ? "bg-[#005C4B]" : "bg-[#202C33]"}`}>
                    {msg.sender !== "Voce" && <p className="text-xs font-medium mb-1" style={{ color: participants[msg.sender as keyof typeof participants]?.color || "#aaa" }}>{msg.sender}</p>}
                    <p className="text-[#E9EDEF] text-sm">{msg.text}</p>
                    <span className="text-[#8696A0] text-[10px] float-right mt-1">{msg.time}</span>
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="mb-2 flex justify-start"><div className="bg-[#202C33] rounded-lg px-4 py-3"><div className="flex gap-1"><div className="w-2 h-2 bg-[#8696A0] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} /><div className="w-2 h-2 bg-[#8696A0] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} /><div className="w-2 h-2 bg-[#8696A0] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} /></div></div></div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {/* Confirmation button - positioned ABOVE input */}
          {showConfirmBtn && confirmationsDone < 3 && (
            <div className="px-4 pb-2">
              <button type="button" onClick={handleConfirmation} className="w-full bg-gradient-to-r from-[#6B7FD7] to-[#4ECDC4] text-white font-bold py-3 rounded-xl text-sm active:scale-98 transition-transform">
                CONFIRMACAO {confirmationsDone + 1}/3
              </button>
            </div>
          )}
          <div className="bg-[#1F2C34] p-2 flex items-center gap-2">
            <div className="flex-1 bg-[#2A3942] rounded-full px-4 py-2">
              <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleGroupSend()} placeholder="Mensagem" className="w-full bg-transparent text-white text-sm outline-none placeholder-[#8696A0]" />
            </div>
            <button type="button" onClick={handleGroupSend} className="w-10 h-10 bg-[#00A884] rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#111B21]" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ─── RENDER: CONFIRMATION 1 - ARCHETYPES ────────��─ */
  if (phase === "confirmation-1") {
    if (c1Result) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col items-center justify-center p-8 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-[#2D1B69]/20 via-black to-[#0E7490]/20" />
            {/* iPhone Notch */}
            <div className="absolute top-0 left-0 right-0 z-20 h-[54px] flex items-center justify-center">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[126px] h-[34px] bg-black rounded-b-[18px]" />
            </div>
            <div className="relative z-10 text-center">
              <p className="text-[#A78BFA] text-sm uppercase tracking-widest mb-4">SEU ARQUETIPO</p>
              <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] flex items-center justify-center shadow-lg shadow-[#7C3AED]/50">
                <div className="w-28 h-28 rounded-full bg-black flex items-center justify-center"><svg className="w-12 h-12 text-[#A78BFA]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg></div>
              </div>
              <h1 className="text-white text-2xl font-bold mb-2 text-balance">{c1Result}</h1>
              <p className="text-white/60 text-sm mb-8">A CIDADE NEON TE RECONHECE.</p>
              <p className="text-[#A78BFA] text-xs">RETORNANDO AO GRUPO...</p>
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col p-6 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f23]" />
          {/* iPhone Notch */}
          <div className="absolute top-0 left-0 right-0 z-20 h-[54px] flex items-center justify-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[126px] h-[34px] bg-black rounded-b-[18px]" />
          </div>
          <div className="relative z-10 pt-8 mb-8">
            <div className="flex gap-2 mb-2">{ARCHETYPE_QUESTIONS.map((_, i) => (<div key={i} className={`flex-1 h-1 rounded-full transition-all duration-300 ${i < c1Question ? "bg-[#A78BFA]" : i === c1Question ? "bg-[#A78BFA]/50" : "bg-white/10"}`} />))}</div>
            <p className="text-white/40 text-xs text-center">CONFIRMACAO 1/3 - PERGUNTA {c1Question + 1}/{ARCHETYPE_QUESTIONS.length}</p>
          </div>
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
            <div className={`text-center transition-all duration-300 ${c1Animating ? "opacity-0 translate-y-4" : "opacity-100"}`}>
              <h1 className="text-white text-xl font-medium mb-8 text-balance px-4">{ARCHETYPE_QUESTIONS[c1Question].question}</h1>
              <div className="space-y-3 px-4">{ARCHETYPE_QUESTIONS[c1Question].options.map((opt, i) => (
                <button key={opt} type="button" onClick={() => handleC1Answer(i)} disabled={c1Animating} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#A78BFA]/50 text-white py-4 px-6 rounded-xl text-left transition-all">
                  <span className="text-[#A78BFA] mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
                </button>
              ))}</div>
            </div>
          </div>
          <div className="relative z-10 pb-8"><p className="text-white/30 text-xs text-center">TODAS AS RESPOSTAS SAO VALIDAS</p></div>
        </div>
      </div>
    )
  }

  /* ─── RENDER: CONFIRMATION 2 - COLUMNS ───────────── */
  if (phase === "confirmation-2") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col relative">
          <div className="absolute inset-0" style={{ background: selectedTrack !== null ? `linear-gradient(180deg,${TRACKS[selectedTrack - 1]?.color}20 0%,#000 50%)` : "linear-gradient(180deg,#1a1a2e 0%,#0f0f23 100%)" }} />
          {/* iPhone Notch */}
          <div className="absolute top-0 left-0 right-0 z-20 h-[54px] flex items-center justify-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[126px] h-[34px] bg-black rounded-b-[18px]" />
          </div>
          <div className="relative z-10 pt-8 px-6 mb-4">
            <p className="text-white/40 text-xs text-center mb-2">CONFIRMACAO 2/3</p>
            <h1 className="text-white text-xl font-bold text-center mb-2">CONECTE MUSICA E EMOCAO</h1>
            <p className="text-white/60 text-sm text-center">CONEXOES: {Object.keys(connections).length}/5</p>
          </div>
          <div className="relative z-10 flex-1 flex gap-4 px-4 pb-6 overflow-hidden">
            <div className="flex-1 flex flex-col">
              <p className="text-white/40 text-xs mb-3 text-center">FAIXAS</p>
              <div className="space-y-2">{TRACKS.map((t) => {
                const connected = t.id in connections
                const selected = selectedTrack === t.id
                return <button key={t.id} type="button" onClick={() => handleTrackSelect(t.id)} disabled={connected} className={`w-full py-3 px-3 rounded-xl text-left text-sm transition-all ${connected ? "opacity-30" : selected ? "ring-2 bg-white/10" : "bg-white/5 hover:bg-white/10"}`} style={{ color: selected ? t.color : "#fff" }}><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} /><span className="font-medium truncate">{t.masked}</span></div></button>
              })}</div>
            </div>
            <div className="flex-1 flex flex-col">
              <p className="text-white/40 text-xs mb-3 text-center">EMOCOES</p>
              <div className="space-y-2">{EMOTIONS.map((e) => {
                const used = Object.values(connections).includes(e.id)
                return <button key={e.id} type="button" onClick={() => handleEmotionConnect(e.id)} disabled={selectedTrack === null || used} className={`w-full py-3 px-3 rounded-xl text-left text-sm transition-all ${used ? "opacity-30" : selectedTrack !== null ? "bg-white/5 hover:bg-white/10" : "bg-white/5 opacity-50"}`} style={{ color: e.color }}>{e.label}</button>
              })}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ─── RENDER: CONFIRMATION 3 - UNLOCK ────────────── */
  if (phase === "confirmation-3") {
    if (c3SelectedTrack !== null && c3Password) {
      const t = TRACKS.find((x) => x.id === c3SelectedTrack)
      return (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col items-center justify-center p-8 relative">
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg,${t?.color}20 0%,#000 50%)` }} />
            {/* iPhone Notch */}
            <div className="absolute top-0 left-0 right-0 z-20 h-[54px] flex items-center justify-center">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[126px] h-[34px] bg-black rounded-b-[18px]" />
            </div>
            <div className="relative z-10 text-center">
              <p className="text-white/40 text-xs mb-4">CONFIRMACAO 3/3</p>
              <h1 className="text-3xl font-bold mb-2" style={{ color: t?.color, textShadow: `0 0 20px ${t?.color}50` }}>FAIXA DESBLOQUEADA</h1>
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-8 w-full max-w-[280px] mx-auto">
                <p className="text-white/40 text-xs text-center mb-3">SUA SENHA</p>
                <div className="flex justify-center gap-1 font-mono text-2xl">{c3Password.split("").map((ch, i) => (
                  <span key={i} className={`transition-all duration-200 ${i < c3Revealed ? "opacity-100" : "opacity-0"}`} style={{ color: t?.color }}>{ch}</span>
                ))}</div>
              </div>
              <button type="button" onClick={handleC3Complete} className="w-full max-w-[280px] mx-auto bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white font-bold py-4 rounded-xl">CONCLUIR</button>
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col p-6 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f23]" />
          {/* iPhone Notch */}
          <div className="absolute top-0 left-0 right-0 z-20 h-[54px] flex items-center justify-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[126px] h-[34px] bg-black rounded-b-[18px]" />
          </div>
          <div className="relative z-10 pt-8 mb-8 text-center">
            <p className="text-white/40 text-xs mb-2">CONFIRMACAO 3/3</p>
            <h1 className="text-white text-xl font-bold mb-2">ESCOLHA UMA FAIXA PARA DESBLOQUEAR</h1>
            <p className="text-white/60 text-sm">A SENHA E O NOME DA MUSICA</p>
          </div>
          <div className="relative z-10 flex-1 space-y-3">{TRACKS.map((t) => (
            <button key={t.id} type="button" onClick={() => handleC3Select(t.id)} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-4 text-left transition-all group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${t.color}20` }}>
                    <svg className="w-5 h-5" style={{ color: t.color }} fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" /></svg>
                  </div>
                  <div><p className="text-white/50 text-xs font-mono mb-0.5">{t.masked}</p></div>
                </div>
                <svg className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M10 17l5-5-5-5v10z" /></svg>
              </div>
            </button>
          ))}</div>
        </div>
      </div>
    )
  }

  /* ─── RENDER: FINAL NOTIFICATIONS ────────────────── */
  if (phase === "final-notifications") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col items-center justify-center p-8 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-black to-[#0f0f23]" />
          {/* iPhone Notch */}
          <div className="absolute top-0 left-0 right-0 z-20 h-[54px] flex items-center justify-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[126px] h-[34px] bg-black rounded-b-[18px]" />
          </div>
          <div className="relative z-10 w-full space-y-3">
            {finalNotifs.map((n, i) => (
              <div key={i} className="bg-white/95 backdrop-blur-lg rounded-2xl p-3 flex items-center gap-3 shadow-lg animate-notif-slide">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: phoneApps.find((a) => a.id === n.app)?.color }}>
                  {renderAppIcon(n.app, "transparent")}
                </div>
                <div className="flex-1 text-left"><p className="text-black font-semibold text-sm">{n.app === "youtube" ? "YouTube" : n.app === "instagram" ? "Instagram" : n.app === "tiktok" ? "TikTok" : "[UNTITLED]"}</p><p className="text-gray-600 text-xs">{n.text}</p></div>
                <span className="text-gray-400 text-xs">agora</span>
              </div>
            ))}
          </div>
        </div>
        <style jsx>{`
          @keyframes notif-slide { from{transform:translateY(-20px);opacity:0} to{transform:translateY(0);opacity:1} }
          .animate-notif-slide{animation:notif-slide .3s ease-out}
        `}</style>
      </div>
    )
  }

  /* ─── RENDER: AURA LOGIN ─────────────────────────── */
  if (phase === "aura-login") {
    return (
      <div className="min-h-screen flex items-center justify-center overflow-hidden" style={{ background: "linear-gradient(135deg,#f8fafc 0%,#e0e7ff 30%,#f0fdfa 60%,#fdf2f8 100%)" }}>
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col items-center justify-center p-8 relative">
          {/* iPhone Notch */}
          <div className="absolute top-0 left-0 right-0 z-20 h-[54px] flex items-center justify-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[126px] h-[34px] bg-black rounded-b-[18px]" />
          </div>
          {/* Aurora shimmer */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-aurora-spin" style={{ background: "conic-gradient(from 0deg,transparent 0%,rgba(167,139,250,.1) 25%,transparent 50%,rgba(103,232,249,.1) 75%,transparent 100%)" }} />
          </div>
          <div className="relative z-10 w-full max-w-[320px]">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-[#1e1b4b] tracking-widest mb-2">AURA</h1>
              <div className="w-20 h-[2px] mx-auto bg-gradient-to-r from-[#a78bfa] via-[#67e8f9] to-[#a78bfa]" />
            </div>
            <div className="flex gap-4 mb-6">{(["signin", "signup"] as const).map((tab) => (
              <button key={tab} type="button" onClick={() => setAuraTab(tab)} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${auraTab === tab ? "bg-[#1e1b4b] text-white" : "bg-white/50 text-[#1e1b4b]/60"}`}>{tab === "signin" ? "ENTRAR" : "CRIAR CONTA"}</button>
            ))}</div>
            <div className="space-y-4">
              <div><label className="text-[#1e1b4b]/60 text-xs uppercase tracking-widest block mb-1" htmlFor="aura-email">{auraTab === "signin" ? "USUARIO OU EMAIL" : "EMAIL"}</label><input id="aura-email" type="email" value={auraEmail} onChange={(e) => setAuraEmail(e.target.value)} placeholder={auraTab === "signin" ? "seu@email.com" : "seu@email.com"} className="w-full bg-white/60 backdrop-blur border border-[#a78bfa]/20 rounded-xl px-4 py-3 text-[#1e1b4b] text-sm outline-none focus:border-[#a78bfa]/50 placeholder-[#1e1b4b]/30" /></div>
              {auraTab === "signup" && <div><label className="text-[#1e1b4b]/60 text-xs uppercase tracking-widest block mb-1" htmlFor="aura-user">NOME DE USUARIO</label><input id="aura-user" type="text" placeholder="@seu_nome" className="w-full bg-white/60 backdrop-blur border border-[#a78bfa]/20 rounded-xl px-4 py-3 text-[#1e1b4b] text-sm outline-none focus:border-[#a78bfa]/50 placeholder-[#1e1b4b]/30" /></div>}
              <div><label className="text-[#1e1b4b]/60 text-xs uppercase tracking-widest block mb-1" htmlFor="aura-pass">SENHA</label><input id="aura-pass" type="password" value={auraPass} onChange={(e) => setAuraPass(e.target.value)} placeholder="********" className="w-full bg-white/60 backdrop-blur border border-[#a78bfa]/20 rounded-xl px-4 py-3 text-[#1e1b4b] text-sm outline-none focus:border-[#a78bfa]/50 placeholder-[#1e1b4b]/30" /></div>
              {auraTab === "signup" && <div><label className="text-[#1e1b4b]/60 text-xs uppercase tracking-widest block mb-1" htmlFor="aura-confirm">CONFIRMAR SENHA</label><input id="aura-confirm" type="password" placeholder="********" className="w-full bg-white/60 backdrop-blur border border-[#a78bfa]/20 rounded-xl px-4 py-3 text-[#1e1b4b] text-sm outline-none focus:border-[#a78bfa]/50 placeholder-[#1e1b4b]/30" /></div>}
              <button type="button" className="w-full bg-gradient-to-r from-[#a78bfa] via-[#67e8f9] to-[#a78bfa] text-white font-bold py-3 rounded-xl text-sm tracking-widest active:scale-98 transition-transform">{auraTab === "signin" ? "ENTRAR" : "CRIAR CONTA"}</button>
              {auraTab === "signin" && <p className="text-center text-[#a78bfa] text-xs">ESQUECEU SUA SENHA?</p>}
            </div>
            <button type="button" onClick={() => setPhase("phone-home")} className="mt-8 w-full text-center text-[#1e1b4b]/40 text-xs">VOLTAR</button>
          </div>
        </div>
        <style jsx>{`
          @keyframes aurora-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          .animate-aurora-spin{animation:aurora-spin 20s linear infinite}
        `}</style>
      </div>
    )
  }

  /* ─── RENDER: PHONE HOME ─────────────────────────── */
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f23]" />
        {/* iPhone Notch - Apple style: floating pill, content behind sides */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />
        {/* Status bar area - extends full width behind notch */}
        <div className="relative z-20 h-[50px] flex items-end justify-between px-6 pb-1 text-white text-xs">
          <span className="font-semibold w-12">{currentTime}</span>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-3" fill="white" viewBox="0 0 16 12"><rect x="0" y="6" width="3" height="6" rx="0.5"/><rect x="4.5" y="4" width="3" height="8" rx="0.5"/><rect x="9" y="1" width="3" height="11" rx="0.5"/><rect x="13" y="0" width="3" height="12" rx="0.5" opacity="0.3"/></svg>
            <svg className="w-6 h-3" fill="white" viewBox="0 0 25 12"><rect x="0" y="1" width="22" height="10" rx="2" stroke="white" strokeWidth="1" fill="none"/><rect x="1.5" y="2.5" width="16" height="7" rx="1" fill="white"/><rect x="23" y="4" width="2" height="4" rx="0.5" fill="white" opacity="0.4"/></svg>
          </div>
        </div>
        {/* WhatsApp notification */}
        {showNotification && (
          <button type="button" onClick={() => { setShowNotification(false); window.location.href = "/whatsapp/grupo" }} className="relative z-30 mx-3 mt-1 animate-slide-down w-[calc(100%-1.5rem)]">
            <div className="bg-[#f2f2f7]/95 backdrop-blur-xl rounded-2xl p-3 flex items-center gap-3 shadow-2xl">
              <div className="w-10 h-10 rounded-[10px] bg-[#25D366] flex items-center justify-center flex-shrink-0"><svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg></div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-black font-semibold text-sm">WhatsApp</p>
                  <span className="text-[#8e8e93] text-xs">agora</span>
                </div>
                <p className="text-black font-medium text-xs">Cidade Neon</p>
                <p className="text-[#8e8e93] text-xs truncate">D-Bee: Voce chegou.</p>
              </div>
            </div>
          </button>
        )}
        {/* YouTube notification */}
        {showYouTubeNotif && (
          <button type="button" onClick={() => { setShowYouTubeNotif(false); window.location.href = "/youtube/cidade-neon" }} className="relative z-30 mx-3 mt-1 animate-slide-down w-[calc(100%-1.5rem)]">
            <div className="bg-[#f2f2f7]/95 backdrop-blur-xl rounded-2xl p-3 flex items-center gap-3 shadow-2xl">
              <div className="w-10 h-10 rounded-[10px] bg-[#FF0000] flex items-center justify-center flex-shrink-0"><svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-black font-semibold text-sm">YouTube</p>
                  <span className="text-[#8e8e93] text-xs">agora</span>
                </div>
                <p className="text-[#8e8e93] text-xs">Novo video: LU2CA - Cidade Neon (Filme Oficial)</p>
              </div>
            </div>
          </button>
        )}
        <div className="relative z-10 px-6 pt-8">
          <div className="grid grid-cols-4 gap-4">
            {phoneApps.map((app) => (
              <button key={app.id} onClick={() => {
                if (app.id === "youtube" && appBadges.youtube) { window.location.href = "/youtube/cidade-neon"; return }
                if (app.id === "tiktok") { window.location.href = "/tiktok/final"; return }
                if (app.link) { window.open(app.link, "_blank"); return }
                if (app.id === "whatsapp") { window.location.href = "/whatsapp/grupo"; return }
                if (app.id === "aura") { setPhase("aura-login"); return }
                if (app.id === "spotify") { window.location.href = "/spotify/auto-chuva"; return }
              }} className="flex flex-col items-center gap-1 active:scale-95 transition-transform relative">
                {renderAppIcon(app.icon, app.color)}
                {appBadges[app.id] && <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF3B30] rounded-full border-2 border-[#1a1a2e] flex items-center justify-center"><span className="text-white text-[8px] font-bold">!</span></div>}
                <span className="text-white text-[10px]">{app.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2"><div className="w-32 h-1 bg-white/30 rounded-full" /></div>
      </div>
      <style jsx>{`
        @keyframes slide-down { from{transform:translateY(-100%);opacity:0} to{transform:translateY(0);opacity:1} }
        .animate-slide-down{animation:slide-down .3s ease-out}
      `}</style>
    </div>
  )
}
