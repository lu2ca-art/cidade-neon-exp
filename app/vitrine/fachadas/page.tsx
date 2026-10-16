"use client"

// /vitrine/fachadas: cada lugar da cidade com a cara dele, pra o LU2CA ver
// e aprovar antes de entrar no mapa. Aberta (sem login), fora do jogo.
import dynamic from "next/dynamic"

const Vitrine = dynamic(() => import("./Vitrine").then((m) => m.Vitrine), {
  ssr: false,
  loading: () => <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "#120e22", color: "#ffc857", fontFamily: "ui-monospace, monospace" }}>montando as fachadas…</div>,
})

export default function Page() {
  return <Vitrine />
}
