"use client"

import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import { useRouter } from "next/navigation"
import { SCRIPTS, phaseFor, type MemberKey } from "@/app/n3xo/privado/[member]/page"

// Ordem cronológica real da história — Alohan fala primeiro (desde cc=0),
// Nizzy entra depois que o teste 1 termina, D-Bee depois do teste 2. Antes
// disso o membro simplesmente não aparece: não tem nada esperando ainda.
const MEMBER_ORDER: MemberKey[] = ["alohan", "nizzy", "dbee"]
const VISIBLE_FROM_CC: Record<MemberKey, number> = { alohan: 0, nizzy: 1, dbee: 2 }
const AVATARS: Record<MemberKey, { avatar: string; color: string }> = {
  alohan: { avatar: "A", color: "#4ECDC4" },
  nizzy: { avatar: "N", color: "#FF6B6B" },
  dbee: { avatar: "D", color: "#6B7FD7" },
}

export default function N3xoHome() {
  const { state } = useGameFunnel()
  const router = useRouter()
  const cc = state.confirmationCount

  const privateChats = MEMBER_ORDER
    .filter(key => cc >= VISIBLE_FROM_CC[key])
    .map(key => {
      const phase = phaseFor(key, cc)
      const script = SCRIPTS[key]
      const phaseMessages = phase === "pre" ? script.preMission.messages : phase === "reward" ? script.reward.messages : script.done.messages
      return {
        key,
        name: script.name,
        lastMsg: phaseMessages[phaseMessages.length - 1],
        isNew: !state.rewardsViewed.includes(`${key}:${phase}`),
      }
    })

  return (
    <div className="h-dvh bg-[#111B21] flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] flex flex-col relative bg-[#111B21] overflow-hidden">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />

        {/* Status bar */}
        <div className="h-[50px] flex items-end justify-between px-6 pb-1 text-white/60 text-xs flex-shrink-0">
          <span className="font-semibold w-12">9:41</span>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-3" fill="white" viewBox="0 0 16 12"><rect x="0" y="6" width="3" height="6" rx="0.5" /><rect x="4.5" y="4" width="3" height="8" rx="0.5" /><rect x="9" y="1" width="3" height="11" rx="0.5" /><rect x="13" y="0" width="3" height="12" rx="0.5" opacity="0.3" /></svg>
            <svg className="w-6 h-3" fill="white" viewBox="0 0 25 12"><rect x="0" y="1" width="22" height="10" rx="2" stroke="white" strokeWidth="1" fill="none" /><rect x="1.5" y="2.5" width="16" height="7" rx="1" fill="white" /><rect x="23" y="4" width="2" height="4" rx="0.5" fill="white" opacity="0.4" /></svg>
          </div>
        </div>

        {/* Header */}
        <div className="bg-[#1F2C34] px-4 py-3 flex items-center justify-between flex-shrink-0">
          <button type="button" onClick={() => router.push("/?screen=home")} className="text-[#00A884]">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <h1 className="text-white text-xl font-bold flex-1 ml-4">N3XO</h1>
          <svg className="w-5 h-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {/* Group Chat */}
          <button
            type="button"
            onClick={() => router.push("/n3xo/grupo")}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/5"
          >
            <div className="w-12 h-12 rounded-full bg-[#00A884] flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between">
                <span className="text-white font-semibold text-[15px]">Cidade Neon</span>
                <span className="text-[#00A884] text-xs">agora</span>
              </div>
              <p className="text-white/50 text-sm truncate">
                {state.unlocked.finalCompleted ? "registro completo — sinal estavel" : "sinal instavel — toque pra ver"}
              </p>
            </div>
            <div className="w-5 h-5 rounded-full bg-[#00A884] flex items-center justify-center flex-shrink-0">
              <span className="text-[#111B21] text-[10px] font-bold">!</span>
            </div>
          </button>

          {/* Private Chats (rewards) */}
          {privateChats.map(({ key, name, lastMsg, isNew }) => {
            const { avatar, color } = AVATARS[key]
            return (
              <button
                key={key}
                type="button"
                onClick={() => router.push(`/n3xo/privado/${key}`)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/5"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color }}>
                  <span className="text-white font-bold text-lg">{avatar}</span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold text-[15px]">{name}</span>
                    <span className={`text-xs ${isNew ? "text-[#00A884]" : "text-white/30"}`}>agora</span>
                  </div>
                  <p className="text-white/50 text-sm truncate">{lastMsg}</p>
                </div>
                {isNew && (
                  <div className="w-5 h-5 rounded-full bg-[#00A884] flex items-center justify-center flex-shrink-0">
                    <span className="text-[#111B21] text-[10px] font-bold">1</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Bottom nav */}
        <div className="h-[50px] bg-[#1F2C34] flex items-center justify-around flex-shrink-0 border-t border-white/5">
          <div className="flex flex-col items-center gap-0.5">
            <svg className="w-5 h-5 text-[#00A884]" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
            <span className="text-[#00A884] text-[10px]">Conversas</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-white/40 text-[10px]">Atualizacoes</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
            <span className="text-white/40 text-[10px]">Ligacoes</span>
          </div>
        </div>

        {/* Home indicator */}
        <div className="flex justify-center py-1 bg-[#1F2C34]"><div className="w-32 h-1 bg-white/20 rounded-full" /></div>
      </div>
    </div>
  )
}
