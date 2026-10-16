"use client"

// /cidade: o motor do mapa livre (etapa 2), pra ver a cidade nascer. Ainda
// solto do jogo: nada leva até aqui.
import dynamic from "next/dynamic"

const Jogo = dynamic(() => import("./Jogo").then((m) => m.Jogo), {
  ssr: false,
  loading: () => <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "#1a0b33", color: "#ffc857", fontFamily: "ui-monospace, monospace" }}>a cidade está nascendo…</div>,
})

export default function Page() {
  return <Jogo />
}
