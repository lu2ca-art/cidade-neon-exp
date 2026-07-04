"use client"

import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState, useRef } from "react"

// ─── Dados por personagem ─────────────────────────────────────────────────────

type MemberKey = "alohan" | "nizzy" | "dbee"

interface MemberScript {
  name: string
  avatar: string
  color: string
  // Estado 0: antes da missao ser aceita — orienta abrir o app
  preMission: {
    messages: string[]
    appName: string      // nome do app a abrir
    appRoute: string     // rota interna
    appId: "nectar-app" | "feel-good-app" | "guitar-driver"
    ctaLabel: string
  }
  // Estado 1: missao completa (confirmationCount avancou) — envia recompensa
  reward: {
    messages: string[]
    rewardName: string
    rewardLink: string
  }
  // Estado 2: missao seguinte disponivel (cc >= next) — apenas mensagem de espera
  done: {
    messages: string[]
  }
}

const SCRIPTS: Record<MemberKey, MemberScript> = {
  alohan: {
    name: "Alohan",
    avatar: "A",
    color: "#4ECDC4",
    preMission: {
      messages: [
        "ei.",
        "voce chegou aqui por um motivo.",
        "nao sei ainda se voce e do tipo que sente ou do tipo que so observa.",
        "tem um teste que vai deixar isso claro.",
        "vai no app NECTAR. descobre o que e o seu nectar.",
        "nao precisa ser rapido. so precisa ser verdadeiro.",
        "quando terminar, volta aqui.",
      ],
      appName: "NECTAR",
      appRoute: "/nectar",
      appId: "nectar-app",
      ctaLabel: "Abrir NECTAR",
    },
    reward: {
      messages: [
        "voltou.",
        "eu vi o resultado.",
        "faz sentido.",
        "tem coisa que eu guardo so pra quem chega ate aqui.",
        "isso aqui e seu.",
      ],
      rewardName: "SUBURBIO XENOM",
      rewardLink: "https://untitled.stream/library/project/K4Sh04mZhmvSQmJGyW3yw",
    },
    done: {
      messages: [
        "missao cumprida.",
        "Nizzy vai querer te conhecer agora.",
        "ela e diferente de mim. mais intensa.",
        "vai la.",
      ],
    },
  },
  nizzy: {
    name: "Nizzy",
    avatar: "N",
    color: "#FF6B6B",
    preMission: {
      messages: [
        "oi.",
        "Alohan me falou de voce.",
        "mas eu preciso sentir antes de confiar, entende?",
        "eu nao aceito qualquer um aqui.",
        "abre o FEEL.GOOD.",
        "vai ter umas musicas. voce escolhe o que cada uma faz em voce.",
        "nao tem certo ou errado. so tem honesto ou mentira.",
        "me mostra o que voce sente de verdade.",
      ],
      appName: "FEEL.GOOD",
      appRoute: "/feel-good",
      appId: "feel-good-app",
      ctaLabel: "Abrir FEEL.GOOD",
    },
    reward: {
      messages: [
        "voce sente de verdade.",
        "eu sabia.",
        "esse tipo de conexao com musica nao se finge.",
        "guarda isso aqui. e o instrumental. a estrutura pura.",
        "faz o que quiser com ela.",
      ],
      rewardName: "Instrumental Cidade Neon",
      rewardLink: "https://untitled.stream/library/project/xss93AFmqBYaNqTMb5gDU",
    },
    done: {
      messages: [
        "agora ta completo aqui comigo.",
        "D-Bee vai te dar o ultimo teste.",
        "ele e rigoroso. mas quando respeita, respeita de verdade.",
        "boa sorte.",
      ],
    },
  },
  dbee: {
    name: "D-Bee",
    avatar: "D",
    color: "#6B7FD7",
    preMission: {
      messages: [
        "hm.",
        "Alohan e Nizzy ja aprovaram voce.",
        "mas isso nao significa nada pra mim ainda.",
        "meu criterio e diferente.",
        "eu preciso ver voce tocar.",
        "abre o GUITAR DRIVER.",
        "tem 4 faixas. toca todas.",
        "nao precisa ser perfeito. precisa ser presente.",
        "so volta aqui depois de terminar as 4.",
      ],
      appName: "GUITAR DRIVER",
      appRoute: "/neon-tiles",
      appId: "guitar-driver",
      ctaLabel: "Abrir GUITAR DRIVER",
    },
    reward: {
      messages: [
        "voce tocou.",
        "cada faixa.",
        "isso prova que voce nao ta so ouvindo. ta dentro.",
        "tem algo que eu capturei ao vivo numa noite especifica.",
        "nunca liberei pra ninguem fora do ciclo.",
        "e seu agora.",
      ],
      rewardName: "Live Neon",
      rewardLink: "https://untitled.stream/library/project/TcgmYSll5sI9VfDorJbNA",
    },
    done: {
      messages: [
        "ciclo completo.",
        "voce chegou ate o fim.",
        "poucos chegam.",
      ],
    },
  },
}

