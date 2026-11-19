"use client"

// Um pedaço da cena que pode falhar num aparelho (a lente de cinema, a
// cabine, o metrô) não derruba o jogo inteiro: se ele estourar, some só ele
// e o resto segue. O erro vai pro console (e pro PostHog, se ligado).

import { Component, Suspense, type ReactNode } from "react"
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

/**
 * Para todo pedaço da cena que carrega um .glb (useGLTF suspende e lança no 404):
 * Suspense local (a suspensão não sobe pro Canvas) + Seguro (erro de rede não
 * derruba a cena). `reserva` é o procedural: aparece enquanto baixa (a menos que
 * `enquanto` seja dado; `enquanto={null}` = nada) e se falhar.
 */
export function ModeloSeguro({ nome, reserva, enquanto, children }: { nome: string; reserva?: ReactNode; enquanto?: ReactNode; children: ReactNode }) {
  return (
    <Seguro nome={nome} reserva={reserva}>
      <Suspense fallback={enquanto === undefined ? (reserva ?? null) : enquanto}>{children}</Suspense>
    </Seguro>
  )
}
