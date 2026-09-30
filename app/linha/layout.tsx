import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import { Barlow_Condensed } from "next/font/google"

// condensada pesada pros títulos médios — a Outward (identidade do Vol.1)
// fica só nos títulos grandes, onde ela respira
const condensada = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-cond" })

export const metadata: Metadata = {
  title: "Cidade Neon · Linha 222",
  description: "a cidade tá alagada de neon. tem gente acordada ainda.",
  openGraph: {
    title: "Cidade Neon · Linha 222",
    description: "qual estação você é?",
    images: ["/linha/capa-1800.jpg"],
  },
}

export const viewport: Viewport = {
  themeColor: "#0a0918",
}

export default function LinhaLayout({ children }: { children: ReactNode }) {
  return <div className={condensada.variable}>{children}</div>
}