// Qual cc marca o inicio da recompensa de cada personagem
const REWARD_AT_CC: Record<MemberKey, number> = {
  alohan: 1,
  nizzy: 2,
  dbee: 3,
}

// Qual cc indica que a missao seguinte (done state) esta ativa
const DONE_AT_CC: Record<MemberKey, number> = {
  alohan: 2,  // after nizzy mission started
  nizzy: 3,   // after dbee mission started
  dbee: 3,    // final
}

// ─── Componente ──────────────────────────────────────────────────────────────

// Tempo que uma fala fica visível antes de começar a sumir, e duração do
// fade — o vazamento não é uma conversa: as falas do personagem aparecem e
// somem sozinhas. As only ações reais (abrir o app da missão, pegar a
// recompensa) ficam fixas na tela, porque são o que de fato move o jogo.
const FADE_HOLD_MS = 6500
const FADE_DUR_MS = 1600

function fadeOpacity(revealedAt: number | undefined, now: number): number {
  if (!revealedAt) return 1
  const age = now - revealedAt
  if (age <= FADE_HOLD_MS) return 1
  return Math.max(0, 1 - (age - FADE_HOLD_MS) / FADE_DUR_MS)
}

function ChatBubble({ text, color, name, opacity }: { text: string; color: string; name: string; opacity: number }) {
  return (
    <div className="flex justify-start" style={{ opacity, transition: "opacity 300ms linear" }}>
      <div className="bg-[#202C33] rounded-lg rounded-tl-none px-3 py-2 max-w-[85%]">
        <p className="text-[11px] font-medium mb-1" style={{ color }}>{name}</p>
        <p className="text-[#E9EDEF] text-sm leading-relaxed">{text}</p>
        <p className="text-[#667781] text-[10px] text-right mt-1">agora</p>
      </div>
    </div>
  )
}

