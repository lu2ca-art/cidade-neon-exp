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
  | "post-confirm-group"
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

/* (Confirmation constants moved to their respective page files) */

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
  const { state: gameFunnelState, completeConfirmation, resetAll } = useGameFunnel()

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

  /* ── Call ───────���── */
  const [callState, setCallState] = useState<"ringing" | "dismissed" | "callback">("ringing")
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(false)
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const callAudioRef = useRef<HTMLAudioElement | null>(null)

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

  /* ── (Confirmations now handled by separate pages) ── */

  /* ── Phone Home ────────── */
  const [showNotification, setShowNotification] = useState(false)
  const [appBadges, setAppBadges] = useState<Record<string, boolean>>({})
  const [showNotifCenter, setShowNotifCenter] = useState(false)
  const [bannerNotif, setBannerNotif] = useState<{ id: string; app: string; icon: string; color: string; title: string; body: string; action: string; isReward?: boolean } | null>(null)
  const [completedMissions, setCompletedMissions] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    try { return JSON.parse(localStorage.getItem("cn-completed-missions") || "[]") } catch { return [] }
  })
  const [collectedRewards, setCollectedRewards] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    try { return JSON.parse(localStorage.getItem("cn-collected-rewards") || "[]") } catch { return [] }
  })
  const bannerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bannerIndexRef = useRef(0)

  // Persist completed missions
  useEffect(() => {
    try { localStorage.setItem("cn-completed-missions", JSON.stringify(completedMissions)) } catch {}
  }, [completedMissions])
  useEffect(() => {
    try { localStorage.setItem("cn-collected-rewards", JSON.stringify(collectedRewards)) } catch {}
  }, [collectedRewards])

  /* ── (Final notifications now handled by missions system) ── */

  /* ── AURA ────────── */
  const [auraQuizStep, setAuraQuizStep] = useState(0)
  const [auraAnswers, setAuraAnswers] = useState<number[]>(
    gameFunnelState.confirmations.c3.done && gameFunnelState.confirmations.c3.data
      ? (gameFunnelState.confirmations.c3.data as { auraAnswers?: number[] }).auraAnswers || [0, 0, 0, 0, 0]
      : []
  )
  const [auraShowResult, setAuraShowResult] = useState(gameFunnelState.confirmations.c3.done)

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

  /* ─── CALL LOGIC: 19s timer + Upset Girl audio ─── */
  useEffect(() => {
    if (phase !== "active-call") return

    // Play D-Bee audio
    const audio = new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Upset%20Girl%20-%20Piercing%2CBright%2CMetallic_%20%7Bangry%7DAlo%CC%82%2C%20ta%CC%81%20...-AnG5Cp1ZxNz2PKUp8pcpcwCDrOeecu.mp3")
    audio.volume = 0.8
    audio.play().catch(() => {})
    callAudioRef.current = audio

    // 19 second timer
    callTimerRef.current = setInterval(() => {
      setCallDuration((d) => {
        if (d >= 19) {
          if (callTimerRef.current) clearInterval(callTimerRef.current)
          if (callAudioRef.current) { callAudioRef.current.pause(); callAudioRef.current = null }
          setPhase("hacker")
          return d
        }
        return d + 1
      })
    }, 1000)

    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current)
      if (callAudioRef.current) { callAudioRef.current.pause(); callAudioRef.current = null }
    }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

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

  /* ─── SPOTIFY LOGIC ──────────────────���─────── */
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

  // Initial group script - Phase 1: AI invasion verification
  useEffect(() => {
    if (phase !== "whatsapp-group" || groupScriptSent.current) return
    groupScriptSent.current = true
    const script: Msg[] = [
      { id: 1, text: "Voce foi adicionado ao grupo", sender: "system", time: currentTime, isSystem: true },
      { id: 2, text: "eae mano, chegou", sender: "D-Bee", time: currentTime },
      { id: 3, text: "salve! bom te ver aqui", sender: "Nizzy", time: currentTime },
      { id: 4, text: "aloha! finalmente", sender: "Alohan", time: currentTime },
      { id: 5, text: "olha so, a gente tem visto muita invasao de IA's por aqui ultimamente", sender: "D-Bee", time: currentTime },
      { id: 6, text: "entao antes de tudo a gente precisa confirmar que voce e humano de verdade", sender: "Nizzy", time: currentTime },
      { id: 7, text: "manda uma mensagem ai pra gente te conhecer", sender: "Alohan", time: currentTime },
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
      // Phase 2: Talk about cidade neon, no redirect
      addBotMessages([
        { id: 1, text: "eai voltou!", sender: "D-Bee", time: currentTime },
        { id: 2, text: "mano a cidade neon ta cada vez mais viva", sender: "Nizzy", time: currentTime },
        { id: 3, text: "tipo, a gente tava falando aqui sobre como a musica conecta as pessoas nesse lugar", sender: "Alohan", time: currentTime },
        { id: 4, text: "e que nem todo mundo que chega aqui consegue sentir de verdade sabe", sender: "D-Bee", time: currentTime },
        { id: 5, text: "por isso existe o segundo teste. pra gente ver se voce enxerga alem do obvio", sender: "Nizzy", time: currentTime },
      ], () => { setPhase("whatsapp-group") })
    } else if (confirmationsDone === 2) {
      // Phase 3: Final test - prove you can feel
      addBotMessages([
        { id: 1, text: "mano ceeee passouuu", sender: "D-Bee", time: currentTime },
        { id: 2, text: "agora vem o teste final", sender: "Nizzy", time: currentTime },
        { id: 3, text: "a gente precisa ver se voce e capaz de sentir, ou se e so mais uma maquina", sender: "Alohan", time: currentTime },
        { id: 4, text: "ninguem quer se sentir como uma maquina ne", sender: "D-Bee", time: currentTime },
        { id: 5, text: "entao bora ate o final, vale a pena", sender: "Nizzy", time: currentTime },
      ], () => { setPhase("whatsapp-group") })
    } else if (confirmationsDone >= 3) {
      // Final: Thanks, farewell, LU2CA enters
      addBotMessages([
        { id: 1, text: "MANO TU PASSOU EM TUDO", sender: "D-Bee", time: currentTime },
        { id: 2, text: "sabia que ia conseguir", sender: "Nizzy", time: currentTime },
        { id: 3, text: "foi um prazer te ter aqui de verdade", sender: "Alohan", time: currentTime },
        { id: 4, text: "valeu por tudo mano, ate a proxima", sender: "D-Bee", time: currentTime },
        { id: 5, text: "se cuida! a gente se ve na cidade", sender: "Nizzy", time: currentTime },
        { id: 6, text: "aloha! ate logo", sender: "Alohan", time: currentTime },
        { id: 7, text: "LU2CA entrou no grupo", sender: "system", time: currentTime, isSystem: true },
      ], () => {
        setTimeout(() => setPhase("phone-home"), 3000)
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

    // Bot response - relaxed humor, no screaming
    const responses = [
      ["boa mano", "manda mais ai", "conta mais"],
      ["show", "e nois", "isso ai"],
      ["curti isso", "massa demais", "tu e gente boa"],
      ["com certeza", "faz sentido", "valeu mano"],
      ["sim sim", "total", "saquei"],
      ["real", "exato", "concordo"],
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
    if (confirmationsDone === 0) window.location.href = "/confirmacao/1-arquetipos"
    else if (confirmationsDone === 1) window.location.href = "/confirmacao/3-desbloqueio"
    else if (confirmationsDone === 2) { setPhase("aura-login") }
  }

  /* ─── (Old in-page confirmation handlers removed - now separate pages) ── */

  /* ─── MISSIONS PER CONFIRMATION STAGE ────── */
  const [missionsTab, setMissionsTab] = useState<"active" | "completed" | "collected">("active")

  const getMissions = useCallback(() => {
    const cc = gameFunnelState.confirmationCount
    const missions: Array<{ id: string; app: string; icon: string; color: string; title: string; body: string; action: string; isReward?: boolean }> = []

    if (cc === 0) {
      missions.push(
        { id: "whatsapp-0", app: "WhatsApp", icon: "whatsapp", color: "#25D366", title: "Cidade Neon", body: "D-Bee: manda uma mensagem ai", action: "/whatsapp" },
        { id: "spotify-play", app: "Spotify", icon: "spotify", color: "#1DB954", title: "CHUVA", body: "Nova musica disponivel para ouvir", action: "/spotify/auto-chuva" },
      )
    } else if (cc === 1) {
      missions.push(
        { id: "whatsapp-1", app: "WhatsApp", icon: "whatsapp", color: "#25D366", title: "Cidade Neon", body: "o grupo ta te chamando de volta", action: "/whatsapp" },
        { id: "reward-nizzy", app: "WhatsApp", icon: "whatsapp", color: "#FF6B6B", title: "Nizzy enviou uma recompensa!", body: "Instrumental Cidade Neon desbloqueado", action: "https://untitled.stream/library/project/xss93AFmqBYaNqTMb5gDU", isReward: true },
      )
    } else if (cc === 2) {
      missions.push(
        { id: "whatsapp-2", app: "WhatsApp", icon: "whatsapp", color: "#25D366", title: "Cidade Neon", body: "teste final te espera no grupo", action: "/whatsapp" },
        { id: "reward-dbee", app: "WhatsApp", icon: "whatsapp", color: "#6B7FD7", title: "D-Bee enviou uma recompensa!", body: "Suburbio Xenom desbloqueado", action: "https://untitled.stream/library/project/K4Sh04mZhmvSQmJGyW3yw", isReward: true },
      )
    } else {
      missions.push(
        { id: "reward-alohan", app: "WhatsApp", icon: "whatsapp", color: "#4ECDC4", title: "Alohan enviou uma recompensa!", body: "Live Neon desbloqueado", action: "https://untitled.stream/library/project/TcgmYSll5sI9VfDorJbNA", isReward: true },
        { id: "tiktok-feed", app: "TikTok", icon: "tiktok", color: "#000000", title: "LU2CA", body: "LU2CA publicou 5 novos videos", action: "/tiktok/feed" },
        { id: "aura-sala", app: "AURA", icon: "aura", color: "#A78BFA", title: "CIDADE NEON", body: "Envie sua AURA para fazer parte da rede", action: "aura" },
        { id: "spotify-final", app: "Spotify", icon: "spotify", color: "#1DB954", title: "CHUVA", body: "Ouvir de novo", action: "/spotify/auto-chuva" },
        { id: "untitled-final", app: "[UNTITLED]", icon: "untitled", color: "#8B5CF6", title: "Lancamento", body: "CIDADE NEON - LU2CA", action: "https://untitled.stream/buy/project/cwGIXvpY419u7v6UDOHQz" },
      )
    }

    return missions.filter(m => !completedMissions.includes(m.id) && !collectedRewards.includes(m.id))
  }, [gameFunnelState.confirmationCount, completedMissions, collectedRewards])

  const getCompletedMissions = useCallback(() => {
    const all: Array<{ id: string; app: string; icon: string; color: string; title: string; body: string; action: string }> = [
      { id: "whatsapp-0", app: "WhatsApp", icon: "whatsapp", color: "#25D366", title: "Cidade Neon", body: "Grupo desbloqueado", action: "/whatsapp" },
      { id: "whatsapp-1", app: "WhatsApp", icon: "whatsapp", color: "#25D366", title: "Cidade Neon", body: "Conversa no grupo", action: "/whatsapp" },
      { id: "whatsapp-2", app: "WhatsApp", icon: "whatsapp", color: "#25D366", title: "Cidade Neon", body: "Teste final acessado", action: "/whatsapp" },
      { id: "spotify-play", app: "Spotify", icon: "spotify", color: "#1DB954", title: "CHUVA", body: "Musica ouvida", action: "/spotify/auto-chuva" },
      { id: "tiktok-feed", app: "TikTok", icon: "tiktok", color: "#000000", title: "LU2CA", body: "Videos assistidos", action: "/tiktok/feed" },
    ]
    return all.filter(m => completedMissions.includes(m.id))
  }, [completedMissions])

  /* ─── BANNER NOTIFICATIONS (5s each, then bounces to Missoes) ── */
  const [missionsBounce, setMissionsBounce] = useState(false)

  useEffect(() => {
    if (phase !== "phone-home" || showNotifCenter) {
      if (bannerTimerRef.current) clearInterval(bannerTimerRef.current)
      return
    }

    const showNext = () => {
      const missions = getMissions()
      if (missions.length === 0) { setBannerNotif(null); return }
      const idx = bannerIndexRef.current % missions.length
      setBannerNotif(missions[idx])
      bannerIndexRef.current++
      // Auto-dismiss after 5 seconds, bounce the Missoes button
      setTimeout(() => {
        setBannerNotif(null)
        setMissionsBounce(true)
        setTimeout(() => setMissionsBounce(false), 600)
      }, 5000)
    }

    const initialTimer = setTimeout(showNext, 2000)
    // Show next notification 2s after previous dismissed (5s visible + 2s gap = 7s cycle)
    bannerTimerRef.current = setInterval(showNext, 7500)

    return () => {
      clearTimeout(initialTimer)
      if (bannerTimerRef.current) clearInterval(bannerTimerRef.current)
    }
  }, [phase, showNotifCenter, getMissions])

  // Set badges based on confirmation count
  useEffect(() => {
    if (phase !== "phone-home") return
    const cc = gameFunnelState.confirmationCount
    if (cc === 0) setAppBadges({ whatsapp: true, spotify: true })
    else if (cc === 1) setAppBadges({ whatsapp: true, spotify: true })
    else if (cc === 2) setAppBadges({ whatsapp: true, spotify: true, aura: true })
    else setAppBadges({ tiktok: true, aura: true, spotify: true, whatsapp: true, untitled: true })
  }, [phase, gameFunnelState.confirmationCount])

  const handleMissionClick = (mission: { id: string; action: string; isReward?: boolean }) => {
    // Rewards go to "collected", regular missions go to "completed"
    if (mission.isReward) {
      setCollectedRewards(prev => prev.includes(mission.id) ? prev : [...prev, mission.id])
    } else {
      setCompletedMissions(prev => prev.includes(mission.id) ? prev : [...prev, mission.id])
    }
    setBannerNotif(null)
    if (mission.action === "aura") {
      setPhase("aura-login")
    } else if (mission.action.startsWith("http")) {
      window.open(mission.action, "_blank")
    } else {
      window.location.href = mission.action
    }
  }

  /* ─── FINAL NOTIFICATIONS (now handled by missions system) ── */

  /* ─── ICON RENDERER ────────────────────────── */
  const getIconSvg = (icon: string): ReactElement => {
    const svgMap: Record<string, ReactElement> = {
      whatsapp: <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>,
      spotify: <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" /></svg>,
      youtube: <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
      tiktok: <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" /></svg>,
      instagram: <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>,
      untitled: <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>,
      aura: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1" opacity="0.7"/><circle cx="12" cy="12" r="5" stroke="white" strokeWidth="0.5" opacity="0.4"/><text x="12" y="15" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">A</text></svg>,
    }
    return svgMap[icon] || <div className="w-6 h-6 bg-white/30 rounded" />
  }

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
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center relative" style={{ backgroundColor: color }}>
        {iconMap[icon] || <div className="w-8 h-8 bg-white/20 rounded" />}
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════ */
  /* ─── RENDER: INCOMING CALL (loop until accept) ──── */
  /* ═══════════════════════════════════════════════════ */
  if (phase === "incoming-call") {
    const handleDecline = () => {
      setCallState("dismissed")
      setTimeout(() => {
        setCallState("callback")
        setTimeout(() => setCallState("ringing"), 1500)
      }, 1200)
    }
    const handleAccept = () => {
      setCallDuration(0)
      setIsMuted(false)
      setIsSpeakerOn(false)
      setPhase("active-call")
    }

    return (
      <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
        <div className={`w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] bg-gradient-to-b from-[#1C1C1E] to-black flex flex-col relative ${callState === "ringing" ? "animate-call-vibrate" : ""}`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />
          <div className="h-[50px] flex-shrink-0" />

          {/* Dismissed state */}
          {callState === "dismissed" && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-[#FF3B30]/20 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-[#FF3B30] rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>
              </div>
              <p className="text-white text-lg font-medium">Chamada perdida</p>
              <p className="text-[#A0A0A0] text-sm mt-1">D-Bee</p>
            </div>
          )}

          {/* Callback state */}
          {callState === "callback" && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full overflow-hidden mb-4 opacity-60">
                <Image src="/images/avatar-dbee.jpg" alt="D-Bee" width={64} height={64} className="w-full h-full object-cover" priority />
              </div>
              <p className="text-white/60 text-sm">D-Bee ligando de volta...</p>
              <div className="flex gap-1 mt-3">
                <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse" style={{ animationDelay: "0.2s" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          )}

          {/* Ringing state */}
          {callState === "ringing" && (
            <>
              <div className="flex-1 flex flex-col items-center justify-start pt-6">
                <div className="relative">
                  <div className="w-[120px] h-[120px] rounded-full overflow-hidden mb-4 ring-4 ring-white/20" style={{ animation: "call-pulse 2s ease-in-out infinite" }}>
                    <Image src="/images/avatar-dbee.jpg" alt="D-Bee" width={120} height={120} className="w-full h-full object-cover" priority />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-white/20" style={{ animation: "call-ping 2s ease-out infinite" }} />
                </div>
                <h1 className="text-white text-[32px] font-semibold mb-1">D-Bee</h1>
                <p className="text-[#A0A0A0] text-[18px]">mobile</p>
                <p className="text-[#A0A0A0] text-[16px] mt-2">Chamada recebida...</p>
              </div>
              <div className="px-8 pb-12">
                <div className="flex justify-center gap-12 mb-8">
                  <button type="button" className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-full bg-[#48484A] flex items-center justify-center">
                      <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 9.5c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5-2.5-1.12-2.5-2.5 1.12-2.5 2.5-2.5m0-2c-2.48 0-4.5 2.02-4.5 4.5s2.02 4.5 4.5 4.5 4.5-2.02 4.5-4.5-2.02-4.5-4.5-4.5z" /></svg>
                    </div>
                    <span className="text-white text-xs">Lembrar</span>
                  </button>
                  <button type="button" className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-full bg-[#48484A] flex items-center justify-center">
                      <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
                    </div>
                    <span className="text-white text-xs">Mensagem</span>
                  </button>
                </div>
                <div className="flex justify-center gap-16">
                  {/* Decline */}
                  <button type="button" onClick={handleDecline} className="flex flex-col items-center gap-2">
                    <div className="w-[72px] h-[72px] rounded-full bg-[#FF3B30] flex items-center justify-center active:scale-95 transition-transform">
                      <svg className="w-8 h-8 text-white rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>
                    </div>
                    <span className="text-white text-xs">Recusar</span>
                  </button>
                  {/* Accept */}
                  <button type="button" onClick={handleAccept} className="flex flex-col items-center gap-2">
                    <div className="w-[72px] h-[72px] rounded-full bg-[#34C759] flex items-center justify-center active:scale-95 transition-transform">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>
                    </div>
                    <span className="text-white text-xs">Aceitar</span>
                  </button>
                </div>
              </div>
            </>
          )}
          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2"><div className="w-32 h-1 bg-white/30 rounded-full" /></div>
        </div>
        <style jsx>{`
          @keyframes call-vibrate { 0%,100%{transform:translateX(0)} 10%,30%,50%,70%,90%{transform:translateX(-2px)} 20%,40%,60%,80%{transform:translateX(2px)} }
          @keyframes call-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.85;transform:scale(1.02)} }
          @keyframes call-ping { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(1.5);opacity:0} }
          .animate-call-vibrate{animation:call-vibrate .3s linear infinite}
        `}</style>
      </div>
    )
  }

  /* ─── RENDER: ACTIVE CALL (19s with audio) ─────── */
  if (phase === "active-call") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] bg-gradient-to-b from-[#1C1C1E] to-black flex flex-col relative" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />

          {/* Status bar */}
          <div className="relative z-10 h-[50px] flex items-end justify-between px-6 pb-1 text-white text-xs flex-shrink-0">
            <span className="font-semibold w-12">9:41</span>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-3" fill="white" viewBox="0 0 16 12"><rect x="0" y="6" width="3" height="6" rx="0.5"/><rect x="4.5" y="4" width="3" height="8" rx="0.5"/><rect x="9" y="1" width="3" height="11" rx="0.5"/><rect x="13" y="0" width="3" height="12" rx="0.5" opacity="0.3"/></svg>
              <svg className="w-6 h-3" fill="white" viewBox="0 0 25 12"><rect x="0" y="1" width="22" height="10" rx="2" stroke="white" strokeWidth="1" fill="none"/><rect x="1.5" y="2.5" width="16" height="7" rx="1" fill="white"/><rect x="23" y="4" width="2" height="4" rx="0.5" fill="white" opacity="0.4"/></svg>
            </div>
          </div>

          {/* Caller info */}
          <div className="flex-1 flex flex-col items-center justify-start pt-8">
            <div className="w-[120px] h-[120px] rounded-full overflow-hidden mb-4">
              <Image src="/images/avatar-dbee.jpg" alt="D-Bee" width={120} height={120} className="w-full h-full object-cover" priority />
            </div>
            <h1 className="text-white text-[32px] font-semibold mb-1">D-Bee</h1>
            <p className="text-[#34C759] text-[20px] font-light tabular-nums">{formatTime(callDuration)}</p>

            {/* Audio wave */}
            <div className="flex items-end gap-[3px] mt-8 h-6">
              {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
                <div key={i} className="w-[3px] rounded-full bg-[#34C759]" style={{ height: `${h * 4}px`, animation: `call-eq ${0.4 + Math.random() * 0.3}s ease-in-out infinite`, animationDelay: `${i * 0.08}s`, transformOrigin: "bottom" }} />
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-6 pb-10">
            <div className="grid grid-cols-3 gap-4 mb-8">
              {/* Mute */}
              <button type="button" onClick={() => setIsMuted(!isMuted)} className="flex flex-col items-center gap-2">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isMuted ? "bg-white" : "bg-[#48484A]"}`}>
                  <svg className={`w-7 h-7 ${isMuted ? "text-black" : "text-white"}`} fill="currentColor" viewBox="0 0 24 24"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" /></svg>
                </div>
                <span className="text-white text-[11px]">mudo</span>
              </button>
              {/* Keypad */}
              <button type="button" className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-[#48484A] flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 19c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM6 1c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12-8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-6 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
                </div>
                <span className="text-white text-[11px]">teclado</span>
              </button>
              {/* Speaker */}
              <button type="button" onClick={() => setIsSpeakerOn(!isSpeakerOn)} className="flex flex-col items-center gap-2">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isSpeakerOn ? "bg-white" : "bg-[#48484A]"}`}>
                  <svg className={`w-7 h-7 ${isSpeakerOn ? "text-black" : "text-white"}`} fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
                </div>
                <span className="text-white text-[11px]">alto-falante</span>
              </button>
              {/* Add call */}
              <button type="button" className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-[#48484A] flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
                </div>
                <span className="text-white text-[11px]">adicionar</span>
              </button>
              {/* FaceTime */}
              <button type="button" className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-[#48484A] flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                </div>
                <span className="text-white text-[11px]">FaceTime</span>
              </button>
              {/* Contacts */}
              <button type="button" className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-[#48484A] flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
                <span className="text-white text-[11px]">contatos</span>
              </button>
            </div>
            {/* End call */}
            <div className="flex justify-center">
              <button type="button" onClick={() => { if (callAudioRef.current) { callAudioRef.current.pause(); callAudioRef.current = null } if (callTimerRef.current) clearInterval(callTimerRef.current); setPhase("hacker") }} className="w-[72px] h-[72px] rounded-full bg-[#FF3B30] flex items-center justify-center active:scale-95 transition-transform">
                <svg className="w-9 h-9 text-white rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>
              </button>
            </div>
          </div>
          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2"><div className="w-32 h-1 bg-white/30 rounded-full" /></div>
        </div>
        <style jsx>{`
          @keyframes call-eq { 0%,100%{transform:scaleY(0.3)} 50%{transform:scaleY(1)} }
        `}</style>
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
          {/* Confirmation notification - appears as WhatsApp-style notification banner */}
          {showConfirmBtn && confirmationsDone < 3 && (
            <div className="px-3 pb-2">
              <button type="button" onClick={handleConfirmation} className="w-full animate-notif-slide-up">
                <div className="bg-[#182229] rounded-xl p-3 flex items-center gap-3 border border-[#00A884]/30 shadow-lg">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6B7FD7] to-[#4ECDC4] flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-[#00A884] font-bold text-xs uppercase tracking-wider">
                      {confirmationsDone === 0 ? "TESTE DAS MUSICAS (1/3)" : confirmationsDone === 1 ? "TESTE DE QI (2/3)" : "TESTE AURA (3/3)"}
                    </p>
                    <p className="text-[#8696A0] text-[11px] mt-0.5">Toque para iniciar</p>
                  </div>
                  <svg className="w-5 h-5 text-[#00A884]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </div>
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

  /* ─── (Old in-page confirmations and final-notifications removed - now separate pages + missions system) ── */

  /* ─── RENDER: AURA ───────────────────────────────── */
  const auraAlreadyDone = gameFunnelState.confirmations.c3.done
  const auraUnlocked = gameFunnelState.confirmationCount >= 2

  if (phase === "aura-login") {
    // LOCKED STATE: show before 2nd confirmation
    if (!auraUnlocked && !auraAlreadyDone) {
      return (
        <div className="min-h-screen flex items-center justify-center overflow-hidden bg-white">
          <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] flex flex-col relative bg-white">
            {/* Aurora skin - translucent aurora borealis */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-aurora-spin" style={{ background: "conic-gradient(from 0deg,transparent 0%,rgba(167,139,250,.08) 15%,rgba(103,232,249,.06) 30%,transparent 45%,rgba(251,191,36,.06) 60%,rgba(239,68,68,.04) 75%,transparent 90%)" }} />
              <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-20 blur-3xl animate-pulse" style={{ background: "radial-gradient(circle,#a78bfa,transparent 70%)" }} />
              <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full opacity-15 blur-3xl animate-pulse" style={{ background: "radial-gradient(circle,#67e8f9,transparent 70%)", animationDelay: "1s" }} />
            </div>

            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8">
              <h1 className="text-4xl font-black tracking-[0.15em] text-black/80 mb-4" style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontStretch: "condensed" }}>AURA</h1>
              <p className="text-black/30 text-sm text-center mb-10 max-w-[240px] leading-relaxed">Eleve sua AURA</p>
              <a
                href="mailto:lucca.c2c@gmail.com?subject=AURA%20-%20Cidade%20Neon"
                className="px-6 py-3 rounded-2xl text-sm font-medium transition-all active:scale-95 bg-black/5 text-black/50 border border-black/10"
              >
                {'send email to \'lucca.c2c@gmail.com\''}
              </a>
            </div>
            <button type="button" onClick={() => setPhase("phone-home")} className="relative z-10 py-6 text-black/20 text-xs text-center">VOLTAR</button>
          </div>
          <style jsx>{`
            @keyframes aurora-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
            .animate-aurora-spin{animation:aurora-spin 25s linear infinite}
          `}</style>
        </div>
      )
    }

    const AURA_QUESTIONS = [
      { q: "Quando voce entra em um ambiente novo, o que sente primeiro?", opts: [
        { text: "A energia das pessoas", color: "#F59E0B" },
        { text: "Se o lugar e seguro", color: "#06B6D4" },
        { text: "Vontade de explorar", color: "#A78BFA" },
        { text: "Nada, observo em silencio", color: "#6B7280" },
      ]},
      { q: "Qual cor te atrai mais neste momento?", opts: [
        { text: "Dourado / Amarelo", color: "#F59E0B" },
        { text: "Azul profundo", color: "#3B82F6" },
        { text: "Violeta", color: "#A78BFA" },
        { text: "Verde esmeralda", color: "#10B981" },
      ]},
      { q: "O que te move mais na musica?", opts: [
        { text: "A batida, o ritmo", color: "#EF4444" },
        { text: "A letra, a mensagem", color: "#06B6D4" },
        { text: "A atmosfera, o clima", color: "#A78BFA" },
        { text: "A melodia, a harmonia", color: "#F59E0B" },
      ]},
      { q: "Como voce recarrega sua energia?", opts: [
        { text: "Ficando sozinho", color: "#6B7280" },
        { text: "Saindo com pessoas", color: "#F59E0B" },
        { text: "Criando algo novo", color: "#A78BFA" },
        { text: "Na natureza", color: "#10B981" },
      ]},
      { q: "Qual frase ressoa mais com voce?", opts: [
        { text: "Sinto tudo intensamente", color: "#EF4444" },
        { text: "Penso antes de agir", color: "#06B6D4" },
        { text: "Sigo minha intuicao", color: "#A78BFA" },
        { text: "Busco equilibrio", color: "#10B981" },
      ]},
    ]

    const AURA_RESULTS = [
      { name: "AURA SOLAR", color: "#F59E0B", desc: "Sua energia irradia calor e magnetismo. Voce ilumina qualquer ambiente." },
      { name: "AURA OCEANO", color: "#06B6D4", desc: "Profundidade e calma. Voce e a ancora que estabiliza o caos." },
      { name: "AURA NEBULOSA", color: "#A78BFA", desc: "Misterio e intuicao. Voce percebe o que os outros nao veem." },
      { name: "AURA CRISTAL", color: "#10B981", desc: "Clareza e harmonia. Voce busca verdade em tudo." },
      { name: "AURA FOGO", color: "#EF4444", desc: "Paixao e intensidade. Voce sente tudo com forca total." },
      { name: "AURA SOMBRA", color: "#6B7280", desc: "Observacao e misterio. Sua forca esta no silencio." },
    ]

    const getAuraResult = () => {
      const colorCounts: Record<string, number> = {}
      auraAnswers.forEach((a, i) => {
        const c = AURA_QUESTIONS[i]?.opts[a]?.color || ""
        colorCounts[c] = (colorCounts[c] || 0) + 1
      })
      const topColor = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
      return AURA_RESULTS.find(r => r.color === topColor) || AURA_RESULTS[2]
    }

    const handleAuraAnswer = (idx: number) => {
      const newAnswers = [...auraAnswers, idx]
      setAuraAnswers(newAnswers)
      if (auraQuizStep < AURA_QUESTIONS.length - 1) {
        setTimeout(() => setAuraQuizStep(s => s + 1), 300)
      } else {
        setTimeout(() => {
          setAuraShowResult(true)
          if (!auraAlreadyDone) {
            completeConfirmation(3, { auraAnswers: newAnswers })
          }
        }, 400)
      }
    }

    // RESULT STATE
    if (auraShowResult) {
      const result = getAuraResult()
      return (
        <div className="min-h-screen flex items-center justify-center overflow-hidden bg-white">
          <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] flex flex-col items-center justify-center p-8 relative bg-white">
            {/* Aurora skin */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-aurora-spin" style={{ background: `conic-gradient(from 0deg,transparent 0%,${result.color}15 25%,transparent 50%,${result.color}10 75%,transparent 100%)` }} />
            </div>

            <div className="relative z-10 text-center animate-aura-in">
              <p className="text-black/30 text-[10px] uppercase tracking-[0.3em] mb-6" style={{ fontStretch: "condensed" }}>Confirmacao 3/3 Completa</p>

              {/* Aura orb */}
              <div className="relative w-28 h-28 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full animate-pulse" style={{ backgroundColor: `${result.color}15`, boxShadow: `0 0 60px ${result.color}30` }} />
                <div className="absolute inset-3 rounded-full" style={{ backgroundColor: `${result.color}10` }} />
                <div className="absolute inset-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${result.color}08` }}>
                  <span className="text-2xl font-black" style={{ color: result.color, fontStretch: "condensed" }}>A</span>
                </div>
              </div>

              <h1 className="text-xl font-black mb-2 tracking-wide" style={{ color: result.color, fontStretch: "condensed" }}>{result.name}</h1>
              <p className="text-black/40 text-sm mb-8 max-w-[260px] mx-auto leading-relaxed">{result.desc}</p>

              {/* Share by email */}
              <a href={`mailto:lucca.c2c@gmail.com?subject=Minha%20AURA%20-%20${encodeURIComponent(result.name)}&body=Eu%20sou%20${encodeURIComponent(result.name)}%20-%20${encodeURIComponent(result.desc)}`} className="inline-block px-6 py-3 rounded-2xl text-sm font-medium transition-all active:scale-95 mb-4" style={{ backgroundColor: `${result.color}12`, color: result.color, border: `1px solid ${result.color}20` }}>
                Enviar minha AURA por email
              </a>

              {/* Link to disc */}
              <a href="https://untitled.stream/buy/project/cwGIXvpY419u7v6UDOHQz" target="_blank" rel="noopener noreferrer" className="block px-6 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 mb-6" style={{ color: result.color }}>
                Eleve sua AURA com o Album
              </a>

              <button type="button" onClick={() => setPhase("phone-home")} className="px-8 py-3 rounded-2xl bg-black/5 text-black/40 text-sm font-medium active:scale-95 transition-transform">
                Voltar ao Inicio
              </button>
            </div>
          </div>
          <style jsx>{`
            @keyframes aura-in { from{opacity:0;transform:scale(0.9)} to{opacity:1;transform:scale(1)} }
            .animate-aura-in{animation:aura-in .6s ease-out forwards}
            @keyframes aurora-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
            .animate-aurora-spin{animation:aurora-spin 25s linear infinite}
          `}</style>
        </div>
      )
    }

    // QUIZ STATE - white bg with aurora
    const currentAQ = AURA_QUESTIONS[auraQuizStep]
    return (
      <div className="min-h-screen flex items-center justify-center overflow-hidden bg-white">
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] flex flex-col relative bg-white">
          {/* Aurora skin */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-aurora-spin" style={{ background: "conic-gradient(from 0deg,transparent 0%,rgba(167,139,250,.06) 15%,rgba(103,232,249,.05) 30%,transparent 45%,rgba(251,191,36,.04) 60%,transparent 75%)" }} />
            <div className="absolute top-1/4 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: "radial-gradient(circle,#a78bfa,transparent 70%)" }} />
          </div>

          <div className="relative z-10 flex flex-col h-full pt-[56px] px-5">
            {/* Header */}
            <div className="text-center mb-2">
              <h1 className="text-2xl font-black text-black/80 tracking-[0.15em]" style={{ fontStretch: "condensed" }}>AURA</h1>
              <div className="w-16 h-[2px] mx-auto mt-1 bg-gradient-to-r from-[#a78bfa] via-[#67e8f9] to-[#a78bfa]" />
            </div>

            {/* Progress */}
            <div className="flex gap-1.5 mb-6 mt-4">
              {AURA_QUESTIONS.map((_, i) => (
                <div key={i} className="flex-1 h-1 rounded-full transition-all duration-500" style={{ backgroundColor: i < auraQuizStep ? "#A78BFA" : i === auraQuizStep ? "rgba(167,139,250,0.4)" : "rgba(0,0,0,0.06)" }} />
              ))}
            </div>
            <p className="text-black/20 text-[10px] text-center mb-4 tracking-wider">CONFIRMACAO 3/3 &middot; {auraQuizStep + 1}/{AURA_QUESTIONS.length}</p>

            {/* Question */}
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-black/70 text-lg font-medium text-center mb-8 text-balance px-2">{currentAQ.q}</h2>

              <div className="space-y-3">
                {currentAQ.opts.map((opt, i) => (
                  <button key={opt.text} type="button" onClick={() => handleAuraAnswer(i)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 active:scale-[0.97] text-left bg-white"
                    style={{ border: `1px solid ${opt.color}25`, boxShadow: `0 1px 4px ${opt.color}08` }}
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                    <span className="text-black/60 text-sm">{opt.text}</span>
                  </button>
                ))}
              </div>
            </div>

            <button type="button" onClick={() => { setPhase("phone-home"); setAuraQuizStep(0); setAuraAnswers([]) }} className="py-4 text-black/20 text-xs text-center">VOLTAR</button>
          </div>
        </div>
        <style jsx>{`
          @keyframes aurora-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          .animate-aurora-spin{animation:aurora-spin 25s linear infinite}
        `}</style>
      </div>
    )
  }

  /* ─── RENDER: PHONE HOME ���────────────────────────── */
  const activeMissions = getMissions()

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f23]" />
        {/* iPhone Notch - Apple style: floating pill, content behind sides */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 w-[126px] h-[34px] bg-black rounded-b-[18px]" />

        {/* Status bar area */}
        <div className="relative z-20 h-[50px] flex items-end justify-between px-6 pb-1 text-white text-xs">
          <span className="font-semibold w-12">{currentTime}</span>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-3" fill="white" viewBox="0 0 16 12"><rect x="0" y="6" width="3" height="6" rx="0.5"/><rect x="4.5" y="4" width="3" height="8" rx="0.5"/><rect x="9" y="1" width="3" height="11" rx="0.5"/><rect x="13" y="0" width="3" height="12" rx="0.5" opacity="0.3"/></svg>
            <svg className="w-6 h-3" fill="white" viewBox="0 0 25 12"><rect x="0" y="1" width="22" height="10" rx="2" stroke="white" strokeWidth="1" fill="none"/><rect x="1.5" y="2.5" width="16" height="7" rx="1" fill="white"/><rect x="23" y="4" width="2" height="4" rx="0.5" fill="white" opacity="0.4"/></svg>
          </div>
        </div>

        {/* ── Banner notification (slides in from top) ── */}
        {bannerNotif && !showNotifCenter && (
          <button
            type="button"
            onClick={() => handleMissionClick(bannerNotif)}
            className="absolute top-[52px] left-3 right-3 z-40 animate-notif-slide"
          >
            <div className={`backdrop-blur-xl rounded-2xl p-3 flex items-center gap-3 shadow-2xl ${bannerNotif.isReward ? "bg-gradient-to-r from-[#FFD700]/20 via-[#1c1c1e]/95 to-[#1c1c1e]/95 border border-[#FFD700]/30" : "bg-[#1c1c1e]/95 border border-white/5"}`}>
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 relative" style={{ backgroundColor: bannerNotif.color }}>
                {getIconSvg(bannerNotif.icon)}
                {bannerNotif.isReward && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#FFD700] rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  </div>
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`font-semibold text-sm ${bannerNotif.isReward ? "text-[#FFD700]" : "text-white"}`}>{bannerNotif.isReward ? "RECOMPENSA" : bannerNotif.app}</p>
                  <span className="text-white/40 text-xs">agora</span>
                </div>
                <p className="text-white/90 font-medium text-xs">{bannerNotif.title}</p>
                <p className="text-white/50 text-xs truncate">{bannerNotif.body}</p>
              </div>
            </div>
          </button>
        )}

        {/* ── Notification Center (overlay) ── */}
        {showNotifCenter && (
          <div className="absolute inset-0 z-40 flex flex-col">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <div className="relative z-10 flex flex-col h-full">
              {/* Header */}
              <div className="pt-[56px] px-5 pb-2">
                <h2 className="text-white text-lg font-bold">Central de Missoes</h2>
                <p className="text-white/40 text-xs mt-0.5">{gameFunnelState.confirmationCount}/3 confirmacoes completas</p>
              </div>

              {/* Tabs */}
              <div className="flex px-5 gap-1.5 mb-3 overflow-x-auto">
                <button type="button" onClick={() => setMissionsTab("active")}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0 ${missionsTab === "active" ? "bg-white/15 text-white" : "bg-white/5 text-white/40"}`}>
                  Pendentes {activeMissions.length > 0 && `(${activeMissions.length})`}
                </button>
                <button type="button" onClick={() => setMissionsTab("completed")}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0 ${missionsTab === "completed" ? "bg-white/15 text-white" : "bg-white/5 text-white/40"}`}>
                  Completas {getCompletedMissions().length > 0 && `(${getCompletedMissions().length})`}
                </button>
                <button type="button" onClick={() => setMissionsTab("collected")}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0 ${missionsTab === "collected" ? "bg-[#FFD700]/20 text-[#FFD700]" : "bg-white/5 text-white/40"}`}>
                  Coletadas {collectedRewards.length > 0 && `(${collectedRewards.length})`}
                </button>
              </div>

              {/* Mission List */}
              <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-24">
                {/* ACTIVE TAB */}
                {missionsTab === "active" && (
                  activeMissions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center pt-20">
                      <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-3">
                        <svg className="w-7 h-7 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <p className="text-white/30 text-sm">Nenhuma missao pendente</p>
                    </div>
                  ) : (
                    activeMissions.map((mission) => (
                      <button key={mission.id} type="button" onClick={() => { setShowNotifCenter(false); handleMissionClick(mission) }} className="w-full text-left">
                        <div className={`backdrop-blur rounded-2xl p-3.5 flex items-center gap-3 transition-colors ${mission.isReward ? "bg-[#FFD700]/10 border border-[#FFD700]/20 hover:bg-[#FFD700]/15" : "bg-white/5 border border-white/5 hover:bg-white/10"}`}>
                          <div className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0 relative" style={{ backgroundColor: mission.color }}>
                            {getIconSvg(mission.icon)}
                            {mission.isReward && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#FFD700] rounded-full flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <p className={`font-semibold text-sm ${mission.isReward ? "text-[#FFD700]" : "text-white"}`}>{mission.isReward ? "RECOMPENSA" : mission.app}</p>
                              <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                            </div>
                            <p className="text-white/80 text-xs font-medium">{mission.title}</p>
                            <p className="text-white/40 text-xs truncate">{mission.body}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )
                )}

                {/* COMPLETED TAB */}
                {missionsTab === "completed" && (
                  getCompletedMissions().length === 0 ? (
                    <div className="flex flex-col items-center justify-center pt-20">
                      <p className="text-white/30 text-sm">Nenhuma missao completa ainda</p>
                    </div>
                  ) : (
                    getCompletedMissions().map((mission) => (
                      <button key={mission.id} type="button" onClick={() => {
                        if (mission.action.startsWith("http")) window.open(mission.action, "_blank")
                        else { setShowNotifCenter(false); window.location.href = mission.action }
                      }} className="w-full text-left opacity-60">
                        <div className="bg-white/[0.03] backdrop-blur rounded-2xl p-3.5 flex items-center gap-3 border border-white/[0.03]">
                          <div className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0 relative" style={{ backgroundColor: mission.color }}>
                            {getIconSvg(mission.icon)}
                            <div className="absolute inset-0 rounded-[12px] bg-black/30 flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white/60 font-semibold text-sm">{mission.title}</p>
                            <p className="text-white/30 text-xs">{mission.body}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )
                )}

                {/* COLLECTED REWARDS TAB */}
                {missionsTab === "collected" && (
                  collectedRewards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center pt-20">
                      <div className="w-14 h-14 rounded-full bg-[#FFD700]/5 flex items-center justify-center mb-3">
                        <svg className="w-7 h-7 text-[#FFD700]/20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      </div>
                      <p className="text-white/30 text-sm">Nenhuma recompensa coletada</p>
                    </div>
                  ) : (
                    (() => {
                      const allRewards = [
                        { id: "reward-nizzy", app: "WhatsApp", icon: "whatsapp", color: "#FF6B6B", title: "Recompensa de Nizzy", body: "Instrumental Cidade Neon", action: "https://untitled.stream/library/project/xss93AFmqBYaNqTMb5gDU", isReward: true },
                        { id: "reward-dbee", app: "WhatsApp", icon: "whatsapp", color: "#6B7FD7", title: "Recompensa de D-Bee", body: "Suburbio Xenom", action: "https://untitled.stream/library/project/K4Sh04mZhmvSQmJGyW3yw", isReward: true },
                        { id: "reward-alohan", app: "WhatsApp", icon: "whatsapp", color: "#4ECDC4", title: "Recompensa de Alohan", body: "Live Neon", action: "https://untitled.stream/library/project/TcgmYSll5sI9VfDorJbNA", isReward: true },
                      ]
                      return allRewards.filter(r => collectedRewards.includes(r.id)).map((reward) => (
                        <button key={reward.id} type="button" onClick={() => window.open(reward.action, "_blank")} className="w-full text-left">
                          <div className="bg-[#FFD700]/5 backdrop-blur rounded-2xl p-3.5 flex items-center gap-3 border border-[#FFD700]/10">
                            <div className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0 relative" style={{ backgroundColor: reward.color }}>
                              {getIconSvg(reward.icon)}
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#FFD700] rounded-full flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M4.5 12.75l6 6 9-13.5" /></svg>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[#FFD700]/80 font-semibold text-sm">{reward.title}</p>
                              <p className="text-white/40 text-xs">{reward.body}</p>
                            </div>
                            <svg className="w-4 h-4 text-[#FFD700]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                          </div>
                        </button>
                      ))
                    })()
                  )
                )}
              </div>

              {/* Close / Home Button */}
              <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowNotifCenter(false)}
                  className="bg-white/10 hover:bg-white/15 active:bg-white/20 backdrop-blur-md rounded-full px-8 py-3 flex items-center gap-2 transition-colors border border-white/10"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
                  <span className="text-white text-sm font-medium">Inicio</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── App Grid (vertically centered) ── */}
        {!showNotifCenter && (
          <div className="absolute inset-0 z-10 flex items-center justify-center px-8 pt-[50px] pb-[80px]">
            <div className="grid grid-cols-3 gap-x-6 gap-y-6 w-full">
              {phoneApps.map((app) => (
                <button key={app.id} onClick={() => {
                  if (app.id === "youtube" && appBadges.youtube) { window.location.href = "/youtube/cidade-neon"; return }
                  if (app.id === "tiktok") { window.location.href = gameFunnelState.confirmationCount >= 3 ? "/tiktok/feed" : "/tiktok/final"; return }
                  if (app.link) { window.open(app.link, "_blank"); return }
                if (app.id === "whatsapp") { window.location.href = "/whatsapp"; return }
                if (app.id === "aura") { setPhase("aura-login"); return }
                  if (app.id === "spotify") { window.location.href = "/spotify/auto-chuva"; return }
                }} className="flex flex-col items-center gap-1 active:scale-95 transition-transform relative" type="button">
                  {renderAppIcon(app.icon, app.color)}
                  {appBadges[app.id] && (
                    <div className="absolute -top-1 -right-0 w-5 h-5 bg-[#FF3B30] rounded-full border-2 border-[#16213e] flex items-center justify-center">
                      <span className="text-white text-[9px] font-bold">!</span>
                    </div>
                  )}
                  <span className="text-white text-[10px] leading-tight text-center">{app.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Bottom Dock: Notification Center button + Restart + Home indicator ── */}
        {!showNotifCenter && (
          <div className="absolute bottom-0 left-0 right-0 z-20 pb-2 pt-3">
            <div className="flex justify-center items-center gap-3 mb-3">
              <button
                type="button"
                onClick={() => setShowNotifCenter(true)}
                className={`relative bg-white/8 hover:bg-white/12 active:bg-white/16 backdrop-blur-md rounded-full px-5 py-2.5 flex items-center gap-2 transition-all border border-white/10 ${missionsBounce ? "animate-missions-bounce" : ""}`}
              >
                <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                <span className="text-white/70 text-xs font-medium">Missoes</span>
                {activeMissions.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF3B30] rounded-full flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">{activeMissions.length}</span>
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => { resetAll(); setPhase("incoming-call") }}
                className="w-10 h-10 bg-white/8 hover:bg-white/12 active:bg-white/16 backdrop-blur-md rounded-full flex items-center justify-center transition-colors border border-white/10"
                aria-label="Reiniciar experiencia"
              >
                <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
              </button>
            </div>
            <div className="flex justify-center">
              <div className="w-32 h-1 bg-white/30 rounded-full" />
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes notif-slide { 0%{transform:translateY(-110%);opacity:0} 100%{transform:translateY(0);opacity:1} }
        .animate-notif-slide{animation:notif-slide .35s cubic-bezier(0.22,1,0.36,1) forwards}
        @keyframes missions-bounce { 0%{transform:translateY(0)} 30%{transform:translateY(-8px)} 50%{transform:translateY(2px)} 70%{transform:translateY(-3px)} 100%{transform:translateY(0)} }
        .animate-missions-bounce{animation:missions-bounce .5s ease-out}
        @keyframes notif-slide-up { 0%{transform:translateY(20px);opacity:0} 100%{transform:translateY(0);opacity:1} }
        .animate-notif-slide-up{animation:notif-slide-up .4s cubic-bezier(0.22,1,0.36,1) forwards}
      `}</style>
    </div>
  )
}
