"use client"

import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import { useRouter } from "next/navigation"
import { Shield, Check, ChevronRight } from "lucide-react"

export function ConfirmationOverlay() {
  const { state, getNextConfirmation } = useGameFunnel()
  const router = useRouter()
  
  const nextConfirmation = getNextConfirmation()
  const isValidated = state.identityValidated
  
  // Don't show if flow hasn't started or we're on a confirmation page
  if (!state.flowStarted) return null
  
  // Don't show during certain cinematic steps
  const hideOverlaySteps = [
    "idle",
    "incoming-call",
    "active-call",
    "hacker-takeover",
    "spotify-auto",
    "confirmation-1",
    "confirmation-2",
    "confirmation-3",
    "sala-branca",
    "completed",
  ]
  
  if (hideOverlaySteps.includes(state.cinematicStep)) return null

  const handleEnterConfirmation = () => {
    if (nextConfirmation === 1) {
      router.push("/confirmacao/1-arquetipos")
    } else if (nextConfirmation === 2) {
      router.push("/confirmacao/2-colunas")
    } else if (nextConfirmation === 3) {
      router.push("/confirmacao/3-desbloqueio")
    }
  }

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-32px)] max-w-[360px]">
      <div
        className={`
          relative overflow-hidden rounded-2xl backdrop-blur-xl
          ${isValidated 
            ? "bg-emerald-500/20 border border-emerald-500/40" 
            : "bg-white/10 border border-white/20"
          }
          shadow-2xl shadow-black/50
        `}
      >
        {/* Animated glow effect */}
        {!isValidated && (
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 animate-pulse" />
        )}
        
        <div className="relative p-4">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Icon + Status */}
            <div className="flex items-center gap-3">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${isValidated 
                    ? "bg-emerald-500/30" 
                    : "bg-gradient-to-br from-cyan-500/30 to-purple-500/30"
                  }
                `}
              >
                {isValidated ? (
                  <Check className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Shield className="w-5 h-5 text-white" />
                )}
              </div>
              
              <div>
                <p className="text-white font-medium text-sm">
                  Confirmação ({state.confirmationCount}/3)
                </p>
                <p className="text-white/60 text-xs">
                  {isValidated 
                    ? "Identidade validada" 
                    : `Etapa ${nextConfirmation} pendente`
                  }
                </p>
              </div>
            </div>
            
            {/* Right: Action Button */}
            {!isValidated && (
              <button
                type="button"
                onClick={handleEnterConfirmation}
                className="
                  flex items-center gap-1 px-3 py-2 rounded-xl
                  bg-gradient-to-r from-cyan-500 to-purple-500
                  text-white text-xs font-semibold
                  hover:from-cyan-400 hover:to-purple-400
                  active:scale-95 transition-all duration-200
                  min-h-[44px] min-w-[44px]
                "
              >
                <span className="hidden sm:inline">Entrar</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Progress bar */}
          <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isValidated 
                  ? "bg-emerald-500" 
                  : "bg-gradient-to-r from-cyan-500 to-purple-500"
              }`}
              style={{ width: `${(state.confirmationCount / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