function RewardCard({ rewardName, rewardLink, color, memberName }: { rewardName: string; rewardLink: string; color: string; memberName: string }) {
  return (
    <div className="flex justify-start">
      <a
        href={rewardLink}
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-[#202C33] rounded-lg rounded-tl-none px-3 py-2 max-w-[85%] active:bg-[#2A363D] transition-colors"
      >
        <p className="text-[11px] font-medium mb-2" style={{ color }}>{memberName}</p>
        <div className="bg-[#111B21] rounded-lg overflow-hidden border border-white/5">
          <div className="h-16 flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}30` }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            </div>
          </div>
          <div className="px-3 py-2">
            <p className="text-white text-sm font-medium">{rewardName}</p>
            <p className="text-white/30 text-xs mt-0.5">untitled.stream</p>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-1.5">
          <svg className="w-3 h-3 text-[#00A884]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
          <span className="text-[#00A884] text-[11px]">Toque para acessar</span>
        </div>
        <p className="text-[#667781] text-[10px] text-right mt-0.5">agora</p>
      </a>
    </div>
  )
}

function Lu2caFinalCard() {
  return (
    <div className="flex justify-start">
      <div className="bg-[#202C33] rounded-lg rounded-tl-none px-3 py-3 max-w-[90%]">
        <p className="text-[11px] font-bold mb-2" style={{ color: "#A78BFA" }}>LU2CA</p>
        <p className="text-[#E9EDEF] text-sm leading-relaxed mb-3">
          voce chegou ate o fim do ciclo.
        </p>
        <p className="text-[#E9EDEF] text-sm leading-relaxed mb-3">
          isso nao e pra todo mundo. a maioria desiste no meio.
        </p>
        <p className="text-[#E9EDEF] text-sm leading-relaxed mb-3">
          CIDADE NEON existe completo agora. e voce fez parte de como ele chegou aqui.
        </p>
        <p className="text-[#E9EDEF] text-sm leading-relaxed mb-4">
          se quiser levar o album completo com voce — todas as frequencias, cada faixa —
        </p>
        <a
          href="https://untitled.stream/buy/project/cwGIXvpY419u7v6UDOHQz"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-[#111B21] rounded-xl px-3 py-3 border transition-colors active:bg-[#1c2a31]"
          style={{ borderColor: "rgba(167,139,250,0.3)" }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(167,139,250,0.2)" }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#A78BFA" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" /></svg>
          </div>
          <div className="flex-1">
            <p className="text-white text-sm font-semibold">CIDADE NEON</p>
            <p className="text-white/30 text-xs mt-0.5">Album completo · untitled.stream</p>
          </div>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#A78BFA" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        </a>
        <p className="text-[#667781] text-[10px] text-right mt-2">agora</p>
      </div>
    </div>
  )
}

function AppCTACard({ label, route, color }: { label: string; route: string; color: string }) {
  return (
    <div className="flex justify-start">
      <div className="bg-[#202C33] rounded-lg rounded-tl-none px-3 py-2 max-w-[85%]">
        <a
          href={route}
          className="flex items-center gap-3 bg-[#111B21] rounded-xl px-3 py-3 border border-white/5 active:bg-[#1c2a31] transition-colors"
          style={{ borderColor: `${color}30` }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}25` }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" /></svg>
          </div>
          <div>
            <p className="text-white text-sm font-semibold">{label}</p>
            <p className="text-white/40 text-xs mt-0.5">toque para abrir</p>
          </div>
          <svg className="w-4 h-4 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        </a>
        <p className="text-[#667781] text-[10px] text-right mt-1">agora</p>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PrivadoPage() {
  const { state, setState, markRewardViewed } = useGameFunnel()
  const router = useRouter()
  const params = useParams()
  const member = params.member as string
  const script = SCRIPTS[member as MemberKey]
  const cc = state.confirmationCount
  const finalCompleted = state.unlocked.finalCompleted

  const [visibleCount, setVisibleCount] = useState(1)
  const [now, setNow] = useState(() => Date.now())
  const revealedAtRef = useRef<Record<number, number>>({})

  // Relógio do desvanecimento — só roda enquanto a experiência não terminou
  useEffect(() => {
    if (finalCompleted) return
    const t = setInterval(() => setNow(Date.now()), 300)
    return () => clearInterval(t)
  }, [finalCompleted])

  useEffect(() => {
    if (!script) { router.push("/whatsapp"); return }
    markRewardViewed(member)
  }, [script, member, markRewardViewed, router])

  // Unlock o app correto ao entrar na conversa (pre-missao)
  useEffect(() => {
    if (!script) return
    const appId = script.preMission.appId
    if (!state.appsUnlocked[appId === "nectar-app" ? "nectar" : appId === "feel-good-app" ? "feelGood" : "guitarDriver"]) {
      const key = appId === "nectar-app" ? "nectar" : appId === "feel-good-app" ? "feelGood" : "guitarDriver"
      setState(prev => ({ ...prev, appsUnlocked: { ...prev.appsUnlocked, [key]: true } }))
    }
  }, [script, state.appsUnlocked, setState])

  // Animacao de digitacao: mostrar mensagens uma a uma. Precisa de um array de
  // deps correto — sem ele, o efeito reroda a cada render (inclusive os que o
  // relógio do desvanecimento dispara a cada 300ms) e o setTimeout de 700ms
  // nunca chega a disparar: é cancelado e reagendado antes da hora, travando
  // visibleCount no 1 pra sempre.
  useEffect(() => {
    if (!script) return
    const totalInState = getMessagesToShow().length
    if (visibleCount < totalInState) {
      const t = setTimeout(() => setVisibleCount(v => v + 1), 700)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCount, cc, script])

  if (!script) return null

  const rewardAt = REWARD_AT_CC[member as MemberKey]
  const doneAt = DONE_AT_CC[member as MemberKey]
  const isRewardPhase = cc >= rewardAt
  const isDonePhase = member !== "dbee" && cc >= doneAt

  const showLu2caFinal = member === "dbee" && cc >= 3

  function getMessagesToShow(): Array<{ type: "msg" | "cta" | "reward" | "done-msg" | "lu2ca"; text?: string }> {
    const items: Array<{ type: "msg" | "cta" | "reward" | "done-msg" | "lu2ca"; text?: string }> = []

    if (!isRewardPhase) {
      // Pre-missao: mensagens + CTA do app
      script.preMission.messages.forEach(m => items.push({ type: "msg", text: m }))
      items.push({ type: "cta" })
    } else if (isDonePhase) {
      // Done: recompensa + mensagens de encerramento
      script.reward.messages.forEach(m => items.push({ type: "msg", text: m }))
      items.push({ type: "reward" })
      script.done.messages.forEach(m => items.push({ type: "done-msg", text: m }))
    } else {
      // Reward phase: mensagens + card de recompensa
      script.reward.messages.forEach(m => items.push({ type: "msg", text: m }))
      items.push({ type: "reward" })
    }

    // Apos ciclo completo (cc >= 3, em qualquer conversa privada) — mensagem do LU2CA
    if (showLu2caFinal && isRewardPhase) {
      items.push({ type: "lu2ca" })
    }

    return items
  }

  const allItems = getMessagesToShow()
  const shownItems = allItems.slice(0, visibleCount)

  return (
    <div className="min-h-screen bg-[#0B141A] flex items-center justify-center">
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] flex flex-col relative">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />

        {/* Status bar */}
        <div className="h-[50px] flex items-end justify-between px-6 pb-1 text-white/60 text-xs flex-shrink-0">
          <span className="font-semibold w-12">9:41</span>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-3" fill="white" viewBox="0 0 16 12"><rect x="0" y="6" width="3" height="6" rx="0.5" /><rect x="4.5" y="4" width="3" height="8" rx="0.5" /><rect x="9" y="1" width="3" height="11" rx="0.5" /></svg>
            <svg className="w-6 h-3" fill="white" viewBox="0 0 25 12"><rect x="0" y="1" width="22" height="10" rx="2" stroke="white" strokeWidth="1" fill="none" /><rect x="1.5" y="2.5" width="16" height="7" rx="1" fill="white" /></svg>
          </div>
        </div>

        {/* Header */}
        <div className="bg-[#1F2C34] px-2 py-2 flex items-center gap-2 flex-shrink-0">
          <button type="button" onClick={() => router.push("/?screen=home")} className="p-1">
            <svg className="w-6 h-6 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: script.color }}>
            {script.avatar}
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">{script.name}</p>
            <p className="text-white/40 text-xs">{finalCompleted ? "registro completo" : "sinal instavel"}</p>
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3" style={{ backgroundColor: "#0B141A" }}>
          {shownItems.map((item, i) => {
            if (item.type === "msg" || item.type === "done-msg") {
              // falas do personagem são o vazamento em si: aparecem e somem
              // sozinhas. os cards de ação (cta/reward/lu2ca) abaixo ficam
              // fixos — são o que realmente move o jogo, não flavor.
              if (!revealedAtRef.current[i]) revealedAtRef.current[i] = Date.now()
              const opacity = finalCompleted ? 1 : fadeOpacity(revealedAtRef.current[i], now)
              if (opacity <= 0.02 && !finalCompleted) return null
              return <ChatBubble key={i} text={item.text!} color={script.color} name={script.name} opacity={opacity} />
            }
            if (item.type === "cta") {
              return <AppCTACard key={i} label={script.preMission.ctaLabel} route={script.preMission.appRoute} color={script.color} />
            }
            if (item.type === "reward") {
              return <RewardCard key={i} rewardName={script.reward.rewardName} rewardLink={script.reward.rewardLink} color={script.color} memberName={script.name} />
            }
            if (item.type === "lu2ca") {
              return <Lu2caFinalCard key={i} />
            }
            return null
          })}

          {/* Indicador de digitando */}
          {visibleCount < allItems.length && (
            <div className="flex justify-start">
              <div className="bg-[#202C33] rounded-lg rounded-tl-none px-4 py-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="bg-[#1F2C34] px-3 py-2 flex items-center gap-2 flex-shrink-0">
          <div className="flex-1 bg-[#2A3942] rounded-full px-4 py-2">
            <span className="text-white/30 text-sm">Mensagem</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#00A884] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
          </div>
        </div>
        <div className="flex justify-center py-1 bg-[#1F2C34]"><div className="w-32 h-1 bg-white/20 rounded-full" /></div>
      </div>
    </div>
  )
}
