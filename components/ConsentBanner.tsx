"use client"

import { Button } from "@/components/ui/button"
import { useAnalyticsConsent } from "./PostHogProvider"

export function ConsentBanner() {
  const { consent, setConsent } = useAnalyticsConsent()

  if (consent !== null) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] flex flex-col gap-3 border-t border-white/10 bg-black/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-white/70 sm:max-w-md">
        Usamos analytics pra entender como a experiência é jogada — sem
        rastrear você fora daqui. Você pode aceitar tudo ou só o essencial.
      </p>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="outline" onClick={() => setConsent("essential")}>
          Só o essencial
        </Button>
        <Button size="sm" onClick={() => setConsent("full")}>
          Ok
        </Button>
      </div>
    </div>
  )
}
