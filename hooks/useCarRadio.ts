"use client"

// Rádio do carro — máquina simples que toca as STATION_TRACKS reais do jogo
// (por tier) via <audio> nativo. Reproduz a lógica essencial que o /drive tem
// com máquina completa (playing→static→parked→silentLap), mas focado no
// /drive-v2 onde a mecânica de missões ainda não foi trazida.

import { useCallback, useEffect, useRef, useState } from "react"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import { ALL_TIERS, TIER_META, type Tier } from "@/lib/radio-tiers"
import {
  TRACKS_BY_TIER,
  highestAcceptedTier,
  freqOf,
  pctForFreq,
  FREQ_MIN,
  FREQ_MAX,
  FREQ_TOLERANCE,
  type RadioTrack,
} from "@/lib/radio-stations"

export interface UseCarRadioReturn {
  radioOn: boolean
  powerToggle: () => void
  setRadioOn: (v: boolean) => void

  activeTier: Tier
  manualTier: Tier | null
  selectTier: (t: Tier) => void

  // Prev/Next agora mudam de RÁDIO (tier), não de faixa. Faixas tocam em
  // shuffle sem repetir dentro do tier (auto-avança quando termina).
  nextTrack: () => void  // legado — reaproveitado como "próxima estação"
  prevTrack: () => void  // legado — reaproveitado como "estação anterior"
  nextStation: () => void
  prevStation: () => void

  radioTrack: RadioTrack | null
  activeTracks: RadioTrack[]

  radioMuted: boolean
  setRadioMuted: (v: boolean) => void

  audioRef: React.MutableRefObject<HTMLAudioElement | null>

  // Dial: 0..1 mapeando FREQ_MIN..FREQ_MAX
  dialPct: number
  setDialPct: (pct: number) => void
  dialFreq: number
  hoverTier: Tier | undefined
}

