import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { GameFunnelProvider } from './providers/GameFunnelProvider'
import { AudioPlayerProvider } from './providers/AudioPlayerProvider'
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
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
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
        <GameFunnelProvider>
          <AudioPlayerProvider>
            {children}
          </AudioPlayerProvider>
        </GameFunnelProvider>
        <Analytics />
      </body>
    </html>
  )
}
