"use client"

// O METRÔ NOS TÚNEIS (T64, 06/11): o trem da linha 9 parado no SALÃO DO METRÔ das
// trincheiras (docs/tuneis.md) vira porta pra fuga de novo. A fuga "de verdade"
// (a da história: tomam o jetpack, ele perde o violão) é a de quando te pegam
// (disco/metro.ts, MetroFuga.tsx). Aqui é a REVANCHE: depois dela, encostou no
// trem, "entrar no trem" abre a mesma fuga, sem mudar nada no save. Antes dela, o
// botão aparece com o cadeado e diz o que libera (tudo visitável).
//
// Leve: perto/longe lido 3x por segundo (o __estado das Trincheiras), nada por
// quadro. Com a fuga aberta a página pausa o canvas das trincheiras (onAberto →
// Trincheiras noJogo.pausado → frameloop "never"): nunca dois 3D rodando juntos.

import { useEffect, useState } from "react"
import { TREM } from "../trincheiras/mapa"
import { Metro } from "../metro/Metro"
import { Cadeado, Trancado } from "../Trancado"
import { CONFIG_METRO } from "./metro"
import "../grafite/grafite.css"

export const FALAS_METRO_TUNEIS = {
  // RASCUNHO: o cartão do começo da revanche
  antes: "o trem branco parado no salão. as portas abrem. o guarda tá lá dentro de novo",
  tranca: "a linha 9 abre quando a polícia te pegar",
}

type Pos = { x: number; z: number } | null
const pos = (): Pos => {
  try { const f = (window as unknown as { __estado?: () => { x: number; z: number } }).__estado; return f ? f() : null } catch { return null }
}
// perto do trem: na caixa dele (o comprido + 10 m, o lado + 14 m)
function pertoDoTrem(p: Pos) {
  if (!p) return false
  const dx = p.x - TREM.c.x, dz = p.z - TREM.c.z
  const ao = dx * TREM.ax + dz * TREM.az, lado = -dx * TREM.az + dz * TREM.ax
  return Math.abs(ao) < TREM.meioC + 10 && Math.abs(lado) < TREM.meioL + 14
}

export function MetroTuneis({ liberado, escondido, onAberto }: { liberado: boolean; escondido?: boolean; onAberto: (sim: boolean) => void }) {
  const [perto, setPerto] = useState(false)
  const [aberto, setAberto] = useState(false)
  const [aviso, setAviso] = useState(false)
  useEffect(() => {
    if (aberto) return
    const ver = () => { const v = pertoDoTrem(pos()); setPerto((a) => (a === v ? a : v)) }
    ver()
    const i = setInterval(ver, 330)
    return () => clearInterval(i)
  }, [aberto])
  useEffect(() => { onAberto(aberto) }, [aberto, onAberto])
  useEffect(() => () => onAberto(false), [onAberto])
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(false), 3500); return () => clearTimeout(t) }, [aviso])

  if (aberto) {
    return (
      <div className="mt-tuneis" style={{ position: "fixed", inset: 0, zIndex: 85 }}>
        <Metro semente={CONFIG_METRO.semente} onSeguir={() => setAberto(false)} seguirSePego antes={FALAS_METRO_TUNEIS.antes} />
      </div>
    )
  }
  if (escondido || !perto) return null
  return (
    <>
      <button type="button" className={`gf-botao is-metro${liberado ? "" : " is-trancado"}`} data-testid="metro-tuneis" onClick={() => (liberado ? setAberto(true) : setAviso((a) => !a))}>
        <small>{liberado ? "linha 9 · o trem parado" : <><Cadeado size={9} /> linha 9</>}</small>
        <b>{liberado ? "entrar no trem" : "o trem tá fechado"}</b>
      </button>
      {aviso && !liberado && <div className="gf-aviso is-metro"><Trancado texto={FALAS_METRO_TUNEIS.tranca} /></div>}
    </>
  )
}
