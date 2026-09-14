import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { GameFunnelProvider } from './providers/GameFunnelProvider'
import { AudioPlayerProvider } from './providers/AudioPlayerProvider'
import { PostHogProvider } from '@/components/PostHogProvider'
import { ConsentBanner } from '@/components/ConsentBanner'
import './globals.css'

const geistSans = Geist({ 
  subsets: ["latin"],
  variable: "--font-geist-sans"
})
const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  variable: "--font-geist-mono"
})

export const metadata: Metadata = {
  title: 'CIDADE NEON - Experiência Imersiva',
  description: 'Uma experiência interativa imersiva na Cidade Neon',
  // As referências antigas (icon-light/dark-32x32.png, apple-icon.png)
  // apontavam pra arquivos que não existem em public/ — 404 silencioso.
  // Só existe public/icon.svg de verdade; usando ele nos dois até
  // termos PNGs reais em 192/512 pro manifest PWA (ver roadmap-tecnico).
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-black`}>
        <PostHogProvider>
          <GameFunnelProvider>
            <AudioPlayerProvider>
              {children}
            </AudioPlayerProvider>
          </GameFunnelProvider>
          <ConsentBanner />
        </PostHogProvider>
        <Analytics />
      </body>
    </html>
  )
}
