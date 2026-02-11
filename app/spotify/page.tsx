"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SpotifyPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace("/spotify/auto-chuva")
  }, [router])

  return <div className="min-h-screen bg-black" />
}
