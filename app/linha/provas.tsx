"use client"

// As provas da Linha 222. Princípios (o que travava a versão anterior):
// - duram 15 a 40 segundos, dentro da própria conversa — nada de sair pra
//   outro app e montar 4 músicas inteiras
// - não existe derrota: errar só não conta; acertar sempre toca uma nota
// - depois de 20s aparece "pular" — ninguém fica preso numa estação

import { useCallback, useEffect, useRef, useState } from "react"
import type { ProvaId } from "./data"
import { corda, drone, estatica, gota, pararDrone, player } from "./som"

interface ProvaProps {
  cor: string
  onFim: (pulou?: boolean) => void
}

const INSTRUCAO: Record<ProvaId, string> = {
  regar: "toca nas gotas pra regar a flor",
  sintonia: "gira o dial até a estática sumir",
  respira: "segura o círculo pra puxar o ar. solta devagar",
  espelho: "passa o dedo pra desembaçar",
  caderno: "junta as palavras na ordem",
  violao: "passa o dedo pelas cordas",
}

export function Prova({ id, cor, onFim }: { id: ProvaId } & ProvaProps) {
  const [podePular, setPodePular] = useState(false)
  const [feita, setFeita] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setPodePular(true), 20000)
    return () => clearTimeout(t)
  }, [])

  const fim = useCallback((pulou?: boolean) => {
    if (feita) return
    setFeita(true)
    setTimeout(() => onFim(pulou), pulou ? 0 : 700)
  }, [feita, onFim])

  const C = { regar: Regar, sintonia: Sintonia, respira: Respira, espelho: Espelho, caderno: Caderno, violao: Violao }[id]

  return (
    <div className={`l-prova ${feita ? "is-feita" : ""}`} style={{ ["--cor" as string]: cor }}>
      <div className="l-prova-topo">
        <span className="l-prova-tag">prova</span>
        <span className="l-prova-inst">{INSTRUCAO[id]}</span>
      </div>
      <C cor={cor} onFim={() => fim()} />
      {podePular && !feita && (
        <button type="button" className="l-prova-pular" onClick={() => fim(true)}>
          pular, sem culpa →
        </button>
      )}
    </div>
  )
}

/* ─── 1 · REGAR (CHUVA / flor) ─────────────────────────── */
function Regar({ cor, onFim }: ProvaProps) {
  const META = 10
  const [gotas, setGotas] = useState<{ id: number; x: number; d: number }[]>([])
  const [pegas, setPegas] = useState(0)
  const [splash, setSplash] = useState<{ id: number; x: number; y: number }[]>([])
  const idRef = useRef(0)
  const pegasRef = useRef(0)

  useEffect(() => {
    if (pegas >= META) return
    const t = setInterval(() => {
      const id = ++idRef.current
      const d = 2.2 + Math.random() * 0.9
      setGotas((g) => [...g.slice(-9), { id, x: 8 + Math.random() * 84, d }])
      setTimeout(() => setGotas((g) => g.filter((x) => x.id !== id)), d * 1000 + 50)
    }, 560)
    return () => clearInterval(t)
  }, [pegas])

  const pegar = (id: number, e: React.PointerEvent) => {
    const r = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect()
    const sp = { id, x: e.clientX - r.left, y: e.clientY - r.top }
    setSplash((s) => [...s, sp])
    setTimeout(() => setSplash((s) => s.filter((x) => x.id !== id)), 600)
    setGotas((g) => g.filter((x) => x.id !== id))
    pegasRef.current += 1
    gota(pegasRef.current)
    setPegas(pegasRef.current)
    if (pegasRef.current === META) onFim()
  }

  const p = Math.min(1, pegas / META)
  return (
    <div className="l-regar">
      {gotas.map((g) => (
        <button
          key={g.id}
          type="button"
          aria-label="gota"
          className="l-gota"
          style={{ left: `${g.x}%`, animationDuration: `${g.d}s` }}
          onPointerDown={(e) => pegar(g.id, e)}
        >
          <i />
        </button>
      ))}
      {splash.map((s) => (
        <span key={s.id} className="l-splash" style={{ left: s.x, top: s.y }} />
      ))}
      <svg className="l-flor" viewBox="0 0 100 120" aria-hidden>
        <path d={`M50 118 C50 ${118 - 60 * p} 48 ${110 - 70 * p} 50 ${118 - 78 * p}`} stroke="#5dffa0" strokeWidth="2" fill="none" />
        {p > 0.3 && <path d={`M50 ${100 - 20 * p} q-14 -4 -18 -14 q12 0 18 14`} fill="#5dffa0" opacity={0.7} />}
        {p > 0.5 && <path d={`M50 ${95 - 25 * p} q14 -4 18 -14 q-12 0 -18 14`} fill="#5dffa0" opacity={0.7} />}
        <g transform={`translate(50 ${118 - 80 * p}) scale(${0.2 + 0.8 * p})`}>
          {Array.from({ length: 7 }, (_, i) => (
            <ellipse
              key={i}
              cx="0" cy="-11" rx="5" ry="11"
              fill={cor}
              opacity={p >= 1 ? 0.95 : 0.25 + 0.5 * p}
              transform={`rotate(${(360 / 7) * i})`}
              className={p >= 1 ? "l-petala" : ""}
            />
          ))}
          <circle r="5" fill="#ffc857" />
        </g>
      </svg>
      <div className="l-contador">{pegas}/{META}</div>
    </div>
  )
}

