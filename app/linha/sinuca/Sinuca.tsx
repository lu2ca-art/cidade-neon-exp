"use client"

// A SINUCA (T17): o componente. Um canvas 2D (o Jogo cuida de tudo por
// quadro) + o placar, o puxador do taco e o efeito na branca em DOM, que só
// mudam quando o placar muda. Pronto pra entrar na missão do Mubarak (T16):
// <Sinuca modo="mubarak" onFim={(r) => ...} />

import { useEffect, useRef, useState } from "react"
import { Jogo, type Hud } from "./jogo"
import { corDe } from "./desenho"
import type { Modo, Grupo } from "./regras"
import "./sinuca.css"

const LISAS = [1, 2, 3, 4, 5, 6, 7], LISTRADAS = [9, 10, 11, 12, 13, 14, 15]

function Mini({ id, fora }: { id: number; fora?: boolean }) {
  const cor = corDe(id)
  const fundo = id > 8 ? `linear-gradient(#f4f1ea 0 22%, ${cor} 22% 78%, #f4f1ea 78%)` : cor
  return <i className="sn-mini" data-fora={fora ? "" : undefined} style={{ background: fundo }}><b>{id}</b></i>
}

function Grupo_({ g, naMesa }: { g: Grupo; naMesa: number[] }) {
  if (!g) return <span className="sn-aberta">mesa aberta</span>
  const ids = g === "lisas" ? LISAS : LISTRADAS
  const limpo = ids.every((id) => !naMesa.includes(id))
  return (
    <span className="sn-grupo">
      {ids.map((id) => <Mini key={id} id={id} fora={!naMesa.includes(id)} />)}
      {limpo && <Mini id={8} fora={!naMesa.includes(8)} />}
    </span>
  )
}

