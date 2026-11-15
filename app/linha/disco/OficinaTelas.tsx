"use client"

// A MISSÃO DA OFICINA (T09): as telas por cima do jogo (leves, sem 3D; o jogo
// embaixo fica pausado enquanto uma delas está aberta).
//   Montagem  → a arte, o fim: o lixo que ele catou no lixão (T57: no mundo,
//               de Kombi ou de patins) vira as peças do plano
//   (14/11) o jogo saiu daqui: a água do motor se coleta no deserto, no mundo (page.tsx)
//   Pagamento → a porta: o mecânico é pago em água; o contador desce e, a cada
//               10, faz um som de água (J2: 18, 19)
// Os textos e os números moram em oficina.ts (RASCUNHO; o mecânico é provisório).

import { useEffect, useRef, useState } from "react"
import { audioCtx, gota, moeda, saidaSom } from "../som"
import { FALAS_OFICINA, LIXO, MECANICO, OFICINA_CFG, pagamentoMotor } from "./oficina"

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

// ── a arte, o fim: com o lixo que ele catou no lixão (T57), a oficina monta.
// Sem toque nenhum: o mecânico desmonta cada um e a peça sai; depois, "seguir" ──
export function Montagem({ onFim }: { onFim: () => void }) {
  const [n, setN] = useState(0)
  const pronto = n >= LIXO.length
  useEffect(() => {
    if (pronto) return
    const t = setTimeout(() => { setN((x) => x + 1); moeda() }, n === 0 ? 900 : 750)
    return () => clearTimeout(t)
  }, [n, pronto])
  return (
    <Caixa titulo="o lixo vira tecnologia" sub={`a arte · a oficina de ${MECANICO.nome}`} rotulo="a oficina monta">
      <p className="l-oficina-msg">{FALAS_OFICINA.monta}</p>
      <div className="l-oficina-lixo">
        {LIXO.map((it, i) => (
          <span key={it.id} data-lixo={it.id} className={`l-oficina-peca ${i < n ? "is-saiu" : i === n ? "is-desmontando" : ""}`} style={{ ["--c" as string]: it.cor }}>
            <i aria-hidden="true" />{i < n ? it.vira : it.nome}
          </span>
        ))}
      </div>
      <p className="l-oficina-msg" aria-live="polite">{pronto ? "as quatro na bancada. o motor tá montado: falta a água" : `desmontando ${LIXO[n].nome}…`}</p>
      {pronto && <button type="button" className="l-oficina-seguir" autoFocus onClick={onFim}>seguir →</button>}
    </Caixa>
  )
}

// ── a porta: o pagamento do mecânico, em água ──
export function Pagamento({ agua, onPago, onFim, preco, titulo = "o serviço", sub = `a porta · ${MECANICO.nome}`, fala = FALAS_OFICINA.pagar, falaPago = FALAS_OFICINA.pago, falaFiado = FALAS_OFICINA.fiado, botao = "montar o motor →" }: {
  agua: number; onPago: (pago: number) => void; onFim: () => void
  // (T27) o mesmo pagamento serve pro conserto da Kombi que quebrou: outro preço e outras falas
  preco?: number; titulo?: string; sub?: string; fala?: string; falaPago?: string; falaFiado?: string; botao?: string
}) {
  const [conta] = useState(() => pagamentoMotor(agua, preco))
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
    <Caixa titulo={acabou ? falaPago : titulo} sub={sub} rotulo="o pagamento do mecânico">
      <p className="l-oficina-msg">{fala}</p>
      <div className={`l-oficina-agua ${acabou ? "is-fim" : ""}`} aria-live="off">
        <i aria-hidden="true" /><b data-agua={v}>{v}</b><small>Água$</small>
      </div>
      <p className="l-oficina-msg">{acabou ? (conta.falta > 0 ? falaFiado : `−${conta.pago} de água`) : `−${conta.pago}`}</p>
      {acabou && <button type="button" className="l-oficina-seguir" autoFocus onClick={onFim}>{botao}</button>}
    </Caixa>
  )
}
