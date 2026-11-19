"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { sairDaPagina } from "../linha/paginas"
import { VitrineTrancada, lerTranca } from "../linha/Trancado"

// Code-split o Three.js/R3F pra fora do bundle inicial da rota — esses
// pacotes só carregam quando alguém realmente entra na galeria, não em
// toda navegação. ssr:false porque a cena usa APIs de navegador (canvas,
// PointerLockControls) que não existem no lado do servidor.
const GaleriaScene = dynamic(() => import("./GaleriaScene"), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-screen bg-black flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  ),
})

export default function GaleriaPage() {
  const router = useRouter()
  // (revisão 5) como o /ginasio: com ?tranca= a porta ainda fechada abre só a
  // vitrine (o cadeado e o que libera), sem a cena. undefined = ainda lendo a URL
  const [tranca, setTranca] = useState<string | null | undefined>(undefined)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setTranca(lerTranca()) }, [])
  if (tranca === undefined) return null
  if (tranca) return <VitrineTrancada titulo="galeria" sub="de dia · as paredes esperando quadro" itens={["os quadros", "pintar o seu", "o mercado"]} tranca={tranca} cor="#3d7bff" onSair={() => sairDaPagina(router.push)} />
  return <GaleriaScene />
}
