"use client"

// Um pedaço da cena que pode falhar num aparelho (a lente de cinema, a
// cabine, o metrô) não derruba o jogo inteiro: se ele estourar, some só ele
// e o resto segue. O erro vai pro console (e pro PostHog, se ligado).

import { Component, type ReactNode } from "react"
import posthog from "posthog-js"

export class Seguro extends Component<{ nome: string; children: ReactNode; reserva?: ReactNode }, { erro: boolean }> {
  state = { erro: false }
  static getDerivedStateFromError() {
    return { erro: true }
  }
  componentDidCatch(error: Error) {
    console.error(`[cidade-neon] ${this.props.nome} falhou e foi desligado:`, error)
    try {
      posthog.captureException(error, { pedaco: this.props.nome })
    } catch {}
  }
  render() {
    return this.state.erro ? (this.props.reserva ?? null) : this.props.children
  }
}