/* ─── 2 · SINTONIA (COPO AMERICANO / mp3) ──────────────── */
function Sintonia({ cor, onFim }: ProvaProps) {
  const [alvo] = useState(() => 930 + Math.floor(Math.random() * 120)) // 93.0 – 104.9
  const [v, setV] = useState(() => (alvo > 990 ? 885 : 1075))
  const [ligado, setLigado] = useState(false)
  const [dica, setDica] = useState(false)
  const [travado, setTravado] = useState(false)
  const est = useRef<ReturnType<typeof estatica>>(null)
  const perto = useRef<number | null>(null)
  const cvs = useRef<HTMLCanvasElement>(null)
  const vRef = useRef(v)
  useEffect(() => { vRef.current = v }, [v])

  const prox = Math.max(0, 1 - Math.abs(v - alvo) / 45)

  const ligar = () => {
    if (ligado) return
    setLigado(true)
    est.current = estatica()
    const repetir = () => player.tocar("/audio/tracks/222-copo-americano.mp3", repetir)
    repetir()
  }

  useEffect(() => {
    if (!ligado || travado) return
    player.volume(prox * prox)
    est.current?.volume((1 - prox) * 0.22)
    // trava exatamente quando a 5ª barra acende (prox >= 0.9)
    if (prox >= 0.9) {
      if (perto.current === null) perto.current = Date.now()
    } else perto.current = null
  }, [v, prox, ligado, travado, alvo])

  useEffect(() => {
    if (!ligado || travado) return
    const t = setInterval(() => {
      if (perto.current && Date.now() - perto.current > 900) {
        setTravado(true)
        est.current?.volume(0)
        player.volume(1)
        onFim()
      }
    }, 150)
    const d = setTimeout(() => setDica(true), 14000)
    return () => { clearInterval(t); clearTimeout(d) }
  }, [ligado, travado, onFim, alvo])

  useEffect(() => () => { est.current?.parar() }, [])

  // onda: ruído que vira senoide conforme chega perto
  useEffect(() => {
    const c = cvs.current
    if (!c) return
    const g = c.getContext("2d")!
    let raf = 0
    let fase = 0
    const draw = () => {
      const w = (c.width = c.offsetWidth)
      const h = (c.height = c.offsetHeight)
      const pr = Math.max(0, 1 - Math.abs(vRef.current - alvo) / 45)
      g.clearRect(0, 0, w, h)
      g.strokeStyle = cor
      g.lineWidth = 1.5
      g.shadowColor = cor
      g.shadowBlur = 8 * pr
      g.beginPath()
      fase += 0.12
      for (let x = 0; x <= w; x += 3) {
        const s = Math.sin(x * 0.045 + fase) * (h * 0.32) * pr
        const n = (Math.random() - 0.5) * h * 0.8 * (1 - pr)
        const y = h / 2 + s + n
        if (x === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.stroke()
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [cor, alvo])

  return (
    <div className="l-sintonia" onPointerDown={ligar}>
      <div className="l-freq">
        <span>{(v / 10).toFixed(1)}</span>
        <small>FM</small>
        <div className="l-barras" aria-hidden>
          {[0.15, 0.35, 0.55, 0.75, 0.9].map((lim, i) => (
            <i key={i} style={{ opacity: prox >= lim ? 1 : 0.15, height: 6 + i * 4 }} />
          ))}
        </div>
      </div>
      <canvas ref={cvs} className="l-onda" />
      <div className="l-dial">
        {dica && <span className="l-dial-dica" style={{ left: `${((alvo - 880) / 200) * 100}%` }} />}
        <input
          type="range"
          min={880}
          max={1080}
          step={1}
          value={v}
          aria-label="dial de frequência"
          onChange={(e) => { ligar(); setV(Number(e.target.value)) }}
          disabled={travado}
        />
      </div>
      {!ligado && <p className="l-mini">toca no dial pra ligar o rádio 🎧</p>}
    </div>
  )
}

/* ─── 3 · RESPIRA (DOPAMINA / relógio) ─────────────────── */
const PINGS = [
  "você tem 3 novas curtidas ✓",
  "oferta termina em 00:59 ✓",
  "alguém que você segue está ao vivo ✓",
  "seu tempo de tela hoje: 9h ✓",
  "não perca: 14 stories novos ✓",
  "lembrete: produtividade é felicidade ✓",
]

function Respira({ cor, onFim }: ProvaProps) {
  const META = 3
  const [fase, setFase] = useState<"parado" | "inspira" | "expira">("parado")
  const [feitas, setFeitas] = useState(0)
  const [aviso, setAviso] = useState<string | null>(null)
  const [pings, setPings] = useState<{ id: number; txt: string; x: number; y: number; ops?: boolean }[]>([])
  const inicio = useRef(0)
  const idRef = useRef(0)
  const feitasRef = useRef(0)

  useEffect(() => {
    if (feitas >= META) return
    const t = setInterval(() => {
      const id = ++idRef.current
      setPings((p) => [...p.slice(-2), { id, txt: PINGS[id % PINGS.length], x: 4 + Math.random() * 40, y: Math.random() < 0.5 ? 4 + Math.random() * 18 : 70 + Math.random() * 14 }])
      setTimeout(() => setPings((p) => p.filter((x) => x.id !== id)), 2600)
    }, 1900)
    return () => clearInterval(t)
  }, [feitas])

  useEffect(() => () => { drone(false); setTimeout(pararDrone, 1500) }, [])

  const segurar = () => {
    if (fase !== "parado" || feitas >= META) return
    inicio.current = Date.now()
    setAviso(null)
    setFase("inspira")
    drone(true, 0.1 + feitas * 0.03)
  }
  const soltar = () => {
    if (fase !== "inspira") return
    const seg = (Date.now() - inicio.current) / 1000
    if (seg < 2.6) {
      setFase("parado")
      drone(false)
      setAviso("mais devagar. segura uns 3 segundos")
      return
    }
    setFase("expira")
    drone(true, 0.04)
    setTimeout(() => {
      setFase("parado")
      drone(false)
      feitasRef.current += 1
      setFeitas(feitasRef.current)
      if (feitasRef.current >= META) onFim()
    }, 3200)
  }

  const velocidade = [0.5, 1.6, 4, 0][Math.min(feitas, 3)]
  const escala = fase === "inspira" ? 1 : fase === "expira" ? 0.45 : 0.45
  const rotulo = feitas >= META ? "presente" : fase === "inspira" ? "puxa…" : fase === "expira" ? "solta…" : "segura"

  return (
    <div className="l-respira">
      {pings.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`l-ping ${p.ops ? "is-ops" : ""}`}
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
          onClick={() => setPings((all) => all.map((x) => (x.id === p.id ? { ...x, ops: true, txt: "não era pra olhar 🙂" } : x)))}
        >
          <b>NÚCLEO</b> {p.txt}
        </button>
      ))}
      <svg className="l-relogio" viewBox="0 0 40 40" aria-hidden>
        <circle cx="20" cy="20" r="17" stroke="rgba(255,255,255,.25)" fill="none" />
        <line
          x1="20" y1="20" x2="20" y2="6"
          stroke={cor}
          strokeWidth="1.2"
          style={{ transformOrigin: "20px 20px", animation: velocidade ? `l-gira ${velocidade}s linear infinite` : "none" }}
        />
      </svg>
      <button
        type="button"
        className="l-pulmao"
        onPointerDown={segurar}
        onPointerUp={soltar}
        onPointerLeave={soltar}
        onPointerCancel={soltar}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          transform: `scale(${escala})`,
          transitionDuration: fase === "inspira" ? "4s" : "3.2s",
          boxShadow: `0 0 ${fase === "inspira" ? 70 : 20}px ${cor}66, inset 0 0 40px ${cor}33`,
        }}
      >
        <span>{rotulo}</span>
      </button>
      <div className="l-contador">{Array.from({ length: META }, (_, i) => (i < feitas ? "●" : "○")).join(" ")}</div>
      {aviso && <p className="l-mini">{aviso}</p>}
    </div>
  )
}

