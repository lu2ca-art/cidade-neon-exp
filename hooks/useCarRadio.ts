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

  // Refs "vivos" pra ler o valor mais recente dentro do listener sem
  // recriar o listener a cada mudança (o que gerava racing e faixa repetida).
  const activeTierRef = useRef(activeTier)
  const currentTrackIdxRef = useRef(currentTrackIdx)
  useEffect(() => { activeTierRef.current = activeTier }, [activeTier])
  useEffect(() => { currentTrackIdxRef.current = currentTrackIdx }, [currentTrackIdx])

  // Auto-avanço quando a faixa termina — SORTEIA próximo idx diferente do
  // atual (sem fila persistente; simples e robusto).
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onEnded = () => {
      const tier = activeTierRef.current
      const tracks = TRACKS_BY_TIER[tier]
      const n = tracks.length
      if (n === 0) return
      if (n === 1) {
        // Só 1 faixa no tier — reinicia
        el.currentTime = 0
        el.play().catch(() => {})
        return
      }
      // n >= 2: sorteia idx diferente da atual
      const cur = currentTrackIdxRef.current
      let next = Math.floor(Math.random() * (n - 1))
      if (next >= cur) next += 1  // pula o cur → distribuição uniforme entre os n-1 restantes
      setCurrentTrackIdx(next)
    }
    el.addEventListener("ended", onEnded)
    return () => el.removeEventListener("ended", onEnded)
  }, [])

  // Ao mudar de tier: escolhe faixa inicial aleatória
  useEffect(() => {
    const n = TRACKS_BY_TIER[activeTier].length
    setCurrentTrackIdx(n > 0 ? Math.floor(Math.random() * n) : 0)
  }, [activeTier])

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
