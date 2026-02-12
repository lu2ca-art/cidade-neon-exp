"use client"

import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState, useRef } from "react"

const REWARD_DATA: Record<string, { name: string; avatar: string; color: string; reward: string; description: string; audioLabel: string }> = {
  nizzy: { name: "Nizzy", avatar: "N", color: "#F59E0B", reward: "Instrumentais do Disco", description: "Fala! Depois daquela confirmacao, eu liberei os instrumentais completos do disco pra voce. Usa como quiser, faz remix, canta por cima... e tudo seu.", audioLabel: "instrumentais_cidade_neon.wav" },
  alohan: { name: "Alohan", avatar: "A", color: "#06B6D4", reward: "Suburbio Xenom", description: "E ai! Mandei de presente o Suburbio Xenom. E um projeto paralelo que tava guardado, agora e seu. Aproveita!", audioLabel: "suburbio_xenom_full.wav" },
  dbee: { name: "D-Bee", avatar: "D", color: "#A78BFA", reward: "Live Set Completo", description: "Salve! Ganhei o live set completo da Cidade Neon pra voce. A energia daquela noite ta toda ai dentro. Bota pra tocar!", audioLabel: "live_set_cidade_neon.wav" },
}

function AudioMessage({ label }: { label: string }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const togglePlay = () => {
    if (playing) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setPlaying(false)
    } else {
      setPlaying(true)
      intervalRef.current = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            setPlaying(false)
            return 0
          }
          return p + 1
        })
      }, 80)
    }
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  // Generate random waveform bars
  const bars = Array(32).fill(0).map(() => 0.2 + Math.random() * 0.8)

  return (
    <div className="bg-[#005C4B] rounded-lg p-3 max-w-[85%]">
      <div className="flex items-center gap-2">
        <button type="button" onClick={togglePlay} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          {playing ? (
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          ) : (
            <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>
        <div className="flex-1 flex items-end gap-[2px] h-6">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-full transition-colors duration-100"
              style={{
                height: `${h * 100}%`,
                backgroundColor: (i / bars.length) * 100 <= progress ? "white" : "rgba(255,255,255,0.3)",
              }}
            />
          ))}
        </div>
      </div>
      <p className="text-white/40 text-[10px] mt-1.5">{label}</p>
    </div>
  )
}

export default function PrivadoPage() {
  const { state, markRewardViewed } = useGameFunnel()
  const router = useRouter()
  const params = useParams()
  const member = params.member as string
  const data = REWARD_DATA[member]

  useEffect(() => {
    if (data) markRewardViewed(member)
  }, [data, member, markRewardViewed])

  if (!data) {
    router.push("/whatsapp")
    return null
  }

  return (
    <div className="min-h-screen bg-[#0B141A] flex items-center justify-center">
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col relative">
  {/* Notch */}
  <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />

  {/* Home button */}
  <button type="button" onClick={() => router.push("/")} className="absolute top-[42px] right-3 z-40 w-9 h-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center" aria-label="Voltar para inicio">
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
  </button>
  
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
          <button type="button" onClick={() => router.push("/whatsapp")} className="p-1">
            <svg className="w-6 h-6 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: data.color }}>
            <span className="text-white font-bold text-sm">{data.avatar}</span>
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">{data.name}</p>
            <p className="text-white/40 text-xs">online</p>
          </div>
        </div>

        {/* Chat bg */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2" style={{ backgroundColor: "#0B141A" }}>
          {/* Their message */}
          <div className="flex justify-start">
            <div className="bg-[#1F2C34] rounded-lg px-3 py-2 max-w-[85%]">
              <p className="text-white text-sm leading-relaxed">{data.description}</p>
              <p className="text-white/30 text-[10px] text-right mt-1">agora</p>
            </div>
          </div>

          {/* Audio reward */}
          <div className="flex justify-start">
            <AudioMessage label={data.audioLabel} />
          </div>

          {/* Download prompt */}
          <div className="flex justify-start">
            <div className="bg-[#1F2C34] rounded-lg px-3 py-2 max-w-[85%]">
              <p className="text-white text-sm">Clica ai pra salvar</p>
              <div className="mt-2 bg-white/5 rounded-lg p-2.5 flex items-center gap-2">
                <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                </div>
                <div>
                  <p className="text-white text-xs font-medium">{data.reward}</p>
                  <p className="text-white/30 text-[10px]">Toque para baixar</p>
                </div>
              </div>
              <p className="text-white/30 text-[10px] text-right mt-1">agora</p>
            </div>
          </div>
        </div>

        {/* Input bar */}
        <div className="bg-[#1F2C34] px-3 py-2 flex items-center gap-2 flex-shrink-0">
          <div className="flex-1 bg-[#2A3942] rounded-full px-4 py-2">
            <span className="text-white/30 text-sm">Mensagem</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#00A884] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 15c1.66 0 2.99-1.34 2.99-3L15 6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
          </div>
        </div>
        <div className="flex justify-center py-1 bg-[#1F2C34]"><div className="w-32 h-1 bg-white/20 rounded-full" /></div>
      </div>
    </div>
  )
}