export function useCarRadio(): UseCarRadioReturn {
  const funnel = useGameFunnel()
  const radioAccepted = funnel.state.radioAccepted

  const [radioOn, setRadioOn] = useState(false)
  const [manualTier, setManualTier] = useState<Tier | null>(
    () => highestAcceptedTier(radioAccepted)
  )
  const [radioMuted, setRadioMuted] = useState(false)
  const [dialPct, setDialPct] = useState(() => {
    const t = highestAcceptedTier(radioAccepted)
    return t ? pctForFreq(freqOf(t)) : 0
  })

  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Fila de shuffle: ordem embaralhada das faixas da estação atual.
  // Ao esgotar, re-embaralha (sem repetir imediatamente a última tocada).
  const shuffleQueueRef = useRef<number[]>([])
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0)

  // Nova frequência aceita no SINT0NIA = seleciona e liga.
  const prevAcceptedRef = useRef(radioAccepted)
  useEffect(() => {
    const prev = prevAcceptedRef.current
    const justTuned = ALL_TIERS.find((t) => radioAccepted[t] && !prev[t])
    prevAcceptedRef.current = radioAccepted
    if (justTuned) {
      setManualTier(justTuned)
      setRadioOn(true)
      setDialPct(pctForFreq(freqOf(justTuned)))
    } else if (manualTier === null) {
      const first = highestAcceptedTier(radioAccepted)
      if (first) setManualTier(first)
    }
  }, [radioAccepted, manualTier])

  const activeTier: Tier = manualTier ?? "suburbio"
  const activeTracks = TRACKS_BY_TIER[activeTier]
  const radioTrack: RadioTrack | null = activeTracks.length
    ? activeTracks[currentTrackIdx % activeTracks.length]
    : null

  // Embaralha as faixas do tier atual (Fisher-Yates), evitando repetir a
  // última tocada como primeira da nova fila.
  const reshuffleQueue = useCallback((tier: Tier, avoidIdx?: number) => {
    const n = TRACKS_BY_TIER[tier].length
    if (n <= 1) {
      shuffleQueueRef.current = n === 1 ? [0] : []
      return
    }
    const arr = Array.from({ length: n }, (_, i) => i)
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    // se a primeira da nova fila é a mesma da última tocada, troca com a segunda
    if (avoidIdx !== undefined && arr[0] === avoidIdx && arr.length > 1) {
      ;[arr[0], arr[1]] = [arr[1], arr[0]]
    }
    shuffleQueueRef.current = arr
  }, [])

  // Auto-avanço quando a faixa termina — pega próxima da fila shuffle
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onEnded = () => {
      // remove a primeira da fila (que acabou de tocar) e pega a próxima
      const q = shuffleQueueRef.current
      if (q.length <= 1) reshuffleQueue(activeTier, currentTrackIdx)
      else q.shift()
      const nextIdx = shuffleQueueRef.current[0] ?? 0
      setCurrentTrackIdx(nextIdx)
    }
    el.addEventListener("ended", onEnded)
    return () => el.removeEventListener("ended", onEnded)
  }, [activeTier, currentTrackIdx, reshuffleQueue])

  // Inicializa fila shuffle sempre que muda de tier
  useEffect(() => {
    reshuffleQueue(activeTier)
    setCurrentTrackIdx(shuffleQueueRef.current[0] ?? 0)
  }, [activeTier, reshuffleQueue])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const shouldPlay = radioOn && !radioMuted && manualTier !== null && radioTrack !== null
    if (shouldPlay) {
      el.src = radioTrack!.src
      el.play().catch(() => setRadioOn(false))
    } else {
      el.pause()
    }
  }, [radioOn, radioMuted, manualTier, radioTrack])

  const powerToggle = useCallback(() => {
    setRadioOn((v) => {
      if (!v && manualTier === null) {
        const first = highestAcceptedTier(radioAccepted)
        if (first) setManualTier(first)
      }
      return !v
    })
  }, [manualTier, radioAccepted])

  const selectTier = useCallback((t: Tier) => {
    setManualTier(t)
    setDialPct(pctForFreq(freqOf(t)))
    setRadioOn(true)
  }, [])

  // Ciclar entre estações aceitas (radioAccepted[tier] = true).
  const acceptedTiers = ALL_TIERS.filter((t) => radioAccepted[t])
  const nextStation = useCallback(() => {
    if (acceptedTiers.length === 0) return
    const cur = acceptedTiers.indexOf(activeTier)
    const nxt = acceptedTiers[(cur + 1) % acceptedTiers.length]
    selectTier(nxt)
  }, [acceptedTiers, activeTier, selectTier])
  const prevStation = useCallback(() => {
    if (acceptedTiers.length === 0) return
    const cur = acceptedTiers.indexOf(activeTier)
    const prv = acceptedTiers[(cur - 1 + acceptedTiers.length) % acceptedTiers.length]
    selectTier(prv)
  }, [acceptedTiers, activeTier, selectTier])

  // Aliases legados (nomes antigos "nextTrack/prevTrack" agora fazem
  // mudança de estação — compatível com componentes já existentes).
  const nextTrack = nextStation
  const prevTrack = prevStation

  const dialFreq = FREQ_MIN + (FREQ_MAX - FREQ_MIN) * dialPct

  // Tier "sob o ponteiro" — se está dentro da tolerância de uma estação já sintonizada
  const hoverTier = ALL_TIERS.find(
    (t) => radioAccepted[t] && Math.abs(dialFreq - freqOf(t)) < FREQ_TOLERANCE
  )

  return {
    radioOn,
    powerToggle,
    setRadioOn,
    activeTier,
    manualTier,
    selectTier,
    nextTrack,
    prevTrack,
    nextStation,
    prevStation,
    radioTrack,
    activeTracks,
    radioMuted,
    setRadioMuted,
    audioRef,
    dialPct,
    setDialPct,
    dialFreq,
    hoverTier,
  }
}
