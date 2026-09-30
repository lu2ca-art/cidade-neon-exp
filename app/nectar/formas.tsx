"use client"

// As formas de responder da leitura. Cada pergunta chega de um jeito —
// tocar num objeto do quarto, ouvir sons, responder no chat, arrastar numa
// régua, segurar na chuva, escolher imagem, arrastar uma memória pro
// NÚCLEO, escolher uma cor — mas todas devolvem o índice da opção, e o
// peso é o mesmo (leitura.ts).

import { useEffect, useRef, useState } from "react"
import type { No } from "./leitura"
import { Arte, QUARTO } from "./visuais"
import { nota, somDoSentimento, vib } from "./som"

type P = { no: No; escolhida: number | null; onEscolher: (i: number) => void }

export function Forma(p: P) {
  switch (p.no.forma) {
    case "cena": return <Cena {...p} />
    case "som": return <Som {...p} />
    case "chat": return <Chat {...p} />
    case "regua": return <Regua {...p} />
    case "segurar": return <Segurar {...p} />
    case "imagens": return <Imagens {...p} />
    case "apagar": return <Apagar {...p} />
    case "cores": return <Cores {...p} />
    default: return <Texto {...p} />
  }
}

function Texto({ no, escolhida, onEscolher }: P) {
  return (
    <div className="n-opcoes">
      {no.opcoes.map((o, i) => (
        <button key={i} type="button" className={`n-opcao ${escolhida === i ? "is-escolhida" : ""} ${escolhida !== null && escolhida !== i ? "is-some" : ""}`} style={{ animationDelay: `${i * 80}ms` }} onClick={() => onEscolher(i)}>
          {o.txt}
        </button>
      ))}
    </div>
  )
}

// ── o quarto: toca no objeto ──
function Cena({ no, escolhida, onEscolher }: P) {
  const [foco, setFoco] = useState<number | null>(null)
  return (
    <div className="f-cena">
      <svg viewBox="0 0 300 312" className="f-quarto">
        <path d="M0 292h300M172 190h126M182 190v102M290 190v102" className="f-traco" />
        {no.opcoes.map((o, i) => {
          const q = QUARTO[o.img ?? ""]
          if (!q) return null
          return (
            <g
              key={i}
              className={`f-obj ${foco === i || escolhida === i ? "is-foco" : ""} ${escolhida !== null && escolhida !== i ? "is-apaga" : ""}`}
              onPointerEnter={() => setFoco(i)}
              onClick={() => { nota(i + 2); onEscolher(i) }}
            >
              <rect x={q.x} y={q.y} width={q.w} height={q.h} fill="transparent" />
              <Arte id={o.img!} className="f-arte-svg" caixa={q} />
              <text x={q.x + q.w / 2} y={q.acima ? q.y - 6 : q.y + q.h + 12} textAnchor="middle" className="f-rot">{q.rotulo}</text>
            </g>
          )
        })}
      </svg>
      <p className="f-dica">{foco !== null ? no.opcoes[foco].txt : "toca num objeto"}</p>
    </div>
  )
}

// ── sons: ouve e escolhe ──
function Som({ no, escolhida, onEscolher }: P) {
  const [ouviu, setOuviu] = useState<Set<number>>(new Set())
  const [sel, setSel] = useState<number | null>(null)
  const tocar = (i: number) => {
    somDoSentimento(i)
    vib(10)
    setSel(i)
    setOuviu((s) => new Set(s).add(i))
  }
  return (
    <div className="f-som">
      <div className="f-som-grade">
        {no.opcoes.map((o, i) => (
          <button key={i} type="button" className={`f-alto ${sel === i ? "is-sel" : ""}`} onClick={() => tocar(i)}>
            <span className="f-ondas" style={{ animationDuration: `${[2.4, 0.9, 0.3, 0.45][i]}s` }}>
              <i /><i /><i />
            </span>
            <small>{ouviu.has(i) ? o.txt : `som ${i + 1}`}</small>
          </button>
        ))}
      </div>
      <button type="button" className="n-btn" disabled={sel === null || escolhida !== null} onClick={() => sel !== null && onEscolher(sel)}>
        {sel === null ? "toca pra ouvir" : "é esse"}
      </button>
    </div>
  )
}

