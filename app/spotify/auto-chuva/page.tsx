"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import { ALL_TIERS, TIER_META } from "@/lib/radio-tiers"

// FREQ é só a galeria de recompensas: os 4 projetos que a pessoa recebe
// conforme vai sintonizando cada frequência no SINT0NIA (o "now playing" de
// verdade — o que está tocando no rádio agora — vive no SINT0NIA, não aqui).
const ACCENT = "#00ff9c"

export default function FrequenciaPage() {
  const router = useRouter()
  const { updateCinematicStep, updateSpotifyState, state } = useGameFunnel()

  const advanced = useRef(false)
  const isFirst = useRef(!state.perAppState.spotifyAuto.completed)

  useEffect(() => { updateCinematicStep("spotify-auto") }, [updateCinematicStep])

  // avança sozinho pro N3XO depois de um tempo navegando a galeria — sem
  // notificação falsa de WhatsApp aparecendo em cima da tela (não fazia
  // sentido uma notificação de mensagem surgir enquanto a pessoa tá numa
  // galeria de projetos; a transição em si continua a mesma)
  useEffect(() => {
    if (!isFirst.current || advanced.current) return
    const t = setTimeout(() => {
      advanced.current = true
      isFirst.current = false
      updateSpotifyState({ completed: true })
      updateCinematicStep("whatsapp-notification")
      router.push("/n3xo/grupo")
    }, 13000)
    return () => clearTimeout(t)
  }, [router, updateCinematicStep, updateSpotifyState])

  const nextLocked = ALL_TIERS.find(t => !state.radioAccepted[t])

  return (
    <div className="h-dvh bg-black flex items-center justify-center touch-manipulation select-none overflow-hidden">
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] relative flex flex-col overflow-hidden" style={{ background: "#040a08" }}>
        {/* notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />
        {/* status bar */}
        <div className="relative z-20 h-[50px] flex items-end justify-between px-6 pb-1 text-white text-xs flex-shrink-0">
          <span className="font-semibold w-12">9:41</span>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-3" fill="white" viewBox="0 0 16 12"><rect x="0" y="6" width="3" height="6" rx="0.5"/><rect x="4.5" y="4" width="3" height="8" rx="0.5"/><rect x="9" y="1" width="3" height="11" rx="0.5"/><rect x="13" y="0" width="3" height="12" rx="0.5" opacity="0.3"/></svg>
            <svg className="w-6 h-3" fill="white" viewBox="0 0 25 12"><rect x="0" y="1" width="22" height="10" rx="2" stroke="white" strokeWidth="1" fill="none"/><rect x="1.5" y="2.5" width="16" height="7" rx="1" fill="white"/><rect x="23" y="4" width="2" height="4" rx="0.5" fill="white" opacity="0.4"/></svg>
          </div>
        </div>

        {/* GALERIA — os 4 projetos que a sintonia libera */}
        <div className="flex-1 flex flex-col overflow-y-auto overscroll-contain">
          <div className="sticky top-0 z-10 backdrop-blur flex items-center justify-between px-3 py-3" style={{ background: "#040a08f2" }}>
            <button type="button" onClick={() => router.push("/?screen=home")} aria-label="Voltar"
              className="w-10 h-10 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform" style={{ background: `${ACCENT}14` }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7"/></svg>
            </button>
            <p className="font-mono text-xs tracking-[0.2em]" style={{ color: `${ACCENT}99` }}>PROJETOS</p>
            <div className="w-10" />
          </div>
          <div className="px-5 pt-4 pb-2">
            <h1 className="text-white text-2xl font-bold tracking-tight">GALERIA</h1>
            <p className="text-sm mt-1 font-mono" style={{ color: `${ACCENT}77` }}>
              cada frequência sintonizada libera o projeto correspondente
            </p>
          </div>
          <div className="px-4 pt-3 pb-8 flex flex-col gap-3">
            {ALL_TIERS.map(tier => {
              const meta = TIER_META[tier]
              const unlockedTier = state.radioAccepted[tier]
              return (
                <div key={tier} className="rounded-2xl overflow-hidden border" style={{ borderColor: unlockedTier ? `${meta.color}55` : `${ACCENT}18`, background: "#0a1512" }}>
                  <div className="h-20 flex items-center justify-center relative" style={{ background: unlockedTier ? `${meta.color}18` : "rgba(255,255,255,0.02)" }}>
                    <span className="font-mono text-2xl font-bold tracking-tight" style={{ color: unlockedTier ? meta.color : `${ACCENT}33` }}>
                      {meta.freq} FM
                    </span>
                    {!unlockedTier && (
                      <div className="absolute top-2 right-3">
                        <svg width="16" height="16" fill={`${ACCENT}55`} viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-3.1 0H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/></svg>
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-white text-[15px] font-semibold">{unlockedTier ? meta.projectName : "??????????"}</p>
                    <p className="text-xs font-mono mt-0.5" style={{ color: `${ACCENT}55` }}>
                      {unlockedTier ? "untitled.stream" : tier === nextLocked ? "libera na próxima sintonia" : "bloqueado"}
                    </p>
                    {unlockedTier ? (
                      <a href={meta.projectLink} target="_blank" rel="noopener noreferrer"
                        className="mt-3 flex items-center gap-1.5 text-sm font-semibold" style={{ color: meta.color }}>
                        {meta.projectKind === "buy" ? "comprar no [UNTITLED]" : "ouvir no [UNTITLED]"}
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                      </a>
                    ) : (
                      <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: `${ACCENT}14` }}>
                        <div className="h-full rounded-full" style={{ width: "0%", background: meta.color }} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
