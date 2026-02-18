"use client"

import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import { useRouter, useParams } from "next/navigation"
import { useEffect } from "react"

const REWARD_DATA: Record<string, {
  name: string
  avatar: string
  color: string
  reward: string
  link: string
  enigmaticMsg: string
}> = {
  nizzy: {
    name: "Nizzy",
    avatar: "N",
    color: "#FF6B6B",
    reward: "Instrumental Cidade Neon",
    link: "https://untitled.stream/library/project/xss93AFmqBYaNqTMb5gDU",
    enigmaticMsg: "a estrutura da cidade neon ta nas tuas maos agora. faz o que quiser com ela.",
  },
  dbee: {
    name: "D-Bee",
    avatar: "D",
    color: "#6B7FD7",
    reward: "Suburbio Xenom",
    link: "https://untitled.stream/library/project/K4Sh04mZhmvSQmJGyW3yw",
    enigmaticMsg: "desbloqueei algo que tava escondido nas frequencias. so quem passou enxerga isso.",
  },
  alohan: {
    name: "Alohan",
    avatar: "A",
    color: "#4ECDC4",
    reward: "Live Neon",
    link: "https://untitled.stream/library/project/TcgmYSll5sI9VfDorJbNA",
    enigmaticMsg: "a energia daquela noite ficou gravada. agora ela e sua pra sempre.",
  },
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
          <button type="button" onClick={() => router.push("/")} className="p-2" aria-label="Voltar para inicio">
            <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
          </button>
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3" style={{ backgroundColor: "#0B141A" }}>
          {/* Enigmatic message */}
          <div className="flex justify-start">
            <div className="bg-[#202C33] rounded-lg rounded-tl-none px-3 py-2 max-w-[85%]">
              <p className="text-[11px] font-medium mb-1" style={{ color: data.color }}>{data.name}</p>
              <p className="text-[#E9EDEF] text-sm leading-relaxed">{data.enigmaticMsg}</p>
              <p className="text-[#667781] text-[10px] text-right mt-1">agora</p>
            </div>
          </div>

          {/* Reward card with link */}
          <div className="flex justify-start">
            <a
              href={data.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-[#202C33] rounded-lg rounded-tl-none px-3 py-2 max-w-[85%] active:bg-[#2A363D] transition-colors"
            >
              <p className="text-[11px] font-medium mb-2" style={{ color: data.color }}>{data.name}</p>
              {/* Reward preview card */}
              <div className="bg-[#111B21] rounded-lg overflow-hidden border border-white/5">
                <div className="h-16 flex items-center justify-center" style={{ backgroundColor: `${data.color}15` }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${data.color}30` }}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={data.color} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  </div>
                </div>
                <div className="px-3 py-2">
                  <p className="text-white text-sm font-medium">{data.reward}</p>
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
