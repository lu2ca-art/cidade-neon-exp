"use client"

// A MISSÃO DA OFICINA (T09): as telas por cima do jogo (leves, sem 3D; o jogo
// embaixo fica pausado enquanto uma delas está aberta).
//   Bancada   → a arte: a reciclagem (o lixo vira as peças do plano)
//   Painel    → o jogo, 1: cavar no lixão até o painel solar velho aparecer
//   Goteira   → o jogo, 2: o balde embaixo da goteira enche o tanque do motor
//   Pagamento → a porta: o mecânico é pago em água; o contador desce e, a cada
//               10, faz um som de água (J2: 18, 19)
// Os textos e os números moram em oficina.ts (RASCUNHO; o mecânico é provisório).

import { useEffect, useRef, useState } from "react"
import { audioCtx, gota, moeda, saidaSom } from "../som"
import { BANCADA, FALAS_OFICINA, MECANICO, OFICINA_CFG, PLANO, pagamentoMotor } from "./oficina"

// o som de água: um "ploc" (a bolha sobe de tom) com um chiado curto de respingo
export function somDeAgua(vol = 0.22) {
  const c = audioCtx(), out = saidaSom()
  if (!c || !out) return
  const t = c.currentTime
  const o = c.createOscillator(), g = c.createGain()
  o.type = "sine"
  o.frequency.setValueAtTime(380, t)
  o.frequency.exponentialRampToValueAtTime(1300, t + 0.09)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
  o.connect(g).connect(out)
  o.start(t); o.stop(t + 0.2)
  const n = Math.floor(c.sampleRate * 0.12), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3)
  const src = c.createBufferSource(), f = c.createBiquadFilter(), gn = c.createGain()
  src.buffer = b; f.type = "bandpass"; f.frequency.value = 2400; f.Q.value = 1.2; gn.gain.value = vol * 0.35
  src.connect(f).connect(gn).connect(out)
  src.start(t + 0.03)
}

const parar = (e: { stopPropagation: () => void }) => e.stopPropagation()

function Caixa({ titulo, sub, children, rotulo }: { titulo: string; sub: string; rotulo: string; children: React.ReactNode }) {
  return (
    <div className="l-oficina" style={{ ["--cor" as string]: MECANICO.cor }} role="dialog" aria-label={rotulo} onPointerDown={parar}>
      <div className="l-oficina-caixa">
        <small>{sub}</small>
        <b>{titulo}</b>
        {children}
      </div>
    </div>
  )
}

// ── a arte: a bancada da reciclagem ──
export function Bancada({ onFim }: { onFim: () => void }) {
  const [feitas, setFeitas] = useState<string[]>([])
  const [msg, setMsg] = useState("o plano pede três peças. qual lixo esconde cada uma?")
  const [errou, setErrou] = useState<string | null>(null)
  const [desmontando, setDesmontando] = useState<string | null>(null)
  const pronto = feitas.length >= PLANO.length
  const tocar = (id: string) => {
    if (desmontando || pronto) return
    const it = BANCADA.find((x) => x.id === id)!
    if (!it.vira || feitas.includes(it.vira)) {
      setErrou(id); setMsg(it.vira ? `${it.nome}: essa peça já saiu` : `${it.nome}: não tem nada aí dentro`)
      setTimeout(() => setErrou(null), 450)
      return
    }
    setDesmontando(id); setMsg(`desmontando ${it.nome}…`)
    setTimeout(() => {
      setDesmontando(null)
      setFeitas((f) => [...f, it.vira!])
      setMsg(`${it.nome} → ${it.vira}`)
      moeda()
    }, 650)
  }
  return (
    <Caixa titulo="o lixo vira tecnologia" sub={`a arte · a bancada de ${MECANICO.nome}`} rotulo="a bancada da reciclagem">
      <ul className="l-oficina-plano" aria-label="o plano">
        {PLANO.map((p) => <li key={p} className={feitas.includes(p) ? "is-tem" : ""}>{p}{feitas.includes(p) ? " ✓" : ""}</li>)}
      </ul>
      <div className="l-oficina-lixo">
        {BANCADA.map((it) => {
          const saiu = !!it.vira && feitas.includes(it.vira)
          return (
            <button key={it.id} type="button" data-lixo={it.id} disabled={saiu || pronto}
              className={`${saiu ? "is-saiu" : ""} ${errou === it.id ? "is-errou" : ""} ${desmontando === it.id ? "is-desmontando" : ""}`}
              style={{ ["--c" as string]: it.cor }} onClick={() => tocar(it.id)}>
              <i aria-hidden="true" />{it.nome}
            </button>
          )
        })}
      </div>
      <p className="l-oficina-msg" aria-live="polite">{pronto ? "as três peças na bancada. o motor tá montado: falta o sol e a água" : msg}</p>
      {pronto && <button type="button" className="l-oficina-seguir" autoFocus onClick={onFim}>pronto →</button>}
    </Caixa>
  )
}

// ── o jogo, 1: o painel solar enterrado no lixão ──
export function PainelLixao({ onFim }: { onFim: () => void }) {
  const [n, setN] = useState(0)
  const achou = n >= OFICINA_CFG.cavadas
  const cavar = () => { if (achou) return; setN((x) => x + 1); gota(n) }
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (achou) onFim(); else cavar() } }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  })
  return (
    <Caixa titulo={achou ? "um painel solar velho" : "alguma coisa brilha embaixo das carcaças"} sub="o jogo · o lixão" rotulo="o painel no lixão">
      <div className={`l-oficina-cova ${achou ? "is-achou" : ""}`} style={{ ["--p" as string]: `${Math.min(1, n / OFICINA_CFG.cavadas)}` }} aria-hidden="true">
        <i className="l-oficina-painel" />
        <i className="l-oficina-entulho" />
      </div>
      <p className="l-oficina-msg" aria-live="polite">{achou ? "rachado, mas a célula ainda acende" : `tira o entulho de cima (${n}/${OFICINA_CFG.cavadas})`}</p>
      {achou
        ? <button type="button" className="l-oficina-seguir" autoFocus onClick={onFim}>levar o painel →</button>
        : <button type="button" className="l-oficina-seguir" data-cavar onClick={cavar}>cavar</button>}
    </Caixa>
  )
}

