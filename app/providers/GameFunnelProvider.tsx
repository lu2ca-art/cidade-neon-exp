"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react"

// Types
export type CinematicStep =
  | "idle"
  | "incoming-call"
  | "active-call"
  | "hacker-takeover"
  | "spotify-auto"
  | "whatsapp-notification"
  | "whatsapp-group"
  | "confirmation-1"
  | "confirmation-2"
  | "confirmation-3"
  | "neon-tiles-complete"
  | "private-notifications"
  | "lu2ca-entry"
  | "lu2ca-call"
  | "group-farewell"
  | "tiktok-notification"
  | "tiktok-final"
  | "sala-branca"
  | "completed"

export interface CallState {
  duration: number
  hackerProgress: number
  answered: boolean
}

export interface HackerState {
  progress: number
  lines: string[]
  completed: boolean
}

export interface SpotifyAutoState {
  currentTime: number
  completed: boolean
}

export interface WhatsAppState {
  currentStep: number
  userChoice: string | null
  messages: Array<{
    id: number
    sender: string
    text: string
    time: string
    isSystem?: boolean
  }>
}

export interface TikTokState {
  currentVideo: number
  videosWatched: number[]
}

export interface ConfirmationState {
  done: boolean
  data?: Record<string, unknown>
}

export interface Confirmations {
  c1: ConfirmationState & { archetype?: string; answers?: number[]; lockedFreq?: number }
  c2: ConfirmationState & { savedCount?: number }
  c3: ConfirmationState & { selectedTrack?: string; password?: string }
}

export interface PrivateNotification {
  id: string
  sender: string
  projectName: string
  link: string
  read: boolean
}

export interface GameFunnelState {
  version: number
  currentRoute: string
  lastVisitedAt: number
  cinematicStep: CinematicStep
  confirmationCount: 0 | 1 | 2 | 3
  confirmations: Confirmations
  identityValidated: boolean
  unlocked: {
    deviceUnlocked: boolean
    easterEggsEnabled: boolean
    finalCompleted: boolean
  }
  perAppState: {
    call: CallState
    hacker: HackerState
    spotifyAuto: SpotifyAutoState
    whatsapp: WhatsAppState
    tiktok: TikTokState
  }
  privateNotifications: PrivateNotification[]
  rewardsViewed: string[]
  flowStarted: boolean
  shouldOpenNectarDirectly: boolean
  appsUnlocked: {
    nectar: boolean
    feelGood: boolean
    guitarDriver: boolean
  }
  // frequencias do radio do carro que a pessoa ja SINTONIZOU no app SINT0NIA
  // (a missao correspondente ja concluida eh pre-requisito, mas so fica
  // disponivel de fato depois que ela vai la e sintoniza — ver
  // app/sintonizador/page.tsx — sem dialogo de aceitar/recusar, ela pode
  // sintonizar quando quiser depois que libera, e uma vez feito fica pra
  // sempre)
  radioAccepted: {
    suburbio: boolean
    crypto: boolean
    live: boolean
    full: boolean
  }
}

const STORAGE_KEY = "cidade-neon-funnel-v3"
const CURRENT_VERSION = 3

const defaultState: GameFunnelState = {
  version: 3,
  currentRoute: "/",
  lastVisitedAt: Date.now(),
  cinematicStep: "idle",
  confirmationCount: 0,
  confirmations: {
    c1: { done: false },
    c2: { done: false },
    c3: { done: false },
  },
  identityValidated: false,
  unlocked: {
    deviceUnlocked: false,
    easterEggsEnabled: false,
    finalCompleted: false,
  },
  perAppState: {
    call: { duration: 0, hackerProgress: 0, answered: false },
    hacker: { progress: 0, lines: [], completed: false },
    spotifyAuto: { currentTime: 0, completed: false },
    whatsapp: { currentStep: 0, userChoice: null, messages: [] },
    tiktok: { currentVideo: 0, videosWatched: [] },
  },
  privateNotifications: [],
  rewardsViewed: [],
  flowStarted: false,
  shouldOpenNectarDirectly: false,
  appsUnlocked: {
    nectar: false,
    feelGood: false,
    guitarDriver: false,
  },
  radioAccepted: {
    suburbio: false,
    crypto: false,
    live: false,
    full: false,
  },
}

