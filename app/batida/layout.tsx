"use client"

import { useEffect, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { useAudioPlayer } from "@/app/providers/AudioPlayerProvider"
import { sendCarRadioMute } from "@/app/providers/AudioBridge"
import { CurrentSongProvider } from "./lib/CurrentSongContext"

// Layout do App Router não remonta entre rotas irmãs — então o Provider (e a
// única instância do AudioContext dentro dele) sobrevive à navegação entre
// /batida, /batida/bateria, /batida/baixo, /batida/guitarra, /batida/piano,
// /batida/voz e /batida/mixagem.
export default function BatidaLayout({ children }: { children: ReactNode }) {
  const globalAudio = useAudioPlayer()
  const pathname = usePathname()

  useEffect(() => {
    globalAudio.pause()
    sendCarRadioMute(true)
    return () => sendCarRadioMute(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // o estúdio novo (/batida) tem o motor dele; o provedor antigo (que cria um
  // segundo AudioContext com reverb rodando o tempo todo) só nas páginas
  // antigas. Dois contextos juntos pesavam no celular e o som cortava (14/10)
  if (pathname === "/batida") return <>{children}</>
  return <CurrentSongProvider>{children}</CurrentSongProvider>
}
