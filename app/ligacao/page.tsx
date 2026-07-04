"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

export default function LigacaoPage() {
  const router = useRouter()
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(false)
  const [isKeypadOpen, setIsKeypadOpen] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [isEnding, setIsEnding] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isActive])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleEndCall = useCallback(() => {
    setIsEnding(true)
    setIsActive(false)
    setTimeout(() => {
      setCallDuration(0)
      setIsMuted(false)
      setIsSpeakerOn(false)
      setIsKeypadOpen(false)
      setIsEnding(false)
      setIsActive(true)
    }, 800)
  }, [])

  const simulateHaptic = () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10)
    }
  }

  const handleButtonPress = (action: () => void) => {
    simulateHaptic()
    action()
  }

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] bg-gradient-to-b from-[#1C1C1E] to-black" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-x-hidden">
      <div
        className={`w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] bg-gradient-to-b from-[#1C1C1E] to-black flex flex-col transition-opacity duration-500 ${
          isEnding ? "opacity-0" : "opacity-100"
        }`}
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
          paddingTop: "env(safe-area-inset-top, 44px)",
          paddingBottom: "env(safe-area-inset-bottom, 34px)",
          paddingLeft: "env(safe-area-inset-left, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
        }}
      >
        {/* iPhone Notch */}
        <div className="relative z-20 h-[54px] flex items-center justify-center flex-shrink-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[126px] h-[34px] bg-black rounded-b-[18px]" />
        </div>

        {/* Home button */}
        <button type="button" onClick={() => router.push("/?screen=home")} className="absolute top-[42px] left-3 z-30 w-9 h-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center" aria-label="Voltar para inicio">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
        </button>

        {/* Status Bar */}
        <div className="h-[44px] flex items-center justify-between px-6 text-white text-sm">
          <span className="font-semibold">9:41</span>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24">
              <path d="M2 17h2v4H2zm5-5h2v9H7zm5-5h2v14h-2zm5-5h2v19h-2z" />
            </svg>
            <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24">
              <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
            </svg>
            <svg className="w-6 h-4" fill="white" viewBox="0 0 24 24">
              <rect x="2" y="7" width="18" height="10" rx="2" stroke="white" strokeWidth="1" fill="none" />
              <rect x="4" y="9" width="12" height="6" rx="1" fill="white" />
              <path d="M21 10v4c1 0 1.5-.5 1.5-2s-.5-2-1.5-2z" fill="white" />
            </svg>
          </div>
        </div>

        {/* Caller Info */}
        <div className="flex-1 flex flex-col items-center justify-start pt-8 animate-[fadeIn_300ms_ease-in-out]">
          {/* Profile Picture */}
          <div className="w-[120px] h-[120px] rounded-full bg-gradient-to-br from-[#3a3a3c] to-[#2c2c2e] flex items-center justify-center mb-4 overflow-hidden">
            <svg className="w-16 h-16 text-[#8e8e93]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>

          {/* Caller Name */}
          <h1 className="text-white text-[32px] font-semibold mb-1">D-Bee</h1>

          {/* Call Type */}
          <p className="text-[#A0A0A0] text-[16px] font-normal mb-2">mobile</p>

          {/* Timer */}
          <p
            className="text-white text-[20px] font-light"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatTime(callDuration)}
          </p>
        </div>

        {/* Keypad Overlay */}
        {isKeypadOpen && (
          <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-10 animate-[fadeIn_200ms_ease-in-out]">
            <div className="grid grid-cols-3 gap-4 mb-8">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((key) => (
                <button
                  key={key}
                  className="w-[72px] h-[72px] rounded-full bg-[#333333] flex flex-col items-center justify-center text-white active:scale-95 transition-transform"
                  onClick={() => simulateHaptic()}
                  aria-label={`Tecla ${key}`}
                >
                  <span className="text-[28px] font-light">{key}</span>
                  {key !== "*" && key !== "#" && key !== "0" && (
                    <span className="text-[10px] text-[#8e8e93] tracking-widest">
                      {key === "1"
                        ? ""
                        : key === "2"
                          ? "ABC"
                          : key === "3"
                            ? "DEF"
                            : key === "4"
                              ? "GHI"
                              : key === "5"
                                ? "JKL"
                                : key === "6"
                                  ? "MNO"
                                  : key === "7"
                                    ? "PQRS"
                                    : key === "8"
                                      ? "TUV"
                                      : "WXYZ"}
                    </span>
                  )}
                  {key === "0" && <span className="text-[10px] text-[#8e8e93]">+</span>}
                </button>
              ))}
            </div>
            <button
              className="text-[#007AFF] text-[17px] font-normal"
              onClick={() => setIsKeypadOpen(false)}
              aria-label="Ocultar teclado"
            >
              Ocultar
            </button>
          </div>
        )}

        {/* Action Buttons Grid */}
        <div className="px-8 pb-4">
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* Mute */}
            <button
              className={`flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform min-w-[44px] min-h-[44px]`}
              onClick={() => handleButtonPress(() => setIsMuted(!isMuted))}
              aria-label={isMuted ? "Ativar som" : "Silenciar"}
            >
              <div
                className={`w-[64px] h-[64px] rounded-full flex items-center justify-center transition-colors ${
                  isMuted ? "bg-white" : "bg-[#48484A]"
                }`}
              >
                <svg
                  className={`w-7 h-7 ${isMuted ? "text-black" : "text-white"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 19L5 5m14 0v6a2 2 0 01-2 2h-1m-7.5 7.5A5 5 0 0112 19v-1m0 0a5 5 0 01-5-5V8m5 10v2m-3 0h6"
                  />
                  {!isMuted && (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
                    />
                  )}
                </svg>
              </div>
              <span className={`text-xs ${isMuted ? "text-white" : "text-white"}`}>mudo</span>
            </button>

            {/* Keypad */}
            <button
              className="flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform min-w-[44px] min-h-[44px]"
              onClick={() => handleButtonPress(() => setIsKeypadOpen(true))}
              aria-label="Abrir teclado"
            >
              <div className="w-[64px] h-[64px] rounded-full bg-[#48484A] flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="6" cy="6" r="1.5" />
                  <circle cx="12" cy="6" r="1.5" />
                  <circle cx="18" cy="6" r="1.5" />
                  <circle cx="6" cy="12" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="18" cy="12" r="1.5" />
                  <circle cx="6" cy="18" r="1.5" />
                  <circle cx="12" cy="18" r="1.5" />
                  <circle cx="18" cy="18" r="1.5" />
                </svg>
              </div>
              <span className="text-white text-xs">teclado</span>
            </button>

            {/* Speaker */}
            <button
              className="flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform min-w-[44px] min-h-[44px]"
              onClick={() => handleButtonPress(() => setIsSpeakerOn(!isSpeakerOn))}
              aria-label={isSpeakerOn ? "Desativar alto-falante" : "Ativar alto-falante"}
            >
              <div
                className={`w-[64px] h-[64px] rounded-full flex items-center justify-center transition-colors ${
                  isSpeakerOn ? "bg-white" : "bg-[#48484A]"
                }`}
              >
                <svg
                  className={`w-7 h-7 ${isSpeakerOn ? "text-black" : "text-white"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                  />
                </svg>
              </div>
              <span className="text-white text-xs">áudio</span>
            </button>

            {/* Add Call */}
            <button
              className="flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform min-w-[44px] min-h-[44px]"
              onClick={() => handleButtonPress(() => {})}
              aria-label="Adicionar chamada"
            >
              <div className="w-[64px] h-[64px] rounded-full bg-[#48484A] flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <span className="text-white text-xs">adicionar</span>
            </button>

            {/* FaceTime */}
            <button
              className="flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform min-w-[44px] min-h-[44px]"
              onClick={() => handleButtonPress(() => {})}
              aria-label="FaceTime"
            >
              <div className="w-[64px] h-[64px] rounded-full bg-[#48484A] flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
              </div>
              <span className="text-white text-xs">FaceTime</span>
            </button>

            {/* Contacts */}
            <button
              className="flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform min-w-[44px] min-h-[44px]"
              onClick={() => handleButtonPress(() => {})}
              aria-label="Contatos"
            >
              <div className="w-[64px] h-[64px] rounded-full bg-[#48484A] flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
              </div>
              <span className="text-white text-xs">contatos</span>
            </button>
          </div>

          {/* End Call Button */}
          <div className="flex justify-center pb-8">
            <button
              className="w-[72px] h-[72px] rounded-full bg-[#FF3B30] flex items-center justify-center active:scale-95 transition-transform"
              onClick={handleEndCall}
              aria-label="Encerrar chamada"
            >
              <svg className="w-8 h-8 text-white rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
