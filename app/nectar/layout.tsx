import type { ReactNode } from "react"
import { Barlow_Condensed, Newsreader } from "next/font/google"

const condensada = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-cond" })
const serifa = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-serifa" })

export default function NectarLayout({ children }: { children: ReactNode }) {
  return <div className={`${condensada.variable} ${serifa.variable}`}>{children}</div>
}