// ── o jogo, 2: a goteira. O balde (3 posições) pega as gotas que caem do cano ──
const COLUNAS = 3
export function Goteira({ onFim, onGota }: { onFim: (gotas: number) => void; onGota?: (n: number) => void }) {
  const meta = OFICINA_CFG.gotasDaGoteira
  const [balde, setBalde] = useState(1)
  const [pegou, setPegou] = useState(0)
  const [queda, setQueda] = useState<{ id: number; col: number; t0: number } | null>(null)
  const baldeRef = useRef(1), pegouRef = useRef(0), gotaEl = useRef<HTMLElement>(null)
  useEffect(() => { baldeRef.current = balde }, [balde])
  const cheio = pegou >= meta
  // uma gota por vez: cai em ~1,1 s; no fim, pegou se o balde está na coluna dela
  useEffect(() => {
    if (cheio) return
    let raf = 0, alive = true
    const nova = () => {
      // a goteira não é cruel: a próxima cai perto de onde a última caiu
      setQueda((q) => ({ id: (q?.id ?? 0) + 1, col: Math.floor(Math.random() * COLUNAS), t0: performance.now() + 250 }))
    }
    if (!queda) nova()
    const DUR = 1100
    const tick = () => {
      if (!alive) return
      if (queda && gotaEl.current) {
        const k = Math.max(0, (performance.now() - queda.t0) / DUR)
        gotaEl.current.style.transform = `translate3d(0, ${Math.min(1, k) * 78}%, 0)`
        if (k >= 1) {
          if (queda.col === baldeRef.current) { pegouRef.current += 1; setPegou(pegouRef.current); onGota?.(pegouRef.current); gota(pegouRef.current) }
          nova()
          return
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { alive = false; cancelAnimationFrame(raf) }
  }, [queda, cheio, onGota])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") setBalde((b) => Math.max(0, b - 1))
      if (e.key === "ArrowRight" || e.key === "d") setBalde((b) => Math.min(COLUNAS - 1, b + 1))
      if ((e.key === "Enter" || e.key === " ") && pegouRef.current >= meta) onFim(pegouRef.current)
    }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [meta, onFim])
  return (
    <Caixa titulo={cheio ? "o tanque do motor tá cheio" : "a goteira"} sub="o jogo · embaixo da pista" rotulo="a goteira">
      <div className="l-oficina-goteira" data-pegou={pegou}>
        <i className="l-oficina-cano" aria-hidden="true" />
        {Array.from({ length: COLUNAS }, (_, c) => (
          <button key={c} type="button" className="l-oficina-coluna" aria-label={`o balde na ${c + 1}ª`} onClick={() => setBalde(c)}>
            {queda && queda.col === c && !cheio && <i key={queda.id} ref={gotaEl} className="l-oficina-gota" />}
            {balde === c && <i className="l-oficina-balde" style={{ ["--n" as string]: `${pegou / meta}` }} />}
          </button>
        ))}
      </div>
      <p className="l-oficina-msg" aria-live="polite">{cheio ? "cada gota conta. o motor bebe pouco" : `toca embaixo da gota (ou ← →) · o tanque: ${pegou}/${meta}`}</p>
      {cheio && <button type="button" className="l-oficina-seguir" autoFocus onClick={() => onFim(pegou)}>levar a água →</button>}
    </Caixa>
  )
}

// ── a porta: o pagamento do mecânico, em água ──
export function Pagamento({ agua, onPago, onFim }: { agua: number; onPago: (pago: number) => void; onFim: () => void }) {
  const [conta] = useState(() => pagamentoMotor(agua))
  const [v, setV] = useState(conta.de)
  const pagouRef = useRef(false)
  const acabou = v <= conta.para
  useEffect(() => {
    // a água sai do save logo de cara (recarregar no meio não paga duas vezes)
    if (!pagouRef.current) { pagouRef.current = true; onPago(conta.pago) }
  }, [conta.pago, onPago])
  useEffect(() => {
    if (acabou) return
    const t = setTimeout(() => {
      const nv = v - 1
      setV(nv)
      if (nv % OFICINA_CFG.somACada === 0) somDeAgua()
    }, OFICINA_CFG.passoMs)
    return () => clearTimeout(t)
  }, [v, acabou])
  return (
    <Caixa titulo={acabou ? FALAS_OFICINA.pago : "o serviço"} sub={`a porta · ${MECANICO.nome}`} rotulo="o pagamento do mecânico">
      <p className="l-oficina-msg">{FALAS_OFICINA.pagar}</p>
      <div className={`l-oficina-agua ${acabou ? "is-fim" : ""}`} aria-live="off">
        <i aria-hidden="true" /><b data-agua={v}>{v}</b><small>água</small>
      </div>
      <p className="l-oficina-msg">{acabou ? (conta.falta > 0 ? FALAS_OFICINA.fiado : `−${conta.pago} de água`) : `−${conta.pago}`}</p>
      {acabou && <button type="button" className="l-oficina-seguir" autoFocus onClick={onFim}>montar o motor →</button>}
    </Caixa>
  )
}
