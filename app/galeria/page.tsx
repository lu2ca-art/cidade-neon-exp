"use client"

import dynamic from "next/dynamic"

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
  return <GaleriaScene />
}