/* ─── 4 · ESPELHO (SEXTA-FEIRA / espelho) ──────────────── */
function Espelho({ onFim }: ProvaProps) {
  const cvs = useRef<HTMLCanvasElement>(null)
  const [limpo, setLimpo] = useState(0)
  const desenhando = useRef(false)
  const ultimo = useRef<{ x: number; y: number } | null>(null)
  const feito = useRef(false)

  useEffect(() => {
    const c = cvs.current
    if (!c) return
    c.width = c.offsetWidth
    c.height = c.offsetHeight
    const g = c.getContext("2d", { willReadFrequently: true })!
    const grad = g.createLinearGradient(0, 0, 0, c.height)
    grad.addColorStop(0, "rgba(200,215,235,.94)")
    grad.addColorStop(1, "rgba(160,175,205,.96)")
    g.fillStyle = grad
    g.fillRect(0, 0, c.width, c.height)
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.25})`
      g.beginPath()
      g.arc(Math.random() * c.width, Math.random() * c.height, Math.random() * 2.4, 0, Math.PI * 2)
      g.fill()
    }
  }, [])

  const medir = () => {
    const c = cvs.current
    if (!c || feito.current) return
    const g = c.getContext("2d", { willReadFrequently: true })!
    const d = g.getImageData(0, 0, c.width, c.height).data
    let vazio = 0
    let total = 0
    for (let i = 3; i < d.length; i += 4 * 37) {
      total++
      if (d[i] < 40) vazio++
    }
    const r = vazio / total
    setLimpo(r)
    if (r > 0.5) {
      feito.current = true
      onFim()
    }
  }

  const apagar = (e: React.PointerEvent) => {
    const c = cvs.current
    if (!c || !desenhando.current) return
    const r = c.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    const g = c.getContext("2d", { willReadFrequently: true })!
    g.globalCompositeOperation = "destination-out"
    g.lineCap = "round"
    g.lineWidth = 46
    g.beginPath()
    const u = ultimo.current ?? { x, y }
    g.moveTo(u.x, u.y)
    g.lineTo(x, y)
    g.stroke()
    ultimo.current = { x, y }
  }

  return (
    <div className="l-espelho">
      <div className="l-espelho-moldura">
        {/* eslint-disable-next-line @next/next/no-img-element -- reflexo decorativo sob o canvas de névoa */}
        <img src="/linha/capa-retrato.jpg" alt="" draggable={false} />
        <canvas
          ref={cvs}
          className={limpo > 0.5 ? "is-limpo" : ""}
          onPointerDown={(e) => { desenhando.current = true; ultimo.current = null; (e.target as HTMLElement).setPointerCapture(e.pointerId); apagar(e) }}
          onPointerMove={apagar}
          onPointerUp={() => { desenhando.current = false; medir() }}
          onPointerCancel={() => { desenhando.current = false; medir() }}
        />
      </div>
      <div className="l-contador">{Math.min(100, Math.round((limpo / 0.5) * 100))}%</div>
    </div>
  )
}

/* ─── 5 · CADERNO (SABE ONTEM? / caderno) ──────────────── */
// verso do caderno do LU2CA, lido em voz alta no reel de 11/09
const VERSO = ["que o som", "me seja", "água,", "que o amor", "seja", "o que", "valha"]

function Caderno({ cor, onFim }: ProvaProps) {
  const [ordem] = useState(() => {
    const a = VERSO.map((p, i) => ({ p, i }))
    for (let k = a.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1))
      ;[a[k], a[j]] = [a[j], a[k]]
    }
    return a
  })
  const [feitas, setFeitas] = useState<number[]>([])
  const [erro, setErro] = useState<number | null>(null)
  const [erros, setErros] = useState(0)

  const tocar = (i: number) => {
    if (feitas.includes(i)) return
    if (i === feitas.length) {
      const n = [...feitas, i]
      setFeitas(n)
      setErros(0)
      gota(i + 1)
      if (n.length === VERSO.length) onFim()
    } else {
      setErro(i)
      setErros((e) => e + 1)
      setTimeout(() => setErro(null), 400)
    }
  }

  return (
    <div className="l-caderno">
      <div className="l-pagina">
        <p>
          {feitas.map((i) => (
            <span key={i} className="l-palavra-ok">{VERSO[i]} </span>
          ))}
          {feitas.length < VERSO.length && <span className="l-cursor" style={{ background: cor }} />}
        </p>
      </div>
      <div className="l-palavras">
        {ordem.map(({ p, i }) =>
          feitas.includes(i) ? null : (
            <button
              key={i}
              type="button"
              className={`l-chip ${erro === i ? "is-erro" : ""} ${erros >= 2 && i === feitas.length ? "is-dica" : ""}`}
              onClick={() => tocar(i)}
            >
              {p}
            </button>
          ),
        )}
      </div>
    </div>
  )
}

/* ─── 6 · VIOLÃO (NECTAR / violão) ─────────────────────── */
const ACORDES: { nome: string; notas: number[] }[] = [
  { nome: "D7M", notas: [277.18, 220.0, 185.0, 146.83] },
  { nome: "Bm7", notas: [220.0, 185.0, 146.83, 123.47] },
  { nome: "G7M", notas: [185.0, 146.83, 123.47, 98.0] },
  { nome: "A", notas: [277.18, 220.0, 164.81, 110.0] },
]

function Violao({ cor, onFim }: ProvaProps) {
  const [acorde, setAcorde] = useState(0)
  const [tocadas, setTocadas] = useState<boolean[]>([false, false, false, false])
  const [vibra, setVibra] = useState<number[]>([0, 0, 0, 0])
  const area = useRef<HTMLDivElement>(null)
  const ultimoY = useRef<number | null>(null)
  const estado = useRef({ acorde: 0, tocadas: [false, false, false, false], fim: false })

  const tanger = (s: number) => {
    const st = estado.current
    if (st.fim) return
    corda(ACORDES[st.acorde].notas[s])
    setVibra((v) => v.map((x, i) => (i === s ? x + 1 : x)))
    st.tocadas[s] = true
    setTocadas([...st.tocadas])
    if (st.tocadas.every(Boolean)) {
      if (st.acorde === ACORDES.length - 1) {
        st.fim = true
        setTimeout(onFim, 600)
      } else {
        setTimeout(() => {
          st.acorde += 1
          st.tocadas = [false, false, false, false]
          setAcorde(st.acorde)
          setTocadas([...st.tocadas])
        }, 350)
      }
    }
  }

  const posCorda = (i: number, h: number) => h * (0.2 + i * 0.2)

  const mover = (e: React.PointerEvent) => {
    const el = area.current
    if (!el || ultimoY.current === null) return
    const r = el.getBoundingClientRect()
    const y = e.clientY - r.top
    const y0 = ultimoY.current
    for (let i = 0; i < 4; i++) {
      const cy = posCorda(i, r.height)
      if ((y0 < cy && y >= cy) || (y0 > cy && y <= cy)) tanger(i)
    }
    ultimoY.current = y
  }

  return (
    <div className="l-violao">
      <div className="l-acordes">
        {ACORDES.map((a, i) => (
          <span key={a.nome} className={i === acorde ? "is-agora" : i < acorde ? "is-foi" : ""} style={i === acorde ? { color: cor, borderColor: cor } : undefined}>
            {a.nome}
          </span>
        ))}
      </div>
      <div
        ref={area}
        className="l-cordas"
        onPointerDown={(e) => {
          const r = area.current!.getBoundingClientRect()
          ultimoY.current = e.clientY - r.top
          ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
          // toque direto numa corda também vale
          const y = e.clientY - r.top
          for (let i = 0; i < 4; i++) if (Math.abs(y - posCorda(i, r.height)) < 16) tanger(i)
        }}
        onPointerMove={mover}
        onPointerUp={() => (ultimoY.current = null)}
        onPointerCancel={() => (ultimoY.current = null)}
      >
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="l-corda" style={{ top: `${20 + i * 20}%` }}>
            <i
              key={vibra[i]}
              className={vibra[i] ? "is-vibra" : ""}
              style={{ background: tocadas[i] ? cor : "rgba(255,255,255,.55)", height: 1 + i * 0.6, boxShadow: tocadas[i] ? `0 0 10px ${cor}` : "none" }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
