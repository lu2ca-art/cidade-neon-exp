"use client"

// Recursos que as missões liberam (issue #28): cada missão apresenta uma
// coisa que fica pra pessoa mexer depois.
//   - JARDIM (flor da Ella, estação 1 · CHUVA): rega e a página floresce;
//     o jardim fica salvo e pode virar o papel de parede do celular (#27)
//   - VIOLÃO (violão do LU2CA, estação 6 · Nectar): braço inteiro, acordes,
//     escalas e tocar junto no tom da música que está tocando (#26)

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Save } from "./estado"
import { gota, nomeDoTom, tomDaMusica, violao } from "./som"
import { AppTopo } from "./os"
import { AFINACAO, CADENCIAS_MAIOR, CADENCIAS_MENOR, CASAS, COMUNS, GRAUS_MAIOR, GRAUS_MENOR, NOMES, desenho, hz, nomeAc, type Acorde } from "./violao-teoria"

/* ─── JARDIM ─────────────────────────────────────────────── */

export type Flor = { x: number; y: number; c: string; s: number; p: number; r: number }
const CORES = ["#2fe8ff", "#ff3fb0", "#ffc857", "#5dffa0", "#b38cff", "#ff6a35", "#3d7bff", "#ff5b5b"]
const W = 100
const H = 160
const MAX_FLORES = 160

function FlorSvg({ f, i }: { f: Flor; i: number }) {
  const ptl = Array.from({ length: f.p }, (_, k) => (360 / f.p) * k + f.r)
  return (
    <g transform={`translate(${f.x} ${f.y})`} className="l-flor-g" style={{ animationDelay: `${(i % 7) * 40}ms` }}>
      <line x1="0" y1="0" x2="0" y2={5 + f.s * 3} stroke="#2a8f5a" strokeWidth="0.5" />
      <g transform={`scale(${f.s})`} filter="url(#brilho)">
        {ptl.map((a) => <ellipse key={a} cx="0" cy="-2.4" rx="1.2" ry="2.5" fill={f.c} opacity="0.88" transform={`rotate(${a})`} />)}
        <circle r="1.1" fill="#fff6d8" />
      </g>
    </g>
  )
}

function JardimSvg({ flores, children, svgRef }: { flores: Flor[]; children?: React.ReactNode; svgRef?: React.Ref<SVGSVGElement> }) {
  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="l-jardim-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ceuJ" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a0a24" />
          <stop offset="0.7" stopColor="#141238" />
          <stop offset="1" stopColor="#1d1030" />
        </linearGradient>
        <filter id="brilho" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width={W} height={H} fill="url(#ceuJ)" />
      {flores.map((f, i) => <FlorSvg key={i} f={f} i={i} />)}
      {children}
    </svg>
  )
}

// o papel de parede (tela inicial do celular)
export function JardimFundo({ flores }: { flores: Flor[] }) {
  return <div className="l-jardim-fundo"><JardimSvg flores={flores} /></div>
}

