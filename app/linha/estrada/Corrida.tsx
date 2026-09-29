"use client"

// A corrida da Linha 222, em 3D — jogabilidade inspirada no Horizon Drive
// (Shopify, R3F): a Kombi vive em coordenadas da pista (u = distância,
// x = lateral), sem motor de física. Pista larga, curvas longas, parede
// macia (raspa e segue, nunca trava), pulos nas rampas, turbo no chão,
// orbs em colares, confete. Câmera amortecida que abre com a velocidade.
//
// Por cima: a cidade alagada à noite, postes pulsando no grave da música,
// chuva, as 9 estações como portais na pista, e a rádio que destrava na
// estrada ("sinal travado").

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { Kombi222 } from "./Kombi222"
import { dataCurta, estacao as getEstacao, lancada, missao, type EstacaoId } from "../data"
import { VOZES } from "../roteiros"
import { FREQUENCIAS, faixasDe, freqsLiberadas, proximaFreq, type FreqId, type Frequencia } from "../radio"
import type { Save } from "../estado"
import { estatica, gota, nomeDoTom, player, tomDaMusica } from "../som"
import { MARCHAS, montarMotor, vib } from "../som-carro"
import { MEIA, amostra, du, montarPista, mundo, type Amostra, type Pista } from "./pista"
import { fita, texAsfalto, texBrilho, texJanelas, texTexto, texTurbo } from "./geo"
import { DISTRITOS, distritoEm, hexRgb, type Distrito, type DistritoId } from "./distritos"

const VMAX = 46 // m/s
const VTURBO = 62
const ACEL = 11
const FREIO = 26
const G = 24

export interface Stats {
  tempo: number
  vmax: number
  orbs: number
  quase: number
  sinal: number
  ar: number
  voltas: number
}

interface Props {
  save: Save
  nivel: number
  destino: EstacaoId | null
  onSinal: (total: number, freq?: FreqId) => void
  onDescer: (id: EstacaoId, s: Stats) => void
  onSair: (s: Stats) => void
  onVolta?: (tempo: number) => void
}

type Jogo = {
  u: number; x: number; v: number; vx: number; steer: number
  y: number; vy: number; ar: boolean; tAr: number
  turboT: number; carga: number; shake: number; flash: number
  tempo: number; voltaIni: number; voltas: number
  chegando: boolean; parado: boolean; encaixar?: boolean
  st: Stats
  pegos: Set<number>
}

type Evs = {
  distrito: (d: Distrito) => void
  falar: (de: string, t: string) => void
  popup: (t: string, cor: string) => void
  sinal: (n: number, rotulo: string, cor: string) => void
  portal: (id: EstacaoId) => void
  chegou: () => void
  volta: (t: number) => void
  hud: (j: Jogo) => void
}

type Input = { esq: boolean; dir: boolean; freio: boolean; turbo: boolean }

