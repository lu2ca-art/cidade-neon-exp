"use client"

import { useEffect, type ReactNode } from "react"
import { useAudioPlayer } from "@/app/providers/AudioPlayerProvider"
import { sendCarRadioMute } from "@/app/providers/AudioBridge"
import { CurrentSongProvider } from "./lib/CurrentSongContext"

// Layout do App Router não remonta entre rotas irmãs — então o Provider (e a
// única instância do AudioContext dentro dele) sobrevive à navegação entre
// /batida, /batida/bateria, /batida/baixo, /batida/guitarra, /batida/piano,
// /batida/voz e /batida/mixagem.
export default function BatidaLayout({ children }: { children: ReactNode }) {
  const globalAudio = useAudioPlayer()

  useEffect(() => {
    globalAudio.pause()
    sendCarRadioMute(true)
    return () => sendCarRadioMute(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <CurrentSongProvider>{children}</CurrentSongProvider>
}
