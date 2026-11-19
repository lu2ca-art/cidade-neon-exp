"use client"

// (05/11) O TUTORIAL DAQUI SAIU DE CENA: quem ensina agora é a trilha de pedras
// (disco/trilhaPedras.ts + TrilhaPedrasTela.tsx), com os mesmos ids no save.
// O componente do tutorial (os passos no notch, o anel em volta do alvo) foi
// tirado (05/11, leveza): ninguém montava mais. Fica o RecompensaHolo
// (desligado em CONFIG_TUTORIAL.recompensa).
//
// - RecompensaHolo: saiu da casa com o holo na mão. Texto grande, o que ganhou e
//   como funciona (J1: 6). O botão "?" fecha.

import { useEffect } from "react"
import { vib } from "../som-carro"
import "./tutorial.css"

// ── a tela de recompensa do holo, lá fora (RASCUNHO dos textos) ──
const COMO: { ic: string; t: string; d: string }[] = [
  { ic: "◉", t: "o mapa", d: "toca: o drone sobe e mostra a cidade de cima, com o caminho aceso" },
  { ic: "▲", t: "o GPS", d: "a barra lá em cima: o ícone no meio, você tá indo certo" },
  { ic: "◌", t: "o anel", d: "gira em volta do mapa: o próximo passo, um de cada vez" },
  { ic: "♪", t: "a rádio e os apps", d: "a música, o B4TIDA, os jogos: tudo mora nele" },
]
export function RecompensaHolo({ onSeguir }: { onSeguir: () => void }) {
  useEffect(() => {
    vib([30, 50, 30])
    const k = (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === "Escape") onSeguir() }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [onSeguir])
  return (
    <div className="l-recompensa l-rec-holo" style={{ ["--cor" as string]: "#2fe8ff" }} role="dialog" aria-label="você ganhou o holo" onPointerDown={(e) => e.stopPropagation()}>
      <div className="l-recompensa-caixa l-rec-holo-caixa">
        <small>a D-Bee te deu</small>
        <div className="l-rec-holo-icone" aria-hidden="true">
          <svg viewBox="0 0 160 160">
            <defs><path id="l-rec-holo-p" d="M80,80 m-62,0 a62,62 0 1,1 124,0 a62,62 0 1,1 -124,0" /></defs>
            <circle cx="80" cy="80" r="70" />
            <g className="l-rec-holo-gira"><text><textPath href="#l-rec-holo-p" textLength="388" lengthAdjust="spacingAndGlyphs">O HOLO  ◆  O MAPA  ◆  O HOLO  ◆  O MAPA  ◆  </textPath></text></g>
          </svg>
          <i className="l-rec-holo-bola" />
        </div>
        <b>o holo</b>
        <p className="l-rec-holo-sub">o celular de agora: uma luz parada no ar. sem ele, lá na cidade, você não existe</p>
        <ul className="l-rec-holo-como">
          {COMO.map((c) => <li key={c.t}><i aria-hidden="true">{c.ic}</i><span><b>{c.t}</b>{c.d}</span></li>)}
        </ul>
        <button type="button" className="l-rec-holo-bt" onClick={onSeguir} autoFocus><i aria-hidden="true">?</i>me mostra no holo</button>
      </div>
    </div>
  )
}