export function Jardim({ save, atualizar, onVoltar }: { save: Save; atualizar: (f: (s: Save) => Save) => void; onVoltar: () => void }) {
  const flores = save.jardim
  const svg = useRef<SVGSVGElement>(null)
  const [regador, setRegador] = useState<{ x: number; y: number } | null>(null)
  const [gotas, setGotas] = useState<{ id: number; x: number; y: number }[]>([])
  const agua = useRef(new Map<string, number>())
  const idG = useRef(0)
  const ultimo = useRef(0)

  const ponto = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect()
    // a imagem é "slice": calcula a escala que o SVG usou
    const esc = Math.max(r.width / W, r.height / H)
    const ox = (r.width - W * esc) / 2
    const oy = (r.height - H * esc) / 2
    return { x: (e.clientX - r.left - ox) / esc, y: (e.clientY - r.top - oy) / esc }
  }

  const regar = useCallback((x: number, y: number) => {
    const agora = Date.now()
    if (agora - ultimo.current < 45) return
    ultimo.current = agora
    // a água cai um pouco abaixo e à frente do bico
    const gx = x + (Math.random() - 0.5) * 3
    const gy = y + 6 + Math.random() * 3
    const id = ++idG.current
    setGotas((g) => [...g.slice(-14), { id, x: gx, y: gy }])
    setTimeout(() => setGotas((g) => g.filter((d) => d.id !== id)), 650)
    const cel = `${Math.floor(gx / 7)},${Math.floor(gy / 7)}`
    const n = (agua.current.get(cel) ?? 0) + 1
    agua.current.set(cel, n)
    atualizar((s) => {
      const fl = s.jardim
      // regou perto de uma flor: ela cresce
      const perto = fl.findIndex((f) => Math.hypot(f.x - gx, f.y - gy) < 4.5)
      if (perto >= 0) {
        if (fl[perto].s >= 1.7) return s
        const nova = [...fl]
        nova[perto] = { ...fl[perto], s: Math.min(1.7, fl[perto].s + 0.06) }
        return { ...s, jardim: nova }
      }
      // terra molhada o bastante: brota
      if (n < 2 || fl.length >= MAX_FLORES) return s
      agua.current.set(cel, 0)
      gota(fl.length % 8)
      try { navigator.vibrate?.(8) } catch {}
      const f: Flor = { x: gx, y: gy, c: CORES[Math.floor(Math.random() * CORES.length)], s: 0.95 + Math.random() * 0.4, p: 5 + Math.floor(Math.random() * 4), r: Math.random() * 60 }
      return { ...s, jardim: [...fl, f] }
    })
  }, [atualizar])

  const salvarImagem = async () => {
    if (!svg.current) return
    const xml = new XMLSerializer().serializeToString(svg.current)
    const img = new Image()
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`
    await img.decode().catch(() => {})
    const cv = document.createElement("canvas")
    cv.width = 1080
    cv.height = 1728
    const g = cv.getContext("2d")!
    g.drawImage(img, 0, 0, cv.width, cv.height)
    const blob = await new Promise<Blob | null>((ok) => cv.toBlob(ok, "image/png"))
    if (!blob) return
    const arq = new File([blob], "jardim-cidade-neon.png", { type: "image/png" })
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean }
    if (nav.share && nav.canShare?.({ files: [arq] })) {
      try { await nav.share({ files: [arq], title: "meu jardim na cidade neon" }); return } catch {}
    }
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = arq.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }

  return (
    <section className="l-appnativo l-jardim">
      <AppTopo titulo="JARDIM" cor="#5dffa0" onVoltar={onVoltar} extra={`${flores.length} flores`} />
      <div
        className="l-jardim-area"
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); const p = ponto(e); setRegador(p); regar(p.x, p.y) }}
        onPointerMove={(e) => { if (!regador) return; const p = ponto(e); setRegador(p); regar(p.x, p.y) }}
        onPointerUp={() => setRegador(null)}
        onPointerCancel={() => setRegador(null)}
      >
        <JardimSvg flores={flores} svgRef={svg}>
          {gotas.map((d) => <circle key={d.id} cx={d.x} cy={d.y} r="0.7" fill="#9fe8ff" className="l-jardim-gota" />)}
          {regador && (
            <g transform={`translate(${regador.x} ${regador.y}) rotate(25)`} opacity="0.95">
              <rect x="-4" y="-3" width="7" height="5" rx="1" fill="#2fe8ff" />
              <path d="M3 -1 L8 2 L8 3 L3 1 Z" fill="#2fe8ff" />
              <path d="M-4 -2 Q-7 -2 -6 1" stroke="#2fe8ff" strokeWidth="0.8" fill="none" />
            </g>
          )}
        </JardimSvg>
        {flores.length === 0 && <p className="l-jardim-dica">arrasta o dedo pra regar. onde a água cai, nasce</p>}
      </div>
      <div className="l-jardim-acoes">
        <button type="button" className={`l-btn ${save.papel ? "" : "l-btn-ghost"}`} disabled={!flores.length} onClick={() => atualizar((s) => ({ ...s, papel: !s.papel }))}>
          {save.papel ? "✓ papel de parede" : "papel de parede"}
        </button>
        <button type="button" className="l-btn l-btn-ghost" disabled={!flores.length} onClick={salvarImagem}>salvar imagem</button>
      </div>
    </section>
  )
}

/* ─── VIOLÃO ─────────────────────────────────────────────── */
// Simples de propósito: o braço fica limpo. Você escolhe um acorde → ele
// toca e o desenho aparece no braço → abre o campo harmônico daquele tom e
// cadências prontas (as sequências que fazem uma música soar inteira).

export function Violao({ onVoltar }: { onVoltar: () => void }) {
  const [atual, setAtual] = useState<Acorde | null>(null)
  // o tom: vem do acorde escolhido (ou do "tocar junto")
  const [tom, setTom] = useState<{ r: number; menor: boolean } | null>(null)
  const [toque, setToque] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [tocandoCad, setTocandoCad] = useState<string | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const campo = useMemo(() => {
    if (!tom) return []
    return (tom.menor ? GRAUS_MENOR : GRAUS_MAIOR).map(([i, q, g]) => ({ a: { r: (tom.r + i) % 12, q } as Acorde, g }))
  }, [tom])
  const doGrau = (g: string) => campo.find((c) => c.g === g)?.a

  const rasgar = (a: Acorde) => {
    const d = desenho(a)
    setAtual(a)
    let k = 0
    d.forEach((casa, corda) => {
      if (casa === null) return
      violao(hz(AFINACAO[corda] + casa), 0.24, k++ * 0.03)
    })
  }

  const escolher = (a: Acorde) => {
    rasgar(a)
    setTom({ r: a.r, menor: a.q === "m" })
  }

  const tocarCadencia = (nome: string, graus: string[]) => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setTocandoCad(nome)
    graus.forEach((g, i) => {
      timers.current.push(setTimeout(() => { const a = doGrau(g); if (a) rasgar(a) }, i * 1100))
    })
    timers.current.push(setTimeout(() => setTocandoCad(null), graus.length * 1100))
  }

  const tocar = (corda: number, casa: number) => {
    violao(hz(AFINACAO[corda] + casa))
    const k = `${corda}:${casa}`
    setToque(k)
    setTimeout(() => setToque((t) => (t === k ? null : t)), 220)
  }

  const tocarJunto = () => {
    const t = tomDaMusica()
    if (!t) { setAviso("põe uma música pra tocar e tenta de novo"); return }
    const menor = t.modo === "menor"
    setTom({ r: t.tonica, menor })
    rasgar({ r: t.tonica, q: menor ? "m" : "" })
    setAviso(`no tom da música: ${nomeDoTom(t)}`)
  }
  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 4000)
    return () => clearTimeout(t)
  }, [aviso])

  const formato = atual ? desenho(atual) : null
  const cadencias = tom?.menor ? CADENCIAS_MENOR : CADENCIAS_MAIOR

  return (
    <section className="l-appnativo l-violao">
      <AppTopo titulo="VIOLÃO" cor="#b38cff" onVoltar={onVoltar} extra={atual ? nomeAc(atual) : undefined} />
      <div className="l-violao-controles">
        {!tom ? (
          <>
            <p className="l-violao-dica">escolhe um acorde pra começar</p>
            <div className="l-violao-grade">
              {COMUNS.map((a) => <button key={nomeAc(a)} type="button" onClick={() => escolher(a)}>{nomeAc(a)}</button>)}
            </div>
          </>
        ) : (
          <>
            <div className="l-violao-tom">
              <span>campo harmônico de <b>{NOMES[tom.r]} {tom.menor ? "menor" : "maior"}</b></span>
              <button type="button" onClick={() => { setTom(null); setAtual(null) }}>trocar</button>
            </div>
            <div className="l-violao-grade is-campo">
              {campo.map(({ a, g }) => (
                <button key={g} type="button" className={atual && nomeAc(atual) === nomeAc(a) ? "is-on" : ""} onClick={() => rasgar(a)}>
                  <small>{g}</small>{nomeAc(a)}
                </button>
              ))}
            </div>
            <div className="l-violao-cads">
              {cadencias.map((c) => (
                <button key={c.nome} type="button" className={tocandoCad === c.nome ? "is-on" : ""} onClick={() => tocarCadencia(c.nome, c.graus)}>
                  <b>{c.graus.map((g) => (doGrau(g) ? nomeAc(doGrau(g)!) : g)).join(" → ")}</b>
                  <small>{c.dica}</small>
                </button>
              ))}
            </div>
          </>
        )}
        <button type="button" className="l-violao-junto-bt" onClick={tocarJunto}>tocar junto com a música</button>
        {aviso && <p className="l-violao-junto">{aviso}</p>}
      </div>
      {/* braço limpo: só aparece o desenho do acorde escolhido */}
      <div className="l-violao-braco">
        {Array.from({ length: CASAS + 1 }, (_, casa) => (
          <div key={casa} className={`l-violao-casa ${casa === 0 ? "is-solta" : ""}`}>
            <span className="l-violao-n">{[3, 5, 7, 9, 12].includes(casa) ? casa : ""}</span>
            {AFINACAO.map((solta, corda) => {
              const noAcorde = formato?.[corda] === casa
              const k = `${corda}:${casa}`
              return (
                <button
                  key={corda}
                  type="button"
                  className={`l-violao-nota ${noAcorde ? "is-acorde" : ""} ${toque === k ? "is-toca" : ""}`}
                  onPointerDown={() => tocar(corda, casa)}
                  aria-label={`${NOMES[(solta + casa) % 12]} corda ${6 - corda} casa ${casa}`}
                >
                  {noAcorde && <b>{NOMES[(solta + casa) % 12]}</b>}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}