interface GameFunnelContextType {
  state: GameFunnelState
  setState: (updater: Partial<GameFunnelState> | ((prev: GameFunnelState) => GameFunnelState)) => void
  updateCinematicStep: (step: CinematicStep) => void
  completeConfirmation: (num: 1 | 2 | 3, data?: Record<string, unknown>) => void
  updateCallState: (updates: Partial<CallState>) => void
  updateHackerState: (updates: Partial<HackerState>) => void
  updateSpotifyState: (updates: Partial<SpotifyAutoState>) => void
  updateWhatsAppState: (updates: Partial<WhatsAppState>) => void
  updateTikTokState: (updates: Partial<TikTokState>) => void
  addPrivateNotification: (notification: PrivateNotification) => void
  markNotificationRead: (id: string) => void
  markRewardViewed: (member: string) => void
  startFlow: () => void
  resetAll: () => void
  // reset completo da experiência (funil + o resto do estado que vive fora
  // dele em localStorage) + reload — mesma ação que existia duplicada em
  // 3 lugares (dois botões em app/page.tsx e o do painel do carro), cada um
  // com sua própria lista de chaves que podia (e já tinha) divergir
  resetExperience: () => void
  getNextConfirmation: () => 1 | 2 | 3 | null
}

const GameFunnelContext = createContext<GameFunnelContextType | null>(null)

function loadState(): GameFunnelState {
  if (typeof window === "undefined") return defaultState
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return defaultState
    
    const parsed = JSON.parse(stored) as GameFunnelState
    
    // Migration: if version is old, reset
    if (parsed.version !== CURRENT_VERSION) {
      return defaultState
    }

    // Preenche campos novos que blobs salvos antes deles existirem nao tem,
    // sem precisar de um reset de versao completo (evita apagar progresso)
    return {
      ...defaultState,
      ...parsed,
      appsUnlocked: { ...defaultState.appsUnlocked, ...parsed.appsUnlocked },
      radioAccepted: { ...defaultState.radioAccepted, ...parsed.radioAccepted },
    }
  } catch {
    return defaultState
  }
}

function saveState(state: GameFunnelState) {
  if (typeof window === "undefined") return
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error("Failed to save state:", e)
  }
}

