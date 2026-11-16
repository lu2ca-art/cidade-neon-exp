"use client"

// O SHOW NOS TÚNEIS, o botão (16/11, disco/showNosTuneis.ts): perto do palco do SALÃO DO
// METRÔ aparece "o palco dos túneis". Fechado, o cadeado e o que libera (tudo
// visitável: o palco está lá, aceso, desde sempre). Aberto, a pessoa escolhe a música e:
//   assistir → fica na plateia (a câmera vai pro meio dela, a vista do 3D atrás) e
//              canta junto com o medidor (ShowAfinador no mundo); o canvas segue vivo
//   tocar    → sobe no palco: o show de sempre (ShowBanda), no degrau dos túneis da
//              escada; o canvas das trincheiras para (nunca dois 3D/canvas pesados juntos)
// Leve: perto/longe lido 3x por segundo (o __estado das Trincheiras), nada por quadro.

import { useEffect, useState } from "react"
import { Cadeado, Trancado } from "../Trancado"
import { PISTAS, type PistaId } from "../estrada/pistas"
import type { HistoriaDisco } from "./historia"
import type { ResultadoShow } from "./Show"
import { Show } from "./ShowBanda"
import { ShowAfinador } from "./ShowAfinador"
import { degrau, escalaDoDegrau, genteDoSave, showDosTuneis } from "./escadaShows"
import { SHOW_TUNEIS_AGORA, SHOW_TUNEIS_CFG as C, menuTuneis, pertoDoPalcoTuneis, travaTuneis, tuneisAberto } from "./showNosTuneis"
import "../grafite/grafite.css"

const ESCALA = escalaDoDegrau("tuneis")
const pos = (): { x: number; z: number } | null => {
  try { const f = (window as unknown as { __estado?: () => { x: number; z: number } }).__estado; return f ? f() : null } catch { return null }
}
const nomeDa = (f: PistaId) => PISTAS.find((p) => p.id === f)?.faixa ?? f

type Agora = { t: "menu" } | { t: "ver"; faixa: PistaId; vez: number } | { t: "tocar"; faixa: PistaId }

export function ShowTuneis({ h, popularidade, escondido, onFim, onPausa }: {
  h: HistoriaDisco; popularidade: number; escondido?: boolean
  onFim: (r: ResultadoShow, id: string) => void
  // tocando no palco: as trincheiras pausam o canvas
  onPausa: (sim: boolean) => void
}) {
  const [perto, setPerto] = useState(false)
  const [agora, setAgora] = useState<Agora | null>(null)
  const [aviso, setAviso] = useState(false)
  const aberto = tuneisAberto(h)
  const gente = genteDoSave(degrau("tuneis"), h, popularidade)
  // a plateia do 3D: a gente que veio (lida quando o palco monta)
  useEffect(() => { SHOW_TUNEIS_AGORA.publico = gente }, [gente])
  useEffect(() => {
    if (agora) return
    const ver = () => { const p = pos(); const v = !!p && pertoDoPalcoTuneis(p.x, p.z); setPerto((a) => (a === v ? a : v)) }
    ver()
    const i = setInterval(ver, 330)
    return () => clearInterval(i)
  }, [agora])
  // assistindo: a câmera vai pra plateia; tocando: o canvas pausa
  useEffect(() => {
    SHOW_TUNEIS_AGORA.assistindo = agora?.t === "ver"
    onPausa(agora?.t === "tocar")
  }, [agora, onPausa])
  useEffect(() => () => { SHOW_TUNEIS_AGORA.assistindo = false; onPausa(false) }, [onPausa])
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(false), 3500); return () => clearTimeout(t) }, [aviso])

  const acabou = (faixa: PistaId) => (r: ResultadoShow) => { setAgora(null); onFim(r, showDosTuneis(faixa)) }
  if (agora?.t === "ver") {
    return <div style={{ position: "fixed", inset: 0, zIndex: 85 }}><ShowAfinador key={agora.vez} faixa={agora.faixa} lugar={C.no} cor={C.cor} popularidade={gente} noMundo inteira onFim={acabou(agora.faixa)} onDeNovo={() => setAgora({ ...agora, vez: agora.vez + 1 })} /></div>
  }
  if (agora?.t === "tocar") {
    return <div style={{ position: "fixed", inset: 0, zIndex: 85 }}><Show faixa={agora.faixa} lugar={C.no} cor={C.cor} popularidade={gente} escala={ESCALA} onFim={acabou(agora.faixa)} /></div>
  }
  if (agora?.t === "menu") {
    const menu = menuTuneis(h)
    return (
      <div className="l-rua l-palcos" role="dialog" aria-label={C.nome} style={{ zIndex: 85 }} onPointerDown={(e) => e.stopPropagation()}>
        <div className="l-rua-caixa l-palcos-caixa" style={{ ["--cor" as string]: C.cor }}>
          <header>
            <small>{C.nome} · o salão do metrô</small>
            <b>escolhe a música</b>
            <span>{Math.round(gente)}% de lotação · cachê ×{C.paga}</span>
            <button type="button" onClick={() => setAgora(null)} aria-label="Fechar">×</button>
          </header>
          <section className="l-palcos-menu">
            <ul>
              {menu.map((m) => (
                <li key={m.faixa} className={m.livre ? "" : "is-fechada"} data-faixa-tuneis={m.faixa}>
                  {m.livre ? (
                    <span style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                      <b>{nomeDa(m.faixa)}</b>
                      <span style={{ display: "flex", gap: 6 }}>
                        <button type="button" onClick={() => setAgora({ t: "ver", faixa: m.faixa, vez: 0 })}>assistir</button>
                        <button type="button" onClick={() => setAgora({ t: "tocar", faixa: m.faixa })}>tocar</button>
                      </span>
                    </span>
                  ) : (
                    <span className="cn-card-trancado"><b><Cadeado />{nomeDa(m.faixa)}</b><small>ainda trancada no Guitar Driver</small></span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    )
  }
  if (escondido || !perto) return null
  return (
    <>
      <button type="button" className={`gf-botao is-palco-tuneis${aberto ? "" : " is-trancado"}`} data-testid="palco-tuneis" style={{ left: "76%" }} onClick={() => (aberto ? setAgora({ t: "menu" }) : setAviso((a) => !a))}>
        <small>{aberto ? C.nome : <><Cadeado size={9} /> {C.nome}</>}</small>
        <b>{aberto ? "o show" : "o palco tá apagado"}</b>
      </button>
      {aviso && !aberto && <div className="gf-aviso" style={{ left: "76%" }}><Trancado texto={travaTuneis()} /></div>}
    </>
  )
}