export function Corrida({ save, nivel, destino: destinoInicial, onSinal, onDescer, onSair, onVolta }: Props) {
  const pista = useMemo(() => montarPista(222), [])
  const [fonte, setFonte] = useState(false)
  const [destino, setDestino] = useState<EstacaoId | null>(destinoInicial)
  const destinoRef = useRef(destino)
  useEffect(() => { destinoRef.current = destino }, [destino])

  const input = useRef<Input>({ esq: false, dir: false, freio: false, turbo: false })
  const jogo = useRef<Jogo>(novoJogo(pista, destinoInicial, save.estacao))
  const hudVel = useRef<HTMLSpanElement>(null)
  const hudMarcha = useRef<HTMLSpanElement>(null)
  const hudProg = useRef<HTMLDivElement>(null)
  const hudSinal = useRef<HTMLDivElement>(null)
  const hudTurbo = useRef<HTMLDivElement>(null)
  const hudRota = useRef<HTMLSpanElement>(null)
  const mapaCarro = useRef<SVGCircleElement>(null)
  const hudTom = useRef<HTMLElement>(null)

  const [toasts, setToasts] = useState<{ id: number; de: string; texto: string }[]>([])
  const [popup, setPopup] = useState<{ id: number; txt: string; cor: string } | null>(null)
  const [travou, setTravou] = useState<Frequencia | null>(null)
  const [freq, setFreq] = useState<FreqId>((save.freq as FreqId) || "linha")
  const [faixa, setFaixa] = useState("")
  const [portal, setPortal] = useState<{ id: EstacaoId; t: number } | null>(null)
  const [bairro, setBairro] = useState<{ d: Distrito; t: number } | null>(null)
  const [painel, setPainel] = useState(false)
  const [chegou, setChegou] = useState<Stats | null>(null)
  const [dica, setDica] = useState(true)
  const [prox, setProx] = useState(() => proximaFreq(save.sinal))
  const sinalRef = useRef(save.sinal)
  const freqRef = useRef(freq)
  useEffect(() => { freqRef.current = freq }, [freq])
  const toastId = useRef(0)
  const temTurbo = nivel >= 2

  useEffect(() => {
    let vivo = true
    document.fonts.load('40px "Outward"').finally(() => vivo && setFonte(true))
    const t = setTimeout(() => setDica(false), 5000)
    return () => { vivo = false; clearTimeout(t) }
  }, [])

  const falar = useCallback((de: string, texto: string) => {
    const id = ++toastId.current
    setToasts((t) => [...t.slice(-1), { id, de, texto }])
    gota(6)
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600)
  }, [])

  // rádio
  const proxFaixa = useRef<(id: FreqId, idx: number) => void>(() => {})
  const tocarFreq = useCallback((id: FreqId, idx = 0) => {
    const f = FREQUENCIAS.find((x) => x.id === id)!
    let lista = faixasDe(f, save.objetos, save.estacao)
    if (!lista.length) lista = faixasDe(FREQUENCIAS[4], [], null)
    if (!lista.length) return
    const fx = lista[idx % lista.length]
    setFaixa(fx.titulo)
    player.tocar(fx.src, () => proxFaixa.current(freqRef.current, idx + 1))
  }, [save.objetos, save.estacao])
  useEffect(() => { proxFaixa.current = tocarFreq }, [tocarFreq])
  useEffect(() => {
    // liga o rádio ao entrar no carro (efeito externo: áudio)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    tocarFreq(freq)
    return () => player.pausar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const trocarFreq = () => {
    const lib = freqsLiberadas(sinalRef.current)
    const i = lib.findIndex((f) => f.id === freq)
    const nova = lib[(i + 1) % lib.length]
    setFreq(nova.id)
    freqRef.current = nova.id
    const est = estatica()
    est?.volume(0.18)
    setTimeout(() => est?.parar(), 260)
    tocarFreq(nova.id)
    onSinal(sinalRef.current, nova.id)
  }

  const confeteRef = useRef<((cor: string, n: number) => void) | null>(null)

  // atalho de desenvolvimento: window.__irPara(0.66) teleporta pra 66% do loop
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    const w = window as unknown as { __irPara?: (f: number) => void }
    w.__irPara = (f: number) => { jogo.current.u = f * pista.L; jogo.current.encaixar = true }
    ;(window as unknown as { __tom?: () => unknown }).__tom = () => tomDaMusica()
    return () => { delete w.__irPara }
  }, [pista])

  // minimapa: o loop visto de cima
  const minimapa = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    for (let i = 0; i < pista.n; i++) {
      minX = Math.min(minX, pista.px[i]); maxX = Math.max(maxX, pista.px[i])
      minZ = Math.min(minZ, pista.pz[i]); maxZ = Math.max(maxZ, pista.pz[i])
    }
    const esc = 88 / Math.max(maxX - minX, maxZ - minZ)
    const P = (i: number): [number, number] => [6 + (pista.px[i] - minX) * esc, 6 + (pista.pz[i] - minZ) * esc]
    let d = ""
    for (let i = 0; i < pista.n; i += 8) {
      const [x, y] = P(i)
      d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`
    }
    const trechos = DISTRITOS.map((ds) => {
      let dd = ""
      const i0 = Math.floor(ds.de * pista.n)
      const i1 = Math.min(pista.n - 1, Math.floor(ds.ate * pista.n))
      for (let i = i0; i <= i1; i += 6) {
        const [x, y] = P(i)
        dd += `${i === i0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`
      }
      const [x, y] = P(i1 === pista.n - 1 ? 0 : i1)
      return { id: ds.id, cor: ds.luz[0], d: dd + `L${x.toFixed(1)} ${y.toFixed(1)}` }
    })
    return {
      trechos,
      d: d + "Z",
      estacoes: pista.estacoes.map((e) => ({ id: e.id, p: P(Math.floor(e.u / 2) % pista.n) })),
      ponto: (u: number) => P(Math.floor((((u % pista.L) + pista.L) % pista.L) / 2) % pista.n),
    }
  }, [pista])

  // eventos que a cena dispara
  const evs = useRef<Evs>(null as unknown as Evs)
  useEffect(() => {
    evs.current = {
      falar,
      popup: (txt, cor) => setPopup({ id: Math.random(), txt, cor }),
      sinal: (n, rotulo, cor) => {
        const antes = sinalRef.current
        sinalRef.current += n
        jogo.current.st.sinal += n
        setPopup({ id: Math.random(), txt: rotulo, cor })
        const p = proximaFreq(antes)
        if (p && sinalRef.current >= p.custo) {
          const est = estatica()
          est?.volume(0.35)
          setTimeout(() => est?.volume(0.12), 300)
          setTimeout(() => est?.parar(), 700)
          jogo.current.flash = 1
          confeteRef.current?.(p.cor, 160)
          vib([30, 40, 30, 40, 120])
          setTravou(p)
          setFreq(p.id)
          freqRef.current = p.id
          setTimeout(() => tocarFreq(p.id), 650)
          setTimeout(() => setTravou(null), 3800)
          setTimeout(() => falar("D-Bee", `vc achou a ${p.freq}. o núcleo odeia essa`), 1800)
          onSinal(sinalRef.current, p.id)
        } else onSinal(sinalRef.current)
        setProx(proximaFreq(sinalRef.current))
      },
      portal: (id) => {
        setPortal({ id, t: Date.now() })
        const e = getEstacao(id)
        confeteRef.current?.(e.cor, 40)
        gota(e.n + 1)
      },
      chegou: () => setChegou({ ...jogo.current.st, tempo: jogo.current.tempo }),
      distrito: (d) => {
        setBairro({ d, t: Date.now() })
        gota(d.numero % 8)
        vib([15, 30, 15])
      },
      volta: (t) => {
        falar("Notti", `volta em ${t.toFixed(1)}s!!`)
        onVolta?.(t)
      },
      hud: (j) => {
        if (hudVel.current) hudVel.current.textContent = String(Math.round(j.v * 3.6))
        if (hudMarcha.current) {
          const pct = j.v / VMAX
          let m = 1
          while (m < MARCHAS.length - 1 && pct > MARCHAS[m]) m++
          hudMarcha.current.textContent = `${m}ª`
        }
        const d = destinoRef.current
        if (d) {
          const alvo = pista.estacoes.find((e) => e.id === d)!.u
          const falta = ((alvo - j.u) % pista.L + pista.L) % pista.L
          if (hudRota.current) hudRota.current.textContent = `${Math.round(falta)}m`
          if (hudProg.current) hudProg.current.style.transform = `scaleX(${1 - Math.min(1, falta / (pista.L * 0.4))})`
        } else {
          const prox = pista.estacoes.find((e) => e.u > j.u) ?? pista.estacoes[0]
          const falta = ((prox.u - j.u) % pista.L + pista.L) % pista.L
          if (hudRota.current) hudRota.current.textContent = `próxima: ${getEstacao(prox.id).faixa.toLowerCase()} · ${Math.round(falta)}m`
          if (hudProg.current) hudProg.current.style.transform = `scaleX(${j.u / pista.L})`
        }
        const p = proximaFreq(sinalRef.current)
        const lib = freqsLiberadas(sinalRef.current)
        const ant = lib[lib.length - 1]?.custo ?? 0
        if (hudSinal.current) hudSinal.current.style.transform = `scaleY(${p ? (sinalRef.current - ant) / (p.custo - ant) : 1})`
        if (hudTurbo.current) hudTurbo.current.style.transform = `scaleX(${j.turboT > 0 ? Math.min(1, j.turboT / 2.2) : j.carga})`
        if (hudTom.current) {
          const tom = tomDaMusica()
          hudTom.current.textContent = tom ? `toca pra trocar · ${nomeDoTom(tom)}` : "toca pra trocar"
        }
        if (mapaCarro.current) {
          const [mx, my] = minimapa.ponto(j.u)
          mapaCarro.current.setAttribute("cx", String(mx))
          mapaCarro.current.setAttribute("cy", String(my))
        }
      },
    }
  })

  // toque: metade esquerda/direita vira, as duas freiam
  const toques = useRef(new Map<number, "esq" | "dir">())
  const atualizarToque = () => {
    const l = [...toques.current.values()]
    const e = l.includes("esq")
    const d = l.includes("dir")
    input.current.freio = e && d
    input.current.esq = e && !d
    input.current.dir = d && !e
  }
  useEffect(() => {
    const tecla = (ev: KeyboardEvent, on: boolean) => {
      const k = ev.key.toLowerCase()
      if (k === "arrowleft" || k === "a") input.current.esq = on
      else if (k === "arrowright" || k === "d") input.current.dir = on
      else if (k === "arrowdown" || k === "s") input.current.freio = on
      else if (k === " " && on) input.current.turbo = true
      else return
      ev.preventDefault()
    }
    const kd = (e: KeyboardEvent) => tecla(e, true)
    const ku = (e: KeyboardEvent) => tecla(e, false)
    window.addEventListener("keydown", kd)
    window.addEventListener("keyup", ku)
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku) }
  }, [])

  const missoesAbertas = pista.estacoes.filter(({ id }) => missao(getEstacao(id), nivel).ok && !save.objetos.includes(id))
  const [distancias, setDistancias] = useState<Record<string, number>>({})
  const abrirPainel = () => {
    const u = jogo.current.u
    setDistancias(Object.fromEntries(missoesAbertas.map((m) => [m.id, ((m.u - u) % pista.L + pista.L) % pista.L])))
    setPainel(true)
  }
  const tracarRota = (id: EstacaoId) => {
    setDestino(id)
    jogo.current.chegando = false
    jogo.current.parado = false
    setChegou(null)
    setPainel(false)
    const e = getEstacao(id)
    falar(e.personagem, "tô te esperando. segue a coluna de luz")
  }
  useEffect(() => {
    if (!destinoInicial && missoesAbertas.length) {
      const t = setTimeout(() => setPopup({ id: Math.random(), txt: `${missoesAbertas.length} ${missoesAbertas.length === 1 ? "missão aberta" : "missões abertas"}`, cor: "#ffc857" }), 1800)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!bairro) return
    const t = setTimeout(() => setBairro(null), 3800)
    return () => clearTimeout(t)
  }, [bairro])

  const fq = FREQUENCIAS.find((f) => f.id === freq)
  const dest = destino ? getEstacao(destino) : null
  const portalE = portal ? getEstacao(portal.id) : null
  const portalMissao = portalE ? missao(portalE, nivel) : null
  const podeDescerPortal = !!portalE && !!portalMissao?.ok && !save.objetos.includes(portalE.id)

  useEffect(() => {
    if (!portal) return
    const t = setTimeout(() => setPortal(null), 5000)
    return () => clearTimeout(t)
  }, [portal])

  return (
    <div className="l-viagem">
      {fonte && (
        <Canvas
          className="l-viagem-cvs"
          dpr={[1, 1.5]}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          camera={{ fov: 60, near: 0.1, far: 3200 }}
          onPointerDown={(e) => {
            const r = (e.target as HTMLElement).getBoundingClientRect()
            toques.current.set(e.pointerId, e.clientX - r.left < r.width / 2 ? "esq" : "dir")
            atualizarToque()
          }}
          onPointerUp={(e) => { toques.current.delete(e.pointerId); atualizarToque() }}
          onPointerCancel={(e) => { toques.current.delete(e.pointerId); atualizarToque() }}
          onPointerLeave={(e) => { toques.current.delete(e.pointerId); atualizarToque() }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Cena pista={pista} jogo={jogo} input={input} evs={evs} destinoRef={destinoRef} temTurbo={temTurbo} confeteRef={confeteRef} nivel={nivel} objetos={save.objetos} />
        </Canvas>
      )}

      <div className="l-hud-topo">
        <button type="button" className="l-hud-sair" onClick={() => onSair({ ...jogo.current.st, tempo: jogo.current.tempo })} aria-label="sair da estrada">✕</button>
        <div className="l-hud-rota">
          <span>{dest ? `indo pra estação ${dest.n}` : "linha 222 · rodando livre"}</span>
          {dest ? <b style={{ color: dest.cor }}>{dest.faixa}</b> : <b className="is-livre">cidade neon</b>}
          <span ref={hudRota} className="l-hud-falta" />
          <div className="l-hud-barra"><div ref={hudProg} style={{ background: dest?.cor ?? "#2fe8ff" }} /></div>
        </div>
      </div>

      <svg className="l-minimapa" viewBox="0 0 100 100" aria-hidden>
        {minimapa.trechos.map((t) => <path key={t.id} d={t.d} style={{ stroke: t.cor }} />)}
        {minimapa.estacoes.map((e) => {
          const est = getEstacao(e.id)
          const temMissao = missao(est, nivel).ok && !save.objetos.includes(e.id)
          return (
            <g key={e.id}>
              {temMissao && <circle className="l-minimapa-pulso" cx={e.p[0]} cy={e.p[1]} r="5" fill="none" stroke={est.cor} />}
              <circle cx={e.p[0]} cy={e.p[1]} r={e.id === destino ? 4 : 2.4} fill={est.cor} opacity={lancada(est) || e.id === "ontem" || e.id === "nectar" ? 1 : 0.3} />
            </g>
          )
        })}
        <circle ref={mapaCarro} r="3.2" fill="#fff" stroke="#050510" strokeWidth="1" />
      </svg>

      {missoesAbertas.length > 0 && (
        <button type="button" className="l-hud-missoes" onPointerDown={(e) => e.stopPropagation()} onClick={abrirPainel}>
          missões <b>{missoesAbertas.length}</b>
        </button>
      )}
      {painel && (
        <div className="l-painel-missoes" onPointerDown={(e) => e.stopPropagation()}>
          <header>
            <b>missões abertas</b>
            <button type="button" onClick={() => setPainel(false)} aria-label="fechar">✕</button>
          </header>
          <p>toca numa pra traçar a rota. a coluna de luz marca o lugar.</p>
          <ul>
            {missoesAbertas
              .slice()
              .sort((x, y) => (distancias[x.id] ?? 0) - (distancias[y.id] ?? 0))
              .map((m) => {
                const e = getEstacao(m.id)
                return (
                  <li key={m.id}>
                    <button type="button" style={{ ["--cor" as string]: e.cor }} onClick={() => tracarRota(m.id)}>
                      <span className="l-painel-n">{e.n}</span>
                      <span><b>{e.faixa}</b><small>{e.personagem} · {e.objetoNome}</small></span>
                      <em>{Math.round(distancias[m.id] ?? 0)}m</em>
                    </button>
                  </li>
                )
              })}
          </ul>
        </div>
      )}
      {bairro && (
        <div key={bairro.t} className="l-bairro" style={{ ["--cor" as string]: bairro.d.luz[0] }}>
          <small>você entrou em</small>
          <p>{bairro.d.lugar}</p>
        </div>
      )}

      <div className="l-toasts">
        {toasts.map((t) => (
          <div key={t.id} className="l-toast" style={{ ["--cor" as string]: VOZES[t.de] ?? "#fff" }}>
            <b>{t.de}</b> {t.texto}
          </div>
        ))}
      </div>

      {popup && <div key={popup.id} className="l-popup" style={{ color: popup.cor }}>{popup.txt}</div>}

      <div className="l-hud-vel">
        <span ref={hudVel}>0</span>
        <small>km/h</small>
        <span ref={hudMarcha} className="l-hud-marcha">1ª</span>
      </div>

      <button type="button" className="l-hud-radio" onClick={trocarFreq}>
        <span className="l-hud-freq" style={{ color: fq?.cor }}>{fq?.freq} FM</span>
        <span className="l-hud-faixa">{faixa || "…"}</span>
        <small ref={hudTom}>toca pra trocar</small>
      </button>

      <div className="l-hud-sinal" title="sinal da próxima rádio">
        <div className="l-hud-sinal-tubo"><div ref={hudSinal} style={{ background: prox?.cor ?? "#2fe8ff" }} /></div>
        <small>{prox ? prox.freq : "todas"}</small>
      </div>

      <button
        type="button"
        className={`l-hud-turbo ${temTurbo ? "" : "is-trancado"}`}
        onPointerDown={(e) => { e.stopPropagation(); input.current.turbo = true }}
      >
        <div className="l-hud-turbo-barra"><div ref={hudTurbo} /></div>
        <span>{temTurbo ? "turbo" : "turbo · nível cúmplice"}</span>
      </button>

      {dica && (
        <div className="l-hud-dica">
          <span>← segura</span>
          <span className="is-desk">setas · espaço = turbo</span>
          <span>segura →</span>
        </div>
      )}

      {portalE && !chegou && (
        <div key={portal!.t} className="l-portal" style={{ ["--cor" as string]: portalE.cor }}>
          <small>estação {portalE.n} · {portalE.personagem}</small>
          <b>{portalE.faixa}</b>
          {podeDescerPortal ? (
            <button type="button" className="l-btn" onClick={() => onDescer(portalE.id, { ...jogo.current.st, tempo: jogo.current.tempo })}>
              descer aqui
            </button>
          ) : (
            <span>
              {save.objetos.includes(portalE.id)
                ? `${portalE.objetoNome} já é seu`
                : portalMissao && !portalMissao.ok && portalMissao.motivo === "data" && portalE.lancamento
                  ? `no escuro até ${dataCurta(portalE.lancamento)}`
                  : "missão ainda trancada"}
            </span>
          )}
        </div>
      )}

      {travou && (
        <div className="l-travou" style={{ ["--cor" as string]: travou.cor }}>
          <small>sinal travado</small>
          <b>{travou.freq}</b>
          <span>{travou.nome}</span>
        </div>
      )}

      {chegou && dest && (
        <div className="l-chegada" style={{ ["--cor" as string]: dest.cor }}>
          <small>estação {dest.n}</small>
          <h2>{dest.faixa}</h2>
          <p className="l-chegada-cidade">{dest.cidade}</p>
          <dl>
            <div><dt>tempo</dt><dd>{chegou.tempo.toFixed(1)}s</dd></div>
            <div><dt>máx</dt><dd>{Math.round(chegou.vmax * 3.6)} km/h</dd></div>
            <div><dt>sinal</dt><dd>+{chegou.sinal}</dd></div>
            <div><dt>no ar</dt><dd>{chegou.ar.toFixed(1)}s</dd></div>
          </dl>
          <button type="button" className="l-btn" onClick={() => onDescer(dest.id, chegou)}>descer na estação</button>
          <button
            type="button"
            className="l-btn l-btn-ghost"
            onClick={() => { setChegou(null); setDestino(null); jogo.current.chegando = false; jogo.current.parado = false }}
          >
            continuar rodando
          </button>
        </div>
      )}
    </div>
  )
}

function novoJogo(p: Pista, destino: EstacaoId | null, estacao: EstacaoId | null): Jogo {
  // sem destino: começa no portal da própria estação
  let u = 0
  const idx = (id: EstacaoId) => p.estacoes.findIndex((e) => e.id === id)
  // com destino: começa ~900m antes, atravessando pelo menos um bairro
  if (destino) u = (p.estacoes[idx(destino)].u - 900 + p.L) % p.L
  else if (estacao) u = p.estacoes[idx(estacao)].u + 25
  return {
    u, x: 0, v: 0, vx: 0, steer: 0, y: 0, vy: 0, ar: false, tAr: 0,
    turboT: 0, carga: 0, shake: 0, flash: 0, tempo: 0, voltaIni: 0, voltas: 0,
    chegando: false, parado: false,
    st: { tempo: 0, vmax: 0, orbs: 0, quase: 0, sinal: 0, ar: 0, voltas: 0 },
    pegos: new Set(),
  }
}

/* eslint-disable react-hooks/immutability, react-hooks/purity --
   cena R3F: useFrame muta geometria, instâncias e uniforms do three.js a
   60fps por design; nada disso é estado do React */
/* ─── cena ──────────────────────────────────────────────── */
function Cena({
  pista, jogo, input, evs, destinoRef, temTurbo, confeteRef, nivel, objetos,
}: {
  pista: Pista
  jogo: React.MutableRefObject<Jogo>
  input: React.MutableRefObject<Input>
  evs: React.MutableRefObject<Evs>
  destinoRef: React.MutableRefObject<EstacaoId | null>
  temTurbo: boolean
  confeteRef: React.MutableRefObject<((cor: string, n: number) => void) | null>
  nivel: number
  objetos: EstacaoId[]
}) {
  const { camera, scene } = useThree()
  const carro = useRef<THREE.Group>(null)
  const ceu = useRef<THREE.Mesh>(null)
  const a = useMemo<Amostra>(() => ({ x: 0, y: 0, z: 0, tx: 1, ty: 0, tz: 0, curv: 0 }), [])
  const motor = useMemo(() => montarMotor(), [])
  const reduz = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, [])

  useEffect(() => () => motor?.parar(), [motor])

  const tex = useMemo(() => ({ asfalto: texAsfalto(), janelas: texJanelas(), brilho: texBrilho(), turbo: texTurbo() }), [])

  // ── pista ──
  const geo = useMemo(() => {
    const rails = (lado: number) => fita(pista, lado * (MEIA + 0.25), 0.75, 0, {
      vertical: true,
      cor: (i) => (Math.floor(i / 10) % 2 ? hexRgb(distritoEm(i / pista.n).trilho[lado < 0 ? 0 : 1]) : [0.05, 0.05, 0.12]),
    })
    return {
      chao: fita(pista, -MEIA - 0.25, MEIA + 0.25, 0.01),
      faixas: [-MEIA / 3, MEIA / 3].map((x) => fita(pista, x - 0.1, x + 0.1, 0.04, { incluir: (i) => i % 6 < 3 })),
      bordas: [-(MEIA - 0.35), MEIA - 0.35].map((x) => fita(pista, x - 0.12, x + 0.12, 0.04)),
      railE: rails(-1),
      railD: rails(1),
      saiaE: fita(pista, -(MEIA + 0.25), 1.8, -1.8, { vertical: true }),
      saiaD: fita(pista, MEIA + 0.25, 1.8, -1.8, { vertical: true }),
    }
  }, [pista])

  // ── cidade: cada bairro com a sua arquitetura e a cor do seu gás ──
  const cidade = useMemo(() => {
    const r = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646 })()
    const d = new THREE.Object3D()
    const livre = (x: number, z: number, raio: number) => {
      for (let q = 0; q < pista.n; q += 4) if (Math.hypot(pista.px[q] - x, pista.pz[q] - z) < raio) return false
      return true
    }
    const ESTILO: Record<Distrito["predio"], { n: number; h: [number, number]; w: [number, number]; off: [number, number]; brilho: number }> = {
      torres: { n: 190, h: [24, 175], w: [10, 28], off: [22, 110], brilho: 1.25 },
      casas: { n: 150, h: [5, 16], w: [7, 13], off: [14, 70], brilho: 1.1 },
      aberto: { n: 60, h: [20, 70], w: [10, 22], off: [70, 170], brilho: 1.4 },
      tunel: { n: 0, h: [0, 0], w: [0, 0], off: [0, 0], brilho: 0 },
      brancas: { n: 80, h: [60, 210], w: [8, 14], off: [24, 100], brilho: 1.6 },
      obra: { n: 50, h: [30, 120], w: [12, 24], off: [22, 90], brilho: 0 },
    }
    const predios = DISTRITOS.filter((ds) => ESTILO[ds.predio].n > 0).map((ds) => {
      const e = ESTILO[ds.predio]
      const obra = ds.predio === "obra"
      const mat = obra
        ? new THREE.MeshBasicMaterial({ color: ds.janela, wireframe: true, transparent: true, opacity: 0.45 })
        : new THREE.MeshStandardMaterial({ color: "#0a0c1e", emissive: ds.janela, emissiveMap: tex.janelas, emissiveIntensity: e.brilho, roughness: 0.9 })
      const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, e.n)
      const k0 = Math.floor(ds.de * pista.n)
      const k1 = Math.floor(ds.ate * pista.n)
      let i = 0
      for (let tent = 0; i < e.n && tent < e.n * 8; tent++) {
        const k = k0 + Math.floor(r() * (k1 - k0))
        const lado = r() < 0.5 ? -1 : 1
        const off = MEIA + e.off[0] + r() * (e.off[1] - e.off[0])
        const h = e.h[0] + r() * r() * (e.h[1] - e.h[0])
        const bx = pista.px[k] - pista.tz[k] * lado * off
        const bz = pista.pz[k] + pista.tx[k] * lado * off
        if (!livre(bx, bz, MEIA + 12)) continue
        const w = e.w[0] + r() * (e.w[1] - e.w[0])
        d.position.set(bx, -12 + h / 2, bz)
        d.rotation.set(0, Math.atan2(pista.tx[k], pista.tz[k]), 0)
        d.scale.set(w, h, e.w[0] + r() * (e.w[1] - e.w[0]))
        d.updateMatrix()
        m.setMatrixAt(i, d.matrix)
        i++
      }
      m.count = i
      return m
    })

    // túnel do radônio: arcos com paredes, teto e fita de luz vermelha
    const rad = DISTRITOS.find((x) => x.id === "radonio")!
    const kr0 = Math.floor(rad.de * pista.n)
    const kr1 = Math.floor(rad.ate * pista.n)
    const nA = Math.floor((kr1 - kr0) / 5)
    const arcos = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: "#2a0c10", emissive: "#3a0508", emissiveIntensity: 0.9, roughness: 0.6 }), nA * 3)
    const fitas = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: "#ff2436", toneMapped: false }), nA * 2)
    for (let a = 0; a < nA; a++) {
      const k = kr0 + a * 5
      const rot = Math.atan2(pista.tx[k], pista.tz[k])
      const pecas: [number, number, number, number, number][] = [
        [-(MEIA + 1.6), 4.6, 1, 9.2, 10.4], // parede esq
        [MEIA + 1.6, 4.6, 1, 9.2, 10.4], // parede dir
        [0, 9.4, MEIA * 2 + 4.2, 0.8, 10.4], // teto
      ]
      pecas.forEach(([x, y, sx, sy, sz], j) => {
        d.position.set(pista.px[k] - pista.tz[k] * x, pista.py[k] + y, pista.pz[k] + pista.tx[k] * x)
        d.rotation.set(0, rot, 0)
        d.scale.set(sx, sy, sz)
        d.updateMatrix()
        arcos.setMatrixAt(a * 3 + j, d.matrix)
      })
      for (const l of [-1, 1]) {
        const x = l * (MEIA + 1)
        d.position.set(pista.px[k] - pista.tz[k] * x, pista.py[k] + 8.9, pista.pz[k] + pista.tx[k] * x)
        d.rotation.set(0, rot, 0)
        d.scale.set(0.25, 0.12, 9)
        d.updateMatrix()
        fitas.setMatrixAt(a * 2 + (l > 0 ? 1 : 0), d.matrix)
      }
    }

    const nPil = Math.floor(pista.n / 20)
    const pilares = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 1, 1.6), new THREE.MeshStandardMaterial({ color: "#10122a", roughness: 0.8 }), nPil)
    for (let i = 0; i < nPil; i++) {
      const k = i * 20
      const h = pista.py[k] + 12
      d.position.set(pista.px[k], -12 + h / 2 - 1.8, pista.pz[k])
      d.rotation.set(0, 0, 0)
      d.scale.set(1, h, 1)
      d.updateMatrix()
      pilares.setMatrixAt(i, d.matrix)
    }
    // postes a cada 24m dos dois lados, na cor do gás do bairro (no túnel
    // a luz é a fita do teto)
    const ks: number[] = []
    for (let k = 0; k < pista.n; k += 12) if (distritoEm(k / pista.n).predio !== "tunel") ks.push(k)
    const nL = ks.length * 2
    const postes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 7.2, 0.16), new THREE.MeshStandardMaterial({ color: "#22243e" }), nL)
    const luzPos = new Float32Array(nL * 3)
    const luzCor = new Float32Array(nL * 3)
    const reflexos = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1.8, 11),
      new THREE.MeshBasicMaterial({ map: tex.brilho, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }),
      nL,
    )
    const c = new THREE.Color()
    let n = 0
    for (const k of ks) {
      const ds = distritoEm(k / pista.n)
      for (const lado of [-1, 1]) {
        const rx = -pista.tz[k] * lado
        const rz = pista.tx[k] * lado
        d.position.set(pista.px[k] + rx * (MEIA + 0.9), pista.py[k] + 3.6, pista.pz[k] + rz * (MEIA + 0.9))
        d.rotation.set(0, 0, 0)
        d.scale.set(1, 1, 1)
        d.updateMatrix()
        postes.setMatrixAt(n, d.matrix)
        const hx = pista.px[k] + rx * (MEIA - 0.8)
        const hz = pista.pz[k] + rz * (MEIA - 0.8)
        luzPos.set([hx, pista.py[k] + 7.1, hz], n * 3)
        c.set(ds.luz[(k / 12 + (lado > 0 ? 1 : 0)) % ds.luz.length])
        luzCor.set([c.r, c.g, c.b], n * 3)
        d.position.set(hx - rx * 1.2, pista.py[k] + 0.05, hz - rz * 1.2)
        d.rotation.set(-Math.PI / 2, 0, Math.atan2(pista.tx[k], pista.tz[k]))
        d.updateMatrix()
        reflexos.setMatrixAt(n, d.matrix)
        reflexos.setColorAt(n, c)
        n++
      }
    }
    const luzes = new THREE.BufferGeometry()
    luzes.setAttribute("position", new THREE.BufferAttribute(luzPos, 3))
    luzes.setAttribute("color", new THREE.BufferAttribute(luzCor, 3))
    const luzMat = new THREE.PointsMaterial({ size: 3.6, map: tex.brilho, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true })

    // outdoors do NÚCLEO no bairro do criptônio
    const kri = DISTRITOS.find((x) => x.id === "criptonio")!
    const frases = ["OTIMIZE-SE ✓", "VOCÊ ESTÁ FELIZ ✓", "NÚCLEO", "NADA MUDOU ✓", "VOLTE AO FEED ✓"]
    const outdoors = frases.map((txt, j) => {
      const k = Math.floor((kri.de + ((j + 0.5) / frases.length) * (kri.ate - kri.de)) * pista.n)
      const lado = j % 2 ? 1 : -1
      const x = lado * (MEIA + 16)
      return {
        pos: new THREE.Vector3(pista.px[k] - pista.tz[k] * x, pista.py[k] + 14, pista.pz[k] + pista.tx[k] * x),
        rot: Math.atan2(pista.tx[k], pista.tz[k]) + Math.PI + lado * -0.5,
        tex: texTexto([{ txt, tam: 120, cor: "#eef3ff" }]),
      }
    })

    // canteiros do vol.2: portais apagados, só a estrutura
    const arg = DISTRITOS.find((x) => x.id === "argonio")!
    const obras = [0.2, 0.5, 0.8].map((f) => {
      const k = Math.floor((arg.de + f * (arg.ate - arg.de)) * pista.n)
      return { pos: new THREE.Vector3(pista.px[k], pista.py[k], pista.pz[k]), rot: Math.atan2(pista.tx[k], pista.tz[k]) }
    })
    const obraTex = texTexto([{ txt: "VOL.2 · EM OBRA", tam: 110, cor: "#b38cff" }, { txt: "a partir de 2027", tam: 54, cor: "#ffffff", fonte: "ui-monospace, monospace" }])

    return { predios, arcos, fitas, pilares, postes, luzes, luzMat, reflexos, outdoors, obras, obraTex }
  }, [pista, tex])

  // ── portais das estações ──
  const portais = useMemo(() => pista.estacoes.map(({ id, u }) => {
    const e = getEstacao(id)
    const m = missao(e, nivel)
    const escuro = !m.ok && m.motivo === "data"
    const p = mundo(pista, u, 0, 0, a, new THREE.Vector3())
    const rot = Math.atan2(a.tx, a.tz)
    const tex2 = texTexto([
      { txt: `${e.n} · ${e.faixa.toUpperCase()}`, tam: 118, cor: e.cor },
      { txt: escuro && e.lancamento ? `no escuro até ${dataCurta(e.lancamento)}` : objetos.includes(e.id) ? `${e.objetoNome} ✓` : e.personagem.toLowerCase(), tam: 54, cor: "#ffffff", fonte: "ui-monospace, monospace" },
    ])
    return { id, pos: p, rot, cor: e.cor, escuro, tex: tex2 }
  }), [pista, a, nivel, objetos])

  // ── colunas de luz: onde tem missão aberta, dá pra ver de longe ──
  const colunas = useMemo(() => pista.estacoes
    .filter(({ id }) => missao(getEstacao(id), nivel).ok && !objetos.includes(id))
    .map(({ id, u }) => ({ id, cor: getEstacao(id).cor, pos: mundo(pista, u, 0, 0, a, new THREE.Vector3()) })), [pista, a, nivel, objetos])

  // ── orbs ──
  const orbs = useMemo(() => {
    const m = new THREE.InstancedMesh(
      new THREE.TorusGeometry(0.75, 0.14, 8, 22),
      new THREE.MeshBasicMaterial({ color: "#2fe8ff", toneMapped: false }),
      pista.orbs.length,
    )
    const pos = new Float32Array(pista.orbs.length * 3)
    const v = new THREE.Vector3()
    pista.orbs.forEach((o, i) => {
      mundo(pista, o.u, o.x, 1.4, a, v)
      pos.set([v.x, v.y, v.z], i * 3)
    })
    const halo = new THREE.BufferGeometry()
    halo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    return { m, pos, halo }
  }, [pista, a])

  // ── turbos no chão ──
  const turbos = useMemo(() => pista.turbos.map((t) => {
    const p = mundo(pista, t.u, t.x, 0.06, a, new THREE.Vector3())
    // o +Y da textura (pra onde as setas apontam) alinhado com a tangente
    return { p, rot: Math.atan2(-a.tx, -a.tz) }
  }), [pista, a])

  // ── tráfego ──
  const trafego = useMemo(() => {
    const n = 14
    const carros = Array.from({ length: n }, (_, i) => ({ u: (i / n) * pista.L + 60, x: [-MEIA * 0.62, 0, MEIA * 0.62][i % 3], v: 20 + (i % 5) * 3.2, passou: false, bateu: 0 }))
    const corpo = new THREE.InstancedMesh(new THREE.BoxGeometry(1.9, 1.3, 4.2), new THREE.MeshStandardMaterial({ color: "#1b1d36", metalness: 0.6, roughness: 0.35 }), n)
    const lant = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.2, 0.06), new THREE.MeshBasicMaterial({ color: "#ff2a44", toneMapped: false }), n * 2)
    return { carros, corpo, lant }
  }, [pista])

  // ── chuva, confete, faíscas ──
  const chuva = useMemo(() => {
    const n = 700
    const pos = new Float32Array(n * 6)
    const base = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) base.set([(Math.random() - 0.5) * 70, Math.random() * 40, (Math.random() - 0.5) * 70], i * 3)
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    return { n, pos, base, g }
  }, [])

  const confete = useMemo(() => {
    const n = 260
    const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.22, 0.34), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), n)
    const s = Array.from({ length: n }, () => ({ vivo: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Vector3(), w: new THREE.Vector3() }))
    const d = new THREE.Object3D()
    d.scale.set(0, 0, 0)
    d.updateMatrix()
    for (let i = 0; i < n; i++) { m.setMatrixAt(i, d.matrix); m.setColorAt(i, new THREE.Color("#fff")) }
    return { m, s, d, prox: 0 }
  }, [])

  useEffect(() => {
    confeteRef.current = (cor: string, qt: number) => {
      const car = carro.current
      if (!car) return
      const cs = [new THREE.Color(cor), new THREE.Color("#ffffff"), new THREE.Color("#ffc857"), new THREE.Color("#2fe8ff")]
      for (let k = 0; k < qt; k++) {
        const i = confete.prox++ % confete.s.length
        const c = confete.s[i]
        c.vivo = 2.2 + Math.random()
        c.p.copy(car.position).add(new THREE.Vector3((Math.random() - 0.5) * 6, 3 + Math.random() * 3, (Math.random() - 0.5) * 6))
        c.v.set((Math.random() - 0.5) * 9, 5 + Math.random() * 7, (Math.random() - 0.5) * 9)
        c.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6)
        c.w.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12)
        confete.m.setColorAt(i, cs[k % cs.length])
      }
      if (confete.m.instanceColor) confete.m.instanceColor.needsUpdate = true
    }
    return () => { confeteRef.current = null }
  }, [confete, confeteRef])

  const faiscas = useMemo(() => {
    const n = 90
    const pos = new Float32Array(n * 3)
    const vel = new Float32Array(n * 3)
    const vida = new Float32Array(n)
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    return { n, pos, vel, vida, g, prox: 0 }
  }, [])

  // céu em gradiente com lua
  const ceuMat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { lua: { value: new THREE.Vector3(0.4, 0.35, -0.85).normalize() }, tinta: { value: new THREE.Color("#4a1a30") }, nevoaC: { value: new THREE.Color("#1a0f24") } },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `varying vec3 vP; uniform vec3 lua; uniform vec3 tinta; uniform vec3 nevoaC;
      void main(){
        float h = vP.y;
        vec3 fundo = nevoaC;
        vec3 faixa = tinta;
        vec3 meio = vec3(0.06,0.10,0.29);
        vec3 topo = vec3(0.016,0.016,0.06);
        vec3 c = mix(fundo, faixa, smoothstep(-0.04, 0.03, h));
        c = mix(c, meio, smoothstep(0.03, 0.22, h));
        c = mix(c, topo, smoothstep(0.22, 0.8, h));
        float m = max(dot(vP, lua), 0.0);
        c += vec3(0.8,0.85,1.0) * smoothstep(0.9993, 0.9997, m) + vec3(0.25,0.3,0.6) * pow(m, 60.0) * 0.5;
        gl_FragColor = vec4(c, 1.0);
      }`,
  }), [])

  useEffect(() => {
    scene.fog = new THREE.Fog("#1a0f24", 70, 900)
    scene.background = new THREE.Color("#1a0f24")
    return () => { scene.fog = null }
  }, [scene])

  // ── loop ──
  const tmp = useMemo(() => ({
    f: new THREE.Vector3(), r: new THREE.Vector3(), up: new THREE.Vector3(), p: new THREE.Vector3(),
    alvo: new THREE.Vector3(), olhar: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(),
    qYaw: new THREE.Quaternion(), qRoll: new THREE.Quaternion(), camOlhar: new THREE.Vector3(), d: new THREE.Object3D(),
    y0: new THREE.Vector3(0, 1, 0), z0: new THREE.Vector3(0, 0, 1),
  }), [])
  const hudN = useRef(0)
  const bairroAtual = useRef<DistritoId | null>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const alvoNevoa = useMemo(() => new THREE.Color(), [])
  const alvoCeu = useMemo(() => new THREE.Color(), [])
  const kTurbo = useRef(false)
  const kVel = useRef(0)
  const camInit = useRef(false)
  const falasT = useRef({ prox: 6, i: 0, raspa: 0 })
  const tempoOrb = useRef(0)

  useFrame((state, dtRaw) => {
    const dt = Math.min(0.05, dtRaw)
    const j = jogo.current
    const inp = input.current
    const ev = evs.current
    if (!ev) return
    j.tempo += dt
    const grave = player.grave()

    // ── física na pista ──
    amostra(pista, j.u, a)
    const pct = j.v / VMAX
    if (j.chegando) {
      j.v = Math.max(0, j.v - FREIO * 0.8 * dt)
      j.x += (0 - j.x) * dt * 1.5
      if (j.v < 0.5 && !j.parado) { j.parado = true; ev.chegou(); motor?.atualizar(0, false, 0, false, false) }
    } else {
      const alvoSteer = (inp.esq ? -1 : 0) + (inp.dir ? 1 : 0)
      j.steer += (alvoSteer - j.steer) * Math.min(1, dt * 7)
      const vmax = j.turboT > 0 ? VTURBO : VMAX
      if (inp.freio) j.v = Math.max(0, j.v - FREIO * dt)
      else j.v += (ACEL * (1 - Math.pow(Math.min(1, j.v / vmax), 2)) + (j.turboT > 0 ? 16 : 0)) * dt
      if (j.v > vmax) j.v += (vmax - j.v) * dt * 1.5
      j.v = Math.min(j.v, VTURBO * 1.08)
      if (j.turboT > 0) j.turboT -= dt
      // lateral: direção suave + força centrífuga leve (dá o "deslize")
      const alvoVx = j.steer * (5 + 9 * Math.min(1, pct))
      j.vx += (alvoVx - j.vx) * Math.min(1, dt * 5)
      if (!j.ar) j.x += (j.vx - a.curv * j.v * j.v * 0.035) * dt
      else j.x += j.vx * 0.5 * dt
    }
    // parede macia: raspa, solta faísca, perde um pouco de velocidade
    const lim = MEIA - 1.05
    if (Math.abs(j.x) > lim) {
      const lado = Math.sign(j.x)
      j.x = lado * lim
      j.vx = -lado * Math.abs(j.vx) * 0.25
      if (j.v > 8) {
        j.v *= 1 - 0.55 * dt
        j.shake = Math.max(j.shake, 0.25)
        falasT.current.raspa -= dt
        if (falasT.current.raspa <= 0) { vib(16); falasT.current.raspa = 0.14 }
        soltarFaiscas(faiscas, carro.current, lado)
      }
    }
    j.st.vmax = Math.max(j.st.vmax, j.v)

    const uAnt = j.u
    j.u += j.v * dt
    if (j.u >= pista.L) {
      j.u -= pista.L
    }
    // pulos: se a pista cai mais rápido do que a gravidade, a Kombi voa
    amostra(pista, j.u, a)
    const yPista = a.y
    if (j.ar) {
      j.vy -= G * dt
      j.y += j.vy * dt
      j.tAr += dt
      if (j.y <= yPista) {
        const tempoAr = j.tAr
        j.ar = false
        j.y = yPista
        j.shake = Math.max(j.shake, Math.min(1.2, 0.3 + tempoAr))
        motor?.baque()
        vib(tempoAr > 0.6 ? [40, 30, 60] : 30)
        j.st.ar += tempoAr
        if (tempoAr > 0.5) {
          const n = Math.round(tempoAr * 3)
          ev.sinal(n, `VOOU ${tempoAr.toFixed(1)}s +${n}`, "#ffc857")
          if (Math.random() < 0.5) ev.falar("Notti", "A KOMBI VOA???")
        }
        j.tAr = 0
      }
    } else {
      const vyPista = (yPista - j.y) / Math.max(dt, 1e-4)
      if (vyPista < j.vy - G * dt * 2.2 && j.v > 20) {
        j.ar = true
        j.tAr = 0
        motor?.whoosh()
      } else {
        j.vy = vyPista
        j.y = yPista
      }
    }

    // portais e voltas
    for (const e of pista.estacoes) {
      const cruzou = uAnt < e.u && j.u >= e.u || (uAnt > j.u && (e.u > uAnt || e.u <= j.u))
      if (!cruzou) continue
      if (destinoRef.current === e.id) j.chegando = true
      else ev.portal(e.id)
      if (e.id === pista.estacoes[0].id) {
        if (j.voltaIni > 0) {
          const tv = j.tempo - j.voltaIni
          j.voltas++
          j.st.voltas = j.voltas
          ev.volta(tv)
          j.pegos.clear()
        }
        j.voltaIni = j.tempo
      }
    }

    // orbs
    for (let i = 0; i < pista.orbs.length; i++) {
      if (j.pegos.has(i)) continue
      const o = pista.orbs[i]
      const d = du(pista, j.u, o.u)
      if (d > -1.5 && d < 1.8 && Math.abs(o.x - j.x) < 1.3 && Math.abs(j.y + 1 - (yPista + 1.4)) < 2.6 + (j.ar ? 2 : 0)) {
        j.pegos.add(i)
        j.st.orbs++
        j.carga = Math.min(1, j.carga + 0.08)
        tempoOrb.current = j.tempo
        gota(j.st.orbs % 8)
        vib(8)
        ev.sinal(1, "+1 sinal", "#2fe8ff")
      }
    }

    // turbo no chão
    for (const t of pista.turbos) {
      const d = du(pista, j.u, t.u)
      if (d > -3 && d < 3 && Math.abs(t.x - j.x) < 2.2 && j.turboT < 1.2 && !j.ar) {
        j.turboT = 1.8
        j.flash = 0.35
        motor?.whoosh()
        vib([20, 20, 50])
      }
    }
    if (inp.turbo && temTurbo && j.carga >= 1 && j.turboT <= 0) {
      j.turboT = 2.4
      j.carga = 0
      j.flash = 0.4
      motor?.whoosh()
      vib([20, 20, 60])
    }
    inp.turbo = false

    // tráfego
    const tr = trafego
    for (let i = 0; i < tr.carros.length; i++) {
      const c = tr.carros[i]
      const antes = du(pista, j.u, c.u)
      c.u = (c.u + c.v * dt) % pista.L
      const d = du(pista, j.u, c.u)
      c.bateu = Math.max(0, c.bateu - dt)
      if (Math.abs(d) < 3.6 && Math.abs(c.x - j.x) < 1.85 && !j.ar && c.bateu <= 0) {
        // encostão: empurra de lado e perde embalo, sem parar o jogo
        c.bateu = 1
        j.v = Math.min(j.v, c.v * 0.85)
        j.vx = Math.sign(j.x - c.x || 1) * 6
        j.shake = 1.1
        j.flash = 0.3
        motor?.baque()
        vib([50, 30, 80])
        ev.falar("Ella", "tá tudo bem??")
      }
      if (antes > 0 && d <= 0) {
        if (!c.passou && c.bateu <= 0 && Math.abs(c.x - j.x) < 3.3 && j.v > 30) {
          j.st.quase++
          j.carga = Math.min(1, j.carga + 0.3)
          motor?.whoosh()
          vib(25)
          ev.sinal(3, "QUASE! +3", "#ff3fb0")
          if (j.st.quase === 1 || Math.random() < 0.3) ev.falar(["Notti", "Mubarak", "BBX"][j.st.quase % 3], ["KKKK QUASE", "doido", "respira mano"][j.st.quase % 3])
        }
        c.passou = true
      }
      if (d > 50) c.passou = false
      const p = mundo(pista, c.u, c.x, 0.75, a, tmp.p)
      tmp.d.position.copy(p)
      tmp.d.rotation.set(0, Math.atan2(a.tx, a.tz), 0)
      tmp.d.scale.set(1, 1, 1)
      tmp.d.updateMatrix()
      tr.corpo.setMatrixAt(i, tmp.d.matrix)
      for (const k of [-1, 1]) {
        tmp.d.position.set(p.x - a.tx * 2.12 + -a.tz * k * 0.62, p.y + 0.1, p.z - a.tz * 2.12 + a.tx * k * 0.62)
        tmp.d.updateMatrix()
        tr.lant.setMatrixAt(i * 2 + (k > 0 ? 1 : 0), tmp.d.matrix)
      }
    }
    tr.corpo.instanceMatrix.needsUpdate = true
    tr.lant.instanceMatrix.needsUpdate = true

    // ── pose da Kombi ──
    amostra(pista, j.u, a)
    tmp.f.set(a.tx, j.ar ? Math.max(-0.2, Math.min(0.35, j.vy / Math.max(j.v, 1))) : a.ty, a.tz).normalize()
    tmp.r.set(-a.tz, 0, a.tx).normalize()
    tmp.up.crossVectors(tmp.r, tmp.f).normalize()
    // base: x = direita, y = cima, z = trás (a Kombi aponta pra -Z)
    tmp.m.makeBasis(tmp.r, tmp.up, tmp.f.clone().negate())
    const car = carro.current!
    car.quaternion.setFromRotationMatrix(tmp.m)
    const yaw = -Math.atan2(j.vx, Math.max(j.v, 4)) - a.curv * j.v * j.v * 0.0025
    tmp.qYaw.setFromAxisAngle(tmp.y0, yaw)
    tmp.qRoll.setFromAxisAngle(tmp.z0, j.steer * 0.05 * Math.min(1, pct))
    car.quaternion.multiply(tmp.qYaw).multiply(tmp.qRoll)
    car.position.set(a.x - a.tz * j.x, j.y + 0.02, a.z + a.tx * j.x)

    // ── câmera: amortecida, abre com a velocidade ──
    const atras = 8.4 + pct * 1.8
    tmp.alvo.copy(car.position).addScaledVector(tmp.f, -atras).addScaledVector(tmp.up, 3.1 + pct * 0.3).addScaledVector(tmp.r, j.steer * 0.8)
    if (j.encaixar) { camInit.current = false; j.encaixar = false }
    const k = camInit.current ? 1 - Math.exp(-dt * (j.ar ? 3 : 5.5)) : 1
    camera.position.lerp(tmp.alvo, k)
    tmp.olhar.copy(car.position).addScaledVector(tmp.f, 7).addScaledVector(tmp.up, 1.2)
    tmp.camOlhar.lerp(tmp.olhar, camInit.current ? 1 - Math.exp(-dt * 9) : 1)
    camInit.current = true
    const amp = reduz ? 0 : j.shake * 0.12 + (j.turboT > 0 ? 0.03 : 0)
    camera.position.x += (Math.random() - 0.5) * amp
    camera.position.y += (Math.random() - 0.5) * amp
    camera.lookAt(tmp.camOlhar)
    const cam = camera as THREE.PerspectiveCamera
    const fovAlvo = 58 + pct * 14 + (j.turboT > 0 ? 10 : 0)
    cam.fov += (fovAlvo - cam.fov) * Math.min(1, dt * 3)
    cam.updateProjectionMatrix()
    j.shake = Math.max(0, j.shake - dt * 2)
    j.flash = Math.max(0, j.flash - dt * 1.6)

    // céu acompanha a câmera
    if (ceu.current) ceu.current.position.copy(camera.position)
    // atmosfera do bairro: névoa, céu e luz ambiente mudam devagar
    const ds = distritoEm(j.u / pista.L)
    if (ds.id !== bairroAtual.current) {
      if (bairroAtual.current) ev.distrito(ds)
      bairroAtual.current = ds.id
      alvoNevoa.set(ds.nevoa)
      alvoCeu.set(ds.ceu)
    }
    const kk = Math.min(1, dt * 0.9)
    const fog = scene.fog as THREE.Fog | null
    if (fog) fog.color.lerp(alvoNevoa, kk)
    ;(scene.background as THREE.Color | null)?.lerp(alvoNevoa, kk)
    ceuMat.uniforms.nevoaC.value.lerp(alvoNevoa, kk)
    ceuMat.uniforms.tinta.value.lerp(alvoCeu, kk)
    if (hemi.current) hemi.current.color.lerp(alvoCeu, kk * 0.5)

    // som
    motor?.atualizar(Math.min(1.45, j.v / VMAX), !inp.freio && !j.chegando, Math.min(1, Math.abs(a.curv) * j.v * 0.6 * Math.abs(j.steer)), Math.abs(j.x) > lim - 0.05 && j.v > 8, j.turboT > 0)

    // orbs girando / sumindo
    const t = state.clock.elapsedTime
    for (let i = 0; i < pista.orbs.length; i++) {
      const pego = j.pegos.has(i)
      tmp.d.position.set(orbs.pos[i * 3], orbs.pos[i * 3 + 1] + Math.sin(t * 3 + i) * 0.2, orbs.pos[i * 3 + 2])
      tmp.d.rotation.set(0, t * 2 + i, 0)
      const s = pego ? 0 : 1
      tmp.d.scale.set(s, s, s)
      tmp.d.updateMatrix()
      orbs.m.setMatrixAt(i, tmp.d.matrix)
    }
    orbs.m.instanceMatrix.needsUpdate = true

    // luz dos postes pulsa no grave
    cidade.luzMat.size = 3.4 + grave * 3
    cidade.luzMat.opacity = 0.55 + grave * 0.35
    tex.turbo.offset.y -= dt * 2.5

    // chuva: volume que acompanha a câmera, inclina com a velocidade
    const cp = camera.position
    for (let i = 0; i < chuva.n; i++) {
      let y = chuva.base[i * 3 + 1] - dt * (38 + j.v * 0.2)
      if (y < 0) y += 40
      chuva.base[i * 3 + 1] = y
      const x = cp.x + chuva.base[i * 3]
      const z = cp.z + chuva.base[i * 3 + 2]
      const yy = cp.y - 18 + y
      chuva.pos.set([x, yy, z, x - tmp.f.x * j.v * 0.03, yy - 1.1, z - tmp.f.z * j.v * 0.03], i * 6)
    }
    chuva.g.attributes.position.needsUpdate = true

    // confete
    for (let i = 0; i < confete.s.length; i++) {
      const c = confete.s[i]
      if (c.vivo <= 0) continue
      c.vivo -= dt
      c.v.y -= 9 * dt
      c.v.multiplyScalar(1 - dt * 0.8)
      c.p.addScaledVector(c.v, dt)
      c.r.addScaledVector(c.w, dt)
      confete.d.position.copy(c.p)
      confete.d.rotation.set(c.r.x, c.r.y, c.r.z)
      const s = c.vivo > 0 ? Math.min(1, c.vivo * 2) : 0
      confete.d.scale.set(s, s, s)
      confete.d.updateMatrix()
      confete.m.setMatrixAt(i, confete.d.matrix)
    }
    confete.m.instanceMatrix.needsUpdate = true

    // faíscas
    for (let i = 0; i < faiscas.n; i++) {
      if (faiscas.vida[i] <= 0) { faiscas.pos[i * 3 + 1] = -999; continue }
      faiscas.vida[i] -= dt
      faiscas.vel[i * 3 + 1] -= 18 * dt
      faiscas.pos[i * 3] += faiscas.vel[i * 3] * dt
      faiscas.pos[i * 3 + 1] += faiscas.vel[i * 3 + 1] * dt
      faiscas.pos[i * 3 + 2] += faiscas.vel[i * 3 + 2] * dt
    }
    faiscas.g.attributes.position.needsUpdate = true

    // mensagens da cidade no caminho
    const ft = falasT.current
    if (j.tempo > ft.prox && ft.i < FALAS.length && !j.chegando) {
      const f = FALAS[ft.i++]
      ev.falar(f.de, f.texto)
      ft.prox = j.tempo + 9 + Math.random() * 6
    }

    kTurbo.current = j.turboT > 0
    kVel.current = j.v
    hudN.current++
    if (hudN.current % 4 === 0) ev.hud(j)
  })

  return (
    <>
      <hemisphereLight ref={hemi} args={["#8f7dff", "#0b1a3a", 1.6]} />
      <ambientLight intensity={0.35} color="#7f8cff" />
      <directionalLight position={[200, 300, -400]} intensity={0.9} color="#b9ccff" />
      <mesh ref={ceu} material={ceuMat} frustumCulled={false} renderOrder={-1}>
        <sphereGeometry args={[2800, 32, 16]} />
      </mesh>

      {/* água */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -12, 0]}>
        <planeGeometry args={[6000, 6000]} />
        <meshStandardMaterial color="#071430" metalness={0.85} roughness={0.22} />
      </mesh>

      {/* pista */}
      <mesh geometry={geo.chao} receiveShadow>
        <meshStandardMaterial map={tex.asfalto} roughness={0.38} metalness={0.3} color="#d6d9ff" />
      </mesh>
      {geo.faixas.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial color="#2fe8ff" toneMapped={false} transparent opacity={0.85} />
        </mesh>
      ))}
      {geo.bordas.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial color={i ? "#ff3fb0" : "#2fe8ff"} toneMapped={false} />
        </mesh>
      ))}
      {[geo.railE, geo.railD].map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial vertexColors side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
      {[geo.saiaE, geo.saiaD].map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color="#0d0f24" side={THREE.DoubleSide} />
        </mesh>
      ))}

      {cidade.predios.map((m, i) => <primitive key={i} object={m} />)}
      <primitive object={cidade.arcos} />
      <primitive object={cidade.fitas} />
      {cidade.outdoors.map((o, i) => (
        <mesh key={`out${i}`} position={o.pos} rotation={[0, o.rot, 0]}>
          <planeGeometry args={[28, 7]} />
          <meshBasicMaterial map={o.tex} transparent toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      {cidade.obras.map((o, i) => (
        <group key={`obra${i}`} position={o.pos} rotation={[0, o.rot, 0]}>
          {[-1, 1].map((l) => (
            <mesh key={l} position={[l * (MEIA + 0.9), 4.6, 0]}>
              <boxGeometry args={[0.5, 9.2, 0.5]} />
              <meshBasicMaterial color="#b38cff" wireframe />
            </mesh>
          ))}
          <mesh position={[0, 11.4, 0]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[MEIA * 2 + 2, (MEIA * 2 + 2) / 4]} />
            <meshBasicMaterial map={cidade.obraTex} transparent toneMapped={false} side={THREE.DoubleSide} depthWrite={false} opacity={0.7} />
          </mesh>
        </group>
      ))}
      <primitive object={cidade.pilares} />
      <primitive object={cidade.postes} />
      <primitive object={cidade.reflexos} />
      <points geometry={cidade.luzes} material={cidade.luzMat} />

      {portais.map((p) => (
        <group key={p.id} position={p.pos} rotation={[0, p.rot, 0]}>
          {[-1, 1].map((l) => (
            <mesh key={l} position={[l * (MEIA + 0.9), 4.6, 0]}>
              <boxGeometry args={[0.6, 9.2, 0.6]} />
              <meshBasicMaterial color={p.cor} toneMapped={false} transparent opacity={p.escuro ? 0.25 : 1} />
            </mesh>
          ))}
          <mesh position={[0, 9.6, 0]}>
            <boxGeometry args={[MEIA * 2 + 2.4, 0.5, 0.5]} />
            <meshBasicMaterial color={p.cor} toneMapped={false} transparent opacity={p.escuro ? 0.25 : 1} />
          </mesh>
          <mesh position={[0, 11.8, 0]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[MEIA * 2 + 2, (MEIA * 2 + 2) / 4]} />
            <meshBasicMaterial map={p.tex} transparent toneMapped={false} side={THREE.DoubleSide} depthWrite={false} opacity={p.escuro ? 0.45 : 1} />
          </mesh>
        </group>
      ))}

      {colunas.map((c) => (
        <group key={`col${c.id}`} position={c.pos}>
          <mesh position={[0, 140, 0]}>
            <cylinderGeometry args={[2.2, 2.2, 280, 16, 1, true]} />
            <meshBasicMaterial color={c.cor} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
          <mesh position={[0, 140, 0]}>
            <cylinderGeometry args={[0.6, 0.6, 280, 10, 1, true]} />
            <meshBasicMaterial color={c.cor} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.08, 0]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[MEIA * 0.6, MEIA * 0.75, 40]} />
            <meshBasicMaterial color={c.cor} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {turbos.map((t, i) => (
        <mesh key={i} position={t.p} rotation={[-Math.PI / 2, 0, t.rot]}>
          <planeGeometry args={[3.4, 7]} />
          <meshBasicMaterial map={tex.turbo} color="#ff3fb0" transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}

      <primitive object={orbs.m} />
      <points geometry={orbs.halo}>
        <pointsMaterial size={4} map={tex.brilho} color="#2fe8ff" transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.6} />
      </points>

      <primitive object={trafego.corpo} />
      <primitive object={trafego.lant} />

      <lineSegments geometry={chuva.g} frustumCulled={false}>
        <lineBasicMaterial color="#a8ccff" transparent opacity={0.28} />
      </lineSegments>
      <primitive object={confete.m} frustumCulled={false} />
      <points geometry={faiscas.g} frustumCulled={false}>
        <pointsMaterial size={0.35} color="#ffb454" transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>

      <group ref={carro}>
        <Kombi222 turbo={kTurbo} velocidade={kVel} />
        <pointLight position={[0, 0.3, 0]} color="#ff3fb0" intensity={45} distance={10} decay={2} />
        <pointLight position={[0, 1, -4]} color="#fff1d6" intensity={60} distance={26} decay={2} />
        {/* luz de recorte vinda da cidade, pra Kombi não sumir no escuro */}
        <pointLight position={[0, 4, 4]} color="#9fd8ff" intensity={25} distance={9} decay={2} />
      </group>
    </>
  )
}

/* eslint-enable react-hooks/immutability, react-hooks/purity */

const FALAS = [
  { de: "D-Bee", texto: "o núcleo apagou os radares nessa rua. aproveita" },
  { de: "Ella", texto: "vai com calma na curva molhada" },
  { de: "Mubarak", texto: "a Kombi aguenta. confia" },
  { de: "Notti", texto: "pega as bolinhas!! as bolinhas!!" },
  { de: "Alohan", texto: "repara nas luzes. elas batem junto com a música." },
  { de: "BBX", texto: "sobe a rampa com tudo" },
]

function soltarFaiscas(f: { n: number; pos: Float32Array; vel: Float32Array; vida: Float32Array; prox: number }, car: THREE.Group | null, lado: number) {
  if (!car) return
  const r = new THREE.Vector3(1, 0, 0).applyQuaternion(car.quaternion)
  for (let k = 0; k < 3; k++) {
    const i = f.prox++ % f.n
    f.pos.set([car.position.x + r.x * lado * 0.95, car.position.y + 0.4, car.position.z + r.z * lado * 0.95], i * 3)
    f.vel.set([r.x * lado * (2 + Math.random() * 3) + (Math.random() - 0.5) * 3, 2 + Math.random() * 4, r.z * lado * (2 + Math.random() * 3) + (Math.random() - 0.5) * 3], i * 3)
    f.vida[i] = 0.5 + Math.random() * 0.4
  }
}