export function GameFunnelProvider({ children }: { children: ReactNode }) {
  const [state, setStateInternal] = useState<GameFunnelState>(defaultState)
  const [isHydrated, setIsHydrated] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Hydrate from localStorage on mount
  useEffect(() => {
    const loaded = loadState()
    setStateInternal(loaded)
    setIsHydrated(true)
  }, [])

  // /drive e o hub do celular (dentro do iframe) são DUAS árvores React
  // separadas, cada uma com sua própria instância deste provider — só
  // compartilham dado via localStorage. Sem isso, uma missão concluída
  // dentro do iframe (confirmationCount, radioAccepted etc.) nunca chegava
  // ao /drive já montado, que ficava com o estado congelado no que era na
  // hora em que ele entrou no carro. O evento "storage" dispara na OUTRA
  // janela/iframe sempre que uma delas grava no localStorage — é assim que
  // as duas ficam sincronizadas em tempo real.
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      setStateInternal(loadState())
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [])

  // Debounced save using ref (no state dependency)
  const debouncedSave = useCallback((newState: GameFunnelState) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      saveState(newState)
    }, 200)
  }, [])

  const setState = useCallback((updater: Partial<GameFunnelState> | ((prev: GameFunnelState) => GameFunnelState)) => {
    setStateInternal((prev) => {
      const newState = typeof updater === "function" 
        ? updater(prev) 
        : { ...prev, ...updater, lastVisitedAt: Date.now() }
      
      debouncedSave(newState)
      return newState
    })
  }, [debouncedSave])

  const updateCinematicStep = useCallback((step: CinematicStep) => {
    setStateInternal((prev) => {
      if (prev.cinematicStep === step) return prev
      const newState = { ...prev, cinematicStep: step, lastVisitedAt: Date.now() }
      debouncedSave(newState)
      return newState
    })
  }, [debouncedSave])

  const completeConfirmation = useCallback((num: 1 | 2 | 3, data?: Record<string, unknown>) => {
    setState((prev) => {
      const key = `c${num}` as keyof Confirmations
      const newCount = Math.min(prev.confirmationCount + 1, 3) as 0 | 1 | 2 | 3
      return {
        ...prev,
        confirmationCount: newCount,
        confirmations: {
          ...prev.confirmations,
          // merge (não substitui) — c3 é escrito por mais de uma feature
          // (NECTAR e GUITAR DRIVER); um replace completo apagava os campos
          // da que completou primeiro
          [key]: { ...prev.confirmations[key], done: true, ...data },
        },
        identityValidated: newCount === 3,
        lastVisitedAt: Date.now(),
      }
    })
  }, [setState])

  const updateCallState = useCallback((updates: Partial<CallState>) => {
    setState((prev) => ({
      ...prev,
      perAppState: {
        ...prev.perAppState,
        call: { ...prev.perAppState.call, ...updates },
      },
    }))
  }, [setState])

  const updateHackerState = useCallback((updates: Partial<HackerState>) => {
    setState((prev) => ({
      ...prev,
      perAppState: {
        ...prev.perAppState,
        hacker: { ...prev.perAppState.hacker, ...updates },
      },
    }))
  }, [setState])

  const updateSpotifyState = useCallback((updates: Partial<SpotifyAutoState>) => {
    setState((prev) => ({
      ...prev,
      perAppState: {
        ...prev.perAppState,
        spotifyAuto: { ...prev.perAppState.spotifyAuto, ...updates },
      },
    }))
  }, [setState])

  const updateWhatsAppState = useCallback((updates: Partial<WhatsAppState>) => {
    setState((prev) => ({
      ...prev,
      perAppState: {
        ...prev.perAppState,
        whatsapp: { ...prev.perAppState.whatsapp, ...updates },
      },
    }))
  }, [setState])

  const updateTikTokState = useCallback((updates: Partial<TikTokState>) => {
    setState((prev) => ({
      ...prev,
      perAppState: {
        ...prev.perAppState,
        tiktok: { ...prev.perAppState.tiktok, ...updates },
      },
    }))
  }, [setState])

  const addPrivateNotification = useCallback((notification: PrivateNotification) => {
    setState((prev) => ({
      ...prev,
      privateNotifications: [...prev.privateNotifications, notification],
    }))
  }, [setState])

  const markNotificationRead = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      privateNotifications: prev.privateNotifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }))
  }, [setState])

  const markRewardViewed = useCallback((member: string) => {
    setState((prev) => ({
      ...prev,
      rewardsViewed: prev.rewardsViewed.includes(member)
        ? prev.rewardsViewed
        : [...prev.rewardsViewed, member],
    }))
  }, [setState])

  const startFlow = useCallback(() => {
    setState((prev) => ({
      ...prev,
      flowStarted: true,
      cinematicStep: "incoming-call",
    }))
  }, [setState])

  const resetAll = useCallback(() => {
    setStateInternal(defaultState)
    saveState(defaultState)
  }, [])

  const resetExperience = useCallback(() => {
    setStateInternal(defaultState)
    saveState(defaultState)
    try {
      localStorage.removeItem("cn-completed-missions")
      localStorage.removeItem("cn-collected-rewards")
      localStorage.removeItem("cidade-neon-grupo-msgs")
      localStorage.removeItem("cidade-neon-funnel-v2")
    } catch {}
    window.location.reload()
  }, [])

  const getNextConfirmation = useCallback((): 1 | 2 | 3 | null => {
    if (!state.confirmations.c1.done) return 1
    if (!state.confirmations.c2.done) return 2
    if (!state.confirmations.c3.done) return 3
    return null
  }, [state.confirmations])

  // Don't render children until hydrated to avoid hydration mismatch
  if (!isHydrated) {
    return (
      <div className="h-dvh bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <GameFunnelContext.Provider
      value={{
        state,
        setState,
        updateCinematicStep,
        completeConfirmation,
        updateCallState,
        updateHackerState,
        updateSpotifyState,
        updateWhatsAppState,
        updateTikTokState,
        addPrivateNotification,
        markNotificationRead,
        markRewardViewed,
        startFlow,
        resetAll,
        resetExperience,
        getNextConfirmation,
      }}
    >
      {children}
    </GameFunnelContext.Provider>
  )
}

export function useGameFunnel() {
  const context = useContext(GameFunnelContext)
  if (!context) {
    throw new Error("useGameFunnel must be used within a GameFunnelProvider")
  }
  return context
}