// ── chat: a mensagem chega, você responde ──
function Chat({ no, escolhida, onEscolher }: P) {
  const [digitando, setDigitando] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => { setDigitando(false); nota(5, 0.12); vib([10, 40, 10]) }, 1300)
    return () => clearTimeout(t)
  }, [])
  const enviar = (i: number) => {
    if (escolhida !== null) return
    nota(i + 1)
    onEscolher(i)
  }
  return (
    <div className="f-chat">
      <div className="f-chat-corpo">
        <p className="f-chat-quem">número desconhecido · 03:12</p>
        {digitando ? <div className="f-bolha is-deles f-digitando"><i /><i /><i /></div> : <div className="f-bolha is-deles">sabe ontem?</div>}
        {escolhida !== null && <div className="f-bolha is-minha">{no.opcoes[escolhida].txt}</div>}
      </div>
      {!digitando && escolhida === null && (
        <div className="f-chat-sugestoes">
          {no.opcoes.map((o, i) => (
            <button key={i} type="button" onClick={() => enviar(i)}>{o.txt}</button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── régua: arrasta até onde você está ──
function Regua({ no, escolhida, onEscolher }: P) {
  const ordem = no.ordem ?? no.opcoes.map((_, i) => i)
  const [v, setV] = useState(0.5)
  const [mexeu, setMexeu] = useState(false)
  const trilho = useRef<HTMLDivElement>(null)
  const zona = Math.min(ordem.length - 1, Math.floor(v * ordem.length))
  const ult = useRef(zona)
  const mover = (x: number) => {
    const r = trilho.current!.getBoundingClientRect()
    const nv = Math.max(0, Math.min(1, (x - r.left) / r.width))
    setV(nv)
    setMexeu(true)
    const z = Math.min(ordem.length - 1, Math.floor(nv * ordem.length))
    if (z !== ult.current) { ult.current = z; nota(z * 2, 0.08); vib(6) }
  }
  return (
    <div className="f-regua">
      <p className="f-regua-atual">{mexeu ? no.opcoes[ordem[zona]].txt : "arrasta a bolinha"}</p>
      <div
        ref={trilho}
        className="f-trilho"
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); mover(e.clientX) }}
        onPointerMove={(e) => { if (e.buttons) mover(e.clientX) }}
      >
        {ordem.map((_, k) => <i key={k} className={k === zona && mexeu ? "is-on" : ""} style={{ left: `${((k + 0.5) / ordem.length) * 100}%` }} />)}
        <b className="f-bola" style={{ left: `${v * 100}%` }} />
      </div>
      <div className="f-polos"><span>{no.polos?.[0]}</span><span>{no.polos?.[1]}</span></div>
      <button type="button" className="n-btn" disabled={!mexeu || escolhida !== null} onClick={() => onEscolher(ordem[zona])}>é aqui</button>
    </div>
  )
}

// ── segurar: quanto tempo você aguenta ──
const LIMITES = [0.8, 2.5, 5]
const agora = () => performance.now() // só chamado em evento/rAF
function Segurar({ no, escolhida, onEscolher }: P) {
  const ordem = no.ordem ?? no.opcoes.map((_, i) => i)
  const [t, setT] = useState(0)
  const [segurando, setSegurando] = useState(false)
  const ini = useRef(0)
  const raf = useRef(0)
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const zonaDe = (s: number) => LIMITES.filter((l) => s >= l).length
  const comecar = () => {
    if (escolhida !== null) return
    ini.current = agora()
    setSegurando(true)
    vib(15)
    const passo = () => {
      const s = (agora() - ini.current) / 1000
      setT(s)
      if (s < 8) raf.current = requestAnimationFrame(passo)
      else soltar()
    }
    raf.current = requestAnimationFrame(passo)
  }
  const soltar = () => {
    if (!ini.current) return
    cancelAnimationFrame(raf.current)
    const s = (agora() - ini.current) / 1000
    ini.current = 0
    setSegurando(false)
    const z = zonaDe(s)
    nota(z * 2)
    vib([20, 30, 20])
    onEscolher(ordem[z])
  }
  const z = zonaDe(t)
  return (
    <div className="f-segurar" style={{ ["--chuva" as string]: String(Math.min(1, t / 6)) }}>
      <div className="f-gotas" aria-hidden>{Array.from({ length: 36 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 9) * 0.13}s` }} />)}</div>
      <div className="f-zonas">
        {ordem.map((oi, k) => <span key={k} className={segurando && k === z ? "is-on" : ""}>{no.opcoes[oi].txt}</span>)}
      </div>
      <div className="f-tempo"><i style={{ transform: `scaleX(${Math.min(1, t / 7)})` }} /></div>
      <button
        type="button"
        className={`f-botao-segura ${segurando ? "is-on" : ""}`}
        onPointerDown={comecar}
        onPointerUp={soltar}
        onPointerLeave={() => segurando && soltar()}
        onPointerCancel={soltar}
        onContextMenu={(e) => e.preventDefault()}
      >
        {segurando ? `${t.toFixed(1)}s` : "segura"}
      </button>
    </div>
  )
}

// ── imagens: escolhe o desenho ──
function Imagens({ no, escolhida, onEscolher }: P) {
  return (
    <div className="f-imagens">
      {no.opcoes.map((o, i) => (
        <button
          key={i}
          type="button"
          className={`f-img ${o.img ? "" : "is-papel"} ${escolhida === i ? "is-escolhida" : ""} ${escolhida !== null && escolhida !== i ? "is-some" : ""}`}
          style={{ animationDelay: `${i * 90}ms` }}
          onClick={() => { nota(i + 3); onEscolher(i) }}
        >
          {o.img ? <Arte id={o.img} className="f-arte" /> : <span className="f-manuscrito">{o.txt}</span>}
          {o.img && <small>{o.txt}</small>}
        </button>
      ))}
    </div>
  )
}

// ── apagar: arrasta a memória pro NÚCLEO (ou recusa) ──
function Apagar({ no, escolhida, onEscolher }: P) {
  // a opção "nenhuma" vira o botão de recusar; as outras viram memórias
  const recusa = no.opcoes.findIndex((o) => o.txt.startsWith("nenhuma"))
  const [arrasto, setArrasto] = useState<{ i: number; x: number; y: number } | null>(null)
  const [apagada, setApagada] = useState<number | null>(null)
  const lixo = useRef<HTMLDivElement>(null)
  const inicio = useRef({ x: 0, y: 0 })
  const soltar = (i: number, cx: number, cy: number) => {
    const r = lixo.current?.getBoundingClientRect()
    setArrasto(null)
    if (r && cx > r.left - 20 && cx < r.right + 20 && cy > r.top - 30 && cy < r.bottom + 20) apagar(i)
  }
  const apagar = (i: number) => {
    if (escolhida !== null) return
    setApagada(i)
    nota(0, 0.14)
    vib([40, 30, 80])
    setTimeout(() => onEscolher(i), 700)
  }
  return (
    <div className="f-apagar">
      <div className="f-memorias">
        {no.opcoes.map((o, i) => i === recusa ? null : (
          <div
            key={i}
            className={`f-memoria ${apagada === i ? "is-apagando" : ""}`}
            style={arrasto?.i === i ? { transform: `translate(${arrasto.x}px, ${arrasto.y}px) rotate(${arrasto.x / 20}deg)`, zIndex: 3, transition: "none" } : undefined}
            onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); inicio.current = { x: e.clientX, y: e.clientY }; setArrasto({ i, x: 0, y: 0 }) }}
            onPointerMove={(e) => { if (arrasto?.i === i) setArrasto({ i, x: e.clientX - inicio.current.x, y: e.clientY - inicio.current.y }) }}
            onPointerUp={(e) => arrasto?.i === i && soltar(i, e.clientX, e.clientY)}
          >
            <span className="f-fita" />
            {o.txt}
          </div>
        ))}
      </div>
      <div ref={lixo} className={`f-lixo ${arrasto ? "is-aberto" : ""}`}>
        <b>NÚCLEO</b>
        <small>apagar memória · grátis ✓</small>
      </div>
      {recusa >= 0 && (
        <button type="button" className="n-btn is-ghost" disabled={escolhida !== null} onClick={() => { nota(7); onEscolher(recusa) }}>
          {no.opcoes[recusa].txt}
        </button>
      )}
    </div>
  )
}

// ── cores: a estação do ano como luz ──
function Cores({ no, escolhida, onEscolher }: P) {
  return (
    <div className="f-cores">
      {no.opcoes.map((o, i) => (
        <button
          key={i}
          type="button"
          className={`f-cor ${escolhida === i ? "is-escolhida" : ""} ${escolhida !== null && escolhida !== i ? "is-some" : ""}`}
          style={{ ["--c" as string]: o.cor ?? "#fff", animationDelay: `${i * 120}ms` }}
          onClick={() => { nota(i * 2 + 1); onEscolher(i) }}
        >
          <i />
          <small>{o.txt}</small>
        </button>
      ))}
    </div>
  )
}
