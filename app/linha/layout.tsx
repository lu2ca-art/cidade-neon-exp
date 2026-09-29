import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"

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
  return children
}