export function Sinuca({ modo: modoFixo, onFim, expor }: { modo?: Modo; onFim?: (r: { venceu: boolean; motivo: string }) => void; expor?: boolean }) {
  const tela = useRef<HTMLCanvasElement>(null)
  const jogo = useRef<Jogo | null>(null)
  const [modo, setModo] = useState<Modo | null>(modoFixo ?? null)
  const [hud, setHud] = useState<Hud | null>(null)
  const [forca, setForca] = useState(0)
  const [efeito, setEfeito] = useState<[number, number]>([0, 0])
  const fimRef = useRef(onFim)
  useEffect(() => { fimRef.current = onFim }, [onFim])

  useEffect(() => {
    if (!modo || !tela.current) return
    const j = new Jogo(tela.current, modo, setHud, (f) => fimRef.current?.({ venceu: f.vencedor === 0, motivo: f.motivo }))
    jogo.current = j
    const ro = new ResizeObserver(() => j.medir())
    ro.observe(tela.current)
    if (expor) (window as unknown as { __sinuca: unknown }).__sinuca = {
      jogo: j,
      estado: () => ({
        fase: j.fase, vez: j.regras.vez, grupos: j.regras.grupos, fim: j.regras.fim, passos: j.passos,
        bolas: j.mesa.bolas.map((b) => ({ id: b.id, x: +b.x.toFixed(3), y: +b.y.toFixed(3), ativa: b.ativa })),
      }),
      tacar: (ang: number, f: number) => j.tacadaTeste(ang, f),
      medidas: () => ({ quadros: j.quadros.slice(), trabalho: j.trabalho.slice() }),
      zerar: () => { j.quadros.length = 0; j.trabalho.length = 0 },
    }
    return () => { ro.disconnect(); j.destruir(); jogo.current = null }
  }, [modo, expor])

  // ── o puxador: arrasta (pra qualquer lado) e solta ──
  const puxa = useRef<{ x: number; y: number; id: number; larg: number } | null>(null)
  const puxDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    puxa.current = { x: e.clientX, y: e.clientY, id: e.pointerId, larg: Math.max(120, r.width * 0.85) }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const puxMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = puxa.current
    if (!p || p.id !== e.pointerId) return
    const f = Math.min(1, Math.hypot(e.clientX - p.x, e.clientY - p.y) / p.larg)
    setForca(f); jogo.current?.puxar(f)
  }
  const puxUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = puxa.current
    if (!p || p.id !== e.pointerId) return
    puxa.current = null
    setForca(0); jogo.current?.soltar()
  }

  // ── o efeito: onde o taco bate na branca ──
  const efe = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.type === "pointermove" && !e.buttons) return
    const r = e.currentTarget.getBoundingClientRect()
    let x = ((e.clientX - r.left) / r.width) * 2 - 1, y = -(((e.clientY - r.top) / r.height) * 2 - 1)
    const n = Math.hypot(x, y)
    if (n > 0.8) { x *= 0.8 / n; y *= 0.8 / n }
    if (n < 0.12) { x = 0; y = 0 }
    const ex = x / 0.8, ey = y / 0.8
    setEfeito([ex, ey]); jogo.current?.efeito(ex, ey)
  }
  // depois de cada tacada o efeito volta pro centro
  const fase = hud?.fase
  useEffect(() => {
    if (fase === "rolando") { setEfeito([0, 0]); jogo.current?.efeito(0, 0) }
  }, [fase])

  const ehMub = modo === "mubarak"
  const minha = !!hud && hud.fase === "mirar" && (!ehMub || hud.vez === 0)

  return (
    <div className="sn-raiz">
      <header className="sn-placar">
        <div className="sn-jog" data-ativo={hud && (hud.vez === 0 || !ehMub) ? "" : undefined}>
          <span className="sn-ava sn-ava-voce">você</span>
          {hud && <Grupo_ g={hud.grupos[0]} naMesa={hud.naMesa} />}
        </div>
        {ehMub ? (
          <div className="sn-jog sn-jog-dir" data-ativo={hud?.vez === 1 ? "" : undefined}>
            {hud && <Grupo_ g={hud.grupos[1]} naMesa={hud.naMesa} />}
            <span className="sn-ava sn-ava-mub">Mubarak</span>
          </div>
        ) : (
          <div className="sn-jog sn-jog-dir"><span className="sn-treino">treino · {hud?.tacadas ?? 0} tacadas</span></div>
        )}
      </header>

      <div className="sn-palco">
        <canvas ref={tela} className="sn-tela" aria-label="mesa de sinuca" />
        {hud?.msg && <div key={hud.msg + hud.tacadas} className="sn-msg">{hud.msg}</div>}
      </div>

      <footer className="sn-ctl" data-off={minha ? undefined : ""}>
        <div className="sn-efeito" onPointerDown={efe} onPointerMove={efe} onDoubleClick={() => { setEfeito([0, 0]); jogo.current?.efeito(0, 0) }} aria-label="efeito na branca">
          <i style={{ left: `${50 + efeito[0] * 40}%`, top: `${50 - efeito[1] * 40}%` }} />
        </div>
        <div className="sn-puxador" onPointerDown={puxDown} onPointerMove={puxMove} onPointerUp={puxUp} onPointerCancel={puxUp} aria-label="puxar o taco">
          <div className="sn-puxa-enche" style={{ transform: `scaleX(${forca})` }} />
          <span>{forca > 0 ? `${Math.round(forca * 100)}%` : "puxa o taco e solta"}</span>
        </div>
        <button type="button" className="sn-btn" onClick={() => jogo.current?.novo()} aria-label="recomeçar">↺</button>
      </footer>

      {!modo && (
        <div className="sn-menu">
          <h1>SINUCA</h1>
          <p>8 ball no bar · noite</p>
          <button type="button" onClick={() => setModo("mubarak")}>jogar com o Mubarak</button>
          <button type="button" className="sn-sec" onClick={() => setModo("pratica")}>treinar sozinho</button>
          <small>arrasta na mesa pra mirar · puxa a branca (ou o taco embaixo) e solta pra tacar · a bolinha branca dá efeito</small>
        </div>
      )}
      {hud?.fim && (
        <div className="sn-menu sn-fim">
          <h1>{hud.fim.vencedor === 0 ? (ehMub ? "você ganhou" : "mesa limpa") : ehMub ? "o Mubarak ganhou" : "perdeu"}</h1>
          <p>{hud.fim.motivo}</p>
          <button type="button" onClick={() => jogo.current?.novo()}>de novo</button>
          {!modoFixo && <button type="button" className="sn-sec" onClick={() => { setHud(null); setModo(null) }}>trocar o modo</button>}
        </div>
      )}
    </div>
  )
}
