"use client"

// (trilha de pedras, o dono: "motion graphics que demonstrem em cada missão o
// que deve ser feito, passo a passo, através de ícones") UM ÍCONE ANIMADO POR
// PEDRA: SVG simples + CSS (trilhaPedras.css, só transform e opacity), dentro do
// balão. Leve: nada de vídeo, nada de imagem.
//
// O PONTO DE TROCA: quando os ícones gerados chegarem (um .svg/.webp/.gif por
// pedra em /public/trilha/), é só pôr o caminho em ICONES_GERADOS. iconeDaPedra
// usa o gerado se houver; senão, o desenhado aqui.

import type { ReactNode } from "react"
import type { PedraId } from "./trilhaPedras"

export const ICONES_GERADOS: Partial<Record<PedraId, string>> = {
  // mapa: "/trilha/mapa.webp",
}

type Forma = "toque" | "segue" | "mira" | "drift" | "anel" | "q" | "voo" | "turbo" | "pousa" | "escolhe" | "desce" | "abre" | "radio" | "coracao" | "veiculo"
const FORMA: Record<PedraId, Forma> = {
  mapa: "toque", rota: "segue", gps: "mira", drift: "drift", anel: "anel", ajuda: "q",
  voo: "voo", turbo: "turbo", pousa: "pousa",
  escolhe: "escolhe", linha: "segue", chegou: "desce", liberou: "abre", radio: "radio", salvar: "coracao", veiculo: "veiculo", piloto: "segue",
}

// a Kombi pequena (de lado), reaproveitada em vários
const Kombi = ({ c = "" }: { c?: string }) => (
  <g className={c}>
    <path d="M6 22v-7a4 4 0 0 1 4-4h11l5 5v6z" />
    <path d="M10 14h4v3h-4zM16 14h4v3h-4z" className="is-cheio" />
    <circle cx="11" cy="23" r="2.2" className="is-cheio" />
    <circle cx="21" cy="23" r="2.2" className="is-cheio" />
  </g>
)
// o dedo (tocando)
const Dedo = ({ c = "l-pi-dedo" }: { c?: string }) => (
  <g className={c}>
    <path d="M15 27v-9.5a1.6 1.6 0 0 1 3.2 0V22l4.3.9a2.4 2.4 0 0 1 1.9 2.7L24 29h-7.5L13 25.2a1.4 1.4 0 0 1 2-2" />
  </g>
)

function desenho(f: Forma): ReactNode {
  switch (f) {
    case "toque": return <><circle cx="16.5" cy="12" r="5" className="l-pi-onda" /><circle cx="16.5" cy="12" r="1.8" className="is-cheio" /><Dedo /></>
    case "anel": return <><circle cx="16" cy="13" r="8" strokeDasharray="5 3" className="l-pi-gira" /><circle cx="16" cy="13" r="2.4" className="is-cheio" /><Dedo /></>
    case "segue": return <><path d="M4 24c6 0 6-14 12-14s6 10 12 10" strokeDasharray="2.5 3" className="l-pi-tracos" /><path d="M-3-3 3 0-3 3z" className="is-cheio l-pi-anda" /></>
    case "mira": return <><rect x="3" y="12" width="26" height="8" rx="4" /><path d="M16 9v14" className="l-pi-fino" /><circle cx="16" cy="16" r="2.4" className="is-cheio l-pi-mira" /></>
    case "drift": return <><path d="M5 27c5-1 9-4 11-8" strokeDasharray="1.5 2.5" className="l-pi-poeira" /><Kombi c="l-pi-drift" /></>
    case "q": return <><circle cx="16" cy="16" r="11" /><path d="M12.5 12.5a3.5 3.5 0 1 1 5 3.2c-1 .5-1.5 1.2-1.5 2.3v.5" className="l-pi-q" /><circle cx="16" cy="22.5" r="1.3" className="is-cheio l-pi-q" /></>
    case "voo": return <><g className="l-pi-sobe"><Kombi /><path d="M11 26v3M16 26v4M21 26v3" className="l-pi-fogo" /></g></>
    case "turbo": return <><path d="M18 3 8 18h7l-2 11 11-16h-7z" className="l-pi-raio" /><path d="M3 29h26" className="l-pi-barra" /></>
    case "pousa": return <><path d="M3 28h26" /><g className="l-pi-pousa"><Kombi /></g></>
    case "escolhe": return <><circle cx="7" cy="20" r="2.4" className="is-cheio l-pi-fraco" /><circle cx="25" cy="18" r="2.4" className="is-cheio l-pi-fraco" /><path d="M16 4a5 5 0 0 1 5 5c0 4-5 9-5 9s-5-5-5-9a5 5 0 0 1 5-5z" className="l-pi-pino" /><circle cx="16" cy="9" r="1.6" className="is-cheio" /></>
    case "desce": return <><path d="M16 3a5 5 0 0 1 5 5c0 4-5 8-5 8s-5-4-5-8a5 5 0 0 1 5-5z" /><path d="M16 18v8M12 23l4 4 4-4" className="l-pi-desce" /></>
    case "abre": return <><rect x="8" y="15" width="16" height="12" rx="2" /><path d="M11 15v-4a5 5 0 0 1 10 0" className="l-pi-cadeado" /><circle cx="16" cy="21" r="1.6" className="is-cheio" /><path d="M27 6l2-2M4 6 2 4M16 3V1" className="l-pi-faisca" /></>
    case "radio": return <><circle cx="10" cy="20" r="3" className="is-cheio" /><path d="M15 14a8 8 0 0 1 0 12" className="l-pi-onda1" /><path d="M19 10a13 13 0 0 1 0 20" className="l-pi-onda2" /></>
    case "coracao": return <><path d="M16 27S5 20 5 12.5A5.5 5.5 0 0 1 16 10a5.5 5.5 0 0 1 11 2.5C27 20 16 27 16 27z" className="l-pi-bate" /></>
    case "veiculo": return <><circle cx="9" cy="22" r="4.5" className="l-pi-roda" strokeDasharray="3 2" /><circle cx="23" cy="22" r="4.5" className="l-pi-roda" strokeDasharray="3 2" /><path d="M9 22l5-8h6l3 8M14 14l-2-4h-3" /></>
  }
}

// O ÍCONE DA PEDRA (o gerado, se houver; senão o desenhado)
export function iconeDaPedra(id: string): ReactNode {
  const gerado = ICONES_GERADOS[id as PedraId]
  // eslint-disable-next-line @next/next/no-img-element
  if (gerado) return <img className="l-pi" src={gerado} alt="" aria-hidden="true" width={26} height={26} />
  const f = FORMA[id as PedraId]
  if (!f) return null
  return (
    <svg className={`l-pi is-${f}`} viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
      {desenho(f)}
    </svg>
  )
}
